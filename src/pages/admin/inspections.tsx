import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Eye, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Template={id:string;name:string;category:string;description?:string|null;checklist:any[];active:boolean;};
type Schedule={id:string;templateId:string;assignedEmployeeId?:string|null;factory?:string|null;area?:string|null;department?:string|null;frequency:string;nextRunDate:string;active:boolean;};
type Task={id:string;scheduleId?:string|null;templateId?:string|null;inspectorEmployeeId?:string|null;title:string;department?:string|null;factory?:string|null;area?:string|null;dueDate:string;status:string;result:string;findings:any[];notes?:string|null;actionId?:string|null;};
type Observation={id:string;observationNo:string;observedAt:string;observerEmployeeId?:string|null;observationType:string;category:string;department?:string|null;factory?:string|null;area?:string|null;description:string;severity:string;status:string;immediateAction?:string|null;actionId?:string|null;};
type Employee={id:string;name:string;employeeId?:string|null;title?:string|null;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const tone=(v:string)=>{const x=String(v||"").toLowerCase();if(["critical","fail","overdue","action required"].includes(x))return"bg-red-500/10 text-red-700 border-red-500/30";if(["high","conditional","in progress"].includes(x))return"bg-orange-500/10 text-orange-700 border-orange-500/30";if(["completed","pass","closed","positive observation"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";return"bg-slate-500/10 text-slate-700 border-slate-500/30";};

export default function AdminInspectionsPage(){
  const {settings}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [observationOpen,setObservationOpen]=useState(false);
  const [taskSelected,setTaskSelected]=useState<Task|null>(null);
  const [saving,setSaving]=useState(false);
  const [scheduleForm,setScheduleForm]=useState({templateId:"",assignedEmployeeId:"none",factory:"",area:"",department:"",frequency:"Weekly",nextRunDate:new Date().toISOString().slice(0,10)});
  const [observationForm,setObservationForm]=useState({observerEmployeeId:"none",observationType:"Unsafe Condition",category:"General",department:"",factory:"",area:"",description:"",severity:"Medium",immediateAction:""});

  const templatesQ=useQuery<Template[]>({queryKey:["inspection-templates"],queryFn:()=>load("/api/data?resource=inspection-templates")});
  const schedulesQ=useQuery<Schedule[]>({queryKey:["inspection-schedules"],queryFn:()=>load("/api/data?resource=inspection-schedules")});
  const tasksQ=useQuery<Task[]>({queryKey:["inspection-tasks"],queryFn:()=>load("/api/data?resource=inspection-tasks")});
  const observationsQ=useQuery<Observation[]>({queryKey:["safety-observations"],queryFn:()=>load("/api/data?resource=safety-observations")});
  const hseQ=useQuery<Employee[]>({queryKey:["inspection-hse"],queryFn:()=>load("/api/data?resource=employee-directory&type=hse")});

  const templates=templatesQ.data||[],schedules=schedulesQ.data||[],tasks=tasksQ.data||[],observations=observationsQ.data||[],hse=hseQ.data||[];
  const filteredTasks=useMemo(()=>{const q=search.trim().toLowerCase();return tasks.filter(t=>!q||[t.title,t.department,t.factory,t.area].some(v=>String(v||"").toLowerCase().includes(q)));},[tasks,search]);
  const metrics=useMemo(()=>({
    planned:tasks.filter(t=>t.status==="Planned").length,
    overdue:tasks.filter(t=>t.status==="Overdue").length,
    failed:tasks.filter(t=>t.result==="Fail").length,
    observations:observations.filter(o=>!["Closed","Cancelled"].includes(o.status)).length
  }),[tasks,observations]);

  const refresh=()=>Promise.all([
    qc.invalidateQueries({queryKey:["inspection-schedules"]}),
    qc.invalidateQueries({queryKey:["inspection-tasks"]}),
    qc.invalidateQueries({queryKey:["safety-observations"]}),
    qc.invalidateQueries({queryKey:["hse-actions"]})
  ]);

  const createSchedule=async()=>{
    if(!scheduleForm.templateId)return toast.error(isAr?"اختر نموذج التفتيش":"Select an inspection template");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=inspection-schedules",{
        ...scheduleForm,assignedEmployeeId:scheduleForm.assignedEmployeeId==="none"?null:scheduleForm.assignedEmployeeId,active:true
      });const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create schedule");
      toast.success(isAr?"تم إنشاء جدول التفتيش":"Inspection schedule created");setScheduleOpen(false);await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create schedule");}finally{setSaving(false);}
  };

  const createObservation=async()=>{
    if(!observationForm.description.trim())return toast.error(isAr?"وصف الملاحظة مطلوب":"Observation description is required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=safety-observations",{
        ...observationForm,observerEmployeeId:observationForm.observerEmployeeId==="none"?null:observationForm.observerEmployeeId,status:"Open",photoUrls:[]
      });const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create observation");
      toast.success(p.actionId?(isAr?"تم تسجيل الملاحظة وإنشاء CAPA تلقائيًا":"Observation recorded and CAPA created"):(isAr?"تم تسجيل الملاحظة":"Observation recorded"));
      setObservationOpen(false);setObservationForm({observerEmployeeId:"none",observationType:"Unsafe Condition",category:"General",department:"",factory:"",area:"",description:"",severity:"Medium",immediateAction:""});await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create observation");}finally{setSaving(false);}
  };

  const patchTask=async(patch:any)=>{
    if(!taskSelected)return;
    setSaving(true);
    try{
      const r=await apiRequest("PATCH",`/api/data?resource=inspection-tasks&id=${taskSelected.id}`,patch);const p=await r.json();
      if(!r.ok)throw new Error(p?.error||"Unable to update inspection");
      setTaskSelected(p);toast.success(p.actionId?(isAr?"تم التحديث وإنشاء CAPA بسبب النتيجة":"Updated; CAPA created for failed result"):(isAr?"تم تحديث التفتيش":"Inspection updated"));await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to update inspection");}finally{setSaving(false);}
  };

  const patchObservation=async(o:Observation,patch:any)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=safety-observations&id=${o.id}`,patch);const p=await r.json();
    if(!r.ok)return toast.error(p?.error||"Unable to update observation");await refresh();
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-600 text-white"><ClipboardCheck className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"التفتيشات والملاحظات الميدانية":"Inspections & Field Observations"}</h1><p className="text-xs text-muted-foreground">{isAr?"جدولة التفتيشات وتسجيل Near Miss والملاحظات من الجوال":"Scheduled inspections plus mobile Near Miss and safety observations"}</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button variant="outline" onClick={()=>setScheduleOpen(true)}><CalendarClock className="me-2 h-4 w-4"/>{isAr?"جدولة تفتيش":"Schedule"}</Button><Button onClick={()=>setObservationOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"ملاحظة / Near Miss":"Observation / Near Miss"}</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={isAr?"مخططة":"Planned"} value={metrics.planned} icon={<CalendarClock className="h-4 w-4"/>}/>
      <Metric label={isAr?"متأخرة":"Overdue"} value={metrics.overdue} icon={<AlertTriangle className="h-4 w-4 text-red-600"/>}/>
      <Metric label={isAr?"نتيجة Fail":"Failed"} value={metrics.failed} icon={<ShieldAlert className="h-4 w-4 text-orange-600"/>}/>
      <Metric label={isAr?"ملاحظات مفتوحة":"Open Observations"} value={metrics.observations} icon={<Eye className="h-4 w-4 text-blue-600"/>}/>
    </div>

    <Tabs defaultValue="tasks" className="space-y-4">
      <TabsList><TabsTrigger value="tasks">{isAr?"مهام التفتيش":"Inspection Tasks"}</TabsTrigger><TabsTrigger value="schedules">{isAr?"الجداول":"Schedules"}</TabsTrigger><TabsTrigger value="observations">{isAr?"الملاحظات":"Observations"}</TabsTrigger></TabsList>

      <TabsContent value="tasks"><Card><CardContent className="space-y-4 p-4"><div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث في التفتيشات...":"Search inspections..."}/></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>{isAr?"التفتيش":"Inspection"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"المفتش":"Inspector"}</TableHead><TableHead>{isAr?"الاستحقاق":"Due"}</TableHead><TableHead>{isAr?"النتيجة":"Result"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead>CAPA</TableHead></TableRow></TableHeader><TableBody>{filteredTasks.map(t=><TableRow key={t.id} className="cursor-pointer" onClick={()=>setTaskSelected(t)}><TableCell className="font-medium">{t.title}</TableCell><TableCell>{t.factory||"—"} / {t.area||"—"}</TableCell><TableCell>{hse.find(e=>e.id===t.inspectorEmployeeId)?.name||"—"}</TableCell><TableCell>{t.dueDate}</TableCell><TableCell><Badge variant="outline" className={tone(t.result)}>{t.result}</Badge></TableCell><TableCell><Badge variant="outline" className={tone(t.status)}>{t.status}</Badge></TableCell><TableCell>{t.actionId?<Badge variant="destructive">CAPA</Badge>:"—"}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>

      <TabsContent value="schedules"><Card><CardContent className="overflow-x-auto p-4"><Table><TableHeader><TableRow><TableHead>{isAr?"النموذج":"Template"}</TableHead><TableHead>{isAr?"التكرار":"Frequency"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"المسؤول":"Assigned"}</TableHead><TableHead>{isAr?"الموعد القادم":"Next Run"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{schedules.map(s=><TableRow key={s.id}><TableCell>{templates.find(t=>t.id===s.templateId)?.name||"—"}</TableCell><TableCell>{s.frequency}</TableCell><TableCell>{s.factory||"—"} / {s.area||"—"}</TableCell><TableCell>{hse.find(e=>e.id===s.assignedEmployeeId)?.name||"—"}</TableCell><TableCell>{s.nextRunDate}</TableCell><TableCell><Badge variant="outline">{s.active?"Active":"Inactive"}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>

      <TabsContent value="observations"><Card><CardContent className="overflow-x-auto p-4"><Table><TableHeader><TableRow><TableHead>{isAr?"الرقم":"Ref"}</TableHead><TableHead>{isAr?"النوع":"Type"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"الوصف":"Description"}</TableHead><TableHead>{isAr?"الخطورة":"Severity"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead>CAPA</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{observations.map(o=><TableRow key={o.id}><TableCell className="font-medium">{o.observationNo}</TableCell><TableCell>{o.observationType}</TableCell><TableCell>{o.factory||"—"} / {o.area||"—"}</TableCell><TableCell className="max-w-[320px] truncate">{o.description}</TableCell><TableCell><Badge variant="outline" className={tone(o.severity)}>{o.severity}</Badge></TableCell><TableCell><Badge variant="outline" className={tone(o.status)}>{o.status}</Badge></TableCell><TableCell>{o.actionId?<Badge variant="destructive">CAPA</Badge>:"—"}</TableCell><TableCell>{!["Closed","Cancelled"].includes(o.status)&&<Button size="sm" variant="outline" onClick={()=>void patchObservation(o,{status:"Closed"})}>{isAr?"إغلاق":"Close"}</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
    </Tabs>

    <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isAr?"جدولة تفتيش":"Schedule Inspection"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
      <Field label={isAr?"النموذج":"Template"} wide><Select value={scheduleForm.templateId} onValueChange={v=>setScheduleForm({...scheduleForm,templateId:v})}><SelectTrigger><SelectValue placeholder={isAr?"اختر النموذج":"Select template"}/></SelectTrigger><SelectContent>{templates.filter(t=>t.active).map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"موظف HSE":"HSE Inspector"}><Select value={scheduleForm.assignedEmployeeId} onValueChange={v=>setScheduleForm({...scheduleForm,assignedEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{hse.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"التكرار":"Frequency"}><Select value={scheduleForm.frequency} onValueChange={v=>setScheduleForm({...scheduleForm,frequency:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Daily","Weekly","Monthly"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"الموعد الأول":"First Run"}><Input type="date" value={scheduleForm.nextRunDate} onChange={e=>setScheduleForm({...scheduleForm,nextRunDate:e.target.value})}/></Field>
      <Field label={isAr?"القسم":"Department"}><Input value={scheduleForm.department} onChange={e=>setScheduleForm({...scheduleForm,department:e.target.value})}/></Field>
      <Field label={isAr?"المصنع":"Factory"}><Input value={scheduleForm.factory} onChange={e=>setScheduleForm({...scheduleForm,factory:e.target.value})}/></Field>
      <Field label={isAr?"المنطقة":"Area"} wide><Input value={scheduleForm.area} onChange={e=>setScheduleForm({...scheduleForm,area:e.target.value})}/></Field>
    </div><DialogFooter><Button variant="outline" onClick={()=>setScheduleOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createSchedule()} disabled={saving}>{isAr?"حفظ":"Save"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={observationOpen} onOpenChange={setObservationOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isAr?"ملاحظة سلامة / Near Miss":"Safety Observation / Near Miss"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
      <Field label={isAr?"النوع":"Type"}><Select value={observationForm.observationType} onValueChange={v=>setObservationForm({...observationForm,observationType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Near Miss","Unsafe Act","Unsafe Condition","Positive Observation"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"الخطورة":"Severity"}><Select value={observationForm.severity} onValueChange={v=>setObservationForm({...observationForm,severity:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"المراقب":"Observer"}><Select value={observationForm.observerEmployeeId} onValueChange={v=>setObservationForm({...observationForm,observerEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{hse.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"التصنيف":"Category"}><Input value={observationForm.category} onChange={e=>setObservationForm({...observationForm,category:e.target.value})}/></Field>
      <Field label={isAr?"القسم":"Department"}><Input value={observationForm.department} onChange={e=>setObservationForm({...observationForm,department:e.target.value})}/></Field>
      <Field label={isAr?"المصنع":"Factory"}><Input value={observationForm.factory} onChange={e=>setObservationForm({...observationForm,factory:e.target.value})}/></Field>
      <Field label={isAr?"المنطقة":"Area"} wide><Input value={observationForm.area} onChange={e=>setObservationForm({...observationForm,area:e.target.value})}/></Field>
      <Field label={isAr?"الوصف":"Description"} wide><Textarea rows={4} value={observationForm.description} onChange={e=>setObservationForm({...observationForm,description:e.target.value})}/></Field>
      <Field label={isAr?"الإجراء الفوري":"Immediate Action"} wide><Textarea rows={2} value={observationForm.immediateAction} onChange={e=>setObservationForm({...observationForm,immediateAction:e.target.value})}/></Field>
    </div><DialogFooter><Button variant="outline" onClick={()=>setObservationOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createObservation()} disabled={saving}>{isAr?"تسجيل":"Record"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(taskSelected)} onOpenChange={o=>!o&&setTaskSelected(null)}><DialogContent className="max-w-xl">{taskSelected&&<><DialogHeader><DialogTitle>{taskSelected.title}</DialogTitle></DialogHeader><div className="space-y-3"><Field label={isAr?"النتيجة":"Result"}><Select value={taskSelected.result} onValueChange={v=>setTaskSelected({...taskSelected,result:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Pending","Pass","Fail","Conditional"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"الملاحظات":"Notes"}><Textarea value={taskSelected.notes||""} onChange={e=>setTaskSelected({...taskSelected,notes:e.target.value})}/></Field></div><DialogFooter><Button variant="outline" onClick={()=>void patchTask({status:"In Progress",startedAt:new Date().toISOString()})}>{isAr?"بدء":"Start"}</Button><Button onClick={()=>void patchTask({status:"Completed",result:taskSelected.result,notes:taskSelected.notes||"",completedAt:new Date().toISOString()})}>{isAr?"إكمال":"Complete"}</Button></DialogFooter></>}</DialogContent></Dialog>
  </div>;
}
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
