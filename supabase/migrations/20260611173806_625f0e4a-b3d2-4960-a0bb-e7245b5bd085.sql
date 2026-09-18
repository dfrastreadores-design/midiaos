-- Habilitar pg_cron se ainda não estiver
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior se existir (usando subquery segura)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-cnpj-daily') THEN
        PERFORM cron.unschedule('sync-cnpj-daily');
    END IF;
END $$;

-- Agendar novo job para rodar a cada minuto nas horas que correspondem a 00:01-05:55 BRT
-- 00:01-05:55 BRT é aproximadamente 03:01-08:55 UTC
SELECT cron.schedule(
    'sync-cnpj-daily',
    '* 3-8 * * *',
    $$
    SELECT
      net.http_post(
        url := (SELECT current_setting('app.settings.project_url') || '/api/public/hooks/sync-cnpj'),
        headers := '{"Content-Type": "application/json"}'::jsonb
      ) as request_id
    WHERE
      -- Validação extra do horário de Brasília (UTC-3)
      EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) BETWEEN 0 AND 5
      AND (
        (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) = 0 AND EXTRACT(MINUTE FROM (now() AT TIME ZONE 'UTC-3')) >= 1)
        OR (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) = 5 AND EXTRACT(MINUTE FROM (now() AT TIME ZONE 'UTC-3')) <= 55)
        OR (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) > 0 AND EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) < 5)
      )
    $$
);
