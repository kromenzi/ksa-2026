# Reports → NCR → Escalation workflow

Production workflow contract:

1. A safety report is created through the API and persisted.
2. A report can be classified as NCR when a nonconformity is confirmed.
3. NCR creation must reference the source report (`source_report_id`) and preserve severity, owner, due date and status.
4. Escalation is created only from an open NCR/report condition that meets a configured severity or overdue rule.
5. Escalation must reference its source (`source_type`, `source_id`) and record assignee, reason, severity, status and timestamps.
6. Closing an NCR is not allowed while required corrective-action evidence is missing.
7. Closing an escalation requires resolution notes and records the actor/time.
8. UI status badges must be derived from persisted API responses; local button state is never evidence of success.
9. Failed API/database operations must surface as errors and must not mutate local success state.
10. Every create/update/escalate/close operation should be auditable.

Acceptance test:
REPORT CREATED → NCR CREATED → ESCALATION CREATED → ASSIGNED → CORRECTIVE ACTION → VERIFIED → CLOSED → AUDIT EVENT.
