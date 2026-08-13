const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function backendConfigured() {
  return Boolean(url && serviceKey);
}

export function requireBackend() {
  if (!url || !serviceKey) {
    const error = new Error("Backend is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Production Environment Variables.");
    (error as any).statusCode = 503;
    throw error;
  }
}

export async function supabaseFetch(path: string, init: RequestInit = {}) {
  requireBackend();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey!);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${url}${path}`, { ...init, headers });
}

export function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").json(body);
}

export function getAccessToken(req: any) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)sb_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthUser(req: any) {
  const token = getAccessToken(req);
  if (!token) return null;
  requireBackend();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey!, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getProfile(req: any) {
  const user = await getAuthUser(req);
  if (!user?.id) return null;
  const response = await supabaseFetch(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}&select=id,name,email,role,is_active,joined_at`);
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] || null;
}

export function setAccessCookie(res: any, token: string, maxAge = 60 * 60 * 24 * 7) {
  res.setHeader("Set-Cookie", `sb_access_token=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

export function clearAccessCookie(res: any) {
  res.setHeader("Set-Cookie", "sb_access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}
