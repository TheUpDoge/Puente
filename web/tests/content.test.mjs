import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "./load.mjs";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const { index, packs } = loadContent();
const TYPES = new Set(["slang", "phrase", "work"]);
const REGISTERS = new Set(["casual", "careful", "rough"]);

test("every pack follows the content schema", () => {
  for (const pack of packs) {
    assert.equal(pack.schema, 1, pack.id);
    assert.equal(pack.kind, "phrasebook", pack.id);
    assert.ok(pack.id && pack.status, pack.id);
    for (const e of pack.entries) {
      assert.ok(e.id, `${pack.id}: entry without id`);
      assert.ok(TYPES.has(e.type ?? "slang"), `${e.id}: bad type ${e.type}`);
      assert.ok(Array.isArray(e.t?.es) && e.t.es.length, `${e.id}: t.es`);
      assert.ok(Array.isArray(e.t?.en) && e.t.en.length, `${e.id}: t.en`);
      if (e.register) assert.ok(REGISTERS.has(e.register), `${e.id}: bad register ${e.register}`);
      if (e.std) assert.equal(typeof e.std, "string", `${e.id}: std`);
    }
  }
});

test("entry ids are unique across all packs", () => {
  const seen = new Map();
  for (const pack of packs) {
    for (const e of pack.entries) {
      assert.ok(!seen.has(e.id), `${e.id} is in ${seen.get(e.id)} and ${pack.id}`);
      seen.set(e.id, pack.id);
    }
  }
});

test("the service worker caches every content file", () => {
  const sw = readFileSync(join(web, "sw.js"), "utf8");
  for (const rel of [...index.phrasebook, ...index.courses]) {
    assert.ok(existsSync(join(web, "content", rel)), `${rel} is missing`);
    assert.ok(sw.includes(`./content/${rel}`), `sw.js does not cache ${rel}`);
  }
  for (const rel of ["js/app.js", "js/translate.js", "js/tejano.js", "css/puente.css", "icons/icon-192.png"]) {
    assert.ok(existsSync(join(web, rel)), `${rel} is missing`);
    assert.ok(sw.includes(`./${rel}`), `sw.js does not cache ${rel}`);
  }
});
