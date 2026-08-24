import { AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useData } from "@/lib/data-context";

export default function ViolationsQuickLink() {
  const [location] = useLocation();
  const { settings } = useData();
  if (location === "/admin/violations") return null;
  const isAr = settings.language === "ar";
  return (
    <Link
      href="/admin/violations"
      className="fixed bottom-5 right-5 z-40 hidden md:flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur hover:bg-muted"
      title={isAr ? "المخالفات والمتابعة" : "Violations & Follow Up"}
    >
      <AlertTriangle className="h-4 w-4 text-red-500" />
      {isAr ? "المخالفات" : "Violations"}
    </Link>
  );
}
