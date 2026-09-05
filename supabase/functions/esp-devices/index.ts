import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-esp-token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEGACY_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const PUBLISHABLE_KEYS = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "";
const ESP_SHARED_TOKEN = Deno.env.get("ESP_SHARED_TOKEN") || "";
const OFFLINE_AFTER_SECONDS = 90;

function getPublishableKey() {
  if (LEGACY_ANON_KEY) return LEGACY_ANON_KEY;
  if (!PUBLISHABLE_KEYS) return "";
  try {
    const parsed = JSON.parse(PUBLISHABLE_KEYS);
    return typeof parsed?.default === "string" ? parsed.default : "";
  } catch {
    return "";
  }
}

const publishableKey = getPublishableKey();
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function requireOperator(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || !publishableKey) return null;

  const userClient = createClient(SUPABASE_URL, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user?.id) return null;

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role,is_active")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError || !profile?.is_active || !["admin", "manager"].includes(String(profile.role))) {
    return null;
  }
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      const operator = await requireOperator(req);
      if (!operator) return json({ error: "Admin or manager authentication required" }, 401);

      const cutoff = new Date(Date.now() - OFFLINE_AFTER_SECONDS * 1000).toISOString();
      await admin
        .from("vision_devices")
        .update({ status: "OFFLINE", updated_at: new Date().toISOString() })
        .lt("last_seen_at", cutoff)
        .neq("status", "OFFLINE");

      const { data, error } = await admin
        .from("vision_devices")
        .select("id,device_id,name,device_type,ip_address,mac_address,firmware,plant,area,rssi,status,last_seen_at,metadata,created_at,updated_at")
        .order("last_seen_at", { ascending: false, nullsFirst: false });

      if (error) return json({ error: "Unable to load devices" }, 500);
      return json({ devices: data || [], staleAfterSeconds: OFFLINE_AFTER_SECONDS });
    }

    if (req.method === "POST") {
      if (!ESP_SHARED_TOKEN) return json({ error: "ESP device authentication is not configured" }, 503);
      const token = req.headers.get("x-esp-token") || "";
      if (!token || token !== ESP_SHARED_TOKEN) return json({ error: "Invalid ESP token" }, 401);

      const body = await req.json().catch(() => null);
      if (!body?.device_id || !body?.name) {
        return json({ error: "device_id and name are required" }, 400);
      }

      const now = new Date().toISOString();
      const row = {
        device_id: String(body.device_id).slice(0, 128),
        name: String(body.name).slice(0, 160),
        device_type: String(body.device_type || "ESP32 Node").slice(0, 80),
        ip_address: body.ip_address ? String(body.ip_address).slice(0, 64) : null,
        mac_address: body.mac_address ? String(body.mac_address).slice(0, 64) : null,
        firmware: body.firmware ? String(body.firmware).slice(0, 80) : null,
        plant: body.plant ? String(body.plant).slice(0, 120) : null,
        area: body.area ? String(body.area).slice(0, 120) : null,
        rssi: typeof body.rssi === "number" && Number.isFinite(body.rssi) ? body.rssi : null,
        status: "ONLINE",
        last_seen_at: now,
        updated_at: now,
        metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
      };

      const { data, error } = await admin
        .from("vision_devices")
        .upsert(row, { onConflict: "device_id" })
        .select("id,device_id,name,device_type,ip_address,mac_address,firmware,plant,area,rssi,status,last_seen_at,metadata,created_at,updated_at")
        .single();

      if (error) return json({ error: "Unable to update device" }, 500);
      return json({ ok: true, device: data });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("esp-devices request failed", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
