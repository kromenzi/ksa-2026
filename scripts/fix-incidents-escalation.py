from pathlib import Path
import re

incidents_path = Path("src/pages/admin/incidents.tsx")
text = incidents_path.read_text(encoding="utf-8")

text = text.replace('import { useLocation } from "wouter";\n', '')

old_interface = 'status:"Under Investigation"|"Actions Pending"|"Closed"}'
new_interface = 'status:"Under Investigation"|"Actions Pending"|"Closed";escalation?:{id:string;refNo?:string;status?:string;createdAt?:string;sourceType?:string;sourceId?:string;sourceRef?:string}}'
if old_interface not in text:
    raise SystemExit("IncidentRecord interface anchor not found")
text = text.replace(old_interface, new_interface, 1)

old_from_api = ' status:(row.status||"Under Investigation") as IncidentRecord["status"],\n});'
new_from_api = ''' status:(row.status||"Under Investigation") as IncidentRecord["status"],
 escalation:row.data?.escalation&&typeof row.data.escalation==="object"?{
  id:String(row.data.escalation.id||""),
  refNo:String(row.data.escalation.refNo||""),
  status:String(row.data.escalation.status||""),
  createdAt:String(row.data.escalation.createdAt||""),
  sourceType:String(row.data.escalation.sourceType||"INCIDENT"),
  sourceId:String(row.data.escalation.sourceId||row.id||""),
  sourceRef:String(row.data.escalation.sourceRef||row.refNo||""),
 }:undefined,
});'''
if old_from_api not in text:
    raise SystemExit("incidentFromApi anchor not found")
text = text.replace(old_from_api, new_from_api, 1)

old_to_api = '  lessonsLearned:incident.lessonsLearned,\n },\n});'
new_to_api = '''  lessonsLearned:incident.lessonsLearned,
  escalation:incident.escalation||null,
 },
});'''
if old_to_api not in text:
    raise SystemExit("incidentToApi anchor not found")
text = text.replace(old_to_api, new_to_api, 1)

old_component = ' const{settings,currentUser}=useData();const isAr=settings.language==="ar";const[,setLocation]=useLocation();'
new_component = ' const{settings,currentUser}=useData();const isAr=settings.language==="ar";'
if old_component not in text:
    raise SystemExit("useLocation component anchor not found")
text = text.replace(old_component, new_component, 1)

old_state = ' const[search,setSearch]=useState("");const[type,setType]=useState("all");const[active,setActive]=useState<IncidentRecord|null>(null);const[open,setOpen]=useState(false);const[printOpen,setPrintOpen]=useState(false);const[printItem,setPrintItem]=useState<any>(null);'
new_state = old_state + '\n const[escalatingId,setEscalatingId]=useState<string|null>(null);'
if old_state not in text:
    raise SystemExit("state anchor not found")
text = text.replace(old_state, new_state, 1)

print_anchor = ' const print=()=>{if(!active)return;'
if print_anchor not in text:
    raise SystemExit("print anchor not found")

escalate_fn = ''' const escalate=async(i:IncidentRecord)=>{
  if(i.status==="Closed"){
   toast.error(isAr?"لا يمكن تصعيد حادث مغلق":"Closed incident cannot be escalated");
   return;
  }
  setEscalatingId(i.id);
  try{
   const severity=String(i.severity||"Medium").toUpperCase();
   const level=severity==="CRITICAL"?"Level 3 - HSE / Plant Manager":severity==="HIGH"?"Level 2 - Department Manager":"Level 1 - Supervisor";
   const response=await apiRequest("POST","/api/escalations",{
    source:i.refNo||`INCIDENT:${i.id}`,
    sourceType:"INCIDENT",
    sourceId:i.id,
    sourceRef:i.refNo,
    title:`${i.refNo||"INCIDENT"} - ${i.type}: ${(i.title||i.description||"Incident / Near Miss").slice(0,120)}`,
    severity,
    level,
    department:i.department||"HSE",
    responsible:currentUser?.name||"HSE Lead",
    reason:i.description||i.title||(isAr?"تصعيد حادث / واقعة وشيكة":"Incident / Near Miss escalation"),
   });
   const escalation=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(escalation?.error||"Unable to create escalation");
   const linked:IncidentRecord={...i,escalation:{
    id:String(escalation.id||""),
    refNo:String(escalation.refNo||""),
    status:String(escalation.status||"OPEN"),
    createdAt:String(escalation.createdAt||new Date().toISOString()),
    sourceType:"INCIDENT",
    sourceId:i.id,
    sourceRef:i.refNo,
   }};
   await apiRequest("PATCH",`/api/incidents/${encodeURIComponent(i.id)}`,incidentToApi(linked));
   await queryClient.invalidateQueries({queryKey:["/api/incidents"]});
   if(active?.id===i.id)setActive(linked);
   toast.success(escalation.alreadyExists?(isAr?`الحادث مصعّد مسبقاً ${escalation.refNo||""}`:`Incident already escalated ${escalation.refNo||""}`):(isAr?`تم تصعيد الحادث / الواقعة ${escalation.refNo||""}`:`Incident / Near Miss escalated ${escalation.refNo||""}`));
  }catch(error:any){
   toast.error(isAr?`فشل التصعيد: ${error?.message||"تعذر إنشاء التصعيد"}`:error?.message||"Unable to escalate incident");
  }finally{
   setEscalatingId(null);
  }
 };
'''
text = text.replace(print_anchor, escalate_fn + print_anchor, 1)

old_button = '<Button type="button" size="icon" variant="outline" title={isAr?"تصعيد للإدارة":"Escalate to Management"} aria-label={isAr?"تصعيد للإدارة":"Escalate to Management"} onClick={e=>{e.preventDefault();e.stopPropagation();setLocation("/admin/escalations")}} className="h-9 w-9 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"><ShieldAlert className="h-5 w-5"/></Button>'
new_button = '''<Button type="button" size="icon" variant="outline" title={i.escalation?.id?(isAr?`تم التصعيد: ${i.escalation.refNo||""}`:`Escalated: ${i.escalation.refNo||""}`):(isAr?"تصعيد للإدارة":"Escalate to Management")} aria-label={isAr?"تصعيد للإدارة":"Escalate to Management"} onClick={e=>{e.preventDefault();e.stopPropagation();void escalate(i)}} disabled={escalatingId===i.id} data-testid={`button-escalate-incident-${i.id}`} className={`h-9 w-9 ${i.escalation?.id?"border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100":"border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"}`}><ShieldAlert className={`h-5 w-5 ${escalatingId===i.id?"animate-pulse":""}`}/></Button>'''
if old_button not in text:
    raise SystemExit("incident escalation button anchor not found")
text = text.replace(old_button, new_button, 1)

incidents_path.write_text(text, encoding="utf-8")

api_path = Path("api/escalations/[id].ts")
api = api_path.read_text(encoding="utf-8")
old_cleanup = '''      if (sourceId && (sourceType === "SOR" || sourceType === "NCR")) {
        const table = sourceType === "SOR" ? "safety_reports" : "ncr";
        const sourceResponse = await supabaseFetchForRequest(req, `/rest/v1/${table}?id=eq.${encodeURIComponent(sourceId)}&select=source_metadata&limit=1`);
        const sourceRows = await sourceResponse.json().catch(() => []);
        if (sourceResponse.ok && Array.isArray(sourceRows) && sourceRows[0]) {
          const metadata = sourceRows[0].source_metadata && typeof sourceRows[0].source_metadata === "object"
            ? { ...sourceRows[0].source_metadata }
            : {};
          const linkedId = String(metadata?.escalation?.id || "");
          if (!linkedId || linkedId === id) {
            delete metadata.escalation;
            await supabaseFetchForRequest(req, `/rest/v1/${table}?id=eq.${encodeURIComponent(sourceId)}`, {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ source_metadata: metadata, updated_at: new Date().toISOString() }),
            });
          }
        }
      }'''
new_cleanup = '''      if (sourceId && ["SOR", "NCR", "INCIDENT"].includes(sourceType)) {
        const table = sourceType === "SOR" ? "safety_reports" : sourceType === "NCR" ? "ncr" : "incidents";
        const linkColumn = sourceType === "INCIDENT" ? "data" : "source_metadata";
        const sourceResponse = await supabaseFetchForRequest(req, `/rest/v1/${table}?id=eq.${encodeURIComponent(sourceId)}&select=${linkColumn}&limit=1`);
        const sourceRows = await sourceResponse.json().catch(() => []);
        if (sourceResponse.ok && Array.isArray(sourceRows) && sourceRows[0]) {
          const sourceLinkData = sourceRows[0][linkColumn] && typeof sourceRows[0][linkColumn] === "object"
            ? { ...sourceRows[0][linkColumn] }
            : {};
          const linkedId = String(sourceLinkData?.escalation?.id || "");
          if (!linkedId || linkedId === id) {
            delete sourceLinkData.escalation;
            await supabaseFetchForRequest(req, `/rest/v1/${table}?id=eq.${encodeURIComponent(sourceId)}`, {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ [linkColumn]: sourceLinkData, updated_at: new Date().toISOString() }),
            });
          }
        }
      }'''
if old_cleanup not in api:
    raise SystemExit("escalation cleanup anchor not found")
api = api.replace(old_cleanup, new_cleanup, 1)
api_path.write_text(api, encoding="utf-8")
