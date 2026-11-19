# ==============================================================================
# SCRIPT DE VALIDAÇÃO LOCAL DO CORE SCHEMA EM POSTGRESQL 15.8 (PORTÁTIL)
# Arquivo: tests/executar_validacao_core_local.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"

$baseDir = "D:\midiaos_build"
$pgDir = "$baseDir\.tmp_postgres\pgsql"
$dataDir = "$baseDir\.tmp_postgres\data"
$logsDir = "$baseDir\tests\logs_validacao_core"
$sqlCore = "$baseDir\PACOTE_IMPLANTACAO_STAGING\01_midiaos_v260_core_schema.sql"
$port = 54333

Write-Host "=== 1. INICIANDO CLUSTER POSTGRESQL 15.8 NA PORTA $port ==="

# Iniciar servidor
$serverLog = "$logsDir\postgres_server.log"
& "$pgDir\bin\pg_ctl.exe" -D $dataDir -l $serverLog -o "-p $port" start

# Aguardar pg_isready
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    & "$pgDir\bin\pg_isready.exe" -p $port -q
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        Write-Host "PostgreSQL está pronto para conexões na porta $port."
        break
    }
}

if (-not $ready) {
    Write-Error "PostgreSQL não iniciou a tempo. Verifique $serverLog"
    exit 1
}

# 2. Criar banco descartável staging_test
Write-Host "=== 2. CRIANDO BANCO DESCARTÁVEL staging_test ==="
& "$pgDir\bin\createdb.exe" -p $port -U postgres staging_test

# 3. Provisionar ambiente base de compatibilidade Supabase (roles e auth)
Write-Host "=== 3. PROVISIONANDO ROLES E SCHEMA AUTH SUPABASE ==="
$preScript = @"
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS \$\$ SELECT 'a711a129-330c-46bf-943a-531cedd4f2ff'::uuid; \$\$;
CREATE SCHEMA IF NOT EXISTS extensions;
"@

$preScript | & "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -q

# 4. EXECUÇÃO 1 DO ARQUIVO CORE CORRIGIDO
Write-Host "=== 4. EXECUTANDO 01_midiaos_v260_core_schema.sql (EXECUÇÃO 1) ==="
$logExec1 = "$logsDir\execucao_1.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlCore 2>&1 | Tee-Object -FilePath $logExec1

# 5. AUDITORIA DOS OBJETOS CRIADOS NO POSTGRESQL LOCAL
Write-Host "=== 5. AUDITORIA DOS OBJETOS CRIADOS (EXECUÇÃO 1) ==="
$auditScript = @"
-- 1. Tabelas
SELECT 'TABELAS_PUBLIC' AS categoria, count(*)::text AS total FROM information_schema.tables WHERE table_schema = 'public';
-- 2. Enums
SELECT 'ENUMS_PUBLIC' AS categoria, count(*)::text AS total FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e';
-- 3. Funções
SELECT 'FUNCOES_PUBLIC' AS categoria, count(*)::text AS total FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';
-- 4. Triggers
SELECT 'TRIGGERS_PUBLIC' AS categoria, count(*)::text AS total FROM information_schema.triggers WHERE trigger_schema = 'public';
-- 5. Policies RLS
SELECT 'POLICIES_PUBLIC' AS categoria, count(*)::text AS total FROM pg_policies WHERE schemaname = 'public';
-- 6. Tenant TV Brasília
SELECT 'TENANT_RAIZ' AS categoria, id::text, razao_social, status FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff';
"@

$logObjetos = "$logsDir\objetos_execucao_1.log"
$auditScript | & "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test | Tee-Object -FilePath $logObjetos

# 6. EXECUÇÃO 2 (TESTE DE IDEMPOTÊNCIA)
Write-Host "=== 6. TESTE DE IDEMPOTÊNCIA: REAPLICAÇÃO DO CORE (EXECUÇÃO 2) ==="
$logExec2 = "$logsDir\execucao_2_idempotencia.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlCore 2>&1 | Tee-Object -FilePath $logExec2

# 7. PARAR POSTGRESQL
Write-Host "=== 7. FINALIZANDO E DESLIGANDO SERVIDOR LOCAL ==="
& "$pgDir\bin\pg_ctl.exe" -D $dataDir stop

Write-Host "=== PROCESSO DE VALIDAÇÃO LOCAL CONCLUÍDO COM SUCESSO ==="

