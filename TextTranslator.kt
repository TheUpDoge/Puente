package app.puente.translate

import app.puente.Lang

/**
 * The seam that keeps the translation engine swappable.
 *
 * Alpha: [MlKitTranslator] (free, offline after a one-time download, but a closed-source Google SDK).
 * Planned for a fully open-source build: an Opus-MT / Bergamot implementation of this same interface.
 */
interface TextTranslator {
    /** Make both directions ready to run offline (may download once). Throws if it can't. */
    suspend fun prepare()

    /** Translate [text] that was spoken in [from] into the other language. */
    suspend fun translate(text: String, from: Lang): String

    fun close()
}
