import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import '@/lib/sslFix';

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
      return NextResponse.json(
        { error: 'Falha ao ler produtos', details: String(err?.message ?? err), fallback: String(fallbackErr?.message ?? fallbackErr) },
        { status: 500 }
      );
    }
  }
}
