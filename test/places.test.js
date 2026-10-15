import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchLocal } from "../server/geocode.js";
import { mergePlaces, toPlaces } from "../shared/openMeteo.js";
import { PLACES } from "../server/places.js";
import { parsePlaceQuery, sanitizeProfile } from "../server/validation.js";

describe("liste des localités", () => {
  it("couvre les 14 régions du Sénégal", () => {
    assert.equal(Object.keys(PLACES).length, 14);
    for (const list of Object.values(PLACES)) assert.ok(list.length > 0);
  });
  it("a des coordonnées à l'intérieur du Sénégal", () => {
    for (const [region, list] of Object.entries(PLACES)) {
      for (const p of list) {
        assert.ok(p.lat > 12.2 && p.lat < 16.8, `${p.name} (${region}) : latitude ${p.lat}`);
        assert.ok(p.lon > -17.6 && p.lon < -11.3, `${p.name} (${region}) : longitude ${p.lon}`);
      }
    }
  });
  it("n'a pas de doublon dans une région", () => {
    for (const list of Object.values(PLACES)) {
      const names = list.map((p) => p.name);
      assert.equal(new Set(names).size, names.length);
    }
  });
  it("place les localités de Casamance au sud (sous 13,1° de latitude)", () => {
    for (const region of ["Ziguinchor", "Sédhiou"]) {
      for (const p of PLACES[region]) assert.ok(p.lat < 13.1, `${p.name} : ${p.lat}`);
    }
  });
});

describe("recherche de localité", () => {
  const results = [
    { name: "Bignona", admin1: "Ziguinchor", country_code: "SN", latitude: 12.81028, longitude: -16.22639 },
    { name: "Bignona", admin1: "Ziguinchor", country_code: "SN", latitude: 12.81028, longitude: -16.22639 },
    { name: "Mlomp", admin1: "Ziguinchor", admin2: "Oussouye", country_code: "SN", latitude: 12.55306, longitude: -16.59417 },
    { name: "Bignona", admin1: "Autre", country_code: "GM", latitude: 13.4, longitude: -16.6 },
  ];
  it("garde seulement le Sénégal, sans doublon, au format du profil", () => {
    const places = toPlaces(results);
    assert.equal(places.length, 2);
    assert.deepEqual(places[0], { name: "Bignona", region: "Ziguinchor", detail: "", lat: 12.8103, lon: -16.2264 });
    assert.equal(places[1].detail, "Oussouye");
  });
  it("trouve dans la liste sans tenir compte des accents ni des tirets", () => {
    assert.deepEqual(searchLocal("thionck").map((p) => p.name), ["Thionck-Essyl"]);
    assert.deepEqual(searchLocal("THIONCK ESSYL").map((p) => p.region), ["Ziguinchor"]);
    assert.deepEqual(searchLocal("sedhiou").map((p) => p.name), ["Sédhiou"]);
    assert.equal(searchLocal("mlomp").length, 2);
    assert.deepEqual(searchLocal("zzz"), []);
  });
  it("fusionne la liste et le géocodage sans doublon proche", () => {
    const local = [{ name: "Bignona", region: "Ziguinchor", lat: 12.8103, lon: -16.2264 }];
    const remote = [
      { name: "Bignona", region: "Ziguinchor", lat: 12.8105, lon: -16.2266 },
      { name: "Kagnobon", region: "Ziguinchor", lat: 12.8422, lon: -16.42 },
    ];
    assert.deepEqual(mergePlaces(local, remote).map((p) => p.name), ["Bignona", "Kagnobon"]);
  });
  it("accepte une réponse sans résultat", () => {
    assert.deepEqual(toPlaces(undefined), []);
  });
  it("valide le texte tapé", () => {
    assert.equal(parsePlaceQuery("  Bignona "), "Bignona");
    assert.throws(() => parsePlaceQuery("a"), /2 et 60/);
    assert.throws(() => parsePlaceQuery("x".repeat(61)), /2 et 60/);
    assert.throws(() => parsePlaceQuery(["Bignona"]), /2 et 60/);
  });
  it("garde la région dans le profil", () => {
    const p = sanitizeProfile({ place: { name: "Bignona", region: "Ziguinchor", lat: 12.81, lon: -16.23 } });
    assert.equal(p.place.region, "Ziguinchor");
  });
});
