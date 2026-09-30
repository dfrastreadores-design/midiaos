# Diretrizes de Proteção Total de Dados em Modo Produção (Zero Data Loss)

> **ATENÇÃO CRÍTICA**: Este sistema encontra-se em **MODO PRODUÇÃO** com dados reais de clientes, campanhas, produtos, parceiros e financeiro. Nenhum dado existente pode ser perdido, corrompido, sobrescrito ou excluído inadvertidamente.

---

## 1. Proibição Absoluta de Comandos Destrutivos

Em nenhuma circunstância qualquer agente ou script deve executar:

- `DROP TABLE`, `DROP SCHEMA`, `DROP DATABASE`.
- `DROP COLUMN` em colunas existentes em tabelas com dados.
- `TRUNCATE TABLE`.
- `DELETE FROM tabela` sem cláusula `WHERE` explícita delimitada por `id` e/ou `tenant_id`.
- Operações com `CASCADE` destrutivo que possam apagar em cascata registros vinculados a clientes, PIs, propostas ou produtos.

---

## 2. Regra de Ouro para Migrações de Banco de Dados: Exclusivamente Aditiva

Toda evolução de esquema de banco de dados deve ser **100% retrocompatível**:

- **Novas colunas**: Utilizar sempre `ADD COLUMN IF NOT EXISTS` com valor `DEFAULT` seguro ou `NULL`.
- **Campos descontinuados**: NUNCA apagar a coluna existente. Marcar como `@deprecated` no código TypeScript e manter o dado histórico íntegro no banco.
- **Novas tabelas**: `CREATE TABLE IF NOT EXISTS`, com RLS habilitado e triggers de auditoria e lixeira vinculados imediatamente.
- **Renomeação de colunas**: NUNCA usar `ALTER TABLE RENAME COLUMN` diretamente em produção, pois quebra código legado e versões ativas. Introduzir nova coluna e criar sincronização transparente.

---

## 3. Filosofia de Soft Delete (Exclusão Lógica)

- Priorizar sempre a inativação de registros (`ativo = false`, `status = 'inativo'`, `deleted_at = now()`) em vez de deleção física.
- Caso ocorra qualquer exclusão física legítima na aplicação, ela deve:
  1. Passar pelo trigger `trash_before_delete`, que salva o payload JSONB completo em `public.trash_items` antes da exclusão.
  2. Registrar o histórico completo em `public.auditoria_alteracoes` (`valor_anterior`, `user_id`, `created_at`).
  3. Estar protegida pelo gatilho anti-mass-delete para impedir exclusões em massa acidentais.

---

## 4. Prevenção de Perda Acidental (Skill accidental-data-loss-prevention)

- Sempre que houver qualquer necessidade excepcional de intervenção manual em dados, **PARAR E CONFIRMAR COM O USUÁRIO**.
- Explicar exatamente o impacto, o motivo, e aguardar consentimento expresso.
