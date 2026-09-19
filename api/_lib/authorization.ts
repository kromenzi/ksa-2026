import { supabaseFetchForRequest } from "./supabase.js";

export type AppAction = "create" | "read" | "update" | "delete";

export async function hasAppPermission(
  req: any,
  profile: any,
  module: string,
  action: AppAction,
): Promise<boolean> {
  if (!profile?.is_active) return false;
  if (profile.role === "admin") return true;

  const response = await supabaseFetchForRequest(
    req,
    `/rest/v1/permissions?select=actions&role=eq.${encodeURIComponent(String(profile.role || ""))}&module=eq.${encodeURIComponent(module)}&limit=1`,
  );
  if (!response.ok) return false;
  const rows = await response.json().catch(() => []);
  const actions = Array.isArray(rows?.[0]?.actions) ? rows[0].actions : [];
  return actions.includes(action);
}

export function methodToAction(method: string): AppAction | null {
  const verb = String(method || "").toUpperCase();
  if (verb === "GET" || verb === "HEAD") return "read";
  if (verb === "POST") return "create";
  if (verb === "PATCH" || verb === "PUT") return "update";
  if (verb === "DELETE") return "delete";
  return null;
}
