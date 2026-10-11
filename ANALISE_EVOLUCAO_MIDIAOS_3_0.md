# ANÁLISE ARQUITETURAL DO MÍDIA.OS — PREPARAÇÃO PARA A EVOLUÇÃO 3.0 (SAAS ENTERPRISE)

> **Documento de Engenharia de Software e Arquitetura de Produto**  
> **Status:** Relatório Interno de Diagnóstico Estrutural  
> **Versão de Referência Atual:** 2.6.0  
> **Objetivo:** Mapeamento arquitetural para escala Enterprise, modularização desacoplada e evolução sustentável sem regressão ou perda de dados.

---

## 1. ESTRUTURA ATUAL DE MÓDULOS

### 1.1 Diagnóstico do Estado Atual
Atualmente, a lógica de negócio do sistema reside predominantemente em `src/lib/`, com mais de 120 arquivos que misturam:
- **Server Functions (`createServerFn`):** Mutações e queries que executam no servidor Node.js/Nitro e acessam o Supabase;
- **Utilitários de Cálculo e Negócio:** Fórmulas de bi-semanas OOH, cálculo de bonificação de volume (BV), precisão financeira com Decimal/Centavos;
- **Geradores de Mídia e Arquivos:** Funções de geração e parsing de PDF (`jspdf`), apresentações PPTX (`pptxgenjs`) e planilhas (`xlsx`);
- **Integrações de Inteligência Artificial:** SDK do Google Gemini 2.5 Flash (`@google/genai`).

### 1.2 Módulos Funcionais Identificados
1. **Core & Multi-Tenancy:** `tenants.functions.ts`, `organizacoes.functions.ts`, `tenant-settings.functions.ts`, `roles.server.ts`;
2. **Entidades Comerciais (CRM/Cadastros):** `clientes.functions.ts`, `agencias.functions.ts`, `crm.functions.ts`, `tarefas.functions.ts`;
3. **Inventário & Mídia:** `produtos.functions.ts`, `parceiros.functions.ts`, `midia-config.functions.ts`, `circuitos-bundles.functions.ts`;
4. **Vendas & Propostas:** `propostas.functions.ts`, `simulador-propostas.functions.ts`, `proposta-presentation.ts`, `proposta-ia.functions.ts`;
5. **Operações & Pedidos de Inserção (PI):** `pi.functions.ts`, `insertion-orders.functions.ts`, `pi-emissao.functions.ts`, `pi-pdf.ts`;
6. **Assinaturas & Formalização:** `assinaturas-universal.functions.ts`, `assinaturas.functions.ts`, `aprovacao-diretoria.functions.ts`;
7. **Financeiro & Remuneração:** `financeiro.functions.ts`, `comissoes.functions.ts`, `permuta.functions.ts`;
8. **Inteligência Artificial & Ingestão:** `midia-kit-ai.functions.ts`, `inventario-gemini.functions.ts`, `drive-sync.functions.ts`, `estrategia-midia-ia.ts`;
9. **Canais & Apoio:** `landing-pages.functions.ts`, `influenciadores.functions.ts`, `social-media.functions.ts`, `materiais-apoio.tsx`.

### 1.3 Avaliação Arquitetural
- **Ponto Forte:** O uso de `createServerFn` do TanStack Start garante tipagem ponta a ponta (TypeScript) entre cliente e servidor, sem necessidade de manter uma camada OpenAPI/REST externa duplicada;
- **Oportunidade na v3.0:** Os arquivos em `src/lib/` estão todos no mesmo diretório plano (flat). Na v3.0, a organização deve evoluir para **Domínios Modulares** (Domain-Driven Design / Clean Architecture), como `src/modules/{crm, inventory, proposals, pi, finance, ai}/`.

---

## 2. ORGANIZAÇÃO DAS ROTAS

### 2.1 Padrão Vigente (TanStack Router)
- O roteamento segue o paradigma **file-based routing** do TanStack Router dentro de `src/routes/`.
- Existem 57 arquivos de rota na raiz de `src/routes/`, com subpastas dedicadas para rotas públicas (`/site/*`, `/lp/*`) e de aprovação externa (`/assinar/$token`, `/aprovar-diretoria/$token`).

### 2.2 Análise de Eficiência e Code-Splitting
- **Layout Master Unificado (`AppShell`):** As rotas internas compartilham o layout mestre através do componente `<AppShell>`, que garante carregamento sob demanda, RBAC multinível e renderização de sidebar categorizada;
- **Code-Splitting Automático:** O TanStack Router com Vite faz chunking automático por rota. Rotas pesadas como `/pi` (129 kB) e `/produtos` (70 kB) carregam apenas quando acessadas pelo usuário;
- **Rotas Públicas Isoladas:** As rotas que não requerem autenticação (`/site/*`, `/assinar/$token`, `/pos-venda/$token`) dispensam o carregamento de componentes pesados da dashboard interna, garantindo First Contentful Paint (FCP) veloz.

### 2.3 Oportunidade de Evolução 3.0
- Agrupar rotas por escopos funcionais utilizando diretórios do TanStack Router com parênteses (Route Groups), por exemplo:
  - `src/routes/(app)/...` para o sistema administrativo interno;
  - `src/routes/(public)/...` para portais de assinatura, pós-venda e vitrines;
  - `src/routes/(site)/...` para o portal institucional e institucional SEO.

---

## 3. COMPONENTES REUTILIZÁVEIS EXISTENTES

### 3.1 Camada de Design System (`src/components/ui/`)
- Construída sobre primitivos **Radix UI** desacoplados e Tailwind CSS v4;
- Componentes altamente testados e acessíveis (WCAG): `Dialog`, `DropdownMenu`, `Tabs`, `Table`, `Select`, `Button`, `Badge`, `Card`, `Switch`, `Tooltip`, `Sheet`, `ScrollArea`, `Command/Combobox`.

### 3.2 Componentes Especializados de Negócio (`src/components/`)
1. **`ImportDropdown.tsx`:** Menu modular de importação em 2 níveis, separando Adicionar Conteúdo, Sincronização e Modelos;
2. **`AppShell.tsx`:** Casca da aplicação com barra lateral dividida em 7 macro-categorias e drawer mobile touch-friendly;
3. **`SimuladorPropostaModal.tsx` & `PriceCalculator.tsx`:** Componentes de alta complexidade matemática para calibração de markup, desconto e regras de bi-semana;
4. **`UniversalAssinaturaModal.tsx`:** Motor universal de assinatura digital canvas com hashing SHA-256;
5. **Form Dialogs Padronizados:** `ClienteFormDialog`, `AgenciaFormDialog`, `ParceiroFormDialog`, `ProdutoFormDialog`, `PiFormDialog`.

### 3.3 Oportunidade de Evolução 3.0
- Criar uma pasta dedicada `src/components/shared/` ou extrair formulários repetitivos para um padrão de **Form Factory** baseado em esquemas `zod`, reduzindo a duplicação de campos comuns (CNPJ, Endereço, Contatos, Telefones).

---

## 4. BANCO DE DADOS E RELACIONAMENTOS

### 4.1 Modelo de Dados (Supabase / PostgreSQL 14.5)
O banco conta com mais de 50 tabelas de negócio e auditoria estruturadas com alta integridade referencial:

```
[Tenants] 
   │
   ├── 1:N ── [Clientes] ──────┐
   │                           │ 1:N
   ├── 1:N ── [Agencias] ──────┼───────► [Propostas] ─── 1:N ───► [PIs] ───┬─── 1:N ───► [PI_Itens]
   │                           │                                           │
   └── 1:N ── [Parceiros] ─────┘                                           ├─── 1:N ───► [PI_Financeiro]
                 │                                                         │
                 └── 1:N ── [Produtos] ────────────────────────────────────┼─── 1:N ───► [PI_Checkings]
                                                                           │
                                                                           └─── 1:N ───► [PI_Assinaturas]
```

### 4.2 Mecanismos de Proteção e Rastreabilidade
- **RLS (Row Level Security):** Todas as tabelas sensíveis filtram por `tenant_id = auth.jwt() ->> 'tenant_id'`;
- **Auditoria Universal (`auditoria_alteracoes`):** Gatilhos automáticos registram `INSERT`, `UPDATE` e `DELETE` com snapshots `OLD` e `NEW` em formato `JSONB`;
- **Lixeira Lógica com Snapshot (`trash_items`):** Nenhuma exclusão acidental destrói dados em produção; um snapshot completo é salvo permitindo restauração atômica;
- **Trava de Integridade Financeira:** Os cálculos de faturamento de PIs e comissões utilizam valores decimais estritos, evitando discrepâncias de centavos.

---

## 5. DEPENDÊNCIAS ENTRE MÓDULOS

### 5.1 Grafo de Dependências Operacional
```
Cadastros Base (Clientes, Agências, Parceiros, Produtos)
  └─► Propostas Comerciais (Composição de Itens e Simulação)
        └─► Pedidos de Inserção - PI (Congelamento Comercial e Operacional)
              ├─► Operação de Veiculação & Checking Fotográfico
              ├─► Central de Assinaturas Digitais (Formalização)
              └─► Faturamento & Conciliação Financeira
                    └─► Apuração de Comissões & Bonificações
```

### 5.2 Avaliação de Acoplamento
- **Acoplamento Saudável:** O módulo de Propostas não força a criação imediata de um PI no banco. O PI só é gerado no momento da conversão formal;
- **Imutabilidade Operacional:** Uma vez emitido o PI, alterações no cadastro do Produto (ex: alteração de preço de tabela no inventário) **não retroagem** sobre o PI já emitido, preservando a integridade contábil e histórica.

---

## 6. PONTOS QUE PODEM RECEBER MELHORIAS SEM RISCO (QUICK-WINS)

1. **Virtualização de Tabelas Grandes:**
   - Telas como `/produtos` e `/historico-veiculacao` podem adotar `@tanstack/react-virtual` para renderizar apenas os elementos visíveis na viewport, permitindo manipular catálogos com mais de 20.000 pontos com 60 FPS garantidos;
2. **Otimização de Prefetching de Rotas:**
   - Adicionar `preload="intent"` nos links do `<AppShell>`, fazendo o TanStack Router pré-carregar os dados da rota no `onMouseEnter`, tornando a transição de páginas instantânea para o usuário;
3. **Consolidação de Mapeamento de Entidades:**
   - Unificar os dialogs de importação de planilhas para utilizarem o mesmo parser de colunas dinâmico já aperfeiçoado no pipeline de IA;
4. **Padronização de Skeletons de Carregamento:**
   - Substituir spinners centrais por skeletons que preservam a estrutura visual da tabela durante o carregamento inicial.

---

## 7. POSSÍVEIS CONFLITOS DE UX E USABILIDADE

1. **Excesso de Modais Aninhados:**
   - Em certos fluxos (ex: editar produto de dentro da proposta), a abertura de um modal sobre outro pode gerar desorientação em telas de notebook menores (1366x768).  
   *Solução 3.0:* Adotar gavetas laterais deslizantes (Sheet/Drawer) para formulários secundários;
2. **Feedback Visual em Mutações Longas com IA:**
   - Quando o Gemini analisa um PDF de 40 páginas, o tempo de resposta pode atingir de 5 a 10 segundos.  
   *Solução 3.0:* Exibir barra de progresso com etapas claras (*"Lendo páginas do PDF" ➔ "Estruturando pontos com IA" ➔ "Validando coordenadas"*);
3. **Filtros Concorrentes em Telas de Listagem:**
   - Na tela de produtos, a coexistência de abas por tipo de mídia e filtros por praça/parceiro já foi limpa recentemente, mas pode se beneficiar de um botão "Limpar todos os filtros" sempre que houver mais de 2 filtros ativos simultaneamente.

---

## 8. MELHOR ESTRATÉGIA DE IMPLEMENTAÇÃO INCREMENTAL (EVOLUÇÃO 3.0)

Para garantir **Zero Downtime**, **Zero Perda de Dados** e manter o ritmo operacional da empresa, a migração para a v3.0 deve adotar a metodologia **Strangler Fig Application**:

```
┌─────────────────────────────────────────────────────────────┐
│ ESTRATÉGIA DE MIGRAÇÃO INCREMENTAL 3.0 (SEM QUEBRAS)        │
└─────────────────────────────────────────────────────────────┘

ETAPA 1: Organização e Desacoplamento Estrutural
  ├── Agrupamento de Server Functions em domínios (/src/modules)
  ├── Criação de testes de regressão automatizados para cada domínio
  └── Validação contínua com a suíte de 40 testes de homologação

ETAPA 2: Otimização de Performance e Virtualização
  ├── Virtualização de listas longas de inventário e PIs
  ├── Implementação de prefetching inteligente no AppShell
  └── Cache em memória otimizado via TanStack Query

ETAPA 3: Aprimoramento da Experiência Enterprise
  ├── Substituição de modais aninhados por Drawers contextuais
  ├── Feedback visual em etapas para operações de IA
  └── Central de notificações WebSockets em tempo real

ETAPA 4: Homologação e Ativação em Produção
  ├── Execução da auditoria formal de isolamento RLS e finanças
  └── Deploy incremental na infraestrutura Hostinger/Nitro
```

---

## 9. CONCLUSÃO E PRÓXIMOS PASSOS

O Mídia.OS v2.6.0 encontra-se em um nível avançado de maturidade técnica, estabilidade e aderência às regras de negócio do mercado publicitário. 

A arquitetura atual possui alicerces sólidos (TanStack Start, React 19, Supabase RLS, Gemini 2.5) que permitem a evolução direta para a versão **3.0 Enterprise** sem necessidade de reescrita ou quebra de contratos existentes.

> **Status:** Diagnóstico concluído e registrado no artefato [`ANALISE_EVOLUCAO_MIDIAOS_3_0.md`](file:///d:/Projetos/Midia.os/ANALISE_EVOLUCAO_MIDIAOS_3_0.md).  
> **Próxima Ação:** Aguardando novas instruções do usuário para início das etapas planejadas.
