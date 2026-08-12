import { useState, useEffect } from "react";
import type { 
  FireEquipmentItem, 
  FireInspectionRecord, 
  FirePumpTestRecord, 
  FireAlarmZone, 
  FireMaintenanceWorkOrder, 
  FireAlertItem, 
  FireProtectionSettings 
} from "@/types/fire-protection";

const STORAGE_KEY_EQUIPMENT = "safety_board_fire_equipment_v1";
const STORAGE_KEY_INSPECTIONS = "safety_board_fire_inspections_v1";
const STORAGE_KEY_PUMP_TESTS = "safety_board_fire_pump_tests_v1";
const STORAGE_KEY_ZONES = "safety_board_fire_zones_v1";
const STORAGE_KEY_MAINTENANCE = "safety_board_fire_maintenance_v1";
const STORAGE_KEY_ALERTS = "safety_board_fire_alerts_v1";
const STORAGE_KEY_SETTINGS = "safety_board_fire_settings_v1";

const INITIAL_EQUIPMENT: FireEquipmentItem[] = [
  {
    id: "eq-1",
    equipmentId: "EXT-101",
    serialNumber: "SN-982341",
    qrCode: "QR-FIRE-EXT-101",
    category: "extinguisher",
    type: "powder",
    manufacturer: "Naffco",
    model: "ABC-6KG",
    capacity: "6 KG",
    location: "Zone 1 - Main Production Hall",
    department: "Production",
    building: "Building A",
    installationDate: "2024-01-15",
    expiryDate: "2027-01-15",
    lastInspectionDate: "2026-01-10",
    nextInspectionDate: "2026-03-10",
    status: "good",
    createdBy: "System"
  },
  {
    id: "eq-2",
    equipmentId: "EXT-102",
    serialNumber: "SN-982342",
    qrCode: "QR-FIRE-EXT-102",
    category: "extinguisher",
    type: "co2",
    manufacturer: "Minimax",
    model: "CO2-5KG",
    capacity: "5 KG",
    location: "Zone 2 - Electrical Control Room",
    department: "Maintenance",
    building: "Building A",
    installationDate: "2024-02-10",
    expiryDate: "2027-02-10",
    lastInspectionDate: "2025-12-05",
    nextInspectionDate: "2026-02-28",
    status: "inspection_due",
    createdBy: "System"
  },
  {
    id: "eq-3",
    equipmentId: "PUMP-01",
    serialNumber: "SMP-7712",
    qrCode: "QR-FIRE-PUMP-01",
    category: "pump",
    type: "diesel_pump",
    manufacturer: "Peerless Pump",
    model: "12X10-22F",
    capacity: "750 GPM @ 120 PSI",
    location: "Fire Pump House",
    department: "Facility Safety",
    building: "Utility Plant",
    installationDate: "2023-06-01",
    status: "good",
    createdBy: "System"
  },
  {
    id: "eq-4",
    equipmentId: "ALM-PANEL-01",
    serialNumber: "SIM-4008",
    qrCode: "QR-FIRE-ALM-01",
    category: "alarm_panel",
    type: "alarm_panel",
    manufacturer: "SimplexGrinnell",
    model: "4008 Fire Control",
    capacity: "200 Points",
    location: "Main Security Control Room",
    department: "Security",
    building: "Administration",
    installationDate: "2023-05-10",
    status: "good",
    createdBy: "System"
  }
];

const INITIAL_ZONES: FireAlarmZone[] = [
  { id: "z-1", zoneCode: "ZN-01", zoneName: "Production Hall North", building: "Building A", area: "Manufacturing", devicesCount: 34, status: "normal" },
  { id: "z-2", zoneCode: "ZN-02", zoneName: "Warehouse Sector B", building: "Building B", area: "Storage", devicesCount: 52, status: "normal" },
  { id: "z-3", zoneCode: "ZN-03", zoneName: "Administrative Offices", building: "Administration", area: "Offices", devicesCount: 28, status: "normal" }
];

const INITIAL_SETTINGS: FireProtectionSettings = {
  defaultInspectionIntervalDays: 30,
  defaultMaintenanceIntervalDays: 180,
  autoGenerateAlerts: true,
  checklistTemplates: [
    { id: "chk-1", label: "Pressure gauge in operable range (Green zone)", labelAr: "مؤشر الضغط في النطاق الأخضر" },
    { id: "chk-2", label: "Pin and tamper seal intact", labelAr: "مسمار الأمان والختم سليمان" },
    { id: "chk-3", label: "No physical damage, corrosion, or leakage", labelAr: "خلو الجسم من التلف أو الصدأ أو التسريب" },
    { id: "chk-4", label: "Hose and nozzle clear of blockage", labelAr: "الخرطوم والفوهة خاليان من الانسداد" },
    { id: "chk-5", label: "Access to extinguisher unobstructed", labelAr: "مكان الطفاية واضح وسهل الوصول إليه" }
  ]
};

export function useFireProtectionStore() {
  const [equipment, setEquipment] = useState<FireEquipmentItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EQUIPMENT);
    return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
  });

  const [inspections, setInspections] = useState<FireInspectionRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_INSPECTIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [pumpTests] = useState<FirePumpTestRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PUMP_TESTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [zones] = useState<FireAlarmZone[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ZONES);
    return saved ? JSON.parse(saved) : INITIAL_ZONES;
  });

  const [maintenance] = useState<FireMaintenanceWorkOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MAINTENANCE);
    return saved ? JSON.parse(saved) : [];
  });

  const [alerts, setAlerts] = useState<FireAlertItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ALERTS);
    return saved ? JSON.parse(saved) : [
      {
        id: "alt-1",
        type: "inspection_due",
        title: "Monthly Inspection Due",
        titleAr: "موعد فحص شهري مستحق",
        message: "Equipment EXT-102 requires routine monthly safety check.",
        messageAr: "المعدة EXT-102 تتطلب فحص السلامة الشهري الروتيني.",
        equipmentRef: "EXT-102",
        date: new Date().toISOString().split("T")[0],
        isRead: false
      }
    ];
  });

  const [settings, setSettings] = useState<FireProtectionSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(equipment));
  }, [equipment]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INSPECTIONS, JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PUMP_TESTS, JSON.stringify(pumpTests));
  }, [pumpTests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ZONES, JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MAINTENANCE, JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const addEquipment = (item: Omit<FireEquipmentItem, "id">) => {
    const newItem: FireEquipmentItem = {
      ...item,
      id: `eq-${Date.now()}`
    };
    setEquipment(prev => [newItem, ...prev]);
  };

  const deleteEquipment = (id: string) => {
    setEquipment(prev => prev.filter(e => e.id !== id));
  };

  const addInspection = (record: Omit<FireInspectionRecord, "id">) => {
    const newRecord: FireInspectionRecord = {
      ...record,
      id: `insp-${Date.now()}`
    };
    setInspections(prev => [newRecord, ...prev]);

    // Update equipment status and last inspection date
    setEquipment(prev => prev.map(eq => {
      if (eq.id === record.equipmentId) {
        return {
          ...eq,
          lastInspectionDate: record.date,
          status: record.overallResult === 'pass' ? 'good' : 'damaged'
        };
      }
      return eq;
    }));
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const updateSettings = (newSettings: FireProtectionSettings) => {
    setSettings(newSettings);
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
    dismissAlert,
    updateSettings
  };
}
