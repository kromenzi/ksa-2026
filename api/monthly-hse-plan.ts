
import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";

const TASK_STATUSES = new Set(["Not Started","In Progress","Completed","Blocked","Escalated","Cancelled"]);
const PRIORITIES = new Set(["Critical","High","Medium","Low"]);
const RECURRENCES = new Set(["One Time","Weekly","Monthly","Quarterly","Annually","Custom"]);

const snakeToCamel=(value:string)=>value.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const mapRow=(row:any)=>row&&typeof row==="object"?Object.fromEntries(Object.entries(row).map(([k,v])=>[snakeToCamel(k),v])):row;
const clean=(value:any,max=4000)=>String(value??"").replace(/\0/g,"").trim().slice(0,max);
const managerRole=(role:string)=>role==="admin"||role==="manager";

function daysInMonth(year:number,month:number){return new Date(year,month,0).getDate();}
function dateFor(year:number,month:number,day:number){
  const d=Math.max(1,Math.min(daysInMonth(year,month),day));
  return year+"-"+String(month).padStart(2,"0")+"-"+String(d).padStart(2,"0");
}
function weeklyDates(year:number,month:number,weekday:number){
  const out:string[]=[];
  const max=daysInMonth(year,month);
  for(let d=1;d<=max;d++){
    const jsDay=new Date(year,month-1,d).getDay()||7;
    if(jsDay===weekday) out.push(dateFor(year,month,d));
  }
  return out;
}
async function rest(req:any,path:string,init:RequestInit={}){
  const response=await supabaseFetchForRequest(req,path,init);
  const body=await response.json().catch(()=>null);
  if(!response.ok){
    const error:any=new Error(body?.message||body?.error||"Database request failed");
    error.statusCode=response.status;
    throw error;
  }
  return body;
}

export default async function handler(req:any,res:any){
  try{
    res.setHeader("Cache-Control","no-store, max-age=0");
    const user=await getAuthUser(req);
    const profile=user?await getProfile(req,user):null;
    if(!user||!profile||!profile.is_active) return json(res,401,{error:"Not authenticated"});

    const action=clean(req.query?.action||"tasks",40).toLowerCase();
    const canManage=managerRole(String(profile.role||""));

    if(req.method==="GET"&&action==="tasks"){
      const month=Math.max(1,Math.min(12,Number(req.query?.month)||new Date().getMonth()+1));
      const year=Math.max(2020,Math.min(2100,Number(req.query?.year)||new Date().getFullYear()));
      let path="/rest/v1/monthly_hse_tasks?select=*&year=eq."+year+"&month=eq."+month+"&order=due_date.asc,created_at.desc";
      const rows=await rest(req,path);
      return json(res,200,(rows||[]).map(mapRow));
    }

    if(req.method==="GET"&&action==="templates"){
      const rows=await rest(req,"/rest/v1/monthly_hse_task_templates?select=*&order=category.asc,title_en.asc");
      return json(res,200,(rows||[]).map(mapRow));
    }

    if(req.method==="GET"&&action==="evidence"){
      const taskId=clean(req.query?.taskId,80);
      if(!taskId) return json(res,422,{error:"taskId is required"});
      const rows=await rest(req,"/rest/v1/monthly_hse_task_evidence?select=*&task_id=eq."+encodeURIComponent(taskId)+"&order=created_at.asc");
      return json(res,200,(rows||[]).map(mapRow));
    }

    if(req.method==="POST"&&action==="create"){
      if(!canManage) return json(res,403,{error:"Manager permission required"});
      const b=req.body||{};
      const month=Number(b.month),year=Number(b.year);
      if(!month||month<1||month>12||!year) return json(res,422,{error:"Valid month and year are required"});
      if(!clean(b.titleAr,300)||!clean(b.titleEn,300)) return json(res,422,{error:"Arabic and English titles are required"});
      if(!clean(b.assignedTo,80)) return json(res,422,{error:"Assigned employee is required"});
      const row={
        title_ar:clean(b.titleAr,300),
        title_en:clean(b.titleEn,300),
        description:clean(b.description,3000)||null,
        category:clean(b.category,120)||"General",
        factory:clean(b.factory,180)||null,
        department:clean(b.department,180)||null,
        assigned_to:clean(b.assignedTo,80),
        backup_user_id:clean(b.backupUserId,80)||null,
        month,year,
        priority:PRIORITIES.has(b.priority)?b.priority:"Medium",
        start_date:clean(b.startDate,20)||dateFor(year,month,1),
        due_date:clean(b.dueDate,20)||dateFor(year,month,5),
        recurrence:RECURRENCES.has(b.recurrence)?b.recurrence:"Monthly",
        status:"Not Started",
        progress:0,
        evidence_required:Boolean(b.evidenceRequired),
        linked_module:clean(b.linkedModule,100)||null,
        linked_record_id:clean(b.linkedRecordId,160)||null,
        notes:clean(b.notes,4000)||null,
        created_by:profile.id,
      };
      const rows=await rest(req,"/rest/v1/monthly_hse_tasks",{
        method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)
      });
      return json(res,201,mapRow(rows?.[0]));
    }

    if(req.method==="POST"&&action==="generate"){
      if(!canManage) return json(res,403,{error:"Manager permission required"});
      const b=req.body||{};
      const month=Number(b.month),year=Number(b.year);
      const assignedTo=clean(b.assignedTo,80);
      if(!assignedTo||month<1||month>12||!year) return json(res,422,{error:"Employee, month and year are required"});
      const templates=await rest(req,"/rest/v1/monthly_hse_task_templates?select=*&active=eq.true&order=category.asc");
      const rows:any[]=[];
      for(const t of templates||[]){
        const dueDates=t.recurrence==="Weekly"
          ? weeklyDates(year,month,Math.max(1,Math.min(7,Number(t.default_due_day)||5)))
          : [dateFor(year,month,Number(t.default_due_day)||5)];
        for(let i=0;i<dueDates.length;i++){
          const due=dueDates[i];
          const start=t.recurrence==="Weekly"
            ? due
            : dateFor(year,month,Number(t.default_start_day)||1);
          rows.push({
            title_ar:t.title_ar+(t.recurrence==="Weekly"?" - "+(i+1):""),
            title_en:t.title_en+(t.recurrence==="Weekly"?" - "+(i+1):""),
            description:t.description,
            category:t.category,
            factory:clean(b.factory,180)||null,
            department:clean(b.department,180)||null,
            assigned_to:assignedTo,
            backup_user_id:clean(b.backupUserId,80)||null,
            month,year,
            priority:t.priority,
            start_date:start,
            due_date:due,
            recurrence:t.recurrence,
            status:"Not Started",
            progress:0,
            evidence_required:Boolean(t.evidence_required),
            linked_module:t.linked_module,
            created_by:profile.id
          });
        }
      }
      if(!rows.length) return json(res,422,{error:"No active task templates found"});
      const inserted=await rest(req,"/rest/v1/monthly_hse_tasks",{
        method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(rows)
      });
      return json(res,201,{created:inserted?.length||0,tasks:(inserted||[]).map(mapRow)});
    }

    if(req.method==="POST"&&action==="template"){
      if(!canManage) return json(res,403,{error:"Manager permission required"});
      const b=req.body||{};
      const titleAr=clean(b.titleAr,300),titleEn=clean(b.titleEn,300);
      if(!titleAr||!titleEn) return json(res,422,{error:"Template titles are required"});
      const slug=(clean(b.slug,120)||titleEn.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))+"-"+Date.now().toString(36);
      const row={
        slug,title_ar:titleAr,title_en:titleEn,description:clean(b.description,3000)||null,
        category:clean(b.category,120)||"General",
        priority:PRIORITIES.has(b.priority)?b.priority:"Medium",
        recurrence:b.recurrence==="Weekly"?"Weekly":"Monthly",
        default_start_day:Math.max(1,Math.min(31,Number(b.defaultStartDay)||1)),
        default_due_day:Math.max(1,Math.min(31,Number(b.defaultDueDay)||5)),
        evidence_required:Boolean(b.evidenceRequired),
        linked_module:clean(b.linkedModule,100)||null,
        active:true,created_by:profile.id
      };
      const rows=await rest(req,"/rest/v1/monthly_hse_task_templates",{
        method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)
      });
      return json(res,201,mapRow(rows?.[0]));
    }

    if(req.method==="POST"&&action==="evidence"){
      const b=req.body||{};
      const taskId=clean(b.taskId,80);
      const images=Array.isArray(b.images)?b.images.slice(0,4):[];
      if(!taskId||!images.length) return json(res,422,{error:"taskId and images are required"});
      const rows=images.map((img:any)=>({
        task_id:taskId,
        file_path:clean(img.path,500),
        file_name:clean(img.name,260)||"evidence",
        mime_type:clean(img.mimeType,120)||"image/jpeg",
        size_bytes:Number(img.size)||0,
        note:clean(b.note,1000)||null,
        uploaded_by:profile.id
      }));
      const inserted=await rest(req,"/rest/v1/monthly_hse_task_evidence",{
        method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(rows)
      });
      return json(res,201,(inserted||[]).map(mapRow));
    }

    if((req.method==="PATCH"||req.method==="PUT")&&action==="task"){
      const id=clean(req.query?.id,80);
      if(!id) return json(res,422,{error:"Task id is required"});
      const currentRows=await rest(req,"/rest/v1/monthly_hse_tasks?select=*&id=eq."+encodeURIComponent(id)+"&limit=1");
      const current=currentRows?.[0];
      if(!current) return json(res,404,{error:"Task not found"});
      const b=req.body||{};
      const patch:any={};
      if(canManage){
        if(b.titleAr!==undefined) patch.title_ar=clean(b.titleAr,300);
        if(b.titleEn!==undefined) patch.title_en=clean(b.titleEn,300);
        if(b.description!==undefined) patch.description=clean(b.description,3000)||null;
        if(b.category!==undefined) patch.category=clean(b.category,120)||"General";
        if(b.factory!==undefined) patch.factory=clean(b.factory,180)||null;
        if(b.department!==undefined) patch.department=clean(b.department,180)||null;
        if(b.assignedTo!==undefined) patch.assigned_to=clean(b.assignedTo,80)||null;
        if(b.backupUserId!==undefined) patch.backup_user_id=clean(b.backupUserId,80)||null;
        if(PRIORITIES.has(b.priority)) patch.priority=b.priority;
        if(b.startDate!==undefined) patch.start_date=clean(b.startDate,20);
        if(b.dueDate!==undefined) patch.due_date=clean(b.dueDate,20);
        if(b.evidenceRequired!==undefined) patch.evidence_required=Boolean(b.evidenceRequired);
        if(b.linkedModule!==undefined) patch.linked_module=clean(b.linkedModule,100)||null;
        if(b.linkedRecordId!==undefined) patch.linked_record_id=clean(b.linkedRecordId,160)||null;
        if(b.escalationLevel!==undefined) patch.escalation_level=Math.max(0,Math.min(5,Number(b.escalationLevel)||0));
      }
      if(TASK_STATUSES.has(b.status)) patch.status=b.status;
      if(b.progress!==undefined) patch.progress=Math.max(0,Math.min(100,Number(b.progress)||0));
      if(b.notes!==undefined) patch.notes=clean(b.notes,4000)||null;

      const targetStatus=patch.status||current.status;
      if(targetStatus==="Completed"){
        if(current.evidence_required){
          const ev=await rest(req,"/rest/v1/monthly_hse_task_evidence?select=id&task_id=eq."+encodeURIComponent(id)+"&limit=1");
          if(!ev?.length) return json(res,422,{error:"Evidence is required before completing this task"});
        }
        patch.status="Completed";patch.progress=100;patch.completed_at=new Date().toISOString();patch.completed_by=profile.id;
      }else if(patch.status&&patch.status!=="Completed"){
        patch.completed_at=null;patch.completed_by=null;
      }
      if(patch.status==="Not Started") patch.progress=0;
      const rows=await rest(req,"/rest/v1/monthly_hse_tasks?id=eq."+encodeURIComponent(id),{
        method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)
      });
      return json(res,200,mapRow(rows?.[0]));
    }

    if(req.method==="POST"&&action==="verify"){
      if(!canManage) return json(res,403,{error:"Manager permission required"});
      const id=clean(req.body?.id,80);
      if(!id) return json(res,422,{error:"Task id is required"});
      const rows=await rest(req,"/rest/v1/monthly_hse_tasks?id=eq."+encodeURIComponent(id),{
        method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({
          supervisor_verified_at:new Date().toISOString(),
          supervisor_verified_by:profile.id
        })
      });
      return json(res,200,mapRow(rows?.[0]));
    }

    if(req.method==="DELETE"&&action==="task"){
      if(!canManage) return json(res,403,{error:"Manager permission required"});
      const id=clean(req.query?.id,80);
      if(!id) return json(res,422,{error:"Task id is required"});
      await rest(req,"/rest/v1/monthly_hse_tasks?id=eq."+encodeURIComponent(id),{
        method:"DELETE",headers:{Prefer:"return=representation"}
      });
      return json(res,200,{ok:true});
    }

    if(req.method==="DELETE"&&action==="template"){
      if(!canManage) return json(res,403,{error:"Manager permission required"});
      const id=clean(req.query?.id,80);
      if(!id) return json(res,422,{error:"Template id is required"});
      await rest(req,"/rest/v1/monthly_hse_task_templates?id=eq."+encodeURIComponent(id),{
        method:"DELETE",headers:{Prefer:"return=representation"}
      });
      return json(res,200,{ok:true});
    }

    return json(res,404,{error:"Unsupported monthly HSE plan action"});
  }catch(error:any){
    console.error("Monthly HSE plan API failed",error);
    return json(res,error?.statusCode||500,{error:error?.message||"Monthly HSE plan service failed"});
  }
}
