import { json, setAccessCookie } from "../_lib/supabase.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Authentication backend is not configured" });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return json(res, 400, { error: "Email and password are required" });

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
    });
    const auth = await response.json().catch(() => ({}));
    if (!response.ok || !auth.access_token || !auth.user?.id) {
      const errorMessage = response.status === 400 || response.status === 401 ? "Invalid email or password" : "Login failed";
      return json(res, response.status === 400 || response.status === 401 ? 401 : 500, { error: errorMessage });
    }

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(String(auth.user.id))}&select=id,name,role,is_active,created_at,updated_at`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${auth.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!profileResponse.ok) {
      const details = await profileResponse.text().catch(() => "");
      console.error("Failed to load application user profile", profileResponse.status, details);
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
    console.error("Login failed", error);
    return json(res, 500, { error: "Login failed" });
  }
}
