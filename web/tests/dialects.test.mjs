import { test } from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./load.mjs";
import { cleanDial, compare, DIAL_WORDS, GENDER, LEVELS, REGIONS, soundsLike, toDialect } from "../js/dialects.js";
import { install, translate } from "../js/translate.js";
import { normalize } from "../js/normalize.js";

install(loadContent());
const say = (line, region, level) => normalize(translate(line, "en", { dial: { region, level } }).text);

test("every region is complete", () => {
  assert.equal(LEVELS.length, 4);
  for (const r of REGIONS) {
    for (const key of ["id", "group", "name", "short", "area", "blurb", "ear"]) assert.ok(r[key], `${r.id}.${key}`);
    assert.ok(Array.isArray(r.at) && r.at.length === 2, `${r.id}.at`);
    assert.ok(r.accent.length >= 2, `${r.id}.accent`);
    assert.ok(["es-US", "es-MX"].includes(r.ear), `${r.id}.ear`);
  }
});

test("dialect entries line up and know their genders", () => {
  const ids = new Set();
  for (const e of DIAL_WORDS) {
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
    ids.add(e.id);
    assert.ok(e.forms.formal !== undefined, `${e.id} needs a formal form`);
    for (const [where, form] of Object.entries(e.forms)) {
      const list = Array.isArray(form) ? form : [form];
      assert.equal(list.length, e.base.length, `${e.id}.${where} must line up with base`);
      e.base.forEach((b, i) => {
        if (GENDER[b]) assert.ok(GENDER[list[i]], `${e.id}.${where}: gender of "${list[i]}" unknown`);
      });
    }
  }
});

test("articles follow a swapped noun", () => {
  assert.equal(toDialect("la traila", "houston", 0), "el remolque");
  assert.equal(toDialect("dónde está el bus", "caribe", 1), "dónde está la guagua");
  assert.equal(toDialect("a qué hora es el lonche", "centro", 1), "a qué hora es la comida");
  assert.equal(toDialect("los biles", "houston", 0), "las cuentas");
});

test("words that are also verbs only swap after a determiner", () => {
  assert.equal(toDialect("trabajo aquí", "houston", 2), "trabajo aquí");
  assert.equal(toDialect("el trabajo", "houston", 2), "el jale");
  assert.equal(toDialect("el trabajo", "centro", 2), "la chamba");
});

test("the taper: formal, light, local", () => {
  assert.equal(say("park the truck", "houston", 0), "estaciona la camioneta");
  assert.equal(say("park the truck", "houston", 1), "parquea la troca");
  assert.equal(say("I need money", "houston", 1), "necesito dinero");
  assert.equal(say("I need money", "houston", 2), "necesito feria");
  assert.equal(say("the kids are here", "houston", 2), "los huercos estan aqui");
  assert.equal(say("the kids are here", "centro", 2), "los chamacos estan aqui");
});

test("regions say it their way", () => {
  assert.equal(say("what's up cousin", "centro", 1), "que onda guey");
  assert.equal(say("what's up cousin", "caribe", 1), "que bola asere");
  assert.equal(say("where is the bus", "norte", 1), "donde esta el camion");
  assert.equal(say("how cool", "elpaso", 2), "que firme");
  assert.equal(say("my godmother", "valle", 1), "mi nina");
  assert.equal(say("my godmother", "centro", 1), "mi madrina");
});

test("full accent: sounds-like line and what the voice reads", () => {
  const cu = translate("how are you", "en", { dial: { region: "caribe", level: 3 } });
  assert.equal(cu.sounds, "¿Cómo ehtáh?");
  assert.equal(soundsLike("Está bien, para la casa", "houston").display, "'Tá bien, pa' la casa");
  const ep = soundsLike("El muchacho", "elpaso");
  assert.equal(ep.display, "El mushasho");
  assert.equal(ep.voiced, "El muchacho", "voices can't say sh, so they read the normal word");
  assert.equal(translate("how are you", "en", { dial: { region: "caribe", level: 2 } }).sounds, null);
});

test("safety words stay safe in every region", () => {
  for (const r of REGIONS) {
    for (let level = 0; level <= 3; level++) {
      const hit = translate("watch out", "en", { dial: { region: r.id, level } });
      assert.equal(hit.safety, true);
      assert.match(normalize(hit.text), /^(aguas|cuidado)$/);
    }
  }
});

test("bad dials fall back to Houston, Local", () => {
  assert.deepEqual(cleanDial({ region: "narnia", level: 9 }), { region: "houston", level: 2 });
  assert.deepEqual(cleanDial(undefined), { region: "houston", level: 2 });
});

test("compare lists a word for every region", () => {
  const rows = compare(2);
  assert.ok(rows.length >= 15);
  for (const row of rows) for (const r of REGIONS) assert.ok(row.forms[r.id], `${row.id}/${r.id}`);
});
