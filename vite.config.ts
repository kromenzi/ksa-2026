import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "wouter"],
          "ui-vendor": [
            "framer-motion",
            "lucide-react",
            "sonner",
            "next-themes",
          ],
          "data-vendor": ["@tanstack/react-query", "zod", "date-fns", "recharts"],
          "documents-vendor": ["jspdf", "jspdf-autotable", "jszip"],
          "ocr-vendor": ["tesseract.js"],
        },
      },
    },
  },
});
