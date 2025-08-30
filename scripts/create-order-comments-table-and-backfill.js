// Script para criar tabela order_comments e opcionalmente backfill de comentários existentes
// Uso: node scripts/create-order-comments-table-and-backfill.js

const path = require('path');
// Carregar variáveis de ambiente do .env.local (Next.js)
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch {}
const { Pool } = require('pg');

async function main() {
  const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
  if (!PG_CONN) {
    console.error('Defina PG_URI ou DATABASE_URL no ambiente.');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: PG_CONN,
    ssl: PG_CONN.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query('begin');

    // Criar tabela
    await pool.query(`
      create table if not exists public.order_comments (
        id bigserial primary key,
        order_id bigint not null references public.orders(id) on delete cascade,
        user_id text,
        user_name text,
        user_role text,
        message text not null,
        attachments jsonb not null default '[]'::jsonb,
        is_internal boolean not null default false,
        created_at timestamptz not null default now()
      );
    `);

    // Índices
    await pool.query(`create index if not exists idx_order_comments_order_id on public.order_comments(order_id);`);
    await pool.query(`create index if not exists idx_order_comments_created_at on public.order_comments(created_at);`);

    // Backfill (opcional): detecta colunas e lê comentários de orders.comments (jsonb) ou orders.data->'comments'
    const { rows: cols } = await pool.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='orders'`
    );
    const hasCommentsCol = cols.some(c => c.column_name === 'comments');
    const hasDataCol = cols.some(c => c.column_name === 'data');

    let sourceSql = `select id`;
    if (hasCommentsCol) sourceSql += `, comments`;
    if (hasDataCol) sourceSql += `, data`;
    sourceSql += ` from public.orders`;
    if (hasCommentsCol && hasDataCol) {
      sourceSql += ` where (comments is not null and jsonb_typeof(comments)='array') or (data ? 'comments')`;
    } else if (hasCommentsCol) {
      sourceSql += ` where comments is not null and jsonb_typeof(comments)='array'`;
    } else if (hasDataCol) {
      sourceSql += ` where data ? 'comments'`;
    } else {
      console.log('Aviso: tabela public.orders não possui colunas comments nem data. Backfill ignorado.');
    }
    const { rows: orders } = await pool.query(sourceSql);

    let inserted = 0;
    for (const row of orders) {
      let comments = [];
      if (hasCommentsCol && Array.isArray(row.comments)) comments = row.comments;
      else if (hasDataCol && row.data && Array.isArray(row.data.comments)) comments = row.data.comments;
      if (!comments || comments.length === 0) continue;

      for (const c of comments) {
        try {
          await pool.query(
            `insert into public.order_comments (order_id, user_id, user_name, user_role, message, attachments, is_internal, created_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8)
             on conflict do nothing`,
            [
              row.id,
              c.userId || null,
              c.userName || null,
              c.userRole || null,
              c.message || '',
              JSON.stringify(Array.isArray(c.attachments) ? c.attachments : []),
              Boolean(c.isInternal) || false,
              c.createdAt ? new Date(c.createdAt) : new Date(),
            ]
          );
          inserted++;
        } catch (e) {
          console.warn('Falha ao inserir comentário do pedido', row.id, e.message);
        }
      }
    }

    await pool.query('commit');
    console.log('Tabela order_comments criada. Comentários inseridos:', inserted);
  } catch (e) {
    await pool.query('rollback').catch(() => {});
    console.error('Erro durante criação/backfill:', e);
    process.exit(1);
  } finally {
    pool.end();
  }
}

if (require.main === module) {
  main();
}
