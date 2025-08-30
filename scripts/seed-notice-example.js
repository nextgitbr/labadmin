/*
  Seed example content into public.notice_settings
  Env: PG_URI (or use same as create script)
*/
const { Client } = require('pg');

async function main() {
  const pgUri = process.env.PG_URI || process.env.DATABASE_URL;
  if (!pgUri) {
    console.error('PG_URI/DATABASE_URL not set');
    process.exit(1);
  }
  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  try {
    await pg.query('begin');

    // Detect linkage mode
    const appColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app'`);
    const appCols = new Set(appColsRes.rows.map(r => r.column_name));
    const useKey = appCols.has('key');

    // Ensure table exists
    const noticeColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='notice_settings'`);
    if (noticeColsRes.rowCount === 0) {
      throw new Error('notice_settings table not found. Run create-notice-settings-table.js first.');
    }

    const sample = {
      enabled: true,
      title: 'Grow your lab with confidence',
      description: 'Boost productivity with a modern, customizable admin panel tailored for dental labs.',
      cta_label: 'Learn more',
      cta_url: '#',
      bg_color: '#0b1220',
      text_color: '#e5e7eb',
      border_color: '#334155',
      cta_bg_color: '#2563eb',
      cta_text_color: '#ffffff',
      title_font_family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', sans-serif",
      body_font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif",
    };

    if (useKey) {
      await pg.query(`
        insert into public.notice_settings (app_key, enabled, title, description, cta_label, cta_url,
          bg_color, text_color, border_color, cta_bg_color, cta_text_color, title_font_family, body_font_family)
        values ('app', $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        on conflict (app_key) do update set
          enabled=excluded.enabled,
          title=excluded.title,
          description=excluded.description,
          cta_label=excluded.cta_label,
          cta_url=excluded.cta_url,
          bg_color=excluded.bg_color,
          text_color=excluded.text_color,
          border_color=excluded.border_color,
          cta_bg_color=excluded.cta_bg_color,
          cta_text_color=excluded.cta_text_color,
          title_font_family=excluded.title_font_family,
          body_font_family=excluded.body_font_family,
          updated_at=now()
      `, [
        sample.enabled,
        sample.title,
        sample.description,
        sample.cta_label,
        sample.cta_url,
        sample.bg_color,
        sample.text_color,
        sample.border_color,
        sample.cta_bg_color,
        sample.cta_text_color,
        sample.title_font_family,
        sample.body_font_family,
      ]);
    } else {
      const base = await pg.query(`select id from public.settings_app order by id asc limit 1`);
      const appId = base.rows[0]?.id;
      if (!appId) throw new Error('settings_app base row not found');
      await pg.query(`
        insert into public.notice_settings (app_id, enabled, title, description, cta_label, cta_url,
          bg_color, text_color, border_color, cta_bg_color, cta_text_color, title_font_family, body_font_family)
        values ($1, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        on conflict (app_id) do update set
          enabled=excluded.enabled,
          title=excluded.title,
          description=excluded.description,
          cta_label=excluded.cta_label,
          cta_url=excluded.cta_url,
          bg_color=excluded.bg_color,
          text_color=excluded.text_color,
          border_color=excluded.border_color,
          cta_bg_color=excluded.cta_bg_color,
          cta_text_color=excluded.cta_text_color,
          title_font_family=excluded.title_font_family,
          body_font_family=excluded.body_font_family,
          updated_at=now()
      `, [
        appId,
        sample.enabled,
        sample.title,
        sample.description,
        sample.cta_label,
        sample.cta_url,
        sample.bg_color,
        sample.text_color,
        sample.border_color,
        sample.cta_bg_color,
        sample.cta_text_color,
        sample.title_font_family,
        sample.body_font_family,
      ]);
    }

    await pg.query('commit');
    console.log('Seeded example notice content.');
  } catch (e) {
    await pg.query('rollback');
    console.error('Seed failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
