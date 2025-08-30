import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

// PUT /api/users/[id]/permissions - atualiza as permissões do usuário (Postgres)
export async function PUT(request: NextRequest, context: any) {
  try {
    const { id } = (context?.params || {}) as { id: string };
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
    console.log('✅ Permissões atualizadas com sucesso (PG)');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Erro ao atualizar permissões do usuário (PG):', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
