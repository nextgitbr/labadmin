-- Verifica se a tabela settings_app existe
SELECT 
    table_name,
    CASE 
        WHEN table_schema = 'public' AND table_name = 'settings_app' THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END AS status
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_name = 'settings_app';

-- Verifica se a tabela notice_settings existe
SELECT 
    table_name,
    CASE 
        WHEN table_schema = 'public' AND table_name = 'notice_settings' THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END AS status
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_name = 'notice_settings';
