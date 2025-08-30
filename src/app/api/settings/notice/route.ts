import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import '@/lib/sslFix'; // Aplicar correção SSL global

// Aceitar múltiplos nomes de variável de conexão para ambientes diferentes
const PG_URI =
  (process.env.PG_URI as string | undefined)
  || (process.env.DATABASE_URL as string | undefined)
  || (process.env.POSTGRES_URL as string | undefined)
  || (process.env.POSTGRES_PRISMA_URL as string | undefined)
  || (process.env.POSTGRES_URL_NON_POOLING as string | undefined);

async function getPg() {
  if (!PG_URI) throw new Error('Sem conexão Postgres: defina PG_URI/DATABASE_URL/POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING');
  const needsSsl = /supabase\.(co|com)/.test(PG_URI) || /sslmode=require/i.test(PG_URI);
  const client = new Client({ connectionString: PG_URI, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  return client;
}

function defaultNotice() {
  return {
    enabled: true,
    title: 'Lab Admin - Admin Panel',
    description: 'Modern, customizable and complete admin panel for labs.',
    ctaLabel: 'Upgrade To Pro',
    ctaUrl: 'https://tailadmin.com/pricing',
    // style defaults (nullable => frontend can fall back)
    bgColor: null as string | null,
    textColor: null as string | null,
    borderColor: null as string | null,
    ctaBgColor: null as string | null,
    ctaTextColor: null as string | null,
    titleFontFamily: null as string | null,
    bodyFontFamily: null as string | null,
  };
}

export async function GET() {
  let pg: any = null;
  try {
    pg = await getPg();

    // detect settings_app key vs id
    const appColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app'`);
    const appCols = new Set(appColsRes.rows.map((r: any) => r.column_name));
    const useKey = appCols.has('key');

    // ensure notice_settings exists (optional safety)
    const noticeColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='notice_settings'`);
    const noticeCols = new Set(noticeColsRes.rows.map((r: any) => r.column_name));
    const hasNotice = noticeColsRes.rowCount > 0;
    const hasExpires = noticeCols.has('expires_at');
    if (!hasNotice) {
      // return defaults if table not prepared yet
      return NextResponse.json(defaultNotice(), { status: 200 });
    }

    let row: any;
    if (useKey) {
      const selectCols = `enabled, title, description, cta_label, cta_url,
               bg_color, text_color, border_color, cta_bg_color, cta_text_color,
               title_font_family, body_font_family${hasExpires ? ', expires_at' : ''}`;
      row = (await pg.query(`
        select ${selectCols}
        from public.notice_settings
        where app_key='app'
        limit 1
      `)).rows[0];
    } else {
      const base = await pg.query(`select id from public.settings_app order by id asc limit 1`);
      const appId = base.rows[0]?.id;
      if (!appId) return NextResponse.json(defaultNotice(), { status: 200 });
      const selectCols = `enabled, title, description, cta_label, cta_url,
               bg_color, text_color, border_color, cta_bg_color, cta_text_color,
               title_font_family, body_font_family${hasExpires ? ', expires_at' : ''}`;
      row = (await pg.query(`
        select ${selectCols}
        from public.notice_settings
        where app_id=$1
        limit 1
      `, [appId])).rows[0];
    }

    const d = defaultNotice();
    const expiresAt: string | null = hasExpires && row?.expires_at ? new Date(row.expires_at).toISOString() : null;
    const isActive = (typeof row?.enabled === 'boolean' ? row.enabled : d.enabled) && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
    return NextResponse.json({
      enabled: typeof row?.enabled === 'boolean' ? row.enabled : d.enabled,
      title: row?.title ?? d.title,
      description: row?.description ?? d.description,
      ctaLabel: row?.cta_label ?? d.ctaLabel,
      ctaUrl: row?.cta_url ?? d.ctaUrl,
      bgColor: row?.bg_color ?? d.bgColor,
      textColor: row?.text_color ?? d.textColor,
      borderColor: row?.border_color ?? d.borderColor,
      ctaBgColor: row?.cta_bg_color ?? d.ctaBgColor,
      ctaTextColor: row?.cta_text_color ?? d.ctaTextColor,
      titleFontFamily: row?.title_font_family ?? d.titleFontFamily,
      bodyFontFamily: row?.body_font_family ?? d.bodyFontFamily,
      expiresAt,
      isActive,
    }, { status: 200 });
  } catch (e) {
    console.error('Error on GET /api/settings/notice:', e);
    return NextResponse.json(defaultNotice(), { status: 200 });
  } finally {
    if (pg) await pg.end();
  }
}

export async function PUT(req: NextRequest) {
  let pg: any = null;
  try {
    const body = await req.json();

    const enabled: boolean | null = typeof body.enabled === 'boolean' ? body.enabled : null;
    const title: string | null = typeof body.title === 'string' ? body.title : null;
    const description: string | null = typeof body.description === 'string' ? body.description : null;
    const ctaLabel: string | null = typeof body.ctaLabel === 'string' ? body.ctaLabel : null;
    const ctaUrl: string | null = typeof body.ctaUrl === 'string' ? body.ctaUrl : null;

    const bgColor: string | null = typeof body.bgColor === 'string' ? body.bgColor : null;
    const textColor: string | null = typeof body.textColor === 'string' ? body.textColor : null;
    const borderColor: string | null = typeof body.borderColor === 'string' ? body.borderColor : null;
    const ctaBgColor: string | null = typeof body.ctaBgColor === 'string' ? body.ctaBgColor : null;
    const ctaTextColor: string | null = typeof body.ctaTextColor === 'string' ? body.ctaTextColor : null;
    const titleFontFamily: string | null = typeof body.titleFontFamily === 'string' ? body.titleFontFamily : null;
    const bodyFontFamily: string | null = typeof body.bodyFontFamily === 'string' ? body.bodyFontFamily : null;

    // ExpiresAt only if column exists
    let expiresAt: string | null = null;
    try {
      const noticeColsRes2 = await (pg || await getPg()).query(`select column_name from information_schema.columns where table_schema='public' and table_name='notice_settings'`);
      const noticeCols2 = new Set(noticeColsRes2.rows.map((r: any) => r.column_name));
      if (noticeCols2.has('expires_at')) {
        expiresAt = typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : (body.expiresAt === null ? null : null);
      }
    } catch {}

    if (
      enabled === null && title === null && description === null && ctaLabel === null && ctaUrl === null &&
      bgColor === null && textColor === null && borderColor === null && ctaBgColor === null && ctaTextColor === null &&
      titleFontFamily === null && bodyFontFamily === null && expiresAt === null
    ) {
      return NextResponse.json({ message: 'Nothing to update' }, { status: 400 });
    }

    pg = await getPg();

    // ensure table exists to avoid 500s
    const tblRes = await pg.query(`select 1 from information_schema.tables where table_schema='public' and table_name='notice_settings'`);
    if (tblRes.rowCount === 0) {
      return NextResponse.json({ message: 'notice_settings table not found. Run migration.' }, { status: 400 });
    }

    const appColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app'`);
    const appCols = new Set(appColsRes.rows.map((r: any) => r.column_name));
    const useKey = appCols.has('key');

    const ensureRow = async () => {
      if (useKey) {
        await pg!.query(`
          insert into public.notice_settings (app_key)
          values ('app')
          on conflict (app_key) do nothing
        `);
      } else {
        const base = await pg!.query(`select id from public.settings_app order by id asc limit 1`);
        const appId = base.rows[0]?.id;
        if (!appId) throw new Error('settings_app base row not found');
        await pg!.query(`
          insert into public.notice_settings (app_id)
          values ($1)
          on conflict (app_id) do nothing
        `, [appId]);
      }
    };

    await ensureRow();

    const updates: string[] = [];
    const params: any[] = [];
    const push = (col: string, val: any) => { updates.push(`${col} = $${params.length + 1}`); params.push(val); };

    if (enabled !== null) push('enabled', enabled);
    if (title !== null) push('title', title);
    if (description !== null) push('description', description);
    if (ctaLabel !== null) push('cta_label', ctaLabel);
    if (ctaUrl !== null) push('cta_url', ctaUrl);
    if (bgColor !== null) push('bg_color', bgColor);
    if (textColor !== null) push('text_color', textColor);
    if (borderColor !== null) push('border_color', borderColor);
    if (ctaBgColor !== null) push('cta_bg_color', ctaBgColor);
    if (ctaTextColor !== null) push('cta_text_color', ctaTextColor);
    if (titleFontFamily !== null) push('title_font_family', titleFontFamily);
    if (bodyFontFamily !== null) push('body_font_family', bodyFontFamily);
    if (typeof body.expiresAt !== 'undefined' && expiresAt !== undefined) push('expires_at', expiresAt);

    if (!updates.length) return NextResponse.json({ message: 'Nothing to update' }, { status: 400 });

    const where = useKey ? `where app_key='app'` : `where app_id = $${params.length + 1}`;

    if (useKey) {
      await pg.query(`update public.notice_settings set ${updates.join(', ')}, updated_at=now() ${where}`, params);
    } else {
      const base = await pg.query(`select id from public.settings_app order by id asc limit 1`);
      const appId = base.rows[0]?.id;
      if (!appId) throw new Error('settings_app base row not found');
      await pg.query(`update public.notice_settings set ${updates.join(', ')}, updated_at=now() ${where}`, [...params, appId]);
    }

    return NextResponse.json({ message: 'ok' }, { status: 200 });
  } catch (e) {
    console.error('Error on PUT /api/settings/notice:', e);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  } finally {
    if (pg) await pg.end();
  }
}
