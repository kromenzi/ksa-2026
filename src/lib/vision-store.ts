// Central State Management & Data Abstraction Layer for Camera Command Center & ESP AI Safety Platform
// Decoupled storage supporting local persistence & instant reactivity

export interface CameraDevice {
  id: string;
  name: string;
  plant: string;
  area: string;
  ip: string;
  rtspUrl?: string;
  type: "PTZ" | "Fixed Bullet" | "Thermal" | "Dome" | "IP Camera" | "ESP Node";
  status: "ONLINE" | "OFFLINE" | "WARNING";
  recordingStatus: "Recording" | "Paused" | "Disabled";
  fps: number;
  resolution: string;
  lastSeen: string;
  aiStatus: "Active" | "Disabled" | "Error";
  activeAlertsCount: number;
  nvrId?: string;
  healthScore: number; // 0-100%
  latencyMs: number;
  firmware: string;
  xCoord?: number; // percentage on map layout
  yCoord?: number; // percentage on map layout
  zoneType?: "hazmat" | "crane" | "substation" | "warehouse" | "general";
  storageUsedGb?: number;
  lastMaintenance?: string;
}

export interface AIAlert {
  id: string;
  cameraId: string;
  cameraName: string;
  plant: string;
  area: string;
  category: "PPE" | "Restricted Zone" | "Equipment" | "Fire & Smoke" | "Proximity";
  violationType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "NEW" | "ACKNOWLEDGED" | "UNDER REVIEW" | "RESOLVED" | "FALSE POSITIVE";
  confidencePct: number;
  timestamp: string;
  screenshotUrl?: string;
  assignedTo?: string;
  notes?: string;
}

export interface RestrictedZone {
  id: string;
  name: string;
  cameraId: string;
  type: "Polygon" | "Rectangle" | "Line Crossing" | "Entry" | "Exit";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  pointsJson: string; // JSON coordinates
  activeSchedule: string;
}

export interface VisionDevice {
  id: string;
  name: string;
  type: "NVR Server" | "DVR Unit" | "ESP32 Node" | "AI Edge Processor";
  ip: string;
  plant: string;
  area: string;
  channelsCount: number;
  status: "ONLINE" | "OFFLINE" | "WARNING";
  storageUsedPct: number;
  cpuUsagePct: number;
  firmware: string;
  healthScore: number;
}

export interface CameraRecording {
  id: string;
  cameraId: string;
  cameraName: string;
  plant: string;
  area: string;
  startTime: string;
  durationMinutes: number;
  fileSizeMb: number;
  hasAiAlerts: boolean;
}

export interface ESPSettings {
  detectionThresholdPct: number;
  autoHseEventForHighCritical: boolean;
  autoNcrCreation: boolean;
  retentionDays: number;
  notificationChannels: {
    inApp: boolean;
    browserToast: boolean;
    email: boolean;
    smsWhatsapp: boolean;
  };
}

export interface VisionAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  deviceOrObject: string;
  ipAddress: string;
}

// Initial Mock Dataset for Demonstration
export const INITIAL_CAMERAS: CameraDevice[] = [
  {
    id: "CAM-101",
    name: "Main Assembly Entrance",
    plant: "Plant 1 - Steel Fab",
    area: "Assembly Yard A",
    ip: "192.168.10.101",
    type: "PTZ",
    status: "ONLINE",
    recordingStatus: "Recording",
    fps: 30,
    resolution: "1920x1080",
    lastSeen: "Live",
    aiStatus: "Active",
    activeAlertsCount: 0,
    nvrId: "NVR-01",
    healthScore: 98,
    latencyMs: 18,
    firmware: "v4.2.1-esp",
    xCoord: 22,
    yCoord: 28,
    zoneType: "general",
    storageUsedGb: 142,
    lastMaintenance: "2026-07-15"
  },
  {
    id: "CAM-102",
    name: "Chemical Yard West Gate",
    plant: "Plant 2 - Chemical",
    area: "Solvent Storage",
    ip: "192.168.10.102",
    type: "Thermal",
    status: "ONLINE",
    recordingStatus: "Recording",
    fps: 25,
    resolution: "3840x2160",
    lastSeen: "Live",
    aiStatus: "Active",
    activeAlertsCount: 2,
    nvrId: "NVR-02",
    healthScore: 95,
    latencyMs: 24,
    firmware: "v4.2.1-esp",
    xCoord: 78,
    yCoord: 35,
    zoneType: "hazmat",
    storageUsedGb: 280,
    lastMaintenance: "2026-08-01"
  },
  {
    id: "CAM-103",
    name: "Crane Overhead Yard Bay 1",
    plant: "Plant 1 - Steel Fab",
    area: "Crane Runway",
    ip: "192.168.10.103",
    type: "PTZ",
    status: "ONLINE",
    recordingStatus: "Recording",
    fps: 30,
    resolution: "1920x1080",
    lastSeen: "Live",
    aiStatus: "Active",
    activeAlertsCount: 1,
    nvrId: "NVR-01",
    healthScore: 92,
    latencyMs: 21,
    firmware: "v4.2.0-esp",
    xCoord: 35,
    yCoord: 45,
    zoneType: "crane",
    storageUsedGb: 190,
    lastMaintenance: "2026-06-20"
  },
  {
    id: "CAM-104",
    name: "High Bay Storage Rack 4",
    plant: "Logistics Hub",
    area: "Warehouse B",
    ip: "192.168.10.104",
    type: "Fixed Bullet",
    status: "ONLINE",
    recordingStatus: "Recording",
    fps: 30,
    resolution: "1920x1080",
    lastSeen: "Live",
    aiStatus: "Active",
    activeAlertsCount: 0,
    nvrId: "NVR-03",
    healthScore: 100,
    latencyMs: 15,
    firmware: "v4.2.1-esp",
    xCoord: 82,
    yCoord: 75,
    zoneType: "warehouse",
    storageUsedGb: 110,
    lastMaintenance: "2026-07-28"
  },
  {
    id: "CAM-105",
    name: "Power Transformer Substation",
    plant: "Utilities & Power",
    area: "Substation Alpha",
    ip: "192.168.10.105",
    type: "Thermal",
    status: "WARNING",
    recordingStatus: "Recording",
    fps: 20,
    resolution: "1280x720",
    lastSeen: "2 mins ago",
    aiStatus: "Active",
    activeAlertsCount: 1,
    nvrId: "NVR-02",
    healthScore: 78,
    latencyMs: 85,
    firmware: "v4.1.9-esp",
    xCoord: 28,
    yCoord: 80,
    zoneType: "substation",
    storageUsedGb: 95,
    lastMaintenance: "2026-05-10"
  },
  {
    id: "CAM-106",
    name: "Forklift Main Aisle 2",
    plant: "Logistics Hub",
    area: "Loading Docks",
    ip: "192.168.10.106",
    type: "Dome",
    status: "ONLINE",
    recordingStatus: "Recording",
    fps: 30,
    resolution: "1920x1080",
    lastSeen: "Live",
    aiStatus: "Active",
    activeAlertsCount: 0,
    nvrId: "NVR-03",
    healthScore: 99,
    latencyMs: 19,
    firmware: "v4.2.1-esp",
    xCoord: 68,
    yCoord: 82,
    zoneType: "general",
    storageUsedGb: 160,
    lastMaintenance: "2026-07-10"
  },
  {
    id: "CAM-107",
    name: "Confined Vessel Tank 3 Entrance",
    plant: "Plant 2 - Chemical",
    area: "Processing Vessel",
    ip: "192.168.10.107",
    type: "ESP Node",
    status: "OFFLINE",
    recordingStatus: "Disabled",
    fps: 0,
    resolution: "1080p",
    lastSeen: "2 hours ago",
    aiStatus: "Error",
    activeAlertsCount: 0,
    nvrId: "NVR-02",
    healthScore: 0,
    latencyMs: 0,
    firmware: "v4.0.1-esp",
    xCoord: 88,
    yCoord: 22,
    zoneType: "hazmat",
    storageUsedGb: 0,
    lastMaintenance: "2026-04-12"
  },
  {
    id: "CAM-108",
    name: "Main Administration Gate",
    plant: "Main Entrance",
    area: "Perimeter Gate 1",
    ip: "192.168.10.108",
    type: "Fixed Bullet",
    status: "ONLINE",
    recordingStatus: "Recording",
    fps: 30,
    resolution: "1920x1080",
    lastSeen: "Live",
    aiStatus: "Active",
    activeAlertsCount: 0,
    nvrId: "NVR-01",
    healthScore: 100,
    latencyMs: 14,
    firmware: "v4.2.1-esp",
    xCoord: 12,
    yCoord: 15,
    zoneType: "general",
    storageUsedGb: 130,
    lastMaintenance: "2026-08-02"
  }
];

export const INITIAL_ALERTS: AIAlert[] = [
  {
    id: "ALT-2026-001",
    cameraId: "CAM-102",
    cameraName: "Chemical Yard West Gate",
    plant: "Plant 2 - Chemical",
    area: "Solvent Storage",
    category: "PPE",
    violationType: "Worker without Safety Helmet & Vest",
    severity: "HIGH",
    status: "NEW",
    confidencePct: 96,
    timestamp: "2026-08-10 09:32:15",
    notes: "Detected person in restricted hazmat zone missing hardhat."
  },
  {
    id: "ALT-2026-002",
    cameraId: "CAM-103",
    cameraName: "Crane Overhead Yard Bay 1",
    plant: "Plant 1 - Steel Fab",
    area: "Crane Runway",
    category: "Restricted Zone",
    violationType: "Person Under Overhead Suspended Load Zone",
    severity: "CRITICAL",
    status: "ACKNOWLEDGED",
    confidencePct: 98,
    timestamp: "2026-08-10 09:15:40",
    assignedTo: "HSE Inspector - Ahmed Al-Otaibi",
    notes: "Worker passed warning line while gantry crane was operating."
  },
  {
    id: "ALT-2026-003",
    cameraId: "CAM-105",
    cameraName: "Power Transformer Substation",
    plant: "Utilities & Power",
    area: "Substation Alpha",
    category: "Fire & Smoke",
    violationType: "Thermal Temperature Spike > 85°C",
    severity: "HIGH",
    status: "NEW",
    confidencePct: 91,
    timestamp: "2026-08-10 08:50:00",
    notes: "Thermal camera channel flagged local overheating on Phase B breaker."
  },
  {
    id: "ALT-2026-004",
    cameraId: "CAM-106",
    cameraName: "Forklift Main Aisle 2",
    plant: "Logistics Hub",
    area: "Loading Docks",
    category: "Equipment",
    violationType: "Forklift Pedestrian Near-Miss (< 1.5m)",
    severity: "MEDIUM",
    status: "RESOLVED",
    confidencePct: 89,
    timestamp: "2026-08-10 08:12:30",
    assignedTo: "Logistics Supervisor",
    notes: "Operator stopped vehicle safely. Corrective warning issued."
  }
];

export const INITIAL_DEVICES: VisionDevice[] = [
  {
    id: "NVR-01",
    name: "Steel Fab Central NVR Server",
    type: "NVR Server",
    ip: "192.168.10.10",
    plant: "Plant 1 - Steel Fab",
    area: "Server Room A",
    channelsCount: 16,
    status: "ONLINE",
    storageUsedPct: 62,
    cpuUsagePct: 28,
    firmware: "v4.8.2-enterprise",
    healthScore: 99
  },
  {
    id: "NVR-02",
    name: "Hazmat & Chemical Thermal NVR",
    type: "NVR Server",
    ip: "192.168.10.11",
    plant: "Plant 2 - Chemical",
    area: "Control Building",
    channelsCount: 12,
    status: "ONLINE",
    storageUsedPct: 78,
    cpuUsagePct: 44,
    firmware: "v4.8.2-enterprise",
    healthScore: 96
  },
  {
    id: "NVR-03",
    name: "Warehouse & Logistics DVR",
    type: "DVR Unit",
    ip: "192.168.10.12",
    plant: "Logistics Hub",
    area: "Admin Office",
    channelsCount: 16,
    status: "ONLINE",
    storageUsedPct: 50,
    cpuUsagePct: 31,
    firmware: "v4.5.0-standard",
    healthScore: 97
  },
  {
    id: "ESP-AI-NODE-01",
    name: "NVIDIA Jetson AGX Orin Edge Node",
    type: "AI Edge Processor",
    ip: "192.168.10.50",
    plant: "Plant 1 - Steel Fab",
    area: "Edge Rack 1",
    channelsCount: 8,
    status: "ONLINE",
    storageUsedPct: 35,
    cpuUsagePct: 68,
    firmware: "v5.1.2-jetpack",
    healthScore: 100
  }
];

export const INITIAL_RECORDINGS: CameraRecording[] = [
  {
    id: "REC-101",
    cameraId: "CAM-101",
    cameraName: "Main Assembly Entrance",
    plant: "Plant 1 - Steel Fab",
    area: "Assembly Yard A",
    startTime: "2026-08-10 08:00:00",
    durationMinutes: 60,
    fileSizeMb: 1250,
    hasAiAlerts: false
  },
  {
    id: "REC-102",
    cameraId: "CAM-102",
    cameraName: "Chemical Yard West Gate",
    plant: "Plant 2 - Chemical",
    area: "Solvent Storage",
    startTime: "2026-08-10 09:00:00",
    durationMinutes: 60,
    fileSizeMb: 2400,
    hasAiAlerts: true
  },
  {
    id: "REC-103",
    cameraId: "CAM-103",
    cameraName: "Crane Overhead Yard Bay 1",
    plant: "Plant 1 - Steel Fab",
    area: "Crane Runway",
    startTime: "2026-08-10 09:00:00",
    durationMinutes: 45,
    fileSizeMb: 1800,
    hasAiAlerts: true
  }
];

export const DEFAULT_ESP_SETTINGS: ESPSettings = {
  detectionThresholdPct: 80,
  autoHseEventForHighCritical: true,
  autoNcrCreation: false,
  retentionDays: 30,
  notificationChannels: {
    inApp: true,
    browserToast: true,
    email: true,
    smsWhatsapp: false
  }
};

export const INITIAL_AUDIT_LOGS: VisionAuditEntry[] = [
  {
    id: "AUD-001",
    timestamp: "2026-08-10 09:35:00",
    user: "System Admin",
    action: "Updated Camera Configuration",
    deviceOrObject: "CAM-102 Chemical Yard West Gate",
    ipAddress: "192.168.10.5"
  },
  {
    id: "AUD-002",
    timestamp: "2026-08-10 09:16:12",
    user: "Ahmed Al-Otaibi (HSE Officer)",
    action: "Acknowledged AI Alert",
    deviceOrObject: "ALT-2026-002 Overhead Crane Zone",
    ipAddress: "192.168.10.42"
  }
];

// Helper Functions with localStorage persistence
const CAMERAS_KEY = "utec_safety_vision_cameras_v1";
const ALERTS_KEY = "utec_safety_vision_alerts_v1";
const DEVICES_KEY = "utec_safety_vision_devices_v1";
const RECORDINGS_KEY = "utec_safety_vision_recordings_v1";
const SETTINGS_KEY = "utec_safety_vision_settings_v1";
const AUDIT_KEY = "utec_safety_vision_audit_v1";

export function getStoredCameras(): CameraDevice[] {
  try {
    const item = localStorage.getItem(CAMERAS_KEY);
    return item ? JSON.parse(item) : INITIAL_CAMERAS;
  } catch {
    return INITIAL_CAMERAS;
  }
}

export function saveStoredCameras(cameras: CameraDevice[]) {
  try {
    localStorage.setItem(CAMERAS_KEY, JSON.stringify(cameras));
  } catch (e) {
    console.error("Failed to save cameras", e);
  }
}

export function getStoredAlerts(): AIAlert[] {
  try {
    const item = localStorage.getItem(ALERTS_KEY);
    return item ? JSON.parse(item) : INITIAL_ALERTS;
  } catch {
    return INITIAL_ALERTS;
  }
}

export function saveStoredAlerts(alerts: AIAlert[]) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error("Failed to save alerts", e);
  }
}

export function getStoredDevices(): VisionDevice[] {
  try {
    const item = localStorage.getItem(DEVICES_KEY);
    return item ? JSON.parse(item) : INITIAL_DEVICES;
  } catch {
    return INITIAL_DEVICES;
  }
}

export function saveStoredDevices(devices: VisionDevice[]) {
  try {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  } catch (e) {
    console.error("Failed to save devices", e);
  }
}

export function getStoredRecordings(): CameraRecording[] {
  try {
    const item = localStorage.getItem(RECORDINGS_KEY);
    return item ? JSON.parse(item) : INITIAL_RECORDINGS;
  } catch {
    return INITIAL_RECORDINGS;
  }
}

export function getStoredSettings(): ESPSettings {
  try {
    const item = localStorage.getItem(SETTINGS_KEY);
    return item ? JSON.parse(item) : DEFAULT_ESP_SETTINGS;
  } catch {
    return DEFAULT_ESP_SETTINGS;
  }
}

export function saveStoredSettings(settings: ESPSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}

export function getStoredAuditLogs(): VisionAuditEntry[] {
  try {
    const item = localStorage.getItem(AUDIT_KEY);
    return item ? JSON.parse(item) : INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function addAuditEntry(action: string, deviceOrObject: string, user = "Current Operator", details?: string) {
  try {
    const current = getStoredAuditLogs();
    const entry: VisionAuditEntry = {
      id: `AUD-${String(current.length + 1).padStart(3, "0")}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      user,
      action: details ? `${action} (${details})` : action,
      deviceOrObject,
      ipAddress: "192.168.10.x"
    };
    const updated = [entry, ...current];
    localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to append audit log", e);
  }
}
