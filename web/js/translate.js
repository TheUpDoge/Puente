// Puente's phrasebook translator. No network: longest-match against a curated book.
//
// - Tejano / Tex-Mex wording first, with a formal (textbook) version beside it.
// - Code-switching aware: "oye, where is la troca" keeps the Spanish bits in an EN→ES line and
//   the English bits in an ES→EN line, so the output is always one language.
// - Unknown words are left out, never mixed in ("hello how are you doing" → "hola cómo estás").

import { EN_ALIASES, NOUNS, PHRASES, SAFETY } from "./lexicon.js";
import { FORMAL_NOUNS, FORMAL_WORDS, TEJANO_NOUNS, TEJANO_PHRASES, TEJANO_SAFETY } from "./tejano.js";
import { loose, normalize, tokens } from "./normalize.js";

/** @typedef {"en" | "es"} Lang */

let enMap = new Map();
let esMap = new Map();
let esLoose = new Map();
let noted = [];
let noteVariants = [];
let outVariants = [];
let safetyNorms = [];
let installed = false;

/** Lowercase, punctuation out, accents kept. Spanish output is spelled right, so match it exactly. */
function soft(s) {
  return String(s ?? "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim();
}

function cleanGloss(s) {
  return String(s ?? "")
    .replace(/^[¿¡]+/u, "")
    .replace(/[!?.,;:]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function put(map, key, value, force) {
  const k = normalize(key);
  const v = cleanGloss(value);
  if (k.length < 1 || !v) return;
  if (force || !map.has(k)) map.set(k, v);
}

function addPair(en, es, force) {
  put(enMap, en, es, force);
  put(esMap, es, en, force);
}

const ART = {
  el: { a: "un", this: "este", that: "ese", our: "nuestro" },
  la: { a: "una", this: "esta", that: "esa", our: "nuestra" },
  los: { a: "unos", this: "estos", that: "esos", our: "nuestros" },
  las: { a: "unas", this: "estas", that: "esas", our: "nuestras" },
};

function addNoun(noun) {
  const art = ART[noun.art] ?? ART.el;
  addPair(noun.en, noun.es, false);
  addPair(`the ${noun.en}`, `${noun.art} ${noun.es}`, false);
  addPair(`a ${noun.en}`, `${art.a} ${noun.es}`, false);
  addPair(`an ${noun.en}`, `${art.a} ${noun.es}`, false);
  addPair(`this ${noun.en}`, `${art.this} ${noun.es}`, false);
  addPair(`that ${noun.en}`, `${art.that} ${noun.es}`, false);
  addPair(`my ${noun.en}`, `mi ${noun.es}`, false);
  addPair(`your ${noun.en}`, `tu ${noun.es}`, false);
  addPair(`our ${noun.en}`, `${art.our} ${noun.es}`, false);
}

/**
 * Build the book. Call once with the JSON packs (phrasebook) and courses.
 * Order: Tejano phrases → base phrases → nouns → course lines → packs (packs override).
 */
export function install({ packs = [], courses = [] } = {}) {
  enMap = new Map();
  esMap = new Map();
  noted = [];

  for (const [en, es] of TEJANO_PHRASES) addPair(en, es, false);
  for (const [en, es] of PHRASES) addPair(en, es, false);
  for (const noun of TEJANO_NOUNS) addNoun(noun);
  for (const noun of NOUNS) addNoun(noun);
  for (const [en, es] of EN_ALIASES) put(enMap, en, es, false);

  for (const course of courses) {
    for (const lesson of course?.lessons ?? []) {
      for (const item of lesson?.items ?? []) {
        if (typeof item?.es !== "string" || typeof item?.en !== "string") continue;
        addPair(item.en, item.es, false);
        if (typeof item.std === "string") put(esMap, item.std, item.en, false);
      }
    }
  }

  for (const pack of packs) {
    for (const entry of pack?.entries ?? []) {
      const id = String(entry?.id ?? "").trim();
      const en = (entry?.t?.en ?? []).map((s) => String(s).trim()).filter(Boolean);
      const es = (entry?.t?.es ?? []).map((s) => String(s).trim()).filter(Boolean);
      if (!id || en.length === 0 || es.length === 0) continue;
      noted.push({
        id,
        pack: pack.id ?? "",
        type: entry.type ?? "slang",
        annotateOnly: Boolean(entry.annotate_only),
        en,
        es,
        shownEn: cleanGloss(en[0]),
        shownEs: cleanGloss(es[0]),
        noteEn: entry.note?.en,
        noteEs: entry.note?.es,
        std: typeof entry.std === "string" ? entry.std : undefined,
        register: typeof entry.register === "string" ? entry.register : undefined,
      });
    }
  }

  for (const entry of noted) {
    if (entry.annotateOnly) continue;
    for (const es of entry.es) put(esMap, es, entry.shownEn, true);
    if (entry.type !== "slang") for (const en of entry.en) put(enMap, en, entry.shownEs, true);
  }

  esLoose = new Map();
  for (const [k, v] of esMap) {
    const lk = k.replace(/ñ/g, "n");
    if (!esMap.has(lk) && !esLoose.has(lk)) esLoose.set(lk, v);
  }

  safetyNorms = [...SAFETY, ...TEJANO_SAFETY].map((s) => normalize(s)).filter((s) => s.length > 1);

  noteVariants = [];
  outVariants = [];
  for (const entry of noted) {
    if (entry.type === "phrase") continue;
    for (const es of entry.es) {
      const norm = normalize(es);
      if (norm.length > 1) noteVariants.push({ lang: "es", norm, entry });
      const said = soft(es);
      if (said.length > 1) outVariants.push({ norm: said, entry });
    }
    if (entry.type === "work") {
      for (const en of entry.en) {
        const norm = normalize(en);
        if (norm.length > 1) noteVariants.push({ lang: "en", norm, entry });
      }
    }
  }
  noteVariants.sort((a, b) => b.norm.length - a.norm.length);
  outVariants.sort((a, b) => b.norm.length - a.norm.length);
  installed = true;
}

function ensure() {
  if (!installed) install();
}

/** Every pack entry, for the dictionary screen. */
export function entries() {
  ensure();
  return noted.map((e) => ({ ...e, en: [...e.en], es: [...e.es] }));
}

const ES_MARKERS = new Set([
  "el", "la", "los", "las", "una", "que", "del", "al", "por", "para", "con",
  "esta", "estan", "estas", "estoy", "donde", "como", "cuando", "gracias",
  "necesito", "pasame", "aqui", "alla", "muy", "mas", "usted", "hay", "bueno",
  "vale", "orale", "guey", "wey", "aguas", "mande", "chido", "ahorita",
  "camion", "llave", "carga", "porfa", "favor", "oye", "mira", "dale", "sale",
  "listo", "pues", "entonces", "tambien", "tengo", "tiene", "quiero", "puedes",
  "puede", "dame", "traeme", "trae", "espera", "cuidado", "peligro", "alto",
  "ayuda", "trabajo", "herramienta", "montacargas", "desarmador", "tornillo",
  "tuerca", "troca", "señor", "senor", "amigo", "andale", "compadre",
  "simon", "neta", "chamba", "jale", "lonche", "trucha", "paro", "chale",
  "compa", "cuate", "vato", "raza", "feria", "varo", "gacho", "suave",
  "merito", "apurale", "volada", "pedo", "pex", "traila", "yarda",
  "mayordomo", "patron", "morro", "plebe", "quiubo",
  // Tejano
  "nomas", "orita", "pos", "pa", "mijo", "mija", "wela", "welo", "huerco", "huercos",
  "ese", "carnal", "firme", "nel", "parquear", "parquea", "chequea", "lonchar",
  "aseguranza", "biles", "pulga", "zacate", "raspa", "bochorno", "ajua", "pachanga",
  "tardeada", "watcho", "ranfla", "canton", "hijole", "pinche", "ay", "dios", "mio",
]);

const EN_MARKERS = new Set([
  "the", "what", "where", "when", "who", "why", "how", "please", "need",
  "hand", "this", "that", "truck", "load", "watch", "thank", "thanks",
  "heavy", "ready", "wait", "stop", "help", "wrench", "forklift", "here",
  "there", "you", "your", "is", "are", "going", "want", "can", "will", "my",
  "y'all", "yall", "fixing", "fixin",
]);

const WEAK_OVERLAP = new Set([
  "the", "a", "an", "el", "la", "los", "las", "de", "del", "al", "un", "una",
  "to", "of", "y", "and", "que", "es", "is",
]);

const QUESTION =
  /^(what|where|when|who|why|how|which|can|could|would|do|does|did|is|are|will|should|donde|cuanto|cuantos|cuanta|como|cuando|quien|por que|cual|a donde|a que|quieres|tienes|ya pagaste|ya checaste|mande)\b/;

/** Marker-word evidence for each language. */
export function langEvidence(text, fallback) {
  ensure();
  const parts = normalize(text).split(" ").filter(Boolean);
  let es = 0;
  let en = 0;
  for (const part of parts) {
    if (ES_MARKERS.has(part)) es += 1;
    if (EN_MARKERS.has(part)) en += 1;
  }
  if (/[áéíóúñ¿¡]/i.test(text)) es += 2;
  for (const part of parts) {
    const inEs = esMap.has(part);
    const inEn = enMap.has(part);
    if (inEs && !inEn) es += 2;
    else if (inEn && !inEs) en += 2;
  }
  const lang = es === en ? fallback : es > en ? "es" : "en";
  return { lang, es, en, margin: Math.abs(es - en) };
}

/** Which language is this line in? Markers first, phrase coverage breaks close calls. */
export function detectLang(text, fallback) {
  const ev = langEvidence(text, fallback);
  if (ev.margin >= 3) return ev.lang;
  const asEn = dissect(text, "en");
  const asEs = dissect(text, "es");
  const enScore = ev.en + asEn.own * 2 + (asEn.exact ? 4 : 0);
  const esScore = ev.es + asEs.own * 2 + (asEs.exact ? 4 : 0);
  if (enScore === esScore) return ev.lang;
  return enScore > esScore ? "en" : "es";
}

function startsWithWords(hay, needle) {
  if (!needle.length || needle.length > hay.length) return false;
  for (let i = 0; i < needle.length; i++) if (hay[i] !== needle[i]) return false;
  return true;
}

/** Keep one hypothesis. Growing recognition replaces; a real next chunk appends. */
export function foldHeard(prev, next) {
  const a = String(prev ?? "").trim().replace(/\s+/g, " ");
  const b = String(next ?? "").trim().replace(/\s+/g, " ");
  if (!a) return b;
  if (!b) return a;
  const aw = tokens(a);
  const bw = tokens(b);
  if (!aw.length) return b;
  if (!bw.length) return a;
  if (aw.join(" ") === bw.join(" ")) return a.length >= b.length ? a : b;
  if (startsWithWords(bw, aw) || startsWithWords(aw, bw)) return bw.length >= aw.length ? b : a;
  const setB = new Set(bw);
  let inter = 0;
  for (const t of aw) if (setB.has(t)) inter += 1;
  const union = new Set([...aw, ...bw]).size;
  if (union > 0 && inter / union >= 0.62 && Math.min(aw.length, bw.length) >= 2) {
    return bw.length >= aw.length ? b : a;
  }
  const aWords = a.split(" ");
  const bWords = b.split(" ");
  if (aWords.length === aw.length && bWords.length === bw.length) {
    const max = Math.min(aw.length, bw.length, 6);
    for (let n = max; n >= 1; n--) {
      if (n === 1 && (WEAK_OVERLAP.has(bw[0] ?? "") || (bw[0] ?? "").length < 3)) continue;
      let ok = true;
      for (let i = 0; i < n; i++) {
        if (aw[aw.length - n + i] !== bw[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return [...aWords, ...bWords.slice(n)].join(" ");
    }
  }
  return `${a} ${b}`;
}

export function sameUtterance(prev, next) {
  const folded = tokens(foldHeard(prev, next)).length;
  const longer = Math.max(tokens(prev).length, tokens(next).length);
  return folded <= longer + 1;
}

function isSafety(norm) {
  const padded = ` ${norm} `;
  return safetyNorms.some((s) => padded.includes(` ${s} `));
}

function tidy(s) {
  return s
    .replace(/\ba el\b/g, "al")
    .replace(/\bde el\b/g, "del")
    .replace(/(^|\s)(el|la|los|las|un|una|unos|unas|the|a|an)\s+\2(?=\s|$)/g, "$1$2")
    .replace(/(^|\s)(\p{L}+)(?:\s+\2)+(?=\s|$)/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function capFirst(text) {
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i] ?? "";
    if (/\p{L}/u.test(c)) {
      chars[i] = c.toLocaleUpperCase("es");
      break;
    }
  }
  return chars.join("");
}

const FEM_ARTICLES = "la|una|esta|esa|aquella";
const FEM_PLURAL = "las|unas|estas|esas|aquellas";
const AGREE_ONE = new RegExp(`(^|\\s)(${FEM_ARTICLES})\\s+(\\p{L}+)\\s+((?:ya\\s+)?(?:no\\s+)?(?:está|es|estaba|quedó))\\s+(\\p{L}+)o(?=\\s|$)`, "gu");
const AGREE_MANY = new RegExp(`(^|\\s)(${FEM_PLURAL})\\s+(\\p{L}+)\\s+((?:ya\\s+)?(?:no\\s+)?(?:están|son|estaban|quedaron))\\s+(\\p{L}+)os(?=\\s|$)`, "gu");

/** "la traila está listo" → "la traila está lista". Only when the article shows the gender. */
function agree(t) {
  return t.replace(AGREE_ONE, "$1$2 $3 $4 $5a").replace(AGREE_MANY, "$1$2 $3 $4 $5as");
}

/** English read-back sounds like a person: "let us go" → "let's go", "i" → "I". */
function polishEn(t) {
  return t
    .replace(/(^|\s)let us(?=\s|$)/gi, "$1let's")
    .replace(/(^|\s)what is up(?=\s|$)/gi, "$1what's up")
    .replace(/(^|\s)i am(?=\s|$)/g, "$1I'm")
    .replace(/(^|\s)i(?=\s|$)/g, "$1I");
}

function shape(text, to, question, bang) {
  let t = tidy(text);
  if (to === "es") t = agree(t);
  else t = polishEn(t);
  if (!t) return t;
  if (to === "es" && /^por favor\b/i.test(t) && normalize(t) !== "por favor") {
    t = tidy(`${t.replace(/^por favor\s+/i, "")} por favor`);
  }
  if (bang && to === "es") {
    if (!t.startsWith("¡")) t = `¡${t}`;
    if (!t.endsWith("!")) t = `${t}!`;
  } else if (question) {
    if (to === "es" && !t.startsWith("¿")) t = `¿${t}`;
    if (!t.endsWith("?")) t = `${t}?`;
  } else if (bang && !t.endsWith("!")) {
    t = `${t}!`;
  }
  return capFirst(t);
}

// ---- Tejano → formal --------------------------------------------------------------------------

const GENDER_ARTICLES = {
  m: ["el", "un", "este", "ese", "aquel"],
  f: ["la", "una", "esta", "esa", "aquella"],
  mp: ["los", "unos", "estos", "esos", "aquellos"],
  fp: ["las", "unas", "estas", "esas", "aquellas"],
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordRe(phrase) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(phrase)}(?![\\p{L}\\p{N}])`, "giu");
}

let formalRules = null;

function buildFormal() {
  const rules = [];
  for (const [from, to] of FORMAL_WORDS) rules.push([from, to]);
  for (const [from, to, g1, g2] of FORMAL_NOUNS) {
    if (g1 !== g2) {
      const a1 = GENDER_ARTICLES[g1] ?? [];
      const a2 = GENDER_ARTICLES[g2] ?? [];
      for (let i = 0; i < a1.length; i++) rules.push([`${a1[i]} ${from}`, `${a2[i]} ${to}`]);
    }
    rules.push([from, to]);
  }
  rules.sort((a, b) => b[0].length - a[0].length);
  return rules.map(([from, to]) => [wordRe(from), to]);
}

/** Tejano Spanish → textbook Mexican Spanish. Leaves anything it doesn't know alone. */
export function toFormal(text) {
  formalRules ??= buildFormal();
  let t = String(text ?? "");
  for (const [re, to] of formalRules) t = t.replace(re, to);
  return tidy(t);
}

// ---- Notes ------------------------------------------------------------------------------------

function noteOf(entry, reader) {
  return reader === "es" ? entry.noteEs ?? entry.noteEn : entry.noteEn ?? entry.noteEs;
}

function notesFor(norm, from, outNorm, reader) {
  const out = [];
  const seen = new Set();
  const add = (entry) => {
    if (seen.has(entry.id) || out.length >= 3) return;
    seen.add(entry.id);
    out.push({ es: entry.shownEs, en: entry.shownEn, note: noteOf(entry, reader), std: entry.std, register: entry.register });
  };
  const padded = ` ${norm} `;
  for (const variant of noteVariants) {
    if (variant.lang !== from) continue;
    if (padded.includes(` ${variant.norm} `)) add(variant.entry);
  }
  if (from === "en" && outNorm) {
    const paddedOut = ` ${outNorm} `;
    for (const variant of outVariants) {
      if (paddedOut.includes(` ${variant.norm} `)) add(variant.entry);
    }
  }
  return out;
}

export function noteText(n) {
  const head = `${n.es} → ${n.en}`;
  const parts = [head];
  if (n.note) parts.push(n.note);
  if (n.std) parts.push(`Formal: ${n.std}`);
  return parts.join(" · ");
}

// ---- The cutter -------------------------------------------------------------------------------

function lookup(lang, slice) {
  if (lang === "en") return enMap.get(slice);
  return esMap.get(slice) ?? esLoose.get(slice.replace(/ñ/g, "n"));
}

/**
 * Cut a line into the longest pieces the book knows.
 * @returns {{from, to, text, formal, notes, coverage, own, exact, safety, pieces}}
 *   own = words matched in the speaker's language; pieces[].kept = already in the target language.
 */
export function dissect(raw, from, opts = {}) {
  ensure();
  const reader = opts.reader ?? (from === "es" ? "en" : "es");
  const norm = normalize(raw);
  const words = norm ? norm.split(" ") : [];
  const to = from === "en" ? "es" : "en";
  const question = /\?/.test(raw) || QUESTION.test(norm);
  const safety = isSafety(norm);
  const bang = /!/.test(raw) || safety;
  const empty = { from, to, text: "", formal: null, notes: [], coverage: 0, own: 0, exact: false, safety: false, pieces: [] };
  if (!norm) return empty;

  const finish = (joined, coverage, own, exact, pieces) => {
    const text = joined ? shape(joined, to, question, bang) : "";
    let formal = null;
    if (text && to === "es") {
      const f = shape(toFormal(joined), to, question, bang);
      if (normalize(f) !== normalize(text)) formal = f;
    }
    const notes = notesFor(norm, from, to === "es" ? soft(joined) : "", reader);
    return { from, to, text, formal, notes, coverage, own, exact, safety, pieces };
  };

  const whole = lookup(from, norm);
  if (whole) return finish(whole, 1, words.length, true, [{ source: norm, gloss: whole, kept: false }]);

  const out = [];
  const pieces = [];
  let own = 0;
  let kept = 0;
  let i = 0;
  while (i < words.length) {
    let matched = false;
    const max = Math.min(8, words.length - i);
    for (let len = max; len >= 1; len--) {
      const slice = words.slice(i, i + len).join(" ");
      const gloss = lookup(from, slice);
      if (!gloss) continue;
      out.push(gloss);
      pieces.push({ source: slice, gloss, kept: false });
      own += len;
      i += len;
      matched = true;
      break;
    }
    if (matched) continue;
    // Code-switch: this chunk is already in the target language, keep it as said.
    for (let len = max; len >= 1; len--) {
      const slice = words.slice(i, i + len).join(" ");
      if (slice.length < 2 || !lookup(to, slice)) continue;
      const said = keepAsSaid(raw, slice);
      out.push(said);
      pieces.push({ source: slice, gloss: said, kept: true });
      kept += len;
      i += len;
      matched = true;
      break;
    }
    if (!matched) {
      pieces.push({ source: words[i] ?? "", gloss: null, kept: false });
      i += 1;
    }
  }

  const coverage = words.length ? (own + kept) / words.length : 0;
  // A line that is mostly the other language was probably mislabeled; let the caller see that.
  const joined = own > 0 || kept > 0 ? out.join(" ") : "";
  return finish(joined, coverage, own, false, pieces);
}

/** Recover the original spelling (accents) of a normalized slice when it is kept as said. */
function keepAsSaid(raw, slice) {
  const wanted = slice.split(" ");
  const rawWords = String(raw).split(/\s+/).filter(Boolean);
  const normWords = rawWords.map((w) => normalize(w));
  for (let i = 0; i + wanted.length <= normWords.length; i++) {
    let ok = true;
    for (let j = 0; j < wanted.length; j++) {
      if (normWords[i + j] !== wanted[j]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return rawWords
        .slice(i, i + wanted.length)
        .join(" ")
        .replace(/^[¿¡"'(]+/u, "")
        .replace(/[!?.,;:"')]+$/u, "")
        .toLocaleLowerCase("es");
    }
  }
  return slice;
}

export function translate(raw, from, opts) {
  const hit = dissect(raw, from, opts);
  return {
    text: hit.text,
    formal: hit.formal,
    notes: hit.notes,
    coverage: hit.coverage,
    exact: hit.exact,
    safety: hit.safety,
  };
}

/** Regression list. A clean run returns []. */
export function selfCheck() {
  ensure();
  const cases = [
    ["hand me the wrench", "en", "pasame la llave"],
    ["where is the forklift", "en", "donde esta el montacargas"],
    ["watch out", "en", "aguas"],
    ["how much does it weigh", "en", "cuanto pesa"],
    ["is it strapped down yet", "en", "ya esta amarrado"],
    ["I need a break", "en", "necesito un descanso"],
    ["thank you", "en", "gracias"],
    ["qué onda güey", "es", "what is up"],
    ["aguas", "es", "watch out"],
    ["montacargas", "es", "forklift"],
    ["firma aquí", "es", "sign here"],
    ["the truck is here", "en", "la troca ya esta aqui"],
    ["how is your day", "en", "como esta tu dia"],
    ["hello how are you doing today", "en", "hola como estas hoy"],
    ["I wonder what's wrong", "en", "me pregunto que pasa"],
    ["bien bien", "es", "good"],
    ["échame la mano", "es", "give me a hand"],
    ["no hay pedo", "es", "no problem"],
    ["simón", "es", "yes"],
    ["ponte trucha", "es", "watch out"],
    ["give me a hand", "en", "echame la mano"],
    ["where is the truck", "en", "donde esta la troca"],
    // Tejano
    ["park the truck", "en", "parquea la troca"],
    ["voy a parquear la troca", "es", "park the truck"],
    ["my grandma", "en", "mi wela"],
    ["mi nina", "es", "godmother"],
    ["la niña", "es", "the girl"],
    ["the power went out", "en", "se fue la luz"],
    ["se fue la luz", "es", "the power went out"],
    ["ahí te watcho", "es", "see you later"],
    ["ándale pues", "es", "alright then"],
    ["what's up", "en", "que onda"],
    ["is it spicy", "en", "esta picoso"],
    ["oye where is la troca", "en", "oye donde esta la troca"],
    ["where is la troca", "es", "where is the truck"],
    ["bésame mucho", "es", "kiss me a lot"],
    ["put on your harness", "en", "ponte el arnes"],
    ["there is a gas leak", "en", "hay una fuga de gas"],
  ];
  const bad = [];
  for (const [src, lang, expect] of cases) {
    const got = normalize(translate(src, lang).text);
    if (!got.includes(expect)) bad.push(`${src} => ${got} (wanted ${expect})`);
  }
  const formals = [
    ["park the truck", "estaciona la camioneta"],
    ["my grandma", "mi abuela"],
    ["where is the trailer", "donde esta el remolque"],
    ["load the trailer", "el remolque"],
    ["what time is lunch", "a que hora es el almuerzo"],
    ["hurry up", "apurate"],
  ];
  for (const [src, expect] of formals) {
    const got = normalize(translate(src, "en").formal ?? "");
    if (!got.includes(expect)) bad.push(`formal ${src} => ${got} (wanted ${expect})`);
  }
  const folds = [
    ["hello", "hello how are you", "hello how are you"],
    ["hello how are you", "hello", "hello how are you"],
    ["hello", "hello", "hello"],
    ["hand me", "the wrench", "hand me the wrench"],
    ["pásame la llave", "pásame la", "pásame la llave"],
    ["hello how", "how are you", "hello how are you"],
  ];
  for (const [a, b, expect] of folds) {
    const got = foldHeard(a, b);
    if (normalize(got) !== normalize(expect)) bad.push(`fold ${a} + ${b} => ${got}`);
  }
  if (detectLang("dónde está el montacargas", "en") !== "es") bad.push("detect es");
  if (detectLang("bien bien", "en") !== "es") bad.push("detect bien");
  if (detectLang("where is the forklift", "es") !== "en") bad.push("detect en");
  if (detectLang("voy a parquear la troca", "en") !== "es") bad.push("detect tejano");
  const mixed = translate("hello how are you doing today", "en").text;
  if (/doing|hello|today/i.test(mixed)) bad.push(`mixed ${mixed}`);
  if (!sameUtterance("hello", "hello how are you")) bad.push("same hello");
  if (sameUtterance("hand me the wrench", "where is the truck")) bad.push("different sentences");
  let grown = "";
  for (const chunk of ["hello", "hello", "hello how", "hello how are", "hello how are you doing"]) {
    grown = foldHeard(grown, chunk);
  }
  if (normalize(grown) !== "hello how are you doing") bad.push(`grown => ${grown}`);
  const cut = dissect("hello how are you doing today", "en");
  if (cut.pieces.some((piece) => piece.source === "doing" && piece.gloss !== null)) bad.push("doing kept");
  if (!cut.pieces.some((piece) => piece.gloss === "hola")) bad.push("hola missing");
  return bad;
}

export { loose };
