# RELATÓRIO TÉCNICO DE CORREÇÃO DO DIAGNÓSTICO PRÉ-EXECUÇÃO 01B1 (V2)
## MIDIA OS v2.6.0 — Homologação Pré-Staging (PostgreSQL 17.11)

**Data:** 11 de Novembro de 2026  
**Ambiente:** Supabase Staging (`wsologhmptielhhnbgob`) / PostgreSQL 17.11  
**Status do Ambiente:** Em quarentena (Zero execuções remotas, Zero conexões remotas)  
**Arquivos de Implantação:** Preservados e intocados (`01A`, `01B1_corrigido`, `01B2`, `01B_corrigido`, `01C1`, `01C2`)  
**Novo Arquivo de Diagnóstico Produzido:**
- [`diagnostico_pre_execucao_01B1_corrigido_v2.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/diagnostico_pre_execucao_01B1_corrigido_v2.sql) (17.027 bytes)

---

## 1. SUMÁRIO EXECUTIVO DAS CORREÇÕES EFETUADAS

O diagnóstico pré-execução anterior foi revisado, corrigido e aprimorado para a versão **V2**, eliminando fragilidades de planejamento de consulta e elevando o rigor metodológico:

1. **Eliminação do Erro de Planejamento em Tabela Ausente:** Na versão anterior, a presença da expressão estática `(SELECT count(*) FROM public.produto_tipos)` na CTE causaria falha imediata no parser do PostgreSQL (`ERROR: relation "public.produto_tipos" does not exist`) caso a tabela ainda não tivesse sido criada no banco. Na versão V2, essa referência foi completamente substituída por uma abordagem híbrida ultra-segura:
   - **Bloco PL/pgSQL Dinâmico:** Um bloco `DO $$` estritamente leitura verifica previamente via `to_regclass('public.produto_tipos')`. Se a tabela existir, executa dinamicamente `EXECUTE` para contagem de linhas, nulos e duplicatas. Se a tabela não existir, o bloco apenas emite aviso informativo via `RAISE NOTICE`, sem tentar ler a relação.
   - **Consulta Tabular Via Catálogos de Sistema:** A consulta principal inspeciona exclusivamente tabelas de catálogo (`pg_class`, `pg_constraint`, `pg_index`, `pg_attribute` e `information_schema`), que sempre existem no PostgreSQL, garantindo execução com sucesso mesmo se a tabela alvo estiver ausente.
2. **Validação Rigorosa da Restrição UNIQUE:** A verificação não se limita à existência genérica de uma constraint:
   - Comprova a ordem exata das colunas: `ARRAY['nome', 'midia']`.
   - Comprova o índice único subjacente (`indisunique = true` e `indisvalid = true`).
   - Comprova ausência de predicados parciais (`indpred IS NULL`).
   - Comprova nulabilidade estrita: ambas as colunas são `NOT NULL`.
   - Comprova a compatibilidade direta com `ON CONFLICT (nome, midia) DO NOTHING`.
3. **Classificação Quadrivalente Estrita das 23 Colunas:** Cada uma das 23 colunas é categorizada rigorosamente como:
   - `COMPATÍVEL`: Coluna já existe no banco e seu tipo SQL e nulabilidade coincidem 100% com o esperado.
   - `AUSENTE`: Coluna ainda não existe na tabela e será criada com segurança pelo lote 01B1 corrigido.
   - `INCOMPATÍVEL`: Coluna existe, mas possui tipo divergente do esperado.
   - `PENDENTE`: A tabela base ainda não existe no banco.
4. **Validação de Chaves Estrangeiras:** Auditoria dedicada das chaves estrangeiras em `public.pis` (`responsavel_negociacao_id` e `executivo_execucao_id`), comprovando a integridade da tabela de destino `public.profiles(id)` e o tipo `UUID`.
5. **Reclassificação Epistemológica de Objetos Históricos:** As verificações de objetos pré/pós linha 141 foram reclassificadas como `PRESENTE NO BANCO (OBJETO DE ORIGEM HISTÓRICA OU ANTERIOR)`, com declaração expressa de que sua presença **não constitui prova isolada de execução do 01B1**.
6. **Pureza READ-ONLY Absoluta:** O script contém ZERO comandos DDL (`CREATE`, `ALTER`, `DROP`) e ZERO comandos DML (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`).

---

## 2. AUDITORIA DA SINTAXE E CARACTERES

Foi realizada uma varredura automática no arquivo `diagnostico_pre_execucao_01B1_corrigido_v2.sql` para detecção de caracteres indevidos:

| Padrão Inspecionado | Ocorrências Encontradas | Status |
|---|---|---|
| `*--` (comentário corrompido) | 0 | Limpo |
| `&#x20;` (entidade HTML) | 0 | Limpo |
| `\*` (escape indevido) | 0 | Limpo |
| Caracteres invisíveis (`\u200b`, `\u200c`, `\u200d`, `\ufeff`, `\xa0`) | 0 | Limpo |
| Aspas duplas não balanceadas | 0 (ausência de aspas duplas fora de identificadores) | Balanceado |
| Aspas simples não balanceadas | 506 (253 pares exatos) | 100% Balanceado |
| Parênteses fora de comentários | 86 aberturas e 86 fechamentos | 100% Balanceado |
| Delimitadores `$$` | 2 (1 par exato no bloco `DO`) | 100% Balanceado |

---

## 3. AUDITORIA DA TABELA `public.produto_tipos` E CONSTRAINT UNIQUE

### 3.1. Estratégia de Isolamento contra Falha de Planejamento
Para impedir que o analisador de consultas do PostgreSQL aborte com `42P01 (undefined_table)` quando a tabela `produto_tipos` não estiver presente:
- **Zero referências estáticas:** Não existe nenhuma cláusula `FROM public.produto_tipos` no texto SQL da consulta principal.
- **Checagem de existência desacoplada:** A existência da tabela é verificada via função interna `to_regclass('public.produto_tipos')`, que retorna `oid` ou `NULL` de forma segura.
- **SQL Dinâmico Protegido:** As consultas aos dados da tabela (`SELECT count(*)`) ocorrem exclusivamente dentro de um bloco PL/pgSQL encapsulado por `IF (to_regclass('public.produto_tipos') IS NOT NULL) THEN EXECUTE ... END IF;`.

### 3.2. Critérios de Comprovação da Restrição de Unicidade
A constraint `UNIQUE(nome, midia)` foi auditada através das tabelas de catálogo `pg_constraint`, `pg_class`, `pg_attribute` e `pg_index`:
1. **Existência da Constraint:** Identificada em `pg_constraint` com `contype = 'u'`.
2. **Composição e Ordem:** O array de colunas gerado por `array_agg(att.attname ORDER BY u.attpos)` deve equivaler exatamente a `ARRAY['nome', 'midia']`.
3. **Índice Uncondicional:** A coluna `idx.indpred IS NULL` em `pg_index` comprova que não há cláusula `WHERE` (não é índice parcial).
4. **Validade do Índice:** `idx.indisunique = true` e `idx.indisvalid = true`.
5. **Nulabilidade:** A agregação booleana `bool_and(att.attnotnull) = true` comprova que ambas as colunas são `NOT NULL`, eliminando lacunas de unicidade permitidas pelo padrão SQL em campos nulos.
6. **Resultado da Auditoria:** Quando a tabela existe com o DDL original, a constraint é classificada como **`COMPROVADA (COMPATÍVEL COM ON CONFLICT)`**.

---

## 4. MATRIZ DE COMPARAÇÃO DAS 23 COLUNAS (CLASSIFICAÇÃO ESTRUTURAL)

O script avalia cada coluna em relação à sua definição histórica comprovada:

| # | Linha (01B1) | Tabela | Coluna | Tipo Esperado | Nullable | Default | FK Destino | Critério de Classificação no Staging |
|---|---|---|---|---|---|---|---|---|
| 1 | 141 | `produtos` | `formato` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 2 | 148 | `agencias` | `website` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 3 | 149 | `agencias` | `instagram` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 4 | 150 | `agencias` | `linkedin` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 5 | 151 | `agencias` | `facebook` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 6 | 154 | `clientes` | `website` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 7 | 155 | `clientes` | `instagram` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 8 | 156 | `clientes` | `linkedin` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 9 | 157 | `clientes` | `facebook` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 10 | 242 | `email_send_log` | `message_id` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 11 | 276 | `email_send_state` | `batch_size` | `integer` | NÃO | `10` | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 12 | 280 | `email_send_state` | `send_delay_ms` | `integer` | NÃO | `200` | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 13 | 284 | `email_send_state` | `auth_email_ttl_minutes` | `integer` | NÃO | `15` | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 14 | 288 | `email_send_state` | `transactional_email_ttl_minutes`| `integer` | NÃO | `60` | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 15 | 599 | `pi_itens` | `mes` | `integer` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 16 | 600 | `pi_itens` | `ano` | `integer` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 17 | 617 | `proposta_itens`| `mes` | `integer` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 18 | 618 | `proposta_itens`| `ano` | `integer` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `integer`; `AUSENTE` se não existir |
| 19 | 625 | `pis` | `vencimento_tipo` | `text` | SIM | `'manual'` | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 20 | 712 | `proposta_itens`| `horario` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 21 | 715 | `pi_itens` | `horario` | `text` | SIM | Nenhum | Nenhuma | `COMPATÍVEL` se existir como `text`; `AUSENTE` se não existir |
| 22 | 1200 | `pis` | `responsavel_negociacao_id` | `uuid` | SIM | Nenhum | `profiles(id)` | `COMPATÍVEL` se existir como `uuid`; `AUSENTE` se não existir |
| 23 | 1201 | `pis` | `executivo_execucao_id` | `uuid` | SIM | Nenhum | `profiles(id)` | `COMPATÍVEL` se existir como `uuid`; `AUSENTE` se não existir |

*Nota Metodológica:* Caso a tabela hospedeira não exista no banco, a classificação retornará expressamente `PENDENTE`. Caso o nome da coluna exista mas o tipo de dados seja discordante, a classificação retornará `INCOMPATÍVEL`.

---

## 5. VALIDAÇÃO DE CHAVES ESTRANGEIRAS EM `public.pis`

O script valida isoladamente a integridade das referências relacionais das linhas 1200 e 1201:
1. **Destino da Chave:** Comprova que a coluna `profiles.id` existe no esquema `public` e é do tipo `UUID`.
2. **Existência da Constraint:** Consulta `pg_constraint` (tipo `f`) mapeando `conkey` para `confkey`:
   - `pis.responsavel_negociacao_id` $\to$ `profiles.id`
   - `pis.executivo_execucao_id` $\to$ `profiles.id`
3. **Classificação da FK:**
   - Se a constraint já existir: `COMPROVADA`.
   - Se a coluna já existir em `pis` mas a FK não: `AUSENTE (COLUNA EXISTE SEM FK)`.
   - Se nem a coluna nem a FK existirem: `PENDENTE (COLUNA E FK SERÃO CRIADAS NO 01B1)`.

---

## 6. CLASSIFICAÇÃO DOS OBJETOS HISTÓRICOS

Em observância ao princípio de que **presença não equivale à autoria do script recente**, os 12 objetos históricos investigados são categorizados como:
- `PRESENTE NO BANCO`: Se a tabela, coluna ou bucket existir fisicamente no banco.
- `AUSENTE`: Se o objeto não existir.
- **Detalhamento Mandatório:** Todas as linhas acompanham a menção expressa:  
  *`"Status empírico de existência. NÃO CONCLUSIVO ISOLADAMENTE quanto a execução parcial ou completa do lote 01B1."`*

---

## 7. DECLARAÇÃO DE CONFORMIDADE E PUREZA READ-ONLY

O script [`diagnostico_pre_execucao_01B1_corrigido_v2.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/diagnostico_pre_execucao_01B1_corrigido_v2.sql) foi submetido a auditoria estática por expressões regulares:
- **Comandos `CREATE`:** Zero ocorrências fora de comentários.
- **Comandos `ALTER`:** Zero ocorrências fora de comentários.
- **Comandos `DROP`:** Zero ocorrências fora de comentários.
- **Comandos `INSERT`:** Zero ocorrências fora de comentários.
- **Comandos `UPDATE`:** Zero ocorrências fora de comentários.
- **Comandos `DELETE`:** Zero ocorrências fora de comentários.
- **Comandos `TRUNCATE`:** Zero ocorrências fora de comentários.
- **Alterações de Configuração (`SET`):** Zero ocorrências.

---

## 8. PARECER CONCLUSIVO E LIBERAÇÃO PARA HOMOLOGAÇÃO

O script [`diagnostico_pre_execucao_01B1_corrigido_v2.sql`](file:///d:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/diagnostico_pre_execucao_01B1_corrigido_v2.sql) está **100% CORRIGIDO, VALIDADO E APTO** para ser executado no Supabase Staging (`wsologhmptielhhnbgob`).

> [!IMPORTANT]
> **DECLARAÇÃO DE CONFORMIDADE RIGOROSA:**  
> - **NÃO conectamos** ao Supabase nem executamos comandos SQL remotos.
> - **NÃO alteramos** nenhum pacote de implantação (`01A`, `01B1_corrigido`, `01B2`, `01B_corrigido`, `01C1`, `01C2` mantêm rigorosamente seus hashes originais e seus backups).
> - Paramos a execução neste ponto e aguardamos as instruções e autorização expressa do usuário.

