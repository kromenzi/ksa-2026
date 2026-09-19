import { lazy, Suspense, useEffect } from "react";
import { installChunkRecovery } from "@/lib/chunk-recovery";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import { DataProvider, useData } from "@/lib/data-context";
import { AdminLayout } from "@/components/layouts/admin-layout";
import EnvironmentalMeasurementsAlert from "@/components/environmental-measurements-alert";
import { OfflineStatusBanner } from "@/components/offline-status-banner";

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const HseAssistantPage = lazy(() => import("@/pages/admin/hse-assistant"));
const ExecutiveHseDashboard = lazy(() => import("@/pages/admin/executive-hse"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminPosts = lazy(() => import("@/pages/admin/posts"));
const AdminSections = lazy(() => import("@/pages/admin/sections"));
const AdminForms = lazy(() => import("@/pages/admin/forms"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminNCR = lazy(() => import("@/pages/admin/ncr/list"));
const AdminNCRForm = lazy(() => import("@/pages/admin/ncr/form"));
const AdminNCRNewFixed = lazy(() => import("@/pages/admin/ncr/new-fixed"));
const AdminFiles = lazy(() => import("@/pages/admin/files"));
const AdminContracts = lazy(() => import("@/pages/admin/contracts"));
const ContractorSafetyPage = lazy(() => import("@/pages/admin/contractor-safety"));
const AdminPermits = lazy(() => import("@/pages/admin/permits"));
const AdminInvoices = lazy(() => import("@/pages/admin/invoices"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminActivityLogs = lazy(() => import("@/pages/admin/activity-logs"));
const AdminPlants = lazy(() => import("@/pages/admin/plants"));
const AdminIntegrations = lazy(() => import("@/pages/admin/integrations"));
const AdminEmailSettings = lazy(() => import("@/pages/admin/email-settings"));
const AdminInbox = lazy(() => import("@/pages/admin/inbox"));
const AdminMailConfig = lazy(() => import("@/pages/admin/mail-config"));
const AdminNotificationRules = lazy(() => import("@/pages/admin/notification-rules"));
const AdminGamification = lazy(() => import("@/pages/admin/gamification"));
const AdminEmployees = lazy(() => import("@/pages/admin/employees"));
const AdminHseTeam = lazy(() => import("@/pages/admin/hse-team"));
const AdminEmployeeViolations = lazy(() => import("@/pages/admin/employee-violations"));
const AdminTrainings = lazy(() => import("@/pages/admin/trainings"));
const AdminTrainingMatrix = lazy(() => import("@/pages/admin/training-matrix"));
const AdminCompetency = lazy(() => import("@/pages/admin/competency"));
const AdminIncidents = lazy(() => import("@/pages/admin/incidents"));
const AdminRiskAssessment = lazy(() => import("@/pages/admin/risk-assessment"));
const SafetyMapPage = lazy(() => import("@/pages/admin/safety-map"));
const RiskRegisterPage = lazy(() => import("@/pages/admin/risk-register"));
const ChemicalsPage = lazy(() => import("@/pages/admin/chemicals"));
const AdminInspections = lazy(() => import("@/pages/admin/inspections"));
const AdminAudits = lazy(() => import("@/pages/admin/audits"));
const AdminLoto = lazy(() => import("@/pages/admin/loto"));
const AdminAssets = lazy(() => import("@/pages/admin/assets"));
const AdminVisitors = lazy(() => import("@/pages/admin/visitors"));
const AdminEmergency = lazy(() => import("@/pages/admin/emergency"));
const AdminFireProtection = lazy(() => import("@/pages/admin/fire-protection"));
const AdminSafetySigns = lazy(() => import("@/pages/admin/safety-signs"));
const AdminEnterpriseReports = lazy(() => import("@/pages/admin/enterprise-reports"));
const AdminCompliance = lazy(() => import("@/pages/admin/compliance"));
const AdminLicenses = lazy(() => import("@/pages/admin/licenses"));
const FacilityRegulatoryLicenses = lazy(() => import("@/pages/admin/facility-regulatory-licenses"));
const EnvironmentalMeasurements = lazy(() => import("@/pages/admin/environmental-measurements"));
const AdminEquipmentAuth = lazy(() => import("@/pages/admin/equipment-auth"));
const EquipmentSafetyPage = lazy(() => import("@/pages/admin/equipment-safety"));
const AdminOfficialTemplates = lazy(() => import("@/pages/admin/official-templates"));
const AdminSafetyPyramid = lazy(() => import("@/pages/admin/safety-pyramid"));
const FireEmergencyCommandCenter = lazy(() => import("@/pages/admin/fire-emergency-command"));
const EmergencyResponsePage = lazy(() => import("@/pages/admin/emergency-response"));
const AdminSafetyPyramidPrint = lazy(() => import("@/pages/admin/safety-pyramid-print"));
const EscalationDashboard = lazy(() => import("@/pages/admin/escalations/dashboard"));
const EscalationHistory = lazy(() => import("@/pages/admin/escalations/history"));
const EscalationMatrix = lazy(() => import("@/pages/admin/escalations/matrix"));
const VisionDashboard = lazy(() => import("@/pages/admin/vision/dashboard"));
const VisionLive = lazy(() => import("@/pages/admin/vision/live"));
const VisionCameras = lazy(() => import("@/pages/admin/vision/cameras"));
const VisionDevices = lazy(() => import("@/pages/admin/vision/devices"));
const VisionMap = lazy(() => import("@/pages/admin/vision/map"));
const VisionRules = lazy(() => import("@/pages/admin/vision/rules"));
const VisionEvents = lazy(() => import("@/pages/admin/vision/events"));
const VisionAlerts = lazy(() => import("@/pages/admin/vision/alerts"));
const VisionAnalytics = lazy(() => import("@/pages/admin/vision/analytics"));
const VisionSettings = lazy(() => import("@/pages/admin/vision/settings"));
const PublicReport = lazy(() => import("@/pages/public-report"));
const PublicSafetyReport = lazy(() => import("@/pages/safety-report"));
const PublicSafetyReportStatus = lazy(() => import("@/pages/safety-report-status"));
const AdminSafetyReporting = lazy(() => import("@/pages/admin/safety-reporting"));
const AdminMonthlyHsePlan = lazy(() => import("@/pages/admin/monthly-hse-plan"));
const MonthlyHseReportPage = lazy(() => import("@/pages/admin/monthly-hse-report"));
const MobileFieldPage = lazy(() => import("@/pages/admin/mobile-field"));
const ActionCenterPage = lazy(() => import("@/pages/admin/action-center"));

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useData();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/admin/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;
  return (
    <AdminLayout>
      <EnvironmentalMeasurementsAlert />
      <Component />
    </AdminLayout>
  );
}

function AdminRedirect() {
  const { isAuthenticated } = useData();
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(isAuthenticated ? "/admin/dashboard" : "/admin/login");
  }, [isAuthenticated, setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/report" component={PublicSafetyReport} />
      <Route path="/report/status" component={PublicSafetyReportStatus} />
      <Route path="/report/:id" component={PublicReport} />
      <Route path="/admin" component={AdminRedirect} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard"><ProtectedRoute component={AdminDashboard} /></Route>
      <Route path="/admin/hse-assistant"><ProtectedRoute component={HseAssistantPage} /></Route>
      <Route path="/admin/executive-hse"><ProtectedRoute component={ExecutiveHseDashboard} /></Route>
      <Route path="/admin/users"><ProtectedRoute component={AdminUsers} /></Route>
      <Route path="/admin/posts"><ProtectedRoute component={AdminPosts} /></Route>
      <Route path="/admin/sections"><ProtectedRoute component={AdminSections} /></Route>
      <Route path="/admin/forms"><ProtectedRoute component={AdminForms} /></Route>
      <Route path="/admin/reports"><ProtectedRoute component={AdminReports} /></Route>
      <Route path="/admin/safety-reporting"><ProtectedRoute component={AdminSafetyReporting} /></Route>
      <Route path="/admin/monthly-hse-plan"><ProtectedRoute component={AdminMonthlyHsePlan} /></Route>
      <Route path="/admin/monthly-hse-report"><ProtectedRoute component={MonthlyHseReportPage} /></Route>
      <Route path="/admin/mobile-field"><ProtectedRoute component={MobileFieldPage} /></Route>
      <Route path="/admin/action-center"><ProtectedRoute component={ActionCenterPage} /></Route>
      <Route path="/admin/ncr"><ProtectedRoute component={AdminNCR} /></Route>
      <Route path="/admin/ncr/new"><ProtectedRoute component={AdminNCRNewFixed} /></Route>
      <Route path="/admin/ncr/:id"><ProtectedRoute component={AdminNCRForm} /></Route>
      <Route path="/admin/files"><ProtectedRoute component={AdminFiles} /></Route>
      <Route path="/admin/contracts"><ProtectedRoute component={AdminContracts} /></Route>
      <Route path="/admin/contractor-safety"><ProtectedRoute component={ContractorSafetyPage} /></Route>
      <Route path="/admin/permits"><ProtectedRoute component={AdminPermits} /></Route>
      <Route path="/admin/invoices"><ProtectedRoute component={AdminInvoices} /></Route>
      <Route path="/admin/settings"><ProtectedRoute component={AdminSettings} /></Route>
      <Route path="/admin/activity"><ProtectedRoute component={AdminActivityLogs} /></Route>
      <Route path="/admin/plants"><ProtectedRoute component={AdminPlants} /></Route>
      <Route path="/admin/integrations"><ProtectedRoute component={AdminIntegrations} /></Route>
      <Route path="/admin/email-settings"><ProtectedRoute component={AdminEmailSettings} /></Route>
      <Route path="/admin/inbound-inbox"><ProtectedRoute component={AdminInbox} /></Route>
      <Route path="/admin/inbound-config"><ProtectedRoute component={AdminMailConfig} /></Route>
      <Route path="/admin/notification-rules"><ProtectedRoute component={AdminNotificationRules} /></Route>
      <Route path="/admin/gamification"><ProtectedRoute component={AdminGamification} /></Route>
      <Route path="/admin/employees"><ProtectedRoute component={AdminEmployees} /></Route>
      <Route path="/admin/hse-team"><ProtectedRoute component={AdminHseTeam} /></Route>
      <Route path="/admin/employee-violations"><ProtectedRoute component={AdminEmployeeViolations} /></Route>
      <Route path="/admin/trainings"><ProtectedRoute component={AdminTrainings} /></Route>
      <Route path="/admin/training-matrix"><ProtectedRoute component={AdminTrainingMatrix} /></Route>
      <Route path="/admin/competency"><ProtectedRoute component={AdminCompetency} /></Route>
      <Route path="/admin/incidents"><ProtectedRoute component={AdminIncidents} /></Route>
      <Route path="/admin/risk-assessment"><ProtectedRoute component={AdminRiskAssessment} /></Route>
      <Route path="/admin/safety-map"><ProtectedRoute component={SafetyMapPage} /></Route>
      <Route path="/admin/risk-register"><ProtectedRoute component={RiskRegisterPage} /></Route>
      <Route path="/admin/chemicals"><ProtectedRoute component={ChemicalsPage} /></Route>
      <Route path="/admin/inspections"><ProtectedRoute component={AdminInspections} /></Route>
      <Route path="/admin/audits"><ProtectedRoute component={AdminAudits} /></Route>
      <Route path="/admin/loto"><ProtectedRoute component={AdminLoto} /></Route>
      <Route path="/admin/assets"><ProtectedRoute component={AdminAssets} /></Route>
      <Route path="/admin/visitors"><ProtectedRoute component={AdminVisitors} /></Route>
      <Route path="/admin/emergency"><ProtectedRoute component={AdminEmergency} /></Route>
      <Route path="/admin/fire-protection"><ProtectedRoute component={AdminFireProtection} /></Route>
      <Route path="/admin/fire-emergency-command"><ProtectedRoute component={FireEmergencyCommandCenter} /></Route>
      <Route path="/admin/emergency-response"><ProtectedRoute component={EmergencyResponsePage} /></Route>
      <Route path="/admin/reports-documents/safety-signs"><ProtectedRoute component={AdminSafetySigns} /></Route>
      <Route path="/admin/safety-signs"><ProtectedRoute component={AdminSafetySigns} /></Route>
      <Route path="/admin/enterprise-reports"><ProtectedRoute component={AdminEnterpriseReports} /></Route>
      <Route path="/admin/compliance"><ProtectedRoute component={AdminCompliance} /></Route>
      <Route path="/admin/licenses"><ProtectedRoute component={AdminLicenses} /></Route>
      <Route path="/admin/facility-regulatory-licenses"><ProtectedRoute component={FacilityRegulatoryLicenses} /></Route>
      <Route path="/admin/environmental-measurements"><ProtectedRoute component={EnvironmentalMeasurements} /></Route>
      <Route path="/admin/equipment-auth"><ProtectedRoute component={AdminEquipmentAuth} /></Route>
      <Route path="/admin/equipment-safety"><ProtectedRoute component={EquipmentSafetyPage} /></Route>
      <Route path="/admin/official-templates"><ProtectedRoute component={AdminOfficialTemplates} /></Route>
      <Route path="/admin/safety-pyramid"><ProtectedRoute component={AdminSafetyPyramid} /></Route>
      <Route path="/admin/safety-pyramid-print" component={AdminSafetyPyramidPrint} />
      <Route path="/admin/escalations"><ProtectedRoute component={EscalationDashboard} /></Route>
      <Route path="/admin/escalations/history"><ProtectedRoute component={EscalationHistory} /></Route>
      <Route path="/admin/escalations/matrix"><ProtectedRoute component={EscalationMatrix} /></Route>
      <Route path="/admin/vision/dashboard"><ProtectedRoute component={VisionDashboard} /></Route>
      <Route path="/admin/vision/live"><ProtectedRoute component={VisionLive} /></Route>
      <Route path="/admin/vision/cameras"><ProtectedRoute component={VisionCameras} /></Route>
      <Route path="/admin/vision/devices"><ProtectedRoute component={VisionDevices} /></Route>
      <Route path="/admin/vision/map"><ProtectedRoute component={VisionMap} /></Route>
      <Route path="/admin/vision/rules"><ProtectedRoute component={VisionRules} /></Route>
      <Route path="/admin/vision/events"><ProtectedRoute component={VisionEvents} /></Route>
      <Route path="/admin/vision/alerts"><ProtectedRoute component={VisionAlerts} /></Route>
      <Route path="/admin/vision/analytics"><ProtectedRoute component={VisionAnalytics} /></Route>
      <Route path="/admin/vision/settings"><ProtectedRoute component={VisionSettings} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => installChunkRecovery(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <Toaster />
        <OfflineStatusBanner />
        <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>}>
          <Router />
        </Suspense>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
