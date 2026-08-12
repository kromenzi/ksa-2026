# Vercel deployment notes

This patch fixes the Vite/Vercel SPA configuration and the DOM cleanup issues that can
produce `Failed to execute 'removeChild' on 'Node'`.

Important architecture note:
- This repository is a frontend-only application.
- The UI still contains optional `/api/*` calls for features intended for a future backend.
- Query reads already fail soft to empty arrays, but write operations that call `/api/*`
  will require a real backend if those features are used.
- Demo authentication is local and now survives a page refresh on Vercel.

Recommended Vercel settings:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install` (or leave automatic)
