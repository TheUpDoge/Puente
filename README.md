# Puente (working title)

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

## Build the APK (pick one)

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

## How it works

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

## Content packs (courses, slang, legal/travel resources)

Everything that is *words about the world* lives in `app/src/main/assets/content/`:

- `phrasebook/` slang and shop vocabulary (**used by the alpha**)
- `courses/` dialect-, job- and situation-specific lessons (sample only, UI planned for 1.0/2.0)
- `resources/` Mexico–U.S. legal and travel links (sample only, UI planned)

Format and review rules: [`docs/CONTENT.md`](docs/CONTENT.md). Every starter pack is marked
`needs-native-review`; please have Spanish speakers (Mexican and Cuban coworkers are ideal) check
the entries before a public release.

## Translating the app itself

All on-screen text is in `res/values/strings.xml` (English) and `res/values-es/strings.xml`
(Spanish). The phone's language picks which one shows. To add a language, see
[`docs/LOCALIZATION.md`](docs/LOCALIZATION.md).

## Roadmap

- **Alpha (this):** continuous listening, auto language pick, live captions, slang hints.
- **Next:** foreground service so it keeps listening with the screen off, optional spoken output
  to an earbud, noise handling, a feedback button ("that translation was wrong") that saves
  corrections to the phrasebook.
- **1.0:** swap in fully open-source engines, content-pack browser, first course.
- **2.0:** courses by dialect, job and situation; legal and travel resource section.

## Known limits (honest list)

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

## License

Not chosen yet. Suggested: Apache-2.0 for code (matches Vosk) and CC BY-SA 4.0 for the content
packs. Add a `LICENSE` file before publishing.

## Credits

Speech: [Vosk](https://alphacephei.com/vosk) (Apache-2.0). Translation: Google ML Kit on-device
translation. Models: `vosk-model-small-en-us-0.15`, `vosk-model-small-es-0.42` (Apache-2.0).
