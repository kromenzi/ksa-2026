import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  FireEquipmentItem,
  FireInspectionRecord,
  FirePumpTestRecord,
  FireAlarmZone,
  FireMaintenanceWorkOrder,
  FireAlertItem,
  FireProtectionSettings,
} from "@/types/fire-protection";

const STORAGE_KEY_SETTINGS = "safety_board_fire_settings_v1";

const DEFAULT_SETTINGS: FireProtectionSettings = {
  defaultInspectionIntervalDays: 30,
  defaultMaintenanceIntervalDays: 180,
  autoGenerateAlerts: true,
  checklistTemplates: [
    { id: "chk-1", label: "Pressure gauge in operable range (Green zone)", labelAr: "مؤشر الضغط في النطاق الأخضر" },
    { id: "chk-2", label: "Pin and tamper seal intact", labelAr: "مسمار الأمان والختم سليمان" },
    { id: "chk-3", label: "No physical damage, corrosion, or leakage", labelAr: "خلو الجسم من التلف أو الصدأ أو التسريب" },
    { id: "chk-4", label: "Hose and nozzle clear of blockage", labelAr: "الخرطوم والفوهة خاليان من الانسداد" },
    { id: "chk-5", label: "Access to extinguisher unobstructed", labelAr: "مكان الطفاية واضح وسهل الوصول إليه" },
  ],
};

async function fetchRows(path: string): Promise<any[]> {
  const response = await apiRequest("GET", path);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

const mapEquipment = (row: any): FireEquipmentItem => ({
  id: String(row.id || ""),
  equipmentId: String(row.equipmentId || ""),
  serialNumber: String(row.serialNumber || ""),
  qrCode: String(row.qrCode || ""),
  category: (row.category || "extinguisher") as FireEquipmentItem["category"],
  type: (row.type || "powder") as FireEquipmentItem["type"],
  manufacturer: String(row.manufacturer || ""),
  model: String(row.model || ""),
  capacity: row.capacity ? String(row.capacity) : undefined,
  location: String(row.location || ""),
  department: String(row.department || ""),
  building: String(row.building || ""),
  installationDate: row.installationDate ? String(row.installationDate) : undefined,
  expiryDate: row.expiryDate ? String(row.expiryDate) : undefined,
  lastInspectionDate: row.lastInspectionDate ? String(row.lastInspectionDate) : undefined,
  nextInspectionDate: row.nextInspectionDate ? String(row.nextInspectionDate) : undefined,
  status: (row.status || "good") as FireEquipmentItem["status"],
  notes: row.notes ? String(row.notes) : undefined,
  createdBy: String(row.createdBy || ""),
});

const mapInspection = (row: any): FireInspectionRecord => ({
  id: String(row.id || ""),
  equipmentId: String(row.equipmentId || ""),
  equipmentRef: String(row.equipmentRef || ""),
  equipmentName: String(row.equipmentName || ""),
  inspectorName: String(row.inspectorName || ""),
  inspectorId: String(row.inspectorId || ""),
  date: String(row.date || ""),
  time: String(row.time || ""),
  overallResult: (row.overallResult || "pass") as FireInspectionRecord["overallResult"],
  checklist: Array.isArray(row.checklist) ? row.checklist : [],
  notes: row.notes ? String(row.notes) : undefined,
});

const mapPumpTest = (row: any): FirePumpTestRecord => ({
  id: String(row.id || ""),
  pumpId: String(row.pumpId || ""),
  pumpName: String(row.pumpName || ""),
  date: String(row.date || ""),
  suctionPressure: String(row.suctionPressure || ""),
  dischargePressure: String(row.dischargePressure || ""),
  flowRate: String(row.flowRate || ""),
  rpm: Number(row.rpm || 0),
  oilPressure: String(row.oilPressure || ""),
  temperature: String(row.temperature || ""),
  status: (row.status || "pass") as FirePumpTestRecord["status"],
  notes: row.notes ? String(row.notes) : undefined,
});

const mapZone = (row: any): FireAlarmZone => ({
  id: String(row.id || ""),
  zoneCode: String(row.zoneCode || ""),
  zoneName: String(row.zoneName || ""),
  building: String(row.building || ""),
  area: String(row.area || ""),
  devicesCount: Number(row.devicesCount || 0),
  status: (row.status || "normal") as FireAlarmZone["status"],
});

const mapMaintenance = (row: any): FireMaintenanceWorkOrder => ({
  id: String(row.id || ""),
  woNumber: String(row.woNumber || ""),
  equipmentId: String(row.equipmentId || ""),
  equipmentName: String(row.equipmentName || ""),
  type: (row.type || "preventive") as FireMaintenanceWorkOrder["type"],
  priority: (row.priority || "medium") as FireMaintenanceWorkOrder["priority"],
  status: (row.status || "open") as FireMaintenanceWorkOrder["status"],
  assignedTo: String(row.assignedTo || ""),
  problemDescription: String(row.problemDescription || ""),
  scheduledDate: String(row.scheduledDate || ""),
  completedDate: row.completedDate ? String(row.completedDate) : undefined,
});

const mapAlert = (row: any): FireAlertItem => ({
  id: String(row.id || ""),
  type: (row.type || "inspection_due") as FireAlertItem["type"],
  title: String(row.title || ""),
  titleAr: String(row.titleAr || ""),
  message: String(row.message || ""),
  messageAr: String(row.messageAr || ""),
  equipmentRef: row.equipmentRef ? String(row.equipmentRef) : undefined,
  date: String(row.date || ""),
  isRead: Boolean(row.isRead),
});

export function useFireProtectionStore() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FireProtectionSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const { data: equipment = [] } = useQuery<FireEquipmentItem[]>({
    queryKey: ["/api/fire-equipment"],
    queryFn: async () => (await fetchRows("/api/fire-equipment")).map(mapEquipment),
    staleTime: 0,
  });
  const { data: inspections = [] } = useQuery<FireInspectionRecord[]>({
    queryKey: ["/api/fire-inspections"],
    queryFn: async () => (await fetchRows("/api/fire-inspections")).map(mapInspection),
    staleTime: 0,
  });
  const { data: pumpTests = [] } = useQuery<FirePumpTestRecord[]>({
    queryKey: ["/api/fire-pump-tests"],
    queryFn: async () => (await fetchRows("/api/fire-pump-tests")).map(mapPumpTest),
    staleTime: 0,
  });
  const { data: zones = [] } = useQuery<FireAlarmZone[]>({
    queryKey: ["/api/fire-alarm-zones"],
    queryFn: async () => (await fetchRows("/api/fire-alarm-zones")).map(mapZone),
    staleTime: 0,
  });
  const { data: maintenance = [] } = useQuery<FireMaintenanceWorkOrder[]>({
    queryKey: ["/api/fire-maintenance-orders"],
    queryFn: async () => (await fetchRows("/api/fire-maintenance-orders")).map(mapMaintenance),
    staleTime: 0,
  });
  const { data: alerts = [] } = useQuery<FireAlertItem[]>({
    queryKey: ["/api/fire-alerts"],
    queryFn: async () => (await fetchRows("/api/fire-alerts")).map(mapAlert),
    staleTime: 0,
  });

  const refresh = async (path: string) => {
    await queryClient.invalidateQueries({ queryKey: [path] });
    await queryClient.refetchQueries({ queryKey: [path], type: "active" });
  };

  const addEquipment = async (item: Omit<FireEquipmentItem, "id">) => {
    await apiRequest("POST", "/api/fire-equipment", item);
    await refresh("/api/fire-equipment");
  };

  const deleteEquipment = async (id: string) => {
    await apiRequest("DELETE", `/api/fire-equipment/${encodeURIComponent(id)}`);
    await refresh("/api/fire-equipment");
  };

  const addInspection = async (record: Omit<FireInspectionRecord, "id">) => {
    await apiRequest("POST", "/api/fire-inspections", record);
    await apiRequest("PATCH", `/api/fire-equipment/${encodeURIComponent(record.equipmentId)}`, {
      lastInspectionDate: record.date,
      status: record.overallResult === "pass" ? "good" : "damaged",
    });
    await Promise.all([refresh("/api/fire-inspections"), refresh("/api/fire-equipment")]);
  };

  const deleteInspection = async (id: string) => {
    await apiRequest("DELETE", `/api/fire-inspections/${encodeURIComponent(id)}`);
    await refresh("/api/fire-inspections");
  };
  const deletePumpTest = async (id: string) => {
    await apiRequest("DELETE", `/api/fire-pump-tests/${encodeURIComponent(id)}`);
    await refresh("/api/fire-pump-tests");
  };
  const deleteZone = async (id: string) => {
    await apiRequest("DELETE", `/api/fire-alarm-zones/${encodeURIComponent(id)}`);
    await refresh("/api/fire-alarm-zones");
  };
  const deleteMaintenance = async (id: string) => {
    await apiRequest("DELETE", `/api/fire-maintenance-orders/${encodeURIComponent(id)}`);
    await refresh("/api/fire-maintenance-orders");
  };
  const deleteAlert = async (id: string) => {
    await apiRequest("DELETE", `/api/fire-alerts/${encodeURIComponent(id)}`);
    await refresh("/api/fire-alerts");
  };

  const dismissAlert = async (id: string) => {
    await apiRequest("PATCH", `/api/fire-alerts/${encodeURIComponent(id)}`, { isRead: true });
    await refresh("/api/fire-alerts");
  };

  const updateSettings = (newSettings: FireProtectionSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch {
      // Settings remain available in memory if browser storage is unavailable.
    }
  };

  return {
    equipment,
    inspections,
    pumpTests,
    zones,
    maintenance,
    alerts,
    settings,
    addEquipment,
    deleteEquipment,
    addInspection,
    deleteInspection,
    deletePumpTest,
    deleteZone,
    deleteMaintenance,
    deleteAlert,
    dismissAlert,
    updateSettings,
  };
}
