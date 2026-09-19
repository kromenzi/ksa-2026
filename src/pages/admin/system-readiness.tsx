import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BellRing, CheckCircle2, CircleAlert, Clock3, Database, Mail, MessageCircle, RadioTower, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { useData } from "@/lib/data-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReadinessState = "ready" | "warning" | "unknown";

type HealthPayload = {
  ok?: boolean;
  services?: Record<string, { state?: string; message?: string }>;
};

type DeliveryPayload = {
  automation?: { cronConfigured?: boolean; requiredEnv?: string[] };
  providers?: {
    inApp?: { configured?: boolean };
    email?: { configured?: boolean; requiredEnv?: string[] };
    whatsapp?: { configured?: boolean; requiredEnv?: string[] };
    teams?: { configured?: boolean; requiredEnv?: string[] };
  };
  outbox?: Array<{ status?: string; channel?: string; attempts?: number; lastError?: string | null }>;
};

function StatusBadge({ state, readyLabel, warningLabel }: { state: ReadinessState; readyLabel: string; warningLabel: string }) {
  if (state === "ready") {
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"><CheckCircle2 className="h-3 w-3 me-1" />{readyLabel}</Badge>;
  }
  if (state === "warning") {
    return <Badge variant="outline" className="border-amber-500/30 text-amber-600"><CircleAlert className="h-3 w-3 me-1" />{warningLabel}</Badge>;
  }
  return <Badge variant="outline">{warningLabel}</Badge>;
}

function ReadinessCard({
  icon: Icon,
  title,
  description,
  state,
  readyLabel,
  warningLabel,
  details,
}: {
  icon: any;
  title: string;
  description: string;
  state: ReadinessState;
  readyLabel: string;
  warningLabel: string;
  details?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              <CardDescription className="text-xs mt-1 leading-5">{description}</CardDescription>
            </div>
          </div>
          <StatusBadge state={state} readyLabel={readyLabel} warningLabel={warningLabel} />
        </div>
      </CardHeader>
      {details ? <CardContent className="pt-0 text-[11px] text-muted-foreground break-words">{details}</CardContent> : null}
    </Card>
  );
}

export default function SystemReadinessPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [delivery, setDelivery] = useState<DeliveryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, deliveryRes] = await Promise.all([
        fetch("/api/system-health", { credentials: "include", cache: "no-store" }),
        fetch("/api/notification-delivery", { credentials: "include", cache: "no-store" }),
      ]);
      const healthJson = await healthRes.json().catch(() => ({}));
      const deliveryJson = await deliveryRes.json().catch(() => ({}));
      setHealth(healthRes.ok ? healthJson : { ok: false, services: {} });
      setDelivery(deliveryRes.ok ? deliveryJson : {});
      setCheckedAt(new Date().toLocaleString(isAr ? "ar-SA" : "en-US"));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const outboxStats = useMemo(() => {
    const rows = delivery?.outbox || [];
    return rows.reduce((acc, row) => {
      const key = String(row.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [delivery]);

  const onlineServices = Object.values(health?.services || {}).filter((s) => s?.state === "online").length;
  const totalServices = Object.keys(health?.services || {}).length;
  const readyCount = [
    health?.ok,
    delivery?.automation?.cronConfigured,
    delivery?.providers?.inApp?.configured,
    delivery?.providers?.email?.configured,
    delivery?.providers?.whatsapp?.configured,
    delivery?.providers?.teams?.configured,
  ].filter(Boolean).length;

  const label = {
    ready: isAr ? "جاهز" : "Ready",
    needsConfig: isAr ? "يحتاج إعداد" : "Needs config",
  };

  return (
    <div className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <div className="rounded-3xl border border-border/60 bg-card/80 p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isAr ? "جاهزية النظام" : "System Readiness"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{isAr ? "مركز جاهزية وتشغيل المنصة" : "Platform Readiness Center"}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-6">
              {isAr
                ? "يعرض حالة الخدمات والتكاملات الفعلية بدون إظهار أي Secret أو Token. البنود غير الجاهزة تبقى مغلقة أو مؤجلة بأمان حتى يتم إعدادها."
                : "Shows live service and integration readiness without exposing any secret or token. Unconfigured items remain safely disabled or deferred."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <div className="text-xs text-muted-foreground">{isAr ? "عناصر جاهزة" : "Ready checks"}</div>
              <div className="text-xl font-bold">{readyCount}/6</div>
            </div>
            <Button onClick={() => void load()} disabled={loading} variant="outline" className="rounded-xl">
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
              {isAr ? "إعادة فحص" : "Refresh"}
            </Button>
          </div>
        </div>
        {checkedAt ? <p className="text-[10px] text-muted-foreground mt-4">{isAr ? "آخر فحص:" : "Last checked:"} {checkedAt}</p> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ReadinessCard
          icon={Server}
          title={isAr ? "الخدمات الأساسية" : "Core services"}
          description={isAr ? "API وقاعدة البيانات وخدمات النظام." : "API, database and platform services."}
          state={health?.ok ? "ready" : "warning"}
          readyLabel={label.ready}
          warningLabel={label.needsConfig}
          details={totalServices ? `${onlineServices}/${totalServices} ${isAr ? "خدمة Online" : "services online"}` : undefined}
        />
        <ReadinessCard
          icon={Clock3}
          title={isAr ? "المعالجة المجدولة للإشعارات" : "Notification cron"}
          description={isAr ? "معالجة Notification Outbox آليًا عبر Cron محمي." : "Protected scheduled processing for the notification outbox."}
          state={delivery?.automation?.cronConfigured ? "ready" : "warning"}
          readyLabel={label.ready}
          warningLabel={label.needsConfig}
          details={!delivery?.automation?.cronConfigured ? "CRON_SECRET" : undefined}
        />
        <ReadinessCard
          icon={BellRing}
          title={isAr ? "الإشعارات داخل النظام" : "In-app notifications"}
          description={isAr ? "قناة التنبيه الداخلية في Safety Board." : "Native Safety Board notification channel."}
          state={delivery?.providers?.inApp?.configured ? "ready" : "warning"}
          readyLabel={label.ready}
          warningLabel={label.needsConfig}
        />
        <ReadinessCard
          icon={Mail}
          title={isAr ? "البريد الإلكتروني" : "Email delivery"}
          description={isAr ? "إرسال الرسائل الخارجية من Notification Outbox." : "External email delivery from the notification outbox."}
          state={delivery?.providers?.email?.configured ? "ready" : "warning"}
          readyLabel={label.ready}
          warningLabel={label.needsConfig}
          details={!delivery?.providers?.email?.configured ? (delivery?.providers?.email?.requiredEnv || []).join(", ") : undefined}
        />
        <ReadinessCard
          icon={MessageCircle}
          title={isAr ? "WhatsApp" : "WhatsApp"}
          description={isAr ? "إرسال تنبيهات السلامة عبر WhatsApp Cloud API." : "Safety alerts through WhatsApp Cloud API."}
          state={delivery?.providers?.whatsapp?.configured ? "ready" : "warning"}
          readyLabel={label.ready}
          warningLabel={label.needsConfig}
          details={!delivery?.providers?.whatsapp?.configured ? (delivery?.providers?.whatsapp?.requiredEnv || []).join(", ") : undefined}
        />
        <ReadinessCard
          icon={Activity}
          title={isAr ? "Microsoft Teams" : "Microsoft Teams"}
          description={isAr ? "التنبيهات الخارجية عبر Teams Webhook." : "External alerts through a Teams webhook."}
          state={delivery?.providers?.teams?.configured ? "ready" : "warning"}
          readyLabel={label.ready}
          warningLabel={label.needsConfig}
          details={!delivery?.providers?.teams?.configured ? (delivery?.providers?.teams?.requiredEnv || []).join(", ") : undefined}
        />
        <ReadinessCard
          icon={RadioTower}
          title={isAr ? "Live Meeting" : "Live Meeting"}
          description={isAr ? "الغرفة الحالية تستخدم Jitsi مع Secure Invite على مستوى التطبيق." : "Current rooms use Jitsi with application-level secure invite enforcement."}
          state="warning"
          readyLabel={label.ready}
          warningLabel={isAr ? "حماية المزود اختيارية" : "Provider hardening optional"}
          details={isAr ? "للغرف المغلقة والتسجيل على مستوى المزود استخدم Jitsi خاص/JWT أو LiveKit." : "For provider-level locked rooms and recording, configure private Jitsi/JWT or LiveKit."}
        />
        <ReadinessCard
          icon={Database}
          title={isAr ? "Supabase RLS" : "Supabase RLS"}
          description={isAr ? "التحكم بالوصول على مستوى الصفوف لجميع جداول public." : "Row-level authorization for public-schema tables."}
          state={health?.ok ? "ready" : "unknown"}
          readyLabel={label.ready}
          warningLabel={isAr ? "تحقق مطلوب" : "Check required"}
        />
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">{isAr ? "Notification Outbox" : "Notification Outbox"}</CardTitle>
          <CardDescription className="text-xs">{isAr ? "آخر حالة للرسائل التي تمت معالجتها أو تأجيلها." : "Current delivery queue state."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.keys(outboxStats).length === 0 ? (
              <Badge variant="outline">{isAr ? "لا توجد رسائل حالياً" : "No queued messages"}</Badge>
            ) : Object.entries(outboxStats).map(([status, count]) => (
              <Badge key={status} variant="outline">{status}: {count}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
