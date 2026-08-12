import { useState } from "react";
import { useData, type Employee } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Send, Plus, Trash2, Users, Building, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AdminEmailSettings() {
  const {
    emailConfig, settings, hasPermission,
    updateEmailConfig, sendTestEmail,
    departments, employees, routingRules,
    addDepartment, deleteDepartment,
    addEmployee, deleteEmployee,
    addRoutingRule, deleteRoutingRule
  } = useData();

  const [formData, setFormData] = useState(emailConfig);
  const [testEmail, setTestEmail] = useState("");

  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", code: "" });

  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({ name: "", email: "", title: "", departmentId: "", isPrimary: false });

  const { toast } = useToast();
  const canEdit = hasPermission('settings', 'update');

  const handleSaveServer = () => {
    updateEmailConfig(formData);
  };

  const handleTest = () => {
    if (testEmail) { sendTestEmail(testEmail); }
    else { toast({ title: "Required", description: "Please enter an email address.", variant: "destructive" }); }
  };

  const submitDepartment = () => {
    if (!newDept.name || !newDept.code) return;
    addDepartment(newDept);
    setIsDeptDialogOpen(false);
    setNewDept({ name: "", code: "" });
  };

  const submitEmployee = () => {
    if (!newEmp.name || !newEmp.email || !newEmp.departmentId) {
      toast({ title: "Validation Error", description: "Name, Email and Department are required", variant: "destructive" });
      return;
    }
    addEmployee(newEmp);
    setIsEmpDialogOpen(false);
    setNewEmp({ name: "", email: "", title: "", departmentId: "", isPrimary: false });
  };

  if (!hasPermission('settings', 'read')) return <div>Access Denied</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {settings.language === 'ar' ? 'إدارة البريد والتوجيه' : 'Email & Routing'}
        </h2>
        <p className="text-muted-foreground">
          {settings.language === 'ar' ? 'إدارة الأقسام، الموظفين، وقواعد إرسال الإشعارات.' : 'Manage departments, employees, and notification routing rules.'}
        </p>
      </div>

      <Tabs defaultValue="routing" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="routing">{settings.language === 'ar' ? 'الأقسام والموظفين' : 'Departments & Staff'}</TabsTrigger>
          <TabsTrigger value="rules">{settings.language === 'ar' ? 'قواعد التوجيه' : 'Routing Rules'}</TabsTrigger>
          <TabsTrigger value="server">{settings.language === 'ar' ? 'خادم SMTP' : 'Server Config'}</TabsTrigger>
        </TabsList>

        <TabsContent value="routing" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>{settings.language === 'ar' ? 'الأقسام' : 'Departments'}</CardTitle>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => setIsDeptDialogOpen(true)} data-testid="button-add-dept">
                  <Plus className="h-4 w-4 mr-2" />
                  {settings.language === 'ar' ? 'إضافة قسم' : 'Add Dept'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {departments.map(dept => (
                  <div key={dept.id} className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md border text-sm" data-testid={`dept-item-${dept.id}`}>
                    <span className="font-semibold text-primary">{dept.code}</span>
                    <span>{dept.name}</span>
                    {canEdit && (
                      <button onClick={() => deleteDepartment(dept.id)} className="text-destructive hover:text-red-700 ml-2" data-testid={`button-delete-dept-${dept.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>{settings.language === 'ar' ? 'قائمة الموظفين' : 'Employee List'}</CardTitle>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => setIsEmpDialogOpen(true)} data-testid="button-add-employee">
                  <Plus className="h-4 w-4 mr-2" />
                  {settings.language === 'ar' ? 'إضافة موظف' : 'Add Employee'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{settings.language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{settings.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                    <TableHead>{settings.language === 'ar' ? 'المسمى الوظيفي' : 'Title'}</TableHead>
                    <TableHead>{settings.language === 'ar' ? 'القسم' : 'Department'}</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const dept = departments.find(d => d.id === emp.departmentId);
                    return (
                      <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                        <TableCell className="font-medium">
                          {emp.name}
                          {emp.isPrimary && <Badge variant="secondary" className="ml-2 text-[10px]">Primary</Badge>}
                        </TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>{emp.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{dept?.name || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEmployee(emp.id)} data-testid={`button-delete-employee-${emp.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle>{settings.language === 'ar' ? 'قواعد التوجيه' : 'Routing Rules'}</CardTitle>
              </div>
              <CardDescription>
                {settings.language === 'ar' ? 'تحديد من يستلم الإشعارات بناءً على القسم أو حدة المشكلة.' : 'Define notification recipients based on department or severity.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{settings.language === 'ar' ? 'الشرط' : 'Condition'}</TableHead>
                    <TableHead>{settings.language === 'ar' ? 'المستلمين' : 'Recipients'}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routingRules.map(rule => {
                    const dept = departments.find(d => d.id === rule.departmentId);
                    return (
                      <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                        <TableCell>
                          {rule.departmentId && <Badge className="mr-2">Dept: {dept?.name}</Badge>}
                          {rule.severity && <Badge variant="destructive" className="capitalize">Severity: {rule.severity}</Badge>}
                          {!rule.departmentId && !rule.severity && <Badge variant="secondary">Global Rule</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(rule.recipientIds || []).map(eid => {
                              const emp = employees.find(e => e.id === eid);
                              return emp ? (
                                <span key={eid} className="text-xs bg-muted px-2 py-1 rounded border">{emp.name}</span>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRoutingRule(rule.id)} data-testid={`button-delete-rule-${rule.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {canEdit && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/10">
                  <p className="text-sm text-muted-foreground mb-4">Add New Rule:</p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Filter by Dept</Label>
                      <Select onValueChange={(v) => addRoutingRule({ departmentId: v, recipientIds: [] })}>
                        <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Select Dept..." /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Filter by Severity</Label>
                      <Select onValueChange={(v: any) => addRoutingRule({ severity: v, recipientIds: [] })}>
                        <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Select Severity..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <CardTitle>{settings.language === 'ar' ? 'اتصال الخادم' : 'Server Connection'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input value={formData.smtpHost} onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })} disabled={!canEdit} data-testid="input-smtp-host" />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input value={formData.smtpPort} onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })} disabled={!canEdit} data-testid="input-smtp-port" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!canEdit} data-testid="input-smtp-username" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input value={formData.fromName} onChange={(e) => setFormData({ ...formData, fromName: e.target.value })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input value={formData.fromEmail} onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })} disabled={!canEdit} />
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
              <div className="flex gap-2 w-full max-w-sm">
                <Input placeholder="test@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} data-testid="input-test-email" />
                <Button variant="secondary" onClick={handleTest} data-testid="button-send-test">
                  <Send className="h-4 w-4 mr-2" />Test
                </Button>
              </div>
              <Button onClick={handleSaveServer} size="lg" data-testid="button-save-email-settings">Save Settings</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} placeholder="e.g. Operations" data-testid="input-dept-name" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value })} placeholder="e.g. OPS" data-testid="input-dept-code" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitDepartment} data-testid="button-submit-dept">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmpDialogOpen} onOpenChange={setIsEmpDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} data-testid="input-emp-name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newEmp.email} onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} data-testid="input-emp-email" />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input value={newEmp.title} onChange={(e) => setNewEmp({ ...newEmp, title: e.target.value })} placeholder="e.g. Manager" data-testid="input-emp-title" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={newEmp.departmentId} onValueChange={(v) => setNewEmp({ ...newEmp, departmentId: v })}>
                <SelectTrigger data-testid="select-emp-dept"><SelectValue placeholder="Select Dept" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="primary" checked={newEmp.isPrimary} onCheckedChange={(c) => setNewEmp({ ...newEmp, isPrimary: c })} />
              <Label htmlFor="primary">Is Primary Contact?</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitEmployee} data-testid="button-submit-employee">Save Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
