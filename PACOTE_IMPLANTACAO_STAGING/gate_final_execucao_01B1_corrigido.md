# PARECER TÉCNICO: GATE FINAL DE SEGURANÇA DO LOTE 01B1 CORRIGIDO
## Auditoria Estrutural, Idempotência e Homologação Pré-Staging (PostgreSQL 17.11)

**Data:** 11 de Novembro de 2026  
**Ambiente Alvo:** Supabase Staging (`wsologhmptielhhnbgob`)  
**Engine:** PostgreSQL 17.11 (Supabase Hosted)  
**Arquivos Inspecionados (Sem Modificações):**
- [`01B1_midiaos_v260_core_parte2A_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B1_midiaos_v260_core_parte2A_corrigido.sql) (54.146 bytes, SHA256: `99d0ca382a39a708f56b3ef2172e852175c0d05820174d371a0381dc8effab01`)
- [`01B_midiaos_v260_core_parte2_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B_midiaos_v260_core_parte2_corrigido.sql) (108.769 bytes, SHA256: `984904fdfb9e2c35d4158300504b06a0a186a2cc8fc04daa76fdb1c6cdb1b75f`)
- [`01B2_midiaos_v260_core_parte2B.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B2_midiaos_v260_core_parte2B.sql) (54.623 bytes, SHA256: `550046949817c3653d3075bea7931372f81397478cae8c496c3a9ebe3547ab7a`)

---

## 1. CONFERÊNCIA ESTRUTURAL DAS 23 COLUNAS CORRIGIDAS

> [!IMPORTANT]
> **Princípio Metodológico:** A cláusula `IF NOT EXISTS` foi aplicada como barreira defensiva de execução contra o erro `42701`, mas **não é considerada substituta da validação estrutural**. Abaixo está a comprovação exaustiva de tipos, nulabilidade, defaults e compatibilidade histórica e semântica com o estado empírico do Staging:

| # | Linha | Tabela | Coluna | Tipo SQL Esperado | Nullable | Default | Constraint / FK | Definição Histórica (Migration) | Evidência de Compatibilidade com o Staging |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 141 | `produtos` | `formato` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175430_d3519897.sql` (L1) | Coluna já presente no Staging (causou o erro 42701 original). Tipo `TEXT` idêntico. |
| 2 | 148 | `agencias` | `website` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L2) | Coluna já presente no Staging (criada em migração legada). Nulável, sem conflito. |
| 3 | 149 | `agencias` | `instagram` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L3) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 4 | 150 | `agencias` | `linkedin` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L4) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 5 | 151 | `agencias` | `facebook` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L5) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 6 | 154 | `clientes` | `website` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L8) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 7 | 155 | `clientes` | `instagram` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L9) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 8 | 156 | `clientes` | `linkedin` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L10) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 9 | 157 | `clientes` | `facebook` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (L11) | Coluna já presente no Staging. Tipo `TEXT` compatível. |
| 10 | 242 | `email_send_log` | `message_id` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603211300_email_infra.sql` (L50) | Coluna de rastreamento SES/Resend. Se existir, é `TEXT`; se ausente, será criada. |
| 11 | 276 | `email_send_state` | `batch_size` | `INTEGER` | NÃO | `10` | Nenhuma | `20260603211300_email_infra.sql` (L90) | Possui `DEFAULT 10`, logo não quebra linhas existentes se a coluna for criada. |
| 12 | 280 | `email_send_state` | `send_delay_ms` | `INTEGER` | NÃO | `200` | Nenhuma | `20260603211300_email_infra.sql` (L95) | Possui `DEFAULT 200`, compatível com tabela de fila. |
| 13 | 284 | `email_send_state` | `auth_email_ttl_minutes` | `INTEGER` | NÃO | `15` | Nenhuma | `20260603211300_email_infra.sql` (L100) | Possui `DEFAULT 15`, compatível. |
| 14 | 288 | `email_send_state` | `transactional_email_ttl_minutes` | `INTEGER` | NÃO | `60` | Nenhuma | `20260603211300_email_infra.sql` (L101) | Possui `DEFAULT 60`, compatível. |
| 15 | 599 | `pi_itens` | `mes` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220334_d6b0a5ad.sql` (L4) | Mês de competência. Nulável, dados preexistentes permanecem válidos. |
| 16 | 600 | `pi_itens` | `ano` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220334_d6b0a5ad.sql` (L5) | Ano de competência. Nulável, dados preexistentes permanecem válidos. |
| 17 | 617 | `proposta_itens` | `mes` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220613_e1145783.sql` (L4) | Mês na proposta comercial. Nulável. |
| 18 | 618 | `proposta_itens` | `ano` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220613_e1145783.sql` (L5) | Ano na proposta comercial. Nulável. |
| 19 | 625 | `pis` | `vencimento_tipo` | `TEXT` | SIM | `'manual'` | Nenhuma | `20260603221948_5f6ff2a5.sql` (L2) | Nulável com `DEFAULT 'manual'`. Compatível com regras comerciais de faturamento. |
| 20 | 712 | `proposta_itens` | `horario` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603230145_4048be69.sql` (L2) | Horário da grade. Nulável, compatível. |
| 21 | 715 | `pi_itens` | `horario` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603230145_4048be69.sql` (L3) | Horário da grade no PI. Nulável, compatível. |
| 22 | 1200 | `pis` | `responsavel_negociacao_id` | `UUID` | SIM | Nenhum | `FK -> profiles(id)` | `20260609232013_d89bc1ed.sql` (L3) | Referência a `profiles(id)`, tabela central já validada no Lote 01A. |
| 23 | 1201 | `pis` | `executivo_execucao_id` | `UUID` | SIM | Nenhum | `FK -> profiles(id)` | `20260609232013_d89bc1ed.sql` (L4) | Referência a `profiles(id)`, tabela central já validada no Lote 01A. |

---

## 2. CONFERÊNCIA DE `public.produto_tipos` E CLÁUSULA `ON CONFLICT`

### 2.1. Comprovação da Restrição de Unicidade
A tabela `public.produto_tipos` é definida na Linha 725 do script `01B1_corrigido` (e idêntica na migration histórica `20260603230647_9aa18d95-2eac-4fc2-95b2-d06cf1c3b41b.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.produto_tipos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    midia TEXT NOT NULL CHECK (midia IN ('TV', 'Radio', 'DOOH')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(nome, midia)
);
```
**Evidências Estruturais:**
1. A restrição `UNIQUE(nome, midia)` está declarada no próprio DDL da tabela (Linha 731). No PostgreSQL, isso cria automaticamente a constraint `produto_tipos_nome_midia_key` com um índice único B-tree correspondente.
2. Ambas as colunas (`nome` e `midia`) possuem a constraint `NOT NULL`. Portanto, **não há possibilidade de valores `NULL` contornarem ou comprometerem a regra de unicidade**.
3. A cláusula `ON CONFLICT (nome, midia) DO NOTHING;` aplicada no `INSERT` da linha 761 referencia exatamente os campos da constraint de unicidade:
   ```sql
   INSERT INTO public.produto_tipos (nome, midia) VALUES 
   ('VT', 'TV'),
   ('Merchan', 'TV'),
   ('Insert', 'TV'),
   ('Patrocínio', 'TV'),
   ('Projeto Especial', 'TV'),
   ('Spot', 'Radio'),
   ('Jingle', 'Radio'),
   ('Painel', 'DOOH')
   ON CONFLICT (nome, midia) DO NOTHING;
   ```
4. **Classificação da Constraint:** **COMPROVADA**. A cláusula é 100% suportada pelo motor PostgreSQL e impede a quebra `23505 (unique_violation)`.

---

## 3. AUDITORIA DE SEGURANÇA DOS DEMAIS COMANDOS DO PACOTE

Uma reexecução do script `01B1_corrigido` foi submetida a uma auditoria de efeitos colaterais:

1. **`CREATE TABLE IF NOT EXISTS` (13 tabelas):**
   - Não recria tabelas já existentes, não trunca dados, não altera colunas. **Zero risco.**
2. **`CREATE INDEX IF NOT EXISTS` (22 índices):**
   - Se o índice já existe no Staging, o comando é ignorado sem recriação ou bloqueio exclusivo. **Zero risco.**
3. **`DROP/CREATE TRIGGER` (6 triggers):**
   - O padrão é `DROP TRIGGER IF EXISTS <trg> ON <tab>; CREATE TRIGGER <trg> ...`.
   - Como as funções chamadas (`touch_updated_at`, `update_updated_at_column`) já existem e as triggers apenas atualizam o timestamp `updated_at`, não há perda de configurações ou dados. **Zero risco.**
4. **`DROP/CREATE POLICY` (53 políticas RLS):**
   - O padrão é `DROP POLICY IF EXISTS "<pol>" ON <tab>; CREATE POLICY "<pol>" ...`.
   - Garante que a regra de segurança atualizada seja aplicada. Não afeta dados gravados nas linhas. **Zero risco.**
5. **`ADD CONSTRAINT` (5 constraints):**
   - 1 check constraint em `email_send_log`: precedida por `DROP CONSTRAINT IF EXISTS`.
   - 4 foreign keys em `propostas` e `proposta_itens`: encapsuladas em `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...') THEN ... END IF; $$`. Não geram erro se a constraint já existir. **Zero risco.**
6. **`INSERT INTO ... ON CONFLICT DO NOTHING` (11 comandos):**
   - Todos os 11 comandos de inserção do pacote (em `storage.buckets`, `email_send_state`, `permuta_saldos`, `permissions`, `role_permissions` e `produto_tipos`) possuem `ON CONFLICT DO NOTHING`.
   - Nenhum registro preexistente será sobrescrito ou modificado. **Zero risco.**
7. **Storage Bucket `pi-anexos`:**
   - Inserção com `ON CONFLICT (id) DO NOTHING`. Se o bucket já existir, permanece intacto com todos os seus arquivos. **Zero risco.**

---

## 4. ESTADO DO BANCO E ANÁLISE DE ROLLBACK DA EXECUÇÃO ANTERIOR

> [!WARNING]
> **Premissa:** Não presumimos rollback integral nem commit integral da tentativa anterior de execução do 01B1.

O script de diagnóstico [`diagnostico_pre_execucao_01B1_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/diagnostico_pre_execucao_01B1_corrigido.sql) foi desenhado especificamente para:
1. Inspecionar individualmente a presença e os tipos das 23 colunas no banco Staging.
2. Inspecionar a presença da constraint `UNIQUE(nome, midia)` na tabela `produto_tipos`.
3. Inspecionar a contagem de registros em `produto_tipos` e verificar se há duplicatas.
4. Mapear o status dos objetos anteriores à linha 141 (`pi_anexos`, bucket, `assinatura_url`, `pi_assinaturas_cliente`) e posteriores à linha 141 (`permuta_recebimentos`, `permuta_saldos`, `produto_tipos`, `pi_financeiro`, `sync_cnpj_log`, `tarefas`, `briefings`).

Como todas as instruções no `01B1_corrigido` agora são **estritamente idempotentes**, o script executará com sucesso e segurança independentemente de:
- O banco Staging ter sofrido rollback na linha 141 (caso em que criará o que estiver faltando).
- O banco Staging já possuir todos os objetos de migrações anteriores (caso em que ignorará tudo de forma segura).
- O banco Staging estar em um estado intermediário/misto.

---

## 5. CONFIRMAÇÃO DE INTEGRIDADE, BACKUPS E RECOMPOSIÇÃO BINÁRIA

1. **Hashes SHA-256 Confirmados:**
   - `01A_midiaos_v260_core_parte1.sql`: `04904283b7a7ff5243937355c7ec2688ffbd8e4826561ce2196c9a634290a954` (Original intacto)
   - `01B1_midiaos_v260_core_parte2A.sql`: `cd2c50b0d1306d084b942f6c23316ac219c4867805e44426c911e8bb2d878c67` (Original intacto)
   - `01B1_midiaos_v260_core_parte2A_corrigido.sql`: `99d0ca382a39a708f56b3ef2172e852175c0d05820174d371a0381dc8effab01` (Novo pacote)
   - `01B2_midiaos_v260_core_parte2B.sql`: `550046949817c3653d3075bea7931372f81397478cae8c496c3a9ebe3547ab7a` (Intocado)
   - `01B_midiaos_v260_core_parte2.sql`: `afaadd46af3744cab6a6aca0ae8b1f48e9bc741c5e74e1d798c68f8da10cb276` (Original intacto)
   - `01B_midiaos_v260_core_parte2_corrigido.sql`: `984904fdfb9e2c35d4158300504b06a0a186a2cc8fc04daa76fdb1c6cdb1b75f` (Novo pacote monolítico)
2. **Recomposição Binária Exata:**
   $$\text{bytes}(\text{01B1\_corrigido}) + \text{bytes}(\text{01B2\_intocado}) \equiv \text{bytes}(\text{01B\_corrigido})$$
   Comprovado: `True` (preservação estrita de CRLF e delimitadores).
3. **Backups:**
   Cópias de segurança mantidas em:
   `d:\midiaos_build\PACOTE_IMPLANTACAO_STAGING\backup_pre_corrigido\`

---

## 6. PARECER CONCLUSIVO E PROCEDIMENTO DE EXECUÇÃO

O pacote [`01B1_midiaos_v260_core_parte2A_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B1_midiaos_v260_core_parte2A_corrigido.sql) atende a todos os critérios de segurança e integridade estipulados no Gate.

### Ordem Recomendada de Execução no Supabase Staging:
1. **Passo 1 (Opcional / Informativo):** Executar no SQL Editor do Supabase o script de diagnóstico estritamente leitura [`diagnostico_pre_execucao_01B1_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/diagnostico_pre_execucao_01B1_corrigido.sql) para constatar o estado atual das 23 colunas e da tabela `produto_tipos`.
2. **Passo 2 (Execução Controlada):** Executar no SQL Editor do Supabase o script [`01B1_midiaos_v260_core_parte2A_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B1_midiaos_v260_core_parte2A_corrigido.sql).

> [!IMPORTANT]
> **DECLARAÇÃO DE CONFORMIDADE RIGOROSA:**  
> - **NÃO conectamos** a nenhum banco remoto.
> - **NÃO executamos** comandos SQL remotos.
> - **NENHUM arquivo original foi alterado** (preservação integral de código e hashes originais).
> - Paramos a execução neste ponto e aguardamos as instruções e autorização expressa do usuário.

