#!/usr/bin/env -S node
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';
import type { Contract as End } from '../../snapshots/38ddbfc7593d4f3a34c5fb1207100376af0262ed4d7aa43b0e891f433c0cb7bb/contract';
import endContract from '../../snapshots/38ddbfc7593d4f3a34c5fb1207100376af0262ed4d7aa43b0e891f433c0cb7bb/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/aa180e44b4d4531e04bd365e22ade3d425770bc6500e979b9e5b3aab1343d4dd/contract';
import startContract from '../../snapshots/aa180e44b4d4531e04bd365e22ade3d425770bc6500e979b9e5b3aab1343d4dd/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createRlsPolicy({
        schema: 'public',
        table: 'api_key_permissions',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_34', hash: '0704e55c' },
          tableName: 'api_key_permissions',
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
        table: 'api_key_project_scopes',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_35', hash: '0704e55c' },
          tableName: 'api_key_project_scopes',
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
        table: 'product_categories',
        policy: {
          naming: { kind: 'wire', prefix: 'workspace_isolation_36', hash: '0704e55c' },
          tableName: 'product_categories',
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
          naming: { kind: 'wire', prefix: 'workspace_isolation_37', hash: '0704e55c' },
          tableName: 'seo_generation_keywords',
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
          naming: { kind: 'wire', prefix: 'workspace_isolation_38', hash: '0704e55c' },
          tableName: 'workspace_member_roles',
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
          naming: { kind: 'wire', prefix: 'workspace_isolation_39', hash: '0704e55c' },
          tableName: 'workspace_role_permissions',
          namespaceId: 'public',
          operation: 'all',
          roles: ['seo_analyzer_app', 'seo_analyzer_worker'],
          using: '(workspace_id = app.current_workspace_id())',
          withCheck: '(workspace_id = app.current_workspace_id())',
          permissive: false,
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
