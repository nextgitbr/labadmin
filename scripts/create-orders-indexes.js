#!/usr/bin/env node
/*
  Verifica duplicidades e cria índices/constraints na tabela public.orders:
  - UNIQUE (order_number)
  - idx em created_at, status, (created_by, created_at desc)
*/
const { Client } = require('pg');
const dotenv = require('dotenv');
try { dotenv.config({ path: '.env.local' }); } catch {}

async function main() {
  const conn = process.env.PG_URI || process.env.DATABASE_URL;
  if (!conn) {
    console.error('PG_URI/DATABASE_URL não configurado');
    process.exit(1);
  }
  const ssl = conn.includes('supabase.co') ? { rejectUnauthorized: false } : undefined;
  const pg = new Client({ connectionString: conn, ssl });
  await pg.connect();
  try {
    console.log('Checando duplicidades de order_number...');
    const d1 = await pg.query(
      `select order_number, count(*)::int as c
       from public.orders
       where order_number is not null
       group by order_number
       having count(*)>1
       order by c desc, order_number asc
       limit 20`
    );
    if (d1.rowCount > 0) {
      console.error(`Encontradas ${d1.rowCount} duplicidades (mostrando até 20):`);
      d1.rows.forEach(r => console.error(' -', r.order_number, '=>', r.c));
      console.error('Abortando criação do índice único em order_number. Resolva duplicidades primeiro.');
      process.exit(2);
    }

    console.log('Criando índices/constraints (se não existirem)...');
    // UNIQUE em order_number
    await pg.query(`create unique index if not exists orders_order_number_key on public.orders (order_number)`);
    // Índices de performance
    await pg.query(`create index if not exists orders_created_at_idx on public.orders (created_at desc)`);
    await pg.query(`create index if not exists orders_status_idx on public.orders (status)`);
    await pg.query(`create index if not exists orders_created_by_created_at_idx on public.orders (created_by, created_at desc)`);

    console.log('Índices/constraints aplicados com sucesso.');
  } finally {
    await pg.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
