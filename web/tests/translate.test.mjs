import { test } from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./load.mjs";
import { detectLang, dissect, install, selfCheck, toFormal, translate } from "../js/translate.js";
import { normalize } from "../js/normalize.js";

install(loadContent());

const es = (s) => normalize(translate(s, "en").text);
const en = (s) => normalize(translate(s, "es").text);

test("self-check is clean", () => {
  assert.deepEqual(selfCheck(), []);
});

test("Tejano wording comes out first, formal beside it", () => {
  const hit = translate("park the truck", "en");
  assert.equal(normalize(hit.text), "parquea la troca");
  assert.equal(normalize(hit.formal), "estaciona la camioneta");
  assert.equal(es("my grandma"), "mi wela");
  assert.equal(normalize(translate("my grandma", "en").formal), "mi abuela");
});

test("formal swap fixes the article when the gender changes", () => {
  assert.equal(normalize(toFormal("la traila")), "el remolque");
  assert.equal(normalize(toFormal("a la traila")), "al remolque");
  assert.equal(normalize(toFormal("los biles")), "las cuentas");
  assert.equal(normalize(toFormal("esta yarda")), "este patio");
});

test("gender agreement on simple state lines", () => {
  assert.equal(es("the trailer is ready"), "la traila esta lista");
  assert.equal(es("the truck is broken"), "la troca esta rota");
  assert.equal(es("the tank is full"), "el tanque esta lleno");
});

test("Spanglish lines come out in one language", () => {
  assert.equal(es("oye, where is la troca?"), "oye donde esta la troca");
  assert.equal(en("where is la troca"), "where is the truck");
  const cut = dissect("oye where is la troca", "en");
  assert.ok(cut.pieces.some((p) => p.kept && p.source === "oye"));
});

test("unknown words are left out, never mixed in", () => {
  const out = translate("hello how are you doing today", "en").text;
  assert.doesNotMatch(out, /doing|hello|today/i);
});

test("ñ matters: nina is godmother, niña is girl", () => {
  assert.match(en("mi nina"), /godmother/);
  assert.match(en("la niña"), /girl/);
  // Typing without ñ still finds mañana.
  assert.match(en("hasta manana"), /tomorrow/);
});

test("Tejano and Caló slang read back in English with notes", () => {
  assert.equal(en("ahí te watcho"), "see you later");
  assert.equal(en("ándale pues"), "alright then");
  assert.equal(en("qué bochorno"), "so muggy");
  const hit = translate("voy a parquear la troca", "es", { reader: "en" });
  assert.ok(hit.notes.some((n) => n.es === "parquear" && n.std === "estacionar"));
});

test("notes match the Spanish actually said, accents included", () => {
  const hit = translate("I'm going to cash the check", "en", { reader: "en" });
  assert.ok(hit.notes.some((n) => n.es === "cashear"));
  assert.ok(!hit.notes.some((n) => n.es === "chequear"), "cheque is not chequé");
});

test("safety lines are flagged and shouted", () => {
  const hit = translate("there is a gas leak", "en");
  assert.equal(hit.safety, true);
  assert.match(hit.text, /^¡.*!$/);
  assert.equal(translate("aguas", "es").safety, true);
});

test("language detection handles Tejano lines", () => {
  assert.equal(detectLang("voy a parquear la troca", "en"), "es");
  assert.equal(detectLang("mijo ven acá", "en"), "es");
  assert.equal(detectLang("where can i park", "es"), "en");
});

test("bésame mucho", () => {
  assert.equal(en("bésame mucho"), "kiss me a lot");
  assert.equal(es("kiss me a lot"), "besame mucho");
});
