import { json, supabaseFetchForRequest } from "./supabase.js";

const text = (value:any) => String(value || "").trim().toLowerCase();
const isAny = (q:string, terms:string[]) => terms.some(term => q.includes(term));

async function rows(req:any,path:string){
  const response=await supabaseFetchForRequest(req,path);
  const body=await response.json().catch(()=>[]);
  if(!response.ok){
    const error:any=new Error(body?.message||body?.error||"Unable to query HSE data");
    error.statusCode=response.status;
    throw error;
  }
  return Array.isArray(body)?body:[];
}

function overdueAction(a:any){
  return a?.due_at && new Date(a.due_at).getTime()<Date.now() && !["Completed","Closed","Cancelled"].includes(a.status);
}
function dueDate(value:any){return value && new Date(value).getTime()<Date.now();}

export async function hseAssistantHandler(req:any,res:any,profile:any){
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  const question=String(req.body?.question||"").trim();
  if(!question) return json(res,422,{error:"Question is required"});
  if(question.length>1200) return json(res,422,{error:"Question is too long"});

  const q=text(question);
  let intent="summary";
  if(isAny(q,["متأخر","المتأخرة","overdue","late action","capa"])) intent="overdue_actions";
  if(isAny(q,["مخاطر","risk","top risk","أعلى المخاطر"])) intent="top_risks";
  if(isAny(q,["معدات","equipment","شهادة","certificate","صيانة","maintenance"])) intent="equipment_due";
  if(isAny(q,["تصريح","ptw","permit"])) intent="active_ptw";
  if(isAny(q,["حريق","fire","مخرج","exit","emergency"])) intent="fire_emergency";
  if(isAny(q,["مقاول","contractor"])) intent="contractors";
  if(isAny(q,["كيميائي","chemical","sds","مواد"])) intent="chemicals";
  if(isAny(q,["ملخص","summary","الوضع","dashboard","اليوم"])) intent="summary";

  if(intent==="overdue_actions"){
    const actions=await rows(req,"/rest/v1/hse_actions?select=id,action_no,title,priority,status,due_at,department,factory,area,escalation_level&order=due_at.asc&limit=300");
    const found=actions.filter(overdueAction).slice(0,20);
    return json(res,200,{
      intent,route:"/admin/action-center",
      answerAr:`يوجد ${actions.filter(overdueAction).length} إجراء CAPA متأخر. أعرض أول ${found.length} حسب تاريخ الاستحقاق.`,
      answerEn:`There are ${actions.filter(overdueAction).length} overdue CAPA actions. Showing the first ${found.length} by due date.`,
      data:found.map(a=>({ref:a.action_no,title:a.title,priority:a.priority,dueAt:a.due_at,department:a.department,escalationLevel:a.escalation_level}))
    });
  }

  if(intent==="top_risks"){
    const risks=await rows(req,"/rest/v1/risk_register?select=id,risk_no,title,hazard,department,factory,area,residual_score,residual_level,status,review_date,action_id&status=neq.Closed&order=residual_score.desc&limit=10");
    return json(res,200,{intent,route:"/admin/risk-register",answerAr:`أعلى ${risks.length} مخاطر متبقية مرتبة حسب Residual Risk Score.`,answerEn:`Top ${risks.length} residual risks ranked by residual risk score.`,data:risks});
  }

  if(intent==="equipment_due"){
    const assets=await rows(req,"/rest/v1/equipment_assets?select=id,asset_code,name,equipment_type,status,certificate_expiry,next_inspection_date,next_maintenance_date,factory,area&order=asset_code.asc&limit=500");
    const found=assets.filter(a=>dueDate(a.certificate_expiry)||dueDate(a.next_inspection_date)||dueDate(a.next_maintenance_date)||["Restricted","Out of Service"].includes(a.status));
    return json(res,200,{intent,route:"/admin/equipment-safety",answerAr:`يوجد ${found.length} معدة تحتاج متابعة بسبب استحقاق متأخر أو حالة تشغيل مقيدة.`,answerEn:`${found.length} assets need attention due to overdue requirements or restricted operating status.`,data:found.slice(0,30)});
  }

  if(intent==="active_ptw"){
    const permits=await rows(req,"/rest/v1/ptw_permits?select=id,permit_no,permit_type,title,department,factory,area,status,risk_level,start_at,expires_at,loto_required&status=in.(Active,Approved,Pending%20Approval,Pending%20Review)&order=expires_at.asc&limit=100");
    return json(res,200,{intent,route:"/admin/permits",answerAr:`يوجد ${permits.filter(p=>p.status==="Active").length} تصريح عمل نشط و${permits.filter(p=>p.status!=="Active").length} قيد المراجعة/الاعتماد.`,answerEn:`${permits.filter(p=>p.status==="Active").length} active permits and ${permits.filter(p=>p.status!=="Active").length} under review/approval.`,data:permits});
  }

  if(intent==="fire_emergency"){
    const [devices,exits,responses]=await Promise.all([
      rows(req,"/rest/v1/fire_devices?select=id,device_code,device_type,status,building,area,exact_location,last_signal_at&status=neq.normal&limit=100"),
      rows(req,"/rest/v1/emergency_exits?select=id,exit_code,name,status,door_status,lock_status,obstruction_status,building,area&limit=200"),
      rows(req,"/rest/v1/emergency_response_incidents?select=id,response_no,title,severity,status,building,area,missing_count,alarm_started_at&status=not.in.(Closed,Cancelled,All%20Clear)&order=alarm_started_at.desc&limit=30")
    ]);
    const badExits=exits.filter(e=>["blocked","locked","fault","offline"].includes(e.status)||e.obstruction_status==="blocked");
    return json(res,200,{intent,route:"/admin/fire-emergency-command",answerAr:`حالة الطوارئ: ${devices.length} جهاز حريق غير Normal، ${badExits.length} مخرج يحتاج متابعة، و${responses.length} استجابة طوارئ فعالة.`,answerEn:`Emergency status: ${devices.length} non-normal fire devices, ${badExits.length} exits needing attention, and ${responses.length} active emergency responses.`,data:{devices:devices.slice(0,20),exits:badExits.slice(0,20),responses}});
  }

  if(intent==="contractors"){
    const [contractors,workers]=await Promise.all([
      rows(req,"/rest/v1/contractors?select=id,contractor_code,name,status,safety_score,contract_end,insurance_expiry&order=name.asc&limit=200"),
      rows(req,"/rest/v1/contractor_workers?select=id,contractor_id,worker_no,name,status,access_allowed,block_reason&access_allowed=eq.false&limit=200")
    ]);
    const bad=contractors.filter(c=>["Blocked","Suspended","Expired"].includes(c.status));
    return json(res,200,{intent,route:"/admin/contractor-safety",answerAr:`يوجد ${bad.length} مقاول بحالة غير معتمدة و${workers.length} عامل وصوله محجوب.`,answerEn:`${bad.length} contractors are not in approved status and ${workers.length} workers are blocked from access.`,data:{contractors:bad,blockedWorkers:workers.slice(0,30)}});
  }

  if(intent==="chemicals"){
    const [chemicals,sds]=await Promise.all([
      rows(req,"/rest/v1/chemicals?select=id,chemical_code,product_name,status,risk_rating,storage_area,quantity,unit,max_allowed_quantity,product_expiry_date&limit=300"),
      rows(req,"/rest/v1/chemical_sds?select=id,chemical_id,status,review_due_date&status=neq.Current&limit=300")
    ]);
    const issues=chemicals.filter(c=>["Expired","Restricted"].includes(c.status)||(c.max_allowed_quantity!=null&&Number(c.quantity)>Number(c.max_allowed_quantity))||dueDate(c.product_expiry_date));
    return json(res,200,{intent,route:"/admin/chemicals",answerAr:`يوجد ${issues.length} مادة كيميائية تحتاج متابعة و${sds.length} سجل SDS غير Current.`,answerEn:`${issues.length} chemicals need attention and ${sds.length} SDS records are not current.`,data:{chemicals:issues.slice(0,30),sds:sds.slice(0,30)}});
  }

  const [actions,risks,permits,devices,exits,assets,observations]=await Promise.all([
    rows(req,"/rest/v1/hse_actions?select=id,status,priority,due_at&limit=500"),
    rows(req,"/rest/v1/risk_register?select=id,residual_level,status&limit=500"),
    rows(req,"/rest/v1/ptw_permits?select=id,status&limit=500"),
    rows(req,"/rest/v1/fire_devices?select=id,status&limit=500"),
    rows(req,"/rest/v1/emergency_exits?select=id,status,obstruction_status&limit=500"),
    rows(req,"/rest/v1/equipment_assets?select=id,status,certificate_expiry,next_inspection_date,next_maintenance_date&limit=500"),
    rows(req,"/rest/v1/safety_observations?select=id,observation_type,status,severity&limit=500")
  ]);
  const summary={
    overdueActions:actions.filter(overdueAction).length,
    criticalActions:actions.filter(a=>a.priority==="Critical"&&!["Closed","Completed","Cancelled"].includes(a.status)).length,
    highCriticalRisks:risks.filter(r=>["High","Critical"].includes(r.residual_level)&&r.status!=="Closed").length,
    activePermits:permits.filter(p=>p.status==="Active").length,
    fireIssues:devices.filter(d=>d.status!=="normal").length,
    unsafeExits:exits.filter(e=>["blocked","locked","fault","offline"].includes(e.status)||e.obstruction_status==="blocked").length,
    equipmentDue:assets.filter(a=>dueDate(a.certificate_expiry)||dueDate(a.next_inspection_date)||dueDate(a.next_maintenance_date)||["Restricted","Out of Service"].includes(a.status)).length,
    openNearMiss:observations.filter(o=>o.observation_type==="Near Miss"&&!["Closed","Cancelled"].includes(o.status)).length
  };
  return json(res,200,{intent:"summary",route:"/admin/executive-hse",answerAr:`ملخص HSE الحالي: ${summary.overdueActions} CAPA متأخرة، ${summary.highCriticalRisks} مخاطر High/Critical، ${summary.activePermits} PTW نشطة، ${summary.fireIssues} مشاكل بأجهزة الحريق، و${summary.unsafeExits} مخارج تحتاج متابعة.`,answerEn:`Current HSE summary: ${summary.overdueActions} overdue CAPA actions, ${summary.highCriticalRisks} High/Critical risks, ${summary.activePermits} active PTWs, ${summary.fireIssues} fire-device issues, and ${summary.unsafeExits} exits needing attention.`,data:summary});
}
