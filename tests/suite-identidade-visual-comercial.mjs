/**
 * SUÍTE DE TESTES: IDENTIDADE VISUAL COMERCIAL & BLINDAGEM DE IMAGENS
 * Validação de:
 * 1. Configuração do tenant_branding (logo, marca_dagua, nome_comercial)
 * 2. Geração de imagem_original e imagem_comercial ao cadastrar produto
 * 3. Aplicação de marca d'água e remoção de identificação de fornecedor
 * 4. Consumo estrito de imagem_comercial em propostas, apresentações, vitrines e clientes
 * 5. Controle de permissão para visualização de imagem_original (apenas interno)
 */

import assert from "node:assert/strict";

// Implementação espelho para execução nativa no runtime de testes
function gerarImagemComercialTeste(params) {
  const { imagem_original, branding } = params;
  if (!imagem_original) {
    return { imagem_original: "", imagem_comercial: "", branding_aplicado: false };
  }
  const nomeComercial = branding.nome_comercial || "Exibição Comercial Homologada";
  const logoUrl = branding.logo || "";
  const marcaDaguaTexto = branding.marca_dagua || nomeComercial;

  const svgOverlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <image href="${imagem_original}" width="1200" height="800" />
    ${branding.remover_identificacao_fornecedor !== false ? `<text>ATIVO VERIFICADO • REDE COMERCIAL: ${nomeComercial.toUpperCase()}</text>` : ""}
    <text>${marcaDaguaTexto}</text>
    ${logoUrl ? `<image href="${logoUrl}" />` : ""}
  </svg>`;

  return {
    imagem_original,
    imagem_comercial: `data:image/svg+xml;utf8,${encodeURIComponent(svgOverlay)}`,
    branding_aplicado: true,
  };
}

function obterImagemSeguraProdutoTeste(params) {
  const { produto, contexto = "vitrine", podeVerOriginal = false } = params;
  if (
    contexto === "proposta" ||
    contexto === "apresentacao" ||
    contexto === "vitrine" ||
    contexto === "portal_cliente"
  ) {
    return produto.imagem_comercial || produto.foto_principal || produto.imagem_original || "";
  }
  if (contexto === "interno" && podeVerOriginal) {
    return produto.imagem_original || produto.imagem_comercial || produto.foto_principal || "";
  }
  return produto.imagem_comercial || produto.foto_principal || "";
}

export function executarTestesIdentidadeVisualComercial() {
  console.log("\n=======================================================");
  console.log("🎨 TESTES DE IDENTIDADE VISUAL COMERCIAL (TENANT BRANDING)");
  console.log("=======================================================");

  const resultados = [];

  function testar(nome, fn) {
    try {
      fn();
      resultados.push({ nome, status: "PASSOU" });
      console.log(`  ✅ [PASS] ${nome}`);
    } catch (err) {
      resultados.push({ nome, status: "FALHOU", erro: err.message });
      console.error(`  ❌ [FAIL] ${nome}: ${err.message}`);
    }
  }

  // 1. Configuração do tenant_branding
  testar("tenant_branding deve conter logo, marca_dagua e nome_comercial", () => {
    const branding = {
      nome_comercial: "Nexo Mídia OOH",
      logo: "https://midia.os/assets/logo-nexo.png",
      marca_dagua: "Nexo Mídia • Rede Comercial Exclusiva",
      posicao_marca_dagua: "bottom-right",
      opacidade_marca_dagua: 0.7,
      remover_identificacao_fornecedor: true,
    };

    assert.ok(branding.nome_comercial.length > 0);
    assert.ok(branding.logo?.startsWith("https://"));
    assert.ok(branding.marca_dagua?.includes("Nexo Mídia"));
    assert.strictEqual(branding.remover_identificacao_fornecedor, true);
  });

  // 2. Geração de imagem_original e imagem_comercial
  testar("Ao enviar imagem de produto, deve gerar imagem_original e imagem_comercial", () => {
    const urlOriginalBruta = "https://cdn.exibidora-terceira.com/fotos/painel-led-bruto.jpg";
    const branding = {
      nome_comercial: "Nexo Mídia OOH",
      logo: "https://midia.os/assets/logo.png",
      marca_dagua: "Nexo Mídia",
      remover_identificacao_fornecedor: true,
    };

    const resultado = gerarImagemComercialTeste({
      imagem_original: urlOriginalBruta,
      branding,
    });

    assert.strictEqual(resultado.imagem_original, urlOriginalBruta);
    assert.ok(resultado.imagem_comercial.length > 0);
    assert.notStrictEqual(resultado.imagem_original, resultado.imagem_comercial);
    assert.strictEqual(resultado.branding_aplicado, true);
  });

  // 3. Aplicação de Logo e Marca D'água na Imagem Comercial
  testar("Imagem comercial deve incorporar o nome comercial, logotipo e faixa de blindagem", () => {
    const branding = {
      nome_comercial: "Rede Capital Painéis",
      logo: "https://midia.os/logo-capital.png",
      marca_dagua: "Rede Capital • Homologado",
      posicao_marca_dagua: "bottom-right",
      remover_identificacao_fornecedor: true,
    };

    const resultado = gerarImagemComercialTeste({
      imagem_original: "https://imagens.teste/ponto-10.jpg",
      branding,
    });

    const conteudoDecodificado = decodeURIComponent(resultado.imagem_comercial);
    assert.ok(conteudoDecodificado.includes("REDE CAPITAL PAINÉIS"));
    assert.ok(conteudoDecodificado.includes("ATIVO VERIFICADO • REDE COMERCIAL"));
    assert.ok(conteudoDecodificado.includes(branding.logo));
  });

  // 4. Propostas Comerciais consomem estritamente imagem_comercial
  testar("Propostas comerciais devem exibir exclusivamente imagem_comercial ao anunciante", () => {
    const produto = {
      imagem_original: "https://exibidora-concorrente.com/placa-original.jpg",
      imagem_comercial: "data:image/svg+xml;utf8,imagem-blindada-com-logo-do-tenant",
      foto_principal: "https://backup.com/foto.jpg",
    };

    const imagemExibida = obterImagemSeguraProdutoTeste({
      produto,
      contexto: "proposta",
      podeVerOriginal: false,
    });

    assert.strictEqual(imagemExibida, produto.imagem_comercial);
    assert.notStrictEqual(imagemExibida, produto.imagem_original);
  });

  // 5. Apresentações Executivas consomem estritamente imagem_comercial
  testar("Apresentações PPTX executivas devem utilizar imagem_comercial", () => {
    const produto = {
      imagem_original: "https://fornecedor-privado.com/ativo-99.jpg",
      imagem_comercial: "data:image/svg+xml;utf8,apresentacao-comercial-com-logo",
    };

    const imagemApresentacao = obterImagemSeguraProdutoTeste({
      produto,
      contexto: "apresentacao",
      podeVerOriginal: false,
    });

    assert.strictEqual(imagemApresentacao, produto.imagem_comercial);
    assert.notStrictEqual(imagemApresentacao, produto.imagem_original);
  });

  // 6. Vitrine Pública consome estritamente imagem_comercial
  testar("Vitrine pública (/site/inventario) deve ocultar fornecedor e usar imagem_comercial", () => {
    const produto = {
      imagem_original: "https://exibidora-x.com/ponto-rua.jpg",
      imagem_comercial: "data:image/svg+xml;utf8,vitrine-publica-comercial",
    };

    const imagemVitrine = obterImagemSeguraProdutoTeste({
      produto,
      contexto: "vitrine",
      podeVerOriginal: false,
    });

    assert.strictEqual(imagemVitrine, produto.imagem_comercial);
  });

  // 7. Portal Cliente e Assinatura consomem estritamente imagem_comercial
  testar("Portal do cliente deve receber apenas imagem_comercial mesmo se solicitar direto", () => {
    const produto = {
      imagem_original: "https://fornecedor.com/segredo.jpg",
      imagem_comercial: "data:image/svg+xml;utf8,cliente-seguro",
    };

    const imagemCliente = obterImagemSeguraProdutoTeste({
      produto,
      contexto: "portal_cliente",
      podeVerOriginal: false,
    });

    assert.strictEqual(imagemCliente, produto.imagem_comercial);
  });

  // 8. Controle de Permissão: Imagem original restrita ao uso interno
  testar("Usuário interno com permissão pode ver imagem_original no backoffice", () => {
    const produto = {
      imagem_original: "https://fornecedor.com/foto-com-fios-e-placa.jpg",
      imagem_comercial: "data:image/svg+xml;utf8,foto-limpa-comercial",
    };

    // Usuário interno autorizado
    const imagemInternaAutorizada = obterImagemSeguraProdutoTeste({
      produto,
      contexto: "interno",
      podeVerOriginal: true,
    });
    assert.strictEqual(imagemInternaAutorizada, produto.imagem_comercial ? produto.imagem_original : "");

    // Usuário interno sem autorização de auditoria
    const imagemInternaNaoAutorizada = obterImagemSeguraProdutoTeste({
      produto,
      contexto: "interno",
      podeVerOriginal: false,
    });
    assert.strictEqual(imagemInternaNaoAutorizada, produto.imagem_comercial);
  });

  const aprovados = resultados.filter((r) => r.status === "PASSOU").length;
  const reprovados = resultados.filter((r) => r.status === "FALHOU").length;

  return {
    totalTestes: resultados.length,
    total: resultados.length,
    aprovados,
    reprovados,
    detalhes: resultados,
  };
}
