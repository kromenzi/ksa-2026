import { json } from "./_lib/supabase.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://sfdpkpqokazsegsstjfs.supabase.co").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable__ve50anGhjvRKxXi6UdrcQ_SQ945faS";

async function checkSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function checkHttp(url?: string) {
  if (!url) return { configured: false, ok: false, status: 0 };
  try {
    const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(4000) });
    return { configured: true, ok: response.ok, status: response.status };
  } catch {
    return { configured: true, ok: false, status: 0 };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const supabase = await checkSupabase();
  const gateway = await checkHttp(process.env.CAMERA_GATEWAY_HEALTH_URL);
  const esp = await checkHttp(process.env.ESP_AI_HEALTH_URL);

  const overall = supabase.ok && (!gateway.configured || gateway.ok) && (!esp.configured || esp.ok);
  return json(res, overall ? 200 : 503, {
    ok: overall,
    timestamp: new Date().toISOString(),
    services: {
      supabase: { state: supabase.ok ? "online" : "offline", status: supabase.status },
      cameraGateway: {
        state: !gateway.configured ? "not-configured" : gateway.ok ? "online" : "offline",
        status: gateway.status,
      },
      espAI: {
        state: !esp.configured ? "not-configured" : esp.ok ? "online" : "offline",
        status: esp.status,
      },
    },
  });
}
