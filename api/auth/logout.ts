import { clearAccessCookie, json } from "../_lib/supabase.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  clearAccessCookie(res);
  return json(res, 200, { ok: true });
}
