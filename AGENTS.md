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
