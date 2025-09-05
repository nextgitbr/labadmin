import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logAppError } from '@/lib/logError';

const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

// PUT /api/users/[id]/permissions - atualiza as permissões do usuário (Postgres)
export async function PUT(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params || {}) as { id: string };
    const userId = Number(id);
    console.log('🔄 Atualizando permissões para usuário (PG):', id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    const { permissions } = await request.json();
    console.log('📝 Permissões recebidas:', permissions);
    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json({ message: 'Permissões inválidas' }, { status: 400 });
    }

    const { rowCount } = await pool.query(
      `update public.users set permissions = $1, updated_at = now() where id = $2`,
      [JSON.stringify(permissions), userId]
    );
    if (!rowCount) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }
    // Buscar usuário atualizado e retornar
    const { rows } = await pool.query(`select * from public.users where id = $1 limit 1`, [userId]);
    const row = rows[0];
    const user = {
      _id: String(row.id),
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || '',
      company: row.company || '',
      permissions: row.permissions || {},
      country: row.country || '',
      city: row.city || '',
      zip: row.zip || '',
      vat: row.vat || '',
      avatar: row.avatar || '/images/avatars/01.png',
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    console.log('✅ Permissões atualizadas com sucesso (PG)');
    return NextResponse.json(user);
  } catch (error) {
    console.error('❌ Erro ao atualizar permissões do usuário (PG):', error);
    await logAppError('users/[id]/permissions PUT failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
