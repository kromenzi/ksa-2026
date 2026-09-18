import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye, LockKeyhole, MessageSquare, RefreshCw, Search, Send, Settings2, ShieldAlert, Trash2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { canDeleteManagedRecord, useGenericRecords, type GenericRecord } from "@/lib/generic-records";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type ReportData = {
  category?: string;
  description?: string;
  location?: string;
  severity?: string;
  immediateLifeThreat?: boolean;
  identityMode?: "anonymous" | "confidential" | "identified";
  sourceChannel?: string;
  linkedModule?: string | null;
  linkedRecordId?: string | null;
};

type Message = { id: string; caseId: string; senderType: "reporter" | "hse"; message: string; createdAt: string };
type Channel = { id: string; channel: string; isEnabled: boolean; publicLabelAr?: string | null; publicLabelEn?: string | null; destination?: string | null; config?: Record<string, unknown> };

const statuses = ["New", "Triage", "Assigned", "Investigation", "Action Required", "Closed"];

export default function AdminSafetyReportingPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const canEdit = ["admin", "manager", "editor"].includes(currentUser?.role || "");
  const canReveal = ["admin", "manager"].includes(currentUser?.role || "");
  const canManageChannels = canReveal;
  const { items, loading, error, refresh, update, remove } = useGenericRecords<ReportData>("safety-reporting");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GenericRecord<ReportData> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealReason, setRevealReason] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string> | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  const filtered = useMemo(() => items.filter(item => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [item.refNo, item.title, item.department, item.data?.location, item.data?.category, item.data?.severity]
      .some(value => String(value || "").toLowerCase().includes(q));
  }), [items, search]);

  const openCount = items.filter(item => item.status !== "Closed").length;
  const criticalCount = items.filter(item => item.data?.severity === "Critical" || item.data?.immediateLifeThreat).length;
  const protectedCount = items.filter(item => item.data?.identityMode && item.data.identityMode !== "anonymous").length;

  const loadMessages = async (caseId: string) => {
    setMessagesLoading(true);
    try {
      const response = await apiRequest("GET", `/api/safety-reporting-messages?caseId=${encodeURIComponent(caseId)}`);
      const payload = await response.json();
      setMessages(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر تحميل الرسائل" : "Unable to load messages"));
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const openCase = (item: GenericRecord<ReportData>) => {
    setSelected(item);
    setRevealed(null);
    setRevealReason("");
    void loadMessages(item.id);
  };

  const updateStatus = async (item: GenericRecord<ReportData>, status: string) => {
    if (!canEdit) return;
    try {
      const updated = await update(item.id, { status });
      if (selected?.id === item.id) setSelected(updated);
      toast.success(isAr ? "تم تحديث حالة البلاغ" : "Report status updated");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر تحديث الحالة" : "Unable to update status"));
    }
  };

  const deleteCase = async (item: GenericRecord<ReportData>) => {
    if (!canDelete || !window.confirm(isAr ? `حذف البلاغ ${item.refNo || item.id} نهائيًا؟` : `Permanently delete ${item.refNo || item.id}?`)) return;
    try {
      await remove(item.id);
      if (selected?.id === item.id) setSelected(null);
      toast.success(isAr ? "تم حذف البلاغ" : "Report deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حذف البلاغ" : "Unable to delete report"));
    }
  };

  const sendMessage = async () => {
    if (!selected || !message.trim()) return;
    try {
      await apiRequest("POST", "/api/safety-reporting-messages", { caseId: selected.id, message: message.trim() });
      setMessage("");
      await loadMessages(selected.id);
      toast.success(isAr ? "تم إرسال الرسالة للمبلّغ" : "Message sent to reporter");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر إرسال الرسالة" : "Unable to send message"));
    }
  };

  const revealIdentity = async () => {
    if (!selected || !canReveal || revealReason.trim().length < 8) return;
    try {
      const response = await apiRequest("POST", "/api/safety-reporting-reveal", { caseId: selected.id, reason: revealReason.trim() });
      const payload = await response.json();
      setRevealed(payload?.identity || null);
      setRevealOpen(false);
      toast.success(payload?.identity ? (isAr ? "تم كشف الهوية وتسجيل العملية في سجل التدقيق" : "Identity revealed and audit event recorded") : (isAr ? "هذا البلاغ لا يحتوي هوية مخزنة" : "This report has no stored identity"));
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر كشف الهوية" : "Unable to reveal identity"));
    }
  };

  const loadChannels = async () => {
    setChannelsLoading(true);
    try {
      const response = await apiRequest("GET", "/api/safety-reporting-channels");
      const payload = await response.json();
      setChannels(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر تحميل قنوات الإبلاغ" : "Unable to load reporting channels"));
    } finally {
      setChannelsLoading(false);
    }
  };

  useEffect(() => { void loadChannels(); }, []);

  const patchChannelLocal = (id: string, patch: Partial<Channel>) => setChannels(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));

  const saveChannel = async (item: Channel) => {
    if (!canManageChannels) return;
    if (item.isEnabled && ["EMAIL", "WHATSAPP"].includes(item.channel) && !String(item.destination || "").trim()) {
      toast.error(isAr ? "أضف وجهة القناة قبل تفعيلها" : "Add a channel destination before enabling it");
      return;
    }
    try {
      const response = await apiRequest("PATCH", `/api/safety-reporting-channels/${item.id}`, {
        isEnabled: item.isEnabled,
        publicLabelAr: item.publicLabelAr || "",
        publicLabelEn: item.publicLabelEn || "",
        destination: item.destination || null,
        config: item.config || {},
      });
      const updated = await response.json();
      patchChannelLocal(item.id, updated);
      toast.success(isAr ? "تم حفظ قناة الإبلاغ" : "Reporting channel saved");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حفظ القناة" : "Unable to save channel"));
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-safety-reporting-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white"><ShieldAlert className="h-5 w-5" /></div>
          <div><h1 className="text-2xl font-bold">{isAr ? "بلاغات السلامة" : "Safety Reporting"}</h1><p className="text-xs text-muted-foreground">{isAr ? "إدارة البلاغات المجهولة والسرية وقنوات الإبلاغ والمتابعة" : "Manage anonymous/confidential reports, channels, and reporter follow-up"}</p></div>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "إجمالي البلاغات" : "Total reports"}</p><p className="mt-1 text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "بلاغات مفتوحة" : "Open reports"}</p><p className="mt-1 text-2xl font-bold">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "حرجة / خطر فوري" : "Critical / immediate"}</p><p className="mt-1 text-2xl font-bold text-red-600">{criticalCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "هويات محمية" : "Protected identities"}</p><p className="mt-1 text-2xl font-bold">{protectedCount}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="register">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="register">{isAr ? "سجل البلاغات" : "Reports Register"}</TabsTrigger>
          <TabsTrigger value="channels" onClick={() => void loadChannels()}>{isAr ? "قنوات الإبلاغ" : "Reporting Channels"}</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <div className="relative max-w-md"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-9" value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث برقم البلاغ أو الموقع أو التصنيف..." : "Search reference, location, category..."} /></div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Card>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow>
              <TableHead>{isAr ? "المرجع" : "Reference"}</TableHead><TableHead>{isAr ? "البلاغ" : "Report"}</TableHead><TableHead>{isAr ? "الخصوصية" : "Privacy"}</TableHead><TableHead>{isAr ? "الخطورة" : "Severity"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-end">{isAr ? "الإجراءات" : "Actions"}</TableHead>
            </TableRow></TableHeader><TableBody>
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد بلاغات مسجلة" : "No safety reports recorded"}</TableCell></TableRow>}
              {filtered.map(item => <TableRow key={item.id}>
                <TableCell className="font-mono text-xs font-semibold">{item.refNo || "—"}</TableCell>
                <TableCell><p className="font-medium">{item.title || "—"}</p><p className="text-xs text-muted-foreground">{item.data?.location || item.department || "—"}</p></TableCell>
                <TableCell><Badge variant="outline">{item.data?.identityMode || "anonymous"}</Badge></TableCell>
                <TableCell>{item.data?.immediateLifeThreat ? <Badge className="bg-red-600">Critical</Badge> : <Badge variant="outline">{item.data?.severity || "—"}</Badge>}</TableCell>
                <TableCell>{canEdit ? <Select value={item.status || "New"} onValueChange={value => void updateStatus(item, value)}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent>{statuses.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline">{item.status}</Badge>}</TableCell>
                <TableCell className="text-end"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openCase(item)}><Eye className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => void deleteCase(item)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell>
              </TableRow>)}
            </TableBody></Table></div>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" />{isAr ? "إعداد قنوات الإبلاغ" : "Reporting Channel Configuration"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">{isAr ? "الرابط العام يعمل عبر /report. البريد وWhatsApp يبقيان معطلين حتى تضيف وجهة مؤسسية صحيحة ثم تفعلهما." : "The public web link runs at /report. Email and WhatsApp remain disabled until a valid organizational destination is configured and enabled."}</p>
              {channelsLoading ? <p className="text-sm text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</p> : channels.map(item => (
                <div key={item.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[120px_1fr_1fr_2fr_auto] lg:items-end">
                  <div><Label>{isAr ? "القناة" : "Channel"}</Label><p className="mt-2 font-bold">{item.channel}</p></div>
                  <div className="space-y-2"><Label>{isAr ? "الاسم العربي" : "Arabic label"}</Label><Input value={item.publicLabelAr || ""} disabled={!canManageChannels} onChange={e => patchChannelLocal(item.id, { publicLabelAr: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{isAr ? "الاسم الإنجليزي" : "English label"}</Label><Input value={item.publicLabelEn || ""} disabled={!canManageChannels} onChange={e => patchChannelLocal(item.id, { publicLabelEn: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{isAr ? "الوجهة" : "Destination"}</Label><Input value={item.destination || ""} disabled={!canManageChannels || item.channel === "WEB"} onChange={e => patchChannelLocal(item.id, { destination: e.target.value })} placeholder={item.channel === "EMAIL" ? "safety.report@company.com" : item.channel === "WHATSAPP" ? "+9665..." : "/report"} /></div>
                  <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.isEnabled} disabled={!canManageChannels || item.channel === "WEB"} onChange={e => patchChannelLocal(item.id, { isEnabled: e.target.checked })} />{isAr ? "مفعلة" : "Enabled"}</label>{canManageChannels && <Button size="sm" onClick={() => void saveChannel(item)}>{isAr ? "حفظ" : "Save"}</Button>}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selected && <Dialog open onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{selected.refNo} — {selected.title}</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pe-1">
          {selected.data?.immediateLifeThreat && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"><AlertTriangle className="h-5 w-5" />{isAr ? "بلاغ حرج / خطر فوري — يتطلب مراجعة HSE فورية." : "Critical / immediate threat report — immediate HSE review required."}</div>}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">{isAr ? "التصنيف:" : "Category:"}</span> <strong>{selected.data?.category || "—"}</strong></div>
            <div><span className="text-muted-foreground">{isAr ? "الموقع:" : "Location:"}</span> <strong>{selected.data?.location || "—"}</strong></div>
            <div><span className="text-muted-foreground">{isAr ? "المصدر:" : "Source:"}</span> <strong>{selected.data?.sourceChannel || "WEB"}</strong></div>
            <div><span className="text-muted-foreground">{isAr ? "الخصوصية:" : "Privacy:"}</span> <strong>{selected.data?.identityMode || "anonymous"}</strong></div>
          </div>
          <div className="rounded-xl border p-4"><p className="mb-1 text-xs font-bold text-muted-foreground">{isAr ? "وصف البلاغ" : "Report description"}</p><p className="whitespace-pre-wrap text-sm">{selected.data?.description || "—"}</p></div>

          {selected.data?.identityMode !== "anonymous" && <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:bg-amber-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4" /><strong>{isAr ? "هوية المبلّغ مشفّرة" : "Reporter identity is encrypted"}</strong></div>{canReveal && <Button variant="outline" size="sm" onClick={() => { setRevealReason(""); setRevealOpen(true); }}>{isAr ? "كشف الهوية" : "Reveal identity"}</Button>}</div>
            {revealed && <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>{isAr ? "الاسم:" : "Name:"} <strong>{revealed.name || "—"}</strong></div><div>{isAr ? "البريد:" : "Email:"} <strong>{revealed.email || "—"}</strong></div><div>{isAr ? "الجوال:" : "Phone:"} <strong>{revealed.phone || "—"}</strong></div><div>{isAr ? "الرقم الوظيفي:" : "Employee ID:"} <strong>{revealed.employeeId || "—"}</strong></div></div>}
          </div>}

          <div className="space-y-3"><div className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" />{isAr ? "رسائل المتابعة" : "Follow-up messages"}</div>
            {messagesLoading ? <p className="text-xs text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</p> : messages.length === 0 ? <p className="text-xs text-muted-foreground">{isAr ? "لا توجد رسائل." : "No messages."}</p> : <div className="space-y-2">{messages.map(item => <div key={item.id} className="rounded-lg border p-3 text-sm"><p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{item.senderType === "hse" ? "HSE" : (isAr ? "المبلّغ" : "Reporter")}</p><p className="whitespace-pre-wrap">{item.message}</p></div>)}</div>}
            {canEdit && <div className="flex gap-2"><Textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} rows={3} placeholder={isAr ? "رسالة للمبلّغ..." : "Message to reporter..."} /><Button size="icon" className="shrink-0" onClick={() => void sendMessage()} disabled={!message.trim()}><Send className="h-4 w-4" /></Button></div>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>{isAr ? "إغلاق" : "Close"}</Button></DialogFooter>
      </DialogContent></Dialog>}

      <Dialog open={revealOpen} onOpenChange={setRevealOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{isAr ? "طلب كشف هوية المبلّغ" : "Reveal Reporter Identity"}</DialogTitle></DialogHeader><div className="space-y-2"><Label>{isAr ? "سبب الكشف (يُسجل في سجل التدقيق)" : "Reason for reveal (recorded in audit log)"}</Label><Textarea value={revealReason} onChange={e => setRevealReason(e.target.value)} rows={4} maxLength={500} placeholder={isAr ? "مثال: مطلوب للتواصل أثناء التحقيق في بلاغ عالي الخطورة" : "e.g. Required for follow-up during a high-risk investigation"} /></div><DialogFooter><Button variant="outline" onClick={() => setRevealOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void revealIdentity()} disabled={revealReason.trim().length < 8}>{isAr ? "كشف وتسجيل العملية" : "Reveal & Audit"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
