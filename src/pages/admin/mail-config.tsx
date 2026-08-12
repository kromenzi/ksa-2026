import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminMailConfig() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MailOpen className="h-6 w-6 text-purple-500" />
          {isAr ? "إعداد البريد" : "Mail Config"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isAr ? "إعدادات استقبال البريد" : "Incoming mail configuration"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "إعدادات IMAP" : "IMAP Settings"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isAr ? "خادم IMAP" : "IMAP Host"}</Label>
            <Input placeholder="imap.example.com" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "اسم المستخدم" : "Username"}</Label>
            <Input placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "كلمة المرور" : "Password"}</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
        </CardContent>
      </Card>

      <Button className="gap-2">
        <Save className="h-4 w-4" />
        {isAr ? "حفظ الإعدادات" : "Save Settings"}
      </Button>
    </div>
  );
}
