from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Missing anchor: {label}")
    return text.replace(old, new, 1)


# Dashboard: count persisted Near Miss records in the KPI.
dashboard_path = Path("src/pages/admin/dashboard.tsx")
dashboard = dashboard_path.read_text(encoding="utf-8")
dashboard = replace_once(
    dashboard,
    'import { Skeleton } from "@/components/ui/skeleton";\n',
    'import { Skeleton } from "@/components/ui/skeleton";\nimport { useQuery } from "@tanstack/react-query";\n',
    "dashboard react query import",
)
dashboard = replace_once(
    dashboard,
    '  const isAr = settings.language === "ar";\n',
    '  const isAr = settings.language === "ar";\n  const { data: incidentRecords = [] } = useQuery<any[]>({ queryKey: ["/api/incidents"], queryFn: async () => { const response = await fetch("/api/incidents", { credentials: "include", cache: "no-store" }); if (!response.ok) throw new Error("Unable to load incidents"); const rows = await response.json(); return Array.isArray(rows) ? rows : []; } });\n',
    "dashboard incidents query",
)
dashboard = replace_once(
    dashboard,
    "  const nearMissCount = safetyReports.filter(r => String(r.category || '').toLowerCase().includes('near miss')).length;\n",
    "  const nearMissCount = safetyReports.filter(r => String(r.category || '').toLowerCase().includes('near miss')).length + incidentRecords.filter((r: any) => String(r.data?.type || '').toLowerCase() === 'near miss').length;\n",
    "dashboard near miss count",
)
dashboard_path.write_text(dashboard, encoding="utf-8")


# Dashboard embedded incident pyramid: use persisted incidents and current date defaults.
pyramid_path = Path("src/components/incident-pyramid.tsx")
pyramid = pyramid_path.read_text(encoding="utf-8")
pyramid = replace_once(
    pyramid,
    'import { useState, useMemo } from "react";\n',
    'import { useState, useMemo } from "react";\nimport { useQuery } from "@tanstack/react-query";\n',
    "incident pyramid react query import",
)
pyramid = replace_once(
    pyramid,
    ' const {settings,safetyReports,ncrs}=useData(); const [,setLocation]=useLocation(); const isAr=settings.language==="ar";\n const [selectedMonth,setSelectedMonth]=useState(propMonth??7); const [selectedYear,setSelectedYear]=useState(propYear??2026); const [activeLevelModal,setActiveLevelModal]=useState<{level:PyramidLevelDefinition;isYtd:boolean}|null>(null);\n',
    ' const {settings,safetyReports,ncrs}=useData(); const [,setLocation]=useLocation(); const isAr=settings.language==="ar";\n const {data:incidentRecords=[]}=useQuery<any[]>({queryKey:["/api/incidents"],queryFn:async()=>{const response=await fetch("/api/incidents",{credentials:"include",cache:"no-store"});if(!response.ok)throw new Error("Unable to load incidents");const rows=await response.json();return Array.isArray(rows)?rows:[];}});\n const now=new Date(); const [selectedMonth,setSelectedMonth]=useState(propMonth??(now.getMonth()+1)); const [selectedYear,setSelectedYear]=useState(propYear??now.getFullYear()); const [activeLevelModal,setActiveLevelModal]=useState<{level:PyramidLevelDefinition;isYtd:boolean}|null>(null);\n',
    "incident pyramid incidents query and current period",
)
old_tail = '});return list;},[safetyReports,ncrs,selectedMonth,selectedYear]);'
new_tail = '''}); incidentRecords.forEach((inc:any)=>{const d=new Date(inc.date||inc.createdAt);const valid=!isNaN(d.getTime());const year=valid?d.getFullYear():selectedYear;const month=valid?d.getMonth()+1:selectedMonth;const type=String(inc.data?.type||"").toLowerCase();const desc=String(inc.data?.description||inc.title||"").toLowerCase();let levelId="unsafeActs";if(desc.includes("fatal"))levelId="fatality";else if(type==="lost time injury"||desc.includes("lost time")||desc.includes("lti"))levelId="lostTime";else if(desc.includes("restricted")||desc.includes("rwd"))levelId="restrictedWork";else if(type==="medical treatment"||desc.includes("medical")||desc.includes("mtc"))levelId="medicalTreatment";else if(type==="first aid"||desc.includes("first aid")||desc.includes("fac"))levelId="firstAid";else if(type==="near miss"||desc.includes("near miss")||desc.includes("near-miss"))levelId="nearMiss";list.push({id:inc.id,refNo:inc.refNo||inc.id,date:inc.date||new Date().toISOString().split("T")[0],month,year,category:inc.data?.type||"Incident",levelId,location:inc.data?.location||"Main Plant",department:inc.department||"HSE Dept",description:inc.data?.description||inc.title||"Incident Record",status:inc.status||"Under Investigation",responsible:inc.data?.reportedBy||"Safety Team"});});return list;},[safetyReports,ncrs,incidentRecords,selectedMonth,selectedYear]);'''
pyramid = replace_once(pyramid, old_tail, new_tail, "incident pyramid persisted records")
pyramid_path.write_text(pyramid, encoding="utf-8")


# Dedicated Safety Pyramid page: include persisted incident records.
safety_path = Path("src/pages/admin/safety-pyramid.tsx")
safety = safety_path.read_text(encoding="utf-8")
safety = replace_once(
    safety,
    'import { useMemo, useState } from "react";\n',
    'import { useMemo, useState } from "react";\nimport { useQuery } from "@tanstack/react-query";\n',
    "safety pyramid react query import",
)
safety = replace_once(
    safety,
    '  const isAr = settings.language === "ar";\n  const now = new Date();\n',
    '  const isAr = settings.language === "ar";\n  const { data: incidentRecords = [] } = useQuery<any[]>({ queryKey: ["/api/incidents"], queryFn: async () => { const response = await fetch("/api/incidents", { credentials: "include", cache: "no-store" }); if (!response.ok) throw new Error("Unable to load incidents"); const rows = await response.json(); return Array.isArray(rows) ? rows : []; } });\n  const now = new Date();\n',
    "safety pyramid incidents query",
)
records_anchor = '    ncrs.forEach((r: any) => { const d = new Date(r.date || r.createdAt); if (Number.isNaN(d.getTime())) return; out.push({ id: `ncr-${r.id}`, refNo: r.refNo || r.id, date: d.toISOString().slice(0,10), month: d.getMonth()+1, year: d.getFullYear(), level: classifyNcr(r), description: r.description || "NCR", location: r.location || "Main Plant", department: r.department || "General", status: r.status || "Open" }); });\n    return out;\n  }, [safetyReports, ncrs]);\n'
records_new = '''    ncrs.forEach((r: any) => { const d = new Date(r.date || r.createdAt); if (Number.isNaN(d.getTime())) return; out.push({ id: `ncr-${r.id}`, refNo: r.refNo || r.id, date: d.toISOString().slice(0,10), month: d.getMonth()+1, year: d.getFullYear(), level: classifyNcr(r), description: r.description || "NCR", location: r.location || "Main Plant", department: r.department || "General", status: r.status || "Open" }); });\n    incidentRecords.forEach((r: any) => { const d = new Date(r.date || r.createdAt); if (Number.isNaN(d.getTime())) return; const type = String(r.data?.type || "").toLowerCase(); const description = String(r.data?.description || r.title || ""); const lower = description.toLowerCase(); let level: LevelId = "unsafeActs"; if (lower.includes("fatal")) level = "fatality"; else if (type === "lost time injury" || lower.includes("lost time") || lower.includes("lti")) level = "lostTime"; else if (lower.includes("restricted") || lower.includes("rwd")) level = "restrictedWork"; else if (type === "medical treatment" || lower.includes("medical") || lower.includes("mtc")) level = "medicalTreatment"; else if (type === "first aid" || lower.includes("first aid") || lower.includes("fac")) level = "firstAid"; else if (type === "near miss" || lower.includes("near miss") || lower.includes("near-miss")) level = "nearMiss"; out.push({ id: `incident-${r.id}`, refNo: r.refNo || r.id, date: d.toISOString().slice(0,10), month: d.getMonth()+1, year: d.getFullYear(), level, description: description || "Incident / Near Miss", location: r.data?.location || "Main Plant", department: r.department || "General", status: r.status || "Under Investigation" }); });\n    return out;\n  }, [safetyReports, ncrs, incidentRecords]);\n'''
safety = replace_once(safety, records_anchor, records_new, "safety pyramid persisted records")
safety_path.write_text(safety, encoding="utf-8")

print("Persisted incidents are now linked to Dashboard and both Safety Pyramid views.")
