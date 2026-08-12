import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Mail } from "lucide-react";

export default function AdminInbox() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Inbox className="h-6 w-6 text-fuchsia-500" />
          {isAr ? "صندوق الوارد" : "Inbox"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isAr ? "رسائل البريد الوارد" : "Incoming mail messages"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "الرسائل" : "Messages"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>{isAr ? "صندوق الوارد فارغ" : "Inbox is empty"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
