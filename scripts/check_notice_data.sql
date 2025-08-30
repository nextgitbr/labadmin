-- Verifica se há dados na tabela notice_settings
SELECT COUNT(*) AS total_registros FROM public.notice_settings;

-- Verifica os primeiros registros (se houver)
SELECT 
    id,
    app_key,
    app_id,
    enabled,
    title,
    description,
    cta_label,
    cta_url,
    bg_color,
    text_color,
    border_color,
    cta_bg_color,
    cta_text_color,
    title_font_family,
    body_font_family,
    expires_at,
    created_at,
    updated_at
FROM 
    public.notice_settings 
LIMIT 5;
