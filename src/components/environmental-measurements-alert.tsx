import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, BellRing, CalendarClock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/lib/data-context';
import { apiRequest } from '@/lib/queryClient';

type MeasurementAlert = {
  id: string;
  factory_name: string;
  contractor_name: string;
  measurement_type: string;
  parameter_name: string;
  next_measurement_date: string | null;
  reminder_days_before: number;
};

export default function EnvironmentalMeasurementsAlert() {
  const [location] = useLocation();
  const { settings } = useData();
  const isAr = settings.language === 'ar';
  const [items, setItems] = useState<MeasurementAlert[]>([]);

  useEffect(() => {
    if (location !== '/admin/dashboard') return;
    let cancelled = false;
    (async () => {
      try {
        const response = await apiRequest('GET', '/api/environmental-measurements?alerts=1');
        const data = await response.json();
        if (!cancelled && response.ok && Array.isArray(data)) setItems(data);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  if (location !== '/admin/dashboard') return null;

  const now = Date.now();
  const due = items.filter(i => {
    if (!i.next_measurement_date) return false;
    const days = Math.ceil((new Date(i.next_measurement_date).getTime() - now) / 86400000);
    return days <= (i.reminder_days_before || 30);
  });

  if (!due.length) return null;

  const overdue = due.filter(i => new Date(i.next_measurement_date || '').getTime() < now).length;

  return (
    <Card className="mb-5 border-amber-500/30 bg-amber-500/5 shadow-sm">
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          {overdue > 0 ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <BellRing className="h-5 w-5 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {isAr ? 'تنبيه القياسات البيئية' : 'Environmental Measurement Alert'}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">{due.length}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {overdue > 0
              ? (isAr ? `يوجد ${overdue} قياس متأخر عن موعده.` : `${overdue} measurement(s) are overdue.`)
              : (isAr ? `يوجد ${due.length} قياس ضمن فترة التذكير.` : `${due.length} measurement(s) are within the reminder window.`)}
          </p>
          <div className="mt-2 space-y-1.5">
            {due.slice(0, 3).map(item => (
              <div key={item.id} className="text-xs flex flex-wrap items-center gap-2 text-foreground/80">
                <span className="font-medium">{item.factory_name}</span>
                <span>•</span>
                <span>{item.contractor_name}</span>
                <span>•</span>
                <span>{item.measurement_type} / {item.parameter_name}</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{item.next_measurement_date}</span>
              </div>
            ))}
          </div>
        </div>
        <Link href="/admin/environmental-measurements"><Button variant="outline" className="gap-2 shrink-0">{isAr ? 'فتح القياسات' : 'Open Measurements'}<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Button></Link>
      </div>
    </Card>
  );
}
