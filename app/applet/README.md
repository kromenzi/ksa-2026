# ABDULKAREM SAFETY BOARD

نظام متكامل لإدارة السلامة المهنية والصحة والبيئة (HSE)، مصمم لتسهيل عمليات التفتيش، إدارة التصاريح، متابعة المخالفات، وإدارة معدات الوقاية، مع لوحة قياس مؤشرات الأداء بشكل مباشر. يهدف النظام إلى تمكين إدارات السلامة في المنشآت الصناعية والمؤسسات من تحقيق أعلى معايير الامتثال والمراقبة.

## 1. SYSTEM OVERVIEW

- **الهدف من النظام**: توفير منصة مركزية رقمية لمتابعة كافة أنشطة السلامة والصحة المهنية.
- **طبيعة النظام**: نظام إداري داخلي (Admin Dashboard) وواجهة تقارير عامة.
- **المستخدمين المستهدفين**: مدراء السلامة، مفتشي السلامة، إدارات الموارد البشرية، المقاولين، ومسؤولي المواقع.
- **الاستخدامات الرئيسية**:
  - تتبع التراخيص والمخالفات
  - إدارة تصاريح العمل الساخنة والباردة
  - مراقبة معدات مكافحة الحريق وأنظمة الإنذار
  - إدارة السجلات والتدريب والكفاءات للموظفين
  - التقارير الموحدة (Enterprise Reports)
  - تحليلات وكاميرات المراقبة بالذكاء الاصطناعي (Vision AI)
- **بيئة التشغيل**: تطبيق ويب (React/Vite + Tailwind CSS).

---

## 2. COMPLETE SYSTEM MODULE MAP

الهيكل التنظيمي للوحدات الفعالة داخل النظام:

```text
/admin
├── dashboard (Overview & Analytics)
├── core (Users, Sections, Plants)
├── documents (Files, Contracts, Invoices)
├── reports (Daily/Weekly/Monthly Reports, Safety Signs, Enterprise Reports)
├── operations (Permits, Forms, NCR)
├── workforce (Employees, Trainings, Matrix, Competency, Licenses, Equipment Auth)
├── safety (Incidents, Risk Assessment, Inspections, Audits, LOTO, Safety Pyramid)
├── assets (Assets, Visitors, Emergency, Fire Protection)
├── compliance (Compliance Management)
├── communication (Email Settings, Inbox, Mail Config)
├── automation (Integrations, Notification Rules, Escalations, Gamification)
├── vision (AI Camera Integration & Analytics)
└── settings (System Settings, Activity Logs)
```

---

## 3. MAIN SECTIONS

- **Dashboard**: لوحة القيادة والمؤشرات.
- **Workforce Management**: إدارة الموظفين، التدريب، ومصفوفة الكفاءات، والتراخيص.
- **Safety Operations**: الحوادث، التفتيش، تقييم المخاطر، الـ NCR، وتصاريح العمل.
- **Reports & Documents**: الملفات، العقود، لافتات السلامة، وتقارير المؤسسة (300DPI).
- **Assets & Fire Protection**: إدارة الأصول، ومعدات الحريق.
- **AI Vision**: المراقبة الحية، تنبيهات الذكاء الاصطناعي، وإدارة الكاميرات.
- **Settings & Config**: الإعدادات، التكامل، والتنبيهات.

---

## 4. SUBMODULES / BRANCHES

```text
Reports & Documents
├── Files
├── Contracts
├── Enterprise Reports
└── Safety Signs

Workforce
├── Employees
├── Trainings
├── Training Matrix
├── Competency
├── Licenses
└── Equipment Auth

Fire Protection
├── Fire Extinguishers
├── Fire Pumps
├── Fire Alarms
├── Hydrants
└── Inspections

AI Vision
├── Dashboard
├── Live
├── Cameras
├── Devices
├── Map
├── Rules
├── Events
├── Alerts
├── Analytics
└── Settings
```

---

## 5. COMPLETE ROUTE MAP

| Route | Purpose | Parent Module | Permissions |
| --- | --- | --- | --- |
| `/admin/dashboard` | Dashboard and Main KPIs | Overview | `dashboard:read` |
| `/admin/users` | Manage System Users | Core | `users:read` |
| `/admin/employees` | Employee Directory | Workforce | `workforce:read` |
| `/admin/trainings` | Safety Training Records | Workforce | `workforce:read` |
| `/admin/training-matrix` | Organization Training Matrix | Workforce | `workforce:read` |
| `/admin/competency` | Competency Evaluations | Workforce | `workforce:read` |
| `/admin/licenses` | ID and Safety Licenses | Workforce | `workforce:read` |
| `/admin/equipment-auth` | Heavy Equipment Authorizations | Workforce | `workforce:read` |
| `/admin/ncr` | Non-Conformance Reports | Operations | `ncr:read` |
| `/admin/permits` | Safety Permits (Hot/Cold Work) | Operations | `permits:read` |
| `/admin/forms` | Custom Form Builder & Submissions| Operations | `forms:read` |
| `/admin/incidents` | Incident Reporting & Tracking | Safety | `incidents:read` |
| `/admin/risk-assessment` | JSA & Risk Analysis | Safety | `safety:read` |
| `/admin/inspections` | Checklists & Inspections | Safety | `inspections:read` |
| `/admin/audits` | Internal/External Audits | Safety | `audits:read` |
| `/admin/loto` | Lockout/Tagout Procedures | Safety | `loto:read` |
| `/admin/safety-pyramid` | Bird's Safety Pyramid | Safety | `safety:read` |
| `/admin/files` | Document Library | Documents | `documents:read` |
| `/admin/contracts` | Contractor Agreements | Documents | `documents:read` |
| `/admin/safety-signs` | Manage printable Safety Signs | Documents | `reports:read` |
| `/admin/enterprise-reports`| High-Res Formal Reports | Reports | `reports:read` |
| `/admin/fire-protection` | Fire Fighting Equipments | Assets | `assets:read` |
| `/admin/assets` | General Equipment & Assets | Assets | `assets:read` |
| `/admin/vision/*` | AI Vision Tracking | Vision | `vision:read` |
| `/admin/settings` | System Settings | Settings | `settings:read` |

---

## 6. NAVIGATION STRUCTURE

يتم الاعتماد على `AdminLayout.tsx` حيث يتواجد `Sidebar` يحتوي على قائمة مبوبة حسب الصلاحيات:

- **الرئيسية (Dashboard)**
- **القوة العاملة (Workforce)**: (الموظفون، التدريب، التراخيص، إلخ)
- **العمليات (Operations)**: (التصاريح، النماذج، المخالفات)
- **السلامة (Safety)**: (الحوادث، التفتيش، هرم السلامة)
- **التقارير والمستندات (Documents)**: (الملفات، العقود، اللافتات، تقارير المؤسسة)
- **المرافق (Assets & Facilities)**: (معدات الإطفاء، الأصول)
- **المراقبة الذكية (AI Vision)**: (الكاميرات، التحليلات، التنبيهات)
- **الإعدادات (Settings)**: (المستخدمين، التكامل، السجلات)

*ملاحظة: تم تنظيف الروابط المكررة ومزامنة `safety-signs` تحت المستندات والتقارير ضمن عمليات التنظيف.*

---

## 7. MODULE SPECIFICATIONS (Examples)

### Safety Signs Module
- **Purpose**: إنشاء، تخصيص، تحميل وطباعة لافتات السلامة. إمكانية إرفاق ملف PDF أو Word.
- **Route**: `/admin/safety-signs`
- **Data**: IndexedDB/Context (`safetySigns`).
- **Features**: PDF Export, MS Word Export, Attachments, Category Filtering.

### Licenses Module
- **Purpose**: إصدار وتجديد وطباعة بطاقات وتراخيص السلامة (ID Cards / Work Permits).
- **Route**: `/admin/licenses`
- **Features**: تصميم بطاقة وجهين، QR Code، تنبيهات الانتهاء.

### Fire Protection Module
- **Purpose**: متابعة أصول مكافحة الحرائق وتواريخ الفحص.
- **Route**: `/admin/fire-protection`
- **Data**: طفايات الحريق، المضخات، الإنذار.

---

## 8. DATA ARCHITECTURE

يعتمد النظام بالكامل على **تخزين محلي (Client-side Data Layer)** في بيئة الـ Preview:

- **Primary Storage**: `localStorage` (for settings/auth) and In-Memory Data Context.
- **File System**: Base64 encoded URLs via local file readers (for uploads/images/pdfs).
- **Context API**: `DataContext` يدير الجلسة، والبيانات المؤقتة للكيانات (Users, Reports, Signs, Forms, etc).
- *النظام حالياً SPA (Single Page Application) ولا يوجد به Backend (Express) مفعل لربط قاعدة بيانات حقيقية ما لم يتم طلب ذلك.*

---

## 9. SINGLE SOURCE OF TRUTH

- **Data Context (`src/lib/data-context.tsx`)**: The primary provider holding states for all entities.
  - `safetySigns` → DataContext
  - `users` → DataContext
  - `reports` → DataContext
  - `documents` → DataContext

---

## 10. DATA RELATIONSHIPS

- **User** ↔ **Reports**: User created the report.
- **Employee** ↔ **Training**: Employee participated in training.
- **Safety Sign** ↔ **Document**: Safety Sign can have a related standard specification document (PDF/Word).

---

## 11. ANALYTICS ARCHITECTURE

- **Data Source**: Context arrays (e.g., `safetySigns`, `reports`, `incidents`).
- **Calculation**: تتم العمليات الحسابية وقت التشغيل (Runtime) في كل صفحة باستخدام دوال الاستنتاج (Filtering, Mapping, Reducing).
- **Charts**: `recharts` library تستقبل البيانات المهيئة بصيغة `data=[{name: "A", value: 10}]`.
- **Dashboards**: تستدعي `useData()` للحصول على الأرقام الحية (Live Counts).

---

## 12. DASHBOARD SPECIFICATION (`/admin/dashboard`)

- **Purpose**: High-level overview of system health.
- **KPI Cards**:
  - إجمالي الموظفين.
  - الحوادث المفتوحة.
  - التراخيص المنتهية.
  - الفحوصات المعلقة.
- **Charts**: 
  - توزيع الحوادث حسب التصنيف (Pie).
  - الفحوصات والإغلاق (Bar).
- **Refresh Behavior**: Real-time via React Context.

---

## 13. DOCUMENTS & REPORTS ARCHITECTURE

- **Files & Contracts**: نظام تحميل (Base64) ومشاركة.
- **Safety Signs**: واجهة مخصصة لإنشاء اللافتات وطباعتها وتصديرها بصيغة Word أو إرفاق PDF.
- **Enterprise Reports**: تقارير رسمية جاهزة للطباعة (300DPI) بتنسيقات ورقية.

---

## 14. FIRE PROTECTION SPECIFICATION

- **Purpose**: تتبع صيانة وفحص طفايات الحريق وأنظمة الإنذار.
- **Data**: جرد المعدات وأماكن تواجدها وحالة الفحص (Passed, Failed, Needs Maintenance).
- **Status**: مؤشرات لونية للحالة الحالية للمعدة.

---

## 15. LICENSES SPECIFICATION

- **Management**: إنشاء رخصة لموظف/معدّة بمدة صلاحية.
- **Visuals**: عرض بطاقة هوية للرخصة مع إمكانية الطباعة.
- **QR**: يتولد رمز QR يحوي تفاصيل الرخصة وموثوقيتها.

---

## 16. TRAINING & COMPETENCY SPECIFICATION

- **Participants**: ربط الموظفين بدورات التدريب.
- **Competency**: تقييم كفاءة كل موظف على مقياس مهارات.
- **Matrix**: جدول مصفوفة يوضح الدورات المطلوبة لكل قسم ومستوى إنجازها.

---

## 18. BACKUP & RESTORE ARCHITECTURE

**النظام لا يملك وحدة Backup/Restore مصممة حالياً ضمن DataContext، البيانات تعتمد على استمرار جلسة المتصفح (Browser Session) أو Mock Data في الوقت الحالي.** يجب تفعيل Firebase أو LocalStorage Persistence كامل لضمان وجود نسخ احتياطي.

---

## 19. SECURITY ARCHITECTURE

- **Authentication**: `isAuthenticated` state in `DataContext`.
- **Authorization**: `hasPermission(module, action)` دالة تتحقق من دور المستخدم الحالي وصلاحياته قبل عرض الصفحات أو الأزرار.
- **Roles**: Admin, Manager, Editor, Viewer.
- *جميع آليات الأمان تعمل على مستوى الواجهة (Client-side) ويجب تطبيقها على الخادم في مرحلة الإنتاج الحقيقي.*

---

## 20. FILE STRUCTURE

```text
src/
├── components/
│   ├── layouts/     (AdminLayout, Sidebar, Navbar)
│   ├── ui/          (shadcn components: button, dialog, form, etc)
│   └── ...
├── lib/
│   ├── data-context.tsx  (The State Manager)
│   └── utils.ts
├── pages/
│   ├── admin/       (All submodules: safety-signs, users, licenses...)
│   ├── public-report.tsx
│   └── index.tsx    (Landing page)
├── App.tsx          (React Router definitions)
├── main.tsx         (Vite Entry)
└── types.ts         (TypeScript Interfaces)
```

---

## 21. TECHNOLOGY STACK

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Charts**: Recharts
- **Routing**: wouter
- **Data Management**: React Context (State)
- **PDF/File Export**: Blob/URL Object mapping (Client-side export to MS Word/PDF)

---

## 22. ENVIRONMENT SETUP

لتشغيل المشروع محلياً:

```bash
# تثبيت الحزم
npm install
# تشغيل التطبيق في بيئة التطوير
npm run dev
# البناء للإنتاج
npm run build
```

---

## 23. ENVIRONMENT VARIABLES

```env
VITE_API_URL=
```
لا توجد مفاتيح سرية (Secrets) في النسخة الحالية لتطبيق العميل.

---

## 25. PERMISSIONS MATRIX

| Module | Admin | Manager | Editor | Viewer |
| --- | --- | --- | --- | --- |
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | - | - | - |
| Reports | ✓ | ✓ | ✓ | ✓ |
| Users | ✓ | - | - | - |
| (Other modules based on dynamic assignments) |

---

## 29. ARCHITECTURE CLEANUP (Audits performed)

- **Duplicates Removed**: تم التحقق من تكرار روابط `Safety Signs` وتم إصلاحها في التوجيه وقائمة الـ Sidebar.
- **Components Consolidated**: تم دمج وظائف رفع الملفات وتصدير Word في `safety-signs/index.tsx`.
- **Routes Cleaned**: المسارات المكررة تم تقليمها والتأكد من مطابقتها للتسميات الفعلية.
- **Package Integrity**: تم مزامنة `bun.lock` واجتياز اختبار التجميع والبناء والتنسيق (`npm run build`, `npm run lint`).

---

## 30. KNOWN LIMITATIONS

- **Data Persistence**: البيانات تحفظ في الذاكرة (Memory) وقد تضيع عند تحديث الصفحة ما لم يتم حفظها في LocalStorage بالكامل أو ربطها بـ Backend حقيقي (مثل Firebase أو Cloud SQL).
- **Backend**: لا يوجد خادم (Node.js/Express) ولا قاعدة بيانات حقيقية (Database).

---

## 32. CHANGELOG

### 2026-08-11
- **Added**: إمكانية إرفاق مستندات (PDF / Word) وتصدير لافتات السلامة بصيغة Word.
- **Fixed**: إصلاح `bun.lock` وبناء المشروع.
- **Cleaned**: تنظيف الـ Sidebar وإزالة الوصلات المكررة أو المعطوبة.
- **Updated**: إنشاء توثيق النظام `README.md` بالاعتماد على الهيكل الفعلي.

---

## Development Status:
🟢 **Development Ready** (For Frontend Prototyping and Demo)
*Needs persistent backend for production deployment.*
