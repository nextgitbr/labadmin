import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Postgres pool (Supabase/PG) com fallbacks de conexão
const PG_CONN = process.env.PG_URI || 
                process.env.DATABASE_URL || 
                process.env.POSTGRES_URL || 
                process.env.POSTGRES_PRISMA_URL || 
                process.env.POSTGRES_URL_NON_POOLING;

const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') || PG_CONN?.includes('vercel') ? { rejectUnauthorized: false } : undefined,
});

function isNumericId(val: string | null): boolean {
  if (!val) return false;
  return /^\d+$/.test(val);
}

async function getOrderRowById(id: string) {
  try {
    if (isNumericId(id)) {
      const res = await pool.query(`select * from public.orders where id = $1 and coalesce(is_active, true) = true limit 1`, [Number(id)]);
      return res.rows[0];
    } else {
      const res = await pool.query(`select * from public.orders where external_id = $1 and coalesce(is_active, true) = true limit 1`, [id]);
      return res.rows[0];
    }
  } catch (error) {
    console.error('❌ Erro ao buscar pedido:', error);
    throw error;
  }
}

// --- Helpers de Notificações ---
type NotifyType = 'comment_added' | 'status_changed' | 'order_updated' | 'order_assigned' | 'system' | 'order_created';
async function notifyUser(userId: string, type: NotifyType, title: string, message: string, data?: any) {
  try {
    const nowIso = new Date().toISOString();
    const payload = {
      userId: String(userId),
      type,
      title,
      message,
      data: data ?? {},
      isRead: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await pool.query(`insert into public.notifications (data) values ($1)`, [JSON.stringify(payload)]);
  } catch (e) {
    console.error('⚠️ Falha ao inserir notificação (comentário):', e);
  }
}

async function getTeamUsers() {
  try {
    const roles = ['administrator', 'admin', 'manager', 'tecnico', 'atendente'];
    const { rows } = await pool.query(
      `select id, email from public.users where role = any($1::text[]) and coalesce(is_active, true) = true and coalesce(active::boolean, true) = true`,
      [roles]
    );
    return rows.map((r: any) => ({ id: String(r.id), email: String(r.email || '') }));
  } catch (error) {
    console.error('❌ Erro ao buscar usuários da equipe:', error);
    return [];
  }
}

// Não precisamos mais detectar storage; usaremos a tabela public.order_comments

// POST /api/orders/[id]/comments - adicionar comentário
export async function POST(
  req: NextRequest,
  context: any
) {
  try {
    console.log('📝 Iniciando adição de comentário...');
    
    const { id } = (context?.params || {}) as { id: string };
    if (!id) {
      console.error('❌ ID do pedido não fornecido');
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    console.log('📋 ID do pedido:', id);

    const formData = await req.formData();
    const message = String(formData.get('message') || '').trim();
    const userName = String(formData.get('userName') || 'Usuário');
    const userRole = String(formData.get('userRole') || 'user');

    console.log('📝 Dados do comentário:', { message, userName, userRole });

    if (!message) {
      console.error('❌ Mensagem vazia');
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    // Verificar se pedido existe
    console.log('🔍 Buscando pedido...');
    const order = await getOrderRowById(id);
    if (!order) {
      console.error('❌ Pedido não encontrado:', id);
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    console.log('✅ Pedido encontrado:', order.id, order.order_number);

    // Processar anexos: preferir 'uploaded' (JSON com urls) e manter fallback para arquivos crus
    let attachments: { name: string; size: number; type: string; url?: string; path?: string; bucket?: string }[] = [];
    const uploadedJson = formData.get('uploaded');
    if (uploadedJson && typeof uploadedJson === 'string') {
      try {
        const arr = JSON.parse(uploadedJson);
        if (Array.isArray(arr)) {
          attachments = arr.map((f: any) => ({
            name: String(f.name || ''),
            size: Number(f.size || 0),
            type: String(f.type || ''),
            url: f.url ? String(f.url) : undefined,
            path: f.path ? String(f.path) : undefined,
            bucket: f.bucket ? String(f.bucket) : undefined,
          }));
        }
      } catch (e) {
        console.warn('⚠️ Falha ao parsear campo uploaded (JSON) em comentários:', e);
      }
    }
    if (attachments.length === 0) {
      const files = formData.getAll('files') as File[];
      for (const file of files) {
        try {
          if (file && typeof file.size === 'number' && file.size > 0) {
            attachments.push({ name: file.name, size: file.size, type: file.type });
          }
        } catch {}
      }
    }

    console.log('📎 Anexos processados:', attachments.length);

    // Gerar id simples para o comentário (compat)
    const commentId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const nowIso = new Date().toISOString();
    const newComment = {
      _id: commentId,
      userId: '', // opcional/compat
      userName,
      userRole,
      message,
      createdAt: nowIso,
      isInternal: false,
      attachments,
    };

    console.log('💾 Inserindo comentário na base de dados...');

    // Inserir na tabela de comentários
    // Obter id numérico do pedido para FK
    const orderRow = await getOrderRowById(id);
    const orderIdNum = Number(orderRow.id);
    
    console.log('🔢 ID numérico do pedido:', orderIdNum);
    
    await pool.query(
      `insert into public.order_comments (order_id, user_id, user_name, user_role, message, attachments, is_internal, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        orderIdNum,
        null,
        newComment.userName,
        newComment.userRole,
        newComment.message,
        JSON.stringify(newComment.attachments || []),
        false,
        new Date(newComment.createdAt as any),
      ]
    );
    
    console.log('✅ Comentário inserido com sucesso');
    
    // Atualizar updated_at do pedido
    await pool.query(`update public.orders set updated_at = now() where id = $1`, [orderIdNum]);
    
    console.log('✅ Pedido atualizado');

    // --- Disparo de Notificações ---
    try {
      console.log('📢 Enviando notificações...');
      const orderNumber = orderRow.order_number as string;
      const title = `Novo comentário no pedido ${orderNumber}`;
      const message = `${newComment.userName}: ${newComment.message}`;
      const dataPayload = { orderId: String(orderRow.external_id || orderRow.id), orderNumber };

      const teamRoles = ['administrator', 'admin', 'manager', 'tecnico', 'atendente'];
      const isTeamMember = teamRoles.includes((newComment.userRole || '').toLowerCase());

      if (isTeamMember) {
        // Notificar criador do pedido (se existir) e técnico designado
        const creator = orderRow.created_by;
        if (creator !== null && creator !== undefined && String(creator).length > 0) {
          await notifyUser(String(creator), 'comment_added', title, message, dataPayload);
          console.log('📧 Notificação enviada para criador:', creator);
        }
        const assigned = orderRow.assigned_to;
        if (assigned !== null && assigned !== undefined && String(assigned).length > 0) {
          await notifyUser(String(assigned), 'comment_added', title, message, dataPayload);
          console.log('📧 Notificação enviada para técnico:', assigned);
        }
      } else {
        // Usuário/cliente comentou -> notificar toda a equipe
        const team = await getTeamUsers();
        console.log('👥 Notificando equipe:', team.length, 'usuários');
        for (const u of team) {
          await notifyUser(String(u.id), 'comment_added', title, message, dataPayload);
        }
      }
      console.log('✅ Notificações enviadas');
    } catch (e) {
      console.error('⚠️ Falha no disparo de notificações (comentário):', e);
    }

    console.log('🎉 Comentário adicionado com sucesso');
    return NextResponse.json({ success: true, comment: newComment });
  } catch (error: any) {
    console.error('❌ Erro ao adicionar comentário (PG):', error);
    console.error('❌ Stack trace:', error?.stack);
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error?.message || 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
