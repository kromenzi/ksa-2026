import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOCAL_AI_URL = Deno.env.get("LOCAL_AI_URL") ?? "http://host.docker.internal:8787";

function isPrivateOrLocal(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "host.docker.internal" || host.endsWith(".local");
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (!isPrivateOrLocal(LOCAL_AI_URL)) {
    return Response.json({ ok: false, error: "LOCAL_AI_URL must point to a private/local runtime" }, { status: 500 });
  }
  if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405 });
  const payload = await req.json();
  const response = await fetch(`${LOCAL_AI_URL}/v1/safety/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
});
