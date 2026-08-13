export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.status(configured ? 200 : 503).json({
    ok: configured,
    backend: configured ? "supabase" : "not-configured",
    message: configured
      ? "Production backend is configured"
      : "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel Production Environment Variables",
  });
}
