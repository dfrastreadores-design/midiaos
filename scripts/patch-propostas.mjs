import fs from "node:fs";

let code = fs.readFileSync("src/lib/propostas.functions.ts", "utf-8");

const target = `    if (error) throw new Error(error.message);

    // Enriquecer itens com dados de produtos`;

const replacement = `    if (error) throw new Error(error.message);

    // Obter dados da organização emissora da proposta (White-label Nexo vs Neutro)
    let org: any = null;
    const orgId = (prop as any).organizacao_id || (prop.executivo as any)?.organizacao_id || prop.tenant_id;
    if (orgId) {
      try {
        const { data: orgData } = await (context.supabase.from("organizacoes") as any)
          .select("id, nome, slug, site_url, logo_url, tagline, termos_proposta, cor_primaria")
          .eq("id", orgId)
          .maybeSingle();
        if (orgData) org = orgData;
      } catch {}
    }

    if (!org) {
      const executivoEmail = (prop.executivo?.email || "").toLowerCase();
      if (executivoEmail.includes("nexo") || executivoEmail.includes("rafaelnexomidia@gmail.com")) {
        try {
          const { data: nexoOrg } = await (context.supabase.from("organizacoes") as any)
            .select("id, nome, slug, site_url, logo_url, tagline, termos_proposta, cor_primaria")
            .eq("slug", "nexo")
            .maybeSingle();
          if (nexoOrg) org = nexoOrg;
        } catch {}
      }
    }

    if (org) {
      (prop as any).organizacao = {
        ...org,
        isNexo: org.slug === "nexo" || org.nome?.toLowerCase().includes("nexo"),
      };
    }

    // Enriquecer itens com dados de produtos`;

code = code.replace(target, replacement);

fs.writeFileSync("src/lib/propostas.functions.ts", code, "utf-8");
console.log("src/lib/propostas.functions.ts updated successfully");
