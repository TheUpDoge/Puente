// Guards for things that break silently on real phones.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(web, rel), "utf8");
const jsFiles = readdirSync(join(web, "js")).filter((f) => f.endsWith(".js"));

function shellList() {
  const sw = read("sw.js");
  const block = sw.slice(sw.indexOf("const SHELL = ["), sw.indexOf("];", sw.indexOf("const SHELL = [")));
  return [...block.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]);
}

test("no regex lookbehind: iPhones before iOS 16.4 can't run it", () => {
  for (const f of [...jsFiles, "../sw.js"]) {
    const src = read(join("js", f));
    assert.ok(!/\(\?<[=!]/.test(src), `js/${f} uses a lookbehind (?<= or (?<!`);
  }
});

test("every file the offline cache lists exists (one 404 and offline mode never installs)", () => {
  for (const rel of shellList()) {
    if (rel === "") continue;
    assert.ok(existsSync(join(web, rel)), `sw.js caches ./${rel} but it does not exist`);
  }
});

test("every app module is in the offline cache", () => {
  const shell = new Set(shellList());
  for (const f of jsFiles) assert.ok(shell.has(`js/${f}`), `sw.js does not cache js/${f}`);
});

test("everything index.html and the manifest point to exists", () => {
  const html = read("index.html");
  const refs = [...html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4);
  for (const rel of refs) assert.ok(existsSync(join(web, rel)), `index.html points to missing ./${rel}`);
  const manifest = JSON.parse(read("manifest.webmanifest"));
  for (const icon of manifest.icons) assert.ok(existsSync(join(web, icon.src)), `manifest icon ${icon.src} missing`);
});

test("every id the app looks up exists in index.html", () => {
  const html = read("index.html");
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const app = read("js/app.js");
  const used = new Set([...app.matchAll(/\$\("([\w-]+)"\)/g)].map((m) => m[1]));
  for (const id of used) {
    if (["say-answer"].includes(id)) continue; // built by the lessons screen itself
    assert.ok(ids.has(id), `app.js uses #${id} but index.html has no such id`);
  }
});

test("modules only import files that exist", () => {
  for (const f of jsFiles) {
    for (const m of read(join("js", f)).matchAll(/from "\.\/([^"]+)"/g)) {
      assert.ok(existsSync(join(web, "js", m[1])), `js/${f} imports missing ./${m[1]}`);
    }
  }
});
