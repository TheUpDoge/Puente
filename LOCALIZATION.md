# Localization (translating the app itself)

Rule: no user-visible text in Kotlin or layout XML. It all lives in `strings.xml`.

- English (default): `app/src/main/res/values/strings.xml`
- Spanish: `app/src/main/res/values-es/strings.xml`

Android picks the file that matches the phone's language, so a Spanish-language phone shows the
Spanish interface automatically.

## Add a language (example: Portuguese)

1. Copy `values/strings.xml` to `app/src/main/res/values-pt/strings.xml`.
2. Translate the text between the tags. Keep `%1$s`, `%2$s` placeholders and the `\'` escapes.
3. Leave `AUTO / EN / ES` mode labels as they are unless you are also adding a speech language.

Note: this translates the **interface**. Adding Portuguese as a **spoken** language is a separate,
larger step: a speech model in `app/build.gradle.kts`, a new value in `Lang.kt`, a translator pair
in `MlKitTranslator.kt`, and content-pack keys (`"pt": [...]`).

## Content packs

Words and lessons are translated inside the pack files themselves (per-language keys). See
`CONTENT.md`.

## Quick check

In Android Studio, open `strings.xml` and use *Open Translations Editor*; missing strings are
highlighted. Every key in `values/` should exist in `values-es/`.
