import { checkPasswordSecurity } from "../_lib/password-security.js";
import { json } from "../_lib/supabase.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const result = await checkPasswordSecurity(password);
    return json(res, 200, result);
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
