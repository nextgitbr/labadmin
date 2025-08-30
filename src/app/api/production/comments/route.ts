import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/apiAuth';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

function mapComment(row: any) {
  return {
    id: row.id,
    productionId: row.production_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    message: row.message,
    attachments: row.attachments || [],
    isInternal: row.is_internal === true,
    createdAt: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const productionId = searchParams.get('productionId');
    if (!productionId) return NextResponse.json({ message: 'productionId é obrigatório' }, { status: 400 });
    const { rows } = await pool.query(
      `select * from public.production_comments where production_id = $1 order by created_at asc`,
      [Number(productionId)]
    );
    return NextResponse.json(rows.map(mapComment));
  } catch (e) {
    console.error('Erro ao listar comentários de produção:', e);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const data = await req.json();
    if (!data.productionId || !data.message) {
      return NextResponse.json({ message: 'productionId e message são obrigatórios' }, { status: 400 });
    }
    const params = [
      Number(data.productionId),
      data.userId ? Number(data.userId) : null,
      data.userName || null,
      data.userRole || null,
      data.message,
      JSON.stringify(Array.isArray(data.attachments) ? data.attachments : []),
      data.isInternal === true,
    ];
    const { rows } = await pool.query(
      `insert into public.production_comments (
        production_id, user_id, user_name, user_role, message, attachments, is_internal
      ) values (
        $1,$2,$3,$4,$5,$6::jsonb,$7
      ) returning *`,
      params
    );
    return NextResponse.json(mapComment(rows[0]), { status: 201 });
  } catch (e) {
    console.error('Erro ao criar comentário de produção:', e);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
