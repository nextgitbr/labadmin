#!/usr/bin/env node
/*
  Backfill visual fields in public.stages based on color
  Fills: stroke, background_color, primary_color, card_bg_color when null/empty
*/
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadConnFromEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const pick = (key) => {
    const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'm');
    const m = content.match(re);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) v = v.slice(1, -1);
      return v;
    }
    return null;
  };
  return pick('PG_URI') || pick('DATABASE_URL');
}

function getPg() {
  const conn = process.env.PG_URI || process.env.DATABASE_URL || loadConnFromEnvFile();
  if (!conn) throw new Error('PG_URI/DATABASE_URL não configurado no ambiente/.env.local');
  return new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
}

function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  if (Number.isNaN(bigint)) return { r: 0, g: 0, b: 0 };
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
function mix(a, b, t) { return a * (1 - t) + b * t; }
function mixWith(hex, otherHex, ratio) {
  const A = hexToRgb(hex); const B = hexToRgb(otherHex);
  const r = clamp(mix(A.r, B.r, ratio));
  const g = clamp(mix(A.g, B.g, ratio));
  const b = clamp(mix(A.b, B.b, ratio));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
function deriveDefaults(color) {
  const c = color || '#3b82f6';
  return {
    backgroundColor: mixWith(c, '#ffffff', 0.9),
    stroke: mixWith(c, '#000000', 0.25),
    primaryColor: c,
    cardBgColor: mixWith(c, '#ffffff', 0.92),
  };
}

(async () => {
  const pg = getPg();
  await pg.connect();
  try {
    const { rows } = await pg.query(
      'select id, color, stroke, background_color, primary_color, card_bg_color from public.stages order by "order" asc nulls last'
    );
    let updated = 0;

    await pg.query('begin');
    for (const row of rows) {
      const d = deriveDefaults(row.color);
      const sets = [];
      const vals = [];
      function set(col, val) {
        const missing = row[col] == null || (typeof row[col] === 'string' && row[col].trim() === '');
        if (missing) {
          vals.push(val);
          sets.push(`${col}=$${vals.length}`);
        }
      }
      set('stroke', d.stroke);
      set('background_color', d.backgroundColor);
      set('primary_color', d.primaryColor);
      set('card_bg_color', d.cardBgColor);

      if (sets.length > 0) {
        vals.push(row.id);
        const sql = `update public.stages set ${sets.join(', ')}, updated_at=now() where id=$${vals.length}`;
        await pg.query(sql, vals);
        updated++;
      }
    }
    await pg.query('commit');
    console.log(`Backfill concluído. Linhas atualizadas: ${updated}/${rows.length}`);
  } catch (e) {
    try { await pg.query('rollback'); } catch {}
    console.error('Erro no backfill:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
