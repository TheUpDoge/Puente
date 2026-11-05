// Real-browser smoke test: serves web/, opens it in Chromium at phone size, uses every tab.
// Run with: npm run test:browser   (needs Playwright: npm i --no-save playwright && npx playwright install chromium)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize as normPath, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = normPath(join(web, path === "/" ? "index.html" : path));
  if (!file.startsWith(web)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;

const problems = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) problems.push(what);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  // No network needed: fonts get an empty stylesheet, so the system font is used.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));

  await page.goto(`${base}/#talk`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__puenteBooted === true, null, { timeout: 10000 });
  check(true, "app boots");
  check(JSON.stringify(await page.evaluate(() => window.__puente.selfCheck())) === "[]", "selfCheck is clean in the browser");

  await page.fill("#say-input", "park the truck");
  await page.press("#say-input", "Enter");
  check((await page.textContent(".stage .big"))?.trim() === "Parquea la troca", "translator says Parquea la troca");

  await page.click("#tab-learn");
  await page.click(".lesson-card >> nth=0");
  await page.click('.modes button:has-text("Quiz")');
  await page.click(".option >> nth=0");
  check((await page.locator(".feedback").count()) === 1, "a lesson quiz answers");

  await page.click("#tab-words");
  await page.fill("#words-q", "wela");
  check((await page.locator("#words-list .word").count()) > 0, "word search finds wela");

  await page.click("#tab-map");
  await page.click('.map .spot[aria-label^="Mexico City"] .hit', { force: true });
  await page.click("#tab-talk");
  check((await page.textContent(".stage .big"))?.trim() === "Estaciona la camioneta", "map pick (CDMX) reshapes the line");

  check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "no sideways scroll at phone width");
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log("\nsmoke test passed");
