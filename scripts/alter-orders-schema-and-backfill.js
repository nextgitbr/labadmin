/*
  Cria/ajusta colunas normalizadas em public.orders e realiza backfill a partir da coluna data (JSONB).

  Pré-requisitos:
    - Tabela public.orders já existente (estilo lift-and-shift: external_id, data jsonb, created_at, updated_at)
    - Variável de ambiente PG_URI (ou DATABASE_URL)

  Execução:
    node scripts/alter-orders-schema-and-backfill.js
*/

// Carrega variáveis de ambiente do arquivo .env.local (compatível com Next.js)
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

function nowIso() { return new Date().toISOString(); }

async function getPg() {
  const PG_URI = process.env.PG_URI || process.env.DATABASE_URL;
  if (!PG_URI) throw new Error('PG_URI (ou DATABASE_URL) não definido');
  const client = new Client({ connectionString: PG_URI, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

async function columnExists(pg, table, col) {
  const res = await pg.query(
    `select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2 limit 1`,
    [table, col]
  );
  return res.rowCount > 0;
}

async function ensureColumn(pg, table, col, ddl) {
  const exists = await columnExists(pg, table, col);
  if (!exists) {
    console.log(`+ Adding column ${col}`);
    await pg.query(`alter table public.${table} add column ${ddl}`);
  } else {
    console.log(`= Column ${col} already exists`);
  }
}

async function indexExists(pg, indexName) {
  const res = await pg.query(`select 1 from pg_indexes where schemaname='public' and indexname=$1`, [indexName]);
  return res.rowCount > 0;
}

async function ensureIndex(pg, indexName, ddl) {
  const exists = await indexExists(pg, indexName);
  if (!exists) {
    console.log(`+ Creating index ${indexName}`);
    await pg.query(ddl);
  } else {
    console.log(`= Index ${indexName} already exists`);
  }
}

async function tableExists(pg, table) {
  const res = await pg.query(
    `select 1 from information_schema.tables where table_schema='public' and table_name=$1 limit 1`,
    [table]
  );
  return res.rowCount > 0;
}

(async () => {
  const pg = await getPg();
  try {
    const exists = await tableExists(pg, 'orders');
    if (!exists) {
      throw new Error("Tabela public.orders não existe. Execute a migração lift-and-shift primeiro.");
    }

    console.log(`\n== Ensuring columns on public.orders ==`);
    // Criação de colunas normalizadas
    await ensureColumn(pg, 'orders', 'order_number', 'order_number text');
    await ensureColumn(pg, 'orders', 'patient_name', 'patient_name text');
    await ensureColumn(pg, 'orders', 'work_type', 'work_type text');
    await ensureColumn(pg, 'orders', 'selected_material', 'selected_material text');
    await ensureColumn(pg, 'orders', 'selected_vita_shade', 'selected_vita_shade text');
    await ensureColumn(pg, 'orders', 'tooth_constructions', 'tooth_constructions jsonb');
    await ensureColumn(pg, 'orders', 'selected_teeth', 'selected_teeth text[]');
    await ensureColumn(pg, 'orders', 'uploaded_files', 'uploaded_files jsonb');
    await ensureColumn(pg, 'orders', 'case_observations', 'case_observations text');
    await ensureColumn(pg, 'orders', 'status', "status text not null default 'pending'");
    await ensureColumn(pg, 'orders', 'priority', "priority text not null default 'normal'");
    await ensureColumn(pg, 'orders', 'estimated_delivery', 'estimated_delivery timestamptz');
    await ensureColumn(pg, 'orders', 'actual_delivery', 'actual_delivery timestamptz');
    await ensureColumn(pg, 'orders', 'created_by', 'created_by text');
    await ensureColumn(pg, 'orders', 'assigned_to', 'assigned_to text');
    await ensureColumn(pg, 'orders', 'is_active', 'is_active boolean not null default true');
    await ensureColumn(pg, 'orders', 'version', 'version integer not null default 1');
    await ensureColumn(pg, 'orders', 'deleted_at', 'deleted_at timestamptz');

    // Carimbar updated_at com trigger? Por simplicidade, manteremos updates diretos aqui

    console.log(`\n== Backfilling from data jsonb ==`);
    // Verifica existência da coluna data
    const hasData = await columnExists(pg, 'orders', 'data');
    if (!hasData) {
      console.log('Coluna data não encontrada em public.orders. Pulando backfill.');
    } else {
      // Campos text
      await pg.query(`
        update public.orders set
          order_number = coalesce(order_number, data->>'orderNumber'),
          patient_name = coalesce(patient_name, data->>'patientName'),
          work_type = coalesce(work_type, data->>'workType'),
          selected_material = coalesce(selected_material, data->>'selectedMaterial'),
          selected_vita_shade = coalesce(selected_vita_shade, data->>'selectedVitaShade'),
          case_observations = coalesce(case_observations, data->>'caseObservations'),
          status = coalesce(status, data->>'status'),
          priority = coalesce(priority, data->>'priority'),
          created_by = coalesce(created_by, data->>'createdBy'),
          assigned_to = coalesce(assigned_to, data->>'assignedTo')
      `);

      // JSONB
      await pg.query(`update public.orders set tooth_constructions = coalesce(tooth_constructions, data->'toothConstructions')`);
      await pg.query(`update public.orders set uploaded_files = coalesce(uploaded_files, data->'uploadedFiles')`);

      // Array text[] a partir de JSON
      await pg.query(`
        update public.orders
        set selected_teeth = coalesce(
          selected_teeth,
          (
            select case when data ? 'selectedTeeth' then coalesce(array_agg(elem), '{}') else selected_teeth end
            from jsonb_array_elements_text(data->'selectedTeeth') as t(elem)
          )
        )
        where data ? 'selectedTeeth';
      `);

      // Datas
      await pg.query(`
        update public.orders set
          estimated_delivery = coalesce(estimated_delivery, nullif(data->>'estimatedDelivery','')::timestamptz),
          actual_delivery = coalesce(actual_delivery, nullif(data->>'actualDelivery','')::timestamptz)
      `);

      // Flags e versão
      await pg.query(`
        update public.orders set
          is_active = coalesce(is_active, coalesce((data->>'isActive')::boolean, true)),
          deleted_at = coalesce(deleted_at, nullif(data->>'deletedAt','')::timestamptz),
          version = coalesce(version, coalesce((data->>'version')::int, 1))
      `);

      // Promote created_at/updated_at se existirem em data
      const hasCreatedAt = await columnExists(pg, 'orders', 'created_at');
      const hasUpdatedAt = await columnExists(pg, 'orders', 'updated_at');
      if (hasCreatedAt) {
        await pg.query(`update public.orders set created_at = coalesce(created_at, nullif(data->>'createdAt','')::timestamptz)`);
      }
      if (hasUpdatedAt) {
        await pg.query(`update public.orders set updated_at = coalesce(updated_at, nullif(data->>'updatedAt','')::timestamptz)`);
      }
    }

    console.log(`\n== Indexes ==`);
    await ensureIndex(pg, 'idx_orders_created_at', `create index if not exists idx_orders_created_at on public.orders (created_at desc)`);
    await ensureIndex(pg, 'idx_orders_is_active', `create index if not exists idx_orders_is_active on public.orders (is_active)`);
    await ensureIndex(pg, 'idx_orders_created_by', `create index if not exists idx_orders_created_by on public.orders (created_by)`);
    await ensureIndex(pg, 'idx_orders_assigned_to', `create index if not exists idx_orders_assigned_to on public.orders (assigned_to)`);
    await ensureIndex(pg, 'idx_orders_estimated_delivery', `create index if not exists idx_orders_estimated_delivery on public.orders (estimated_delivery)`);
    await ensureIndex(pg, 'uidx_orders_order_number', `create unique index if not exists uidx_orders_order_number on public.orders (order_number)`);
    await ensureIndex(pg, 'uidx_orders_external_id', `create unique index if not exists uidx_orders_external_id on public.orders (external_id)`);

    console.log('\nConcluído com sucesso.');
  } catch (e) {
    console.error('Falha:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
