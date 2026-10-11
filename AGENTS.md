# Diretrizes Operacionais do Projeto — Mídia.OS (Produção)

## ⚠️ MODO PRODUÇÃO ATIVO — POLÍTICA DE ZERO PERDA DE DADOS

O sistema está operando em **ambiente de produção** com dados sensíveis e críticos de clientes, propostas comerciais, pedidos de inserção (PIs), veiculações, faturamento, produtos e parceiros.

### Princípios Invioláveis:

1. **Nenhum Dado Pode Ser Excluído ou Sobrescrito Indevidamente**:
   - É estritamente proibido rodar scripts destrutivos (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, ou `DELETE` sem filtro restritivo de chave primária e tenant).
   - Qualquer comando que possa gerar perda irreversível deve ser cancelado imediatamente e requisitar aprovação explícita do usuário (`accidental-data-loss-prevention`).
2. **Evolução de Esquema Aditiva**:
   - Todas as migrações em `supabase/migrations/` devem ser não-destrutivas e retrocompatíveis (`IF NOT EXISTS`, defaults seguros, colunas adicionais).
   - Colunas antigas nunca são apagadas, preservando o histórico integral do banco de dados.
3. **Proteção e Rastreabilidade**:
   - Todas as tabelas de negócio possuem gatilho de auditoria (`auditoria_alteracoes`) e gatilho de lixeira automática com snapshot JSONB (`trash_items`).
   - Gatilho de segurança impede exclusões em massa acidentais sem autorização explícita de sessão.

---

## 📐 REGRAS DE EVOLUÇÃO E ENGENHARIA

1. **Nunca criar nova tabela se uma existente atende:** Reutilizar ou estender o modelo relacional de forma aditiva antes de introduzir novas entidades.
2. **Antes de criar componente verificar `/src/components/ui`:** Reaproveitar os componentes atômicos do Radix UI / Tailwind CSS e a biblioteca existente em `/src/components`.
3. **Antes de criar função verificar `/src/lib`:** Consultar as Server Functions já consolidadas (`pi.functions.ts`, `propostas.functions.ts`, `produtos.functions.ts`, etc.) para evitar lógica concorrente.
4. **Não duplicar regras de negócio:** Manter os cálculos financeiros, travas de centavos, alçadas e validações em um único ponto da camada de serviço/função de servidor.
5. **Toda alteração deve apontar obrigatoriamente:**
   - **Arquivo alterado** (caminho relativo ou absoluto completo);
   - **Impacto** (efeitos colaterais em telas, formulários ou processos de negócio);
   - **Dependências** (módulos, tabelas ou componentes que dependem do trecho modificado).

