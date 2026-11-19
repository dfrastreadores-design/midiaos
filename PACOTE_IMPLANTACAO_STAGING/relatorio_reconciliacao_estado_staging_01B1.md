# RELATÓRIO TÉCNICO DE RECONCILIAÇÃO DO ESTADO REAL DO STAGING
## Incidente SQL 42701 (`produtos.formato`) e Desmistificação da Classificação Pós-Falha

**Data:** 11 de Novembro de 2026  
**Ambiente Auditado:** Supabase Staging (`wsologhmptielhhnbgob`)  
**Engine:** PostgreSQL 17.11 (Supabase Hosted)  
**Arquivo em Análise:** `01B1_midiaos_v260_core_parte2A.sql` (1.206 linhas, 67.896 bytes)  
**Status do Ambiente:** Em quarentena investigativa (Zero execuções remotas, Zero DDL/DML aplicados)

---

## 1. SUMÁRIO EXECUTIVO

1. **Origem da Inconsistência:** O teste pós-falha anterior (`diagnostico_pos_falha_01B1.sql`) emitiu um parecer de "EXECUÇÃO COMPLETA" porque encontrou a tabela `public.briefings` (linha 1.070 do arquivo `01B1`) presente no banco Staging, presumindo falsamente que a base Staging era uma "tábula rasa" (base limpa).
2. **Descoberta Empírica Fundamental:** Uma investigação minuciosa no repositório de migrações (`d:\midiaos_build\supabase\migrations\`) revelou que **todos os 16 objetos investigados (anteriores e posteriores à linha 141) já haviam sido criados em migrações históricas entre 28 de maio de 2026 e 16 de junho de 2026**.
3. **Mecânica da Falha:** O banco Staging já possuía a infraestrutura dessas migrações passadas. Quando o script `01B1` atingiu a linha 141 (`ALTER TABLE public.produtos ADD COLUMN formato TEXT;`), o PostgreSQL disparou `ERROR: 42701 (duplicate_column)` justamente porque a coluna `formato` **já existia** (criada na migration `20260603175430_d3519897-2cd0-4afe-a18c-300079022753.sql`).
4. **Veredito de Classificação:** A classificação "EXECUÇÃO COMPLETA" foi um **falso-positivo metodológico**. O lote `01B1` **NÃO** foi executado com sucesso até o fim: ele foi abortado na linha 141 pelo PostgreSQL. A presença de `briefings`, `permuta_recebimentos` e `pi_financeiro` decorre exclusivamente de migrações legadas aplicadas no Staging em ciclos anteriores.

---

## 2. RECONSTRUÇÃO HISTÓRICA DOS 16 OBJETOS INVESTIGADOS

Todos os 16 objetos inspecionados tiveram sua certidão de nascimento localizada nos arquivos de migração históricos do MIDIA OS:

| # | Objeto Inspecionado | Tipo | Arquivo de Origem Histórica | Timestamp Original | Linha no 01B1 | Status Staging | Divergência de DDL (Histórico vs 01B1) |
|---|---------------------|------|-----------------------------|--------------------|---------------|----------------|----------------------------------------|
| 1 | `pi_anexos` | Tabela | `20260528161435_791132c9-d269-4a4f-8472-da41964cdda3.sql` | 28/05/2026 16:14 | Linha 4 | PRESENTE | Nenhuma (14 colunas idênticas, 3 índices, 1 trigger, 4 RLS) |
| 2 | `pi_assinaturas_cliente` | Tabela | `20260602142716_f238850e-c99a-4089-aa1e-ba3fe26ed429.sql` | 02/06/2026 14:27 | Linha 91 | PRESENTE | Nenhuma (12 colunas idênticas, 2 índices, 3 RLS) |
| 3 | `profiles.assinatura_url` | Coluna | `20260602142716_f238850e-c99a-4089-aa1e-ba3fe26ed429.sql` | 02/06/2026 14:27 | Linha 89 | PRESENTE | Nenhuma (`TEXT`, idempotente com `IF NOT EXISTS`) |
| 4 | `pi-anexos` | Storage Bucket | `20260528161435_791132c9-d269-4a4f-8472-da41964cdda3.sql` | 28/05/2026 16:14 | Linha 71 | PRESENTE | Nenhuma (`ON CONFLICT (id) DO NOTHING`, 3 RLS storage) |
| 5 | `briefings` | Tabela | `20260609204318_0af69e30-8c4b-490f-ae42-8eacf5a3169e.sql` | 09/06/2026 20:43 | Linha 1070 | PRESENTE | Nenhuma (17 colunas idênticas, 1 trigger, 5 RLS) |
| 6 | `permuta_recebimentos` | Tabela | `20260603212627_794150de-68c1-482f-a983-6403444ab997.sql` | 03/06/2026 21:26 | Linha 481 | PRESENTE | Nenhuma (10 colunas idênticas, 1 trigger, RLS ativo) |
| 7 | `permuta_saldos` | Tabela | `20260603212627_794150de-68c1-482f-a983-6403444ab997.sql` | 03/06/2026 21:26 | Linha 495 | PRESENTE | Nenhuma (4 colunas idênticas, coluna gerada `STORED`) |
| 8 | `pi_financeiro` | Tabela | `20260608194837_71cc9450-00bf-4798-9449-a38fd347415d.sql` | 08/06/2026 19:48 | Linha 892 | PRESENTE | Nenhuma (13 colunas idênticas, 3 índices, RLS ativo) |
| 9 | `produto_tipos` | Tabela | `20260603230647_9aa18d95-2eac-4fc2-95b2-d06cf1c3b41b.sql` | 03/06/2026 23:06 | Linha 725 | PRESENTE | Nenhuma (6 colunas idênticas, UNIQUE(nome, midia), 1 RLS) |
| 10 | `sync_cnpj_log` | Tabela | `20260609133650_0c275617-1512-4bd4-8dd5-f235e9650fac.sql` | 09/06/2026 13:36 | Linha 984 | PRESENTE | Nenhuma (9 colunas idênticas, 1 índice, 1 RLS) |
| 11 | `tarefas` | Tabela | `20260609150028_d5a28c95-3ad7-48a5-82cc-1b54bb1ad70f.sql` | 09/06/2026 15:00 | Linha 1011 | PRESENTE | Nenhuma (16 colunas idênticas, 1 índice, 1 trigger, 1 RLS) |
| 12 | `agencias.website` | Coluna | `20260603175801_2c383449-8482-44e7-baff-bb6d62a2b935.sql` | 03/06/2026 17:58 | Linha 148 | PRESENTE | Nenhuma (`TEXT`, adicionada junto a instagram/linkedin/facebook) |
| 13 | `clientes.website` | Coluna | `20260603175801_2c383449-8482-44e7-baff-bb6d62a2b935.sql` | 03/06/2026 17:58 | Linha 154 | PRESENTE | Nenhuma (`TEXT`, adicionada junto a instagram/linkedin/facebook) |
| 14 | `produtos.formato` | Coluna | `20260603175430_d3519897-2cd0-4afe-a18c-300079022753.sql` | 03/06/2026 17:54 | Linha 141 | PRESENTE (Gatilho 42701) | Nenhuma (`TEXT`, sem `IF NOT EXISTS` tanto na migration quanto no 01B1) |
| 15 | `produtos.link_modelo` | Coluna | `20260608140829_313d1d8a-c1f1-473f-8dae-aef5e65cfaf8.sql` | 08/06/2026 14:08 | Linha 813 | PRESENTE | Nenhuma (`TEXT`, com `IF NOT EXISTS`) |
| 16 | `produtos.requer_producao`| Coluna | `20260608214934_6c84ce58-8c7e-44aa-a896-3bb05a34e0f1.sql` | 08/06/2026 21:49 | Linha 975 | PRESENTE | Nenhuma (`BOOLEAN NOT NULL DEFAULT false`, com `IF NOT EXISTS`) |

---

## 3. MECÂNICA TRANSACIONAL E ANÁLISE DO DIAGNÓSTICO FALHO

### 3.1. Por que o diagnóstico anterior falhou?
O script `diagnostico_pos_falha_01B1.sql` adotava a seguinte heurística ingênua:
```sql
CASE 
  WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'briefings')
    THEN 'EXECUÇÃO COMPLETA: O script 01B1 chegou até o final (linha 1070).'
  ELSE 'EXECUÇÃO PARCIAL OU ROLLBACK'
END
```
**Premissa errada:** O teste assumiu que `public.briefings` só poderia existir no banco se o script `01B1` o tivesse acabado de criar.  
**Fato real:** `public.briefings` já existia no banco Staging desde a execução da migration `20260609204318_0af69e30-8c4b-490f-ae42-8eacf5a3169e.sql` em sprints de homologação anteriores.  
Portanto, a presença de `briefings` **não constitui prova** de que o lote `01B1` concluiu com sucesso.

### 3.2. Comportamento do PostgreSQL e Supabase SQL Editor
1. **Multi-statement batch sem BEGIN/COMMIT:**
   - No PostgreSQL padrão via `PQexec` (protocolo simples, utilizado pelo SQL Editor do Supabase para enviar blocos de script), comandos múltiplos enviados em uma única string rodam dentro de uma **transação implícita única** (`implicit transaction block`).
   - Quando a instrução da Linha 141 falhou com `ERROR: 42701 (duplicate_column)`, o PostgreSQL abortou o bloco de comandos imediatamente. Todas as instruções subsequentes naquele batch deixaram de ser executadas (`ERROR: current transaction is aborted, commands ignored until end of transaction block`).
   - Quaisquer modificações efetuadas na mesma conexão dentro do bloco transacional abortado sofreram **rollback**.
2. **Por que os objetos continuam lá?**
   - Como os objetos foram criados em transações anteriores e commitadas semanas atrás durante migrações históricas, o rollback do lote `01B1` não os afetou.
   - Assim, a base permaneceu exatamente como estava antes da tentativa de rodar o `01B1`.

---

## 4. ANÁLISE EXAUSTIVA DOS COMANDOS ALTER TABLE NO LOTE 01B1

Uma varredura completa no arquivo `01B1_midiaos_v260_core_parte2A.sql` identificou **44 adições de coluna** via `ALTER TABLE`.

### 4.1. Distribuição de Idempotência
- **Colunas com `IF NOT EXISTS` (Idempotentes / Seguras):** **21 colunas**
- **Colunas SEM `IF NOT EXISTS` (Vulneráveis ao erro 42701 em bases existentes):** **23 colunas**

### 4.2. Relação das 23 Colunas Vulneráveis (Sem `IF NOT EXISTS`)
Se o lote `01B1` fosse executado novamente apenas corrigindo a linha 141, ele quebraria logo em seguida na linha 148, e assim sucessivamente em cada uma das seguintes linhas:

1. **Linha 141:** `ALTER TABLE public.produtos ADD COLUMN formato TEXT;` *(Ponto de falha atual)*
2. **Linha 148:** `ALTER TABLE public.agencias ADD COLUMN website TEXT;`
3. **Linha 149:** `ALTER TABLE public.agencias ADD COLUMN instagram TEXT;`
4. **Linha 150:** `ALTER TABLE public.agencias ADD COLUMN linkedin TEXT;`
5. **Linha 151:** `ALTER TABLE public.agencias ADD COLUMN facebook TEXT;`
6. **Linha 154:** `ALTER TABLE public.clientes ADD COLUMN website TEXT;`
7. **Linha 155:** `ALTER TABLE public.clientes ADD COLUMN instagram TEXT;`
8. **Linha 156:** `ALTER TABLE public.clientes ADD COLUMN linkedin TEXT;`
9. **Linha 157:** `ALTER TABLE public.clientes ADD COLUMN facebook TEXT;`
10. **Linha 242:** `ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;`
11. **Linha 276:** `ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;`
12. **Linha 280:** `ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;`
13. **Linha 284:** `ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;`
14. **Linha 288:** `ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;`
15. **Linha 599:** `ALTER TABLE public.pi_itens ADD COLUMN mes INTEGER;`
16. **Linha 600:** `ALTER TABLE public.pi_itens ADD COLUMN ano INTEGER;`
17. **Linha 617:** `ALTER TABLE public.proposta_itens ADD COLUMN mes INTEGER;`
18. **Linha 618:** `ALTER TABLE public.proposta_itens ADD COLUMN ano INTEGER;`
19. **Linha 625:** `ALTER TABLE public.pis ADD COLUMN vencimento_tipo TEXT DEFAULT 'manual';`
20. **Linha 712:** `ALTER TABLE public.proposta_itens ADD COLUMN horario TEXT;`
21. **Linha 715:** `ALTER TABLE public.pi_itens ADD COLUMN horario TEXT;`
22. **Linha 1200:** `ALTER TABLE public.pis ADD COLUMN responsavel_negociacao_id UUID REFERENCES public.profiles(id);`
23. **Linha 1201:** `ALTER TABLE public.pis ADD COLUMN executivo_execucao_id UUID REFERENCES public.profiles(id);`

---

## 5. AVALIAÇÃO DAS HIPÓTESES SOBRE O ESTADO DO STAGING

- **Hipótese A (Staging com histórico prévio):** O banco Staging já possuía todas essas tabelas e colunas criadas por migrations históricas de maio/junho de 2026. **-> COMPROVADA**. Todos os 16 objetos batem 100% com as migrations do repositório.
- **Hipótese B (Execução parcial abortada no erro 42701):** O lote `01B1` rodou até a linha 141, disparou erro 42701 e abortou o restante do script. Os objetos posteriores já estavam presentes no banco por conta da Hipótese A. **-> COMPROVADA**. É o comportamento padrão do motor PostgreSQL em chamadas SQL via API/Editor.
- **Hipótese C (Execução com autocommit por instrução e sucesso posterior):** O motor teria ignorado o erro 42701 e continuado executando as linhas 142 a 1206. **-> DESCARTADA**. Se houvesse autocommit por instrução e o script continuasse, a linha 148 (`ALTER TABLE public.agencias ADD COLUMN website TEXT;`) teria disparado o mesmo erro 42701 imediatamente, pois a coluna `agencias.website` também já existe! Como o erro reportado foi unicamente na linha 141, a execução parou na linha 141.

---

## 6. SCRIPT DE DIAGNÓSTICO RECONCILIADO

Foi criado o script [`diagnostico_reconciliacao_01B1.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/diagnostico_reconciliacao_01B1.sql):
- **Natureza:** 100% Leitura (`SELECT`/`WITH` apenas, sem `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE` ou `DELETE`).
- **Eliminação de Falso-Positivo:** Classifica objetos como `PRESENTE (ORIGEM INDETERMINADA: MIGRATION HISTÓRICA OU 01B1)`.
- **Mapeamento:** Inspeciona as 9 tabelas, o bucket de storage e as 27 colunas adicionadas por `ALTER TABLE` (incluindo as 23 sem `IF NOT EXISTS`).

---

## 7. RECOMENDAÇÃO DE CORREÇÃO FUTURA (QUANDO AUTORIZADO)

Para que o lote `01B1` se torne **verdadeiramente idempotente** e seguro para rodar em bancos que já possuam migrations prévias (como o Staging atual ou uma réplica de Produção), será necessário aplicar a cláusula `IF NOT EXISTS` em todas as 23 adições de coluna listadas na Seção 4.2.

> [!IMPORTANT]
> **DECLARAÇÃO DE CONFORMIDADE RIGOROSA:**  
> Em cumprimento às regras do usuário:
> 1. **NÃO conectamos** a nenhum banco remoto.
> 2. **NÃO executamos** comandos SQL no Supabase.
> 3. **NENHUM arquivo de implantação foi alterado** (`01A`, `01B1`, `01B2`, `01C1`, `01C2` permanecem rigorosamente idênticos e intocados).
> 4. Todas as investigações foram efetuadas em modo estritamente analítico e local.

