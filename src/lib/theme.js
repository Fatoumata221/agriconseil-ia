// Thème clair / sombre : "auto" suit le réglage du téléphone, sinon le choix est forcé.
import { load, save } from "./api.js";

const media = window.matchMedia("(prefers-color-scheme: dark)");

export function getTheme() {
  return load("theme", "auto");
}

export function isDark(pref = getTheme()) {
  return pref === "dark" || (pref === "auto" && media.matches);
}

export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === "light" || pref === "dark") root.dataset.theme = pref;
  else delete root.dataset.theme;
  // Couleur de la barre du navigateur et de la barre d'état.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark(pref) ? "#121512" : "#fbf8f1");
}

export function setTheme(pref) {
  save("theme", pref);
  applyTheme(pref);
}

media.addEventListener?.("change", () => applyTheme(getTheme()));
