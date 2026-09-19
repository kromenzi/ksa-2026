import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "wouter";
import {
  Activity, AlertTriangle, Bot, Boxes, Building2, CalendarDays, CheckCircle2,
  ClipboardCheck, ClipboardList, Clock3, Factory, FileCheck2, FileText, FlaskConical,
  Gauge, HardHat, LayoutDashboard, Lock, Map, PackageCheck, Plus, QrCode,
  RefreshCw, ShieldAlert, ShieldCheck, Siren, Sparkles, UsersRound, Wrench
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type AnyRow = Record<string, any>;
type DialogKind =
  | "action" | "ptw" | "loto" | "inspection-schedule" | "observation"
  | "equipment" | "equipment-defect" | "contractor" | "contractor-worker"
  | "chemical" | "chemical-stock" | "risk" | "risk-control"
  | "floor-plan" | "map-point" | "qr";

const today = () => new Date().toISOString().slice(0,10);
const isoLocal = (hours=0) => {
  const d=new Date(Date.now()+hours*3600_000);
  const offset=d.getTimezoneOffset();
  return new Date(d.getTime()-offset*60000).toISOString().slice(0,16);
};
const fmt=(value?:string|null)=>value?new Date(value).toLocaleString():"—";
const num=(value:any)=>Number(value||0);
const statusTone=(status?:string)=>{
  const s=String(status||"").toLowerCase();
  if(["critical","overdue","blocked","expired","fault","open"].includes(s)) return "bg-red-500/10 text-red-700 border-red-500/30";
  if(["high","conditional","pending","in progress","in_progress","draft","review","planned"].includes(s)) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  if(["completed","closed","approved","active","verified","resolved","available","current","excellent"].includes(s)) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  return "bg-slate-500/10 text-slate-700 border-slate-500/30";
};

async function loadResource(resource:string){
  const r=await apiRequest("GET",`/api/data?resource=${resource}`);
  const p=await r.json();
  if(!r.ok) throw new Error(p?.error||`Unable to load ${resource}`);
  return Array.isArray(p)?p:[];
}
async function loadSnapshot(){
  const now=new Date();
  const r=await apiRequest("GET",`/api/data?resource=hse-executive-snapshot&month=${now.getMonth()+1}&year=${now.getFullYear()}`);
  const p=await r.json();
  if(!r.ok) throw new Error(p?.error||"Unable to load executive snapshot");
  return p||{};
}
async function loadHseEmployees(){
  const r=await apiRequest("GET","/api/data?resource=employee-directory&type=hse");
  const p=await r.json();
  if(!r.ok) throw new Error(p?.error||"Unable to load HSE employees");
  return Array.isArray(p)?p:[];
}

const RESOURCE_KEYS = [
  "hse-actions","hse-action-escalations","hse-escalation-rules",
  "ptw-permits","loto-isolations","inspection-templates","inspection-schedules","inspection-tasks","safety-observations",
  "equipment-assets","equipment-defects","equipment-service-records","equipment-operator-authorizations",
  "contractors","contractor-workers","contractor-documents","contractor-scorecards",
  "chemicals","chemical-sds","chemical-inventory","risk-register","risk-controls",
  "site-floor-plans","assembly-points","emergency-responses","safety-map-points","safety-qr","monthly-hse-reports"
] as const;

export default function HseOperationsHub(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const canWrite=currentUser?.role==="admin"||currentUser?.role==="manager"||currentUser?.role==="editor";
  const canAutomate=currentUser?.role==="admin"||currentUser?.role==="manager";
  const [dialog,setDialog]=useState<DialogKind|null>(null);
  const [saving,setSaving]=useState(false);
  const [automationBusy,setAutomationBusy]=useState("");
  const [assistantQuestion,setAssistantQuestion]=useState("");
  const [assistantAnswer,setAssistantAnswer]=useState("");
  const [assistantBusy,setAssistantBusy]=useState(false);

  const snapshotQ=useQuery({queryKey:["hse-executive-snapshot"],queryFn:loadSnapshot});
  const hseEmployeesQ=useQuery({queryKey:["hse-directory"],queryFn:loadHseEmployees});
  const resourceQueries=Object.fromEntries(RESOURCE_KEYS.map(key=>[
    key,
    useQuery<AnyRow[]>({queryKey:["hse-roadmap",key],queryFn:()=>loadResource(key)})
  ])) as Record<string,ReturnType<typeof useQuery<AnyRow[]>>>;

  const rows=(key:string)=>(resourceQueries[key]?.data||[]) as AnyRow[];
  const actions=rows("hse-actions");
  const escalations=rows("hse-action-escalations");
  const rules=rows("hse-escalation-rules");
  const permits=rows("ptw-permits");
  const isolations=rows("loto-isolations");
  const templates=rows("inspection-templates");
  const schedules=rows("inspection-schedules");
  const inspectionTasks=rows("inspection-tasks");
  const observations=rows("safety-observations");
  const equipment=rows("equipment-assets");
  const defects=rows("equipment-defects");
  const contractors=rows("contractors");
  const contractorWorkers=rows("contractor-workers");
  const contractorDocs=rows("contractor-documents");
  const chemicals=rows("chemicals");
  const riskRegister=rows("risk-register");
  const riskControls=rows("risk-controls");
  const floorPlans=rows("site-floor-plans");
  const mapPoints=rows("safety-map-points");
  const qrRecords=rows("safety-qr");
  const reports=rows("monthly-hse-reports");
  const hseEmployees=(hseEmployeesQ.data||[]) as AnyRow[];
  const snapshot=snapshotQ.data||{};
  const anyLoading=snapshotQ.isLoading||Object.values(resourceQueries).some(q=>q.isLoading);

  const invalidateAll=async()=>{
    await Promise.all([
      qc.invalidateQueries({queryKey:["hse-executive-snapshot"]}),
      ...RESOURCE_KEYS.map(key=>qc.invalidateQueries({queryKey:["hse-roadmap",key]}))
    ]);
  };

  const create=async(resource:string,payload:AnyRow)=>{
    const r=await apiRequest("POST",`/api/data?resource=${resource}`,payload);
    const p=await r.json();
    if(!r.ok) throw new Error(p?.error||"Unable to save");
    return p;
  };
  const patch=async(resource:string,id:string,payload:AnyRow)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=${resource}&id=${encodeURIComponent(id)}`,payload);
    const p=await r.json();
    if(!r.ok) throw new Error(p?.error||"Unable to update");
    return p;
  };
  const runAutomation=async(job:string,month?:number,year?:number)=>{
    setAutomationBusy(job);
    try{
      const r=await apiRequest("POST","/api/data?resource=hse-automation",{job,month,year});
      const p=await r.json();
      if(!r.ok) throw new Error(p?.error||"Automation failed");
      toast.success(isAr?`تم تشغيل المهمة: ${job} — النتائج: ${p?.affected??p?.reportNo??0}`:`Automation complete: ${job} — result: ${p?.affected??p?.reportNo??0}`);
      await invalidateAll();
    }catch(e:any){toast.error(e?.message||"Automation failed");}
    finally{setAutomationBusy("");}
  };
  const askAssistant=async()=>{
    if(!assistantQuestion.trim()) return;
    setAssistantBusy(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=hse-data-assistant",{question:assistantQuestion});
      const p=await r.json();
      if(!r.ok) throw new Error(p?.error||"Assistant failed");
      setAssistantAnswer(String(p?.answer||""));
    }catch(e:any){toast.error(e?.message||"Assistant failed");}
    finally{setAssistantBusy(false);}
  };

  const [form,setForm]=useState<AnyRow>({});
  const open=(kind:DialogKind,defaults:AnyRow={})=>{setForm(defaults);setDialog(kind);};

  const saveDialog=async()=>{
    setSaving(true);
    try{
      if(dialog==="action"){
        if(!String(form.title||"").trim()) throw new Error(isAr?"عنوان الإجراء مطلوب":"Action title is required");
        await create("hse-actions",{
          title:String(form.title).trim(),description:form.description||null,sourceType:form.sourceType||"Manual",
          category:form.category||"General",department:form.department||null,factory:form.factory||null,area:form.area||null,
          priority:form.priority||"Medium",status:"Open",progress:0,ownerUserId:form.ownerUserId||currentUser?.id||null,
          assignedEmployeeId:form.assignedEmployeeId||null,dueAt:form.dueAt?new Date(form.dueAt).toISOString():null,
          evidenceRequired:Boolean(form.evidenceRequired),verificationRequired:Boolean(form.verificationRequired),
          createdBy:currentUser?.id||null,metadata:{manual:true}
        });
      }
      if(dialog==="ptw"){
        if(!form.title||!form.permitType) throw new Error(isAr?"نوع وعنوان التصريح مطلوبان":"Permit type and title are required");
        await create("ptw-permits",{
          permitType:form.permitType,title:form.title,description:form.description||null,department:form.department||null,
          factory:form.factory||null,area:form.area||null,location:form.location||null,status:"Draft",
          riskLevel:form.riskLevel||"Medium",startAt:form.startAt?new Date(form.startAt).toISOString():null,
          expiresAt:form.expiresAt?new Date(form.expiresAt).toISOString():null,lotoRequired:Boolean(form.lotoRequired),
          gasTestRequired:Boolean(form.gasTestRequired),precautions:[],requiredPpe:[],signatures:{},gasTestResult:{},
          createdBy:currentUser?.id||null
        });
      }
      if(dialog==="loto"){
        if(!form.equipmentName) throw new Error(isAr?"اسم المعدة مطلوب":"Equipment name is required");
        await create("loto-isolations",{
          permitId:form.permitId||null,equipmentName:form.equipmentName,assetRef:form.assetRef||null,
          department:form.department||null,factory:form.factory||null,area:form.area||null,
          isolationType:form.isolationType||"Electrical",status:"Active",authorizedEmployeeId:form.authorizedEmployeeId||null,
          zeroEnergyVerified:false,startAt:new Date().toISOString(),notes:form.notes||null,createdBy:currentUser?.id||null
        });
      }
      if(dialog==="inspection-schedule"){
        if(!form.templateId||!form.assignedEmployeeId) throw new Error(isAr?"القالب وموظف HSE مطلوبان":"Template and HSE employee are required");
        await create("inspection-schedules",{
          templateId:form.templateId,assignedEmployeeId:form.assignedEmployeeId,factory:form.factory||null,area:form.area||null,
          department:form.department||null,frequency:form.frequency||"Weekly",dayOfWeek:form.dayOfWeek==null?null:Number(form.dayOfWeek),
          dayOfMonth:form.dayOfMonth==null?null:Number(form.dayOfMonth),nextRunDate:form.nextRunDate||today(),active:true,
          createdBy:currentUser?.id||null
        });
      }
      if(dialog==="observation"){
        if(!form.description||!form.observationType) throw new Error(isAr?"نوع ووصف الملاحظة مطلوبان":"Observation type and description are required");
        await create("safety-observations",{
          observerEmployeeId:form.observerEmployeeId||null,observationType:form.observationType,category:form.category||"General",
          department:form.department||null,factory:form.factory||null,area:form.area||null,description:form.description,
          severity:form.severity||"Medium",status:"Open",immediateAction:form.immediateAction||null,photoUrls:[],
          createdBy:currentUser?.id||null
        });
      }
      if(dialog==="equipment"){
        if(!form.assetCode||!form.name||!form.equipmentType) throw new Error(isAr?"الكود والاسم والنوع مطلوبة":"Asset code, name and type are required");
        await create("equipment-assets",{
          assetCode:form.assetCode,name:form.name,equipmentType:form.equipmentType,serialNumber:form.serialNumber||null,
          manufacturer:form.manufacturer||null,model:form.model||null,department:form.department||null,factory:form.factory||null,
          area:form.area||null,status:"Active",riskRating:form.riskRating||"Medium",certificateNumber:form.certificateNumber||null,
          certificateExpiry:form.certificateExpiry||null,nextInspectionDate:form.nextInspectionDate||null,
          nextMaintenanceDate:form.nextMaintenanceDate||null,operatorAuthorizationRequired:Boolean(form.operatorAuthorizationRequired),
          lotoRequired:Boolean(form.lotoRequired),notes:form.notes||null,data:{},createdBy:currentUser?.id||null
        });
      }
      if(dialog==="equipment-defect"){
        if(!form.assetId||!form.description) throw new Error(isAr?"المعدة ووصف العطل مطلوبان":"Asset and defect description are required");
        await create("equipment-defects",{
          assetId:form.assetId,description:form.description,severity:form.severity||"Medium",status:"Open",
          reportedAt:new Date().toISOString(),reportedByEmployeeId:form.reportedByEmployeeId||null
        });
      }
      if(dialog==="contractor"){
        if(!form.name) throw new Error(isAr?"اسم المقاول مطلوب":"Contractor name is required");
        await create("contractors",{
          name:form.name,companyRegistration:form.companyRegistration||null,scopeOfWork:form.scopeOfWork||null,
          mainContact:form.mainContact||null,email:form.email||null,phone:form.phone||null,contractStart:form.contractStart||null,
          contractEnd:form.contractEnd||null,insuranceExpiry:form.insuranceExpiry||null,status:"Conditional",safetyScore:100,
          notes:form.notes||null,createdBy:currentUser?.id||null
        });
      }
      if(dialog==="contractor-worker"){
        if(!form.contractorId||!form.name) throw new Error(isAr?"المقاول واسم العامل مطلوبان":"Contractor and worker name are required");
        await create("contractor-workers",{
          contractorId:form.contractorId,workerNo:form.workerNo||null,name:form.name,nationalId:form.nationalId||null,
          jobTitle:form.jobTitle||null,phone:form.phone||null,inductionDate:form.inductionDate||null,
          inductionExpiry:form.inductionExpiry||null,medicalExpiry:form.medicalExpiry||null,competencyExpiry:form.competencyExpiry||null,
          status:"Active",accessAllowed:false
        });
      }
      if(dialog==="chemical"){
        if(!form.productName) throw new Error(isAr?"اسم المادة مطلوب":"Chemical product name is required");
        await create("chemicals",{
          productName:form.productName,manufacturer:form.manufacturer||null,casNumbers:String(form.casNumbers||"").split(",").map((x:string)=>x.trim()).filter(Boolean),
          hazardClasses:String(form.hazardClasses||"").split(",").map((x:string)=>x.trim()).filter(Boolean),pictograms:[],
          storageArea:form.storageArea||null,compatibilityGroup:form.compatibilityGroup||null,quantity:Number(form.quantity||0),
          unit:form.unit||"L",maxAllowedQuantity:form.maxAllowedQuantity?Number(form.maxAllowedQuantity):null,
          productExpiryDate:form.productExpiryDate||null,riskRating:form.riskRating||"Medium",
          requiredPpe:String(form.requiredPpe||"").split(",").map((x:string)=>x.trim()).filter(Boolean),
          spillResponse:form.spillResponse||null,firstAid:form.firstAid||null,disposalMethod:form.disposalMethod||null,
          status:"Active",notes:form.notes||null,createdBy:currentUser?.id||null
        });
      }
      if(dialog==="chemical-stock"){
        if(!form.chemicalId||!form.transactionType||!form.quantity) throw new Error(isAr?"المادة ونوع الحركة والكمية مطلوبة":"Chemical, transaction and quantity are required");
        await create("chemical-inventory",{
          chemicalId:form.chemicalId,transactionType:form.transactionType,quantity:Number(form.quantity),
          reference:form.reference||null,notes:form.notes||null,recordedBy:currentUser?.id||null
        });
      }
      if(dialog==="risk"){
        if(!form.title||!form.hazard) throw new Error(isAr?"العنوان والخطر مطلوبان":"Title and hazard are required");
        await create("risk-register",{
          title:form.title,hazard:form.hazard,activity:form.activity||null,department:form.department||null,factory:form.factory||null,
          area:form.area||null,ownerUserId:currentUser?.id||null,initialLikelihood:Number(form.initialLikelihood||1),
          initialSeverity:Number(form.initialSeverity||1),residualLikelihood:Number(form.residualLikelihood||1),
          residualSeverity:Number(form.residualSeverity||1),status:"Open",reviewDate:form.reviewDate||null,notes:form.notes||null,
          createdBy:currentUser?.id||null
        });
      }
      if(dialog==="risk-control"){
        if(!form.riskId||!form.description) throw new Error(isAr?"الخطر ووصف الضابط مطلوبان":"Risk and control description are required");
        await create("risk-controls",{
          riskId:form.riskId,controlType:form.controlType||"Administrative",description:form.description,
          ownerEmployeeId:form.ownerEmployeeId||null,dueDate:form.dueDate||null,status:"Planned",effectiveness:"Not Reviewed"
        });
      }
      if(dialog==="floor-plan"){
        if(!form.name||!form.building) throw new Error(isAr?"الاسم والمبنى مطلوبان":"Name and building are required");
        await create("site-floor-plans",{
          name:form.name,building:form.building,floor:form.floor||null,imageUrl:form.imageUrl||null,width:100,height:100,
          active:true,createdBy:currentUser?.id||null
        });
      }
      if(dialog==="map-point"){
        if(!form.floorPlanId||!form.pointType||!form.label) throw new Error(isAr?"الخريطة والنوع والاسم مطلوبة":"Floor plan, point type and label are required");
        await create("safety-map-points",{
          floorPlanId:form.floorPlanId,pointType:form.pointType,label:form.label,resourceType:form.resourceType||null,
          resourceId:form.resourceId||null,mapX:Number(form.mapX||50),mapY:Number(form.mapY||50),status:form.status||"Normal",
          icon:form.icon||null,details:{},createdBy:currentUser?.id||null
        });
      }
      if(dialog==="qr"){
        if(!form.resourceType||!form.resourceId||!form.label||!form.route) throw new Error(isAr?"بيانات QR كاملة مطلوبة":"Complete QR data is required");
        await create("safety-qr",{
          qrCode:form.qrCode||`HSE-${form.resourceType}-${form.resourceId}-${Date.now()}`,resourceType:form.resourceType,
          resourceId:form.resourceId,label:form.label,route:form.route,status:"Active",metadata:{manual:true}
        });
      }

      toast.success(isAr?"تم الحفظ بنجاح":"Saved successfully");
      setDialog(null);setForm({});
      await invalidateAll();
    }catch(e:any){toast.error(e?.message||"Unable to save");}
    finally{setSaving(false);}
  };

  const updateActionStatus=async(a:AnyRow,status:string)=>{
    try{
      const payload:AnyRow={status};
      if(status==="Completed"||status==="Closed"){payload.progress=100;payload.closedAt=new Date().toISOString();}
      await patch("hse-actions",a.id,payload);
      await invalidateAll();
    }catch(e:any){toast.error(e?.message||"Unable to update action");}
  };

  const metrics=[
    {label:isAr?"إجراءات مفتوحة":"Open CAPA",value:num(snapshot?.actions?.open),sub:`${num(snapshot?.actions?.overdue)} ${isAr?"متأخر":"overdue"}`,icon:ClipboardList,tone:"text-red-600"},
    {label:isAr?"تصاريح فعالة":"Active PTW",value:num(snapshot?.ptw?.active),sub:`${num(snapshot?.ptw?.expiring)} ${isAr?"تنتهي خلال 24س":"expire <24h"}`,icon:FileCheck2,tone:"text-sky-600"},
    {label:isAr?"تفتيشات متأخرة":"Overdue Inspections",value:num(snapshot?.inspections?.overdue),sub:`${num(snapshot?.inspections?.open)} ${isAr?"مفتوح":"open"}`,icon:ClipboardCheck,tone:"text-amber-600"},
    {label:isAr?"عيوب معدات":"Equipment Defects",value:num(snapshot?.equipment?.openDefects),sub:`${num(snapshot?.equipment?.certificatesDue)} ${isAr?"شهادة قريبة":"certs due"}`,icon:Wrench,tone:"text-orange-600"},
    {label:isAr?"مخاطر متبقية عالية":"High Residual Risks",value:num(snapshot?.risks?.high),sub:`${num(snapshot?.risks?.open)} ${isAr?"مخاطر مفتوحة":"open risks"}`,icon:ShieldAlert,tone:"text-rose-600"},
    {label:isAr?"حريق / مخارج":"Fire / Exits",value:num(snapshot?.fireEmergency?.activeAlarms)+num(snapshot?.fireEmergency?.criticalExits),sub:`${num(snapshot?.fireEmergency?.activeAlarms)} alarm · ${num(snapshot?.fireEmergency?.criticalExits)} exit`,icon:Siren,tone:"text-red-600"},
  ];

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"><Gauge className="h-6 w-6"/></div>
        <div>
          <h1 className="text-2xl font-bold">{isAr?"مركز عمليات السلامة HSE":"HSE Operations Hub"}</h1>
          <p className="text-xs text-muted-foreground">{isAr?"CAPA، PTW/LOTO، التفتيش، المعدات، المقاولون، المواد، المخاطر، الطوارئ، QR والتقارير":"CAPA, PTW/LOTO, inspections, equipment, contractors, chemicals, risks, emergency, QR and reports"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={()=>void invalidateAll()} disabled={anyLoading}><RefreshCw className={"me-2 h-4 w-4 "+(anyLoading?"animate-spin":"")}/>{isAr?"تحديث":"Refresh"}</Button>
        <Link href="/admin/fire-emergency-command"><Button variant="outline"><Siren className="me-2 h-4 w-4"/>{isAr?"مركز الحريق":"Fire Command"}</Button></Link>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {metrics.map(m=><Card key={m.label}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{m.label}</p><m.icon className={`h-4 w-4 ${m.tone}`}/></div><p className={`mt-1 text-2xl font-bold ${m.tone}`}>{m.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{m.sub}</p></CardContent></Card>)}
    </div>

    {canAutomate&&<Card><CardContent className="flex flex-wrap items-center gap-2 p-3">
      <span className="me-2 text-xs font-semibold">{isAr?"تشغيل المحركات":"Automation"}:</span>
      {[
        ["escalations",isAr?"فحص التصعيدات":"Escalations"],
        ["inspections",isAr?"إنشاء التفتيشات المستحقة":"Generate Inspections"],
        ["contractors",isAr?"تقييم المقاولين":"Contractor Compliance"],
        ["ptw-expiry",isAr?"فحص انتهاء PTW":"PTW Expiry"],
        ["risk-reviews",isAr?"مراجعات المخاطر":"Risk Reviews"]
      ].map(([job,label])=><Button key={job} size="sm" variant="outline" disabled={Boolean(automationBusy)} onClick={()=>void runAutomation(job)}>{automationBusy===job?<RefreshCw className="me-2 h-3 w-3 animate-spin"/>:<Activity className="me-2 h-3 w-3"/>}{label}</Button>)}
    </CardContent></Card>}

    <Tabs defaultValue="actions" className="space-y-4">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1.5">
        <TabsTrigger value="actions">1–2 CAPA</TabsTrigger>
        <TabsTrigger value="ptw">3 PTW/LOTO</TabsTrigger>
        <TabsTrigger value="inspections">4 Inspection</TabsTrigger>
        <TabsTrigger value="equipment">5 Equipment</TabsTrigger>
        <TabsTrigger value="contractors">6 Contractors</TabsTrigger>
        <TabsTrigger value="chemicals">7 Chemicals</TabsTrigger>
        <TabsTrigger value="risks">8 Risks</TabsTrigger>
        <TabsTrigger value="emergency">9 Emergency V2</TabsTrigger>
        <TabsTrigger value="map">10 Map</TabsTrigger>
        <TabsTrigger value="qr">11 QR/Mobile</TabsTrigger>
        <TabsTrigger value="reports">12–13 Dashboard/Report</TabsTrigger>
        <TabsTrigger value="assistant">14 AI</TabsTrigger>
      </TabsList>

      <TabsContent value="actions" className="space-y-4">
        <SectionHeader title={isAr?"CAPA & Action Center":"CAPA & Action Center"} subtitle={isAr?"الإجراء المركزي لكل NCR/Incident/Violation/Inspection/Fire/Equipment":"Central actions from NCR, incidents, violations, inspections, fire and equipment"} canWrite={canWrite} onAdd={()=>open("action",{priority:"Medium",dueAt:isoLocal(72),evidenceRequired:true,verificationRequired:true})} addLabel={isAr?"إجراء جديد":"New Action"}/>
        <Card><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>{isAr?"الإجراء":"Action"}</TableHead><TableHead>{isAr?"المصدر":"Source"}</TableHead><TableHead>{isAr?"الأولوية":"Priority"}</TableHead><TableHead>{isAr?"الموعد":"Due"}</TableHead><TableHead>{isAr?"التصعيد":"Esc."}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{actions.map(a=><TableRow key={a.id}><TableCell className="text-xs">{a.actionNo}</TableCell><TableCell><p className="font-medium">{a.title}</p><p className="max-w-xs truncate text-xs text-muted-foreground">{a.description||"—"}</p></TableCell><TableCell>{a.sourceType||"—"}</TableCell><TableCell><Badge variant="outline" className={statusTone(a.priority)}>{a.priority}</Badge></TableCell><TableCell className={a.dueAt&&new Date(a.dueAt)<new Date()&&!["Completed","Closed","Cancelled"].includes(a.status)?"text-red-600 font-medium":""}>{fmt(a.dueAt)}</TableCell><TableCell>{a.escalationLevel||0}</TableCell><TableCell>{canWrite?<Select value={a.status} onValueChange={v=>void updateActionStatus(a,v)}><SelectTrigger className="h-8 w-32"><SelectValue/></SelectTrigger><SelectContent>{["Open","In Progress","Completed","Closed","Cancelled"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>:<Badge variant="outline">{a.status}</Badge>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-sm">{isAr?"قواعد التصعيد":"Escalation Rules"}</CardTitle></CardHeader><CardContent className="space-y-2">{rules.map(r=><div key={r.id} className="flex items-center justify-between rounded-lg border p-2 text-xs"><div><p className="font-medium">{r.name}</p><p className="text-muted-foreground">{r.priority} · &gt; {r.overdueHours}h → {r.targetRole}</p></div><Badge variant="outline">{r.escalationLevel}</Badge></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">{isAr?"آخر التصعيدات":"Recent Escalations"}</CardTitle></CardHeader><CardContent className="space-y-2">{escalations.slice(0,8).map(e=><div key={e.id} className="rounded-lg border p-2 text-xs"><div className="flex justify-between"><span className="font-medium">L{e.escalationLevel} → {e.targetRole}</span><Badge variant="outline" className={statusTone(e.status)}>{e.status}</Badge></div><p className="mt-1 text-muted-foreground">{e.reason}</p></div>)}</CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="ptw" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <ModuleCard icon={FileCheck2} title="Permit-to-Work" value={permits.filter(x=>x.status==="Active").length} detail={isAr?"تصاريح فعالة":"Active permits"} action={canWrite?<Button size="sm" onClick={()=>open("ptw",{permitType:"Hot Work",riskLevel:"Medium",startAt:isoLocal(),expiresAt:isoLocal(8)})}><Plus className="me-1 h-3 w-3"/>PTW</Button>:null}/>
          <ModuleCard icon={Lock} title="LOTO" value={isolations.filter(x=>["Active","Verified"].includes(x.status)).length} detail={isAr?"عزل فعال / متحقق":"Active / verified isolations"} action={canWrite?<Button size="sm" onClick={()=>open("loto",{isolationType:"Electrical"})}><Plus className="me-1 h-3 w-3"/>LOTO</Button>:null}/>
        </div>
        <RecordTable rows={permits} columns={[
          ["permitNo","PTW No."],["permitType",isAr?"النوع":"Type"],["title",isAr?"العمل":"Work"],["area",isAr?"الموقع":"Area"],["riskLevel",isAr?"الخطورة":"Risk"],["status",isAr?"الحالة":"Status"],["expiresAt",isAr?"الانتهاء":"Expiry"]
        ]}/>
        <RecordTable rows={isolations} columns={[
          ["lotoNo","LOTO No."],["equipmentName",isAr?"المعدة":"Equipment"],["isolationType",isAr?"نوع الطاقة":"Isolation"],["zeroEnergyVerified",isAr?"صفر طاقة":"Zero Energy"],["status",isAr?"الحالة":"Status"],["startAt",isAr?"البداية":"Start"]
        ]}/>
      </TabsContent>

      <TabsContent value="inspections" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>open("inspection-schedule",{frequency:"Weekly",nextRunDate:today()})}><CalendarDays className="me-2 h-4 w-4"/>{isAr?"جدولة تفتيش":"Schedule Inspection"}</Button><Button onClick={()=>open("observation",{observationType:"Unsafe Condition",severity:"Medium",category:"General"})}><Plus className="me-2 h-4 w-4"/>{isAr?"ملاحظة / Near Miss":"Observation / Near Miss"}</Button></>}</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-sm">{isAr?"جداول التفتيش":"Inspection Schedules"}</CardTitle></CardHeader><CardContent><RecordTable rows={schedules} compact columns={[["frequency","Frequency"],["factory","Factory"],["area","Area"],["nextRunDate","Next"],["active","Active"]]}/></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">{isAr?"مهام التفتيش":"Inspection Tasks"}</CardTitle></CardHeader><CardContent><RecordTable rows={inspectionTasks} compact columns={[["title","Title"],["area","Area"],["dueDate","Due"],["result","Result"],["status","Status"]]}/></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">{isAr?"الملاحظات وشبه الحوادث":"Observations & Near Misses"}</CardTitle></CardHeader><CardContent><RecordTable rows={observations} columns={[["observationNo","No."],["observationType","Type"],["category","Category"],["area","Area"],["severity","Severity"],["status","Status"]]}/></CardContent></Card>
      </TabsContent>

      <TabsContent value="equipment" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>open("equipment",{equipmentType:"Forklift",riskRating:"Medium"})}><Plus className="me-2 h-4 w-4"/>{isAr?"إضافة معدة":"Add Asset"}</Button><Button onClick={()=>open("equipment-defect",{severity:"Medium"})}><AlertTriangle className="me-2 h-4 w-4"/>{isAr?"تسجيل عطل":"Log Defect"}</Button></>}</div>
        <RecordTable rows={equipment} columns={[["assetCode","Asset"],["name","Name"],["equipmentType","Type"],["factory","Factory"],["riskRating","Risk"],["certificateExpiry","Certificate"],["nextMaintenanceDate","Next Service"],["status","Status"]]}/>
        <Card><CardHeader><CardTitle className="text-sm">{isAr?"العيوب المفتوحة":"Equipment Defects"}</CardTitle></CardHeader><CardContent><RecordTable compact rows={defects} columns={[["defectNo","Defect"],["description","Description"],["severity","Severity"],["status","Status"],["reportedAt","Reported"]]}/></CardContent></Card>
      </TabsContent>

      <TabsContent value="contractors" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>open("contractor",{})}><Building2 className="me-2 h-4 w-4"/>{isAr?"إضافة مقاول":"Add Contractor"}</Button><Button onClick={()=>open("contractor-worker",{})}><UsersRound className="me-2 h-4 w-4"/>{isAr?"إضافة عامل":"Add Worker"}</Button></>}</div>
        <RecordTable rows={contractors} columns={[["contractorCode","Code"],["name","Contractor"],["scopeOfWork","Scope"],["contractEnd","Contract End"],["insuranceExpiry","Insurance"],["safetyScore","Score"],["status","Status"]]}/>
        <Card><CardHeader><CardTitle className="text-sm">{isAr?"عمال المقاولين":"Contractor Workers"}</CardTitle></CardHeader><CardContent><RecordTable compact rows={contractorWorkers} columns={[["workerNo","No."],["name","Name"],["jobTitle","Job"],["inductionExpiry","Induction"],["medicalExpiry","Medical"],["accessAllowed","Access"],["blockReason","Block Reason"]]}/></CardContent></Card>
      </TabsContent>

      <TabsContent value="chemicals" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>open("chemical",{riskRating:"Medium",unit:"L"})}><FlaskConical className="me-2 h-4 w-4"/>{isAr?"إضافة مادة":"Add Chemical"}</Button><Button onClick={()=>open("chemical-stock",{transactionType:"IN"})}><PackageCheck className="me-2 h-4 w-4"/>{isAr?"حركة مخزون":"Stock Movement"}</Button></>}</div>
        <RecordTable rows={chemicals} columns={[["chemicalCode","Code"],["productName","Product"],["storageArea","Storage"],["quantity","Qty"],["unit","Unit"],["riskRating","Risk"],["productExpiryDate","Expiry"],["status","Status"]]}/>
      </TabsContent>

      <TabsContent value="risks" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>open("risk",{initialLikelihood:3,initialSeverity:3,residualLikelihood:2,residualSeverity:2,reviewDate:today()})}><ShieldAlert className="me-2 h-4 w-4"/>{isAr?"إضافة خطر":"Add Risk"}</Button><Button onClick={()=>open("risk-control",{controlType:"Administrative"})}><ShieldCheck className="me-2 h-4 w-4"/>{isAr?"إضافة ضابط":"Add Control"}</Button></>}</div>
        <RecordTable rows={riskRegister} columns={[["riskNo","No."],["title","Risk"],["hazard","Hazard"],["department","Department"],["initialLevel","Initial"],["residualLevel","Residual"],["reviewDate","Review"],["status","Status"]]}/>
        <Card><CardHeader><CardTitle className="text-sm">{isAr?"ضوابط المخاطر":"Risk Controls"}</CardTitle></CardHeader><CardContent><RecordTable compact rows={riskControls} columns={[["controlType","Hierarchy"],["description","Control"],["dueDate","Due"],["status","Status"],["effectiveness","Effectiveness"]]}/></CardContent></Card>
      </TabsContent>

      <TabsContent value="emergency" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <ModuleCard icon={Siren} title={isAr?"مركز الحريق":"Fire Command"} value={num(snapshot?.fireEmergency?.activeAlarms)} detail={isAr?"إنذارات حريق فعالة":"active fire alarms"} action={<Link href="/admin/fire-emergency-command"><Button size="sm">{isAr?"فتح":"Open"}</Button></Link>}/>
          <ModuleCard icon={UsersRound} title={isAr?"الاستجابة والطوارئ":"Emergency Response"} value={rows("emergency-responses").filter(x=>x.status==="Active").length} detail={isAr?"استجابات فعالة":"active responses"}/>
          <ModuleCard icon={Factory} title={isAr?"نقاط التجمع":"Assembly Points"} value={rows("assembly-points").length} detail={isAr?"نقاط معرفة بالنظام":"registered points"}/>
        </div>
        <RecordTable rows={rows("emergency-responses")} columns={[["responseNo","Response"],["title","Title"],["severity","Severity"],["area","Area"],["expectedCount","Expected"],["accountedCount","Accounted"],["missingCount","Missing"],["status","Status"]]}/>
      </TabsContent>

      <TabsContent value="map" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>open("floor-plan",{})}><Map className="me-2 h-4 w-4"/>{isAr?"إضافة مخطط":"Add Floor Plan"}</Button><Button onClick={()=>open("map-point",{pointType:"Emergency Exit",mapX:50,mapY:50,status:"Normal"})}><Plus className="me-2 h-4 w-4"/>{isAr?"إضافة نقطة":"Add Point"}</Button></>}</div>
        {floorPlans.length===0?<Empty label={isAr?"أضف مخطط المصنع لبدء Safety Map":"Add a factory floor plan to start the Safety Map"}/>:floorPlans.map(plan=><Card key={plan.id}><CardHeader><CardTitle className="text-sm">{plan.name} — {plan.building} {plan.floor||""}</CardTitle></CardHeader><CardContent><div className="relative aspect-[16/8] overflow-hidden rounded-xl border bg-muted/30">{plan.imageUrl?<img src={plan.imageUrl} alt={plan.name} className="absolute inset-0 h-full w-full object-contain"/>:<div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{isAr?"لم تتم إضافة صورة للمخطط":"No floor plan image uploaded"}</div>}{mapPoints.filter(p=>p.floorPlanId===plan.id).map(p=><div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{left:`${Number(p.mapX)}%`,top:`${Number(p.mapY)}%`}} title={p.label}><div className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white shadow ${String(p.status).toLowerCase()==="normal"?"bg-emerald-500":"bg-red-500"} text-white`}><Map className="h-4 w-4"/></div><p className="mt-1 max-w-24 truncate rounded bg-background/90 px-1 text-[9px] shadow">{p.label}</p></div>)}</div></CardContent></Card>)}
      </TabsContent>

      <TabsContent value="qr" className="space-y-4">
        <div className="flex justify-end">{canWrite&&<Button onClick={()=>open("qr",{})}><QrCode className="me-2 h-4 w-4"/>{isAr?"QR جديد":"New QR"}</Button>}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{qrRecords.slice(0,60).map(q=><Card key={q.id}><CardContent className="flex gap-3 p-4"><div className="rounded-lg bg-white p-2"><QRCodeSVG size={76} value={q.route||q.qrCode}/></div><div className="min-w-0"><p className="truncate font-medium">{q.label}</p><p className="text-xs text-muted-foreground">{q.resourceType}</p><p className="mt-2 break-all text-[10px] text-muted-foreground">{q.qrCode}</p><Badge variant="outline" className="mt-2">{q.status}</Badge></div></CardContent></Card>)}</div>
      </TabsContent>

      <TabsContent value="reports" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">{isAr?"Executive HSE Snapshot":"Executive HSE Snapshot"}</CardTitle></CardHeader><CardContent><pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs">{JSON.stringify(snapshot,null,2)}</pre></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{isAr?"التقرير الشهري التلقائي":"Automatic Monthly HSE Report"}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{isAr?"يجمع بيانات CAPA وPTW والتفتيش والمعدات والمقاولين والمخاطر والحريق تلقائيًا.":"Aggregates CAPA, PTW, inspections, equipment, contractors, risks and fire data."}</p>{canAutomate&&<Button disabled={Boolean(automationBusy)} onClick={()=>{const d=new Date();void runAutomation("monthly-report",d.getMonth()+1,d.getFullYear());}}><FileText className="me-2 h-4 w-4"/>{isAr?"إنشاء / تحديث تقرير هذا الشهر":"Generate / Refresh Current Month"}</Button>}<RecordTable compact rows={reports} columns={[["reportNo","Report"],["month","Month"],["year","Year"],["status","Status"],["generatedAt","Generated"]]}/></CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="assistant" className="space-y-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5"/>{isAr?"مساعد بيانات HSE":"HSE Data Assistant"}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><Input value={assistantQuestion} onChange={e=>setAssistantQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") void askAssistant();}} placeholder={isAr?"مثال: ما الإجراءات المتأخرة؟ أو أي معدات شهادتها تنتهي؟":"Example: What actions are overdue? Which equipment certificates are due?"}/><Button onClick={()=>void askAssistant()} disabled={assistantBusy||!assistantQuestion.trim()}>{assistantBusy?<RefreshCw className="me-2 h-4 w-4 animate-spin"/>:<Sparkles className="me-2 h-4 w-4"/>}{isAr?"تحليل":"Analyze"}</Button></div>{assistantAnswer&&<div className="rounded-xl border bg-muted/30 p-4 text-sm leading-7">{assistantAnswer}</div>}<div className="flex flex-wrap gap-2">{[
          isAr?"ما الإجراءات المتأخرة؟":"What actions are overdue?",
          isAr?"حالة تصاريح العمل":"PTW status",
          isAr?"المعدات والشهادات":"Equipment and certificates",
          isAr?"المخاطر العالية":"High risks",
          isAr?"حالة الحريق والمخارج":"Fire and exit status"
        ].map(q=><Button key={q} size="sm" variant="outline" onClick={()=>setAssistantQuestion(q)}>{q}</Button>)}</div></CardContent></Card>
      </TabsContent>
    </Tabs>

    <OperationDialog open={dialog!==null} kind={dialog} form={form} setForm={setForm} onClose={()=>{setDialog(null);setForm({});}} onSave={()=>void saveDialog()} saving={saving} isAr={isAr}
      actions={actions} permits={permits} templates={templates} hseEmployees={hseEmployees} equipment={equipment} contractors={contractors}
      chemicals={chemicals} risks={riskRegister} floorPlans={floorPlans}/>
  </div>;
}

function SectionHeader({title,subtitle,canWrite,onAdd,addLabel}:{title:string;subtitle:string;canWrite:boolean;onAdd:()=>void;addLabel:string}){
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p></div>{canWrite&&<Button onClick={onAdd}><Plus className="me-2 h-4 w-4"/>{addLabel}</Button>}</div>;
}
function ModuleCard({icon:Icon,title,value,detail,action}:{icon:any;title:string;value:number;detail:string;action?:any}){
  return <Card><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div><div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5"/></div></div>{action&&<div className="mt-3">{action}</div>}</CardContent></Card>;
}
function Empty({label}:{label:string}){return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{label}</CardContent></Card>;}
function display(value:any){
  if(value===null||value===undefined||value==="") return "—";
  if(typeof value==="boolean") return value?"Yes":"No";
  if(typeof value==="object") return Array.isArray(value)?value.join(", "):JSON.stringify(value);
  if(typeof value==="string"&&/T\d{2}:\d{2}/.test(value)) return fmt(value);
  return String(value);
}
function RecordTable({rows,columns,compact=false}:{rows:AnyRow[];columns:[string,string][];compact?:boolean}){
  if(!rows.length) return <p className="py-8 text-center text-xs text-muted-foreground">No records yet</p>;
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow>{columns.map(c=><TableHead key={c[0]}>{c[1]}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.slice(0,compact?20:100).map((row,i)=><TableRow key={row.id||i}>{columns.map(([key])=><TableCell key={key} className={compact?"text-xs":""}>{key.toLowerCase().includes("status")||key.toLowerCase().includes("level")||key.toLowerCase().includes("severity")||key.toLowerCase().includes("risk")?<Badge variant="outline" className={statusTone(String(row[key]??""))}>{display(row[key])}</Badge>:display(row[key])}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}

function Field({label,children,span=false}:{label:string;children:any;span?:boolean}){return <div className={`space-y-1 ${span?"sm:col-span-2":""}`}><Label>{label}</Label>{children}</div>;}
function txt(form:AnyRow,setForm:(v:AnyRow)=>void,key:string,placeholder=""){return <Input value={form[key]??""} placeholder={placeholder} onChange={e=>setForm({...form,[key]:e.target.value})}/>;}
function textarea(form:AnyRow,setForm:(v:AnyRow)=>void,key:string){return <Textarea value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/>;}
function sel(form:AnyRow,setForm:(v:AnyRow)=>void,key:string,values:string[]){return <Select value={String(form[key]??values[0])} onValueChange={v=>setForm({...form,[key]:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{values.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>;}

function OperationDialog(props:{open:boolean;kind:DialogKind|null;form:AnyRow;setForm:(v:AnyRow)=>void;onClose:()=>void;onSave:()=>void;saving:boolean;isAr:boolean;actions:AnyRow[];permits:AnyRow[];templates:AnyRow[];hseEmployees:AnyRow[];equipment:AnyRow[];contractors:AnyRow[];chemicals:AnyRow[];risks:AnyRow[];floorPlans:AnyRow[]}){
  const {open,kind,form,setForm,onClose,onSave,saving,isAr,permits,templates,hseEmployees,equipment,contractors,chemicals,risks,floorPlans}=props;
  if(!kind) return null;
  const title:Record<DialogKind,string>={
    action:isAr?"إجراء CAPA جديد":"New CAPA Action",ptw:isAr?"تصريح عمل جديد":"New Permit-to-Work",loto:isAr?"عزل LOTO جديد":"New LOTO Isolation",
    "inspection-schedule":isAr?"جدولة تفتيش":"Schedule Inspection",observation:isAr?"ملاحظة سلامة / Near Miss":"Safety Observation / Near Miss",
    equipment:isAr?"إضافة معدة":"Add Equipment","equipment-defect":isAr?"تسجيل عيب معدة":"Log Equipment Defect",
    contractor:isAr?"إضافة مقاول":"Add Contractor","contractor-worker":isAr?"إضافة عامل مقاول":"Add Contractor Worker",
    chemical:isAr?"إضافة مادة كيميائية":"Add Chemical","chemical-stock":isAr?"حركة مخزون كيميائي":"Chemical Stock Movement",
    risk:isAr?"إضافة خطر للسجل":"Add Risk","risk-control":isAr?"إضافة ضابط خطر":"Add Risk Control",
    "floor-plan":isAr?"إضافة مخطط مصنع":"Add Floor Plan","map-point":isAr?"إضافة نقطة للخريطة":"Add Map Point",qr:isAr?"إنشاء QR":"Create QR"
  };
  return <Dialog open={open} onOpenChange={v=>!v&&onClose()}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{title[kind]}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
    {kind==="action"&&<><Field label={isAr?"العنوان":"Title"} span>{txt(form,setForm,"title")}</Field><Field label={isAr?"الوصف":"Description"} span>{textarea(form,setForm,"description")}</Field><Field label={isAr?"المصدر":"Source"}>{sel(form,setForm,"sourceType",["Manual","NCR","Incident","Violation","Inspection","Observation","Fire","Equipment","Risk"])}</Field><Field label={isAr?"الأولوية":"Priority"}>{sel(form,setForm,"priority",["Low","Medium","High","Critical"])}</Field><Field label={isAr?"القسم":"Department"}>{txt(form,setForm,"department")}</Field><Field label={isAr?"المصنع":"Factory"}>{txt(form,setForm,"factory")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field><Field label={isAr?"الموعد":"Due"}><Input type="datetime-local" value={form.dueAt??""} onChange={e=>setForm({...form,dueAt:e.target.value})}/></Field><Field label={isAr?"موظف HSE":"HSE Employee"}><Select value={form.assignedEmployeeId||"none"} onValueChange={v=>setForm({...form,assignedEmployeeId:v==="none"?null:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{hseEmployees.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></Field></>}
    {kind==="ptw"&&<><Field label={isAr?"نوع التصريح":"Permit Type"}>{sel(form,setForm,"permitType",["Hot Work","Electrical","Work at Height","Confined Space","Excavation","Lifting","General"])}</Field><Field label={isAr?"مستوى الخطر":"Risk Level"}>{sel(form,setForm,"riskLevel",["Low","Medium","High","Critical"])}</Field><Field label={isAr?"عنوان العمل":"Work Title"} span>{txt(form,setForm,"title")}</Field><Field label={isAr?"الوصف":"Description"} span>{textarea(form,setForm,"description")}</Field><Field label={isAr?"القسم":"Department"}>{txt(form,setForm,"department")}</Field><Field label={isAr?"المصنع":"Factory"}>{txt(form,setForm,"factory")}</Field><Field label={isAr?"الموقع":"Location"}>{txt(form,setForm,"location")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field><Field label={isAr?"البداية":"Start"}><Input type="datetime-local" value={form.startAt??""} onChange={e=>setForm({...form,startAt:e.target.value})}/></Field><Field label={isAr?"الانتهاء":"Expiry"}><Input type="datetime-local" value={form.expiresAt??""} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></Field><Field label="LOTO Required">{sel(form,setForm,"lotoRequired",["false","true"])}</Field><Field label="Gas Test Required">{sel(form,setForm,"gasTestRequired",["false","true"])}</Field></>}
    {kind==="loto"&&<><Field label={isAr?"المعدة":"Equipment"} span>{txt(form,setForm,"equipmentName")}</Field><Field label={isAr?"التصريح":"PTW"}><Select value={form.permitId||"none"} onValueChange={v=>setForm({...form,permitId:v==="none"?null:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{permits.map(p=><SelectItem key={p.id} value={p.id}>{p.permitNo} — {p.title}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"نوع العزل":"Isolation Type"}>{sel(form,setForm,"isolationType",["Electrical","Mechanical","Hydraulic","Pneumatic","Chemical","Thermal","Multiple"])}</Field><Field label={isAr?"القسم":"Department"}>{txt(form,setForm,"department")}</Field><Field label={isAr?"المصنع":"Factory"}>{txt(form,setForm,"factory")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field><Field label={isAr?"ملاحظات":"Notes"} span>{textarea(form,setForm,"notes")}</Field></>}
    {kind==="inspection-schedule"&&<><Field label={isAr?"قالب التفتيش":"Template"}><Select value={form.templateId||""} onValueChange={v=>setForm({...form,templateId:v})}><SelectTrigger><SelectValue placeholder="Template"/></SelectTrigger><SelectContent>{templates.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"موظف HSE":"HSE Inspector"}><Select value={form.assignedEmployeeId||""} onValueChange={v=>setForm({...form,assignedEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{hseEmployees.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"التكرار":"Frequency"}>{sel(form,setForm,"frequency",["Daily","Weekly","Monthly"])}</Field><Field label={isAr?"التشغيل القادم":"Next Run"}><Input type="date" value={form.nextRunDate??""} onChange={e=>setForm({...form,nextRunDate:e.target.value})}/></Field><Field label={isAr?"المصنع":"Factory"}>{txt(form,setForm,"factory")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field></>}
    {kind==="observation"&&<><Field label={isAr?"النوع":"Type"}>{sel(form,setForm,"observationType",["Unsafe Condition","Unsafe Act","Near Miss","Positive Observation"])}</Field><Field label={isAr?"الشدة":"Severity"}>{sel(form,setForm,"severity",["Low","Medium","High","Critical"])}</Field><Field label={isAr?"الفئة":"Category"}>{txt(form,setForm,"category")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field><Field label={isAr?"الوصف":"Description"} span>{textarea(form,setForm,"description")}</Field><Field label={isAr?"الإجراء الفوري":"Immediate Action"} span>{textarea(form,setForm,"immediateAction")}</Field></>}
    {kind==="equipment"&&<><Field label="Asset Code">{txt(form,setForm,"assetCode")}</Field><Field label={isAr?"الاسم":"Name"}>{txt(form,setForm,"name")}</Field><Field label={isAr?"النوع":"Type"}>{sel(form,setForm,"equipmentType",["Forklift","Overhead Crane","Machine","Manlift","MEWP","Generator","Fire Equipment","Other"])}</Field><Field label={isAr?"المخاطر":"Risk"}>{sel(form,setForm,"riskRating",["Low","Medium","High","Critical"])}</Field><Field label="Serial">{txt(form,setForm,"serialNumber")}</Field><Field label="Manufacturer">{txt(form,setForm,"manufacturer")}</Field><Field label={isAr?"المصنع":"Factory"}>{txt(form,setForm,"factory")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field><Field label={isAr?"انتهاء الشهادة":"Certificate Expiry"}><Input type="date" value={form.certificateExpiry??""} onChange={e=>setForm({...form,certificateExpiry:e.target.value})}/></Field><Field label={isAr?"التفتيش القادم":"Next Inspection"}><Input type="date" value={form.nextInspectionDate??""} onChange={e=>setForm({...form,nextInspectionDate:e.target.value})}/></Field></>}
    {kind==="equipment-defect"&&<><Field label={isAr?"المعدة":"Asset"}><Select value={form.assetId||""} onValueChange={v=>setForm({...form,assetId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{equipment.map(e=><SelectItem key={e.id} value={e.id}>{e.assetCode} — {e.name}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"الشدة":"Severity"}>{sel(form,setForm,"severity",["Low","Medium","High","Critical"])}</Field><Field label={isAr?"الوصف":"Description"} span>{textarea(form,setForm,"description")}</Field></>}
    {kind==="contractor"&&<><Field label={isAr?"اسم المقاول":"Contractor Name"}>{txt(form,setForm,"name")}</Field><Field label={isAr?"السجل التجاري":"Registration"}>{txt(form,setForm,"companyRegistration")}</Field><Field label={isAr?"نطاق العمل":"Scope"} span>{textarea(form,setForm,"scopeOfWork")}</Field><Field label={isAr?"المسؤول":"Contact"}>{txt(form,setForm,"mainContact")}</Field><Field label="Phone">{txt(form,setForm,"phone")}</Field><Field label={isAr?"بداية العقد":"Contract Start"}><Input type="date" value={form.contractStart??""} onChange={e=>setForm({...form,contractStart:e.target.value})}/></Field><Field label={isAr?"نهاية العقد":"Contract End"}><Input type="date" value={form.contractEnd??""} onChange={e=>setForm({...form,contractEnd:e.target.value})}/></Field><Field label={isAr?"انتهاء التأمين":"Insurance Expiry"}><Input type="date" value={form.insuranceExpiry??""} onChange={e=>setForm({...form,insuranceExpiry:e.target.value})}/></Field></>}
    {kind==="contractor-worker"&&<><Field label={isAr?"المقاول":"Contractor"}><Select value={form.contractorId||""} onValueChange={v=>setForm({...form,contractorId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{contractors.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"الاسم":"Name"}>{txt(form,setForm,"name")}</Field><Field label={isAr?"رقم العامل":"Worker No."}>{txt(form,setForm,"workerNo")}</Field><Field label={isAr?"المهنة":"Job Title"}>{txt(form,setForm,"jobTitle")}</Field><Field label={isAr?"انتهاء التعريف":"Induction Expiry"}><Input type="date" value={form.inductionExpiry??""} onChange={e=>setForm({...form,inductionExpiry:e.target.value})}/></Field><Field label={isAr?"انتهاء الطبي":"Medical Expiry"}><Input type="date" value={form.medicalExpiry??""} onChange={e=>setForm({...form,medicalExpiry:e.target.value})}/></Field></>}
    {kind==="chemical"&&<><Field label={isAr?"اسم المادة":"Product Name"}>{txt(form,setForm,"productName")}</Field><Field label="Manufacturer">{txt(form,setForm,"manufacturer")}</Field><Field label="CAS (comma separated)">{txt(form,setForm,"casNumbers")}</Field><Field label={isAr?"تصنيفات الخطر":"Hazard Classes"}>{txt(form,setForm,"hazardClasses")}</Field><Field label={isAr?"منطقة التخزين":"Storage Area"}>{txt(form,setForm,"storageArea")}</Field><Field label={isAr?"مجموعة التوافق":"Compatibility Group"}>{txt(form,setForm,"compatibilityGroup")}</Field><Field label={isAr?"الكمية":"Quantity"}><Input type="number" value={form.quantity??0} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field><Field label="Unit">{sel(form,setForm,"unit",["L","kg","pcs","m3"])}</Field><Field label={isAr?"الخطورة":"Risk Rating"}>{sel(form,setForm,"riskRating",["Low","Medium","High","Critical"])}</Field><Field label={isAr?"انتهاء المنتج":"Expiry"}><Input type="date" value={form.productExpiryDate??""} onChange={e=>setForm({...form,productExpiryDate:e.target.value})}/></Field><Field label="PPE">{txt(form,setForm,"requiredPpe","Gloves,Goggles")}</Field><Field label={isAr?"استجابة الانسكاب":"Spill Response"} span>{textarea(form,setForm,"spillResponse")}</Field></>}
    {kind==="chemical-stock"&&<><Field label={isAr?"المادة":"Chemical"}><Select value={form.chemicalId||""} onValueChange={v=>setForm({...form,chemicalId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{chemicals.map(c=><SelectItem key={c.id} value={c.id}>{c.chemicalCode} — {c.productName}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"الحركة":"Transaction"}>{sel(form,setForm,"transactionType",["IN","OUT","ADJUSTMENT","DISPOSAL"])}</Field><Field label={isAr?"الكمية":"Quantity"}><Input type="number" value={form.quantity??""} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field><Field label={isAr?"المرجع":"Reference"}>{txt(form,setForm,"reference")}</Field></>}
    {kind==="risk"&&<><Field label={isAr?"العنوان":"Title"}>{txt(form,setForm,"title")}</Field><Field label={isAr?"النشاط":"Activity"}>{txt(form,setForm,"activity")}</Field><Field label={isAr?"الخطر":"Hazard"} span>{textarea(form,setForm,"hazard")}</Field><Field label={isAr?"القسم":"Department"}>{txt(form,setForm,"department")}</Field><Field label={isAr?"المنطقة":"Area"}>{txt(form,setForm,"area")}</Field><Field label="Initial Likelihood (1-5)"><Input type="number" min={1} max={5} value={form.initialLikelihood??1} onChange={e=>setForm({...form,initialLikelihood:e.target.value})}/></Field><Field label="Initial Severity (1-5)"><Input type="number" min={1} max={5} value={form.initialSeverity??1} onChange={e=>setForm({...form,initialSeverity:e.target.value})}/></Field><Field label="Residual Likelihood"><Input type="number" min={1} max={5} value={form.residualLikelihood??1} onChange={e=>setForm({...form,residualLikelihood:e.target.value})}/></Field><Field label="Residual Severity"><Input type="number" min={1} max={5} value={form.residualSeverity??1} onChange={e=>setForm({...form,residualSeverity:e.target.value})}/></Field><Field label={isAr?"المراجعة":"Review"}><Input type="date" value={form.reviewDate??""} onChange={e=>setForm({...form,reviewDate:e.target.value})}/></Field></>}
    {kind==="risk-control"&&<><Field label={isAr?"الخطر":"Risk"} span><Select value={form.riskId||""} onValueChange={v=>setForm({...form,riskId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{risks.map(r=><SelectItem key={r.id} value={r.id}>{r.riskNo} — {r.title}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"نوع الضابط":"Control Type"}>{sel(form,setForm,"controlType",["Elimination","Substitution","Engineering","Administrative","PPE"])}</Field><Field label={isAr?"موعد التنفيذ":"Due"}><Input type="date" value={form.dueDate??""} onChange={e=>setForm({...form,dueDate:e.target.value})}/></Field><Field label={isAr?"الوصف":"Description"} span>{textarea(form,setForm,"description")}</Field></>}
    {kind==="floor-plan"&&<><Field label={isAr?"الاسم":"Name"}>{txt(form,setForm,"name")}</Field><Field label={isAr?"المبنى":"Building"}>{txt(form,setForm,"building")}</Field><Field label={isAr?"الطابق":"Floor"}>{txt(form,setForm,"floor")}</Field><Field label={isAr?"رابط صورة المخطط":"Image URL"}>{txt(form,setForm,"imageUrl")}</Field></>}
    {kind==="map-point"&&<><Field label={isAr?"المخطط":"Floor Plan"} span><Select value={form.floorPlanId||""} onValueChange={v=>setForm({...form,floorPlanId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{floorPlans.map(p=><SelectItem key={p.id} value={p.id}>{p.name} — {p.building}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"النوع":"Point Type"}>{sel(form,setForm,"pointType",["Fire Device","Emergency Exit","Extinguisher","First Aid","Spill Kit","Chemical","High Risk","Equipment","Assembly Point"])}</Field><Field label={isAr?"الاسم":"Label"}>{txt(form,setForm,"label")}</Field><Field label="X %"><Input type="number" min={0} max={100} value={form.mapX??50} onChange={e=>setForm({...form,mapX:e.target.value})}/></Field><Field label="Y %"><Input type="number" min={0} max={100} value={form.mapY??50} onChange={e=>setForm({...form,mapY:e.target.value})}/></Field></>}
    {kind==="qr"&&<><Field label={isAr?"نوع السجل":"Resource Type"}>{txt(form,setForm,"resourceType")}</Field><Field label={isAr?"المعرف":"Resource ID"}>{txt(form,setForm,"resourceId")}</Field><Field label={isAr?"الاسم":"Label"}>{txt(form,setForm,"label")}</Field><Field label={isAr?"المسار":"Route"}>{txt(form,setForm,"route","/admin/...")}</Field></>}
  </div><DialogFooter><Button variant="outline" onClick={onClose}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={onSave} disabled={saving}>{saving?<RefreshCw className="me-2 h-4 w-4 animate-spin"/>:<CheckCircle2 className="me-2 h-4 w-4"/>}{isAr?"حفظ":"Save"}</Button></DialogFooter></DialogContent></Dialog>;
}
