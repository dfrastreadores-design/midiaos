# MEDIA PLANNER ESPECIFICAÇÃO
## Planejamento Estratégico de Mídia Personalizado, Multi-Cenário e Integrado
**Módulo:** Midia OS Prospect — Componente Media Planner  

---

## 1. VISÃO GERAL E OBJETIVO

O **Media Planner** transforma os dados coletados e qualificados da empresa em um planejamento de mídia técnico, estratégico e comercialmente persuasivo, cruzando os objetivos do anunciante com o inventário real disponível no Mídia OS.

---

## 2. MODOS DE PLANEJAMENTO

O sistema oferece três modalidades de planejamento:

1. **Planejamento Estratégico (Orientado a Objetivos)**:
   - A IA prioriza a entrega técnica de audiência, visibilidade e cobertura urbana ideal para o segmento e objetivo (Branding, Inauguração, Lançamento), calculando o orçamento necessário.
2. **Planejamento por Orçamento (Orientado a Verba Teto)**:
   - O executivo informa a verba máxima do cliente (ex.: R$ 30.000,00). A IA seleciona a melhor combinação de formatos e pontos de inventário dentro do teto informado, justificando a alocação.
3. **Planejamento Combinado (Padrão Recomendado)**:
   - O sistema harmoniza a verba informada com a estratégia recomendada, gerando três alternativas simultâneas para apresentação comercial:
     - **Plano Econômico**: Foco em custo-benefício e penetração inicial (70% a 80% do orçamento médio).
     - **Plano Recomendado**: Equilíbrio ideal entre frequência, cobertura e impacto (100% da estratégia recomendada).
     - **Plano Ampliado**: Dominação de praça, maior impacto e multiplicidade de formatos (130% a 150% do orçamento base).

---

## 3. CRUZAMENTO INTELIGENTE COM O INVENTÁRIO REAL

A IA analisa os dados da empresa e consulta a tabela `public.produtos`:

```
 [Empresa: Bairro / Cidade / Segmento]
                 │
                 ▼
 [Filtro de Catálogo no Inventário do Mídia.OS]
 ├─ Raio de influência geográfica da empresa anunciante
 ├─ Tipo de mídia (Painéis Rodoviários, Telas Digitais / DOOH, Mídia Urbana)
 ├─ Perfil de público e tráfego da via
 └─ Disponibilidade e preço de tabela / valor unitário
                 │
                 ▼
 [Classificação dos Itens Recomendados]
 1. Produto cadastrado e disponível (Pronto para reserva imediata)
 2. Produto cadastrado com disponibilidade pendente (Sob consulta da OPEC)
 3. Produto de parceiro homologado (Aciona regra de rateio de parceiro)
 4. Oportunidade de expansão (Produto externo mapeado como sugestão)
```

> [!IMPORTANT]
> A IA nunca criará inventário fictício ou alucinará preços. Todos os cálculos financeiros são baseados estritamente na tabela de preços e parâmetros cadastrados no backend.

---

## 4. MOTOR FINANCEIRO INTEGRADO & REGRAS DE RATEIO

O Media Planner utiliza exclusivamente o motor determinístico em `src/lib/calculo-financeiro-midia.ts`:

### Fórmulas Centesimais Obrigatórias
- **Valor Bruto**: $\sum (\text{Valor Unitário} \times \text{Quantidade de Inserções/Bi-semanas})$
- **Desconto Comercial**: Aplicado conforme modalidade (Percentual geral ou por item), respeitando o limite do vendedor.
- **Valor Negociado (Líquido do Cliente)**: $\text{Valor Bruto} - \text{Desconto}$
- **Rateio de Parceiros (Regra Fundamental)**:
  1. $\text{Imposto} = \text{Bruto Parceiro} \times \left(\frac{\text{Percentual Imposto}}{100}\right)$
  2. $\text{Líquido} = \text{Bruto Parceiro} - \text{Imposto}$
  3. $\text{Comissão} = \text{Líquido} \times \left(\frac{\text{Percentual Comissão}}{100}\right)$
  4. $\text{Repasse Parceiro} = \text{Líquido} - \text{Comissão}$
  5. $\text{Margem Líquida da Empresa Usuária} = \text{Valor Negociado} - \text{Repasses Totais} - \text{Impostos Próprios}$

---

## 5. EDITOR INTERATIVO DO EXECUTIVO

O executivo de contas tem controle soberano sobre a proposta:
- **Edição Livre**: Pode adicionar novos pontos do catálogo, excluir sugestões da IA, alterar quantidades, mudar períodos e ajustar descontos.
- **Inclusão de Produtos Manuais / Parceiros**: Permite inserir itens sob demanda com cotações de veículos terceiros.
- **Histórico e Não-Sobrescrita**: A IA jamais poderá sobrescrever silenciosamente as alterações manuais do vendedor. Quando o usuário pede uma "nova sugestão da IA", ela é criada como uma nova versão ou como sugestão paralela para que o usuário aprove.

---

## 6. GERAÇÃO DE DOCUMENTOS (DOIS TIPOS DE PDF)

### 6.1. Planejamento Interno (Uso da Diretoria / Executivo)
- Relação completa de produtos com identificação de custos, margem de contribuição, comissões de vendedores e parceiros, alíquotas fiscais e resultado financeiro projetado.

### 6.2. Proposta Comercial Externa (Apresentação ao Cliente)
- Documento estético e comercial com identidade visual do tenant (logotipo, cores primárias, contatos do vendedor).
- Apresentação da estratégia, diagnóstico do anunciante, fotos dos pontos de mídia, mapa de localização, estimativa de impactos de visualização e cronograma de veiculação.
- **Ocultação Mandatória**: Custos internos, margem líquida da exibidora e repasses a parceiros terceiros são estritamente ocultados da proposta do cliente.
- Link público interativo gerado via token seguro para aprovação digital do anunciante.

