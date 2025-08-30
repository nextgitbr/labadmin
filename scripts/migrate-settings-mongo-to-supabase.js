/*
  Migra o documento de configurações do MongoDB (collection 'settings', key 'app')
  para a tabela Postgres 'settings_app' no Supabase.

  Le envs:
    - PG_URI: string de conexão Postgres (obrigatória)
    - MONGODB_URI: string de conexão Mongo (opcional; default mongodb://localhost:27017/labadmin)
    - MONGODB_DB: nome do DB Mongo (opcional; default labadmin)
*/
const { MongoClient } = require('mongodb');
const { Client: PgClient } = require('pg');

(async () => {
  const pgUri = process.env.PG_URI || process.env.DATABASE_URL;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/labadmin';
  const mongoDbName = process.env.MONGODB_DB || 'labadmin';
  const dryRun = /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || '1')); // default: DRY RUN ON
  const allowCreate = /^(1|true|yes)$/i.test(String(process.env.CREATE_TABLE || '0'));

  if (!pgUri) {
    console.error('PG_URI not set');
    process.exit(1);
  }

  const ssl = pgUri.includes('supabase.co') ? { rejectUnauthorized: false } : undefined;
  const pg = new PgClient({ connectionString: pgUri, ssl });
  let mongoClient;
  try {
    // Conecta ao MongoDB
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);

    const DOC_QUERY = { key: 'app' };
    const doc = await db.collection('settings').findOne(DOC_QUERY);
    if (!doc) {
      console.error("Mongo: documento de settings com key='app' não encontrado. Abortando.");
      process.exit(2);
    }

    // Normaliza/define defaults semelhantes ao endpoint atual
    const appName = (doc && doc.appName) || 'LabAdmin';
    const showWelcome = doc?.showWelcome ?? true;
    const welcomeMessage = (doc && doc.welcomeMessage) || 'Estamos prontos para impulsionar sua experiência com uma gestão simplificada, eficiente e elegante. Explore, gerencie e transforme seus projetos com facilidade! 🚀';
    const showAdvantages = doc?.showAdvantages ?? true;
    const advantagesRotationMs = doc?.advantagesRotationMs ?? 8000;

    const defaultAdvantages = [
      { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!' },
      { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.' },
    ];

    const rawAdv = (doc && doc.advantages) || defaultAdvantages;
    const advantages = Array.isArray(rawAdv)
      ? rawAdv.map((it) => ({
          destaque: String(it?.destaque || ''),
          complemento: String(it?.complemento || ''),
          active: typeof it?.active === 'boolean' ? it.active : true,
        }))
      : defaultAdvantages.map((it) => ({ ...it, active: true }));

    // Conecta ao Postgres (Supabase)
    await pg.connect();

    // Verifica colunas existentes da tabela settings_app
    const colsRes = await pg.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'settings_app'
      order by ordinal_position
    `);
    const cols = colsRes.rows.map(r => r.column_name);
    const colsSet = new Set(cols);

    // Se a tabela não existir, só cria com flag explícita
    if (cols.length === 0) {
      if (!allowCreate) {
        console.error("Tabela public.settings_app não existe. Defina CREATE_TABLE=1 para permitir criação. Abortando em segurança.");
        process.exit(3);
      }
      const createSql = `
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
      `;
      await pg.query(createSql);
      cols.push('key','app_name','show_welcome','welcome_message','show_advantages','advantages_rotation_ms','advantages','updated_at');
      ['key','app_name','show_welcome','welcome_message','show_advantages','advantages_rotation_ms','advantages','updated_at'].forEach(c=>colsSet.add(c));
    }

    // Snapshot do estado atual antes de qualquer alteração
    let beforeSnapshot = null;
    if (colsSet.has('key')) {
      const { rows } = await pg.query(`select key, app_name, show_welcome, show_advantages, advantages_rotation_ms, updated_at from settings_app where key='app'`);
      beforeSnapshot = rows[0] || null;
    } else if (colsSet.has('id')) {
      const { rows } = await pg.query(`select id, app_name, show_welcome, show_advantages, advantages_rotation_ms, updated_at from settings_app order by id asc limit 1`);
      beforeSnapshot = rows[0] || null;
    }
    console.log('Snapshot antes da migração:', JSON.stringify(beforeSnapshot, null, 2));

    const payload = {
      app_name: appName,
      show_welcome: showWelcome,
      welcome_message: welcomeMessage,
      show_advantages: showAdvantages,
      advantages_rotation_ms: Math.max(2000, Math.min(60000, Math.floor(Number(advantagesRotationMs) || 8000))),
      advantages: JSON.stringify(advantages),
      updated_at: new Date().toISOString(),
    };

    // Transação para garantir atomicidade; em DRY_RUN fazemos ROLLBACK
    await pg.query('begin');
    if (colsSet.has('key')) {
      // Upsert por 'key'
      const useCols = ['key', ...Object.keys(payload).filter(k => colsSet.has(k))];
      const placeholders = useCols.map((_, i) => `$${i+1}`).join(', ');
      const values = ['app', ...useCols.slice(1).map(k => k === 'advantages' ? payload[k] : payload[k])];
      const updates = useCols.slice(1).map(k => `${k} = excluded.${k}`).join(', ');
      const sql = `insert into settings_app (${useCols.join(', ')}) values (${placeholders}) on conflict (key) do update set ${updates}`;
      await pg.query(sql, values);
      const { rows } = await pg.query(`select key, app_name, show_welcome, show_advantages, advantages_rotation_ms, jsonb_array_length(advantages) as advantages_len, updated_at from settings_app where key = 'app'`);
      console.log('Migrated (by key):', rows[0]);
    } else if (colsSet.has('id')) {
      // Tabela com coluna 'id' (provável identity). Atualiza a primeira linha se existir; caso contrário, insere sem especificar 'id'.
      const existingAny = await pg.query('select id from settings_app order by id asc limit 1');
      const allowed = Object.keys(payload).filter(k => colsSet.has(k));
      if (existingAny.rowCount > 0) {
        const id = existingAny.rows[0].id;
        const setList = allowed.map((k, i) => `${k} = $${i+1}`).join(', ');
        const vals = allowed.map(k => payload[k]);
        await pg.query(`update settings_app set ${setList} where id = ${id}`, vals);
        const pickCols = ['id','app_name','show_welcome','show_advantages','advantages_rotation_ms','updated_at'].filter(c => colsSet.has(c));
        const sel = pickCols.length ? pickCols.join(', ') : '*';
        const { rows } = await pg.query(`select ${sel} from settings_app where id = ${id}`);
        console.log('Migrated (by id, updated existing):', rows[0]);
      } else {
        const colsIns = [...allowed];
        const vals = allowed.map(k => payload[k]);
        const ph = colsIns.map((_, i) => `$${i+1}`).join(', ');
        await pg.query(`insert into settings_app (${colsIns.join(', ')}) values (${ph})`, vals);
        const { rows } = await pg.query('select * from settings_app order by id desc limit 1');
        console.log('Migrated (by id, inserted new):', rows[0]);
      }
    } else {
      // Sem 'key' e sem 'id' — faz insert/merge melhor esforço com as colunas disponíveis
      const allowed = Object.keys(payload).filter(k => colsSet.has(k));
      const ph = allowed.map((_, i) => `$${i+1}`).join(', ');
      try {
        await pg.query(`insert into settings_app (${allowed.join(', ')}) values (${ph})`, allowed.map(k => payload[k]));
        console.log('Inserted (best-effort)');
      } catch (e) {
        console.error('Best-effort insert failed:', e.message);
        throw e;
      }
      const { rows } = await pg.query('select * from settings_app limit 1');
      console.log('Migrated (best-effort):', rows[0]);
    }
    if (dryRun) {
      console.log('DRY_RUN ativo: realizando ROLLBACK (nenhuma alteração persistida).');
      await pg.query('rollback');
    } else {
      await pg.query('commit');
      console.log('Alterações confirmadas (COMMIT).');
    }
    console.log('Done');
    console.log('Done');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
    try { await mongoClient?.close(); } catch {}
  }
})()
