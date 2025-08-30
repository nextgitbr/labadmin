// Creates production-related tables: production_stages, production_stage_materials,
// production, production_comments
// Usage: node scripts/create-production-tables.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadPgUri() {
  // Prefer explicit PG_URI
  if (process.env.PG_URI) return process.env.PG_URI;
  // Fallback to DATABASE_URL from environment
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Try to read from .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const getVar = (name) => {
      const re = new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`, 'm');
      const m = content.match(re);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return v;
      }
      return null;
    };
    return getVar('PG_URI') || getVar('DATABASE_URL');
  }
  return null;
}

(async () => {
  const pgUri = loadPgUri();
  if (!pgUri) {
    console.error('PG_URI not found. Set it in environment or .env.local');
    process.exit(1);
  }
  const pg = new Client({ connectionString: pgUri, ssl: pgUri.includes('supabase.co') ? { rejectUnauthorized: false } : undefined });
  try {
    await pg.connect();

    // production_stages
    await pg.query(`
      create table if not exists public.production_stages (
        id text primary key,
        name text not null,
        order_index int not null default 0,
        color text,
        primary_color text,
        card_bg_color text,
        is_backward_allowed boolean default false,
        is_active boolean default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    // production_stage_materials
    await pg.query(`
      create table if not exists public.production_stage_materials (
        stage_id text not null references public.production_stages(id) on delete cascade,
        material text not null,
        primary key (stage_id, material)
      );
    `);

    // production
    await pg.query(`
      create table if not exists public.production (
        id bigserial primary key,
        order_id bigint not null references public.orders(id),
        code text,
        work_type text,
        material text,
        stage_id text references public.production_stages(id),
        operador_id bigint references public.users(id),
        operador_name text,
        lote text,
        cam_files jsonb default '[]'::jsonb,
        cad_files jsonb default '[]'::jsonb,
        priority text,
        estimated_delivery timestamptz,
        actual_delivery timestamptz,
        data jsonb default '{}'::jsonb,
        is_active boolean default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    // production_comments
    await pg.query(`
      create table if not exists public.production_comments (
        id bigserial primary key,
        production_id bigint not null references public.production(id) on delete cascade,
        user_id bigint references public.users(id),
        user_name text,
        user_role text,
        message text not null,
        attachments jsonb default '[]'::jsonb,
        is_internal boolean default false,
        created_at timestamptz not null default now()
      );
    `);

    // indexes
    await pg.query(`create index if not exists idx_production_order_id on public.production(order_id);`);
    await pg.query(`create index if not exists idx_production_stage_id on public.production(stage_id);`);

    // Ensure default stages if empty
    const { rows: cnt } = await pg.query(`select count(*)::int as c from public.production_stages`);
    if ((cnt?.[0]?.c ?? 0) === 0) {
      const defaults = [
        { id: 'iniciado', name: 'Iniciado', order_index: 1 },
        { id: 'modelos', name: 'Modelos', order_index: 2 },
        { id: 'montagem', name: 'Montagem', order_index: 3 }, // Acrílico
        { id: 'desenho', name: 'Desenho', order_index: 4 }, // CAD/CAM
        { id: 'fresagem_impressao', name: 'Fresagem/Impressão', order_index: 5 }, // Zircônia, Dissilicato, PMMA, Metal, Impressão
        { id: 'sinterizacao', name: 'Sinterização', order_index: 6 }, // Zircônia
        { id: 'cristalizacao', name: 'Cristalização', order_index: 7 }, // Dissilicato
        { id: 'acabamento', name: 'Acabamento', order_index: 8 },
        { id: 'qc', name: 'Controle de Qualidade', order_index: 9 },
        { id: 'finalizado', name: 'Finalizado', order_index: 10 },
      ];
      for (const s of defaults) {
        await pg.query(`
          insert into public.production_stages (id, name, order_index)
          values ($1,$2,$3)
          on conflict (id) do update set name = excluded.name, order_index = excluded.order_index, updated_at = now();
        `, [s.id, s.name, s.order_index]);
      }
      // Materials mapping
      const materialsByStage = new Map([
        ['montagem', ['Acrilico']],
        ['desenho', ['CAD/CAM']],
        ['fresagem_impressao', ['Zirconia', 'Dissilicato', 'PMMA', 'Metal', 'Impressão']],
        ['sinterizacao', ['Zirconia']],
        ['cristalizacao', ['Dissilicato']],
        // stages for all materials (we don't restrict with mapping means all). Add if you want explicit ALL
      ]);
      for (const [stageId, materials] of materialsByStage.entries()) {
        for (const m of materials) {
          await pg.query(
            `insert into public.production_stage_materials (stage_id, material) values ($1,$2)
             on conflict (stage_id, material) do nothing;`,
            [stageId, m]
          );
        }
      }
    }

    console.log('Production tables are ready.');
  } catch (e) {
    console.error('Failed to create production tables:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
