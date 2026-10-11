# DOCUMENTAÇÃO TÉCNICA E FUNCIONAL COMPLETA — MÍDIA.OS (v2.6.0)

> **Classificação:** Documento Técnico e Arquitetural de Produto SaaS  
> **Versão da Plataforma:** 2.6.0 Enterprise Multi-Tenant  
> **Ambiente:** Produção (Política Ativa de Zero Perda de Dados)  
> **Data de Atualização:** Outubro de 2026  

---

## ÍNDICE GERAL

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Mapa Completo de Telas e Rotas](#3-mapa-completo-de-telas-e-rotas)
4. [Módulos do Sistema](#4-módulos-do-sistema)
5. [Banco de Dados e Modelo Relacional](#5-banco-de-dados-e-modelo-relacional)
6. [Fluxos Principais do Usuário (End-to-End)](#6-fluxos-principais-do-usuário-end-to-end)
7. [Componentes Reutilizáveis e Design System](#7-componentes-reutilizáveis-e-design-system)
8. [Funcionalidades de Inteligência Artificial (Gemini 2.5)](#8-funcionalidades-de-inteligência-artificial-gemini-25)
9. [Pipeline de Importação e Sincronização](#9-pipeline-de-importação-e-sincronização)
10. [Segurança, Autenticação e RBAC Multi-Tenant](#10-segurança-autenticação-e-rbac-multi-tenant)
11. [Pontos Fortes do Sistema](#11-pontos-fortes-do-sistema)
12. [Análise Crítica e Oportunidades de Melhoria](#12-análise-crítica-e-oportunidades-de-melhoria)
13. [Roadmap Sugerido de Evolução](#13-roadmap-sugerido-de-evolução)
14. [Exportação e Artefatos Gerados](#14-exportação-e-artefatos-gerados)

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Nome e Propósito
O **Mídia.OS** é uma plataforma SaaS *Enterprise Omnichannel* e *White-Label* projetada especificamente para a gestão comercial, inteligência operacional, planejamento e formalização de veículos de comunicação, agências de representação comercial e exibidoras de mídia.

### 1.2 O Problema que Resolve
O mercado de mídia publicitária (especialmente Mídia Exterior OOH, DOOH, Televisão, Rádio, Mídia Impressa e Painéis Digitais) enfrenta dores crônicas:
- **Descentralização e Despadronização:** Cada parceiro ou veículo envia mídia kits em formatos totalmente distintos (PDFs pesados, apresentações comerciais em PPTX, planilhas despadronizadas);
- **Erros em Cálculos e Comissões:** Cálculos manuais de BV (Bonificação de Volume), comissões de executivos, remunerações de agência e rateios entre parceiros;
- **Ciclo Lento de Vendas:** Demora na montagem de propostas personalizadas e apresentações comerciais para anunciantes;
- **Insegurança Jurídica e Operacional:** Pedidos de Inserção (PIs) negociados por WhatsApp/e-mail sem versionamento, carimbo de tempo ou assinatura auditada;
- **Falta de Conciliação em Tempo Real:** Dificuldade em monitorar o checking de veiculação e o faturamento das campanhas ativas.

### 1.3 Público Usuário
1. **Veículos de Comunicação e Exibidoras de OOH/DOOH:** Proprietários de pontos de mídia (outdoors, frontlights, painéis de LED, totens, busdoors, abrigos de ônibus);
2. **Empresas de Representação Comercial de Mídia:** Hubs estratégicos (como a *Nexo Mídia e Representação*) que consolidam o inventário de dezenas de veículos parceiros e vendem pacotes integrados;
3. **Executivos de Contas e Planejadores de Mídia:** Vendedores internos e externos que elaboram planos de mídia, propostas comerciais e simulam descontos;
4. **Diretoria e Controladoria:** Gestores responsáveis pela aprovação de propostas de alto valor, auditoria e margens de lucro;
5. **Agências de Publicidade e Anunciantes/Clientes Finais:** Usuários com acesso a portais de assinatura digital, acompanhamento de PIs, vitrines de inventário e pós-venda.

### 1.4 Principais Funcionalidades Existentes
- **Inventário Omnichannel:** Cadastro, geolocalização em mapa interativo e precificação de espaços publicitários em OOH, DOOH, TV, Rádio, Digital e Impresso;
- **Pipeline de Extração com IA (Google Gemini 2.5 Flash):** Leitura automática de propostas e mídia kits despadronizados (PDF/Excel), cadastrando parceiros e pontos no banco sem esforço manual;
- **Motor Comercial e Simulador de Propostas:** Geração de propostas comerciais completas, simulação instantânea de margens/descontos e exportação automática para PDF premium e apresentações PPTX;
- **Gestão Rigorosa de Pedidos de Inserção (PI):** Fluxo auditado de emissão, aprovação da diretoria, checking fotográfico de veiculação e faturamento com trava de centavos;
- **Central Universal de Assinaturas Digitais:** Assinatura eletrônica com verificação criptográfica SHA-256, hash de integridade, carimbo de data/hora e registro de IP;
- **Gestão Financeira, DRE e Comissões:** Controle de contas a pagar/receber, conciliação de permutas comerciais e apuração automática de comissões por faixa de faturamento;
- **Sincronização em Tempo Real de CNPJ:** Consulta e enriquecimento de dados cadastrais na Receita Federal (BrasilAPI) com apenas um clique;
- **Sincronização com Google Drive:** Varredura automática de pastas de parceiros na nuvem para identificação e importação de inventário.

### 1.5 Status Atual do Projeto
- **Versão:** 2.6.0 (Homologada para Produção);
- **Regime Operacional:** Política de Zero Perda de Dados (migrações estritamente aditivas, gatilhos de auditoria `auditoria_alteracoes` e tabela `trash_items` como lixeira lógica de segurança);
- **Qualidade e Confiabilidade:** 40 testes automatizados com 100% de aprovação no runner oficial de homologação.

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Stack Tecnológico
- **Frontend Core:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React;
- **Roteamento e SSR:** TanStack Router (file-based routing) acoplado ao TanStack Start com motor de execução Nitro (Full-Stack SSR / Edge-Ready);
- **Gerenciamento de Estado de Servidor:** TanStack Query v5 (`@tanstack/react-query`);
- **Camada de Backend / Banco de Dados:** Supabase (PostgreSQL 14.5 gerenciado) com Supabase Auth e Row-Level Security (RLS);
- **Inteligência Artificial:** SDK Google Gemini (`@google/genai`) utilizando o modelo `gemini-2.5-flash`;
- **Documentos e Mídia:** `jspdf` e `jspdf-autotable` para relatórios e contratos PDF, `pptxgenjs` para geração de apresentações PowerPoint dinâmicas, `xlsx` para manipulação de planilhas Excel;
- **Build & Empacotamento:** Vite 6 integrado ao script otimizado de build incremental `scripts/build.mjs`.

### 2.2 Padrões Arquiteturais
- **Server Functions Isomorfas (`createServerFn`):** Todas as mutações e consultas complexas ao banco de dados são executadas em funções de servidor estritas com tipagem validada via `zod`;
- **Multi-Tenancy por Coluna e RLS:** Cada registro pertence a um `tenant_id`. O Supabase aplica regras de Row-Level Security que garantem isolamento inviolável de dados entre empresas;
- **Auditoria Universal em Camada de Dados:** Gatilhos PostgreSQL capturam alterações em tabelas vitais (`pis`, `propostas`, `clientes`, `produtos`) alimentando a tabela `auditoria_alteracoes`;
- **Design System Modular:** Componentes base construídos sobre primitivos do Radix UI (`@radix-ui/react-*`), estilizados com tokens semânticos e classes utilitárias Tailwind CSS.

### 2.3 Organização do Repositório (`/src`)

```
d:/Projetos/Midia.os/src
 ├── assets/                 # Imagens, logotipos e ilustrações estáticas
 ├── components/             # Componentes de interface do usuário
 │    ├── centralizadores/   # Componentes dos painéis 360° e radar de mídia
 │    ├── circuitos/         # Modais de gestão de circuitos de mídia e pacotes
 │    ├── parceiros/         # Modais de preview e importação de parceiros
 │    ├── pi/                # Formulários, checkings e tabelas de Pedidos de Inserção
 │    ├── proposta/          # Modais de apresentação, propostas e simulador
 │    ├── ui/                # Biblioteca base de design (Radix UI + Tailwind)
 │    ├── AppShell.tsx       # Layout master, sidebar responsiva e barra de topo
 │    ├── ImportDropdown.tsx # Componente unificado do pipeline de importação
 │    └── ...                # Modais especializados de formulários de negócio
 ├── hooks/                  # Custom React Hooks (autenticação, roles, tenant)
 ├── integrations/           # Clientes de serviços externos
 │    └── supabase/          # Cliente Supabase, tipos TypeScript gerados do banco
 ├── lib/                    # Funções de servidor (Server Functions) e utilitários
 │    ├── midia-kit-ai.functions.ts     # Pipeline de IA para leitura de mídia kits
 │    ├── inventario-gemini.functions.ts# Extração em lote de produtos via Gemini
 │    ├── pi.functions.ts               # Ciclo de vida e regras de negócio do PI
 │    ├── propostas.functions.ts        # Regras de cálculo e mutações de propostas
 │    ├── produtos.functions.ts         # Gestão de inventário e reajuste em lote
 │    └── ...
 ├── routes/                 # Rotas baseadas em arquivos (TanStack Router)
 └── types/                  # Definições de tipagem global da aplicação
```

---

## 3. MAPA COMPLETO DE TELAS E ROTAS

Abaixo está o inventário de todas as rotas e interfaces que compõem o Mídia.OS:

| Rota | Nome da Tela | Objetivo e Funcionalidades Principais |
|---|---|---|
| `/` | **Dashboard Geral** | Visão executiva de faturamento, metas, PIs ativos, pipeline de vendas, aniversariantes e atalhos rápidos. |
| `/centralizadores` | **Centralizadores & Planejadores** | Radar 360° de inteligência geográfica (DF e Entorno) e catálogo estratégico de soluções de mídia integrada. |
| `/crm` | **Funil CRM** | Quadro Kanban de oportunidades comerciais por estágios (Prospecção, Qualificação, Apresentação, Fechamento). |
| `/tarefas` | **Gestão de Tarefas** | Lista de atividades comerciais e operacionais com prazos, prioridades e notificações de vencimento. |
| `/clientes` | **Carteira de Clientes** | Cadastro completo de anunciantes, histórico de campanhas, consulta de CNPJ na Receita Federal e contatos. |
| `/agencias` | **Agências de Publicidade** | Cadastro de agências parceiras, executivos responsáveis, contatos e controle de Bonificação de Volume (BV). |
| `/produtos` | **Inventário & Mídias** | Gestão de pontos comerciais (OOH/DOOH), tabela de preços, mapa interativo, galeria de fotos e reajuste em lote. |
| `/parceiros` | **Parceiros de Mídia** | Gestão de veículos terceirizados representados, comissões acordadas, pipeline de importação com IA e circuitos. |
| `/pi` | **Pedidos de Inserção (PI)** | Emissão de PIs, cálculo de investimento líquido/bruto, status de veiculação, aprovação da diretoria e exportação PDF. |
| `/historico-veiculacao` | **Histórico de Veiculação** | Monitoramento visual e operacional das campanhas que estão ativamente em exibição na praça. |
| `/propostas` | **Propostas Comerciais** | Criação de propostas, simulador interativo de descontos, geração de apresentações em PPTX e visualizador digital. |
| `/contratos` | **Contratos** | Geração e acompanhamento de instrumentos contratuais jurídicos atrelados a PIs e clientes. |
| `/assinaturas` | **Central de Assinaturas** | Gestão de assinaturas eletrônicas com registro de IP, hash SHA-256 e visualização de comprovantes. |
| `/financeiro` | **Gestão Financeira & DRE** | Contas a pagar/receber, DRE gerencial, fluxo de caixa, conciliação e compensação de permutas de mídia. |
| `/comissoes` | **Comissões & Bonificações** | Definição de regras de comissionamento e apuração mensal de valores devidos a executivos e agências. |
| `/relatorios` | **Relatórios & BI** | Exportação de dados consolidados em Excel/CSV, indicadores de ocupação de mídia e gráficos de rentabilidade. |
| `/materiais-apoio` | **Material de Apoio** | Repositório central de arquivos, mídia kits, tabelas de formato técnico e manuais comerciais. |
| `/landing-pages` | **Landing Pages** | Construtor e gerenciador de páginas de captura para anunciantes e captação de leads. |
| `/influenciadores` | **Influenciadores** | Gestão de elenco de criadores de conteúdo, métricas de redes sociais e contratação de publicidade digital. |
| `/social-media` | **Redes Sociais & Tráfego** | Planejamento de campanhas digitais patrocinadas e agendamento de posts comerciais. |
| `/usuarios` | **Usuários & Permissões** | Controle de equipe, atribuição de perfis de acesso (RBAC), redefinição de senhas e bloqueios. |
| `/configuracoes` | **Configurações Gerais** | Identidade visual white-label (logo, cores), dados da empresa, ativação de módulos e dados bancários. |
| `/layouts` | **Layouts de Documentos** | Personalização de templates visuais de impressão de Pedidos de Inserção e Propostas. |
| `/relatorio-sincronizacao`| **Sincronização CNPJ** | Histórico e auditoria de consultas cadastrais automatizadas na Receita Federal via BrasilAPI. |
| `/lixeira` | **Lixeira do Sistema** | Recuperação de registros excluídos acidentalmente por meio de snapshots JSONB com restauração instantânea. |
| `/documentacao` | **Manual do Sistema** | Manual interativo de operação do Mídia.OS para treinamento de novos colaboradores. |
| `/owner` | **Painel do Proprietário** | Painel restrito a SuperAdmins para gestão multi-tenant, limites de plano e métricas globais SaaS. |
| `/monitoramento` | **Monitoramento** | Painel técnico de integridade, logs de erros e telemetria de performance da aplicação. |
| `/minha-conta` | **Perfil do Usuário** | Edição de foto, dados cadastrais pessoais, preferências e alteração de senha de acesso. |
| `/assinar/$token` | **Portal de Assinatura (Público)** | Tela limpa e segura onde o cliente final ou agência assina eletronicamente o Pedido de Inserção. |
| `/aprovar-diretoria/$token`| **Aprovação da Diretoria** | Interface rápida para diretores autorizarem concessões comerciais e descontos especiais via token. |
| `/site/*` | **Portal Institucional & Vitrine** | Páginas públicas da plataforma: `/site/inventario` (vitrine pública de pontos OOH), institucional e contato. |

---

## 4. MÓDULOS DO SISTEMA

### 4.1 Módulo Comercial (CRM e Propostas)
- **Responsabilidade:** Captação de leads, avanço de propostas e simulação de investimento;
- **Arquivos-Chave:** `src/routes/propostas.tsx`, `src/routes/crm.tsx`, `src/lib/propostas.functions.ts`, `src/lib/simulador-propostas.functions.ts`;
- **Estado:** **Completo e Operacional**.

### 4.2 Módulo de Operações de Mídia (Produtos e Parceiros)
- **Responsabilidade:** Catálogo de pontos próprios e representados, controle de disponibilidade e especificações técnicas;
- **Arquivos-Chave:** `src/routes/produtos.tsx`, `src/routes/parceiros.tsx`, `src/lib/produtos.functions.ts`, `src/lib/parceiros.functions.ts`, `src/components/ImportDropdown.tsx`;
- **Estado:** **Completo e Operacional**.

### 4.3 Módulo de Pedidos de Inserção (PI) e Contratos
- **Responsabilidade:** Formalização da venda, emissão de documento jurídico, checking fotográfico e fluxo de aprovação;
- **Arquivos-Chave:** `src/routes/pi.tsx`, `src/lib/pi.functions.ts`, `src/lib/pi-emissao.functions.ts`, `src/lib/pi-pdf.ts`;
- **Estado:** **Completo e Operacional**.

### 4.4 Módulo Financeiro e Comissões
- **Responsabilidade:** Contas a pagar/receber, conciliação de faturamento, liquidação de permutas e apuração de comissões por executivo;
- **Arquivos-Chave:** `src/routes/financeiro.tsx`, `src/routes/comissoes.tsx`, `src/lib/financeiro.functions.ts`, `src/lib/comissoes.functions.ts`;
- **Estado:** **Completo e Operacional**.

### 4.5 Módulo de Inteligência Artificial e Importação Automatizada
- **Responsabilidade:** Extração de inventário despadronizado via Google Gemini 2.5 Flash a partir de PDFs e planilhas;
- **Arquivos-Chave:** `src/lib/midia-kit-ai.functions.ts`, `src/lib/inventario-gemini.functions.ts`, `src/lib/drive-sync.functions.ts`;
- **Estado:** **Completo e Operacional**.

---

## 5. BANCO DE DADOS E MODELO RELACIONAL

### 5.1 Estrutura de Tabelas Principais (PostgreSQL)

O banco de dados é estruturado sobre o Supabase, contando com mais de 50 tabelas de negócio isoladas por `tenant_id`:

```
                 ┌──────────────┐
                 │   tenants    │
                 └──────┬───────┘
                        │ 1:N
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   clientes   │ │   agencias   │ │  parceiros   │
└───────┬──────┘ └──────┬───────┘ └──────┬───────┘
        │               │                │
        │ 1:N           │ 1:N            │ 1:N
        ▼               ▼                ▼
┌──────────────────────────────┐  ┌──────────────┐
│          propostas           │  │   produtos   │ (Mídias / Pontos)
└───────────────┬──────────────┘  └──────┬───────┘
                │ 1:N                    │
                ▼                        │ N:N
┌──────────────────────────────┐         │
│             pis              │◄────────┘ (via pi_itens)
└───────────────┬──────────────┘
                │
    ┌───────────┼───────────┬───────────┐
    ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│pi_itens │ │pi_finan.│ │pi_check.│ │assinat. │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 5.2 Principais Entidades e Atributos:
1. **`tenants`:** Chave mestra do multi-tenant (`id`, `nome`, `slug`, `cnpj`, `modulos_ativos`, `branding_config`);
2. **`clientes`:** Dados do anunciante (`id`, `tenant_id`, `razao_social`, `cnpj`, `cidade`, `uf`, `contatos`);
3. **`agencias`:** Agências intervenientes (`id`, `tenant_id`, `razao_social`, `cnpj`, `comissao_padrao`);
4. **`parceiros`:** Fornecedores ou exibidoras representadas (`id`, `tenant_id`, `nome`, `cnpj`, `comissao_padrao`, `drive_folder_id`);
5. **`produtos`:** Espaços publicitários e inventário (`id`, `tenant_id`, `parceiro_id`, `codigo_referencia`, `nome`, `midia`, `formato`, `valor_unit_tabela`, `cidade`, `uf`, `latitude`, `longitude`, `ativo`);
6. **`propostas`:** Propostas comerciais elaboradas (`id`, `tenant_id`, `cliente_id`, `agencia_id`, `numero`, `valor_bruto`, `valor_liquido`, `desconto_percentual`, `status`);
7. **`pis`:** Pedidos de Inserção emitidos (`id`, `tenant_id`, `proposta_id`, `numero_pi`, `valor_liquido`, `status_operacional`, `status_aprovacao_diretoria`, `status_assinatura_cliente`);
8. **`pi_itens`:** Linhas de veiculação do PI (`id`, `pi_id`, `produto_id`, `data_inicio`, `data_fim`, `quantidade`, `valor_negociado`);
9. **`pi_assinaturas_cliente`:** Registro das assinaturas digitais (`id`, `pi_id`, `signatario_nome`, `ip_origem`, `hash_sha256`, `assinado_em`);
10. **`trash_items`:** Lixeira universal (`id`, `tenant_id`, `tabela_origem`, `registro_id`, `dados_snapshot_jsonb`, `deleted_by`).

---

## 6. FLUXOS PRINCIPAIS DO USUÁRIO (END-TO-END)

### Fluxo 1: Onboarding e Importação Automática de Parceiro com IA
```
Executivo de Mídia recebe Mídia Kit despadronizado em PDF
                          ↓
Acessa a tela /parceiros e clica em [Importar Dados] → "Importar Lote / Pasta (IA Gemini)"
                          ↓
Faz upload do arquivo (PDF de 50 páginas ou planilha)
                          ↓
O backend processa com Google Gemini 2.5 Flash e JSON Schema estrito
                          ↓
O sistema exibe o Modal de Pré-visualização com dados cadastrais e tabela de produtos extraídos
                          ↓
O usuário confirma e o sistema cadastra o Parceiro e todos os Produtos vinculados no Supabase
```

### Fluxo 2: Criação de Proposta Comercial e Apresentação
```
Executivo acessa /propostas e clica em [+ Nova Proposta]
                          ↓
Seleciona o Cliente, Agência e adiciona os Pontos de Mídia desejados
                          ↓
Utiliza o Simulador de Descontos e Rentabilidade para calibrar a margem
                          ↓
Clica em [Gerar Apresentação] → O sistema gera arquivo PPTX premium editável ou link interativo
                          ↓
Apresenta ao Anunciante e obtém aceite comercial
```

### Fluxo 3: Emissão de Pedido de Inserção (PI) e Assinatura Digital
```
A proposta é convertida com 1 clique em Pedido de Inserção em /pi
                          ↓
Se o desconto exceder o teto, o sistema dispara token para aprovação da Diretoria (/aprovar-diretoria/$token)
                          ↓
Após aprovado, o sistema gera o Link Único de Assinatura (/assinar/$token) para o cliente
                          ↓
O cliente assina na tela (com suporte a toque/mouse) e confirma
                          ↓
O sistema carimba o hash criptográfico SHA-256, IP e data/hora no documento PDF oficial
```

### Fluxo 4: Operação, Checking e Conciliação Financeira
```
A campanha entra em veiculação e é acompanhada em /historico-veiculacao
                          ↓
A equipe operacional anexa fotos comprovatórias no Checking do PI
                          ↓
O módulo Financeiro (/financeiro) gera as contas a receber do cliente e contas a pagar do parceiro
                          ↓
O módulo de Comissões (/comissoes) apura a bonificação do executivo de contas responsável
```

---

## 7. COMPONENTES REUTILIZÁVEIS E DESIGN SYSTEM

Os componentes do sistema seguem alto rigor de encapsulamento e usabilidade:

1. **`AppShell` (`src/components/AppShell.tsx`):**
   - Estrutura mestre da aplicação;
   - Barra lateral categorizada em 7 grupos funcionais;
   - Suporte completo a White-Label e multitenancy com detecção de modo *Nexo Mídia*;
   - Drawer mobile responsivo espelhado.
2. **`ImportDropdown` (`src/components/ImportDropdown.tsx`):**
   - Menu modular de importação em dois níveis;
   - Subcomponentes isolados: `ImportBatchOption`, `ImportMediaKitOption`, `ImportSpreadsheetOption`, `SyncGoogleDriveOption`, `DownloadTemplateOption`.
3. **`SimuladorPropostaModal` (`src/components/SimuladorPropostaModal.tsx`):**
   - Calculadora financeira de margens, markup e comissões com projeção visual em tempo real.
4. **`UniversalAssinaturaModal` (`src/components/UniversalAssinaturaModal.tsx`):**
   - Captura de assinatura digital manuscrita com validação de termos e carimbo de auditoria.
5. **`PriceCalculator` (`src/components/PriceCalculator.tsx`):**
   - Algoritmo de precificação progressiva de bi-semanas OOH e períodos customizados.

---

## 8. FUNCIONALIDADES DE INTELIGÊNCIA ARTIFICIAL (GEMINI 2.5)

### 8.1 Integração Técnica
O Mídia.OS utiliza o modelo `gemini-2.5-flash` da família Google DeepMind via SDK `@google/genai`:
- **Latência Ultra-baixa:** Processamento de mídia kits pesados em menos de 8 segundos;
- **JSON Schema Rigoroso:** Garantia de que a resposta respeite tipagens como formato de mídia, geolocalização e valores decimais.

### 8.2 Aplicações Práticas Ativas
1. **Parser de Mídia Kits (`midia-kit-ai.functions.ts`):** Extrai nome do parceiro, CNPJ, razão social, e-mail, telefone e lista todos os pontos com formato, praça e tabela de preço;
2. **Estratégia de Mídia Automatizada (`estrategia-midia-ia.ts`):** Analisa o público-alvo e o objetivo de um briefing e recomenda automaticamente os melhores formatos e praças de veiculação;
3. **Resumo Executivo de Propostas (`proposta-ia.functions.ts`):** Escreve argumentos persuasivos de venda customizados para o perfil de cada anunciante.

---

## 9. PIPELINE DE IMPORTAÇÃO E SINCRONIZAÇÃO

O sistema suporta três pilares de ingestão de dados:

1. **Arquivos Locais Despadronizados:**
   - PDFs de apresentações comerciais;
   - Planilhas Excel (.xlsx) e arquivos .csv com layouts variáveis;
   - Mapeamento e normalização realizados pela IA.
2. **Planilhas Modelo Padronizadas:**
   - Download de modelo `.xlsx` oficial com cabeçalhos estruturados (`exportar-modelo-produtos.ts`);
   - Ingestão em lote de milhares de pontos em poucos segundos.
3. **Nuvem e APIs Externas:**
   - **Google Drive Sync:** Leitura de pastas de parceiros na nuvem para download e extração periódica;
   - **BrasilAPI / Receita Federal:** Consulta em tempo real por CNPJ trazendo razão social, endereço completo, CNAE e situação cadastral ativa.

---

## 10. SEGURANÇA, AUTENTICAÇÃO E RBAC MULTI-TENANT

### 10.1 Níveis de Acesso (RBAC)
- **`isSuperAdmin` (Master):** Acesso global de infraestrutura, criação de tenants e métricas da plataforma SaaS;
- **`isAdmin` (Administrador do Tenant):** Controle total da empresa, usuários, configurações de branding e exclusões;
- **`isDiretoria`:** Alçadas superiores de desconto, aprovação de PIs estratégicos e relatórios financeiros;
- **`executivo` (Vendedor de Mídia):** Gestão da sua própria carteira de clientes, criação de propostas e PIs;
- **`parceiro_comercial`:** Acesso restrito a visualização de faturamento e inventário dos seus próprios produtos;
- **`CLIENT` e `VEHICLE`:** Portais públicos dedicados para assinaturas e conferência de veiculações.

### 10.2 Proteção Contra Perda de Dados
- **Sem Comandos Destrutivos:** Scripts destrutivos são bloqueados por política de segurança;
- **Gatilho de Auditoria Universal:** Todo update ou insert registra o estado anterior e novo em JSONB;
- **Soft-Delete Seguro (`trash_items`):** Exclusões salvam um snapshot completo com restauração garantida com um clique.

---

## 11. PONTOS FORTES DO SISTEMA

1. **Especialização Profunda no Mercado Publicitário:** O sistema resolve dores reais de agências e exibidoras (bi-semanas OOH, PIs com checking, comissão de agência/BV);
2. **Arquitetura Moderna e Veloz:** TanStack Start com Nitro SSR proporciona carregamento instantâneo e SEO otimizado;
3. **Robustez Financeira:** Precisão monetária sem erros de arredondamento através de tipos decimais estritos;
4. **Isolamento Multi-Tenant Inviolável:** Separação a nível de banco de dados por RLS, conferindo segurança jurídica para clientes corporativos;
5. **Automação Inteligente:** Uso pioneiro de IA multimodal para resolver o maior gargalo do setor: a despadronização de inventários.

---

## 12. ANÁLISE CRÍTICA E OPORTUNIDADES DE MELHORIA

1. **UX em Telas com Grande Volume de Dados:** Na tela de produtos, quando o inventário ultrapassa 5.000 pontos, deve-se adotar paginação via cursor do PostgreSQL para reduzir tráfego de dados;
2. **Notificações em Tempo Real:** Adicionar canal WebSocket do Supabase Realtime para alertar executivos no momento exato em que um cliente assina uma proposta ou PI;
3. **Aplicativo Nativo Offline:** Expandir o suporte atual do PWA para um app nativo com cache local para que equipes de checking em campo façam fotos mesmo sem sinal 4G/5G;
4. **Central de Ajuda Integrada:** Incluir pequenos tutoriais em vídeo ou tours guiados interativos dentro de cada módulo.

---

## 13. ROADMAP SUGERIDO DE EVOLUÇÃO

### Fase 1: Otimização de Performance e Refinamento
- Paginação sob demanda com virtualização de linhas no inventário de produtos;
- Push notifications web ativas para alertas de aprovação de PIs.

### Fase 2: Novos Recursos Operacionais
- Portal do Instalador OOH com geolocalização e envio de fotos com coordenadas GPS validadas;
- Integração bancária direta para emissão de boletos registrados e split de pagamentos automático.

### Fase 3: Inteligência Artificial Preditiva
- Algoritmo de precificação dinâmica de mídia conforme taxa de ocupação da cidade e sazonalidade;
- Geração autônoma de simulação de concorrência com base em anúncios históricos.

### Fase 4: Expansão e Escala Comercial
- Marketplace B2B aberto de mídia exterior, permitindo que anunciantes comprem espaços diretamente pela vitrine;
- Integração nativa com plataformas programáticas (pDOOH).

---

## 14. EXPORTAÇÃO E ARTEFATOS GERADOS

Esta documentação técnica integral foi compilada e exportada nos seguintes formatos na raiz do repositório:
- **Markdown Completo:** `DOCUMENTACAO_COMPLETA_MIDIA_OS.md`
- **Documento PDF Oficial:** `DOCUMENTACAO_COMPLETA_MIDIA_OS.pdf`

*Mídia.OS — Plataforma de Inteligência Comercial e Operações de Mídia © 2026.*
