import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./ncr-preview-fix.css";
import { ErrorBoundary } from "@/components/error-boundary";

const printStyle = document.createElement("style");
printStyle.setAttribute("data-print-isolation", "true");
printStyle.textContent = `
  @media print {
    @page { size: A4; margin: 12mm; }
    html, body {
      background: #fff !important;
      color: #111827 !important;
      color-scheme: light !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body * {
      visibility: hidden !important;
      forced-color-adjust: none !important;
    }
    [role="dialog"],
    [data-radix-dialog-overlay],
    [data-radix-dialog-content] {
      display: none !important;
    }
    .incident-print-report,
    .incident-print-report * {
      visibility: visible !important;
      forced-color-adjust: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .incident-print-report {
      display: block !important;
      position: static !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
      color: #111827 !important;
      color-scheme: light !important;
    }
    iframe#print-share-iframe {
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
    }
  }
`;
document.head.appendChild(printStyle);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <App />
    </Suspense>
  </ErrorBoundary>
);
