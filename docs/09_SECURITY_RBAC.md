# SEGURANÇA, MULTI-TENANT E MATRIZ RBAC — MÍDIA.OS (v2.6.0)

> **Documento:** 09_SECURITY_RBAC.md  
> **Classificação:** Segurança da Informação, Governança e Compliance  
> **Versão da Plataforma:** 2.6.0 Enterprise Multi-Tenant  
> **Status:** Homologado em Produção  

---

## 1. ISOLAMENTO MULTI-TENANT POR ROW-LEVEL SECURITY (RLS)

O Mídia.OS implementa isolamento estrito a nível de motor de banco de dados no PostgreSQL:

```sql
-- Exemplo de política ativa de isolamento RLS
CREATE POLICY "tenant_isolation_policy" ON public.pis
    FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

* Cada requisição autenticada carrega o `tenant_id` no JWT validado pelo Supabase Auth;
* Nenhuma consulta executada por um tenant consegue ler ou modificar registros de outro tenant, prevenindo vazamentos de dados mesmo em caso de falha na camada de aplicação.

---

## 2. MATRIZ DE PAPÉIS E PERMISSÕES (RBAC)

O sistema define papéis funcionais estritos na tabela `user_roles`:

| Papel RBAC | Comercial (`/comercial`) | Operacional (`/operacional`) | Financeiro (`/financeiro`) | Admin (`/admin`) | Escopo de Acesso |
|---|:---:|:---:|:---:|:---:|---|
| **`master_admin`** | Total | Total | Total | Total + Painel Owner | Acesso global à infraestrutura SaaS e todos os tenants |
| **`admin`** | Total | Total | Total | Gestão do Tenant | Administrador geral da empresa exibidora |
| **`diretor`** | Alçadas / Descontos | Leitura / Aprovação PI | DRE / Comissões | Leitura | Aprovação de concessões comerciais e auditoria financeira |
| **`financeiro`** | Leitura | Faturamento de PIs | Total | - | Gestão de títulos a pagar/receber e liquidações |
| **`executivo`** | Total (CRM/Propostas) | Consulta Inventário/PIs | Apenas suas comissões | - | Gestão da própria carteira de anunciantes |
| **`operacional`** | Leitura | Gestão de Produtos/Checkings | - | - | Cadastro de pontos e acompanhamento de exibição |
| **`instalador`** | - | Ordens de Serviço e Fotos | - | - | Acesso restrito a envio de fotos de checking |

---

## 3. ACESSOS EXTERNOS BASEADOS EM TOKEN (SEM SESSÃO)

Para clientes e parceiros externos, o sistema adota links temporários criptográficos vinculados a tokens UUID únicos com expiração:
* **`/assinar/$token`:** Permite que o cliente final assine o PI com coleta de IP, hash SHA-256 e timestamp;
* **`/aprovar-diretoria/$token`:** Permite que diretores aprovem ou reprovem PIs em trânsito com 1 clique;
* **`/pos-venda/$token`:** Área do anunciante para visualização das fotos de checking da sua campanha.

---

## 4. TRILHA DE AUDITORIA E LIXEIRA SEGURA

### 4.1 Auditoria Contínua (`auditoria_alteracoes`)
Gatilhos de banco registram todas as operações de mutação (`INSERT`, `UPDATE`, `DELETE`) em tabelas de negócio vitais, armazenando:
- Tabela afetada e operação realizada;
- Identificador do usuário autor;
- Payload anterior (`dados_antigos` JSONB) e novo (`dados_novos` JSONB);
- Timestamp imutável da transação.

### 4.2 Lixeira Lógica Segura (`trash_items`)
Em conformidade com a política de **Zero Perda de Dados**:
- Exclusões efetuadas por usuários geram arquivamento do registro na tabela `trash_items`;
- Qualquer registro excluído pode ser restaurado instantaneamente pela tela `/lixeira`.

---

*Mídia.OS — Segurança, Multi-Tenant e Matriz RBAC © 2026.*
