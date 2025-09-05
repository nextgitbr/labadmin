import { Client } from 'pg';

// Logs a runtime error into public.app_errors table. Falls back to console if it fails.
export async function logAppError(message: string, level: 'error' | 'warn' | 'info' = 'error', meta?: any) {
  try {
    const conn =
      (process.env.PG_URI as string | undefined) ||
      (process.env.DATABASE_URL as string | undefined) ||
      (process.env.POSTGRES_URL as string | undefined) ||
      (process.env.POSTGRES_PRISMA_URL as string | undefined) ||
      (process.env.POSTGRES_URL_NON_POOLING as string | undefined);
    if (!conn) {
      console.warn('[logAppError] Missing PG connection string');
      return;
    }
    const needsSsl = /supabase\.(co|com)/.test(conn) || /sslmode=require/i.test(conn);
    const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;
    const pg = new Client({ connectionString: conn, ssl });
    await pg.connect();
    try {
      await pg.query(
        `insert into public.app_errors (message, level, meta, created_at) values ($1,$2,$3, now())`,
        [String(message || 'Unknown error'), String(level || 'error'), meta ? JSON.stringify(meta) : null]
      );
    } finally {
      await pg.end();
    }
  } catch (e: any) {
    console.error('[logAppError] failed:', e?.message || e);
  }
}
