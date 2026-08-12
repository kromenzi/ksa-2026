import CameraHealthDashboard from "@/components/camera-health-dashboard";

export default function VisionDevices() {
  return (
    <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <CameraHealthDashboard showTitle={true} />
    </div>
  );
}

