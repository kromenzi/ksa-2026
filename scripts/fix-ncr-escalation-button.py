from pathlib import Path

path = Path("src/pages/admin/ncr/list.tsx")
text = path.read_text(encoding="utf-8")
original = text

old = '  ShieldCheck, ShieldAlert as ShieldAlertIcon, Archive, FileSpreadsheet, FileCode2, Download, FileText as FileDocIcon\n'
new = '  ShieldCheck, ShieldAlert as ShieldAlertIcon, Archive, FileSpreadsheet, FileCode2, Download, FileText as FileDocIcon, Loader2\n'
assert old in text, "lucide import anchor not found"
text = text.replace(old, new, 1)

old = 'import ExportPreviewModal, { type ExportColumnDef, type ExportOptions } from "@/components/export-preview-modal";\n'
new = old + 'import { apiRequest } from "@/lib/queryClient";\n'
assert old in text, "apiRequest import anchor not found"
text = text.replace(old, new, 1)

old = '  const { ncrs, deleteNCR, sendNCREmail, settings, hasPermission } = useData();\n'
new = '  const { ncrs, deleteNCR, sendNCREmail, updateNCR, settings, hasPermission, currentUser } = useData();\n'
assert old in text, "useData destructuring anchor not found"
text = text.replace(old, new, 1)

old = '  const [isPreviewOpen, setIsPreviewOpen] = useState(false);\n'
new = old + '  const [escalatingId, setEscalatingId] = useState<string | null>(null);\n'
assert old in text, "preview state anchor not found"
text = text.replace(old, new, 1)

old = '  const { toast } = useToast();\n\n  const handleExportCSV = () => {\n'
handler = '''  const { toast } = useToast();

  const handleEscalateNCR = async (ncr: NCR) => {
    const existing = ncr.sourceMetadata?.escalation;
    if (existing?.id) {
      setLocation('/admin/escalations/history');
      return;
    }

    setEscalatingId(ncr.id);
    try {
      const severity = String(ncr.severity || 'medium').toLowerCase();
      const level = severity === 'critical'
        ? 'Level 4 - Plant Manager'
        : severity === 'high'
          ? 'Level 3 - HSE Manager'
          : severity === 'medium'
            ? 'Level 2 - Dept Manager'
            : 'Level 1 - Supervisor';
      const description = String(ncr.description || '').trim();
      const response = await apiRequest('POST', '/api/escalations', {
        source: ncr.refNo || `NCR:${ncr.id}`,
        sourceType: 'NCR',
        sourceId: ncr.id,
        sourceRef: ncr.refNo,
        title: `${ncr.refNo || 'NCR'} - ${description.slice(0, 120) || (isAr ? 'عدم مطابقة' : 'Non-conformance')}`,
        severity: severity.toUpperCase(),
        level,
        department: ncr.department || 'HSE',
        responsible: currentUser?.name || 'HSE Lead',
        reason: description || (isAr ? 'تصعيد تقرير عدم مطابقة' : 'NCR management escalation'),
      });
      const escalation = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(escalation?.error || 'Unable to create escalation');

      const previousMetadata = ncr.sourceMetadata && typeof ncr.sourceMetadata === 'object'
        ? ncr.sourceMetadata
        : {};
      await updateNCR(ncr.id, {
        sourceMetadata: {
          ...previousMetadata,
          escalation: {
            id: escalation.id,
            refNo: escalation.refNo,
            status: escalation.status,
            createdAt: escalation.createdAt || new Date().toISOString(),
            sourceType: 'NCR',
            sourceId: ncr.id,
            sourceRef: ncr.refNo,
          },
        },
      });

      toast({
        title: escalation.alreadyExists
          ? (isAr ? 'تم ربط التصعيد الموجود' : 'Existing escalation linked')
          : (isAr ? 'تم تصعيد NCR للإدارة' : 'NCR escalated to management'),
        description: escalation.refNo || undefined,
      });
    } catch (error: any) {
      toast({
        title: isAr ? 'فشل تصعيد NCR' : 'NCR escalation failed',
        description: error?.message || (isAr ? 'تعذر إنشاء التصعيد' : 'Unable to create escalation'),
        variant: 'destructive',
      });
    } finally {
      setEscalatingId(null);
    }
  };

  const handleExportCSV = () => {
'''
assert old in text, "toast/handler insertion anchor not found"
text = text.replace(old, handler, 1)

old = '''                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600" 
                                onClick={() => setLocation("/admin/escalations?source=" + encodeURIComponent(ncr.refNo))} 
                                data-testid={"button-escalate-ncr-" + ncr.id}
                              >
                                <ShieldAlert className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{isAr ? 'تصعيد للإدارة' : 'Escalate to Management'}</TooltipContent>
                          </Tooltip>
'''
new = '''                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 rounded-lg",
                                    ncr.sourceMetadata?.escalation?.id
                                      ? "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                      : "text-rose-500 hover:bg-rose-500/10 hover:text-rose-600",
                                  )}
                                  onClick={() => void handleEscalateNCR(ncr)}
                                  disabled={escalatingId === ncr.id}
                                  data-testid={"button-escalate-ncr-" + ncr.id}
                                >
                                  {escalatingId === ncr.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : ncr.sourceMetadata?.escalation?.id
                                      ? <ShieldCheck className="h-4 w-4" />
                                      : <ShieldAlert className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {ncr.sourceMetadata?.escalation?.id
                                  ? (isAr
                                      ? `تم التصعيد: ${ncr.sourceMetadata.escalation.refNo || ''}`
                                      : `Escalated: ${ncr.sourceMetadata.escalation.refNo || ''}`)
                                  : (isAr ? 'تصعيد للإدارة' : 'Escalate to Management')}
                              </TooltipContent>
                            </Tooltip>
                          )}
'''
assert old in text, "broken escalation button anchor not found"
text = text.replace(old, new, 1)

assert text != original, "no changes made"
assert '/admin/escalations?source=' not in text, "old navigation-only escalation remains"
assert "sourceType: 'NCR'" in text, "NCR source linkage missing"
assert "await updateNCR(ncr.id" in text, "NCR metadata persistence missing"
assert 'button-escalate-ncr-' in text, "NCR escalation button missing"

path.write_text(text, encoding="utf-8")
print("NCR escalation button patched successfully")
