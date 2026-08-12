import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminPosts from "@/pages/admin/posts";
import AdminSections from "@/pages/admin/sections";
import AdminForms from "@/pages/admin/forms";
import AdminReports from "@/pages/admin/reports";
import AdminNCR from "@/pages/admin/ncr/list";
import AdminNCRForm from "@/pages/admin/ncr/form";
import AdminFiles from "@/pages/admin/files";
import AdminContracts from "@/pages/admin/contracts";
import AdminPermits from "@/pages/admin/permits";
import AdminInvoices from "@/pages/admin/invoices";
import AdminSettings from "@/pages/admin/settings";
import AdminActivityLogs from "@/pages/admin/activity-logs";
import AdminPlants from "@/pages/admin/plants";
import AdminIntegrations from "@/pages/admin/integrations";
import AdminEmailSettings from "@/pages/admin/email-settings";
import AdminInbox from "@/pages/admin/inbox";
import AdminMailConfig from "@/pages/admin/mail-config";
import AdminNotificationRules from "@/pages/admin/notification-rules";
import AdminGamification from "@/pages/admin/gamification";
import AdminEmployees from "@/pages/admin/employees";
import AdminTrainings from "@/pages/admin/trainings";
import AdminTrainingMatrix from "@/pages/admin/training-matrix";
import AdminCompetency from "@/pages/admin/competency";
import AdminIncidents from "@/pages/admin/incidents";
import AdminRiskAssessment from "@/pages/admin/risk-assessment";
import AdminInspections from "@/pages/admin/inspections";
import AdminAudits from "@/pages/admin/audits";
import AdminLoto from "@/pages/admin/loto";
import AdminAssets from "@/pages/admin/assets";
import AdminVisitors from "@/pages/admin/visitors";
import AdminEmergency from "@/pages/admin/emergency";
import AdminEnterpriseReports from "@/pages/admin/enterprise-reports";
import AdminCompliance from "@/pages/admin/compliance";
import AdminLicenses from "@/pages/admin/licenses";
import AdminEquipmentAuth from "@/pages/admin/equipment-auth";
import AdminSafetyPyramid from "@/pages/admin/safety-pyramid";
import EscalationDashboard from "@/pages/admin/escalations/dashboard";
import EscalationHistory from "@/pages/admin/escalations/history";
import EscalationMatrix from "@/pages/admin/escalations/matrix";
import VisionDashboard from "@/pages/admin/vision/dashboard";
import VisionLive from "@/pages/admin/vision/live";
import VisionCameras from "@/pages/admin/vision/cameras";
import VisionDevices from "@/pages/admin/vision/devices";
import VisionMap from "@/pages/admin/vision/map";
import VisionRules from "@/pages/admin/vision/rules";
import VisionEvents from "@/pages/admin/vision/events";
import VisionAlerts from "@/pages/admin/vision/alerts";
import VisionAnalytics from "@/pages/admin/vision/analytics";
import VisionSettings from "@/pages/admin/vision/settings";
import AdminFireProtection from "@/pages/admin/fire-protection";
import AdminSafetySigns from "@/pages/admin/safety-signs";

import { DataProvider, useData } from "@/lib/data-context";
import { AdminLayout } from "@/components/layouts/admin-layout";
import PublicReport from "@/pages/public-report";
import { useEffect } from "react";

// Protected Route Component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useData();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

// Redirect /admin to /admin/dashboard or /admin/login
function AdminRedirect() {
  const { isAuthenticated } = useData();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/report/:id" component={PublicReport} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminRedirect} />
      <Route path="/admin/login" component={AdminLogin} />
      
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsers} />
      </Route>
      <Route path="/admin/posts">
        <ProtectedRoute component={AdminPosts} />
      </Route>
      <Route path="/admin/sections">
        <ProtectedRoute component={AdminSections} />
      </Route>
      <Route path="/admin/forms">
        <ProtectedRoute component={AdminForms} />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReports} />
      </Route>
      <Route path="/admin/ncr">
        <ProtectedRoute component={AdminNCR} />
      </Route>
      <Route path="/admin/ncr/new">
        <ProtectedRoute component={AdminNCRForm} />
      </Route>
      <Route path="/admin/ncr/:id">
        <ProtectedRoute component={AdminNCRForm} />
      </Route>
      <Route path="/admin/files">
        <ProtectedRoute component={AdminFiles} />
      </Route>
      <Route path="/admin/contracts">
        <ProtectedRoute component={AdminContracts} />
      </Route>
      <Route path="/admin/permits">
        <ProtectedRoute component={AdminPermits} />
      </Route>
      <Route path="/admin/invoices">
        <ProtectedRoute component={AdminInvoices} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} />
      </Route>
      <Route path="/admin/activity">
        <ProtectedRoute component={AdminActivityLogs} />
      </Route>
      <Route path="/admin/plants">
        <ProtectedRoute component={AdminPlants} />
      </Route>
      <Route path="/admin/integrations">
        <ProtectedRoute component={AdminIntegrations} />
      </Route>
      <Route path="/admin/email-settings">
        <ProtectedRoute component={AdminEmailSettings} />
      </Route>
      <Route path="/admin/inbound-inbox">
        <ProtectedRoute component={AdminInbox} />
      </Route>
      <Route path="/admin/inbound-config">
        <ProtectedRoute component={AdminMailConfig} />
      </Route>
      <Route path="/admin/notification-rules">
        <ProtectedRoute component={AdminNotificationRules} />
      </Route>
      <Route path="/admin/gamification">
        <ProtectedRoute component={AdminGamification} />
      </Route>
      <Route path="/admin/employees">
        <ProtectedRoute component={AdminEmployees} />
      </Route>
      <Route path="/admin/trainings">
        <ProtectedRoute component={AdminTrainings} />
      </Route>
      <Route path="/admin/training-matrix">
        <ProtectedRoute component={AdminTrainingMatrix} />
      </Route>
      <Route path="/admin/competency">
        <ProtectedRoute component={AdminCompetency} />
      </Route>
      <Route path="/admin/incidents">
        <ProtectedRoute component={AdminIncidents} />
      </Route>
      <Route path="/admin/risk-assessment">
        <ProtectedRoute component={AdminRiskAssessment} />
      </Route>
      <Route path="/admin/inspections">
        <ProtectedRoute component={AdminInspections} />
      </Route>
      <Route path="/admin/audits">
        <ProtectedRoute component={AdminAudits} />
      </Route>
      <Route path="/admin/loto">
        <ProtectedRoute component={AdminLoto} />
      </Route>
      <Route path="/admin/assets">
        <ProtectedRoute component={AdminAssets} />
      </Route>
      <Route path="/admin/visitors">
        <ProtectedRoute component={AdminVisitors} />
      </Route>
      <Route path="/admin/emergency">
        <ProtectedRoute component={AdminEmergency} />
      </Route>
      <Route path="/admin/fire-protection">
        <ProtectedRoute component={AdminFireProtection} />
      </Route>
      <Route path="/admin/reports-documents/safety-signs">
        <ProtectedRoute component={AdminSafetySigns} />
      </Route>
      <Route path="/admin/safety-signs">
        <ProtectedRoute component={AdminSafetySigns} />
      </Route>
      <Route path="/admin/enterprise-reports">
        <ProtectedRoute component={AdminEnterpriseReports} />
      </Route>
      <Route path="/admin/compliance">
        <ProtectedRoute component={AdminCompliance} />
      </Route>
      <Route path="/admin/licenses">
        <ProtectedRoute component={AdminLicenses} />
      </Route>
      <Route path="/admin/equipment-auth">
        <ProtectedRoute component={AdminEquipmentAuth} />
      </Route>
      
      <Route path="/admin/safety-pyramid">
        <ProtectedRoute component={AdminSafetyPyramid} />
      </Route>
      <Route path="/admin/escalations">
        <ProtectedRoute component={EscalationDashboard} />
      </Route>
      <Route path="/admin/escalations/history">
        <ProtectedRoute component={EscalationHistory} />
      </Route>
      <Route path="/admin/escalations/matrix">
        <ProtectedRoute component={EscalationMatrix} />
      </Route>


      
      <Route path="/admin/vision/dashboard">
        <ProtectedRoute component={VisionDashboard} />
      </Route>
      <Route path="/admin/vision/live">
        <ProtectedRoute component={VisionLive} />
      </Route>
      <Route path="/admin/vision/cameras">
        <ProtectedRoute component={VisionCameras} />
      </Route>
      <Route path="/admin/vision/devices">
        <ProtectedRoute component={VisionDevices} />
      </Route>
      <Route path="/admin/vision/map">
        <ProtectedRoute component={VisionMap} />
      </Route>
      <Route path="/admin/vision/rules">
        <ProtectedRoute component={VisionRules} />
      </Route>
      <Route path="/admin/vision/events">
        <ProtectedRoute component={VisionEvents} />
      </Route>
      <Route path="/admin/vision/alerts">
        <ProtectedRoute component={VisionAlerts} />
      </Route>
      <Route path="/admin/vision/analytics">
        <ProtectedRoute component={VisionAnalytics} />
      </Route>
      <Route path="/admin/vision/settings">
        <ProtectedRoute component={VisionSettings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <Toaster />
        <Router />
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
