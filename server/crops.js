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

