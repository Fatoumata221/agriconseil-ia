// Cultures proposées dans le profil.
// - mode "pluvial" : semée à l'hivernage, sans irrigation ; "irrigue" : maraîchage ou riz irrigué.
// - modelPlant : nom de la plante dans le modèle photo (null = culture non couverte par PlantVillage).
export const CROPS = {
  arachide: { name: "Arachide", mode: "pluvial", modelPlant: null },
  mil: { name: "Mil", mode: "pluvial", modelPlant: null },
  sorgho: { name: "Sorgho", mode: "pluvial", modelPlant: null },
  mais: { name: "Maïs", mode: "pluvial", modelPlant: "Maïs" },
  niebe: { name: "Niébé", mode: "pluvial", modelPlant: null },
  riz: { name: "Riz (irrigué)", mode: "irrigue", modelPlant: null },
  oignon: { name: "Oignon", mode: "irrigue", modelPlant: null },
  tomate: { name: "Tomate", mode: "irrigue", modelPlant: "Tomate" },
  pomme_de_terre: { name: "Pomme de terre", mode: "irrigue", modelPlant: "Pomme de terre" },
  poivron: { name: "Poivron", mode: "irrigue", modelPlant: "Poivron" },
};

// Localités proposées quand le GPS n'est pas disponible (chefs-lieux de région).
export const CITIES = {
  dakar: { name: "Dakar", lat: 14.6928, lon: -17.4467 },
  thies: { name: "Thiès", lat: 14.791, lon: -16.9359 },
  diourbel: { name: "Diourbel", lat: 14.6556, lon: -16.2314 },
  fatick: { name: "Fatick", lat: 14.3393, lon: -16.4111 },
  kaolack: { name: "Kaolack", lat: 14.1652, lon: -16.0726 },
  kaffrine: { name: "Kaffrine", lat: 14.1059, lon: -15.5508 },
  louga: { name: "Louga", lat: 15.6187, lon: -16.2244 },
  saint_louis: { name: "Saint-Louis", lat: 16.0179, lon: -16.4896 },
  matam: { name: "Matam", lat: 15.6559, lon: -13.2554 },
  tambacounda: { name: "Tambacounda", lat: 13.7707, lon: -13.6673 },
  kedougou: { name: "Kédougou", lat: 12.5605, lon: -12.1747 },
  kolda: { name: "Kolda", lat: 12.8939, lon: -14.9406 },
  sedhiou: { name: "Sédhiou", lat: 12.7081, lon: -15.5569 },
  ziguinchor: { name: "Ziguinchor", lat: 12.5681, lon: -16.2733 },
};
