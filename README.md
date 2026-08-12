# ABDULKAREM SAFETY BOARD

نظام متكامل لإدارة السلامة المهنية والصحة والبيئة (HSE)، مصمم لتسهيل عمليات التفتيش، إدارة التصاريح، متابعة المخالفات، إدارة معدات الوقاية، المراقبة بالكاميرات الذكية (Vision AI)، وإدارة القوى العاملة مع لوحة قياس مؤشرات أداء تفاعلية. يهدف النظام إلى تمكين إدارات السلامة من تحقيق أعلى معايير الامتثال التنظيمي والمراقبة الفورية.

## 1. SYSTEM OVERVIEW

- **الهدف من النظام**: توفير منصة مركزية رقمية متكاملة لمتابعة كافة أنشطة السلامة والصحة المهنية (HSE).
- **طبيعة النظام**: نظام إداري داخلي متكامل (Admin Dashboard) وواجهة تقارير عامة.
- **المستخدمين المستهدفين**: مدراء السلامة، مفتشي السلامة، إدارات الموارد البشرية، المقاولين، ومسؤولي المواقع الصناعية.
- **الاستخدامات الرئيسية**:
  - تتبع التراخيص والمخالفات
  - إدارة تصاريح العمل الساخنة والباردة (PTW)
  - مراقبة معدات مكافحة الحريق وأنظمة الإنذار (LOTO / Fire Protection)
  - إدارة سجلات الموظفين والتدريب والكفاءات (Competency Matrix)
  - المراقبة الحية عبر تقنيات الذكاء الاصطناعي (AI Vision Safety)
  - التقارير الموحدة الرسمية (Enterprise Reports) والتصعيد المباشر.
- **بيئة التشغيل**: تطبيق ويب (React/Vite + Tailwind CSS).

---

## 2. COMPLETE SYSTEM MODULE MAP

الهيكل التنظيمي للوحدات الفعلية المعمول بها في النظام:

```text
/admin
├── dashboard            (Overview & Analytics)
├── workforce            (Employees, Trainings, Matrix, Competency, Licenses, Equipment Auth)
├── safety               (Incidents, Risk Assessment, Inspections, Audits, LOTO, Safety Pyramid)
├── operations           (Permits, Forms, NCR)
├── escalations          (Escalation Dashboard, History, Matrix)
├── vision               (AI Dashboard, Live, Cameras, Devices, Map, Rules, Events, Analytics)
├── compliance           (Compliance Management)
├── assets               (Assets, Visitors, Emergency, Fire Protection)
├── reports-documents    (Files, Contracts, Enterprise Reports, Safety Signs, Invoices)
├── communication        (Safety Champions, Sections, Posts, Inbox, Email Settings, Notification Rules)
└── administration       (Users & Roles, Activity Log, Plants, Integrations, System Settings)
```

---

## 3. MAIN SECTIONS

1. **Dashboard**: اللوحة الرئيسية لمؤشرات الأداء (KPIs).
2. **Workforce Management**: إدارة القوى العاملة (الموظفين، التدريب، مصفوفة الكفاءة، التراخيص).
3. **Safety Operations**: عمليات السلامة (تقييم المخاطر 5x5، الحوادث، التصاريح، المخالفات).
4. **AI Vision & Monitoring**: المراقبة الحية وتقنيات الذكاء الاصطناعي (Edge Devices).
5. **Assets & Emergency**: أصول ومرافق السلامة (إدارة الطوارئ، الزوار، أنظمة مكافحة الحريق).
6. **Reports & Documents**: التقارير، المستندات، اللافتات الإرشادية، والعقود.
7. **Communication & Culture**: نشر ثقافة السلامة (Gamification، المنشورات، الإشعارات).
8. **Administration**: الإعدادات وسجلات النظام (Audit Logs, Roles).

---

## 4. SUBMODULES / BRANCHES

**ESP Safety Vision**
├── Dashboard
├── Live Monitoring
├── Camera Management
├── Edge Devices (ESP)
├── Factory Map
├── Safety Rules
├── Safety Events
├── Analytics
└── Settings

**Core Safety & Operations**
├── Dashboard
├── Employees & Safety
├── Safety Reports (SOR)
├── Incidents & Near Miss (RCA)
├── Risk Assessment (5x5)
├── Non-Conformance (NCR)
├── Safety Pyramid
├── Escalations (Dashboard, History, Matrix)
├── Safety Inspections
├── Audits & ISO
├── Compliance Dashboard
├── Lockout Tagout (LOTO)
├── Permits (PTW)
├── Licenses
├── Training & Competency
├── Equipment Authorization
└── Forklift Auth

**Assets, Visitors & Emergency**
├── Safety Assets
├── Visitors & Induction
├── Emergency & Drills
└── Fire Protection

**Enterprise Reports**
├── Documents
├── Safety Signs
├── Enterprise Reports 300DPI
├── Contracts
├── Forms
└── Invoices

**Communication & Culture**
├── Safety Champions (Gamification)
├── Sections
├── Posts
├── Inbox
├── Email Settings
└── Alert Rules

---

## 5. COMPLETE ROUTE MAP

| Route | Page / Component | Purpose | Parent Module |
| --- | --- | --- | --- |
| `/admin/dashboard` | `AdminDashboard` | Main System Dashboard | Dashboard |
| `/admin/vision/*` | `VisionDashboard`, `VisionLive`... | AI Camera Monitoring | Vision |
| `/admin/employees` | `AdminEmployees` | Directory & Records | Workforce |
| `/admin/trainings` | `AdminTrainings` | Safety Training | Workforce |
| `/admin/training-matrix`| `AdminTrainingMatrix` | Skills & Training Matrix | Workforce |
| `/admin/competency` | `AdminCompetency` | Eval & Competency | Workforce |
| `/admin/licenses` | `AdminLicenses` | Permits & ID Cards | Workforce |
| `/admin/equipment-auth`| `AdminEquipmentAuth` | Heavy Machinery Auth | Workforce |
| `/admin/incidents` | `AdminIncidents` | Incident/Near Miss | Safety |
| `/admin/risk-assessment`| `AdminRiskAssessment`| Risk Matrix & JSA | Safety |
| `/admin/ncr` | `AdminNCR` | Non-Conformance | Operations |
| `/admin/inspections` | `AdminInspections` | Checklists | Safety |
| `/admin/audits` | `AdminAudits` | Internal/ISO Audits | Safety |
| `/admin/safety-pyramid` | `AdminSafetyPyramid` | Bird's Triangle | Safety |
| `/admin/loto` | `AdminLoto` | Lockout/Tagout | Safety |
| `/admin/permits` | `AdminPermits` | PTW Work Flow | Operations |
| `/admin/escalations` | `EscalationDashboard` | Issue Escalation | Safety |
| `/admin/compliance` | `AdminCompliance` | Standards tracking | Safety |
| `/admin/fire-protection`| `AdminFireProtection`| Fire Systems Mgmt | Assets |
| `/admin/assets` | `AdminAssets` | Equipment Registry | Assets |
| `/admin/visitors` | `AdminVisitors` | Site Inductions | Assets |
| `/admin/emergency` | `AdminEmergency` | Drills & Evacuation | Assets |
| `/admin/files` | `AdminFiles` | Document Library | Documents |
| `/admin/safety-signs` | `AdminSafetySigns` | Printable Signage | Documents |
| `/admin/enterprise-reports`| `AdminEnterpriseReports`| 300DPI Official Docs| Documents |
| `/admin/gamification` | `AdminGamification` | Safety Champions | Communication |
| `/admin/users` | `AdminUsers` | Role Management | Admin |
| `/admin/activity` | `AdminActivityLogs` | Audit Trails | Admin |
| `/admin/settings` | `AdminSettings` | System Configuration | Admin |

---

## 6. NAVIGATION STRUCTURE

يتم الاعتماد على `AdminLayout.tsx` حيث يتواجد `Sidebar` جانبي، يحتوي على مجموعات تنقل مصنفة ومحمية بناءً على الصلاحيات `hasPermission(module, action)`. 
- القائمة تدعم العرض المصغر (Collapsed) على شاشات الديسكتوب، والعرض عبر `Sheet` في وضع الموبايل.
- جميع الروابط المعطلة أو المكررة (كـ Safety Signs) تم إصلاحها وتوحيد مساراتها.
- إضافة ميزة اختصار لوحة المفاتيح `Ctrl+K` لفتح البحث (إن تم تنفيذه).

---

## 7. MODULE SPECIFICATIONS (Examples)

### Vision AI Module (`/admin/vision/*`)
- **Purpose**: مراقبة حية للمنشأة باستخدام كاميرات متصلة (أجهزة حافة ESP) مدعومة بالذكاء الاصطناعي لاكتشاف غياب خوذة الرأس أو السترة، واختراق المناطق المحظورة.
- **Features**: Live Monitoring, Heatmaps, Rules Configuration, Automated Alerts.

### Licenses Module (`/admin/licenses`)
- **Purpose**: إصدار وتجديد بطاقات التراخيص لمشغلي المعدات الثقيلة وللمقاولين.
- **Features**: تصميم بطاقة وجهين تفاعلية (Front/Back)، مولد باركود QR، تتبع تواريخ الانتهاء.

### Safety Signs (`/admin/safety-signs`)
- **Purpose**: توليد، طباعة، وتصدير اللافتات الإرشادية والتحذيرية بصيغ PDF أو Word.
- **Features**: Export to Docx, PDF Attachments, Category specific filters.

### Escalations Matrix (`/admin/escalations`)
- **Purpose**: مصفوفة تصعيد الحوادث لتنبيه المستويات الإدارية آلياً حسب درجة الخطورة.
- **Features**: History Log, SLA tracking, Matrix Rules.

---

## 8. DATA ARCHITECTURE

يعتمد النظام بالكامل على **تخزين محلي (Client-Side Storage)** كبيئة تجريبية واستعراضية (Prototype/Preview):
- **Primary Database**: `DataContext` (React Context) in memory.
- **Persistence**: `localStorage` (for User Settings, Theme, Auth token).
- **Files**: Blob / Base64 URLs للملفات المحملة واللافتات.
*لا يوجد خادم Backend متصل حالياً بقاعدة بيانات حقيقية.*

---

## 9. SINGLE SOURCE OF TRUTH

- **Data Context (`src/lib/data-context.tsx`)**: يعتبر هو مدير الحالة الرئيسي.
  - Users, Settings, Reports, AI Alerts, and Auth Status يتم جلبهم أو تخزينهم داخله.
- بعض الصفحات المعقدة تمتلك ملفات حالة خاصة (مثل `vision-store.ts` و `fire-protection-store.ts`) لكنها تخضع للبيئة المحلية.

---

## 10. DATA RELATIONSHIPS

- **User / Employee** ↔ **Training Matrix**: حضور وإتمام متطلبات السلامة.
- **Safety Rule** ↔ **Vision Event**: الكاميرا تلتقط مخالفة بناءً على قاعدة محددة (مثل: No Hardhat).
- **Asset** ↔ **Inspection**: فحص معدات الإطفاء وتوثيق حالة الجاهزية.

---

## 11. ANALYTICS ARCHITECTURE

- **Dashboard KPIs**: تُحسب تلقائياً من قوائم Context (الموظفين، الحوادث المفتوحة، التصاريح).
- **Charts**: يتم استخدام مكتبة `recharts` لعرض الرسوم البيانية.
- **Live Updates**: نظراً لاستخدام `React Context`، أي تغيير في البيانات ينعكس مباشرة على الـ Dashboard.

---

## 12. DASHBOARD SPECIFICATION (`/admin/dashboard`)

- **Widget Name**: Safety Overview, Incidents by Status, Inspections Chart, Open NCRs.
- **Data Source**: Array filters inside `AdminDashboard` component.
- **Alerts**: قائمة بأحدث الإشعارات والتصاريح التي تنتهي صلاحيتها.

---

## 18. BACKUP & RESTORE ARCHITECTURE

**النظام لا يملك وحدة Backup سحابية حقيقية حالياً**. توجد أداة مبدئية `backup-service.ts` لعمل Dump لبيانات `localStorage` وتحميلها كملف `.json` محلي، ولكنها ليست بديلاً عن قاعدة بيانات حقيقية. 

---

## 19. SECURITY ARCHITECTURE

- **Authentication**: الاعتماد على حالة `isAuthenticated` داخل `DataContext`.
- **Authorization**: تطبيق `ProtectedRoute` على جميع المسارات. دالة `hasPermission` في الـ Context تحدد إمكانية وصول المستخدم.
- **Theme/Defaults**: الوضع الداكن (Dark) والثيم الأخضر (Emerald) هما الافتراضيان.

---

## 20. FILE STRUCTURE

```text
src/
├── components/
│   ├── layouts/     (AdminLayout, Navigation)
│   ├── ui/          (shadcn reusable buttons, dialogs, etc)
│   └── ...
├── lib/             (Data context, Backup service, utils, stores)
├── pages/
│   └── admin/       (All isolated feature components)
│       ├── escalations/
│       ├── vision/
│       ├── ncr/
│       └── ...
├── App.tsx          (Global Router Configuration)
├── main.tsx         (Vite Entry point)
└── types.ts         (Shared TypeScript models)
```

---

## 21. TECHNOLOGY STACK

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form
- **State Management**: React Context, Zustand (for sub-stores like vision-store)
- **Document Export**: docx, jspdf (Client-side rendering)

---

## 22. ENVIRONMENT SETUP

```bash
# تثبيت الاعتماديات
npm install

# تشغيل بيئة التطوير محلياً (يستخدم البورت 3000)
npm run dev

# بناء المشروع لبيئة الإنتاج
npm run build
```

---

## 23. ENVIRONMENT VARIABLES

```env
VITE_SITE_NAME=ABDULKAREM SAFETY BOARD
```

---

## 24. DEVELOPMENT / PRODUCTION

- **Development**: يعتمد على Mock Data و Local Storage لتسهيل بناء الواجهات واختبار التصميم.
- **Production**: النظام حالياً عبارة عن (Frontend-Only Application). للإنتاج، يحتاج إلى ربط مع Backend Services عبر واجهة برمجة (RESTful API / GraphQL) وقاعدة بيانات مثل PostgreSQL أو Firebase.

---

## 25. PERMISSIONS MATRIX

يتم إسناد الصلاحيات افتراضياً حسب دور المستخدم `user.role` (Admin, Manager, Editor, Viewer). الـ Admin يملك وصولاً كاملاً لكل شيء.

---

## 29. ARCHITECTURE CLEANUP

### Duplicates Removed
- تم تنقيح الـ `Sidebar` في `admin-layout.tsx` وإزالة الروابط المعطلة والمتكررة (مثل `safety-signs` المكرر).
- تم التحقق من `Router` داخل `App.tsx` وتوثيق ومزامنة جميع المسارات.
- تحديث التنسيق الافتراضي وحفظه كـ `dark` و `emerald`.

---

## 30. KNOWN LIMITATIONS

- **Data Persistence**: أي بيانات مضافة قد تُمحى بمسح بيانات المتصفح (Clear Cache/Storage).
- **Backend Features**: رفع الملفات الحقيقي، رسائل البريد (SMTP)، وتنبيهات الكاميرا تعتمد على محاكاة ولا يوجد خادم حقيقي يعالجها في الخلفية.

---

## 32. CHANGELOG

### 2026-08-11
- **Fixed**: إصلاح `bun.lock` واجتياز فحوصات الـ Linter و الـ Build.
- **Updated**: تعيين الوضع الداكن (Dark) والأخضر (Emerald) كإعدادات افتراضية.
- **Cleaned**: توثيق مسارات النظام بالكامل، تصحيح الـ Sidebar، وتنظيم الـ Router.
- **Documented**: إنشاء ملف `README.md` النهائي استناداً لهيكلة المشروع المحدثة.

---

## Development Status:
🟢 **Development Ready (Frontend-Only)**
#   s a f e t y - b o a r d  
 #   s a f e t y - b o a r d  
 