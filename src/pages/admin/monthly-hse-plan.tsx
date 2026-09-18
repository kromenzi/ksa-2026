
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  Clock3, FileCheck2, ImagePlus, ListChecks, Plus, RefreshCw, ShieldCheck, Sparkles,
  Trash2, UserRound, UsersRound
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { HseImagePicker } from "@/components/hse-image-picker";
import { uploadHseImages, resolveHseImageUrls, type HseStoredImage } from "@/lib/hse-image-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Task = {
  id:string; taskNo:string; titleAr:string; titleEn:string; description?:string|null; category:string;
  factory?:string|null; department?:string|null; assignedTo?:string|null; backupUserId?:string|null; assignedEmployeeId?:string|null; backupEmployeeId?:string|null;
  month:number; year:number; priority:"Critical"|"High"|"Medium"|"Low"; startDate:string; dueDate:string;
  recurrence:string; status:string; progress:number; evidenceRequired:boolean; linkedModule?:string|null;
  linkedRecordId?:string|null; escalationLevel:number; notes?:string|null; completedAt?:string|null;
  completedBy?:string|null; supervisorVerifiedAt?:string|null; createdAt:string; updatedAt:string;
};
type Evidence={id:string;taskId:string;filePath:string;fileName:string;mimeType:string;sizeBytes:number;note?:string|null;createdAt:string};
type Template={id:string;slug:string;titleAr:string;titleEn:string;description?:string|null;category:string;priority:string;recurrence:string;defaultStartDay:number;defaultDueDay:number;evidenceRequired:boolean;linkedModule?:string|null;active:boolean};
type Assignee={id:string;name:string;role:string;isActive:boolean;userId?:string|null;title?:string|null;employeeId?:string|null};

const statusOptions=["Not Started","In Progress","Completed","Blocked","Escalated","Cancelled"];
const priorities=["Critical","High","Medium","Low"];
const categories=["Inspections","NCR Follow-up","PTW / LOTO","Fire Safety","TBT / Training","Equipment Safety","Electrical Safety","Contractor Safety","Emergency","Environment","Documentation","General"];

function monthLabel(month:number,isAr:boolean){
  const d=new Date(2026,month-1,1);
  return d.toLocaleDateString(isAr?"ar-SA":"en-US",{month:"long"});
}
function todayIso(){return new Date().toISOString().slice(0,10);}
function isOverdue(task:Task){return !["Completed","Cancelled"].includes(task.status)&&task.dueDate<todayIso();}
function displayStatus(task:Task,isAr:boolean){
  if(isOverdue(task)) return isAr?"متأخرة":"Overdue";
  const ar:Record<string,string>={"Not Started":"لم تبدأ","In Progress":"قيد التنفيذ","Completed":"مكتملة","Blocked":"متوقفة","Escalated":"مصعّدة","Cancelled":"ملغاة"};
  return isAr?(ar[task.status]||task.status):task.status;
}
function priorityClass(priority:string){
  if(priority==="Critical") return "bg-red-600 text-white";
  if(priority==="High") return "bg-orange-500 text-white";
  if(priority==="Medium") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  return "bg-slate-500/10 text-slate-700 border-slate-500/30";
}
function statusClass(task:Task){
  if(isOverdue(task)) return "bg-red-500/10 text-red-700 border-red-500/30";
  if(task.status==="Completed") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  if(task.status==="In Progress") return "bg-blue-500/10 text-blue-700 border-blue-500/30";
  if(task.status==="Escalated"||task.status==="Blocked") return "bg-orange-500/10 text-orange-700 border-orange-500/30";
  return "bg-slate-500/10 text-slate-700 border-slate-500/30";
}

export default function MonthlyHsePlanPage(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const canManage=currentUser?.role==="admin"||currentUser?.role==="manager";
  const now=new Date();
  const [month,setMonth]=useState(now.getMonth()+1);
  const [year,setYear]=useState(now.getFullYear());
  const [tasks,setTasks]=useState<Task[]>([]);
  const [templates,setTemplates]=useState<Template[]>([]);
  const [assignees,setAssignees]=useState<Assignee[]>([]);
  const [assigneesLoading,setAssigneesLoading]=useState(false);
  const [assigneesError,setAssigneesError]=useState("");
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState<"my"|"team">("my");
  const [statusFilter,setStatusFilter]=useState("all");
  const [categoryFilter,setCategoryFilter]=useState("all");
  const [assigneeFilter,setAssigneeFilter]=useState("all");
  const [selected,setSelected]=useState<Task|null>(null);
  const [evidence,setEvidence]=useState<Evidence[]>([]);
  const [evidenceUrls,setEvidenceUrls]=useState<string[]>([]);
  const [evidenceFiles,setEvidenceFiles]=useState<File[]>([]);
  const [savingEvidence,setSavingEvidence]=useState(false);
  const [taskDialog,setTaskDialog]=useState(false);
  const [generateDialog,setGenerateDialog]=useState(false);
  const [templateDialog,setTemplateDialog]=useState(false);
  const [taskForm,setTaskForm]=useState<any>({
    titleAr:"",titleEn:"",description:"",category:"Inspections",priority:"Medium",
    assignedTo:"",backupUserId:"none",factory:"MV/LV",department:"",startDate:"",dueDate:"",
    recurrence:"Monthly",evidenceRequired:false,linkedModule:"",linkedRecordId:"",notes:""
  });
  const [generateForm,setGenerateForm]=useState<any>({assignedTo:"",backupUserId:"none",factory:"MV/LV",department:""});
  const [templateForm,setTemplateForm]=useState<any>({titleAr:"",titleEn:"",description:"",category:"General",priority:"Medium",recurrence:"Monthly",defaultStartDay:1,defaultDueDay:5,evidenceRequired:false,linkedModule:""});

  const loadAssignees=async(showToast=false)=>{
    setAssigneesLoading(true);
    setAssigneesError("");
    try{
      const ur=await apiRequest("GET","/api/monthly-hse-plan?action=assignees");
      const up=await ur.json();
      const list=Array.isArray(up)?up:[];
      setAssignees(list);
      if(!list.length){
        const message=isAr?"لا توجد أسماء موظفين نشطة متاحة للتوزيع.":"No active employee names are available for assignment.";
        setAssigneesError(message);
        if(showToast) toast.error(message);
      }
      return list;
    }catch(err:any){
      const message=err?.message||(isAr?"تعذر استيراد أسماء الموظفين":"Unable to import employee names");
      setAssignees([]);
      setAssigneesError(message);
      if(showToast) toast.error(message);
      return [];
    }finally{
      setAssigneesLoading(false);
    }
  };

  const load=async()=>{
    setLoading(true);
    try{
      const response=await apiRequest("GET","/api/monthly-hse-plan?action=tasks&month="+month+"&year="+year);
      const payload=await response.json();
      setTasks(Array.isArray(payload)?payload:[]);
      await loadAssignees(false);
      if(canManage){
        const tr=await apiRequest("GET","/api/monthly-hse-plan?action=templates");
        const tp=await tr.json();
        setTemplates(Array.isArray(tp)?tp:[]);
      }
    }catch(err:any){toast.error(err?.message||(isAr?"تعذر تحميل الخطة الشهرية":"Unable to load monthly plan"));}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[month,year]);

  const filtered=useMemo(()=>tasks.filter(task=>{
    if(view==="my"&&task.assignedTo!==currentUser?.id&&task.backupUserId!==currentUser?.id) return false;
    if(view==="team"&&assigneeFilter!=="all"){
      const assignee=assignees.find(a=>a.id===assigneeFilter);
      const matchesEmployee=task.assignedEmployeeId===assigneeFilter;
      const matchesLinkedUser=Boolean(assignee?.userId&&task.assignedTo===assignee.userId);
      if(!matchesEmployee&&!matchesLinkedUser) return false;
    }
    if(statusFilter==="overdue"){if(!isOverdue(task)) return false;}
    else if(statusFilter!=="all"&&task.status!==statusFilter) return false;
    if(categoryFilter!=="all"&&task.category!==categoryFilter) return false;
    return true;
  }),[tasks,view,currentUser?.id,assigneeFilter,statusFilter,categoryFilter]);

  const stats=useMemo(()=>{
    const base=view==="my"?tasks.filter(t=>t.assignedTo===currentUser?.id||t.backupUserId===currentUser?.id):tasks;
    const completed=base.filter(t=>t.status==="Completed").length;
    const overdue=base.filter(isOverdue).length;
    const critical=base.filter(t=>t.priority==="Critical"&&!["Completed","Cancelled"].includes(t.status)).length;
    const thisWeek=base.filter(t=>{
      const due=new Date(t.dueDate+"T00:00:00");const diff=(due.getTime()-new Date(todayIso()+"T00:00:00").getTime())/86400000;
      return diff>=0&&diff<=7&&!["Completed","Cancelled"].includes(t.status);
    }).length;
    return {total:base.length,completed,overdue,critical,thisWeek,pct:base.length?Math.round(completed/base.length*100):0};
  },[tasks,view,currentUser?.id]);

  const changeMonth=(delta:number)=>{
    let m=month+delta,y=year;
    if(m<1){m=12;y--;} if(m>12){m=1;y++;}
    setMonth(m);setYear(y);
  };

  const openTask=async(task:Task)=>{
    setSelected(task);setEvidence([]);setEvidenceUrls([]);setEvidenceFiles([]);
    try{
      const r=await apiRequest("GET","/api/monthly-hse-plan?action=evidence&taskId="+encodeURIComponent(task.id));
      const rows=await r.json();const list=Array.isArray(rows)?rows:[];
      setEvidence(list);
      if(list.length){
        const urls=await resolveHseImageUrls(list.map((e:Evidence)=>({path:e.filePath,name:e.fileName,mimeType:e.mimeType,size:e.sizeBytes,uploadedAt:e.createdAt})));
        setEvidenceUrls(urls);
      }
    }catch{}
  };

  const saveTaskProgress=async()=>{
    if(!selected) return;
    try{
      const r=await apiRequest("PATCH","/api/monthly-hse-plan?action=task&id="+encodeURIComponent(selected.id),{
        status:selected.status,progress:selected.progress,notes:selected.notes||""
      });
      const row=await r.json();if(!r.ok) throw new Error(row?.error||"Unable to update task");
      setSelected(row);setTasks(prev=>prev.map(t=>t.id===row.id?row:t));toast.success(isAr?"تم تحديث المهمة":"Task updated");
    }catch(err:any){toast.error(err?.message||(isAr?"تعذر تحديث المهمة":"Unable to update task"));}
  };

  const uploadEvidence=async()=>{
    if(!selected||!evidenceFiles.length) return;
    setSavingEvidence(true);
    try{
      const uploaded=await uploadHseImages(evidenceFiles,"monthly-task");
      const r=await apiRequest("POST","/api/monthly-hse-plan?action=evidence",{taskId:selected.id,images:uploaded});
      const rows=await r.json();if(!r.ok) throw new Error(rows?.error||"Unable to save evidence");
      setEvidence(prev=>[...prev,...rows]);setEvidenceFiles([]);
      const urls=await resolveHseImageUrls([...evidence,...rows].map((e:Evidence)=>({path:e.filePath,name:e.fileName,mimeType:e.mimeType,size:e.sizeBytes,uploadedAt:e.createdAt})));
      setEvidenceUrls(urls);toast.success(isAr?"تم رفع الإثبات":"Evidence uploaded");
    }catch(err:any){toast.error(err?.message||(isAr?"تعذر رفع الإثبات":"Unable to upload evidence"));}
    finally{setSavingEvidence(false);}
  };

  const openNewTaskDialog=async()=>{
    await loadAssignees(true);
    setTaskDialog(true);
  };

  const openGenerateDialog=async()=>{
    await loadAssignees(true);
    setGenerateDialog(true);
  };

  const createTask=async()=>{
    try{
      const start=taskForm.startDate||year+"-"+String(month).padStart(2,"0")+"-01";
      const due=taskForm.dueDate||year+"-"+String(month).padStart(2,"0")+"-05";
      const r=await apiRequest("POST","/api/monthly-hse-plan?action=create",{...taskForm,assignedEmployeeId:taskForm.assignedTo,backupEmployeeId:taskForm.backupUserId==="none"?"":taskForm.backupUserId,month,year,startDate:start,dueDate:due});
      const row=await r.json();if(!r.ok) throw new Error(row?.error||"Unable to create task");
      setTaskDialog(false);await load();toast.success(isAr?"تم إنشاء المهمة":"Task created");
    }catch(err:any){toast.error(err?.message||(isAr?"تعذر إنشاء المهمة":"Unable to create task"));}
  };

  const generatePlan=async()=>{
    try{
      const r=await apiRequest("POST","/api/monthly-hse-plan?action=generate",{...generateForm,assignedEmployeeId:generateForm.assignedTo,backupEmployeeId:generateForm.backupUserId==="none"?"":generateForm.backupUserId,month,year});
      const body=await r.json();if(!r.ok) throw new Error(body?.error||"Unable to generate plan");
      setGenerateDialog(false);await load();toast.success((isAr?"تم إنشاء ":"Created ")+body.created+(isAr?" مهمة":" tasks"));
    }catch(err:any){toast.error(err?.message||(isAr?"تعذر إنشاء الخطة":"Unable to generate plan"));}
  };

  const createTemplate=async()=>{
    try{
      const r=await apiRequest("POST","/api/monthly-hse-plan?action=template",templateForm);
      const body=await r.json();if(!r.ok) throw new Error(body?.error||"Unable to create template");
      setTemplateDialog(false);await load();toast.success(isAr?"تم إنشاء القالب":"Template created");
    }catch(err:any){toast.error(err?.message||(isAr?"تعذر إنشاء القالب":"Unable to create template"));}
  };

  const removeTask=async(task:Task)=>{
    if(!canManage||!window.confirm(isAr?"حذف هذه المهمة؟":"Delete this task?")) return;
    try{await apiRequest("DELETE","/api/monthly-hse-plan?action=task&id="+encodeURIComponent(task.id));setSelected(null);await load();toast.success(isAr?"تم الحذف":"Deleted");}
    catch(err:any){toast.error(err?.message||"Delete failed");}
  };

  const verifyTask=async(task:Task)=>{
    try{
      const r=await apiRequest("POST","/api/monthly-hse-plan?action=verify",{id:task.id});const row=await r.json();
      if(!r.ok) throw new Error(row?.error||"Unable to verify task");
      setSelected(row);setTasks(prev=>prev.map(t=>t.id===row.id?row:t));toast.success(isAr?"تم اعتماد المهمة":"Task verified");
    }catch(err:any){toast.error(err?.message||"Verification failed");}
  };

  const taskUser=(id?:string|null)=>{
    const found=assignees.find(u=>u.id===id||u.userId===id);
    if(found) return found;
    if(currentUser&&id===currentUser.id) return {id:currentUser.id,name:currentUser.name,role:currentUser.role,isActive:true,userId:currentUser.id};
    return undefined;
  };
  const calendarDays=Array.from({length:new Date(year,month,0).getDate()},(_,i)=>i+1);

  return <div className="space-y-5" data-testid="monthly-hse-plan-page">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 text-white shadow"><ListChecks className="h-6 w-6"/></div>
        <div><h1 className="text-2xl font-bold">{isAr?"خطة مهام السلامة الشهرية":"Monthly HSE Work Plan"}</h1><p className="text-xs text-muted-foreground">{isAr?"المهام، المواعيد، الإثباتات والمتابعة لكل موظف سلامة":"Tasks, deadlines, evidence and accountability for every HSE team member"}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={()=>changeMonth(-1)}><ChevronRight className="h-4 w-4"/></Button>
        <div className="min-w-[170px] rounded-lg border bg-card px-4 py-2 text-center text-sm font-bold">{monthLabel(month,isAr)} {year}</div>
        <Button variant="outline" size="sm" onClick={()=>changeMonth(1)}><ChevronLeft className="h-4 w-4"/></Button>
        <Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading}><RefreshCw className={"me-2 h-4 w-4 "+(loading?"animate-spin":"")}/>{isAr?"تحديث":"Refresh"}</Button>
        {canManage&&<><Button size="sm" className="gap-2" onClick={()=>void openGenerateDialog()}><Sparkles className="h-4 w-4"/>{isAr?"إنشاء خطة الشهر":"Generate Plan"}</Button><Button size="sm" variant="outline" className="gap-2" onClick={()=>void openNewTaskDialog()}><Plus className="h-4 w-4"/>{isAr?"مهمة جديدة":"New Task"}</Button></>}
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"نسبة الإنجاز":"Completion"}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{stats.pct}%</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-600" style={{width:stats.pct+"%"}}/></div></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"إجمالي المهام":"Total Tasks"}</p><p className="mt-1 text-2xl font-bold">{stats.total}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"متأخرة":"Overdue"}</p><p className="mt-1 text-2xl font-bold text-red-600">{stats.overdue}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"حرجة مفتوحة":"Open Critical"}</p><p className="mt-1 text-2xl font-bold text-orange-600">{stats.critical}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"مستحقة خلال 7 أيام":"Due in 7 Days"}</p><p className="mt-1 text-2xl font-bold text-blue-600">{stats.thisWeek}</p></CardContent></Card>
    </div>

    <Tabs defaultValue="tasks">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="tasks"><ClipboardCheck className="me-2 h-4 w-4"/>{isAr?"المهام":"Tasks"}</TabsTrigger>
        <TabsTrigger value="calendar"><CalendarDays className="me-2 h-4 w-4"/>{isAr?"التقويم":"Calendar"}</TabsTrigger>
        {canManage&&<TabsTrigger value="templates"><FileCheck2 className="me-2 h-4 w-4"/>{isAr?"القوالب":"Templates"}</TabsTrigger>}
      </TabsList>

      <TabsContent value="tasks" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <Button size="sm" variant={view==="my"?"default":"outline"} onClick={()=>setView("my")} className="gap-2"><UserRound className="h-4 w-4"/>{isAr?"مهامي":"My Tasks"}</Button>
          {canManage&&<Button size="sm" variant={view==="team"?"default":"outline"} onClick={()=>setView("team")} className="gap-2"><UsersRound className="h-4 w-4"/>{isAr?"كل الفريق":"Team"}</Button>}
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[165px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{isAr?"كل الحالات":"All statuses"}</SelectItem><SelectItem value="overdue">{isAr?"متأخرة":"Overdue"}</SelectItem>{statusOptions.map(s=><SelectItem value={s} key={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{isAr?"كل المجالات":"All categories"}</SelectItem>{categories.map(c=><SelectItem value={c} key={c}>{c}</SelectItem>)}</SelectContent></Select>
          {canManage&&view==="team"&&<Select value={assigneeFilter} onValueChange={setAssigneeFilter}><SelectTrigger className="w-[190px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{isAr?"كل الموظفين":"All employees"}</SelectItem>{assignees.filter(u=>u.isActive).map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>}
        </div>

        <Card><div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead>{isAr?"المهمة":"Task"}</TableHead><TableHead>{isAr?"المسؤول":"Assigned"}</TableHead><TableHead>{isAr?"المجال":"Category"}</TableHead><TableHead>{isAr?"الأولوية":"Priority"}</TableHead><TableHead>{isAr?"الاستحقاق":"Due"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead>{isAr?"الإنجاز":"Progress"}</TableHead>
        </TableRow></TableHeader><TableBody>
          {!loading&&filtered.length===0&&<TableRow><TableCell colSpan={7} className="py-14 text-center text-muted-foreground">{isAr?"لا توجد مهام لهذه الفترة":"No tasks for this period"}</TableCell></TableRow>}
          {filtered.map(task=><TableRow key={task.id} className="cursor-pointer hover:bg-muted/40" onClick={()=>void openTask(task)}>
            <TableCell><p className="font-semibold">{isAr?task.titleAr:task.titleEn}</p><p className="text-[11px] text-muted-foreground">{task.taskNo} · {task.factory||"—"}</p></TableCell>
            <TableCell><div><p>{taskUser(task.assignedEmployeeId||task.assignedTo)?.name||"—"}</p>{taskUser(task.assignedEmployeeId||task.assignedTo)?.title&&<p className="text-[10px] text-muted-foreground">{taskUser(task.assignedEmployeeId||task.assignedTo)?.title}</p>}</div></TableCell><TableCell>{task.category}</TableCell>
            <TableCell><Badge className={priorityClass(task.priority)} variant="outline">{task.priority}</Badge></TableCell>
            <TableCell className={isOverdue(task)?"font-semibold text-red-600":""}>{task.dueDate}</TableCell>
            <TableCell><Badge variant="outline" className={statusClass(task)}>{displayStatus(task,isAr)}</Badge></TableCell>
            <TableCell><div className="min-w-[110px]"><div className="mb-1 flex justify-between text-[10px]"><span>{task.progress}%</span>{task.evidenceRequired&&<ImagePlus className="h-3 w-3"/>}</div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-teal-600" style={{width:task.progress+"%"}}/></div></div></TableCell>
          </TableRow>)}
        </TableBody></Table></div></Card>
      </TabsContent>

      <TabsContent value="calendar">
        <Card><CardHeader><CardTitle className="text-base">{monthLabel(month,isAr)} {year}</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {calendarDays.map(day=>{
            const date=year+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
            const dayTasks=filtered.filter(t=>t.dueDate===date);
            return <div key={day} className={"min-h-[120px] rounded-xl border p-2 "+(date===todayIso()?"border-teal-500 bg-teal-500/5":"")}>
              <div className="mb-2 text-xs font-bold">{day}</div>
              <div className="space-y-1">{dayTasks.map(t=><button key={t.id} onClick={()=>void openTask(t)} className={"w-full rounded-md border px-2 py-1 text-start text-[10px] "+(isOverdue(t)?"border-red-300 bg-red-50 text-red-700":"bg-card")}><span className="line-clamp-2">{isAr?t.titleAr:t.titleEn}</span></button>)}</div>
            </div>;
          })}
        </div></CardContent></Card>
      </TabsContent>

      {canManage&&<TabsContent value="templates" className="space-y-4">
        <div className="flex justify-end"><Button onClick={()=>setTemplateDialog(true)} className="gap-2"><Plus className="h-4 w-4"/>{isAr?"قالب جديد":"New Template"}</Button></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{templates.map(t=><Card key={t.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{isAr?t.titleAr:t.titleEn}</p><p className="mt-1 text-xs text-muted-foreground">{t.category}</p></div><Badge variant="outline">{t.recurrence}</Badge></div><p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{t.description||"—"}</p><div className="mt-3 flex items-center justify-between text-xs"><Badge className={priorityClass(t.priority)} variant="outline">{t.priority}</Badge><span>{t.evidenceRequired?(isAr?"يتطلب إثبات":"Evidence required"):(isAr?"بدون إثبات إلزامي":"Evidence optional")}</span></div></CardContent></Card>)}</div>
      </TabsContent>}
    </Tabs>

    {selected&&<Dialog open onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{selected.taskNo} — {isAr?selected.titleAr:selected.titleEn}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>{isAr?"الحالة":"Status"}</Label><Select value={selected.status} onValueChange={v=>setSelected({...selected,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{statusOptions.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>{isAr?"نسبة الإنجاز":"Progress"} %</Label><Input type="number" min={0} max={100} value={selected.progress} onChange={e=>setSelected({...selected,progress:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/></div>
        <div className="space-y-2"><Label>{isAr?"المسؤول":"Assigned"}</Label><Input value={taskUser(selected.assignedEmployeeId||selected.assignedTo)?.name||"—"} disabled/></div>
        <div className="space-y-2"><Label>{isAr?"الموعد":"Due Date"}</Label><Input value={selected.dueDate} disabled/></div>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4 text-sm"><p className="font-semibold">{selected.category} · {selected.priority}</p><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{selected.description||"—"}</p></div>
      <div className="space-y-2"><Label>{isAr?"ملاحظات التنفيذ":"Execution Notes"}</Label><Textarea rows={4} value={selected.notes||""} onChange={e=>setSelected({...selected,notes:e.target.value})}/></div>
      <div className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">{isAr?"إثبات التنفيذ":"Completion Evidence"}</p><p className="text-xs text-muted-foreground">{selected.evidenceRequired?(isAr?"مطلوب قبل الإكمال":"Required before completion"):(isAr?"اختياري":"Optional")}</p></div><Badge variant={selected.evidenceRequired?"default":"outline"}>{evidence.length}</Badge></div>
        {evidenceUrls.length>0&&<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{evidenceUrls.map((src,i)=><a href={src} target="_blank" rel="noreferrer" key={src} className="overflow-hidden rounded-lg border"><img src={src} alt={"Evidence "+(i+1)} className="aspect-square h-full w-full object-cover"/></a>)}</div>}
        <HseImagePicker files={evidenceFiles} onChange={files=>setEvidenceFiles(files.slice(0,Math.max(0,4-evidence.length)))} isAr={isAr} disabled={savingEvidence||evidence.length>=4} label={isAr?"إضافة صور إثبات":"Add Evidence Photos"}/>
        <Button className="mt-3 gap-2" variant="outline" disabled={!evidenceFiles.length||savingEvidence} onClick={()=>void uploadEvidence()}><ImagePlus className="h-4 w-4"/>{savingEvidence?(isAr?"جارٍ الرفع...":"Uploading..."):(isAr?"رفع الإثبات":"Upload Evidence")}</Button>
      </div>
      {selected.supervisorVerifiedAt&&<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><ShieldCheck className="h-4 w-4"/>{isAr?"تم اعتماد المهمة من المشرف":"Supervisor verified"}</div>}
      <DialogFooter className="gap-2">{canManage&&<Button variant="destructive" onClick={()=>void removeTask(selected)}><Trash2 className="me-2 h-4 w-4"/>{isAr?"حذف":"Delete"}</Button>}{canManage&&selected.status==="Completed"&&!selected.supervisorVerifiedAt&&<Button variant="outline" onClick={()=>void verifyTask(selected)}><CheckCircle2 className="me-2 h-4 w-4"/>{isAr?"اعتماد المشرف":"Supervisor Verify"}</Button>}<Button onClick={()=>void saveTaskProgress()}>{isAr?"حفظ التحديث":"Save Update"}</Button></DialogFooter>
    </DialogContent></Dialog>}

    <Dialog open={taskDialog} onOpenChange={setTaskDialog}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{isAr?"إضافة مهمة شهرية":"Add Monthly HSE Task"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>{isAr?"العنوان العربي":"Arabic title"}</Label><Input value={taskForm.titleAr} onChange={e=>setTaskForm({...taskForm,titleAr:e.target.value})}/></div>
        <div className="space-y-2"><Label>{isAr?"العنوان الإنجليزي":"English title"}</Label><Input value={taskForm.titleEn} onChange={e=>setTaskForm({...taskForm,titleEn:e.target.value})}/></div>
        <div className="space-y-2 sm:col-span-2"><Label>{isAr?"الوصف":"Description"}</Label><Textarea value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})}/></div>
        <div className="space-y-2"><div className="flex items-center justify-between gap-2"><Label>{isAr?"المسؤول":"Assigned employee"}</Label><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={()=>void loadAssignees(true)} disabled={assigneesLoading}><RefreshCw className={"me-1 h-3.5 w-3.5 "+(assigneesLoading?"animate-spin":"")}/>{isAr?"تحديث الأسماء":"Refresh names"}</Button></div><Select value={taskForm.assignedTo} onValueChange={v=>setTaskForm({...taskForm,assignedTo:v})} disabled={assigneesLoading||!assignees.length}><SelectTrigger><SelectValue placeholder={assigneesLoading?(isAr?"جارٍ استيراد الأسماء...":"Loading employees..."):(isAr?"اختر الموظف":"Select employee")}/></SelectTrigger><SelectContent>{assignees.filter(u=>u.isActive).map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>{assigneesError&&<p className="text-xs text-red-600">{assigneesError}</p>}</div>
        <div className="space-y-2"><Label>{isAr?"البديل":"Backup"}</Label><Select value={taskForm.backupUserId} onValueChange={v=>setTaskForm({...taskForm,backupUserId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{isAr?"بدون":"None"}</SelectItem>{assignees.filter(u=>u.isActive).map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>{isAr?"المجال":"Category"}</Label><Select value={taskForm.category} onValueChange={v=>setTaskForm({...taskForm,category:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem value={c} key={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>{isAr?"الأولوية":"Priority"}</Label><Select value={taskForm.priority} onValueChange={v=>setTaskForm({...taskForm,priority:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{priorities.map(p=><SelectItem value={p} key={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>{isAr?"تاريخ البداية":"Start date"}</Label><Input type="date" value={taskForm.startDate} onChange={e=>setTaskForm({...taskForm,startDate:e.target.value})}/></div>
        <div className="space-y-2"><Label>{isAr?"تاريخ الاستحقاق":"Due date"}</Label><Input type="date" value={taskForm.dueDate} onChange={e=>setTaskForm({...taskForm,dueDate:e.target.value})}/></div>
        <div className="space-y-2"><Label>{isAr?"المصنع":"Factory"}</Label><Input value={taskForm.factory} onChange={e=>setTaskForm({...taskForm,factory:e.target.value})}/></div>
        <div className="space-y-2"><Label>{isAr?"القسم":"Department"}</Label><Input value={taskForm.department} onChange={e=>setTaskForm({...taskForm,department:e.target.value})}/></div>
        <label className="flex items-center gap-2 rounded-lg border p-3 sm:col-span-2"><input type="checkbox" checked={taskForm.evidenceRequired} onChange={e=>setTaskForm({...taskForm,evidenceRequired:e.target.checked})}/>{isAr?"يتطلب إثبات قبل الإكمال":"Require evidence before completion"}</label>
      </div><DialogFooter><Button variant="outline" onClick={()=>setTaskDialog(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createTask()} disabled={!taskForm.titleAr||!taskForm.titleEn||!taskForm.assignedTo}>{isAr?"إنشاء المهمة":"Create Task"}</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={generateDialog} onOpenChange={setGenerateDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{isAr?"إنشاء خطة الشهر من القوالب":"Generate Monthly Plan from Templates"}</DialogTitle></DialogHeader>
      <div className="space-y-4"><div className="rounded-xl border bg-teal-500/5 p-3 text-sm"><p className="font-semibold">{monthLabel(month,isAr)} {year}</p><p className="text-xs text-muted-foreground">{isAr?"سيتم إنشاء المهام الشهرية والأسبوعية النشطة للموظف المختار.":"Active monthly and weekly templates will be expanded for the selected employee."}</p></div>
        <div className="space-y-2"><div className="flex items-center justify-between gap-2"><Label>{isAr?"الموظف المسؤول":"Assigned employee"}</Label><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={()=>void loadAssignees(true)} disabled={assigneesLoading}><RefreshCw className={"me-1 h-3.5 w-3.5 "+(assigneesLoading?"animate-spin":"")}/>{isAr?"تحديث الأسماء":"Refresh names"}</Button></div><Select value={generateForm.assignedTo} onValueChange={v=>setGenerateForm({...generateForm,assignedTo:v})} disabled={assigneesLoading||!assignees.length}><SelectTrigger><SelectValue placeholder={assigneesLoading?(isAr?"جارٍ استيراد الأسماء...":"Loading employees..."):(isAr?"اختر الموظف":"Select employee")}/></SelectTrigger><SelectContent>{assignees.filter(u=>u.isActive).map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>{assigneesError&&<p className="text-xs text-red-600">{assigneesError}</p>}</div>
        <div className="space-y-2"><Label>{isAr?"الموظف البديل":"Backup employee"}</Label><Select value={generateForm.backupUserId} onValueChange={v=>setGenerateForm({...generateForm,backupUserId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{isAr?"بدون":"None"}</SelectItem>{assignees.filter(u=>u.isActive).map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>{isAr?"المصنع":"Factory"}</Label><Input value={generateForm.factory} onChange={e=>setGenerateForm({...generateForm,factory:e.target.value})}/></div><div className="space-y-2"><Label>{isAr?"القسم":"Department"}</Label><Input value={generateForm.department} onChange={e=>setGenerateForm({...generateForm,department:e.target.value})}/></div></div>
      </div><DialogFooter><Button variant="outline" onClick={()=>setGenerateDialog(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void generatePlan()} disabled={!generateForm.assignedTo}><Sparkles className="me-2 h-4 w-4"/>{isAr?"إنشاء الخطة":"Generate"}</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={templateDialog} onOpenChange={setTemplateDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{isAr?"قالب مهمة جديد":"New Task Template"}</DialogTitle></DialogHeader>
      <div className="grid gap-3"><Input placeholder={isAr?"العنوان العربي":"Arabic title"} value={templateForm.titleAr} onChange={e=>setTemplateForm({...templateForm,titleAr:e.target.value})}/><Input placeholder={isAr?"العنوان الإنجليزي":"English title"} value={templateForm.titleEn} onChange={e=>setTemplateForm({...templateForm,titleEn:e.target.value})}/><Textarea placeholder={isAr?"الوصف":"Description"} value={templateForm.description} onChange={e=>setTemplateForm({...templateForm,description:e.target.value})}/><div className="grid gap-3 sm:grid-cols-2"><Select value={templateForm.category} onValueChange={v=>setTemplateForm({...templateForm,category:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Select value={templateForm.priority} onValueChange={v=>setTemplateForm({...templateForm,priority:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{priorities.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div><Select value={templateForm.recurrence} onValueChange={v=>setTemplateForm({...templateForm,recurrence:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Weekly">Weekly</SelectItem></SelectContent></Select><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>{isAr?"يوم البداية":"Start day"}</Label><Input type="number" min={1} max={31} value={templateForm.defaultStartDay} onChange={e=>setTemplateForm({...templateForm,defaultStartDay:Number(e.target.value)})}/></div><div className="space-y-1"><Label>{templateForm.recurrence==="Weekly"?(isAr?"يوم الأسبوع 1-7":"Weekday 1-7"):(isAr?"يوم الاستحقاق":"Due day")}</Label><Input type="number" min={1} max={31} value={templateForm.defaultDueDay} onChange={e=>setTemplateForm({...templateForm,defaultDueDay:Number(e.target.value)})}/></div></div><label className="flex items-center gap-2 rounded-lg border p-3"><input type="checkbox" checked={templateForm.evidenceRequired} onChange={e=>setTemplateForm({...templateForm,evidenceRequired:e.target.checked})}/>{isAr?"يتطلب إثبات":"Evidence required"}</label></div>
      <DialogFooter><Button variant="outline" onClick={()=>setTemplateDialog(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createTemplate()} disabled={!templateForm.titleAr||!templateForm.titleEn}>{isAr?"حفظ القالب":"Save Template"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
