import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Fail loudly rather than drifting to 5174+. Only :5173 is in the API's
    // CORS allowlist, so a silent port change breaks every request with a
    // confusing CORS error instead of "port in use".
    strictPort: true,
  },
});
