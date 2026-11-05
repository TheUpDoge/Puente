# Puente

**Puente** (bridge) is an English ⇄ Spanish translator and teacher for Spanish the way it's actually
spoken in Southeast Texas: Tejano, Tex-Mex and Chicano. *Parquea la troca*, *¿ya pagaste los biles?*,
*ahí te watcho*. It runs offline, and the words live in plain JSON that native speakers can fix.

There are two builds in this repo:

| Build | Where | State |
|---|---|---|
| **Puente Tejano**: translator + course + word book | [`web/`](web/) | Works today in any phone browser, offline. No build step. |
| **Android alpha**: hands-free shop-floor translator | Kotlin files at the root, full project in `puente.zip` | Untested scaffold (see below) |

## Puente Tejano (web app)

Four tabs:

- **Traduce (Translate).** Talk or type. **Me** locks the ear to English, **Them** to Spanish. The big line
  stays on screen so you can turn the phone around. Spanish comes out the way the place you picked on
  the map says it (*parquea la troca* in Houston), with the formal version underneath
  (*estaciona la camioneta*).
  Spanglish is welcome: in "oye, where is la troca?" the words already in the target language are kept
  as said, so the result is always one clean language. **Open it up** shows how a line was cut.
- **Aprende (Learn).** *Tejano 101* with Tía Lupe: 8 lessons, 80 lines (greetings, la familia, Spanglish
  verbs, la comida, Caló, en el jale, Southeast Texas life, cariño y música). Every lesson has a word
  list with audio, flashcards that bring missed cards back first, a quiz, and **¡Dilo!**, where you
  say the line and the phone grades it. You earn XP and a daily streak (*racha*).
- **Palabras (Words).** Search every word list: Tejano & Tex-Mex, Chicano Caló, Southeast Texas life &
  work (plants, refineries, hurricanes), Mexican and Cuban slang, shop talk. Each entry has notes on
  tone, a formal equivalent, and a warning when a word can offend.
- **Mapa (Map).** Tap where you're talking: Houston & the Golden Triangle, San Antonio, El Valle,
  El Paso, Monterrey, Mexico City, or Miami & Cuba. Puente switches its words (*troca* / *camioneta*,
  *bus* / *camión* / *guagua*, *feria* / *lana* / *baro*), the Spanish voice it speaks with, and the
  Spanish its ear listens for. Then **taper** it: Formal → Light → Local → Full accent. At Full
  accent you also see how the line sounds in relaxed talk (*¿Cómo ehtáh?* in Havana, *'tá bien* in
  Houston), and Puente says it that way. Lines already on screen change with you. "Same word,
  different places" compares the words that change the most.

### Run it

It's static files: HTML, CSS, JavaScript modules and JSON. Serve the `web/` folder with any web server
(opening `index.html` straight from disk won't load the word lists):

```
cd web
npx serve .            # or: python3 -m http.server 8080
npm test               # translator, course, dialect and content checks (Node 22+)
npm run test:browser   # real-browser smoke test (needs Playwright)
```

Open it on your phone and use **Add to Home Screen**. After the first visit it works with no signal.

**Free hosting on GitHub Pages:** in the repo settings go to **Pages → Source: GitHub Actions**. Every
push to `main` that touches `web/` then runs both test suites and publishes the app only if they pass
(`.github/workflows/web.yml`).

**Built to not break quietly.** Guard tests fail the build if a change would break older iPhones
(regex lookbehind, unsupported before iOS 16.4), drop a file from the offline cache, or point the page at a
missing file. Each tab starts on its own, so one broken piece can't blank the whole app, and opening
`index.html` straight from disk explains what to do instead of showing a blank screen.

### Where the parts are

| Piece | File | What it does |
|---|---|---|
| Screens | `web/index.html`, `web/js/app.js`, `web/css/puente.css` | Three tabs, no framework |
| Ear | `web/js/ear.js` | Mic, pause, echo guard, Me / Them, speaks once (listens in es-US, falls back to es-MX) |
| Cutter | `web/js/translate.js` | Longest match, one language out, code-switch keep, Tejano → formal, notes |
| Tejano layer | `web/js/tejano.js` | Tejano phrases and nouns: what Puente says by default |
| Dialect map | `web/js/dialects.js`, `web/js/map-data.js` | Regions, taper levels, word swaps per region, "sounds like" rules, map outlines |
| Base book | `web/js/lexicon.js` | Shop-floor phrases and nouns from the Grok build |
| Course engine | `web/js/course.js` | Quiz builder, grading, flashcard boxes, XP and streak |
| Word lists | `web/content/phrasebook/*.json` | Same format the Android app reads |
| Course | `web/content/courses/tejano-101.json` | Lessons, Tía's tips, formal versions |
| Offline | `web/sw.js`, `web/manifest.webmanifest` | Caches everything; bump `VERSION` when files change |

`selfCheck()` in `translate.js` is the regression list (also run by `npm test`). In the browser console:
`__puente.selfCheck()` should return `[]`.

### Honest limits

- **Starter content.** Every pack and the course say `starter-needs-native-review`. The words come from
  common Tex-Mex and Caló usage, but families and towns differ (wela or güela, nina or madrina).
  Have Tejano speakers check before you rely on it.
- **A phrasebook, not a full translator.** It knows the phrases in the book and leaves out what it
  doesn't know instead of guessing. Long free-form sentences will come out partial.
- **The ear is the browser's.** Chrome and Safari listen well. Some browsers send audio to their
  speech service; Chrome uses on-device recognition where the phone supports it. Firefox has no ear
  yet, but typing works.
- **Voices vary.** Audio uses the phone's Spanish voices: the map picks U.S., Mexican or Caribbean
  Spanish if the phone has that voice installed. A voice can't really do a Havana or Chihuahua accent;
  Full accent gets close by reading the relaxed spelling (it can't say *sh* for *ch*, so El Paso's
  *sh* is shown but not spoken).
- **Regions are big.** The map shows common patterns, not rules. Every family talks its own way.

## Android alpha

A hands-free English ⇄ Spanish translator for the shop floor and the truck cab. No buttons, no
"tap to speak": open it, set the phone down, and it shows live translations of whoever is talking.

- **Offline-first.** Speech recognition works with no signal. Translation works offline after a
  one-time download of two small language packs.
- **Free where it matters.** Translation and essential-service content stay free. Anything paid
  later (for example, premium courses) is built on top and is decided separately.
- **Open and editable.** Slang, shop vocabulary, courses and legal/travel resources are plain JSON
  files that coworkers and native speakers can fix without touching code.

> **Status: alpha scaffold.** It was written without an Android SDK available, so nothing here has
> been compiled or run on a phone yet. Expect a short fix-up round on the first real build. See
> "Known limits" below.

### Build the APK (pick one)

**1. GitHub Actions, no computer needed**
Push this folder to a GitHub repo. Open the **Actions** tab → **Build APK** → **Run workflow**.
When it finishes, download the `puente-debug-apk` artifact, unzip it, and install the `.apk`
(Android will ask you to allow installs from unknown sources).

**2. Android Studio**
Open this folder, let Gradle sync (the first build downloads the two speech models, about 80 MB),
then Run, or use Build → Build APK(s).

**3. Command line**
```
./gradlew assembleDebug
```
The APK lands in `app/build/outputs/apk/debug/`.

First launch: allow the microphone, and be online once so the two translation packs can download.
After that it runs fully offline. The debug APK is large (~100 MB) because the speech models are
bundled inside it.

### How it works

```
 microphone (16 kHz, 100 ms chunks)
        |
        +--> Vosk recognizer EN --+
        |                         +--> pick the more confident one --> text + language
        +--> Vosk recognizer ES --+
                                          |
              PhraseBook (slang/work) <---+--> TextTranslator (ML Kit today, swappable)
                                          |
                          live line (partial) and history (final)
```

| Piece | File | Notes |
|---|---|---|
| Mic loop + auto language detect | `speech/SpeechPipeline.kt` | Two recognizers on the same audio; heuristic pick |
| Translation | `translate/TextTranslator.kt`, `MlKitTranslator.kt` | Interface + current engine |
| Slang / vocabulary | `content/PhraseBook.kt` + `assets/content/phrasebook/*.json` | Data-driven |
| Screen | `MainActivity.kt`, `LineAdapter.kt`, `res/layout/*` | One screen, no controls needed |

The small AUTO / EN / ES chip is an escape hatch for noisy places: tap to lock one language.

### Content packs (courses, slang, legal/travel resources)

Everything that is *words about the world* lives in `app/src/main/assets/content/`:

- `phrasebook/` slang and shop vocabulary (**used by the alpha**)
- `courses/` dialect-, job- and situation-specific lessons (sample only, UI planned for 1.0/2.0)
- `resources/` Mexico–U.S. legal and travel links (sample only, UI planned)

Format and review rules: [`docs/CONTENT.md`](docs/CONTENT.md). Every starter pack is marked
`needs-native-review`; please have Spanish speakers (Mexican and Cuban coworkers are ideal) check
the entries before a public release.

### Translating the app itself

All on-screen text is in `res/values/strings.xml` (English) and `res/values-es/strings.xml`
(Spanish). The phone's language picks which one shows. To add a language, see
[`docs/LOCALIZATION.md`](docs/LOCALIZATION.md).

### Roadmap

- **Alpha (this):** continuous listening, auto language pick, live captions, slang hints.
- **Next:** foreground service so it keeps listening with the screen off, optional spoken output
  to an earbud, noise handling, a feedback button ("that translation was wrong") that saves
  corrections to the phrasebook.
- **1.0:** swap in fully open-source engines, content-pack browser, first course.
- **2.0:** courses by dialect, job and situation; legal and travel resource section.

### Known limits (honest list)

- **Untested build.** First compile may need small fixes (library versions, one or two API details).
- **Language auto-detect is a heuristic.** It compares how confident the English and Spanish
  recognizers are. Short phrases and shop noise will trip it; the lock chip is the workaround.
- **Memory.** Two small speech models are loaded at once (roughly 300 MB each at runtime). Older
  phones with 3 GB RAM or less may struggle.
- **Accuracy.** Vosk "small" models are fast and offline but not as accurate as cloud dictation,
  especially with regional accents and slang. Bigger or newer models are the main upgrade path.
- **Translation engine is not open source.** ML Kit is free and offline after download, but it is a
  closed Google SDK and needs Google Play services. It is isolated behind `TextTranslator` for
  that reason.
- **No foreground service yet.** The mic stops when the app is in the background (on purpose).
- **Legal/travel content is a sample.** Links are unverified, and nothing here is legal advice.

### License

Not chosen yet. Suggested: Apache-2.0 for code (matches Vosk) and CC BY-SA 4.0 for the content
packs. Add a `LICENSE` file before publishing.

### Credits

Speech: [Vosk](https://alphacephei.com/vosk) (Apache-2.0). Translation: Google ML Kit on-device
translation. Models: `vosk-model-small-en-us-0.15`, `vosk-model-small-es-0.42` (Apache-2.0).
