# HISTÓRICO DE VERSÕES E CHANGELOG — MÍDIA.OS

> **Documento:** 11_CHANGELOG.md  
> **Classificação:** Histórico de Versões e Entregas de Engenharia  
> **Padrão Adotado:** Semantic Versioning (SemVer)  
> **Status Atual:** v2.6.0 (Produção Homologada)  

---

## [2.6.0] — Outubro de 2026 (Versão Homologada em Produção)

### Adicionado
* **Pipeline de IA Multimodal (Google Gemini 2.5 Flash):**
  - Leitura autônoma de mídia kits despadronizados em PDF e planilhas Excel;
  - Extração em lote de inventário omnichannel com validação estrita via JSON Schema;
  - Copiloto Comercial integrado para recomendação e simulação de pacotes de mídia.
* **Central Universal de Assinaturas Digitais:**
  - Assinatura eletrônica com coleta de rubrica manuscrita, IP, data/hora e hash criptográfico SHA-256;
  - Rota pública segura `/assinar/$token` para formalização remota por clientes.
* **Alçadas de Aprovação da Diretoria:**
  - Rota expressa `/aprovar-diretoria/$token` com travas automáticas para propostas com descontos superiores a 25%.
* **Sincronização com a Receita Federal:**
  - Consulta automática de CNPJ via BrasilAPI com timeout seguro de 6 segundos.
* **Governança de Dados Estrita:**
  - Gatilhos universais em `auditoria_alteracoes` e tabela `trash_items` como lixeira lógica segura;
  - Homologação completa com 40 testes automatizados (100% de aprovação).

---

## [2.5.0] — Agosto de 2026

### Adicionado
* Motor de propostas comerciais com exportação dinâmica de apresentações em PowerPoint (`PPTX`);
* Simulador financeiro de rentabilidade com controle de Bonificação de Volume (BV);
* Mapa interativo de geolocalização de produtos OOH e DOOH com clusterização geográfica.

### Melhorias
* Migração do roteamento para TanStack Router com tipagem estrita de parâmetros de busca;
* Refatoração da camada de backend para Server Functions isomorfas (`createServerFn`).

---

## [2.0.0] — Maio de 2026

### Adicionado
* Arquitetura Multi-Tenant completa com isolamento nativo via Row-Level Security (RLS) no PostgreSQL;
* Sistema de permissões baseado em papéis (RBAC);
* Módulo de Pedidos de Inserção (PI) com trava de centavos e conciliação de faturamento;
* Módulo financeiro com controle de contas a pagar/receber e DRE gerencial.

---

## [1.0.0] — Janeiro de 2026

### Inicial
* Lançamento da versão inicial do Mídia.OS com cadastro de anunciantes, inventário básico de mídia exterior e CRM Kanban de prospecção comercial.

---

*Mídia.OS — Histórico de Versões e Changelog © 2026.*
