import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  define: {
    'import.meta.env.VITE_LOCAL_AI_URL': JSON.stringify(process.env.VITE_LOCAL_AI_URL || 'http://localhost:8787'),
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
          "ui-vendor": ["framer-motion", "lucide-react", "sonner", "next-themes"],
          "data-vendor": ["@tanstack/react-query", "zod", "date-fns", "recharts"],
          "documents-vendor": ["jspdf", "jspdf-autotable", "jszip"],
          "ocr-vendor": ["tesseract.js"],
        },
      },
    },
  },
});
