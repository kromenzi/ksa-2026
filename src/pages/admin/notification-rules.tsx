import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BellRing, Plus, Trash2, Edit3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface NotificationRule {
  id: string;
  name: string;
  eventType: "Near Miss" | "Incident" | "Compliance Alert" | "Vision AI Violation" | "Permit Expiry" | "Audit Finding";
  channel: "Email" | "SMS" | "WhatsApp" | "Push Notification" | "Siren / Audio Alert" | "All Channels";
  severity: "Low" | "Medium" | "High" | "Critical";
  recipients: string;
  active: boolean;
}

const DEFAULT_RULES: NotificationRule[] = [
  {
    id: "NR-001",
    name: "Critical Safety Incident Instant Escalation",
    eventType: "Incident",
    channel: "All Channels",
    severity: "Critical",
    recipients: "HSE Director, Plant Manager, Emergency Response Team",
    active: true
  },
  {
    id: "NR-002",
    name: "Vision AI PPE Violation Alert",
    eventType: "Vision AI Violation",
    channel: "Push Notification",
    severity: "High",
    recipients: "Zone Supervisors, Safety Officers",
    active: true
  },
  {
    id: "NR-003",
    name: "Compliance Obligation Warning",
    eventType: "Compliance Alert",
    channel: "Email",
    severity: "Medium",
    recipients: "Compliance Manager, Quality Lead",
    active: true
  },
  {
    id: "NR-004",
    name: "Permit to Work Expiry Notice",
    eventType: "Permit Expiry",
    channel: "SMS",
    severity: "Low",
    recipients: "Permit Issuer, Maintenance Supervisor",
    active: false
  }
];

export default function AdminNotificationRules() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [rules, setRules] = useState<NotificationRule[]>(() => {
    const saved = localStorage.getItem("safety_board_notification_rules_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return DEFAULT_RULES;
  });

  useEffect(() => {
    localStorage.setItem("safety_board_notification_rules_v1", JSON.stringify(rules));
  }, [rules]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEventType, setFormEventType] = useState<NotificationRule["eventType"]>("Incident");
  const [formChannel, setFormChannel] = useState<NotificationRule["channel"]>("Email");
  const [formSeverity, setFormSeverity] = useState<NotificationRule["severity"]>("High");
  const [formRecipients, setFormRecipients] = useState("");

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormName("");
    setFormEventType("Incident");
    setFormChannel("Email");
    setFormSeverity("High");
    setFormRecipients("Safety Officers");
    setIsAddOpen(true);
  };

  const handleOpenEdit = (rule: NotificationRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormEventType(rule.eventType);
    setFormChannel(rule.channel);
    setFormSeverity(rule.severity);
    setFormRecipients(rule.recipients);
    setIsAddOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      toast.error(isAr ? "يرجى إدخال اسم القاعدة" : "Please enter rule name");
      return;
    }

    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? {
        ...r,
        name: formName,
        eventType: formEventType,
        channel: formChannel,
        severity: formSeverity,
        recipients: formRecipients
      } : r));
      toast.success(isAr ? "تم تحديث قاعدة الإشعارات بنجاح" : "Notification rule updated successfully");
    } else {
      const newRule: NotificationRule = {
        id: `NR-${Math.floor(100 + Math.random() * 900)}`,
        name: formName,
        eventType: formEventType,
        channel: formChannel,
        severity: formSeverity,
        recipients: formRecipients,
        active: true
      };
      setRules([newRule, ...rules]);
      toast.success(isAr ? "تمت إضافة قاعدة الإشعارات بنجاح" : "Notification rule added successfully");
    }

    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    toast.success(isAr ? "تم حذف القاعدة بنجاح" : "Rule deleted successfully");
  };

  const handleToggleActive = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
    toast.success(isAr ? "تم تغيير حالة القاعدة" : "Rule status toggled");
  };

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.recipients.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.eventType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6 text-yellow-500" />
            {isAr ? "قواعد الإشعارات والإنذار الفوري" : "Notification & Instant Alert Rules"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "تكوين شروط التنبيه، قنوات الإرسال (بريد، رسائل، واتساب، صافرات إنذار) والمستلمين" : "Configure alert triggers, channels (Email, SMS, WhatsApp, Siren) and recipients"}
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4" />
          {isAr ? "قاعدة جديدة" : "New Rule"}
        </Button>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={isAr ? "بحث في قواعد الإشعارات..." : "Search notification rules..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 rtl:pr-9 rtl:pl-3 rounded-2xl"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {isAr ? 'إجمالي القواعد النشطة:' : 'Active rules:'} <span className="font-bold text-foreground">{rules.filter(r => r.active).length} / {rules.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredRules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellRing className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد قواعد إشعارات مطابقة" : "No matching notification rules found"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => (
                <div key={rule.id} className="p-5 rounded-3xl border border-border/60 bg-card hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                        <h3 className="font-bold text-base text-foreground mt-0.5">{rule.name}</h3>
                      </div>
                      <Switch 
                        checked={rule.active} 
                        onCheckedChange={() => handleToggleActive(rule.id)} 
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                        {rule.eventType}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                        {rule.channel}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${
                        rule.severity === 'Critical' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                        rule.severity === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                      }`}>
                        {rule.severity} Severity
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{isAr ? 'المستلمون:' : 'Recipients:'}</span> {rule.recipients}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleOpenEdit(rule)}>
                        <Edit3 className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-700" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingRule ? (isAr ? 'تعديل قاعدة الإشعارات' : 'Edit Notification Rule') : (isAr ? 'إنشاء قاعدة إشعارات جديدة' : 'Create New Notification Rule')}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'حدد نوع الحدث وقناة الإرسال ومستوى الخطورة ومجموعة المستلمين' : 'Specify event type, dispatch channel, severity threshold, and recipient group'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{isAr ? 'اسم القاعدة' : 'Rule Name'}</Label>
              <Input 
                required
                placeholder="e.g. Critical Safety Alert Dispatch"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'نوع الحدث' : 'Event Type'}</Label>
                <Select value={formEventType} onValueChange={(val: any) => setFormEventType(val)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Incident">Incident</SelectItem>
                    <SelectItem value="Near Miss">Near Miss</SelectItem>
                    <SelectItem value="Vision AI Violation">Vision AI Violation</SelectItem>
                    <SelectItem value="Compliance Alert">Compliance Alert</SelectItem>
                    <SelectItem value="Permit Expiry">Permit Expiry</SelectItem>
                    <SelectItem value="Audit Finding">Audit Finding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'قناة الإرسال' : 'Channel'}</Label>
                <Select value={formChannel} onValueChange={(val: any) => setFormChannel(val)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Push Notification">Push Notification</SelectItem>
                    <SelectItem value="Siren / Audio Alert">Siren / Audio Alert</SelectItem>
                    <SelectItem value="All Channels">All Channels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'مستوى الخطورة' : 'Severity Threshold'}</Label>
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
              <div className="space-y-2">
                <Label>{isAr ? 'المستلمون' : 'Recipients / Teams'}</Label>
                <Input 
                  required
                  placeholder="e.g. HSE Director, Plant Manager"
                  value={formRecipients}
                  onChange={e => setFormRecipients(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-2xl">
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
