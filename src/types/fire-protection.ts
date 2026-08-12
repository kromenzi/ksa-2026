export type FireEquipmentCategory = 'extinguisher' | 'pump' | 'alarm_panel' | 'hydrant' | 'hose_reel';
export type FireEquipmentType = 'powder' | 'co2' | 'water' | 'foam' | 'diesel_pump' | 'electric_pump' | 'jockey_pump' | 'smoke_detector' | 'heat_detector' | 'alarm_panel';
export type FireEquipmentStatus = 'good' | 'inspection_due' | 'maintenance_due' | 'damaged' | 'out_of_service' | 'expired';

export interface FireEquipmentItem {
  id: string;
  equipmentId: string;
  serialNumber: string;
  qrCode: string;
  category: FireEquipmentCategory;
  type: FireEquipmentType;
  manufacturer: string;
  model: string;
  capacity?: string;
  location: string;
  department: string;
  building: string;
  installationDate?: string;
  expiryDate?: string;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  status: FireEquipmentStatus;
  notes?: string;
  createdBy: string;
}

export interface ChecklistItemResult {
  id: string;
  label: string;
  labelAr: string;
  result: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface FireInspectionRecord {
  id: string;
  equipmentId: string;
  equipmentRef: string;
  equipmentName: string;
  inspectorName: string;
  inspectorId: string;
  date: string;
  time: string;
  overallResult: 'pass' | 'fail';
  checklist: ChecklistItemResult[];
  notes?: string;
}

export interface FirePumpTestRecord {
  id: string;
  pumpId: string;
  pumpName: string;
  date: string;
  suctionPressure: string;
  dischargePressure: string;
  flowRate: string;
  rpm: number;
  oilPressure: string;
  temperature: string;
  status: 'pass' | 'fail';
  notes?: string;
}

export interface FireAlarmZone {
  id: string;
  zoneCode: string;
  zoneName: string;
  building: string;
  area: string;
  devicesCount: number;
  status: 'normal' | 'alarm' | 'fault' | 'disabled';
}

export interface FireMaintenanceWorkOrder {
  id: string;
  woNumber: string;
  equipmentId: string;
  equipmentName: string;
  type: 'preventive' | 'corrective' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'verified';
  assignedTo: string;
  problemDescription: string;
  scheduledDate: string;
  completedDate?: string;
}

export interface FireAlertItem {
  id: string;
  type: 'inspection_due' | 'maintenance_due' | 'equipment_expired' | 'pump_failure';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  equipmentRef?: string;
  date: string;
  isRead: boolean;
}

export interface FireProtectionSettings {
  defaultInspectionIntervalDays: number;
  defaultMaintenanceIntervalDays: number;
  autoGenerateAlerts: boolean;
  checklistTemplates: {
    id: string;
    label: string;
    labelAr: string;
  }[];
}
