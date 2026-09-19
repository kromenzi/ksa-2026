import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Beaker, FileText, Plus, QrCode, RefreshCw, Search, ShieldCheck } from "lucide-react";
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

type Chemical={id:string;chemicalCode:string;productName:string;manufacturer?:string|null;casNumbers:string[];hazardClasses:string[];storageArea?:string|null;compatibilityGroup?:string|null;quantity:number;unit:string;maxAllowedQuantity?:number|null;productExpiryDate?:string|null;riskRating:string;requiredPpe:any[];spillResponse?:string|null;firstAid?:string|null;disposalMethod?:string|null;qrCode?:string|null;status:string;notes?:string|null;};
type SDS={id:string;chemicalId:string;revisionDate:string;reviewDueDate?:string|null;language:string;fileUrl:string;status:string;notes?:string|null;};
type Tx={id:string;chemicalId:string;transactionType:string;quantity:number;occurredAt:string;reference?:string|null;notes?:string|null;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const due=(v?:string|null)=>Boolean(v&&new Date(v).getTime()<Date.now());
const tone=(v:string)=>{const x=String(v||"").toLowerCase();if(["critical","expired","restricted"].includes(x))return"bg-red-500/10 text-red-700 border-red-500/30";if(["high","pending review"].includes(x))return"bg-orange-500/10 text-orange-700 border-orange-500/30";if(["active","current"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";return"bg-slate-500/10 text-slate-700 border-slate-500/30";};

export default function ChemicalsPage(){
  const {settings}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [createOpen,setCreateOpen]=useState(false);
  const [selected,setSelected]=useState<Chemical|null>(null);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({productName:"",manufacturer:"",casNumbers:"",hazardClasses:"",storageArea:"",compatibilityGroup:"General",quantity:"0",unit:"L",maxAllowedQuantity:"",productExpiryDate:"",riskRating:"Medium",requiredPpe:"Gloves,Goggles",spillResponse:"",firstAid:"",disposalMethod:"",notes:""});
  const [sdsForm,setSdsForm]=useState({revisionDate:new Date().toISOString().slice(0,10),reviewDueDate:"",language:"English",fileUrl:"",notes:""});
  const [txForm,setTxForm]=useState({transactionType:"Receive",quantity:"",reference:"",notes:""});

  const chemicalsQ=useQuery<Chemical[]>({queryKey:["chemicals"],queryFn:()=>load("/api/data?resource=chemicals")});
  const sdsQ=useQuery<SDS[]>({queryKey:["chemical-sds",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=chemical-sds&chemicalId=${selected!.id}`)});
  const txQ=useQuery<Tx[]>({queryKey:["chemical-tx",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=chemical-transactions&chemicalId=${selected!.id}`)});
  const chemicals=chemicalsQ.data||[],sds=sdsQ.data||[],txs=txQ.data||[];
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return chemicals.filter(c=>!q||[c.chemicalCode,c.productName,c.manufacturer,c.storageArea,c.compatibilityGroup,...c.casNumbers,...c.hazardClasses].some(v=>String(v||"").toLowerCase().includes(q)));},[chemicals,search]);
  const metrics=useMemo(()=>({
    total:chemicals.length,
    highRisk:chemicals.filter(c=>["High","Critical"].includes(c.riskRating)).length,
    expired:chemicals.filter(c=>c.status==="Expired"||due(c.productExpiryDate)).length,
    overLimit:chemicals.filter(c=>c.maxAllowedQuantity!=null&&Number(c.quantity)>Number(c.maxAllowedQuantity)).length
  }),[chemicals]);

  const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:["chemicals"]}),qc.invalidateQueries({queryKey:["chemical-sds"]}),qc.invalidateQueries({queryKey:["chemical-tx"]})]);

  const createChemical=async()=>{
    if(!form.productName.trim())return toast.error(isAr?"اسم المادة مطلوب":"Product name is required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=chemicals",{
        productName:form.productName.trim(),manufacturer:form.manufacturer.trim(),
        casNumbers:form.casNumbers.split(",").map(x=>x.trim()).filter(Boolean),
        hazardClasses:form.hazardClasses.split(",").map(x=>x.trim()).filter(Boolean),
        pictograms:[],storageArea:form.storageArea.trim(),compatibilityGroup:form.compatibilityGroup.trim(),
        quantity:Number(form.quantity||0),unit:form.unit,maxAllowedQuantity:form.maxAllowedQuantity?Number(form.maxAllowedQuantity):null,
        productExpiryDate:form.productExpiryDate||null,riskRating:form.riskRating,
        requiredPpe:form.requiredPpe.split(",").map(x=>x.trim()).filter(Boolean),
        spillResponse:form.spillResponse.trim(),firstAid:form.firstAid.trim(),disposalMethod:form.disposalMethod.trim(),
        qrCode:`CHEM-${Date.now()}`,status:"Active",notes:form.notes.trim()
      });
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create chemical");
      toast.success(isAr?"تم إنشاء سجل المادة":"Chemical record created");setCreateOpen(false);await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create chemical");}finally{setSaving(false);}
  };

  const addSds=async()=>{
    if(!selected||!sdsForm.fileUrl.trim())return toast.error(isAr?"رابط SDS مطلوب":"SDS file URL is required");
    const r=await apiRequest("POST","/api/data?resource=chemical-sds",{chemicalId:selected.id,...sdsForm,reviewDueDate:sdsForm.reviewDueDate||null,status:"Current"});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to save SDS");
    toast.success(isAr?"تم حفظ SDS":"SDS saved");await refresh();
  };

  const addTx=async()=>{
    if(!selected||!Number(txForm.quantity))return;
    const r=await apiRequest("POST","/api/data?resource=chemical-transactions",{chemicalId:selected.id,transactionType:txForm.transactionType,quantity:Number(txForm.quantity),reference:txForm.reference,notes:txForm.notes});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to record transaction");
    toast.success(isAr?"تم تحديث المخزون":"Inventory updated");setTxForm({transactionType:"Receive",quantity:"",reference:"",notes:""});await refresh();
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-600 text-white"><Beaker className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"إدارة المواد الكيميائية وSDS":"Chemical & SDS Management"}</h1><p className="text-xs text-muted-foreground">{isAr?"المخزون، SDS، التوافق، PPE، والاستجابة للانسكاب":"Inventory, SDS, compatibility, PPE and spill response"}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button onClick={()=>setCreateOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"مادة جديدة":"New Chemical"}</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={isAr?"المواد":"Chemicals"} value={metrics.total} icon={<Beaker className="h-4 w-4"/>}/><Metric label={isAr?"High/Critical":"High/Critical"} value={metrics.highRisk} icon={<AlertTriangle className="h-4 w-4 text-red-600"/>}/><Metric label={isAr?"منتهية":"Expired"} value={metrics.expired} icon={<FileText className="h-4 w-4 text-orange-600"/>}/><Metric label={isAr?"فوق الحد":"Over Limit"} value={metrics.overLimit} icon={<ShieldCheck className="h-4 w-4 text-red-600"/>}/></div>
    <Card><CardContent className="space-y-4 p-4"><div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث بالمادة أو CAS أو منطقة التخزين...":"Search product, CAS or storage area..."}/></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>{isAr?"المادة":"Chemical"}</TableHead><TableHead>{isAr?"التخزين":"Storage"}</TableHead><TableHead>{isAr?"الكمية":"Quantity"}</TableHead><TableHead>{isAr?"المخاطر":"Risk"}</TableHead><TableHead>{isAr?"الانتهاء":"Expiry"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c=><TableRow key={c.id} className="cursor-pointer" onClick={()=>setSelected(c)}><TableCell><p className="font-semibold">{c.chemicalCode}</p><p className="text-xs text-muted-foreground">{c.productName}</p></TableCell><TableCell>{c.storageArea||"—"} · {c.compatibilityGroup||"—"}</TableCell><TableCell className={c.maxAllowedQuantity!=null&&Number(c.quantity)>Number(c.maxAllowedQuantity)?"text-red-600 font-semibold":""}>{c.quantity} {c.unit}{c.maxAllowedQuantity!=null?` / max ${c.maxAllowedQuantity}`:""}</TableCell><TableCell><Badge variant="outline" className={tone(c.riskRating)}>{c.riskRating}</Badge></TableCell><TableCell className={due(c.productExpiryDate)?"text-red-600":""}>{c.productExpiryDate||"—"}</TableCell><TableCell><Badge variant="outline" className={tone(c.status)}>{c.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{isAr?"إضافة مادة كيميائية":"Add Chemical"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
      <Field label={isAr?"اسم المنتج":"Product Name"} wide><Input value={form.productName} onChange={e=>setForm({...form,productName:e.target.value})}/></Field><Field label={isAr?"الشركة المصنعة":"Manufacturer"}><Input value={form.manufacturer} onChange={e=>setForm({...form,manufacturer:e.target.value})}/></Field><Field label="CAS"><Input value={form.casNumbers} onChange={e=>setForm({...form,casNumbers:e.target.value})} placeholder="64-17-5, ..."/></Field>
      <Field label={isAr?"تصنيفات المخاطر":"Hazard Classes"} wide><Input value={form.hazardClasses} onChange={e=>setForm({...form,hazardClasses:e.target.value})} placeholder="Flammable, Corrosive"/></Field><Field label={isAr?"منطقة التخزين":"Storage Area"}><Input value={form.storageArea} onChange={e=>setForm({...form,storageArea:e.target.value})}/></Field><Field label={isAr?"مجموعة التوافق":"Compatibility Group"}><Input value={form.compatibilityGroup} onChange={e=>setForm({...form,compatibilityGroup:e.target.value})}/></Field>
      <Field label={isAr?"الكمية":"Quantity"}><Input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field><Field label={isAr?"الوحدة":"Unit"}><Input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field><Field label={isAr?"الحد الأقصى":"Max Allowed"}><Input type="number" value={form.maxAllowedQuantity} onChange={e=>setForm({...form,maxAllowedQuantity:e.target.value})}/></Field><Field label={isAr?"انتهاء المنتج":"Product Expiry"}><Input type="date" value={form.productExpiryDate} onChange={e=>setForm({...form,productExpiryDate:e.target.value})}/></Field>
      <Field label={isAr?"المخاطر":"Risk"}><Select value={form.riskRating} onValueChange={v=>setForm({...form,riskRating:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"PPE":"Required PPE"}><Input value={form.requiredPpe} onChange={e=>setForm({...form,requiredPpe:e.target.value})}/></Field>
      <Field label={isAr?"الاستجابة للانسكاب":"Spill Response"} wide><Textarea value={form.spillResponse} onChange={e=>setForm({...form,spillResponse:e.target.value})}/></Field><Field label={isAr?"الإسعافات الأولية":"First Aid"} wide><Textarea value={form.firstAid} onChange={e=>setForm({...form,firstAid:e.target.value})}/></Field>
    </div><DialogFooter><Button variant="outline" onClick={()=>setCreateOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createChemical()} disabled={saving}>{isAr?"حفظ":"Save"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">{selected&&<><DialogHeader><DialogTitle>{selected.chemicalCode} — {selected.productName}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-4"><Info label={isAr?"المخاطر":"Risk"} value={selected.riskRating}/><Info label={isAr?"المخزون":"Inventory"} value={`${selected.quantity} ${selected.unit}`}/><Info label={isAr?"التخزين":"Storage"} value={selected.storageArea||"—"}/><Info label="QR" value={selected.qrCode||"—"}/></div>
      <Tabs defaultValue="sds"><TabsList><TabsTrigger value="sds">SDS</TabsTrigger><TabsTrigger value="inventory">{isAr?"المخزون":"Inventory"}</TabsTrigger><TabsTrigger value="safety">{isAr?"معلومات السلامة":"Safety"}</TabsTrigger></TabsList>
        <TabsContent value="sds" className="space-y-3"><div className="grid gap-2 md:grid-cols-4"><Input type="date" value={sdsForm.revisionDate} onChange={e=>setSdsForm({...sdsForm,revisionDate:e.target.value})}/><Input type="date" value={sdsForm.reviewDueDate} onChange={e=>setSdsForm({...sdsForm,reviewDueDate:e.target.value})}/><Input placeholder="https://.../sds.pdf" value={sdsForm.fileUrl} onChange={e=>setSdsForm({...sdsForm,fileUrl:e.target.value})}/><Button onClick={()=>void addSds()}>{isAr?"إضافة SDS":"Add SDS"}</Button></div><div className="space-y-2">{sds.map(s=><div key={s.id} className="flex items-center justify-between rounded-lg border p-3"><div><a href={s.fileUrl} target="_blank" rel="noreferrer" className="font-medium underline">SDS {s.language}</a><p className="text-xs text-muted-foreground">{s.revisionDate} → {s.reviewDueDate||"No review due"}</p></div><Badge variant="outline" className={tone(s.status)}>{s.status}</Badge></div>)}</div></TabsContent>
        <TabsContent value="inventory" className="space-y-3"><div className="grid gap-2 md:grid-cols-4"><Select value={txForm.transactionType} onValueChange={v=>setTxForm({...txForm,transactionType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Receive","Issue","Adjust","Dispose","Spill"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input type="number" placeholder={isAr?"الكمية":"Quantity"} value={txForm.quantity} onChange={e=>setTxForm({...txForm,quantity:e.target.value})}/><Input placeholder={isAr?"المرجع":"Reference"} value={txForm.reference} onChange={e=>setTxForm({...txForm,reference:e.target.value})}/><Button onClick={()=>void addTx()}>{isAr?"تسجيل":"Record"}</Button></div><div className="space-y-2">{txs.map(t=><div key={t.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{t.transactionType} — {t.quantity} {selected.unit}</span><span className="text-muted-foreground">{new Date(t.occurredAt).toLocaleString()}</span></div>)}</div></TabsContent>
        <TabsContent value="safety"><div className="grid gap-3 md:grid-cols-2"><Info label={isAr?"مجموعة التوافق":"Compatibility"} value={selected.compatibilityGroup||"—"}/><Info label={isAr?"PPE":"PPE"} value={(selected.requiredPpe||[]).join(", ")||"—"}/><div className="rounded-lg border p-3 md:col-span-2"><p className="text-xs text-muted-foreground">{isAr?"الاستجابة للانسكاب":"Spill Response"}</p><p className="mt-1">{selected.spillResponse||"—"}</p></div><div className="rounded-lg border p-3 md:col-span-2"><p className="text-xs text-muted-foreground">{isAr?"الإسعافات الأولية":"First Aid"}</p><p className="mt-1">{selected.firstAid||"—"}</p></div></div></TabsContent>
      </Tabs>
    </>}</DialogContent></Dialog>
  </div>;
}
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>}
