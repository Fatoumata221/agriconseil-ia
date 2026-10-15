// Règles de recommandation météo : volontairement simples, lisibles et testées (test/rules.test.js).
// Ce sont des seuils indicatifs à adapter avec un technicien local ; l'IA ne fait qu'expliquer le résultat.
import { CROPS } from "./crops.js";

export const SEUILS = {
  pluieUtileSemis: 20, // mm cumulés sur les 3 derniers jours pour considérer le sol assez humide pour semer
  pluieForte48h: 10, // mm prévus sur 48 h : inutile d'arroser, ne pas traiter
  pluieFaible3j: 5, // mm prévus sur 3 jours en dessous desquels une culture irriguée a besoin d'eau
  chaleurForte: 35, // °C (maximum du jour) : arroser tôt le matin ou en fin de journée
  ventMaxTraitement: 15, // km/h : au-delà, la pulvérisation dérive
  pluieMaxTraitement: 1, // mm le jour même et le lendemain : sinon le produit est lessivé
};

// Fenêtre de semis des cultures pluviales (hivernage), en [mois, jour].
export const FENETRE_SEMIS = { debut: [6, 15], fin: [8, 15] };
// Mois de l'hivernage (saison des pluies), de juin à octobre.
export const MOIS_HIVERNAGE = [6, 7, 8, 9, 10];

export const ACTIONS = {
  semer: { label: "Semer", emoji: "🌱" },
  arroser: { label: "Arroser", emoji: "💧" },
  traiter: { label: "Traiter si besoin", emoji: "🧴" },
  attendre: { label: "Attendre", emoji: "⏳" },
};

const sum = (values) => values.reduce((a, b) => a + (b ?? 0), 0);
const round = (n) => Math.round(n * 10) / 10;
// Nombres à la française dans les explications : 11,7 km/h.
const fr = (n) => String(n).replace(".", ",");

export function inSowingWindow(date) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const [dm, dd] = FENETRE_SEMIS.debut;
  const [fm, fd] = FENETRE_SEMIS.fin;
  return md >= dm * 100 + dd && md <= fm * 100 + fd;
}

export function isRainySeason(date) {
  return MOIS_HIVERNAGE.includes(date.getMonth() + 1);
}

// Indicateurs calculés à partir des prévisions journalières.
// `days` : [{ date, rain, tmax, tmin, windMax }], trié par date ; `todayIndex` : position d'aujourd'hui.
export function indicators(days, todayIndex) {
  const past = days.slice(Math.max(0, todayIndex - 3), todayIndex);
  const today = days[todayIndex];
  const next = days.slice(todayIndex);
  return {
    pluie3jPasses: round(sum(past.map((d) => d.rain))),
    pluie48h: round(sum(next.slice(0, 2).map((d) => d.rain))),
    pluie3jPrevus: round(sum(next.slice(0, 3).map((d) => d.rain))),
    pluie7jPrevus: round(sum(next.slice(0, 7).map((d) => d.rain))),
    pluieAujourdhui: round(today.rain ?? 0),
    pluieDemain: round(next[1]?.rain ?? 0),
    tmaxAujourdhui: today.tmax,
    ventAujourdhui: today.windMax,
  };
}

// Recommandation pour une culture. Les règles sont testées dans l'ordre, la première qui s'applique gagne.
export function recommend(cropKey, ind, date) {
  const crop = CROPS[cropKey];
  if (!crop) throw new Error(`Culture inconnue : ${cropKey}`);
  const S = SEUILS;
  const raisons = [];
  const chaleur = ind.tmaxAujourdhui >= S.chaleurForte;
  const traitementPossible =
    ind.ventAujourdhui < S.ventMaxTraitement &&
    ind.pluieAujourdhui < S.pluieMaxTraitement &&
    ind.pluieDemain < S.pluieMaxTraitement;

  let action;
  if (crop.mode === "pluvial" && inSowingWindow(date) && ind.pluie3jPasses >= S.pluieUtileSemis) {
    // Règle 1 : culture pluviale, période de semis, sol humidifié par une pluie utile.
    action = "semer";
    raisons.push(`${fr(ind.pluie3jPasses)} mm tombés sur 3 jours (≥ ${fr(S.pluieUtileSemis)} mm) en période de semis.`);
  } else if (ind.pluie48h >= S.pluieForte48h) {
    // Règle 2 : forte pluie prévue, on n'arrose pas et on ne traite pas.
    action = "attendre";
    raisons.push(`${fr(ind.pluie48h)} mm de pluie prévus sur 48 h (≥ ${fr(S.pluieForte48h)} mm) : pas d'arrosage ni de traitement.`);
  } else if (crop.mode === "irrigue" && ind.pluie3jPrevus < S.pluieFaible3j) {
    // Règle 3 : culture irriguée et peu de pluie prévue.
    action = "arroser";
    raisons.push(`Seulement ${fr(ind.pluie3jPrevus)} mm de pluie prévus sur 3 jours (< ${fr(S.pluieFaible3j)} mm).`);
    if (chaleur) raisons.push(`Forte chaleur (${fr(ind.tmaxAujourdhui)} °C) : arroser tôt le matin ou en fin de journée.`);
  } else if (crop.mode === "pluvial" && inSowingWindow(date)) {
    // Règle 4 : période de semis mais sol encore trop sec.
    action = "attendre";
    raisons.push(`Période de semis, mais seulement ${fr(ind.pluie3jPasses)} mm sur 3 jours : attendre une pluie utile (≥ ${fr(S.pluieUtileSemis)} mm).`);
  } else if (crop.mode === "pluvial" && !isRainySeason(date)) {
    // Règle 5 : culture pluviale hors hivernage.
    action = "attendre";
    raisons.push("Hors hivernage : pas de semis pluvial en cette saison.");
  } else if (traitementPossible) {
    // Règle 6 : conditions favorables à une pulvérisation, si un traitement est nécessaire.
    action = "traiter";
    raisons.push(`Vent faible (${fr(ind.ventAujourdhui)} km/h) et pas de pluie aujourd'hui ni demain : bonnes conditions si un traitement est nécessaire.`);
  } else {
    action = "attendre";
    raisons.push("Rien d'urgent : surveiller la culture.");
  }

  if (action !== "traiter" && !traitementPossible && ind.ventAujourdhui >= S.ventMaxTraitement) {
    raisons.push(`Vent fort (${fr(ind.ventAujourdhui)} km/h) : éviter de pulvériser aujourd'hui.`);
  }
  return { culture: cropKey, nom: crop.name, action, ...ACTIONS[action], raisons, traitementPossible };
}
