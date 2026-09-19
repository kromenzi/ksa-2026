import { useMemo, useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ImportEntity = "employees"|"equipment-safety-assets"|"contractors"|"fire-devices"|"trainings";

function toCamel(value:string){
  return value.trim().replace(/^[^a-zA-Z]+/,"").replace(/[^a-zA-Z0-9]+(.)/g,(_,c)=>String(c).toUpperCase()).replace(/^./,m=>m.toLowerCase());
}
function parseCsv(text:string){
  const rows:string[][]=[]; let row:string[]=[]; let cell=""; let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted;
    }else if(ch===","&&!quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&text[i+1]==="\n")i++;
      row.push(cell); if(row.some(v=>v.trim()!==""))rows.push(row); row=[];cell="";
    }else cell+=ch;
  }
  row.push(cell); if(row.some(v=>v.trim()!==""))rows.push(row);
  if(rows.length<2)return [];
  const headers=rows[0].map(toCamel);
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]??"").trim()]).filter(([h])=>h)));
}

export default function ImportCenterPage(){
  const {settings}=useData(); const isAr=settings.language==="ar";
  const [entity,setEntity]=useState<ImportEntity>("employees");
  const [rows,setRows]=useState<any[]>([]);
  const [fileName,setFileName]=useState("");
  const [busy,setBusy]=useState(false);
  const [validation,setValidation]=useState<any|null>(null);

  const labels:Record<ImportEntity,string>={
    employees:isAr?"الموظفون":"Employees",
    "equipment-safety-assets":isAr?"المعدات":"Equipment",
    contractors:isAr?"المقاولون":"Contractors",
    "fire-devices":isAr?"أجهزة الحريق":"Fire Devices",
    trainings:isAr?"التدريب":"Trainings",
  };

  const columns=useMemo(()=>rows.length?Object.keys(rows[0]).slice(0,10):[],[rows]);

  const onFile=async(file?:File)=>{
    if(!file)return;
    setFileName(file.name); setValidation(null);
    const text=await file.text();
    try{
      const parsed=file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
      const normalized=Array.isArray(parsed)?parsed:[];
      setRows(normalized.slice(0,500));
      if(!normalized.length)toast.error(isAr?"لم يتم العثور على صفوف صالحة":"No valid rows found");
    }catch{setRows([]);toast.error(isAr?"تعذر قراءة الملف":"Unable to parse file");}
  };

  const validate=async()=>{
    if(!rows.length)return;
    setBusy(true);
    try{
      const r=await apiRequest("POST","/api/bulk-import",{entity,rows,dryRun:true});
      const p=await r.json(); setValidation(p); toast.success(isAr?"تم التحقق من الملف":"File validated");
    }catch(e:any){toast.error(e?.message||"Validation failed");}
    finally{setBusy(false);}
  };

  const importRows=async()=>{
    if(!rows.length)return;
    setBusy(true);
    try{
      const r=await apiRequest("POST","/api/bulk-import",{entity,rows});
      const p=await r.json(); setValidation(p); toast.success(isAr?`تم استيراد ${p.imported||0} سجل`:`Imported ${p.imported||0} records`);
    }catch(e:any){toast.error(e?.message||"Import failed");}
    finally{setBusy(false);}
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="rounded-3xl border bg-card p-6">
      <div className="flex gap-3 items-start"><div className="h-11 w-11 rounded-2xl bg-blue-500/10 grid place-items-center"><UploadCloud className="h-5 w-5 text-blue-600"/></div><div><h1 className="text-2xl font-bold">{isAr?"مركز استيراد البيانات التشغيلية":"Operational Data Import Center"}</h1><p className="text-sm text-muted-foreground mt-1">{isAr?"استيراد CSV أو JSON للموظفين والمعدات والمقاولين وأجهزة الحريق والتدريب مع تحقق قبل الحفظ.":"Import CSV/JSON for workforce, equipment, contractors, fire devices and training with server-side validation."}</p></div></div>
    </div>

    <div className="rounded-3xl border bg-card p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">{isAr?"نوع البيانات":"Data type"}</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={entity} onChange={e=>{setEntity(e.target.value as ImportEntity);setValidation(null);}}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">{isAr?"الملف":"File"}</span><input className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary" type="file" accept=".csv,.json,text/csv,application/json" onChange={e=>onFile(e.target.files?.[0])}/></label>
      </div>
      {fileName&&<div className="text-xs text-muted-foreground flex items-center gap-2"><FileSpreadsheet className="h-4 w-4"/>{fileName} · {rows.length} {isAr?"صف":"rows"}</div>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!rows.length||busy} onClick={validate}>{busy?<Loader2 className="h-4 w-4 animate-spin me-2"/>:<CheckCircle2 className="h-4 w-4 me-2"/>}{isAr?"تحقق فقط":"Dry Run"}</Button><Button disabled={!rows.length||busy} onClick={importRows}><UploadCloud className="h-4 w-4 me-2"/>{isAr?"استيراد إلى النظام":"Import to Safety Board"}</Button></div>
      {validation&&<div className="rounded-2xl border bg-muted/20 p-4 text-sm"><div className="font-medium flex items-center gap-2">{validation.error?<AlertTriangle className="h-4 w-4 text-red-500"/>:<CheckCircle2 className="h-4 w-4 text-emerald-600"/>}{validation.error|| (isAr?"الملف جاهز":"Ready")}</div><div className="text-xs text-muted-foreground mt-1">{isAr?"المقبول":"Accepted"}: {validation.rowsAccepted??validation.imported??0}</div></div>}
    </div>

    {rows.length>0&&<div className="rounded-3xl border bg-card overflow-hidden"><div className="px-5 py-4 border-b font-semibold">{isAr?"معاينة أول 20 صف":"Preview first 20 rows"}</div><div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-muted/30">{columns.map(c=><th className="text-start p-2 whitespace-nowrap" key={c}>{c}</th>)}</tr></thead><tbody>{rows.slice(0,20).map((r,i)=><tr className="border-t" key={i}>{columns.map(c=><td className="p-2 whitespace-nowrap max-w-[220px] truncate" key={c}>{String(r[c]??"")}</td>)}</tr>)}</tbody></table></div></div>}
  </div>;
}
