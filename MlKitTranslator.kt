package app.puente.translate

import android.util.LruCache
import app.puente.Lang
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.tasks.await

class MlKitTranslator : TextTranslator {

    private val enToEs: Translator = client(TranslateLanguage.ENGLISH, TranslateLanguage.SPANISH)
    private val esToEn: Translator = client(TranslateLanguage.SPANISH, TranslateLanguage.ENGLISH)

    // Partial results get re-translated constantly; a small cache keeps the UI instant.
    private val cache = LruCache<String, String>(512)

    override suspend fun prepare() {
        val conditions = DownloadConditions.Builder().build() // any network; only needed the first time
        enToEs.downloadModelIfNeeded(conditions).await()
        esToEn.downloadModelIfNeeded(conditions).await()
    }

    override suspend fun translate(text: String, from: Lang): String {
        val key = "${from.code}|$text"
        cache.get(key)?.let { return it }
        val engine = if (from == Lang.EN) enToEs else esToEn
        val result = engine.translate(text).await()
        cache.put(key, result)
        return result
    }

    override fun close() {
        enToEs.close()
        esToEn.close()
    }

    private fun client(source: String, target: String): Translator =
        Translation.getClient(
            TranslatorOptions.Builder()
                .setSourceLanguage(source)
                .setTargetLanguage(target)
                .build(),
        )
}
