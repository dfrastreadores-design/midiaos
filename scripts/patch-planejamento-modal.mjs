import fs from "node:fs";

let code = fs.readFileSync("src/components/planejamento360/Planejamento360Modal.tsx", "utf-8");

// 1. Import useCurrentOrg
code = code.replace(
  'import { toast } from "sonner";',
  'import { toast } from "sonner";\nimport { useCurrentOrg } from "@/hooks/use-current-org";'
);

// 2. Consume useCurrentOrg in component
code = code.replace(
  '  const [demandaAberta, setDemandaAberta] = useState(false);',
  `  const [demandaAberta, setDemandaAberta] = useState(false);
  const { isNexo, nome: orgNome, siteUrl: orgSiteUrl } = useCurrentOrg();`
);

// 3. Update Title & Description
const oldTitle = `                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold tracking-tight text-white">
                    Planejamento Estratégico 360° & Radar de Expansão
                  </DialogTitle>
                  <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/40 text-[10px] uppercase font-semibold">
                    Reunião Comercial
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-sky-200/80 mt-0.5">
                  Diagnóstico ao vivo, inteligência de público do DF e recomendação multicanal com radar de novas praças.
                </DialogDescription>`;

const newTitle = `                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold tracking-tight text-white">
                    {isNexo ? "Hub Nexo 360° — Inteligência Territorial & Radar DF" : "Planejamento Estratégico 360° & Radar de Expansão"}
                  </DialogTitle>
                  <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/40 text-[10px] uppercase font-semibold">
                    {isNexo ? "⭐ Nexo Mídia Hub" : "Reunião Comercial"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-sky-200/80 mt-0.5">
                  {isNexo
                    ? "Diagnóstico executivo oficial da Nexo Mídia e Representação, catálogo de soluções próprias, veículos representados e radar DF."
                    : "Diagnóstico ao vivo, inteligência de público do DF e recomendação multicanal com radar de novas praças."}
                </DialogDescription>`;

code = code.replace(oldTitle, newTitle);

fs.writeFileSync("src/components/planejamento360/Planejamento360Modal.tsx", code, "utf-8");
console.log("src/components/planejamento360/Planejamento360Modal.tsx updated successfully");
