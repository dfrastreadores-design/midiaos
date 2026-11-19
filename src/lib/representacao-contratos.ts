import {
  ModeloFaturamentoRepresentacao,
  RegraGatilhoFaixa,
  SplitFinancialsResult,
  TipoComissaoRepresentacao,
} from "@/types/representacao-contratos.types";

/**
 * 1. CÁLCULO DE SPLIT FINANCEIRO E REPASSE
 * Calcula o desdobramento entre imposto retido, comissão da Nexo e repasse líquido ao parceiro.
 */
export function calculateSplitFinancials(
  valorBruto: number,
  percentualComissao: number,
  aliquotaImposto: number,
  modelo: ModeloFaturamentoRepresentacao,
): SplitFinancialsResult {
  const bruto = Number(valorBruto) || 0;
  const pctComissao = Number(percentualComissao) || 0;
  const pctImposto = Number(aliquotaImposto) || 0;

  if (modelo === "centralizado_nexo") {
    // Cenário 1: Nexo emite Nota Fiscal única ao cliente.
    // Desconta o imposto da nota (ex: 6% Simples) e a comissão da representação.
    const valorImpostoRetido = Number(((bruto * pctImposto) / 100).toFixed(2));
    const valorComissaoNexo = Number(((bruto * pctComissao) / 100).toFixed(2));
    const valorLiquidoRepasseParceiro = Number(
      Math.max(0, bruto - valorComissaoNexo - valorImpostoRetido).toFixed(2),
    );

    return {
      valorBruto: bruto,
      modelo,
      aliquotaImposto: pctImposto,
      valorImpostoRetido,
      percentualComissao: pctComissao,
      valorComissaoNexo,
      valorLiquidoRepasseParceiro,
    };
  } else {
    // Cenário 2: Parceiro emite Nota Fiscal diretamente ao cliente.
    // O parceiro recebe o bruto total do anunciante e a Nexo emite NFS-e cobrando sua comissão de intermediação.
    const valorComissaoNexo = Number(((bruto * pctComissao) / 100).toFixed(2));
    const valorLiquidoRepasseParceiro = bruto; // Recebido integralmente pelo parceiro

    return {
      valorBruto: bruto,
      modelo,
      aliquotaImposto: 0,
      valorImpostoRetido: 0,
      percentualComissao: pctComissao,
      valorComissaoNexo,
      valorLiquidoRepasseParceiro,
    };
  }
}

/**
 * 2. DETERMINAR PERCENTUAL DE COMISSÃO BASEADO EM VOLUME (GATILHOS OU FIXA)
 */
export function getCommissionFromVolume(
  valorVolume: number,
  regrasGatilho: RegraGatilhoFaixa[] = [],
  comissaoFixa?: number | null,
  tipoComissao: TipoComissaoRepresentacao = "fixa",
): number {
  if (tipoComissao === "fixa") {
    return comissaoFixa ?? 20.0;
  }

  if (!regrasGatilho || regrasGatilho.length === 0) {
    return comissaoFixa ?? 20.0;
  }

  // Ordena faixas por valor inicial crescente
  const faixasOrdenadas = [...regrasGatilho].sort((a, b) => a.de - b.de);

  for (const f of faixasOrdenadas) {
    const atendeMinimo = valorVolume >= f.de;
    const atendeMaximo = f.ate === null || f.ate === undefined || valorVolume <= f.ate;
    if (atendeMinimo && atendeMaximo) {
      return f.comissao_percentual;
    }
  }

  // Se exceder a última faixa sem teto ou padrão
  return faixasOrdenadas[faixasOrdenadas.length - 1]?.comissao_percentual ?? (comissaoFixa ?? 20.0);
}

/**
 * Formata moeda BRL
 */
export function fmtBRL(v?: number | null): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

/**
 * 3. BUILDER DO CONTRATO DE REPRESENTAÇÃO EM MARKDOWN
 * Constrói as cláusulas contratuais jurídicas dinamicamente com base nas opções selecionadas.
 */
export function generateContractContent(dados: {
  numero_contrato: string;
  parceiro_nome: string;
  parceiro_razao_social?: string;
  parceiro_cnpj?: string | null;
  parceiro_endereco?: string | null;
  parceiro_pix?: string | null;
  territorio?: string;
  produtos_representados?: string[];
  permite_faturamento_centralizado_nexo: boolean;
  aliquota_imposto_nexo_percentual: number;
  permite_faturamento_direto_parceiro: boolean;
  prazo_repasse_dias: number;
  tipo_comissao: TipoComissaoRepresentacao;
  comissao_fixa_percentual?: number | null;
  regras_gatilho?: RegraGatilhoFaixa[];
  garantia_comissao_pos_rescisao: boolean;
  comissao_sobre_renovacoes: boolean;
  vigencia_meses?: number;
  data_inicio?: string | null;
  data_fim?: string | null;
}): string {
  const nexoRazao = "NEXO MÍDIA E REPRESENTAÇÃO LTDA";
  const nexoCnpj = "68.279.031/0001-67";
  const nexoCidade = "Brasília/DF";

  const parceiroNome = dados.parceiro_nome || dados.parceiro_razao_social || "VEÍCULO / PARCEIRO DE MÍDIA";
  const parceiroCnpj = dados.parceiro_cnpj || "CNPJ a constar";
  const territorio = dados.territorio || "Distrito Federal e Entorno";
  const vigencia = dados.vigencia_meses || 12;

  const dataInicioStr = dados.data_inicio
    ? new Date(dados.data_inicio).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const dataFimStr = dados.data_fim
    ? new Date(dados.data_fim).toLocaleDateString("pt-BR")
    : new Date(Date.now() + vigencia * 30 * 86400000).toLocaleDateString("pt-BR");

  const produtosStr =
    dados.produtos_representados && dados.produtos_representados.length > 0
      ? dados.produtos_representados.join(", ")
      : "Inventário integral de Mídia Exterior (OOH, DOOH, Painéis de LED, Frontlights e Formatos Especiais homologados)";

  // Cláusula de Remuneração
  let clausulaRemuneracao = "";
  if (dados.tipo_comissao === "fixa") {
    const pct = dados.comissao_fixa_percentual ?? 20.0;
    clausulaRemuneracao = `### CLÁUSULA QUINTA — DA REMUNERAÇÃO FIXA DA REPRESENTANTE
5.1. Pela intermediação e representação comercial dos produtos e espaços publicitários, a **REPRESENTADA** pagará à **REPRESENTANTE (NEXO)** a comissão fixa de **${pct}% (${pct.toFixed(1)} por cento)** incidente sobre o valor bruto de cada veiculação comercial contratada e faturada.`;
  } else {
    const faixas = dados.regras_gatilho && dados.regras_gatilho.length > 0
      ? dados.regras_gatilho
      : [
          { faixa: 1, de: 0, ate: 30000, comissao_percentual: 30.0 },
          { faixa: 2, de: 30001, ate: 70000, comissao_percentual: 35.0 },
          { faixa: 3, de: 70001, ate: null, comissao_percentual: 40.0 },
        ];

    const tabelaFaixas = faixas
      .map(
        (f) =>
          `| Faixa ${f.faixa} | De ${fmtBRL(f.de)} até ${f.ate ? fmtBRL(f.ate) : "Em diante (Sem Teto)"} | **${f.comissao_percentual}%** |`,
      )
      .join("\n");

    clausulaRemuneracao = `### CLÁUSULA QUINTA — DA REMUNERAÇÃO ESCALONADA POR GATILHO DE PERFORMANCE
5.1. A remuneração comercial da **REPRESENTANTE (NEXO)** dar-se-á de forma escalonada por faixas de volume financeiro bruto comercializado no ciclo mensal ou contratual acumulado, conforme a seguinte tabela de gatilhos:

| Faixa | Intervalo de Faturamento Bruto | Percentual de Comissão Nexo |
| :--- | :--- | :--- |
${tabelaFaixas}

5.2. O atingimento do gatilho de volume aplica-se imediatamente a todas as vendas e cotas do respectivo ciclo, incentivando a priorização comercial e maximização da receita publicitária dos espaços representados.`;
  }

  // Cláusula de Modelos de Faturamento
  const subClausulasFaturamento: string[] = [];

  if (dados.permite_faturamento_centralizado_nexo) {
    subClausulasFaturamento.push(`**4.1. Modalidade 1 — Faturamento Centralizado via Nexo (Nota Única ao Anunciante):**
Para viabilizar a contratação por grandes marcas, agências e governos que exigem centralização de compras, a **REPRESENTANTE (NEXO)** fica autorizada a emitir a fatura/Nota Fiscal de Serviços eletrônica (NFS-e) diretamente ao anunciante ou sua agência publicitária.
- **Retenção Fiscal Tributária:** Do valor bruto pago pelo cliente, será deduzida a alíquota padrão de impostos incidentes sobre a emissão da NFS-e da Nexo, fixada em **${dados.aliquota_imposto_nexo_percentual}% (${dados.aliquota_imposto_nexo_percentual.toFixed(1)} por cento)**.
- **Dedução da Comissão:** Será igualmente deduzida a comissão de representação comercial devida à Nexo.
- **Prazo de Repasse Líquido:** O saldo líquido remanescente será transferido ao **VEÍCULO / PARCEIRO** no prazo improrrogável de até **${dados.prazo_repasse_dias} (${dados.prazo_repasse_dias === 1 ? "um dia útil" : `${dados.prazo_repasse_dias} dias úteis`})** contados a partir da compensação efetiva do pagamento realizado pelo cliente anunciante.`);
  }

  if (dados.permite_faturamento_direto_parceiro) {
    subClausulasFaturamento.push(`**4.2. Modalidade 2 — Faturamento Direto pelo Parceiro (RT / Intermediação Comercial):**
Quando acordado entre as partes, o **VEÍCULO / PARCEIRO** emitirá a fatura e respectiva Nota Fiscal de Veiculação de Mídia diretamente em nome do cliente anunciante.
- A **REPRESENTANTE (NEXO)** intermediará toda a documentação, pedidos de inserção (PI) e comprovação de veiculação (checking).
- Após o recebimento dos valores pelo **VEÍCULO**, este compromete-se a pagar à Nexo a respectiva comissão no prazo de até **${dados.prazo_repasse_dias} (${dados.prazo_repasse_dias === 1 ? "um dia útil" : `${dados.prazo_repasse_dias} dias úteis`})**, mediante emissão de NFS-e de intermediação de negócios pela Nexo.`);
  }

  // Cláusulas de Blindagem e Continuidade
  const blindagens: string[] = [];
  if (dados.garantia_comissao_pos_rescisao) {
    blindagens.push(`6.1. **Garantia de Comissionamento Pós-Rescisão:** Em caso de rescisão ou término da vigência deste contrato, a **REPRESENTANTE (NEXO)** mantém o direito irrevogável ao recebimento integral de suas comissões sobre todos os contratos, campanhas, autorizações de veiculação e Pedidos de Inserção (PIs) negociados ou originados durante o período de vigência, até o término definitivo de cada veiculação contratada pelos respectivos anunciantes.`);
  }
  if (dados.comissao_sobre_renovacoes) {
    blindagens.push(`6.2. **Comissionamento sobre Renovações e Aditivos:** Caso qualquer cliente captado ou atendido pela **REPRESENTANTE (NEXO)** renove, prorrogue ou aditive veiculações em até 12 (doze) meses subsequentes à primeira contratação, o percentual de comissionamento permanecerá devido integralmente à Nexo.`);
  }

  return `# CONTRATO DE REPRESENTAÇÃO COMERCIAL E INTERMEDIAÇÃO DE ESPAÇOS PUBLICITÁRIOS
**INSTRUMENTO PARTICULAR Nº ${dados.numero_contrato}**

---

### DAS PARTES CONTRATANTES

**DE UM LADO:**
**${nexoRazao}**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº **${nexoCnpj}**, com sede no Distrito Federal, doravante denominada simplesmente **REPRESENTANTE (NEXO)**;

**DE OUTRO LADO:**
**${parceiroNome.toUpperCase()}**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº **${parceiroCnpj}**${
    dados.parceiro_endereco ? `, com endereço em ${dados.parceiro_endereco}` : ""
  }, doravante denominada simplesmente **REPRESENTADA (VEÍCULO / PARCEIRO)**${
    dados.parceiro_pix ? ` [Chave PIX Cadastrada: ${dados.parceiro_pix}]` : ""
  }.

As partes acima identificadas têm, entre si, justo e contratado o presente instrumento, mediante as seguintes cláusulas:

---

### CLÁUSULA PRIMEIRA — DO OBJETO
1.1. O presente contrato tem por objeto a concessão, pela **REPRESENTADA**, de poderes de representação comercial, intermediação e comercialização dos seus espaços e veículos de publicidade exterior, compreendendo:
> **Produtos e Formatos Autorizados:** ${produtosStr}.

1.2. A representação engloba a apresentação de propostas comerciais, simulação de planos de mídia, intermediação de Pedidos de Inserção (PI), gestão de contratos e acompanhamento de checking.

---

### CLÁUSULA SEGUNDA — DA ÁREA DE ATUAÇÃO E EXCLUSIVIDADE
2.1. A atuação da **REPRESENTANTE** dar-se-á preferencialmente no território de: **${territorio}**, estendendo-se a contas nacionais e agências de publicidade sediadas em território nacional que demandem inventário regional.

---

### CLÁUSULA TERCEIRA — DA VIGÊNCIA
3.1. O presente instrumento vigorará pelo prazo de **${vigencia} (${vigencia === 1 ? "um" : `${vigencia}`} meses)**, iniciando-se em **${dataInicioStr}** e encerrando-se em **${dataFimStr}**, renovando-se automaticamente por iguais períodos, salvo manifestação expressa em contrário com 30 (trinta) dias de antecedência.

---

### CLÁUSULA QUARTA — DAS MODALIDADES DE FATURAMENTO E LIQUIDAÇÃO
As partes convencionam e habilitam para as operações comerciais os seguintes modelos de faturamento:

${subClausulasFaturamento.join("\n\n")}

---

${clausulaRemuneracao}

---

### CLÁUSULA SEXTA — DAS GARANTIAS DE CONTINUIDADE E BLINDAGEM COMERCIAL
${blindagens.join("\n\n")}

---

### CLÁUSULA SÉTIMA — DO SIGILO COMERCIAL E COMPROMISSO ÉTICO
7.1. As partes comprometem-se a resguardar sigilo absoluto quanto a estratégias comerciais, margens internas de negociação e termos acordados neste instrumento.
7.2. Nas propostas comerciais emitidas aos clientes anunciantes finais, será preservado o posicionamento técnico dos espaços de mídia cotados, centralizando-se a governança operacional na **REPRESENTANTE**.

---

### CLÁUSULA OITAVA — DO FORO
8.1. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o Foro da Circunscrição Judiciária Especial de **Brasília - Distrito Federal**, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem justas e acordadas, as partes firmam o presente instrumento por meio de assinatura eletrônica de plena validade jurídica.

**${nexoCidade}, ${dataInicioStr}.**

---

**NEXO MÍDIA E REPRESENTAÇÃO LTDA**  
CNPJ: ${nexoCnpj}  
*Representante Comercial Oficial*  

**${parceiroNome.toUpperCase()}**  
CNPJ: ${parceiroCnpj}  
*Representada / Veículo de Comunicação*
`;
}
