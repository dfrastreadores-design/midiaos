# PROSPECT TESTES E HOMOLOGAÇÃO
## Matriz de Testes Automatizados, Critérios de Aceitação e Gate de Produção
**Módulo:** Midia OS Prospect  

---

## 1. PRODUCTION READINESS GATE — CRITÉRIOS DE APROVAÇÃO

Para que o módulo **Midia OS Prospect** receba o selo **APROVADO PARA PRODUÇÃO**, deverá cumprir simultaneamente 100% das seguintes metas:

| Categoria | Meta Exigida | Indicador de Validação | Severidade |
| :--- | :---: | :--- | :---: |
| **Vulnerabilidades Críticas (P0)** | **0** | Nenhuma falha de segurança, IDOR ou vazamento | Bloqueador |
| **Erros de Alta Severidade (P1)** | **0** | Zero bugs funcionais impeditivos | Bloqueador |
| **Vazamento entre Tenants** | **0** | 100% de isolamento RLS entre empresas assinantes | Bloqueador |
| **Isolamento de Carteiras** | **100%** | Executivo só visualiza seus próprios leads no CRM | Bloqueador |
| **Precisão Financeira** | **R$ 0,00** | Divergência zero em cálculos de rateio de parceiros | Bloqueador |
| **Deduplicação de Leads** | **100%** | Nenhuma empresa duplicada salva no banco | Bloqueador |
| **Opt-Out & Blocklist** | **100%** | Nenhum envio para empresas na lista de bloqueio | Bloqueador |
| **Estabilidade de Execução** | **0% flaky** | 100 execuções consecutivas sem intermitência | Bloqueador |
| **Tempo de Resposta IA** | **< 2.5s** | Com fallback instantâneo (< 20ms) em offline | Desejável |

---

## 2. SUÍTES DE TESTES AUTOMATIZADOS (INTEGRADAS A `TESTS/`)

O módulo contará com testes dedicados acionados pelo comando padrão `npm test` (`tests/executar-auditoria-homologacao.mjs`):

### 2.1. Suíte de Busca e Deduplicação (`test-prospect-busca.mjs`)
- Teste de busca por CNPJ exato com normalização de máscara.
- Teste de colisão: quando a empresa já existe em `public.clientes`, não duplica; atualiza o registro.
- Teste de descarte de registros inválidos (CNPJs cancelados ou dados corrompidos).

### 2.2. Suíte de Pontuação e IA (`test-prospect-intelligence.mjs`)
- Teste dos 5 fatores de ponderação (30 + 25 + 20 + 15 + 10 = 100 pontos).
- Verificação de consistência: a nota final deve estar sempre no intervalo [0, 100].
- Teste de recomendação: pontos de inventário recomendados devem pertencer estritamente à praça e tipo especificados.
- Teste de resiliência: sem internet/API key, o motor analítico determinístico gera resposta válida em < 20ms.

### 2.3. Suíte de Segurança e Multi-Tenant (`test-prospect-security.mjs`)
- Teste de acesso cruzado: Usuário da Empresa Alpha tenta acessar lead da Empresa Beta via API (Retorno esperado: HTTP 403 / 0 rows).
- Teste de carteira: Vendedor 1 tenta consultar empresas do Vendedor 2 no CRM (Retorno esperado: 0 rows).
- Teste de alçada: Apenas Master pode alterar os pesos da pontuação comercial em `prospect_settings`.

### 2.4. Suíte Financeira do Media Planner (`test-prospect-financeiro.mjs`)
- Validação da Regra Fundamental do Rateio de Parceiros em múltiplos cenários (1 a 10 parceiros simultâneos).
- Teste dos 3 planos (Econômico, Recomendado e Ampliado) garantindo fechamento contábil exato ao centavo.

### 2.5. Suíte de Opt-Out e Proteção Contra Abusos (`test-prospect-blocklist.mjs`)
- Teste de tentativa de disparo para número registrado na `prospect_blocklist` (Retorno esperado: envio abortado com status `bloqueado_optout`).
- Teste de bloqueio de horários fora da janela comercial (disparos noturnos bloqueados).

---

## 3. PROTOCOLO DE HOMOLOGAÇÃO EM STAGING

1. **Ambiente Isolado**: Os testes preliminares de banco de dados serão executados exclusivamente em banco de Staging, nunca em banco de Produção.
2. **Correção Prévia do Script de Staging**:
   - Antes de rodar `07_massa_dados_ficticios_staging.sql`, encapsular a inserção de `user_roles` em `EXECUTE $dyn$ ... $dyn$;` para evitar erro de parse do tipo `::public.app_role`.
3. **Massa de Dados Fictícia**: Todas as empresas e contatos utilizados na homologação conterão sufixos explicativos (ex.: "Supermercado Alfa Teste", e-mail `@ficticio.test`).

