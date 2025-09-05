import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import '@/lib/sslFix'; // Aplicar correção SSL global
import { logAppError } from '@/lib/logError';

// Pool Postgres (Supabase/PG) com fallbacks e SSL condicional
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
    await logAppError('notifications GET failed', 'error', { message: (error as any)?.message });
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
    await logAppError('notifications POST failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/notifications - marcar como lida/não lida
export async function PATCH(req: NextRequest) {
  console.log('🚀 PATCH FUNCTION STARTED - notificações');

  try {
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const markAllAsRead = searchParams.get('markAllAsRead') === 'true';

    console.log('📋 Parâmetros recebidos:', { id, userId, markAllAsRead });

    // Marcar todas como lidas
    if (markAllAsRead && userId) {
      console.log('📚 Marcando todas as notificações como lidas para userId:', userId);
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

    // Marcar uma específica como lida
    if (!id) {
      console.error('❌ ID da notificação não fornecido');
      return NextResponse.json({ error: 'ID da notificação é obrigatório' }, { status: 400 });
    }

    console.log('🔍 ID original recebido:', { id, type: typeof id });

    const idNum = parseInt(String(id), 10);
    console.log('🔢 ID convertido para número:', { idNum, isFinite: Number.isFinite(idNum) });

    if (!Number.isFinite(idNum) || idNum <= 0) {
      console.error('❌ ID da notificação inválido:', { id, idNum });
      return NextResponse.json({ error: 'ID da notificação inválido' }, { status: 400 });
    }

    console.log('🔢 ID numérico da notificação:', idNum);

    // Verificar se a notificação existe
    console.log('🔍 Verificando se notificação existe...');
    const { rows: existingRows } = await pool.query(
      `select id, data from public.notifications where id = $1`,
      [idNum]
    );

    console.log('📊 Resultado da busca:', { found: existingRows.length });

    if (existingRows.length === 0) {
      console.error('❌ Notificação não encontrada:', idNum);
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    console.log('✅ Notificação encontrada:', existingRows[0].id);

    // Atualizar para marcar como lida
    console.log('📖 Marcando notificação como lida...');
    const { rowCount } = await pool.query(
      `update public.notifications
       set data = jsonb_set(data, '{isRead}', 'true'::jsonb, true),
           updated_at = now()
       where id = $1`,
      [idNum]
    );

    console.log('📊 Linhas afetadas:', rowCount);

    if (rowCount === 0) {
      console.error('❌ Nenhuma linha foi atualizada para ID:', idNum);
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    // Buscar a notificação atualizada
    const { rows } = await pool.query(
      `select id, data, created_at, updated_at from public.notifications where id = $1`,
      [idNum]
    );

    const updated = mapRowToNotification(rows[0]);
    console.log('✅ Notificação atualizada (PG):', id);
    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('❌ Erro ao atualizar notificação (PG):', error);
    console.error('❌ Stack trace:', error?.stack);
    await logAppError('notifications PATCH failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
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
    await logAppError('notifications DELETE failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
