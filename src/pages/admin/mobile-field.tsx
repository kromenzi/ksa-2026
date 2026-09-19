import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Camera, ExternalLink, QrCode, Search, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type QrRecord={id:string;qrCode:string;resourceType:string;resourceId:string;label:string;route:string;status:string;metadata:Record<string,any>;};

export default function MobileFieldPage(){
 const {settings}=useData();const isAr=settings.language==="ar";const [,setLocation]=useLocation();
 const [code,setCode]=useState("");const [record,setRecord]=useState<QrRecord|null>(null);const [loading,setLoading]=useState(false);const [scanning,setScanning]=useState(false);
 const videoRef=useRef<HTMLVideoElement|null>(null);const streamRef=useRef<MediaStream|null>(null);const rafRef=useRef<number|null>(null);
 const stopScan=()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);rafRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setScanning(false);};
 useEffect(()=>()=>stopScan(),[]);
 const lookup=async(raw=code)=>{const value=raw.trim();if(!value)return;setLoading(true);try{const r=await apiRequest("GET",`/api/data?resource=qr-lookup&code=${encodeURIComponent(value)}`);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Lookup failed");if(!p){setRecord(null);toast.error(isAr?"QR غير مسجل":"QR code is not registered");return;}setRecord(p);}catch(e:any){toast.error(e?.message||"Lookup failed");}finally{setLoading(false);}};
 const startScan=async()=>{const Detector=(window as any).BarcodeDetector;if(!Detector){toast.error(isAr?"المتصفح لا يدعم ماسح QR المباشر. استخدم إدخال الكود أو كاميرا النظام.":"This browser does not support direct QR scanning. Enter the code manually or use the system camera.");return;}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});streamRef.current=stream;setScanning(true);setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream;void videoRef.current.play();}},0);const detector=new Detector({formats:["qr_code"]});const tick=async()=>{if(!videoRef.current||!streamRef.current)return;try{const results=await detector.detect(videoRef.current);if(results?.[0]?.rawValue){const v=String(results[0].rawValue);setCode(v);stopScan();void lookup(v);return;}}catch{}rafRef.current=requestAnimationFrame(tick);};rafRef.current=requestAnimationFrame(tick);}catch{toast.error(isAr?"تعذر تشغيل الكاميرا. تحقق من صلاحية الكاميرا.":"Unable to start camera. Check camera permission.");stopScan();}};
 return <div className="mx-auto max-w-2xl space-y-4 pb-24" dir={isAr?"rtl":"ltr"}>
   <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white shadow-lg"><div className="flex items-center gap-3"><div className="rounded-2xl bg-white/15 p-3"><Smartphone className="h-7 w-7"/></div><div><h1 className="text-2xl font-bold">{isAr?"الوضع الميداني للجوال":"Mobile Field Mode"}</h1><p className="text-sm text-white/80">{isAr?"امسح QR للوصول إلى سجل السلامة مباشرة":"Scan a QR code to open the safety record directly"}</p></div></div></div>
   <Card><CardContent className="space-y-3 p-4"><div className="flex gap-2"><Input value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void lookup()} placeholder={isAr?"أدخل QR / Asset code...":"Enter QR / asset code..."}/><Button onClick={()=>void lookup()} disabled={loading}><Search className="h-4 w-4"/></Button></div><Button className="h-14 w-full text-base" variant={scanning?"destructive":"outline"} onClick={()=>scanning?stopScan():void startScan()}>{scanning?<><X className="me-2 h-5 w-5"/>{isAr?"إيقاف الكاميرا":"Stop Camera"}</>:<><Camera className="me-2 h-5 w-5"/>{isAr?"مسح QR بالكاميرا":"Scan QR with Camera"}</>}</Button>{scanning&&<div className="overflow-hidden rounded-2xl border bg-black"><video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover"/></div>}</CardContent></Card>
   {record&&<Card className="overflow-hidden border-2 border-blue-500/20"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="rounded-xl bg-blue-500/10 p-2 text-blue-600"><QrCode className="h-5 w-5"/></div><div><p className="text-lg font-bold">{record.label}</p><p className="text-xs text-muted-foreground">{record.qrCode}</p></div></div><Badge>{record.resourceType}</Badge></div><div className="grid gap-2 sm:grid-cols-2">{Object.entries(record.metadata||{}).map(([k,v])=><div key={k} className="rounded-xl border p-3"><p className="text-[11px] uppercase text-muted-foreground">{k}</p><p className="mt-1 break-words text-sm font-medium">{String(v??"—")}</p></div>)}</div><Button className="h-12 w-full" onClick={()=>setLocation(record.route)}><ExternalLink className="me-2 h-4 w-4"/>{isAr?"فتح السجل الكامل":"Open Full Record"}</Button></CardContent></Card>}
   <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">{isAr?"عند استخدام الكاميرا، المعالجة تتم داخل المتصفح ولا يتم رفع بث الفيديو إلى الخادم.":"When using the camera, QR detection runs in the browser; the video stream is not uploaded to the server."}</div>
 </div>;
}
