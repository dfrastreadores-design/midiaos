# Plan - Implementação de Modelo de Proposta Simplificada (DOOH/OOH)

Adicionar a opção de gerar uma proposta no "Modelo Simplificado", inspirado no design estratégico para mídia OOH/DOOH (conforme imagem de referência), permitindo que o usuário escolha entre o modelo padrão e este novo formato.

## Alterações Sugeridas

### 1. Banco de Dados (Schema)
- Adicionar campo `layout_tipo` (ou similar) na tabela `propostas` (opcional, ou apenas passar via UI no momento da geração).
- Como a solicitação pede a "opção ao gerar", trataremos isso no componente de visualização/geração.

### 2. Backend / Lógica de Geração (`src/lib/proposta-presentation.ts`)
- Criar a função `gerarPdfPropostaSimplificada`.
- Implementar as seções do modelo da imagem:
    - Cabeçalho estratégico (Cliente, Praça, Período, Emissão).
    - Texto institucional "Sobre a Empresa".
    - Defesa Técnica/Racional de Mídia (Cards: Proximidade, Rotina, Impacto).
    - Métricas de Impacto (Contadores: Telas, Inserções, Impactos, Pontos).
    - Tabela de Detalhamento de Pontos com colunas específicas: Cód, Exibidora, Formato, Região, Localização, Dimensão, Valor Mensal.

### 3. Frontend / UI (`src/components/VisualizarPropostaDialog.tsx`)
- Adicionar um seletor (ex: `Select` ou `RadioGroup`) para escolher o "Modelo de Proposta":
    - **Padrão (TV Brasília)**
    - **Simplificado (OOH/DOOH)**
- Atualizar os botões de download para utilizar o modelo selecionado.

### 4. Estilização
- Garantir que o PDF simplificado siga a identidade visual da imagem (cores azul marinho e detalhes em roxo/laranja se configurado, ou o padrão do inquilino).

## Detalhes Técnicos
- Utilizar `jsPDF` e `autoTable` para a construção do layout do PDF simplificado, já que o modelo de imagem é mais tabular e estruturado em blocos de texto.
- Mapear os campos existentes de `PropostaApresentacao` para os novos campos da Proposta Simplificada.
