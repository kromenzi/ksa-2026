import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Plus, Search, FileWarning, Download, Trash2, MoreHorizontal, Filter, CheckCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface NCR {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-review' | 'resolved' | 'closed';
  createdAt: string;
}

export default function AdminNCR() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  
  const [ncrs, setNcrs] = useState<NCR[]>([
    { id: '1', title: 'NCR-2024-001', description: 'Non-conformance in welding procedure', severity: 'high', status: 'open', createdAt: '2024-01-15' },
    { id: '2', title: 'NCR-2024-002', description: 'Material specification deviation', severity: 'medium', status: 'in-review', createdAt: '2024-01-16' },
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newNcr, setNewNcr] = useState({ title: '', description: '', severity: 'medium' as const });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredNcrs = ncrs.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ["ID", "Title", "Description", "Severity", "Status", "Created At"];
    const rows = filteredNcrs.map(n => [n.id, n.title, `"${n.description.replace(/"/g, '""')}"`, n.severity, n.status, n.createdAt]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ncr_reports.csv");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    toast.success(isAr ? "تم تصدير تقارير NCR (CSV)" : "NCR exported successfully (CSV)");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredNcrs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "ncr_reports.json");
    dlAnchorElem.click();
    toast.success(isAr ? "تم تصدير تقارير NCR (JSON)" : "NCR exported successfully (JSON)");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddNcr = () => {
    if (!newNcr.description) {
      toast.error(isAr ? "يرجى إدخال الوصف" : "Please enter description");
      return;
    }
    const ncr: NCR = {
      id: Date.now().toString(),
      title: `NCR-${new Date().getFullYear()}-${String(ncrs.length + 1).padStart(3, '0')}`,
      description: newNcr.description,
      severity: newNcr.severity,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setNcrs([...ncrs, ncr]);
    setNewNcr({ title: '', description: '', severity: 'medium' });
    setIsDialogOpen(false);
    toast.success(isAr ? "تم إضافة NCR بنجاح" : "NCR added successfully");
  };

  const handleDeleteNcr = (id: string) => {
    setNcrs(ncrs.filter(n => n.id !== id));
    toast.success(isAr ? "تم حذف NCR" : "NCR deleted");
  };

  const handleStatusChange = (id: string, status: NCR['status']) => {
    setNcrs(ncrs.map(n => n.id === id ? { ...n, status } : n));
    toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-blue-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-orange-500',
      'critical': 'bg-red-500'
    };
    const labels: Record<string, string> = {
      'low': isAr ? 'منخفض' : 'Low',
      'medium': isAr ? 'متوسط' : 'Medium',
      'high': isAr ? 'عالي' : 'High',
      'critical': isAr ? 'حرج' : 'Critical'
    };
    return <Badge className={colors[severity] || 'bg-gray-500'}>{labels[severity] || severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'open': 'bg-yellow-500',
      'in-review': 'bg-blue-500',
      'resolved': 'bg-green-500',
      'closed': 'bg-gray-500'
    };
    const labels: Record<string, string> = {
      'open': isAr ? 'مفتوح' : 'Open',
      'in-review': isAr ? 'قيد المراجعة' : 'In Review',
      'resolved': isAr ? 'تم الحل' : 'Resolved',
      'closed': isAr ? 'مغلق' : 'Closed'
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            {isAr ? "عدم المطابقة (NCR)" : "Non-Conformance Reports"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "إدارة تقارير عدم المطابقة" : "Manage non-conformance reports"}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            {isAr ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={handleExportJSON}>
            <Download className="h-4 w-4" />
            {isAr ? "تصدير JSON" : "Export JSON"}
          </Button>
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة" : "Print"}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-2xl">
                <Plus className="h-4 w-4" />
                {isAr ? "NCR جديد" : "New NCR"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{isAr ? "إضافة NCR جديد" : "Add New NCR"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{isAr ? "الوصف" : "Description"}</Label>
                  <Textarea 
                    value={newNcr.description}
                    onChange={(e) => setNewNcr({ ...newNcr, description: e.target.value })}
                    placeholder={isAr ? "وصف عدم المطابقة..." : "Describe the non-conformance..."}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "مستوى الخطورة" : "Severity"}</Label>
                  <Select value={newNcr.severity} onValueChange={(v: any) => setNewNcr({ ...newNcr, severity: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{isAr ? "منخفض" : "Low"}</SelectItem>
                      <SelectItem value="medium">{isAr ? "متوسط" : "Medium"}</SelectItem>
                      <SelectItem value="high">{isAr ? "عالي" : "High"}</SelectItem>
                      <SelectItem value="critical">{isAr ? "حرج" : "Critical"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddNcr} className="w-full">
                  {isAr ? "إضافة NCR" : "Add NCR"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={isAr ? "بحث في NCR..." : "Search NCRs..."}
            className="ps-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          {isAr ? "تصفية" : "Filter"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "قائمة NCR" : "NCR List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNcrs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد تقارير NCR" : "No NCRs found"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNcrs.map((ncr) => (
                <div key={ncr.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileWarning className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">{ncr.title}</p>
                      <p className="text-sm text-muted-foreground">{ncr.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ncr.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(ncr.severity)}
                    {getStatusBadge(ncr.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr.id, 'open')}>
                          {isAr ? "تعيين كمفتوح" : "Set as Open"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr.id, 'in-review')}>
                          {isAr ? "تعيين قيد المراجعة" : "Set as In Review"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr.id, 'resolved')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isAr ? "تعيين كمحلول" : "Set as Resolved"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(isAr ? "جاري التحميل..." : "Downloading...")}>
                          <Download className="h-4 w-4 mr-2" />
                          {isAr ? "تحميل" : "Download"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteNcr(ncr.id)} className="text-red-500">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isAr ? "حذف" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
