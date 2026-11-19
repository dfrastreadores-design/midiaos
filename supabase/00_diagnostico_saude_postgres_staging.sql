-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO DE SAÚDE INTERNA DO POSTGRESQL (STAGING)
-- Arquivo: 00_diagnostico_saude_postgres_staging.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Avaliar saúde, uptime, conexões, replicação (Realtime) e bloqueios
-- Restrição: SOMENTE LEITURA (Zero escrita, zero DDL, zero modificação)
-- ==============================================================================

-- 1. UPTIME E VERSÃO DO POSTGRESQL (Identifica quando o cluster iniciou após a retomada)
SELECT
  '1. UPTIME DO POSTGRES' AS secao,
  version() AS versao_postgres,
  pg_postmaster_start_time() AS cluster_iniciado_em,
  now() - pg_postmaster_start_time() AS tempo_de_atividade,
  CASE WHEN pg_is_in_recovery() THEN 'EM RECUPERACAO' ELSE 'NORMAL (READ/WRITE)' END AS modo_operacao;


-- 2. CONSUMO DE CONEXÕES (Avalia se há esgotamento de conexões no plano Nano)
SELECT
  '2. CONEXOES' AS secao,
  count(*)::text AS conexoes_ativas,
  current_setting('max_connections') AS max_conexoes_permitidas,
  round((count(*)::numeric / current_setting('max_connections')::numeric) * 100, 2)::text || '%' AS percentual_utilizado
FROM pg_stat_activity;


-- 3. DETALHAMENTO DE CONEXÕES POR CLIENTE E SERVIÇO (Realtime, PostgREST, Auth, Studio)
SELECT
  '3. CLIENTES ATIVOS' AS secao,
  coalesce(usename, 'sistema') AS usuario,
  coalesce(application_name, 'desconhecido') AS aplicacao,
  state AS estado_conexao,
  count(*) AS total_conexoes
FROM pg_stat_activity
GROUP BY usename, application_name, state
ORDER BY total_conexoes DESC;


-- 4. SLOTS DE REPLICAÇÃO LÓGICA (Verifica a conexão do serviço Realtime)
SELECT
  '4. REPLICACAO REALTIME' AS secao,
  slot_name,
  plugin,
  slot_type,
  active AS slot_ativo,
  wal_status
FROM pg_replication_slots;


-- 5. VERIFICAÇÃO DE TRANSAÇÕES TRAVADAS OU BLOQUEIOS (LOCKS)
SELECT
  '5. BLOQUEIOS (LOCKS)' AS secao,
  count(*) AS transacoes_aguardando_lock
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';


-- 6. TAMANHO ATUAL DO BANCO DE DADOS
SELECT
  '6. ESPAÇO EM DISCO' AS secao,
  current_database() AS banco,
  pg_size_pretty(pg_database_size(current_database())) AS tamanho_atual;
