package app.puente.content

import android.content.res.AssetManager
import android.util.Log
import app.puente.Lang
import org.json.JSONObject
import java.text.Normalizer
import java.util.Locale

/**
 * Slang, common phrases and shop vocabulary, loaded from JSON "content packs" in
 * assets/content/phrasebook/. Adding or fixing words never needs a code change:
 * see docs/CONTENT.md for the format.
 *
 * Two jobs:
 *  - [exact]: if the whole utterance is a known slang word/phrase, use the curated meaning
 *    instead of the machine translation (general MT often fumbles slang).
 *  - [notes]: small "güey → dude" hints shown under a line, so the English reader learns as they go.
 */
class PhraseBook private constructor(entries: List<Entry>) {

    class Entry(
        val id: String,
        val type: String, // "slang" | "phrase" | "work"
        val terms: Map<Lang, List<String>>, // first item per language = preferred wording
        val note: Map<Lang, String>, // keyed by the language of the person READING the note
        val annotateOnly: Boolean,
    )

    private class Variant(val norm: String, val entry: Entry)

    private val exactIndex: Map<Lang, Map<String, Entry>>
    private val termIndex: Map<Lang, List<Variant>>

    init {
        val exact = Lang.entries.associateWith { HashMap<String, Entry>() }
        val terms = Lang.entries.associateWith { ArrayList<Variant>() }
        for (entry in entries) {
            for ((lang, variants) in entry.terms) {
                for (v in variants) {
                    val n = normalize(v)
                    if (n.length < 2) continue
                    terms.getValue(lang).add(Variant(n, entry))
                    // Only Spanish speech is ever replaced by a curated meaning. English input always
                    // goes to the translator: dialects disagree on how to say "cool" or "bro".
                    val mayReplace = !entry.annotateOnly && lang == Lang.ES
                    if (mayReplace) exact.getValue(lang).putIfAbsent(n, entry)
                }
            }
        }
        exactIndex = exact
        termIndex = terms.mapValues { (_, list) -> list.sortedByDescending { it.norm.length } }
    }

    /** Curated translation if the WHOLE utterance is a known entry, else null. */
    fun exact(text: String, from: Lang): String? {
        val entry = exactIndex.getValue(from)[normalize(text)] ?: return null
        return entry.terms[from.other]?.firstOrNull()
    }

    /** Hints for known terms found inside [text], e.g. "güey → dude · friendly between friends". */
    fun notes(text: String, from: Lang): List<String> {
        val padded = " ${normalize(text)} "
        val out = ArrayList<String>()
        val seen = HashSet<String>()
        for (v in termIndex.getValue(from)) {
            val e = v.entry
            if (e.type == "phrase") continue
            if (from == Lang.EN && e.type != "work") continue
            if (!padded.contains(" ${v.norm} ") || !seen.add(e.id)) continue
            val shown = e.terms[from]?.firstOrNull() ?: continue
            val other = e.terms[from.other]?.firstOrNull() ?: continue
            val note = e.note[from.other] ?: e.note[from]
            out += if (note != null) "$shown → $other · $note" else "$shown → $other"
            if (out.size >= MAX_NOTES) break
        }
        return out
    }

    companion object {
        private const val DIR = "content/phrasebook"
        private const val MAX_NOTES = 3
        private val MARKS = Regex("\\p{M}+")
        private val NON_WORD = Regex("[^\\p{L}\\p{N}]+")

        /** Lowercase, strip accents and punctuation, so "¿Qué onda?" matches "que onda". */
        fun normalize(s: String): String {
            val decomposed = Normalizer.normalize(s.lowercase(Locale.ROOT), Normalizer.Form.NFD)
            return NON_WORD.replace(MARKS.replace(decomposed, ""), " ").trim()
        }

        fun load(assets: AssetManager): PhraseBook {
            val entries = ArrayList<Entry>()
            for (name in assets.list(DIR).orEmpty().sorted()) {
                if (!name.endsWith(".json")) continue
                try {
                    val text = assets.open("$DIR/$name").bufferedReader(Charsets.UTF_8).use { it.readText() }
                    val arr = JSONObject(text).getJSONArray("entries")
                    for (i in 0 until arr.length()) {
                        parseEntry(arr.getJSONObject(i))?.let { entries.add(it) }
                    }
                } catch (e: Exception) {
                    // One bad pack must never take the app down.
                    Log.w("PhraseBook", "Skipping $name: ${e.message}")
                }
            }
            return PhraseBook(entries)
        }

        private fun parseEntry(o: JSONObject): Entry? {
            val id = o.optString("id")
            if (id.isEmpty()) return null
            val t = o.optJSONObject("t") ?: return null
            val terms = HashMap<Lang, List<String>>()
            for (lang in Lang.entries) {
                val a = t.optJSONArray(lang.code) ?: continue
                terms[lang] = List(a.length()) { a.getString(it) }
            }
            val note = HashMap<Lang, String>()
            o.optJSONObject("note")?.let { n ->
                for (lang in Lang.entries) {
                    val s = n.optString(lang.code)
                    if (s.isNotEmpty()) note[lang] = s
                }
            }
            return Entry(id, o.optString("type", "slang"), terms, note, o.optBoolean("annotate_only", false))
        }
    }
}
