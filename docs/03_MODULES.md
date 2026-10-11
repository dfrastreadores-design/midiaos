# ESPECIFICAÇÃO DE MÓDULOS — MÍDIA.OS (v2.6.0)

> **Documento:** `/docs/03_MODULES.md`  
> **Classificação:** Mapeamento Funcional e Engenharia de Módulos  
> **Estrutura Canônica:** 4 Pilares de Negócio (/comercial, /operacional, /financeiro, /admin)  
> **Status:** Homologado em Produção  

---

## 💼 PILAR 1: COMERCIAL

### 1.1 CRM & Oportunidades
* **Nome do módulo:** CRM & Funil Comercial
* **Objetivo:** Gerenciar o ciclo de prospecção comercial e qualificação de oportunidades publicitárias em formato visual Kanban.
* **Responsabilidades:**
  - Controlar etapas do funil de vendas (Prospecção, Qualificação, Apresentação, Fechamento);
  - Registrar valor estimado, probabilidade de fechamento e previsão de veiculação;
  - Gerenciar histórico de interações e tarefas de follow-up com clientes.
* **Principais arquivos envolvidos:**
  - Rota: `src/routes/crm.tsx`
  - Server Functions: `src/lib/crm.functions.ts`
  - Componentes: `src/components/vendas/KanbanBoard.tsx`, `BriefingFormDialog.tsx`, `TarefasVencendoPopup.tsx`
* **Dependências:**
  - Tabelas: `crm_oportunidades`, `crm_etapas`, `tarefas`, `clientes`
  - Módulos: *Clientes & Agências*, *Propostas Comerciais*
* **Regras importantes:**
  - A conversão de um card de oportunidade gera ou vincula diretamente uma proposta comercial;
  - Acesso restrito aos executivos vinculados e à diretoria comercial.

---

### 1.2 Carteira de Clientes & Agências
* **Nome do módulo:** Clientes & Agências
* **Objetivo:** Centralizar o cadastro e a inteligência de anunciantes diretos e agências de publicidade intermediárias.
* **Responsabilidades:**
  - Cadastrar anunciantes com consulta e sincronização automática via Receita Federal (BrasilAPI);
  - Gerenciar dados de contatos, executivos responsáveis e agências vinculadas;
  - Controlar parâmetros contratuais de Bonificação de Volume (BV) com agências.
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/clientes.tsx`, `src/routes/agencias.tsx`, `src/routes/relatorio-sincronizacao.tsx`
  - Server Functions: `src/lib/clientes.functions.ts`, `src/lib/agencias.functions.ts`, `src/lib/cnpj.ts`
  - Componentes: `ClienteFormDialog.tsx`, `ClienteDetalhesDialog.tsx`, `AgenciaFormDialog.tsx`, `ImportarEntidadeDialog.tsx`
* **Dependências:**
  - Tabelas: `clientes`, `agencias`, `contatos`
  - Serviços Externos: BrasilAPI (consulta CNPJ)
* **Regras importantes:**
  - Toda consulta à Receita Federal possui timeout estrito de 6 segundos para proteção da UI;
  - Um anunciante pode ser atendido por agência ou ser cliente direto.

---

### 1.3 Propostas Comerciais & Simulador
* **Nome do módulo:** Propostas Comerciais
* **Objetivo:** Elaborar orçamentos e planos de mídia omnichannel com simulação dinâmica de rentabilidade e geração de materiais comerciais.
* **Responsabilidades:**
  - Selecionar pontos de mídia do catálogo e definir períodos e frequências de veiculação;
  - Simular descontos, margem de contribuição e retenção de BV em tempo real;
  - Exportar apresentações dinâmicas em PowerPoint (`PPTX`) e relatórios formais em `PDF`;
  - Disparar a conversão da proposta em Pedido de Inserção (PI).
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/propostas.tsx`, `src/routes/nova-campanha.tsx`, `src/routes/copiloto-comercial.tsx`
  - Server Functions: `src/lib/propostas.functions.ts`, `src/lib/copiloto-comercial.functions.ts`, `src/lib/proposta-apresentacao.functions.ts`
  - Componentes: `PropostaFormDialog.tsx`, `VisualizarPropostaDialog.tsx`, `GerarApresentacaoDialog.tsx`, `PriceCalculator.tsx`, `ConverterPropostaDialog.tsx`
* **Dependências:**
  - Tabelas: `propostas`, `proposta_itens`, `proposta_anexos`, `produtos`, `clientes`, `agencias`
  - Módulos: *Inventário & Produtos*, *Pedidos de Inserção (PI)*
  - Serviços Externos: Google Gemini 2.5 Flash (Copiloto Comercial)
* **Regras importantes:**
  - Descontos superiores a 25% exigem obrigatoriamente alçada de aprovação da diretoria;
  - A conversão em PI é idempotente e preserva o vínculo bidirecional entre proposta e pedido.

---

## ⚙️ PILAR 2: OPERACIONAL

### 2.1 Inventário Omnichannel (Produtos)
* **Nome do módulo:** Inventário & Produtos
* **Objetivo:** Catalogar, georreferenciar e precificar os espaços publicitários próprios e representados.
* **Responsabilidades:**
  - Gerenciar pontos em OOH, DOOH, TV, Rádio, Mídia Impressa e Digital;
  - Exibir inventário em mapa interativo georreferenciado e galeria de fotos com censura de imagens;
  - Executar reajustes de tabela de preços e alterações de status em lote;
  - Controlar períodos de disponibilidade e grade para prevenção de conflitos (*overbooking*).
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/produtos.tsx`, `src/routes/rede-inventario.tsx`
  - Server Functions: `src/lib/produtos.functions.ts`, `src/lib/rede-inventario.functions.ts`
  - Componentes: `ProdutoFormDialog.tsx`, `LocationPickerMap.tsx`, `ProdutoFotosUploader.tsx`, `ProdutoFotoGalleryModal.tsx`, `ImportarProdutosDialog.tsx`
* **Dependências:**
  - Tabelas: `produtos`, `produto_tipos`, `circuitos`, `circuito_produtos`, `parceiros`
  - Módulos: *Parceiros de Mídia*, *Propostas Comerciais*
  - Serviços Externos: Supabase Storage (fotos)
* **Regras importantes:**
  - Todo ponto físico deve possuir coordenadas de latitude e longitude validadas;
  - Produtos vinculados a parceiros carregam a regra de comissão de repasse do parceiro.

---

### 2.2 Parceiros de Mídia & Ingestão
* **Nome do módulo:** Parceiros & Ingestão Automatizada
* **Objetivo:** Gerenciar veículos terceirizados representados e ingerir catálogos de mídia via inteligência artificial.
* **Responsabilidades:**
  - Cadastrar exibidoras e veículos parceiros homologados e suas taxas de comissão;
  - Ingerir mídia kits despadronizados em PDF e planilhas com extração automática via Gemini 2.5 Flash;
  - Sincronizar arquivos e tabelas a partir de pastas integradas do Google Drive.
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/parceiros.tsx`, `src/routes/centralizadores.tsx`
  - Server Functions: `src/lib/representacao-comercial.functions.ts`, `src/lib/midia-kit-ai.functions.ts`, `src/lib/inventario-gemini.functions.ts`, `src/lib/drive-sync.functions.ts`
  - Componentes: `ParceiroFormDialog.tsx`, `ImportarMidiaKitDialog.tsx`, `DriveSyncResultModal.tsx`, `ImportDropdown.tsx`
* **Dependências:**
  - Tabelas: `parceiros`, `origens_inventario`, `produtos`
  - Serviços Externos: Google Gemini 2.5 Flash, Google Drive API
* **Regras importantes:**
  - Dados extraídos por IA passam obrigatoriamente por tela de preview antes da persistência no banco;
  - Repasses a parceiros são apurados automaticamente a partir dos PIs veiculados.

---

### 2.3 Pedidos de Inserção (PI) & Checking
* **Nome do módulo:** Pedidos de Inserção (PI) & Formalização
* **Objetivo:** Formalizar a contratação publicitária com rigor jurídico, fluxo de aprovação e auditoria de veiculação.
* **Responsabilidades:**
  - Emitir PIs auditados com trava rigorosa de centavos;
  - Gerenciar workflow de alçadas de diretoria via token seguro (`/aprovar-diretoria/$token`);
  - Coletar assinaturas eletrônicas com hash SHA-256 e IP (`/assinar/$token`);
  - Registrar checking fotográfico de exibição com data e geolocalização;
  - Executar substituição formal de PIs sem deleção do histórico original.
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/pi.tsx`, `src/routes/historico-veiculacao.tsx`, `src/routes/aprovar-diretoria.$token.tsx`, `src/routes/assinar.$token.tsx`, `src/routes/pos-venda.$token.tsx`, `src/routes/contratos.tsx`, `src/routes/assinaturas.tsx`
  - Server Functions: `src/lib/pi.functions.ts`, `src/lib/assinaturas.functions.ts`
  - Componentes: `PiFormDialog.tsx`, `CancelarPiDialog.tsx`, `ComprovantesExecucaoDialog.tsx`, `UniversalAssinaturaModal.tsx`, `PosVendaDialog.tsx`
* **Dependências:**
  - Tabelas: `pis`, `pi_itens`, `pi_anexos`, `checkings_veiculacao`, `assinaturas_eletronicas`, `contratos`
  - Módulos: *Propostas Comerciais*, *Gestão Financeira*
* **Regras importantes:**
  - O somatório dos itens deve coincidir rigorosamente com os totais de cabeçalho do PI (trava de centavos);
  - PIs assinados ou em veiculação nunca são excluídos nem editados in-place; alterações exigem substituição auditada via `substituirPi()`.

---

## 💰 PILAR 3: FINANCEIRO

### 3.1 Gestão Financeira & DRE
* **Nome do módulo:** Gestão Financeira & Faturamento
* **Objetivo:** Controlar o fluxo de caixa, títulos a pagar/receber e o resultado contábil-gerencial da empresa exibidora.
* **Responsabilidades:**
  - Gerar e conciliar títulos de contas a receber atrelados a PIs aprovados;
  - Gerar contas a pagar de custos de produção e repasses a parceiros de mídia;
  - Gerar Demonstrativo do Resultado do Exercício (DRE) e projeção de fluxo de caixa em tempo real;
  - Controlar transações e saldos de permuta publicitária (*barter*).
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/financeiro.tsx`, `src/routes/permuta.tsx`, `src/routes/relatorios.tsx`
  - Server Functions: `src/lib/financeiro.functions.ts`, `src/lib/tenants.functions.ts`
  - Componentes: `TransacaoFormDialog.tsx`, `AgendaVencimentosSection.tsx`, `InvestimentoMensalSection.tsx`, `DicasFinanceirasSection.tsx`, `DrillDownDialog.tsx`
* **Dependências:**
  - Tabelas: `transacoes_financeiras`, `categorias_financeiras`, `permutas`, `pis`
  - Módulos: *Pedidos de Inserção (PI)*
* **Regras importantes:**
  - Títulos financeiros só são liberados para cobrança após aprovação e formalização do PI;
  - Permutas comerciais operam em conta corrente de crédito/débito segregada.

---

### 3.2 Comissões & Bonificações (BV)
* **Nome do módulo:** Comissões & Bonificações
* **Objetivo:** Automatizar a apuração de repasses comerciais para executivos de contas e agências.
* **Responsabilidades:**
  - Calcular comissões de executivos comerciais com base em metas e valores líquidos recebidos;
  - Apurar rateios de Bonificação de Volume (BV) devidos a agências de publicidade;
  - Controlar status de liquidação (`a_pagar`, `paga`, `estornada`).
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/comissoes.tsx`, `src/routes/metas.tsx`
  - Server Functions: `src/lib/comissoes.functions.ts`
  - Componentes: `CampanhaRateioDialog.tsx`, `RadarPendenciasCriticas.tsx`, `AtribuirExecutivoButton.tsx`
* **Dependências:**
  - Tabelas: `comissoes`, `regras_comissao`, `metas_vendas`, `pis`, `transacoes_financeiras`
  - Módulos: *Gestão Financeira*, *Pedidos de Inserção (PI)*
* **Regras importantes:**
  - Comissões são recalculadas automaticamente caso ocorra cancelamento ou estorno do PI;
  - Suporta rateio de múltiplos vendedores em uma mesma campanha.

---

## 🛡️ PILAR 4: ADMINISTRATIVO & GOVERNANÇA

### 4.1 Usuários & Permissões (RBAC)
* **Nome do módulo:** Usuários & Controle de Acesso
* **Objetivo:** Gerenciar a equipe interna, credenciais e a matriz de privilégios de acesso do tenant.
* **Responsabilidades:**
  - Convidar, ativar, desativar e redefinir credenciais de colaboradores;
  - Atribuir papéis de segurança (`admin`, `diretor`, `financeiro`, `executivo`, `operacional`, `instalador`);
  - Registrar logs de auditoria de acessos e logins.
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/usuarios.tsx`, `src/routes/minha-conta.tsx`
  - Server Functions: `src/lib/usuarios.functions.ts`
  - Componentes: `AuthGuard.tsx`, `AcessoNegadoScreen.tsx`, `ImpersonateDialog.tsx`
* **Dependências:**
  - Tabelas: `perfis`, `user_roles`, `auditoria_acessos`
  - Serviços Externos: Supabase Auth
* **Regras importantes:**
  - O papel `master_admin` é reservado à governança da plataforma e não pode ser concedido por administradores comuns de tenant;
  - Desativação de usuário revoga imediatamente as sessões ativas.

---

### 4.2 Configurações, Multi-Tenancy & Governança
* **Nome do módulo:** Configurações & Governança
* **Objetivo:** Parametrizar a organização, identidade White-Label, limites contratuais e proteção de dados.
* **Responsabilidades:**
  - Configurar identidade visual White-Label (logotipo, favicon, cores primárias);
  - Monitorar consumo de banco de dados, telemetria de erros e performance da aplicação;
  - Gerenciar organizações clientes no Painel do Proprietário (`/owner`);
  - Restaurar dados excluídos via Lixeira Segura (`/lixeira`).
* **Principais arquivos envolvidos:**
  - Rotas: `src/routes/configuracoes.tsx`, `src/routes/owner.tsx`, `src/routes/monitoramento.tsx`, `src/routes/lixeira.tsx`
  - Server Functions: `src/lib/tenants.functions.ts`
  - Componentes: `MasterCompanySelector.tsx`, `TenantAlertBanner.tsx`, `LayoutManagerDialog.tsx`
* **Dependências:**
  - Tabelas: `tenants`, `auditoria_alteracoes`, `trash_items`
* **Regras importantes:**
  - Todas as mutações em tabelas de negócio geram registro imutável em `auditoria_alteracoes`;
  - Restauração na lixeira recupera o estado idêntico gravado no snapshot JSONB sem perda de integridade relacional.

---

*Mídia.OS — Especificação de Módulos © 2026.*
