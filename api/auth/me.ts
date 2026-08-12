import { getAuthUser, getProfile, json } from "../_lib/supabase";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const [user, profile] = await Promise.all([getAuthUser(req), getProfile(req)]);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    return json(res, 200, {
      id: profile.id,
      name: profile.name,
      email: user.email,
      role: profile.role,
      isActive: profile.is_active,
      joinedAt: user.created_at,
    });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Authentication check failed" });
  }
}
