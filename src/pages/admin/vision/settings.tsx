import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getStoredSettings, saveStoredSettings, addAuditEntry, type ESPSettings } from "@/lib/vision-store";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Sliders, Save, HardDrive } from "lucide-react";

export default function VisionSettings() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [espConfig, setEspConfig] = useState<ESPSettings>(() => getStoredSettings());

  const handleSave = () => {
    saveStoredSettings(espConfig);
    addAuditEntry("Updated ESP AI System Settings", "Global Config", undefined, `${espConfig.detectionThresholdPct}% Threshold`);
    toast.success(isAr ? "تم حفظ إعدادات النظام وتحديث عتبة الذكاء الاصطناعي" : "Settings saved and AI confidence threshold updated");
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-border/50">
        <div>
          <Badge className="bg-indigo-600 text-white font-mono text-xs mb-1">GLOBAL VISION CONFIG</Badge>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAr ? "إعدادات الذكاء الاصطناعي والسلامة (ESP Settings)" : "ESP AI Safety System Settings"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? "تحديد حد الثقة التلقائي، قواعد التنبيهات، خيارات الاستبقاء، وإشعار فرق السلامة" : "Configure AI detection confidence thresholds, incident auto-creation rules & retention limits"}
          </p>
        </div>

        <Button onClick={handleSave} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
          <Save className="w-4 h-4" />
          {isAr ? "حفظ التغييرات" : "Save Configurations"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/70 shadow-sm rounded-2xl p-6 space-y-6 bg-card">
          <CardHeader className="p-0 pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              {isAr ? "عتبة دقة الذكاء الاصطناعي (AI Confidence Threshold)" : "AI Detection Confidence Threshold"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr ? "تحديد نسبة الثقة الدنيا لقبول التنبيه كحدث محقق" : "Minimum AI confidence required before raising an automated alert"}
            </CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold">{isAr ? "نسبة دقة الكشف المطلوبة:" : "Required Detection Threshold:"}</span>
              <Badge className="bg-indigo-600 text-white font-mono text-sm px-3 py-0.5">{espConfig.detectionThresholdPct}%</Badge>
            </div>
            <Slider
              value={[espConfig.detectionThresholdPct]}
              min={50}
              max={95}
              step={1}
              onValueChange={(val) => setEspConfig({ ...espConfig, detectionThresholdPct: val[0] })}
              className="py-2"
            />
            <p className="text-[11px] text-muted-foreground">
              {isAr ? "التوصية الصناعية: 80% للتوازن بين الحساسية العالية والحد من الإنذارات الخاطئة" : "Enterprise recommendation: 80% to balance high sensitivity with false positive suppression"}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t text-xs">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">{isAr ? "إنشاء حدث سلامة تلقائياً للتنبيهات العالية" : "Auto-Create HSE Event for High/Critical Alerts"}</Label>
                <p className="text-[11px] text-muted-foreground">{isAr ? "ربط الإنذارات الحرجة مباشرة بسجل الحوادث والوشيكة" : "Automatically log HSE event upon High/Critical detection"}</p>
              </div>
              <Switch checked={espConfig.autoHseEventForHighCritical} onCheckedChange={(c) => setEspConfig({ ...espConfig, autoHseEventForHighCritical: c })} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">{isAr ? "إنشاء عدم مطابقة (NCR) تلقائياً" : "Auto-Create Non-Conformance Report (NCR)"}</Label>
                <p className="text-[11px] text-muted-foreground">{isAr ? "معطل افتراضياً لمنع الازدواجية دون مراجعة بشرية" : "Disabled by default per enterprise governance policy"}</p>
              </div>
              <Switch checked={espConfig.autoNcrCreation} onCheckedChange={(c) => setEspConfig({ ...espConfig, autoNcrCreation: c })} />
            </div>
          </div>
        </Card>

        <Card className="border border-border/70 shadow-sm rounded-2xl p-6 space-y-6 bg-card">
          <CardHeader className="p-0 pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              {isAr ? "التخزين وقنوات الإشعارات" : "Retention & Notification Rules"}
            </CardTitle>
          </CardHeader>

          <div className="space-y-4 text-xs">
            <div>
              <Label className="text-xs">{isAr ? "مدة حفظ التسجيلات واللقطات (بالأيام)" : "Video Retention Days"}</Label>
              <Input
                type="number"
                value={espConfig.retentionDays}
                onChange={(e) => setEspConfig({ ...espConfig, retentionDays: parseInt(e.target.value) || 30 })}
                className="h-9 mt-1 max-w-[150px]"
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <span className="font-bold block">{isAr ? "قنوات إشعار فرق السلامة:" : "Notification Channels:"}</span>
              <div className="flex items-center justify-between">
                <span>{isAr ? "إشعارات داخل التطبيق" : "In-App Alerts"}</span>
                <Switch checked={espConfig.notificationChannels.inApp} onCheckedChange={(c) => setEspConfig({ ...espConfig, notificationChannels: { ...espConfig.notificationChannels, inApp: c } })} />
              </div>
              <div className="flex items-center justify-between">
                <span>{isAr ? "إشعارات المتصفح الفورية" : "Browser Toast Popups"}</span>
                <Switch checked={espConfig.notificationChannels.browserToast} onCheckedChange={(c) => setEspConfig({ ...espConfig, notificationChannels: { ...espConfig.notificationChannels, browserToast: c } })} />
              </div>
              <div className="flex items-center justify-between">
                <span>{isAr ? "البريد الإلكتروني للسلامة" : "Email Reports"}</span>
                <Switch checked={espConfig.notificationChannels.email} onCheckedChange={(c) => setEspConfig({ ...espConfig, notificationChannels: { ...espConfig.notificationChannels, email: c } })} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
