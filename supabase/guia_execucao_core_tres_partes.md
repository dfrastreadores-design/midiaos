# Guia Operacional — Implantação do Core Schema em Três Partes Sequenciais

**Data:** 10/11/2026  
**Ambiente Exclusivo Autorizado:** Supabase STAGING  
**Project ID Autorizado:** `wsologhmptielhhnbgob`  
**URL do Dashboard:** `https://supabase.com/dashboard/project/wsologhmptielhhnbgob/sql`  
**Produção BLOQUEADA:** `tvniawyweymutjiybxyo` (`midiaos.online`)  

---

> [!CAUTION]
> **REGRAS DE SEGURANÇA E RESTRIÇÕES ABSOLUTAS:**
> 1. **CONFIRMAÇÃO VISUAL OBRIGATÓRIA**: Verifique o Project ID `wsologhmptielhhnbgob` no canto superior esquerdo do painel do Supabase antes de rodar qualquer consulta.
> 2. **PROIBIDO ACESSAR PRODUÇÃO**: Não conecte, consulte ou execute comandos no projeto `tvniawyweymutjiybxyo`.
> 3. **PROIBIDA EXECUÇÃO AUTOMÁTICA**: A execução deve ser estritamente manual pelo responsável técnico através do SQL Editor autenticado.
> 4. **PROIBIDO AVANÇAR PARA ETAPAS POSTERIORES**: Não execute `02_midiaos_v260_post_migrations.sql`, Prospect, workers ou triggers de mensageria real.
> 5. **NUNCA PRESUMIR ROLLBACK INTEGRAL**: Se uma parte falhar no meio, as instruções anteriores podem ter sido comitadas.

---

## 1. Identificação Criptográfica dos Arquivos (Hardened SaaS v2.6.0)

Cada parte possui tamanho inferior a 103 KB para prevenir qualquer truncamento pelo navegador ou buffer de clipboard:

| Ordem | Arquivo | Tamanho | Linhas | Hash SHA-256 Oficial | Status |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **1ª** | [`01A_midiaos_v260_core_parte1.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01A_midiaos_v260_core_parte1.sql) | **104.634 B** (102,18 KB) | 2.449 | `04904283B7A7FF5243937355C7EC2688FFBD8E4826561CE2196C9A634290A954` | **EXECUTADA** |
| **Diag 1** | [`01A_diagnostico_pos_execucao_parte1.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01A_diagnostico_pos_execucao_parte1.sql) | **12.697 B** (12,40 KB) | 338 | `D4CEAE97715512154EECAC1AF8EC5470ED79531D2EF492E5153178856111613E` | **DISPONÍVEL** |
| **2ª** | [`01B_midiaos_v260_core_parte2.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B_midiaos_v260_core_parte2.sql) | **102.315 B** (99,92 KB) | 2.449 | `A4E7566B86CE99B49FBD273CFB8ECFC221AA79490163D47DCA42837E0FD5796E` | **PRONTA P/ EXECUÇÃO** |
| **Diag 2** | [`01B_diagnostico_pos_execucao_parte2.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B_diagnostico_pos_execucao_parte2.sql) | **9.012 B** (8,80 KB) | 200 | `32A1F0703AAF2EDC98DB9E127A5CE16014FA8E8B586761E2301EC0AA2027734E` | **DISPONÍVEL** |
| **3ª** | [`01C_midiaos_v260_core_parte3.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01C_midiaos_v260_core_parte3.sql) | **100.929 B** (98,56 KB) | 2.254 | `E5EECCBBCD51D02C814EB0D6ECE37D14D6B3E2C69B0F3C3AD3D313E5369A63F3` | **AGUARDANDO PARTE 2** |
| **Diag Final** | [`01_diagnostico_pos_execucao_core.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01_diagnostico_pos_execucao_core.sql) | **3.692 B** (3,61 KB) | 100 | `FC2271B50D878D9E07196D56F40B2283697625BDD7F3E03AA267116EEAD6D9C0` | **FINAL** |

---

## 2. Procedimento Operacional Sequencial (Passo a Passo)

### Passo 1: Confirmação Visual do Projeto
1. Acesse o console do Supabase: [https://supabase.com/dashboard/project/wsologhmptielhhnbgob/sql](https://supabase.com/dashboard/project/wsologhmptielhhnbgob/sql)
2. Confira no canto superior esquerdo o Project ID: **`wsologhmptielhhnbgob`**.

---

### Passo 2: Execução da Parte 2 (`01B_midiaos_v260_core_parte2.sql`)
1. No SQL Editor, clique em **+ New query**.
2. Abra localmente o arquivo [`01B_midiaos_v260_core_parte2.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B_midiaos_v260_core_parte2.sql).
3. Selecione todo o conteúdo (`Ctrl + A`) e copie (`Ctrl + C`).
4. Cole no editor e clique em **Run** (`Ctrl + Enter`).
5. **Aguarde a finalização**: deve exibir a mensagem verde `Success. No rows returned`.

---

### Passo 3: Verificação Pós-Execução da Parte 2
1. No SQL Editor, abra uma nova consulta (**+ New query**).
2. Abra localmente o arquivo [`01B_diagnostico_pos_execucao_parte2.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01B_diagnostico_pos_execucao_parte2.sql).
3. Copie todo o conteúdo e clique em **Run** (`Ctrl + Enter`).
4. Confira a grade de resultados:
   - A tabela `public.tenants` deve retornar `CONFORME`.
   - O tenant TV Brasília (`a711a129-330c-46bf-943a-531cedd4f2ff`) deve retornar `CONFORME` com plano Enterprise.
   - O perfil de Rafael Rodrigo deve retornar `CONFORME` (desvinculado do tenant TV Brasília).
   - As 19 tabelas devem retornar com a coluna `tenant_id` presente (`CONFORME`).
   - A linha `# 101` (Avaliação de Prontidão) deve retornar **`CONFORME: PARTE 2 CONCLUÍDA COM SUCESSO`**.

---

### Passo 4: Execução da Parte 3 (`01C_midiaos_v260_core_parte3.sql`)
1. Somente após a confirmação do Passo 3, clique em **+ New query**.
2. Abra localmente o arquivo [`01C_midiaos_v260_core_parte3.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01C_midiaos_v260_core_parte3.sql).
3. Selecione todo o conteúdo (`Ctrl + A`) e copie (`Ctrl + C`).
4. Cole no editor e clique em **Run** (`Ctrl + Enter`).
5. **Aguarde a finalização**: deve exibir `Success. No rows returned`.

---

### Passo 5: Execução do Diagnóstico Final do Core
1. Clique em **+ New query**.
2. Abra localmente o arquivo [`01_diagnostico_pos_execucao_core.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/01_diagnostico_pos_execucao_core.sql).
3. Copie todo o conteúdo e clique em **Run** (`Ctrl + Enter`).
4. Verifique a tabela de resultados. Todos os 6 itens devem apresentar status **`CONFORME`**:
   - `Tabelas Base`: **59**
   - `Tipos ENUM`: **12**
   - `Funções`: **87**
   - `Gatilhos (Triggers)`: **160**
   - `Políticas RLS`: **219**
   - `Índices`: **175**
   - `Tenant TV Brasília`: ID `a711a129-330c-46bf-943a-531cedd4f2ff`, status `ativo`
   - `gerar_pos_vendas_pendentes`: `FUNCTION`, `DEFINER`, privilégios revogados para `PUBLIC` e `anon`.

---

## 3. Regra Mandatória de Interrupção

> [!WARNING]
> Se qualquer uma das partes apresentar mensagem de erro em vermelho:
> 1. **INTERROMPA IMEDIATAMENTE**: Não execute a parte seguinte sob nenhuma hipótese.
> 2. **NÃO REEXECUTE AUTOMATICAMENTE**: Não tente rodar o mesmo arquivo novamente.
> 3. **REGISTRE OS DADOS DO ERRO**: Copie a mensagem de erro completa, código SQLSTATE e linha informada.
> 4. **AVALIE O ESTADO DO BANCO**: Execute a consulta [`00_diagnostico_estado_atual_staging.sql`](file:///D:/midiaos_build/PACOTE_IMPLANTACAO_STAGING/00_diagnostico_estado_atual_staging.sql) para verificar quais objetos foram persistidos antes do ponto de parada.
