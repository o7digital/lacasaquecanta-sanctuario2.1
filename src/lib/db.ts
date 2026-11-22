import pg from "pg";
import type { PoolClient } from "pg";
let pool: pg.Pool | undefined;
export function getPool() {
  if (!process.env.DATABASE_URL)
    throw new ServiceError("database_not_configured", 503);
  return (pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  }));
}
export class ServiceError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function audit(
  client: PoolClient,
  actor: { id: string; tenant: string },
  action: string,
  entity: string,
  data: unknown = {},
) {
  await client.query(
    "INSERT INTO sc_audit(tenant_id,actor_id,action,entity_id,data) VALUES($1,$2,$3,$4,$5)",
    [actor.tenant, actor.id, action, entity, JSON.stringify(data)],
  );
}
