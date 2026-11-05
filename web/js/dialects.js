// The dialect map: where you're talking (region) and how local Puente should sound (taper level).
//
// The lexicon says things the Southeast Texas way. This file reshapes that Spanish for another
// region, or tapers it down toward textbook Spanish. Each entry says, per region, which word to
// use in place of the base word, and at what taper level the regional word kicks in.
//
// Status: starter, needs native review. Regions are big and people inside them vary a lot.

/** @typedef {"houston"|"sanantonio"|"valle"|"elpaso"|"norte"|"centro"|"caribe"} RegionId */

export const REGIONS = [
  {
    id: "houston",
    group: "tx",
    name: "Houston & the Golden Triangle",
    short: "Houston",
    area: "Southeast Texas · Houston, Pasadena, Baytown, Beaumont, Port Arthur",
    at: [-95.37, 29.76],
    label: { dx: 12, dy: -10, anchor: "start" },
    blurb:
      "Plant towns and the ship channel. Spanish from all over Mexico and Central America meets Texas English, so Spanglish is everyday: la troca, el overtime, parquear.",
    accent: [
      "Borrowed words keep their English sound: la freeway, el turnaround.",
      "Short forms in relaxed talk: pa' (para), pos (pues), orita (ahorita).",
      "Switching languages mid-sentence is normal, not a mistake.",
    ],
    ear: "es-US",
    voice: ["es-us", "es-mx"],
    rate: 0.96,
  },
  {
    id: "sanantonio",
    group: "tx",
    name: "San Antonio",
    short: "San Antonio",
    area: "South-Central Texas · the Tejano heartland",
    at: [-98.49, 29.42],
    label: { dx: -12, dy: -10, anchor: "end" },
    blurb:
      "Home of conjunto and Tejano music. Families here have spoken Spanish in Texas for generations, so you hear old Tejano words: wela, mijo, nina.",
    accent: [
      "Tejano rhythm: Spanish vowels with Texas warmth.",
      "Everyday: '¿Ándale pues!', 'pos sí', 'orita vengo'.",
      "Older speakers keep words Mexico has moved on from.",
    ],
    ear: "es-US",
    voice: ["es-us", "es-mx"],
    rate: 0.95,
  },
  {
    id: "valle",
    group: "tx",
    name: "El Valle · Rio Grande Valley",
    short: "El Valle",
    area: "Brownsville, McAllen, Harlingen, Laredo",
    at: [-97.9, 26.2],
    label: { dx: 12, dy: 4, anchor: "start" },
    blurb:
      "Right on the border. English and Spanish trade places every sentence. La pulga, raspas, nina and nino, barbacoa on Sunday.",
    accent: [
      "Fast code-switching: 'Vamos a la store, ¿quieres algo?'",
      "Norteño words from across the river: huerco, lonche, troca.",
      "Orita and nomás all day long.",
    ],
    ear: "es-US",
    voice: ["es-us", "es-mx"],
    rate: 0.98,
  },
  {
    id: "elpaso",
    group: "tx",
    name: "El Paso · El Chuco",
    short: "El Paso",
    area: "El Paso & Ciudad Juárez",
    at: [-106.45, 31.76],
    label: { dx: 12, dy: 14, anchor: "start" },
    blurb:
      "One city on two sides of the river. El Chuco gave Caló the word pachuco, so ese, firme and ahí te watcho feel right at home.",
    accent: [
      "Chihuahua sound: 'ch' can soften toward 'sh' (muchacho → mushasho).",
      "Caló classics: ese, firme, ranfla.",
      "Lots of English loanwords, like the rest of Texas.",
    ],
    ear: "es-US",
    voice: ["es-us", "es-mx"],
    rate: 0.96,
  },
  {
    id: "norte",
    group: "mx",
    name: "Monterrey & el norte",
    short: "Monterrey",
    area: "Nuevo León, Coahuila, Tamaulipas, Chihuahua",
    at: [-100.31, 25.67],
    label: { dx: -12, dy: 4, anchor: "end" },
    blurb:
      "Norteño country: carne asada, accordion and cumbias. Lots of Texas Spanish came from here: troca, lonche, huerco.",
    accent: [
      "Norteño sing-song with strong, clear consonants.",
      "Final d goes soft: verdá, usté.",
      "Direct and friendly: '¿Qué onda, compa?'",
    ],
    ear: "es-MX",
    voice: ["es-mx", "es-us"],
    rate: 0.97,
  },
  {
    id: "centro",
    group: "mx",
    name: "Mexico City · el centro",
    short: "CDMX",
    area: "Mexico City and central Mexico",
    at: [-99.13, 19.43],
    label: { dx: 12, dy: 4, anchor: "start" },
    blurb:
      "The Spanish of TV and songs. Güey, chido, chamba and chela. Careful: a 'camión' here is a bus, not a truck.",
    accent: [
      "Chilango sing-song, with stretched endings: '¿Quéee?'",
      "Unstressed vowels get swallowed: pues → pus, entonces → 'ntons.",
      "'Güey' works like a comma.",
    ],
    ear: "es-MX",
    voice: ["es-mx", "es-us"],
    rate: 0.95,
  },
  {
    id: "caribe",
    group: "caribe",
    name: "Miami & Cuba",
    short: "Miami · Cuba",
    area: "Cuban Spanish, from Havana to Hialeah",
    at: [-82.36, 23.13],
    label: { dx: 0, dy: 0, anchor: "middle" },
    blurb: "Caribbean Spanish, fast and musical. Asere, ¿qué bolá?, la guagua and la pincha.",
    accent: [
      "S at the end of a syllable goes soft or drops: '¿cómo estás?' → '¿cómo ehtá?'",
      "D between vowels drops: cansado → cansao.",
      "Quick rhythm; words run together.",
    ],
    ear: "es-US",
    voice: ["es-us", "es-pr", "es-do", "es-mx"],
    rate: 1.04,
  },
];

export const LEVELS = [
  { id: 0, name: "Formal", es: "Formal", tip: "Textbook Spanish. Safe with anyone: a teacher, a doctor, a judge." },
  { id: 1, name: "Light", es: "Ligero", tip: "The everyday words people there really use: troca, lonche, parquear." },
  { id: 2, name: "Local", es: "Local", tip: "Local slang and Spanglish too: huercos, feria, jale, chido. For friends and coworkers." },
  { id: 3, name: "Full accent", es: "Con acento", tip: "Local words plus how they sound in relaxed talk. Puente says it that way too." },
];

export const DEFAULT_DIAL = Object.freeze({ region: "houston", level: 2 });

export function regionById(id) {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function cleanDial(dial) {
  const region = REGIONS.some((r) => r.id === dial?.region) ? dial.region : DEFAULT_DIAL.region;
  const level = Number.isInteger(dial?.level) && dial.level >= 0 && dial.level <= 3 ? dial.level : DEFAULT_DIAL.level;
  return { region, level };
}

// ---------------------------------------------------------------------------------------------
// Words. `base` = what the lexicon says. `forms` per region, or per group (tx, mx), or `formal`.
// Arrays line up with `base`. `level` = lowest taper level where the regional word is used;
// below it the formal word is used. `det: true` = only swap after el/la/mi/… (the word is also a verb).

export const DIAL_WORDS = [
  // Level 1: the everyday regional words
  { id: "truck", en: "truck", level: 1, show: true, base: ["troca", "trocas"],
    forms: { tx: ["troca", "trocas"], norte: ["troca", "trocas"], centro: ["camioneta", "camionetas"], caribe: ["camioneta", "camionetas"], formal: ["camioneta", "camionetas"] } },
  { id: "bus", en: "bus", level: 1, show: true, base: ["bus"],
    forms: { tx: "bus", mx: "camión", caribe: "guagua", formal: "autobús" } },
  { id: "car", en: "car", level: 1, show: true, base: ["carro", "carros"],
    forms: { tx: ["carro", "carros"], norte: ["carro", "carros"], centro: ["coche", "coches"], caribe: ["carro", "carros"], formal: ["carro", "carros"] } },
  { id: "trailer", en: "trailer", level: 1, base: ["traila", "trailas"],
    forms: { tx: ["traila", "trailas"], norte: ["traila", "trailas"], centro: ["tráiler", "tráileres"], formal: ["remolque", "remolques"] } },
  { id: "lunch", en: "lunch", level: 1, show: true, base: ["lonche"],
    forms: { tx: "lonche", norte: "lonche", centro: "comida", caribe: "almuerzo", formal: "almuerzo" } },
  { id: "have-lunch", en: "have lunch", level: 1, base: ["lonchar"],
    forms: { tx: "lonchar", norte: "lonchar", centro: "comer", formal: "almorzar" } },
  { id: "yard", en: "yard", level: 1, base: ["yarda"], forms: { tx: "yarda", formal: "patio" } },
  { id: "park", en: "park (the car)", level: 1, show: true,
    base: ["parquear", "parquea", "parqueé", "parqueaste", "parqueó", "parqueo"],
    forms: {
      tx: ["parquear", "parquea", "parqueé", "parqueaste", "parqueó", "parqueo"],
      caribe: ["parquear", "parquea", "parqueé", "parqueaste", "parqueó", "parqueo"],
      formal: ["estacionar", "estaciona", "estacioné", "estacionaste", "estacionó", "estaciono"],
    } },
  { id: "check", en: "check", level: 1, base: ["chequea", "chequear", "chequéalo", "chequéala"],
    forms: {
      tx: ["chequea", "chequear", "chequéalo", "chequéala"],
      caribe: ["chequea", "chequear", "chequéalo", "chequéala"],
      mx: ["checa", "checar", "chécalo", "chécala"],
      formal: ["revisa", "revisar", "revísalo", "revísala"],
    } },
  { id: "text", en: "text me", level: 1, base: ["textéame", "te texteo", "textear"],
    forms: {
      tx: ["textéame", "te texteo", "textear"],
      caribe: ["escríbeme", "te escribo", "escribir"],
      formal: ["mándame un mensaje", "te mando un mensaje", "mandar mensajes"],
    } },
  { id: "apply", en: "apply for the job", level: 1, base: ["aplica para el jale", "ya apliqué"],
    forms: { tx: ["aplica para el jale", "ya apliqué"], formal: ["solicita el trabajo", "ya hice la solicitud"] } },
  { id: "hurry", en: "hurry up", level: 1, show: true, base: ["apúrale"],
    forms: { tx: "apúrale", norte: "apúrale", centro: "ándale", caribe: "apúrate", formal: "apúrate" } },
  { id: "almost", en: "almost done", level: 1, base: ["ya merito"],
    forms: { tx: "ya merito", mx: "ya merito", formal: "ya casi" } },
  { id: "no-problem", en: "no problem", level: 1, show: true, base: ["no hay bronca"],
    forms: { tx: "no hay bronca", norte: "no hay bronca", centro: "no pasa nada", formal: "no hay problema" } },
  { id: "watch-out", en: "watch out", level: 1, show: true, base: ["aguas con", "aguas"],
    forms: { tx: ["aguas con", "aguas"], mx: ["aguas con", "aguas"], formal: ["cuidado con", "cuidado"] } },
  { id: "hand", en: "give me a hand", level: 1, base: ["échame la mano"],
    forms: { tx: "échame la mano", mx: "échame la mano", caribe: "dame una mano", formal: "ayúdame" } },
  { id: "back-up", en: "back up", level: 1, base: ["recula"],
    forms: { tx: "recula", norte: "recula", centro: "dale reversa", caribe: "da marcha atrás", formal: "da reversa" } },
  { id: "see-you", en: "see you later", level: 1, show: true, base: ["ahí nos vemos"],
    forms: { tx: "ahí nos vemos", mx: "ahí nos vemos", formal: "nos vemos" } },
  { id: "not-much", en: "not much", level: 1, base: ["aquí nomás"],
    forms: { tx: "aquí nomás", mx: "aquí nomás", caribe: "aquí, en la lucha", formal: "aquí nada más" } },
  { id: "just", en: "just", level: 1, base: ["nomás"], forms: { tx: "nomás", mx: "nomás", formal: "nada más" } },
  { id: "alright-then", en: "alright then", level: 1, base: ["ándale pues"],
    forms: { tx: "ándale pues", norte: "ándale pues", centro: "sale pues", caribe: "dale", formal: "de acuerdo" } },
  { id: "whats-up", en: "what's up", level: 1, show: true, base: ["qué onda primo", "qué onda ese", "qué onda"],
    forms: {
      tx: ["qué onda primo", "qué onda ese", "qué onda"],
      norte: ["qué onda compa", "qué onda compa", "qué onda"],
      centro: ["qué onda güey", "qué onda güey", "qué onda"],
      caribe: ["qué bolá asere", "qué bolá asere", "qué bolá"],
      formal: ["qué tal primo", "qué tal amigo", "qué tal"],
    } },
  { id: "spicy", en: "spicy", level: 1, base: ["picoso", "picosa"],
    forms: { tx: ["picoso", "picosa"], mx: ["picoso", "picosa"], formal: ["picante", "picante"] } },
  { id: "mijo", en: "sweetie (my kid)", level: 1, base: ["mijo", "mija"],
    forms: { tx: ["mijo", "mija"], mx: ["mijo", "mija"], caribe: ["mi niño", "mi niña"], formal: ["mi hijo", "mi hija"] } },
  { id: "overtime", en: "overtime", level: 1, base: ["overtime"], forms: { tx: "overtime", formal: "tiempo extra" } },
  { id: "freeway", en: "freeway", level: 1, base: ["freeway"], forms: { tx: "freeway", formal: "autopista" } },
  { id: "take-the", en: "take the", level: 1, base: ["agarra la", "súbete a la"],
    forms: { tx: ["agarra la", "súbete a la"], mx: ["agarra la", "súbete a la"], formal: ["toma la", "entra a la"] } },
  { id: "light", en: "turn at the light", level: 1, base: ["dobla en la luz"],
    forms: { tx: "dobla en la luz", formal: "dobla en el semáforo" } },
  { id: "clock", en: "clock in", level: 1, base: ["ya checaste", "checa tu entrada", "checa tu salida"],
    forms: {
      tx: ["ya checaste", "checa tu entrada", "checa tu salida"],
      mx: ["ya checaste", "checa tu entrada", "checa tu salida"],
      formal: ["ya registraste tu entrada", "registra tu entrada", "registra tu salida"],
    } },
  { id: "grandma", en: "grandma", level: 1, show: true, base: ["wela", "welo"],
    forms: { tx: ["wela", "welo"], mx: ["abuelita", "abuelito"], formal: ["abuela", "abuelo"] } },
  { id: "godmother", en: "godmother", level: 1, show: true, base: ["nina", "nino"],
    forms: { houston: ["nina", "nino"], sanantonio: ["nina", "nino"], valle: ["nina", "nino"], formal: ["madrina", "padrino"] } },
  { id: "bills", en: "bills", level: 1, base: ["biles"], forms: { tx: "biles", mx: "recibos", formal: "cuentas" } },
  { id: "snow-cone", en: "snow cone", level: 1, show: true, base: ["raspa"],
    forms: { tx: "raspa", mx: "raspado", caribe: "granizado", formal: "raspado" } },
  { id: "lawn", en: "lawn", level: 1, base: ["zacate"], forms: { tx: "zacate", mx: "zacate", formal: "césped" } },
  { id: "party", en: "party", level: 1, base: ["pachanga"], forms: { tx: "pachanga", mx: "pachanga", formal: "fiesta" } },
  { id: "flea-market", en: "flea market", level: 1, show: true, det: true, base: ["pulga"],
    forms: { tx: "pulga", mx: "tianguis", formal: "mercado de pulgas" } },
  { id: "insurance", en: "insurance", level: 1, base: ["aseguranza"], forms: { tx: "aseguranza", formal: "seguro" } },
  { id: "turnaround", en: "turnaround", level: 1, base: ["turnaround"], forms: { tx: "turnaround", formal: "paro de planta" } },
  { id: "foreman", en: "foreman", level: 1, base: ["mayordomo"], forms: { tx: "mayordomo", mx: "mayordomo", formal: "supervisor" } },
  { id: "ac", en: "turn on the AC", level: 1, base: ["prende el aire", "apaga el aire"],
    forms: { caribe: ["pon el aire", "quita el aire"], formal: ["prende el aire", "apaga el aire"] } },
  { id: "no-way", en: "no way", level: 1, base: ["no manches"],
    forms: { tx: "no manches", mx: "no manches", caribe: "no me digas", formal: "no puede ser" } },
  { id: "oh-well", en: "oh well", level: 1, base: ["ni modo"],
    forms: { tx: "ni modo", mx: "ni modo", caribe: "qué se le va a hacer", formal: "ni modo" } },

  // Level 2: local slang and Spanglish
  { id: "quit", en: "I quit", level: 2, base: ["ya cuiteé", "cuiteé", "cuiteó", "cuitear"],
    forms: { tx: ["ya cuiteé", "cuiteé", "cuiteó", "cuitear"], formal: ["ya renuncié", "renuncié", "renunció", "renunciar"] } },
  { id: "mop", en: "mop", level: 2, base: ["mapea", "mapear"],
    forms: { tx: ["mapea", "mapear"], caribe: ["pasa la frazada", "pasar la frazada"], formal: ["trapea", "trapear"] } },
  { id: "push", en: "push it", level: 2, base: ["púchale", "puchar"],
    forms: { tx: ["púchale", "puchar"], formal: ["empújale", "empujar"] } },
  { id: "cash", en: "cash (a check)", level: 2, base: ["cashea", "cashear"],
    forms: { tx: ["cashea", "cashear"], formal: ["cambia", "cambiar"] } },
  { id: "right-away", en: "right away", level: 2, base: ["de volada"],
    forms: { tx: "de volada", mx: "de volada", formal: "ahora mismo" } },
  { id: "favor", en: "do me a favor", level: 2, base: ["hazme un paro"],
    forms: { tx: "hazme un paro", mx: "hazme un paro", formal: "hazme un favor" } },
  { id: "see-ya", en: "catch you later", level: 2, base: ["ahí te watcho"],
    forms: { tx: "ahí te watcho", mx: "ahí nos vemos", formal: "nos vemos" } },
  { id: "parents", en: "my mom / my dad", level: 2, base: ["mi jefita", "mi jefito"],
    forms: { tx: ["mi jefita", "mi jefito"], mx: ["mi jefita", "mi jefito"], caribe: ["mi pura", "mi puro"], formal: ["mi mamá", "mi papá"] } },
  { id: "brakes", en: "brakes", level: 2, base: ["brecas"], forms: { tx: "brecas", formal: "frenos" } },
  { id: "dump-truck", en: "dump truck", level: 2, base: ["dompe"], forms: { tx: "dompe", mx: "volteo", formal: "camión de volteo" } },
  { id: "quarter", en: "quarter (coin)", level: 2, base: ["cora"], forms: { tx: "cora", formal: "moneda de 25 centavos" } },
  { id: "market", en: "market", level: 2, base: ["marqueta"], forms: { tx: "marqueta", formal: "mercado" } },
  { id: "job", en: "job", level: 2, show: true, base: ["jale"],
    forms: { tx: "jale", norte: "jale", centro: "chamba", caribe: "pincha", formal: "trabajo" } },
  { id: "job-noun", en: "the job", level: 2, det: true, base: ["trabajo"],
    forms: { tx: "jale", norte: "jale", centro: "chamba", caribe: "pincha", formal: "trabajo" } },
  { id: "best-friend", en: "best friend", level: 2, base: ["carnal"],
    forms: { tx: "carnal", mx: "carnal", caribe: "asere", formal: "mejor amigo" } },
  { id: "friend", en: "friend", level: 2, show: true, base: ["amigo", "amigos"],
    forms: { tx: ["compa", "compas"], norte: ["compa", "compas"], centro: ["cuate", "cuates"], caribe: ["socio", "socios"], formal: ["amigo", "amigos"] } },
  { id: "kids", en: "kids", level: 2, show: true, base: ["niños", "niño"],
    forms: { tx: ["huercos", "huerco"], norte: ["huercos", "huerco"], centro: ["chamacos", "chamaco"], formal: ["niños", "niño"] } },
  { id: "money", en: "money", level: 2, show: true, base: ["dinero"],
    forms: { tx: "feria", norte: "feria", centro: "lana", caribe: "baro", formal: "dinero" } },
  { id: "beer", en: "beer", level: 2, show: true, base: ["cerveza", "cervezas"],
    forms: { tx: ["cheve", "cheves"], norte: ["cheve", "cheves"], centro: ["chela", "chelas"], formal: ["cerveza", "cervezas"] } },
  { id: "cool", en: "cool", level: 2, show: true, base: ["qué chido", "chido"],
    forms: {
      tx: ["qué chido", "chido"],
      elpaso: ["qué firme", "firme"],
      norte: ["qué chido", "chido"],
      centro: ["qué padre", "padre"],
      caribe: ["qué chévere", "chévere"],
      formal: ["qué bien", "genial"],
    } },
];

/** Noun genders, so el/la/un/una follow a swapped word (la traila → el remolque). */
export const GENDER = {
  troca: "f", trocas: "fp", camioneta: "f", camionetas: "fp",
  bus: "m", camión: "m", guagua: "f", autobús: "m",
  carro: "m", carros: "mp", coche: "m", coches: "mp",
  traila: "f", trailas: "fp", tráiler: "m", tráileres: "mp", remolque: "m", remolques: "mp",
  lonche: "m", comida: "f", almuerzo: "m",
  yarda: "f", patio: "m",
  wela: "f", abuelita: "f", abuela: "f", welo: "m", abuelito: "m", abuelo: "m",
  nina: "f", madrina: "f", nino: "m", padrino: "m",
  biles: "mp", recibos: "mp", cuentas: "fp",
  raspa: "f", raspado: "m", granizado: "m",
  zacate: "m", césped: "m",
  pachanga: "f", fiesta: "f",
  pulga: "f", tianguis: "m", "mercado de pulgas": "m",
  aseguranza: "f", seguro: "m",
  turnaround: "m", "paro de planta": "m",
  mayordomo: "m", supervisor: "m",
  overtime: "m", "tiempo extra": "m",
  freeway: "f", autopista: "f",
  brecas: "fp", frenos: "mp",
  dompe: "m", volteo: "m", "camión de volteo": "m",
  cora: "f", "moneda de 25 centavos": "f",
  marqueta: "f", mercado: "m",
  jale: "m", chamba: "f", pincha: "f", trabajo: "m",
  carnal: "m", asere: "m", "mejor amigo": "m",
  amigo: "m", amigos: "mp", compa: "m", compas: "mp", cuate: "m", cuates: "mp", socio: "m", socios: "mp",
  niños: "mp", niño: "m", huercos: "mp", huerco: "m", chamacos: "mp", chamaco: "m",
  dinero: "m", feria: "f", lana: "f", baro: "m",
  cerveza: "f", cervezas: "fp", cheve: "f", cheves: "fp", chela: "f", chelas: "fp",
};

// Determiners lined up by position so a gender change maps el → la, un → una, al → a la, …
const DET = {
  m: ["el", "un", "este", "ese", "aquel", "nuestro", "al", "del"],
  f: ["la", "una", "esta", "esa", "aquella", "nuestra", "a la", "de la"],
  mp: ["los", "unos", "estos", "esos", "aquellos", "nuestros"],
  fp: ["las", "unas", "estas", "esas", "aquellas", "nuestras"],
};
const NEUTRAL_DET = ["mi", "tu", "su", "mis", "tus", "sus"];
const DET_GENDER = new Map();
for (const [g, list] of Object.entries(DET)) for (const d of list) DET_GENDER.set(d, g);

function pickForm(entry, region, level) {
  const r = regionById(region);
  const useRegional = level >= entry.level;
  const forms = entry.forms;
  const regional = forms[r.id] ?? forms[r.group];
  const chosen = useRegional && regional !== undefined ? regional : forms.formal;
  return Array.isArray(chosen) ? chosen : [chosen];
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let index = null;

function buildIndex() {
  const byBase = new Map();
  for (const entry of DIAL_WORDS) {
    entry.base.forEach((b, i) => {
      if (!byBase.has(b)) byBase.set(b, { entry, i });
    });
  }
  const bases = [...byBase.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
  const dets = [...DET_GENDER.keys(), ...NEUTRAL_DET].sort((a, b) => b.length - a.length).map(escapeRe);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:(${dets.join("|")})\\s+)?(${bases.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return { byBase, re };
}

function swapDet(det, from, to) {
  if (!det) return det;
  const lower = det.toLowerCase();
  const g1 = DET_GENDER.get(lower);
  const g2 = GENDER[to];
  if (!g1 || !g2 || GENDER[from] === g2 || g1 === g2) return det;
  const i = DET[g1].indexOf(lower);
  return DET[g2]?.[i] ?? det;
}

/**
 * Reshape base (Southeast Texas) Spanish for a region and taper level, in one pass.
 * @param {string} text  Base Spanish from the lexicon, before punctuation is added.
 * @param {RegionId} region
 * @param {0|1|2|3} level 0 = formal … 3 = full accent (same words as 2).
 */
export function toDialect(text, region = DEFAULT_DIAL.region, level = DEFAULT_DIAL.level) {
  index ??= buildIndex();
  return String(text ?? "").replace(index.re, (match, det, word) => {
    const hit = index.byBase.get(word.toLowerCase());
    if (!hit) return match;
    if (hit.entry.det && !det) return match;
    const forms = pickForm(hit.entry, region, level);
    const target = forms[Math.min(hit.i, forms.length - 1)];
    if (!det) return target;
    return `${swapDet(det, word.toLowerCase(), target)} ${target}`;
  });
}

/** The words that change most from place to place, for the "same word, different places" list. */
export function compare(level = 2) {
  return DIAL_WORDS.filter((e) => e.show).map((entry) => ({
    id: entry.id,
    en: entry.en,
    level: entry.level,
    forms: Object.fromEntries(REGIONS.map((r) => [r.id, pickForm(entry, r.id, Math.max(level, entry.level))[0]])),
    formal: pickForm(entry, "houston", 0)[0],
  }));
}

// ---------------------------------------------------------------------------------------------
// "Sounds like": relaxed pronunciation, spelled the way it sounds. Used at the Full accent level.
// `voiced` is the version the phone's voice reads aloud (only changes a Spanish voice can say).

const WORD_SWAPS = {
  tx: [["nada más", "nomás"], ["para", "pa'"], ["pues", "pos"], ["ahorita", "orita"], ["está bien", "'tá bien"]],
  norte: [["nada más", "nomás"], ["para", "pa'"], ["pues", "pos"], ["verdad", "verdá"], ["usted", "usté"]],
  centro: [["pues", "pus"], ["entonces", "'ntons"], ["para", "pa'"], ["verdad", "verdá"]],
  caribe: [["para", "pa'"], ["nada", "na'"], ["verdad", "verdá"], ["usted", "usté"]],
};

function wordSwap(text, pairs) {
  let t = text;
  for (const [from, to] of pairs) {
    t = t.replace(new RegExp(`(?<![\\p{L}])${escapeRe(from)}(?![\\p{L}])`, "giu"), (m) =>
      m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? to.replace(/\p{L}/u, (c) => c.toUpperCase()) : to,
    );
  }
  return t;
}

/** Caribbean: s before a consonant or at the end of a word turns into a soft h; -ado → -ao. */
function caribbean(text) {
  return text
    .replace(/(\p{L})ado(?![\p{L}])/gu, "$1ao")
    .replace(/s(?=[bcdfgjklmnpqtvz])/giu, "h")
    .replace(/(\p{L})s(?![\p{L}])/gu, "$1h");
}

/** Chihuahua / El Paso: ch can soften toward sh. Spelled out only; voices can't say it. */
function chihuahua(text) {
  return text.replace(/ch/g, "sh").replace(/Ch/g, "Sh");
}

/** @returns {{ display: string, voiced: string }} */
export function soundsLike(text, region = DEFAULT_DIAL.region) {
  const r = regionById(region);
  const swaps = WORD_SWAPS[r.id] ?? WORD_SWAPS[r.group] ?? [];
  let voiced = wordSwap(String(text ?? ""), swaps);
  if (r.id === "caribe") voiced = caribbean(voiced);
  const display = r.id === "elpaso" ? chihuahua(voiced) : voiced;
  return { display, voiced };
}
