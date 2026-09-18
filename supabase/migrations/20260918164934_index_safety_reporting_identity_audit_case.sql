create index if not exists idx_safety_reporting_identity_audit_case_created
on public.safety_reporting_identity_audit(case_id, created_at desc);
