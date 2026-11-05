# Content packs

> **Two homes, one format.** The Android alpha reads packs from `app/src/main/assets/content/`. The
> web app (Puente Tejano) reads them from `web/content/` and lists them in `web/content/index.json`.
> A pack written for one works in the other. The web app also honors the optional fields under
> "Tejano extras" below; older readers simply ignore them.

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

## Tejano extras (optional fields, web app)

Packs and entries may carry a few more fields. All optional; leave them out if they don't apply.

| Where | Field | Meaning |
|---|---|---|
| pack | `title` | `{ "en": "...", "es": "..." }` shown as the filter chip in the Words tab |
| pack | `region` | Free text, for example `"Southeast & South Texas"` |
| entry | `std` | The formal / textbook equivalent of the first `es` form, shown as "Formal: ..." |
| entry | `register` | `casual`, `careful` (can offend, tone matters) or `rough` (strong language). Shown as a badge |

Example:

```json
{
  "id": "tx-parquear", "type": "slang",
  "t": { "es": ["parquear", "parquea", "parqueé"], "en": ["park"] },
  "std": "estacionar",
  "note": { "en": "Tex-Mex: English 'park' + -ear." }
}
```

How the web app uses types:

- `slang`: Spanish heard → curated English. Its note shows when the word is heard **or** when Puente
  says it in Spanish, so an English speaker learns the Tejano word they just showed someone.
- `phrase`: used both ways, no note.
- `work`: used both ways, note shows for either language. With `annotate_only: true` it only adds the
  note and never changes the translation.

**Tejano first, formal beside it.** What Puente *says* in Spanish comes from `web/js/tejano.js` and
`web/js/lexicon.js` (Tejano wording first). `FORMAL_WORDS` and `FORMAL_NOUNS` in `tejano.js` turn that
into textbook Spanish for the "Formal" line. When a noun changes gender (*la traila → el remolque*),
list both genders and the article is fixed for you.

**Courses** (web app) add: `teacher` (`name`, `hello`), and per lesson `icon` (one emoji), `subtitle`,
`tia` (the teacher's intro) and per item `std` (formal version). Each lesson needs at least 4 items
for the quiz; 10 is the sweet spot. Course lines are also added to the translator's book.

Run `npm test` in `web/` after editing: it checks every pack against this format, looks for duplicate
ids, and makes sure the offline cache lists every file.
