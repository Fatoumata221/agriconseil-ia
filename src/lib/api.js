// Petits utilitaires partagés : identifiant anonyme, stockage local, appels à l'API.

// Le stockage local peut être indisponible (navigation privée…) : on ne plante jamais.
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : tant pis */
  }
}

// Identifiant anonyme de cet appareil, pour séparer les historiques (pas de compte utilisateur).
let clientId = load("clientId", null);
if (!clientId) {
  // randomUUID n'existe qu'en HTTPS ou sur localhost ; repli pour un test en réseau local.
  clientId = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  save("clientId", clientId);
}
export const CLIENT_ID = clientId;

export async function api(path, { method = "GET", body, headers = {} } = {}) {
  const isJson = body && !(body instanceof Blob);
  const res = await fetch(path, {
    method,
    headers: { "X-Client-Id": CLIENT_ID, ...(isJson ? { "Content-Type": "application/json" } : {}), ...headers },
    body: isJson ? JSON.stringify(body) : body,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return res;
}

export const apiJson = async (path, options) => (await api(path, options)).json();

// Réduit la photo avant l'envoi (le modèle travaille en 224×224 de toute façon).
export function resizeImage(file, maxSide = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, preview: canvas.toDataURL("image/jpeg", 0.8) }) : reject(new Error("Image illisible"))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = URL.createObjectURL(file);
  });
}

