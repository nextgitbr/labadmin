import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import '@/lib/sslFix';
import { requireAuth } from '@/lib/apiAuth';
import { logAppError } from '@/lib/logError';

const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl:
    /supabase\.(co|com)/.test(PG_CONN || '') || /sslmode=require/i.test(PG_CONN || '')
      ? { rejectUnauthorized: false }
      : undefined,
});
function ensureCategoriesPermission(user: any) {
  const perms = user?.permissions || {};
  const hasSpecific = perms.configuracoesCategorias === true;
  const role = (user?.role || '').toLowerCase();
  const roleAllowed = role === 'administrator' || role === 'manager';
  if (!hasSpecific && !roleAllowed) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}

// Create category
export async function POST(req: NextRequest) {
  try {
    try {
      const user = await requireAuth(req);
      ensureCategoriesPermission(user);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 });
    }

    const { tipo, categoria } = await req.json();
    if (!tipo || !categoria) return NextResponse.json({ error: 'Campos obrigatórios: tipo, categoria' }, { status: 400 });

    const sql = `insert into public.product_categories (tipo, categoria) values ($1,$2) returning id, tipo, categoria`;
    const { rows } = await pool.query(sql, [tipo, categoria]);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    await logAppError('product-categories POST failed', 'error', { message: String(e?.message ?? e) });
    return NextResponse.json({ error: 'Erro ao criar categoria', details: String(e?.message ?? e) }, { status: 500 });
  }
}

// Update category by id
export async function PATCH(req: NextRequest) {
  try {
    try {
      const user = await requireAuth(req);
      ensureCategoriesPermission(user);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 });
    }
    const { id, tipo, categoria } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const sets: string[] = [];
    const vals: any[] = [];
    if (typeof tipo === 'string' && tipo.trim()) { vals.push(tipo.trim()); sets.push(`tipo=$${vals.length}`); }
    if (typeof categoria === 'string' && categoria.trim()) { vals.push(categoria.trim()); sets.push(`categoria=$${vals.length}`); }
    if (sets.length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    vals.push(id);
    const sql = `update public.product_categories set ${sets.join(', ')}, updated_at=now() where id=$${vals.length} returning id, tipo, categoria`;
    const res = await pool.query(sql, vals);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    await logAppError('product-categories PATCH failed', 'error', { message: String(e?.message ?? e) });
    return NextResponse.json({ error: 'Erro ao atualizar categoria', details: String(e?.message ?? e) }, { status: 500 });
  }
}

// Delete category by id (protect if referenced by products)
export async function DELETE(req: NextRequest) {
  try {
    try {
      const user = await requireAuth(req);
      ensureCategoriesPermission(user);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 });
    }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const ref = await pool.query('select count(*)::int as c from public.products where category_id = $1', [id]);
    const count = ref.rows[0]?.c ?? 0;
    if (count > 0) return NextResponse.json({ error: `Não é possível remover: ${count} produto(s) referenciam esta categoria` }, { status: 400 });

    const res = await pool.query('delete from public.product_categories where id=$1', [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    return NextResponse.json({ message: 'Categoria removida com sucesso' });
  } catch (e: any) {
    await logAppError('product-categories DELETE failed', 'error', { message: String(e?.message ?? e) });
    return NextResponse.json({ error: 'Erro ao remover categoria', details: String(e?.message ?? e) }, { status: 500 });
  }
}

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
    await logAppError('product-categories GET failed', 'error', { message: String(e?.message ?? e) });
    return NextResponse.json({ error: 'Erro ao listar categorias', details: String(e?.message ?? e) }, { status: 500 });
  }
}
