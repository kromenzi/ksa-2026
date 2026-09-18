import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function clean(value: unknown, max = 4000) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

async function cryptoMaterial() {
  const { data, error } = await admin.rpc("safety_reporting_crypto_material");
  if (error || !data || typeof data !== "object") throw new Error("Crypto material unavailable");
  const encryption = String(data.safety_reporting_encryption_key_v1 || "");
  const lookup = String(data.safety_reporting_lookup_key_v1 || "");
  const tracking = String(data.safety_reporting_tracking_key_v1 || "");
  if (!encryption || !lookup || !tracking) throw new Error("Crypto material incomplete");
  return { encryption, lookup, tracking };
}

async function hmac(value: string, keyB64: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(keyB64),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value.trim().toLowerCase()));
  return bytesToBase64(new Uint8Array(signature));
}

function constantTimeEqualBase64(a: string, b: string) {
  try {
    const left = base64ToBytes(a);
    const right = base64ToBytes(b);
    if (left.length !== right.length) return false;
    let diff = 0;
    for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
    return diff === 0;
  } catch {
    return false;
  }
}

async function encryptIdentity(payload: Record<string, string>, keyB64: string) {
  const raw = base64ToBytes(keyB64);
  if (raw.byteLength !== 32) throw new Error("Invalid encryption key");
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, encoder.encode(JSON.stringify(payload))));
  const tag = sealed.slice(sealed.length - 16);
  const ciphertext = sealed.slice(0, sealed.length - 16);
  return { encryptedPayload: bytesToBase64(ciphertext), iv: bytesToBase64(iv), authTag: bytesToBase64(tag) };
}

async function decryptIdentity(ciphertextB64: string, ivB64: string, tagB64: string, keyB64: string) {
  const raw = base64ToBytes(keyB64);
  if (raw.byteLength !== 32) throw new Error("Invalid encryption key");
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
  const ciphertext = base64ToBytes(ciphertextB64);
  const tag = base64ToBytes(tagB64);
  const sealed = new Uint8Array(ciphertext.length + tag.length);
  sealed.set(ciphertext);
  sealed.set(tag, ciphertext.length);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivB64), tagLength: 128 }, key, sealed);
  return JSON.parse(decoder.decode(plain));
}

function createTrackingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}

function clientIp(req: Request) {
  const proxied = (req.headers.get("x-reporting-client-ip") || "").split(",")[0]?.trim();
  const forwarded = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim();
  return proxied || forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

async function rateLimit(req: Request, action: string, limit: number, windowSeconds: number, lookupKey: string) {
  const keyHash = await hmac(`ip:${clientIp(req)}`, lookupKey);
  const { data, error } = await admin.rpc("consume_safety_reporting_rate_limit", {
    p_key_hash: keyHash,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate limit unavailable");
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: Boolean(row?.allowed), resetAt: row?.reset_at || null };
}

async function requireAdminOrManager(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.id) return null;
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role,is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (profileError || !profile?.is_active || !["admin", "manager"].includes(String(profile.role))) return null;
  return { user: userData.user, profile };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = clean(url.searchParams.get("action") || "channels", 40).toLowerCase();

  try {
    if (action === "channels" && req.method === "GET") {
      const { data, error } = await admin
        .from("safety_reporting_channels")
        .select("channel,is_enabled,public_label_ar,public_label_en,destination")
        .eq("is_enabled", true)
        .order("channel");
      if (error) throw error;
      return json({ channels: data || [] });
    }

    if (action === "reveal") {
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const caller = await requireAdminOrManager(req);
      if (!caller) return json({ error: "Admin or manager authentication required" }, 403);
      const body = await req.json().catch(() => ({}));
      const caseId = clean(body.caseId, 80);
      const reason = clean(body.reason, 500);
      if (!caseId || reason.length < 8) return json({ error: "Case and reveal reason are required" }, 422);

      const { data: identity, error: identityError } = await admin
        .from("safety_reporting_identity")
        .select("encrypted_payload,iv,auth_tag,key_version")
        .eq("case_id", caseId)
        .maybeSingle();
      if (identityError) throw identityError;
      if (!identity) return json({ identity: null, message: "No stored reporter identity" });

      const keys = await cryptoMaterial();
      const value = await decryptIdentity(identity.encrypted_payload, identity.iv, identity.auth_tag, keys.encryption);
      const { error: auditError } = await admin.from("safety_reporting_identity_audit").insert({
        case_id: caseId,
        actor_auth_user_id: caller.user.id,
        actor_role: caller.profile.role,
        reason,
      });
      if (auditError) throw auditError;
      return json({ identity: value, keyVersion: identity.key_version });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!["intake", "status", "message"].includes(action)) return json({ error: "Unsupported reporting action" }, 404);

    const body = await req.json().catch(() => ({}));
    if (clean(body.website, 200)) return json({ error: "Invalid submission" }, 400);

    const keys = await cryptoMaterial();
    const limits: Record<string, [number, number]> = {
      intake: [8, 3600],
      status: [30, 3600],
      message: [20, 3600],
    };
    const [limit, windowSeconds] = limits[action];
    const rate = await rateLimit(req, action, limit, windowSeconds, keys.lookup);
    if (!rate.allowed) return json({ error: "Too many requests", resetAt: rate.resetAt }, 429);

    if (action === "intake") {
      const mode = ["anonymous", "confidential", "identified"].includes(body.identityMode) ? body.identityMode : "anonymous";
      const description = clean(body.description, 6000);
      if (description.length < 10) return json({ error: "A clear report description is required" }, 422);

      const reporter = {
        name: clean(body.reporter?.name, 160),
        email: clean(body.reporter?.email, 254),
        phone: clean(body.reporter?.phone, 60),
        employeeId: clean(body.reporter?.employeeId, 100),
      };
      if (mode === "confidential" && !reporter.email && !reporter.phone) {
        return json({ error: "Confidential reports require email or phone for follow-up" }, 422);
      }
      if (mode === "identified" && (!reporter.name || (!reporter.email && !reporter.phone))) {
        return json({ error: "Identified reports require a name and contact method" }, 422);
      }

      const category = clean(body.category, 80) || "other";
      const immediate = Boolean(body.immediateLifeThreat);
      const severity = immediate ? "Critical" : ["Low", "Medium", "High", "Critical"].includes(body.severity) ? body.severity : "Medium";
      const trackingCode = createTrackingCode();
      const tokenHmac = await hmac(trackingCode, keys.tracking);
      const now = new Date().toISOString();

      const { data: caseRow, error: caseError } = await admin
        .from("safety_reporting_cases")
        .insert({
          title: clean(body.title, 180) || `${category.replaceAll("_", " ")} report`,
          status: immediate ? "Triage" : "New",
          department: clean(body.department, 200) || null,
          date: now.slice(0, 10),
          created_by: "Public Safety Reporting Portal",
          data: {
            category,
            description,
            location: clean(body.location, 300),
            severity,
            immediateLifeThreat: immediate,
            identityMode: mode,
            sourceChannel: "WEB",
            linkedModule: null,
            linkedRecordId: null,
          },
        })
        .select("id,ref_no,status,created_at")
        .single();
      if (caseError || !caseRow) throw caseError || new Error("Unable to create report");

      try {
        const { error: trackingError } = await admin.from("safety_reporting_tracking").insert({
          case_id: caseRow.id,
          token_hmac: tokenHmac,
        });
        if (trackingError) throw trackingError;

        if (mode !== "anonymous") {
          const encrypted = await encryptIdentity(reporter, keys.encryption);
          const { error: identityError } = await admin.from("safety_reporting_identity").insert({
            case_id: caseRow.id,
            encrypted_payload: encrypted.encryptedPayload,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            key_version: "v1",
            email_hmac: reporter.email ? await hmac(reporter.email, keys.lookup) : null,
            phone_hmac: reporter.phone ? await hmac(reporter.phone, keys.lookup) : null,
          });
          if (identityError) throw identityError;
        }
      } catch (error) {
        await admin.from("safety_reporting_cases").delete().eq("id", caseRow.id);
        throw error;
      }

      return json({
        ok: true,
        refNo: caseRow.ref_no,
        trackingCode,
        status: caseRow.status,
        createdAt: caseRow.created_at,
        privacyMode: mode,
      }, 201);
    }

    const refNo = clean(body.refNo, 40).toUpperCase();
    const trackingCode = clean(body.trackingCode, 80).toUpperCase();
    if (!refNo || !trackingCode) return json({ error: "Report reference and tracking code are required" }, 422);

    const { data: caseRow, error: caseError } = await admin
      .from("safety_reporting_cases")
      .select("id,ref_no,title,status,date,data,created_at,updated_at")
      .eq("ref_no", refNo)
      .maybeSingle();
    if (caseError) throw caseError;
    if (!caseRow) return json({ error: "Report not found" }, 404);

    const { data: trackingRow, error: trackingError } = await admin
      .from("safety_reporting_tracking")
      .select("token_hmac")
      .eq("case_id", caseRow.id)
      .maybeSingle();
    if (trackingError) throw trackingError;
    const submitted = await hmac(trackingCode, keys.tracking);
    if (!trackingRow?.token_hmac || !constantTimeEqualBase64(String(trackingRow.token_hmac), submitted)) {
      return json({ error: "Report not found" }, 404);
    }

    if (action === "status") {
      const { data: messages, error: messagesError } = await admin
        .from("safety_reporting_messages")
        .select("id,sender_type,message,created_at")
        .eq("case_id", caseRow.id)
        .order("created_at");
      if (messagesError) throw messagesError;
      return json({
        report: {
          refNo: caseRow.ref_no,
          title: caseRow.title,
          status: caseRow.status,
          date: caseRow.date,
          category: caseRow.data?.category,
          severity: caseRow.data?.severity,
          immediateLifeThreat: Boolean(caseRow.data?.immediateLifeThreat),
          createdAt: caseRow.created_at,
          updatedAt: caseRow.updated_at,
        },
        messages: (messages || []).map(item => ({
          id: item.id,
          senderType: item.sender_type,
          message: item.message,
          createdAt: item.created_at,
        })),
      });
    }

    const message = clean(body.message, 4000);
    if (!message) return json({ error: "Message is required" }, 422);
    const { error: messageError } = await admin.from("safety_reporting_messages").insert({
      case_id: caseRow.id,
      sender_type: "reporter",
      message,
      created_by: "Reporter",
    });
    if (messageError) throw messageError;
    return json({ ok: true }, 201);
  } catch (error) {
    console.error("safety-reporting request failed", error);
    return json({ error: "Safety reporting service failed" }, 500);
  }
});
