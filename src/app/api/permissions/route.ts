import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { permissionsList } from '@/permissions/permissionsList';

// GET: retorna lista de permissões por role
export async function GET(req: NextRequest) {
  try {
    const CONN =
      (process.env.PG_URI as string | undefined) ||
      (process.env.DATABASE_URL as string | undefined) ||
      (process.env.POSTGRES_URL as string | undefined) ||
      (process.env.POSTGRES_PRISMA_URL as string | undefined) ||
      (process.env.POSTGRES_URL_NON_POOLING as string | undefined);
    if (!CONN) {
      return NextResponse.json(permissionsList, { status: 200 });
    }

    const needsSsl = /supabase\.(co|com)/.test(CONN) || /sslmode=require/i.test(CONN);
    const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;
    const pg = new Client({ connectionString: CONN, ssl });
    await pg.connect();
    try {
      // 1) Garantir tabela normalizada
      await pg.query(`
        create table if not exists public.permissions_roles (
          role text primary key,
          permissions jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);

      // 2) Se vazio, tentar migrar de public.permissions (lift-and-shift) se existir
      const countRes = await pg.query(`select count(*)::int as c from public.permissions_roles`);
      if ((countRes.rows[0]?.c ?? 0) === 0) {
        const hasOldRes = await pg.query(`
          select 1 from information_schema.tables where table_schema='public' and table_name='permissions' limit 1
        `);
        let migrated = 0;
        if (hasOldRes.rowCount > 0) {
          const oldRows = await pg.query(`select data from public.permissions`);
          for (const r of oldRows.rows) {
            const data = r.data as any;
            const role = String(data?.role || '');
            const perms = data?.permissions ?? null;
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
          // Drop antiga se migramos algo
          if (migrated > 0) {
            try {
              await pg.query(`drop table if exists public.permissions`);
            } catch {}
          }
        }
        // Se ainda vazio, semear com permissionsList
        const postMigCount = await pg.query(`select count(*)::int as c from public.permissions_roles`);
        if ((postMigCount.rows[0]?.c ?? 0) === 0) {
          for (const def of permissionsList) {
            await pg.query(
              `insert into public.permissions_roles (role, permissions)
               values ($1,$2)
               on conflict (role) do update set permissions=excluded.permissions, updated_at=now()`,
              [def.role, JSON.stringify(def.permissions)]
            );
          }
        }
      }

      // 3) Verificar chaves e alinhar com o permissionsList, se necessário
      const rowsRes = await pg.query(`select role, permissions from public.permissions_roles order by role asc`);
      const rows = rowsRes.rows as Array<{ role: string; permissions: any }>;

      const expectedKeys = Object.keys(permissionsList[0]?.permissions || {});
      const needsUpdate = rows.some(r => {
        const keys = Object.keys(r.permissions || {});
        return expectedKeys.some(k => !keys.includes(k));
      });
      if (needsUpdate) {
        for (const def of permissionsList) {
          await pg.query(
            `insert into public.permissions_roles (role, permissions)
             values ($1,$2)
             on conflict (role) do update set permissions=excluded.permissions, updated_at=now()`,
            [def.role, JSON.stringify(def.permissions)]
          );
        }
      }

      const finalRes = await pg.query(`select role, permissions from public.permissions_roles order by role asc`);
      return NextResponse.json(finalRes.rows, { status: 200 });
    } finally {
      await pg.end();
    }
  } catch (e) {
    console.error('Erro na API permissions:', e);
    // Fallback: retorna permissões padrão em caso de erro
    return NextResponse.json(permissionsList, { status: 200 });
  }
}


// DELETE: remove um role da tabela permissions_roles
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let role = url.searchParams.get('role') || '';
    if (!role) {
      try {
        const body = await req.json();
        if (body && typeof body.role === 'string') role = body.role;
      } catch {
        // ignore body parse errors (query string pode ser suficiente)
      }
    }
    if (typeof role !== 'string' || !role.trim()) {
      return NextResponse.json({ error: 'role inválido' }, { status: 400 });
    }

    const CONN =
      (process.env.PG_URI as string | undefined) ||
      (process.env.DATABASE_URL as string | undefined) ||
      (process.env.POSTGRES_URL as string | undefined) ||
      (process.env.POSTGRES_PRISMA_URL as string | undefined) ||
      (process.env.POSTGRES_URL_NON_POOLING as string | undefined);
    if (!CONN) {
      return NextResponse.json({ error: 'PG_URI/DATABASE_URL não configurado' }, { status: 500 });
    }

    const needsSsl = /supabase\.(co|com)/.test(CONN) || /sslmode=require/i.test(CONN);
    const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;
    const pg = new Client({ connectionString: CONN, ssl });
    await pg.connect();
    try {
      await pg.query(`
        create table if not exists public.permissions_roles (
          role text primary key,
          permissions jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);
      const res = await pg.query('delete from public.permissions_roles where role=$1', [role.trim()]);
      return NextResponse.json({ ok: true, deleted: res.rowCount }, { status: 200 });
    } finally {
      await pg.end();
    }
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao remover role' }, { status: 500 });
  }
}

// PUT: atualiza permissões de um role
export async function PUT(req: NextRequest) {
  try {
    const { role, permissions } = await req.json();
    if (typeof role !== 'string' || !role.trim()) {
      return NextResponse.json({ error: 'role inválido' }, { status: 400 });
    }
    if (typeof permissions !== 'object' || permissions === null) {
      return NextResponse.json({ error: 'permissions inválido' }, { status: 400 });
    }

    const CONN = (process.env.PG_URI as string | undefined) || (process.env.DATABASE_URL as string | undefined);
    if (!CONN) {
      return NextResponse.json({ error: 'PG_URI/DATABASE_URL não configurado' }, { status: 500 });
    }

    const ssl = CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined;
    const pg = new Client({ connectionString: CONN, ssl });
    await pg.connect();
    try {
      await pg.query('begin');
      await pg.query(`
        create table if not exists public.permissions_roles (
          role text primary key,
          permissions jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);
      await pg.query(
        `insert into public.permissions_roles (role, permissions)
         values ($1,$2)
         on conflict (role) do update set permissions=excluded.permissions, updated_at=now()`,
        [role.trim(), JSON.stringify(permissions)]
      );
      await pg.query('commit');
      return NextResponse.json({ ok: true });
    } catch (err) {
      await pg.query('rollback');
      throw err;
    } finally {
      await pg.end();
    }
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar permissões' }, { status: 500 });
  }
}

