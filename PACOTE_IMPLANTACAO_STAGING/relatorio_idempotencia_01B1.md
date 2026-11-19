# RELATÓRIO TÉCNICO DE REVISÃO DE IDEMPOTÊNCIA E RECUPERAÇÃO CONTROLADA DO LOTE 01B1
## MIDIA OS v2.6.0 — Homologação Pré-Staging (Supabase Hosted PostgreSQL 17.11)

**Data:** 11 de Novembro de 2026  
**Ambiente Alvo:** Supabase Staging (`wsologhmptielhhnbgob`)  
**Engine:** PostgreSQL 17.11 (Supabase Hosted)  
**Status do Ambiente:** Em quarentena estrita (Zero execuções remotas, Zero DDL/DML remotos)  
**Arquivos Originais Preservados:** Sim (100% íntegros, backups criados e hashes inalterados)  
**Novos Arquivos Produzidos:**
- `01B1_midiaos_v260_core_parte2A_corrigido.sql`
- `01B_midiaos_v260_core_parte2_corrigido.sql`

---

## 1. AUDITORIA EXAUSTIVA DAS 23 INSTRUÇÕES `ADD COLUMN` SEM `IF NOT EXISTS`

Todas as 23 instruções que causavam vulnerabilidade ao erro `42701 (duplicate_column)` foram mapeadas detalhadamente, com suas origens históricas, tipos, constraints e correções recomendadas:

| # | Linha (01B1) | Tabela | Coluna | Tipo SQL | Nullable | Default | Constraint / FK | Definição Histórica (Migration Origem) | Compatibilidade Staging | Correção Idempotente Aplicada |
|---|--------------|--------|--------|----------|----------|---------|-----------------|----------------------------------------|-------------------------|-------------------------------|
| 1 | 141 | `produtos` | `formato` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175430_d3519897.sql` (Linha 1) | Coluna já presente (causou erro 42701) | `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS formato TEXT;` |
| 2 | 148 | `agencias` | `website` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 2) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS website TEXT,` |
| 3 | 149 | `agencias` | `instagram` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 3) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS instagram TEXT,` |
| 4 | 150 | `agencias` | `linkedin` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 4) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS linkedin TEXT,` |
| 5 | 151 | `agencias` | `facebook` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 5) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS facebook TEXT;` |
| 6 | 154 | `clientes` | `website` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 8) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS website TEXT,` |
| 7 | 155 | `clientes` | `instagram` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 9) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS instagram TEXT,` |
| 8 | 156 | `clientes` | `linkedin` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 10) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS linkedin TEXT,` |
| 9 | 157 | `clientes` | `facebook` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603175801_2c383449.sql` (Linha 11) | Coluna já presente do histórico | `ADD COLUMN IF NOT EXISTS facebook TEXT;` |
| 10 | 242 | `email_send_log` | `message_id` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603211300_email_infra.sql` (Linha 50) | Infraestrutura de log de e-mail | `ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS message_id TEXT;` |
| 11 | 276 | `email_send_state` | `batch_size` | `INTEGER` | NÃO | `10` | Nenhuma | `20260603211300_email_infra.sql` (Linha 90) | Parâmetro de taxa de disparo | `ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS batch_size INTEGER NOT NULL DEFAULT 10;` |
| 12 | 280 | `email_send_state` | `send_delay_ms` | `INTEGER` | NÃO | `200` | Nenhuma | `20260603211300_email_infra.sql` (Linha 95) | Delay entre disparos | `ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS send_delay_ms INTEGER NOT NULL DEFAULT 200;` |
| 13 | 284 | `email_send_state` | `auth_email_ttl_minutes` | `INTEGER` | NÃO | `15` | Nenhuma | `20260603211300_email_infra.sql` (Linha 100) | TTL de e-mail de autenticação | `ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;` |
| 14 | 288 | `email_send_state` | `transactional_email_ttl_minutes`| `INTEGER` | NÃO | `60` | Nenhuma | `20260603211300_email_infra.sql` (Linha 101) | TTL de e-mail transacional | `ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;` |
| 15 | 599 | `pi_itens` | `mes` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220334_d6b0a5ad.sql` (Linha 4) | Período de veiculação mensal | `ALTER TABLE public.pi_itens ADD COLUMN IF NOT EXISTS mes INTEGER;` |
| 16 | 600 | `pi_itens` | `ano` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220334_d6b0a5ad.sql` (Linha 5) | Período de veiculação anual | `ALTER TABLE public.pi_itens ADD COLUMN IF NOT EXISTS ano INTEGER;` |
| 17 | 617 | `proposta_itens`| `mes` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220613_e1145783.sql` (Linha 4) | Período na proposta | `ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS mes INTEGER;` |
| 18 | 618 | `proposta_itens`| `ano` | `INTEGER` | SIM | Nenhum | Nenhuma | `20260603220613_e1145783.sql` (Linha 5) | Período na proposta | `ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS ano INTEGER;` |
| 19 | 625 | `pis` | `vencimento_tipo` | `TEXT` | SIM | `'manual'` | Nenhuma | `20260603221948_5f6ff2a5.sql` (Linha 2) | Tipo de vencimento comercial | `ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS vencimento_tipo TEXT DEFAULT 'manual';` |
| 20 | 712 | `proposta_itens`| `horario` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603230145_4048be69.sql` (Linha 2) | Horário de inserção comercial | `ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS horario TEXT;` |
| 21 | 715 | `pi_itens` | `horario` | `TEXT` | SIM | Nenhum | Nenhuma | `20260603230145_4048be69.sql` (Linha 3) | Horário de inserção no PI | `ALTER TABLE public.pi_itens ADD COLUMN IF NOT EXISTS horario TEXT;` |
| 22 | 1200 | `pis` | `responsavel_negociacao_id` | `UUID` | SIM | Nenhum | `FK -> profiles(id)` | `20260609232013_d89bc1ed.sql` (Linha 3) | Atribuição de perfil | `ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS responsavel_negociacao_id UUID REFERENCES public.profiles(id);` |
| 23 | 1201 | `pis` | `executivo_execucao_id` | `UUID` | SIM | Nenhum | `FK -> profiles(id)` | `20260609232013_d89bc1ed.sql` (Linha 4) | Atribuição de executivo | `ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS executivo_execucao_id UUID REFERENCES public.profiles(id);` |

---

## 2. AUDITORIA DE IDEMPOTÊNCIA DE DEMAIS INSTRUÇÕES NO LOTE 01B1

A auditoria cobriu 100% das instruções do arquivo:

1. **`CREATE TABLE` (13 instruções):**  
   Todas as 13 instruções utilizam rigorosamente a cláusula `CREATE TABLE IF NOT EXISTS public.<tabela>`.
2. **`CREATE INDEX` (22 instruções):**  
   Todas as 22 instruções utilizam rigorosamente `CREATE INDEX IF NOT EXISTS` ou `CREATE UNIQUE INDEX IF NOT EXISTS`.
3. **`CREATE TRIGGER` (6 instruções):**  
   Todas as 6 instruções são precedidas por `DROP TRIGGER IF EXISTS <trigger> ON public.<tabela>;`.
4. **`CREATE POLICY` (53 instruções):**  
   Todas as 53 instruções de RLS são precedidas por `DROP POLICY IF EXISTS "<politica>" ON public.<tabela>;`.
5. **`ALTER TABLE ADD CONSTRAINT` (5 instruções):**  
   - 1 constraint (`email_send_log_status_check`) encapsulada em bloco `DO $$` com `DROP CONSTRAINT IF EXISTS`.
   - 4 constraints de chaves estrangeiras (`propostas` e `proposta_itens`) encapsuladas em bloco `DO $$` com verificação defensiva `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...')`.
6. **`INSERT INTO` (11 instruções):**  
   - 10 instruções já continham `ON CONFLICT (...) DO NOTHING` ou `ON CONFLICT DO NOTHING`.
   - **Vulnerabilidade identificada e corrigida:** A instrução da Linha 761 (`INSERT INTO public.produto_tipos (nome, midia) VALUES ...`) não possuía cláusula de resolução de conflito. Como a tabela possui `UNIQUE(nome, midia)`, ela dispararia erro `23505 (unique_violation)` em bases onde os tipos padrão já tivessem sido inseridos. Foi adicionada a cláusula `ON CONFLICT (nome, midia) DO NOTHING;`.

---

## 3. INCOMPATIBILIDADES ESTATÍSTICAS E ESTRUTURAIS

Nenhuma incompatibilidade insolúvel ou quebra de chave estrangeira foi encontrada:
- Todos os tipos de dados conferem exatamente com os esquemas históricos.
- Todas as colunas sem valor padrão aceitam `NULL`, prevenindo falhas de preenchimento em tabelas com registros já existentes.
- As quatro colunas com `NOT NULL` (`batch_size`, `send_delay_ms`, `auth_email_ttl_minutes`, `transactional_email_ttl_minutes`) possuem valores `DEFAULT` expressos, permitindo aplicação imediata e sem erro em linhas preexistentes.
- As referências de chave estrangeira (`REFERENCES public.profiles(id)`) apontam para a tabela central `public.profiles`, cuja integridade já foi consolidada e homologada no lote `01A`.

---

## 4. INTEGRIDADE BINÁRIA E HASHEAMENTO (SHA-256)

### 4.1. Diretório de Backups
Todos os arquivos originais foram copiados com timestamp e preservação de metadados para:  
`d:\midiaos_build\PACOTE_IMPLANTACAO_STAGING\backup_pre_corrigido\`

### 4.2. Tabela de Hashes e Recomposição Binária

| Arquivo | Papel / Descrição | Tamanho (Bytes) | Linhas | SHA-256 |
|---------|-------------------|-----------------|--------|---------|
| `01B1_midiaos_v260_core_parte2A.sql` | **ORIGINAL (Preservado e Intocado)** | 53.786 | 1.206 | `cd2c50b0d1306d084b942f6c23316ac219c4867805e44426c911e8bb2d878c67` |
| `01B1_midiaos_v260_core_parte2A_corrigido.sql` | **CORRIGIDO (Pronto para Staging)** | 54.146 | 1.207 | `99d0ca382a39a708f56b3ef2172e852175c0d05820174d371a0381dc8effab01` |
| `01B2_midiaos_v260_core_parte2B.sql` | **PARTE B (Intocada e Idêntica)** | 54.623 | 1.320 | `550046949817c3653d3075bea7931372f81397478cae8c496c3a9ebe3547ab7a` |
| `01B_midiaos_v260_core_parte2.sql` | **MONOLÍTICO ORIGINAL (Preservado)** | 108.409 | 2.526 | `afaadd46af3744cab6a6aca0ae8b1f48e9bc741c5e74e1d798c68f8da10cb276` |
| `01B_midiaos_v260_core_parte2_corrigido.sql` | **MONOLÍTICO CORRIGIDO** | 108.769 | 2.527 | `984904fdfb9e2c35d4158300504b06a0a186a2cc8fc04daa76fdb1c6cdb1b75f` |

### 4.3. Prova Matemática de Recomposição Binária
A recomposição binária foi comprovada via hash e comparação de bytes:
$$\text{bytes}(\text{01B1\_corrigido}) + \text{bytes}(\text{01B2\_intocado}) \equiv \text{bytes}(\text{01B\_corrigido})$$
- Teste booleano em Python: `(b1_corr_bytes + b2_raw) == b_corr_bytes` $\to$ **`True`**.
- Preservação rigorosa de quebras de linha padrão Windows CRLF (`\r\n`).

---

## 5. RESULTADOS DOS TESTES ESTÁTICOS E AUDITORIA

> [!NOTE]
> Conforme a Regra Obrigatória nº 10, **estes testes são estáticos, sintáticos e simulações analíticas de idempotência**, e **NÃO** constituem homologação em instância PostgreSQL 17.11 física (já que não executamos comandos no banco remoto).

1. **Balanceamento Sintático de Delimitadores:**
   - Delimitadores de Dollar-Quoting (`$$`): 54 ocorrências (27 pares exatos, balanceamento perfeito).
   - Blocos `DO $$`: 21 aberturas e 21 fechamentos `END $$;` no lote `01B1`.
   - Parênteses fora de strings e comentários: 366 `(` e 366 `)` (100% balanceados).
   - Aspas simples e duplas: todas em pares válidos.
2. **Auditoria de Diff Semântico:**
   - O diff entre a versão original e a versão corrigida do `01B1` contém exatamente **25 linhas modificadas**, correspondentes estritamente às 23 adições de `IF NOT EXISTS`, à cláusula `ON CONFLICT` em `produto_tipos` e à preservação de quebra de linha. Nenhuma instrução adicional foi inserida, movida ou suprimida.
3. **Idempotência Garantida:**
   - Toda e qualquer execução subsequente deste script poderá rodar com segurança tanto em banco vazio quanto em banco com objetos pré-existentes sem disparar os erros `42701 (duplicate_column)`, `42710 (duplicate_object)` ou `23505 (unique_violation)`.

---

## 6. RISCOS REMANESCENTES E PARECER DE LIBERAÇÃO

### 6.1. Riscos Remanescentes
- **Lote 01B2:** O lote `01B2_midiaos_v260_core_parte2B.sql` permaneceu intocado nesta etapa (conforme exigido pela especificação). Ele já possui proteções `ADD COLUMN IF NOT EXISTS` para as colunas SaaS da tabela `public.tenants` (implementadas e auditadas na etapa anterior). Quando chegar o momento de executar o 01B2, deverá ser mantida a mesma atenção a comandos `ALTER TABLE`.
- **Foreign Keys em Tabelas Vazia vs Populada:** Caso o Staging possua registros órfãos em tabelas filhas que violem FKs, as constraints poderiam falhar; no entanto, todas as tabelas criadas no 01B1 são tabelas novas ou colunas novas sem dados obrigatórios, minimizando qualquer risco de violação relacional.

### 6.2. Parecer Técnico de Liberação
O arquivo [`01B1_midiaos_v260_core_parte2A_corrigido.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B1_midiaos_v260_core_parte2A_corrigido.sql) está **HOMOLOGADO ESTRUTURALMENTE E TECNICAMENTE APTO** para ser submetido à execução manual no Supabase Staging (`wsologhmptielhhnbgob`), sanando de forma definitiva a interrupção do incidente 42701.

> [!IMPORTANT]
> **DECLARAÇÃO DE CONFORMIDADE RIGOROSA:**  
> 1. **NÃO conectamos** ao Supabase nem executamos comandos SQL remotos.
> 2. **NÃO modificamos** os arquivos originais (`01A`, `01B1`, `01B2`, `01B`, `01C1`, `01C2` originais permanecem estritamente preservados com seus backups).
> 3. Paramos a execução neste ponto e aguardamos as instruções e autorização expressa do usuário.

