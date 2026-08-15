import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";
const writableRoles = new Set(["admin", "manager", "editor"]);
function toClient(row: any) { return { id: row.id, name: row.name, code: row.code }; }
function makeCode(name: string) { const base = name.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12).toUpperCase(); return base || "DEPT"; }
export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req); const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    if (req.method === "GET") { const r = await supabaseFetchForRequest(req, "/rest/v1/departments?select=id,name,code&order=name.asc"); const rows = await r.json(); if (!r.ok) return json(res,r.status,{error:rows?.message||"Unable to load departments"}); return json(res,200,rows.map(toClient)); }
    if (!writableRoles.has(profile.role)) return json(res,403,{error:"Insufficient permission"});
    if (req.method === "POST") {
      const name=String(req.body?.name||"").trim(); const supplied=String(req.body?.code||"").trim();
      if (!name) return json(res,422,{error:"Department name is required"});
      let code=supplied||makeCode(name);
      let r=await supabaseFetchForRequest(req,"/rest/v1/departments",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name,code})});
      let rows=await r.json();
      if (!r.ok && !supplied) { code=`${code}-${Date.now().toString(36).slice(-4).toUpperCase()}`; r=await supabaseFetchForRequest(req,"/rest/v1/departments",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name,code})}); rows=await r.json(); }
      if (!r.ok) return json(res,r.status,{error:rows?.message||"Unable to create department"});
      return json(res,201,toClient(rows[0]));
    }
    return json(res,405,{error:"Method not allowed"});
  } catch(error:any) { return json(res,error.statusCode||500,{error:error.message||"Departments API failed"}); }
}
