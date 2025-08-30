-- Verifica a estrutura da tabela notice_settings
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'notice_settings'
ORDER BY 
    ordinal_position;

-- Verifica se existem registros na tabela
SELECT 
    COUNT(*) as total_records,
    MAX(updated_at) as last_updated,
    bool_or(enabled) as has_enabled_notices
FROM 
    notice_settings;

-- Verifica os primeiros registros (se existirem)
SELECT * FROM notice_settings LIMIT 5;
