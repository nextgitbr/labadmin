import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Pool Postgres (Supabase/PG)
const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

// Tipagem de apoio para resposta ao frontend
type NotificationType = 'order_created' | 'order_updated' | 'status_changed' | 'comment_added' | 'order_assigned' | 'system';
interface NotificationDTO {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

function mapRowToNotification(row: any): NotificationDTO {
  const d = row.data || {};
  const createdAt = (d.createdAt ? new Date(d.createdAt) : row.created_at) as Date;
  const updatedAt = (d.updatedAt ? new Date(d.updatedAt) : row.updated_at) as Date;
  return {
    _id: String(row.id),
    userId: String(d.userId ?? ''),
    type: (d.type ?? 'system') as NotificationType,
    title: String(d.title ?? ''),
    message: String(d.message ?? ''),
    data: d.data,
    isRead: Boolean(d.isRead === true || String(d.isRead).toLowerCase() === 'true'),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
  };
}

// GET /api/notifications - listar notificações do usuário
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Monta WHERE
    const whereParts: string[] = [
      `(data->>'userId') = $1`,
      `((data ? 'expiresAt') = false OR (to_timestamp(NULLIF(data->>'expiresAt','')::double precision) > now()) OR (data->>'expiresAt')::timestamptz > now())`
    ];
    const params: any[] = [userId];
    if (unreadOnly) {
      whereParts.push(`COALESCE((data->>'isRead')::boolean, false) = false`);
    }

    const whereSql = whereParts.join(' AND ');
    const { rows } = await pool.query(
      `select id, data, created_at, updated_at
       from public.notifications
       where ${whereSql}
       order by created_at desc
       limit $${params.length + 1}`,
      [...params, limit]
    );

    const list = rows.map(mapRowToNotification);

    const { rows: unreadRows } = await pool.query(
      `select count(1)::int as c
       from public.notifications
       where (data->>'userId') = $1
         and COALESCE((data->>'isRead')::boolean, false) = false
         and ((data ? 'expiresAt') = false OR (to_timestamp(NULLIF(data->>'expiresAt','')::double precision) > now()) OR (data->>'expiresAt')::timestamptz > now())`,
      [userId]
    );
    const unreadCount = unreadRows?.[0]?.c ?? 0;

    return NextResponse.json({ notifications: list, unreadCount, total: list.length });
  } catch (error) {
    console.error('❌ Erro na API notifications GET (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/notifications - criar nova notificação
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: 'type é obrigatório' }, { status: 400 });
    }
    if (!body.title) {
      return NextResponse.json({ error: 'title é obrigatório' }, { status: 400 });
    }
    if (!body.message) {
      return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const data = {
      userId: String(body.userId),
      type: String(body.type),
      title: String(body.title),
      message: String(body.message),
      data: body.data ?? {},
      isRead: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(body.expiresAt ? { expiresAt: body.expiresAt } : {}),
    };

    const { rows } = await pool.query(
      `insert into public.notifications (data) values ($1) returning id, data, created_at, updated_at`,
      [JSON.stringify(data)]
    );

    const created = mapRowToNotification(rows[0]);
    console.log('✅ Notificação criada (PG):', { id: created._id, userId: created.userId, type: created.type, title: created.title });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar notificação (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/notifications - marcar como lida/não lida
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const markAllAsRead = searchParams.get('markAllAsRead') === 'true';

    const body = await req.json().catch(() => ({}));

    if (markAllAsRead && userId) {
      const { rowCount } = await pool.query(
        `update public.notifications
         set data = jsonb_set(data, '{isRead}', 'true'::jsonb, true),
             updated_at = now()
         where (data->>'userId') = $1
           and COALESCE((data->>'isRead')::boolean, false) = false`,
        [userId]
      );
      console.log('✅ Todas as notificações marcadas como lidas (PG):', { userId, modifiedCount: rowCount });
      return NextResponse.json({ success: true, modifiedCount: rowCount });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da notificação é obrigatório' }, { status: 400 });
    }
    const idNum = parseInt(String(id), 10);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'ID da notificação inválido' }, { status: 400 });
    }

    // Atualização específica: suportar isRead, title, message, data, expiresAt
    const patches: string[] = [];
    const params: any[] = [];

    const nowIso = new Date().toISOString();
    patches.push(`data = jsonb_set(data, '{updatedAt}', to_jsonb($${params.push(nowIso)}::text), true)`);

    if (typeof body.isRead !== 'undefined') {
      patches.push(`data = jsonb_set(data, '{isRead}', to_jsonb($${params.push(Boolean(body.isRead))}::boolean), true)`);
    }
    if (typeof body.title === 'string') {
      patches.push(`data = jsonb_set(data, '{title}', to_jsonb($${params.push(body.title)}::text), true)`);
    }
    if (typeof body.message === 'string') {
      patches.push(`data = jsonb_set(data, '{message}', to_jsonb($${params.push(body.message)}::text), true)`);
    }
    if (typeof body.expiresAt !== 'undefined') {
      if (body.expiresAt === null) {
        patches.push(`data = data - 'expiresAt'`);
      } else {
        patches.push(`data = jsonb_set(data, '{expiresAt}', to_jsonb($${params.push(String(body.expiresAt))}::text), true)`);
      }
    }
    if (typeof body.data !== 'undefined') {
      // substitui objeto data interno por completo
      patches.push(`data = jsonb_set(data, '{data}', $${params.push(JSON.stringify(body.data))}::jsonb, true)`);
    }

    if (patches.length === 1) { // apenas updatedAt
      patches.push(`data = jsonb_set(data, '{isRead}', to_jsonb(true), true)`);
    }

    const setSql = patches.join(', ');
    const { rowCount } = await pool.query(
      `update public.notifications set ${setSql}, updated_at = now() where id = $${params.push(idNum)}`,
      params
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    const { rows } = await pool.query(
      `select id, data, created_at, updated_at from public.notifications where id = $1`,
      [idNum]
    );
    const updated = mapRowToNotification(rows[0]);
    console.log('✅ Notificação atualizada (PG):', id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('❌ Erro ao atualizar notificação (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/notifications - remover notificação
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll && userId) {
      const { rowCount } = await pool.query(
        `delete from public.notifications
         where (data->>'userId') = $1
           and COALESCE((data->>'isRead')::boolean, false) = true`,
        [userId]
      );
      console.log('✅ Notificações lidas removidas (PG):', { userId, deletedCount: rowCount });
      return NextResponse.json({ success: true, deletedCount: rowCount });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da notificação é obrigatório' }, { status: 400 });
    }

    const { rowCount } = await pool.query(`delete from public.notifications where id = $1`, [Number(id)]);
    if (rowCount === 0) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    console.log('✅ Notificação removida (PG):', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao remover notificação (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
