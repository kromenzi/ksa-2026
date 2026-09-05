import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MIN_PASSWORD_LENGTH = 12;
const ALLOWED_ROLES = new Set(["admin", "manager", "editor", "viewer"]);

function cors(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

async function sha1(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` };
  }

  const digest = await sha1(password);
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  let response: Response;
  try {
    response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "UTEC-Safety-Board-Admin-Password-Security" },
    });
  } catch {
    return { ok: false, message: "Password security check is temporarily unavailable" };
  }
  if (!response.ok) return { ok: false, message: "Password security check is temporarily unavailable" };

  for (const line of (await response.text()).split(/\r?\n/)) {
    const [returnedSuffix] = line.trim().split(":");
    if (returnedSuffix?.toUpperCase() === suffix) {
      return { ok: false, message: "This password has appeared in known data breaches" };
    }
  }
  return { ok: true, message: "ok" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return cors({ ok: true });
  if (req.method !== "POST") return cors({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const callerToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!callerToken) return cors({ error: "Missing auth token" }, 401);

    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser(callerToken);
    if (callerErr || !callerData.user) return cors({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerProfile, error: profileError } = await admin
      .from("users")
      .select("role,is_active")
      .eq("auth_user_id", callerData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile?.is_active || callerProfile.role !== "admin") {
      return cors({ error: "Only active admins can manage users" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "create") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const password = body.password;
      const role = typeof body.role === "string" ? body.role : "viewer";
      if (!email || !name || !password) return cors({ error: "email, password and name are required" }, 400);
      if (!ALLOWED_ROLES.has(role)) return cors({ error: "Invalid role" }, 400);

      const passwordCheck = await validatePassword(password);
      if (!passwordCheck.ok) return cors({ error: passwordCheck.message, code: "WEAK_OR_COMPROMISED_PASSWORD" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (createErr || !created.user) return cors({ error: createErr?.message || "Failed to create auth user" }, 400);

      const { data: profile, error: profileErr } = await admin
        .from("users")
        .insert({
          id: created.user.id,
          auth_user_id: created.user.id,
          name,
          email,
          password: "managed-by-supabase-auth",
          role,
          is_active: true,
        })
        .select("id,name,email,role,is_active,joined_at,auth_user_id")
        .single();

      if (profileErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        return cors({ error: profileErr.message }, 400);
      }
      return cors({ success: true, user: profile });
    }

    if (action === "reset-password") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const newPassword = body.newPassword;
      if (!userId || !newPassword) return cors({ error: "userId and newPassword are required" }, 400);
      const passwordCheck = await validatePassword(newPassword);
      if (!passwordCheck.ok) return cors({ error: passwordCheck.message, code: "WEAK_OR_COMPROMISED_PASSWORD" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) return cors({ error: error.message }, 400);
      return cors({ success: true });
    }

    if (action === "delete") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return cors({ error: "userId is required" }, 400);
      if (userId === callerData.user.id) return cors({ error: "You cannot delete your own active admin account" }, 400);
      await admin.from("users").delete().eq("auth_user_id", userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return cors({ error: error.message }, 400);
      return cors({ success: true });
    }

    return cors({ error: `Unknown action: ${String(action)}` }, 400);
  } catch (error) {
    console.error("admin-users request failed", error);
    return cors({ error: "Unexpected error" }, 500);
  }
});
