import assert from "node:assert";

console.log("================================================================================");
console.log("🧪 TESTE DE WHITE-LABEL MULTI-TENANT & ISOLAMENTO DE INVENTÁRIO (NEXO VS NEUTRO)");
console.log("================================================================================\n");

// 1. Simulação de Perfis e Organizações
const organizacaoNexo = {
  id: "00000000-0000-0000-0000-000000000001",
  nome: "Nexo Mídia e Representação",
  slug: "nexo",
  site_url: "https://nexomidiaerepresentacao.com.br",
  tagline: "Hub de Negócios e Soluções 360°",
  termos_proposta: "A Nexo Mídia e Representação atua como um Hub de Negócios e Inteligência de Mídia no Distrito Federal. Conectamos sua marca aos veículos de maior impacto regional, unindo mídia de rua, ambientes de convivência, presença digital e ações presenciais para cercar a jornada diária do seu público-alvo.",
  cor_primaria: "#0f172a",
  isNexo: true,
};

const perfilNexo = {
  id: "user-nexo-1",
  email: "rafaelnexomidia@gmail.com",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  organizacao_id: "00000000-0000-0000-0000-000000000001",
};

const perfilGenerico = {
  id: "user-cliente-externo",
  email: "contato@empresa-qualquer.com.br",
  tenant_id: "99999999-9999-9999-9999-999999999999",
  organizacao_id: null,
};

// 2. Inventário de Teste
const produtosBanco = [
  {
    id: "p1",
    nome: "Painel LED EPTG Km 4 (Próprio Nexo)",
    origem_produto: "PROPRIO",
    organizacao_id: "00000000-0000-0000-0000-000000000001",
    midia: "DOOH",
    parceiro_nome: null,
  },
  {
    id: "p2",
    nome: "Circuito Telas Elevador Residencial Águas Claras (Próprio Nexo)",
    origem_produto: "PROPRIO",
    organizacao_id: "00000000-0000-0000-0000-000000000001",
    midia: "DOOH",
    parceiro_nome: null,
  },
  {
    id: "p3",
    nome: "Comercial 30s TV Brasília (Veículo Parceiro Homologado)",
    origem_produto: "PARCEIRO",
    organizacao_id: null,
    midia: "TV",
    parceiro_nome: "TV Brasília",
  },
  {
    id: "p4",
    nome: "Painel Rodoviário Privado (Outra Empresa)",
    origem_produto: "PROPRIO",
    organizacao_id: "77777777-7777-7777-7777-777777777777",
    midia: "DOOH",
    parceiro_nome: null,
  },
];

// 3. Teste de Filtragem Multi-tenant
function filtrarProdutosParaUsuario(userPerfil, produtos) {
  const userOrgId = userPerfil.organizacao_id;
  const userTenantId = userPerfil.tenant_id;
  const userEmail = (userPerfil.email || "").toLowerCase();

  return produtos.filter((p) => {
    const origem = p.origem_produto || (p.parceiro_nome ? "PARCEIRO" : "PROPRIO");
    if (origem === "PROPRIO") {
      if (userOrgId && p.organizacao_id) {
        return p.organizacao_id === userOrgId;
      }
      if (userTenantId && p.tenant_id) {
        return p.tenant_id === userTenantId;
      }
      return false;
    }
    // Veículos parceiros são compartilhados
    return true;
  });
}

// Execução dos testes
console.log("• Teste 1: Usuário da Nexo acessa inventário");
const prodsNexo = filtrarProdutosParaUsuario(perfilNexo, produtosBanco);
console.log(`  -> Produtos visíveis para a Nexo: ${prodsNexo.length}`);
assert(prodsNexo.some((p) => p.id === "p1"), "Nexo deve ver seu produto próprio p1");
assert(prodsNexo.some((p) => p.id === "p2"), "Nexo deve ver seu produto próprio p2");
assert(prodsNexo.some((p) => p.id === "p3"), "Nexo deve ver o produto parceiro p3");
assert(!prodsNexo.some((p) => p.id === "p4"), "Nexo NÃO deve ver o produto próprio de outra organização");
console.log("  ✅ Teste 1 passou com sucesso!\n");

console.log("• Teste 2: Usuário genérico/externo acessa inventário");
const prodsGenerico = filtrarProdutosParaUsuario(perfilGenerico, produtosBanco);
console.log(`  -> Produtos visíveis para o usuário genérico: ${prodsGenerico.length}`);
assert(!prodsGenerico.some((p) => p.id === "p1"), "Usuário genérico NÃO pode ver produtos próprios da Nexo");
assert(!prodsGenerico.some((p) => p.id === "p2"), "Usuário genérico NÃO pode ver produtos próprios da Nexo");
assert(!prodsGenerico.some((p) => p.id === "p4"), "Usuário genérico NÃO pode ver produtos próprios de outras organizações");
assert(prodsGenerico.some((p) => p.id === "p3"), "Usuário genérico pode ver veículos parceiros homologados");
console.log("  ✅ Teste 2 passou com sucesso!\n");

console.log("• Teste 3: Fallback Seguro de Organização");
function resolverContextoOrg(userPerfil) {
  if (userPerfil.organizacao_id === organizacaoNexo.id || userPerfil.email?.includes("nexo")) {
    return organizacaoNexo;
  }
  return {
    id: null,
    nome: "Mídia.OS",
    slug: "midiaos",
    site_url: null,
    tagline: "Sistema Integrado de Gestão Comercial e Mídia 360°",
    termos_proposta: null,
    cor_primaria: "#0f172a",
    isNexo: false,
  };
}

const orgResolvidaNexo = resolverContextoOrg(perfilNexo);
const orgResolvidaGenerico = resolverContextoOrg(perfilGenerico);

assert.strictEqual(orgResolvidaNexo.isNexo, true);
assert.strictEqual(orgResolvidaNexo.slug, "nexo");
assert.strictEqual(orgResolvidaNexo.nome, "Nexo Mídia e Representação");
assert.strictEqual(orgResolvidaNexo.site_url, "https://nexomidiaerepresentacao.com.br");

assert.strictEqual(orgResolvidaGenerico.isNexo, false);
assert.strictEqual(orgResolvidaGenerico.slug, "midiaos");
assert.strictEqual(orgResolvidaGenerico.nome, "Mídia.OS");
assert.strictEqual(orgResolvidaGenerico.site_url, null);
console.log("  ✅ Teste 3 passou com sucesso!\n");

console.log("• Teste 4: Timbragem Dinâmica da Proposta Comercial");
function timbrarProposta(proposta, organizacao) {
  const isNexo = organizacao.isNexo;
  return {
    cabecalho: isNexo ? "NEXO MÍDIA E REPRESENTAÇÃO" : "MÍDIA.OS",
    subtitulo: isNexo
      ? "Hub de Negócios e Soluções 360° | nexomidiaerepresentacao.com.br"
      : "Sistema Integrado de Gestão Comercial e Mídia 360°",
    site: organizacao.site_url || "",
    termos: organizacao.termos_proposta || "Termos gerais padrão Mídia.OS",
    rodape: `Desenvolvido e operado por ${organizacao.nome} (${organizacao.site_url ? organizacao.site_url.replace("https://", "") : ""})`,
  };
}

const propDemo = { numero: "PROP-2026-001", executivo: "Rafael Rodrigo" };
const timbradaNexo = timbrarProposta(propDemo, orgResolvidaNexo);
const timbradaGenerica = timbrarProposta(propDemo, orgResolvidaGenerico);

assert(timbradaNexo.cabecalho.includes("NEXO"));
assert(timbradaNexo.subtitulo.includes("nexomidiaerepresentacao.com.br"));
assert(timbradaNexo.termos.includes("Hub de Negócios e Inteligência de Mídia no Distrito Federal"));
assert(timbradaNexo.rodape.includes("nexomidiaerepresentacao.com.br"));

assert.strictEqual(timbradaGenerica.cabecalho, "MÍDIA.OS");
assert(!timbradaGenerica.rodape.includes("nexo"));
console.log("  ✅ Teste 4 passou com sucesso!\n");

console.log("================================================================================");
console.log("🎉 TODOS OS TESTES DE WHITE-LABEL E ISOLAMENTO MULTI-TENANT PASSARAM (4/4)!");
console.log("================================================================================");
