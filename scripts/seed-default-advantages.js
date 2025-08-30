/*
  Seed default advantages into Supabase settings_advantages using app_key or app_id.
  Defaults sourced from src/hooks/useAppSettings.ts

  Env:
    PG_URI (required)
*/
const { Client } = require('pg');

const DEFAULTS = [
  { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!', active: true },
  { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.', active: true },
];

async function main() {
  const pgUri = process.env.PG_URI;
  if (!pgUri) {
    console.error('PG_URI not set');
    process.exit(1);
  }
  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  try {
    // Detect linkage column
    const advColsRes = await pg.query(`
      select column_name from information_schema.columns
      where table_schema='public' and table_name='settings_advantages'
    `);
    const advCols = new Set(advColsRes.rows.map(r => r.column_name));
    const useKey = advCols.has('app_key');

    let linkValue;
    if (useKey) {
      const ex = await pg.query(`select 1 from public.settings_app where key='app' limit 1`);
      if (ex.rowCount === 0) throw new Error("settings_app with key='app' not found");
      linkValue = 'app';
    } else {
      const ex = await pg.query(`select id from public.settings_app order by id asc limit 1`);
      if (ex.rowCount === 0) throw new Error('settings_app row not found');
      linkValue = ex.rows[0].id;
    }

    await pg.query('begin');

    for (let i = 0; i < DEFAULTS.length; i++) {
      const a = DEFAULTS[i];
      const position = i + 1;
      if (useKey) {
        await pg.query(
          `insert into public.settings_advantages (app_key, position, destaque, complemento, active)
           values ($1,$2,$3,$4,$5)
           on conflict (app_key, position)
           do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
          [linkValue, position, a.destaque, a.complemento, a.active]
        );
      } else {
        await pg.query(
          `insert into public.settings_advantages (app_id, position, destaque, complemento, active)
           values ($1,$2,$3,$4,$5)
           on conflict (app_id, position)
           do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
          [linkValue, position, a.destaque, a.complemento, a.active]
        );
      }
    }

    await pg.query('commit');
    console.log(`Seeded ${DEFAULTS.length} default advantages.`);
  } catch (e) {
    await pg.query('rollback').catch(()=>{});
    console.error('Seeding failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
