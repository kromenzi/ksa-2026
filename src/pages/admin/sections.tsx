import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Plus, Search, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SectionItem {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  department: string;
  manager: string;
  description: string;
  status: "Active" | "Inactive";
}

const DEFAULT_SECTIONS: SectionItem[] = [
  { id: "SEC-001", name: "HSE & Compliance", nameAr: "الصحة والبيئة والامتثال", code: "HSE-01", department: "Operations", manager: "Ahmed Al-Mansoori", description: "Health, Safety, Environment and Regulatory Compliance", status: "Active" },
  { id: "SEC-002", name: "Plant Maintenance", nameAr: "صيانة المصنع", code: "MNT-02", department: "Engineering", manager: "Mohammed Al-Harbi", description: "Equipment upkeep, LOTO, and mechanical safety", status: "Active" },
  { id: "SEC-003", name: "Warehouse & Logistics", nameAr: "المستودعات والخدمات اللوجستية", code: "LOG-03", department: "Supply Chain", manager: "Salim Al-Balushi", description: "Forklift operations, storage, and material handling", status: "Active" },
  { id: "SEC-004", name: "Emergency & Security", nameAr: "الطوارئ والأمن", code: "SEC-04", department: "Security", manager: "Fهد القحطاني", description: "Emergency response, gate security, and evacuation", status: "Active" },
];

export default function AdminSections() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [sections, setSections] = useState<SectionItem[]>(() => {
    const saved = localStorage.getItem("safety_board_sections_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return DEFAULT_SECTIONS;
  });

  useEffect(() => {
    localStorage.setItem("safety_board_sections_v1", JSON.stringify(sections));
  }, [sections]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formManager, setFormManager] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const handleOpenAdd = () => {
    setEditingSection(null);
    setFormName("");
    setFormNameAr("");
    setFormCode(`SEC-${Math.floor(10 + Math.random() * 90)}`);
    setFormDepartment("Operations");
    setFormManager("");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec: SectionItem) => {
    setEditingSection(sec);
    setFormName(sec.name);
    setFormNameAr(sec.nameAr);
    setFormCode(sec.code);
    setFormDepartment(sec.department);
    setFormManager(sec.manager);
    setFormDescription(sec.description);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      toast.error(isAr ? "يرجى إدخال اسم القسم" : "Please enter section name");
      return;
    }

    if (editingSection) {
      setSections(sections.map(s => s.id === editingSection.id ? {
        ...s,
        name: formName,
        nameAr: formNameAr || formName,
        code: formCode || s.code,
        department: formDepartment,
        manager: formManager,
        description: formDescription
      } : s));
      toast.success(isAr ? "تم تحديث القسم بنجاح" : "Section updated successfully");
    } else {
      const newSec: SectionItem = {
        id: `SEC-${Math.floor(100 + Math.random() * 900)}`,
        name: formName,
        nameAr: formNameAr || formName,
        code: formCode || `SEC-${Math.floor(10 + Math.random() * 90)}`,
        department: formDepartment || "General",
        manager: formManager || "Unassigned",
        description: formDescription,
        status: "Active"
      };
      setSections([newSec, ...sections]);
      toast.success(isAr ? "تمت إضافة القسم بنجاح" : "Section added successfully");
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    toast.success(isAr ? "تم حذف القسم بنجاح" : "Section deleted successfully");
  };

  const filteredSections = sections.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nameAr.includes(searchTerm) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-violet-500" />
            {isAr ? "الأقسام" : "Sections"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "إدارة أقسام المحتوى والمناطق التنظيمية" : "Manage content sections and organizational units"}
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl">
          <Plus className="h-4 w-4" />
          {isAr ? "قسم جديد" : "New Section"}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={isAr ? "بحث في الأقسام..." : "Search sections..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="ps-10 rounded-2xl"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {isAr ? "إجمالي الأقسام:" : "Total Sections:"} <span className="font-bold text-foreground">{sections.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSections.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            <Layers className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>{isAr ? "لا توجد أقسام مطابقة" : "No sections found"}</p>
          </div>
        ) : (
          filteredSections.map((sec) => (
            <Card key={sec.id} className="rounded-3xl border-border/50 hover:shadow-md transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{sec.code} ({sec.id})</span>
                    <CardTitle className="text-lg font-bold mt-1">
                      {isAr ? sec.nameAr : sec.name}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="rounded-xl bg-violet-500/10 text-violet-600 border-violet-500/30">
                    {sec.department}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{sec.description || (isAr ? 'لا يوجد وصف' : 'No description')}</p>
                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{isAr ? 'المدير المسؤول:' : 'Manager:'}</span> {sec.manager || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleOpenEdit(sec)}>
                      <Edit3 className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-700" onClick={() => handleDelete(sec.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingSection ? (isAr ? 'تعديل القسم' : 'Edit Section') : (isAr ? 'إضافة قسم جديد' : 'Add New Section')}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'أدخل تفاصيل القسم أو الوحدة التنظيمية' : 'Enter details for the section or organizational unit'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'اسم القسم (بالإنجليزية)' : 'Name (English)'}</Label>
                <Input 
                  required
                  placeholder="e.g. HSE & Compliance"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'اسم القسم (بالعربية)' : 'Name (Arabic)'}</Label>
                <Input 
                  placeholder="مثال: الصحة والسلامة"
                  value={formNameAr}
                  onChange={e => setFormNameAr(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'رمز القسم' : 'Section Code'}</Label>
                <Input 
                  placeholder="e.g. HSE-01"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الإدارة التابعة' : 'Department'}</Label>
                <Input 
                  placeholder="e.g. Operations"
                  value={formDepartment}
                  onChange={e => setFormDepartment(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'المدير المسؤول' : 'Responsible Manager'}</Label>
              <Input 
                placeholder="e.g. Ahmed Al-Mansoori"
                value={formManager}
                onChange={e => setFormManager(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الوصف' : 'Description'}</Label>
              <Input 
                placeholder="Brief description of responsibilities"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl">
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" className="rounded-2xl bg-violet-600 hover:bg-violet-700 text-white">
                {isAr ? 'حفظ القسم' : 'Save Section'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
