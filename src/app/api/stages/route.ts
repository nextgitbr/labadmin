import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { requireAuth } from '@/lib/apiAuth';

function getPg() {
  const conn = (process.env.PG_URI as string | undefined) || (process.env.DATABASE_URL as string | undefined);
  if (!conn) throw new Error('PG_URI/DATABASE_URL não configurado');
  const ssl = conn?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined;
  return new Client({ connectionString: conn, ssl });
}

// Helpers simples para derivar cores padrão quando não fornecidas
function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function mix(a: number, b: number, t: number) { return a * (1 - t) + b * t; }
function mixWith(hex: string, otherHex: string, ratio: number) {
  const A = hexToRgb(hex); const B = hexToRgb(otherHex);
  const r = clamp(mix(A.r, B.r, ratio));
  const g = clamp(mix(A.g, B.g, ratio));
  const b = clamp(mix(A.b, B.b, ratio));
  return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}
function deriveDefaults(color: string) {
  // background mais claro, stroke mais escuro, primary igual à cor
  return {
    backgroundColor: mixWith(color, '#ffffff', 0.9),
    stroke: mixWith(color, '#000000', 0.25),
    primaryColor: color,
    cardBgColor: mixWith(color, '#ffffff', 0.92),
  };
}

// Tipos e normalizadores
type StageRow = {
  id: string;
  name: string;
  color: string;
  stroke: string | null;
  background_color: string | null;
  primary_color: string | null;
  card_bg_color: string | null;
  order: number;
};

type StageJson = {
  id: string;
  name: string;
  color: string;
  stroke?: string;
  backgroundColor?: string;
  primaryColor?: string;
  cardBgColor?: string;
  order: number;
};

function toCamel(r: StageRow): StageJson {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    stroke: r.stroke ?? undefined,
    backgroundColor: r.background_color ?? undefined,
    primaryColor: r.primary_color ?? undefined,
    cardBgColor: r.card_bg_color ?? undefined,
    order: r.order,
  };
}

function fillDefaults(s: StageJson): StageJson {
  const needs = !s.backgroundColor || !s.stroke || !s.primaryColor || !s.cardBgColor;
  if (!needs) return s;
  const d = deriveDefaults(s.color);
  return {
    ...s,
    stroke: s.stroke ?? d.stroke,
    backgroundColor: s.backgroundColor ?? d.backgroundColor,
    primaryColor: s.primaryColor ?? d.primaryColor,
    cardBgColor: s.cardBgColor ?? d.cardBgColor,
  };
}

// PATCH /api/stages - atualizar atributos (nome/cor) de uma etapa por id
export async function PATCH(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const data = await req.json();
    const { id, name, color, stroke, backgroundColor, primaryColor, cardBgColor } = data || {};
    if (!id) return NextResponse.json({ error: 'ID da etapa é obrigatório' }, { status: 400 });

    const sets: string[] = [];
    const values: any[] = [];
    // Visual columns
    function addSet(col: string, val?: string) {
      if (typeof val === 'string' && val.trim()) {
        values.push(val.trim());
        sets.push(`${col}=$${values.length}`);
      }
    }
    addSet('stroke', stroke);
    addSet('background_color', backgroundColor);
    addSet('primary_color', primaryColor);
    addSet('card_bg_color', cardBgColor);
    // Columns for name/color
    if (typeof name === 'string' && name.trim()) {
      values.push(name.trim());
      sets.push(`name=$${values.length}`);
    }
    if (typeof color === 'string' && color.trim()) {
      values.push(color.trim());
      sets.push(`color=$${values.length}`);
    }
    if (sets.length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });

    const pg = getPg();
    await pg.connect();
    try {
      values.push(id);
      const sql = `update public.stages set ${sets.join(', ')}, updated_at=now() where id=$${values.length}`;
      const res = await pg.query(sql, values);
      if (res.rowCount === 0) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });

      const rowRes = await pg.query(
        `select 
           id,
           name,
           color,
           stroke,
           background_color,
           primary_color,
           card_bg_color,
           "order"
         from public.stages where id=$1`,
        [id]
      );
      const r = rowRes.rows[0] as StageRow;
      const json = toCamel(r);
      return NextResponse.json(json);
    } finally {
      await pg.end();
    }
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET /api/stages - listar todas as etapas
export async function GET(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const pg = getPg();
    await pg.connect();
    try {
      const res = await pg.query(
        `select 
           id,
           name,
           color,
           stroke,
           background_color,
           primary_color,
           card_bg_color,
           "order"
         from public.stages
         order by "order" asc nulls last`
      );
      const list = res.rows.map((r: StageRow) => toCamel(r));
      // Preencher visuais ausentes derivando de color
      const filled = list.map((s: StageJson) => fillDefaults(s));
      return NextResponse.json(filled);
    } finally {
      await pg.end();
    }
  } catch (error) {
    console.error('Erro ao buscar etapas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/stages - criar nova etapa
export async function POST(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const data = await req.json();
    if (!data.name || !data.color) return NextResponse.json({ error: 'Nome e cor são obrigatórios' }, { status: 400 });

    const id: string = String(data.name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const pg = getPg();
    await pg.connect();
    try {
      const exists = await pg.query('select 1 from public.stages where id=$1', [id]);
      if (exists.rowCount > 0) return NextResponse.json({ error: 'Etapa com este nome já existe' }, { status: 400 });

      const maxRes = await pg.query('select coalesce(max("order"),0)::int as max from public.stages');
      const nextOrder = (maxRes.rows[0]?.max ?? 0) + 1;

      const d = deriveDefaults(String(data.color));
      const stroke = (data.stroke?.trim?.()) || d.stroke;
      const backgroundColor = (data.backgroundColor?.trim?.()) || d.backgroundColor;
      const primaryColor = (data.primaryColor?.trim?.()) || d.primaryColor;
      const cardBgColor = (data.cardBgColor?.trim?.()) || d.cardBgColor;

      await pg.query(
        `insert into public.stages (id, name, color, stroke, background_color, primary_color, card_bg_color, "order")
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, data.name, data.color, stroke, backgroundColor, primaryColor, cardBgColor, nextOrder]
      );

      return NextResponse.json({ id, name: data.name, color: data.color, stroke, backgroundColor, primaryColor, cardBgColor, order: nextOrder });
    } finally {
      await pg.end();
    }
  } catch (error) {
    console.error('Erro ao criar etapa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/stages - atualizar ordem das etapas
export async function PUT(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { stages } = await req.json();
    if (!Array.isArray(stages)) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });

    const pg = getPg();
    await pg.connect();
    try {
      await pg.query('begin');
      for (let i = 0; i < stages.length; i++) {
        const st = stages[i];
        await pg.query('update public.stages set "order"=$1, updated_at=now() where id=$2', [i + 1, st.id]);
      }
      await pg.query('commit');
      return NextResponse.json({ message: 'Ordem das etapas atualizada com sucesso' });
    } catch (e) {
      await pg.query('rollback');
      throw e;
    } finally {
      await pg.end();
    }
  } catch (error) {
    console.error('Erro ao atualizar ordem das etapas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/stages?id=<id> - remover etapa
export async function DELETE(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID da etapa é obrigatório' }, { status: 400 });

    const pg = getPg();
    await pg.connect();
    try {
      const cnt = await pg.query('select count(*)::int as c from public.orders where status=$1', [id]);
      const n = cnt.rows[0]?.c ?? 0;
      if (n > 0) return NextResponse.json({ error: `Não é possível remover etapa com ${n} pedidos` }, { status: 400 });

      const res = await pg.query('delete from public.stages where id=$1', [id]);
      if (res.rowCount === 0) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });
      return NextResponse.json({ message: 'Etapa removida com sucesso' });
    } finally {
      await pg.end();
    }
  } catch (error) {
    console.error('Erro ao remover etapa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
