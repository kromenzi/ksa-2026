import { json, requireBackend, setAccessCookie, supabaseFetch } from "../_lib/supabase";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    requireBackend();
    const { email, password } = req.body || {};
    if (!email || !password) return json(res, 400, { error: "Email and password are required" });

    const response = await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
    });
    const auth = await response.json();
    if (!response.ok || !auth.access_token) {
      return json(res, 401, { error: "Invalid email or password" });
    }

    // The production schema stores application profiles in public.profiles.
    // The Auth user UUID must have a matching active profile.
    const userId = String(auth.user.id);
    const profileResponse = await supabaseFetch(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,name,role,is_active,created_at`
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
    return json(res, error.statusCode || 500, { error: error.message || "Login failed" });
  }
}
