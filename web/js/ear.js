// The ear: keeps the mic open, folds growing guesses into one sentence, waits for a pause,
// then speaks the translation once. Ported from the Grok build, with a Tejano ear (es-US) and
// a dialect switch (Tejano or formal Spanish out loud).

import { detectLang, foldHeard, langEvidence, sameUtterance, translate } from "./translate.js";
import { normalize, tokens } from "./normalize.js";
import { pickVoice, recognizer } from "./voice.js";

/** @typedef {"en" | "es"} Lang */
/** @typedef {"auto" | Lang} Lock */
/** @typedef {"tejano" | "formal"} Dialect */

const FILLERS = new Set(["uh", "um", "hmm", "huh", "eh", "ah", "oh", "er", "erm", "mhm", "mmm", "hm", "este", "pos", "pues"]);
const STORE = "puente-tx-session-v1";

export function uiLang() {
  if (typeof navigator === "undefined") return "en";
  return (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
}

function similar(a, b) {
  const ta = normalize(a).split(" ").filter(Boolean);
  const tb = normalize(b).split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const as = ta.join(" ");
  const bs = tb.join(" ");
  if (as === bs) return true;
  if (ta.length >= 2 && (` ${bs} `.includes(` ${as} `) || ` ${as} `.includes(` ${bs} `))) return true;
  const sb = new Set(tb);
  let inter = 0;
  for (const t of ta) if (sb.has(t)) inter += 1;
  const union = new Set([...ta, ...tb]).size;
  return union > 0 && inter / union >= 0.72;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function freshState() {
  return {
    status: "idle",
    lock: "auto",
    voice: true,
    dialect: "tejano",
    speaking: false,
    holding: false,
    localEar: false,
    ear: "en",
    live: null,
    lines: [],
    ui: uiLang(),
  };
}

export class Ear {
  constructor(emit) {
    this.emit = emit;
    this.running = false;
    this.status = "idle";
    this.lock = "auto";
    this.voice = true;
    this.dialect = "tejano";
    this.speaking = false;
    this.localReady = false;
    this.ui = uiLang();
    this.sticky = this.ui;
    this.esCode = "es-US";
    this.live = null;
    this.lines = [];
    this.rec = null;
    this.listening = false;
    this.seq = 1;
    this.settleTimer = 0;
    this.restartTimer = 0;
    this.speakGen = 0;
    this.ignoreUntil = 0;
    this.flipCooldown = 0;
    this.lastSpokenSource = "";
    this.lastSpokenTranslation = "";
    this.lastOut = "es";
    this.lastSpokenNorm = "";
    this.lastSpokenAt = 0;
    this.lastStartAt = 0;
    this.fastDeaths = 0;
    this.endReason = "end";
    this.earDirty = false;
    this.replyEar = null;
    this.pending = null;
    this.wakeSentinel = null;

    const stored = loadStore();
    if (stored.lock === "auto" || stored.lock === "en" || stored.lock === "es") this.lock = stored.lock;
    if (typeof stored.voice === "boolean") this.voice = stored.voice;
    if (stored.dialect === "tejano" || stored.dialect === "formal") this.dialect = stored.dialect;
    if (Array.isArray(stored.lines)) {
      this.lines = stored.lines
        .filter((line) => line && typeof line.original === "string" && typeof line.translation === "string")
        .slice(-40)
        .map((line) => ({
          id: String(line.id ?? `r${this.seq++}`),
          lang: line.lang === "es" ? "es" : "en",
          original: line.original,
          translation: line.translation,
          alt: typeof line.alt === "string" ? line.alt : null,
          tejano: typeof line.tejano === "string" ? line.tejano : line.translation,
          formal: typeof line.formal === "string" ? line.formal : null,
          notes: Array.isArray(line.notes) ? line.notes.filter((n) => n && typeof n.es === "string") : [],
          coverage: typeof line.coverage === "number" ? line.coverage : 1,
          exact: Boolean(line.exact),
          safety: Boolean(line.safety),
          at: typeof line.at === "number" ? line.at : 0,
          spoken: true,
        }));
    }
    this.push();
  }

  dispose() {
    this.running = false;
    clearTimeout(this.settleTimer);
    clearTimeout(this.restartTimer);
    this.hush();
    this.dropRec();
    this.releaseWake();
  }

  snapshot() {
    return {
      status: this.status,
      lock: this.lock,
      voice: this.voice,
      dialect: this.dialect,
      speaking: this.speaking,
      holding: this.pending !== null && !this.speaking,
      localEar: this.localReady,
      ear: this.heardLang(),
      live: this.live ? { ...this.live } : null,
      lines: this.lines.map((line) => ({ ...line, notes: [...line.notes] })),
      ui: this.ui,
    };
  }

  /** Open the mic and keep it open until stop(). Call from the click itself. */
  activate() {
    if (this.running) return;
    this.running = true;
    this.status = recognizer() ? "listening" : "unsupported";
    this.push();
    if (recognizer()) this.openAndStart();
    void this.tryLocal();
    void this.wake();
  }

  stop() {
    this.running = false;
    this.status = "idle";
    this.live = null;
    this.pending = null;
    this.replyEar = null;
    clearTimeout(this.settleTimer);
    clearTimeout(this.restartTimer);
    this.hush();
    this.dropRec();
    this.releaseWake();
    this.push();
  }

  setLock(lock) {
    if (lock === this.lock) return;
    this.lock = lock;
    if (lock === "en" || lock === "es") this.sticky = lock;
    this.pending = null;
    this.live = null;
    clearTimeout(this.settleTimer);
    this.persist();
    this.push();
    if (this.running) this.restartRec();
  }

  setVoice(on) {
    this.voice = on;
    if (!on) this.hush();
    this.persist();
    this.push();
  }

  setDialect(dialect) {
    if (dialect !== "tejano" && dialect !== "formal") return;
    this.dialect = dialect;
    for (const line of this.lines) {
      if (!line.formal) continue;
      const { say, alt } = this.pick({ text: line.tejano, formal: line.formal });
      line.translation = say;
      line.alt = alt;
    }
    this.persist();
    this.push();
  }

  clear() {
    this.lines = [];
    this.live = null;
    this.persist();
    this.push();
  }

  submit(text) {
    const clean = String(text ?? "").trim();
    if (!clean) return;
    this.flushPending();
    const lang = this.lock === "auto" ? detectLang(clean, this.sticky) : this.lock;
    this.commit(clean, lang, false);
  }

  /** English floor phrase. Speaks Spanish even if the same line just played. */
  say(text) {
    const clean = String(text ?? "").trim();
    if (!clean) return;
    clearTimeout(this.settleTimer);
    this.pending = null;
    this.commit(clean, "en", true);
  }

  again() {
    if (!this.lastSpokenTranslation) return;
    this.utter(this.lastSpokenTranslation, this.lastOut, false);
  }

  /** Speak any line from the log again. */
  replay(id) {
    const line = this.lines.find((item) => item.id === id);
    if (!line || !line.translation) return;
    this.lastSpokenTranslation = line.translation;
    this.lastSpokenSource = line.original;
    this.lastOut = line.lang === "en" ? "es" : "en";
    this.utter(line.translation, this.lastOut, line.safety);
  }

  push() {
    this.emit(this.snapshot());
  }

  persist() {
    try {
      const payload = { voice: this.voice, lock: this.lock, dialect: this.dialect, lines: this.lines.slice(-40) };
      localStorage.setItem(STORE, JSON.stringify(payload));
    } catch {
      /* private mode */
    }
  }

  heardLang() {
    if (this.lock === "en" || this.lock === "es") return this.lock;
    return this.sticky;
  }

  bcp(lang) {
    return lang === "en" ? "en-US" : this.esCode;
  }

  pick(hit) {
    const tejano = hit.text;
    if (this.dialect === "formal" && hit.formal) return { say: hit.formal, alt: tejano };
    return { say: tejano, alt: hit.formal };
  }

  openAndStart() {
    if (!this.running || this.speaking || this.listening) return;
    const Ctor = recognizer();
    if (!Ctor) {
      this.status = "unsupported";
      this.push();
      return;
    }
    if (!this.rec) this.rec = this.makeRec(Ctor);
    try {
      this.lastStartAt = Date.now();
      this.rec.start();
      this.listening = true;
      const was = this.status;
      if (this.status !== "offline-ear") this.status = "listening";
      if (was !== this.status) this.push();
    } catch {
      this.listening = false;
      this.dropRec();
      this.scheduleRestart(800);
    }
  }

  makeRec(Ctor) {
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.lang = this.bcp(this.heardLang());
    if (this.localReady) rec.processLocally = true;
    rec.onresult = (ev) => this.onResult(ev);
    rec.onerror = (ev) => this.onError(ev.error);
    rec.onend = () => {
      this.listening = false;
      if (!this.running || this.speaking) return;
      const lived = Date.now() - this.lastStartAt;
      let delay = 400;
      if (this.endReason === "no-speech") delay = 1500;
      if (this.endReason === "dead") delay = 1800;
      if (lived < 900) {
        this.fastDeaths += 1;
        delay = Math.min(6000, 900 * this.fastDeaths);
        if (this.localReady && this.fastDeaths >= 2) this.localReady = false;
      } else {
        this.fastDeaths = 0;
      }
      this.endReason = "end";
      if (this.rec === rec && (this.earDirty || !this.localReady)) this.rec = null;
      this.earDirty = false;
      this.scheduleRestart(delay);
    };
    return rec;
  }

  dropRec() {
    const rec = this.rec;
    this.rec = null;
    this.listening = false;
    if (!rec) return;
    rec.onend = null;
    rec.onresult = null;
    rec.onerror = null;
    try {
      rec.abort();
    } catch {
      /* already stopped */
    }
  }

  restartRec() {
    if (!this.running) return;
    this.dropRec();
    this.scheduleRestart(40);
  }

  scheduleRestart(delay) {
    if (!this.running || this.speaking) return;
    clearTimeout(this.restartTimer);
    const wait = Math.max(350, delay);
    this.restartTimer = setTimeout(() => {
      if (this.running && !this.speaking) this.openAndStart();
    }, wait);
  }

  onError(error) {
    if (error === "aborted") return;
    if (error === "no-speech") {
      this.endReason = "no-speech";
      return;
    }
    if (error === "not-allowed" || error === "service-not-allowed") {
      this.running = false;
      this.status = "denied";
      clearTimeout(this.restartTimer);
      this.dropRec();
      this.push();
      return;
    }
    if (error === "network") {
      this.status = "offline-ear";
      this.endReason = "dead";
      this.push();
      return;
    }
    if (error === "language-not-supported") {
      // No U.S. Spanish model here: fall back to Mexican Spanish, then to the cloud ear.
      if (this.heardLang() === "es" && this.esCode === "es-US") this.esCode = "es-MX";
      else this.localReady = false;
      this.rec = null;
      this.endReason = "dead";
      return;
    }
    this.endReason = "dead";
  }

  onResult(ev) {
    const lang = this.heardLang();
    let heard = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const result = ev.results[i];
      if (!result) continue;
      const alt = this.bestAlt(result, lang);
      if (!alt.text) continue;
      heard = foldHeard(heard, alt.text);
    }
    if (heard) this.absorb(heard);
  }

  bestAlt(result, lang) {
    let best = { text: "", confidence: 0, score: -1 };
    for (let i = 0; i < result.length; i++) {
      const alt = result[i];
      if (!alt) continue;
      const text = alt.transcript.trim();
      if (!text) continue;
      const hit = translate(text, lang);
      const evidence = langEvidence(text, lang);
      let score = hit.coverage * 4 + (alt.confidence || 0) + (i === 0 ? 0.15 : 0);
      if (this.lock === "auto" && evidence.lang !== lang && evidence.margin >= 2) score += 3;
      if (score > best.score) best = { text, confidence: alt.confidence || 0, score };
    }
    return best;
  }

  isEcho(text) {
    if (!this.lastSpokenTranslation && !this.lastSpokenSource) return false;
    const hot = this.speaking || Date.now() < this.ignoreUntil;
    if (!hot) return false;
    return similar(text, this.lastSpokenSource) || similar(text, this.lastSpokenTranslation);
  }

  noteEar(next) {
    if (this.lock !== "auto" || this.sticky === next) return;
    if (Date.now() < this.flipCooldown) return;
    this.sticky = next;
    this.flipCooldown = Date.now() + 8000;
    this.earDirty = true;
  }

  absorb(text) {
    if (!text || this.speaking || Date.now() < this.ignoreUntil) return;
    if (this.isEcho(text)) return;

    let lang = this.heardLang();
    if (this.lock === "auto") {
      const evidence = langEvidence(text, lang);
      const spanishScript = /[áéíóúñ¿¡]/i.test(text);
      if (evidence.lang !== lang && (evidence.margin >= 2 || spanishScript)) {
        this.noteEar(evidence.lang);
        lang = evidence.lang;
      }
    }

    const now = Date.now();
    if (!this.pending) {
      this.pending = { original: text, lang, at: now };
    } else if (!sameUtterance(this.pending.original, text) && now - this.pending.at > 3200) {
      this.flushPending();
      this.pending = { original: text, lang, at: now };
    } else {
      const next = foldHeard(this.pending.original, text);
      const changed = normalize(next) !== normalize(this.pending.original);
      this.pending.original = next;
      this.pending.lang = lang;
      if (changed) this.pending.at = now;
    }

    const pending = this.pending;
    if (!pending) return;
    pending.lang = this.lock === "auto" ? detectLang(pending.original, this.heardLang()) : this.lock;
    const hit = translate(pending.original, pending.lang, { reader: this.ui });
    this.live = { lang: pending.lang, original: pending.original, translation: this.pick(hit).say };
    if (pending.at === now) this.armSettle(hit.safety);
    this.push();
  }

  armSettle(safety) {
    clearTimeout(this.settleTimer);
    const wait = safety ? 350 : 4000;
    this.settleTimer = setTimeout(() => this.flushPending(), wait);
  }

  flushPending() {
    clearTimeout(this.settleTimer);
    this.settleTimer = 0;
    const pending = this.pending;
    this.pending = null;
    if (!pending) return;
    const text = pending.original.trim();
    if (!text || this.isEcho(text)) {
      this.live = null;
      this.push();
      return;
    }
    const last = this.lines[this.lines.length - 1];
    if (last && normalize(last.original) === normalize(text) && Date.now() - last.at < 8000) {
      this.live = null;
      this.push();
      return;
    }
    const hit = translate(text, pending.lang);
    const words = tokens(text).length;
    const evidence = langEvidence(text, pending.lang);
    const earMarkers = pending.lang === "en" ? evidence.en : evidence.es;
    if (this.lock === "auto" && !hit.exact && !hit.safety && words >= 4 && hit.coverage < 0.3 && earMarkers <= 1) {
      this.noteEar(pending.lang === "en" ? "es" : "en");
    }
    this.commit(text, pending.lang, false);
  }

  commit(text, lang, force) {
    const hit = translate(text, lang, { reader: this.ui });
    const { say, alt } = this.pick(hit);
    const line = {
      id: `l${this.seq++}`,
      lang,
      original: text,
      translation: say,
      alt,
      tejano: hit.text,
      formal: hit.formal,
      notes: hit.notes,
      coverage: hit.coverage,
      exact: hit.exact,
      safety: hit.safety,
      at: Date.now(),
      spoken: false,
    };
    this.lines.push(line);
    if (this.lines.length > 80) this.lines.shift();
    this.live = null;
    this.persist();
    this.push();
    this.speakLine(line.id, force);
  }

  speakLine(id, force) {
    const line = this.lines.find((item) => item.id === id);
    if (!line || line.spoken) return;
    line.spoken = true;
    if (!this.voice) return;
    const say = line.translation.trim();
    if (!say) return;
    const normSrc = normalize(line.original);
    const normSay = normalize(say);
    if (FILLERS.has(normSrc)) return;
    if (!force && !line.safety && line.coverage < 0.6 && !line.exact) return;
    if (!line.safety && normSay === normSrc) return;
    if (!force && !line.safety && normSay === this.lastSpokenNorm && Date.now() - this.lastSpokenAt < 8000) return;
    this.lastSpokenNorm = normSay;
    this.lastSpokenAt = Date.now();
    this.lastSpokenSource = line.original;
    this.lastSpokenTranslation = say;
    this.lastOut = line.lang === "en" ? "es" : "en";
    if (this.lock === "auto") this.replyEar = line.lang === "en" ? "es" : "en";
    this.utter(say, this.lastOut, line.safety);
  }

  utter(text, lang, safety) {
    if (typeof speechSynthesis === "undefined") return;
    const gen = ++this.speakGen;
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(lang);
    utter.lang = voice?.lang ?? (lang === "es" ? "es-US" : "en-US");
    if (voice) utter.voice = voice;
    utter.rate = safety ? 1.02 : 0.96;
    utter.onstart = () => {
      if (gen !== this.speakGen) return;
      this.pauseEar();
      this.push();
    };
    utter.onend = () => {
      if (gen !== this.speakGen) return;
      this.finishSpeak();
    };
    utter.onerror = () => {
      if (gen !== this.speakGen) return;
      this.finishSpeak();
    };
    this.pauseEar();
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  pauseEar() {
    const was = this.speaking;
    this.speaking = true;
    this.ignoreUntil = Date.now() + 1600;
    clearTimeout(this.restartTimer);
    if (!was) this.push();
  }

  finishSpeak() {
    this.speaking = false;
    this.ignoreUntil = Date.now() + 1600;
    if (this.lock === "auto" && this.replyEar) {
      this.sticky = this.replyEar;
      this.replyEar = null;
      this.flipCooldown = Date.now() + 1200;
      this.earDirty = true;
    }
    if (this.running && !this.listening) this.scheduleRestart(400);
    this.push();
  }

  hush() {
    const wasSpeaking = this.speaking;
    this.speakGen += 1;
    this.speaking = false;
    this.replyEar = null;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (wasSpeaking && this.running && !this.listening) this.scheduleRestart(400);
  }

  async tryLocal() {
    const Ctor = recognizer();
    if (!Ctor?.available) return;
    const opts = { langs: ["en-US", "es-US"], processLocally: true, quality: "dictation" };
    try {
      let status = await Ctor.available(opts);
      if (status === "unavailable") {
        opts.langs = ["en-US", "es-MX"];
        status = await Ctor.available(opts);
        if (status !== "unavailable") this.esCode = "es-MX";
      }
      if (!this.running) return;
      if (status === "available") {
        this.localReady = true;
        this.earDirty = true;
        this.push();
        return;
      }
      if ((status === "downloadable" || status === "downloading") && Ctor.install) {
        const ok = await Ctor.install(opts);
        if (ok && this.running) {
          this.localReady = true;
          this.earDirty = true;
          this.push();
        }
      }
    } catch {
      /* cloud ear is fine */
    }
  }

  async wake() {
    try {
      if (!navigator.wakeLock) return;
      this.wakeSentinel = await navigator.wakeLock.request("screen");
    } catch {
      /* optional */
    }
  }

  releaseWake() {
    const sentinel = this.wakeSentinel;
    this.wakeSentinel = null;
    if (sentinel) void sentinel.release().catch(() => undefined);
  }
}
