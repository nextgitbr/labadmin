// Creates the public.stages table in Postgres and seeds default stages if empty
// Usage: node scripts/create-stages-table.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadPgUri() {
  if (process.env.PG_URI) return process.env.PG_URI;
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const m = content.match(/^\s*PG_URI\s*=\s*(.+)\s*$/m);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return v;
    }
  }
  return null;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
function mix(a, b, t) { return a * (1 - t) + b * t; }
function mixWith(hex, otherHex, ratio) {
  const A = hexToRgb(hex); const B = hexToRgb(otherHex);
  const r = clamp(mix(A.r, B.r, ratio));
  const g = clamp(mix(A.g, B.g, ratio));
  const b = clamp(mix(A.b, B.b, ratio));
  return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}
function deriveDefaults(color) {
  return {
    backgroundColor: mixWith(color, '#ffffff', 0.9),
    stroke: mixWith(color, '#000000', 0.25),
    primaryColor: color,
    cardBgColor: mixWith(color, '#ffffff', 0.92),
  };
}

(async () => {
  const pgUri = loadPgUri();
  if (!pgUri) {
    console.error('PG_URI not found. Set it in environment or .env.local');
    process.exit(1);
  }

  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  try {
    await pg.connect();

    // Create table
    await pg.query(`
      create table if not exists public.stages (
        id text primary key,
        name text not null,
        color text not null,
        stroke text not null,
        background_color text not null,
        primary_color text not null,
        card_bg_color text not null,
        "order" integer not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    // Seed defaults if empty
    const cnt = await pg.query(`select count(*)::int as c from public.stages`);
    if ((cnt.rows[0]?.c ?? 0) === 0) {
      const defaults = [
        { id: 'pending', name: 'Criado', color: '#3b82f6', order: 1 },
        { id: 'in_progress', name: 'Em Produção', color: '#f59e0b', order: 2 },
        { id: 'quality_check', name: 'Controle de Qualidade', color: '#8b5cf6', order: 3 },
        { id: 'completed', name: 'Finalizado', color: '#10b981', order: 4 },
      ];
      for (const s of defaults) {
        const d = deriveDefaults(s.color);
        await pg.query(
          `insert into public.stages (id, name, color, stroke, background_color, primary_color, card_bg_color, "order")
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (id) do update set
             name=excluded.name,
             color=excluded.color,
             stroke=excluded.stroke,
             background_color=excluded.background_color,
             primary_color=excluded.primary_color,
             card_bg_color=excluded.card_bg_color,
             "order"=excluded."order",
             updated_at=now()`,
          [s.id, s.name, s.color, d.stroke, d.backgroundColor, d.primaryColor, d.cardBgColor, s.order]
        );
      }
    }

    console.log('stages table is ready and data ensured.');
  } catch (e) {
    console.error('Failed to create/seed stages:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
