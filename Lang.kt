package app.puente

/**
 * Languages the alpha understands. Adding a language later means: a new entry here,
 * a speech model in app/build.gradle.kts, a translator pair, and content-pack keys.
 */
enum class Lang(val code: String) {
    EN("en"),
    ES("es");

    val other: Lang get() = if (this == EN) ES else EN
}
