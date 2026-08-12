import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerCog, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminEmailSettings() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ServerCog className="h-6 w-6 text-rose-500" />
          {isAr ? "إعدادات البريد" : "Email Settings"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isAr ? "إعدادات خادم البريد الإلكتروني" : "Email server configuration"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "إعدادات SMTP" : "SMTP Settings"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isAr ? "خادم SMTP" : "SMTP Host"}</Label>
              <Input placeholder="smtp.example.com" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "المنفذ" : "Port"}</Label>
              <Input placeholder="587" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "اسم المستخدم" : "Username"}</Label>
            <Input placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "كلمة المرور" : "Password"}</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "البريد المرسل" : "From Email"}</Label>
            <Input placeholder="noreply@example.com" />
          </div>
          <div className="flex items-center justify-between">
            <Label>{isAr ? "تفعيل الإرسال" : "Enable Sending"}</Label>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          {isAr ? "حفظ الإعدادات" : "Save Settings"}
        </Button>
        <Button variant="outline" className="gap-2">
          <Send className="h-4 w-4" />
          {isAr ? "إرسال اختبار" : "Send Test"}
        </Button>
      </div>
    </div>
  );
}
