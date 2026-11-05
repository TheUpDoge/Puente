// Puente app shell: three tabs (Traduce, Aprende, Palabras) on one static page. No framework.

import { dissect, entries, install, noteText, selfCheck, translate } from "./translate.js";
import { Ear } from "./ear.js";
import { canSpeak, listenOnce, pickVoice, recognizer, speak } from "./voice.js";
import { compare, LEVELS, REGIONS, regionById } from "./dialects.js";
import { CITIES_INSET, CUBA, FLORIDA, HEIGHT, insetFrame, MEXICO, pathOf, project, RIVER, TEXAS, USA, WIDTH } from "./map-data.js";
import { loose } from "./normalize.js";
import * as C from "./course.js";

// ---------------------------------------------------------------------------------------------
// Tiny DOM helper. Text always goes in as text nodes; `html` is only used for our own SVG icons.

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const $ = (id) => document.getElementById(id);

/** replaceChildren that skips null / false and flattens arrays (the DOM one prints "null"). */
function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(2).filter((kid) => kid != null && kid !== false));
  return el;
}

const ICON = {
  voiceOn:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
  voiceOff:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>',
  play:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  mic: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
};

function playButton(text, lang, label) {
  return h("button", {
    type: "button",
    class: "icon small",
    "aria-label": label ?? `Hear “${text}”`,
    title: label ?? "Listen",
    html: ICON.play,
    onclick: () => void speak(text, lang),
  });
}

// ---------------------------------------------------------------------------------------------
// Copy for the translator. The phone's language picks it.

const COPY = {
  en: {
    running: "Running — just talk",
    runningEn: "Running — English ear",
    runningEs: "Running — Spanish ear",
    off: "Off until you start it",
    denied: "Mic blocked. Allow it and start again, or type.",
    unsupported: "No mic ear in this browser. Type and it still talks.",
    offline: "Running. The ear lost signal and will pick up again.",
    hint: "Tap <b>Me</b> when you talk and <b>Them</b> when they talk. The big line stays up so you can show the phone. Spanglish is welcome, try typing “oye, where is la troca?”",
    start: "Start listening",
    stop: "Stop",
    type: "Type if it's loud",
    voiceOn: "Voice on: speaks the translation",
    voiceOff: "Voice off",
    heard: "Hearing",
    go: "GO",
    halt: "STOP",
    hold: "GOT IT",
    me: "Me",
    them: "Them",
    again: "Again",
    missed: "Didn't catch that",
    formal: "Formal",
    sounds: "Sounds like",
    pads: [
      ["Aguas", "watch out"],
      ["¿Qué onda?", "what is up"],
      ["Lonche", "what time is lunch"],
      ["A hand", "give me a hand"],
      ["Hurry", "hurry up"],
      ["All good", "no problem"],
      ["Gracias", "thank you very much"],
      ["See ya", "see you later"],
    ],
  },
  es: {
    running: "Encendido — solo habla",
    runningEn: "Encendido — oído en inglés",
    runningEs: "Encendido — oído en español",
    off: "Apagado hasta que lo prendas",
    denied: "Micrófono bloqueado. Permítelo y préndelo otra vez, o escribe.",
    unsupported: "Este navegador no tiene oído. Escribe y de todos modos habla.",
    offline: "Encendido. El oído perdió señal y vuelve solo.",
    hint: "Toca <b>Yo</b> cuando hablas tú y <b>Ellos</b> cuando hablan ellos. La frase grande se queda para enseñar el teléfono. El Spanglish se vale.",
    start: "Empezar a escuchar",
    stop: "Parar",
    type: "Escribe si hay ruido",
    voiceOn: "Voz prendida: dice la traducción",
    voiceOff: "Voz apagada",
    heard: "Oyendo",
    go: "SIGA",
    halt: "ALTO",
    hold: "YA OÍ",
    me: "Yo",
    them: "Ellos",
    again: "Otra vez",
    missed: "No entendí",
    formal: "Formal",
    sounds: "Suena así",
    pads: [
      ["Aguas", "watch out"],
      ["¿Qué onda?", "what is up"],
      ["Lonche", "what time is lunch"],
      ["Échame la mano", "give me a hand"],
      ["Apúrale", "hurry up"],
      ["No hay bronca", "no problem"],
      ["Gracias", "thank you very much"],
      ["Ahí nos vemos", "see you later"],
    ],
  },
};

function solid(line) {
  return Boolean(line.translation) && (line.safety || line.exact || line.coverage >= 0.6);
}

function tagFor(lang) {
  return lang === "en" ? "EN → ES" : "ES → EN";
}

// ---------------------------------------------------------------------------------------------
// Boot

const app = {
  content: { index: null, packs: [], courses: [] },
  ear: null,
  earState: null,
  tab: "talk",
  learn: { screen: "home" },
  progress: C.loadProgress(),
  words: { q: "", pack: "all" },
  cut: { from: "en" },
};

async function getJson(path) {
  const res = await fetch(`./content/${path}`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function loadContent() {
  const index = await getJson("index.json");
  const packs = [];
  for (const path of index.phrasebook ?? []) {
    try {
      packs.push(await getJson(path));
    } catch (err) {
      console.warn("Skipped pack", path, err);
    }
  }
  const courses = [];
  for (const path of index.courses ?? []) {
    try {
      const course = await getJson(path);
      const problems = C.validateCourse(course);
      if (problems.length) console.warn("Course problems", path, problems);
      courses.push(course);
    } catch (err) {
      console.warn("Skipped course", path, err);
    }
  }
  return { index, packs, courses };
}

async function boot() {
  let failed = null;
  try {
    app.content = await loadContent();
  } catch (err) {
    failed = err;
  }
  // Later packs override earlier ones, and index.json lists the Tejano packs first: reverse.
  install({ packs: [...app.content.packs].reverse(), courses: app.content.courses });

  // Each part starts on its own, so one broken piece can't take the whole app down.
  const parts = [
    ["tabs", setupTabs],
    ["translator", setupTalk],
    ["cut view", setupCut],
    ["words", setupWords],
    ["map", setupMap],
    ["lessons", renderLearn],
  ];
  const broken = [];
  for (const [name, start] of parts) {
    try {
      start();
    } catch (err) {
      console.error(`Puente: ${name} failed to start`, err);
      broken.push(name);
    }
  }

  if (failed) {
    fill(
      $("stage"),
      h(
        "div",
        { class: "boot-error" },
        h("b", { text: "Couldn't load the word lists. " }),
        "Open Puente from a web server (not straight from the file), for example ",
        h("code", { text: "npx serve web" }),
        ". The basic shop phrases still work.",
      ),
    );
  } else if (broken.length) {
    fill(
      $("stage"),
      h("div", { class: "boot-error" }, h("b", { text: "Part of Puente didn't start. " }), "Reload the page. If it keeps happening, this helps fix it: ", h("code", { text: broken.join(", ") })),
    );
  }
  window.__puenteBooted = true;

  window.__puente = { selfCheck, translate, dissect, submit: (text) => app.ear?.submit(text) };

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------------------------
// Tabs

const TABS = ["talk", "learn", "words", "map"];

function setupTabs() {
  for (const btn of document.querySelectorAll(".tabs [data-tab]")) {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  }
  document.querySelector(".tabs").addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const i = TABS.indexOf(app.tab);
    const next = TABS[(i + (ev.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    showTab(next);
    $(`tab-${next}`).focus();
  });
  const fromHash = location.hash.replace("#", "");
  let start = TABS.includes(fromHash) ? fromHash : "talk";
  if (!TABS.includes(fromHash)) {
    try {
      const saved = localStorage.getItem("puente-tx-tab");
      if (TABS.includes(saved)) start = saved;
    } catch {
      /* ignore */
    }
  }
  showTab(start);
  window.addEventListener("hashchange", () => {
    const tab = location.hash.replace("#", "");
    if (TABS.includes(tab)) showTab(tab);
  });
}

function showTab(tab) {
  app.tab = tab;
  for (const name of TABS) {
    $(name).hidden = name !== tab;
    const btn = $(`tab-${name}`);
    btn.setAttribute("aria-selected", String(name === tab));
    btn.tabIndex = name === tab ? 0 : -1;
  }
  try {
    localStorage.setItem("puente-tx-tab", tab);
  } catch {
    /* ignore */
  }
  try {
    if (location.hash !== `#${tab}`) history.replaceState(null, "", `#${tab}`);
  } catch {
    /* some embedded browsers forbid it; the tab still switches */
  }
}

// ---------------------------------------------------------------------------------------------
// Translate tab

let logStick = true;
let lastLogKey = "";

function setupTalk() {
  for (const btn of $("lock-chips").querySelectorAll("[data-lock]")) {
    btn.addEventListener("click", () => app.ear.setLock(btn.dataset.lock));
  }
  $("dial-chip").addEventListener("click", () => showTab("map"));
  $("turn-me").addEventListener("click", () => app.ear.setLock("en"));
  $("turn-them").addEventListener("click", () => app.ear.setLock("es"));
  $("start").addEventListener("click", () => app.ear.activate());
  $("stop").addEventListener("click", () => app.ear.stop());
  $("voice-toggle").addEventListener("click", () => app.ear.setVoice(!app.earState.voice));
  $("clear-log").addEventListener("click", () => app.ear.clear());
  $("say-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = $("say-input");
    const text = input.value.trim();
    if (!text) return;
    app.ear.submit(text);
    input.value = "";
    logStick = true;
  });
  $("log").addEventListener("scroll", () => {
    const log = $("log");
    logStick = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  });

  app.ear = new Ear((state) => {
    const dialChanged = app.earState && (state.dial.region !== app.earState.dial.region || state.dial.level !== app.earState.dial.level);
    app.earState = state;
    renderTalk(state);
    if (dialChanged) updateMap();
  });

  const copy = COPY[app.earState.ui];
  fill($("pads"), 
    ...copy.pads.map(([label, say]) =>
      h("button", { type: "button", onclick: () => app.ear.say(say) }, label),
    ),
  );
}

function renderTalk(state) {
  const copy = COPY[state.ui];
  const running = state.status === "listening" || state.status === "unsupported" || state.status === "offline-ear";

  let status = copy.off;
  if (state.status === "denied") status = copy.denied;
  else if (state.status === "unsupported") status = copy.unsupported;
  else if (state.status === "offline-ear") status = copy.offline;
  else if (state.status === "listening") status = state.lock === "auto" ? (state.ear === "es" ? copy.runningEs : copy.runningEn) : copy.running;
  $("status-text").textContent = status;
  $("pip").className = `pip ${!running ? "" : state.speaking ? "halt" : state.holding ? "hold" : "go"}`;

  for (const btn of $("lock-chips").querySelectorAll("[data-lock]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.lock === state.lock));
  }
  const region = regionById(state.dial.region);
  $("dial-chip-text").textContent = `${region.short} · ${LEVELS[state.dial.level].name}`;
  $("turn-me").textContent = copy.me;
  $("turn-them").textContent = copy.them;
  $("turn-me").setAttribute("aria-pressed", String(state.lock === "en"));
  $("turn-them").setAttribute("aria-pressed", String(state.lock === "es"));

  $("start").hidden = running;
  $("start").textContent = copy.start;
  $("stop").hidden = !running;
  $("stop").textContent = copy.stop;
  const lamp = $("lamp");
  lamp.hidden = !running;
  const lampMode = state.speaking ? "halt" : state.holding ? "hold" : "go";
  lamp.className = `lamp ${lampMode === "go" ? "" : lampMode}`;
  $("lamp-text").textContent = lampMode === "halt" ? copy.halt : lampMode === "hold" ? copy.hold : copy.go;

  const liveLang = state.live?.lang;
  $("panel").className = `panel safe-bot ${liveLang === "en" ? "live-en" : liveLang === "es" ? "live-es" : state.speaking ? "speaking" : ""}`;

  const voice = $("voice-toggle");
  voice.innerHTML = state.voice ? ICON.voiceOn : ICON.voiceOff;
  voice.setAttribute("aria-pressed", String(state.voice));
  voice.setAttribute("aria-label", state.voice ? copy.voiceOn : copy.voiceOff);
  voice.title = state.voice ? copy.voiceOn : copy.voiceOff;
  $("say-input").placeholder = copy.type;

  const last = state.lines[state.lines.length - 1];
  const shown = [...state.lines].reverse().find(solid);
  const older = !state.live && shown ? state.lines.filter((line) => line.id !== shown.id) : state.lines;

  const logKey = older.map((l) => `${l.id}:${l.translation}`).join("|");
  if (logKey !== lastLogKey) {
    lastLogKey = logKey;
    fill($("log-list"), 
      ...older.map((line) => {
        const weak = !solid(line);
        return h(
          "li",
          { class: weak ? "weak" : "" },
          h(
            "button",
            { type: "button", onclick: () => app.ear.replay(line.id), title: "Say it again" },
            h("span", { class: line.lang === "en" ? "tag-en" : "tag-es", text: tagFor(line.lang) }),
            h("span", { class: "said", lang: line.lang === "en" ? "es" : "en", text: weak ? line.original : line.translation || line.original }),
            weak ? null : h("span", { class: "orig", lang: line.lang, text: line.original }),
          ),
        );
      }),
    );
    if (logStick) $("log").scrollTop = $("log").scrollHeight;
  }

  const stage = h("div", { class: "stage-inner" });
  fill($("stage"), stage);
  if (state.live) {
    fill(stage, 
      h("span", { class: state.live.lang === "en" ? "tag-en" : "tag-es", text: copy.heard }),
      h("p", { class: "big", lang: state.live.lang === "en" ? "es" : "en", text: state.live.translation || "…" }),
      h("p", { class: "orig", lang: state.live.lang, text: state.live.original }),
    );
  } else if (shown) {
    const altLabel = shown.altKind === "local" ? region.short : copy.formal;
    fill(stage, 
      h("span", { class: shown.lang === "en" ? "tag-en" : "tag-es", text: tagFor(shown.lang) }),
      h("p", { class: "big", lang: shown.lang === "en" ? "es" : "en", text: shown.translation }),
      h("p", { class: "orig", lang: shown.lang, text: shown.original }),
      shown.sounds ? h("p", { class: "alt sounds", lang: "es" }, h("b", { text: copy.sounds }), shown.sounds) : null,
      shown.alt ? h("p", { class: "alt", lang: "es" }, h("b", { text: altLabel }), shown.alt) : null,
      shown.notes.length ? h("ul", { class: "notes" }, ...shown.notes.map(noteItem)) : null,
      h("div", { class: "row" }, h("button", { type: "button", class: "pill", onclick: () => app.ear.again() }, copy.again)),
      last && !solid(last) ? h("p", { class: "missed", text: copy.missed }) : null,
    );
  } else {
    fill(stage, h("p", { class: "hint", html: last ? copy.missed : copy.hint }));
  }
}

function noteItem(n) {
  return h(
    "li",
    {},
    h("span", { class: "term", lang: "es", text: n.es }),
    ` → ${n.en}`,
    n.register ? h("span", { class: `badge ${n.register}`, text: n.register }) : null,
    n.note ? h("span", {}, ` · ${n.note}`) : null,
    n.std ? h("span", { class: "std", lang: "es", text: `Formal: ${n.std}` }) : null,
  );
}

// ---------------------------------------------------------------------------------------------
// Cut view ("Open it up")

const CUT_SAMPLES = [
  ["oye, where is la troca?", "en", "Spanglish"],
  ["voy a parquear la troca", "es", "Parquear"],
  ["park the truck", "en", "Park"],
  ["qué onda ese", "es", "¿Qué onda?"],
  ["the trailer is ready", "en", "Trailer"],
  ["hello how are you doing today", "en", "Hello"],
];

function setupCut() {
  const dialog = $("cut");
  $("open-cut").addEventListener("click", () => {
    renderCut();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  $("cut-close").addEventListener("click", () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  });
  $("cut-form").addEventListener("submit", (ev) => ev.preventDefault());
  $("cut-input").addEventListener("input", renderCut);
  for (const btn of dialog.querySelectorAll("[data-from]")) {
    btn.addEventListener("click", () => {
      app.cut.from = btn.dataset.from;
      renderCut();
    });
  }
  fill($("cut-samples"), 
    ...CUT_SAMPLES.map(([text, from, label]) =>
      h(
        "button",
        {
          type: "button",
          onclick: () => {
            $("cut-input").value = text;
            app.cut.from = from;
            renderCut();
          },
        },
        label,
      ),
    ),
  );
}

function renderCut() {
  const raw = $("cut-input").value;
  for (const btn of $("cut").querySelectorAll("[data-from]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.from === app.cut.from));
  }
  const hit = dissect(raw, app.cut.from, { reader: "en" });
  const kept = Math.round(hit.coverage * 100);
  fill($("cut-out"), 
    h("p", { class: "cut-result", lang: hit.to, text: hit.text || "Nothing solid enough to say." }),
    hit.formal ? h("p", { class: "muted", lang: "es" }, h("b", { text: "Formal: " }), hit.formal) : null,
    h(
      "p",
      { class: "muted small" },
      hit.exact ? "Whole phrase" : `${kept}% of the words matched`,
      hit.safety ? " · safety, said fast" : "",
      ` · ${hit.from === "en" ? "EN → ES" : "ES → EN"}`,
    ),
    h(
      "ul",
      { class: "pieces" },
      ...hit.pieces.map((piece) =>
        h(
          "li",
          {},
          h("span", { class: "src", text: piece.source }),
          h("span", {
            class: `gl ${piece.gloss === null ? "out" : piece.kept ? "kept" : ""}`,
            text: piece.gloss === null ? "left out" : piece.kept ? `${piece.gloss} (kept as said)` : piece.gloss,
          }),
        ),
      ),
    ),
    hit.notes.length ? h("ul", { class: "notes" }, ...hit.notes.map(noteItem)) : null,
  );
}

// ---------------------------------------------------------------------------------------------
// Learn tab

function course() {
  return app.content.courses[0] ?? null;
}

function save() {
  C.saveProgress(app.progress);
}

function starsEl(n) {
  return h("span", { class: "stars", "aria-label": `${n} of 3 stars` }, "★".repeat(n), h("span", { class: "off", text: "★".repeat(3 - n) }));
}

function renderLearn() {
  const root = $("learn-root");
  const c = course();
  if (!c) {
    fill(root, h("p", { class: "empty", text: "No course loaded yet." }));
    return;
  }
  const view = app.learn;
  if (view.screen === "lesson") {
    const lesson = c.lessons.find((l) => l.id === view.id);
    if (lesson) {
      fill(root, renderLesson(c, lesson, view));
      return;
    }
  }
  fill(root, renderHome(c));
}

function go(view) {
  app.learn = view;
  renderLearn();
  $("learn-root").scrollTop = 0;
}

function renderHome(c) {
  const p = app.progress;
  const done = c.lessons.filter((l) => C.lessonState(p, l.id).done).length;
  return h(
    "div",
    {},
    h(
      "div",
      { class: "tia" },
      h("div", { class: "tia-face", "aria-hidden": "true", text: "TL" }),
      h("div", {}, h("p", { class: "tia-name", text: c.teacher?.name ?? "Tía" }), h("p", { class: "tia-says", text: c.teacher?.hello?.en ?? "" })),
    ),
    h(
      "div",
      { class: "stats" },
      h("div", { class: "stat" }, h("b", { text: String(p.xp) }), h("span", { text: "Puntos · XP" })),
      h("div", { class: "stat" }, h("b", { text: `${C.liveStreak(p)}🔥` }), h("span", { text: "Racha · days" })),
      h("div", { class: "stat" }, h("b", { text: `${done}/${c.lessons.length}` }), h("span", { text: "Clases" })),
    ),
    h(
      "ul",
      { class: "lessons" },
      ...c.lessons.map((lesson) => {
        const st = C.lessonState(p, lesson.id);
        const pct = Math.round((Math.min(st.seen ?? 0, lesson.items.length) / lesson.items.length) * 100);
        return h(
          "li",
          {},
          h(
            "button",
            { type: "button", class: "lesson-card", onclick: () => go({ screen: "lesson", id: lesson.id, mode: "learn" }) },
            h("span", { class: "ico", "aria-hidden": "true", text: lesson.icon ?? "★" }),
            h("span", { class: "t", lang: "es", text: lesson.title.en }),
            h("span", { class: "s", text: lesson.subtitle?.en ?? "" }),
            h("span", {}, starsEl(st.stars ?? 0), h("span", { class: "meter", "aria-hidden": "true" }, h("i", { style: `width:${Math.max(pct, st.done ? 100 : 0)}%` }))),
          ),
        );
      }),
    ),
    h("p", { class: "fine", text: `${c.title.en} is a starter course: Tejano speakers are still checking it. Formal Spanish is shown under each line so you know both.` }),
  );
}

const MODES = [
  ["learn", "Aprende"],
  ["cards", "Tarjetas"],
  ["quiz", "Quiz"],
  ["say", "¡Dilo!"],
];

function renderLesson(c, lesson, view) {
  const st = C.lessonState(app.progress, lesson.id);
  let body;
  if (view.mode === "cards") body = renderCards(lesson, view);
  else if (view.mode === "quiz") body = renderQuiz(c, lesson, view);
  else if (view.mode === "say") body = renderSay(lesson, view);
  else body = renderItems(lesson);
  return h(
    "div",
    {},
    h(
      "div",
      { class: "lesson-head" },
      h("button", { type: "button", class: "pill back-link", onclick: () => go({ screen: "home" }) }, "← Clases"),
      h(
        "div",
        {},
        h("h2", { lang: "es" }, `${lesson.icon ?? ""} ${lesson.title.en}`),
        h("p", {}, lesson.subtitle?.en ?? "", " ", starsEl(st.stars ?? 0)),
      ),
    ),
    lesson.tia?.en
      ? h("div", { class: "tia" }, h("div", { class: "tia-face", "aria-hidden": "true", text: "TL" }), h("p", { class: "tia-says", text: lesson.tia.en }))
      : null,
    h(
      "div",
      { class: "modes", role: "group", "aria-label": "Practice mode" },
      ...MODES.map(([mode, label]) =>
        h(
          "button",
          {
            type: "button",
            "aria-pressed": String(view.mode === mode),
            onclick: () => go({ screen: "lesson", id: lesson.id, mode }),
          },
          label,
        ),
      ),
    ),
    body,
  );
}

function renderItems(lesson) {
  return h(
    "ul",
    { class: "items" },
    ...lesson.items.map((item) =>
      h(
        "li",
        { class: "item" },
        h("span", { class: "es", lang: "es", text: item.es }),
        h("span", { class: "side" }, canSpeak() ? playButton(item.es, "es") : null, tryButton(item.es)),
        h("span", { class: "en", text: item.en }),
        item.std ? h("span", { class: "std", lang: "es", text: `Formal: ${item.std}` }) : h("span"),
        item.tip?.en ? h("p", { class: "tip" }, h("b", { text: "Tía: " }), item.tip.en) : null,
      ),
    ),
  );
}

function tryButton(es) {
  return h("button", {
    type: "button",
    class: "icon small",
    "aria-label": `Try “${es}” in the translator`,
    title: "Try it in the translator",
    html: ICON.arrow,
    onclick: () => {
      showTab("talk");
      app.ear.setLock("auto");
      app.ear.submit(es);
    },
  });
}

// Flashcards

function renderCards(lesson, view) {
  view.order ??= C.cardOrder(app.progress, lesson).map((x) => x.index);
  view.pos ??= 0;
  view.known ??= 0;
  if (view.pos >= view.order.length) {
    return h(
      "div",
      { class: "result" },
      h("p", { class: "eyebrow", text: "¡Ya estuvo!" }),
      h("p", { class: "score", text: `${view.known}/${view.order.length}` }),
      h("p", { class: "muted", text: "cards you already knew. The rest come back first next time." }),
      h(
        "div",
        { class: "row" },
        h("button", { type: "button", class: "pill", onclick: () => go({ screen: "lesson", id: lesson.id, mode: "cards" }) }, "Otra vez"),
        h("button", { type: "button", class: "pill hot", onclick: () => go({ screen: "lesson", id: lesson.id, mode: "quiz" }) }, "Take the quiz"),
      ),
    );
  }
  const index = view.order[view.pos];
  const item = lesson.items[index];
  const answer = (known) => {
    C.markCard(app.progress, lesson.id, index, known);
    save();
    view.known += known ? 1 : 0;
    view.pos += 1;
    view.flipped = false;
    renderLearn();
  };
  return h(
    "div",
    {},
    h(
      "div",
      { class: "card" },
      h("p", { class: "front", lang: "es", text: item.es }),
      canSpeak() ? h("div", { class: "row" }, playButton(item.es, "es")) : null,
      view.flipped
        ? [
            h("p", { class: "back", text: item.en }),
            item.std ? h("p", { class: "back-std", lang: "es", text: `Formal: ${item.std}` }) : null,
            item.tip?.en ? h("p", { class: "back-tip", text: item.tip.en }) : null,
          ]
        : null,
    ),
    h("p", { class: "card-count", text: `${view.pos + 1} / ${view.order.length}` }),
    view.flipped
      ? h(
          "div",
          { class: "row" },
          h("button", { type: "button", class: "pill es", onclick: () => answer(false) }, "Otra vez · again"),
          h("button", { type: "button", class: "pill hot", onclick: () => answer(true) }, "¡Ya me la sé! · got it"),
        )
      : h(
          "div",
          { class: "row" },
          h(
            "button",
            {
              type: "button",
              class: "pill solid",
              onclick: () => {
                view.flipped = true;
                renderLearn();
              },
            },
            "Voltéala · flip it",
          ),
        ),
  );
}

// Quiz

function renderQuiz(c, lesson, view) {
  view.questions ??= C.buildQuiz(lesson, c.lessons);
  view.pos ??= 0;
  view.right ??= 0;
  view.earned ??= 0;
  const total = view.questions.length;
  if (view.pos >= total) {
    if (!view.recorded) {
      view.recorded = C.recordQuiz(app.progress, lesson.id, view.right / total);
      save();
    }
    const score = view.right / total;
    const { stars, passed, firstPass } = view.recorded;
    const next = c.lessons[c.lessons.findIndex((l) => l.id === lesson.id) + 1];
    return h(
      "div",
      { class: "result" },
      h("p", { class: "eyebrow", text: passed ? "¡Eso, mijo!" : "Casi, casi" }),
      h("p", { class: "score", text: `${Math.round(score * 100)}%` }),
      h("p", {}, starsEl(stars)),
      h(
        "p",
        { class: "muted" },
        `${view.right} of ${total} right · +${view.earned + (firstPass ? C.XP.lessonDone : 0)} XP`,
        passed ? "" : ` · ${Math.round(C.PASS * 100)}% passes`,
      ),
      h(
        "div",
        { class: "row" },
        h("button", { type: "button", class: "pill", onclick: () => go({ screen: "lesson", id: lesson.id, mode: "quiz" }) }, "Try again"),
        passed && next
          ? h("button", { type: "button", class: "pill hot", onclick: () => go({ screen: "lesson", id: next.id, mode: "learn" }) }, `Next: ${next.title.en} →`)
          : h("button", { type: "button", class: "pill hot", onclick: () => go({ screen: "home" }) }, "All lessons"),
      ),
    );
  }
  const q = view.questions[view.pos];
  const picked = view.picked ?? null;
  const pick = (option) => {
    if (view.picked != null) return;
    view.picked = option;
    if (option === q.answer) {
      view.right += 1;
      view.earned += C.XP.quizRight;
      C.addXp(app.progress, C.XP.quizRight);
      save();
    }
    renderLearn();
    if (canSpeak()) void speak(q.item.es, "es");
  };
  return h(
    "div",
    {},
    h(
      "div",
      { class: "quiz-prompt" },
      h("p", { class: "eyebrow", text: q.promptLang === "es" ? "What does this mean?" : "How do you say it?" }),
      h("p", { class: "q", lang: q.promptLang, text: q.prompt }),
      q.promptLang === "es" && canSpeak() ? h("div", { class: "row" }, playButton(q.prompt, "es")) : null,
    ),
    h("p", { class: "card-count", text: `${view.pos + 1} / ${total} · ${view.right} right` }),
    h(
      "ul",
      { class: "options" },
      ...q.options.map((option) => {
        let cls = "option";
        if (picked != null && option === q.answer) cls += " right";
        else if (picked === option) cls += " wrong";
        return h("li", {}, h("button", { type: "button", class: cls, lang: q.answerLang, disabled: picked != null && option !== picked && option !== q.answer, onclick: () => pick(option) }, option));
      }),
    ),
    picked != null
      ? h(
          "div",
          { class: `feedback ${picked === q.answer ? "good" : "bad"}` },
          h("b", { text: picked === q.answer ? "¡Eso! " : "Nel… " }),
          h("span", { lang: "es", text: q.item.es }),
          ` = ${q.item.en}`,
          q.item.std ? h("span", { class: "muted" }, ` · Formal: ${q.item.std}`) : null,
          q.item.tip?.en ? h("p", { class: "small" }, q.item.tip.en) : null,
          h(
            "div",
            { class: "row" },
            h(
              "button",
              {
                type: "button",
                class: "pill hot",
                onclick: () => {
                  view.pos += 1;
                  view.picked = null;
                  renderLearn();
                },
              },
              view.pos + 1 >= total ? "See my score" : "Next →",
            ),
          ),
        )
      : null,
  );
}

// Say it

function renderSay(lesson, view) {
  view.order ??= lesson.items.map((_, i) => i);
  view.pos ??= 0;
  view.right ??= 0;
  if (view.pos >= view.order.length) {
    return h(
      "div",
      { class: "result" },
      h("p", { class: "eyebrow", text: "¡Bien dicho!" }),
      h("p", { class: "score", text: `${view.right}/${view.order.length}` }),
      h("p", { class: "muted", text: "said right. Your accent is between you and your wela." }),
      h(
        "div",
        { class: "row" },
        h("button", { type: "button", class: "pill", onclick: () => go({ screen: "lesson", id: lesson.id, mode: "say" }) }, "Otra vez"),
        h("button", { type: "button", class: "pill hot", onclick: () => go({ screen: "home" }) }, "All lessons"),
      ),
    );
  }
  const item = lesson.items[view.order[view.pos]];
  const hasEar = Boolean(recognizer());

  const check = (heard, mic = false) => {
    if (heard === null) {
      view.result = { denied: true };
      view.listening = false;
      renderLearn();
      return;
    }
    const result = C.grade(heard, item);
    if (result.ok && !view.result?.ok) {
      view.right += 1;
      C.addXp(app.progress, C.XP.sayRight);
      save();
    }
    view.result = { ...result, mic };
    view.listening = false;
    renderLearn();
  };

  const listen = () => {
    if (view.listening) {
      view.stop?.();
      return;
    }
    const session = listenOnce("es");
    view.listening = true;
    view.stop = session.stop;
    renderLearn();
    session.promise.then((heard) => check(heard, true));
  };

  const r = view.result;
  return h(
    "div",
    {},
    h(
      "div",
      { class: "quiz-prompt" },
      h("p", { class: "eyebrow", text: "Say it in Tejano Spanish" }),
      h("p", { class: "q", text: item.en }),
      canSpeak() ? h("div", { class: "row" }, playButton(item.es, "es", "Hear Tía say it")) : null,
    ),
    h("p", { class: "card-count", text: `${view.pos + 1} / ${view.order.length}` }),
    hasEar
      ? h("button", { type: "button", class: `mic ${view.listening ? "on" : ""}`, onclick: listen, html: `${ICON.mic}<span>${view.listening ? "Listening… tap to stop" : "Tap and say it"}</span>` })
      : h("p", { class: "muted small", text: "This browser can't listen, so type your answer." }),
    h(
      "form",
      {
        class: "answer",
        autocomplete: "off",
        onsubmit: (ev) => {
          ev.preventDefault();
          const value = ev.target.querySelector("input").value.trim();
          if (value) check([value]);
        },
      },
      h("label", { class: "sr-only", for: "say-answer", text: "Type the Spanish" }),
      h("input", { id: "say-answer", lang: "es", placeholder: "…or type it", autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
      h("button", { type: "submit", class: "pill solid" }, "Check"),
    ),
    r?.denied ? h("div", { class: "feedback bad" }, "The mic is blocked. Allow it in the browser, or type the answer.") : null,
    r && !r.denied
      ? h(
          "div",
          { class: `feedback ${r.ok ? "good" : "bad"}` },
          h("b", { text: r.ok ? `¡Eso! ${Math.round(r.score * 100)}% match` : r.heard ? "Casi…" : "No te oí" }),
          r.heard ? h("p", { class: "small" }, r.mic ? "Tía heard: " : "You wrote: ", h("span", { lang: "es", text: `“${r.heard}”` })) : null,
          h("p", {}, h("span", { lang: "es", text: item.es }), item.std ? h("span", { class: "muted" }, ` · Formal: ${item.std}`) : null),
          h(
            "div",
            { class: "row" },
            r.ok
              ? null
              : h("button", { type: "button", class: "pill", onclick: () => { view.result = null; renderLearn(); } }, "Try again"),
            h(
              "button",
              {
                type: "button",
                class: "pill hot",
                onclick: () => {
                  view.pos += 1;
                  view.result = null;
                  renderLearn();
                },
              },
              view.pos + 1 >= view.order.length ? "Finish" : "Next →",
            ),
          ),
        )
      : null,
  );
}

// ---------------------------------------------------------------------------------------------
// Words tab

let allWords = [];

function packTitle(id) {
  const pack = app.content.packs.find((p) => p.id === id);
  return pack?.title?.en ?? id;
}

function setupWords() {
  const order = app.content.packs.map((p) => p.id);
  allWords = entries()
    .map((e) => ({
      ...e,
      head: loose([...e.es, ...e.en].join(" ")),
      hay: loose([...e.es, ...e.en, e.noteEn ?? "", e.std ?? ""].join(" ")),
    }))
    .sort((a, b) => order.indexOf(a.pack) - order.indexOf(b.pack));

  const chips = [["all", "All"], ...app.content.packs.map((p) => [p.id, packTitle(p.id)])];
  fill($("words-packs"), 
    ...chips.map(([id, label]) =>
      h(
        "button",
        {
          type: "button",
          "data-pack": id,
          onclick: () => {
            app.words.pack = id;
            renderWords();
          },
        },
        label,
      ),
    ),
  );
  $("words-q").addEventListener("input", (ev) => {
    app.words.q = ev.target.value;
    renderWords();
  });
  renderWords();
}

function renderWords() {
  for (const btn of $("words-packs").querySelectorAll("[data-pack]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.pack === app.words.pack));
  }
  const q = loose(app.words.q);
  const terms = q ? q.split(" ") : [];
  const rank = (e) => {
    if (!q) return 0;
    if (e.es.some((s) => loose(s) === q) || e.en.some((s) => loose(s) === q)) return 0;
    if (terms.every((t) => e.head.includes(t))) return 1;
    return 2;
  };
  const found = allWords
    .filter((e) => (app.words.pack === "all" || e.pack === app.words.pack) && terms.every((t) => e.hay.includes(t)))
    .map((e, i) => ({ e, i, r: rank(e) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.e);
  const shown = found.slice(0, 150);
  $("words-count").textContent = found.length === 1 ? "1 word or phrase" : `${found.length} words & phrases${found.length > shown.length ? ` · showing ${shown.length}` : ""}`;
  if (!shown.length) {
    fill($("words-list"), h("li", { class: "empty", text: "Nada. Try another word, in English or Spanish." }));
    return;
  }
  fill($("words-list"), 
    ...shown.map((e) =>
      h(
        "li",
        { class: "word" },
        h("span", {}, h("span", { class: "pack", text: packTitle(e.pack) })),
        h("span", { class: "side" }, canSpeak() ? playButton(e.es[0], "es") : null, tryButton(e.es[0])),
        h(
          "span",
          {},
          h("span", { class: "es", lang: "es", text: e.es[0] }),
          e.register ? h("span", { class: `badge ${e.register}`, text: e.register }) : null,
        ),
        e.es.length > 1 ? h("span", { class: "vars", lang: "es", text: `also: ${e.es.slice(1).join(", ")}` }) : h("span"),
        h("span", { class: "en", text: e.en.join(" / ") }),
        e.noteEn ? h("p", { class: "note", text: e.noteEn }) : null,
        e.std ? h("span", { class: "std", lang: "es", text: `Formal: ${e.std}` }) : null,
      ),
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// Map tab: tap where you're talking, taper how local it sounds.

const SVG_NS = "http://www.w3.org/2000/svg";

function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) if (kid) el.append(kid);
  return el;
}

const MAP_SAMPLES = [
  "what's up cousin",
  "park the truck",
  "what time is lunch",
  "where is the bus",
  "I need money",
  "the kids are here",
  "alright then",
  "that is fine",
  "how are you",
];

const HALO = [0, 120, 82, 54];

function setupMap() {
  const range = $("taper");
  range.addEventListener("input", () => app.ear.setDial({ level: Number(range.value) }));
  fill(
    $("taper-stops"),
    LEVELS.map((lv) =>
      h("button", { type: "button", "data-level": lv.id, onclick: () => app.ear.setDial({ level: lv.id }) }, lv.name),
    ),
  );
  fill(
    $("region-chips"),
    REGIONS.map((r) => h("button", { type: "button", "data-region": r.id, onclick: () => pickRegion(r.id) }, r.short)),
  );
  updateMap();
}

function pickRegion(id) {
  app.ear.setDial({ region: id });
}

function hotspot(region, x, y, selected) {
  const { dx, dy, anchor } = region.label;
  return s(
    "g",
    {
      class: `spot ${selected ? "on" : ""}`,
      role: "button",
      tabindex: 0,
      "aria-label": `${region.name}${selected ? " (selected)" : ""}`,
      "aria-pressed": String(selected),
      onclick: () => pickRegion(region.id),
      onkeydown: (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          pickRegion(region.id);
        }
      },
    },
    s("circle", { class: "hit", cx: x, cy: y, r: 20 }),
    selected ? s("circle", { class: "ring", cx: x, cy: y, r: 11 }) : null,
    s("circle", { class: "dot", cx: x, cy: y, r: selected ? 6.5 : 5 }),
    s("text", { x: x + dx, y: y + dy, "text-anchor": anchor, text: region.short }),
  );
}

function mapSvg(dial) {
  const inset = insetFrame();
  const selected = regionById(dial.region);
  const at = selected.id === "caribe" ? inset.project(selected.at) : project(selected.at);
  const level = dial.level;
  const svg = s(
    "svg",
    { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: "map", role: "group", "aria-label": "Dialect map. Tap a place." },
    s(
      "defs",
      {},
      s(
        "radialGradient",
        { id: "halo" },
        s("stop", { offset: "0", "stop-color": "#ffd166", "stop-opacity": "0.9" }),
        s("stop", { offset: "0.45", "stop-color": "#ff4fa3", "stop-opacity": "0.45" }),
        s("stop", { offset: "1", "stop-color": "#ff4fa3", "stop-opacity": "0" }),
      ),
      s(
        "pattern",
        { id: "grid", width: 22, height: 22, patternUnits: "userSpaceOnUse" },
        s("path", { d: "M22 0H0V22", fill: "none", stroke: "#2de2e6", "stroke-opacity": "0.08", "stroke-width": "1" }),
      ),
      s("clipPath", { id: "inset-clip" }, s("rect", { x: inset.x, y: inset.y, width: inset.w, height: inset.h, rx: 10 })),
    ),
    s("rect", { class: "water", x: 0, y: 0, width: WIDTH, height: HEIGHT }),
    s("rect", { x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: "url(#grid)" }),
    s("path", { class: "land", d: pathOf(USA) }),
    s("path", { class: "land mx", d: pathOf(MEXICO) }),
    s("path", { class: "land tx", d: pathOf(TEXAS) }),
    s("path", { class: "river", d: `M${RIVER.map((p) => project(p).join(" ")).join("L")}` }),
    s("text", { class: "country", x: project([-90.2, 34.6])[0], y: project([-90.2, 34.6])[1], text: "U.S." }),
    s("text", { class: "country", x: project([-102.6, 22.4])[0], y: project([-102.6, 22.4])[1], text: "MÉXICO" }),
    s("text", { class: "country tx", x: project([-100.3, 31.6])[0], y: project([-100.3, 31.6])[1], text: "TEXAS" }),
    s(
      "text",
      { class: "sea", x: project([-94.2, 27.7])[0], y: project([-94.2, 27.7])[1] },
      s("tspan", { x: project([-94.2, 27.7])[0], dy: 0, text: "Golfo" }),
      s("tspan", { x: project([-94.2, 27.7])[0], dy: 12, text: "de México" }),
    ),
    level > 0 ? s("circle", { class: "halo", cx: at[0], cy: at[1], r: HALO[level] }) : null,
    s(
      "g",
      {
        class: `inset ${selected.id === "caribe" ? "on" : ""}`,
        role: "button",
        tabindex: 0,
        "aria-label": `Miami and Cuba${selected.id === "caribe" ? " (selected)" : ""}`,
        "aria-pressed": String(selected.id === "caribe"),
        onclick: () => pickRegion("caribe"),
        onkeydown: (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            pickRegion("caribe");
          }
        },
      },
      s("rect", { class: "inset-bg", x: inset.x, y: inset.y, width: inset.w, height: inset.h, rx: 10 }),
      s(
        "g",
        { "clip-path": "url(#inset-clip)" },
        s("path", { class: "land", d: pathOf(FLORIDA, inset.project) }),
        s("path", { class: "land cu", d: pathOf(CUBA, inset.project) }),
        ...CITIES_INSET.map((c) => {
          const [x, y] = inset.project(c.at);
          return s("circle", { class: "city", cx: x, cy: y, r: 2.4 });
        }),
      ),
      s("rect", { class: "inset-frame", x: inset.x, y: inset.y, width: inset.w, height: inset.h, rx: 10 }),
      s("text", { class: "inset-label", x: inset.x + inset.w / 2, y: inset.y + inset.h + 13, "text-anchor": "middle", text: "Miami · Cuba" }),
      selected.id === "caribe" ? s("circle", { class: "ring", cx: at[0], cy: at[1], r: 9 }) : null,
    ),
    ...REGIONS.filter((r) => r.id !== "caribe").map((r) => {
      const [x, y] = project(r.at);
      return hotspot(r, x, y, r.id === selected.id);
    }),
  );
  return svg;
}

function updateMap() {
  if (!app.earState || !$("map-art")) return;
  const dial = app.earState.dial;
  const region = regionById(dial.region);
  const level = LEVELS[dial.level];

  fill($("map-art"), mapSvg(dial));
  for (const btn of $("region-chips").querySelectorAll("[data-region]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.region === dial.region));
  }
  const range = $("taper");
  if (Number(range.value) !== dial.level) range.value = String(dial.level);
  range.setAttribute("aria-valuetext", level.name);
  for (const btn of $("taper-stops").querySelectorAll("[data-level]")) {
    btn.setAttribute("aria-pressed", String(Number(btn.dataset.level) === dial.level));
  }
  $("taper-tip").textContent = level.tip;

  const voice = pickVoice("es");
  fill(
    $("region-card"),
    h("p", { class: "eyebrow", text: region.area }),
    h("h3", { text: region.name }),
    h("p", { text: region.blurb }),
    h("p", { class: "eyebrow", text: "How it sounds" }),
    h("ul", { class: "accent" }, region.accent.map((a) => h("li", { text: a }))),
    h(
      "p",
      { class: "muted small" },
      `Ear listens for ${region.ear === "es-MX" ? "Mexican" : "U.S."} Spanish · Voice: ${voice ? voice.name : "the phone's Spanish voice"}`,
    ),
  );

  fill(
    $("map-samples"),
    MAP_SAMPLES.map((line) => {
      const hit = translate(line, "en", { dial });
      return h(
        "li",
        { class: "sample" },
        h(
          "div",
          {},
          h("span", { class: "en small", text: line }),
          h("span", { class: "es", lang: "es", text: hit.text }),
          hit.sounds ? h("span", { class: "sounds small", lang: "es" }, h("b", { text: "Sounds like " }), hit.sounds) : null,
          dial.level > 0 && hit.formal ? h("span", { class: "std small", lang: "es", text: `Formal: ${hit.formal}` }) : null,
        ),
        canSpeak() ? playButton(hit.voiced || hit.text, "es", `Hear “${hit.text}”`) : null,
      );
    }),
  );

  fill(
    $("map-compare"),
    compare(Math.max(dial.level, 1)).map((row) => {
      const here = dial.level === 0 ? row.formal : row.forms[region.id];
      const others = REGIONS.filter((r) => r.id !== region.id);
      return h(
        "li",
        { class: "cmp" },
        h("span", { class: "cmp-en", text: row.en }),
        h("span", { class: "cmp-here", lang: "es", text: here }),
        h(
          "span",
          { class: "cmp-others" },
          others.map((r) =>
            h("button", { type: "button", class: row.forms[r.id] === here ? "same" : "", onclick: () => pickRegion(r.id), title: r.name }, h("b", { text: r.short }), ` ${row.forms[r.id]}`),
          ),
          h("span", { class: "formal" }, h("b", { text: "Textbook" }), ` ${row.formal}`),
        ),
      );
    }),
  );
}

// Exposed for the console and the tests that drive the page.
export { noteText };

boot();
