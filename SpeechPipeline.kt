package app.puente.speech

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import app.puente.Lang
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import org.vosk.LibVosk
import org.vosk.LogLevel
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.StorageService
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Always-on, fully offline speech recognition for English AND Spanish at the same time.
 *
 * One microphone loop feeds the same audio to two Vosk recognizers (one per language).
 * Whenever either recognizer decides an utterance ended, both are flushed and the more
 * confident hypothesis wins ("auto-detect"). This needs no buttons and no language picker.
 *
 * Weakest part (see README "Known limits"): the language pick is a heuristic. A real
 * language-ID model or per-speaker memory would make it sturdier in a noisy shop.
 */
class SpeechPipeline(
    private val context: Context,
    private val listener: Listener,
) {
    interface Listener {
        /** Live, still-changing text. Called on the main thread. */
        fun onPartial(lang: Lang, text: String)

        /** A finished utterance. Called on the main thread. */
        fun onFinal(lang: Lang, text: String)

        fun onError(message: String)
    }

    /** null = auto-detect; EN or ES = ignore the other language. */
    @Volatile
    var lockedLang: Lang? = null

    private val main = Handler(Looper.getMainLooper())
    private var enModel: Model? = null
    private var esModel: Model? = null
    private var worker: Thread? = null

    @Volatile
    private var running = false

    @Volatile
    private var lastFinalLang: Lang = Lang.EN

    /** Unpacks (first run) and loads both models. Slow the first time, then a couple of seconds. */
    suspend fun load() {
        if (enModel != null && esModel != null) return
        LibVosk.setLogLevel(LogLevel.WARNINGS)
        coroutineScope {
            val en = async { unpack("model-en") }
            val es = async { unpack("model-es") }
            enModel = en.await()
            esModel = es.await()
        }
    }

    private suspend fun unpack(dir: String): Model = suspendCancellableCoroutine { cont ->
        StorageService.unpack(
            context,
            dir,
            dir,
            StorageService.Callback<Model> { model -> cont.resume(model) },
            StorageService.Callback<IOException> { e -> cont.resumeWithException(e) },
        )
    }

    fun start() {
        val en = enModel ?: return
        val es = esModel ?: return
        if (running) return
        running = true
        worker = Thread({ loop(en, es) }, "puente-audio").apply {
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    fun stop() {
        running = false
        worker?.join(800)
        worker = null
    }

    fun release() {
        stop()
        enModel?.close()
        esModel?.close()
        enModel = null
        esModel = null
    }

    // ------------------------------------------------------------------ audio loop

    @SuppressLint("MissingPermission") // The activity requests RECORD_AUDIO before calling start().
    private fun loop(en: Model, es: Model) {
        val sampleRate = 16000
        val chunk = sampleRate / 10 // 100 ms per read keeps latency low
        val minBuf = AudioRecord.getMinBufferSize(
            sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
        )
        val bufBytes = maxOf(minBuf, chunk * 2 * 4)

        val rec = try {
            AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufBytes,
            )
        } catch (e: Exception) {
            running = false
            postError(e.message ?: "Microphone unavailable")
            return
        }
        if (rec.state != AudioRecord.STATE_INITIALIZED) {
            running = false
            rec.release()
            postError("Microphone unavailable")
            return
        }

        val recEn = Recognizer(en, sampleRate.toFloat()).apply { setWords(true) }
        val recEs = Recognizer(es, sampleRate.toFloat()).apply { setWords(true) }
        val buf = ShortArray(chunk)
        var shownLang: Lang? = null
        var shownText = ""

        try {
            rec.startRecording()
            while (running) {
                val n = rec.read(buf, 0, buf.size)
                if (n < 0) {
                    postError("Audio read error $n")
                    break
                }
                if (n == 0) continue

                val endEn = recEn.acceptWaveForm(buf, n)
                val endEs = recEs.acceptWaveForm(buf, n)

                if (endEn || endEs) {
                    // Flush both so they stay in sync, then let the better hypothesis win.
                    val jsonEn = if (endEn) recEn.result else recEn.finalResult
                    val jsonEs = if (endEs) recEs.result else recEs.finalResult
                    shownLang = null
                    shownText = ""
                    decide(jsonEn, jsonEs)?.let { (lang, text) ->
                        lastFinalLang = lang
                        main.post { listener.onFinal(lang, text) }
                    }
                } else {
                    val partialEn = partialOf(recEn.partialResult)
                    val partialEs = partialOf(recEs.partialResult)
                    val pick = pickPartial(partialEn, partialEs, shownLang)
                    if (pick != null && (pick.first != shownLang || pick.second != shownText)) {
                        shownLang = pick.first
                        shownText = pick.second
                        val (lang, text) = pick
                        main.post { listener.onPartial(lang, text) }
                    }
                }
            }
        } catch (t: Throwable) {
            postError(t.message ?: t.javaClass.simpleName)
        } finally {
            try {
                rec.stop()
            } catch (_: Exception) {
            }
            rec.release()
            recEn.close()
            recEs.close()
        }
    }

    private fun postError(message: String) {
        main.post { listener.onError(message) }
    }

    // ------------------------------------------------------------------ language choice

    private class Hypothesis(val text: String, val score: Double)

    private fun parse(json: String): Hypothesis {
        val o = JSONObject(json)
        val text = o.optString("text").trim()
        if (text.isEmpty()) return Hypothesis("", 0.0)
        val words = o.optJSONArray("result")
        var score = 0.0
        if (words != null) {
            for (i in 0 until words.length()) {
                val w = words.optJSONObject(i) ?: continue
                val word = w.optString("word")
                if (word.isBlank() || word == "[unk]") continue
                score += w.optDouble("conf", 0.5).coerceIn(0.0, 1.0)
            }
        } else {
            score = text.split(' ').size * 0.5
        }
        return Hypothesis(text, score)
    }

    private fun partialOf(json: String): String = JSONObject(json).optString("partial").trim()

    private fun wordCount(s: String): Int = if (s.isEmpty()) 0 else s.split(' ').size

    /** Final utterance: confidence-weighted word count, with a small bias toward the last language used. */
    private fun decide(jsonEn: String, jsonEs: String): Pair<Lang, String>? {
        val en = parse(jsonEn)
        val es = parse(jsonEs)
        val chosen: Pair<Lang, Hypothesis> = when (lockedLang) {
            Lang.EN -> Lang.EN to en
            Lang.ES -> Lang.ES to es
            null -> {
                val biasEn = if (lastFinalLang == Lang.EN) STICKY_BIAS else 0.0
                val biasEs = if (lastFinalLang == Lang.ES) STICKY_BIAS else 0.0
                if (en.score + biasEn >= es.score + biasEs) Lang.EN to en else Lang.ES to es
            }
        }
        val text = chosen.second.text
        if (text.isEmpty()) return null
        // Small models "hear" filler words in background noise; drop lone ones.
        if (!text.contains(' ') && text.lowercase() in NOISE_WORDS) return null
        return chosen.first to text
    }

    /** Live text: stick with the current language unless the other one is clearly ahead. */
    private fun pickPartial(partialEn: String, partialEs: String, shown: Lang?): Pair<Lang, String>? {
        lockedLang?.let { lock ->
            val t = if (lock == Lang.EN) partialEn else partialEs
            return if (t.isEmpty()) null else lock to t
        }
        val wEn = wordCount(partialEn)
        val wEs = wordCount(partialEs)
        if (wEn == 0 && wEs == 0) return null
        val cur = shown ?: lastFinalLang
        val wCur = if (cur == Lang.EN) wEn else wEs
        val wOther = if (cur == Lang.EN) wEs else wEn
        val lang = if (wOther > wCur && (wCur == 0 || wOther >= wCur + 2)) cur.other else cur
        val text = if (lang == Lang.EN) partialEn else partialEs
        return if (text.isEmpty()) null else lang to text
    }

    private companion object {
        const val STICKY_BIAS = 0.75
        val NOISE_WORDS = setOf("the", "a", "uh", "um", "hmm", "huh", "eh", "ah", "oh")
    }
}
