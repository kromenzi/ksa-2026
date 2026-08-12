import { backendConfigured, json } from "./_lib/supabase";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  return json(res, backendConfigured() ? 200 : 503, {
    ok: backendConfigured(),
    backend: backendConfigured() ? "supabase" : "not-configured",
    message: backendConfigured()
      ? "Production backend is configured"
      : "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel Production Environment Variables",
  });
}
