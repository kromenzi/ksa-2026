import { useState } from "react";
import { useLocation } from "wouter";
import { Bot, ExternalLink, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Msg={role:"user"|"assistant";text:string;route?:string;intent?:string;data?:any};
const suggestions=[
  ["ما هي إجراءات CAPA المتأخرة؟","Show overdue CAPA actions"],
  ["أعطني أعلى المخاطر المتبقية","Show top residual risks"],
  ["أي معدات تحتاج متابعة؟","Which equipment needs attention?"],
  ["ما حالة تصاريح العمل PTW؟","What is the PTW status?"],
  ["ما حالة الحريق ومخارج الطوارئ؟","Fire and emergency exit status"],
  ["أعطني ملخص HSE الحالي","Give me the current HSE summary"]
];
export default function HseAssistantPage(){
 const {settings}=useData();const isAr=settings.language==="ar";const [,setLocation]=useLocation();
 const [input,setInput]=useState("");const [busy,setBusy]=useState(false);
 const [messages,setMessages]=useState<Msg[]>([{role:"assistant",text:isAr?"أنا مساعد HSE للقراءة فقط. أجيب من بيانات البورد الحقيقية ولا أغير السجلات.":"I am the read-only HSE assistant. I answer from live board data and do not modify records."}]);
 const ask=async(q=input)=>{const question=q.trim();if(!question||busy)return;setMessages(m=>[...m,{role:"user",text:question}]);setInput("");setBusy(true);try{const r=await apiRequest("POST","/api/data?resource=hse-assistant",{question});const p=await r.json();if(!r.ok)throw new Error(p?.error||"Assistant query failed");setMessages(m=>[...m,{role:"assistant",text:isAr?p.answerAr:p.answerEn,route:p.route,intent:p.intent,data:p.data}]);}catch(e:any){toast.error(e?.message||"Assistant query failed");}finally{setBusy(false);}};
 return <div className="mx-auto max-w-4xl space-y-4" dir={isAr?"rtl":"ltr"}>
  <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white"><Bot className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"مساعد HSE الذكي":"HSE Operational Assistant"}</h1><p className="text-xs text-muted-foreground">{isAr?"Read-Only ومؤسس على بيانات Supabase الحية":"Read-only and grounded in live Supabase data"}</p></div></div>
  <div className="flex flex-wrap gap-2">{suggestions.map(([ar,en])=><Button key={en} variant="outline" size="sm" onClick={()=>void ask(isAr?ar:en)}>{isAr?ar:en}</Button>)}</div>
  <Card><CardContent className="space-y-4 p-4">
   <div className="max-h-[62vh] min-h-[420px] space-y-4 overflow-y-auto rounded-xl bg-muted/20 p-3">
    {messages.map((m,i)=><div key={i} className={`flex gap-2 ${m.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[88%] rounded-2xl p-3 ${m.role==="user"?"bg-primary text-primary-foreground":"border bg-background"}`}><div className="mb-1 flex items-center gap-2 text-xs opacity-70">{m.role==="user"?<UserRound className="h-3 w-3"/>:<ShieldCheck className="h-3 w-3"/>}{m.role==="user"?(isAr?"أنت":"You"):(isAr?"HSE Assistant":"HSE Assistant")}{m.intent&&<Badge variant="outline" className="text-[9px]">{m.intent}</Badge>}</div><p className="whitespace-pre-wrap text-sm">{m.text}</p>{m.data&&<DataPreview data={m.data}/>} {m.route&&<Button variant="link" className="mt-2 h-auto p-0" onClick={()=>setLocation(m.route!)}><ExternalLink className="me-1 h-3 w-3"/>{isAr?"فتح القسم المصدر":"Open source module"}</Button>}</div></div>)}
    {busy&&<div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 animate-pulse"/>{isAr?"جاري قراءة بيانات HSE...":"Reading HSE data..."}</div>}
   </div>
   <div className="flex gap-2"><Input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&void ask()} placeholder={isAr?"اسأل عن CAPA، المخاطر، المعدات، PTW، الحريق...":"Ask about CAPA, risks, equipment, PTW, fire..."}/><Button onClick={()=>void ask()} disabled={busy||!input.trim()}><Send className="h-4 w-4"/></Button></div>
  </CardContent></Card>
  <div className="rounded-xl border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">{isAr?"هذا المساعد لا ينشئ أو يغلق أو يعدل سجلات HSE. أي تغيير تشغيلي يتم من الوحدة الأصلية وبصلاحيات المستخدم.":"This assistant cannot create, close, or modify HSE records. Operational changes must be made in the source module under the user's permissions."}</div>
 </div>;
}
function DataPreview({data}:{data:any}){
 if(Array.isArray(data)) return <div className="mt-3 space-y-1">{data.slice(0,8).map((x:any,i:number)=><div key={i} className="rounded-lg border bg-muted/30 p-2 text-xs">{x.ref||x.risk_no||x.asset_code||x.permit_no||x.title||JSON.stringify(x).slice(0,120)}</div>)}</div>;
 if(data&&typeof data==="object") return <div className="mt-3 grid gap-1 sm:grid-cols-2">{Object.entries(data).slice(0,12).map(([k,v])=><div key={k} className="rounded-lg border bg-muted/30 p-2 text-xs"><span className="text-muted-foreground">{k}: </span><b>{Array.isArray(v)?v.length:typeof v==="object"?JSON.stringify(v).slice(0,70):String(v)}</b></div>)}</div>;
 return null;
}
