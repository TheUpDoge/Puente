// Text normalizer shared by the translator, the course grader and the dictionary search.
// Lowercase, drop accents and punctuation, expand English speech contractions.
// Keeps "ñ" as its own letter: niña (girl) and nina (Tejano for godmother) are different words.

const APOSTROPHE_FIXES = [
  ["i'll", "i will"],
  ["i've", "i have"],
  ["i'd", "i would"],
  ["i'm", "i am"],
  ["don't", "do not"],
  ["can't", "can not"],
  ["won't", "will not"],
  ["isn't", "is not"],
  ["aren't", "are not"],
  ["what's", "what is"],
  ["where's", "where is"],
  ["how's", "how is"],
  ["that's", "that is"],
  ["it's", "it is"],
  ["let's", "let us"],
  ["we're", "we are"],
  ["they're", "they are"],
  ["you're", "you are"],
  ["doesn't", "does not"],
  ["didn't", "did not"],
  ["y'all", "you all"],
];

const SPEECHY = new Map([
  ["im", "i am"],
  ["ill", "i will"],
  ["dont", "do not"],
  ["cant", "can not"],
  ["cannot", "can not"],
  ["wont", "will not"],
  ["isnt", "is not"],
  ["arent", "are not"],
  ["whats", "what is"],
  ["wheres", "where is"],
  ["hows", "how is"],
  ["thats", "that is"],
  ["lets", "let us"],
  ["theyre", "they are"],
  ["youre", "you are"],
  ["doesnt", "does not"],
  ["didnt", "did not"],
  ["gonna", "going to"],
  ["wanna", "want to"],
  ["gotta", "got to"],
  ["lemme", "let me"],
  ["gimme", "give me"],
  ["kinda", "kind of"],
  ["yall", "you all"],
]);

/** Lowercase, drop accents (not ñ) and punctuation, expand contractions. */
export function normalize(s) {
  let x = String(s ?? "").toLowerCase().replace(/[’‘`´]/g, "'");
  for (const [from, to] of APOSTROPHE_FIXES) x = x.replaceAll(from, to);
  x = x.replace(/'/g, "");
  x = x.normalize("NFD").replace(/ñ/g, "ñ").replace(/\p{M}+/gu, "");
  x = x.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!x) return "";
  const out = [];
  for (const w of x.split(" ")) out.push(SPEECHY.get(w) ?? w);
  return out.join(" ");
}

/** Same as normalize, but ñ becomes n. Used as a fallback for typing on English keyboards. */
export function loose(s) {
  return normalize(s).replace(/ñ/g, "n");
}

export function tokens(s) {
  const n = normalize(s);
  return n ? n.split(" ") : [];
}

/** 0..1 word-level similarity, used to grade spoken or typed answers. */
export function similarity(a, b) {
  const ta = loose(a).split(" ").filter(Boolean);
  const tb = loose(b).split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  if (ta.join(" ") === tb.join(" ")) return 1;
  // Word-level edit distance, softened by letter-level closeness of each word.
  const rows = ta.length + 1;
  const cols = tb.length + 1;
  const d = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = 1 - letterSimilarity(ta[i - 1], tb[j - 1]);
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return Math.max(0, 1 - d[rows - 1][cols - 1] / Math.max(ta.length, tb.length));
}

function letterSimilarity(a, b) {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  const score = 1 - prev[n] / Math.max(m, n);
  return score >= 0.6 ? score : 0;
}
