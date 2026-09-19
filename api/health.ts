import { backendConfigured } from "./_lib/supabase.js";
import { logger, requestId } from "./_lib/logger.js";

export default function handler(req: any, res: any) {
  const startedAt = Date.now();
  const rid = requestId(req);
  if (req.method !== "GET") {
    logger.warn("health.method_not_allowed", { requestId: rid, method: req.method });
    res.status(405).json({ error: "Method not allowed", requestId: rid });
    return;
  }
  const configured = backendConfigured();
  const payload = {
    ok: configured,
    status: configured ? "healthy" : "not-configured",
    backend: configured ? "supabase" : "not-configured",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "unknown",
    requestId: rid,
  };
  logger.info("health.check", { requestId: rid, configured, durationMs: Date.now() - startedAt });
  res.status(configured ? 200 : 503).json(payload);
}
