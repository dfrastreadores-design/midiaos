# PROSPECT RISCOS E SEGURANÇA
## Diretrizes de Conformidade Legal, LGPD, Termos de Uso e Proteção de Dados
**Módulo:** Midia OS Prospect  

---

## 1. CONFORMIDADE COM A LGPD (LEI 13.709/2018)

O **Midia OS Prospect** opera exclusivamente no contexto de relacionamento empresarial **B2B (Business-to-Business)**. Todas as rotinas de prospecção e comunicação comercial devem aderir aos seguintes postulados:

### 1.1. Base Legal Aplicável
- **Legítimo Interesse do Controlador (Art. 7º, IX e Art. 10 da LGPD)**:
  - Aplica-se ao contato inicial entre empresas com finalidade legítima de oferta de serviços publicitários pertinentes à atividade econômica do destinatário.
  - Avaliação de Legítimo Interesse (LIA) documentada: o contato inicial é proporcional, esperado em relações comerciais e atende à finalidade específica do negócio.
- **Dados Manifestamente Públicos (Art. 7º, § 4º da LGPD)**:
  - Coleta restrita a dados corporativos disponibilizados publicamente pela própria empresa em seu site oficial, diretórios públicos, redes sociais corporativas ou registros públicos da Receita Federal.

### 1.2. Regras Rígidas de Coleta e Tratamento
- **Foco Estrito em Dados Institucionais**:
  - Permitido: Razão Social, Nome Fantasia, CNPJ, CNAE, Endereço comercial, E-mail comercial/institucional (`contato@`, `marketing@`), Telefone fixo da empresa, WhatsApp comercial divulgado publicamente no site ou catálogo.
  - Proibido: Dados pessoais íntimos de pessoas físicas, CPF de sócios para fins de contato pessoal, telefones celulares particulares residenciais, endereços residenciais de diretores.
- **Identificação de Decisores sem Alucinação**:
  - Quando um decisor for identificado (ex.: "Gerente de Marketing"), deve constar obrigatoriamente a fonte pública primária (ex.: página institucional "Quem Somos" ou publicação indexada) e a data da coleta.
  - O sistema nunca inventará ou deduzirá números privados ou e-mails fictícios baseados em padrões adivinhados.

### 1.3. Gestão de Descadastramento e Não-Contato (Opt-Out Imediato)
- Toda comunicação disparada via e-mail ou WhatsApp oficial deve incluir instruções claras de opt-out (ex.: *"Caso não deseje mais receber nossas mensagens institucionais, responda com PARAR"*).
- **Lista de Bloqueio Persistente (`prospect_blocklist`)**:
  - Qualquer solicitação de não contato bloqueia imediatamente o CNPJ, domínio e telefones em todos os níveis.
  - O sistema impede categoricamente novos disparos para qualquer entidade presente na lista de bloqueio.

---

## 2. TERMOS DE USO DAS PLATAFORMAS E CANAIS EXTERNOS

### 2.1. WhatsApp: Somente API Oficial (Cloud API da Meta)
- **Vedações Estritas**:
  - É proibido o uso de automações via WhatsApp Web, navegadores headless (Puppeteer / Playwright) ou bibliotecas não oficiais.
  - O descumprimento causa banimento definitivo do número, perda de reputação e responsabilidade jurídica.
- **Diretrizes Oficiais**:
  - Integração via WhatsApp Business Platform (Cloud API).
  - Utilização de templates de mensagens aprovados pela Meta para conversas iniciadas pela empresa.
  - Limite diário de novas conversas respeitando os tiers da Meta (Tier 1: 1.000 clientes/24h; Tier 2: 10.000; etc.).

### 2.2. E-mails Comerciais (Anti-Spam)
- Autenticação obrigatória de remetente (SPF, DKIM e DMARC configurados no domínio do tenant).
- Limite de envio por hora/dia para manter a reputação do domínio.
- Envio de no máximo 2 a 3 toques de cadência em caso de não resposta; encerramento definitivo após o último follow-up sem resposta.

### 2.3. LinkedIn e Diretórios Corporativos
- O Mídia OS não realizará raspagem invasiva (web scraping em massa) que viole os Termos de Serviço do LinkedIn.
- A consulta a decisores deve se basear em buscas públicas indexadas por mecanismos de busca oficiais ou APIs de parceiros licenciados.

---

## 3. SEGURANÇA MULTI-TENANT E CONTROLE DE ACESSO (RLS)

- **Isolamento Total por Tenant**:
  - Nenhuma informação de prospecção, listas de leads ou histórico de interações pode vazar entre empresas assinantes do Mídia OS.
  - Toda tabela do módulo conterá a coluna `tenant_id` e políticas ativas de RLS:
    ```sql
    ALTER TABLE public.prospect_companies ENABLE ROW LEVEL SECURITY;
    CREATE POLICY prospect_companies_tenant_isolation ON public.prospect_companies
      FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
    ```
- **Proteção de Credenciais**:
  - Chaves de API (Google Cloud, Gemini, WhatsApp Meta Token, Resend) jamais serão expostas ao frontend.
  - Todas as chamadas que exigem credenciais serão executadas exclusivamente no servidor via `createServerFn` protegidas por `requireSupabaseAuth`.

