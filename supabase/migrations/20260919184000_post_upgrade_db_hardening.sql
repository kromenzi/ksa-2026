-- Post-upgrade database hardening and FK performance coverage.

revoke execute on function public.materialize_in_app_notification() from public;
revoke execute on function public.materialize_in_app_notification() from anon;
revoke execute on function public.materialize_in_app_notification() from authenticated;

create index if not exists audit_findings_action_id_idx on public.audit_findings(action_id) where action_id is not null;
create index if not exists audit_findings_created_by_idx on public.audit_findings(created_by);
create index if not exists audit_findings_owner_user_id_idx on public.audit_findings(owner_user_id) where owner_user_id is not null;
create index if not exists audit_findings_verified_by_idx on public.audit_findings(verified_by) where verified_by is not null;

create index if not exists audit_programs_created_by_idx on public.audit_programs(created_by);
create index if not exists audit_programs_lead_auditor_idx on public.audit_programs(lead_auditor_user_id) where lead_auditor_user_id is not null;

create index if not exists compliance_evidence_uploaded_by_idx on public.compliance_evidence(uploaded_by) where uploaded_by is not null;

create index if not exists hse_workflow_events_created_by_idx on public.hse_workflow_events(created_by) where created_by is not null;
create index if not exists hse_workflow_links_created_by_idx on public.hse_workflow_links(created_by);
create index if not exists hse_workflows_created_by_idx on public.hse_workflows(created_by);
create index if not exists hse_workflows_owner_user_id_idx on public.hse_workflows(owner_user_id) where owner_user_id is not null;

create index if not exists legal_requirements_action_id_idx on public.legal_requirements(action_id) where action_id is not null;
create index if not exists legal_requirements_created_by_idx on public.legal_requirements(created_by);
create index if not exists legal_requirements_owner_user_id_idx on public.legal_requirements(owner_user_id) where owner_user_id is not null;
