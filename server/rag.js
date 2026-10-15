// Recherche simple dans les fiches techniques du dossier docs/ (.md, .txt).
// Les fichiers dont le nom commence par "_" (exemples, modèles) sont ignorés.
// Méthode : découpage en passages, mots normalisés (minuscules, sans accents ni mots vides, tronqués), score BM25.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_DOCS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");

const STOPWORDS = new Set(
  ("le la les un une des du de d l au aux et ou en dans sur pour par avec sans ce cet cette ces se sa son ses " +
    "leur leurs qui que quoi dont est sont etre a ont avoir il elle ils elles on je tu nous vous y ne pas plus " +
    "comment quand quel quelle quels quelles faut faire peut mon ma mes ton ta tes tres bien aussi si mais donc")
    .split(" "),
);

export function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    // Racinisation grossière : « repiquer », « repiquage » et « repiqués » donnent « repiqu ».
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w).slice(0, 6));
}

// Découpe un texte en passages d'environ `maxChars` caractères, en suivant les paragraphes.
export function chunkText(text, maxChars = 800) {
  const chunks = [];
  let current = "";
  for (const para of text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (current && current.length + para.length > maxChars) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${para}` : para;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function buildIndex(dir = DEFAULT_DOCS_DIR) {
  const passages = [];
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /\.(md|txt)$/i.test(f) && !f.startsWith("_"))
    : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const chunk of chunkText(text)) {
      passages.push({ source: file, text: chunk, tokens: tokenize(chunk) });
    }
  }
  const df = new Map();
  for (const p of passages) for (const t of new Set(p.tokens)) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = passages.reduce((a, p) => a + p.tokens.length, 0) / (passages.length || 1);
  return { passages, df, avgLen, files };
}

export function search(index, query, { limit = 3, minScore = 0.5 } = {}) {
  const terms = [...new Set(tokenize(query))];
  const N = index.passages.length;
  const k1 = 1.2;
  const b = 0.75;
  return index.passages
    .map((p) => {
      let score = 0;
      for (const t of terms) {
        const tf = p.tokens.filter((x) => x === t).length;
        if (!tf) continue;
        const idf = Math.log(1 + (N - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * p.tokens.length) / index.avgLen));
      }
      return { source: p.source, text: p.text, score };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Index rechargé automatiquement quand les fiches changent (ajout, modification, suppression).
export function createDocsSearch(dir = DEFAULT_DOCS_DIR) {
  let signature = null;
  let index = null;
  function current() {
    const sig = fs.existsSync(dir)
      ? fs.readdirSync(dir).map((f) => `${f}:${fs.statSync(path.join(dir, f)).mtimeMs}`).join("|")
      : "";
    if (sig !== signature) {
      index = buildIndex(dir);
      signature = sig;
    }
    return index;
  }
  return {
    search: (query, options) => search(current(), query, options),
    files: () => current().files,
  };
}
