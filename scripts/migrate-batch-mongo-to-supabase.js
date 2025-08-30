/*
  Migra coleções do Mongo para tabelas no Supabase (Postgres) na seguinte ordem:
  1 - settings (especial: popula settings_app a partir de key='app')
  2 - permissions -> public.permissions
  3 - stages -> public.stages
  4 - users -> public.users
  5 - notifications -> public.notifications
  6 - orders -> public.orders

  Estratégia padrão (lift-and-shift):
  - Para permissions, stages, users, notifications, orders: cria tabela com colunas
      id (identity PK), external_id (texto único com _id do Mongo), data (JSONB), created_at, updated_at
    e insere os documentos preservando o conteúdo original em data.
  - Para settings: usa migração específica para settings_app (by key/id), como no script dedicado.

  Variáveis de ambiente:
    - PG_URI (obrigatória)
    - MONGODB_URI (default mongodb://localhost:27017/)
    - MONGODB_DB  (default labadmin)
    - DRY_RUN=1|0 (default 1)
    - CREATE_TABLE=1|0 (default 0 para segurança)
    - BATCH_SIZE (default 500)
*/
const { MongoClient } = require('mongodb');
const { Client: PgClient } = require('pg');

function valFlag(v, def) {
  return /^(1|true|yes)$/i.test(String(v ?? (def ? '1' : '0')));
}

(async () => {
  const pgUri = process.env.PG_URI;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
  const mongoDbName = process.env.MONGODB_DB || 'labadmin';
  const dryRun = valFlag(process.env.DRY_RUN, true);
  const allowCreate = valFlag(process.env.CREATE_TABLE, false);
  const batchSize = Math.max(1, Math.min(5000, parseInt(process.env.BATCH_SIZE || '500', 10)));

  if (!pgUri) {
    console.error('PG_URI not set');
    process.exit(1);
  }

  const pg = new PgClient({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  let mongoClient;
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const mdb = mongoClient.db(mongoDbName);
    await pg.connect();

    // 1) SETTINGS -> settings_app
    async function migrateSettingsApp() {
      console.log('\n== Migrando settings -> settings_app ==');
      const doc = await mdb.collection('settings').findOne({ key: 'app' });
      if (!doc) {
        console.log("Mongo: settings com key='app' não encontrado. Pulando.");
        return;
      }
      const appName = (doc && doc.appName) || 'LabAdmin';
      const showWelcome = doc?.showWelcome ?? true;
      const welcomeMessage = doc?.welcomeMessage || 'Estamos prontos para impulsionar sua experiência com uma gestão simplificada, eficiente e elegante. Explore, gerencie e transforme seus projetos com facilidade! 🚀';
      const showAdvantages = doc?.showAdvantages ?? true;
      const advantagesRotationMs = doc?.advantagesRotationMs ?? 8000;
      const defaultAdvantages = [
        { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!' },
        { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.' },
      ];
      const rawAdv = doc?.advantages || defaultAdvantages;
      const advantages = Array.isArray(rawAdv)
        ? rawAdv.map((it) => ({ destaque: String(it?.destaque||''), complemento: String(it?.complemento||''), active: typeof it?.active==='boolean'? it.active : true }))
        : defaultAdvantages.map((it) => ({ ...it, active: true }));

      // Detecta schema da settings_app
      const colsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app' order by ordinal_position`);
      const cols = colsRes.rows.map(r => r.column_name);
      const colsSet = new Set(cols);

      if (cols.length === 0) {
        if (!allowCreate) {
          console.log('Tabela settings_app não existe e CREATE_TABLE=0. Pulando criação.');
          return;
        }
        await pg.query(`
          create table if not exists settings_app (
            key text primary key,
            app_name text not null,
            show_welcome boolean not null,
            welcome_message text not null,
            show_advantages boolean not null,
            advantages_rotation_ms integer not null,
            advantages jsonb not null,
            updated_at timestamptz not null default now()
          );
        `);
        ['key','app_name','show_welcome','welcome_message','show_advantages','advantages_rotation_ms','advantages','updated_at'].forEach(c=>colsSet.add(c));
      }

      const payload = {
        app_name: appName,
        show_welcome: showWelcome,
        welcome_message: welcomeMessage,
        show_advantages: showAdvantages,
        advantages_rotation_ms: Math.max(2000, Math.min(60000, Math.floor(Number(advantagesRotationMs) || 8000))),
        advantages: JSON.stringify(advantages),
        updated_at: new Date().toISOString(),
      };

      await pg.query('begin');
      try {
        if (colsSet.has('key')) {
          const useCols = ['key', ...Object.keys(payload).filter(k => colsSet.has(k))];
          const ph = useCols.map((_, i) => `$${i+1}`).join(', ');
          const values = ['app', ...useCols.slice(1).map(k => payload[k])];
          const updates = useCols.slice(1).map(k => `${k} = excluded.${k}`).join(', ');
          await pg.query(`insert into settings_app (${useCols.join(', ')}) values (${ph}) on conflict (key) do update set ${updates}`, values);
        } else if (colsSet.has('id')) {
          const existingAny = await pg.query('select id from settings_app order by id asc limit 1');
          const allowed = Object.keys(payload).filter(k => colsSet.has(k));
          if (existingAny.rowCount > 0) {
            const id = existingAny.rows[0].id;
            const setList = allowed.map((k, i) => `${k} = $${i+1}`).join(', ');
            const vals = allowed.map(k => payload[k]);
            await pg.query(`update settings_app set ${setList} where id = ${id}`, vals);
          } else {
            const colsIns = [...allowed];
            const vals = allowed.map(k => payload[k]);
            const ph2 = colsIns.map((_, i) => `$${i+1}`).join(', ');
            await pg.query(`insert into settings_app (${colsIns.join(', ')}) values (${ph2})`, vals);
          }
        } else {
          const allowed = Object.keys(payload).filter(k => colsSet.has(k));
          const ph3 = allowed.map((_, i) => `$${i+1}`).join(', ');
          await pg.query(`insert into settings_app (${allowed.join(', ')}) values (${ph3})`, allowed.map(k => payload[k]));
        }
        if (dryRun) { console.log('DRY_RUN: rollback settings_app'); await pg.query('rollback'); }
        else { await pg.query('commit'); console.log('COMMIT settings_app'); }
      } catch (e) {
        await pg.query('rollback');
        throw e;
      }
    }

    async function ensureTable(name) {
      const colsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1`, [name]);
      if (colsRes.rowCount === 0) {
        if (!allowCreate) {
          console.log(`Tabela ${name} não existe e CREATE_TABLE=0. Pulando criação.`);
          return false;
        }
        await pg.query(`
          create table if not exists ${name} (
            id bigint generated always as identity primary key,
            external_id text unique,
            data jsonb not null,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
        `);
        console.log(`Tabela ${name} criada.`);
      }
      return true;
    }

    async function migrateCollection(collName, tableName) {
      console.log(`\n== Migrando ${collName} -> ${tableName} ==`);
      const tableReady = await ensureTable(tableName);
      if (!tableReady) return;

      const count = await mdb.collection(collName).countDocuments({});
      console.log(`Mongo ${collName}: ${count} documentos.`);
      if (count === 0) { console.log('Nada a migrar.'); return; }

      const cursor = mdb.collection(collName).find({});
      let batch = [];
      let migrated = 0;
      await pg.query('begin');
      try {
        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          const external_id = String(doc._id);
          const { _id, ...rest } = doc;
          const row = { external_id, data: rest };
          batch.push(row);
          if (batch.length >= batchSize) {
            const phVals = batch.flatMap((r) => [r.external_id, JSON.stringify(r.data)]);
            const ph = batch.map((_, i) => `($${i*2+1}, $${i*2+2})`).join(',');
            await pg.query(`
              insert into ${tableName} (external_id, data)
              values ${ph}
              on conflict (external_id) do update set data = excluded.data, updated_at = now()
            `, phVals);
            migrated += batch.length;
            console.log(`Migrados: ${migrated}/${count}`);
            batch = [];
          }
        }
        if (batch.length) {
          const phVals = batch.flatMap((r) => [r.external_id, JSON.stringify(r.data)]);
          const ph = batch.map((_, i) => `($${i*2+1}, $${i*2+2})`).join(',');
          await pg.query(`
            insert into ${tableName} (external_id, data)
            values ${ph}
            on conflict (external_id) do update set data = excluded.data, updated_at = now()
          `, phVals);
          migrated += batch.length;
          console.log(`Migrados: ${migrated}/${count}`);
        }
        if (dryRun) { console.log(`DRY_RUN: rollback ${tableName}`); await pg.query('rollback'); }
        else { await pg.query('commit'); console.log(`COMMIT ${tableName}`); }
      } catch (e) {
        await pg.query('rollback');
        throw e;
      }
    }

    // Ordem solicitada
    await migrateSettingsApp();
    await migrateCollection('permissions', 'permissions');
    await migrateCollection('stages', 'stages');
    await migrateCollection('users', 'users');
    await migrateCollection('notifications', 'notifications');
    await migrateCollection('orders', 'orders');

    console.log('\nMigração concluída.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
    try { await mongoClient?.close(); } catch {}
  }
})();
