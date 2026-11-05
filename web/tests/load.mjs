// Test helper: load the content packs from disk the same way the app fetches them.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

export function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

export function loadContent() {
  const index = readJson("index.json");
  // Same order as the app: later packs override earlier ones, so the app loads them reversed.
  const packs = [...index.phrasebook].reverse().map(readJson);
  const courses = index.courses.map(readJson);
  return { index, packs, courses };
}
