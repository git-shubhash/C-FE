import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true, // Allow network access (more compatible than 0.0.0.0)
    port: 8080,
    https: {
      key: fs.readFileSync('./certs/localhost-key.pem'),
      cert: fs.readFileSync('./certs/localhost.pem'),
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
