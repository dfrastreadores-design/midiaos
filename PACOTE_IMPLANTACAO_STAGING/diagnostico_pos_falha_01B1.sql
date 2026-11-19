-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO PÓS-FALHA DO LOTE 01B1 (INCIDENTE 42701)
-- Arquivo: diagnostico_pos_falha_01B1.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Averiguação empírica do estado do banco após o erro:
--             ERROR: 42701: column "formato" of relation "produtos" already exists
-- Restrição: SOMENTE LEITURA (Zero escrita, zero DDL, zero alteração de dados)
-- ==============================================================================

WITH
colunas_produtos_esperadas AS (
  SELECT * FROM (VALUES
    ('formato', 'Linha 141 (Origem do Erro 42701)'),
    ('link_modelo', 'Linha 813 (Posterior ao Erro)'),
    ('requer_producao', 'Linha 975 (Posterior ao Erro)')
  ) AS t(column_name, etapa_01b1)
),
tabelas_anteriores_linha141 AS (
  SELECT * FROM (VALUES
    ('pi_anexos', 'Linhas 4-19 (Anterior à Linha 141)'),
    ('pi_assinaturas_cliente', 'Linhas 91-104 (Anterior à Linha 141)')
  ) AS t(table_name, etapa_01b1)
),
tabelas_posteriores_linha141 AS (
  SELECT * FROM (VALUES
    ('permuta_recebimentos', 'Linhas 371-384 (Posterior à Linha 141)'),
    ('permuta_saldos', 'Linhas 410-421 (Posterior à Linha 141)'),
    ('produto_tipos', 'Linhas 718-725 (Posterior à Linha 141)'),
    ('pi_financeiro', 'Linhas 728-744 (Posterior à Linha 141)'),
    ('sync_cnpj_log', 'Linhas 992-1000 (Posterior à Linha 141)'),
    ('tarefas', 'Linhas 1052-1065 (Posterior à Linha 141)'),
    ('briefings', 'Linhas 1124-1144 (Posterior à Linha 141)')
  ) AS t(table_name, etapa_01b1)
),
todos_os_checks AS (
  -- 1. Estado da Coluna produtos.formato e Demais Colunas de produtos em 01B1
  SELECT
    10 + row_number() OVER (ORDER BY cpe.column_name)::int AS ordem,
    '1. COLUNAS DE PRODUTOS'::text AS categoria,
    ('produtos.' || cpe.column_name)::text AS objeto,
    cpe.etapa_01b1::text AS esperado_em,
    CASE
      WHEN c.column_name IS NOT NULL THEN 'PRESENTE (tipo: ' || c.data_type || ', nullable: ' || c.is_nullable || ')'
      ELSE 'NÃO ENCONTRADA'
    END AS valor_encontrado,
    CASE
      WHEN cpe.column_name = 'formato' AND c.column_name IS NOT NULL THEN 'PRESENTE (Motivo do erro 42701)'
      WHEN c.column_name IS NOT NULL THEN 'PRESENTE'
      ELSE 'AUSENTE'
    END AS status,
    CASE
      WHEN cpe.column_name = 'formato' AND c.column_name IS NOT NULL
        THEN 'A coluna já existia no banco ou foi adicionada antes da interrupção.'
      WHEN cpe.column_name <> 'formato' AND c.column_name IS NULL
        THEN 'Coluna posterior à linha 141. Ausência indica que a execução não atingiu esta etapa.'
      ELSE 'Coluna encontrada.'
    END::text AS observacao
  FROM colunas_produtos_esperadas cpe
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = 'produtos'
   AND c.column_name = cpe.column_name

  UNION ALL

  -- 2. Objetos Anteriores à Linha 141 (Teste de Rollback vs Commit Parcial)
  SELECT
    30 + row_number() OVER (ORDER BY tal.table_name)::int,
    '2. TABELAS PRÉ-LINHA 141 (TESTE COMMIT/ROLLBACK)',
    tal.table_name,
    tal.etapa_01b1,
    CASE
      WHEN to_regclass('public.' || tal.table_name) IS NOT NULL THEN 'PRESENTE (Criada)'
      ELSE 'AUSENTE (Não criada ou revertida por ROLLBACK)'
    END,
    CASE
      WHEN to_regclass('public.' || tal.table_name) IS NOT NULL THEN 'PERSISTIDA (Evidência de Execução Parcial)'
      ELSE 'AUSENTE (Evidência de Rollback Total do Lote)'
    END,
    'Se AUSENTE: o editor web abortou toda a transação com ROLLBACK. Se PRESENTE: houve commit parcial até a linha 140.'
  FROM tabelas_anteriores_linha141 tal

  UNION ALL

  -- 2.1 Coluna profiles.assinatura_url (Linha 89 de 01B1)
  SELECT
    35,
    '2. TABELAS PRÉ-LINHA 141 (TESTE COMMIT/ROLLBACK)',
    'profiles.assinatura_url',
    'Linha 89 (Anterior à Linha 141)',
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assinatura_url')
        THEN 'PRESENTE (Coluna adicionada)'
      ELSE 'AUSENTE (Não adicionada ou revertida)'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assinatura_url')
        THEN 'PERSISTIDA'
      ELSE 'AUSENTE'
    END,
    'Instrução executada na linha 89 de 01B1.'

  UNION ALL

  -- 2.2 Storage Bucket pi-anexos (Linha 71 de 01B1)
  SELECT
    36,
    '2. TABELAS PRÉ-LINHA 141 (TESTE COMMIT/ROLLBACK)',
    'storage.buckets: pi-anexos',
    'Linha 71 (Anterior à Linha 141)',
    CASE
      WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pi-anexos')
        THEN 'PRESENTE (Bucket inserido)'
      ELSE 'AUSENTE (Não inserido ou revertido)'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pi-anexos')
        THEN 'PERSISTIDO'
      ELSE 'AUSENTE'
    END,
    'Bucket de armazenamento declarado na linha 71 de 01B1.'

  UNION ALL

  -- 3. Objetos Posteriores à Linha 141 (Confirmação de Não-Execução Após Erro)
  SELECT
    50 + row_number() OVER (ORDER BY tpl.table_name)::int,
    '3. TABELAS PÓS-LINHA 141 (CONFERÊNCIA DE INTERRUPÇÃO)',
    tpl.table_name,
    tpl.etapa_01b1,
    CASE
      WHEN to_regclass('public.' || tpl.table_name) IS NOT NULL THEN 'PRESENTE (Inesperado)'
      ELSE 'AUSENTE (Esperado após interrupção)'
    END,
    CASE
      WHEN to_regclass('public.' || tpl.table_name) IS NULL THEN 'CONFORME (Interrupção confirmada)'
      ELSE 'DIVERGENTE (Tabela posterior encontrada)'
    END,
    'Tabela situada após a linha 141 no script 01B1. Espera-se AUSENTE após o erro 42701.'
  FROM tabelas_posteriores_linha141 tpl

  UNION ALL

  -- 4. Verificação de Colunas Posteriores Críticas (agencias.website, clientes.website)
  SELECT
    70,
    '4. COLUNAS PÓS-LINHA 141',
    'agencias.website e clientes.website',
    'Linhas 147-157 (Imediatamente após Linha 141)',
    (SELECT count(*)::text || ' de 2 colunas presentes'
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND column_name = 'website'
       AND table_name IN ('agencias', 'clientes')),
    CASE
      WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'website' AND table_name IN ('agencias', 'clientes')) = 0
        THEN 'CONFORME (Ausentes - execução interrompida na linha 141)'
      ELSE 'DIVERGENTE (Colunas posteriores encontradas)'
    END,
    'Linhas 147-157 do lote 01B1 adicionam website sem IF NOT EXISTS. Se ausentes, comprova que a execução parou exatamente na linha 141.'

  UNION ALL

  -- 5. Classificação Automatizada do Estado do Staging
  SELECT
    100,
    '5. CLASSIFICAÇÃO CONCLUSIVA DO STAGING',
    'Diagnóstico de Estado de Transação',
    'Análise de Evidências Empíricas',
    CASE
      -- Cenário 1: Rollback Total do Lote 01B1
      WHEN to_regclass('public.pi_anexos') IS NULL
       AND to_regclass('public.briefings') IS NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'formato')
       THEN 'EXECUÇÃO REVERTIDA (ROLLBACK TOTAL DO LOTE 01B1)'
      
      -- Cenário 2: Execução Parcial (Linhas 1 a 140 persistidas antes da falha)
      WHEN to_regclass('public.pi_anexos') IS NOT NULL
       AND to_regclass('public.briefings') IS NULL
       THEN 'EXECUÇÃO PARCIAL (PERSISTIDAS LINHAS 1 A 140)'
       
      -- Cenário 3: Execução Completa (Improvável)
      WHEN to_regclass('public.briefings') IS NOT NULL
       THEN 'EXECUÇÃO COMPLETA'
       
      -- Cenário 4: Não Comprovada
      ELSE 'EXECUÇÃO NÃO COMPROVADA'
    END,
    CASE
      WHEN to_regclass('public.pi_anexos') IS NULL
       AND to_regclass('public.briefings') IS NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'formato')
       THEN 'EVIDÊNCIA: A transação do SQL Editor foi abortada integralmente pelo erro 42701. A coluna formato era preexistente no banco.'
      WHEN to_regclass('public.pi_anexos') IS NOT NULL
       AND to_regclass('public.briefings') IS NULL
       THEN 'EVIDÊNCIA: As linhas 1 a 140 foram commitadas antes do erro 42701. Tabelas pi_anexos e pi_assinaturas_cliente foram criadas.'
      ELSE 'Requer inspeção manual dos indicadores acima.'
    END,
    'Classificação técnica baseada na persistência de pi_anexos vs ausência de briefings.'
)
SELECT
  ordem AS "#",
  categoria AS "Categoria",
  objeto AS "Objeto Inspecionado",
  esperado_em AS "Origem / Contexto 01B1",
  valor_encontrado AS "Estado no Banco Staging",
  status AS "Classificação Técnica",
  observacao AS "Parecer Técnico"
FROM todos_os_checks
ORDER BY ordem;

