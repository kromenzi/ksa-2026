import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Cpu, RefreshCw, Wifi, WifiOff, Radio, Copy, CheckCircle2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const FUNCTION_URL = "https://sfdpkpqokazsegsstjfs.supabase.co/functions/v1/esp-devices";

type EspDevice = {
  id: string;
  device_id: string;
  name: string;
  device_type: string;
  ip_address: string | null;
  mac_address: string | null;
  firmware: string | null;
  plant: string | null;
  area: string | null;
  rssi: number | null;
  status: "ONLINE" | "OFFLINE" | "WARNING";
  last_seen_at: string | null;
  metadata?: Record<string, unknown>;
};

function relativeTime(value: string | null) {
  if (!value) return "Never";
  const ms = Date.now() - new Date(value).getTime();
  if (ms < 10000) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  return `${hrs}h ago`;
}

export default function ESPDeviceDiscovery() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [devices, setDevices] = useState<EspDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(FUNCTION_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      setDevices(payload.devices || []);
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      toast.error(isAr ? "تعذر الاتصال بخدمة اكتشاف ESP" : "ESP discovery service is unavailable");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const online = useMemo(() => devices.filter((d) => d.status === "ONLINE"), [devices]);
  const offline = useMemo(() => devices.filter((d) => d.status !== "ONLINE"), [devices]);

  const copyToken = async () => {
    await navigator.clipboard.writeText("KROM-ESP-2026");
    setCopied(true);
    toast.success(isAr ? "تم نسخ رمز ESP الافتراضي" : "Default ESP token copied");
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card className="border border-emerald-500/20 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b bg-emerald-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="w-4 h-4 text-emerald-600" />
              {isAr ? "اكتشاف أجهزة ESP الحقيقية" : "Real ESP Device Discovery"}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isAr
                ? "الأجهزة تظهر هنا فقط بعد إرسال Heartbeat فعلي إلى منصة Safety Board. لا توجد بيانات محاكاة في هذا الجدول."
                : "Devices appear here only after a real heartbeat reaches Safety Board. This registry contains no simulated ESP entries."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-600 text-white gap-1"><Wifi className="w-3 h-3" />{online.length} {isAr ? "متصل" : "Online"}</Badge>
            <Badge variant="outline" className="gap-1"><WifiOff className="w-3 h-3" />{offline.length} {isAr ? "غير متصل" : "Offline"}</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {isAr ? "تحديث الآن" : "Refresh now"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border-b">
          <div className="rounded-xl border p-3 bg-card">
            <div className="text-[11px] text-muted-foreground">{isAr ? "إجمالي الأجهزة" : "Registered ESP"}</div>
            <div className="text-2xl font-black mt-1">{devices.length}</div>
          </div>
          <div className="rounded-xl border p-3 bg-card">
            <div className="text-[11px] text-muted-foreground">{isAr ? "متصل فعليًا" : "Live heartbeats"}</div>
            <div className="text-2xl font-black mt-1 text-emerald-600">{online.length}</div>
          </div>
          <div className="rounded-xl border p-3 bg-card">
            <div className="text-[11px] text-muted-foreground">{isAr ? "غير متصل" : "Offline"}</div>
            <div className="text-2xl font-black mt-1 text-rose-600">{offline.length}</div>
          </div>
          <div className="rounded-xl border p-3 bg-card">
            <div className="text-[11px] text-muted-foreground">{isAr ? "آخر تحديث للوحة" : "Dashboard refresh"}</div>
            <div className="text-sm font-bold mt-2 font-mono">{relativeTime(lastRefresh)}</div>
          </div>
        </div>

        <div className="p-4 border-b bg-slate-50/60 dark:bg-slate-900/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-indigo-600" /> {isAr ? "طريقة الاتصال" : "ESP connection model"}</div>
              <div className="text-muted-foreground mt-1">
                {isAr ? "ESP32-CAM يرسل Heartbeat كل 15–30 ثانية إلى الخدمة السحابية؛ وعند تجاوز 90 ثانية يتحول تلقائيًا إلى OFFLINE." : "ESP32-CAM sends a heartbeat every 15–30 seconds; after 90 seconds without a heartbeat the device is marked OFFLINE."}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={copyToken} className="gap-2 shrink-0">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isAr ? "نسخ رمز ESP الافتراضي" : "Copy default ESP token"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "الجهاز" : "Device"}</TableHead>
                <TableHead>IP / MAC</TableHead>
                <TableHead>{isAr ? "الموقع" : "Location"}</TableHead>
                <TableHead>{isAr ? "الإشارة" : "RSSI"}</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>{isAr ? "آخر Heartbeat" : "Last heartbeat"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                    {isAr ? "لا يوجد ESP حقيقي أرسل Heartbeat بعد. ثبّت برنامج ESP المرفق ثم شغّل الجهاز على الشبكة." : "No real ESP has sent a heartbeat yet. Flash the provided ESP firmware and connect it to the network."}
                  </TableCell>
                </TableRow>
              ) : devices.map((device) => (
                <TableRow key={device.device_id}>
                  <TableCell>
                    <div className="font-bold text-sm">{device.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{device.device_id} • {device.device_type}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{device.ip_address || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{device.mac_address || "—"}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{device.plant || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{device.area || "—"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{device.rssi == null ? "—" : `${device.rssi} dBm`}</TableCell>
                  <TableCell className="font-mono text-xs">{device.firmware || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{relativeTime(device.last_seen_at)}</TableCell>
                  <TableCell>
                    {device.status === "ONLINE" ? (
                      <Badge className="bg-emerald-600 text-white gap-1"><Activity className="w-3 h-3" />ONLINE</Badge>
                    ) : (
                      <Badge className="bg-rose-600 text-white gap-1"><WifiOff className="w-3 h-3" />OFFLINE</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
