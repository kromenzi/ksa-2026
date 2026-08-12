import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useData } from "@/lib/data-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Filter, Bookmark, Star, Calendar, ArrowRight, ShieldAlert, 
  ClipboardList, Users, AlertTriangle, ScrollText, Lock, HardDrive, FileArchive, ArrowUpDown, X 
} from "lucide-react";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  module: string;
  moduleLabel: string;
  moduleLabelAr: string;
  date: string;
  refNo?: string;
  severity?: string;
  href: string;
  icon: any;
  badgeColor: string;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [, setLocation] = useLocation();
  const { settings, ncrs, safetyReports, employees } = useData();
  const isAr = settings.language === "ar";

  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [savedSearches, setSavedSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("board_saved_searches");
      return saved ? JSON.parse(saved) : ["NCR", "Permit", "Factory A", "Incident"];
    } catch {
      return ["NCR", "Permit", "Factory A", "Incident"];
    }
  });

  // Load sample records for module coverage
  const allResults = useMemo<SearchResultItem[]>(() => {
    const list: SearchResultItem[] = [];

    // 1. NCRs
    ncrs.forEach(n => {
      list.push({
        id: `ncr-${n.id}`,
        title: n.refNo || `NCR #${n.id}`,
        subtitle: n.description || n.department,
        module: "ncr",
        moduleLabel: "NCR",
        moduleLabelAr: "عدم مطابقة NCR",
        date: n.date || n.createdAt,
        refNo: n.refNo,
        severity: n.severity,
        href: `/admin/ncr/${n.id}`,
        icon: ClipboardList,
        badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20"
      });
    });

    // 2. Safety Reports
    safetyReports.forEach(r => {
      list.push({
        id: `sor-${r.id}`,
        title: r.reportNo || `SOR #${r.id}`,
        subtitle: r.observationDescription || r.location || "Observation Report",
        module: "reports",
        moduleLabel: "SOR Report",
        moduleLabelAr: "تقرير سلامة",
        date: r.date || r.createdAt,
        refNo: r.reportNo,
        severity: r.riskLevel,
        href: `/admin/reports`,
        icon: ShieldAlert,
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      });
    });

    // 3. Employees
    employees.forEach(e => {
      list.push({
        id: `emp-${e.id}`,
        title: e.name,
        subtitle: `${e.title} - ${e.email}`,
        module: "employees",
        moduleLabel: "Employee",
        moduleLabelAr: "موظف",
        date: "Active",
        href: `/admin/employees`,
        icon: Users,
        badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20"
      });
    });

    // 4. Sample Incidents
    const mockIncidents = [
      { id: "inc-1", refNo: "INC-2026-000001", title: "Minor Chemical Spill in Area 3", date: "2026-08-01", severity: "medium", dept: "Chemical Plant" },
      { id: "inc-2", refNo: "INC-2026-000002", title: "Near Miss: Loose Scaffold Clamp", date: "2026-08-03", severity: "high", dept: "Construction" },
    ];
    mockIncidents.forEach(i => {
      list.push({
        id: i.id,
        title: `${i.refNo} - ${i.title}`,
        subtitle: i.dept,
        module: "incidents",
        moduleLabel: "Incident",
        moduleLabelAr: "حادث / وشيك",
        date: i.date,
        refNo: i.refNo,
        severity: i.severity,
        href: `/admin/incidents`,
        icon: AlertTriangle,
        badgeColor: "bg-red-500/10 text-red-600 border-red-500/20"
      });
    });

    // 5. Sample Permits (PTW)
    const mockPermits = [
      { id: "ptw-1", refNo: "PTW-2026-000101", title: "Hot Work Permit - Welding Line A", date: "2026-08-04", status: "Active" },
      { id: "ptw-2", refNo: "PTW-2026-000102", title: "Confined Space Entry Permit - Tank 4", date: "2026-08-05", status: "Pending" },
    ];
    mockPermits.forEach(p => {
      list.push({
        id: p.id,
        title: `${p.refNo} - ${p.title}`,
        subtitle: `Status: ${p.status}`,
        module: "permits",
        moduleLabel: "Permit (PTW)",
        moduleLabelAr: "تصريح عمل",
        date: p.date,
        refNo: p.refNo,
        href: `/admin/permits`,
        icon: ScrollText,
        badgeColor: "bg-sky-500/10 text-sky-600 border-sky-500/20"
      });
    });

    // 6. Sample LOTO
    const mockLoto = [
      { id: "loto-1", refNo: "LOTO-2026-00005", title: "Main Feeder Isolation - Substation 2", date: "2026-08-02" },
    ];
    mockLoto.forEach(l => {
      list.push({
        id: l.id,
        title: `${l.refNo} - ${l.title}`,
        subtitle: "Lockout Tagout Authorized",
        module: "loto",
        moduleLabel: "LOTO",
        moduleLabelAr: "عزل الطاقة LOTO",
        date: l.date,
        refNo: l.refNo,
        href: `/admin/loto`,
        icon: Lock,
        badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20"
      });
    });

    // 7. Sample Assets
    const mockAssets = [
      { id: "ast-1", refNo: "AST-FE-009", title: "CO2 Fire Extinguisher #09", dept: "Warehouse B", date: "2026-07-20" },
      { id: "ast-2", refNo: "AST-CR-002", title: "Tower Crane 50T", dept: "Site 1", date: "2026-07-25" },
    ];
    mockAssets.forEach(a => {
      list.push({
        id: a.id,
        title: `${a.refNo} - ${a.title}`,
        subtitle: a.dept,
        module: "assets",
        moduleLabel: "Asset",
        moduleLabelAr: "أصل سلامة",
        date: a.date,
        refNo: a.refNo,
        href: `/admin/assets`,
        icon: HardDrive,
        badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
      });
    });

    // 8. Documents
    const mockDocs = [
      { id: "doc-1", refNo: "DOC-2026-99", title: "Annual ISO 45001 Safety Management Standard PDF", date: "2026-06-15" },
    ];
    mockDocs.forEach(d => {
      list.push({
        id: d.id,
        title: d.title,
        subtitle: "Document / Procedure File",
        module: "files",
        moduleLabel: "Document",
        moduleLabelAr: "مستند",
        date: d.date,
        refNo: d.refNo,
        href: `/admin/files`,
        icon: FileArchive,
        badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20"
      });
    });

    return list;
  }, [ncrs, safetyReports, employees]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return allResults.filter(item => {
      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSub = item.subtitle.toLowerCase().includes(q);
        const matchesRef = item.refNo?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSub && !matchesRef) return false;
      }

      // Module filter
      if (selectedModule !== "all" && item.module !== selectedModule) {
        return false;
      }

      // Severity filter
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return a.title.localeCompare(b.title);
    });
  }, [allResults, query, selectedModule, selectedSeverity, sortBy]);

  const handleSaveSearch = () => {
    if (!query.trim() || savedSearches.includes(query.trim())) return;
    const updated = [query.trim(), ...savedSearches].slice(0, 10);
    setSavedSearches(updated);
    try {
      localStorage.setItem("board_saved_searches", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveSavedSearch = (s: string) => {
    const updated = savedSearches.filter(x => x !== s);
    setSavedSearches(updated);
    try {
      localStorage.setItem("board_saved_searches", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectResult = (href: string) => {
    onOpenChange(false);
    setLocation(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 rounded-2xl border border-border/80 shadow-2xl bg-card">
        <DialogHeader className="p-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Search className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold">
                {isAr ? "محرك البحث الشامل بالنظام" : "Global System Search Engine"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isAr 
                  ? "ابحث فوراً في كافة التقارير، عدم المطابقة، الموظفين، تصاريح العمل، الحوادث والأصول" 
                  : "Search instantly across reports, NCRs, employees, PTWs, incidents, assets, and documents"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={isAr ? "اكتب للبحث (مثال: NCR, PTW-2026, احمد, عزل طاقة)..." : "Type to search (e.g. NCR, PTW-2026, Ahmed, LOTO)..."}
                className="ps-9 pe-24 h-10 rounded-xl text-sm bg-background border-border"
                autoFocus
              />
              {query.trim() && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveSearch}
                  className="absolute end-1 top-1 h-8 text-xs text-muted-foreground hover:text-primary gap-1"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {isAr ? "حفظ" : "Save"}
                </Button>
              )}
            </div>
          </div>

          {/* Saved search chips */}
          {savedSearches.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="shrink-0">{isAr ? "عمليات بحث محفوظة:" : "Saved:"}</span>
              {savedSearches.map((s, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all text-[11px] gap-1 px-2 py-0.5 rounded-lg shrink-0"
                  onClick={() => setQuery(s)}
                >
                  <span>{s}</span>
                  <X 
                    className="h-3 w-3 text-muted-foreground/60 hover:text-destructive" 
                    onClick={(e) => { e.stopPropagation(); handleRemoveSavedSearch(s); }} 
                  />
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Filter controls */}
        <div className="p-3 bg-muted/10 border-b border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>{isAr ? "التصفية:" : "Filter:"}</span>
            </div>

            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="h-8 w-36 text-xs rounded-lg">
                <SelectValue placeholder={isAr ? "كل الأقسام" : "All Modules"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "جميع الأقسام" : "All Modules"}</SelectItem>
                <SelectItem value="ncr">{isAr ? "NCR عدم مطابقة" : "NCR"}</SelectItem>
                <SelectItem value="reports">{isAr ? "تقارير SOR" : "SOR Reports"}</SelectItem>
                <SelectItem value="employees">{isAr ? "الموظفين" : "Employees"}</SelectItem>
                <SelectItem value="incidents">{isAr ? "الحوادث" : "Incidents"}</SelectItem>
                <SelectItem value="permits">{isAr ? "تصاريح PTW" : "Permits (PTW)"}</SelectItem>
                <SelectItem value="loto">{isAr ? "عزل LOTO" : "LOTO"}</SelectItem>
                <SelectItem value="assets">{isAr ? "الأصول" : "Assets"}</SelectItem>
                <SelectItem value="files">{isAr ? "المستندات" : "Documents"}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="h-8 w-32 text-xs rounded-lg">
                <SelectValue placeholder={isAr ? "مستوى الخطورة" : "Severity"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "كل المستويات" : "All Severities"}</SelectItem>
                <SelectItem value="low">{isAr ? "منخفض Low" : "Low"}</SelectItem>
                <SelectItem value="medium">{isAr ? "متوسط Medium" : "Medium"}</SelectItem>
                <SelectItem value="high">{isAr ? "عالي High" : "High"}</SelectItem>
                <SelectItem value="critical">{isAr ? "حرج Critical" : "Critical"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{isAr ? "الترتيب:" : "Sort:"}</span>
            </div>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-8 w-32 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{isAr ? "الأحدث أولاً" : "Newest First"}</SelectItem>
                <SelectItem value="oldest">{isAr ? "الأقدم أولاً" : "Oldest First"}</SelectItem>
                <SelectItem value="title">{isAr ? "الأبجدي A-Z" : "Title A-Z"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-1.5">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Search className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm font-medium">{isAr ? "لم يتم العثور على نتائج طابقة" : "No matching records found"}</p>
              <p className="text-xs text-muted-foreground/70">
                {isAr ? "جرب البحث بكلمات أخرى أو تغيير خيارات التصفية" : "Try searching with different keywords or clearing filters"}
              </p>
            </div>
          ) : (
            filteredResults.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item.href)}
                  className="p-2.5 rounded-xl border border-border/40 hover:border-primary/40 bg-card hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.badgeColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${item.badgeColor}`}>
                          {isAr ? item.moduleLabelAr : item.moduleLabel}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                    <div className="hidden sm:flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3 w-3" />
                      <span>{item.date}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-muted/20 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            {isAr ? `إجمالي النتائج: ${filteredResults.length} عنصر` : `Found ${filteredResults.length} items`}
          </span>
          <span>
            {isAr ? "اضغط على العنصر للانتقال الفوري" : "Click item to navigate directly"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
