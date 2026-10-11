# REGRAS DE NEGÓCIO E COMPORTAMENTO DO SISTEMA — MÍDIA.OS (v2.6.0)

> **Documento:** `/docs/05_BUSINESS_RULES.md`  
> **Classificação:** Regras de Negócio, Políticas Financeiras e Comportamento do Sistema  
> **Escopo:** Regras críticas que governam as operações do Mídia.OS  
> **Status:** Ativo e Obrigatório em Produção  

---

## 1. CÁLCULO FINANCEIRO E TRAVA DE CENTAVOS

### 1.1 Equação Fundamental de Faturamento
O faturamento de qualquer espaço publicitário no sistema é regido pela fórmula de conciliação:
$$\text{Valor Líquido} = \text{Valor Bruto (Tabela)} - \text{Desconto Comercial Concedido} - \text{BV da Agência (se houver)}$$

### 1.2 Trava Rigorosa de Centavos
* **Conformidade de Soma:** O somatório dos valores negociados de cada item individual de veiculação deve bater com exatidão matemática (centavo por centavo) com o valor bruto e o valor líquido exibidos no cabeçalho do documento;
* **Resíduo de Arredondamento:** Em divisões fracionárias decorrentes de grades por dia ou por bi-semana, divergências residuais de arredondamento de até **R$ 0,02** são automaticamente absorvidas no último item da grade, impedindo que o documento seja emitido com diferenças contábeis;
* **Bloqueio de Emissão:** O sistema bloqueia a gravação ou emissão de qualquer documento caso haja divergência não conciliada entre a soma dos itens e o valor total.

---

## 2. CICLO DE VIDA E COMPORTAMENTO DAS PROPOSTAS

### 2.1 Estados da Proposta Comercial
1. **Rascunho:** A proposta está em edição pelo executivo de contas. Permite inclusão, alteração e exclusão livre de itens, prazos e simulação de descontos;
2. **Enviada:** A proposta foi apresentada ao cliente anunciante ou agência. O sistema registra a data de envio e inicia o controle de validade;
3. **Aprovada:** O cliente aceitou os termos comerciais propostos;
4. **Recusada:** A proposta não foi aceita. O sistema exige obrigatoriamente o registro do motivo da recusa (preço, indisponibilidade de praça, verba cancelada, concorrência) para inteligência de mercado;
5. **Convertida:** A proposta foi transformada em Pedido de Inserção (PI);
6. **Finalizada:** Campanha concluída e faturada.

### 2.2 Conversão Idempotente em Pedido de Inserção (PI)
* Ao aprovar e converter uma proposta comercial, o sistema transfere integralmente todos os pontos de mídia, quantidades, datas de veiculação, valores negociados e dados de cliente/agência para o novo PI;
* A proposta de origem tem seu status alterado para **Convertida** e recebe o número do PI gerado;
* Propostas no estado *Convertida* ficam travadas contra alterações posteriores de valores e itens, garantindo a integridade histórica da negociação.

---

## 3. FORMALIZAÇÃO DO PEDIDO DE INSERÇÃO (PI)

### 3.1 Natureza Jurídica e Numeração
* O Pedido de Inserção (PI) é o documento formal e vinculante que autoriza a reserva de espaço publicitário e autoriza a cobrança financeira;
* Cada PI recebe uma numeração oficial atômica e sequencial por tenant no formato `PI-{ANO}-{SEQUENCIAL}` (ex: `PI-2026-00142`), que nunca se repete.

### 3.2 Princípio da Imutabilidade do PI
* Um PI formalmente assinado ou que já tenha iniciado sua veiculação **nunca pode ser editado diretamente nem excluído do sistema**;
* Qualquer alteração posterior de grade, datas ou valores exige a execução do procedimento de **Substituição de PI**:
  1. O PI anterior é marcado com o status `Substituído por Novo`;
  2. Um novo PI é gerado com sufixo de revisão (ex: `PI-2026-00142-R1`);
  3. O sistema vincula o novo PI ao original como histórico rastreável;
  4. Ambas as versões permanecem disponíveis para conferência comparativa e auditoria jurídica.

### 3.3 Cancelamento de PI
* O cancelamento de um PI exige obrigatoriamente a inserção de uma justificativa formal registrada com o usuário responsável e data/hora;
* O cancelamento estorna automaticamente os títulos financeiros em aberto e as provisões de comissão relacionadas.

---

## 4. ALÇADAS DE DESCONTO E APROVAÇÃO DA DIRETORIA

Para preservar a saúde financeira e a política de preços da exibidora:

* **Desconto até 10,00%:** Aprovado automaticamente pelo próprio executivo de contas;
* **Desconto de 10,01% a 25,00%:** Exige validação prévia de um usuário com perfil de Gerente Comercial ou Diretor;
* **Desconto superior a 25,00%:** O sistema bloqueia a proposta/PI imediatamente. É proibida a geração de link de assinatura ou envio ao cliente sem a liberação expressa da diretoria.

### Fluxo de Aprovação Expressa via Token:
* Quando uma proposta ou PI cai na alçada superior de desconto, o sistema gera um link de acesso restrito com token seguro único (`/aprovar-diretoria/$token`);
* O diretor pode aprovar ou reprovar a concessão comercial diretamente pelo celular ou WhatsApp, com apenas um clique e sem necessidade de login;
* A decisão fica gravada no histórico do documento com carimbo de data, hora e justificativa.

---

## 5. ASSINATURA ELETRÔNICA E VALIDADE JURÍDICA

* **Portal Público Seguro (`/assinar/$token`):** O cliente final ou a agência recebe um link temporário exclusivo para formalizar a contratação;
* **Assinatura na Tela:** O signatário desenha sua rubrica manuscrita diretamente na tela (com suporte a toque no celular ou mouse no computador) e concorda com os termos da veiculação;
* **Evidências de Auditoria Obrigatórias:** No momento da assinatura, o sistema captura e estampa no documento oficial:
  - Nome completo e CPF/CNPJ do signatário;
  - Endereço IP público e porta de origem da conexão;
  - Carimbo de data e hora oficial de Brasília (timestamp);
  - Hash criptográfico **SHA-256** do conteúdo exato do documento assinado;
* **Efeito Operacional:** Somente após a assinatura formal o PI é liberado para geração das ordens de veiculação e liberação de títulos de cobrança.

---

## 6. COMISSÕES E BONIFICAÇÃO DE VOLUME (BV)

### 6.1 Bonificação de Volume (BV) de Agência
* Taxa percentual padrão de mercado de **20%** incidente sobre o valor bruto da tabela de veiculação (ou percentual negociado por agência);
* Pode ser descontado diretamente na fatura emitida ao anunciante ou liquidado como crédito de bonificação acordado.

### 6.2 Comissão de Executivos Comerciais
* A apuração é calculada exclusivamente sobre o **valor líquido faturado e recebido** da campanha publicitária (regime de caixa ou competência configurado pelo tenant);
* Aplica faixas progressivas conforme o cumprimento das metas mensais de faturamento;
* **Rateio Comercial:** O sistema permite dividir a comissão de um mesmo PI entre múltiplos executivos quando a venda foi compartilhada;
* **Estorno:** Caso um PI seja cancelado ou sofra glosa de veiculação, a comissão correspondente é automaticamente estornada da folha de pagamento comercial.

---

## 7. MATRIZ DE PERMISSÕES E SEGURANÇA POR PAPEL (RBAC)

O comportamento da interface e o acesso aos dados são determinados pelo perfil funcional do colaborador:

* **Administrador Global (`master_admin`):** Visualiza e gerencia todos os tenants e métricas de infraestrutura da plataforma;
* **Administrador do Tenant (`admin`):** Acesso completo à gestão da sua organização, equipe, White-Label e lixeira segura;
* **Diretoria (`diretor`):** Alçada máxima para aprovação de descontos superiores a 25%, visualização do DRE gerencial, comissões de equipe e auditoria;
* **Financeiro (`financeiro`):** Controle total sobre contas a pagar/receber, conciliação bancária, faturamento de PIs e baixa de títulos;
* **Executivo de Contas (`executivo`):** Gestão exclusiva da sua própria carteira de anunciantes, criação de propostas, simulação de planos e consulta de suas próprias comissões;
* **Operacional (`operacional`):** Cadastro de pontos de inventário, alteração de disponibilidade de mídia e acompanhamento do checking de exibição;
* **Instalador (`instalador`):** Acesso restrito via celular para visualização de rotas e envio de fotografias de comprovação de veiculação.

---

## 8. AUDITORIA UNIVERSAL E ZERO PERDA DE DADOS

### 8.1 Trilha Imutável de Auditoria
* Qualquer inserção, modificação ou remoção lógica em tabelas de negócio (`pis`, `propostas`, `clientes`, `produtos`) gera um registro instantâneo e indelével;
* A auditoria armazena o estado anterior completo e o estado posterior do registro, identificando qual colaborador efetuou a operação e em qual milissegundo ocorreu.

### 8.2 Proteção Contra Exclusão Acidental (Lixeira Segura)
* Usuários do sistema não possuem permissão de exclusão física permanente;
* Ao "excluir" um registro, o sistema realiza uma exclusão lógica e arquiva um snapshot completo na lixeira (`/lixeira`);
* Qualquer item excluído por engano pode ser restaurado integralmente por um administrador com 1 clique, sem prejuízo aos seus relacionamentos.

---

## 9. REGRAS GERAIS DE ENGENHARIA E EVOLUÇÃO

1. **Nunca criar nova tabela se uma existente atende:** Estender o modelo relacional de forma aditiva antes de introduzir novas entidades no banco de dados;
2. **Antes de criar componente verificar `/src/components/ui`:** Reaproveitar os componentes atômicos construídos sobre Radix UI e Tailwind CSS;
3. **Antes de criar função verificar `/src/lib`:** Consultar as Server Functions já consolidadas (`pi.functions.ts`, `propostas.functions.ts`, etc.) para evitar lógica concorrente;
4. **Não duplicar regras de negócio:** Manter cálculos financeiros, travas de centavos e alçadas centralizados em um único ponto da camada de serviço no servidor;
5. **Toda alteração deve apontar obrigatoriamente:**
   - **Arquivo alterado** (caminho relativo ou absoluto completo);
   - **Impacto** (efeitos colaterais em telas ou processos de negócio);
   - **Dependências** (módulos ou tabelas dependentes).

---

*Mídia.OS — Regras de Negócio e Comportamento do Sistema © 2026.*
