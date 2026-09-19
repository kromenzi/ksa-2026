import { randomBytes } from "node:crypto";
import { getAuthUser, getProfile, hasValidCsrfToken, json, supabaseFetch } from "./_lib/supabase.js";

function readId(req: any) {
  const value = req?.query?.id;
  return Array.isArray(value) ? value[0] : value;
}

async function readBody(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req: any, res: any) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return json(res, 401, { error: "Unauthorized" });

    const profile = await getProfile(req, authUser);
    if (!profile?.id || profile.is_active === false) return json(res, 403, { error: "Forbidden" });

    const id = readId(req);

    if (req.method === "GET") {
      const response = await supabaseFetch(
        `/rest/v1/live_meetings?select=*&order=started_at.desc${id ? `&id=eq.${encodeURIComponent(String(id))}` : ""}`,
        { method: "GET" },
      );
      const data = await readBody(response);
      return json(res, response.status, id && Array.isArray(data) ? data[0] || null : data);
    }

    if (!hasValidCsrfToken(req)) return json(res, 403, { error: "Invalid CSRF token" });

    if (req.method === "POST" && !id) {
      const roomCode = randomBytes(6).toString("hex");
      const providerRoomName = `ABDULKAREM-SAFETY-${roomCode}`;
      const title = String(req.body?.title || "Safety Live Meeting").trim().slice(0, 120) || "Safety Live Meeting";

      const response = await supabaseFetch("/rest/v1/live_meetings?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          room_code: roomCode,
          provider_room_name: providerRoomName,
          title,
          provider: "jitsi",
          status: "live",
          created_by: profile.id,
        }),
      });

      const data = await readBody(response);
      const meeting = Array.isArray(data) ? data[0] : data;
      if (!response.ok) return json(res, response.status, meeting);

      await supabaseFetch("/rest/v1/live_meeting_participants", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          meeting_id: meeting.id,
          user_id: profile.id,
          display_name: profile.name || "Host",
          role: "host",
        }),
      });

      return json(res, 201, meeting);
    }

    if (req.method === "PATCH" && id) {
      const status = req.body?.status === "completed" ? "completed" : req.body?.status;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (status) patch.status = status;
      if (status === "completed") patch.ended_at = new Date().toISOString();

      const response = await supabaseFetch(
        `/rest/v1/live_meetings?id=eq.${encodeURIComponent(String(id))}&select=*`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(patch),
        },
      );
      const data = await readBody(response);
      return json(res, response.status, Array.isArray(data) ? data[0] || null : data);
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error?.statusCode || 500, { error: error?.message || "Unexpected error" });
  }
}
