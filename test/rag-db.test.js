import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { openDb } from "../server/db.js";
import { buildIndex, chunkText, search, tokenize } from "../server/rag.js";

describe("recherche dans les fiches (RAG)", () => {
  // Fiches de test fictives, créées dans un dossier temporaire.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agri-docs-"));
  fs.writeFileSync(path.join(dir, "test-oignon.md"), "# Test oignon\n\nTexte de test sur le repiquage des oignons en pépinière.");
  fs.writeFileSync(path.join(dir, "test-mil.txt"), "Texte de test sur le stockage du mil dans un grenier.");
  fs.writeFileSync(path.join(dir, "_exemple.md"), "Ce fichier d'exemple parle aussi d'oignons mais doit être ignoré.");
  fs.writeFileSync(path.join(dir, "image.png"), "pas un texte");

  it("normalise les mots (accents, majuscules, pluriels, mots vides, racines)", () => {
    assert.deepEqual(tokenize("Les Pépinières d'oignons"), ["pepini", "oignon"]);
  });
  it("découpe les longs textes en passages", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragraphe ${i} `.repeat(20)).join("\n\n");
    const chunks = chunkText(text, 800);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((c) => c.length <= 800 + 400));
  });
  it("indexe seulement les .md et .txt qui ne commencent pas par _", () => {
    assert.deepEqual(buildIndex(dir).files.sort(), ["test-mil.txt", "test-oignon.md"]);
  });
  it("trouve la bonne fiche et renvoie sa source", () => {
    const results = search(buildIndex(dir), "Comment repiquer mes oignons ?");
    assert.equal(results[0].source, "test-oignon.md");
  });
  it("ne renvoie rien pour une question sans rapport", () => {
    assert.deepEqual(search(buildIndex(dir), "prix du ciment"), []);
  });
  it("fonctionne avec un dossier absent", () => {
    assert.deepEqual(search(buildIndex(path.join(dir, "absent")), "oignon"), []);
  });
});

describe("historique SQLite", () => {
  it("enregistre, pagine par 10 et sépare les utilisateurs", () => {
    const db = openDb(":memory:");
    for (let i = 1; i <= 12; i++) db.add("client-a", i % 2 ? "question" : "diagnostic", `titre ${i}`, `contenu ${i}`);
    db.add("client-b", "question", "autre", "autre");

    const p1 = db.list("client-a", { page: 1, limit: 10 });
    assert.equal(p1.total, 12);
    assert.equal(p1.pages, 2);
    assert.equal(p1.items.length, 10);
    assert.equal(p1.items[0].title, "titre 12");
    assert.equal(db.list("client-a", { page: 2, limit: 10 }).items.length, 2);
    assert.equal(db.list("client-b").total, 1);

    db.clear("client-a");
    assert.equal(db.list("client-a").total, 0);
    assert.equal(db.list("client-b").total, 1);
    db.close();
  });
});
