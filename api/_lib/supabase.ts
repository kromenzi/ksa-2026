const url = (process.env.SUPABASE_URL || "https://sfdpkpqokazsegsstjfs.supabase.co").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable__ve50anGhjvRKxXi6UdqcR_QS945faS";

export function backendConfigured() {
  return Boolean(url && (serviceKey || anonKey));
}

export function requireBackend() {
  if (!backendConfigured()) {
    const error = new Error("Backend is not configured.");
    (error as any).statusCode = 503;
    throw error;
  }
}

export async function supabaseFetch(path: string, init: RequestInit = {}) {
  requireBackend();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey || anonKey);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${serviceKey || anonKey}`);
  }
  headers.set("Content-Type", "application/json");
  return fetch(`${url}${path}`, { ...init, headers });
}

export async function supabaseFetchForRequest(req: any, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getAccessToken(req);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return supabaseFetch(path, { ...init, headers });
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
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getProfile(req: any) {
  const user = await getAuthUser(req);
  if (!user?.id) return null;
  const response = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}&select=id,name,role,is_active,created_at`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${getAccessToken(req)}`, "Content-Type": "application/json" },
  });
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