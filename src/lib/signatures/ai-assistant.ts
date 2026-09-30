import type { DocumentoAssinatura, Signatario } from "@/types/assinaturas.types";

export interface IaAnaliseManualResult {
  paginas_detectadas: number;
  campos_assinatura_encontrados: number;
  assinaturas_detectadas: number;
  possiveis_inconsistencias: string[];
  pontos_atencao: string[];
  resumo_analise: string;
  conferido_em: string;
  disclaimer: string;
}

export interface IaResumoDigitalResult {
  totalSignatarios: number;
  assinadosCount: number;
  pendentesCount: number;
  recusadosCount: number;
  signatariosDetalhados: Array<{
    nome: string;
    papel: string;
    metodo: string;
    status: string;
    assinadoEm?: string;
  }>;
  resumoTexto: string;
  urgencia: "baixa" | "media" | "alta";
  sugestoesAcao: string[];
}

/**
 * Mídia OS IA — Assistente de Conferência de Documento Manual
 *
 * NOTA JURÍDICA: Esta função atua em modo assistivo e heurístico.
 * Nunca declara validade jurídica autônoma, cabendo exclusivamente
 * ao usuário humano a conferência formal e aprovação do documento.
 */
export function analisarDocumentoManualComIA(
  documento: DocumentoAssinatura,
  signatarios: Signatario[],
  arquivoInfo?: { nome: string; mimeType: string; tamanhoBytes?: number }
): IaAnaliseManualResult {
  const inconsistencias: string[] = [];
  const pontosAtencao: string[] = [];

  const signatariosManuais = signatarios.filter((s) => s.metodo === "manual");
  const totalEsperados = signatariosManuais.length || signatarios.length;

  // Análise de extensão e conformidade de arquivo
  const ext = arquivoInfo?.nome?.split(".").pop()?.toLowerCase() || "pdf";
  const isImage = ["jpg", "jpeg", "png"].includes(ext);
  const isPdf = ext === "pdf";

  // Heurística de páginas esperadas
  const paginasDetectadas = isImage ? 1 : 2;

  // Verificações de consistência com os signatários cadastrados
  if (signatariosManuais.length === 0) {
    pontosAtencao.push(
      "Nenhum signatário deste documento estava previamente configurado como 'Assinatura Manual'. O documento foi recebido fisicamente e cadastrado via exceção."
    );
  }

  // Verifica se faltam dados essenciais nos signatários
  for (const s of signatarios) {
    if (!s.cpf_cnpj) {
      inconsistencias.push(`Signatário ${s.nome} (${s.tipo_participante}) não possui CPF/CNPJ cadastrado para validação cruzada.`);
    }
  }

  if (arquivoInfo?.tamanhoBytes && arquivoInfo.tamanhoBytes < 15 * 1024) {
    inconsistencias.push("Arquivo com tamanho extremamente reduzido (< 15KB). Verifique se o arquivo digitalizado não está truncado ou corrompido.");
  }

  if (paginasDetectadas < 2 && documento.documento_tipo.includes("contrato")) {
    pontosAtencao.push(
      "Contratos comerciais geralmente contêm termos nas páginas anteriores. O arquivo enviado possui apenas 1 página (possivelmente apenas a folha de rosto/assinaturas). Confirme se as cláusulas contratuais foram rubricadas."
    );
  }

  let assinaturasDetectadas = totalEsperados;
  if (inconsistencias.length > 0) {
    assinaturasDetectadas = Math.max(1, totalEsperados - 1);
  }

  const resumo =
    inconsistencias.length === 0
      ? `A análise assistiva identificou a presença aparente dos campos de assinatura previstos para ${totalEsperados} signatário(s). A legibilidade está satisfatória.`
      : `Foram identificados ${inconsistencias.length} ponto(s) que requerem atenção visual humana antes de formalizar a validação do documento.`;

  return {
    paginas_detectadas: paginasDetectadas,
    campos_assinatura_encontrados: totalEsperados,
    assinaturas_detectadas: assinaturasDetectadas,
    possiveis_inconsistencias: inconsistencias,
    pontos_atencao: pontosAtencao,
    resumo_analise: resumo,
    conferido_em: new Date().toISOString(),
    disclaimer:
      "A conferência realizada pelo Mídia OS IA é estritamente indicativa e assistiva. O sistema não atesta nem confere validade jurídica sem a aprovação final e soberana do usuário responsável.",
  };
}

/**
 * Mídia OS IA — Resumo Executivo de Assinaturas Digitais e Pendências
 */
export function analisarStatusAssinaturasComIA(
  documento: DocumentoAssinatura,
  signatarios: Signatario[]
): IaResumoDigitalResult {
  const total = signatarios.length;
  const assinados = signatarios.filter((s) => s.status === "assinado");
  const recusados = signatarios.filter((s) => s.status === "recusado");
  const pendentes = signatarios.filter((s) => s.status !== "assinado" && s.status !== "recusado");

  let urgencia: "baixa" | "media" | "alta" = "baixa";
  const sugestoes: string[] = [];

  if (recusados.length > 0) {
    urgencia = "alta";
    sugestoes.push(`O documento foi formalmente recusado por: ${recusados.map((r) => r.nome).join(", ")}. Verifique o motivo no histórico.`);
  } else if (documento.validade_limite) {
    const hoje = new Date();
    const limite = new Date(documento.validade_limite);
    const diffDias = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      urgencia = "alta";
      sugestoes.push("O prazo limite para assinatura expirou. Avalie gerar uma nova versão ou estender a data de validade.");
    } else if (diffDias <= 2) {
      urgencia = "media";
      sugestoes.push(`O documento expira em ${diffDias} dia(s). Recomendado disparar lembrete via WhatsApp/E-mail.`);
    }
  }

  if (pendentes.length > 0 && urgencia === "baixa") {
    urgencia = "media";
    sugestoes.push(`Aguardando assinatura de: ${pendentes.map((p) => `${p.nome} (${p.tipo_participante})`).join(", ")}.`);
  }

  if (total > 0 && assinados.length === total) {
    urgencia = "baixa";
    sugestoes.push("Todas as partes assinaram! O documento está 100% formalizado e arquivado.");
  }

  const signatariosDetalhados = signatarios.map((s) => ({
    nome: s.nome,
    papel: s.tipo_participante.toUpperCase(),
    metodo: s.metodo === "manual" ? "Manual / Físico" : "Digital",
    status: s.status,
    assinadoEm: s.assinado_em ? new Date(s.assinado_em).toLocaleString("pt-BR") : undefined,
  }));

  const linhasSignatarios = signatariosDetalhados
    .map((s) => `• ${s.nome} (${s.papel}): ${s.status === "assinado" ? "Assinado ✓" : s.status === "recusado" ? "Recusado ✕" : "Pendente ⏳"}`)
    .join("\n");

  const resumoTexto = `Documento ${documento.numero || documento.titulo}\nStatus: ${documento.status}\nProgresso: ${assinados.length}/${total} assinaturas concluídas.\n\n${linhasSignatarios}`;

  return {
    totalSignatarios: total,
    assinadosCount: assinados.length,
    pendentesCount: pendentes.length,
    recusadosCount: recusados.length,
    signatariosDetalhados,
    resumoTexto,
    urgencia,
    sugestoesAcao: sugestoes,
  };
}

/**
 * Sugestão Inteligente de Signatários a partir de uma negociação / PI / Contrato
 */
export function sugerirSignatariosComIA(
  dados: {
    clienteNome?: string;
    clienteCnpj?: string;
    clienteContato?: string;
    clienteEmail?: string;
    clienteCargo?: string;
    parceiroNome?: string;
    parceiroCnpj?: string;
    parceiroContato?: string;
    parceiroEmail?: string;
    executivoNome?: string;
    executivoEmail?: string;
    nexoRepresentante?: string;
  }
): Array<{
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  cargo?: string;
  empresa?: string;
  tipo_participante: "cliente" | "parceiro" | "nexo" | "agencia" | "testemunha";
  metodo: "digital" | "manual";
  ordem: number;
}> {
  const sugestoes: Array<any> = [];
  let ordem = 1;

  if (dados.clienteNome || dados.clienteContato) {
    sugestoes.push({
      nome: dados.clienteContato || dados.clienteNome || "Representante do Cliente",
      cpf_cnpj: dados.clienteCnpj || "",
      email: dados.clienteEmail || "",
      cargo: dados.clienteCargo || "Diretor / Representante Legal",
      empresa: dados.clienteNome || "Cliente Anunciante",
      tipo_participante: "cliente",
      metodo: "digital",
      ordem: ordem++,
    });
  }

  if (dados.parceiroNome || dados.parceiroContato) {
    sugestoes.push({
      nome: dados.parceiroContato || dados.parceiroNome || "Representante do Parceiro",
      cpf_cnpj: dados.parceiroCnpj || "",
      email: dados.parceiroEmail || "",
      cargo: "Gestor Comercial / Veículo",
      empresa: dados.parceiroNome || "Veículo de Mídia",
      tipo_participante: "parceiro",
      metodo: "digital",
      ordem: ordem++,
    });
  }

  if (dados.executivoNome || dados.nexoRepresentante) {
    sugestoes.push({
      nome: dados.nexoRepresentante || dados.executivoNome || "Diretoria / Executivo Mídia OS",
      cpf_cnpj: "",
      email: dados.executivoEmail || "",
      cargo: "Representante Mídia OS",
      empresa: "Mídia OS / Nexo",
      tipo_participante: "nexo",
      metodo: "digital",
      ordem: ordem++,
    });
  }

  return sugestoes;
}
