-- Advisor hardening after enterprise Audit/Compliance/Workflow rollout.
-- 1) Trigger-only SECURITY DEFINER helper must not be callable through the Data API.
revoke all on function public.materialize_in_app_notification() from public, anon, authenticated;
grant execute on function public.materialize_in_app_notification() to service_role;

-- 2) Cover foreign keys introduced by Audit, Compliance, and Workflow modules.
create index if not exists audit_findings_action_id_idx on public.audit_findings(action_id);
create index if not exists audit_findings_created_by_idx on public.audit_findings(created_by);
create index if not exists audit_findings_owner_user_id_idx on public.audit_findings(owner_user_id);
create index if not exists audit_findings_verified_by_idx on public.audit_findings(verified_by);
create index if not exists audit_programs_created_by_idx on public.audit_programs(created_by);
create index if not exists audit_programs_lead_auditor_user_id_idx on public.audit_programs(lead_auditor_user_id);
create index if not exists compliance_evidence_uploaded_by_idx on public.compliance_evidence(uploaded_by);
create index if not exists hse_workflow_events_created_by_idx on public.hse_workflow_events(created_by);
create index if not exists hse_workflow_links_created_by_idx on public.hse_workflow_links(created_by);
create index if not exists hse_workflows_created_by_idx on public.hse_workflows(created_by);
create index if not exists hse_workflows_owner_user_id_idx on public.hse_workflows(owner_user_id);
create index if not exists legal_requirements_action_id_idx on public.legal_requirements(action_id);
create index if not exists legal_requirements_created_by_idx on public.legal_requirements(created_by);
create index if not exists legal_requirements_owner_user_id_idx on public.legal_requirements(owner_user_id);
