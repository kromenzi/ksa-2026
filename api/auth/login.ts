import { checkPasswordSecurity } from "../_lib/password-security.js";
import { json, setAccessCookie } from "../_lib/supabase.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = (process.env.SITE_URL || process.env.VERCEL_URL || "").replace(/^https?:\/\//, "");
const PUBLIC_URL = SITE_URL ? `https://${SITE_URL}` : "http://localhost:3000";

function getAccessToken(req: any) {
  const cookie = String(req?.headers?.cookie || "");
  const match = cookie.match(/(?:^|;\s*)sb_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function createProfile(userId: string, name: string) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: userId, name, role: "viewer", is_active: true }),
  });
  if (!response.ok) {
    console.error("Failed to create profile", response.status);
  }
}

async function handleSignup(req: any, res: any) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!email || !password) return json(res, 400, { error: "Email and password are required" });

  const security = await checkPasswordSecurity(password);
  if (!security.allowed) return json(res, 400, { error: security.message, code: security.reason });

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: { name: name || email.split("@")[0] },
      options: { emailRedirectTo: `${PUBLIC_URL}/admin/login` },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.user?.id) {
    const message = data?.msg || data?.message || "Signup failed";
    return json(res, response.status >= 400 && response.status < 500 ? response.status : 500, { error: message });
  }

  await createProfile(String(data.user.id), name || data.user.email?.split("@")[0] || "New User");
  if (data.access_token) setAccessCookie(res, data.access_token);
  return json(res, 200, {
    id: data.user.id,
    email: data.user.email,
    message: data.session ? "Account created and signed in" : "Account created. Check your email to confirm the account.",
  });
}

async function handleReset(req: any, res: any) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email) return json(res, 400, { error: "Email is required" });

  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo: `${PUBLIC_URL}/admin/login` }),
  });
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

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
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
      return json(res, 503, {
        allowed: false,
        compromised: null,
        reason: "security_check_unavailable",
        message: "Password security check is temporarily unavailable. Please try again.",
      });
    }
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Authentication backend is not configured" });

  try {
    if (action === "signup") return await handleSignup(req, res);
    if (action === "reset") return await handleReset(req, res);
    if (action === "change-password") return await handlePasswordUpdate(req, res);

    const { email, password } = req.body || {};
    if (!email || !password) return json(res, 400, { error: "Email and password are required" });

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
    });
    const auth = await response.json().catch(() => ({}));
    if (!response.ok || !auth.access_token || !auth.user?.id) {
      const isCredentialsError = response.status === 400 || response.status === 401;
      return json(res, isCredentialsError ? 401 : 500, { error: isCredentialsError ? "Invalid email or password" : "Login failed" });
    }

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(String(auth.user.id))}&select=id,name,role,is_active,created_at,updated_at`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${auth.access_token}`, "Content-Type": "application/json" } },
    );
    if (!profileResponse.ok) {
      console.error("Failed to load application user profile", profileResponse.status);
      return json(res, 500, { error: "Failed to load application user profile" });
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];
    if (!profile) return json(res, 403, { error: "Account is not provisioned in the application database" });
    if (!profile.is_active) return json(res, 403, { error: "Account is disabled" });

    setAccessCookie(res, auth.access_token);
    return json(res, 200, {
      id: profile.id,
      name: profile.name,
      email: auth.user.email,
      role: profile.role,
      isActive: profile.is_active,
      joinedAt: profile.created_at || auth.user.created_at,
    });
  } catch (error: any) {
    console.error("Authentication request failed", error);
    return json(res, 500, { error: "Authentication request failed" });
  }
}
