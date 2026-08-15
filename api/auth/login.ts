import { checkPasswordSecurity } from "../_lib/password-security.js";
import { fallbackSupabasePublishableKey, fallbackSupabaseUrl } from "../_lib/supabase-public-config.js";
import { json, setAccessCookie } from "../_lib/supabase.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || fallbackSupabaseUrl).replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || fallbackSupabasePublishableKey;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = (process.env.SITE_URL || process.env.VERCEL_URL || "").replace(/^https?:\/\//, "");
const PUBLIC_URL = SITE_URL ? `https://${SITE_URL}` : "http://localhost:3000";

function getAccessToken(req: any) {
  const cookie = String(req?.headers?.cookie || "");
  const match = cookie.match(/(?:^|;\s*)sb_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function createProfile(userId: string, email: string, name: string) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: userId, auth_user_id: userId, email, name, role: "viewer", is_active: true }),
  });
  if (!response.ok) console.error("Failed to create profile", response.status);
}

async function loadApplicationProfile(userId: string, email: string) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return { profile: null, configured: false, status: 503 };

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  const byAuthId = await fetch(
    `${SUPABASE_URL}/rest/v1/users?auth_user_id=eq.${encodeURIComponent(userId)}&select=id,name,role,is_active,joined_at&limit=1`,
    { headers },
  );
  if (!byAuthId.ok) {
    const body = await byAuthId.text().catch(() => "");
    console.error("Application profile lookup by auth_user_id failed", byAuthId.status, body.slice(0, 300));
    return { profile: null, configured: true, status: byAuthId.status };
  }

  const authRows = await byAuthId.json().catch(() => []);
  if (authRows[0]) return { profile: authRows[0], configured: true, status: 200 };

  const byEmail = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,name,role,is_active,joined_at,auth_user_id&limit=1`,
    { headers },
  );
  if (!byEmail.ok) {
    const body = await byEmail.text().catch(() => "");
    console.error("Application profile lookup by email failed", byEmail.status, body.slice(0, 300));
    return { profile: null, configured: true, status: byEmail.status };
  }

  const emailRows = await byEmail.json().catch(() => []);
  if (emailRows[0]) {
    const profile = emailRows[0];
    if (profile.auth_user_id !== userId) {
      const repair = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(String(profile.id))}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ auth_user_id: userId }),
      });
      if (!repair.ok) console.error("Failed to repair auth_user_id link", repair.status);
      else profile.auth_user_id = userId;
    }
    return { profile, configured: true, status: 200 };
  }

  return { profile: null, configured: true, status: 404 };
}

async function handleSignup(req: any, res: any) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!email || !password) return json(res, 400, { error: "Email and password are required" });
  if (!SUPABASE_SERVICE_ROLE_KEY) return json(res, 503, { error: "Signup is unavailable until the server credential is configured" });
  const security = await checkPasswordSecurity(password);
  if (!security.allowed) return json(res, 400, { error: security.message, code: security.reason });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { name: name || email.split("@")[0] }, options: { emailRedirectTo: `${PUBLIC_URL}/admin/login` } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.user?.id) {
    const message = data?.msg || data?.message || "Signup failed";
    return json(res, response.status >= 400 && response.status < 500 ? response.status : 500, { error: message });
  }
  await createProfile(String(data.user.id), email, name || data.user.email?.split("@")[0] || "New User");
  if (data.access_token) setAccessCookie(res, data.access_token);
  return json(res, 200, { id: data.user.id, email: data.user.email, message: data.session ? "Account created and signed in" : "Account created. Check your email to confirm the account." });
}

async function handleReset(req: any, res: any) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email) return json(res, 400, { error: "Email is required" });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, redirectTo: `${PUBLIC_URL}/admin/login` }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.msg || data?.message || "Password reset request failed";
    return json(res, response.status >= 400 && response.status < 500 ? response.status : 500, { error: message });
  }
  return json(res, 200, { ok: true, message: "Password reset email sent" });
}

async function handlePasswordUpdate(req: any, res: any) {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password) return json(res, 400, { error: "Password is required" });
  const security = await checkPasswordSecurity(password);
  if (!security.allowed) return json(res, 400, { error: security.message, code: security.reason });
  const token = getAccessToken(req);
  if (!token) return json(res, 401, { error: "Not authenticated" });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.msg || data?.message || "Password update failed";
    return json(res, response.status >= 400 && response.status < 500 ? response.status : 500, { error: message });
  }
  return json(res, 200, { ok: true, message: "Password updated" });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const action = String(req.query?.action || "");
  if (action === "password-check") {
    try {
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      return json(res, 200, await checkPasswordSecurity(password));
    } catch (error) {
      console.error("Password security check failed", error);
      return json(res, 503, { allowed: false, compromised: null, reason: "security_check_unavailable", message: "Password security check is temporarily unavailable. Please try again." });
    }
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Authentication backend is not configured" });
  try {
    if (action === "signup") return await handleSignup(req, res);
    if (action === "reset") return await handleReset(req, res);
    if (action === "change-password") return await handlePasswordUpdate(req, res);
    const { email, password } = req.body || {};
    if (!email || !password) return json(res, 400, { error: "Email and password are required" });
    if (!SUPABASE_SERVICE_ROLE_KEY) return json(res, 503, { error: "Authentication backend is not fully configured" });

    const normalizedEmail = String(email).trim().toLowerCase();
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail, password }) });
    const auth = await response.json().catch(() => ({}));
    if (!response.ok || !auth.access_token || !auth.user?.id) {
      const isCredentialsError = response.status === 400 || response.status === 401;
      return json(res, isCredentialsError ? 401 : 500, { error: isCredentialsError ? "Invalid email or password" : "Login failed" });
    }

    const profileResult = await loadApplicationProfile(String(auth.user.id), normalizedEmail);
    if (!profileResult.configured) return json(res, 503, { error: "Application database service credential is not configured" });
    if (profileResult.status === 403) return json(res, 500, { error: "Application profile access is forbidden. Verify the Vercel SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY point to the active Supabase project." });
    if (!profileResult.profile) return json(res, 403, { error: "Account exists in Supabase Auth but no matching application profile was found", code: "PROFILE_NOT_FOUND" });
    if (!profileResult.profile.is_active) return json(res, 403, { error: "Account is disabled" });

    setAccessCookie(res, auth.access_token);
    return json(res, 200, { id: profileResult.profile.id, name: profileResult.profile.name, email: auth.user.email, role: profileResult.profile.role, isActive: profileResult.profile.is_active, joinedAt: profileResult.profile.joined_at || auth.user.created_at });
  } catch (error) {
    console.error("Authentication request failed", error);
    return json(res, 500, { error: "Authentication request failed" });
  }
}
