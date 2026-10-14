package app.puente

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.SimpleItemAnimator
import app.puente.content.PhraseBook
import app.puente.speech.SpeechPipeline
import app.puente.translate.MlKitTranslator
import app.puente.translate.TextTranslator
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * The whole alpha is this one screen: no buttons to press, it just listens.
 *  - top: status line and an optional AUTO / EN / ES lock chip
 *  - middle: finished lines (translation big, original small, slang hints in yellow)
 *  - bottom: the live line, updating while someone is still talking
 */
class MainActivity : AppCompatActivity(), SpeechPipeline.Listener {

    private lateinit var tvStatus: TextView
    private lateinit var tvMode: TextView
    private lateinit var tvHint: TextView
    private lateinit var rv: RecyclerView
    private lateinit var tvLiveTag: TextView
    private lateinit var tvLiveTarget: TextView
    private lateinit var tvLiveSource: TextView

    private val adapter by lazy { LineAdapter(this) }
    private val pipeline by lazy { SpeechPipeline(applicationContext, this) }
    private val translator: TextTranslator = MlKitTranslator()
    private lateinit var phraseBook: PhraseBook

    private var partialJob: Job? = null
    private var ready = false
    private var booting = false

    private val micPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) boot() else setStatus(getString(R.string.status_mic_denied))
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
            )
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        tvStatus = findViewById(R.id.tvStatus)
        tvMode = findViewById(R.id.tvMode)
        tvHint = findViewById(R.id.tvHint)
        rv = findViewById(R.id.rv)
        tvLiveTag = findViewById(R.id.tvLiveTag)
        tvLiveTarget = findViewById(R.id.tvLiveTarget)
        tvLiveSource = findViewById(R.id.tvLiveSource)

        rv.layoutManager = LinearLayoutManager(this).apply { stackFromEnd = true }
        rv.adapter = adapter
        (rv.itemAnimator as? SimpleItemAnimator)?.supportsChangeAnimations = false

        phraseBook = PhraseBook.load(assets)

        tvMode.setOnClickListener { cycleMode() }
        tvStatus.setOnClickListener { if (!ready && !booting) ensureMic() }

        ensureMic()
    }

    override fun onStart() {
        super.onStart()
        if (ready) {
            pipeline.start()
            setStatus(getString(R.string.status_listening))
        }
    }

    override fun onStop() {
        super.onStop()
        pipeline.stop() // never keep the mic open while the app is in the background
    }

    override fun onDestroy() {
        super.onDestroy()
        pipeline.release()
        translator.close()
    }

    // ------------------------------------------------------------------ startup

    private fun ensureMic() {
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) boot() else micPermission.launch(Manifest.permission.RECORD_AUDIO)
    }

    private fun boot() {
        if (booting || ready) return
        booting = true
        lifecycleScope.launch {
            try {
                setStatus(getString(R.string.status_loading_models))
                pipeline.load()

                setStatus(getString(R.string.status_preparing))
                try {
                    translator.prepare()
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    setStatus(getString(R.string.status_download_failed))
                    return@launch
                }

                ready = true
                setStatus(getString(R.string.status_listening))
                if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) pipeline.start()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                setStatus(getString(R.string.status_error, e.message ?: e.javaClass.simpleName))
            } finally {
                booting = false
            }
        }
    }

    // ------------------------------------------------------------------ speech events

    override fun onPartial(lang: Lang, text: String) {
        tvHint.visibility = View.GONE
        tvLiveTag.text = tagFor(lang)
        tvLiveTag.setTextColor(colorFor(lang))
        tvLiveSource.text = text

        partialJob?.cancel()
        if (text.length < 3) {
            tvLiveTarget.text = ""
            return
        }
        // Tiny debounce so we translate the phrase, not every single word as it forms.
        partialJob = lifecycleScope.launch {
            delay(120)
            tvLiveTarget.text = phraseBook.exact(text, lang) ?: safeTranslate(text, lang)
        }
    }

    override fun onFinal(lang: Lang, text: String) {
        partialJob?.cancel()
        tvLiveTag.text = ""
        tvLiveTarget.text = ""
        tvLiveSource.text = ""
        tvHint.visibility = View.GONE

        val line = Line(lang, text)
        adapter.add(line) // shows instantly with "…", the translation fills in right after
        rv.scrollToPosition(adapter.itemCount - 1)

        lifecycleScope.launch {
            line.notes = phraseBook.notes(text, lang)
            line.translation = phraseBook.exact(text, lang) ?: safeTranslate(text, lang)
            adapter.refresh(line)
        }
    }

    override fun onError(message: String) {
        setStatus(getString(R.string.status_error, message))
    }

    // ------------------------------------------------------------------ helpers

    private suspend fun safeTranslate(text: String, lang: Lang): String =
        try {
            translator.translate(text, lang)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            getString(R.string.translating)
        }

    private fun cycleMode() {
        val next: Lang? = when (pipeline.lockedLang) {
            null -> Lang.EN
            Lang.EN -> Lang.ES
            Lang.ES -> null
        }
        pipeline.lockedLang = next
        tvMode.setText(
            when (next) {
                null -> R.string.mode_auto
                Lang.EN -> R.string.mode_en
                Lang.ES -> R.string.mode_es
            },
        )
    }

    private fun setStatus(s: String) {
        tvStatus.text = s
    }

    private fun tagFor(lang: Lang): String =
        getString(R.string.tag_format, lang.code.uppercase(), lang.other.code.uppercase())

    private fun colorFor(lang: Lang): Int =
        ContextCompat.getColor(this, if (lang == Lang.EN) R.color.lang_en else R.color.lang_es)
}
