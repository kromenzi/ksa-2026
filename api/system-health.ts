import { getAuthUser, getProfile, json, supabaseFetch, supabaseFetchForRequest } from "./_lib/supabase.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://sfdpkpqokazsegsstjfs.supabase.co").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable__ve50anGhjvRKxXi6UdrcQ_SQ945faS";

const RESOURCE_MAP: Record<string, { table: string; module: string; single?: boolean; adminOnly?: boolean }> = {
  users:{table:"users",module:"users",adminOnly:true}, posts:{table:"posts",module:"content"}, sections:{table:"sections",module:"content"}, forms:{table:"form_templates",module:"content"}, reports:{table:"reports",module:"reports"},
  "activity-logs":{table:"activity_logs",module:"activity"}, employees:{table:"employees",module:"users"}, "routing-rules":{table:"routing_rules",module:"settings"}, permissions:{table:"permissions",module:"settings",adminOnly:true}, documents:{table:"documents",module:"documents"},
  "section-config":{table:"section_config",module:"settings"}, "email-settings":{table:"email_config",module:"settings",single:true,adminOnly:true}, "report-settings":{table:"report_settings",module:"settings",single:true,adminOnly:true}, "site-settings":{table:"site_settings",module:"settings",single:true,adminOnly:true},
  "environmental-measurements":{table:"environmental_measurements",module:"settings"},
  "employee-violations":{table:"employee_violations",module:"reports"},
  assets:{table:"assets",module:"assets"}, visitors:{table:"visitors",module:"assets"}, emergency:{table:"emergency",module:"assets"},
  "fire-equipment":{table:"fire_equipment",module:"assets"}, "fire-inspections":{table:"fire_inspections",module:"assets"}, "fire-pump-tests":{table:"fire_pump_tests",module:"assets"},
  "fire-alarm-zones":{table:"fire_alarm_zones",module:"assets"}, "fire-maintenance-orders":{table:"fire_maintenance_orders",module:"assets"}, "fire-alerts":{table:"fire_alerts",module:"assets"},
};
const COLUMNS: Record<string, Set<string>> = {
  users:new Set(["id","name","email","role","is_active","avatar","joined_at","auth_user_id"]), posts:new Set(["id","title","content","author_id","section_id","status","created_at","tags"]), sections:new Set(["id","name","slug","description","is_visible","order"]),
  form_templates:new Set(["id","title","description","fields","created_at","status"]), reports:new Set(["id","title","type","generated_by","created_at","status","data"]), activity_logs:new Set(["id","action","details","performed_by","performed_by_name","timestamp","module"]),
  employees:new Set(["id","name","email","title","department_id","is_primary"]), routing_rules:new Set(["id","department_id","severity","recipient_ids"]), permissions:new Set(["id","role","module","actions"]), documents:new Set(["id","doc_type","ref_no","title","date","vendor","department","status","category","description","amount","expiry_date","metadata","pdf_url","extracted_data","created_by","created_at","updated_at"]),
  section_config:new Set(["id","section_type","categories","required_fields","number_prefix","number_format"]), email_config:new Set(["id","smtp_host","smtp_port","username","password","from_name","from_email","enable_sending","signature"]), report_settings:new Set(["id","plant_prefix","date_format","reset_rule","company_name","company_logo","template_title","public_base_url"]), site_settings:new Set(["id","site_name","description","allow_registration","maintenance_mode","language","theme","color_theme","branding"]),
  employee_violations:new Set(["id","ref_no","date","employee_name","employee_id","department","occupation","position","violation","violation_description","notes","severity","status","data","created_by","created_at","updated_at","escalation_id","escalated_at","escalated_by"]),
  environmental_measurements:new Set(["id","factory_name","contractor_name","measurement_type","parameter_name","unit","measured_value","limit_value","measurement_date","next_measurement_date","compliance_status","reminder_enabled","reminder_days_before","notes","attachment_url","attachment_name","created_by","created_at","updated_at","last_reminder_at"]),
  assets:new Set(["id","ref_no","title","status","department","date","data","created_by","created_at","updated_at"]),
  visitors:new Set(["id","ref_no","title","status","department","date","data","created_by","created_at","updated_at"]),
  emergency:new Set(["id","ref_no","title","status","department","date","data","created_by","created_at","updated_at"]),
  fire_equipment:new Set(["id","equipment_id","serial_number","qr_code","category","type","manufacturer","model","capacity","location","department","building","installation_date","expiry_date","last_inspection_date","next_inspection_date","status","notes","created_by","created_at"]),
  fire_inspections:new Set(["id","equipment_id","equipment_ref","equipment_name","inspector_name","inspector_id","date","time","overall_result","checklist","notes","created_at"]),
  fire_pump_tests:new Set(["id","pump_id","pump_name","date","suction_pressure","discharge_pressure","flow_rate","rpm","oil_pressure","temperature","status","notes","created_at"]),
  fire_alarm_zones:new Set(["id","zone_code","zone_name","building","area","devices_count","status","created_at"]),
  fire_maintenance_orders:new Set(["id","wo_number","equipment_id","equipment_name","type","priority","status","assigned_to","problem_description","scheduled_date","completed_date","created_at"]),
  fire_alerts:new Set(["id","type","title","title_ar","message","message_ar","equipment_ref","date","is_read","created_at"]),
};
const camelToSnake=(value:string)=>value.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`);
const snakeToCamel=(value:string)=>value.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const mapClient=(row:any)=>row&&typeof row==="object"?Object.fromEntries(Object.entries(row).map(([k,v])=>[snakeToCamel(k),v])):row;
function sanitizeBody(table:string,body:any,mode:"insert"|"update"){const allowed=COLUMNS[table]||new Set<string>();const out:Record<string,any>={};for(const [key,value] of Object.entries(body||{})){const column=camelToSnake(key);if(!allowed.has(column))continue;if(table==="users"&&column==="password")continue;if(mode==="update"&&column==="id")continue;out[column]=value;}return out;}
function canWrite(profile:any,module:string,action:string){if(!profile?.is_active)return false;if(profile.role==="admin")return true;if(profile.role==="manager"&&["documents","content","settings","reports","assets"].includes(module))return action!=="delete"||["reports","assets"].includes(module);if(profile.role==="editor"&&["content","reports","documents","assets"].includes(module))return action!=="delete";return false;}

async function checkSupabase(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});return{ok:response.ok,status:response.status};}catch{return{ok:false,status:0};}}
async function checkHttp(url?:string){if(!url)return{configured:false,ok:false,status:0};try{const response=await fetch(url,{method:"GET",signal:AbortSignal.timeout(4000)});return{configured:true,ok:response.ok,status:response.status};}catch{return{configured:true,ok:false,status:0};}}
async function processEnvironmentalReminders(){
  const response=await supabaseFetch("/rest/v1/rpc/process_environmental_measurement_reminders",{method:"POST",body:"{}"});
  if(!response.ok) console.error("Environmental reminder RPC failed",response.status);
}

async function resourceHandler(req:any,res:any,resource:string){
  const user=await getAuthUser(req);const profile=user?await getProfile(req,user):null;if(!user||!profile||!profile.is_active)return json(res,401,{error:"Not authenticated"});
  const config=RESOURCE_MAP[resource];if(!config)return json(res,404,{error:"Unknown API resource"});if(config.adminOnly&&profile.role!=="admin")return json(res,403,{error:"Insufficient permission"});
  const rawId=String(req.query?.id||"").trim();const table=config.table;const base=`/rest/v1/${table}`;
  if(req.method==="GET"){
    let url=`${base}?select=*`;if(rawId)url+=table==="section_config"?`&section_type=eq.${encodeURIComponent(rawId)}`:`&id=eq.${encodeURIComponent(rawId)}`;
    if(table==="users")url=`${base}?select=id,name,email,role,is_active,avatar,joined_at,auth_user_id${rawId?`&id=eq.${encodeURIComponent(rawId)}`:""}`;
    if(table==="section_config")url+="&order=section_type.asc";
    if(table==="environmental_measurements"){
      const alerts=String(req.query?.alerts||"")==="1";
      if(alerts)url+=`&reminder_enabled=eq.true&next_measurement_date=not.is.null&next_measurement_date=lte.${new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10)}`;
      url+="&order=next_measurement_date.asc.nullsfirst,measurement_date.desc";
    }
    if(["assets","visitors","emergency","fire_equipment","fire_inspections","fire_pump_tests","fire_alarm_zones","fire_maintenance_orders","fire_alerts"].includes(table))url+="&order=created_at.desc";
    const r=await supabaseFetchForRequest(req,url);const rows=await r.json();if(!r.ok)return json(res,r.status,{error:rows?.message||"Unable to load resource"});return json(res,200,config.single?(rows[0]?mapClient(rows[0]):null):rows.map(mapClient));
  }
  const action=req.method==="POST"?"create":req.method==="PATCH"||req.method==="PUT"?"update":req.method==="DELETE"?"delete":"";if(!action)return json(res,405,{error:"Method not allowed"});if(!canWrite(profile,config.module,action))return json(res,403,{error:"Insufficient permission"});
  const body=req.body||{};
  if(resource==="permissions"&&(req.method==="PUT"||req.method==="PATCH")){const role=String(body.role||"").trim(),module=String(body.module||"").trim(),actions=Array.isArray(body.actions)?body.actions:[];if(!role||!module)return json(res,422,{error:"role and module are required"});const lookup=`${base}?role=eq.${encodeURIComponent(role)}&module=eq.${encodeURIComponent(module)}`;const existing=await supabaseFetchForRequest(req,`${lookup}&select=id`);const erows=await existing.json();if(!existing.ok)return json(res,existing.status,{error:erows?.message||"Unable to load permission"});const request=erows[0]?await supabaseFetchForRequest(req,`${base}?id=eq.${encodeURIComponent(erows[0].id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({actions})}):await supabaseFetchForRequest(req,base,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({role,module,actions})});const result=await request.json();if(!request.ok)return json(res,request.status,{error:result?.message||"Unable to save permission"});return json(res,200,mapClient(result[0]));}
  if(resource==="section-config"){const sectionType=rawId;if(!sectionType)return json(res,400,{error:"Section type is required"});if(req.method==="DELETE")return json(res,405,{error:"Deleting section configuration is not supported"});const patch=sanitizeBody(table,body,"update");patch.section_type=sectionType;const lookup=`${base}?section_type=eq.${encodeURIComponent(sectionType)}`;const existing=await supabaseFetchForRequest(req,`${lookup}&select=id`);const erows=await existing.json();if(!existing.ok)return json(res,existing.status,{error:erows?.message||"Unable to load section configuration"});const request=erows[0]?await supabaseFetchForRequest(req,lookup,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)}):await supabaseFetchForRequest(req,base,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});const result=await request.json();if(!request.ok)return json(res,request.status,{error:result?.message||"Unable to save section configuration"});return json(res,200,mapClient(result[0]));}
  if(req.method==="POST"){const row=sanitizeBody(table,body,"insert");if(["documents","reports","posts","form_templates","employees","routing_rules","activity_logs","environmental_measurements","employee_violations"].includes(table))row.created_at=row.created_at||new Date().toISOString();if(table==="activity_logs"){row.performed_by=row.performed_by||user.id;row.performed_by_name=row.performed_by_name||profile.name;row.timestamp=row.timestamp||new Date().toISOString();}if(["documents","employee_violations","environmental_measurements","assets","visitors","emergency","fire_equipment"].includes(table)&&COLUMNS[table]?.has("created_by"))row.created_by=row.created_by||user.id;if(table==="posts")row.author_id=row.author_id||user.id;
    const r=await supabaseFetchForRequest(req,base,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});const rows=await r.json();if(!r.ok)return json(res,r.status,{error:rows?.message||"Unable to create resource"});if(table==="environmental_measurements")await processEnvironmentalReminders().catch(error=>console.error("Environmental reminder processing failed",error));return json(res,201,mapClient(rows[0]));}
  const id=rawId||(config.single?"main":"");if(!id)return json(res,400,{error:"Resource id is required"});const url=`${base}?id=eq.${encodeURIComponent(id)}`;
  if(req.method==="PATCH"||req.method==="PUT"){const patch=sanitizeBody(table,body,"update");if(["documents","environmental_measurements","employee_violations","assets","visitors","emergency"].includes(table))patch.updated_at=new Date().toISOString();const r=await supabaseFetchForRequest(req,url,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});const rows=await r.json();if(!r.ok)return json(res,r.status,{error:rows?.message||"Unable to update resource"});if(table==="environmental_measurements")await processEnvironmentalReminders().catch(error=>console.error("Environmental reminder processing failed",error));return json(res,200,mapClient(rows[0]||null));}
  const r=await supabaseFetchForRequest(req,url,{method:"DELETE",headers:{Prefer:"return=representation"}});const rows=await r.json().catch(()=>[]);if(!r.ok)return json(res,r.status,{error:rows?.message||"Unable to delete resource"});if(!Array.isArray(rows)||rows.length===0)return json(res,404,{error:"Resource not found or could not be deleted"});return json(res,200,{ok:true,deletedId:id});
}

export default async function handler(req:any,res:any){
  const resource=String(req.query?.resource||"").trim();
  if(resource&&RESOURCE_MAP[resource]) return resourceHandler(req,res,resource);
  if(req.method!=="GET") return json(res,405,{error:"Method not allowed"});

  const supabase=await checkSupabase();
  const gateway=await checkHttp(process.env.CAMERA_GATEWAY_HEALTH_URL);
  const esp=await checkHttp(process.env.ESP_AI_HEALTH_URL);
  const overall=supabase.ok&&(!gateway.configured||gateway.ok)&&(!esp.configured||esp.ok);
  const timestamp=new Date().toISOString();

  const user=await getAuthUser(req);
  const profile=user?await getProfile(req,user):null;
  const canSeeDetails=Boolean(profile?.is_active&&profile.role==="admin");

  if(!canSeeDetails){
    return json(res,overall?200:503,{ok:overall,timestamp});
  }

  return json(res,overall?200:503,{ok:overall,timestamp,services:{supabase:{state:supabase.ok?"online":"offline",status:supabase.status},cameraGateway:{state:!gateway.configured?"not-configured":gateway.ok?"online":"offline",status:gateway.status},espAI:{state:!esp.configured?"not-configured":esp.ok?"online":"offline",status:esp.status}}});
}
