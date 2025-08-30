/*
  Create Notice Settings table (public.notice_settings) with adaptive linkage to settings_app
  and backfill from settings_app promo_* columns if they exist.

  Env:
    PG_URI (required)
*/
const { Client } = require('pg');

async function main() {
  const pgUri = process.env.PG_URI;
  if (!pgUri) {
    console.error('PG_URI not set');
    process.exit(1);
  }
  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  try {
    await pg.query('begin');

    // Detect settings_app schema to choose linkage mode
    const appColsRes = await pg.query(`
      select column_name
      from information_schema.columns
      where table_schema='public' and table_name='settings_app'
    `);
    const appCols = new Set(appColsRes.rows.map(r => r.column_name));
    const useKey = appCols.has('key');

    // Create notice_settings table if not exists (dual schema support)
    if (useKey) {
      await pg.query(`
        create table if not exists public.notice_settings (
          id bigint generated always as identity primary key,
          app_key text not null references public.settings_app(key) on delete cascade,
          enabled boolean not null default true,
          title text not null default '',
          description text not null default '',
          cta_label text not null default '',
          cta_url text not null default '',
          // style fields
          bg_color text,
          text_color text,
          border_color text,
          cta_bg_color text,
          cta_text_color text,
          title_font_family text,
          body_font_family text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (app_key)
        );
      `);
      await pg.query(`
        create index if not exists idx_notice_app_key on public.notice_settings(app_key);
      `);
    } else {
      await pg.query(`
        create table if not exists public.notice_settings (
          id bigint generated always as identity primary key,
          app_id bigint not null references public.settings_app(id) on delete cascade,
          enabled boolean not null default true,
          title text not null default '',
          description text not null default '',
          cta_label text not null default '',
          cta_url text not null default '',
          -- style fields
          bg_color text,
          text_color text,
          border_color text,
          cta_bg_color text,
          cta_text_color text,
          title_font_family text,
          body_font_family text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (app_id)
        );
      `);
      await pg.query(`
        create index if not exists idx_notice_app_id on public.notice_settings(app_id);
      `);
    }

    // Backfill from settings_app promo_* if present and notice_settings empty
    const promoCols = new Set(['promo_enabled','promo_title','promo_description','promo_cta_label','promo_cta_url']
      .filter(c => appCols.has(c)));

    if (useKey) {
      const exists = await pg.query(`select 1 from public.notice_settings where app_key='app' limit 1`);
      if (exists.rowCount === 0) {
        if (promoCols.size > 0) {
          const r = await pg.query(`
            select 
              coalesce(promo_enabled, true) as enabled,
              coalesce(promo_title, '') as title,
              coalesce(promo_description, '') as description,
              coalesce(promo_cta_label, '') as cta_label,
              coalesce(promo_cta_url, '') as cta_url
            from public.settings_app
            where key='app'
            limit 1
          `);
          const row = r.rows[0] || {};
          await pg.query(`
            insert into public.notice_settings (app_key, enabled, title, description, cta_label, cta_url)
            values ('app', $1, $2, $3, $4, $5)
          `, [row.enabled ?? true, row.title ?? '', row.description ?? '', row.cta_label ?? '', row.cta_url ?? '']);
        } else {
          await pg.query(`insert into public.notice_settings (app_key) values ('app') on conflict do nothing`);
        }
      }
    } else {
      const base = await pg.query(`select id from public.settings_app order by id asc limit 1`);
      if (base.rowCount > 0) {
        const appId = base.rows[0].id;
        const exists = await pg.query(`select 1 from public.notice_settings where app_id=$1 limit 1`, [appId]);
        if (exists.rowCount === 0) {
          if (promoCols.size > 0) {
            const r = await pg.query(`
              select 
                coalesce(promo_enabled, true) as enabled,
                coalesce(promo_title, '') as title,
                coalesce(promo_description, '') as description,
                coalesce(promo_cta_label, '') as cta_label,
                coalesce(promo_cta_url, '') as cta_url
              from public.settings_app
              where id=$1
              limit 1
            `, [appId]);
            const row = r.rows[0] || {};
            await pg.query(`
              insert into public.notice_settings (app_id, enabled, title, description, cta_label, cta_url)
              values ($1, $2, $3, $4, $5, $6)
            `, [appId, row.enabled ?? true, row.title ?? '', row.description ?? '', row.cta_label ?? '', row.cta_url ?? '']);
          } else {
            await pg.query(`insert into public.notice_settings (app_id) values ($1) on conflict do nothing`, [appId]);
          }
        }
      }
    }

    await pg.query('commit');
    console.log('notice_settings created/verified and backfilled.');
  } catch (e) {
    await pg.query('rollback');
    console.error('Creation failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
