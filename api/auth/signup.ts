import { json } from "../_lib/supabase.js";
import { checkPasswordSecurity } from "../_lib/password-security.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = (process.env.SITE_URL || process.env.VERCEL_URL || "").replace(/^https?:\/\//, "");
const PUBLIC_URL = SITE_URL ? `https://${SITE_URL}` : "http://localhost:3000";

async function createProfile(userId: string, name: string, email: string) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: userId, name, role: "viewer", is_active: true }),
  }).catch((error) => {
    console.error("Failed to create profile", error);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Authentication backend is not configured" });

  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!email || !password) return json(res, 400, { error: "Email and password are required" });

    const security = await checkPasswordSecurity(password);
    if (!security.allowed) return json(res, 400, { error: security.message, code: security.reason });

    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        data: { name: name || email.split("@")[0] },
        options: {
          emailRedirectTo: `${PUBLIC_URL}/admin/login`,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.user?.id) {
      const message = data?.msg || data?.message || "Signup failed";
      return json(res, response.status >= 400 && response.status < 500 ? response.status : 500, { error: message });
    }

    await createProfile(String(data.user.id), name || data.user.email?.split("@")[0] || "New User", email);

    return json(res, 200, {
      id: data.user.id,
      email: data.user.email,
      message: data.session ? "Account created and signed in" : "Account created. Check your email to confirm the account.",
    });
  } catch (error: any) {
    console.error("Signup failed", error);
    return json(res, 500, { error: "Signup failed" });
  }
}
