import { json, setAccessCookie } from "../_lib/supabase.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://sfdpkpqokazsegsstjfs.supabase.co").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable__ve50anGhjvRKxXi6UdrcQ_SQ945faS";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return json(res, 400, { error: "Email and password are required" });

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
    });
    const auth = await response.json();
    if (!response.ok || !auth.access_token || !auth.user?.id) {
      return json(res, 401, { error: "Invalid email or password" });
    }

    // Read the authenticated user's application profile using the user's JWT.
    // This removes the production dependency on SUPABASE_SERVICE_ROLE_KEY.
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(String(auth.user.id))}&select=id,name,role,is_active,created_at`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${auth.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!profileResponse.ok) {
      const details = await profileResponse.text().catch(() => "");
      console.error("Failed to load application profile", profileResponse.status, details);
      return json(res, 500, { error: "Failed to load application profile" });
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];
    if (!profile || !profile.is_active) {
      return json(res, 403, { error: "Account is disabled or has no application profile" });
    }

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
    return json(res, 500, { error: error.message || "Login failed" });
  }
}
