import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import '@/lib/sslFix';

const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN || '') || /sslmode=require/i.test(PG_CONN || '')
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const tipo = searchParams.get('tipo');

    const params: any[] = [];
    let where = '';
    if (tipo) {
      // Normalize by stripping non-alphanumerics on both sides to handle variants like CAD/CAM vs CAD-CAM
      where = `where regexp_replace(lower(pc.tipo), '[^a-z0-9]+', '', 'g') = regexp_replace(lower($1), '[^a-z0-9]+', '', 'g')`;
      params.push(tipo);
    }

    const sql = `
      select
        pc.id,
        pc.tipo,
        pc.categoria,
        count(p.id) filter (where coalesce(p.is_active, true) = true) as product_count
      from public.product_categories pc
      left join public.products p on p.category_id = pc.id
      ${where}
      group by pc.id, pc.tipo, pc.categoria
      order by pc.tipo asc, pc.categoria asc
    `;

    const { rows } = await pool.query(sql, params);
    return NextResponse.json((rows as any[]).map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      categoria: r.categoria,
      productCount: Number(r.product_count) || 0,
    })));
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao listar categorias', details: String(e?.message ?? e) }, { status: 500 });
  }
}
