import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/supabaseAdmin';
import { logAppError } from '@/lib/logError';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Erro ao listar buckets:', error);
      await logAppError('upload GET buckets failed', 'error', { message: String(error?.message || error) });
      return NextResponse.json({ error: 'Falha ao listar buckets', details: String(error.message || error) }, { status: 500 });
    }
    return NextResponse.json({ buckets: data });
  } catch (e: any) {
    await logAppError('upload GET failed', 'error', { message: String(e?.message || e) });
    return NextResponse.json({ error: 'Supabase não configurado', details: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = requireSupabaseAdmin();

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
    // 0) Garantir bucket existente e público
    try {
      const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
      if (listErr) {
        console.warn('Não foi possível listar buckets (prosseguindo com tentativa de upload):', listErr);
      } else {
        const found = (buckets || []).find((b: any) => b.name === bucket);
        if (!found) {
          const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true });
          if (createErr) console.warn('Falha ao criar bucket automaticamente:', createErr);
        } else if (found && found.public !== true) {
          try {
            // Tornar público se possível
            // @ts-ignore - updateBucket disponível em supabase-js ^2
            const { error: updErr } = await supabase.storage.updateBucket(bucket, { public: true });
            if (updErr) console.warn('Falha ao tornar bucket público:', updErr);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Aviso: não foi possível validar/criar bucket antes do upload:', e);
    }

    const form = await req.formData();

    const rawOrderId = String(form.get('orderId') || 'general');
    const orderId = rawOrderId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const userId = String(form.get('userId') || 'anonymous');
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Arquivo (file) é obrigatório' }, { status: 400 });
    }

    const blob = file as File;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = blob.type || 'application/octet-stream';
    const ext = (blob.name && blob.name.includes('.')) ? blob.name.split('.').pop() : '';
    const baseName = (blob.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ts = Date.now();
    // Formato de pasta: uploads/orders/YYYYMM/ORDER_ID/ORDER_ID-nome.ext
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const yyyymm = `${y}${m}`;

    const folderPrefix = `orders/${yyyymm}`;
    const finalFileName = orderId && orderId !== 'general' ? `${orderId}-${baseName}` : `${ts}-${baseName}`;
    const orderFolder = orderId && orderId !== 'general' ? `${orderId}` : 'general';
    const path = `${folderPrefix}/${orderFolder}/${finalFileName}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: false });

    if (upErr) {
      console.error('Upload Supabase falhou:', upErr);
      await logAppError('upload POST failed', 'error', { message: String(upErr?.message || upErr) });
      return NextResponse.json({ error: 'Falha no upload' }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const payload = {
      bucket,
      path,
      url: publicUrl,
      name: blob.name,
      size: blob.size,
      type: contentType,
      uploadedAt: new Date().toISOString(),
      orderId,
      userId,
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (e) {
    console.error('Erro no upload:', e);
    await logAppError('upload POST failed', 'error', { message: String(e) });
    return NextResponse.json({ error: 'Erro interno no upload' }, { status: 500 });
  }
}
