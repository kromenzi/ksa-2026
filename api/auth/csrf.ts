import { issueCsrfToken, json } from "../_lib/supabase.js";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return json(res, 200, { csrfToken: issueCsrfToken(res) });
}
