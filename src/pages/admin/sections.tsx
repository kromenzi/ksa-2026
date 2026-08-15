import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Plus, Search, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminSections() {
  const { settings, departments, addDepartment, deleteDepartment } = useData();
  const isAr = settings.language === "ar";
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; code: string } | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const reset = () => { setName(""); setCode(""); setEditing(null); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanCode = code.trim();
    if (!cleanName || !cleanCode) {
      toast.error(isAr ? "اسم القسم والرمز مطلوبان" : "Department name and code are required");
      return;
    }
    try {
      if (editing) {
        const response = await fetch(`/api/departments/${editing.id}`, {
          method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName, code: cleanCode }),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Update failed");
      } else {
        await addDepartment({ name: cleanName, code: cleanCode });
      }
      toast.success(isAr ? "تم حفظ القسم بنجاح" : "Department saved successfully");
      setOpen(false); reset();
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حفظ القسم" : "Unable to save department"));
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(isAr ? "هل تريد حذف القسم؟" : "Delete this department?")) return;
    try {
      await deleteDepartment(id);
      toast.success(isAr ? "تم حذف القسم" : "Department deleted");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حذف القسم" : "Unable to delete department"));
    }
  };

  const filtered = departments.filter(d => `${d.name} ${d.code}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Layers className="h-6 w-6 text-violet-500" />{isAr ? "الأقسام" : "Departments"}</h2>
          <p className="text-muted-foreground mt-1">{isAr ? "الأقسام الحقيقية المستخدمة في نماذج NCR والتقارير" : "Real departments used by NCR forms and reports"}</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl"><Plus className="h-4 w-4" />{isAr ? "قسم جديد" : "New Department"}</Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder={isAr ? "بحث في الأقسام..." : "Search departments..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="ps-10 rounded-2xl" /></div>
        <div className="text-xs text-muted-foreground">{isAr ? "الإجمالي:" : "Total:"} <span className="font-bold text-foreground">{departments.length}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(d => (
          <Card key={d.id} className="rounded-3xl border-border/50">
            <CardHeader><CardTitle className="text-lg">{d.name}</CardTitle><div className="font-mono text-xs text-muted-foreground">{d.code}</div></CardHeader>
            <CardContent className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setName(d.name); setCode(d.code); setOpen(true); }}><Edit3 className="h-4 w-4 text-blue-500" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
            </CardContent>
          </Card>
        ))}
        {!filtered.length && <div className="col-span-full text-center py-12 text-muted-foreground">{isAr ? "لا توجد أقسام بعد. أضف أول قسم حقيقي." : "No departments yet. Add the first real department."}</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل القسم" : "Edit Department") : (isAr ? "إضافة قسم جديد" : "Add Department")}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4 pt-2">
            <div className="space-y-2"><Label>{isAr ? "اسم القسم" : "Department Name"}</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production" /></div>
            <div className="space-y-2"><Label>{isAr ? "رمز القسم" : "Department Code"}</Label><Input required value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. PROD" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>{isAr ? "إلغاء" : "Cancel"}</Button><Button type="submit" className="bg-violet-600 text-white">{isAr ? "حفظ" : "Save"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
