import { json } from "../_lib/supabase.js";
import { checkPasswordSecurity } from "../_lib/password-security.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = (process.env.SITE_URL || process.env.VERCEL_URL || "").replace(/^https?:\/\//, "");
const PUBLIC_URL = SITE_URL ? `https://${SITE_URL}` : "http://localhost:3000";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Authentication backend is not configured" });

  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email) return json(res, 400, { error: "Email is required" });

    if (password) {
      const security = await checkPasswordSecurity(password);
      if (!security.allowed) return json(res, 400, { error: security.message, code: security.reason });
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        redirectTo: `${PUBLIC_URL}/admin/login`,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.msg || data?.message || "Password reset request failed";
      return json(res, response.status >= 400 && response.status < 500 ? response.status : 500, { error: message });
    }

    return json(res, 200, {
      ok: true,
      message: "Password reset email sent",
    });
  } catch (error: any) {
    console.error("Password reset failed", error);
    return json(res, 500, { error: "Password reset failed" });
  }
}
