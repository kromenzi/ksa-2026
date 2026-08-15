import { getAuthUser, getProfile, json } from "../_lib/supabase.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const user = await getAuthUser(req);
    if (!user?.id) return json(res, 401, { error: "Not authenticated" });

    const profile = await getProfile(req);
    if (!profile || !profile.is_active) {
      return json(res, 403, { error: "Account is disabled or has no application profile" });
    }

    return json(res, 200, {
      id: profile.id,
      name: profile.name,
      email: user.email,
      role: profile.role,
      isActive: profile.is_active,
      joinedAt: profile.joined_at || user.created_at,
    });
  } catch (error: any) {
    console.error("Authentication check failed", error);
    return json(res, error.statusCode || 500, { error: "Authentication check failed" });
  }
}
