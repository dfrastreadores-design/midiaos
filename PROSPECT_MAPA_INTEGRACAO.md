# PROSPECT MAPA DE INTEGRAÇÃO
## Mídia.OS 2.6.0 — Integração Orgânica com Módulos Nativos
**Documento Técnico de Referência:** Mapeamento de Entidades, Fluxos e Serviços  

---

## 1. PRINCÍPIO DA NÃO DUPLICAÇÃO

O **Midia OS Prospect** atua como uma esteira de descoberta, qualificação e pré-venda que abastece o ecossistema existente. Nenhuma tabela central de produção será duplicada.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ESTEIRA DE INTEGRAÇÃO                           │
└────────────────────────────────────────────────────────────────────────┘

 [Busca / Scraping Autorizado] 
             │
             ▼
 [prospect_companies] ──(Deduplicação por CNPJ/Nome/Domínio)──┐
             │                                                │
             ▼                                                ▼
 [Intelligence: Score 0-100]                  Já existe em public.clientes?
             │                                        │
             ▼                                        ├─ SIM: Atualiza Enriquecimento
 [Autoprospect: Contato Autorizado]                   └─ NÃO: Cria novo quando assumido
             │
             ▼
 [Lead Qualificado / Interesse Demonstrado]
             │
             ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │               CONVERSÃO AUTOMÁTICA EM PUBLIC.CLIENTES                 │
 │  status: 'prospect' | executivo_id: [ID do Vendedor] | tenant_id      │
 └───────────────────────────────────┬───────────────────────────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
 ┌───────────────────────┐                       ┌───────────────────────┐
 │       CRM FUNIL       │                       │     MEDIA PLANNER     │
 │ Estágio 'prospeccao'  │                       │ campanhas_planejamento│
 │ Visível na carteira   │                       │ Cruzamento c/ produtos│
 └───────────┬───────────┘                       └───────────┬───────────┘
             │                                               │
             └───────────────────────┬───────────────────────┘
                                     │
                                     ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │                 PROPOSTA COMERCIAL & PEDIDO (PI)                      │
 │ public.propostas (itens, motor-financeiro, PDF, assinatura digital)   │
 └───────────────────────────────────────────────────────────────────────┘
```

---

## 2. MATRIZ DE DE-PARA E CONVERSÃO DE ENTIDADES

| Entidade no Prospect | Módulo Destino no Mídia.OS | Campo de Ligação | Ação na Integração |
| :--- | :--- | :--- | :--- |
| **`prospect_companies`** (Empresa prospectada) | `public.clientes` | `cliente_id` (UUID) | Quando o executivo assume o lead ou há resposta positiva no Autoprospect, insere ou atualiza o cliente com status `'prospect'`. |
| **`prospect_contacts`** (Decisores identificados) | `public.clientes.contatos` (JSONB) | `contatos` array | Normaliza nome, cargo, e-mail institucional e telefone comercial dentro do cadastro do cliente. |
| **`prospect_recommendations`** (Produtos sugeridos) | `public.produtos` | `produto_id` (UUID) | Faz referência direta aos itens de catálogo existentes no inventário da emissora/exibidora. |
| **`media_plans`** (Planejamentos 360°) | `public.campanhas_planejamento` | `campanha_id` (UUID) | Armazena a estratégia, pilares e alternativas geradas para a campanha do cliente. |
| **`media_plan_items`** (Pontos de mídia do plano) | `public.campanha_pontos_midia` | `produto_id` e `campanha_id` | Aloca os pontos reais com quantidade de inserções e valores negociados. |
| **`media_plan_approvals`** | `public.propostas` | `proposta_id` (UUID) | Converte o planejamento aprovado pelo executivo em proposta comercial formalizada no Mídia OS. |

---

## 3. INTEGRAÇÃO COM O MOTOR FINANCEIRO NATIVO

O Media Planner não possui lógica de cálculo própria ou aproximada. Ele invoca diretamente as funções centralizadas em:
`src/lib/calculo-financeiro-midia.ts`

### Regras de Negócio Obrigatórias
1. **Regra Fundamental de Rateio**:
   - Todo produto vinculado a parceiro externo deduz primeiro os impostos devidos da cota bruta (`valorBruto * (1 - impostoPct/100)`).
   - A comissão do Mídia OS é calculada exclusivamente sobre o valor líquido remanescente.
   - O repasse ao parceiro é o líquido deduzida a comissão.
2. **Precisão Centesimal Obrigatória**:
   - Utilização das rotinas `arredondarMoeda` de `src/lib/motor-comercial.ts` com tolerância máxima de divergência de R$ 0,00 entre a soma das parcelas e o totalizador.
3. **Limites de Desconto**:
   - Respeito aos limites de alçada configurados para Executivo Comercial vs. Diretoria/Master.

---

## 4. INTEGRAÇÃO COM CARTEIRAS E CONTROLE DE ACESSO (RBAC & RLS)

A visibilidade dos dados segue estritamente as regras consolidadas do Mídia.OS:

```
                  ┌───────────────────────────────┐
                  │       PERFIS DE ACESSO        │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  MASTER EMPRESA  │    │    EXECUTIVO     │    │  OPEC / FINANC.  │
│  Visão Global    │    │ Carteira Própria │    │ Acesso Restrito  │
│ Configura Pesquisa│   │ Assume Leads     │    │ OPEC: Operacional│
│ Aprova Campanhas │    │ Cria Planos      │    │ Fin: Sem Prospect│
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

- **Executivo Comercial**:
  - Busca empresas manualmente ou reivindica empresas identificadas pela busca automática.
  - No momento em que assume a empresa, seu `auth.uid()` é gravado em `executivo_id`.
  - As queries de consulta filtram estritamente: `executivo_id = auth.uid() OR created_by = auth.uid()`.
- **Master Empresa / Administrador**:
  - Acesso irrestrito a todas as empresas, buscas, campanhas e métricas do seu `tenant_id`.
- **Isolamento Multi-Tenant**:
  - Todas as novas tabelas possuem `tenant_id NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE`.
  - Políticas de RLS asseguram que nenhum dado de prospecção do Tenant A seja acessível pelo Tenant B.

