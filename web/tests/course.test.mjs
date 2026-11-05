import { test } from "node:test";
import assert from "node:assert/strict";
import { readJson } from "./load.mjs";
import * as C from "../js/course.js";

const course = readJson("courses/tejano-101.json");

function memory() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test("the course file is valid", () => {
  assert.deepEqual(C.validateCourse(course), []);
  assert.equal(course.lessons.length, 8);
});

test("quiz has unique options and always the right answer", () => {
  for (const lesson of course.lessons) {
    const quiz = C.buildQuiz(lesson, course.lessons, seeded(7));
    assert.equal(quiz.length, 8);
    for (const q of quiz) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.options.includes(q.answer));
    }
  }
});

test("grading accepts the Tejano line or the formal one, forgives accents and case", () => {
  const item = { es: "Voy a parquear la troca.", std: "Voy a estacionar la camioneta.", en: "I'm going to park the truck." };
  assert.equal(C.grade(["voy a parquear la troca"], item).ok, true);
  assert.equal(C.grade(["Voy a estacionar la camioneta"], item).ok, true);
  assert.equal(C.grade(["voy a parkear la troca"], item).ok, true);
  assert.equal(C.grade(["dónde está el baño"], item).ok, false);
  assert.equal(C.grade([], item).ok, false);
});

test("streak counts days in a row and resets after a gap", () => {
  const p = C.freshProgress();
  C.addXp(p, 10, new Date(2026, 10, 1, 9));
  C.addXp(p, 10, new Date(2026, 10, 1, 20));
  assert.equal(p.streak, 1);
  C.addXp(p, 10, new Date(2026, 10, 2, 8));
  assert.equal(p.streak, 2);
  assert.equal(C.liveStreak(p, new Date(2026, 10, 3)), 2);
  assert.equal(C.liveStreak(p, new Date(2026, 10, 5)), 0);
  C.addXp(p, 10, new Date(2026, 10, 5));
  assert.equal(p.streak, 1);
  assert.equal(p.xp, 40);
});

test("passing a quiz marks the lesson done once and keeps the best stars", () => {
  const p = C.freshProgress();
  assert.deepEqual(C.recordQuiz(p, "saludos", 0.5), { stars: 0, passed: false, firstPass: false });
  assert.equal(C.recordQuiz(p, "saludos", 0.875).firstPass, true);
  assert.equal(C.recordQuiz(p, "saludos", 0.75).firstPass, false);
  assert.equal(C.lessonState(p, "saludos").stars, 2);
  assert.equal(C.lessonState(p, "saludos").done, true);
});

test("flashcards: missed cards come back first", () => {
  const p = C.freshProgress();
  const lesson = course.lessons[0];
  for (let i = 0; i < lesson.items.length; i++) C.markCard(p, lesson.id, i, true);
  C.markCard(p, lesson.id, 4, false);
  assert.equal(C.cardOrder(p, lesson)[0].index, 4);
  assert.equal(C.lessonState(p, lesson.id).seen, lesson.items.length);
});

test("progress survives a save and load", () => {
  const store = memory();
  const p = C.freshProgress();
  C.addXp(p, 25);
  C.saveProgress(p, store);
  assert.equal(C.loadProgress(store).xp, 25);
  assert.equal(C.loadProgress(memory()).xp, 0);
});
