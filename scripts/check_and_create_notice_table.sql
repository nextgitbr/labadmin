-- Verifica se a tabela settings_app existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings_app') THEN
        RAISE EXCEPTION 'A tabela settings_app não existe. Por favor, crie-a primeiro.';
    END IF;

    -- Verifica se a tabela notice_settings já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notice_settings') THEN
        -- Verifica se a tabela settings_app tem a coluna 'key' para determinar o esquema a ser usado
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'settings_app' 
            AND column_name = 'key'
        ) THEN
            -- Cria a tabela notice_settings com chave estrangeira para settings_app.key
            CREATE TABLE public.notice_settings (
                id BIGSERIAL PRIMARY KEY,
                app_key TEXT NOT NULL REFERENCES public.settings_app(key) ON DELETE CASCADE,
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                cta_label TEXT NOT NULL DEFAULT '',
                cta_url TEXT NOT NULL DEFAULT '',
                -- campos de estilo
                bg_color TEXT,
                text_color TEXT,
                border_color TEXT,
                cta_bg_color TEXT,
                cta_text_color TEXT,
                title_font_family TEXT,
                body_font_family TEXT,
                -- data de expiração
                expires_at TIMESTAMPTZ,
                -- timestamps
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                -- restrições
                UNIQUE (app_key)
            );
            
            -- Cria índice para melhorar consultas por app_key
            CREATE INDEX idx_notice_app_key ON public.notice_settings(app_key);
            
            RAISE NOTICE 'Tabela notice_settings criada com sucesso usando app_key como chave estrangeira.';
        ELSE
            -- Cria a tabela notice_settings com chave estrangeira para settings_app.id
            CREATE TABLE public.notice_settings (
                id BIGSERIAL PRIMARY KEY,
                app_id BIGINT NOT NULL REFERENCES public.settings_app(id) ON DELETE CASCADE,
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                cta_label TEXT NOT NULL DEFAULT '',
                cta_url TEXT NOT NULL DEFAULT '',
                -- campos de estilo
                bg_color TEXT,
                text_color TEXT,
                border_color TEXT,
                cta_bg_color TEXT,
                cta_text_color TEXT,
                title_font_family TEXT,
                body_font_family TEXT,
                -- data de expiração
                expires_at TIMESTAMPTZ,
                -- timestamps
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                -- restrições
                UNIQUE (app_id)
            );
            
            -- Cria índice para melhorar consultas por app_id
            CREATE INDEX idx_notice_app_id ON public.notice_settings(app_id);
            
            RAISE NOTICE 'Tabela notice_settings criada com sucesso usando app_id como chave estrangeira.';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela notice_settings já existe.';
    END IF;
END
$$;
