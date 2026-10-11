# PLANO MESTRE DE EVOLUÇÃO ARQUITETURAL — MÍDIA.OS 3.0
## Transformação em Plataforma SaaS Especializada para o Ecossistema de Mídia Publicitária

> **Classificação:** Documento Estratégico de Engenharia de Software e Produto SaaS  
> **Versão de Referência:** Mídia.OS v2.6.0 (Homologado em Produção)  
> **Ambiente Operacional:** Produção (Política Ativa de Zero Perda de Dados — `AGENTS.md`)  
> **Atores Alvo:** Veículos de Comunicação, Exibidoras de Mídia, Representantes Comerciais, Agências de Publicidade e Anunciantes  
> **Data de Emissão:** Outubro de 2026  

---

## SUMÁRIO EXECUTIVO

O **Mídia.OS** consolidou-se como uma das soluções mais avançadas do mercado brasileiro para automação comercial e operacional de mídia *Out-of-Home* (OOH/DOOH), veículos de comunicação e representação comercial.

Este documento estabelece o **Plano de Evolução para o Mídia.OS 3.0**, desenhado para transformar a plataforma em um ecossistema SaaS *Enterprise Multi-Persona*, integrando de ponta a ponta os **cinco atores vitais do mercado publicitário**:

1. **Veículos de Comunicação** (Emissoras de TV, Estações de Rádio, Portais de Notícias, Jornais e Revistas);
2. **Exibidoras de Mídia** (Proprietárias de redes de painéis de LED, frontlights, totens, empenas, busdoors e abrigos);
3. **Representantes Comerciais de Mídia** (Hubs de representação que consolidam inventários de dezenas de veículos regionais e exibidoras);
4. **Agências de Publicidade** (Departamentos de mídia, planejamento estratégico, compras, Bonificação de Volume - BV e checking);
5. **Anunciantes / Marcas** (Diretorias de marketing, controle de investimento em mídia, validação de checking em tempo real e comprovação de veiculação).

---

## 1. SITUAÇÃO ATUAL DO SISTEMA

### 1.1 Arquitetura Técnica Atual
- **Frontend & Roteamento:** React 19, TypeScript 5.8, Tailwind CSS v4, TanStack Router (58 rotas em arquivo com code-splitting sob demanda);
- **Camada Full-Stack & SSR:** TanStack Start acoplado ao servidor Nitro (Node.js edge-ready), utilizando **Server Functions isomorfas** (`createServerFn`) com validação de entrada via `zod`;
- **Gerenciamento de Estado:** TanStack Query v5 (`@tanstack/react-query`) para cache distribuído, invalidação seletiva e sincronização reativa;
- **Banco de Dados & Nuvem:** Supabase (PostgreSQL 14.5 gerenciado) operando sob **Row-Level Security (RLS)** rigoroso por `tenant_id`;
- **Inteligência Artificial:** SDK Google Gemini (`gemini-2.5-flash`) integrado na ingestão de mídia kits despadronizados, geração de recomendações estratégicas e resumos executivos;
- **Geração de Documentos:** Motores duais de PDF (`jspdf`, `jspdf-autotable`) e apresentações dinâmicas em PowerPoint 16:9 widescreen (`pptxgenjs`), além de manipulação de planilhas (`xlsx`);
- **Assinaturas Eletrônicas:** Infraestrutura própria com carimbo de tempo, captura de IP e hash criptográfico SHA-256.

### 1.2 Módulos Existentes
1. **Comercial & CRM:** Cadastro de anunciantes, agências parceiras, funil Kanban comercial e gestão de tarefas;
2. **Inventário & Mídia:** Gestão de pontos próprios e de parceiros com geolocalização GPS, galeria de fotos, visualização em cards responsivos e mapa interativo Leaflet;
3. **Planejamento Estratégico:** Modelagem de campanhas sobre 5 pilares estratégicos (*Afinidade Territorial, Frequência, Visibilidade, Mobilidade, Ativação*), cálculo de alocação orçamentária e Assistente IA de Estratégia;
4. **Propostas Comerciais & Simulador:** Simulador interativo com markup, travas de desconto, exportação em 4 templates estratégicos (*Corporativo, OOH, DOOH, Digital*) e 9 seções executivas;
5. **Operações & Pedidos de Inserção (PI):** Ciclo completo de emissão de PIs, cálculo de valor líquido com agência (80%), aprovação de diretoria, checking fotográfico e histórico de veiculação;
6. **Central de Assinaturas:** Portal público e auditado de formalização de PIs e contratos;
7. **Financeiro & Comissões:** DRE gerencial, contas a pagar/receber, conciliação de permutas comerciais e apuração automatizada de comissões por regras;
8. **Dashboard Executivo de Inteligência:** Painel C-Level com 8 KPIs essenciais (*Faturamento, Propostas abertas, PIs ativos, Campanhas em andamento, Inventário disponível, Ocupação dos pontos, Margem média, Comissões*) e 4 gráficos do Design System.

### 1.3 Banco de Dados e Relacionamentos
O modelo relacional atual é centrado na cadeia comercial:

```
[tenants] (Multi-tenant isolado via RLS)
   │
   ├── [clientes] ────────────┐
   │                          │ 
   ├── [agencias] ────────────┼───────► [propostas] ───► [proposta_itens]
   │                          │             │
   ├── [parceiros] ───────────┘             └───► [pis] ──┬──► [pi_itens]
   │       │                                              ├──► [pi_financeiro]
   │       └──► [produtos] ───────────────────────────────┼──► [pi_checkings]
   │                                                      └──► [pi_assinaturas]
   └── [campanhas_planejamento] ──► [pontos_midia_planejamento] ──► [estrategias_ia]
```

### 1.4 Regras de Negócio e Travas Ativas
- **Trava de Faturamento Líquido:** Vendas intermediadas por agência de publicidade deduzem automaticamente 20% do bruto como remuneração padrão de agência;
- **Trava de Centavos Financeiros:** Nenhuma operação monetária aceita arredondamento flutuante que gere divergência entre a soma dos itens e o valor do PI;
- **Política de Zero Perda de Dados:** Gatilhos PostgreSQL alimentam `auditoria_alteracoes` e o snapshot JSONB em `trash_items`. Proibição absoluta de scripts destrutivos (`DROP`, `TRUNCATE`, `DELETE` sem restrição de chave).

---

## 2. PONTOS FORTES DO SISTEMA

1. **Tipagem e Segurança Isomorfa (End-to-End Type Safety):**  
   O uso de `createServerFn` elimina a necessidade de manutenção de endpoints REST ou Swagger desincronizados. Qualquer alteração em contratos de tipos é validada no compilador TypeScript em tempo real.
2. **Isolamento Multi-Tenant Inviolável:**  
   O modelo de banco com RLS por `tenant_id` previne vazamento de dados entre empresas, mesmo sob concorrência intensa.
3. **Poder de Extração e Estratégia com IA (Gemini 2.5 Flash):**  
   Capacidade nativa de ler mídia kits em PDFs complexos e gerar planos de mídia com justificativas comerciais sólidas em segundos.
4. **Motores Nativos de Apresentações Executivas:**  
   Geração em tempo real de apresentações PPTX widescreen e PDFs de alto padrão com co-branding, fotos reais de ativos e justificativa estratégica.
5. **Auditoria Criptográfica e Assinatura Jurídica:**  
   O motor de assinatura próprio gera trilha de auditoria completa (IP, user agent, carimbo de data/hora e hash SHA-256), dispensando gateways caros de terceiros.
6. **Resiliência e Cobertura de Testes Automatizados:**  
   Suíte mestre executando 65 testes automatizados (100% aprovados, tempo de execução < 0.25s) sem falhas flaky.

---

## 3. PONTOS DE MELHORIA IDENTIFICADOS

1. **Arquitetura de Código Plana em `src/lib/`:**  
   A pasta `src/lib/` acumula mais de 125 arquivos misturando funções de servidor, geradores de PDF, cálculos matemáticos e integrações de IA. Falta uma separação clara em **Módulos de Domínio (DDD)**.
2. **Experiência Monolítica para Atores Distintos:**  
   Atualmente, todas as personas compartilham o mesmo layout de navegação. Um executivo de veículo precisa de recursos diferentes dos de um planejador de agência ou de um anunciante conferindo checking fotográfico.
3. **Gestão de Repasses Financeiros Complexos (Split de Pagamentos):**  
   Representantes comerciais precisam fazer split financeiro entre o valor recebido do anunciante, o desconto de agência (BV), a retenção de comissão do representante e o repasse líquido ao veículo/exibidora proprietária do ponto. Hoje essa apuração ainda exige etapas manuais na conciliação.
4. **Checking de Veiculação em Tempo Real com Validação Inteligente:**  
   Embora o sistema suporte fotos de checking, ainda falta validação automática por IA para atestar legibilidade da marca na foto, metadados EXIF de geolocalização e data/hora para blindagem contra fraudes.
5. **Ausência de um Portal Especializado para o Anunciante (Brand Center):**  
   O anunciante final interage apenas via links pontuais de assinatura de PI. Falta um portal exclusivo onde ele possa acompanhar o mapa de sua campanha no ar, relatórios de impactos diários e comprovantes fiscais.

---

## 4. RISCOS DA ALTERAÇÃO E MEDIDAS MITIGADORAS

| Risco Identificado | Nível | Impacto Potencial | Estratégia de Mitigação (Inviolável) |
| :--- | :---: | :--- | :--- |
| **Perda ou corrupção de dados em produção** | **Crítico** | Prejuízo financeiro e operacional grave para clientes ativos. | Manter a **Política de Zero Perda de Dados**: migrações SQL 100% aditivas (`ADD COLUMN IF NOT EXISTS`), sem remoção de colunas antigas e preservando gatilhos de lixeira lógica (`trash_items`). |
| **Quebra de cálculos financeiros históricos** | **Alto** | Divergência em faturamentos, comissões ou repasses de PIs já emitidos. | Utilizar snapshots imutáveis (`detalhes_venda` JSONB e campos congelados no fechamento do PI). Nenhuma alteração retroativa é permitida em PIs faturados. |
| **Regressão em rotas públicas de assinatura** | **Alto** | Clientes e agências impedidos de assinar PIs e aprovar propostas. | Preservar integralmente as rotas `/assinar/$token` e `/aprovar-diretoria/$token` com testes ponta a ponta na suíte de homologação. |
| **Aumento excessivo do bundle size** | **Médio** | Lentidão no carregamento de páginas e degradação de Core Web Vitals. | Manter política de *dynamic imports* (`await import(...)`) para bibliotecas volumosas (`pptxgenjs`, `jspdf`, `xlsx`, `pdfjs-dist`). |
| **Fricção de usabilidade (Over-engineering)** | **Médio** | Usuários habituados com o fluxo atual sentirem confusão ou resistência. | Permitir que o usuário alterne livremente entre a visão clássica e as novas visões inteligentes, mantendo atalhos e terminologias familiares. |

---

## 5. MELHOR ARQUITETURA FUTURA: MÍDIA.OS 3.0

### 5.1 Conceito Central: A Plataforma Multi-Persona Omnichannel
O **Mídia.OS 3.0** adotará uma arquitetura modular orientada a personas e fluxos de valor. Cada organização poderá operar em um ou mais modos especializados:

```
                               ┌──────────────────────────────────────────────────────────┐
                               │                    MÍDIA.OS 3.0 CORE                     │
                               │   Multi-Tenant • RLS • Auditoria • Motor Financeiro      │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
         ┌───────────────────┬──────────────────────────────┼──────────────────────────────┬───────────────────┐
         ▼                   ▼                              ▼                              ▼                   ▼
┌─────────────────┐ ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐ ┌─────────────────┐
│  MODO VEÍCULO   │ │ MODO EXIBIDORA  │            │MODO REPRESENTANTE│           │  MODO AGÊNCIA   │ │ MODO ANUNCIANTE │
│  (TV / Rádio /  │ │   (OOH / DOOH)  │            │  (Hub Multi-    │            │ (Planejamento,  │ │ (Brand Center,  │
│    Digital)     │ │                 │            │    Veículo)     │            │ Mídia & BV)     │ │ Checking, ROI)  │
├─────────────────┤ ├─────────────────┤            ├─────────────────┤            ├─────────────────┤ ├─────────────────┤
│• Grade Program. │• Mapa de Pontos   │            │• Catálogo Multi │            │• Planejamento   │• Mapa Ao Vivo   │
│• Faixas Horárias│• Dimensões/LED    │            │• Tabela Parcer. │            │• Mídia Mix      │• Fotos Checking │
│• Audiência IBOPE│• Rotas & Fluxos   │            │• Split Repasses │            │• Gestão de BV   │• Faturas & PIs  │
│• Checking Áudio │• Checking Foto    │            │• Book Integrado │            │• Aprovações     │• Métricas Brand │
└─────────────────┘ └─────────────────┘            └─────────────────┘            └─────────────────┘ └─────────────────┘
```

---

### 5.2 Estrutura Modular Proposta para o Código (`/src/modules`)
Evolução gradual da pasta `src/lib/` para domínios isolados e auto-contidos:

```
src/
 ├── modules/
 │    ├── core/                # Tenant, organização, autenticação, RBAC, configurações
 │    ├── crm/                 # Clientes, agências, contatos, pipeline de vendas
 │    ├── inventory/           # Produtos, pontos OOH/DOOH, grades TV/Rádio, circuitos
 │    ├── strategy/            # Planejamento estratégico, 5 pilares, integração Gemini
 │    ├── proposals/           # Motor de propostas, simulador de markup, 4 templates
 │    ├── insertion-orders/    # Ciclo de vida do PI, travas de centavos, aditivos
 │    ├── contracts-signatures/# Central de assinaturas eletrônicas, hash SHA-256
 │    ├── checking/            # Checking fotográfico, validação EXIF/GPS, relatórios
 │    ├── finance/             # DRE, contas, conciliação, split de pagamentos, comissões
 │    ├── intelligence/        # Dashboard executivo C-Level, métricas e BI
 │    └── integrations/        # BrasilAPI, Google Drive, WhatsApp, Webhooks públicos
 ├── components/
 │    ├── ui/                  # Primitivos base do Design System (Radix + Tailwind)
 │    ├── shared/              # Componentes universais (tabelas, filtros, uploaders)
 │    └── personas/            # Telas e widgets customizados por perfil de usuário
 └── routes/                   # Rotas organizadas por Route Groups do TanStack Router
```

---

### 5.3 Módulos de Especialização para os 5 Atores

#### 1. Módulo para Veículos de Comunicação (TV, Rádio, Portais)
- **Grade de Programação Dinâmica:** Mapeamento de faixas horárias, breaks comerciais, programas e inventário de inserções disponíveis por dia/semana;
- **Classificação de Inserções:** Testemunhais, vinhetas de patrocínio, comerciais de 15s/30s/60s, banners digitais de portal;
- **Comprovação de Irradiação:** Importação e conciliação de relatórios de exibição da central técnica.

#### 2. Módulo para Exibidoras de Mídia (OOH e DOOH)
- **Gestão Territorial Georreferenciada:** Inventário geolocalizado com coordenadas precisas, fotos de alta resolução, especificações físicas e fluxo veicular auditado;
- **Calendário de Bi-Semanas OOH:** Cálculo automatizado das 26/27 bi-semanas oficiais do calendário nacional de mídia exterior;
- **Monitoramento de Telas Digitais (DOOH):** Suporte a métricas de loops por hora, tempo de vinheta (10s/15s) e integração com softwares players via Webhook.

#### 3. Módulo para Representantes Comerciais de Mídia (Hub Multi-Veículo)
- **Matriz de Parceiros e Catálogo Consolidado:** Agrupamento de inventários de múltiplos veículos sob um único teto comercial;
- **Tabela de Acordos de Representação:** Parametrização de comissão padrão por veículo (ex.: 20%, 25%, 30%), margens de sobre-tabela e exclusividades territoriais;
- **Motor Automatizado de Split Financeiro:** Ao faturar um PI, o sistema decompõe a cobrança em:
  - Faturamento Bruto cobrado do Anunciante;
  - Desconto da Agência (20% BV Padrão);
  - Retenção do Representante Comercial (Comissão do Hub);
  - Repasse Líquido à Exibidora/Veículo parceiro.

#### 4. Módulo para Agências de Publicidade
- **Planejamento de Mídia Multicanal:** Seleção unificada de pontos e formatos de diferentes veículos em um único plano de mídia consolidado;
- **Painel de Controle de BV (Bonificação de Volume):** Acompanhamento das metas de investimento por veículo e comissões de agência acumuladas;
- **Aprovação Colaborativa de Propostas:** Ambiente para o planejador de mídia revisar, editar e aprovar propostas antes de apresentar ao anunciante.

#### 5. Módulo para Anunciantes / Marcas (Brand Center)
- **Portal do Anunciante White-Label:** Interface onde a marca acompanha em tempo real as campanhas ativas no ar;
- **Checking Fotográfico e Geográfico:** Visualização das fotos de veiculação plotadas no mapa com carimbo de data, hora e endereço comprovado;
- **Central de Documentos Fiscais e Jurídicos:** Acesso direto a propostas aprovadas, PIs assinados eletronicamente e notas fiscais para compliance.

---

## 6. PLANO DE IMPLEMENTAÇÃO POR ETAPAS

A transição para o **Mídia.OS 3.0** será conduzida em **5 fases incrementais e não-destrutivas**, assegurando zero downtime e conformidade irrestrita com a política de integridade de dados.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CRONOGRAMA DE EVOLUÇÃO — MÍDIA.OS 3.0                           │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [FASE 1] Arquitetura de Domínios & Perfis Multi-Persona (Fundação)
   ├── Organização modular em src/modules/ (sem quebra de importações antigas)
   ├── Criação das personas organizacionais (Veículo, Exibidora, Hub, Agência, Anunciante)
   └── Expansão da suíte de testes de integridade

 [FASE 2] Módulos Especializados para Veículos e Exibidoras (Inventário 3.0)
   ├── Grade de programação e faixas horárias para TV e Rádio
   ├── Calendário oficial de bi-semanas OOH e especificações técnicas de LED
   └── Checking fotográfico inteligente com extração de metadados EXIF/GPS

 [FASE 3] Representação Comercial & Liquidação Financeira em Cascata (Split)
   ├── Gestão de acordos de representação comercial e regras de sobretabela
   ├── Motor de split financeiro automatizado (Anunciante -> Agência -> Hub -> Veículo)
   └── Relatórios de repasse com conciliação automática

 [FASE 4] Portais Colaborativos para Agências e Anunciantes (Experiência Externa)
   ├── Workspace de Agência para montagem de planos e acompanhamento de BV
   ├── Portal do Anunciante (Brand Center com mapa ao vivo e checking fotográfico)
   └── Central universal de assinaturas integrada ao fluxo de compras

 [FASE 5] API Gateway, Webhooks & Automação Inteligente de Mídia
   ├── API pública documentada para integração com ERPs e AdServers
   ├── Webhooks para disparo de checking e players de mídia DOOH
   └── Homologação final, testes de carga e Go-Live oficial da versão 3.0
```

---

### Detalhamento das Etapas de Implementação

#### FASE 1: Arquitetura de Domínios e Perfis Multi-Persona (Fundação)
- **Objetivo:** Estabelecer as bases da v3.0 sem alterar o funcionamento das rotas atuais.
- **Entregáveis:**
  1. Criação da estrutura de pastas `src/modules/` com reexportações seguras para retrocompatibilidade;
  2. Adição da coluna `tipo_organizacao` na tabela `organizacoes` (`'veiculo'`, `'exibidora'`, `'representante'`, `'agencia'`, `'anunciante'`) via migração estritamente aditiva;
  3. Parametrização da interface no `<AppShell>` para adaptar atalhos e menus com base no perfil ativo da empresa.
- **Critério de Aceite:** 100% dos testes existentes continuando verdes e build sem falhas.

#### FASE 2: Inventário Especializado (Veículos e Exibidoras)
- **Objetivo:** Atender às particularidades técnicas de cada meio de veiculação.
- **Entregáveis:**
  1. Expansão de produtos para contemplar grades horárias (TV/Rádio) e bi-semanas sincronizadas (OOH);
  2. Módulo de Checking Inteligente: upload de comprovante de veiculação com leitura de metadados EXIF (coordenadas geográficas reais e data/hora do arquivo);
  3. Geração de relatórios fotográficos automatizados em PDF de alta resolução com carimbo auditado.
- **Critério de Aceite:** Exibição perfeita no mapa de inventário e no novo relatório de checking.

#### FASE 3: Representação Comercial e Split Financeiro em Cascata
- **Objetivo:** Automatizar o faturamento e repasse entre múltiplos agentes da cadeia.
- **Entregáveis:**
  1. Tabela relacional `acordos_representacao` vinculando representantes aos parceiros e taxas;
  2. Motor de cálculo de repasses no PI, gerando os registros de contas a receber (anunciante) e contas a pagar (veículos) de forma automática;
  3. Relatório analítico de margem e rentabilidade por veículo representado.
- **Critério de Aceite:** Testes de precisão financeira cobrindo 100 cenários com tolerância zero para divergências de centavos.

#### FASE 4: Portais Colaborativos (Agências e Anunciantes)
- **Objetivo:** Abrir a plataforma com segurança para parceiros e clientes externos.
- **Entregáveis:**
  1. **Workspace Agência:** Área onde a agência monta planos cruzando veículos e gerencia BV;
  2. **Portal Anunciante (Brand Center):** Acesso com link seguro / senha onde o cliente final visualiza o mapa da campanha, fotos dos pontos ativos e status das veiculações;
  3. Notificações automáticas via WhatsApp/E-mail sobre início de veiculação e envio de checking.
- **Critério de Aceite:** Testes de isolamento RLS garantindo que agências e anunciantes visualizem exclusivamente seus dados autorizados.

#### FASE 5: API Gateway, Webhooks e Automação de Mídia
- **Objetivo:** Tornar o Mídia.OS interoperável com o ecossistema tecnológico global.
- **Entregáveis:**
  1. Endpoints de API REST seguros (API Keys) para leitura de inventário e emissão de propostas/PIs via sistemas externos;
  2. Disparo de Webhooks em eventos-chave (`proposta.aprovada`, `pi.emitido`, `checking.concluido`);
  3. Documentação interativa para desenvolvedores e integradores.
- **Critério de Aceite:** Auditoria completa de segurança, testes de concorrência com 100 requisições simultâneas e homologação final.

---

## 7. DIRETRIZES DE ENGENHARIA E GOVERNANÇA

1. **Modo Produção — Zero Perda de Dados:**  
   Nenhum comando SQL de migração poderá executar `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` ou `DELETE` em massa. Todas as evoluções serão exclusivamente retrocompatíveis e aditivas.
2. **Imutabilidade Histórica de Contratos:**  
   Propostas já aprovadas, PIs faturados e comprovantes assinados permanecerão intocados, garantindo segurança fiscal e jurídica permanente aos clientes.
3. **Auditoria Contínua:**  
   A cada sprint ou entrega de fase, a suíte de testes de homologação master (`executar-auditoria-homologacao.mjs`) e o comando de compilação de produção (`node scripts/build.mjs`) deverão ser executados e aprovados integralmente com código de saída 0.

---

*Documento homologado para a evolução arquitetural do ecossistema Mídia.OS 3.0.*
