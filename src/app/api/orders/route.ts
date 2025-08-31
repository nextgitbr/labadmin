import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { addBusinessDays } from '@/utils/businessDays';
import { requireSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAuth } from '@/lib/apiAuth';
import '@/lib/sslFix'; // Aplicar correção SSL global

// Postgres pool (Supabase/PG) com fallbacks e SSL condicional
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

function mapOrderRow(row: any) {
  return {
    // compat: prefer external_id as _id when available
    _id: row.external_id ? String(row.external_id) : String(row.id),
    id: row.id,
    orderNumber: row.order_number,
    patientName: row.patient_name,
    workType: row.work_type,
    selectedMaterial: row.selected_material,
    selectedVitaShade: row.selected_vita_shade,
    toothConstructions: row.tooth_constructions || {},
    selectedTeeth: row.selected_teeth || [],
    uploadedFiles: row.uploaded_files || [],
    caseObservations: row.case_observations,
    status: row.status,
    priority: row.priority,
    estimatedDelivery: row.estimated_delivery,
    actualDelivery: row.actual_delivery,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active !== false,
    version: row.version ?? 1,
  };
}

// Utilitário para formatar nome a partir de email
function prettyNameFromEmail(email: string) {
  try {
    const nick = email.split('@')[0];
    return nick
      .replace(/\./g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return email;
  }
}

function isNumericId(val: string | null): boolean {
  if (!val) return false;
  return /^\d+$/.test(val);
}

// --- Helpers de Notificações ---
type NotifyType = 'order_created' | 'order_updated' | 'status_changed' | 'comment_added' | 'order_assigned' | 'system';
async function notifyUser(pool: any, userId: string, type: NotifyType, title: string, message: string, data?: any) {
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
    console.error('⚠️ Falha ao inserir notificação (orders):', e);
  }
}
async function getTeamUsers(pool: any) {
  const roles = ['administrator', 'admin', 'manager', 'tecnico', 'atendente'];
  const { rows } = await pool.query(
    `select id from public.users where role = any($1::text[]) and coalesce(is_active, true) = true and coalesce(active::boolean, true) = true`,
    [roles]
  );
  return rows.map((r: any) => String(r.id));
}

async function notifyMany(pool: any, userIds: (string | number | null | undefined)[], type: NotifyType, title: string, message: string, data?: any) {
  const unique = Array.from(new Set(userIds.filter((v) => v !== null && v !== undefined && String(v).length > 0).map((v) => String(v))));
  for (const uid of unique) {
    await notifyUser(pool, uid, type, title, message, data);
  }
}

// GET /api/orders - listar todos os pedidos
export async function GET(req: NextRequest) {
  try {
    // try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (id) {
      // Buscar pedido específico por id (numérico) OU por external_id (string Mongo)
      let row;
      if (isNumericId(id)) {
        const res = await pool.query(
          `select * from public.orders where id = $1 and coalesce(is_active, true) = true limit 1`,
          [Number(id)]
        );
        row = res.rows[0];
      } else {
        const res = await pool.query(
          `select * from public.orders where external_id = $1 and coalesce(is_active, true) = true limit 1`,
          [id]
        );
        row = res.rows[0];
      }
      if (!row) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
      }
      const order = mapOrderRow(row);
      // Resolver nome do criador quando possível
      try {
        const cb = row.created_by;
        if (cb && /^\d+$/.test(String(cb))) {
          const ures = await pool.query(`select first_name, last_name, company from public.users where id = $1 limit 1`, [Number(cb)]);
          if (ures.rowCount) {
            const u = ures.rows[0];
            (order as any).createdByName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            (order as any).createdByCompany = u.company || '';
          }
        } else if (cb && typeof cb === 'string' && cb.includes('@')) {
          (order as any).createdByName = prettyNameFromEmail(cb);
          (order as any).createdByCompany = '';
        }
      } catch {}
      // Agregar comentários da tabela public.order_comments
      try {
        const { rows: commentsRows } = await pool.query(
          `select id, user_id, user_name, user_role, message, attachments, is_internal, created_at
           from public.order_comments
           where order_id = $1
           order by created_at asc`,
          [row.id]
        );
        const comments = commentsRows.map((c: any) => ({
          _id: String(c.id),
          userId: c.user_id || '',
          userName: c.user_name || 'Usuário',
          userRole: c.user_role || 'user',
          message: c.message || '',
          createdAt: c.created_at,
          isInternal: c.is_internal === true,
          attachments: Array.isArray(c.attachments) ? c.attachments : (c.attachments || []),
        }));
        (order as any).comments = comments;
      } catch (e) {
        // Em caso de erro ao agregar comentários, retornamos o pedido sem eles
        console.warn('Falha ao agregar comentários do pedido', row.id, e);
        (order as any).comments = [];
      }
      return NextResponse.json(order);
    }

    const vals: any[] = [];
    let sql = `select * from public.orders where coalesce(is_active, true) = true`;
    if (userId) {
      sql += ` and created_by = $1`;
      vals.push(userId);
    }
    sql += ` order by created_at desc nulls last`;
    const { rows } = await pool.query(sql, vals);
    const orders = rows.map(mapOrderRow);

    // Resolver nomes dos criadores em lote para IDs numéricos
    try {
      const ids = Array.from(new Set(
        (rows as any[])
          .map((r: any) => r.created_by)
          .filter((v: any) => v !== null && v !== undefined)
      ));

      const numericIds = ids
        .map((v: any) => String(v))
        .filter(v => /^\d+$/.test(v))
        .map(v => Number(v));

      const idToName = new Map<number, string>();
      if (numericIds.length) {
        const placeholders = numericIds.map((_, i) => `$${i + 1}`).join(',');
        const ures = await pool.query(
          `select id, first_name, last_name, company from public.users where id in (${placeholders})`,
          numericIds
        );
        const idToCompany = new Map<number, string>();
        for (const u of ures.rows) {
          const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          const uid = Number(u.id);
          if (full) idToName.set(uid, full);
          if (u.company) idToCompany.set(uid, u.company);
        }

        // Attach companies using closure map
        (orders as any[]).forEach((o: any, idx: number) => {
          const cb = rows[idx].created_by;
          if (cb && /^\d+$/.test(String(cb))) {
            const uid = Number(cb);
            const comp = idToCompany.get(uid) || '';
            if (comp) o.createdByCompany = comp;
          }
        });
      }

      orders.forEach((o: any, idx: number) => {
        const cb = rows[idx].created_by;
        if (cb && /^\d+$/.test(String(cb))) {
          const name = idToName.get(Number(cb));
          if (name) o.createdByName = name;
        } else if (cb && typeof cb === 'string' && cb.includes('@')) {
          o.createdByName = prettyNameFromEmail(cb);
          o.createdByCompany = '';
        }
      });
    } catch {}

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Erro ao buscar pedidos (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Função para gerar ID personalizado do pedido
async function generateCustomOrderId(workType: string, selectedMaterial: string, toothConstructions: any) {
  // Mapeamento de siglas
  const workTypeCodes = {
    'cadcam': 'CAD',
    'acrilico': 'ACR'
  };

  const materialCodes: { [key: string]: string } = {
    'Zirconia': 'ZIR',
    'Dissilicato': 'DIS', 
    'PMMA': 'PMM',
    'Metal': 'MET',
    'Impressão': 'IMP'
  };

  const constructionCodes = {
    'Hybrid Protocol': 'HIB',
    'Total Prosthesis': 'PT'
  };

  let prefix = '';
  
  if (workType === 'cadcam') {
    // CAD-CAM: workType-Material+Number (ex: CAD-ZIR001)
    const workCode = workTypeCodes[workType] || 'CAD';
    const materialCode = materialCodes[selectedMaterial] || 'UNK';
    prefix = `${workCode}-${materialCode}`;
  } else if (workType === 'acrilico') {
    // Acrílico: ACR-TipoConstrução+Number (ex: ACR-HIB001, ACR-PT001)
    const workCode = workTypeCodes[workType] || 'ACR';
    
    // Encontrar o tipo de construção predominante
    const constructionTypes = Object.values(toothConstructions);
    const hybridCount = constructionTypes.filter(type => type === 'Hybrid Protocol').length;
    const totalCount = constructionTypes.filter(type => type === 'Total Prosthesis').length;
    
    let constructionCode = 'GEN'; // Genérico se não for Hybrid ou Total
    if (hybridCount > 0 && hybridCount >= totalCount) {
      constructionCode = constructionCodes['Hybrid Protocol'];
    } else if (totalCount > 0) {
      constructionCode = constructionCodes['Total Prosthesis'];
    }
    
    prefix = `${workCode}-${constructionCode}`;
  } else {
    // Fallback para outros tipos
    prefix = 'PED-GEN';
  }

  // Buscar o próximo número sequencial para este prefixo em Postgres
  const res = await pool.query(
    `select order_number from public.orders where order_number ~ $1 order by order_number desc limit 1`,
    [`^${prefix}\\d{3}$`]
  );
  let nextNumber = 1;
  if (res.rowCount > 0) {
    const last = res.rows[0].order_number as string;
    const lastNumber = parseInt(last.slice(-3), 10);
    if (!Number.isNaN(lastNumber)) nextNumber = lastNumber + 1;
  }

  // Formatar número com 3 dígitos (001, 002, etc.)
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  
  return `${prefix}${formattedNumber}`;
}

// POST /api/orders - criar novo pedido
export async function POST(req: NextRequest) {
  try {
    // Autenticação com tratamento de erro aprimorado
    let user;
    try {
      user = await requireAuth(req);
      console.log('✅ Autenticação bem-sucedida para usuário:', user.email || user.id);
    } catch (authError: any) {
      console.error('❌ Falha na autenticação:', authError.message);
      console.error('🔍 Headers recebidos:', {
        authorization: req.headers.get('authorization') ? '[PRESENT]' : '[MISSING]',
        contentType: req.headers.get('content-type'),
        userAgent: req.headers.get('user-agent')
      });
      return NextResponse.json({
        error: 'Autenticação necessária',
        details: 'Token JWT ou Supabase inválido/ausente',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    const data = await req.json();

    // Validações básicas
    if (!data.patientName) {
      return NextResponse.json({ message: 'Nome do paciente é obrigatório' }, { status: 400 });
    }
    if (!data.workType) {
      return NextResponse.json({ message: 'Tipo de trabalho é obrigatório' }, { status: 400 });
    }
    if (!data.toothConstructions || Object.keys(data.toothConstructions).length === 0) {
      return NextResponse.json({ message: 'Pelo menos uma construção dental deve ser selecionada' }, { status: 400 });
    }

    // Gerar número do pedido
    const orderNumber = await generateCustomOrderId(
      data.workType,
      data.selectedMaterial,
      data.toothConstructions
    );

    // Sanitizações de payload e organização automática de arquivos iniciais
    const sanitizedFiles = Array.isArray(data.uploadedFiles)
      ? data.uploadedFiles.map((f: any) => ({
          id: f?.id ?? null,
          name: f?.name ?? '',
          size: typeof f?.size === 'number' ? f.size : (f?.size ? Number(f.size) : null),
          type: f?.type ?? '',
          url: f?.url ?? null,
          path: f?.path ?? null,
          bucket: f?.bucket ?? null,
          uploadDate: f?.uploadDate ?? f?.uploadedAt ?? null,
        }))
      : [];

    // Helpers: sanitização de nomes e realocação
    const sanitize = (s: string) => (s || '').replace(/[^a-zA-Z0-9._-]/g, '_');
    async function relocateInitialUploads(orderNumberLocal: string, files: any[]) {
      if (!files?.length) return [] as any[];
      const supabase = requireSupabaseAdmin();
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const yyyymm = `${y}${m}`;
      const folderPrefix = `orders/${yyyymm}`;
      const orderFolder = sanitize(orderNumberLocal);

      const out: any[] = [];
      for (const f of files) {
        try {
          const bucket = f.bucket || process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
          const baseName = sanitize(f.name || 'file');
          const finalFileName = `${orderFolder}-${baseName}`;
          const targetPath = `${folderPrefix}/${orderFolder}/${finalFileName}`;

          const currentPath: string | null = f.path || null;
          let finalPath = currentPath;
          let finalUrl = f.url || null;
          let finalName = f.name || finalFileName;

          // Mover somente se ainda não estiver no destino desejado
          if (!currentPath || !currentPath.endsWith(`/${finalFileName}`) || !currentPath.includes(`/${orderFolder}/`)) {
            if (!currentPath) {
              // Sem path não há como mover; manter apenas metadados
              finalPath = targetPath;
            } else {
              // Tenta mover o arquivo para o novo caminho
              const { error: moveErr } = await supabase.storage.from(bucket).move(currentPath, targetPath);
              if (!moveErr) {
                finalPath = targetPath;
              } else {
                console.warn('⚠️ Falha ao mover arquivo no Supabase:', { currentPath, targetPath, moveErr });
              }
            }

            // Obter URL pública do destino (ou do path atual se não movido)
            const { data: pub } = supabase.storage.from(bucket).getPublicUrl(finalPath || currentPath || targetPath);
            finalUrl = pub.publicUrl;
            finalName = finalFileName;
          }

          out.push({
            ...f,
            name: finalName,
            path: finalPath,
            url: finalUrl,
            bucket,
          });
        } catch (e) {
          console.error('⚠️ Erro ao realocar arquivo inicial:', e);
          out.push(f);
        }
      }
      return out;
    }

    const organizedFiles = await relocateInitialUploads(orderNumber, sanitizedFiles);
    const selectedTeethArr: string[] = Array.isArray(data.selectedTeeth)
      ? data.selectedTeeth.map((t: any) => String(t))
      : [];

    // Montar JSON legado para coluna data (compatibilidade com esquema antigo NOT NULL)
    const legacyData = {
      orderNumber,
      patientName: data.patientName,
      workType: data.workType,
      selectedMaterial: data.selectedMaterial || '',
      selectedVitaShade: data.selectedVitaShade || '',
      toothConstructions: data.toothConstructions || {},
      selectedTeeth: selectedTeethArr,
      uploadedFiles: organizedFiles,
      caseObservations: data.caseObservations || '',
      status: 'pending',
      priority: 'normal',
      estimatedDelivery: null,
      actualDelivery: null,
      createdBy: data.createdBy || 'system',
      assignedTo: null,
      isActive: true,
      version: 1,
    };

    const insertSql = `
      insert into public.orders (
        order_number, patient_name, work_type, selected_material, selected_vita_shade,
        tooth_constructions, selected_teeth, uploaded_files, case_observations,
        status, priority, estimated_delivery, actual_delivery,
        created_by, assigned_to, version, is_active,
        data
      ) values (
        $1,$2,$3,$4,$5,
        $6::jsonb,$7::text[],$8::jsonb,$9,
        $10,$11,$12,$13,
        $14,$15,$16,$17,
        $18::jsonb
      ) returning *;
    `;
    const params = [
      orderNumber,
      data.patientName,
      data.workType,
      data.selectedMaterial || '',
      data.selectedVitaShade || '',
      JSON.stringify(data.toothConstructions || {}),
      selectedTeethArr,
      JSON.stringify(organizedFiles),
      data.caseObservations || '',
      'pending',
      'normal',
      null,
      null,
      data.createdBy || 'system',
      null,
      1,
      true,
      JSON.stringify(legacyData),
    ];
    const { rows } = await pool.query(insertSql, params);
    const newRow = rows[0];

    // Removido: não criar automaticamente job de produção ao criar pedido.

    // Notificações: novo pedido criado
    try {
      const orderNumber = String(newRow.order_number);
      const title = `Novo pedido criado: ${orderNumber}`;
      const msg = `Paciente: ${newRow.patient_name || ''} | Tipo: ${newRow.work_type || ''}`;
      const payload = { orderId: String(newRow.external_id || newRow.id), orderNumber };

      // Notificar equipe
      const team = await getTeamUsers(pool);
      await notifyMany(pool, team, 'order_created', title, msg, payload);
      // Notificar criador
      await notifyMany(pool, [newRow.created_by], 'order_created', title, msg, payload);
    } catch (e) {
      console.error('⚠️ Falha ao notificar criação de pedido:', e);
    }

    return NextResponse.json(mapOrderRow(newRow), { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar pedido (PG):', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/orders?id=<id> - atualizar pedido
export async function PATCH(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });

    // Buscar pedido existente
    let existingRes;
    if (isNumericId(id)) {
      existingRes = await pool.query(`select * from public.orders where id = $1 limit 1`, [Number(id)]);
    } else {
      existingRes = await pool.query(`select * from public.orders where external_id = $1 limit 1`, [id]);
    }
    if (!existingRes.rowCount) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    const existing = existingRes.rows[0];

    const data = await req.json();
    const sets: string[] = [];
    const vals: any[] = [];
    const push = (col: string, val: any) => { sets.push(`${col} = $${sets.length + 1}`); vals.push(val); };

    if (data.patientName !== undefined) push('patient_name', data.patientName ?? '');
    if (data.workType !== undefined) push('work_type', data.workType ?? '');
    if (data.selectedMaterial !== undefined) push('selected_material', data.selectedMaterial ?? '');
    if (data.selectedVitaShade !== undefined) push('selected_vita_shade', data.selectedVitaShade ?? '');
    if (data.toothConstructions !== undefined) push('tooth_constructions', JSON.stringify(data.toothConstructions || {}));
    if (data.selectedTeeth !== undefined) push('selected_teeth', Array.isArray(data.selectedTeeth) ? data.selectedTeeth : []);
    if (data.uploadedFiles !== undefined) push('uploaded_files', JSON.stringify(data.uploadedFiles || []));
    if (data.caseObservations !== undefined) push('case_observations', data.caseObservations ?? '');
    if (data.status !== undefined) push('status', data.status ?? 'pending');
    if (data.priority !== undefined) push('priority', data.priority ?? 'normal');
    if (data.createdBy !== undefined) push('created_by', data.createdBy ?? 'system');
    if (data.assignedTo !== undefined) push('assigned_to', data.assignedTo ?? null);

    // Regras de prazo (estimated_delivery)
    let shouldSetDeadline = false;
    if (data.comments) {
      const teamRoles = ['admin', 'manager', 'tecnico', 'atendente'];
      const lastComment = data.comments[data.comments.length - 1];
      if (lastComment && teamRoles.includes(lastComment.userRole)) shouldSetDeadline = true;
    }
    if (data.status === 'in_progress' && data.assignedTo) shouldSetDeadline = true;
    if (data.assignedTo && !data.status) shouldSetDeadline = true;
    if (data.status === 'in_progress' && existing.status !== 'in_progress') shouldSetDeadline = true;
    if (shouldSetDeadline) push('estimated_delivery', addBusinessDays(new Date(), 5) as any);

    push('updated_at', new Date().toISOString());

    if (!sets.length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });

    const whereVal = isNumericId(id) ? Number(id) : id;
    const whereClause = isNumericId(id) ? 'id = $' : 'external_id = $';
    const sql = `update public.orders set ${sets.join(', ')} where ${whereClause}${sets.length + 1} returning *`;
    vals.push(whereVal);
    const { rows } = await pool.query(sql, vals);
    if (!rows.length) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const updated = rows[0];

    // Sincronização com PRODUÇÃO (somente atualizar se já existir; não criar automaticamente)
    try {
      const orderIdNum = Number(updated.id);
      const nowInProgress = typeof data.status !== 'undefined' ? (data.status === 'in_progress') : (updated.status === 'in_progress');
      const assignedChanged = (typeof data.assignedTo !== 'undefined');
      const shouldEnsureProduction = nowInProgress;

      console.log('🔄 Sincronização com produção iniciada...');
      console.log('📊 orderIdNum:', orderIdNum);
      console.log('📊 nowInProgress:', nowInProgress);
      console.log('📊 assignedChanged:', assignedChanged);
      console.log('📊 shouldEnsureProduction:', shouldEnsureProduction);

      // Preparar dados de operador a partir da atribuição do pedido
      let operadorId: number | null = null;
      let operadorName: string | null = null;
      const assignedRaw = (typeof data.assignedTo !== 'undefined') ? data.assignedTo : updated.assigned_to;
      if (assignedRaw !== null && assignedRaw !== undefined && String(assignedRaw).length > 0 && /^\d+$/.test(String(assignedRaw))) {
        operadorId = Number(assignedRaw);
        try {
          const ures = await pool.query(`select first_name, last_name from public.users where id = $1 limit 1`, [operadorId]);
          if (ures.rowCount) {
            const u = ures.rows[0];
            const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            operadorName = full || null;
          }
        } catch {}
      }

      // 1) Se o técnico foi definido/alterado, propagar para produção APENAS se já existir registro
      if (assignedChanged) {
        const updRes = await pool.query(
          `update public.production
             set operador_id = $2,
                 operador_name = $3,
                 updated_at = now()
           where order_id = $1
           returning id`,
          [orderIdNum, operadorId, operadorName]
        );
        // Se não existir produção, não criar aqui. A criação ocorrerá via Kanban/produção.
      }

      // 2) Ao designar técnico E estar em produção, criar job automaticamente se não existir
      console.log('🔍 Verificando condições para criação de produção...');
      console.log('📋 Data recebida:', JSON.stringify(data, null, 2));
      console.log('📋 Status atual:', updated.status);
      console.log('📋 Assigned_to atual:', updated.assigned_to);

      // Detectar se está em produção (por nome, ID ou valor específico)
      let isInProduction = false;

      if (typeof data.status !== 'undefined') {
        const statusValue = String(data.status).toLowerCase();

        // Verificação por nome (compatibilidade)
        if (statusValue === 'em produção' || statusValue === 'em producao' || statusValue === 'in_progress') {
          isInProduction = true;
          console.log('✅ Produção detectada por nome:', statusValue);
        }
        // Verificação por ID específico - assumindo que produção é ID "3" ou superior
        else if (/^\d+$/.test(statusValue)) {
          const statusId = parseInt(statusValue);
          // Temporariamente assumindo que IDs >= 2 podem ser produção (ajuste conforme necessário)
          if (statusId >= 2) {
            isInProduction = true;
            console.log('✅ Produção detectada por ID:', statusId, '(assumindo >= 2)');
          } else {
            console.log('❌ ID não reconhecido como produção:', statusId);
          }
        }
        // Verificação por outras possibilidades
        else if (statusValue.includes('produ') || statusValue.includes('progress')) {
          isInProduction = true;
          console.log('✅ Produção detectada por palavra-chave:', statusValue);
        }
      }

      const hasAssignedTech = assignedChanged || updated.assigned_to;

      console.log('✅ isInProduction:', isInProduction, '(data.status:', data.status, ')');
      console.log('✅ assignedChanged:', assignedChanged);
      console.log('✅ hasAssignedTech:', hasAssignedTech);

      const shouldCreateProduction = isInProduction && hasAssignedTech;

      console.log('🎯 shouldCreateProduction:', shouldCreateProduction);

      if (shouldCreateProduction) {
        console.log('🏭 Verificando/criando job de produção para pedido em produção com técnico...');
        console.log('📊 Status:', data.status || updated.status);
        console.log('👷 Técnico:', operadorId || 'Nenhum');

        // Primeiro, verificar se já existe
        const existingProd = await pool.query(
          `select id from public.production where order_id = $1 and coalesce(is_active, true) = true limit 1`,
          [orderIdNum]
        );

        if (existingProd.rowCount === 0) {
          // Criar novo job de produção
          console.log('➕ Criando novo job de produção...');
          const insertParams = [
            orderIdNum, // order_id
            updated.order_number || null, // code
            String(updated.work_type || ''), // work_type
            String(updated.selected_material || ''), // material
            'iniciado', // stage_id inicial
            operadorId, // operador_id
            operadorName, // operador_name
            null, // lote
            JSON.stringify([]), // cam_files
            JSON.stringify([]), // cad_files
            null, // priority
            updated.estimated_delivery || null, // estimated_delivery
            null, // actual_delivery
            JSON.stringify({}), // data
            true // is_active
          ];

          const prodResult = await pool.query(
            `insert into public.production (
              order_id, code, work_type, material, stage_id, operador_id, operador_name, lote,
              cam_files, cad_files, priority, estimated_delivery, actual_delivery, data, is_active
            ) values (
              $1,$2,$3,$4,$5,$6,$7,$8,
              $9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15
            ) returning id`,
            insertParams
          );

          console.log('✅ Job de produção criado:', prodResult.rows[0]?.id);
        } else {
          // Atualizar job existente
          console.log('🔄 Atualizando job de produção existente...');
          const updParams = [
            orderIdNum,
            String(updated.work_type || ''),
            String(updated.selected_material || ''),
            'iniciado',
            operadorId,
            operadorName,
            updated.estimated_delivery || null,
          ];
          await pool.query(
            `update public.production
               set work_type = $2,
                   material = $3,
                   is_active = true,
                   updated_at = now(),
                   stage_id = coalesce(stage_id, $4),
                   operador_id = coalesce($5, operador_id),
                   operador_name = coalesce($6, operador_name),
                   estimated_delivery = coalesce($7, estimated_delivery)
             where order_id = $1`,
            updParams
          );
          console.log('✅ Job de produção atualizado');
        }
      }
    } catch (e) {
      console.error('⚠️ Falha ao sincronizar job de produção no PATCH /orders:', e);
    }

    // Notificações: status/atribuição alterados
    try {
      const orderNumber = String(updated.order_number);
      const payload = { orderId: String(updated.external_id || updated.id), orderNumber };
      const titleStatus = `Status atualizado: ${orderNumber}`;
      const titleAssign = `Atribuição atualizada: ${orderNumber}`;

      const statusChanged = (vals.length > 0) && (typeof (data.status) !== 'undefined') && (data.status !== existing.status);
      const assignedChanged = (vals.length > 0) && (typeof (data.assignedTo) !== 'undefined') && (data.assignedTo !== existing.assigned_to);

      if (statusChanged) {
        // Obter nomes das etapas para exibir na mensagem
        let oldStatusName: string | undefined;
        let newStatusName: string | undefined;
        try {
          const ids = [existing.status, data.status].filter((v: any) => typeof v === 'string' && v.trim());
          if (ids.length) {
            const { rows: srows } = await pool.query(
              `select id, name from public.stages where id = any($1::text[])`,
              [ids]
            );
            const map: Record<string, string> = {};
            for (const r of srows) map[String(r.id)] = String(r.name);
            oldStatusName = map[String(existing.status)] || undefined;
            newStatusName = map[String(data.status)] || undefined;
          }
        } catch {}

        const displayOld = oldStatusName || existing.status || '—';
        const displayNew = newStatusName || data.status || '—';
        const msg = `${displayOld} → ${displayNew}`;
        const team = await getTeamUsers(pool);
        const enriched = { ...payload, oldStatusId: existing.status, newStatusId: data.status, oldStatusName, newStatusName };
        await notifyMany(pool, [existing.created_by, ...team], 'status_changed', titleStatus, msg, enriched);
      }

      if (assignedChanged) {
        const msg = `${existing.assigned_to || '—'} → ${data.assignedTo || '—'}`;
        const team = await getTeamUsers(pool);
        await notifyMany(pool, [existing.created_by, updated.assigned_to, ...team], 'order_assigned', titleAssign, msg, payload);
      }
    } catch (e) {
      console.error('⚠️ Falha ao notificar atualização de pedido:', e);
    }

    return NextResponse.json(mapOrderRow(updated));
  } catch (error) {
    console.error('❌ Erro ao atualizar pedido (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/orders?id=<id> - remover pedido (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    try { await requireAuth(req); } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 }); }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });

    const vals: any[] = [];
    let sql = `update public.orders set is_active = false, deleted_at = now(), updated_at = now() where `;
    if (isNumericId(id)) {
      sql += `id = $1`;
      vals.push(Number(id));
    } else {
      sql += `external_id = $1`;
      vals.push(id);
    }
    const { rowCount } = await pool.query(sql, vals);
    if (!rowCount) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Pedido removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover pedido (PG):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
