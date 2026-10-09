\set ON_ERROR_STOP on

BEGIN;
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO users (id, status, locale, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'active', 'fa-IR', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'active', 'fa-IR', now(), now());

INSERT INTO organizations (id, name, slug, status, created_by_user_id, created_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Tenant One', 'tenant-one', 'active', '00000000-0000-0000-0000-000000000001', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'Tenant Two', 'tenant-two', 'active', '00000000-0000-0000-0000-000000000002', now(), now());

INSERT INTO organization_memberships (id, organization_id, user_id, organization_role, status, joined_at) VALUES
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner', 'active', now()),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner', 'active', now());

INSERT INTO workspaces (id, organization_id, name, slug, timezone, status, created_at, updated_at) VALUES
  ('12000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Workspace One', 'workspace-one', 'Asia/Tehran', 'active', now(), now()),
  ('12000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'Workspace Other', 'workspace-other', 'Asia/Tehran', 'active', now(), now()),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Workspace Two', 'workspace-two', 'Asia/Tehran', 'active', now(), now());

INSERT INTO workspace_members (id, organization_id, workspace_id, organization_membership_id, status, joined_at) VALUES
  ('13000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'active', now()),
  ('23000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'active', now());

INSERT INTO seo_projects (id, organization_id, workspace_id, name, status, created_by_user_id, created_at, updated_at) VALUES
  ('14000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Project One', 'active', '00000000-0000-0000-0000-000000000001', now(), now()),
  ('24000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'Project Two', 'active', '00000000-0000-0000-0000-000000000002', now(), now());

INSERT INTO permissions (id, resource, action, key, created_at)
VALUES ('15000000-0000-0000-0000-000000000001', 'project', 'read', 'project.read', now());

INSERT INTO api_keys (id, organization_id, workspace_id, name, public_prefix, secret_hash, created_by_user_id, created_at)
VALUES ('16000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000009', 'Other workspace key', 'other_ws', 'hash', '00000000-0000-0000-0000-000000000001', now());

INSERT INTO api_key_permissions (api_key_id, permission_id, organization_id, workspace_id)
VALUES ('16000000-0000-0000-0000-000000000009', '15000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000009');

SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

DO $$
DECLARE
  visible_count integer;
BEGIN
  SET LOCAL ROLE seo_analyzer_app;
  SELECT count(*) INTO visible_count FROM seo_projects;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'expected no rows without request context, got %', visible_count;
  END IF;
END
$$;

DO $$
BEGIN
  SET LOCAL ROLE seo_analyzer_app;
  BEGIN
    PERFORM app.set_request_context(
      '10000000-0000-0000-0000-000000000001',
      '12000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    );
    RAISE EXCEPTION 'cross-tenant request context was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'cross-tenant request context was accepted' THEN RAISE; END IF;
  END;
END
$$;

DO $$
DECLARE
  visible_count integer;
  junction_count integer;
BEGIN
  SET LOCAL ROLE seo_analyzer_app;
  PERFORM app.set_request_context(
    '10000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  );
  SELECT count(*) INTO visible_count FROM seo_projects;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one visible project, got %', visible_count;
  END IF;
  SELECT count(*) INTO junction_count FROM api_key_permissions;
  IF junction_count <> 0 THEN
    RAISE EXCEPTION 'same-organization cross-workspace junction row was visible';
  END IF;
  BEGIN
    INSERT INTO seo_projects (id, organization_id, workspace_id, name, status, created_by_user_id, created_at, updated_at)
    VALUES ('34000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'Forbidden', 'active', '00000000-0000-0000-0000-000000000002', now(), now());
    RAISE EXCEPTION 'cross-tenant insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO seo_projects (id, organization_id, workspace_id, name, status, created_by_user_id, created_at, updated_at)
    VALUES ('44000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'Mismatched', 'active', '00000000-0000-0000-0000-000000000001', now(), now());
    RAISE EXCEPTION 'mismatched tenant foreign key was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END
$$;

SELECT 'tenant isolation tests passed' AS result;
