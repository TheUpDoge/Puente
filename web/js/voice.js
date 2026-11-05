// Text-to-speech helpers shared by the translator and the lessons.
// Spanish prefers a U.S. Spanish voice (closest to Tejano), then Mexican, then any Spanish.

let voices = [];

function pull() {
  if (typeof speechSynthesis === "undefined") return;
  voices = speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && typeof speechSynthesis !== "undefined") {
  pull();
  speechSynthesis.addEventListener?.("voiceschanged", pull);
}

export function canSpeak() {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
}

/** @param {"en" | "es"} lang */
export function pickVoice(lang) {
  if (!voices.length) pull();
  const prefs = lang === "es" ? ["es-us", "es-mx", "es-419", "es"] : ["en-us", "en-gb", "en"];
  for (const pref of prefs) {
    const voice = voices.find((item) => item.lang.toLowerCase().replace("_", "-").startsWith(pref));
    if (voice) return voice;
  }
  return null;
}

export function speechLang(lang) {
  return lang === "es" ? "es-US" : "en-US";
}

/**
 * Say one line. Returns a promise that settles when speech ends (or right away if it can't speak).
 * @param {string} text
 * @param {"en" | "es"} lang
 * @param {{ rate?: number, onstart?: () => void }} [opts]
 */
export function speak(text, lang, opts = {}) {
  return new Promise((resolve) => {
    if (!canSpeak() || !String(text ?? "").trim()) {
      resolve(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(lang);
    utter.lang = voice?.lang ?? speechLang(lang);
    if (voice) utter.voice = voice;
    utter.rate = opts.rate ?? 0.95;
    utter.onstart = () => opts.onstart?.();
    utter.onend = () => resolve(true);
    utter.onerror = () => resolve(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  });
}

export function hush() {
  if (canSpeak()) speechSynthesis.cancel();
}

/** Speech recognition constructor, if this browser has one. */
export function recognizer() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Listen for one short answer (lessons). Resolves with the best transcripts, or [] on silence.
 * Tries es-US first and falls back to es-MX if the browser doesn't know it.
 * @returns {{ promise: Promise<string[]>, stop: () => void }}
 */
export function listenOnce(lang) {
  const Ctor = recognizer();
  let rec = null;
  let stopped = false;
  const promise = new Promise((resolve) => {
    if (!Ctor) {
      resolve([]);
      return;
    }
    const codes = lang === "es" ? ["es-US", "es-MX"] : ["en-US"];
    const attempt = (i) => {
      if (stopped) {
        resolve([]);
        return;
      }
      rec = new Ctor();
      rec.lang = codes[i];
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 4;
      let done = false;
      const finish = (out) => {
        if (done) return;
        done = true;
        resolve(out);
      };
      rec.onresult = (ev) => {
        const out = [];
        for (let r = 0; r < ev.results.length; r++) {
          const result = ev.results[r];
          for (let a = 0; a < result.length; a++) {
            const t = result[a]?.transcript?.trim();
            if (t) out.push(t);
          }
        }
        finish(out);
      };
      rec.onerror = (ev) => {
        if (ev.error === "language-not-supported" && i + 1 < codes.length) {
          done = true;
          attempt(i + 1);
          return;
        }
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          finish(null);
          return;
        }
        finish([]);
      };
      rec.onend = () => finish([]);
      try {
        rec.start();
      } catch {
        finish([]);
      }
    };
    attempt(0);
  });
  return {
    promise,
    stop: () => {
      stopped = true;
      try {
        rec?.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
