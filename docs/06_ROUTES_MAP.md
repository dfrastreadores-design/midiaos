# MAPA SIMPLIFICADO DE ROTAS — MÍDIA.OS (v2.6.0)

> **Documento:** `/docs/06_ROUTES_MAP.md`  
> **Classificação:** Engenharia de Rotas e Navegação  
> **Objetivo:** Facilitar a manutenção e localização rápida de interfaces  
> **Status:** Homologado em Produção  

---

## 1. ROTAS DO PILAR COMERCIAL

| Rota | Arquivo Fonte | Função | Módulo Relacionado |
|---|---|---|---|
| `/crm` | `src/routes/crm.tsx` | Funil Kanban para avanço de etapas de negociação e tarefas | Comercial / CRM |
| `/clientes` | `src/routes/clientes.tsx` | Cadastro de anunciantes e consulta automática via Receita Federal | Comercial / Clientes |
| `/agencias` | `src/routes/agencias.tsx` | Gestão de agências de publicidade e alíquotas de BV | Comercial / Agências |
| `/propostas` | `src/routes/propostas.tsx` | Montagem de planos de mídia, simulação de descontos e geração PPTX/PDF | Comercial / Propostas |
| `/nova-campanha` | `src/routes/nova-campanha.tsx` | Assistente rápido para abertura de briefing e seleção de pontos | Comercial / Propostas |
| `/copiloto-comercial` | `src/routes/copiloto-comercial.tsx` | Chat de assistência de vendas com IA para recomendação de pacotes | Comercial / Propostas (IA) |

---

## 2. ROTAS DO PILAR OPERACIONAL

| Rota | Arquivo Fonte | Função | Módulo Relacionado |
|---|---|---|---|
| `/produtos` | `src/routes/produtos.tsx` | Inventário de espaços publicitários, mapa interativo e fotos | Operacional / Produtos |
| `/rede-inventario` | `src/routes/rede-inventario.tsx` | Visão consolidada de inventário e agrupamento de veículos | Operacional / Produtos |
| `/parceiros` | `src/routes/parceiros.tsx` | Gestão de veículos representados e ingestão de mídia kits com IA | Operacional / Parceiros |
| `/centralizadores` | `src/routes/centralizadores.tsx` | Radar geográfico 360° e catálogo de soluções integradas | Operacional / Planejamento |
| `/pi` | `src/routes/pi.tsx` | Emissão de PIs, alçadas de desconto, trava de centavos e checking | Operacional / PIs |
| `/historico-veiculacao` | `src/routes/historico-veiculacao.tsx` | Painel de monitoramento visual das campanhas ativas em praça | Operacional / Checking |
| `/contratos` | `src/routes/contratos.tsx` | Gestão e emissão de minutas contratuais atreladas a PIs | Operacional / Jurídico |
| `/assinaturas` | `src/routes/assinaturas.tsx` | Painel interno de acompanhamento e auditoria de assinaturas digitais | Operacional / Jurídico |

---

## 3. ROTAS DO PILAR FINANCEIRO

| Rota | Arquivo Fonte | Função | Módulo Relacionado |
|---|---|---|---|
| `/financeiro` | `src/routes/financeiro.tsx` | Contas a pagar/receber, conciliação de faturamento e DRE gerencial | Financeiro / Faturamento |
| `/comissoes` | `src/routes/comissoes.tsx` | Apuração de comissões por metas de executivos e repasses de agência | Financeiro / Comissões |
| `/permuta` | `src/routes/permuta.tsx` | Controle de transações e conta corrente de permutas comerciais | Financeiro / Permuta |
| `/metas` | `src/routes/metas.tsx` | Painel executivo de metas de faturamento individuais e coletivas | Financeiro / Metas |
| `/relatorios` | `src/routes/relatorios.tsx` | Exportação de dados consolidados em planilhas XLSX e CSV | Financeiro / Relatórios |

---

## 4. ROTAS DO PILAR ADMINISTRATIVO & GOVERNANÇA

| Rota | Arquivo Fonte | Função | Módulo Relacionado |
|---|---|---|---|
| `/usuarios` | `src/routes/usuarios.tsx` | Gestão de colaboradores, perfis de acesso (RBAC) e credenciais | Admin / Usuários |
| `/configuracoes` | `src/routes/configuracoes.tsx` | Identidade White-Label, parâmetros do tenant e integrações | Admin / Configurações |
| `/owner` | `src/routes/owner.tsx` | Painel master para governança de múltiplos tenants SaaS | Admin / Master |
| `/monitoramento` | `src/routes/monitoramento.tsx` | Telemetria de infraestrutura, logs de erros e banco de dados | Admin / Telemetria |
| `/lixeira` | `src/routes/lixeira.tsx` | Restauração de itens excluídos via snapshots com 1 clique | Admin / Governança |
| `/minha-conta` | `src/routes/minha-conta.tsx` | Edição de perfil pessoal, dados cadastrais e senha | Transversal / Conta |
| `/documentacao` | `src/routes/documentacao.tsx` | Manual interativo interno para treinamento de equipe | Transversal / Ajuda |

---

## 5. ROTAS EXTERNAS (PÚBLICAS E TOKENIZADAS)

| Rota | Arquivo Fonte | Função | Módulo Relacionado |
|---|---|---|---|
| `/assinar/$token` | `src/routes/assinar.$token.tsx` | Assinatura eletrônica pública com coleta de rubrica, IP e hash SHA-256 | Operacional / PIs (Público) |
| `/aprovar-diretoria/$token` | `src/routes/aprovar-diretoria.$token.tsx` | Alçada de aprovação expressa de PIs para a diretoria via link seguro | Operacional / PIs (Público) |
| `/pos-venda/$token` | `src/routes/pos-venda.$token.tsx` | Portal do anunciante para conferência do checking fotográfico | Operacional / Checking (Público) |
| `/lp/$slug` | `src/routes/lp.$slug.tsx` | Landing page pública de captação de anunciantes e campanhas | Comercial / Marketing (Público) |
| `/site/*` | `src/routes/site.*.tsx` | Páginas institucionais, demonstração, planos e vitrine de mídia | Institucional (Público) |

---

*Mídia.OS — Mapa Simplificado de Rotas © 2026.*
