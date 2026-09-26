/**
 * Direct database access for the e2e run: create the throwaway store (tenant) and
 * delete it again. Uses `pg` and `bcrypt` from top-backend/node_modules and the
 * connection settings in top-backend/.env, so the frontend needs no extra deps.
 *
 * Mirrors top-backend/test/branch-access.e2e-spec.ts (creation) and
 * top-backend/test/helpers/delete-tenant.ts (deletion).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const BACKEND_DIR = path.resolve(__dirname, '../../../top-backend');
const backendRequire = createRequire(path.join(BACKEND_DIR, 'package.json'));

// Only what is used here (the frontend has no @types/pg)
interface PgClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
}
const { Client } = backendRequire('pg') as { Client: new (config: object) => PgClient };
const bcrypt = backendRequire('bcrypt') as { hash: (data: string, rounds: number) => Promise<string> };

/** Slug prefix of every store an e2e UI run creates (used to verify cleanup) */
export const SLUG_PREFIX = 'e2e-ui-';

function readBackendEnv(): Record<string, string> {
  const file = path.join(BACKEND_DIR, '.env');
  const env: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export async function connect(): Promise<PgClient> {
  const env = readBackendEnv();
  const client = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  return client;
}

export type DbClient = PgClient;

/** A new active store with one owner, exactly as the backend e2e suites do it */
export async function createTenant(
  client: DbClient,
  opts: { name: string; slug: string; email: string; password: string },
  onTenant: (tenantId: string) => void,
) {
  const tenant = await client.query<{ id: string }>(
    `INSERT INTO tenants (name, slug, status) VALUES ($1, $2, 'active') RETURNING id`,
    [opts.name, opts.slug],
  );
  const tenantId = tenant.rows[0].id;
  // Recorded at once, so the store is deleted even if the rest of the setup fails
  onTenant(tenantId);
  const owner = await client.query<{ id: string }>(
    `INSERT INTO users (email, "passwordHash", "firstName", "lastName")
     VALUES ($1, $2, 'E2E', 'Owner') RETURNING id`,
    [opts.email, await bcrypt.hash(opts.password, 4)],
  );
  const userId = owner.rows[0].id;
  await client.query(
    `INSERT INTO tenant_memberships ("tenantId", "userId", status, role)
     VALUES ($1, $2, 'active', 'owner')`,
    [tenantId, userId],
  );
  return { tenantId, userId };
}

/**
 * Delete a throwaway store and everything in it (port of delete-tenant.ts).
 * Append-only ledgers only allow DELETE under the `app.audit_purge` flag, set on this
 * one dedicated connection. Tables still referenced by another table are retried.
 */
export async function deleteTenant(client: DbClient, tenantId: string, userIds: string[] = []) {
  const users = new Set(userIds);
  await client.query(`SELECT set_config('app.audit_purge', 'on', false)`);
  try {
    const members = await client.query<{ userId: string }>(
      `SELECT "userId" FROM tenant_memberships WHERE "tenantId" = $1`,
      [tenantId],
    );
    members.rows.forEach((row) => users.add(row.userId));

    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'tenantId'
         AND table_name <> 'tenants'`,
    );
    let remaining = [...new Set(tables.rows.map((row) => row.table_name))];

    // Self-referencing rows first
    await client.query(`UPDATE categories SET "parentId" = NULL WHERE "tenantId" = $1`, [tenantId]);

    for (let pass = 0; pass < 12 && remaining.length > 0; pass++) {
      const blocked: string[] = [];
      for (const table of remaining) {
        try {
          await client.query(`DELETE FROM "${table}" WHERE "tenantId" = $1`, [tenantId]);
        } catch {
          // Still referenced by another tenant table: retry on the next pass
          blocked.push(table);
        }
      }
      remaining = blocked;
    }
    if (remaining.length > 0) {
      throw new Error(`E2E cleanup could not empty: ${remaining.join(', ')} (tenant ${tenantId})`);
    }

    await client.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    // Only users this run created, and only if no other store uses them
    await client.query(
      `DELETE FROM users WHERE id = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM tenant_memberships m WHERE m."userId" = users.id)`,
      [[...users]],
    );
  } finally {
    await client.query(`SELECT set_config('app.audit_purge', '', false)`);
  }
}
