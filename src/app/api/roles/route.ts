import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { permissionsList } from '@/permissions/permissionsList';
import { logAppError } from '@/lib/logError';

export async function GET(request: NextRequest) {
  try {
    const PG_URI = (process.env.PG_URI as string | undefined) || (process.env.DATABASE_URL as string | undefined);
    // Fallback direto aos roles padrão se PG não estiver configurado
    if (!PG_URI) {
      const fallback = mapRolesForSelect(permissionsList.map(r => r.role));
      return NextResponse.json({ roles: fallback }, { status: 200 });
    }

    const ssl = PG_URI?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined;
    const pg = new Client({ connectionString: PG_URI, ssl });
    await pg.connect();
    try {
      // Garante a tabela (idempotente)
      await pg.query(`
        create table if not exists public.permissions_roles (
          role text primary key,
          permissions jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);

      const res = await pg.query(`select role from public.permissions_roles order by role asc`);
      const roles = (res.rows as Array<{ role: string }>).map((r) => r.role);
      const list = roles.length > 0 ? roles : permissionsList.map(r => r.role);
      return NextResponse.json({ roles: mapRolesForSelect(list) }, { status: 200 });
    } finally {
      await pg.end();
    }

  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    const fallback = mapRolesForSelect(permissionsList.map(r => r.role));
    await logAppError('roles GET failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({ roles: fallback }, { status: 200 });
  }
}

function mapRolesForSelect(roles: string[]) {
  const labels: Record<string, string> = {
    administrator: 'Administrador',
    manager: 'Gerente',
    laboratory: 'Laboratório',
    doctor: 'Dentista',
    technician: 'Técnico',
    attendant: 'Atendente',
  };
  return roles.map((role) => ({ value: role, label: labels[role] || capitalize(role) }));
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

