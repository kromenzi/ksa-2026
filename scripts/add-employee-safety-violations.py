from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Missing anchor: {label}")
    return text.replace(old, new, 1)

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

print("Employee safety violations navigation integrated successfully.")
