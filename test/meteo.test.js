import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { forecastUrl, parseForecast } from "../shared/openMeteo.js";
import { validateForecast, ValidationError } from "../server/validation.js";
import { adviceFromForecast } from "../server/weather.js";

// Réponse Open-Meteo réduite : 3 jours passés, aujourd'hui, 6 jours à venir.
const dates = Array.from({ length: 10 }, (_, i) => `2026-10-${String(12 + i).padStart(2, "0")}`);
const openMeteo = {
  timezone: "Africa/Dakar",
  daily: {
    time: dates,
    temperature_2m_max: dates.map(() => 35),
    temperature_2m_min: dates.map(() => 25),
    precipitation_sum: [8, 9, 6, 0, 0, null, 0, 0, 0, 0],
    precipitation_probability_max: dates.map(() => 10),
    wind_speed_10m_max: dates.map(() => 9),
  },
};

describe("météo Open-Meteo", () => {
  it("construit l'adresse avec 3 jours passés et 7 jours de prévision", () => {
    const url = new URL(forecastUrl(12.81, -16.2264));
    assert.equal(url.hostname, "api.open-meteo.com");
    assert.equal(url.searchParams.get("past_days"), "3");
    assert.equal(url.searchParams.get("forecast_days"), "7");
    assert.equal(url.searchParams.get("latitude"), "12.8100");
  });
  it("lit la réponse et remplace les pluies manquantes par 0", () => {
    const f = parseForecast(openMeteo);
    assert.equal(f.days.length, 10);
    assert.equal(f.todayIndex, 3);
    assert.equal(f.days[5].rain, 0);
    assert.equal(f.timezone, "Africa/Dakar");
  });
  it("refuse une réponse sans données journalières", () => {
    assert.throws(() => parseForecast({ error: true }), /inattendue/);
  });
});

describe("prévisions reçues du navigateur", () => {
  const forecast = parseForecast(openMeteo);
  it("accepte des prévisions valides", () => {
    assert.equal(validateForecast(forecast).days.length, 10);
  });
  it("refuse des valeurs absurdes, des dates mal formées ou un jour courant hors liste", () => {
    const bad = (patch) => ({ ...forecast, days: forecast.days.map((d, i) => (i === 4 ? { ...d, ...patch } : d)) });
    assert.throws(() => validateForecast(bad({ tmax: 400 })), ValidationError);
    assert.throws(() => validateForecast(bad({ rain: -5 })), ValidationError);
    assert.throws(() => validateForecast(bad({ date: "<script>" })), ValidationError);
    assert.throws(() => validateForecast(bad({ windMax: "fort" })), ValidationError);
    assert.throws(() => validateForecast({ ...forecast, todayIndex: 20 }), ValidationError);
    assert.throws(() => validateForecast({ ...forecast, days: forecast.days.slice(0, 2) }), ValidationError);
    assert.throws(() => validateForecast(null), ValidationError);
  });
  it("calcule les conseils avec les règles", () => {
    const advice = adviceFromForecast(validateForecast(forecast), ["oignon", "arachide"], new Date(2026, 9, 15));
    assert.equal(advice.today, "2026-10-15");
    assert.equal(advice.forecast.length, 7);
    assert.equal(advice.indicateurs.pluie3jPasses, 23);
    assert.equal(advice.recommandations[0].action, "arroser");
    assert.equal(advice.recommandations[1].culture, "arachide");
  });
});
