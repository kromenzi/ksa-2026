import CameraHealthDashboard from "@/components/camera-health-dashboard";
import ESPDeviceDiscovery from "@/components/esp-device-discovery";

export default function VisionDevices() {
  return (
    <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen space-y-6">
      <ESPDeviceDiscovery />
      <CameraHealthDashboard showTitle={true} />
    </div>
  );
}

