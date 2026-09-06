from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Missing anchor: {label}")
    return text.replace(old, new, 1)


page_path = Path("src/pages/admin/incidents.tsx")
page = page_path.read_text(encoding="utf-8")
page = replace_once(
    page,
    'import { useState } from "react";\n',
    'import { useState } from "react";\nimport { useQuery, useQueryClient } from "@tanstack/react-query";\nimport { apiRequest } from "@/lib/queryClient";\nimport { toast } from "sonner";\n',
    "incident persistence imports",
)

helpers_anchor = 'const text=(v:string)=>v||"—";\n'
helpers = '''const text=(v:string)=>v||"—";\n\nconst incidentFromApi=(row:any):IncidentRecord=>({\n id:String(row.id),\n refNo:String(row.refNo||""),\n type:(row.data?.type||"Near Miss") as IncidentRecord["type"],\n title:String(row.title||""),\n date:String(row.date||""),\n time:String(row.data?.time||""),\n location:String(row.data?.location||""),\n department:String(row.department||""),\n factory:String(row.data?.factory||""),\n reportedBy:String(row.data?.reportedBy||""),\n severity:(row.data?.severity||"Medium") as IncidentRecord["severity"],\n description:String(row.data?.description||""),\n fiveWhys:Array.isArray(row.data?.fiveWhys)?row.data.fiveWhys:[1,2,3,4,5].map(n=>({whyNo:n,question:n===5?"Root Cause?":"Why?",answer:""})),\n fishbone:Array.isArray(row.data?.fishbone)?row.data.fishbone:[{category:"Man (People)",cause:""}],\n correctiveActions:Array.isArray(row.data?.correctiveActions)?row.data.correctiveActions:[],\n lessonsLearned:String(row.data?.lessonsLearned||""),\n status:(row.status||"Under Investigation") as IncidentRecord["status"],\n});\n\nconst incidentToApi=(incident:IncidentRecord)=>({\n refNo:incident.refNo,\n title:incident.title||incident.refNo,\n status:incident.status,\n department:incident.department,\n date:incident.date,\n data:{\n  type:incident.type,\n  time:incident.time,\n  location:incident.location,\n  factory:incident.factory,\n  reportedBy:incident.reportedBy,\n  severity:incident.severity,\n  description:incident.description,\n  fiveWhys:incident.fiveWhys,\n  fishbone:incident.fishbone,\n  correctiveActions:incident.correctiveActions,\n  lessonsLearned:incident.lessonsLearned,\n },\n});\n'''
page = replace_once(page, helpers_anchor, helpers, "incident API mappers")

state_old = ' const[incidents,setIncidents]=useState<IncidentRecord[]>([]);const[search,setSearch]=useState("");const[type,setType]=useState("all");const[active,setActive]=useState<IncidentRecord|null>(null);const[open,setOpen]=useState(false);const[printOpen,setPrintOpen]=useState(false);const[printItem,setPrintItem]=useState<any>(null);\n'
state_new = ''' const queryClient=useQueryClient();\n const{data:incidents=[]}=useQuery<IncidentRecord[]>({queryKey:["/api/incidents"],queryFn:async()=>{const response=await fetch("/api/incidents",{credentials:"include",cache:"no-store"});if(!response.ok)throw new Error("Unable to load incidents");const rows=await response.json();return Array.isArray(rows)?rows.map(incidentFromApi):[];}});\n const[search,setSearch]=useState("");const[type,setType]=useState("all");const[active,setActive]=useState<IncidentRecord|null>(null);const[open,setOpen]=useState(false);const[printOpen,setPrintOpen]=useState(false);const[printItem,setPrintItem]=useState<any>(null);\n'''
page = replace_once(page, state_old, state_new, "incident state to query")

page = page.replace(
    'refNo:`INC-${new Date().getFullYear()}-${Math.floor(100+Math.random()*900)}`',
    'refNo:`INC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`',
    1,
)

save_old = ' const save=()=>{if(!active)return;setIncidents(p=>p.some(i=>i.id===active.id)?p.map(i=>i.id===active.id?active:i):[active,...p]);setOpen(false)};\n'
save_new = ''' const save=async()=>{if(!active)return;try{const payload=incidentToApi(active);if(active.id.startsWith("INC-")){await apiRequest("POST","/api/incidents",payload);}else{await apiRequest("PATCH",`/api/incidents/${encodeURIComponent(active.id)}`,payload);}await queryClient.invalidateQueries({queryKey:["/api/incidents"]});setOpen(false);toast.success(isAr?"تم حفظ الحادث / الواقعة الوشيكة بنجاح":"Incident / Near Miss saved successfully");}catch(error:any){toast.error(isAr?"تعذر حفظ الحادث في قاعدة البيانات":error?.message||"Unable to save incident");}};\n'''
page = replace_once(page, save_old, save_new, "persistent incident save")
page_path.write_text(page, encoding="utf-8")

api_path = Path("api/data.ts")
api = api_path.read_text(encoding="utf-8")
api = replace_once(
    api,
    '  inspections: { table: "inspections", module: "reports" },\n',
    '  inspections: { table: "inspections", module: "reports" },\n  incidents: { table: "incidents", module: "reports" },\n',
    "incidents resource map",
)
api = replace_once(
    api,
    '  "inspections", "audits", "compliance", "loto", "permits", "escalation_matrix",\n',
    '  "inspections", "incidents", "audits", "compliance", "loto", "permits", "escalation_matrix",\n',
    "incidents generic tables",
)
api = replace_once(
    api,
    '  inspections: GENERIC_COLUMNS,\n',
    '  inspections: GENERIC_COLUMNS,\n  incidents: GENERIC_COLUMNS,\n',
    "incidents columns",
)
api_path.write_text(api, encoding="utf-8")

vercel_path = Path("vercel.json")
vercel = vercel_path.read_text(encoding="utf-8")
vercel = replace_once(
    vercel,
    '    { "source": "/api/inspections/:id", "destination": "/api/data?resource=inspections&id=:id" },\n',
    '    { "source": "/api/inspections/:id", "destination": "/api/data?resource=inspections&id=:id" },\n    { "source": "/api/incidents", "destination": "/api/data?resource=incidents" },\n    { "source": "/api/incidents/:id", "destination": "/api/data?resource=incidents&id=:id" },\n',
    "incident API rewrites",
)
vercel_path.write_text(vercel, encoding="utf-8")

print("Incident and Near Miss persistence wiring completed.")
