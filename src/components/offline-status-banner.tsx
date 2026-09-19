import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { useData } from "@/lib/data-context";

export function OfflineStatusBanner() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const onOffline = () => { setOnline(false); setShowBackOnline(false); };
    const onOnline = () => { setOnline(true); setShowBackOnline(true); window.setTimeout(() => setShowBackOnline(false), 3200); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline); };
  }, []);

  if (online && !showBackOnline) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold shadow-lg ${online ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      <span>{online ? (isAr ? "تمت استعادة الاتصال — يمكنك المتابعة" : "Connection restored — you can continue") : (isAr ? "لا يوجد اتصال — البيانات غير المحفوظة ستبقى على جهازك" : "Offline — unsaved data will remain on this device")}</span>
    </div>
  );
}
