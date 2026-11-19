import fs from "node:fs";

let code = fs.readFileSync("src/lib/produtos.functions.ts", "utf-8");

// 1. Add fields to ProdutoSchema
code = code.replace(
  'canal_macro: z.enum(["OFF", "ON", "HIBRIDO"]).default("OFF").optional(),',
  `canal_macro: z.enum(["OFF", "ON", "HIBRIDO"]).default("OFF").optional(),
  origem_produto: z.enum(["PROPRIO", "PARCEIRO"]).default("PROPRIO").optional(),
  organizacao_id: z.string().uuid().optional().nullable(),`
);

// 2. Add origem_produto and organizacao_id to normalizeProdutoRow
code = code.replace(
  "return {\n    ...row,\n    canal_macro:",
  `let origem_produto = row.origem_produto;
  if (!origem_produto) {
    origem_produto = (parceiro_id || parceiro_cnpj || parceiro_nome) ? "PARCEIRO" : "PROPRIO";
  }

  return {
    ...row,
    origem_produto: (origem_produto || "PROPRIO") as "PROPRIO" | "PARCEIRO",
    organizacao_id: row.organizacao_id || null,
    canal_macro:`
);

// 3. Update listProdutos with multi-tenant filtering
const startIdx = code.indexOf("export const listProdutos = createServerFn");
const endIdx = code.indexOf("export const upsertProduto = createServerFn");

if (startIdx !== -1 && endIdx !== -1) {
  const newList = `export const listProdutos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Obter tenant_id e organizacao_id do perfil do usuário logado
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, email, tenant_id, organizacao_id")
      .eq("id", context.userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;
    let userOrgId = prof?.organizacao_id || null;
    const userEmail = (prof?.email || "").toLowerCase();

    // Auto-identificação da organização Nexo caso organizacao_id ainda não esteja salvo no perfil
    if (!userOrgId && (userEmail.includes("nexo") || userEmail.includes("rafaelnexomidia@gmail.com"))) {
      try {
        const { data: nexoOrg } = await (context.supabase.from("organizacoes") as any)
          .select("id")
          .eq("slug", "nexo")
          .maybeSingle();
        if (nexoOrg) userOrgId = nexoOrg.id;
      } catch {
        /* ignore */
      }
    }

    let query = (context.supabase.from("produtos") as any).select("*");
    const { data, error } = await query.order("midia").order("nome");
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(normalizeProdutoRow);

    // O super-administrador global tem visibilidade irrestrita
    const isSuperAdminUser = userEmail === "rafaelrodrigo.as@gmail.com";
    if (isSuperAdminUser) {
      return rows;
    }

    // REGRA DE SEGURANÇA MULTI-TENANT:
    // - PROPRIO: visível APENAS se o organizacao_id for idêntico ao do usuário logado (ou mesmo tenant_id)
    // - PARCEIRO: veículos parceiros homologados compartilhados para montagem de planos
    return rows.filter((p) => {
      const origem = p.origem_produto || (p.parceiro_id || p.parceiro_nome || p.parceiro_cnpj ? "PARCEIRO" : "PROPRIO");
      if (origem === "PROPRIO") {
        if (userOrgId && p.organizacao_id) {
          return p.organizacao_id === userOrgId;
        }
        if (tenantId && p.tenant_id) {
          return p.tenant_id === tenantId;
        }
        // Se o usuário não tem organização e o produto é próprio, não exibe
        return false;
      }
      // Produtos de veículos parceiros homologados são visíveis para planejamento comercial
      return true;
    });
  });\n\n`;

  code = code.substring(0, startIdx) + newList + code.substring(endIdx);
}

// 4. Update upsertProduto to set origem_produto and organizacao_id
code = code.replace(
  'const { data: prof } = await context.supabase\n      .from("profiles")\n      .select("tenant_id")\n      .eq("id", context.userId)\n      .maybeSingle();\n    const tenantId = prof?.tenant_id;',
  `const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, email, tenant_id, organizacao_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;
    let userOrgId = prof?.organizacao_id || null;
    const userEmail = (prof?.email || "").toLowerCase();
    if (!userOrgId && (userEmail.includes("nexo") || userEmail.includes("rafaelnexomidia@gmail.com"))) {
      try {
        const { data: nexoOrg } = await (context.supabase.from("organizacoes") as any).select("id").eq("slug", "nexo").maybeSingle();
        if (nexoOrg) userOrgId = nexoOrg.id;
      } catch {}
    }`
);

code = code.replace(
  "let payload: any = {\n      ...data,",
  `let origemProduto = data.origem_produto;
    if (!origemProduto) {
      origemProduto = (parceiroId || parceiroCnpj || parceiroNome) ? "PARCEIRO" : "PROPRIO";
    }

    let payload: any = {
      ...data,
      origem_produto: origemProduto,
      organizacao_id: userOrgId || data.organizacao_id || null,`
);

fs.writeFileSync("src/lib/produtos.functions.ts", code, "utf-8");
console.log("src/lib/produtos.functions.ts updated successfully");
