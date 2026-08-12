import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, HardHat, ShieldAlert, Navigation, Settings2, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface VisionSafetyRule {
  id: string;
  name: string;
  category: "PPE" | "Restricted Zone" | "Equipment" | "Behavioral";
  scope: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Active" | "Inactive";
}

const DEFAULT_VISION_RULES: VisionSafetyRule[] = [
  { id: "RUL-001", name: "Helmet Required", category: "PPE", scope: "Zone A, Zone B", severity: "High", status: "Active" },
  { id: "RUL-002", name: "Safety Vest Required", category: "PPE", scope: "Warehouse", severity: "High", status: "Active" },
  { id: "RUL-003", name: "No Entry - Server Room", category: "Restricted Zone", scope: "Server Room", severity: "Critical", status: "Active" },
  { id: "RUL-004", name: "Forklift Separation", category: "Equipment", scope: "Loading Bay", severity: "Critical", status: "Active" },
  { id: "RUL-005", name: "Gloves Required", category: "PPE", scope: "Workshop", severity: "Medium", status: "Inactive" },
];

export default function VisionRules() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  
  const [rules, setRules] = useState<VisionSafetyRule[]>(() => {
    const saved = localStorage.getItem("safety_board_vision_rules_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return DEFAULT_VISION_RULES;
  });

  useEffect(() => {
    localStorage.setItem("safety_board_vision_rules_v1", JSON.stringify(rules));
  }, [rules]);

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<VisionSafetyRule | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<VisionSafetyRule["category"]>("PPE");
  const [formScope, setFormScope] = useState("");
  const [formSeverity, setFormSeverity] = useState<VisionSafetyRule["severity"]>("High");

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormName("");
    setFormCategory("PPE");
    setFormScope("Main Factory Floor");
    setFormSeverity("High");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: VisionSafetyRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormCategory(rule.category);
    setFormScope(rule.scope);
    setFormSeverity(rule.severity);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      toast.error(isAr ? "يرجى إدخال اسم القاعدة" : "Please enter rule name");
      return;
    }

    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? {
        ...r,
        name: formName,
        category: formCategory,
        scope: formScope,
        severity: formSeverity
      } : r));
      toast.success(isAr ? "تم تحديث قاعدة السلامة بنجاح" : "Safety rule updated successfully");
    } else {
      const newRule: VisionSafetyRule = {
        id: `RUL-${Math.floor(100 + Math.random() * 900)}`,
        name: formName,
        category: formCategory,
        scope: formScope || "General Zone",
        severity: formSeverity,
        status: "Active"
      };
      setRules([newRule, ...rules]);
      toast.success(isAr ? "تمت إضافة قاعدة السلامة بنجاح" : "Safety rule created successfully");
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' } : r));
    toast.success(isAr ? "تم تغيير حالة القاعدة" : "Rule status toggled");
  };

  const handleDelete = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    toast.success(isAr ? "تم حذف القاعدة بنجاح" : "Rule deleted successfully");
  };

  const filteredRules = rules.filter(rule => {
    const matchesTab = activeTab === "all" || 
      (activeTab === "ppe" && rule.category === "PPE") ||
      (activeTab === "zones" && rule.category === "Restricted Zone") ||
      (activeTab === "equipment" && rule.category === "Equipment");
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) || rule.scope.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isAr ? 'قواعد السلامة الذكية' : 'Smart Safety Rules'}</h1>
          <p className="text-muted-foreground">{isAr ? 'إدارة وتكوين قواعد السلامة للتحليل الذكي للكاميرات' : 'Manage and configure safety rules for smart camera AI analysis'}</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" />
            {isAr ? 'إنشاء قاعدة جديدة' : 'Create Rule'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{isAr ? 'قواعد معدات الوقاية' : 'PPE Rules'}</p>
              <h3 className="text-2xl font-bold">{rules.filter(r => r.category === 'PPE').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{isAr ? 'المناطق المحظورة' : 'Restricted Zones'}</p>
              <h3 className="text-2xl font-bold">{rules.filter(r => r.category === 'Restricted Zone').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{isAr ? 'قواعد المعدات' : 'Equipment Rules'}</p>
              <h3 className="text-2xl font-bold">{rules.filter(r => r.category === 'Equipment').length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="rounded-2xl">
                <TabsTrigger value="all" className="rounded-xl">{isAr ? 'الكل' : 'All Rules'}</TabsTrigger>
                <TabsTrigger value="ppe" className="rounded-xl">PPE</TabsTrigger>
                <TabsTrigger value="zones" className="rounded-xl">Zones</TabsTrigger>
                <TabsTrigger value="equipment" className="rounded-xl">Equipment</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input 
                  className="pl-9 rtl:pr-9 rtl:pl-3 bg-background h-9 rounded-2xl" 
                  placeholder={isAr ? 'بحث عن قاعدة...' : 'Search rules...'} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? 'معرف القاعدة' : 'Rule ID'}</TableHead>
                <TableHead>{isAr ? 'اسم القاعدة' : 'Rule Name'}</TableHead>
                <TableHead>{isAr ? 'الفئة' : 'Category'}</TableHead>
                <TableHead>{isAr ? 'النطاق' : 'Scope (Zones/Cameras)'}</TableHead>
                <TableHead>{isAr ? 'الخطورة' : 'Severity'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="text-right rtl:text-left">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {isAr ? 'لا توجد قواعد مطابقة' : 'No matching rules found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{rule.id}</TableCell>
                    <TableCell className="font-medium text-foreground">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/50 rounded-xl">
                        {rule.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.scope}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-xl ${
                        rule.severity === 'Critical' ? 'border-rose-500/30 text-rose-600 bg-rose-500/10' :
                        rule.severity === 'High' ? 'border-amber-500/30 text-amber-600 bg-amber-500/10' : 'border-blue-500/30 text-blue-600 bg-blue-500/10'
                      }`}>
                        {rule.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={rule.status === 'Active'} 
                        onCheckedChange={() => handleToggleStatus(rule.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleOpenEdit(rule)}>
                          <Settings2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-700" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingRule ? (isAr ? 'تعديل قاعدة السلامة الذكية' : 'Edit Smart Safety Rule') : (isAr ? 'إنشاء قاعدة سلامة ذكية جديدة' : 'Create Smart Safety Rule')}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'تحديد معايير كشف الرؤية الذكية ومستوى الخطورة' : 'Define AI vision detection parameters and severity level'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{isAr ? 'اسم القاعدة' : 'Rule Name'}</Label>
              <Input 
                required
                placeholder="e.g. Mandatory Hard Hat"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'الفئة' : 'Category'}</Label>
                <Select value={formCategory} onValueChange={(val: any) => setFormCategory(val)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="PPE">PPE</SelectItem>
                    <SelectItem value="Restricted Zone">Restricted Zone</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Behavioral">Behavioral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'مستوى الخطورة' : 'Severity'}</Label>
                <Select value={formSeverity} onValueChange={(val: any) => setFormSeverity(val)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'نطاق التطبيق (المناطق)' : 'Scope (Zones / Cameras)'}</Label>
              <Input 
                required
                placeholder="e.g. Zone A, Warehouse Bay 3"
                value={formScope}
                onChange={e => setFormScope(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl">
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white">
                {isAr ? 'حفظ القاعدة' : 'Save Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
