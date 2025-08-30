-- Inserir um registro de exemplo na tabela notice_settings
-- Primeiro, verifica se a tabela settings_app existe e tem registros
DO $$
DECLARE
    app_id_val bigint;
    app_key_val text := 'app';
    has_key_column boolean;
    has_id_column boolean;
BEGIN
    -- Verifica se a tabela settings_app existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings_app') THEN
        -- Verifica se a tabela tem a coluna 'key' ou 'id'
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'settings_app' 
            AND column_name = 'key'
        ) INTO has_key_column;
        
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'settings_app' 
            AND column_name = 'id'
        ) INTO has_id_column;
        
        -- Se não houver registros em settings_app, insere um
        IF has_key_column THEN
            IF NOT EXISTS (SELECT 1 FROM public.settings_app WHERE key = app_key_val) THEN
                INSERT INTO public.settings_app (key, created_at, updated_at) 
                VALUES (app_key_val, NOW(), NOW());
            END IF;
            
            -- Insere ou atualiza o registro em notice_settings
            INSERT INTO public.notice_settings (
                app_key, enabled, title, description, cta_label, cta_url,
                bg_color, text_color, border_color, cta_bg_color, cta_text_color,
                title_font_family, body_font_family, expires_at, created_at, updated_at
            ) VALUES (
                app_key_val, 
                true, 
                'Aviso Importante', 
                'Esta é uma mensagem de aviso de exemplo.', 
                'Saiba Mais', 
                'https://exemplo.com',
                '#f8fafc',  -- bg_color
                '#1e293b',  -- text_color
                '#e2e8f0',  -- border_color
                '#3b82f6',  -- cta_bg_color
                '#ffffff',  -- cta_text_color
                'Inter, sans-serif',  -- title_font_family
                'Inter, sans-serif',  -- body_font_family
                NOW() + INTERVAL '30 days',  -- expires_at
                NOW(),
                NOW()
            ) ON CONFLICT (app_key) DO UPDATE SET
                enabled = EXCLUDED.enabled,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                cta_label = EXCLUDED.cta_label,
                cta_url = EXCLUDED.cta_url,
                bg_color = EXCLUDED.bg_color,
                text_color = EXCLUDED.text_color,
                border_color = EXCLUDED.border_color,
                cta_bg_color = EXCLUDED.cta_bg_color,
                cta_text_color = EXCLUDED.cta_text_color,
                title_font_family = EXCLUDED.title_font_family,
                body_font_family = EXCLUDED.body_font_family,
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW();
                
            RAISE NOTICE 'Registro de exemplo inserido/atualizado na tabela notice_settings com app_key = %', app_key_val;
            
        ELSIF has_id_column THEN
            -- Se estiver usando app_id, obtém o primeiro ID disponível
            SELECT id INTO app_id_val FROM public.settings_app ORDER BY id LIMIT 1;
            
            IF app_id_val IS NULL THEN
                -- Se não houver registros em settings_app, insere um
                INSERT INTO public.settings_app (created_at, updated_at) 
                VALUES (NOW(), NOW())
                RETURNING id INTO app_id_val;
            END IF;
            
            -- Insere ou atualiza o registro em notice_settings
            INSERT INTO public.notice_settings (
                app_id, enabled, title, description, cta_label, cta_url,
                bg_color, text_color, border_color, cta_bg_color, cta_text_color,
                title_font_family, body_font_family, expires_at, created_at, updated_at
            ) VALUES (
                app_id_val,
                true, 
                'Aviso Importante', 
                'Esta é uma mensagem de aviso de exemplo.', 
                'Saiba Mais', 
                'https://exemplo.com',
                '#f8fafc',  -- bg_color
                '#1e293b',  -- text_color
                '#e2e8f0',  -- border_color
                '#3b82f6',  -- cta_bg_color
                '#ffffff',  -- cta_text_color
                'Inter, sans-serif',  -- title_font_family
                'Inter, sans-serif',  -- body_font_family
                NOW() + INTERVAL '30 days',  -- expires_at
                NOW(),
                NOW()
            ) ON CONFLICT (app_id) DO UPDATE SET
                enabled = EXCLUDED.enabled,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                cta_label = EXCLUDED.cta_label,
                cta_url = EXCLUDED.cta_url,
                bg_color = EXCLUDED.bg_color,
                text_color = EXCLUDED.text_color,
                border_color = EXCLUDED.border_color,
                cta_bg_color = EXCLUDED.cta_bg_color,
                cta_text_color = EXCLUDED.cta_text_color,
                title_font_family = EXCLUDED.title_font_family,
                body_font_family = EXCLUDED.body_font_family,
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW();
                
            RAISE NOTICE 'Registro de exemplo inserido/atualizado na tabela notice_settings com app_id = %', app_id_val;
        ELSE
            RAISE EXCEPTION 'A tabela settings_app não possui as colunas esperadas (key ou id)';
        END IF;
    ELSE
        RAISE EXCEPTION 'A tabela settings_app não existe. Crie-a primeiro.';
    END IF;
END
$$;
