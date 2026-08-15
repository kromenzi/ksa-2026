import { json } from "../_lib/supabase.js";
import { checkPasswordSecurity } from "../_lib/password-security.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Authentication backend is not configured" });

  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) return json(res, 400, { error: "Password is required" });

    const security = await checkPasswordSecurity(password);
    if (!security.allowed) return json(res, 400, { error: security.message, code: security.reason });

    const token = req?.headers?.cookie?.match(/sb_access_token=([^;]+)/)?.[1]
      ? decodeURIComponent(req.headers.cookie.match(/sb_access_token=([^;]+)/)[1])
      : "";
    if (!token) return json(res, 401, { error: "Not authenticated" });

    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_ANON_KEY,
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
  } catch (error: any) {
    console.error("Password update failed", error);
    return json(res, 500, { error: "Password update failed" });
  }
}
