import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // La clé API reste côté serveur : le navigateur passe par /api.
    proxy: { "/api": "http://localhost:3001" },
  },
});
