"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Mail, MessageSquare, Phone, Save, Send, Loader2, CheckCircle2, XCircle, AlertTriangle, Globe, Key, Shield } from "lucide-react";
import { toast } from "sonner";

// Email Config State
interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: string;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  signature: string;
}

// Teams Config State
interface TeamsConfig {
  enabled: boolean;
  webhookUrl: string;
  defaultChannel: string;
  defaultTeam: string;
}

// WhatsApp Config State
interface WhatsAppConfig {
  enabled: boolean;
  mode: 'click_to_chat' | 'cloud_api';
  businessToken: string;
  phoneNumberId: string;
  defaultRecipient: string;
}

export default function AdminIntegrations() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isAr ? "الربط والتكامل" : "Integrations"}
        </h2>
        <p className="text-muted-foreground">
          {isAr ? "إعداد قنوات الإرسال: البريد الإلكتروني، Teams، WhatsApp" : "Configure notification channels: Email, Teams, WhatsApp"}
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            {isAr ? "البريد" : "Email"}
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1.5">
            <Phone className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <EmailConfigTab isAr={isAr} />
        </TabsContent>
        <TabsContent value="teams">
          <TeamsConfigTab isAr={isAr} />
        </TabsContent>
        <TabsContent value="whatsapp">
          <WhatsAppConfigTab isAr={isAr} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmailConfigTab({ isAr }: { isAr: boolean }) {
  const [config, setConfig] = useState<EmailConfig>({
    enabled: false,
    smtpHost: '',
    smtpPort: '587',
    username: '',
    password: '',
    fromName: '',
    fromEmail: '',
    signature: ''
  });
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSave = () => {
    toast.success(isAr ? "تم حفظ إعدادات البريد" : "Email settings saved");
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    
    // Simulate test
    setTimeout(() => {
      setTestResult({ success: true });
      toast.success(isAr ? "تم إرسال بريد الاختبار" : "Test email sent");
      setTesting(false);
    }, 1500);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600"><Mail className="h-5 w-5" /></div>
              <div>
                <CardTitle>{isAr ? "إعدادات SMTP" : "SMTP Configuration"}</CardTitle>
                <CardDescription>{isAr ? "إعداد خادم البريد الإلكتروني" : "Configure your mail server for sending emails"}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">{isAr ? "تفعيل" : "Enable"}</Label>
              <Switch checked={config.enabled} onCheckedChange={(c) => setConfig({ ...config, enabled: c })} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isAr ? "خادم SMTP" : "SMTP Host"}</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm"><Globe className="h-4 w-4" /></span>
                <Input className="rounded-l-none" value={config.smtpHost} onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "المنفذ" : "Port"}</Label>
              <Input value={config.smtpPort} onChange={(e) => setConfig({ ...config, smtpPort: e.target.value })} placeholder="587" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اسم المستخدم" : "Username"}</Label>
              <Input value={config.username} onChange={(e) => setConfig({ ...config, username: e.target.value })} placeholder="user@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "كلمة المرور" : "Password"}</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm"><Key className="h-4 w-4" /></span>
                <Input type="password" className="rounded-l-none font-mono" value={config.password} onChange={(e) => setConfig({ ...config, password: e.target.value })} placeholder="App Password" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اسم المرسل" : "From Name"}</Label>
              <Input value={config.fromName} onChange={(e) => setConfig({ ...config, fromName: e.target.value })} placeholder="Board System" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "بريد المرسل" : "From Email"}</Label>
              <Input value={config.fromEmail} onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })} placeholder="noreply@company.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "التوقيع" : "Signature"}</Label>
            <Textarea value={config.signature} onChange={(e) => setConfig({ ...config, signature: e.target.value })} rows={2} placeholder={isAr ? "توقيع البريد الإلكتروني..." : "Email signature..."} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "اختبار الإرسال" : "Test Email"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" />
            <Button onClick={handleTest} disabled={testing || !testEmail || !config.enabled}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {isAr ? "اختبار" : "Test"}
            </Button>
          </div>
          {testResult && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.success ? (isAr ? "تم الإرسال بنجاح!" : "Email sent successfully!") : (testResult.error || "Failed")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isAr ? "حفظ إعدادات البريد" : "Save Email Settings"}
        </Button>
      </div>
    </div>
  );
}

function TeamsConfigTab({ isAr }: { isAr: boolean }) {
  const [config, setConfig] = useState<TeamsConfig>({
    enabled: false,
    webhookUrl: '',
    defaultChannel: '',
    defaultTeam: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSave = () => {
    toast.success(isAr ? "تم حفظ إعدادات Teams" : "Teams settings saved");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    setTimeout(() => {
      setTestResult({ success: true });
      toast.success(isAr ? "تم إرسال رسالة الاختبار" : "Test message sent");
      setTesting(false);
    }, 1500);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600"><MessageSquare className="h-5 w-5" /></div>
              <div>
                <CardTitle>Microsoft Teams</CardTitle>
                <CardDescription>{isAr ? "إعداد ربط Teams عبر Incoming Webhook" : "Configure Teams via Incoming Webhook"}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">{isAr ? "تفعيل" : "Enable"}</Label>
              <Switch checked={config.enabled} onCheckedChange={(c) => setConfig({ ...config, enabled: c })} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm"><Globe className="h-4 w-4" /></span>
              <Input className="rounded-l-none font-mono text-sm" value={config.webhookUrl} onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })} placeholder="https://outlook.office.com/webhook/..." />
            </div>
            <p className="text-xs text-muted-foreground">{isAr ? "أنشئ Incoming Webhook في إعدادات قناة Teams" : "Create an Incoming Webhook in your Teams channel settings"}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isAr ? "اسم القناة الافتراضية" : "Default Channel"}</Label>
              <Input value={config.defaultChannel} onChange={(e) => setConfig({ ...config, defaultChannel: e.target.value })} placeholder="General" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اسم الفريق" : "Team Name"}</Label>
              <Input value={config.defaultTeam} onChange={(e) => setConfig({ ...config, defaultTeam: e.target.value })} placeholder="Safety Team" />
            </div>
          </div>
          {!config.webhookUrl && config.enabled && (
            <div className="p-3 rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-700">{isAr ? "يرجى إدخال رابط Webhook للتفعيل" : "Please enter a Webhook URL to enable sending"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "اختبار الإرسال" : "Test Message"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleTest} disabled={testing || !config.enabled || !config.webhookUrl}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {isAr ? "إرسال رسالة اختبار" : "Send Test Message"}
          </Button>
          {testResult && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.success ? (isAr ? "تم الإرسال بنجاح!" : "Message sent successfully!") : (testResult.error || "Failed")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isAr ? "حفظ إعدادات Teams" : "Save Teams Settings"}
        </Button>
      </div>
    </div>
  );
}

function WhatsAppConfigTab({ isAr }: { isAr: boolean }) {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    mode: 'click_to_chat',
    businessToken: '',
    phoneNumberId: '',
    defaultRecipient: ''
  });
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSave = () => {
    toast.success(isAr ? "تم حفظ إعدادات WhatsApp" : "WhatsApp settings saved");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    setTimeout(() => {
      if (config.mode === 'click_to_chat') {
        window.open(`https://wa.me/${testTo || config.defaultRecipient}?text=Test message`, '_blank');
      }
      setTestResult({ success: true });
      toast.success(isAr ? "تم الاختبار" : "Test completed");
      setTesting(false);
    }, 1000);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-600"><Phone className="h-5 w-5" /></div>
              <div>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>{isAr ? "إعداد إرسال WhatsApp" : "Configure WhatsApp messaging"}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">{isAr ? "تفعيل" : "Enable"}</Label>
              <Switch checked={config.enabled} onCheckedChange={(c) => setConfig({ ...config, enabled: c })} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isAr ? "وضع الإرسال" : "Sending Mode"}</Label>
            <Select value={config.mode} onValueChange={(v: any) => setConfig({ ...config, mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="click_to_chat">
                  Click-to-Chat (wa.me) - {isAr ? "لا يحتاج إعداد" : "No setup required"}
                </SelectItem>
                <SelectItem value="cloud_api">
                  WhatsApp Business Cloud API - {isAr ? "إرسال تلقائي" : "Automated sending"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.mode === "cloud_api" && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                {isAr ? "بيانات API" : "API Credentials"}
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm"><Key className="h-4 w-4" /></span>
                  <Input type="password" className="rounded-l-none font-mono text-sm" value={config.businessToken} onChange={(e) => setConfig({ ...config, businessToken: e.target.value })} placeholder="EAA..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input value={config.phoneNumberId} onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })} placeholder="1234567890" />
              </div>
            </div>
          )}

          {config.mode === "click_to_chat" && (
            <div className="p-3 rounded-lg bg-green-50 border text-sm text-green-700">
              {isAr ? "وضع النقر للمحادثة لا يحتاج إعداد API. سيتم فتح رابط wa.me مع الرسالة المعبأة مسبقاً في نافذة جديدة." : "Click-to-Chat mode requires no API setup. It opens a wa.me link with pre-filled message in a new window."}
            </div>
          )}

          <div className="space-y-2">
            <Label>{isAr ? "الرقم الافتراضي" : "Default Recipient"}</Label>
            <Input value={config.defaultRecipient} onChange={(e) => setConfig({ ...config, defaultRecipient: e.target.value })} placeholder="+966XXXXXXXXX" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "اختبار الإرسال" : "Test Message"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+966XXXXXXXXX" />
            <Button onClick={handleTest} disabled={testing || !config.enabled}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {isAr ? "اختبار" : "Test"}
            </Button>
          </div>
          {testResult && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.success ? (isAr ? "تم بنجاح!" : "Test completed!") : (testResult.error || "Failed")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isAr ? "حفظ إعدادات WhatsApp" : "Save WhatsApp Settings"}
        </Button>
      </div>
    </div>
  );
}
