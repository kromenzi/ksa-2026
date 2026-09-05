from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Missing anchor: {label}")
    return text.replace(old, new, 1)


# 1) Expose the page through the application router.
app_path = Path("src/App.tsx")
app = app_path.read_text(encoding="utf-8")
app = replace_once(
    app,
    'import AdminSafetySigns from "@/pages/admin/safety-signs";\n',
    'import AdminSafetySigns from "@/pages/admin/safety-signs";\nimport AdminEmployeeViolations from "@/pages/admin/employee-violations";\n',
    "employee violations import",
)
app = replace_once(
    app,
    '      <Route path="/admin/employees"><ProtectedRoute component={AdminEmployees} /></Route>\n',
    '      <Route path="/admin/employees"><ProtectedRoute component={AdminEmployees} /></Route>\n      <Route path="/admin/employee-violations"><ProtectedRoute component={AdminEmployeeViolations} /></Route>\n',
    "employee violations route",
)
app_path.write_text(app, encoding="utf-8")


# 2) Add the module to HSE Operations immediately after Employees & Safety.
layout_path = Path("src/components/layouts/admin-layout.tsx")
layout = layout_path.read_text(encoding="utf-8")
menu_item = '        { label: isAr ? \'مخالفات السلامة للموظفين\' : \'Employee Safety Violations\', icon: ShieldAlert, href: "/admin/employee-violations", visible: true, color: "text-red-600", bgColor: "bg-red-600/10" },\n'
layout = replace_once(
    layout,
    '        { label: isAr ? \'الموظفين وسجلات السلامة\' : \'Employees & Safety\', icon: Users, href: "/admin/employees", visible: true, color: "text-blue-600", bgColor: "bg-blue-600/10" },\n',
    '        { label: isAr ? \'الموظفين وسجلات السلامة\' : \'Employees & Safety\', icon: Users, href: "/admin/employees", visible: true, color: "text-blue-600", bgColor: "bg-blue-600/10" },\n' + menu_item,
    "employee violations navigation",
)
layout_path.write_text(layout, encoding="utf-8")


# 3) Reuse api/system-health.ts instead of creating a 13th Vercel Serverless Function.
api_path = Path("api/system-health.ts")
api = api_path.read_text(encoding="utf-8")
api = replace_once(
    api,
    '  "environmental-measurements":{table:"environmental_measurements",module:"settings"},\n};',
    '  "environmental-measurements":{table:"environmental_measurements",module:"settings"},\n  "employee-violations":{table:"employee_violations",module:"reports"},\n};',
    "employee violations API resource",
)
if '  employee_violations:new Set([' not in api:
    anchor = '  environmental_measurements:new Set(['
    if anchor not in api:
        raise SystemExit("Missing anchor: employee violations columns")
    columns = '  employee_violations:new Set(["id","ref_no","date","employee_name","employee_id","department","occupation","position","violation","violation_description","notes","severity","status","data","created_by","created_at","updated_at","escalation_id","escalated_at","escalated_by"]),\n'
    api = api.replace(anchor, columns + anchor, 1)
api = api.replace(
    '["documents","reports","posts","form_templates","employees","routing_rules","activity_logs","environmental_measurements"].includes(table)',
    '["documents","reports","posts","form_templates","employees","routing_rules","activity_logs","environmental_measurements","employee_violations"].includes(table)',
    1,
)
api = replace_once(
    api,
    'if(table==="documents")row.created_by=row.created_by||user.id;if(table==="posts")row.author_id=row.author_id||user.id;',
    'if(table==="documents")row.created_by=row.created_by||user.id;if(table==="employee_violations")row.created_by=row.created_by||user.id;if(table==="posts")row.author_id=row.author_id||user.id;',
    "employee violations created_by",
)
api = api.replace(
    'if(table==="documents"||table==="environmental_measurements")patch.updated_at=new Date().toISOString();',
    'if(table==="documents"||table==="environmental_measurements"||table==="employee_violations")patch.updated_at=new Date().toISOString();',
    1,
)
api_path.write_text(api, encoding="utf-8")


# 4) Route the public API path to the existing system-health function.
vercel_path = Path("vercel.json")
vercel = vercel_path.read_text(encoding="utf-8")
vercel = replace_once(
    vercel,
    '    { "source": "/api/employees/:id", "destination": "/api/system-health?resource=employees&id=:id" },\n',
    '    { "source": "/api/employees/:id", "destination": "/api/system-health?resource=employees&id=:id" },\n    { "source": "/api/employee-violations", "destination": "/api/system-health?resource=employee-violations" },\n    { "source": "/api/employee-violations/:id", "destination": "/api/system-health?resource=employee-violations&id=:id" },\n',
    "employee violations Vercel rewrite",
)
vercel_path.write_text(vercel, encoding="utf-8")


# 5) Enrich the UI locally for repeat detection and use the existing escalation API.
page_path = Path("src/pages/admin/employee-violations.tsx")
page = page_path.read_text(encoding="utf-8")
page = replace_once(
    page,
    '      if (!response.ok) throw new Error("Unable to load employee violations");\n      return response.json();',
    '''      if (!response.ok) throw new Error("Unable to load employee violations");
      const rows = (await response.json()) as any[];
      const employeeCounts = new Map<string, number>();
      const sameViolationCounts = new Map<string, number>();
      const employeeKey = (item: any) => String(item.employeeId || item.employeeName || "").trim().toLocaleLowerCase();
      const violationText = (item: any) => String(item.violation || item.violationDescription || "").trim();
      for (const item of rows) {
        const key = employeeKey(item);
        if (!key) continue;
        employeeCounts.set(key, (employeeCounts.get(key) || 0) + 1);
        const sameKey = `${key}::${violationText(item).toLocaleLowerCase()}`;
        sameViolationCounts.set(sameKey, (sameViolationCounts.get(sameKey) || 0) + 1);
      }
      return rows.map((item: any) => {
        const key = employeeKey(item);
        const normalizedViolation = violationText(item);
        const repeatCount = key ? employeeCounts.get(key) || 1 : 1;
        const sameViolationCount = key ? sameViolationCounts.get(`${key}::${normalizedViolation.toLocaleLowerCase()}`) || 1 : 1;
        return {
          ...item,
          department: item.department || item.data?.department || "",
          occupation: item.occupation || item.position || item.data?.occupation || "",
          violation: normalizedViolation,
          notes: item.notes || item.data?.notes || "",
          severity: item.severity || item.data?.severity || "medium",
          repeatCount,
          sameViolationCount,
          isRepeat: repeatCount > 1,
          isSameViolationRepeat: sameViolationCount > 1,
        } as ViolationRecord;
      });''',
    "client repeat detection",
)
page = replace_once(
    page,
    '      const response = await apiRequest("POST", "/api/employee-violations", form);\n      return response.json();',
    '''      const response = await apiRequest("POST", "/api/employee-violations", {
        ...form,
        refNo: `VIO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
        status: "open",
      });
      return response.json();''',
    "violation create payload",
)
old_escalation = '''  const escalateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/employee-violations?id=${encodeURIComponent(id)}&action=escalate`, {});
      return response.json();
    },
    onSuccess: async () => {
      toast.success(isAr ? "تم إنشاء التصعيد الإداري وربطه بالمخالفة" : "Administrative escalation created and linked");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/escalations"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });'''
new_escalation = '''  const escalateMutation = useMutation({
    mutationFn: async (item: ViolationRecord) => {
      const level = item.repeatCount >= 3 ? "Level 3 - HSE Manager / HR" : "Level 2 - Department Manager";
      const severity = item.repeatCount >= 3 ? "CRITICAL" : "HIGH";
      const reason = `Employee safety violation. Employee: ${item.employeeName} (${item.employeeId}). Violation: ${item.violation}. Total recorded violations: ${item.repeatCount}.`;
      const escalationResponse = await apiRequest("POST", "/api/escalations", {
        title: `Safety Violation - ${item.employeeName}`,
        source: `SAFETY-VIOLATION:${item.id}`,
        severity,
        level,
        department: item.department || "HSE",
        responsible: "Department Manager / HSE",
        reason,
      });
      const escalation = await escalationResponse.json();
      const violationResponse = await apiRequest("PATCH", `/api/employee-violations/${encodeURIComponent(item.id)}`, {
        status: "escalated",
        escalationId: escalation.id,
        escalatedAt: new Date().toISOString(),
      });
      return { escalation, violation: await violationResponse.json() };
    },
    onSuccess: async () => {
      toast.success(isAr ? "تم إنشاء التصعيد الإداري وربطه بالمخالفة" : "Administrative escalation created and linked");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/escalations"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });'''
page = replace_once(page, old_escalation, new_escalation, "administrative escalation integration")
page = page.replace('if (confirmed) escalateMutation.mutate(item.id);', 'if (confirmed) escalateMutation.mutate(item);', 1)
page_path.write_text(page, encoding="utf-8")

print("Employee safety violations module integrated using existing Vercel functions.")
