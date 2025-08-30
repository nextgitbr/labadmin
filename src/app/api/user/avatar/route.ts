import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Pool } from 'pg';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const userId = Number(form.get('userId'));

    if (!userId || !Number.isFinite(userId)) {
      return NextResponse.json({ success: false, message: 'userId inválido' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ success: false, message: 'Arquivo (file) é obrigatório' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, message: 'Arquivo excede 5MB' }, { status: 400 });
    }

    const contentType = file.type || 'application/octet-stream';
    const ext = (() => {
      const fromName = file.name?.split('.').pop()?.toLowerCase();
      if (fromName) return fromName;
      if (contentType.includes('png')) return 'png';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
      if (contentType.includes('webp')) return 'webp';
      return 'bin';
    })();

    const supabase = requireSupabaseAdmin();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const now = Date.now();
    const path = `avatars/${userId}-${now}.${ext}`;

    // Upload (public bucket recomendado); usar upsert para substituir versões antigas
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Erro upload Supabase:', uploadError);
      return NextResponse.json({ success: false, message: 'Falha no upload' }, { status: 500 });
    }

    // URL pública
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // Atualizar coluna avatar
    const { rows } = await pool.query(
      `update public.users set avatar = $1, updated_at = $2 where id = $3 returning *`,
      [publicUrl, new Date().toISOString(), userId]
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, avatarUrl: publicUrl });
  } catch (err) {
    console.error('Erro no upload de avatar:', err);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}
