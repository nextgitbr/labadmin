/*
  Backfill advantages from MongoDB settings (key='app') into Supabase Postgres settings_advantages.

  Env:
    MONGODB_URI (default mongodb://localhost:27017/)
    MONGODB_DB  (default labadmin)
    PG_URI      (required)
*/
const { MongoClient } = require('mongodb');
const { Client: PgClient } = require('pg');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
  const mongoDbName = process.env.MONGODB_DB || 'labadmin';
  const pgUri = process.env.PG_URI;
  if (!pgUri) {
    console.error('PG_URI not set');
    process.exit(1);
  }

  const mClient = new MongoClient(mongoUri);
  const pClient = new PgClient({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });

  await mClient.connect();
  await pClient.connect();
  try {
    const db = mClient.db(mongoDbName);
    const doc = await db.collection('settings').findOne({ key: 'app' });
    if (!doc) {
      throw new Error("Mongo settings doc with key='app' not found");
    }
    const advantages = Array.isArray(doc.advantages) ? doc.advantages : [];
    if (advantages.length === 0) {
      console.log('No advantages found in Mongo. Nothing to backfill.');
      return;
    }

    // Detect linkage mode: app_key or app_id
    const advColsRes = await pClient.query(`
      select column_name
      from information_schema.columns
      where table_schema='public' and table_name='settings_advantages'
    `);
    const advCols = new Set(advColsRes.rows.map(r => r.column_name));
    const useKey = advCols.has('app_key');

    let linkValue;
    if (useKey) {
      linkValue = 'app';
      // Ensure settings_app row exists
      const ex = await pClient.query(`select 1 from public.settings_app where key='app' limit 1`);
      if (ex.rowCount === 0) {
        throw new Error("settings_app row with key='app' not found in Postgres");
      }
    } else {
      // get id
      const ex = await pClient.query(`select id from public.settings_app order by id asc limit 1`);
      if (ex.rowCount === 0) {
        throw new Error('settings_app row not found in Postgres');
      }
      linkValue = ex.rows[0].id;
    }

    await pClient.query('begin');

    // Upsert all advantages by position
    for (let i = 0; i < advantages.length; i++) {
      const a = advantages[i] || {};
      const position = i + 1;
      const destaque = (a.destaque || '').toString();
      const complemento = (a.complemento || '').toString();
      const active = typeof a.active === 'boolean' ? a.active : true;

      if (useKey) {
        await pClient.query(
          `insert into public.settings_advantages (app_key, position, destaque, complemento, active)
           values ($1,$2,$3,$4,$5)
           on conflict (app_key, position)
           do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
          [linkValue, position, destaque, complemento, active]
        );
      } else {
        await pClient.query(
          `insert into public.settings_advantages (app_id, position, destaque, complemento, active)
           values ($1,$2,$3,$4,$5)
           on conflict (app_id, position)
           do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
          [linkValue, position, destaque, complemento, active]
        );
      }
    }

    await pClient.query('commit');
    console.log(`Backfilled ${advantages.length} advantages into settings_advantages (${useKey ? 'app_key' : 'app_id'} mode).`);
  } catch (e) {
    await pClient.query('rollback').catch(()=>{});
    console.error('Backfill failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mClient.close();
    await pClient.end();
  }
}

main();
