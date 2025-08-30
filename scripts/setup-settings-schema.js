/*
  Setup settings schema in Supabase (Postgres):
  - public.settings_app (root config; keeps welcome_message for backward compatibility)
  - public.settings_welcome_messages (multi-locale)
  - public.settings_advantages (ordered list)
  Performs safe backfill from existing settings_app.advantages JSON and welcome_message to pt-BR.

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

    // Detect existing schema for settings_app
    const appColsRes = await pg.query(`
      select column_name
      from information_schema.columns
      where table_schema='public' and table_name='settings_app'
      order by ordinal_position
    `);
    const appCols = new Set(appColsRes.rows.map(r => r.column_name));

    // If table doesn't exist, create with 'key' PK by default
    if (appColsRes.rowCount === 0) {
      await pg.query(`
        create table if not exists public.settings_app (
          key text primary key,
          app_name text not null,
          show_welcome boolean not null,
          welcome_message text not null,
          show_advantages boolean not null,
          advantages_rotation_ms integer not null,
          updated_at timestamptz not null default now()
        );
      `);
      appCols.add('key');
    }

    // Ensure required columns exist (we will drop legacy cols after backfill)
    const ensureCol = async (name, ddl) => {
      if (!appCols.has(name)) {
        await pg.query(`alter table public.settings_app add column ${ddl}`);
        appCols.add(name);
      }
    };

    await ensureCol('app_name', 'app_name text');
    await ensureCol('show_welcome', 'show_welcome boolean');
    await ensureCol('show_advantages', 'show_advantages boolean');
    await ensureCol('advantages_rotation_ms', 'advantages_rotation_ms integer');
    await ensureCol('updated_at', 'updated_at timestamptz');

    // Backfill NULLs with safe defaults before NOT NULL
    await pg.query(`
      update public.settings_app
      set app_name = coalesce(app_name, 'LabAdmin'),
          show_welcome = coalesce(show_welcome, true),
          show_advantages = coalesce(show_advantages, true),
          advantages_rotation_ms = coalesce(advantages_rotation_ms, 8000),
          updated_at = coalesce(updated_at, now())
    `);

    // Set defaults and NOT NULLs
    await pg.query(`
      alter table public.settings_app
        alter column app_name set not null,
        alter column show_welcome set default true,
        alter column show_welcome set not null,
        alter column show_advantages set default true,
        alter column show_advantages set not null,
        alter column advantages_rotation_ms set default 8000,
        alter column advantages_rotation_ms set not null,
        alter column updated_at set default now(),
        alter column updated_at set not null
    `);

    // settings_welcome_messages (multi-locale) - support app_key or app_id depending on existing schema
    if (appCols.has('key')) {
      await pg.query(`
        create table if not exists public.settings_welcome_messages (
          id bigint generated always as identity primary key,
          app_key text not null references public.settings_app(key) on delete cascade,
          locale text not null default 'pt-BR',
          message text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (app_key, locale)
        );
      `);
      await pg.query(`
        create index if not exists idx_welcome_app_key on public.settings_welcome_messages(app_key);
        create index if not exists idx_welcome_locale on public.settings_welcome_messages(locale);
      `);
    } else {
      // Assume 'id' PK exists
      await pg.query(`
        create table if not exists public.settings_welcome_messages (
          id bigint generated always as identity primary key,
          app_id bigint not null references public.settings_app(id) on delete cascade,
          locale text not null default 'pt-BR',
          message text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (app_id, locale)
        );
      `);
      await pg.query(`
        create index if not exists idx_welcome_app_id on public.settings_welcome_messages(app_id);
        create index if not exists idx_welcome_locale on public.settings_welcome_messages(locale);
      `);
    }

    // settings_advantages - app_key or app_id
    if (appCols.has('key')) {
      await pg.query(`
        create table if not exists public.settings_advantages (
          id bigint generated always as identity primary key,
          app_key text not null references public.settings_app(key) on delete cascade,
          position int not null,
          destaque text not null,
          complemento text not null,
          active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (app_key, position)
        );
      `);
      await pg.query(`
        create index if not exists idx_settings_adv_app_key on public.settings_advantages(app_key);
        create index if not exists idx_settings_adv_active on public.settings_advantages(active);
        create index if not exists idx_settings_adv_position on public.settings_advantages(position);
      `);
    } else {
      await pg.query(`
        create table if not exists public.settings_advantages (
          id bigint generated always as identity primary key,
          app_id bigint not null references public.settings_app(id) on delete cascade,
          position int not null,
          destaque text not null,
          complemento text not null,
          active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (app_id, position)
        );
      `);
      await pg.query(`
        create index if not exists idx_settings_adv_app_id on public.settings_advantages(app_id);
        create index if not exists idx_settings_adv_active on public.settings_advantages(active);
        create index if not exists idx_settings_adv_position on public.settings_advantages(position);
      `);
    }

    // Backfill welcome_messages (pt-BR) from settings_app if missing (before dropping legacy columns)
    if (appCols.has('key')) {
      const hasAppRow = await pg.query(`select key, welcome_message from public.settings_app where key='app'`);
      if (hasAppRow.rowCount > 0) {
        const welcome = (hasAppRow.rows[0].welcome_message || '').trim();
        const existsWelcome = await pg.query(`select 1 from public.settings_welcome_messages where app_key='app' and locale='pt-BR' limit 1`);
        if (welcome && existsWelcome.rowCount === 0) {
          await pg.query(`
            insert into public.settings_welcome_messages (app_key, locale, message)
            values ('app','pt-BR',$1)
            on conflict (app_key, locale) do nothing
          `, [welcome]);
        }
      }
    } else {
      const hasAppRow = await pg.query(`select id, welcome_message from public.settings_app order by id asc limit 1`);
      if (hasAppRow.rowCount > 0) {
        const appId = hasAppRow.rows[0].id;
        const welcome = (hasAppRow.rows[0].welcome_message || '').trim();
        const existsWelcome = await pg.query(`select 1 from public.settings_welcome_messages where app_id=$1 and locale='pt-BR' limit 1`, [appId]);
        if (welcome && existsWelcome.rowCount === 0) {
          await pg.query(`
            insert into public.settings_welcome_messages (app_id, locale, message)
            values ($1,'pt-BR',$2)
            on conflict (app_id, locale) do nothing
          `, [appId, welcome]);
        }
      }
    }

    // Backfill advantages from settings_app.advantages JSONB if column exists (before dropping legacy columns)
    const colCheck = await pg.query(`
      select 1 from information_schema.columns
      where table_schema='public' and table_name='settings_app' and column_name='advantages'
    `);
    if (colCheck.rowCount > 0) {
      if (appCols.has('key')) {
        const advExists = await pg.query(`select 1 from public.settings_advantages where app_key='app' limit 1`);
        if (advExists.rowCount === 0) {
          await pg.query(`
            with src as (
              select advantages from public.settings_app where key='app'
            ),
            ins as (
              select 
                'app'::text as app_key,
                (elem)->>'destaque' as destaque,
                (elem)->>'complemento' as complemento,
                coalesce(((elem)->>'active')::boolean, true) as active,
                ord::int as position
              from src, jsonb_array_elements(src.advantages) with ordinality as t(elem, ord)
            )
            insert into public.settings_advantages (app_key, position, destaque, complemento, active)
            select app_key, position, destaque, complemento, active
            from ins
          `);
        }
      } else {
        const base = await pg.query(`select id from public.settings_app order by id asc limit 1`);
        if (base.rowCount > 0) {
          const appId = base.rows[0].id;
          const advExists = await pg.query(`select 1 from public.settings_advantages where app_id=$1 limit 1`, [appId]);
          if (advExists.rowCount === 0) {
            await pg.query(`
              with src as (
                select advantages from public.settings_app where id=$1
              ),
              ins as (
                select 
                  $1::bigint as app_id,
                  (elem)->>'destaque' as destaque,
                  (elem)->>'complemento' as complemento,
                  coalesce(((elem)->>'active')::boolean, true) as active,
                  ord::int as position
                from src, jsonb_array_elements(src.advantages) with ordinality as t(elem, ord)
              )
              insert into public.settings_advantages (app_id, position, destaque, complemento, active)
              select app_id, position, destaque, complemento, active
              from ins
            `, [appId]);
          }
        }
      }
    }

    // Now drop legacy columns from settings_app, if they still exist
    const legacyColsRes = await pg.query(`
      select column_name
      from information_schema.columns
      where table_schema='public' and table_name='settings_app' and column_name in ('welcome_message','advantages')
    `);
    const legacy = new Set(legacyColsRes.rows.map(r => r.column_name));
    if (legacy.has('welcome_message')) {
      await pg.query(`alter table public.settings_app drop column if exists welcome_message`);
      appCols.delete('welcome_message');
    }
    if (legacy.has('advantages')) {
      await pg.query(`alter table public.settings_app drop column if exists advantages`);
      appCols.delete('advantages');
    }

    await pg.query('commit');
    console.log('Schema created/verified and backfill completed (adaptive to existing PK).');
  } catch (e) {
    await pg.query('rollback');
    console.error('Setup failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
