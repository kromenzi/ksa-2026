# Production Reality Audit

## Rule
A feature is considered real only when UI -> API -> persistent/service backend -> verified response -> UI refresh.

## Runtime policy
- Do not display `Active`, `LIVE`, `Connected`, `Success`, or AI detection states from local UI state alone.
- External services must expose an explicit `offline` / `not configured` state when unreachable.
- Camera/AI status must come from gateway health and stream metadata.
- CRUD actions must fail visibly when the API returns a non-2xx response.
- Dashboard counters must come from backend data, never hard-coded demo values.

## Verification checklist
- Authentication/session cookie
- Users, roles, permissions
- Sections/content/forms
- Safety reports/NCR
- Documents
- Departments/employees/routing
- Settings/email
- Activity logs
- Cameras/gateway/discovery
- ESP AI detections/zones/alerts
- Reports/export

This file is a production acceptance contract; it is not a claim that every external service is currently connected.
