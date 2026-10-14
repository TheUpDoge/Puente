# Content packs

All pack files are UTF-8 JSON in `app/src/main/assets/content/<kind>/`. Drop a new `.json` file in
the folder and it is picked up; no code change. A broken file is skipped (and logged), it never
crashes the app.

Common top-level fields: `schema` (always 1 for now), `kind`, `id`, `status`, `dialects`
(language-region codes such as `es-MX`, `es-CU`, `es-US`), optional `job` and `situation` tags.

**Status values.** Use `starter-needs-native-review` until a native speaker has checked the pack.
Do not ship a pack to the public while it still says that.

Language keys are two-letter codes (`en`, `es`). Adding a language later means adding keys, not
changing the structure.

## `phrasebook` (used in the alpha)

```json
{
  "schema": 1, "kind": "phrasebook", "id": "es-mx-slang",
  "status": "starter-needs-native-review", "dialects": ["es-MX"],
  "entries": [
    {
      "id": "mx-guey",
      "type": "slang",
      "t": { "es": ["güey", "wey", "guey"], "en": ["dude", "bro"] },
      "note": { "en": "Friendly between friends; can sound rude from a stranger.",
                "es": "Amistoso entre amigos; puede sonar grosero con extraños." }
    }
  ]
}
```

- `id` unique across all packs.
- `type`: `slang`, `work` (shop/trade vocabulary) or `phrase`.
- `t`: per-language word lists. List every spelling the speech recognizer might produce. **The
  first item is the preferred wording** shown to the reader. Accents and punctuation are ignored
  when matching.
- `note`: optional hint. The note under key `en` is shown to an **English reader** (when the
  speaker used Spanish); `es` is for a **Spanish reader**.
- `annotate_only: true`: only show the hint chip, never replace the machine translation (use for
  plain vocabulary like `montacargas → forklift`).

Behavior: if a whole Spanish utterance equals a known entry, the curated English meaning is used.
Otherwise the machine translation is used and known terms inside the sentence appear as small
hints (`güey → dude · …`). English speech is never replaced, because dialects disagree.

## `course` (sample, no UI yet)

A course teaches one language to speakers of another, for a dialect, job and situation:
`teaches`, `for`, `dialects`, `job`, `situation`, `title` (per language), and `lessons[]`, each
with `items[]` of `{ "es": "...", "en": "...", "tip": { "en": "..." } }`. Audio and quizzes get
added as optional fields later.

## `resources` (sample, no UI yet)

Sections of links and phone numbers for Mexico–U.S. travel and legal/consular help. Every entry has
a per-language `title`; links carry `"verified": false` until someone has opened the page and
confirmed it is the official source and still correct. The file-level `disclaimer` must be shown
with any resources screen: general information only, not legal advice.

## Review checklist before any pack goes public

1. A native speaker of that dialect confirmed each entry (and the notes).
2. Nothing in a note is offensive or unfair to a group of people.
3. Resource links open the official site; phone numbers are current.
4. `status` updated and reviewer credited in the pack.
