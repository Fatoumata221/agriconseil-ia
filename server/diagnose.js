// Diagnostic photo : modèle MobileNetV2 entraîné sur PlantVillage, exécuté en local
// (ONNX via @huggingface/transformers). Gratuit, sans jeton, sans envoi de la photo à un tiers.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, pipeline, RawImage } from "@huggingface/transformers";

export const MODEL_ID = "onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX";
// En dessous de ce score, on ne donne pas de diagnostic ferme.
export const CONFIDENCE_THRESHOLD = 0.7;

env.cacheDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "models-cache");

// Libellés du modèle (anglais) → plante et état en français.
const LABELS_FR = {
  "Apple Scab": ["Pommier", "Tavelure"],
  "Apple with Black Rot": ["Pommier", "Pourriture noire"],
  "Cedar Apple Rust": ["Pommier", "Rouille grillagée"],
  "Healthy Apple": ["Pommier", "Sain"],
  "Healthy Blueberry Plant": ["Myrtillier", "Sain"],
  "Cherry with Powdery Mildew": ["Cerisier", "Oïdium"],
  "Healthy Cherry Plant": ["Cerisier", "Sain"],
  "Corn (Maize) with Cercospora and Gray Leaf Spot": ["Maïs", "Cercosporiose (taches grises)"],
  "Corn (Maize) with Common Rust": ["Maïs", "Rouille commune"],
  "Corn (Maize) with Northern Leaf Blight": ["Maïs", "Helminthosporiose (brûlure du nord)"],
  "Healthy Corn (Maize) Plant": ["Maïs", "Sain"],
  "Grape with Black Rot": ["Vigne", "Black-rot"],
  "Grape with Esca (Black Measles)": ["Vigne", "Esca"],
  "Grape with Isariopsis Leaf Spot": ["Vigne", "Taches foliaires (Isariopsis)"],
  "Healthy Grape Plant": ["Vigne", "Sain"],
  "Orange with Citrus Greening": ["Agrumes", "Greening (HLB)"],
  "Peach with Bacterial Spot": ["Pêcher", "Tache bactérienne"],
  "Healthy Peach Plant": ["Pêcher", "Sain"],
  "Bell Pepper with Bacterial Spot": ["Poivron", "Tache bactérienne"],
  "Healthy Bell Pepper Plant": ["Poivron", "Sain"],
  "Potato with Early Blight": ["Pomme de terre", "Alternariose"],
  "Potato with Late Blight": ["Pomme de terre", "Mildiou"],
  "Healthy Potato Plant": ["Pomme de terre", "Sain"],
  "Healthy Raspberry Plant": ["Framboisier", "Sain"],
  "Healthy Soybean Plant": ["Soja", "Sain"],
  "Squash with Powdery Mildew": ["Courge", "Oïdium"],
  "Strawberry with Leaf Scorch": ["Fraisier", "Brûlure des feuilles"],
  "Healthy Strawberry Plant": ["Fraisier", "Sain"],
  "Tomato with Bacterial Spot": ["Tomate", "Tache bactérienne"],
  "Tomato with Early Blight": ["Tomate", "Alternariose"],
  "Tomato with Late Blight": ["Tomate", "Mildiou"],
  "Tomato with Leaf Mold": ["Tomate", "Cladosporiose"],
  "Tomato with Septoria Leaf Spot": ["Tomate", "Septoriose"],
  "Tomato with Spider Mites or Two-spotted Spider Mite": ["Tomate", "Acariens (tétranyque)"],
  "Tomato with Target Spot": ["Tomate", "Corynesporiose (tache cible)"],
  "Tomato Yellow Leaf Curl Virus": ["Tomate", "Virus de l'enroulement jaune (TYLCV)"],
  "Tomato Mosaic Virus": ["Tomate", "Virus de la mosaïque"],
  "Healthy Tomato Plant": ["Tomate", "Sain"],
};

export function translateLabel(label) {
  const [plant, condition] = LABELS_FR[label] || [label, ""];
  return { plant, condition, label };
}

let classifierPromise;
function getClassifier() {
  // Chargé une seule fois ; le premier appel télécharge le modèle (~3 Mo) dans models-cache/.
  classifierPromise ??= pipeline("image-classification", MODEL_ID, { dtype: "fp32" }).catch((err) => {
    classifierPromise = undefined;
    throw err;
  });
  return classifierPromise;
}

// Renvoie les 3 classes les plus probables et un verdict selon le seuil de confiance.
export async function diagnoseImage(buffer, mediaType) {
  const classifier = await getClassifier();
  const image = await RawImage.fromBlob(new Blob([buffer], { type: mediaType }));
  const raw = await classifier(image, { top_k: 3 });
  const top = raw.map(({ label, score }) => ({ ...translateLabel(label), score }));
  return { top, confident: top[0].score >= CONFIDENCE_THRESHOLD, threshold: CONFIDENCE_THRESHOLD };
}
