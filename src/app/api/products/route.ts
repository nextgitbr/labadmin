import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import '@/lib/sslFix';
import { requireAuth } from '@/lib/apiAuth';
import { logAppError } from '@/lib/logError';

// Small CSV parser that supports quoted fields and commas within quotes
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote
        field += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }

    } else if (ch === ',' && !inQuotes) {
      cur.push(field.trim());
      field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (field.length > 0 || cur.length > 0) {
        cur.push(field.trim());
        rows.push(cur);
        cur = [];
        field = '';
      }
      // handle \r\n by skipping next if needed
      if (ch === '\r' && next === '\n') i++;
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field.trim());
    rows.push(cur);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
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
  const key = h.toLowerCase().trim();
  return map[key] ?? key.replace(/\s+/g, '_');
}

// Postgres pool with SSL fallback (same pattern as orders route)
const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN || '') || /sslmode=require/i.test(PG_CONN || '')
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function GET() {
  try {
    // First, try fetching from Postgres
    const { rows } = await pool.query(`
      select
        codigo,
        nome,
        preco_base as "precoBaseNumber",
        preco_base_raw as "precoBase",
        cod_categoria as "codCategoria",
        categoria,
        tipo,
        descricao,
        iva
      from public.products
      where coalesce(is_active, true) = true
      order by tipo nulls last, categoria nulls last, nome nulls last
    `);

    const data = rows.map((r: any) => ({
      codigo: r.codigo ?? '',
      nome: r.nome ?? '',
      precoBase: r.precoBase ?? null,
      precoBaseNumber: typeof r.precoBaseNumber === 'number' ? r.precoBaseNumber : (r.precoBaseNumber != null ? Number(r.precoBaseNumber) : undefined),
      codCategoria: r.codCategoria ?? '',
      categoria: r.categoria ?? '',
      tipo: r.tipo ?? '',
      descricao: r.descricao ?? '',
      iva: typeof r.iva === 'number' ? r.iva : (r.iva != null ? Number(r.iva) : undefined),
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    // Fallback to CSV when DB fails
    try {
      const csvPath = path.join(process.cwd(), 'src', 'products', 'produtos.csv');
      const buf = await fs.readFile(csvPath);
      const content = buf.toString('utf8');
      const rows = parseCSV(content);
      if (rows.length === 0) return NextResponse.json([]);

      const headers = rows[0].map(normalizeHeader);
      const data = rows
        .slice(1)
        .filter((r) => r.length && r.some((cell) => cell && cell.trim() !== ''))
        .map((r) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            obj[h] = r[idx]?.replace(/^"|"$/g, '') ?? '';
          });
          const raw = obj['precoBase'] as string | undefined;
          if (raw) {
            const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
            const num = Number.parseFloat(cleaned);
            if (!Number.isNaN(num)) obj['precoBaseNumber'] = num;
          }
          if (obj['iva'] !== undefined) {
            const ivaNum = Number.parseFloat(String(obj['iva']).replace(',', '.'));
            if (!Number.isNaN(ivaNum)) obj['iva'] = ivaNum;
          }
          return obj;
        });

      return NextResponse.json(data, { status: 200 });
    } catch (fallbackErr: any) {
      await logAppError('products GET failed', 'error', { message: String(err?.message ?? err), fallback: String(fallbackErr?.message ?? fallbackErr) });
      return NextResponse.json(
        { error: 'Falha ao ler produtos', details: String(err?.message ?? err), fallback: String(fallbackErr?.message ?? fallbackErr) },
        { status: 500 }
      );
    }
  }
}

// Helper: check permission for products settings
function ensureProductsPermission(user: any) {
  const perms = user?.permissions || {};
  const hasSpecific = perms.configuracoesProdutos === true;
  const role = (user?.role || '').toLowerCase();
  const roleAllowed = role === 'administrator' || role === 'manager';
  if (!hasSpecific && !roleAllowed) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}

// Create product
export async function POST(req: NextRequest) {
  try {
    try {
      const user = await requireAuth(req);
      ensureProductsPermission(user);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 });
    }

    const body = await req.json();
    const {
      codigo,
      nome,
      tipo,
      categoria,
      codCategoria,
      precoBase,
      precoBaseNumber,
      descricao,
      iva,
      categoryId,
      isActive,
    } = body || {};

    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const values: any[] = [];
    const cols: string[] = [];
    function add(col: string, val: any) {
      if (val !== undefined) {
        values.push(val);
        cols.push(`${col}`);
      }
    }

    add('codigo', codigo);
    add('nome', nome);
    add('tipo', tipo);
    add('categoria', categoria);
    add('cod_categoria', codCategoria);
    add('preco_base_raw', precoBase);
    add('preco_base', typeof precoBaseNumber === 'number' ? precoBaseNumber : (precoBaseNumber != null ? Number(precoBaseNumber) : undefined));
    add('descricao', descricao);
    add('iva', typeof iva === 'number' ? iva : (iva != null ? Number(iva) : undefined));
    add('category_id', categoryId);
    add('is_active', typeof isActive === 'boolean' ? isActive : undefined);

    if (cols.length === 0) return NextResponse.json({ error: 'Nada para inserir' }, { status: 400 });

    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const sql = `insert into public.products (${cols.join(',')}) values (${placeholders}) returning codigo, nome, tipo, categoria, cod_categoria as "codCategoria", preco_base as "precoBaseNumber", preco_base_raw as "precoBase", descricao, iva`;
    const { rows } = await pool.query(sql, values);
    return NextResponse.json(rows[0] ?? {}, { status: 201 });
  } catch (err: any) {
    await logAppError('products POST failed', 'error', { message: String(err?.message ?? err) });
    return NextResponse.json({ error: 'Erro ao criar produto', details: String(err?.message ?? err) }, { status: err?.status || 500 });
  }
}

// Update product by codigo (or id if exists)
export async function PATCH(req: NextRequest) {
  try {
    try {
      const user = await requireAuth(req);
      ensureProductsPermission(user);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 });
    }

    const body = await req.json();
    const { codigo, id, ...updates } = body || {};
    const target = id ? { by: 'id', val: id } : (codigo ? { by: 'codigo', val: codigo } : null);
    if (!target) return NextResponse.json({ error: 'Informe id ou codigo do produto' }, { status: 400 });

    const sets: string[] = [];
    const values: any[] = [];
    function addSet(col: string, val: any) {
      if (val !== undefined) {
        values.push(val);
        sets.push(`${col}=$${values.length}`);
      }
    }

    addSet('nome', updates.nome);
    addSet('tipo', updates.tipo);
    addSet('categoria', updates.categoria);
    addSet('cod_categoria', updates.codCategoria);
    addSet('preco_base_raw', updates.precoBase);
    addSet('preco_base', typeof updates.precoBaseNumber === 'number' ? updates.precoBaseNumber : (updates.precoBaseNumber != null ? Number(updates.precoBaseNumber) : undefined));
    addSet('descricao', updates.descricao);
    addSet('iva', typeof updates.iva === 'number' ? updates.iva : (updates.iva != null ? Number(updates.iva) : undefined));
    addSet('category_id', updates.categoryId);
    if (typeof updates.isActive === 'boolean') addSet('is_active', updates.isActive);

    if (sets.length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });

    values.push(target.val);
    const sql = `update public.products set ${sets.join(', ')}, updated_at=now() where ${target.by}=$${values.length} returning codigo, nome, tipo, categoria, cod_categoria as "codCategoria", preco_base as "precoBaseNumber", preco_base_raw as "precoBase", descricao, iva`;
    const res = await pool.query(sql, values);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    await logAppError('products PATCH failed', 'error', { message: String(err?.message ?? err) });
    return NextResponse.json({ error: 'Erro ao atualizar produto', details: String(err?.message ?? err) }, { status: err?.status || 500 });
  }
}

// Delete product by codigo or id
export async function DELETE(req: NextRequest) {
  try {
    try {
      const user = await requireAuth(req);
      ensureProductsPermission(user);
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e?.status || 401 });
    }
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    const codigo = searchParams.get('codigo');
    if (!id && !codigo) return NextResponse.json({ error: 'Informe id ou codigo' }, { status: 400 });

    const by = id ? 'id' : 'codigo';
    const val = id ?? codigo!;
    const res = await pool.query(`delete from public.products where ${by}=$1`, [val]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    return NextResponse.json({ message: 'Produto removido com sucesso' });
  } catch (err: any) {
    await logAppError('products DELETE failed', 'error', { message: String(err?.message ?? err) });
    return NextResponse.json({ error: 'Erro ao remover produto', details: String(err?.message ?? err) }, { status: err?.status || 500 });
  }
}
