import type { Action, Module } from "@/lib/data-context";

export type RouteRequirement = { module: Module; action: Action };

const PREFIX_REQUIREMENTS: Array<[string, RouteRequirement]> = [
  ["/admin/users", { module: "users", action: "read" }],
  ["/admin/activity", { module: "activity", action: "read" }],
  ["/admin/settings", { module: "settings", action: "read" }],
  ["/admin/system-readiness", { module: "settings", action: "read" }],
  ["/admin/integrations", { module: "settings", action: "read" }],
  ["/admin/email-settings", { module: "settings", action: "read" }],
  ["/admin/inbound-", { module: "settings", action: "read" }],
  ["/admin/notification-rules", { module: "settings", action: "read" }],
  ["/admin/plants", { module: "settings", action: "read" }],

  ["/admin/employees", { module: "employees", action: "read" }],
  ["/admin/hse-team", { module: "employees", action: "read" }],
  ["/admin/employee-violations", { module: "violations", action: "read" }],

  ["/admin/files", { module: "documents", action: "read" }],
  ["/admin/contracts", { module: "documents", action: "read" }],
  ["/admin/invoices", { module: "documents", action: "read" }],

  ["/admin/ncr", { module: "ncr", action: "read" }],

  ["/admin/posts", { module: "content", action: "read" }],
  ["/admin/sections", { module: "content", action: "read" }],
  ["/admin/forms", { module: "content", action: "read" }],
  ["/admin/gamification", { module: "content", action: "read" }],
  ["/admin/live-meeting", { module: "content", action: "read" }],

  ["/admin/assets", { module: "assets", action: "read" }],
  ["/admin/visitors", { module: "assets", action: "read" }],
  ["/admin/emergency", { module: "assets", action: "read" }],

  ["/admin/", { module: "reports", action: "read" }],
];

export function routeRequirement(path: string): RouteRequirement | null {
  const normalized = String(path || "").split("?")[0];
  const entry = PREFIX_REQUIREMENTS.find(([prefix]) => normalized.startsWith(prefix));
  return entry?.[1] || null;
}
