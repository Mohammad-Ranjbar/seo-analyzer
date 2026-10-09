#!/usr/bin/env -S node
import {
  checkExpression,
  col,
  fn,
  lit,
  Migration,
  MigrationCLI,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';
import type { Contract as End } from '../../snapshots/aa180e44b4d4531e04bd365e22ade3d425770bc6500e979b9e5b3aab1343d4dd/contract';
import endContract from '../../snapshots/aa180e44b4d4531e04bd365e22ade3d425770bc6500e979b9e5b3aab1343d4dd/contract.json' with {
  type: 'json',
};

const tenantSecurityBootstrap = `
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_organization_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $tenant$ SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid $tenant$;

CREATE OR REPLACE FUNCTION app.current_workspace_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $tenant$ SELECT NULLIF(current_setting('app.workspace_id', true), '')::uuid $tenant$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $tenant$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $tenant$;

CREATE OR REPLACE FUNCTION app.current_api_key_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $tenant$ SELECT NULLIF(current_setting('app.api_key_id', true), '')::uuid $tenant$;

DO $tenant$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'seo_analyzer_app') THEN
    CREATE ROLE seo_analyzer_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'seo_analyzer_auth') THEN
    CREATE ROLE seo_analyzer_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'seo_analyzer_worker') THEN
    CREATE ROLE seo_analyzer_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$tenant$;

CREATE OR REPLACE FUNCTION app.set_request_context(
  organization_id uuid, workspace_id uuid, user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $tenant$
BEGIN
  IF organization_id IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'organization_id and user_id are required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_memberships.organization_id = set_request_context.organization_id
      AND organization_memberships.user_id = set_request_context.user_id
      AND organization_memberships.status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is not an active organization member';
  END IF;
  IF workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.workspaces
    JOIN public.workspace_members ON workspace_members.workspace_id = workspaces.id
    JOIN public.organization_memberships
      ON organization_memberships.id = workspace_members.organization_membership_id
    WHERE workspaces.id = set_request_context.workspace_id
      AND workspaces.organization_id = set_request_context.organization_id
      AND workspaces.status = 'active'
      AND workspace_members.status = 'active'
      AND organization_memberships.user_id = set_request_context.user_id
      AND organization_memberships.status = 'active'
  ) THEN
    RAISE EXCEPTION 'user is not an active workspace member';
  END IF;
  PERFORM set_config('app.organization_id', organization_id::text, true);
  PERFORM set_config('app.workspace_id', COALESCE(workspace_id::text, ''), true);
  PERFORM set_config('app.user_id', user_id::text, true);
  PERFORM set_config('app.api_key_id', '', true);
END
$tenant$;

CREATE OR REPLACE FUNCTION app.set_api_key_context(api_key_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $tenant$
DECLARE key_record record;
BEGIN
  SELECT organization_id, workspace_id INTO key_record
  FROM public.api_keys
  WHERE id = api_key_id AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > statement_timestamp());
  IF NOT FOUND THEN RAISE EXCEPTION 'api key is not active'; END IF;
  PERFORM set_config('app.organization_id', key_record.organization_id::text, true);
  PERFORM set_config('app.workspace_id', key_record.workspace_id::text, true);
  PERFORM set_config('app.user_id', '', true);
  PERFORM set_config('app.api_key_id', api_key_id::text, true);
END
$tenant$;

CREATE OR REPLACE FUNCTION app.set_worker_context(organization_id uuid, workspace_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $tenant$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = workspace_id
      AND workspaces.organization_id = set_worker_context.organization_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'workspace is not active in organization';
  END IF;
  PERFORM set_config('app.organization_id', organization_id::text, true);
  PERFORM set_config('app.workspace_id', workspace_id::text, true);
  PERFORM set_config('app.user_id', '', true);
  PERFORM set_config('app.api_key_id', '', true);
END
$tenant$;

REVOKE ALL ON FUNCTION app.set_request_context(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.set_api_key_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.set_worker_context(uuid, uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA public, app TO seo_analyzer_app, seo_analyzer_auth, seo_analyzer_worker;
GRANT EXECUTE ON FUNCTION app.current_organization_id(), app.current_workspace_id(), app.current_user_id(), app.current_api_key_id() TO seo_analyzer_app, seo_analyzer_auth, seo_analyzer_worker;
GRANT EXECUTE ON FUNCTION app.set_request_context(uuid, uuid, uuid), app.set_api_key_context(uuid) TO seo_analyzer_app;
GRANT EXECUTE ON FUNCTION app.set_worker_context(uuid, uuid) TO seo_analyzer_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seo_analyzer_app, seo_analyzer_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seo_analyzer_app, seo_analyzer_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, user_contacts, user_credentials, otp_challenges, auth_sessions TO seo_analyzer_auth;

DO $tenant$
DECLARE table_name text;
BEGIN
  FOR table_name IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$tenant$;
`;

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'action_item_status_history',
        columns: [
          col('action_item_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('changed_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('changed_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('from_status', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('to_status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'action_item_status_history_pkey' }),
          checkExpression(
            'managed_action_item_status_history_change_check_4cca1fbe',
            '((from_status IS NULL) OR ((from_status)::text <> (to_status)::text))',
          ),
          checkExpression(
            'managed_action_item_status_history_from_check_638558c7',
            "((from_status IS NULL) OR ((from_status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))",
          ),
          checkExpression(
            'managed_action_item_status_history_to_check_09386221',
            "((to_status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'action_item_verifications',
        columns: [
          col('action_item_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('crawl_run_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('evidence', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('verification_status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('verified_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'action_item_verifications_pkey' }),
          checkExpression(
            'managed_action_item_verifications_status_check_1f0dfb92',
            "((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'fixed'::character varying, 'not_fixed'::character varying, 'regressed'::character varying, 'not_applicable'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'action_items',
        columns: [
          col('closed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fingerprint', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('priority', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('source_finding_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('title', 'character varying(240)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 240 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'action_items_pkey' }),
          checkExpression(
            'managed_action_items_closed_at_check_4d06f605',
            "(((user_status)::text = ANY ((ARRAY['resolved'::character varying, 'dismissed'::character varying])::text[])) = (closed_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_action_items_priority_check_145625b8',
            "((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_action_items_status_check_6476b36b',
            "((user_status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'api_key_permissions',
        columns: [
          col('api_key_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('permission_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['api_key_id', 'permission_id'], { name: 'api_key_permissions_pkey' }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'api_key_project_scopes',
        columns: [
          col('api_key_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['api_key_id', 'seo_project_id'], { name: 'api_key_project_scopes_pkey' }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'api_keys',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('created_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('expires_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('last_used_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('name', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('public_prefix', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('revoked_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('secret_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'api_keys_pkey' }),
          checkExpression(
            'managed_api_keys_expiry_check_0f514f0e',
            '((expires_at IS NULL) OR (expires_at > created_at))',
          ),
          checkExpression(
            'managed_api_keys_revoked_check_36e5eaae',
            '((revoked_at IS NULL) OR (revoked_at >= created_at))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'audit_findings',
        columns: [
          col('audit_rule_version_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('crawl_page_snapshot_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('crawl_run_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('evidence', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('fingerprint', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('result', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('severity', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'audit_findings_pkey' }),
          checkExpression(
            'managed_audit_findings_result_check_cdf8b9f0',
            "((result)::text = ANY ((ARRAY['passed'::character varying, 'failed'::character varying, 'not_applicable'::character varying, 'error'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_audit_findings_severity_check_119807ac',
            "((severity)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'error'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'audit_logs',
        columns: [
          col('action', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('actor_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('actor_type', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('metadata', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('occurred_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_type', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('workspace_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'audit_logs_pkey' }),
          checkExpression(
            'managed_audit_logs_actor_check_5961bcef',
            "((actor_type)::text = ANY ((ARRAY['user'::character varying, 'api_key'::character varying, 'system'::character varying, 'job'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_audit_logs_actor_id_check_b01433e2',
            "(((actor_type)::text = ANY ((ARRAY['user'::character varying, 'api_key'::character varying])::text[])) = (actor_id IS NOT NULL))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'audit_rule_versions',
        columns: [
          col('audit_rule_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('implementation_version', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('parameters', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('published_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('retired_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('severity', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'audit_rule_versions_pkey' }),
          checkExpression(
            'managed_audit_rule_versions_retired_check_6cbda1de',
            '((retired_at IS NULL) OR (retired_at >= published_at))',
          ),
          checkExpression(
            'managed_audit_rule_versions_severity_check_119807ac',
            "((severity)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'error'::character varying])::text[]))",
          ),
          checkExpression('managed_audit_rule_versions_version_check_98cbfe35', '(version >= 1)'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'audit_rules',
        columns: [
          col('category', 'character varying(60)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 60 } },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('scope', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'audit_rules_pkey' }),
          checkExpression(
            'managed_audit_rules_scope_check_5a662e8d',
            "((scope)::text = ANY ((ARRAY['page'::character varying, 'site'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'auth_sessions',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('device_label', 'character varying(150)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ip_hash', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('refresh_token_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('revoked_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('user_agent_hash', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'auth_sessions_pkey' }),
          checkExpression(
            'managed_auth_sessions_time_check_1ab1ba16',
            '((expires_at > created_at) AND ((revoked_at IS NULL) OR (revoked_at >= created_at)))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'brands',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('normalized_name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'brands_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'categories',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('parent_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('slug', 'character varying(200)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'categories_pkey' }),
          checkExpression(
            'managed_categories_parent_check_ecc4b8c6',
            '((parent_id IS NULL) OR (parent_id <> id))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'competitor_comparisons',
        columns: [
          col('competitor_crawl_run_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('confidence', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('metric_deltas', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('owner_crawl_run_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('score_model_version_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'competitor_comparisons_pkey' }),
          checkExpression(
            'managed_competitor_comparisons_confidence_check_cd7475a5',
            '((confidence >= (0)::numeric) AND (confidence <= (100)::numeric))',
          ),
          checkExpression(
            'managed_competitor_comparisons_runs_check_1d9cbe36',
            '(owner_crawl_run_id <> competitor_crawl_run_id)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'competitor_suggestions',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('evidence', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('reviewed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('reviewed_by_user_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('source_type', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('suggested_domain', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('suggested_name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'competitor_suggestions_pkey' }),
          checkExpression(
            'managed_competitor_suggestions_review_check_b1dfa423',
            "((((status)::text = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by_user_id IS NULL)) OR (((status)::text <> 'pending'::text) AND (reviewed_at IS NOT NULL)))",
          ),
          checkExpression(
            'managed_competitor_suggestions_source_check_4fed1a55',
            "((source_type)::text = ANY ((ARRAY['manual'::character varying, 'rule'::character varying, 'ai'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_competitor_suggestions_status_check_c5055b62',
            "((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'competitors',
        columns: [
          col('approved_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('approved_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('archived_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'competitors_pkey' }),
          checkExpression(
            'managed_competitors_archived_at_check_c33e0e3e',
            "(((status)::text = 'archived'::text) = (archived_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_competitors_status_check_7a83a86e',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crawl_configurations',
        columns: [
          col('allow_headless_fallback', 'bool', {
            notNull: true,
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('max_depth', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('max_headless_pages', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('max_pages', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('request_delay_ms', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('request_timeout_ms', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('respect_robots_txt', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_agent', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('web_property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['web_property_id'], { name: 'crawl_configurations_pkey' }),
          checkExpression(
            'managed_crawl_configurations_limits_check_2e9ecbd0',
            '(((max_pages >= 1) AND (max_pages <= 10000)) AND ((max_depth >= 0) AND (max_depth <= 10)) AND ((request_delay_ms >= 250) AND (request_delay_ms <= 60000)) AND ((request_timeout_ms >= 1000) AND (request_timeout_ms <= 120000)) AND ((max_headless_pages >= 0) AND (max_headless_pages <= max_pages)))',
          ),
          checkExpression(
            'managed_crawl_configurations_robots_check_b9611a97',
            'respect_robots_txt',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crawl_links',
        columns: [
          col('anchor_fingerprint', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('crawl_run_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('is_internal', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('rel_flags', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('source_page_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_page_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'crawl_links_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'crawl_page_snapshots',
        columns: [
          col('canonical_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('content_fingerprint', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('content_length', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('crawl_page_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('crawl_run_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('external_link_count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('extracted_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('final_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('h1_text', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('http_status', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('image_count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('images_without_alt', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('internal_link_count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('meta_description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('page_type', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('render_mode', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('robots_directives', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('structured_data', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'crawl_page_snapshots_pkey' }),
          checkExpression(
            'managed_crawl_page_snapshots_counts_check_cde79f99',
            '(((content_length IS NULL) OR (content_length >= 0)) AND (image_count >= 0) AND ((images_without_alt >= 0) AND (images_without_alt <= image_count)) AND (internal_link_count >= 0) AND (external_link_count >= 0))',
          ),
          checkExpression(
            'managed_crawl_page_snapshots_http_status_check_17173649',
            '((http_status IS NULL) OR ((http_status >= 100) AND (http_status <= 599)))',
          ),
          checkExpression(
            'managed_crawl_page_snapshots_render_check_2032c754',
            "((render_mode)::text = ANY ((ARRAY['html'::character varying, 'headless'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_crawl_page_snapshots_type_check_2789a2db',
            "((page_type IS NULL) OR ((page_type)::text = ANY ((ARRAY['product'::character varying, 'category'::character varying, 'other'::character varying, 'unknown'::character varying])::text[])))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crawl_pages',
        columns: [
          col('canonical_url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('detected_page_type', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('first_seen_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('last_seen_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('normalized_url_hash', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('web_property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'crawl_pages_pkey' }),
          checkExpression(
            'managed_crawl_pages_seen_check_4c4f92ff',
            '(last_seen_at >= first_seen_at)',
          ),
          checkExpression(
            'managed_crawl_pages_type_check_29bdcd71',
            "((detected_page_type IS NULL) OR ((detected_page_type)::text = ANY ((ARRAY['product'::character varying, 'category'::character varying, 'other'::character varying, 'unknown'::character varying])::text[])))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crawl_runs',
        columns: [
          col('completed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('crawl_schedule_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('error_code', 'character varying(80)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('headless_pages', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_baseline', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('pages_discovered', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('pages_processed', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('started_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('trigger_type', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('web_property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'crawl_runs_pkey' }),
          checkExpression(
            'managed_crawl_runs_completion_check_762ae7b3',
            "(((status)::text = ANY ((ARRAY['succeeded'::character varying, 'partial'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])) = (completed_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_crawl_runs_counts_check_78de31c5',
            '((pages_discovered >= 0) AND (pages_processed >= 0) AND (headless_pages >= 0) AND (pages_processed <= pages_discovered) AND (headless_pages <= pages_processed))',
          ),
          checkExpression(
            'managed_crawl_runs_status_check_d941944c',
            "((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'succeeded'::character varying, 'partial'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_crawl_runs_time_check_a700fbfa',
            '(((started_at IS NULL) OR (started_at >= created_at)) AND ((completed_at IS NULL) OR ((started_at IS NOT NULL) AND (completed_at >= started_at))))',
          ),
          checkExpression(
            'managed_crawl_runs_trigger_check_6a169bcb',
            "((trigger_type)::text = ANY ((ARRAY['manual'::character varying, 'api'::character varying, 'scheduled'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crawl_schedules',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('day_of_month', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
          col('day_of_week', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
          col('frequency', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_active', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('local_time', 'time', { notNull: true, codecRef: { codecId: 'pg/time-string@1' } }),
          col('next_run_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('timezone', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('web_property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'crawl_schedules_pkey' }),
          checkExpression(
            'managed_crawl_schedules_day_check_497464ed',
            "((((frequency)::text = 'weekly'::text) AND ((day_of_week >= 0) AND (day_of_week <= 6)) AND (day_of_month IS NULL)) OR (((frequency)::text = 'monthly'::text) AND ((day_of_month >= 1) AND (day_of_month <= 28)) AND (day_of_week IS NULL)))",
          ),
          checkExpression(
            'managed_crawl_schedules_frequency_check_042dad2f',
            "((frequency)::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'deletion_requests',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('purge_started_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('purged_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('recoverable_until', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('requested_by_user_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('target_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_type', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('workspace_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'deletion_requests_pkey' }),
          checkExpression(
            'managed_deletion_requests_purge_check_e766c4b8',
            '(((purge_started_at IS NULL) OR (purge_started_at >= recoverable_until)) AND ((purged_at IS NULL) OR ((purge_started_at IS NOT NULL) AND (purged_at >= purge_started_at))))',
          ),
          checkExpression(
            'managed_deletion_requests_recovery_check_b4e89c1f',
            '(recoverable_until >= created_at)',
          ),
          checkExpression(
            'managed_deletion_requests_status_check_aa816b37',
            "((status)::text = ANY ((ARRAY['pending'::character varying, 'cancelled'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'idempotency_records',
        columns: [
          col('completed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn('gen_random_uuid()'),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('idempotency_key', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('locked_until', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('request_fingerprint', 'character(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 64 } },
          }),
          col('response_body', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('response_headers', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('response_status', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
          col('scope_key', 'character(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 64 } },
          }),
          col('status', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'idempotency_records_pkey' }),
          checkExpression(
            'managed_idempotency_records_response_check_10436a65',
            "((((status)::text = 'processing'::text) AND (response_status IS NULL) AND (completed_at IS NULL)) OR (((status)::text = 'completed'::text) AND ((response_status >= 100) AND (response_status <= 599)) AND (completed_at IS NOT NULL)))",
          ),
          checkExpression(
            'managed_idempotency_records_status_check_33dcd541',
            "((status)::text = ANY ((ARRAY['processing'::character varying, 'completed'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_idempotency_records_time_check_30d96035',
            '((locked_until > created_at) AND (expires_at > created_at) AND ((completed_at IS NULL) OR (completed_at >= created_at)))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organization_invitations',
        columns: [
          col('accepted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('intended_role', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('invite_type', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('invited_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('max_uses', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('revoked_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('target_normalized', 'character varying(320)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 320 } },
          }),
          col('token_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('used_count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'organization_invitations_pkey' }),
          checkExpression(
            'managed_organization_invitations_role_check_79a0eb11',
            "((intended_role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_organization_invitations_status_check_91f8e012',
            "((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'revoked'::character varying, 'expired'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_organization_invitations_target_check_18e7c993',
            "((((invite_type)::text = 'link'::text) AND (target_normalized IS NULL)) OR (((invite_type)::text = ANY ((ARRAY['mobile'::character varying, 'email'::character varying])::text[])) AND (target_normalized IS NOT NULL)))",
          ),
          checkExpression(
            'managed_organization_invitations_time_check_761aa8f9',
            '(expires_at > created_at)',
          ),
          checkExpression(
            'managed_organization_invitations_type_check_7b26bfbe',
            "((invite_type)::text = ANY ((ARRAY['mobile'::character varying, 'email'::character varying, 'link'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_organization_invitations_usage_check_18872a93',
            '((max_uses >= 1) AND ((used_count >= 0) AND (used_count <= max_uses)))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organization_memberships',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('joined_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_role', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('removed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'organization_memberships_pkey' }),
          checkExpression(
            'managed_organization_memberships_removed_at_check_97524d05',
            "(((status)::text = 'removed'::text) = (removed_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_organization_memberships_role_check_fc97564c',
            "((organization_role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_organization_memberships_status_check_15f94032',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'removed'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organizations',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('created_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('deleted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('slug', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'organizations_pkey' }),
          checkExpression(
            'managed_organizations_deleted_at_check_98c112a0',
            "(((status)::text = 'deleted'::text) = (deleted_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_organizations_status_check_40b30e40',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'deleting'::character varying, 'deleted'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'otp_challenges',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('code_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('consumed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('max_attempts', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('purpose', 'character varying(40)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 40 } },
          }),
          col('user_contact_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'otp_challenges_pkey' }),
          checkExpression(
            'managed_otp_challenges_attempts_check_856aee82',
            '((attempts >= 0) AND ((max_attempts >= 1) AND (max_attempts <= 10)) AND (attempts <= max_attempts))',
          ),
          checkExpression(
            'managed_otp_challenges_purpose_check_d01c1233',
            "((purpose)::text = ANY ((ARRAY['sign_in'::character varying, 'verify_contact'::character varying, 'password_reset'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_otp_challenges_time_check_9528e732',
            '((expires_at > created_at) AND ((consumed_at IS NULL) OR (consumed_at >= created_at)))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'page_type_overrides',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('created_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('disabled_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('forced_page_type', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('url_pattern', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('web_property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'page_type_overrides_pkey' }),
          checkExpression(
            'managed_page_type_overrides_type_check_568d951d',
            "((forced_page_type)::text = ANY ((ARRAY['product'::character varying, 'category'::character varying, 'other'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'permissions',
        columns: [
          col('action', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'character varying(300)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'character varying(170)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 170 } },
          }),
          col('resource', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'permissions_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_categories',
        columns: [
          col('category_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_primary', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('product_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['product_id', 'category_id'], { name: 'product_categories_pkey' }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_sources',
        columns: [
          col('crawl_page_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('external_id', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('last_synced_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('product_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('source_type', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('source_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('web_property_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'product_sources_pkey' }),
          checkExpression(
            'managed_product_sources_origin_check_8777c4df',
            "((((source_type)::text = 'api'::text) AND (crawl_page_id IS NULL)) OR (((source_type)::text = 'crawl'::text) AND (web_property_id IS NOT NULL) AND (crawl_page_id IS NOT NULL)))",
          ),
          checkExpression(
            'managed_product_sources_type_check_18e26f9e',
            "((source_type)::text = ANY ((ARRAY['api'::character varying, 'crawl'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'products',
        columns: [
          col('brand_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('normalized_title', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('title', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'products_pkey' }),
          checkExpression(
            'managed_products_status_check_7a83a86e',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'project_scope_categories',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('priority', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'project_scope_categories_pkey' }),
          checkExpression(
            'managed_project_scope_categories_priority_check_307f3745',
            '((priority >= 1) AND (priority <= 100))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'project_scopes',
        columns: [
          col('approved_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('business_name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('competitive_advantage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('industry', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('out_of_scope', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('seo_objectives', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_audience', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('target_geography', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('target_market', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['seo_project_id'], { name: 'project_scopes_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'score_model_versions',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('published_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('retired_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('weights', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'score_model_versions_pkey' }),
          checkExpression(
            'managed_score_model_versions_retired_check_6cbda1de',
            '((retired_at IS NULL) OR (retired_at >= published_at))',
          ),
          checkExpression('managed_score_model_versions_version_check_98cbfe35', '(version >= 1)'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'score_snapshots',
        columns: [
          col('crawl_health_score', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('crawl_run_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('indexability_score', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('internal_links_score', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('metadata_score', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('overall_score', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('score_model_version_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('structured_data_score', 'numeric(5,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'score_snapshots_pkey' }),
          checkExpression(
            'managed_score_snapshots_range_check_b4422f72',
            '(((overall_score >= (0)::numeric) AND (overall_score <= (100)::numeric)) AND ((metadata_score >= (0)::numeric) AND (metadata_score <= (100)::numeric)) AND ((indexability_score >= (0)::numeric) AND (indexability_score <= (100)::numeric)) AND ((structured_data_score >= (0)::numeric) AND (structured_data_score <= (100)::numeric)) AND ((internal_links_score >= (0)::numeric) AND (internal_links_score <= (100)::numeric)) AND ((crawl_health_score >= (0)::numeric) AND (crawl_health_score <= (100)::numeric)))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'seo_generation_keywords',
        columns: [
          col('keyword', 'character varying(300)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('position', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('seo_generation_version_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['seo_generation_version_id', 'position'], {
            name: 'seo_generation_keywords_pkey',
          }),
          checkExpression(
            'managed_seo_generation_keywords_position_check_9b10c3fd',
            '("position" >= 1)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'seo_generation_runs',
        columns: [
          col('completed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('context_version', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('created_by_user_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('generation_mode', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('product_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('provider_key', 'character varying(80)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'seo_generation_runs_pkey' }),
          checkExpression(
            'managed_seo_generation_runs_completion_check_71540357',
            "(((status)::text = ANY ((ARRAY['succeeded'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])) = (completed_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_seo_generation_runs_mode_check_8f2ebd7c',
            "((generation_mode)::text = ANY ((ARRAY['rules'::character varying, 'ai'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_seo_generation_runs_provider_check_c8db16ba',
            "((((generation_mode)::text = 'rules'::text) AND (provider_key IS NULL)) OR ((generation_mode)::text = 'ai'::text))",
          ),
          checkExpression(
            'managed_seo_generation_runs_status_check_7cbf6d91',
            "((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_seo_generation_runs_time_check_838b93f5',
            '((completed_at IS NULL) OR (completed_at >= created_at))',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'seo_generation_versions',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('decided_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('decided_by_user_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('decision', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('meta_description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('seo_generation_run_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('seo_title', 'character varying(600)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 600 } },
          }),
          col('slug', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'seo_generation_versions_pkey' }),
          checkExpression(
            'managed_seo_generation_versions_decided_check_1320671a',
            "((((decision)::text = 'pending'::text) AND (decided_at IS NULL) AND (decided_by_user_id IS NULL)) OR (((decision)::text <> 'pending'::text) AND (decided_at IS NOT NULL) AND (decided_by_user_id IS NOT NULL)))",
          ),
          checkExpression(
            'managed_seo_generation_versions_decision_check_033ade6a',
            "((decision)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'applied'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_seo_generation_versions_version_check_98cbfe35',
            '(version >= 1)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'seo_projects',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('created_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('deleted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'seo_projects_pkey' }),
          checkExpression(
            'managed_seo_projects_deleted_at_check_98c112a0',
            "(((status)::text = 'deleted'::text) = (deleted_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_seo_projects_status_check_ef823ce4',
            "((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'paused'::character varying, 'archived'::character varying, 'deleting'::character varying, 'deleted'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'usage_daily_summaries',
        columns: [
          col('event_type', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('rebuilt_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('total_quantity', 'numeric(18,4)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 4 } },
          }),
          col('usage_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['workspace_id', 'usage_date', 'event_type'], {
            name: 'usage_daily_summaries_pkey',
          }),
          checkExpression(
            'managed_usage_daily_summaries_quantity_check_8f421bbc',
            '(total_quantity >= (0)::numeric)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'usage_events',
        columns: [
          col('event_type', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('idempotency_key', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('occurred_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'numeric(18,4)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 4 } },
          }),
          col('seo_project_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'usage_events_pkey' }),
          checkExpression(
            'managed_usage_events_quantity_check_7373c63b',
            '(quantity > (0)::numeric)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user_contacts',
        columns: [
          col('contact_type', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_primary', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('normalized_value', 'character varying(320)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 320 } },
          }),
          col('user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('verified_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'user_contacts_pkey' }),
          checkExpression(
            'managed_user_contacts_type_check_e0c28f7c',
            "((contact_type)::text = ANY ((ARRAY['mobile'::character varying, 'email'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user_credentials',
        columns: [
          col('failed_attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('locked_until', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('password_changed_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('password_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['user_id'], { name: 'user_credentials_pkey' }),
          checkExpression(
            'managed_user_credentials_failed_attempts_check_7283b915',
            '(failed_attempts >= 0)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deleted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('display_name', 'character varying(150)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('locale', 'character varying(10)', {
            notNull: true,
            default: lit('fa-IR'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'users_pkey' }),
          checkExpression(
            'managed_users_deleted_at_check_98c112a0',
            "(((status)::text = 'deleted'::text) = (deleted_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_users_status_check_36e9da50',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'deleted'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'waitlist_entries',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email_normalized', 'character varying(320)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 320 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('mobile_normalized', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('reviewed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('reviewed_by_user_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('use_case', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'waitlist_entries_pkey' }),
          checkExpression(
            'managed_waitlist_entries_contact_check_ee3ad7b9',
            '((mobile_normalized IS NOT NULL) OR (email_normalized IS NOT NULL))',
          ),
          checkExpression(
            'managed_waitlist_entries_review_check_a54041a3',
            "((((status)::text = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by_user_id IS NULL)) OR (((status)::text <> 'pending'::text) AND (reviewed_at IS NOT NULL) AND (reviewed_by_user_id IS NOT NULL)))",
          ),
          checkExpression(
            'managed_waitlist_entries_status_check_3cf395df',
            "((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'web_properties',
        columns: [
          col('archived_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('base_path', 'character varying(500)', {
            notNull: true,
            default: lit('/'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('competitor_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('host', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('property_kind', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('scheme', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('seo_project_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'web_properties_pkey' }),
          checkExpression(
            'managed_web_properties_archived_at_check_c33e0e3e',
            "(((status)::text = 'archived'::text) = (archived_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_web_properties_competitor_check_e23342fb',
            "(((property_kind)::text = 'competitor'::text) = (competitor_id IS NOT NULL))",
          ),
          checkExpression(
            'managed_web_properties_kind_check_03d8c882',
            "((property_kind)::text = ANY ((ARRAY['owner_primary'::character varying, 'owner_subdomain'::character varying, 'competitor'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_web_properties_scheme_check_cb197e76',
            "((scheme)::text = ANY ((ARRAY['http'::character varying, 'https'::character varying])::text[]))",
          ),
          checkExpression(
            'managed_web_properties_status_check_7a83a86e',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'webhook_deliveries',
        columns: [
          col('attempt', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('delivered_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('event_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('event_type', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('next_retry_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('response_status', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
          col('response_time_ms', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('webhook_endpoint_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'webhook_deliveries_pkey' }),
          checkExpression(
            'managed_webhook_deliveries_attempt_check_b17a7866',
            '((attempt >= 1) AND (attempt <= 8))',
          ),
          checkExpression(
            'managed_webhook_deliveries_delivered_check_6d52cc9e',
            "(((status)::text = 'succeeded'::text) = (delivered_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_webhook_deliveries_response_check_ea5d22de',
            '(((response_status IS NULL) OR ((response_status >= 100) AND (response_status <= 599))) AND ((response_time_ms IS NULL) OR (response_time_ms >= 0)))',
          ),
          checkExpression(
            'managed_webhook_deliveries_status_check_34127ab6',
            "((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'dead_letter'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'webhook_endpoints',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('encrypted_secret', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_active', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('name', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('subscribed_events', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'webhook_endpoints_pkey' }),
          checkExpression(
            'managed_webhook_endpoints_url_check_e7084ffe',
            "(url ~ '^https://'::text)",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspace_member_roles',
        columns: [
          col('assigned_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('assigned_by_user_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_member_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_role_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['workspace_member_id', 'workspace_role_id'], {
            name: 'workspace_member_roles_pkey',
          }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspace_members',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('joined_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('organization_membership_id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('removed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'workspace_members_pkey' }),
          checkExpression(
            'managed_workspace_members_removed_at_check_97524d05',
            "(((status)::text = 'removed'::text) = (removed_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_workspace_members_status_check_15f94032',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'removed'::character varying])::text[]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspace_role_permissions',
        columns: [
          col('granted_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('permission_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('workspace_role_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['workspace_role_id', 'permission_id'], {
            name: 'workspace_role_permissions_pkey',
          }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspace_roles',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'character varying(300)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_system', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'workspace_roles_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspaces',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deleted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('organization_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('slug', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('status', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('timezone', 'character varying(80)', {
            notNull: true,
            default: lit('Asia/Tehran'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'workspaces_pkey' }),
          checkExpression(
            'managed_workspaces_deleted_at_check_98c112a0',
            "(((status)::text = 'deleted'::text) = (deleted_at IS NOT NULL))",
          ),
          checkExpression(
            'managed_workspaces_status_check_6415c2c8',
            "((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'deleting'::character varying, 'deleted'::character varying])::text[]))",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'api_keys',
        constraint: 'api_keys_public_prefix_key',
        columns: ['public_prefix'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'api_keys',
        constraint: 'api_keys_scope_unique',
        columns: ['organization_id', 'workspace_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'audit_rules',
        constraint: 'audit_rules_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'categories',
        constraint: 'categories_scope_unique',
        columns: ['organization_id', 'workspace_id', 'seo_project_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'idempotency_records',
        constraint: 'idempotency_records_scope_unique',
        columns: ['workspace_id', 'scope_key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'organizations',
        constraint: 'organizations_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'permissions',
        constraint: 'permissions_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'products',
        constraint: 'products_scope_unique',
        columns: ['organization_id', 'workspace_id', 'seo_project_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'seo_generation_runs',
        constraint: 'seo_generation_runs_scope_unique',
        columns: ['organization_id', 'workspace_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'seo_generation_versions',
        constraint: 'seo_generation_versions_scope_unique',
        columns: ['organization_id', 'workspace_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'seo_projects',
        constraint: 'seo_projects_tenant_id_unique',
        columns: ['organization_id', 'workspace_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usage_events',
        constraint: 'usage_events_tenant_idempotency_unique',
        columns: ['workspace_id', 'idempotency_key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'workspace_members',
        constraint: 'workspace_members_scope_unique',
        columns: ['organization_id', 'workspace_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'workspace_roles',
        constraint: 'workspace_roles_scope_unique',
        columns: ['organization_id', 'workspace_id', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_org_id_unique',
        columns: ['organization_id', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'action_item_verifications',
        index: 'uq_action_verifications_item_run',
        columns: ['action_item_id', 'crawl_run_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'action_items',
        index: 'idx_action_items_project_status',
        columns: ['seo_project_id', 'user_status', 'priority'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'audit_findings',
        index: 'uq_audit_findings_run_fingerprint',
        columns: ['crawl_run_id', 'fingerprint'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'audit_rule_versions',
        index: 'uq_audit_rule_versions_rule_version',
        columns: ['audit_rule_id', 'version'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'brands',
        index: 'uq_brands_project_name',
        columns: ['seo_project_id', 'normalized_name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'categories',
        index: 'managed_uq_categories_project_parent_slug_19b8adcc',
        expression:
          "seo_project_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug",
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'crawl_page_snapshots',
        index: 'uq_crawl_page_snapshots_run_page',
        columns: ['crawl_run_id', 'crawl_page_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'crawl_pages',
        index: 'idx_crawl_pages_project_seen',
        columns: ['seo_project_id', 'last_seen_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crawl_pages',
        index: 'uq_crawl_pages_property_url_hash',
        columns: ['web_property_id', 'normalized_url_hash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'crawl_runs',
        index: 'idx_crawl_runs_project_status',
        columns: ['seo_project_id', 'status', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crawl_runs',
        index: 'managed_uq_crawl_runs_project_baseline_cd6d7799',
        columns: ['seo_project_id'],
        extras: { where: 'is_baseline', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'idempotency_records',
        index: 'idx_idempotency_records_expiry',
        columns: ['expires_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organization_memberships',
        index: 'idx_organization_memberships_user',
        columns: ['user_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organization_memberships',
        index: 'managed_uq_organization_memberships_active_owner_f5f730a2',
        columns: ['organization_id'],
        extras: {
          where:
            "(((organization_role)::text = 'owner'::text) AND ((status)::text = 'active'::text))",
          unique: true,
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'organization_memberships',
        index: 'uq_org_memberships_org_user',
        columns: ['organization_id', 'user_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_categories',
        index: 'managed_uq_product_categories_primary_d2768196',
        columns: ['product_id'],
        extras: { where: 'is_primary', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'products',
        index: 'idx_products_project_status',
        columns: ['seo_project_id', 'status', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'project_scope_categories',
        index: 'uq_project_scope_categories_name',
        columns: ['seo_project_id', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'score_model_versions',
        index: 'uq_score_model_versions_key_version',
        columns: ['key', 'version'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'score_snapshots',
        index: 'uq_score_snapshots_run_model',
        columns: ['crawl_run_id', 'score_model_version_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'seo_generation_versions',
        index: 'uq_seo_generation_versions_run_version',
        columns: ['seo_generation_run_id', 'version'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'seo_projects',
        index: 'idx_seo_projects_workspace_status',
        columns: ['workspace_id', 'status', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_contacts',
        index: 'idx_user_contacts_user_type',
        columns: ['user_id', 'contact_type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_contacts',
        index: 'managed_uq_user_contacts_primary_type_494edd9f',
        columns: ['user_id', 'contact_type'],
        extras: { where: 'is_primary', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_contacts',
        index: 'uq_user_contacts_type_value',
        columns: ['contact_type', 'normalized_value'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'waitlist_entries',
        index: 'managed_uq_waitlist_entries_email_ec66e6a6',
        columns: ['email_normalized'],
        extras: { where: '(email_normalized IS NOT NULL)', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'waitlist_entries',
        index: 'managed_uq_waitlist_entries_mobile_b8b6d4f0',
        columns: ['mobile_normalized'],
        extras: { where: '(mobile_normalized IS NOT NULL)', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'web_properties',
        index: 'managed_uq_web_properties_active_primary_6a5217b1',
        columns: ['seo_project_id'],
        extras: {
          where:
            "(((property_kind)::text = 'owner_primary'::text) AND ((status)::text = 'active'::text))",
          unique: true,
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'web_properties',
        index: 'uq_web_properties_project_origin_path',
        columns: ['seo_project_id', 'scheme', 'host', 'base_path'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'webhook_deliveries',
        index: 'managed_idx_webhook_deliveries_retry_62ce665b',
        columns: ['status', 'next_retry_at'],
        extras: {
          where:
            "((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]))",
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'webhook_deliveries',
        index: 'uq_webhook_deliveries_attempt',
        columns: ['webhook_endpoint_id', 'event_id', 'attempt'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspace_members',
        index: 'idx_workspace_members_membership',
        columns: ['organization_membership_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspace_members',
        index: 'uq_workspace_members_membership',
        columns: ['workspace_id', 'organization_membership_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspace_roles',
        index: 'uq_workspace_roles_name',
        columns: ['workspace_id', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspaces',
        index: 'uq_workspaces_org_slug',
        columns: ['organization_id', 'slug'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_item_status_history',
        foreignKey: {
          name: 'action_item_status_history_action_item_id_fkey',
          columns: ['action_item_id'],
          references: { schema: 'public', table: 'action_items', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_item_status_history',
        foreignKey: {
          name: 'action_item_status_history_changed_by_user_id_fkey',
          columns: ['changed_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_item_status_history',
        foreignKey: {
          name: 'action_item_status_history_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_item_verifications',
        foreignKey: {
          name: 'action_item_verifications_action_item_id_fkey',
          columns: ['action_item_id'],
          references: { schema: 'public', table: 'action_items', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_item_verifications',
        foreignKey: {
          name: 'action_item_verifications_crawl_run_id_fkey',
          columns: ['crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_item_verifications',
        foreignKey: {
          name: 'action_item_verifications_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_items',
        foreignKey: {
          name: 'action_items_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_items',
        foreignKey: {
          name: 'action_items_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_items',
        foreignKey: {
          name: 'action_items_source_finding_id_fkey',
          columns: ['source_finding_id'],
          references: { schema: 'public', table: 'audit_findings', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action_items',
        foreignKey: {
          name: 'action_items_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_permissions',
        foreignKey: {
          name: 'api_key_permissions_api_key_id_fkey',
          columns: ['api_key_id'],
          references: { schema: 'public', table: 'api_keys', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_permissions',
        foreignKey: {
          name: 'api_key_permissions_key_scope_fk',
          columns: ['organization_id', 'workspace_id', 'api_key_id'],
          references: {
            schema: 'public',
            table: 'api_keys',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_permissions',
        foreignKey: {
          name: 'api_key_permissions_permission_id_fkey',
          columns: ['permission_id'],
          references: { schema: 'public', table: 'permissions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_permissions',
        foreignKey: {
          name: 'api_key_permissions_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_project_scopes',
        foreignKey: {
          name: 'api_key_project_scopes_api_key_id_fkey',
          columns: ['api_key_id'],
          references: { schema: 'public', table: 'api_keys', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_project_scopes',
        foreignKey: {
          name: 'api_key_project_scopes_key_scope_fk',
          columns: ['organization_id', 'workspace_id', 'api_key_id'],
          references: {
            schema: 'public',
            table: 'api_keys',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_project_scopes',
        foreignKey: {
          name: 'api_key_project_scopes_project_scope_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_project_scopes',
        foreignKey: {
          name: 'api_key_project_scopes_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_key_project_scopes',
        foreignKey: {
          name: 'api_key_project_scopes_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_keys',
        foreignKey: {
          name: 'api_keys_created_by_user_id_fkey',
          columns: ['created_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_keys',
        foreignKey: {
          name: 'api_keys_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'api_keys',
        foreignKey: {
          name: 'api_keys_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_findings',
        foreignKey: {
          name: 'audit_findings_audit_rule_version_id_fkey',
          columns: ['audit_rule_version_id'],
          references: { schema: 'public', table: 'audit_rule_versions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_findings',
        foreignKey: {
          name: 'audit_findings_crawl_page_snapshot_id_fkey',
          columns: ['crawl_page_snapshot_id'],
          references: { schema: 'public', table: 'crawl_page_snapshots', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_findings',
        foreignKey: {
          name: 'audit_findings_crawl_run_id_fkey',
          columns: ['crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_findings',
        foreignKey: {
          name: 'audit_findings_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_findings',
        foreignKey: {
          name: 'audit_findings_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_findings',
        foreignKey: {
          name: 'audit_findings_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_rule_versions',
        foreignKey: {
          name: 'audit_rule_versions_audit_rule_id_fkey',
          columns: ['audit_rule_id'],
          references: { schema: 'public', table: 'audit_rules', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auth_sessions',
        foreignKey: {
          name: 'auth_sessions_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'brands',
        foreignKey: {
          name: 'brands_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'brands',
        foreignKey: {
          name: 'brands_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'brands',
        foreignKey: {
          name: 'brands_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'categories',
        foreignKey: {
          name: 'categories_parent_id_fkey',
          columns: ['parent_id'],
          references: { schema: 'public', table: 'categories', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'categories',
        foreignKey: {
          name: 'categories_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'categories',
        foreignKey: {
          name: 'categories_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'categories',
        foreignKey: {
          name: 'categories_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_comparisons',
        foreignKey: {
          name: 'competitor_comparisons_competitor_crawl_run_id_fkey',
          columns: ['competitor_crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_comparisons',
        foreignKey: {
          name: 'competitor_comparisons_owner_crawl_run_id_fkey',
          columns: ['owner_crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_comparisons',
        foreignKey: {
          name: 'competitor_comparisons_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_comparisons',
        foreignKey: {
          name: 'competitor_comparisons_score_model_version_id_fkey',
          columns: ['score_model_version_id'],
          references: { schema: 'public', table: 'score_model_versions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_comparisons',
        foreignKey: {
          name: 'competitor_comparisons_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_comparisons',
        foreignKey: {
          name: 'competitor_comparisons_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_suggestions',
        foreignKey: {
          name: 'competitor_suggestions_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_suggestions',
        foreignKey: {
          name: 'competitor_suggestions_reviewed_by_user_id_fkey',
          columns: ['reviewed_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_suggestions',
        foreignKey: {
          name: 'competitor_suggestions_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitor_suggestions',
        foreignKey: {
          name: 'competitor_suggestions_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitors',
        foreignKey: {
          name: 'competitors_approved_by_user_id_fkey',
          columns: ['approved_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitors',
        foreignKey: {
          name: 'competitors_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitors',
        foreignKey: {
          name: 'competitors_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'competitors',
        foreignKey: {
          name: 'competitors_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_configurations',
        foreignKey: {
          name: 'crawl_configurations_web_property_id_fkey',
          columns: ['web_property_id'],
          references: { schema: 'public', table: 'web_properties', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_configurations',
        foreignKey: {
          name: 'crawl_configurations_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_links',
        foreignKey: {
          name: 'crawl_links_crawl_run_id_fkey',
          columns: ['crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_links',
        foreignKey: {
          name: 'crawl_links_source_page_id_fkey',
          columns: ['source_page_id'],
          references: { schema: 'public', table: 'crawl_pages', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_links',
        foreignKey: {
          name: 'crawl_links_target_page_id_fkey',
          columns: ['target_page_id'],
          references: { schema: 'public', table: 'crawl_pages', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_links',
        foreignKey: {
          name: 'crawl_links_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_page_snapshots',
        foreignKey: {
          name: 'crawl_page_snapshots_crawl_page_id_fkey',
          columns: ['crawl_page_id'],
          references: { schema: 'public', table: 'crawl_pages', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_page_snapshots',
        foreignKey: {
          name: 'crawl_page_snapshots_crawl_run_id_fkey',
          columns: ['crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_page_snapshots',
        foreignKey: {
          name: 'crawl_page_snapshots_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_pages',
        foreignKey: {
          name: 'crawl_pages_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_pages',
        foreignKey: {
          name: 'crawl_pages_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_pages',
        foreignKey: {
          name: 'crawl_pages_web_property_id_fkey',
          columns: ['web_property_id'],
          references: { schema: 'public', table: 'web_properties', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_pages',
        foreignKey: {
          name: 'crawl_pages_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_runs',
        foreignKey: {
          name: 'crawl_runs_crawl_schedule_id_fkey',
          columns: ['crawl_schedule_id'],
          references: { schema: 'public', table: 'crawl_schedules', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_runs',
        foreignKey: {
          name: 'crawl_runs_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_runs',
        foreignKey: {
          name: 'crawl_runs_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_runs',
        foreignKey: {
          name: 'crawl_runs_web_property_id_fkey',
          columns: ['web_property_id'],
          references: { schema: 'public', table: 'web_properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_runs',
        foreignKey: {
          name: 'crawl_runs_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_schedules',
        foreignKey: {
          name: 'crawl_schedules_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_schedules',
        foreignKey: {
          name: 'crawl_schedules_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_schedules',
        foreignKey: {
          name: 'crawl_schedules_web_property_id_fkey',
          columns: ['web_property_id'],
          references: { schema: 'public', table: 'web_properties', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crawl_schedules',
        foreignKey: {
          name: 'crawl_schedules_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'deletion_requests',
        foreignKey: {
          name: 'deletion_requests_requested_by_user_id_fkey',
          columns: ['requested_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'idempotency_records',
        foreignKey: {
          name: 'idempotency_records_workspace_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organization_invitations',
        foreignKey: {
          name: 'organization_invitations_invited_by_user_id_fkey',
          columns: ['invited_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organization_invitations',
        foreignKey: {
          name: 'organization_invitations_organization_id_fkey',
          columns: ['organization_id'],
          references: { schema: 'public', table: 'organizations', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organization_memberships',
        foreignKey: {
          name: 'organization_memberships_organization_id_fkey',
          columns: ['organization_id'],
          references: { schema: 'public', table: 'organizations', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organization_memberships',
        foreignKey: {
          name: 'organization_memberships_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizations',
        foreignKey: {
          name: 'organizations_created_by_user_id_fkey',
          columns: ['created_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'otp_challenges',
        foreignKey: {
          name: 'otp_challenges_user_contact_id_fkey',
          columns: ['user_contact_id'],
          references: { schema: 'public', table: 'user_contacts', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'page_type_overrides',
        foreignKey: {
          name: 'page_type_overrides_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'page_type_overrides',
        foreignKey: {
          name: 'page_type_overrides_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'page_type_overrides',
        foreignKey: {
          name: 'page_type_overrides_web_property_id_fkey',
          columns: ['web_property_id'],
          references: { schema: 'public', table: 'web_properties', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'page_type_overrides',
        foreignKey: {
          name: 'page_type_overrides_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_categories',
        foreignKey: {
          name: 'product_categories_category_id_fkey',
          columns: ['category_id'],
          references: { schema: 'public', table: 'categories', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_categories',
        foreignKey: {
          name: 'product_categories_category_scope_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id', 'category_id'],
          references: {
            schema: 'public',
            table: 'categories',
            columns: ['organization_id', 'workspace_id', 'seo_project_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_categories',
        foreignKey: {
          name: 'product_categories_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_categories',
        foreignKey: {
          name: 'product_categories_product_scope_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id', 'product_id'],
          references: {
            schema: 'public',
            table: 'products',
            columns: ['organization_id', 'workspace_id', 'seo_project_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_categories',
        foreignKey: {
          name: 'product_categories_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_sources',
        foreignKey: {
          name: 'product_sources_crawl_page_id_fkey',
          columns: ['crawl_page_id'],
          references: { schema: 'public', table: 'crawl_pages', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_sources',
        foreignKey: {
          name: 'product_sources_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_sources',
        foreignKey: {
          name: 'product_sources_web_property_id_fkey',
          columns: ['web_property_id'],
          references: { schema: 'public', table: 'web_properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_sources',
        foreignKey: {
          name: 'product_sources_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'products',
        foreignKey: {
          name: 'products_brand_id_fkey',
          columns: ['brand_id'],
          references: { schema: 'public', table: 'brands', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'products',
        foreignKey: {
          name: 'products_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'products',
        foreignKey: {
          name: 'products_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'products',
        foreignKey: {
          name: 'products_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project_scope_categories',
        foreignKey: {
          name: 'project_scope_categories_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project_scope_categories',
        foreignKey: {
          name: 'project_scope_categories_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project_scope_categories',
        foreignKey: {
          name: 'project_scope_categories_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project_scopes',
        foreignKey: {
          name: 'project_scopes_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project_scopes',
        foreignKey: {
          name: 'project_scopes_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project_scopes',
        foreignKey: {
          name: 'project_scopes_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'score_snapshots',
        foreignKey: {
          name: 'score_snapshots_crawl_run_id_fkey',
          columns: ['crawl_run_id'],
          references: { schema: 'public', table: 'crawl_runs', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'score_snapshots',
        foreignKey: {
          name: 'score_snapshots_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'score_snapshots',
        foreignKey: {
          name: 'score_snapshots_score_model_version_id_fkey',
          columns: ['score_model_version_id'],
          references: { schema: 'public', table: 'score_model_versions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'score_snapshots',
        foreignKey: {
          name: 'score_snapshots_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'score_snapshots',
        foreignKey: {
          name: 'score_snapshots_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_keywords',
        foreignKey: {
          name: 'seo_generation_keywords_seo_generation_version_id_fkey',
          columns: ['seo_generation_version_id'],
          references: { schema: 'public', table: 'seo_generation_versions', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_keywords',
        foreignKey: {
          name: 'seo_generation_keywords_version_scope_fk',
          columns: ['organization_id', 'workspace_id', 'seo_generation_version_id'],
          references: {
            schema: 'public',
            table: 'seo_generation_versions',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_keywords',
        foreignKey: {
          name: 'seo_generation_keywords_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_runs',
        foreignKey: {
          name: 'seo_generation_runs_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_runs',
        foreignKey: {
          name: 'seo_generation_runs_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_runs',
        foreignKey: {
          name: 'seo_generation_runs_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_runs',
        foreignKey: {
          name: 'seo_generation_runs_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_versions',
        foreignKey: {
          name: 'seo_generation_versions_seo_generation_run_id_fkey',
          columns: ['seo_generation_run_id'],
          references: { schema: 'public', table: 'seo_generation_runs', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_generation_versions',
        foreignKey: {
          name: 'seo_generation_versions_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_projects',
        foreignKey: {
          name: 'seo_projects_created_by_user_id_fkey',
          columns: ['created_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_projects',
        foreignKey: {
          name: 'seo_projects_organization_id_fkey',
          columns: ['organization_id'],
          references: { schema: 'public', table: 'organizations', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_projects',
        foreignKey: {
          name: 'seo_projects_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seo_projects',
        foreignKey: {
          name: 'seo_projects_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usage_daily_summaries',
        foreignKey: {
          name: 'usage_daily_summaries_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usage_daily_summaries',
        foreignKey: {
          name: 'usage_daily_summaries_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usage_events',
        foreignKey: {
          name: 'usage_events_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usage_events',
        foreignKey: {
          name: 'usage_events_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usage_events',
        foreignKey: {
          name: 'usage_events_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_contacts',
        foreignKey: {
          name: 'user_contacts_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_credentials',
        foreignKey: {
          name: 'user_credentials_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'waitlist_entries',
        foreignKey: {
          name: 'waitlist_entries_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'web_properties',
        foreignKey: {
          name: 'web_properties_competitor_id_fkey',
          columns: ['competitor_id'],
          references: { schema: 'public', table: 'competitors', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'web_properties',
        foreignKey: {
          name: 'web_properties_project_tenant_fk',
          columns: ['organization_id', 'workspace_id', 'seo_project_id'],
          references: {
            schema: 'public',
            table: 'seo_projects',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'web_properties',
        foreignKey: {
          name: 'web_properties_seo_project_id_fkey',
          columns: ['seo_project_id'],
          references: { schema: 'public', table: 'seo_projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'web_properties',
        foreignKey: {
          name: 'web_properties_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'webhook_deliveries',
        foreignKey: {
          name: 'webhook_deliveries_webhook_endpoint_id_fkey',
          columns: ['webhook_endpoint_id'],
          references: { schema: 'public', table: 'webhook_endpoints', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'webhook_deliveries',
        foreignKey: {
          name: 'webhook_deliveries_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'webhook_endpoints',
        foreignKey: {
          name: 'webhook_endpoints_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'webhook_endpoints',
        foreignKey: {
          name: 'webhook_endpoints_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_member_roles',
        foreignKey: {
          name: 'workspace_member_roles_assigned_by_user_id_fkey',
          columns: ['assigned_by_user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_member_roles',
        foreignKey: {
          name: 'workspace_member_roles_member_scope_fk',
          columns: ['organization_id', 'workspace_id', 'workspace_member_id'],
          references: {
            schema: 'public',
            table: 'workspace_members',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_member_roles',
        foreignKey: {
          name: 'workspace_member_roles_role_scope_fk',
          columns: ['organization_id', 'workspace_id', 'workspace_role_id'],
          references: {
            schema: 'public',
            table: 'workspace_roles',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_member_roles',
        foreignKey: {
          name: 'workspace_member_roles_workspace_member_id_fkey',
          columns: ['workspace_member_id'],
          references: { schema: 'public', table: 'workspace_members', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_member_roles',
        foreignKey: {
          name: 'workspace_member_roles_workspace_role_id_fkey',
          columns: ['workspace_role_id'],
          references: { schema: 'public', table: 'workspace_roles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_member_roles',
        foreignKey: {
          name: 'workspace_member_roles_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_members',
        foreignKey: {
          name: 'workspace_members_organization_id_fkey',
          columns: ['organization_id'],
          references: { schema: 'public', table: 'organizations', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_members',
        foreignKey: {
          name: 'workspace_members_organization_membership_id_fkey',
          columns: ['organization_membership_id'],
          references: { schema: 'public', table: 'organization_memberships', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_members',
        foreignKey: {
          name: 'workspace_members_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_members',
        foreignKey: {
          name: 'workspace_members_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_role_permissions',
        foreignKey: {
          name: 'workspace_role_permissions_permission_id_fkey',
          columns: ['permission_id'],
          references: { schema: 'public', table: 'permissions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_role_permissions',
        foreignKey: {
          name: 'workspace_role_permissions_role_scope_fk',
          columns: ['organization_id', 'workspace_id', 'workspace_role_id'],
          references: {
            schema: 'public',
            table: 'workspace_roles',
            columns: ['organization_id', 'workspace_id', 'id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_role_permissions',
        foreignKey: {
          name: 'workspace_role_permissions_workspace_role_id_fkey',
          columns: ['workspace_role_id'],
          references: { schema: 'public', table: 'workspace_roles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_role_permissions',
        foreignKey: {
          name: 'workspace_role_permissions_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_roles',
        foreignKey: {
          name: 'workspace_roles_organization_id_fkey',
          columns: ['organization_id'],
          references: { schema: 'public', table: 'organizations', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_roles',
        foreignKey: {
          name: 'workspace_roles_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace_roles',
        foreignKey: {
          name: 'workspace_roles_workspace_tenant_fk',
          columns: ['organization_id', 'workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['organization_id', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspaces',
        foreignKey: {
          name: 'workspaces_organization_id_fkey',
          columns: ['organization_id'],
          references: { schema: 'public', table: 'organizations', columns: ['id'] },
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'action_item_status_history' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'action_item_verifications' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'action_items' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'api_key_permissions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'api_key_project_scopes' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'api_keys' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'audit_findings' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'audit_logs' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'audit_rule_versions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'audit_rules' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'auth_sessions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'brands' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'categories' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'competitor_comparisons' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'competitor_suggestions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'competitors' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'crawl_configurations' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'crawl_links' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'crawl_page_snapshots' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'crawl_pages' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'crawl_runs' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'crawl_schedules' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'deletion_requests' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'idempotency_records' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organization_invitations' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organization_memberships' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organizations' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'otp_challenges' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'page_type_overrides' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'permissions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'product_categories' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'product_sources' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'products' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'project_scope_categories' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'project_scopes' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'score_model_versions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'score_snapshots' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'seo_generation_keywords' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'seo_generation_runs' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'seo_generation_versions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'seo_projects' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'usage_daily_summaries' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'usage_events' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'user_contacts' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'user_credentials' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'users' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'waitlist_entries' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'web_properties' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'webhook_deliveries' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'webhook_endpoints' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'workspace_member_roles' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'workspace_members' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'workspace_role_permissions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'workspace_roles' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'workspaces' }),
      rawSql({
        id: 'security.tenant-bootstrap',
        label: 'Create tenant security roles, context functions, grants, and forced RLS',
        operationClass: 'additive',
        target: {
          id: 'security.tenant-bootstrap',
          details: { schema: 'app', objectType: 'dependency', name: 'tenant-security' },
        },
        precheck: [],
        execute: [{ description: 'Bootstrap tenant security', sql: tenantSecurityBootstrap }],
        postcheck: [],
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'action_item_status_history',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation', hash: '37b25df1' },
          tableName: 'action_item_status_history',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'action_item_status_history',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation', hash: '0704e55c' },
          tableName: 'action_item_status_history',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'action_item_verifications',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_2', hash: '37b25df1' },
          tableName: 'action_item_verifications',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'action_item_verifications',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_2', hash: '0704e55c' },
          tableName: 'action_item_verifications',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'action_items',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_3', hash: '37b25df1' },
          tableName: 'action_items',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'action_items',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_3', hash: '0704e55c' },
          tableName: 'action_items',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'api_key_permissions',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_4', hash: '37b25df1' },
          tableName: 'api_key_permissions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'api_key_project_scopes',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_5', hash: '37b25df1' },
          tableName: 'api_key_project_scopes',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'api_keys',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_6', hash: '37b25df1' },
          tableName: 'api_keys',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'api_keys',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_4', hash: '0704e55c' },
          tableName: 'api_keys',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'audit_findings',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_7', hash: '37b25df1' },
          tableName: 'audit_findings',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'audit_findings',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_5', hash: '0704e55c' },
          tableName: 'audit_findings',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'audit_logs',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_8', hash: '37b25df1' },
          tableName: 'audit_logs',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'audit_rule_versions',
        policy: {
          naming: { kind: 'wire', prefix: 'audit_rule_versions_read', hash: 'a8abcf3d' },
          tableName: 'audit_rule_versions',
          namespaceId: 'public',
          operation: 'select',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'audit_rules',
        policy: {
          naming: { kind: 'wire', prefix: 'audit_rules_read', hash: 'a8abcf3d' },
          tableName: 'audit_rules',
          namespaceId: 'public',
          operation: 'select',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'auth_sessions',
        policy: {
          naming: { kind: 'wire', prefix: 'auth_sessions_auth_service', hash: '3ff107eb' },
          tableName: 'auth_sessions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_auth'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'auth_sessions',
        policy: {
          naming: { kind: 'wire', prefix: 'auth_sessions_self', hash: '77adfc3f' },
          tableName: 'auth_sessions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app'],
          using: '(user_id = app.current_user_id())',
          withCheck: '(user_id = app.current_user_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'brands',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_9', hash: '37b25df1' },
          tableName: 'brands',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'brands',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_6', hash: '0704e55c' },
          tableName: 'brands',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'categories',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_10', hash: '37b25df1' },
          tableName: 'categories',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'categories',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_7', hash: '0704e55c' },
          tableName: 'categories',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'competitor_comparisons',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_11', hash: '37b25df1' },
          tableName: 'competitor_comparisons',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'competitor_comparisons',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_8', hash: '0704e55c' },
          tableName: 'competitor_comparisons',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'competitor_suggestions',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_12', hash: '37b25df1' },
          tableName: 'competitor_suggestions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'competitor_suggestions',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_9', hash: '0704e55c' },
          tableName: 'competitor_suggestions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'competitors',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_13', hash: '37b25df1' },
          tableName: 'competitors',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'competitors',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_10', hash: '0704e55c' },
          tableName: 'competitors',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_configurations',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_14', hash: '37b25df1' },
          tableName: 'crawl_configurations',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_configurations',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_11', hash: '0704e55c' },
          tableName: 'crawl_configurations',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_links',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_15', hash: '37b25df1' },
          tableName: 'crawl_links',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_links',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_12', hash: '0704e55c' },
          tableName: 'crawl_links',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_page_snapshots',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_16', hash: '37b25df1' },
          tableName: 'crawl_page_snapshots',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_page_snapshots',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_13', hash: '0704e55c' },
          tableName: 'crawl_page_snapshots',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_pages',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_17', hash: '37b25df1' },
          tableName: 'crawl_pages',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_pages',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_14', hash: '0704e55c' },
          tableName: 'crawl_pages',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_runs',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_18', hash: '37b25df1' },
          tableName: 'crawl_runs',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_runs',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_15', hash: '0704e55c' },
          tableName: 'crawl_runs',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_schedules',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_19', hash: '37b25df1' },
          tableName: 'crawl_schedules',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'crawl_schedules',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_16', hash: '0704e55c' },
          tableName: 'crawl_schedules',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'deletion_requests',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_20', hash: '37b25df1' },
          tableName: 'deletion_requests',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'idempotency_records',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_21', hash: '37b25df1' },
          tableName: 'idempotency_records',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'idempotency_records',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_17', hash: '0704e55c' },
          tableName: 'idempotency_records',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'organization_invitations',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_22', hash: '37b25df1' },
          tableName: 'organization_invitations',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'organization_memberships',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_23', hash: '37b25df1' },
          tableName: 'organization_memberships',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'organizations',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_24', hash: 'cf8b1ce2' },
          tableName: 'organizations',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(id = app.current_organization_id())',
          withCheck: '(id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'otp_challenges',
        policy: {
          naming: { kind: 'wire', prefix: 'otp_challenges_auth_service', hash: '3ff107eb' },
          tableName: 'otp_challenges',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_auth'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'otp_challenges',
        policy: {
          naming: { kind: 'wire', prefix: 'otp_challenges_self', hash: 'af664b40' },
          tableName: 'otp_challenges',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app'],
          using:
            '(EXISTS ( SELECT 1\n   FROM user_contacts\n  WHERE ((user_contacts.id = otp_challenges.user_contact_id) AND (user_contacts.user_id = app.current_user_id()))))',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'page_type_overrides',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_25', hash: '37b25df1' },
          tableName: 'page_type_overrides',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'page_type_overrides',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_18', hash: '0704e55c' },
          tableName: 'page_type_overrides',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'permissions',
        policy: {
          naming: { kind: 'wire', prefix: 'permissions_read', hash: 'a8abcf3d' },
          tableName: 'permissions',
          namespaceId: 'public',
          operation: 'select',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'product_categories',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_26', hash: '37b25df1' },
          tableName: 'product_categories',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'product_sources',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_27', hash: '37b25df1' },
          tableName: 'product_sources',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'product_sources',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_19', hash: '0704e55c' },
          tableName: 'product_sources',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'products',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_28', hash: '37b25df1' },
          tableName: 'products',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'products',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_20', hash: '0704e55c' },
          tableName: 'products',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'project_scope_categories',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_29', hash: '37b25df1' },
          tableName: 'project_scope_categories',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'project_scope_categories',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_21', hash: '0704e55c' },
          tableName: 'project_scope_categories',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'project_scopes',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_30', hash: '37b25df1' },
          tableName: 'project_scopes',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'project_scopes',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_22', hash: '0704e55c' },
          tableName: 'project_scopes',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'score_model_versions',
        policy: {
          naming: { kind: 'wire', prefix: 'score_model_versions_read', hash: 'a8abcf3d' },
          tableName: 'score_model_versions',
          namespaceId: 'public',
          operation: 'select',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'score_snapshots',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_31', hash: '37b25df1' },
          tableName: 'score_snapshots',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'score_snapshots',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_23', hash: '0704e55c' },
          tableName: 'score_snapshots',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_generation_keywords',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_32', hash: '37b25df1' },
          tableName: 'seo_generation_keywords',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_generation_runs',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_33', hash: '37b25df1' },
          tableName: 'seo_generation_runs',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_generation_runs',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_24', hash: '0704e55c' },
          tableName: 'seo_generation_runs',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_generation_versions',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_34', hash: '37b25df1' },
          tableName: 'seo_generation_versions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_generation_versions',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_25', hash: '0704e55c' },
          tableName: 'seo_generation_versions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_projects',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_35', hash: '37b25df1' },
          tableName: 'seo_projects',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'seo_projects',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_26', hash: '0704e55c' },
          tableName: 'seo_projects',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'usage_daily_summaries',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_36', hash: '37b25df1' },
          tableName: 'usage_daily_summaries',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'usage_daily_summaries',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_27', hash: '0704e55c' },
          tableName: 'usage_daily_summaries',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'usage_events',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_37', hash: '37b25df1' },
          tableName: 'usage_events',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'usage_events',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_28', hash: '0704e55c' },
          tableName: 'usage_events',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'user_contacts',
        policy: {
          naming: { kind: 'wire', prefix: 'user_contacts_auth_service', hash: '3ff107eb' },
          tableName: 'user_contacts',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_auth'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'user_contacts',
        policy: {
          naming: { kind: 'wire', prefix: 'user_contacts_self', hash: '77adfc3f' },
          tableName: 'user_contacts',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app'],
          using: '(user_id = app.current_user_id())',
          withCheck: '(user_id = app.current_user_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'user_credentials',
        policy: {
          naming: { kind: 'wire', prefix: 'user_credentials_auth_service', hash: '3ff107eb' },
          tableName: 'user_credentials',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_auth'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'user_credentials',
        policy: {
          naming: { kind: 'wire', prefix: 'user_credentials_self', hash: '77adfc3f' },
          tableName: 'user_credentials',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app'],
          using: '(user_id = app.current_user_id())',
          withCheck: '(user_id = app.current_user_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'users',
        policy: {
          naming: { kind: 'wire', prefix: 'users_auth_service', hash: '3ff107eb' },
          tableName: 'users',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_auth'],
          using: 'true',
          withCheck: 'true',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'users',
        policy: {
          naming: { kind: 'wire', prefix: 'users_self', hash: '6cc42593' },
          tableName: 'users',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app'],
          using: '(id = app.current_user_id())',
          withCheck: '(id = app.current_user_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'waitlist_entries',
        policy: {
          naming: { kind: 'wire', prefix: 'waitlist_entries_self', hash: '77adfc3f' },
          tableName: 'waitlist_entries',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app'],
          using: '(user_id = app.current_user_id())',
          withCheck: '(user_id = app.current_user_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'web_properties',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_38', hash: '37b25df1' },
          tableName: 'web_properties',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'web_properties',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_29', hash: '0704e55c' },
          tableName: 'web_properties',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'webhook_deliveries',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_39', hash: '37b25df1' },
          tableName: 'webhook_deliveries',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'webhook_deliveries',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_30', hash: '0704e55c' },
          tableName: 'webhook_deliveries',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'webhook_endpoints',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_40', hash: '37b25df1' },
          tableName: 'webhook_endpoints',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'webhook_endpoints',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_31', hash: '0704e55c' },
          tableName: 'webhook_endpoints',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspace_member_roles',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_41', hash: '37b25df1' },
          tableName: 'workspace_member_roles',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspace_members',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_42', hash: '37b25df1' },
          tableName: 'workspace_members',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspace_members',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_32', hash: '0704e55c' },
          tableName: 'workspace_members',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspace_role_permissions',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_43', hash: '37b25df1' },
          tableName: 'workspace_role_permissions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspace_roles',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_44', hash: '37b25df1' },
          tableName: 'workspace_roles',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspace_roles',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_33', hash: '0704e55c' },
          tableName: 'workspace_roles',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'workspaces',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_isolation_45', hash: '37b25df1' },
          tableName: 'workspaces',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(organization_id = app.current_organization_id())',
          withCheck: '(organization_id = app.current_organization_id())',
          permissive: true,
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
