import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Calendar } from "lucide-react";

export default function AdminActivityLogs() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-slate-400" />
          {isAr ? "سجل النشاط" : "Activity Log"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isAr ? "تتبع نشاطات المستخدمين" : "Track user activities"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isAr ? "الأنشطة الأخيرة" : "Recent Activities"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>{isAr ? "لا توجد أنشطة مسجلة" : "No activities recorded"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
