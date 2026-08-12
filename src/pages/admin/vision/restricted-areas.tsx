import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Plus } from "lucide-react";

export default function VisionRestrictedAreas() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [zones, setZones] = useState([
    { id: "ZONE-01", name: "Hazmat Solvent Tank Storage", camera: "CAM-102", type: "Polygon", risk: "CRITICAL", schedule: "24/7" },
    { id: "ZONE-02", name: "Substation High Voltage Transformer", camera: "CAM-105", type: "Rectangle", risk: "HIGH", schedule: "24/7" },
    { id: "ZONE-03", name: "Crane Pedestrian Line Crossing", camera: "CAM-103", type: "Line Crossing", risk: "HIGH", schedule: "Shift A & B" }
  ]);

  const [newZone, setNewZone] = useState({ name: "", camera: "CAM-101", type: "Polygon", risk: "HIGH" });

  const handleAddZone = () => {
    if (!newZone.name) {
      toast.error(isAr ? "يرجى كتابة اسم المنطقة المحظورة" : "Please specify zone name");
      return;
    }
    const created = {
      id: `ZONE-${String(zones.length + 1).padStart(2, "0")}`,
      name: newZone.name,
      camera: newZone.camera,
      type: newZone.type,
      risk: newZone.risk,
      schedule: "24/7"
    };
    setZones([...zones, created]);
    setNewZone({ name: "", camera: "CAM-101", type: "Polygon", risk: "HIGH" });
    toast.success(isAr ? "تمت إضافة المنطقة المحظورة بنجاح" : "Restricted zone added successfully");
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-amber-600 text-white font-mono text-xs mb-1">RESTRICTED ZONE & LINE CROSSING</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "رسم وإدارة المناطق المحظورة (Restricted Area Zones)" : "Restricted Zone & Line Crossing Engine"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "تحديد مناطق المنع المضلعة، خطوط العبور، وإرسال تنبيهات خرق المنطقة تلقائياً" : "Configure virtual polygon zones, entry/exit boundaries and automatic severity alerts"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/70 shadow-sm rounded-2xl overflow-hidden bg-slate-950 text-white p-4">
          <CardHeader className="p-0 mb-4 border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {isAr ? "لوحة تحديد النطاق المحظور على البث الحي" : "Interactive Zone Overlay Drawer"}
            </CardTitle>
          </CardHeader>
          <div className="relative h-80 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-dashed border-rose-500/60 rounded-xl m-8 flex items-center justify-center bg-rose-500/10">
              <span className="text-rose-400 font-mono text-xs font-bold">VIRTUAL POLYGON RESTRICTED ZONE [CLICK TO ADD POINTS]</span>
            </div>
          </div>
        </Card>

        <Card className="border border-border/70 shadow-sm rounded-2xl p-4 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold">{isAr ? "تكوين منطقة حظر جديدة" : "Add Restricted Zone"}</CardTitle>
          </CardHeader>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">{isAr ? "اسم المنطقة" : "Zone Name"}</Label>
              <Input value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} placeholder="e.g. Chemical Tank Storage Yard" className="h-9 mt-1" />
            </div>

            <div>
              <Label className="text-xs">{isAr ? "نوع الشحذ" : "Zone Boundary Type"}</Label>
              <Select value={newZone.type} onValueChange={(val) => setNewZone({ ...newZone, type: val })}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Polygon">Polygon Zone</SelectItem>
                  <SelectItem value="Rectangle">Rectangle Zone</SelectItem>
                  <SelectItem value="Line Crossing">Line Crossing Boundary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{isAr ? "مستوى الخطورة" : "Severity Risk"}</Label>
              <Select value={newZone.risk} onValueChange={(val) => setNewZone({ ...newZone, risk: val })}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAddZone} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold h-9">
              <Plus className="w-4 h-4 me-1" />
              {isAr ? "حفظ المنطقة" : "Save Zone Boundary"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
