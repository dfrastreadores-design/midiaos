# PROSPECT AUDITORIA TÉCNICA
## Mídia.OS 2.6.0 — Módulo Midia OS Prospect
**Data:** 31/10/2026  
**Ambiente Auditado:** `D:\midiaos_build`  
**Status do Portão de Auditoria:** FASE 0 CONCLUÍDA — AGUARDANDO APROVAÇÃO EXPRESSA  

---

## 1. RESUMO EXECUTIVO DA AUDITORIA

A presente auditoria técnica foi realizada no ambiente de desenvolvimento do **Mídia.OS** (versão de referência **2.6.0**) para mapear a infraestrutura existente, identificar pontos de reutilização arquitetural, analisar potenciais riscos operacionais e validar os requisitos para o novo módulo **Midia OS Prospect** (composto por *Prospect, Intelligence, Autoprospect, Media Planner e Analytics*).

### Regras Mandatórias de Segurança Respeitadas
Em estrita conformidade com as instruções da Parte 16 e Parte 20 do Prompt Master:
- **Nenhum comando SQL de mutação ou execução foi executado no banco de dados.**
- **Nenhuma alteração de dados, deleção ou inserção foi realizada em produção ou staging.**
- **Nenhum arquivo de configuração (`.env`, `.env.staging`, etc.) foi alterado ou teve credenciais expostas.**
- **A integridade dos 100% de aprovação homologados no relatório `AUDITORIA_HOMOLOGACAO_PRODUCAO.md` (29/10/2026) foi integralmente preservada.**

---

## 2. MAPA DA PILHA TECNOLÓGICA E SERVIÇOS

| Camada | Tecnologia em Uso | Versão / Detalhes | Status no Projeto |
| :--- | :--- | :--- | :--- |
| **Frontend** | React + TanStack Router + TanStack Query + Tailwind CSS | React 19.2.0, Router 1.168.25, Tailwind 4.2.1 | Operacional e modular |
| **Fullstack Server** | TanStack Start + Nitro Production Server | Nitro 3.0.260603-beta, Vite 7.3.5 | Executa SSR e Server Functions |
| **Backend & Banco** | Supabase (PostgreSQL 15+) | `@supabase/supabase-js` 2.105.4 | Multi-tenant com RLS ativo |
| **Autenticação** | Supabase Auth | Sessão JWT, RBAC multi-perfil via `profiles` e `user_roles` | RLS auditado e aprovado |
| **Motor Financeiro** | TypeScript Determinístico Backend | `src/lib/calculo-financeiro-midia.ts` | Regra Fundamental (Imposto -> Comissão -> Repasse) |
| **IA & LLM** | Google Gemini API + Lovable Gateway | Gemini 2.5 Flash / Fallback analítico determinístico | Configurado em `estrategia-ia.functions.ts` |
| **APIs de Consulta CNPJ** | Multi-fonte (BrasilAPI, ReceitaWS, CNPJ.ws, OpenCNPJa) | `src/lib/cnpj.ts`, `sync-cnpj.server.ts` | Resiliente com rotação e fallback |
| **Geração de Documentos** | jsPDF + AutoTable + PptxGenJS + SheetJS | `jspdf` 4.2.1, `pptxgenjs` 4.0.1, `xlsx` 0.18.5 | PIs, Contratos, Apresentações OOH |
| **Hospedagem / Deploy** | Hostinger VPS + Node.js Nitro Service | Scripts em `scripts/deploy-hostinger.mjs` | Ambientes configuráveis |

---

## 3. AUDITORIA DA PENDÊNCIA: `07_massa_dados_ficticios_staging.sql`

A auditoria inspecionou especificamente o arquivo:
`D:\midiaos_build\supabase\preparacao_homologacao_rls\07_massa_dados_ficticios_staging.sql`

### Diagnóstico Técnico Detalhado
1. **Comportamento do PostgreSQL com `DO $$` e Tipos Estáticos**:
   - Nas linhas 60-74 do arquivo, encontra-se o bloco:
     ```sql
     DO $$
     BEGIN
       IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
         INSERT INTO public.user_roles (user_id, role)
         VALUES
           ('11111111-aaaa-1111-aaaa-111111111111', 'executivo_comercial'::public.app_role),
           ...
     ```
   - **Vulnerabilidade de Parse**: No PostgreSQL, o corpo de um bloco anônimo `DO $$ ... $$` é analisado sintaticamente e tipado no momento da compilação antes de qualquer linha ser executada. Se o tipo customizado `public.app_role` ou a tabela `public.user_roles` não existir no banco de Staging no momento da execução, o PostgreSQL abortará com erro de parse:
     `ERROR: type "public.app_role" does not exist`
     Mesmo estando protegido condicionalmente por `IF EXISTS (...)`.
   - **Contraste Positivo no Mesmo Arquivo**: Nas linhas 104-128 do mesmo script, para a tabela `insertion_orders`, a equipe utilizou corretamente SQL Dinâmico:
     ```sql
     DO $$
     BEGIN
       IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insertion_orders') THEN
         EXECUTE $dyn$
           INSERT INTO public.insertion_orders ...
         $dyn$;
       END IF;
     END $$;
     ```
   - **Correção Recomendada para o Ambiente de Homologação**:
     O bloco de `user_roles` deve ser encapsulado via `EXECUTE $dyn$ ... $dyn$;` para que o interpretador SQL só avalie o cast de tipo `::public.app_role` caso a tabela de fato exista.
2. **Uso de `IF EXISTS` fora de Bloco Procedural**:
   - Em SQL ANSI e PostgreSQL padrão, a cláusula condicional `IF [condição] THEN ... END IF;` só é válida dentro de blocos procedurais (`DO $$ BEGIN ... END $$;`) ou dentro de `CREATE OR REPLACE FUNCTION ...`. O script já foi estruturado com blocos `DO $$`, mas qualquer execução avulsa de comandos condicionais fora de um bloco PL/pgSQL geraria erro de sintaxe.
3. **Pré-requisitos de Chave Estrangeira em Staging**:
   - O script estabelece chaves estrangeiras com `auth.users(id)` em `public.profiles` e `public.clientes`. Em bancos de Staging vazios, os UUIDs fictícios devem ser injetados na tabela `auth.users` previamente via Supabase Auth Admin API ou script controlado, caso contrário o script falhará por violação de Foreign Key.

---

## 4. ESTRUTURAS EXISTENTES REUTILIZÁVEIS (NÃO DUPLICAR)

O princípio fundamental do **Midia OS Prospect** estabelece que este módulo **NÃO é um CRM paralelo**, mas sim uma camada de inteligência conectada às estruturas operacionais já existentes:

### 4.1. Módulo de Clientes e CRM (`public.clientes` e `src/routes/crm.tsx`)
- **Tabela existente**: `public.clientes` já possui os campos:
  - `razao_social`, `nome_fantasia`, `cnpj`, `endereco`, `cidade`, `uf`, `cep`.
  - Canais digitais: `website`, `instagram`, `linkedin`, `facebook`.
  - Inteligência cadastral: `cnae`, `situacao_cadastral`, `segmento`.
  - Carteira de executivo: `executivo_id`, `created_by`, `status` (`'ativo'`, `'inativo'`, `'prospect'`, `'bloqueado'`).
  - Contatos: Array JSONB `contatos` contendo `nome`, `cargo`, `funcao`, `email`, `telefone`, `aniversario`.
- **Reutilização**:
  - Quando um Lead encontrado pelo Prospect for qualificado e atribuído ao executivo, ele é gravado diretamente em `public.clientes` com `status = 'prospect'`, vinculando o `executivo_id`.
  - O funil do CRM (`src/lib/crm.functions.ts`) já possui o estágio primário `'prospeccao'`, que exibirá automaticamente o lead sem nenhuma necessidade de CRM duplicado.

### 4.2. Módulo de Inventário de Mídia (`public.produtos`)
- **Tabela existente**: `public.produtos`.
- **Campos**: `nome`, `midia` (OOH, DOOH, etc.), `tipo`, `formato`, `endereco_ponto`, `cidade`, `valor_unit`, `preco_tabela`, `impactos_estimados`, `parceiro_nome`, `parceiro_id`, `ativo`.
- **Reutilização**:
  - O motor de Intelligence consultará diretamente `public.produtos` para pontuar a compatibilidade geográfica e de formato com a empresa prospectada.
  - Produtos parceiros já cadastrados são aproveitados imediatamente; novos produtos identificados como oportunidades de expansão serão marcados como "não cadastrados / oportunidade parceiro" sem sujar a tabela de inventário ativo.

### 4.3. Motor Financeiro (`src/lib/calculo-financeiro-midia.ts`)
- **Regra Fundamental do Mídia OS**:
  $$\text{Imposto} = \text{Bruto} \times \left(\frac{\text{Aliquota}}{100}\right)$$
  $$\text{Líquido} = \text{Bruto} - \text{Imposto}$$
  $$\text{Comissão} = \text{Líquido} \times \left(\frac{\text{Percentual}}{100}\right)$$
  $$\text{Repasse Parceiro} = \text{Líquido} - \text{Comissão}$$
- **Reutilização**:
  - O Media Planner utilizará estritamente as funções `calcularRepasseParceiro` e `calcularRateioMultiParceiros`.
  - A IA nunca calculará valores financeiros de cabeça; todo cálculo será determinístico no backend.

### 4.4. Planejamento de Mídia Estratégico (`public.campanhas_planejamento` e `campanha_pontos_midia`)
- **Tabelas existentes**:
  - `public.campanhas_planejamento`: Campos de estratégia, público, objetivo, orçamento e pilares (`afinidade_territorial`, `frequencia`, `visibilidade`, `mobilidade`, `ativacao`).
  - `public.campanha_pontos_midia`: Pontos selecionados vinculados diretamente a `public.produtos`.
- **Reutilização**:
  - O novo Media Planner utilizará estas tabelas como base de dados primária, adicionando suporte às 3 alternativas de planos (Econômico, Recomendado e Ampliado).

### 4.5. Motor de IA Gemini 2.5 Flash (`src/lib/estrategia-ia.functions.ts` e `copiloto-comercial.functions.ts`)
- **Arquitetura existente**:
  - Integração já funcional com a API Google Gemini (e Lovable Gateway) com geração de JSON tipado via Zod e fallback analítico para prevenir falhas caso a chave não esteja presente.
  - O Prospect reaproveitará este mesmo padrão de chamada para diagnosticar empresas e elaborar copys comerciais.

---

## 5. CONCLUSÃO DA AUDITORIA

O sistema Mídia OS possui todas as bases estruturais sólidas, testadas e aprovadas para receber o **Midia OS Prospect** de forma orgânica, rápida e elegante, sem ruptura com a produção atual e sem criação de estruturas redundantes.

