import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/apiAuth';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

function mapStage(row: any, materials: string[]) {
  return {
    id: row.id,
    name: row.name,
    order: row.order_index,
    color: row.color || null,
    primaryColor: row.primary_color || null,
    cardBgColor: row.card_bg_color || null,
    isBackwardAllowed: row.is_backward_allowed === true,
    isActive: row.is_active !== false,
    materials,
  };
}

export async function GET(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { rows } = await pool.query(`select * from public.production_stages where coalesce(is_active, true) = true order by order_index asc, name asc`);
    const ids = rows.map((r: any) => String(r.id));
    const materialsMap = new Map<string, string[]>();
    if (ids.length) {
      const placeholders = ids.map((_: string, i: number) => `$${i + 1}`).join(',');
      const mres = await pool.query(
        `select stage_id, material from public.production_stage_materials where stage_id in (${placeholders})`,
        ids
      );
      for (const m of mres.rows) {
        const k = String(m.stage_id);
        const arr = materialsMap.get(k) || [];
        arr.push(String(m.material));
        materialsMap.set(k, arr);
      }
    }
    return NextResponse.json(rows.map((r: any) => mapStage(r, materialsMap.get(String(r.id)) || [])));
  } catch (e) {
    console.error('Erro ao listar stages de produção:', e);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Upsert de stage e materiais
export async function POST(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const data = await req.json();
    if (!data.id || !data.name) return NextResponse.json({ message: 'id e name são obrigatórios' }, { status: 400 });

    const params = [
      data.id,
      data.name,
      typeof data.order === 'number' ? data.order : 0,
      data.color || null,
      data.primaryColor || null,
      data.cardBgColor || null,
      data.isBackwardAllowed === true,
      data.isActive !== false,
    ];

    await pool.query(
      `insert into public.production_stages (id, name, order_index, color, primary_color, card_bg_color, is_backward_allowed, is_active)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (id) do update set
         name=excluded.name,
         order_index=excluded.order_index,
         color=excluded.color,
         primary_color=excluded.primary_color,
         card_bg_color=excluded.card_bg_color,
         is_backward_allowed=excluded.is_backward_allowed,
         is_active=excluded.is_active,
         updated_at=now()`,
      params
    );

    // Atualizar materiais vinculados (substituição simples)
    if (Array.isArray(data.materials)) {
      await pool.query(`delete from public.production_stage_materials where stage_id = $1`, [data.id]);
      for (const m of data.materials) {
        await pool.query(
          `insert into public.production_stage_materials (stage_id, material) values ($1,$2) on conflict (stage_id, material) do nothing`,
          [data.id, String(m)]
        );
      }
    }

    // Retornar stage atualizado
    const { rows } = await pool.query(`select * from public.production_stages where id = $1 limit 1`, [data.id]);
    const mats = await pool.query(`select material from public.production_stage_materials where stage_id = $1`, [data.id]);
    return NextResponse.json(mapStage(rows[0], mats.rows.map((r: any) => String(r.material))));
  } catch (e) {
    console.error('Erro ao upsert stage de produção:', e);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
