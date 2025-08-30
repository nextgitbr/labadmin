#!/usr/bin/env node
/**
 * Backfill users from MongoDB (collection 'users') into Supabase Postgres public.users
 * - Maps fields roughly 1:1 to columns
 * - external_id = Mongo _id (string)
 * - permissions stored as JSONB
 * - Upsert by external_id to avoid duplicates
 */
const { MongoClient, ObjectId } = require('mongodb');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvVarFromFile(key) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'm');
  const m = content.match(re);
  if (m) {
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) v = v.slice(1, -1);
    return v;
  }
  return null;
}

const MONGODB_URI = process.env.MONGODB_URI || loadEnvVarFromFile('MONGODB_URI') || 'mongodb://localhost:27017/labadmin';
const PG_URI = process.env.PG_URI || process.env.DATABASE_URL || loadEnvVarFromFile('PG_URI') || loadEnvVarFromFile('DATABASE_URL');

if (!PG_URI) {
  console.error('DATABASE_URL/PG_URI não configurado');
  process.exit(1);
}

async function run() {
  console.log('Connecting to MongoDB...');
  const mclient = new MongoClient(MONGODB_URI);
  await mclient.connect();
  const mdb = mclient.db();

  console.log('Connecting to Postgres...');
  const pg = new Client({ connectionString: PG_URI, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  try {
    const users = await mdb.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in MongoDB.`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const u of users) {
      const extId = (u._id || '').toString();
      const firstName = u.firstName || '';
      const lastName = u.lastName || '';
      const email = u.email || '';
      const phone = u.phone || '';
      const country = u.country || '';
      const city = u.city || '';
      const zip = u.zip || '';
      const vat = u.vat || '';
      const role = u.role || '';
      const permissions = u.permissions || {};
      const company = u.company || '';
      const avatar = u.avatar || '/images/avatars/default.svg';
      const password = u.password || '';
      const securityPin = u.securityPin || '';
      const isActive = (typeof u.isActive === 'boolean') ? u.isActive : (u.active !== false);
      const active = (typeof u.active === 'boolean') ? u.active : undefined;
      const createdAt = u.createdAt ? new Date(u.createdAt) : new Date();
      const updatedAt = u.updatedAt ? new Date(u.updatedAt) : new Date();

      const res = await pg.query(
        `insert into public.users (
           external_id, first_name, last_name, email, phone, country, city, zip,
           vat, role, permissions, company, avatar, password, security_pin,
           is_active, active, created_at, updated_at
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,$13,$14,$15,
           $16,$17,$18,$19
         )
         on conflict (external_id)
         do update set
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           email=excluded.email,
           phone=excluded.phone,
           country=excluded.country,
           city=excluded.city,
           zip=excluded.zip,
           vat=excluded.vat,
           role=excluded.role,
           permissions=excluded.permissions,
           company=excluded.company,
           avatar=excluded.avatar,
           password=excluded.password,
           security_pin=excluded.security_pin,
           is_active=excluded.is_active,
           active=excluded.active,
           created_at=least(public.users.created_at, excluded.created_at),
           updated_at=excluded.updated_at
         returning (xmax = 0) as inserted` ,
        [
          extId, firstName, lastName, email, phone, country, city, zip,
          vat, role, JSON.stringify(permissions), company, avatar, password, securityPin,
          isActive, active ?? null, createdAt, updatedAt
        ]
      );
      const wasInserted = res.rows[0]?.inserted === true;
      if (wasInserted) inserted++; else updated++;
    }

    console.log(`Backfill complete. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  } catch (e) {
    console.error('Backfill users failed:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
    await mclient.close();
  }
}

run();
