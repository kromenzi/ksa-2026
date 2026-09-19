import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cross, Droplets, Flame, Map, MapPin, Plus, RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { Dialog,DialogContent,DialogFooter,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";

type Floor={id:string;name:string;building:string;floor?:string|null;imageUrl?:string|null;width:number;height:number;active:boolean;};
type Point={id:string;floorPlanId:string;pointType:string;label:string;resourceType?:string|null;resourceId?:string|null;mapX:number;mapY:number;status:string;icon?:string|null;};
type FireDevice={id:string;deviceCode:string;deviceType:string;floorPlanId?:string|null;mapX?:number|null;mapY?:number|null;status:string;exactLocation?:string|null;};
type Exit={id:string;exitCode:string;name:string;floorPlanId?:string|null;mapX?:number|null;mapY?:number|null;status:string;};
const load=async<T,>(u:string):Promise<T>=>{const r=await apiRequest("GET",u);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const dot=(s:string)=>["Critical","alarm","blocked","locked","fault","offline"].includes(s)?"bg-red-600":["Warning","pre_alarm","supervisory"].includes(s)?"bg-amber-500":"bg-emerald-600";
export default function SafetyMapPage(){
 const {settings}=useData();const isAr=settings.language==="ar";const qc=useQueryClient();
 const floorsQ=useQuery<Floor[]>({queryKey:["floor-plans"],queryFn:()=>load("/api/data?resource=site-floor-plans")});
 const devicesQ=useQuery<FireDevice[]>({queryKey:["map-fire-devices"],queryFn:()=>load("/api/data?resource=fire-devices")});
 const exitsQ=useQuery<Exit[]>({queryKey:["map-exits"],queryFn:()=>load("/api/data?resource=emergency-exits")});
 const [floorId,setFloorId]=useState("");const [floorOpen,setFloorOpen]=useState(false);const [pointOpen,setPointOpen]=useState(false);
 const [floorForm,setFloorForm]=useState({name:"",building:"",floor:"",imageUrl:"",width:"100",height:"100"});
 const [pointForm,setPointForm]=useState({pointType:"First Aid",label:"",mapX:"50",mapY:"50",status:"Normal",resourceType:"",resourceId:""});
 const floors=floorsQ.data||[];const current=floors.find(f=>f.id===(floorId||floors[0]?.id));const currentId=current?.id||"";
 const pointsQ=useQuery<Point[]>({queryKey:["safety-map-points",currentId],enabled:!!currentId,queryFn:()=>load(`/api/data?resource=safety-map-points&floorPlanId=${currentId}`)});
 const points=pointsQ.data||[];const devices=(devicesQ.data||[]).filter(d=>d.floorPlanId===currentId&&d.mapX!=null&&d.mapY!=null);const exits=(exitsQ.data||[]).filter(e=>e.floorPlanId===currentId&&e.mapX!=null&&e.mapY!=null);
 const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:["floor-plans"]}),qc.invalidateQueries({queryKey:["safety-map-points"]}),qc.invalidateQueries({queryKey:["map-fire-devices"]}),qc.invalidateQueries({queryKey:["map-exits"]})]);
 const addFloor=async()=>{if(!floorForm.name.trim()||!floorForm.building.trim())return;const r=await apiRequest("POST","/api/data?resource=site-floor-plans",{...floorForm,width:Number(floorForm.width),height:Number(floorForm.height),active:true});const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to create floor");setFloorOpen(false);setFloorId(p.id);await refresh();};
 const addPoint=async()=>{if(!currentId||!pointForm.label.trim())return;const r=await apiRequest("POST","/api/data?resource=safety-map-points",{floorPlanId:currentId,...pointForm,mapX:Number(pointForm.mapX),mapY:Number(pointForm.mapY),resourceType:pointForm.resourceType||null,resourceId:pointForm.resourceId||null,details:{}});const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to create point");setPointOpen(false);await refresh();};
 const icon=(t:string)=>t==="First Aid"?<Cross className="h-4 w-4"/>:t==="Spill Kit"?<Droplets className="h-4 w-4"/>:t==="Equipment"?<Truck className="h-4 w-4"/>:t==="High Risk Zone"?<ShieldAlert className="h-4 w-4"/>:<MapPin className="h-4 w-4"/>;
 return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white"><Map className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"خريطة سلامة المصنع":"Factory Safety Map"}</h1><p className="text-xs text-muted-foreground">{isAr?"طبقات موحدة للأجهزة والمخارج والإسعافات والانسكابات والمعدات":"Unified layers for fire devices, exits, first aid, spill kits and equipment"}</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button variant="outline" onClick={()=>setFloorOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"Floor Plan":"Floor Plan"}</Button><Button onClick={()=>setPointOpen(true)} disabled={!current}><Plus className="me-2 h-4 w-4"/>{isAr?"نقطة سلامة":"Safety Point"}</Button></div></div>
  <Card><CardContent className="space-y-4 p-4">
   <div className="flex flex-wrap items-center gap-2"><Select value={currentId||undefined} onValueChange={setFloorId}><SelectTrigger className="w-[300px]"><SelectValue placeholder={isAr?"اختر المخطط":"Select floor plan"}/></SelectTrigger><SelectContent>{floors.map(f=><SelectItem key={f.id} value={f.id}>{f.building} · {f.floor||"—"} · {f.name}</SelectItem>)}</SelectContent></Select><Badge variant="outline"><Flame className="me-1 h-3 w-3"/>{devices.length}</Badge><Badge variant="outline">{isAr?"مخارج":"Exits"} {exits.length}</Badge><Badge variant="outline">{isAr?"نقاط إضافية":"Points"} {points.length}</Badge></div>
   {!current?<div className="py-20 text-center text-muted-foreground">{isAr?"أنشئ Floor Plan للبدء":"Create a floor plan to begin"}</div>:<div className="relative min-h-[540px] overflow-hidden rounded-xl border bg-muted/30" style={current.imageUrl?{backgroundImage:`url(${current.imageUrl})`,backgroundSize:"100% 100%",backgroundRepeat:"no-repeat"}:{}}>
     {!current.imageUrl&&<div className="absolute inset-0 grid place-items-center text-muted-foreground"><div className="text-center"><Map className="mx-auto h-12 w-12 opacity-30"/><p className="mt-2 text-sm">{isAr?"لا توجد صورة مخطط؛ الإحداثيات النسبية ما زالت تعمل":"No plan image; relative coordinates are still usable"}</p></div></div>}
     {points.map(p=><MapDot key={p.id} x={p.mapX} y={p.mapY} status={p.status} title={p.label}>{icon(p.pointType)}</MapDot>)}
     {devices.map(d=><MapDot key={d.id} x={Number(d.mapX)} y={Number(d.mapY)} status={d.status} title={d.deviceCode}><Flame className="h-4 w-4"/></MapDot>)}
     {exits.map(e=><MapDot key={e.id} x={Number(e.mapX)} y={Number(e.mapY)} status={e.status} title={e.exitCode}><span className="text-xs font-bold">EXIT</span></MapDot>)}
   </div>}
  </CardContent></Card>
  <Dialog open={floorOpen} onOpenChange={setFloorOpen}><DialogContent><DialogHeader><DialogTitle>{isAr?"Floor Plan جديد":"New Floor Plan"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label={isAr?"الاسم":"Name"}><Input value={floorForm.name} onChange={e=>setFloorForm({...floorForm,name:e.target.value})}/></Field><Field label={isAr?"المبنى":"Building"}><Input value={floorForm.building} onChange={e=>setFloorForm({...floorForm,building:e.target.value})}/></Field><Field label={isAr?"الطابق":"Floor"}><Input value={floorForm.floor} onChange={e=>setFloorForm({...floorForm,floor:e.target.value})}/></Field><Field label={isAr?"رابط صورة المخطط":"Plan Image URL"}><Input value={floorForm.imageUrl} onChange={e=>setFloorForm({...floorForm,imageUrl:e.target.value})}/></Field></div><DialogFooter><Button onClick={()=>void addFloor()}>{isAr?"إنشاء":"Create"}</Button></DialogFooter></DialogContent></Dialog>
  <Dialog open={pointOpen} onOpenChange={setPointOpen}><DialogContent><DialogHeader><DialogTitle>{isAr?"نقطة سلامة":"Safety Point"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label={isAr?"النوع":"Type"}><Select value={pointForm.pointType} onValueChange={v=>setPointForm({...pointForm,pointType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["First Aid","Spill Kit","Chemical","Equipment","High Risk Zone","Fire Equipment","Assembly Point","Other"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"الاسم":"Label"}><Input value={pointForm.label} onChange={e=>setPointForm({...pointForm,label:e.target.value})}/></Field><Field label="X %"><Input type="number" min="0" max="100" value={pointForm.mapX} onChange={e=>setPointForm({...pointForm,mapX:e.target.value})}/></Field><Field label="Y %"><Input type="number" min="0" max="100" value={pointForm.mapY} onChange={e=>setPointForm({...pointForm,mapY:e.target.value})}/></Field></div><DialogFooter><Button onClick={()=>void addPoint()}>{isAr?"إضافة":"Add"}</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
function MapDot({x,y,status,title,children}:{x:number;y:number;status:string;title:string;children:any}){return <div className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{left:`${x}%`,top:`${y}%`}}><div className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white text-white shadow-lg ${dot(status)}`}>{children}</div><div className="pointer-events-none absolute start-1/2 top-10 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] text-white group-hover:block">{title} · {status}</div></div>}
function Field({label,children}:{label:string;children:any}){return <div className="space-y-1"><Label>{label}</Label>{children}</div>}
