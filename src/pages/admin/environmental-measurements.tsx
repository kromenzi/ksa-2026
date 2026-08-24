import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useData } from '@/lib/data-context';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BellRing, Building2, CalendarClock, CheckCircle2, ExternalLink, FileText, Pencil, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

type Measurement = {
  id: string;
  factory_name: string;
  contractor_name: string;
  measurement_type: string;
  parameter_name: string;
  unit: string | null;
  measured_value: number | null;
  limit_value: number | null;
  measurement_date: string;
  next_measurement_date: string | null;
  compliance_status: 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT';
  reminder_enabled: boolean;
  reminder_days_before: number;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
};

const TYPE_OPTIONS = [
  ['Air Quality', 'جودة الهواء'],
  ['Noise', 'الضوضاء'],
  ['Workplace Exposure', 'التعرضات المهنية'],
  ['Emissions', 'الانبعاثات'],
  ['Water', 'المياه'],
  ['Waste / Soil', 'النفايات / التربة'],
  ['Other', 'أخرى'],
] as const;

function daysTo(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function reminderState(item: Measurement) {
  const days = daysTo(item.next_measurement_date);
  if (!item.next_measurement_date) return { label: 'NO DATE', ar: 'بدون موعد', tone: 'secondary' as const };
  if (days !== null && days < 0) return { label: 'OVERDUE', ar: 'متأخر', tone: 'destructive' as const };
  if (days !== null && days <= item.reminder_days_before) return { label: 'DUE SOON', ar: 'موعد قريب', tone: 'secondary' as const };
  return { label: 'SCHEDULED', ar: 'مجدول', tone: 'default' as const };
}

export default function EnvironmentalMeasurementsPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === 'ar';
  const [items, setItems] = useState<Measurement[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [form, setForm] = useState<Partial<Measurement>>({
    factory_name: '', contractor_name: '', measurement_type: 'Air Quality', parameter_name: '', unit: '',
    measured_value: null, limit_value: null, measurement_date: new Date().toISOString().slice(0, 10),
    next_measurement_date: '', compliance_status: 'PENDING', reminder_enabled: true, reminder_days_before: 30, notes: '',
  });

  async function load() {
    setLoading(true);
    try {
      const r = await apiRequest('GET', '/api/environmental-measurements');
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Unable to load measurements');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'تعذر تحميل القياسات البيئية' : 'Unable to load environmental measurements'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => [i.factory_name, i.contractor_name, i.measurement_type, i.parameter_name].some(v => String(v || '').toLowerCase().includes(q)));
  }, [items, query]);

  const stats = {
    total: items.length,
    overdue: items.filter(i => reminderState(i).label === 'OVERDUE').length,
    dueSoon: items.filter(i => reminderState(i).label === 'DUE SOON').length,
    nonCompliant: items.filter(i => i.compliance_status === 'NON_COMPLIANT').length,
  };

  const reset = () => {
    setEditing(null);
    setForm({
      factory_name: '', contractor_name: '', measurement_type: 'Air Quality', parameter_name: '', unit: '',
      measured_value: null, limit_value: null, measurement_date: new Date().toISOString().slice(0, 10),
      next_measurement_date: '', compliance_status: 'PENDING', reminder_enabled: true, reminder_days_before: 30, notes: '',
    });
  };

  const save = async () => {
    if (!form.factory_name || !form.contractor_name || !form.parameter_name) {
      toast.error(isAr ? 'أكمل اسم المصنع والمقاول واسم البند المقاس' : 'Factory, contractor, and parameter are required');
      return;
    }
    try {
      const payload = { ...form, created_by: currentUser?.id || currentUser?.name || null };
      const r = editing ? await apiRequest('PATCH', `/api/environmental-measurements?id=${encodeURIComponent(editing.id)}`, payload) : await apiRequest('POST', '/api/environmental-measurements', payload);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Unable to save measurement');
      toast.success(isAr ? 'تم حفظ القياس البيئي' : 'Environmental measurement saved');
      setOpen(false);
      reset();
      load();
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'تعذر حفظ القياس' : 'Unable to save measurement'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(isAr ? 'حذف سجل القياس؟' : 'Delete this measurement record?')) return;
    const r = await apiRequest('DELETE', `/api/environmental-measurements?id=${encodeURIComponent(id)}`);
    if (!r.ok) {
      toast.error(isAr ? 'فشل الحذف' : 'Delete failed');
      return;
    }
    toast.success(isAr ? 'تم حذف القياس' : 'Measurement deleted');
    load();
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-emerald-500" />{isAr ? 'القياسات البيئية' : 'Environmental Measurements'}</h1>
          <p className="text-muted-foreground">{isAr ? 'متابعة القياسات البيئية حسب المصنع ومقاول القياسات مع مواعيد التذكير والتنبيهات.' : 'Track environmental measurements by factory and measurement contractor with reminders and alerts.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/facility-regulatory-licenses"><Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" />{isAr ? 'تراخيص المنشأة' : 'Facility Licenses'}</Button></Link>
          <Button onClick={() => { reset(); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />{isAr ? 'إضافة قياس بيئي' : 'Add Measurement'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-sm text-muted-foreground">{isAr ? 'إجمالي القياسات' : 'Total Measurements'}</div><div className="text-2xl font-bold mt-2">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><CalendarClock className="h-4 w-4" />{isAr ? 'مواعيد قريبة' : 'Due Soon'}</div><div className="text-2xl font-bold mt-2">{stats.dueSoon}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><TriangleAlert className="h-4 w-4" />{isAr ? 'متأخرة' : 'Overdue'}</div><div className="text-2xl font-bold mt-2">{stats.overdue}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><TriangleAlert className="h-4 w-4" />{isAr ? 'غير مطابقة' : 'Non-Compliant'}</div><div className="text-2xl font-bold mt-2">{stats.nonCompliant}</div></Card>
      </div>

      <Card className="p-4">
        <div className="relative max-w-xl"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="ps-9" value={query} onChange={e => setQuery(e.target.value)} placeholder={isAr ? 'بحث بالمصنع أو المقاول أو نوع القياس...' : 'Search factory, contractor, or measurement type...'} /></div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              {[isAr ? 'المصنع' : 'Factory', isAr ? 'مقاول القياسات' : 'Measurement Contractor', isAr ? 'نوع القياس' : 'Measurement Type', isAr ? 'البند' : 'Parameter', isAr ? 'القيمة' : 'Value', isAr ? 'تاريخ القياس' : 'Measurement Date', isAr ? 'الموعد القادم' : 'Next Date', isAr ? 'التنبيه' : 'Reminder', isAr ? 'الإجراءات' : 'Actions'].map((h, i) => <th key={i} className="p-3 text-start">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="p-8 text-center">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</td></tr> : filtered.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">{isAr ? 'لا توجد قياسات بيئية' : 'No environmental measurements found'}</td></tr> : filtered.map(item => {
                const rs = reminderState(item);
                return <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.factory_name}</td>
                  <td className="p-3">{item.contractor_name}</td>
                  <td className="p-3">{item.measurement_type}</td>
                  <td className="p-3">{item.parameter_name}</td>
                  <td className="p-3">{item.measured_value ?? '—'} {item.unit || ''}</td>
                  <td className="p-3">{item.measurement_date}</td>
                  <td className="p-3">{item.next_measurement_date || '—'}</td>
                  <td className="p-3"><Badge variant={rs.tone}>{item.reminder_enabled ? (isAr ? rs.ar : rs.label) : (isAr ? 'موقوف' : 'Disabled')}</Badge></td>
                  <td className="p-3"><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => { setEditing(item); setForm(item); setOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? (isAr ? 'تعديل القياس البيئي' : 'Edit Environmental Measurement') : (isAr ? 'إضافة قياس بيئي' : 'Add Environmental Measurement')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>{isAr ? 'اسم المصنع' : 'Factory Name'}</Label><Input className="mt-1" value={form.factory_name || ''} onChange={e => setForm(f => ({ ...f, factory_name: e.target.value }))} /></div>
            <div><Label>{isAr ? 'اسم مقاول القياسات' : 'Measurement Contractor'}</Label><Input className="mt-1" value={form.contractor_name || ''} onChange={e => setForm(f => ({ ...f, contractor_name: e.target.value }))} /></div>
            <div><Label>{isAr ? 'نوع القياس' : 'Measurement Type'}</Label><Select value={form.measurement_type || 'Air Quality'} onValueChange={v => setForm(f => ({ ...f, measurement_type: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TYPE_OPTIONS.map(([en, ar]) => <SelectItem key={en} value={en}>{isAr ? ar : en}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isAr ? 'البند / المعلمة' : 'Parameter'}</Label><Input className="mt-1" value={form.parameter_name || ''} onChange={e => setForm(f => ({ ...f, parameter_name: e.target.value }))} placeholder={isAr ? 'مثال: PM10 / Noise dB' : 'e.g. PM10 / Noise dB'} /></div>
            <div><Label>{isAr ? 'الوحدة' : 'Unit'}</Label><Input className="mt-1" value={form.unit || ''} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
            <div><Label>{isAr ? 'القيمة المقاسة' : 'Measured Value'}</Label><Input className="mt-1" type="number" value={form.measured_value ?? ''} onChange={e => setForm(f => ({ ...f, measured_value: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
            <div><Label>{isAr ? 'الحد المسموح' : 'Limit Value'}</Label><Input className="mt-1" type="number" value={form.limit_value ?? ''} onChange={e => setForm(f => ({ ...f, limit_value: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
            <div><Label>{isAr ? 'تاريخ القياس' : 'Measurement Date'}</Label><Input className="mt-1" type="date" value={form.measurement_date || ''} onChange={e => setForm(f => ({ ...f, measurement_date: e.target.value }))} /></div>
            <div><Label>{isAr ? 'موعد القياس القادم' : 'Next Measurement Date'}</Label><Input className="mt-1" type="date" value={form.next_measurement_date || ''} onChange={e => setForm(f => ({ ...f, next_measurement_date: e.target.value }))} /></div>
            <div><Label>{isAr ? 'حالة المطابقة' : 'Compliance Status'}</Label><Select value={form.compliance_status || 'PENDING'} onValueChange={(v: any) => setForm(f => ({ ...f, compliance_status: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">{isAr ? 'قيد التقييم' : 'Pending'}</SelectItem><SelectItem value="COMPLIANT">{isAr ? 'مطابق' : 'Compliant'}</SelectItem><SelectItem value="NON_COMPLIANT">{isAr ? 'غير مطابق' : 'Non-Compliant'}</SelectItem></SelectContent></Select></div>
            <div><Label>{isAr ? 'أيام التذكير قبل الموعد' : 'Reminder Days Before'}</Label><Input className="mt-1" type="number" min={1} max={365} value={form.reminder_days_before ?? 30} onChange={e => setForm(f => ({ ...f, reminder_days_before: Number(e.target.value || 30) }))} /></div>
            <div className="md:col-span-2 flex items-center gap-2 rounded-xl border p-3"><input id="env-reminder" type="checkbox" checked={Boolean(form.reminder_enabled)} onChange={e => setForm(f => ({ ...f, reminder_enabled: e.target.checked }))} /><Label htmlFor="env-reminder" className="flex items-center gap-2 cursor-pointer"><BellRing className="h-4 w-4 text-amber-500" />{isAr ? 'تفعيل التذكير والإشعارات' : 'Enable reminders and notifications'}</Label></div>
            <div className="md:col-span-2"><Label>{isAr ? 'ملاحظات' : 'Notes'}</Label><Textarea className="mt-1" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setOpen(false); reset(); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button><Button onClick={save}>{isAr ? 'حفظ' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="p-4 border-amber-500/20 bg-amber-500/5"><div className="flex items-start gap-3"><BellRing className="h-5 w-5 text-amber-500 mt-0.5" /><div><div className="font-semibold">{isAr ? 'نظام التذكير' : 'Reminder Engine'}</div><p className="text-sm text-muted-foreground mt-1">{isAr ? 'يتم فحص المواعيد كل ساعة، وإرسال إشعار داخلي للإدارة عند دخول القياس ضمن فترة التذكير أو تأخره.' : 'Schedules are checked hourly and an in-app notification is generated for admins/managers when a measurement enters its reminder window or becomes overdue.'}</p></div></div></Card>
    </div>
  );
}
