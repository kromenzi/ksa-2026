import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const RISK_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#7c3aed",
};

export const STATUS_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function KPICard({
  title, value, subtitle, icon: Icon, color, borderColor, loading, testId, badgeText
}: {
  title: string;
  value: string | number;
  subtitle?: ReactNode;
  icon: any;
  color: string;
  borderColor: string;
  loading?: boolean;
  testId: string;
  badgeText?: string;
}) {
  return (
    <Card className="kpi-card relative overflow-hidden group border-0 shadow-sm" data-testid={testId} tabIndex={0} role="article">
      <div className={`kpi-card__accent absolute top-0 start-0 w-1.5 h-full ${borderColor}`} />
      <div className={`kpi-card__orb absolute top-0 end-0 w-28 h-28 -mt-10 -me-10 rounded-full opacity-[0.09] ${color}`} />
      <div className="kpi-card__shine absolute inset-0 pointer-events-none" />
      <CardContent className="relative z-10 p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
              <div className="flex items-center gap-1.5">
                {badgeText && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {badgeText}
                  </span>
                )}
                <div className={`kpi-icon p-2.5 rounded-2xl ${color} bg-opacity-10`}>
                  <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
                </div>
              </div>
            </div>
            <div className="kpi-value text-[28px] sm:text-[32px] font-black tracking-tight">{value}</div>
            {subtitle && <div className="mt-1.5">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MiniStat({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="h-[18px] w-[18px] text-white" />
      </div>
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
