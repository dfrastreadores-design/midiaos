# GUIA DE COMPONENTES E REUTILIZAÇÃO — MÍDIA.OS (v2.6.0)

> **Documento:** `/docs/07_COMPONENT_SYSTEM.md`  
> **Classificação:** Engenharia de Interface e Design System  
> **Objetivo:** Facilitar a manutenção e garantir o reuso de componentes antes de criar novos  
> **Status:** Homologado em Produção  

---

## 1. COMPONENTES ESTRUTURAIS DE LAYOUT

### `AppShell`
* **Finalidade:** Fornecer o layout mestre da aplicação com sidebar categorizada nos 4 pilares, barra superior, seletor de perfil e drawer responsivo.
* **Localização:** `src/components/AppShell.tsx`
* **Quando reutilizar:** Em qualquer tela ou rota privada do sistema que precise da moldura de navegação e do contexto do tenant.

### `AuthGuard`
* **Finalidade:** Proteger rotas privadas validando a sessão de autenticação do Supabase e o perfil do usuário.
* **Localização:** `src/components/AuthGuard.tsx`
* **Quando reutilizar:** Ao criar qualquer rota que exija autenticação ativa e redirecionamento de usuários deslogados para `/login`.

### `PageHeader`
* **Finalidade:** Padronizar o cabeçalho superior de páginas com título, subtítulo, trilha de breadcrumbs e botões de ação.
* **Localização:** `src/components/PageHeader.tsx`
* **Quando reutilizar:** No topo de todas as páginas principais da aplicação para manter consistência visual e hierárquica.

### `GlobalSpotlightCommand`
* **Finalidade:** Modal de busca rápida global ativado via atalho de teclado `Cmd+K` / `Ctrl+K`.
* **Localização:** `src/components/GlobalSpotlightCommand.tsx`
* **Quando reutilizar:** Integrado no `AppShell` para atalhos de navegação entre rotas, busca de anunciantes, produtos e PIs.

### `TenantAlertBanner`
* **Finalidade:** Exibir avisos e notificações urgentes no topo da interface.
* **Localização:** `src/components/TenantAlertBanner.tsx`
* **Quando reutilizar:** Para comunicar comunicados da diretoria, avisos de faturamento pendente ou alertas de status operacional.

---

## 2. MODAIS E FORMULÁRIOS COMERCIAIS

### `PropostaFormDialog`
* **Finalidade:** Modal para criação e edição de propostas comerciais com seleção de pontos e cálculo de margem/BV.
* **Localização:** `src/components/PropostaFormDialog.tsx`
* **Quando reutilizar:** Em telas onde o operador precisa criar, duplicar ou editar um plano de mídia.

### `VisualizarPropostaDialog`
* **Finalidade:** Exibir visualização consolidada do plano de mídia com resumo financeiro, itens detalhados e exportação PDF.
* **Localização:** `src/components/VisualizarPropostaDialog.tsx`
* **Quando reutilizar:** Em listagens comerciais para consulta rápida e impressão de propostas sem abrir modo de edição.

### `GerarApresentacaoDialog`
* **Finalidade:** Assistente para geração e download de apresentações em slides PowerPoint (`PPTX`) editáveis.
* **Localização:** `src/components/GerarApresentacaoDialog.tsx`
* **Quando reutilizar:** Ao exportar uma proposta comercial em formato de apresentação visual para envio a anunciantes.

### `ConverterPropostaDialog`
* **Finalidade:** Modal de confirmação e disparo da conversão atômica de uma proposta aprovada em Pedido de Inserção (PI).
* **Localização:** `src/components/ConverterPropostaDialog.tsx`
* **Quando reutilizar:** Ao avançar o status da proposta comercial para fechamento formal.

### `ClienteFormDialog` & `AgenciaFormDialog`
* **Finalidade:** Formulários de cadastro e edição de anunciantes e agências com busca automática por CNPJ via BrasilAPI.
* **Localização:** `src/components/ClienteFormDialog.tsx` e `src/components/AgenciaFormDialog.tsx`
* **Quando reutilizar:** Nas telas de listagem de clientes/agências ou em modais acionados dentro do fluxo de criação de propostas.

---

## 3. MODAIS E COMPONENTES OPERACIONAIS

### `ProdutoFormDialog`
* **Finalidade:** Cadastro completo de pontos de mídia (OOH, DOOH, TV, Rádio, Digital) com tabelas de preços e especificações.
* **Localização:** `src/components/ProdutoFormDialog.tsx`
* **Quando reutilizar:** Em rotas de gestão de inventário para inclusão ou edição de espaços publicitários.

### `LocationPickerMap`
* **Finalidade:** Mapa interativo para seleção e marcação de coordenadas geográficas (`latitude`, `longitude`).
* **Localização:** `src/components/LocationPickerMap.tsx`
* **Quando reutilizar:** Sempre que um formulário exigir posicionamento no mapa ou captura de coordenadas de um ponto de mídia.

### `ProdutoFotosUploader` & `ProdutoFotoGalleryModal`
* **Finalidade:** Upload de imagens de fachada, galeria em alta definição e ferramenta de censura de placas de terceiros.
* **Localização:** `src/components/ProdutoFotosUploader.tsx` e `src/components/ProdutoFotoGalleryModal.tsx`
* **Quando reutilizar:** No cadastro de produtos OOH/DOOH e no registro visual de ativos de inventário.

### `PiFormDialog`
* **Finalidade:** Formulário de emissão e parametrização do Pedido de Inserção (PI) com trava de centavos e grade de veiculação.
* **Localização:** `src/components/PiFormDialog.tsx`
* **Quando reutilizar:** Na tela de gestão de PIs para edição de minutas ou criação de novas revisões de pedidos.

### `CancelarPiDialog`
* **Finalidade:** Modal seguro de cancelamento formal de PIs com exigência de justificativa auditada.
* **Localização:** `src/components/CancelarPiDialog.tsx`
* **Quando reutilizar:** No fluxo de cancelamento de PIs para garantir estorno financeiro e registro na trilha de auditoria.

### `ComprovantesExecucaoDialog`
* **Finalidade:** Galeria de fotos de checking fotográfico enviadas pela equipe de campo para comprovação de exibição.
* **Localização:** `src/components/ComprovantesExecucaoDialog.tsx`
* **Quando reutilizar:** Na conferência operacional de veiculação antes da liberação de faturamento do PI.

### `ImportDropdown`
* **Finalidade:** Menu dropdown unificado para seleção de métodos de importação de dados (PDF com IA, Excel, Google Drive).
* **Localização:** `src/components/ImportDropdown.tsx`
* **Quando reutilizar:** No cabeçalho de telas que aceitam ingestão em lote (Parceiros, Produtos e PIs).

---

## 4. COMPONENTES FINANCEIROS E GOVERNANÇA

### `TransacaoFormDialog`
* **Finalidade:** Lançamento e edição de títulos de contas a pagar e receber vinculados a PIs ou despesas avulsas.
* **Localização:** `src/components/TransacaoFormDialog.tsx`
* **Quando reutilizar:** No módulo financeiro para inclusão de cobranças, rateios e custos operacionais.

### `CampanhaRateioDialog`
* **Finalidade:** Interface para configuração de rateios de comissões e repasses entre múltiplos executivos e agências.
* **Localização:** `src/components/CampanhaRateioDialog.tsx`
* **Quando reutilizar:** Ao fechar PIs com vendas compartilhadas entre vendedores ou comissões divididas.

### `UniversalAssinaturaModal`
* **Finalidade:** Coleta de assinatura digital manuscrita com captura de IP, data/hora e geração de hash SHA-256.
* **Localização:** `src/components/UniversalAssinaturaModal.tsx`
* **Quando reutilizar:** Em qualquer fluxo interno de formalização de PIs, aditivos e instrumentos contratuais.

### `MasterCompanySelector`
* **Finalidade:** Seletor de tenant corporativo para troca rápida de contexto operacional.
* **Localização:** `src/components/MasterCompanySelector.tsx`
* **Quando reutilizar:** Em telas de administração global (`/owner`) acessadas por usuários com papel `master_admin`.

---

## 5. PRIMITIVOS DO DESIGN SYSTEM (`src/components/ui/`)

| Componente | Localização | Finalidade | Quando Reutilizar |
|---|---|---|---|
| **`Button`** | `src/components/ui/button.tsx` | Botões de ação com estados de hover, loading e variantes | Em todas as ações clicáveis da aplicação |
| **`Dialog`** | `src/components/ui/dialog.tsx` | Janelas modais acessíveis com backdrop e foco retido | Em formulários flutuantes, confirmações e popups |
| **`DropdownMenu`** | `src/components/ui/dropdown-menu.tsx` | Menus suspensos contextuais | Em botões de ações de tabela ("...", exportar, filtrar) |
| **`Input` / `Textarea`** | `src/components/ui/input.tsx` | Entradas de texto estilizadas e integradas com formulários | Em todos os campos de formulário e filtros |
| **`Badge`** | `src/components/ui/badge.tsx` | Pílulas visuais de status (`rascunho`, `aprovado`, etc.) | Em tabelas e cards para sinalizar estados operacionais |
| **`Table`** | `src/components/ui/table.tsx` | Tabelas responsivas com cabeçalho fixo e suporte a dados densos | Em todas as listagens de dados tabulares |
| **`Tabs`** | `src/components/ui/tabs.tsx` | Navegação por abas com alternância de conteúdo sem reload | Em telas divididas por seções (ex: Dados, Checking, Itens) |
| **`CreatableCombobox`**| `src/components/CreatableCombobox.tsx` | Campo de seleção com busca dinâmica e criação rápida de itens | Em seletores de clientes, agências e categorias |

---

*Mídia.OS — Guia de Componentes e Reutilização © 2026.*
