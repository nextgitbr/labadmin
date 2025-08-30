/*
  Reset/alinha as sequências (contadores de ID) de tabelas no Postgres.

  Uso:
    node scripts/reset-sequences.js --tables=public.notifications,public.orders --mode=align
    node scripts/reset-sequences.js --tables=public.notifications --mode=reset  // TRUNCATE + RESTART IDENTITY

  - mode=align: mantém os dados e ajusta o próximo valor da sequência para MAX(id)+1
  - mode=reset: apaga todos os registros (TRUNCATE ... RESTART IDENTITY) e reinicia em 1

  Requer:
    - PG_URI ou DATABASE_URL definido (ex.: em .env.local)
*/

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { tables: [], mode: 'align' };
  for (const a of args) {
    if (a.startsWith('--tables=')) {
      out.tables = a.replace('--tables=', '').split(',').map(s => s.trim()).filter(Boolean);
    } else if (a.startsWith('--mode=')) {
      out.mode = a.replace('--mode=', '').trim();
    }
  }
  if (!out.tables.length) {
    // Defaults
    out.tables = ['public.notifications', 'public.orders', 'public.order_comments'];
  }
  if (!['align', 'reset'].includes(out.mode)) {
    throw new Error("Modo inválido. Use 'align' ou 'reset'.");
  }
  return out;
}

async function getPg() {
  const PG_URI = process.env.PG_URI || process.env.DATABASE_URL;
  if (!PG_URI) throw new Error('PG_URI (ou DATABASE_URL) não definido');
  const client = new Client({ connectionString: PG_URI, ssl: PG_URI.includes('supabase.co') ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  return client;
}

async function alignSequence(pg, fullTable) {
  // fullTable: 'public.notifications'
  const [schema, table] = fullTable.includes('.') ? fullTable.split('.') : ['public', fullTable];
  // Descobrir nome da sequência do ID automaticamente
  const seqRes = await pg.query(`select pg_get_serial_sequence($1, 'id') as seq`, [ `${schema}.${table}` ]);
  const seq = seqRes.rows[0]?.seq;
  if (!seq) {
    console.log(`! Sequência não encontrada para ${schema}.${table}. Verifique se existe coluna id serial/bigserial.`);
    return;
  }
  const maxRes = await pg.query(`select coalesce(max(id), 0) as max from ${schema}.${table}`);
  const nextVal = Number(maxRes.rows[0].max) + 1;
  await pg.query(`select setval($1, $2, false)`, [ seq, nextVal ]);
  console.log(`= Sequência alinhada para ${schema}.${table}: ${seq} => próximo ${nextVal}`);
}

async function resetTable(pg, fullTable) {
  const [schema, table] = fullTable.includes('.') ? fullTable.split('.') : ['public', fullTable];
  // TRUNCATE + RESTART IDENTITY CASCADE
  await pg.query(`truncate table ${schema}.${table} restart identity cascade`);
  console.log(`+ Tabela ${schema}.${table} truncada e sequência reiniciada.`);
}

(async () => {
  const { tables, mode } = parseArgs();
  const pg = await getPg();
  try {
    if (mode === 'reset') {
      for (const t of tables) {
        await resetTable(pg, t);
      }
    } else {
      for (const t of tables) {
        await alignSequence(pg, t);
      }
    }
    console.log('\nConcluído.');
  } catch (e) {
    console.error('Falha:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
