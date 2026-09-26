/**
 * Deletes this run's store (whatever the test results), then checks that no store
 * of this run is left. Stores of earlier e2e UI runs that crashed before their
 * teardown (older than 2 hours) are swept up as well.
 */
import { connect, deleteTenant, SLUG_PREFIX } from './support/db';
import { readStateIfAny, writeState } from './support/state';

export default async function globalTeardown() {
  const state = readStateIfAny();
  const client = await connect();
  try {
    if (state?.tenantId) {
      await deleteTenant(client, state.tenantId, state.userIds);
      state.tenantId = null;
      writeState(state);
    }

    const stale = await client.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM tenants WHERE slug LIKE $1 AND created_at < now() - interval '2 hours'`,
      [`${SLUG_PREFIX}%`],
    );
    for (const tenant of stale.rows) {
      console.log(`[e2e] deleting stale e2e store ${tenant.slug}`);
      await deleteTenant(client, tenant.id);
    }

    if (state) {
      const left = await client.query(`SELECT count(*)::int AS n FROM tenants WHERE slug = $1`, [state.slug]);
      if (left.rows[0].n !== 0) throw new Error(`[e2e] store ${state.slug} still exists after teardown`);
      console.log(`[e2e] store ${state.slug} deleted`);
    }
  } finally {
    await client.end();
  }
}
