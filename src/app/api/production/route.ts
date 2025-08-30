import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/apiAuth';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

function mapProductionRow(row: any) {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    code: row.code,
    workType: row.work_type,
    material: row.material,
    stageId: row.stage_id,
    operadorId: row.operador_id,
    operadorName: row.operador_name,
    lote: row.lote,
    camFiles: row.cam_files || [],
    cadFiles: row.cad_files || [],
    priority: row.priority,
    estimatedDelivery: row.estimated_delivery,
    actualDelivery: row.actual_delivery,
    data: row.data || {},
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const stageId = searchParams.get('stageId');
    const orderId = searchParams.get('orderId');
    const material = searchParams.get('material');
    const workType = searchParams.get('workType');
    const operadorId = searchParams.get('operadorId');

    const vals: any[] = [];
    const wh: string[] = ["coalesce(is_active, true) = true"];
    if (stageId) { vals.push(stageId); wh.push(`stage_id = $${vals.length}`); }
    if (orderId) { vals.push(Number(orderId)); wh.push(`order_id = $${vals.length}`); }
    if (material) { vals.push(material); wh.push(`material = $${vals.length}`); }
    if (workType) { vals.push(workType); wh.push(`work_type = $${vals.length}`); }
    if (operadorId) { vals.push(Number(operadorId)); wh.push(`operador_id = $${vals.length}`); }

    const sql = `
      select p.*, o.order_number
      from public.production p
      left join public.orders o on o.id = p.order_id
      where ${wh.map((w)=>w.replace(/\bstage_id\b/g,'p.stage_id').replace(/\border_id\b/g,'p.order_id').replace(/\bmaterial\b/g,'p.material').replace(/\bwork_type\b/g,'p.work_type').replace(/\boperador_id\b/g,'p.operador_id').replace(/\bis_active\b/g,'p.is_active')).join(' and ')}
      order by p.created_at desc nulls last
    `;
    const { rows } = await pool.query(sql, vals);
    return NextResponse.json(rows.map(mapProductionRow));
  } catch (e) {
    console.error('Erro ao listar produção:', e);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const data = await req.json();
    if (!data.orderId) return NextResponse.json({ message: 'orderId é obrigatório' }, { status: 400 });

    const params = [
      Number(data.orderId), // 1 order_id
      data.code || null,    // 2 code
      data.workType || null, // 3 work_type
      data.material || null, // 4 material
      data.stageId || 'iniciado', // 5 stage_id
      data.operadorId ? Number(data.operadorId) : null, // 6 operador_id
      data.operadorName || null, // 7 operador_name
      data.lote || null, // 8 lote
      JSON.stringify(Array.isArray(data.camFiles) ? data.camFiles : []), // 9 cam_files
      JSON.stringify(Array.isArray(data.cadFiles) ? data.cadFiles : []), // 10 cad_files
      data.priority || null, // 11 priority
      data.estimatedDelivery || null, // 12 estimated_delivery
      data.actualDelivery || null, // 13 actual_delivery
      JSON.stringify(data.data || {}), // 14 data
      data.isActive !== false // 15 is_active
    ];

    const { rows } = await pool.query(
      `insert into public.production (
        order_id, code, work_type, material, stage_id, operador_id, operador_name, lote,
        cam_files, cad_files, priority, estimated_delivery, actual_delivery, data, is_active
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15
      ) returning *`,
      params
    );
    return NextResponse.json(mapProductionRow(rows[0]), { status: 201 });
  } catch (e) {
    console.error('Erro ao criar job de produção:', e);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const data = await req.json();
    const sets: string[] = [];
    const vals: any[] = [];
    const push = (col: string, val: any) => { sets.push(`${col} = $${sets.length + 1}`); vals.push(val); };

    if (data.stageId !== undefined) push('stage_id', data.stageId);
    if (data.operadorId !== undefined) push('operador_id', data.operadorId ? Number(data.operadorId) : null);
    if (data.operadorName !== undefined) push('operador_name', data.operadorName ?? null);
    if (data.lote !== undefined) push('lote', data.lote ?? null);
    if (data.priority !== undefined) push('priority', data.priority ?? null);
    if (data.estimatedDelivery !== undefined) push('estimated_delivery', data.estimatedDelivery ?? null);
    if (data.actualDelivery !== undefined) push('actual_delivery', data.actualDelivery ?? null);
    if (data.camFiles !== undefined) push('cam_files', JSON.stringify(Array.isArray(data.camFiles) ? data.camFiles : []));
    if (data.cadFiles !== undefined) push('cad_files', JSON.stringify(Array.isArray(data.cadFiles) ? data.cadFiles : []));
    if (data.data !== undefined) push('data', JSON.stringify(data.data || {}));
    if (data.isActive !== undefined) push('is_active', !!data.isActive);
    push('updated_at', new Date().toISOString());

    if (!sets.length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });

    const sql = `update public.production set ${sets.join(', ')} where id = $${sets.length + 1} returning *`;
    vals.push(Number(id));
    const { rows } = await pool.query(sql, vals);
    if (!rows.length) return NextResponse.json({ error: 'Job de produção não encontrado' }, { status: 404 });
    return NextResponse.json(mapProductionRow(rows[0]));
  } catch (e) {
    console.error('Erro ao atualizar job de produção:', e);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
