// Fait tourner le vrai modèle photo (téléchargé au premier lancement) : vérifie qu'il fonctionne
// sur la machine, en particulier sous Linux dans la CI, comme sur l'hébergeur.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import zlib from "node:zlib";
import { diagnoseImage } from "../server/diagnose.js";
import { validateImage } from "../server/validation.js";

// Image PNG unie (vert feuille) construite à la main, sans fichier ni dépendance.
function solidPng(width, height, [r, g, b]) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const pixels = zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("modèle photo", () => {
  it("renvoie 3 diagnostics traduits avec des scores cohérents", { timeout: 180_000 }, async () => {
    const png = solidPng(64, 64, [60, 140, 60]);
    assert.equal(validateImage(png), "image/png");
    const result = await diagnoseImage(png, "image/png");
    assert.equal(result.top.length, 3);
    for (const t of result.top) {
      assert.ok(t.plant && t.condition, `libellé traduit pour ${t.label}`);
      assert.ok(t.score >= 0 && t.score <= 1);
    }
    assert.ok(result.top[0].score >= result.top[1].score);
    assert.equal(typeof result.confident, "boolean");
  });
});
