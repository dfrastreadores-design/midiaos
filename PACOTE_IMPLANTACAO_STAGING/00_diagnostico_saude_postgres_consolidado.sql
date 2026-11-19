-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO DE SAÚDE DO POSTGRESQL CONSOLIDADO (STAGING)
-- Arquivo: 00_diagnostico_saude_postgres_consolidado.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Retornar todos os indicadores em UMA ÚNICA TABELA no SQL Editor
-- Restrição: SOMENTE LEITURA (Zero escrita, zero criação de objetos, zero DDL)
-- ==============================================================================

WITH metricas AS (
  -- 1. Identificação da Sessão
  SELECT
    1 AS ordem,
    '1. AMBIENTE & SESSÃO'::text AS categoria,
    'Sessão Atual'::text AS indicador,
    (current_user || ' @ ' || current_database())::text AS valor,
    ('Backend PID: ' || pg_backend_pid()::text)::text AS detalhe,
    'INFO'::text AS status

  UNION ALL

  -- 2. Versão do PostgreSQL
  SELECT
    2,
    '1. AMBIENTE & SESSÃO',
    'Versão do PostgreSQL',
    split_part(version(), ' on ', 1),
    version(),
    'OK'

  UNION ALL

  -- 3. Horário do Servidor
  SELECT
    3,
    '1. AMBIENTE & SESSÃO',
    'Horário do Servidor',
    to_char(now(), 'YYYY-MM-DD HH24:MI:SS OF'),
    'Timezone: ' || current_setting('TIMEZONE'),
    'OK'

  UNION ALL

  -- 4. Início do Cluster e Uptime
  SELECT
    4,
    '1. AMBIENTE & SESSÃO',
    'Início do Cluster (Uptime)',
    to_char(pg_postmaster_start_time(), 'YYYY-MM-DD HH24:MI:SS OF'),
    'Uptime decorrido: ' || (date_trunc('second', now() - pg_postmaster_start_time()))::text,
    'OK'

  UNION ALL

  -- 5. Modo de Operação
  SELECT
    5,
    '1. AMBIENTE & SESSÃO',
    'Modo de Operação',
    CASE WHEN pg_is_in_recovery() THEN 'EM RECUPERAÇÃO (READ-ONLY)' ELSE 'NORMAL (READ/WRITE)' END,
    CASE WHEN pg_is_in_recovery() THEN 'Cluster em réplica / recuperação - escrita desabilitada' ELSE 'Cluster operacional aceitando conexões de leitura e escrita' END,
    CASE WHEN pg_is_in_recovery() THEN 'ALERTA' ELSE 'OK' END

  UNION ALL

  -- 6. Conexões Ativas vs Limite
  SELECT
    6,
    '2. CONEXÕES',
    'Conexões Ativas vs Limite',
    (SELECT count(*)::text FROM pg_stat_activity) || ' / ' || current_setting('max_connections') || ' (' || round(((SELECT count(*)::numeric FROM pg_stat_activity) / current_setting('max_connections')::numeric) * 100, 1)::text || '%)',
    'Conexões totais em uso no pool vs máximo configurado',
    CASE
      WHEN ((SELECT count(*)::numeric FROM pg_stat_activity) / current_setting('max_connections')::numeric) >= 0.85 THEN 'ALERTA'
      ELSE 'OK'
    END

  UNION ALL

  -- 7. Conexões por Estado
  SELECT
    7,
    '2. CONEXÕES',
    'Conexões por Estado',
    coalesce(
      (SELECT string_agg(format('%s: %s', coalesce(state, 'background'), total), ' | ' ORDER BY total DESC)
       FROM (SELECT state, count(*) AS total FROM pg_stat_activity GROUP BY state) s),
      'Nenhuma conexão'
    ),
    'Distribuição dos estados de conexão (active, idle, idle in tx, background)',
    'INFO'

  UNION ALL

  -- 8. Conexões por Aplicação
  SELECT
    8,
    '2. CONEXÕES',
    'Conexões por Aplicação',
    coalesce(
      (SELECT string_agg(format('%s: %s', app, total), ' | ' ORDER BY total DESC)
       FROM (SELECT coalesce(nullif(application_name, ''), 'indefinido') AS app, count(*) AS total FROM pg_stat_activity GROUP BY app ORDER BY total DESC LIMIT 6) a),
      'Nenhuma conexão'
    ),
    'Top serviços conectados (PostgREST, GoTrue, Realtime, Studio, etc.)',
    'INFO'

  UNION ALL

  -- 9. Transações Abertas / Ociosas
  SELECT
    9,
    '3. TRANSAÇÕES & LOCKS',
    'Transações Abertas / Ociosas',
    (SELECT count(*)::text FROM pg_stat_activity WHERE state IN ('active', 'idle in transaction', 'idle in transaction (aborted)') AND pid <> pg_backend_pid()),
    CASE
      WHEN (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction' AND pid <> pg_backend_pid()) > 0
        THEN 'Atenção: há transações paradas em "idle in transaction"'
      ELSE 'Nenhuma transação ociosa ou presa detectada'
    END,
    CASE
      WHEN (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction' AND pid <> pg_backend_pid()) > 0 THEN 'ALERTA'
      ELSE 'OK'
    END

  UNION ALL

  -- 10. Duração da Transação Mais Antiga
  SELECT
    10,
    '3. TRANSAÇÕES & LOCKS',
    'Transação Mais Antiga (Duração)',
    coalesce(
      (SELECT date_trunc('second', max(now() - xact_start))::text
       FROM pg_stat_activity
       WHERE xact_start IS NOT NULL AND pid <> pg_backend_pid()),
      '00:00:00 (Nenhuma)'
    ),
    'Tempo decorrido da transação mais antiga em andamento',
    CASE
      WHEN coalesce((SELECT extract(epoch from max(now() - xact_start)) FROM pg_stat_activity WHERE xact_start IS NOT NULL AND pid <> pg_backend_pid()), 0) > 300 THEN 'ALERTA'
      ELSE 'OK'
    END

  UNION ALL

  -- 11. Bloqueios Aguardando Resolução (pg_stat_activity wait_event_type = 'Lock')
  SELECT
    11,
    '3. TRANSAÇÕES & LOCKS',
    'Transações Aguardando Bloqueio (Locks)',
    (SELECT count(*)::text FROM pg_stat_activity WHERE wait_event_type = 'Lock'),
    'Processos aguardando liberação de lock em tabelas ou tuplas',
    CASE
      WHEN (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock') > 0 THEN 'ALERTA'
      ELSE 'OK'
    END

  UNION ALL

  -- 12. Locks Não Concedidos no Catálogo (pg_locks)
  SELECT
    12,
    '3. TRANSAÇÕES & LOCKS',
    'Locks Pendentes no Catálogo (pg_locks)',
    CASE
      WHEN to_regclass('pg_catalog.pg_locks') IS NULL THEN 'OBJETO INEXISTENTE'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_locks', 'SELECT') THEN 'SEM PERMISSÃO'
      ELSE (SELECT count(*)::text FROM pg_locks WHERE NOT granted)
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_locks') IS NULL THEN 'View pg_locks não existe no catálogo'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_locks', 'SELECT') THEN 'Usuário ' || current_user || ' sem privilégio SELECT em pg_locks'
      ELSE 'Total de pedidos de bloqueio não concedidos (fila de espera)'
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_locks') IS NULL THEN 'INACESSÍVEL'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_locks', 'SELECT') THEN 'SEM PERMISSÃO'
      WHEN (SELECT count(*) FROM pg_locks WHERE NOT granted) > 0 THEN 'ALERTA'
      ELSE 'OK'
    END

  UNION ALL

  -- 13. Slots de Replicação Lógica (Realtime / CDC)
  SELECT
    13,
    '4. REPLICAÇÃO & REALTIME',
    'Slots de Replicação (pg_replication_slots)',
    CASE
      WHEN to_regclass('pg_catalog.pg_replication_slots') IS NULL THEN 'OBJETO INEXISTENTE'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_replication_slots', 'SELECT') THEN 'SEM PERMISSÃO'
      ELSE (
        SELECT coalesce(
          string_agg(
            format('%s [plugin: %s, ativo: %s, wal: %s]', slot_name, plugin, active, coalesce(wal_status, 'n/a')),
            ' || '
          ),
          'Nenhum slot configurado'
        )
        FROM pg_replication_slots
      )
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_replication_slots') IS NULL THEN 'View pg_replication_slots não existe no catálogo'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_replication_slots', 'SELECT') THEN 'Usuário ' || current_user || ' sem privilégio SELECT em pg_replication_slots'
      ELSE 'Slots WAL para CDC e serviço Realtime'
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_replication_slots') IS NULL THEN 'INACESSÍVEL'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_replication_slots', 'SELECT') THEN 'SEM PERMISSÃO'
      WHEN EXISTS (SELECT 1 FROM pg_replication_slots WHERE active = true) THEN 'OK'
      WHEN EXISTS (SELECT 1 FROM pg_replication_slots) THEN 'ALERTA (INATIVO)'
      ELSE 'INFO'
    END

  UNION ALL

  -- 14. Publicação supabase_realtime
  SELECT
    14,
    '4. REPLICAÇÃO & REALTIME',
    'Publicação supabase_realtime',
    CASE
      WHEN to_regclass('pg_catalog.pg_publication') IS NULL THEN 'OBJETO INEXISTENTE'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_publication', 'SELECT') THEN 'SEM PERMISSÃO'
      WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN 'EXISTE (CONFIGURADA)'
      ELSE 'NÃO ENCONTRADA'
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_publication') IS NULL THEN 'Tabela pg_publication não existe no catálogo'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_publication', 'SELECT') THEN 'Usuário ' || current_user || ' sem privilégio SELECT em pg_publication'
      WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN 'Publicação oficial do Realtime presente no cluster'
      ELSE 'Publicação supabase_realtime ausente'
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_publication') IS NULL THEN 'INACESSÍVEL'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_publication', 'SELECT') THEN 'SEM PERMISSÃO'
      WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN 'OK'
      ELSE 'ALERTA'
    END

  UNION ALL

  -- 15. Tabelas na Publicação supabase_realtime
  SELECT
    15,
    '4. REPLICAÇÃO & REALTIME',
    'Tabelas em supabase_realtime',
    CASE
      WHEN to_regclass('pg_catalog.pg_publication_tables') IS NULL THEN 'OBJETO INEXISTENTE'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_publication_tables', 'SELECT') THEN 'SEM PERMISSÃO'
      ELSE (
        SELECT coalesce(
          string_agg(schemaname || '.' || tablename, ', ' ORDER BY tablename),
          'Nenhuma tabela vinculada (0 tabelas)'
        )
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
      )
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_publication_tables') IS NULL THEN 'View pg_publication_tables não existe no catálogo'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_publication_tables', 'SELECT') THEN 'Usuário ' || current_user || ' sem privilégio SELECT em pg_publication_tables'
      ELSE 'Tabelas publicadas para eventos Realtime (esperado 0 antes do Core)'
    END,
    CASE
      WHEN to_regclass('pg_catalog.pg_publication_tables') IS NULL THEN 'INACESSÍVEL'
      WHEN NOT has_table_privilege(current_user, 'pg_catalog.pg_publication_tables', 'SELECT') THEN 'SEM PERMISSÃO'
      ELSE 'OK'
    END

  UNION ALL

  -- 16. Tamanho Total do Banco
  SELECT
    16,
    '5. ARMAZENAMENTO',
    'Tamanho Total do Banco',
    pg_size_pretty(pg_database_size(current_database())),
    'Banco de dados ativo: ' || current_database(),
    'OK'

  UNION ALL

  -- 17. Tamanho do Schema public
  SELECT
    17,
    '5. ARMAZENAMENTO',
    'Tamanho do Schema public',
    pg_size_pretty(
      coalesce(
        (SELECT sum(pg_total_relation_size(c.oid))
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'),
        0
      )
    ),
    'Volume total ocupado por tabelas, índices e dados no schema public',
    'OK'

  UNION ALL

  -- 18. Tabelas Base no Schema public
  SELECT
    18,
    '5. ARMAZENAMENTO',
    'Tabelas Base em public',
    (SELECT count(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') || ' tabelas',
    'Estado pré-Core: esperado 0 tabelas (limpo); pós-Core: esperado 59 tabelas',
    CASE
      WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') = 0 THEN 'OK (LIMPO)'
      ELSE 'INFO'
    END

  UNION ALL

  -- 19. Avaliação Geral Sintética
  SELECT
    19,
    '6. CONCLUSÃO',
    'Diagnóstico Geral de Saúde',
    CASE
      WHEN pg_is_in_recovery() THEN 'ALERTA: Cluster em recuperação / read-only'
      WHEN (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock') > 0 THEN 'ALERTA: Bloqueios ativos detectados'
      WHEN ((SELECT count(*)::numeric FROM pg_stat_activity) / current_setting('max_connections')::numeric) >= 0.85 THEN 'ALERTA: Ocupação de conexões alta (>85%)'
      ELSE 'SAUDÁVEL (Pronto para implantação do Core)'
    END,
    'Resultado consolidado de saúde do motor PostgreSQL',
    CASE
      WHEN pg_is_in_recovery()
        OR (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock') > 0
        OR ((SELECT count(*)::numeric FROM pg_stat_activity) / current_setting('max_connections')::numeric) >= 0.85
        THEN 'ALERTA'
      ELSE 'OK'
    END
)
SELECT
  ordem AS "#",
  categoria AS "Categoria",
  indicador AS "Indicador",
  valor AS "Valor",
  detalhe AS "Detalhe / Contexto",
  status AS "Status"
FROM metricas
ORDER BY ordem;

