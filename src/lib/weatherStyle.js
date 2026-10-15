// Petits utilitaires d'affichage de la météo, partagés par l'onglet Météo et la carte « Aujourd'hui ».
import { Cloud, CloudRain, CloudSun, Droplets, Hourglass, SprayCan, Sprout, Sun } from "lucide-react";

export const dayName = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" });
export const dayNum = (iso) => new Date(`${iso}T12:00:00`).getDate();
export const fr = (n) => String(n).replace(".", ",");

export function skyIcon(d) {
  if (d.rain >= 5) return CloudRain;
  if (d.rain >= 1) return Cloud;
  if (d.tmax >= 35) return Sun;
  return CloudSun;
}

// Dégradé de la carte du jour selon le temps : pluie, forte chaleur ou temps doux.
export function skyGradient(d) {
  if (d.rain >= 1) return "from-sky-500 via-sky-600 to-indigo-700";
  if (d.tmax >= 35) return "from-ochre-400 via-orange-500 to-rose-500";
  return "from-sky-400 via-emerald-500 to-emerald-700";
}

// Couleur et icône de chaque action recommandée par les règles.
export const ACTION_STYLE = {
  semer: { Icon: Sprout, badge: "bg-emerald-100 text-accent", tile: "from-emerald-400 to-emerald-600" },
  arroser: { Icon: Droplets, badge: "bg-sky-100 text-sky-800", tile: "from-sky-400 to-sky-600" },
  traiter: { Icon: SprayCan, badge: "bg-violet-100 text-violet-800", tile: "from-violet-400 to-violet-600" },
  attendre: { Icon: Hourglass, badge: "bg-amber-100 text-amber-800", tile: "from-ochre-400 to-ochre-600" },
};
