# MAPA DE ARQUITETURA DO SISTEMA — MÍDIA.OS (v2.6.0)

> **Classificação:** Mapa Arquitetural de Engenharia de Software  
> **Versão da Plataforma:** 2.6.0 Enterprise Multi-Tenant  
> **Ambiente:** Produção (Política Ativa de Zero Perda de Dados)  
> **Data de Atualização:** Outubro de 2026  

---

## 1. VISÃO GERAL E CAPACIDADES ESTRATÉGICAS

O **Mídia.OS** é uma plataforma SaaS *Enterprise Omnichannel* e *White-Label* para gestão comercial, inteligência operacional, planejamento e formalização de veículos de comunicação, agências de representação comercial e exibidoras de mídia.

```mermaid
graph TD
    subgraph CAPACIDADES["CAPACIDADES ESSENCIAIS DO MÍDIA.OS"]
        C1["💼 Gestão Comercial<br/>(CRM, Propostas, Simulador BV)"]
        C2["🗺️ Inventário Omnichannel<br/>(OOH, DOOH, TV, Rádio, Mapas)"]
        C3["🤖 Automação via IA<br/>(Gemini 2.5, Ingestão Mídia Kit)"]
        C4["⚖️ Formalização Jurídica<br/>(PIs, Assinatura SHA-256, Checking)"]
        C5["💰 Gestão Financeira<br/>(Contas Pagar/Receber, Comissões, DRE)"]
        C6["🛡️ Segurança Multi-Tenant<br/>(RLS, RBAC, Zero Perda de Dados)"]
    end
```

---

## 2. ARQUITETURA DE ROTAS E NAVEGAÇÃO (4 PILARES)

A estrutura canônica de navegação da plataforma organiza-se em 4 pilares:

```
Mídia.OS
 │
 ├── 💼 /comercial               (Geração de Demanda & Negociação)
 │    ├── crm                   → Funil Kanban e gestão de oportunidades comerciais
 │    ├── clientes              → Cadastro de anunciantes e consulta de CNPJ na Receita Federal
 │    └── propostas             → Elaboração, simulação de margens/BV e geração PPTX/PDF
 │
 ├── ⚙️ /operacional             (Inventário, Parceiros & Execução)
 │    ├── produtos              → Catálogo omnichannel, geolocalização e fotos dos pontos
 │    ├── parceiros             → Gestão de veículos parceiros e ingestão via IA / Google Drive
 │    └── pi                    → Pedidos de Inserção, alçadas de aprovação e checking
 │
 ├── 💰 /financeiro              (Faturamento, Liquidação & Remuneração)
 │    ├── financeiro            → Contas a pagar/receber, DRE gerencial e conciliação
 │    └── comissoes             → Apuração de comissões por metas e repasses de agência
 │
 └── 🛡️ /admin                   (Governança, Identidade & Multi-Tenant)
      ├── usuarios              → Gestão de equipe, papéis e matriz de permissões RBAC
      └── configuracoes         → Identidade visual White-Label, integrações e tenant
```

---

## 3. STACK TECNOLÓGICA E FLUXO DE DADOS

```mermaid
flowchart TD
    subgraph CLIENT["CAMADA CLIENTE (SPA / SSR)"]
        UI["React 19 + TypeScript 5.8"]
        ST["Tailwind CSS v4 + Radix UI"]
        ROUTER["TanStack Router (File-Based)"]
        QUERY["TanStack Query v5"]
    end

    subgraph SERVER_FN["CAMADA DE SERVIDOR (TanStack Start / Nitro)"]
        AUTH_MW["Auth Middleware & Tenant Resolver"]
        VALID["Validação Zod Schemas"]
        FN_COMERCIAL["propostas.functions.ts"]
        FN_OPERACIONAL["pi.functions.ts / produtos.functions.ts"]
        FN_IA["inventario-gemini.functions.ts"]
        FN_ADMIN["usuarios.functions.ts / tenants.functions.ts"]
    end

    subgraph INTEGRATIONS["SERVIÇOS EXTERNOS & IA"]
        GEMINI["Google Gemini 2.5 Flash SDK"]
        BRASIL_API["BrasilAPI (Receita Federal / CNPJ)"]
        GDRIVE["Google Drive API (Ingestão em Lote)"]
    end

    subgraph DATABASE["BANCO DE DADOS (Supabase Managed PostgreSQL)"]
        RLS["Row Level Security (tenant_id)"]
        TABLES[("Tabelas de Negócio:<br/>pis, propostas, produtos, clientes, etc.")]
        AUDIT[("auditoria_alteracoes<br/>(Histórico Integral Auditado)")]
        TRASH[("trash_items<br/>(Lixeira com Snapshot JSONB)")]
    end

    UI --> ROUTER --> QUERY --> SERVER_FN
    SERVER_FN --> AUTH_MW --> VALID
    VALID --> FN_COMERCIAL & FN_OPERACIONAL & FN_IA & FN_ADMIN
    FN_IA --> GEMINI & GDRIVE
    FN_OPERACIONAL --> BRASIL_API
    SERVER_FN --> DATABASE
    RLS --> TABLES --> AUDIT & TRASH
```

---

## 4. MATRIZ DOS MÓDULOS DE SERVIDOR (`src/lib/*.functions.ts`)

Todas as operações de mutação e consulta crítica são protegidas por Server Functions isomorfas (`createServerFn`) com tipagem estrita via `zod`:

| Módulo de Servidor | Arquivo Fonte | Responsabilidade Central | Principais Server Functions |
|---|---|---|---|
| **Comercial / Propostas** | `src/lib/propostas.functions.ts` | Motor de cálculo de planos de mídia, simulação de descontos, comissão e conversão para PI | `listPropostas`<br/>`getProposta`<br/>`upsertProposta`<br/>`converterPropostaEmPi`<br/>`gerarPropostaDoPi` |
| **Operacional / Inventário** | `src/lib/produtos.functions.ts` | Gestão de pontos de mídia (OOH/DOOH), coordenadas geográficas, fotos e reajustes em lote | `listProdutos`<br/>`upsertProduto`<br/>`batchUpdateProdutos`<br/>`importProdutosBulk`<br/>`deleteProduto` |
| **Operacional / Pedidos de Inserção** | `src/lib/pi.functions.ts` | Formalização de PIs com trava de centavos, alçadas de aprovação e conciliação Receita Federal | `listPis`<br/>`getPi`<br/>`upsertPi`<br/>`enviarPiParaAprovacao`<br/>`aprovarPi`<br/>`substituirPi` |
| **Parceiros & Representação** | `src/lib/representacao-comercial.functions.ts` | Cadastro de veículos parceiros e catálogo de mídia unificado | `listPartners`<br/>`upsertPartner`<br/>`listMediaCatalog`<br/>`upsertMediaCatalogItem` |
| **Inteligência Artificial** | `src/lib/inventario-gemini.functions.ts`<br/>`src/lib/midia-kit-ai.functions.ts` | Extração autônoma de inventário a partir de PDFs, mídia kits e planilhas com Gemini 2.5 Flash | `extrairInventarioPDF`<br/>`processarMidiaKit` |
| **Governança & Usuários** | `src/lib/usuarios.functions.ts` | Controle de equipe, perfis de acesso (RBAC) e auditoria de logins | `listUsuarios`<br/>`setUserRole`<br/>`toggleUserAtivo`<br/>`adminResetPassword` |
| **Multi-Tenancy** | `src/lib/tenants.functions.ts` | Gerenciamento de organizações, isolamento de dados e White-Label | `listTenants`<br/>`getOwnerOverview`<br/>`upsertTenant`<br/>`getMyTenantBranding` |

---

## 5. CICLO DE VIDA DO PEDIDO DE INSERÇÃO (PROPOSTA ➔ PI ➔ FATURAMENTO)

```mermaid
sequenceDiagram
    autonumber
    actor Vendedor as Executivo Comercial
    participant Prop as Propostas Engine (propostas.functions.ts)
    participant PI as PI Engine (pi.functions.ts)
    actor Diretor as Diretoria / Alçada
    actor Cliente as Anunciante / Agência
    participant Fin as Módulo Financeiro

    Vendedor->>Prop: 1. Elabora Proposta Comercial (simula margem, BV e descontos)
    Prop->>Prop: 2. Exporta PPTX e PDF com dados de inventário
    Vendedor->>Prop: 3. converterPropostaEmPi()
    Prop->>PI: 4. Cria Pedido de Inserção com Trava de Centavos
    PI->>PI: 5. refreshEntidadeFromCnpj() via BrasilAPI
    Vendedor->>PI: 6. enviarPiParaAprovacao()
    PI->>Diretor: 7. Dispara Token de Aprovação (/aprovar-diretoria/$token)
    Diretor->>PI: 8. aprovarPi() com registro auditado
    PI->>Cliente: 9. Link de Assinatura (/assinar/$token) com Hash SHA-256
    Cliente->>PI: 10. Assinatura confirmada com IP e Timestamp
    PI->>Fin: 11. Libera Título em Contas a Receber e Apuração de Comissões
```

---

## 6. SEGURANÇA, AUDITORIA E ZERO PERDA DE DADOS

O sistema opera sob as diretrizes de produção documentadas em `AGENTS.md`:

1. **Row Level Security (RLS) Inviolável:**
   - Toda consulta no banco aplica `tenant_id = auth.jwt() ->> 'tenant_id'`.
   - Isolamento garantido no PostgreSQL, prevenindo vazamento de dados entre empresas.

2. **Auditoria Contínua (`auditoria_alteracoes`):**
   - Gatilhos automáticos registram `INSERT`, `UPDATE` e `DELETE` em tabelas críticas (`pis`, `propostas`, `clientes`, `produtos`).
   - Armazena estado anterior e novo em JSONB, usuário autor e timestamp.

3. **Lixeira Segura com Restauração (`trash_items`):**
   - Nenhuma exclusão definitiva é permitida diretamente pelo usuário comum.
   - O registro é marcado como inativo e um snapshot JSONB completo é gerado para restauração imediata.

---

## 7. MATRIZ DE PAPÉIS E PERMISSÕES (RBAC)

| Papel | Comercial (`/comercial`) | Operacional (`/operacional`) | Financeiro (`/financeiro`) | Admin (`/admin`) |
|---|:---:|:---:|:---:|:---:|
| `master_admin` | Total | Total | Total | Total + Painel Owner |
| `admin` | Total | Total | Total | Gestão do Tenant |
| `diretor` | Aprovação/Descontos | Consulta/Aprovação PI | DRE / Comissões | Consulta |
| `financeiro` | Leitura | Faturamento de PIs | Total | - |
| `executivo` | Total (CRM/Propostas) | Consulta Produtos/PIs | Apenas suas comissões | - |
| `operacional` | Leitura | Gestão de Produtos/Checkings | - | - |
| `instalador` | - | Visualização O.S. e Checking | - | - |

---

*Mídia.OS — Documento Arquitetural Oficial © 2026.*
