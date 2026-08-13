import { backendConfigured } from "./_lib/supabase.js";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const configured = backendConfigured();
  res.status(configured ? 200 : 503).json({
    ok: configured,
    status: configured ? "healthy" : "not-configured",
    backend: configured ? "supabase" : "not-configured",
  });
}