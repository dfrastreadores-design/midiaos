# Documentação do Sistema - Mídia.OS

## Visão Geral
Plataforma de gestão comercial, CRM, PI e Relatórios para todos os tipos de Veículos de Mídia, Produtoras e Parceiros.
O sistema foi desenhado inicialmente com nomenclatura focada em emissoras de TV, mas foi atualizado para suportar e utilizar terminologia neutra e compatível com todos os meios de comunicação contemporâneos (Rádio, DOOH, Web, Print, Podcasts, Mídias Sociais).

## Módulos Principais
1. **CRM e Oportunidades**: Gestão de funil de vendas, oportunidades, e tarefas com visão Kanban e em Tabela.
2. **Propostas Comerciais e PIs**: 
   - Criação de Pedidos de Inserção genéricos e Propostas Comerciais que atendem tanto grades horárias estruturadas quanto pacotes de formatos de tela e localizações.
   - O PI (PDF) é gerado de forma dinâmica. O cabeçalho é montado priorizando: (1) O Parceiro de mídia que cedeu o produto, (2) O Veículo/Emissora selecionado como Faturador, ou (3) O Inquilino atual da plataforma.
3. **Parceiros de Mídia**: Vínculo e controle de comissionamento de produtos de terceiros (OOH, Painéis de LED, etc).
4. **Financeiro e Comissões**: Gestão de contas a pagar/receber, conciliação e comissionamento (split) de pagamentos.
5. **Configurações Multi-Tenant**: O sistema permite a configuração de branding por inquilino, gestão de permissões de usuários e assinaturas.

## Arquitetura de Multi-Tenant e Segurança (Row Level Security - RLS)
- O sistema suporta segurança nativa do banco de dados (Row Level Security no Supabase). 
- Todos os dados vitais são particionados pela coluna `tenant_id`. 
- Isso assegura que os **usuários autenticados consigam visualizar exclusivamente os dados que foram inseridos através do Inquilino ao qual estão vinculados**. 
- Um gatilho automático injeta o `tenant_id` da sessão do usuário sempre que um registro (ex: Parcerias, PIs, Produtos) é criado. O banco impede, por padrão, que consultas SQL (SELECT/UPDATE/DELETE) acessem registros com um `tenant_id` diferente daquele do usuário que realizou a chamada à API.
- Remoções são convertidas em registros da lixeira (`trash_items`), não havendo exclusões destrutivas (`DELETE` sem log).

## Atualizações Recentes de Escalabilidade de Meio de Comunicação
- A terminologia foi migrada. Termos exclusivos de TV, como "Emissora", "Programa" e "Faixa", agora estão expostos como "Veículo / Faturador", "Programa / Seção / Espaço" e "Faixa / Período", tornando a interface clara para emissoras, veículos digitais e painéis DOOH simultaneamente.
