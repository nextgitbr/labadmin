/*
  Import a full list of advantages into Supabase settings_advantages, replacing current list for the app.
  The list below was provided by the user. Order defines position (1..n).

  Env:
    PG_URI (required)
*/
const { Client } = require('pg');

const ADVANTAGES = [
  { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!', active: true },
  { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.', active: true },
  { destaque: 'Impressione pacientes', complemento: 'com próteses sob medida em uma única visita.', active: true },
  { destaque: 'Elimine erros', complemento: 'com escaneamentos digitais e modelagem 3D precisa.', active: true },
  { destaque: 'Aumente a durabilidade', complemento: 'de coroas e facetas com fabricação impecável.', active: true },
  { destaque: 'Personalize sorrisos', complemento: 'com designs únicos adaptados a cada paciente.', active: true },
  { destaque: 'Economize materiais', complemento: 'e produza restaurações com mínimo desperdício.', active: true },
  { destaque: 'Agilize tratamentos', complemento: 'com fluxos integrados de design e fresagem.', active: true },
  { destaque: 'Ofereça conforto', complemento: 'com ajustes perfeitos graças à tecnologia CAD/CAM.', active: true },
  { destaque: 'Visualize virtualmente', complemento: 'restaurações antes da produção final.', active: true },
  { destaque: 'Eleve a estética', complemento: 'com acabamentos naturais e precisos.', active: true },
  { destaque: 'Automatize processos', complemento: 'e otimize o tempo no consultório odontológico.', active: true },
  { destaque: 'Integre com facilidade', complemento: 'dados de escaneamento intraoral ao CAD/CAM.', active: true },
  { destaque: 'Reduza custos', complemento: 'com produção eficiente e menos retrabalho.', active: true },
  { destaque: 'Transforme sorrisos', complemento: 'com a tecnologia de ponta do CAD/CAM!', active: true },
];

async function main() {
  const pgUri = process.env.PG_URI;
  if (!pgUri) { console.error('PG_URI not set'); process.exit(1); }
  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  try {
    // Detect linkage
    const colsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_advantages'`);
    const cols = new Set(colsRes.rows.map(r => r.column_name));
    const useKey = cols.has('app_key');

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

    // Upsert new list
    for (let i = 0; i < ADVANTAGES.length; i++) {
      const a = ADVANTAGES[i];
      const position = i + 1;
      const params = [linkValue, position, a.destaque, a.complemento, a.active ?? true];
      if (useKey) {
        await pg.query(
          `insert into public.settings_advantages (app_key, position, destaque, complemento, active)
           values ($1,$2,$3,$4,$5)
           on conflict (app_key, position)
           do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
          params
        );
      } else {
        await pg.query(
          `insert into public.settings_advantages (app_id, position, destaque, complemento, active)
           values ($1,$2,$3,$4,$5)
           on conflict (app_id, position)
           do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
          params
        );
      }
    }

    // Remove extra rows not present in the new list (positions > length)
    if (useKey) {
      await pg.query(`delete from public.settings_advantages where app_key=$1 and position > $2`, [linkValue, ADVANTAGES.length]);
    } else {
      await pg.query(`delete from public.settings_advantages where app_id=$1 and position > $2`, [linkValue, ADVANTAGES.length]);
    }

    await pg.query('commit');
    console.log(`Imported ${ADVANTAGES.length} advantages and removed extras.`);
  } catch (e) {
    await pg.query('rollback').catch(()=>{});
    console.error('Import failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
