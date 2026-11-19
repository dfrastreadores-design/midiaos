import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DrivePreviewItem,
  DrivePreviewReport,
  DriveParceiroAgrupado,
  DriveApiConfigInfo,
} from "../../types/drive-sync.types.ts";

/**
 * Cruza os itens descobertos com a base do Supabase para validação de governança,
 * autorização de representação e detecção de duplicidades / conflitos de preço.
 */
export async function applyGovernanceAndDeduplication(
  supabase: SupabaseClient<any, "public", any>,
  items: DrivePreviewItem[],
  tenantId: string,
  tenantCnpj: string,
  config: DriveApiConfigInfo,
): Promise<DrivePreviewReport> {
  const timestamp = new Date().toISOString();

  // 1. Carregar Parceiros Existentes do Tenant
  const { data: existingParceiros = [] } = await supabase
    .from("parceiros")
    .select("id, razao_social, nome_fantasia, cnpj, status, ativo, comissao_padrao_pct")
    .eq("tenant_id", tenantId);

  const parceirosByCnpj = new Map<string, any>();
  const parceirosByNome = new Map<string, any>();

  for (const p of existingParceiros || []) {
    if (p.cnpj) parceirosByCnpj.set(p.cnpj.replace(/\D/g, ""), p);
    if (p.nome_fantasia) parceirosByNome.set(p.nome_fantasia.toLowerCase().trim(), p);
    if (p.razao_social) parceirosByNome.set(p.razao_social.toLowerCase().trim(), p);
  }

  // 2. Carregar Contratos de Representação Existentes
  let contratos: any[] = [];
  try {
    const { data: cData, error: cErr } = await supabase
      .from("contratos_representacao")
      .select("id, parceiro_id, numero_contrato, status, vigencia_meses, data_inicio, data_fim, produtos_representados")
      .eq("tenant_id", tenantId);

    if (!cErr && cData) {
      contratos = cData;
    }
  } catch {
    // Tabela pode não estar acessível
  }

  const contratosByParceiroId = new Map<string, any[]>();
  for (const c of contratos) {
    if (!c.parceiro_id) continue;
    const list = contratosByParceiroId.get(c.parceiro_id) || [];
    list.push(c);
    contratosByParceiroId.set(c.parceiro_id, list);
  }

  // 3. Carregar Produtos Existentes para Detecção de Conflitos e Duplicidade
  const { data: existingProdutos = [] } = await supabase
    .from("produtos")
    .select("id, nome, midia, tipo, formato, valor_unit, valor_tabela, endereco_ponto, parceiro_id, detalhes_venda")
    .eq("tenant_id", tenantId);

  const produtosByParceiroAndNome = new Map<string, any>();
  for (const pr of existingProdutos || []) {
    const norm = (pr.nome || "").toLowerCase().trim();
    if (norm) {
      produtosByParceiroAndNome.set(`${pr.parceiro_id || "none"}_${norm}`, pr);
    }
  }

  // 4. Analisar e Enriquecer Cada Item
  const parceirosAgrupadosMap = new Map<string, DriveParceiroAgrupado>();

  let totalAutorizados = 0;
  let totalPendentes = 0;
  let totalConflitos = 0;
  let totalProdutos = 0;
  let totalPontosGeo = 0;
  let totalProjetos = 0;
  let totalTabelas = 0;
  let totalMateriais = 0;
  let totalNaoClassificados = 0;

  for (const item of items) {
    // Contagem por tipo
    if (item.tipo === "produto_convencional") totalProdutos++;
    else if (item.tipo === "ponto_geolocalizado") totalPontosGeo++;
    else if (item.tipo === "projeto_especial") totalProjetos++;
    else if (item.tipo === "tabela_comercial") totalTabelas++;
    else if (item.tipo === "material_institucional") totalMateriais++;
    else if (item.tipo === "nao_classificado") totalNaoClassificados++;

    // a) Vincular Parceiro Existente
    const cleanCnpj = item.parceiro_cnpj ? item.parceiro_cnpj.replace(/\D/g, "") : null;
    let matchedPartner = cleanCnpj ? parceirosByCnpj.get(cleanCnpj) : null;
    if (!matchedPartner && item.parceiro_nome) {
      matchedPartner = parceirosByNome.get(item.parceiro_nome.toLowerCase().trim());
    }

    if (matchedPartner) {
      item.parceiro_id_existente = matchedPartner.id;
      item.duplicidade.existe_no_banco = true;
    }

    // b) Auditoria de Autorização Comercial (Contratos de Representação)
    if (matchedPartner) {
      const partnerContratos = contratosByParceiroId.get(matchedPartner.id) || [];
      const contratoAtivo = partnerContratos.find((c) => {
        if (c.status !== "ativo") return false;
        const hoje = new Date();
        if (c.data_fim && new Date(c.data_fim) < hoje) return false;
        return true;
      });

      if (contratoAtivo) {
        item.autorizacao = {
          status: "autorizado",
          autorizado_para_venda: true,
          contrato_id: contratoAtivo.id,
          numero_contrato: contratoAtivo.numero_contrato,
          vigencia_inicio: contratoAtivo.data_inicio,
          vigencia_fim: contratoAtivo.data_fim,
        };
        totalAutorizados++;
      } else {
        const contratoVencido = partnerContratos.find((c) => c.status === "vencido");
        const status = contratoVencido ? "vigencia_expirada" : "pendente_revisao";
        item.autorizacao = {
          status,
          autorizado_para_venda: false,
          motivo_pendencia: contratoVencido
            ? "Contrato de representação vencido na base. Requer termo aditivo ou renovação."
            : "Parceiro cadastrado mas sem contrato formal de representação ativo. Não autorizado para comercialização.",
        };
        item.pendencias.push(item.autorizacao.motivo_pendencia);
        totalPendentes++;
      }
    } else {
      // Parceiro novo ou não encontrado no banco
      item.autorizacao = {
        status: "sem_contrato",
        autorizado_para_venda: false,
        motivo_pendencia:
          "Parceiro ainda não homologado no sistema. A presença de arquivos no Drive NÃO autoriza a venda até formalização de contrato.",
      };
      item.pendencias.push(item.autorizacao.motivo_pendencia);
      totalPendentes++;
    }

    // c) Detecção de Duplicidades e Conflitos de Preços
    if (item.tipo === "produto_convencional" || item.tipo === "ponto_geolocalizado") {
      const partnerKey = item.parceiro_id_existente || "none";
      const itemTitleNorm = item.titulo.toLowerCase().trim();
      const existingProd = produtosByParceiroAndNome.get(`${partnerKey}_${itemTitleNorm}`);

      if (existingProd) {
        item.duplicidade.existe_no_banco = true;
        item.duplicidade.id_existente = existingProd.id;

        const precoExistente = existingProd.valor_tabela ?? existingProd.valor_unit;
        const precoExtraido = item.dados_extraidos.valor_tabela;

        if (precoExtraido && precoExistente && Math.abs(precoExtraido - precoExistente) > 0.01) {
          item.duplicidade.status = "conflito_valor";
          item.duplicidade.descricao_conflito = `Conflito de Preço de Tabela: Valor no Drive (R$ ${precoExtraido.toLocaleString("pt-BR")}) difere do valor cadastrado no banco (R$ ${precoExistente.toLocaleString("pt-BR")}).`;
          item.duplicidade.valores_comparados = [
            {
              campo: "valor_tabela",
              valor_extraido: precoExtraido,
              valor_existente: precoExistente,
            },
          ];
          item.pendencias.push(item.duplicidade.descricao_conflito);
          totalConflitos++;
        } else {
          item.duplicidade.status = "existente_identico";
          item.duplicidade.descricao_conflito = "Produto idêntico já cadastrado na base com o mesmo valor.";
        }
      } else {
        item.duplicidade.status = "novo";
      }
    }

    // d) Agrupamento por Parceiro
    const partnerGroupKey = (item.parceiro_nome || "Outros").toLowerCase().trim();
    let group = parceirosAgrupadosMap.get(partnerGroupKey);

    if (!group) {
      group = {
        nome: item.parceiro_nome || "Parceiro Não Identificado",
        cnpj: item.parceiro_cnpj || undefined,
        pasta_drive_url: item.rastreabilidade.drive_file_url,
        pasta_id: item.rastreabilidade.drive_folder_id,
        existe_no_banco: Boolean(item.parceiro_id_existente),
        parceiro_id: item.parceiro_id_existente || undefined,
        autorizacao_status: item.autorizacao.status,
        contrato_vigente: item.autorizacao.autorizado_para_venda,
        total_produtos: 0,
        total_pontos_fisicos: 0,
        total_projetos: 0,
        total_tabelas: 0,
        total_materiais: 0,
        pendencias: [],
        itens: [],
      };
      parceirosAgrupadosMap.set(partnerGroupKey, group);
    }

    if (item.tipo === "produto_convencional") group.total_produtos++;
    else if (item.tipo === "ponto_geolocalizado") group.total_pontos_fisicos++;
    else if (item.tipo === "projeto_especial") group.total_projetos++;
    else if (item.tipo === "tabela_comercial") group.total_tabelas++;
    else if (item.tipo === "material_institucional") group.total_materiais++;

    if (!group.contrato_vigente && item.autorizacao.motivo_pendencia) {
      if (!group.pendencias.includes(item.autorizacao.motivo_pendencia)) {
        group.pendencias.push(item.autorizacao.motivo_pendencia);
      }
    }

    group.itens.push(item);
  }

  const parceirosAgrupados = Array.from(parceirosAgrupadosMap.values());

  const report: DrivePreviewReport = {
    tenant_id: tenantId,
    tenant_cnpj: tenantCnpj,
    tenant_nome: "NEXO MÍDIA E REPRESENTAÇÃO LTDA",
    timestamp,
    config,
    resumo: {
      total_pastas_analisadas: parceirosAgrupados.length,
      total_arquivos_descobertos: items.length,
      total_parceiros_identificados: parceirosAgrupados.length,
      total_produtos_convencionais: totalProdutos,
      total_pontos_geolocalizados: totalPontosGeo,
      total_projetos_especiais: totalProjetos,
      total_tabelas_precos: totalTabelas,
      total_materiais_institucionais: totalMateriais,
      total_nao_classificados: totalNaoClassificados,
      total_autorizados_venda: totalAutorizados,
      total_pendentes_revisao: totalPendentes,
      total_conflitos_duplicidade: totalConflitos,
    },
    parceiros: parceirosAgrupados,
    itens: items,
    pendencias_gerais: [
      ...(totalPendentes > 0
        ? [`Existem ${totalPendentes} itens com pendência de contrato de representação formal.`]
        : []),
      ...(totalConflitos > 0
        ? [`Existem ${totalConflitos} conflitos de valor de tabela em relação aos produtos já cadastrados.`]
        : []),
      ...(totalNaoClassificados > 0
        ? [`Existem ${totalNaoClassificados} documentos que não puderam ser classificados com segurança.`]
        : []),
    ],
  };

  return report;
}
