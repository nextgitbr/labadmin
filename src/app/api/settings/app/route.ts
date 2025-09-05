import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { logAppError } from '@/lib/logError';

// Fallbacks de conexão para Postgres em diferentes ambientes
const PG_URI =
  (process.env.PG_URI as string | undefined) ||
  (process.env.DATABASE_URL as string | undefined) ||
  (process.env.POSTGRES_URL as string | undefined) ||
  (process.env.POSTGRES_PRISMA_URL as string | undefined) ||
  (process.env.POSTGRES_URL_NON_POOLING as string | undefined);
const LOCALE_DEFAULT = process.env.APP_LOCALE_DEFAULT || 'pt-BR';

async function getPg() {
  if (!PG_URI) throw new Error('Sem conexão Postgres: defina PG_URI/DATABASE_URL/POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING');
  const needsSsl = /supabase\.(co|com)/.test(PG_URI) || /sslmode=require/i.test(PG_URI);
  const client = new Client({ connectionString: PG_URI, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  return client;
}

export async function GET() {
  let pg: any = null;
  try {
    pg = await getPg();

    // Detect linkage column for advantages/welcome tables
    const advColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_advantages'`);
    const advCols = new Set(advColsRes.rows.map((r: any) => r.column_name));
    const useKey = advCols.has('app_key');

    // detect optional columns
    const colsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app'`);
    const appCols = new Set(colsRes.rows.map((r: any) => r.column_name));
    const hasKanbanTextColor = appCols.has('kanban_text_color');
    const hasPromoEnabled = appCols.has('promo_enabled');
    const hasPromoTitle = appCols.has('promo_title');
    const hasPromoDescription = appCols.has('promo_description');
    const hasPromoCtaLabel = appCols.has('promo_cta_label');
    const hasPromoCtaUrl = appCols.has('promo_cta_url');

    // read settings_app (assume single app row)
    const selectOptional = [
      hasKanbanTextColor ? 'kanban_text_color' : null,
      hasPromoEnabled ? 'promo_enabled' : null,
      hasPromoTitle ? 'promo_title' : null,
      hasPromoDescription ? 'promo_description' : null,
      hasPromoCtaLabel ? 'promo_cta_label' : null,
      hasPromoCtaUrl ? 'promo_cta_url' : null,
    ].filter(Boolean).join(', ');

    const appRow = useKey
      ? (await pg.query(`select key as app_key, app_name, show_welcome, show_advantages, advantages_rotation_ms${selectOptional? ', ' + selectOptional : ''} from public.settings_app where key='app'`)).rows[0]
      : (await pg.query(`select id as app_id, app_name, show_welcome, show_advantages, advantages_rotation_ms${selectOptional? ', ' + selectOptional : ''} from public.settings_app order by id asc limit 1`)).rows[0];

    const appName = appRow?.app_name ?? 'LabAdmin';
    const showWelcome = appRow?.show_welcome ?? true;
    const showAdvantages = appRow?.show_advantages ?? true;
    const advantagesRotationMs = appRow?.advantages_rotation_ms ?? 8000;

    // welcome message by locale with fallback to any
    const welcomeRes = useKey
      ? await pg.query(`select message from public.settings_welcome_messages where app_key='app' and locale=$1 limit 1`, [LOCALE_DEFAULT])
      : await pg.query(`select message from public.settings_welcome_messages where app_id=$1 and locale=$2 limit 1`, [appRow?.app_id, LOCALE_DEFAULT]);
    let welcomeMessage: string | null = welcomeRes.rows[0]?.message ?? null;
    if (!welcomeMessage) {
      const fallback = useKey
        ? await pg.query(`select message from public.settings_welcome_messages where app_key='app' order by created_at asc limit 1`)
        : await pg.query(`select message from public.settings_welcome_messages where app_id=$1 order by created_at asc limit 1`, [appRow?.app_id]);
      welcomeMessage = fallback.rows[0]?.message ?? 'Estamos prontos para impulsionar sua experiência com uma gestão simplificada, eficiente e elegante. Explore, gerencie e transforme seus projetos com facilidade! 🚀';
    }

    // advantages ordered
    const advRes = useKey
      ? await pg.query(`select position, destaque, complemento, active from public.settings_advantages where app_key='app' order by position asc`)
      : await pg.query(`select position, destaque, complemento, active from public.settings_advantages where app_id=$1 order by position asc`, [appRow?.app_id]);
    const advantages = advRes.rows?.length
      ? advRes.rows.map((r: any) => ({ destaque: r.destaque as string, complemento: r.complemento as string, active: r.active as boolean }))
      : [
          { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!', active: true },
          { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.', active: true },
        ];

    const kanbanTextColor = hasKanbanTextColor ? (appRow?.kanban_text_color ?? null) : null;
    const promoEnabled = hasPromoEnabled ? (appRow?.promo_enabled ?? true) : true;
    const promoTitle = hasPromoTitle ? (appRow?.promo_title ?? 'Lab Admin - Painel Administrativo') : 'Lab Admin - Painel Administrativo';
    const promoDescription = hasPromoDescription ? (appRow?.promo_description ?? 'Painel administrativo moderno, personalizável e completo para laboratórios.') : 'Painel administrativo moderno, personalizável e completo para laboratórios.';
    const promoCtaLabel = hasPromoCtaLabel ? (appRow?.promo_cta_label ?? 'Upgrade To Pro') : 'Upgrade To Pro';
    const promoCtaUrl = hasPromoCtaUrl ? (appRow?.promo_cta_url ?? 'https://tailadmin.com/pricing') : 'https://tailadmin.com/pricing';
    return NextResponse.json({ appName, showWelcome, welcomeMessage, showAdvantages, advantagesRotationMs, advantages, kanbanTextColor, promoEnabled, promoTitle, promoDescription, promoCtaLabel, promoCtaUrl });
  } catch (e) {
    console.error('Erro ao obter configurações do app (Supabase):', e);
    await logAppError('settings/app GET failed', 'error', { message: (e as any)?.message });
    return NextResponse.json({
      appName: 'LabAdmin',
      showWelcome: true,
      welcomeMessage: 'Estamos prontos para impulsionar sua experiência com uma gestão simplificada, eficiente e elegante. Explore, gerencie e transforme seus projetos com facilidade! 🚀',
      showAdvantages: true,
      advantagesRotationMs: 8000,
      advantages: [
        { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!', active: true },
        { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.', active: true },
      ],
      kanbanTextColor: '#e5e7eb',
    }, { status: 200 });
  } finally {
    if (pg) await pg.end();
  }
}

export async function PUT(req: NextRequest) {
  let pg: any = null;
  try {
    const body = await req.json();
    const toUpd: any = {};
    if (typeof body.appName === 'string') {
      const trimmed = body.appName.trim();
      if (trimmed.length === 0) return NextResponse.json({ message: 'appName inválido' }, { status: 400 });
      toUpd.app_name = trimmed;
    }
    if (typeof body.showWelcome === 'boolean') toUpd.show_welcome = body.showWelcome;
    if (typeof body.showAdvantages === 'boolean') toUpd.show_advantages = body.showAdvantages;
    if (typeof body.advantagesRotationMs === 'number' && isFinite(body.advantagesRotationMs)) {
      toUpd.advantages_rotation_ms = Math.max(2000, Math.min(60000, Math.floor(body.advantagesRotationMs)));
    }

    const advantages = Array.isArray(body.advantages)
      ? body.advantages
          .filter((it: any) => it && typeof it.destaque === 'string' && typeof it.complemento === 'string')
          .map((it: any) => ({ destaque: String(it.destaque), complemento: String(it.complemento), active: typeof it.active === 'boolean' ? it.active : true }))
      : null;

    const welcomeMessage = typeof body.welcomeMessage === 'string' ? body.welcomeMessage : null;

    // optional kanban_text_color
    const bodyKanbanTextColor: string | null = typeof body.kanbanTextColor === 'string' && body.kanbanTextColor ? String(body.kanbanTextColor) : null;

    const hasPromoFields = typeof body.promoEnabled === 'boolean' || typeof body.promoTitle === 'string' || typeof body.promoDescription === 'string' || typeof body.promoCtaLabel === 'string' || typeof body.promoCtaUrl === 'string';
    if (Object.keys(toUpd).length === 0 && !advantages && typeof welcomeMessage !== 'string' && bodyKanbanTextColor === null && !hasPromoFields) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 });
    }

    pg = await getPg();

    // Detect linkage column for advantages/welcome tables
    const advColsRes = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_advantages'`);
    const advCols = new Set(advColsRes.rows.map((r: { column_name: string }) => r.column_name));
    const useKey = advCols.has('app_key');

    // Resolve app identifier
    const appIdent = useKey
      ? { where: "key='app'", idCol: 'app_key', idVal: 'app' }
      : (() => { return { where: 'true', idCol: 'app_id' as const, idVal: null as number | null } })();

    let appId: number | null = null;
    if (!useKey) {
      const r = await pg.query(`select id from public.settings_app order by id asc limit 1`);
      if (r.rowCount === 0) return NextResponse.json({ message: 'settings_app não encontrado' }, { status: 500 });
      appId = r.rows[0].id as number;
    }

    await pg.query('begin');

    // Update settings_app
    if (Object.keys(toUpd).length) {
      if (useKey) {
        await pg.query(
          `update public.settings_app set 
             app_name = coalesce($1, app_name),
             show_welcome = coalesce($2, show_welcome),
             show_advantages = coalesce($3, show_advantages),
             advantages_rotation_ms = coalesce($4, advantages_rotation_ms),
             updated_at = now()
           where key='app'`,
          [toUpd.app_name ?? null, toUpd.show_welcome ?? null, toUpd.show_advantages ?? null, toUpd.advantages_rotation_ms ?? null]
        );
      } else {
        await pg.query(
          `update public.settings_app set 
             app_name = coalesce($1, app_name),
             show_welcome = coalesce($2, show_welcome),
             show_advantages = coalesce($3, show_advantages),
             advantages_rotation_ms = coalesce($4, advantages_rotation_ms),
             updated_at = now()
           where id=$5`,
          [toUpd.app_name ?? null, toUpd.show_welcome ?? null, toUpd.show_advantages ?? null, toUpd.advantages_rotation_ms ?? null, appId]
        );
      }
    }

    // Update optional kanban_text_color if column exists and value provided
    if (bodyKanbanTextColor !== null) {
      const cols = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app'`);
      const hasK = cols.rows.some((r: any) => r.column_name === 'kanban_text_color');
      if (hasK) {
        if (useKey) {
          await pg.query(`update public.settings_app set kanban_text_color=$1, updated_at=now() where key='app'`, [bodyKanbanTextColor]);
        } else {
          await pg.query(`update public.settings_app set kanban_text_color=$1, updated_at=now() where id=$2`, [bodyKanbanTextColor, appId]);
        }
      }
    }

    // Update optional promo fields if columns exist
    if (hasPromoFields) {
      const cols = await pg.query(`select column_name from information_schema.columns where table_schema='public' and table_name='settings_app'`);
      const colSet = new Set(cols.rows.map((r: any) => r.column_name));
      const updates: string[] = [];
      const params: any[] = [];
      const pushUpd = (col: string, val: any) => { updates.push(`${col} = $${params.length + 1}`); params.push(val); };

      if (typeof body.promoEnabled === 'boolean' && colSet.has('promo_enabled')) pushUpd('promo_enabled', body.promoEnabled);
      if (typeof body.promoTitle === 'string' && colSet.has('promo_title')) pushUpd('promo_title', body.promoTitle);
      if (typeof body.promoDescription === 'string' && colSet.has('promo_description')) pushUpd('promo_description', body.promoDescription);
      if (typeof body.promoCtaLabel === 'string' && colSet.has('promo_cta_label')) pushUpd('promo_cta_label', body.promoCtaLabel);
      if (typeof body.promoCtaUrl === 'string' && colSet.has('promo_cta_url')) pushUpd('promo_cta_url', body.promoCtaUrl);

      if (updates.length) {
        const sql = `update public.settings_app set ${updates.join(', ')}, updated_at=now() ${useKey ? `where key='app'` : `where id=$${params.length + 1}`}`;
        if (useKey) {
          await pg.query(sql, params);
        } else {
          await pg.query(sql, [...params, appId]);
        }
      }
    }

    // Upsert welcome message for locale
    if (typeof welcomeMessage === 'string') {
      if (useKey) {
        await pg.query(
          `insert into public.settings_welcome_messages (app_key, locale, message)
           values ('app',$1,$2)
           on conflict (app_key, locale) do update set message=excluded.message, updated_at=now()`,
          [LOCALE_DEFAULT, welcomeMessage]
        );
      } else {
        await pg.query(
          `insert into public.settings_welcome_messages (app_id, locale, message)
           values ($1,$2,$3)
           on conflict (app_id, locale) do update set message=excluded.message, updated_at=now()`,
          [appId, LOCALE_DEFAULT, welcomeMessage]
        );
      }
    }

    // Replace advantages list if provided
    if (advantages) {
      for (let i = 0; i < advantages.length; i++) {
        const a = advantages[i];
        const position = i + 1;
        if (useKey) {
          await pg.query(
            `insert into public.settings_advantages (app_key, position, destaque, complemento, active)
             values ('app',$1,$2,$3,$4)
             on conflict (app_key, position)
             do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
            [position, a.destaque, a.complemento, a.active]
          );
        } else {
          await pg.query(
            `insert into public.settings_advantages (app_id, position, destaque, complemento, active)
             values ($1,$2,$3,$4,$5)
             on conflict (app_id, position)
             do update set destaque=excluded.destaque, complemento=excluded.complemento, active=excluded.active, updated_at=now()`,
            [appId, position, a.destaque, a.complemento, a.active]
          );
        }
      }
      // Delete extras
      if (useKey) {
        await pg.query(`delete from public.settings_advantages where app_key='app' and position > $1`, [advantages.length]);
      } else {
        await pg.query(`delete from public.settings_advantages where app_id=$1 and position > $2`, [appId, advantages.length]);
      }
    }

    await pg.query('commit');
    return NextResponse.json({ message: 'ok' }, { status: 200 });
  } catch (e) {
    if (pg) await pg.query('rollback').catch(() => {});
    console.error('Erro ao salvar configurações do app (Supabase):', e);
    await logAppError('settings/app PUT failed', 'error', { message: (e as any)?.message });
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  } finally {
    if (pg) await pg.end();
  }
}
