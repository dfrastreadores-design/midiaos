# 🚀 Mídia.OS — Plataforma de Gestão Comercial e Operacional para Mídia

> O sistema operacional inteligente e definitivo para Emissoras de TV, Rádios, Painéis OOH/DOOH, Portais Digitais e Hubs de Mídia.

[![Status](https://img.shields.io/badge/Status-Produção_Ativa-brightgreen)](#)
[![Stack](https://img.shields.io/badge/Stack-TanStack_Start_%2B_React_19_%2B_Supabase-blue)](#)
[![Architecture](https://img.shields.io/badge/Arquitetura-Multi--Tenant_%2B_White--Label-orange)](#)

---

## 📌 Visão Geral

O **Mídia.OS** é uma plataforma SaaS corporativa desenvolvida para gerenciar com máxima eficiência e inteligência todo o ciclo comercial de veículos de comunicação e agências de representação:

- **Prospecção & CRM Comercial**: Funil visual (Kanban), tarefas com notificações em tempo real e consulta cadastral instantânea via CNPJ (Receita Federal).
- **Diagnóstico Comercial 360° & Radar de Expansão**: Orquestração integrada de 5 pilares de mídia (OOH/DOOH, TV/Rádio, Digital, Influenciadores e Projetos Especiais) cobrindo todas as 35 Regiões Administrativas do DF com inteligência de rotas troncais.
- **Inventário de Mídia com Geolocalização**: Cadastro e geocodificação de painéis de LED, frontlights e mobiliário urbano com coordenadas de satélite, visualização no mapa e link direto para o **Google Street View**.
- **Propostas Comerciais & Apresentações Executivas**: Calculadora de mídia automatizada, descontos progressivos por volume, modelos customizáveis e exportação em alta resolução para **PDF timbrado** e **PowerPoint (.pptx)**.
- **Pedidos de Inserção (PIs) com IA**: Emissão automatizada, fluxo de aprovação multinível (Executivo → Gerência → Diretoria), link seguro para aprovação móvel e parser com inteligência artificial para leitura e extração de dados de PIs em PDF.
- **Central de Assinaturas Digitais**: Portal público do signatário (`/assinar/$token`) com assinatura na tela touch/mouse, registro de IP, data/hora e carimbo com validade jurídica (MP 2.200-2/2001).
- **Financeiro & Comissões**: Contas a pagar e a receber vinculadas aos PIs aprovados, cálculo e split automático de comissões/BV de agência e controle rigoroso de permutas de mídia.
- **White-Label & Multi-Tenant Nativo**: Suporte dinâmico a múltiplas organizações (como a *Nexo Mídia e Representação*), personalizando marca, cores, logotipos, termos de propostas e isolando o catálogo de produtos próprios.

---

## 🏗️ Arquitetura e Tecnologias

- **Frontend & SSR**: [TanStack Start](https://tanstack.com/start) com motor [Nitro](https://nitro.unjs.io/) e [Vite](https://vitejs.dev/).
- **Interface & Componentes**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS](https://tailwindcss.com/) e [Radix UI / shadcn](https://ui.shadcn.com/).
- **Banco de Dados & Autenticação**: [Supabase](https://supabase.com/) com PostgreSQL 15, Row Level Security (RLS) e Triggers de Auditoria Universal.
- **Exportações**: `PptxGenJS` (PowerPoint executivo), `jsPDF` e `xlsx` (relatórios analíticos).
- **Mobile**: Suporte a compilação nativa híbrida para iOS e Android via [Capacitor](https://capacitorjs.com/).

---

## 🧭 Documentação Completa

Para detalhes técnicos aprofundados sobre arquitetura, modelo de dados, políticas de segurança e regras de negócio, consulte:

- 📖 **[Manual do Sistema (DOCUMENTACAO_SISTEMA.md)](./DOCUMENTACAO_SISTEMA.md)**
- 💻 **Manual Interativo no App**: Acesse `/documentacao` dentro da plataforma logada.

---

## ⚙️ Instalação e Desenvolvimento Local

### Pré-requisitos
- Node.js 20+ instalado.
- Chaves de acesso ao Supabase configuradas no arquivo `.env`.

### Passo a passo
```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd tvbrasilia-main

# 2. Instalar as dependências
npm install

# 3. Iniciar o servidor local de desenvolvimento
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 🧪 Testes Automatizados

Para rodar as suítes de validação dos módulos centrais:

```bash
# Testar motor de White-label e isolamento de Organizações
node tests/testar-whitelabel-organizacoes.mjs

# Testar geolocalização e rotas OOH/DOOH
node tests/testar-geolocalizacao-ooh.mjs

# Testar Planejamento 360° e Radar de Expansão Regional (DF)
node --experimental-strip-types tests/testar-planejamento-360-radar.mjs
```

---

## 📦 Build e Deploy

### 1. Build Rápido de Produção
Para compilar o pacote de produção em segundos sem onerar o ambiente:
```bash
node scripts/build-quick.mjs
```

### 2. Sincronização e Deploy em Produção (Hostinger)
```bash
node scripts/sync-hostinger-all.mjs
```

---

## 🔒 Diretrizes de Segurança (Produção Ativa)

O Mídia.OS opera com **política de zero perda de dados**:
1. Comandos destrutivos (`DROP`, `TRUNCATE` ou `DELETE` sem filtro restritivo de chave primária e tenant) são bloqueados por triggers.
2. Todas as migrações são aditivas e retrocompatíveis (`IF NOT EXISTS`).
3. Todas as alterações em dados comerciais são registradas na tabela `auditoria_alteracoes`.
4. Itens excluídos por usuários são direcionados para a `trash_items` (lixeira com retenção de 45 dias).

---

## 👤 Suporte e Contato

- **Desenvolvedor & Arquiteto**: Rafael Rodrigo
- **E-mail**: [Rafaelrodrigo.as@gmail.com](mailto:Rafaelrodrigo.as@gmail.com)
- **WhatsApp / Telefone**: (61) 98474-6857
- **Organização Parceira**: [Nexo Mídia e Representação](https://nexomidiaerepresentacao.com.br)
