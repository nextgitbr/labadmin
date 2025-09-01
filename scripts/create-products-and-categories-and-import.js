#!/usr/bin/env node
/**
 * Prepare normalized product tables and import CSV:
 * - public.product_categories (tipo + categoria)
 * - public.products (references category)
 *
 * Source CSV: src/products/produtos.csv
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
  const useSsl = /supabase\.(co|com)/.test(conn) || /sslmode=require/i.test(conn);
  return new Client({ connectionString: conn, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
}

// Simple CSV parser (supports quotes and commas inside quotes)
function parseCSV(content) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      cur.push(field.trim()); field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (field.length > 0 || cur.length > 0) { cur.push(field.trim()); rows.push(cur); cur = []; field = ''; }
      if (ch === '\r' && next === '\n') i++;
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field.trim()); rows.push(cur); }
  return rows;
}

function normalizeHeader(h) {
  const map = {
    'código': 'codigo',
    'codigo': 'codigo',
    'nome': 'nome',
    'preço base': 'precoBase',
    'preco base': 'precoBase',
    'código de categoria': 'codCategoria',
    'codigo de categoria': 'codCategoria',
    'categoria': 'categoria',
    'tipo': 'tipo',
    'descicao': 'descricao',
    'descrição': 'descricao',
    'descricao': 'descricao',
    'iva': 'iva',
  };
  const key = String(h || '').toLowerCase().trim();
  return map[key] ?? key.replace(/\s+/g, '_');
}

function numFromLocale(val) {
  if (val == null) return null;
  const cleaned = String(val).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

(async () => {
  const pg = getPg();
  await pg.connect();

  // 1) Create tables (idempotent)
  try {
    console.log('Preparing tables public.product_categories & public.products ...');
    await pg.query('begin');

    await pg.query(`
      create table if not exists public.product_categories (
        id bigserial primary key,
        tipo text not null,
        categoria text not null,
        tipo_key text generated always as (lower(coalesce(tipo, ''))) stored,
        categoria_key text generated always as (lower(coalesce(categoria, ''))) stored,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `);

    await pg.query(`
      alter table public.product_categories
        add column if not exists tipo text,
        add column if not exists categoria text,
        add column if not exists tipo_key text generated always as (lower(coalesce(tipo, ''))) stored,
        add column if not exists categoria_key text generated always as (lower(coalesce(categoria, ''))) stored,
        add column if not exists created_at timestamptz default now(),
        add column if not exists updated_at timestamptz default now();
    `);

    // Unique by normalized keys
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='product_categories_tipo_categoria_unique'
        ) then
          create unique index product_categories_tipo_categoria_unique on public.product_categories (tipo_key, categoria_key);
        end if;
      end $$;
    `);
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='product_categories_tipo_idx'
        ) then
          create index product_categories_tipo_idx on public.product_categories (tipo_key);
        end if;
      end $$;
    `);

    await pg.query(`
      create table if not exists public.products (
        id bigserial primary key,
        codigo text,
        nome text,
        preco_base numeric,
        preco_base_raw text,
        cod_categoria text,
        categoria text,
        tipo text,
        descricao text,
        iva numeric,
        category_id bigint references public.product_categories(id) on delete set null,
        is_active boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `);

    await pg.query(`
      alter table public.products
        add column if not exists codigo text,
        add column if not exists nome text,
        add column if not exists preco_base numeric,
        add column if not exists preco_base_raw text,
        add column if not exists cod_categoria text,
        add column if not exists categoria text,
        add column if not exists tipo text,
        add column if not exists descricao text,
        add column if not exists iva numeric,
        add column if not exists category_id bigint references public.product_categories(id) on delete set null,
        add column if not exists is_active boolean default true,
        add column if not exists created_at timestamptz default now(),
        add column if not exists updated_at timestamptz default now();
    `);

    // Indexes for products
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='products_codigo_unique'
        ) then
          create unique index products_codigo_unique on public.products (lower(codigo));
        end if;
      end $$;
    `);
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='products_tipo_idx'
        ) then
          create index products_tipo_idx on public.products (tipo);
        end if;
      end $$;
    `);
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='products_categoria_idx'
        ) then
          create index products_categoria_idx on public.products (categoria);
        end if;
      end $$;
    `);

    await pg.query('commit');
    console.log('Tables ready.');
  } catch (e) {
    await pg.query('rollback');
    console.error('Erro preparando tabelas:', e);
    process.exitCode = 1;
    await pg.end();
    return;
  }

  // 2) Import/backfill from CSV
  try {
    const csvPath = path.join(process.cwd(), 'src', 'products', 'produtos.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn('CSV não encontrado em', csvPath, '- importação pulada.');
      await pg.end();
      return;
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCSV(content);
    if (rows.length <= 1) {
      console.warn('CSV vazio - nada a importar.');
      await pg.end();
      return;
    }

    const headers = rows[0].map(normalizeHeader);
    const idx = (k) => headers.indexOf(k);
    const iCodigo = idx('codigo');
    const iNome = idx('nome');
    const iPrecoBase = idx('precoBase');
    const iCodCategoria = idx('codCategoria');
    const iCategoria = idx('categoria');
    const iTipo = idx('tipo');
    const iDescricao = idx('descricao');
    const iIva = idx('iva');

    let inserted = 0, updated = 0, skipped = 0;
    await pg.query('begin');

    const findOrCreateCategory = async (tipo, categoria) => {
      const tipoVal = (tipo || '').trim();
      const categoriaVal = (categoria || '').trim();
      const sel = await pg.query(
        `select id from public.product_categories where tipo_key = lower($1) and categoria_key = lower($2) limit 1`,
        [tipoVal, categoriaVal]
      );
      if (sel.rowCount) return sel.rows[0].id;
      const ins = await pg.query(
        `insert into public.product_categories (tipo, categoria) values ($1, $2) returning id`,
        [tipoVal, categoriaVal]
      );
      return ins.rows[0].id;
    };

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length || !row.some((c) => c && String(c).trim() !== '')) { skipped++; continue; }

      const codigo = (row[iCodigo] || '').trim();
      if (!codigo) { skipped++; continue; }
      const nome = (row[iNome] || '').trim();
      const precoBaseRaw = (row[iPrecoBase] || '').trim();
      const precoBase = numFromLocale(precoBaseRaw);
      const codCategoria = (row[iCodCategoria] || '').trim();
      const categoria = (row[iCategoria] || '').trim();
      const tipo = (row[iTipo] || '').trim();
      const descricao = (row[iDescricao] || '').trim();
      const iva = row[iIva] != null && String(row[iIva]).trim() !== '' ? numFromLocale(row[iIva]) : null;

      // Ensure category and get id
      let categoryId = null;
      try { categoryId = await findOrCreateCategory(tipo, categoria); } catch {}

      // Try update by case-insensitive codigo
      const upd = await pg.query(
        `update public.products set
            nome = $2,
            preco_base = $3,
            preco_base_raw = $4,
            cod_categoria = $5,
            categoria = $6,
            tipo = $7,
            descricao = $8,
            iva = $9,
            category_id = $10,
            updated_at = now(),
            is_active = true
         where lower(codigo) = lower($1)
         returning id`,
        [codigo, nome, precoBase, precoBaseRaw, codCategoria, categoria, tipo, descricao, iva, categoryId]
      );

      if (upd.rowCount > 0) { updated++; continue; }

      // Insert new
      const ins = await pg.query(
        `insert into public.products (
            codigo, nome, preco_base, preco_base_raw, cod_categoria, categoria, tipo, descricao, iva, category_id, is_active
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) returning id`,
        [codigo, nome, precoBase, precoBaseRaw, codCategoria, categoria, tipo, descricao, iva, categoryId]
      );
      if (ins.rowCount > 0) inserted++;
    }

    await pg.query('commit');
    console.log(`Importação concluída. Inseridos: ${inserted}, Atualizados: ${updated}, Ignorados: ${skipped}`);
  } catch (e) {
    await pg.query('rollback');
    console.error('Erro durante importação do CSV:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
