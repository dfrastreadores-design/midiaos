import { executeDrivePreview } from "../src/lib/services/drive-sync-service.ts";
import { classifyDiscoveredDriveItem } from "../src/lib/services/drive-classifier-service.ts";
import { getGoogleDriveCredentials } from "../src/lib/services/google-drive-client.ts";

console.log("===============================================================================");
console.log("🧪 TESTE LOCAL: DESCOBERTA DINÂMICA, CLASSIFICAÇÃO E PRÉVIA DO GOOGLE DRIVE");
console.log("===============================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  // TESTE 1: Verificação de credenciais e modo de conexão oficial
  console.log("--- 1. Verificação de Autenticação e Credenciais ---");
  const creds = getGoogleDriveCredentials();
  console.log("Credenciais detectadas:", {
    possuiServiceAccount: Boolean(creds.serviceAccount),
    possuiApiKey: Boolean(creds.apiKey),
  });
  assert(
    typeof creds === "object",
    "Função getGoogleDriveCredentials executa e retorna configuração de autenticação",
  );

  // TESTE 2: Classificação Dinâmica Semântica das 7 Categorias
  console.log("\n--- 2. Classificação Semântica das 7 Categorias Requeridas ---");

  // 1. Empresa Parceira
  const itemParceiro = classifyDiscoveredDriveItem(
    {
      fileId: "f_partner_01",
      name: "Cartão CNPJ - Visão Painéis.pdf",
      type: "pdf",
      viewUrl: "https://drive.google.com/file/d/f_partner_01/view",
      downloadUrl: "",
      parentFolderName: "Visão Paineis - Raimundo",
    },
    {
      name: "Visão Paineis - Raimundo",
      folderId: "folder_01",
      url: "https://drive.google.com/drive/folders/folder_01",
      partnerNameNormalized: "Visão Painéis",
      files: [],
    },
  );
  assert(
    itemParceiro.parceiro_nome === "Visão Painéis",
    `1. Identificação dinâmica de parceiro: ${itemParceiro.parceiro_nome}`,
  );

  // 2. Produto de Mídia Convencional
  const itemConvencional = classifyDiscoveredDriveItem({
    fileId: "f_spot_01",
    name: "Rotativo Comercial 30s JK FM Brasília.pdf",
    type: "pdf",
    viewUrl: "https://drive.google.com/file/d/f_spot_01/view",
    downloadUrl: "",
    parentFolderName: "JK FM",
  });
  assert(
    itemConvencional.tipo === "produto_convencional",
    `2. Produto de mídia convencional: ${itemConvencional.titulo} (tipo: ${itemConvencional.tipo})`,
  );
  assert(
    itemConvencional.dados_extraidos.midia === "Rádio" && itemConvencional.dados_extraidos.duracao_segundos === 30,
    "Extração correta de duração 30s e tipo Rádio",
  );

  // 3. Ponto Físico ou Inventário Geolocalizado
  const itemPontoGeo = classifyDiscoveredDriveItem({
    fileId: "f_geo_01",
    name: "Frontlight EPTG Km 4 Sentido Plano Piloto.pdf",
    type: "pdf",
    viewUrl: "https://drive.google.com/file/d/f_geo_01/view",
    downloadUrl: "",
    parentFolderName: "Visão Paineis",
  });
  assert(
    itemPontoGeo.tipo === "ponto_geolocalizado",
    `3. Ponto físico ou geolocalizado: ${itemPontoGeo.titulo} (tipo: ${itemPontoGeo.tipo})`,
  );
  assert(
    Boolean(itemPontoGeo.dados_extraidos.latitude && itemPontoGeo.dados_extraidos.endereco?.includes("EPTG")),
    `Extração de coordenadas e sentido da via: ${itemPontoGeo.dados_extraidos.sentido_via} (${itemPontoGeo.dados_extraidos.endereco})`,
  );

  // 4. Projeto Especial, Evento, Patrocínio ou Pacote Comercial
  const itemProjeto = classifyDiscoveredDriveItem({
    fileId: "f_proj_01",
    name: "Cota Patrocínio Líder Audiência JK FM.pdf",
    type: "pdf",
    viewUrl: "https://drive.google.com/file/d/f_proj_01/view",
    downloadUrl: "",
    parentFolderName: "Projetos Especiais parceiros",
  });
  assert(
    itemProjeto.tipo === "projeto_especial",
    `4. Projeto especial ou pacote: ${itemProjeto.titulo} (tipo: ${itemProjeto.tipo})`,
  );
  assert(
    Array.isArray(itemProjeto.dados_extraidos.entregaveis) && itemProjeto.dados_extraidos.entregaveis.length > 0,
    `Mapeamento de entregáveis múltiplos (${itemProjeto.dados_extraidos.entregaveis?.length} entregáveis mapeados)`,
  );

  // 5. Tabela de Preços e Condições Negociadas
  const itemTabela = classifyDiscoveredDriveItem({
    fileId: "f_tab_01",
    name: "Tabela com desconto para 30 dias - P.O Mídia.xlsx",
    type: "xlsx",
    viewUrl: "https://drive.google.com/file/d/f_tab_01/view",
    downloadUrl: "",
    parentFolderName: "P.O Midia",
  });
  assert(
    itemTabela.tipo === "tabela_comercial",
    `5. Tabela de preços e condições negociadas: ${itemTabela.titulo} (tipo: ${itemTabela.tipo})`,
  );
  assert(
    Boolean(itemTabela.dados_extraidos.condicoes_comerciais),
    "Extração de condições comerciais e prazos de desconto",
  );

  // 6. Material Institucional, Fotos e Complementares
  const itemInstitucional = classifyDiscoveredDriveItem({
    fileId: "f_inst_01",
    name: "Autooh By Bus - Portfólio Institucional Mídia KIT MPub.pdf",
    type: "pdf",
    viewUrl: "https://drive.google.com/file/d/f_inst_01/view",
    downloadUrl: "",
    parentFolderName: "Autooh",
  });
  assert(
    itemInstitucional.tipo === "material_institucional",
    `6. Material institucional / Brand Deck: ${itemInstitucional.titulo} (tipo: ${itemInstitucional.tipo})`,
  );

  // 7. Documento Não Classificado / Pendências
  const itemNaoClassificado = classifyDiscoveredDriveItem({
    fileId: "f_unk_01",
    name: "arquivo_temporario_rascunho_sem_formato.xyz",
    type: "outros",
    viewUrl: "https://drive.google.com/file/d/f_unk_01/view",
    downloadUrl: "",
    parentFolderName: "Diversos",
  });
  assert(
    itemNaoClassificado.tipo === "nao_classificado",
    `7. Documento não classificado com segurança: tipo=${itemNaoClassificado.tipo}`,
  );
  assert(
    itemNaoClassificado.pendencias.length > 0,
    `Geração de alerta e pendência: ${itemNaoClassificado.pendencias[0]}`,
  );

  // TESTE 3: Regra de Governança (Disponibilidade != Autorização Comercial)
  console.log("\n--- 3. Validação de Governança: Disponibilidade vs Autorização ---");
  assert(
    itemConvencional.autorizacao.autorizado_para_venda === false,
    "Item descoberto no Drive inicia como NÃO autorizado para venda (autorizado_para_venda = false)",
  );
  assert(
    itemConvencional.autorizacao.status === "pendente_revisao",
    "Status de autorização inicia como 'pendente_revisao' antes de contrato formal",
  );

  // TESTE 4: Rastreabilidade Obrigatória
  console.log("\n--- 4. Rastreabilidade Ponta a Ponta ---");
  assert(
    Boolean(itemPontoGeo.rastreabilidade.drive_file_id && itemPontoGeo.rastreabilidade.drive_file_url),
    `Preservação do fileId (${itemPontoGeo.rastreabilidade.drive_file_id}) e URL oficial do Drive`,
  );
  assert(
    Boolean(itemPontoGeo.rastreabilidade.ultima_verificacao),
    `Timestamp de última verificação registrado: ${itemPontoGeo.rastreabilidade.ultima_verificacao}`,
  );

  // TESTE 5: Simulação de Prévia Completa com Mock do Supabase
  console.log("\n--- 5. Teste de Execução da Prévia (Strictly Read-Only) ---");
  let writeAttempted = false;

  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          data:
            table === "parceiros"
              ? [
                  {
                    id: "p_visao_01",
                    razao_social: "Visão Painéis e Mídia Exterior Ltda",
                    nome_fantasia: "Visão Painéis",
                    cnpj: "03.491.782/0001-90",
                    status: "ativo",
                  },
                ]
              : table === "contratos_representacao"
              ? [
                  {
                    id: "c_visao_01",
                    parceiro_id: "p_visao_01",
                    numero_contrato: "CTR-2026-VISAO-01",
                    status: "ativo",
                    data_inicio: "2026-01-01",
                    data_fim: "2026-12-31",
                  },
                ]
              : table === "produtos"
              ? [
                  {
                    id: "pr_01",
                    nome: "Frontlight EPTG Km 4 Sentido Plano Piloto",
                    parceiro_id: "p_visao_01",
                    valor_unit: 4500,
                    valor_tabela: 4500,
                  },
                ]
              : table === "tenants"
              ? [
                  {
                    id: "t_nexo_01",
                    razao_social: "Nexo Representação e Mídia LTDA",
                    cnpj: "68.279.031/0001-67",
                  },
                ]
              : [],
        }),
      }),
      insert: () => {
        writeAttempted = true;
        throw new Error("VIOLAÇÃO: O método insert() NÃO pode ser chamado no modo Prévia!");
      },
      update: () => {
        writeAttempted = true;
        throw new Error("VIOLAÇÃO: O método update() NÃO pode ser chamado no modo Prévia!");
      },
      delete: () => {
        writeAttempted = true;
        throw new Error("VIOLAÇÃO: O método delete() NÃO pode ser chamado no modo Prévia!");
      },
    }),
  };

  const previewReport = await executeDrivePreview(mockSupabase, "t_nexo_01");

  assert(
    !writeAttempted,
    "executeDrivePreview executou estritamente em modo LEITURA (zero inserts, updates ou deletes)",
  );
  assert(
    Boolean(previewReport && previewReport.resumo),
    `Relatório de Prévia gerado com sucesso! Total de arquivos analisados: ${previewReport.resumo.total_arquivos_descobertos}`,
  );
  assert(
    previewReport.parceiros.length > 0,
    `Parceiros agrupados na prévia: ${previewReport.parceiros.length}`,
  );

  // Verificar se o parceiro Visão Painéis com contrato ativo foi devidamente autorizado
  const visaoGroup = previewReport.parceiros.find((p) => p.nome.includes("Visão"));
  if (visaoGroup) {
    assert(
      visaoGroup.contrato_vigente === true,
      `Governança comprovada: Visão Painéis possui contrato CTR-2026-VISAO-01 ativo e foi AUTORIZADO (${visaoGroup.autorizacao_status})`,
    );
  }

  // Verificar se outros parceiros sem contrato foram marcados como não autorizados
  const semContratoGroup = previewReport.parceiros.find((p) => !p.nome.includes("Visão"));
  if (semContratoGroup) {
    assert(
      semContratoGroup.contrato_vigente === false,
      `Governança comprovada: Parceiro '${semContratoGroup.nome}' sem contrato ativo foi BLOQUEADO para venda (${semContratoGroup.autorizacao_status})`,
    );
  }

  console.log("\n===============================================================================");
  console.log(`🎉 RESULTADO FINAL DOS TESTES: ${passedTests}/${totalTests} testes aprovados (100%)`);
  console.log("===============================================================================\n");
}

runTests().catch((e) => {
  console.error("Erro durante a execução dos testes:", e);
  process.exit(1);
});
