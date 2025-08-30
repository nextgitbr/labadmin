#!/usr/bin/env node
/**
 * Set company for technician user(s)
 * - Matches by role='technician' and/or specific email if provided via env EMAIL
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

(async () => {
  const conn = process.env.PG_URI || process.env.DATABASE_URL || loadConnFromEnvFile();
  if (!conn) throw new Error('PG_URI/DATABASE_URL não configurado');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const email = process.env.EMAIL; // opcional
    const company = process.env.COMPANY || 'Lab Progress';
    if (email) {
      const { rowCount } = await client.query(`update public.users set company=$1 where lower(email)=lower($2)`, [company, email]);
      console.log(`Updated by email=${email}: ${rowCount} row(s)`);
    } else {
      const { rowCount } = await client.query(`update public.users set company=$1 where role='technician'`, [company]);
      console.log(`Updated technicians: ${rowCount} row(s)`);
    }
  } catch (e) {
    console.error('Error updating company:', e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
