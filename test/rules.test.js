import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indicators, inSowingWindow, isRainySeason, recommend, SEUILS } from "../server/rules.js";

// Indicateurs de base : temps sec, chaud raisonnable, vent faible.
const base = {
  pluie3jPasses: 0,
  pluie48h: 0,
  pluie3jPrevus: 0,
  pluie7jPrevus: 0,
  pluieAujourdhui: 0,
  pluieDemain: 0,
  tmaxAujourdhui: 32,
  ventAujourdhui: 8,
};
const juillet = new Date(2026, 6, 10);
const octobre = new Date(2026, 9, 15);
const fevrier = new Date(2026, 1, 1);

describe("calendrier", () => {
  it("fenêtre de semis du 15 juin au 15 août", () => {
    assert.equal(inSowingWindow(new Date(2026, 5, 14)), false);
    assert.equal(inSowingWindow(new Date(2026, 5, 15)), true);
    assert.equal(inSowingWindow(new Date(2026, 7, 15)), true);
    assert.equal(inSowingWindow(new Date(2026, 7, 16)), false);
  });
  it("hivernage de juin à octobre", () => {
    assert.equal(isRainySeason(juillet), true);
    assert.equal(isRainySeason(octobre), true);
    assert.equal(isRainySeason(fevrier), false);
  });
});

describe("indicateurs", () => {
  it("additionne les pluies passées et prévues autour d'aujourd'hui", () => {
    const days = [5, 10, 8, 2, 4, 1, 0, 0, 0, 0].map((rain, i) => ({ date: `j${i}`, rain, tmax: 30 + i, windMax: 10 }));
    const ind = indicators(days, 3);
    assert.equal(ind.pluie3jPasses, 23);
    assert.equal(ind.pluieAujourdhui, 2);
    assert.equal(ind.pluieDemain, 4);
    assert.equal(ind.pluie48h, 6);
    assert.equal(ind.pluie3jPrevus, 7);
    assert.equal(ind.pluie7jPrevus, 7);
    assert.equal(ind.tmaxAujourdhui, 33);
  });
  it("traite les pluies manquantes comme 0", () => {
    const days = [null, null, null, null].map((rain) => ({ rain, tmax: 30, windMax: 5 }));
    assert.equal(indicators(days, 3).pluie3jPasses, 0);
  });
});

describe("recommandations", () => {
  it("semer une culture pluviale après une pluie utile en période de semis", () => {
    const r = recommend("arachide", { ...base, pluie3jPasses: SEUILS.pluieUtileSemis }, juillet);
    assert.equal(r.action, "semer");
  });
  it("attendre une pluie utile si le sol est trop sec en période de semis", () => {
    const r = recommend("mil", { ...base, pluie3jPasses: 8 }, juillet);
    assert.equal(r.action, "attendre");
    assert.match(r.raisons[0], /pluie utile/);
  });
  it("attendre en cas de forte pluie prévue, même pour une culture irriguée", () => {
    const r = recommend("oignon", { ...base, pluie48h: 25, pluie3jPrevus: 25 }, fevrier);
    assert.equal(r.action, "attendre");
  });
  it("la pluie utile passée l'emporte sur la pluie forte prévue pour semer", () => {
    const r = recommend("mais", { ...base, pluie3jPasses: 30, pluie48h: 15 }, juillet);
    assert.equal(r.action, "semer");
  });
  it("arroser une culture irriguée quand peu de pluie est prévue", () => {
    const r = recommend("tomate", { ...base, pluie3jPrevus: 2 }, fevrier);
    assert.equal(r.action, "arroser");
    assert.equal(r.raisons.length, 1);
  });
  it("signaler la forte chaleur quand il faut arroser", () => {
    const r = recommend("oignon", { ...base, tmaxAujourdhui: 38 }, fevrier);
    assert.equal(r.action, "arroser");
    assert.match(r.raisons[1], /chaleur/);
  });
  it("ne jamais proposer d'arroser une culture pluviale", () => {
    for (const date of [juillet, octobre, fevrier]) {
      assert.notEqual(recommend("arachide", base, date).action, "arroser");
    }
  });
  it("attendre pour une culture pluviale hors hivernage", () => {
    const r = recommend("arachide", base, fevrier);
    assert.equal(r.action, "attendre");
    assert.match(r.raisons[0], /Hors hivernage/);
  });
  it("traitement possible par temps calme et sec pendant l'hivernage", () => {
    const r = recommend("arachide", base, octobre);
    assert.equal(r.action, "traiter");
    assert.equal(r.traitementPossible, true);
  });
  it("pas de traitement avec un vent fort", () => {
    const r = recommend("arachide", { ...base, ventAujourdhui: 25 }, octobre);
    assert.equal(r.action, "attendre");
    assert.equal(r.traitementPossible, false);
    assert.ok(r.raisons.some((x) => /Vent fort/.test(x)));
  });
  it("pas de traitement si de la pluie est prévue demain", () => {
    const r = recommend("arachide", { ...base, pluieDemain: 3, pluie48h: 3 }, octobre);
    assert.equal(r.traitementPossible, false);
    assert.equal(r.action, "attendre");
  });
  it("refuse une culture inconnue", () => {
    assert.throws(() => recommend("banane", base, juillet), /inconnue/);
  });
});
