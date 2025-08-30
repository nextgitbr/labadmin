// Creates the normalized permissions_roles table in Postgres
// Usage: node scripts/create-permissions-roles-table.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadPgUri() {
  const envPg = process.env.PG_URI;
  if (envPg && envPg.trim()) return envPg.trim();
  // Fallback: try to read .env.local
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^\s*PG_URI\s*=\s*(.+)\s*$/);
        if (m) {
          // Remove surrounding quotes if present
          let v = m[1].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          return v;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Default permissions (mirrors src/permissions/permissionsList.ts)
const defaultPermissions = [
  { role: 'administrator', permissions: { dashboard: true, pedidos: { visualizar: true, criar: true, editar: true }, kanban: true, tabelaPrecos: true, calendar: true, usuarios: true, configuracoes: true, configuracoesKanban: true } },
  { role: 'manager',        permissions: { dashboard: true, pedidos: { visualizar: true, criar: true, editar: true }, kanban: true, tabelaPrecos: true, calendar: true, usuarios: true, configuracoes: true, configuracoesKanban: true } },
  { role: 'laboratory',     permissions: { dashboard: true, pedidos: { visualizar: true, criar: true, editar: true }, kanban: true, tabelaPrecos: true, calendar: true, usuarios: false, configuracoes: false, configuracoesKanban: false } },
  { role: 'doctor',         permissions: { dashboard: true, pedidos: { visualizar: true, criar: true, editar: false }, kanban: false, tabelaPrecos: true, calendar: false, usuarios: false, configuracoes: false, configuracoesKanban: false } },
  { role: 'technician',     permissions: { dashboard: true, pedidos: { visualizar: true, criar: false, editar: true }, kanban: true, tabelaPrecos: false, calendar: true, usuarios: false, configuracoes: false, configuracoesKanban: false } },
  { role: 'attendant',      permissions: { dashboard: true, pedidos: { visualizar: true, criar: false, editar: false }, kanban: false, tabelaPrecos: false, calendar: true, usuarios: false, configuracoes: false, configuracoesKanban: false } },
];

(async () => {
  const pgUri = loadPgUri();
  if (!pgUri) {
    console.error('PG_URI not found. Set it in environment or .env.local');
    process.exit(1);
  }

  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  try {
    await pg.connect();
    await pg.query(`
      create table if not exists public.permissions_roles (
        role text primary key,
        permissions jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    // Check if empty
    const countRes = await pg.query(`select count(*)::int as c from public.permissions_roles`);
    if ((countRes.rows[0]?.c ?? 0) === 0) {
      // Try to migrate from legacy public.permissions
      const hasOldRes = await pg.query(`select 1 from information_schema.tables where table_schema='public' and table_name='permissions' limit 1`);
      let migrated = 0;
      if (hasOldRes.rowCount > 0) {
        const oldRows = await pg.query(`select data from public.permissions`);
        for (const r of oldRows.rows) {
          const data = r.data || {};
          const role = String(data.role || '').trim();
          const perms = data.permissions;
          if (role && perms && typeof perms === 'object') {
            await pg.query(
              `insert into public.permissions_roles (role, permissions)
               values ($1,$2)
               on conflict (role) do update set permissions=excluded.permissions, updated_at=now()`,
              [role, JSON.stringify(perms)]
            );
            migrated++;
          }
        }
        if (migrated > 0) {
          try { await pg.query(`drop table if exists public.permissions`); } catch {}
        }
      }

      // Seed defaults if still empty
      const postMigCount = await pg.query(`select count(*)::int as c from public.permissions_roles`);
      if ((postMigCount.rows[0]?.c ?? 0) === 0) {
        for (const def of defaultPermissions) {
          await pg.query(
            `insert into public.permissions_roles (role, permissions)
             values ($1,$2)
             on conflict (role) do update set permissions=excluded.permissions, updated_at=now()`,
            [def.role, JSON.stringify(def.permissions)]
          );
        }
      }
    }

    console.log('permissions_roles table is ready and data ensured.');
  } catch (e) {
    console.error('Failed to create table:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
