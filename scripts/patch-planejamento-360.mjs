import fs from "node:fs";

let code = fs.readFileSync("src/lib/planejamento-360.functions.ts", "utf-8");

// 1. Update product query & multi-tenant isolation
const oldQuery = `    // 2. Buscar produtos no inventário do inquilino
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    let q = supabase
      .from("produtos")
      .select(
        "id, nome, programa, tipo, formato, midia, canal_macro, endereco_ponto, latitude, longitude, link_maps, sentido_via, ponto_referencia, detalhes_venda, valor_unit, valor_tabela, parceiro_id, parceiro_nome",
      )
      .eq("ativo", true);

    if (prof?.tenant_id) {
      q = q.eq("tenant_id", prof.tenant_id);
    }

    const { data: dbProdutos = [] } = await q;
    const todosProdutos = dbProdutos || [];`;

const newQuery = `    // 2. Buscar produtos com isolamento Multi-tenant estrito (Nexo vs Neutro)
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, email, tenant_id, organizacao_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;
    let userOrgId = prof?.organizacao_id || null;
    const userEmail = (prof?.email || "").toLowerCase();

    let isNexo = false;
    if (userOrgId) {
      const { data: o } = await (supabase.from("organizacoes") as any)
        .select("slug")
        .eq("id", userOrgId)
        .maybeSingle();
      if (o?.slug === "nexo") isNexo = true;
    } else if (userEmail.includes("nexo") || userEmail.includes("rafaelnexomidia@gmail.com")) {
      const { data: nexoOrg } = await (supabase.from("organizacoes") as any)
        .select("id, slug")
        .eq("slug", "nexo")
        .maybeSingle();
      if (nexoOrg) {
        userOrgId = nexoOrg.id;
        isNexo = true;
      }
    }

    let q = supabase
      .from("produtos")
      .select(
        "id, tenant_id, organizacao_id, origem_produto, nome, programa, tipo, formato, midia, canal_macro, endereco_ponto, latitude, longitude, link_maps, sentido_via, ponto_referencia, detalhes_venda, valor_unit, valor_tabela, parceiro_id, parceiro_nome",
      )
      .eq("ativo", true);

    const { data: dbProdutos = [] } = await q;
    const isSuperAdmin = userEmail === "rafaelrodrigo.as@gmail.com";

    // Filtragem Multi-tenant: Produtos próprios da Nexo só são visíveis para a Nexo
    const todosProdutos = (dbProdutos || []).filter((p: any) => {
      if (isSuperAdmin) return true;
      const origem = p.origem_produto || (p.parceiro_id || p.parceiro_nome ? "PARCEIRO" : "PROPRIO");
      if (origem === "PROPRIO") {
        if (userOrgId && p.organizacao_id) {
          return p.organizacao_id === userOrgId;
        }
        if (tenantId && p.tenant_id) {
          return p.tenant_id === tenantId;
        }
        return false;
      }
      return true; // Veículos parceiros representados são compartilhados
    });`;

code = code.replace(oldQuery, newQuery);

// 2. Personalizar defesa comercial se for Nexo
const oldDefesa = `    // 9. Defesa Comercial Executiva
    const defesaComercial = \`DEFESA COMERCIAL ESTRATÉGICA 360° — \${data.cliente_nome.toUpperCase()}
Região Foco: \${data.regiao_desafio} | Público: \${data.classes.join(", ")} (\${data.estilos_vida.join(", ")})

1. DIAGNÓSTICO DO TERRITÓRIO:
\${intel.perfilPredominante}

2. RACIONAL TÁTICO DOS 5 PILARES INTEGRADOS:
Nossa estratégia não depende de um único canal isolado. O cliente é impactado no momento do deslocamento matinal nas vias troncais (\${intel.viasTransbordamento[0]?.via || "principais rodovias"}), é reimpactado no silêncio do elevador residencial, encontra a marca nos momentos de almoço e lazer, presencia a autoridade da ativação ao vivo no PDV e tem o fechamento imediato na palma da mão pelo digital.

3. EFICIÊNCIA DE INVESTIMENTO:
Com investimento de R$ \${totalNegociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, geramos mais de \${totalImpactos.toLocaleString("pt-BR")} impactos qualificados no mês, resultando em um CPM altamente competitivo de R$ \${cpmConsolidado.toFixed(2)}.\`;`;

const newDefesa = `    // 9. Defesa Comercial Executiva (Nexo Hub ou Neutro Mídia.OS)
    const defesaComercial = isNexo
      ? \`DEFESA ESTRATÉGICA 360° — NEXO MÍDIA E REPRESENTAÇÃO
Cliente / Solicitante: \${data.cliente_nome.toUpperCase()}
Região Foco: \${data.regiao_desafio} | Público: \${data.classes.join(", ")} (\${data.estilos_vida.join(", ")})

1. O PAPEL DA NEXO MÍDIA COMO HUB ESTRATÉGICO:
A Nexo Mídia e Representação atua como Hub Estratégico conectando marcas aos melhores veículos e soluções 360° no Distrito Federal. Nossa curadoria reúne inventário próprio e veículos homologados em uma defesa comercial unificada e de alta rentabilidade.

2. DIAGNÓSTICO DO TERRITÓRIO:
\${intel.perfilPredominante}

3. RACIONAL TÁTICO DOS 5 PILARES INTEGRADOS:
Nossa estratégia não depende de um único canal isolado. O cliente é impactado no momento do deslocamento matinal nas vias troncais (\${intel.viasTransbordamento[0]?.via || "principais rodovias"}), é reimpactado no silêncio do elevador residencial, encontra a marca nos momentos de almoço e lazer, presencia a autoridade da ativação ao vivo no PDV e tem o fechamento imediato na palma da mão pelo digital.

4. EFICIÊNCIA DE INVESTIMENTO (HUB NEXO):
Com investimento total negociado de R$ \${totalNegociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, geramos mais de \${totalImpactos.toLocaleString("pt-BR")} impactos qualificados no mês, resultando em um CPM altamente competitivo de R$ \${cpmConsolidado.toFixed(2)}.\`
      : \`DEFESA COMERCIAL ESTRATÉGICA 360° — \${data.cliente_nome.toUpperCase()}
Região Foco: \${data.regiao_desafio} | Público: \${data.classes.join(", ")} (\${data.estilos_vida.join(", ")})

1. DIAGNÓSTICO DO TERRITÓRIO:
\${intel.perfilPredominante}

2. RACIONAL TÁTICO DOS 5 PILARES INTEGRADOS:
Nossa estratégia não depende de um único canal isolado. O cliente é impactado no momento do deslocamento matinal nas vias troncais (\${intel.viasTransbordamento[0]?.via || "principais rodovias"}), é reimpactado no silêncio do elevador residencial, encontra a marca nos momentos de almoço e lazer, presencia a autoridade da ativação ao vivo no PDV e tem o fechamento imediato na palma da mão pelo digital.

3. EFICIÊNCIA DE INVESTIMENTO:
Com investimento de R$ \${totalNegociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, geramos mais de \${totalImpactos.toLocaleString("pt-BR")} impactos qualificados no mês, resultando em um CPM altamente competitivo de R$ \${cpmConsolidado.toFixed(2)}.\`;`;

code = code.replace(oldDefesa, newDefesa);

fs.writeFileSync("src/lib/planejamento-360.functions.ts", code, "utf-8");
console.log("src/lib/planejamento-360.functions.ts updated successfully");
