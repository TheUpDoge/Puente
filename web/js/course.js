// Course engine: progress, streaks, quizzes and grading. No DOM in here, so it can be tested.

import { normalize, similarity } from "./normalize.js";

const STORE = "puente-tx-learn-v1";

export const XP = { quizRight: 10, sayRight: 15, cardKnown: 2, lessonDone: 25 };
export const PASS = 0.7;
export const SAY_OK = 0.72;

export function freshProgress() {
  return { xp: 0, streak: 0, lastDay: "", lessons: {}, cards: {} };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORE);
    if (!raw) return freshProgress();
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return freshProgress();
    return {
      xp: Number.isFinite(p.xp) ? p.xp : 0,
      streak: Number.isFinite(p.streak) ? p.streak : 0,
      lastDay: typeof p.lastDay === "string" ? p.lastDay : "",
      lessons: p.lessons && typeof p.lessons === "object" ? p.lessons : {},
      cards: p.cards && typeof p.cards === "object" ? p.cards : {},
    };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORE, JSON.stringify(progress));
  } catch {
    /* private mode: progress lives for this visit only */
  }
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yesterdayOf(key) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Add XP and keep the daily streak (racha) honest. Mutates and returns progress. */
export function addXp(progress, amount, now = new Date()) {
  const today = dayKey(now);
  if (progress.lastDay !== today) {
    progress.streak = progress.lastDay === yesterdayOf(today) ? progress.streak + 1 : 1;
    progress.lastDay = today;
  }
  progress.xp += Math.max(0, Math.round(amount));
  return progress;
}

/** Streak to show: a streak whose last day is older than yesterday has already lapsed. */
export function liveStreak(progress, now = new Date()) {
  const today = dayKey(now);
  if (progress.lastDay === today || progress.lastDay === yesterdayOf(today)) return progress.streak;
  return 0;
}

export function lessonState(progress, lessonId) {
  return progress.lessons[lessonId] ?? { best: 0, stars: 0, done: false, seen: 0 };
}

export function starsFor(score) {
  if (score >= 1) return 3;
  if (score >= 0.85) return 2;
  if (score >= PASS) return 1;
  return 0;
}

/** Record a finished quiz. Returns { stars, passed, firstPass }. */
export function recordQuiz(progress, lessonId, score) {
  const prev = lessonState(progress, lessonId);
  const stars = starsFor(score);
  const passed = score >= PASS;
  const firstPass = passed && !prev.done;
  progress.lessons[lessonId] = {
    ...prev,
    best: Math.max(prev.best, score),
    stars: Math.max(prev.stars, stars),
    done: prev.done || passed,
  };
  if (firstPass) addXp(progress, XP.lessonDone);
  return { stars, passed, firstPass };
}

export function cardKey(lessonId, index) {
  return `${lessonId}#${index}`;
}

/** Flashcard boxes (0..5). Known moves a card up a box, again sends it back to 0 (study first). */
export function markCard(progress, lessonId, index, known) {
  const key = cardKey(lessonId, index);
  const box = progress.cards[key] ?? 0;
  progress.cards[key] = known ? Math.min(5, box + 1) : 0;
  const prev = lessonState(progress, lessonId);
  const seen = Object.keys(progress.cards).filter((k) => k.startsWith(`${lessonId}#`)).length;
  progress.lessons[lessonId] = { ...prev, seen };
  if (known) addXp(progress, XP.cardKnown);
  return progress.cards[key];
}

/** Cards in study order: lowest box first, unseen before seen, stable inside a box. */
export function cardOrder(progress, lesson) {
  return lesson.items
    .map((item, index) => ({ item, index, box: progress.cards[cardKey(lesson.id, index)] ?? 0 }))
    .sort((a, b) => a.box - b.box || a.index - b.index);
}

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uniqueBy(list, key) {
  const seen = new Set();
  return list.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Build a multiple-choice quiz for one lesson. Directions alternate: Spanish → English, then
 * English → Spanish. Wrong options come from the same lesson first, then the rest of the course.
 */
export function buildQuiz(lesson, allLessons, rng = Math.random, count = 8) {
  const items = shuffle(lesson.items, rng).slice(0, Math.min(count, lesson.items.length));
  const others = allLessons.filter((l) => l.id !== lesson.id).flatMap((l) => l.items);
  return items.map((item, n) => {
    const toEnglish = n % 2 === 0;
    const side = toEnglish ? "en" : "es";
    const answer = item[side];
    const sameLesson = shuffle(lesson.items.filter((x) => x !== item), rng);
    const pool = uniqueBy([...sameLesson, ...shuffle(others, rng)], (x) => normalize(x[side])).filter(
      (x) => normalize(x[side]) !== normalize(answer),
    );
    const options = shuffle([answer, ...pool.slice(0, 3).map((x) => x[side])], rng);
    return {
      item,
      prompt: toEnglish ? item.es : item.en,
      promptLang: toEnglish ? "es" : "en",
      answerLang: side,
      options,
      answer,
    };
  });
}

/** Grade a spoken or typed Spanish answer against the Tejano line and its formal version. */
export function grade(heard, item) {
  const targets = [item.es, item.std].filter(Boolean);
  let best = { score: 0, heard: "", target: item.es };
  for (const said of heard ?? []) {
    for (const target of targets) {
      const score = similarity(said, target);
      if (score > best.score) best = { score, heard: said, target };
    }
  }
  return { ...best, ok: best.score >= SAY_OK };
}

/** Light check that a course file has what the screens need. Returns a list of problems. */
export function validateCourse(course) {
  const bad = [];
  if (course?.kind !== "course") bad.push("kind must be course");
  const ids = new Set();
  for (const lesson of course?.lessons ?? []) {
    if (!lesson.id) bad.push("lesson without id");
    if (ids.has(lesson.id)) bad.push(`duplicate lesson ${lesson.id}`);
    ids.add(lesson.id);
    if (!lesson.title?.en) bad.push(`${lesson.id}: title.en missing`);
    if (!Array.isArray(lesson.items) || lesson.items.length < 4) bad.push(`${lesson.id}: needs 4+ items`);
    for (const [i, item] of (lesson.items ?? []).entries()) {
      if (typeof item.es !== "string" || !item.es.trim()) bad.push(`${lesson.id}#${i}: es missing`);
      if (typeof item.en !== "string" || !item.en.trim()) bad.push(`${lesson.id}#${i}: en missing`);
    }
  }
  return bad;
}
