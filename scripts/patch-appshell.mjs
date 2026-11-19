import fs from "node:fs";

let code = fs.readFileSync("src/components/AppShell.tsx", "utf-8");

// 1. Import useCurrentOrg
code = code.replace(
  'import { useTenantModulos } from "@/hooks/use-tenant-modulos";',
  'import { useTenantModulos } from "@/hooks/use-tenant-modulos";\nimport { useCurrentOrg } from "@/hooks/use-current-org";'
);

// 2. Consume useCurrentOrg and customize visibleNav labels
code = code.replace(
  '  const { logoSrc: tenantLogo, nome: tenantNome } = useTenantBranding();',
  `  const { logoSrc: tenantLogo, nome: tenantNome } = useTenantBranding();
  const { isNexo, nome: orgNome, siteUrl: orgSiteUrl } = useCurrentOrg();`
);

code = code.replace(
  `  const visibleNav = nav.filter((item) => {
    if (item.to === "/lixeira") return isAdmin;
    const canAccess = can(item.to);
    const hasMod = item.modulo == null || hasModulo(item.modulo);
    return canAccess && hasMod;
  });`,
  `  const visibleNav = nav
    .filter((item) => {
      if (item.to === "/lixeira") return isAdmin;
      const canAccess = can(item.to);
      const hasMod = item.modulo == null || hasModulo(item.modulo);
      return canAccess && hasMod;
    })
    .map((item) => {
      if (isNexo) {
        if (item.to === "/produtos") {
          return { ...item, label: "Soluções Próprias & Parceiros" };
        }
        if (item.to === "/centralizadores") {
          return { ...item, label: "Planejamento 360° & Radar DF" };
        }
      }
      return item;
    });`
);

// 3. Customize Sidebar Brand
const oldSidebarBrand = `          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-lg tracking-tight text-sidebar truncate flex items-center gap-1.5">
              {tenantNome || (
                <>
                  Mídia<span className="text-gold">.</span>OS
                </>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-sidebar/40 truncate">
              {isSuperAdmin
                ? "👑 Gestão Global"
                : tenantNome
                  ? "Espaço da Empresa"
                  : "Premium Suite"}
            </div>
          </div>`;

const newSidebarBrand = `          <div className="min-w-0 flex-1">
            {isNexo ? (
              <a
                href={orgSiteUrl || "https://nexomidiaerepresentacao.com.br"}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
                title="Acessar site da Nexo Mídia e Representação"
              >
                <div className="font-display font-bold text-base tracking-tight text-sidebar truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                  Nexo Mídia
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-sky-600 truncate flex items-center gap-1">
                  Hub Estratégico 360° ↗
                </div>
              </a>
            ) : (
              <>
                <div className="font-display font-bold text-lg tracking-tight text-sidebar truncate flex items-center gap-1.5">
                  {tenantNome || (
                    <>
                      Mídia<span className="text-gold">.</span>OS
                    </>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-sidebar/40 truncate">
                  {isSuperAdmin
                    ? "👑 Gestão Global"
                    : tenantNome
                      ? "Espaço da Empresa"
                      : "Premium Suite"}
                </div>
              </>
            )}
          </div>`;

code = code.replace(oldSidebarBrand, newSidebarBrand);

// 4. Customize Mobile Sidebar
code = code.replace(
  `<div className="font-display font-bold text-base tracking-tight text-sidebar flex items-center">\n                      Mídia<span className="text-gold">.</span>OS\n                    </div>`,
  `<div className="font-display font-bold text-base tracking-tight text-sidebar flex items-center">
                      {isNexo ? "Nexo Mídia e Representação" : <>Mídia<span className="text-gold">.</span>OS</>}
                    </div>`
);

// 5. Customize Desktop Header Top Bar
const oldHeaderTopBar = `            <div className="hidden lg:flex items-center gap-3">
              <div className="h-5 w-1 bg-gold/30 rounded-full" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                {tenantNome ? \`Empresa: \${tenantNome}\` : "Comercial Engine"}
              </h2>
              {isSuperAdmin && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs px-2.5 py-0.5 font-bold flex items-center gap-1"
                >
                  👑 Super Admin Global
                </Badge>
              )}
            </div>`;

const newHeaderTopBar = `            <div className="hidden lg:flex items-center gap-3">
              <div className="h-5 w-1 bg-gold/30 rounded-full" />
              {isNexo ? (
                <a
                  href={orgSiteUrl || "https://nexomidiaerepresentacao.com.br"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-85 transition-opacity"
                  title="Visitar Nexo Mídia e Representação"
                >
                  <span className="text-sm font-bold text-foreground tracking-tight">
                    Nexo Mídia e Representação
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-[10px] px-2 py-0.5 font-bold"
                  >
                    Hub 360° DF
                  </Badge>
                </a>
              ) : (
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                  {tenantNome ? \`Empresa: \${tenantNome}\` : "Comercial Engine"}
                </h2>
              )}
              {isSuperAdmin && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs px-2.5 py-0.5 font-bold flex items-center gap-1"
                >
                  👑 Super Admin Global
                </Badge>
              )}
            </div>`;

code = code.replace(oldHeaderTopBar, newHeaderTopBar);

// 6. Mobile header logo text
code = code.replace(
  `<span className="font-display font-bold text-base sm:text-lg truncate">Mídia.OS</span>`,
  `<span className="font-display font-bold text-base sm:text-lg truncate">{isNexo ? "Nexo Mídia" : "Mídia.OS"}</span>`
);

fs.writeFileSync("src/components/AppShell.tsx", code, "utf-8");
console.log("src/components/AppShell.tsx updated successfully");
