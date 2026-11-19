import fs from "node:fs";

let code = fs.readFileSync("src/routes/produtos.tsx", "utf-8");

// 1. Import useCurrentOrg
code = code.replace(
  'import { useUserRoles } from "@/hooks/use-roles";',
  'import { useUserRoles } from "@/hooks/use-roles";\nimport { useCurrentOrg } from "@/hooks/use-current-org";'
);

// 2. Consume useCurrentOrg
code = code.replace(
  '  const { can, isAdmin } = useUserRoles();',
  `  const { can, isAdmin } = useUserRoles();
  const { isNexo, nome: orgNome, siteUrl: orgSiteUrl } = useCurrentOrg();`
);

// 3. Update Title & Subtitle in header
const oldHeader = `        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Produtos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro de produtos de TV, Rádio e DOOH (valor, tempo e inserções padrão).
          </p>
        </div>`;

const newHeader = `        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
              {isNexo ? "Soluções Próprias Nexo & Veículos Representados" : "Produtos & Inventário Comercial"}
            </h1>
            {isNexo && (
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-xs font-bold py-0.5">
                Hub Nexo 360° DF
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {isNexo
              ? "Catálogo estratégico de inventário comercial: soluções próprias e veículos parceiros homologados no Distrito Federal."
              : "Cadastro de produtos de TV, Rádio, DOOH e canais digitais (valor, tempo e inserções padrão)."}
          </p>
        </div>`;

code = code.replace(oldHeader, newHeader);

// 4. Update filtroOrigem labels
code = code.replace(
  `<SelectItem value="proprio">🏢 Próprios do Inquilino</SelectItem>\n                    <SelectItem value="parceiro">🤝 De Parceiros</SelectItem>`,
  `<SelectItem value="proprio">{isNexo ? "⭐ Soluções Próprias Nexo" : "🏢 Inventário Próprio"}</SelectItem>
                    <SelectItem value="parceiro">{isNexo ? "🤝 Veículos Parceiros Homologados" : "🤝 De Parceiros"}</SelectItem>`
);

fs.writeFileSync("src/routes/produtos.tsx", code, "utf-8");
console.log("src/routes/produtos.tsx updated successfully");
