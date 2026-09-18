import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserPlus, Search, RefreshCw, CalendarDays, CheckCircle2, AlertTriangle, Link2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type HseEmployee = {
  id:string;
  name:string;
  employeeId?:string|null;
  title?:string|null;
  factory?:string|null;
  hseArea?:string|null;
  shift?:string|null;
  email?:string|null;
  phone?:string|null;
  status?:string|null;
  userId?:string|null;
  employeeType:string;
};

type MonthlyTask = {
  id:string;
  assignedEmployeeId?:string|null;
  status:string;
  dueDate:string;
  priority:string;
};

const today=()=>new Date().toISOString().slice(0,10);

export default function AdminHseTeamPage(){
  const {settings}=useData();
  const isAr=settings.language==="ar";
  const now=new Date();
  const [employees,setEmployees]=useState<HseEmployee[]>([]);
  const [tasks,setTasks]=useState<MonthlyTask[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    name:"",employeeId:"",title:"Safety Officer",factory:"MV/LV",hseArea:"",shift:"Day",email:"",phone:"",status:"Active"
  });

  const load=async()=>{
    setLoading(true);
    try{
      const [er,tr]=await Promise.all([
        apiRequest("GET","/api/data?resource=employee-directory&type=hse"),
        apiRequest("GET",`/api/monthly-hse-plan?action=tasks&month=${now.getMonth()+1}&year=${now.getFullYear()}`)
      ]);
      const ep=await er.json();
      const tp=await tr.json();
      if(!er.ok) throw new Error(ep?.error||"Unable to load HSE team");
      setEmployees(Array.isArray(ep)?ep:[]);
      setTasks(tr.ok&&Array.isArray(tp)?tp:[]);
    }catch(error:any){
      toast.error(error?.message||(isAr?"تعذر تحميل فريق السلامة":"Unable to load HSE team"));
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{void load();},[]);

  const save=async()=>{
    if(!form.name.trim()||!form.employeeId.trim()){
      toast.error(isAr?"الاسم والرقم الوظيفي مطلوبان":"Name and employee ID are required");
      return;
    }
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=employees",{
        name:form.name.trim(),
        employeeId:form.employeeId.trim(),
        title:form.title.trim(),
        department:"HSE",
        factory:form.factory.trim(),
        hseArea:form.hseArea.trim(),
        shift:form.shift,
        email:form.email.trim(),
        phone:form.phone.trim(),
        status:form.status,
        employeeType:"hse",
        medicalStatus:"Fit",
        ppeIssued:[],
        incidentsCount:0,ncrCount:0,trainingsCompleted:0,violationsCount:0
      });
      const body=await r.json();
      if(!r.ok) throw new Error(body?.error||"Unable to save HSE employee");
      toast.success(isAr?"تم إضافة موظف السلامة":"HSE employee added");
      setOpen(false);
      setForm({name:"",employeeId:"",title:"Safety Officer",factory:"MV/LV",hseArea:"",shift:"Day",email:"",phone:"",status:"Active"});
      await load();
    }catch(error:any){
      toast.error(error?.message||(isAr?"تعذر حفظ موظف السلامة":"Unable to save HSE employee"));
    }finally{setSaving(false);}
  };

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q) return employees;
    return employees.filter(e=>[e.name,e.employeeId,e.title,e.factory,e.hseArea,e.shift].some(v=>String(v||"").toLowerCase().includes(q)));
  },[employees,search]);

  const metrics=(employeeId:string)=>{
    const mine=tasks.filter(t=>t.assignedEmployeeId===employeeId);
    const completed=mine.filter(t=>t.status==="Completed").length;
    const overdue=mine.filter(t=>!["Completed","Cancelled"].includes(t.status)&&t.dueDate<today()).length;
    return {total:mine.length,completed,overdue};
  };

  const linked=employees.filter(e=>Boolean(e.userId)).length;
  const openTasks=tasks.filter(t=>!["Completed","Cancelled"].includes(t.status)).length;
  const overdue=tasks.filter(t=>!["Completed","Cancelled"].includes(t.status)&&t.dueDate<today()).length;

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white"><ShieldCheck className="h-6 w-6"/></div>
        <div>
          <h1 className="text-2xl font-bold">{isAr?"فريق السلامة HSE":"HSE Safety Team"}</h1>
          <p className="text-xs text-muted-foreground">{isAr?"سجل مستقل لموظفي السلامة وربطهم بالخطة الشهرية":"Dedicated HSE staff directory linked to the monthly work plan"}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className={"me-2 h-4 w-4 "+(loading?"animate-spin":"")}/>{isAr?"تحديث":"Refresh"}</Button>
        <Button onClick={()=>setOpen(true)}><UserPlus className="me-2 h-4 w-4"/>{isAr?"إضافة موظف سلامة":"Add HSE Staff"}</Button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"فريق HSE":"HSE Staff"}</p><p className="mt-1 text-2xl font-bold">{employees.length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"مرتبط بحساب النظام":"Linked Accounts"}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{linked}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"مهام الشهر المفتوحة":"Open Monthly Tasks"}</p><p className="mt-1 text-2xl font-bold text-blue-600">{openTasks}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"مهام متأخرة":"Overdue Tasks"}</p><p className="mt-1 text-2xl font-bold text-red-600">{overdue}</p></CardContent></Card>
    </div>

    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث بالاسم أو الرقم أو المنطقة...":"Search name, ID or responsibility area..."}/></div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{isAr?"الموظف":"Employee"}</TableHead>
              <TableHead>{isAr?"المسمى":"Title"}</TableHead>
              <TableHead>{isAr?"المسؤولية / المصنع":"Area / Factory"}</TableHead>
              <TableHead>{isAr?"الوردية":"Shift"}</TableHead>
              <TableHead>{isAr?"حساب النظام":"System Account"}</TableHead>
              <TableHead>{isAr?"مهام الشهر":"Monthly Tasks"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {!loading&&filtered.length===0&&<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">{isAr?"لا يوجد موظفو سلامة بعد":"No HSE staff records yet"}</TableCell></TableRow>}
              {filtered.map(e=>{
                const m=metrics(e.id);
                return <TableRow key={e.id}>
                  <TableCell><div className="font-semibold">{e.name}</div><div className="text-xs text-muted-foreground">{e.employeeId||"—"}</div></TableCell>
                  <TableCell>{e.title||"—"}</TableCell>
                  <TableCell><div>{e.hseArea||"—"}</div><div className="text-xs text-muted-foreground">{e.factory||"—"}</div></TableCell>
                  <TableCell>{e.shift||"—"}</TableCell>
                  <TableCell>{e.userId?<Badge className="gap-1 bg-emerald-600"><Link2 className="h-3 w-3"/>{isAr?"مرتبط":"Linked"}</Badge>:<Badge variant="outline">{isAr?"غير مرتبط":"Not linked"}</Badge>}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1"><Badge variant="outline"><CalendarDays className="me-1 h-3 w-3"/>{m.total}</Badge><Badge variant="outline" className="text-emerald-700"><CheckCircle2 className="me-1 h-3 w-3"/>{m.completed}</Badge>{m.overdue>0&&<Badge variant="destructive"><AlertTriangle className="me-1 h-3 w-3"/>{m.overdue}</Badge>}</div></TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isAr?"إضافة موظف لفريق HSE":"Add HSE Team Member"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>{isAr?"الاسم":"Name"}</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="space-y-1"><Label>{isAr?"الرقم الوظيفي":"Employee ID"}</Label><Input value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})}/></div>
        <div className="space-y-1"><Label>{isAr?"المسمى":"Title"}</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div className="space-y-1"><Label>{isAr?"المصنع":"Factory"}</Label><Input value={form.factory} onChange={e=>setForm({...form,factory:e.target.value})}/></div>
        <div className="space-y-1"><Label>{isAr?"منطقة المسؤولية":"Responsibility Area"}</Label><Input value={form.hseArea} onChange={e=>setForm({...form,hseArea:e.target.value})}/></div>
        <div className="space-y-1"><Label>{isAr?"الوردية":"Shift"}</Label><Select value={form.shift} onValueChange={v=>setForm({...form,shift:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Day">{isAr?"نهاري":"Day"}</SelectItem><SelectItem value="Evening">{isAr?"مسائي":"Evening"}</SelectItem><SelectItem value="Night">{isAr?"ليلي":"Night"}</SelectItem><SelectItem value="Rotating">{isAr?"متغير":"Rotating"}</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label>{isAr?"البريد":"Email"}</Label><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div className="space-y-1"><Label>{isAr?"الجوال":"Phone"}</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void save()} disabled={saving}>{saving?(isAr?"جارٍ الحفظ...":"Saving..."):(isAr?"حفظ":"Save")}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
