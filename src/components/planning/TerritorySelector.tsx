import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProdutos, type Produto } from "@/lib/produtos.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Check,
  Plus,
  X,
  Search,
  Building,
  TrendingUp,
  Sparkles,
  Layers,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DynamicPraca {
  nome: string;
  cluster: string;
  perfil: string;
  classe: string;
  fluxo: string;
  totalProdutos: number;
  midias: string[];
  cidade?: string;
  uf?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface TerritorySelectorProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
  className?: string;
}

// Normalizador inteligente de praças a partir dos produtos reais cadastrados
export function normalizarPracaDeProduto(p: Produto): {
  pracaNome: string;
  cluster: string;
  perfil: string;
  classe: string;
  fluxo: string;
} {
  const loc = `${p.cidade || ""} ${p.uf || (p as any).estado || ""} ${p.endereco_ponto || (p as any).endereco || ""} ${(p as any).bairro || ""} ${(p as any).regiao || ""} ${(p as any).localizacao || ""} ${p.nome || ""}`.toLowerCase();

  if (loc.includes("águas claras") || loc.includes("aguas claras") || loc.includes("copaíba") || loc.includes("vitrinni")) {
    return {
      pracaNome: "Águas Claras - DF",
      cluster: "Alta Densidade Vertical & Gastronomia",
      perfil: "Jovens Profissionais, Famílias e Comércio Vibrante",
      classe: "Classe A/B",
      fluxo: "Intenso (Castanheiras, Araucárias e Shoppings)",
    };
  }

  if (loc.includes("taguatinga") || loc.includes("pistão") || loc.includes("pistao") || loc.includes("comercial norte") || loc.includes("taguatinga shopping")) {
    return {
      pracaNome: "Taguatinga - DF",
      cluster: "Polo Comercial Tradicional & Varejo",
      perfil: "Comércio Varejista, Empresarial e Serviços Centralizados",
      classe: "Classe B/C",
      fluxo: "Massivo (Pistão Sul/Norte e Comercial)",
    };
  }

  if (loc.includes("ceilândia") || loc.includes("ceilandia") || loc.includes("hélio prates") || loc.includes("helio prates") || loc.includes("unb ceilândia")) {
    return {
      pracaNome: "Ceilândia - DF",
      cluster: "Maior População & Varejo Ativo",
      perfil: "Comércio Forte, População Ativa e Alto Poder de Compra",
      classe: "Classe B/C/D",
      fluxo: "Gigantesco (Hélio Prates, Centro e P. Norte)",
    };
  }

  if (loc.includes("sobradinho") || loc.includes("br 020") || loc.includes("br-020")) {
    return {
      pracaNome: "Sobradinho - DF",
      cluster: "Eixo Norte / Condomínios & BR-020",
      perfil: "Condomínios Fechados, Centros Históricos e Fluxo Interurbano",
      classe: "Classe B/C",
      fluxo: "Concentrado (BR-020 e Eixo Norte)",
    };
  }

  if (loc.includes("gama") || loc.includes("catetinho") || loc.includes("unb gama") || loc.includes("santa maria")) {
    return {
      pracaNome: "Gama & Santa Maria - DF",
      cluster: "Eixo Sul Industrial / Saúde & Universitário",
      perfil: "Polo Hospitalar, Institutos Federais e Residencial",
      classe: "Classe B/C",
      fluxo: "Contínuo (BR-040, Eixo Sul e Rodovias)",
    };
  }

  if (loc.includes("guará") || loc.includes("guara") || loc.includes("eptg") || loc.includes("polo de modas")) {
    return {
      pracaNome: "Guará & EPTG - DF",
      cluster: "Residencial Consolidado & Corredor EPTG",
      perfil: "Famílias Estáveis, Servidores e Corredor de Maior Tráfego",
      classe: "Classe A/B",
      fluxo: "Altíssimo (+140 mil veículos/dia na EPTG)",
    };
  }

  if (loc.includes("sudoeste") || loc.includes("octogonal")) {
    return {
      pracaNome: "Sudoeste / Octogonal - DF",
      cluster: "Residencial Nobre & Alta Renda",
      perfil: "Famílias de Alta Renda, Servidores Federais e Executivos",
      classe: "Classe A",
      fluxo: "Alto (Primeira e Segunda Avenidas)",
    };
  }

  if (loc.includes("lago sul") || loc.includes("lago norte") || loc.includes("park way")) {
    return {
      pracaNome: "Lago Sul & Lago Norte - DF",
      cluster: "Mansões & Embaixadas",
      perfil: "Altíssima Renda, Diplomatas e Lideranças Empresariais",
      classe: "Classe A+",
      fluxo: "Focado (Pontes JK, Costa e Silva e Balões)",
    };
  }

  if (loc.includes("vicente pires") || loc.includes("estrutural")) {
    return {
      pracaNome: "Vicente Pires & Estrutural - DF",
      cluster: "Expansão Residencial & Gastronomia",
      perfil: "Famílias de Média-Alta Renda e Polo Gastronômico",
      classe: "Classe A/B",
      fluxo: "Intenso (Ruas Troncais e Estrutural)",
    };
  }

  if (loc.includes("samambaia") || loc.includes("riacho fundo")) {
    return {
      pracaNome: "Samambaia & Riacho Fundo - DF",
      cluster: "Expansão Urbana & Conectividade Sul",
      perfil: "Comércio Local Forte e Grande População Economicamente Ativa",
      classe: "Classe B/C",
      fluxo: "Alto (Primeira Avenida e EPNB)",
    };
  }

  if (loc.includes("plano piloto") || loc.includes("asa sul") || loc.includes("asa norte") || loc.includes("esplanada") || loc.includes("eixo monumental") || loc.includes("w3") || loc.includes("l2")) {
    return {
      pracaNome: "Plano Piloto - DF",
      cluster: "Centro Político & Executivo Nacional",
      perfil: "Poder Público, Corporativo, Servidores e Alto Padrão",
      classe: "Classe A/B",
      fluxo: "Massivo (Eixo Rodoviário, Monumental e W3)",
    };
  }

  if (loc.includes("são paulo") || loc.includes("sao paulo") || (p.uf === "SP" && !loc.includes("df"))) {
    return {
      pracaNome: "São Paulo - SP",
      cluster: "Principal Centro Econômico do País",
      perfil: "Grandes Corporações, Mercado Financeiro e Consumo em Massa",
      classe: "Multi-Classe",
      fluxo: "Nacional (Grandes Avenidas e Metrô)",
    };
  }

  if (loc.includes("rio de janeiro") || (p.uf === "RJ" && !loc.includes("df"))) {
    return {
      pracaNome: "Rio de Janeiro - RJ",
      cluster: "Capital Cultural & Grande Metrópole",
      perfil: "Comércio, Serviços, Mídia e Turismo",
      classe: "Multi-Classe",
      fluxo: "Nacional (Zona Sul, Barra e Centro)",
    };
  }

  if (loc.includes("brasília") || loc.includes("brasilia") || p.uf === "DF") {
    return {
      pracaNome: "Brasília (Distrito Federal - Ampla Cobertura)",
      cluster: "Cobertura Metropolitana DF",
      perfil: "Rede Integrada de Telas e Painéis em Todo o DF",
      classe: "Classe A/B/C",
      fluxo: "Distrital (+820 mil impactos/dia)",
    };
  }

  if (p.cidade) {
    return {
      pracaNome: `${p.cidade}${p.uf ? " - " + p.uf : ""}`,
      cluster: "Praça Regional Homologada",
      perfil: "Polo Regional de Audiência e Cobertura Comercial",
      classe: "Classe B/C",
      fluxo: "Regional",
    };
  }

  return {
    pracaNome: "Nacional / Geral",
    cluster: "Cobertura Multimercado",
    perfil: "Telas e Produtos de Abrangência Nacional",
    classe: "Multi-Classe",
    fluxo: "Nacional",
  };
}

export function TerritorySelector({
  selectedRegions,
  onChange,
  className,
}: TerritorySelectorProps) {
  const [search, setSearch] = useState("");
  const [customRegion, setCustomRegion] = useState("");

  // 1. Carrega produtos reais do inventário do tenant
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos-planejamento"],
    queryFn: () => listProdutos(),
    staleTime: 5 * 60_000,
  });

  // 2. Agrupa e deriva praças reais a partir do inventário ativo
  const pracasDinamicas = useMemo<DynamicPraca[]>(() => {
    const map = new Map<string, {
      cluster: string;
      perfil: string;
      classe: string;
      fluxo: string;
      total: number;
      midias: Set<string>;
      cidade?: string;
      uf?: string;
      lat?: number | null;
      lng?: number | null;
    }>();

    for (const p of produtos as Produto[]) {
      if (!p.ativo) continue;
      const norm = normalizarPracaDeProduto(p);
      if (!map.has(norm.pracaNome)) {
        map.set(norm.pracaNome, {
          cluster: norm.cluster,
          perfil: norm.perfil,
          classe: norm.classe,
          fluxo: norm.fluxo,
          total: 0,
          midias: new Set(),
          cidade: p.cidade || undefined,
          uf: p.uf || undefined,
          lat: p.latitude || null,
          lng: p.longitude || null,
        });
      }
      const item = map.get(norm.pracaNome)!;
      item.total++;
      if (p.midia) item.midias.add(p.midia);
      if (!item.lat && p.latitude) item.lat = p.latitude;
      if (!item.lng && p.longitude) item.lng = p.longitude;
    }

    // Converte para array ordenado por quantidade de produtos (maiores primeiro)
    const list: DynamicPraca[] = [];
    for (const [nome, info] of map.entries()) {
      list.push({
        nome,
        cluster: info.cluster,
        perfil: info.perfil,
        classe: info.classe,
        fluxo: info.fluxo,
        totalProdutos: info.total,
        midias: Array.from(info.midias),
        cidade: info.cidade,
        uf: info.uf,
        latitude: info.lat,
        longitude: info.lng,
      });
    }

    list.sort((a, b) => b.totalProdutos - a.totalProdutos);
    return list;
  }, [produtos]);

  const toggleRegion = (nome: string) => {
    if (selectedRegions.includes(nome)) {
      onChange(selectedRegions.filter((r) => r !== nome));
    } else {
      onChange([...selectedRegions, nome]);
    }
  };

  const handleSelectAll = () => {
    const allNames = pracasDinamicas.map((p) => p.nome);
    onChange(Array.from(new Set([...selectedRegions, ...allNames])));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleAddCustom = () => {
    const trimmed = customRegion.trim();
    if (!trimmed) return;
    if (!selectedRegions.includes(trimmed)) {
      onChange([...selectedRegions, trimmed]);
    }
    setCustomRegion("");
  };

  const filteredPracas = useMemo(() => {
    return pracasDinamicas.filter(
      (p) =>
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.cluster.toLowerCase().includes(search.toLowerCase()) ||
        p.perfil.toLowerCase().includes(search.toLowerCase()) ||
        p.midias.some((m) => m.toLowerCase().includes(search.toLowerCase()))
    );
  }, [pracasDinamicas, search]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cabeçalho de Status do Inventário */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 border border-border/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs py-1">
            <Sparkles className="size-3" />
            Inventário Real Conectado
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {isLoading ? "Consultando banco..." : `${pracasDinamicas.length} praças com ${produtos.length} produtos elegíveis`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="h-8 rounded-xl text-xs font-semibold gap-1.5"
          >
            <CheckCheck className="size-3.5 text-primary" />
            Selecionar Todas ({pracasDinamicas.length})
          </Button>

          {selectedRegions.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-8 rounded-xl text-xs text-muted-foreground hover:text-destructive px-2"
            >
              Limpar Seleção
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Busca e Região Customizada */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar praça real, município, cluster ou formato de mídia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar praça customizada..."
            value={customRegion}
            onChange={(e) => setCustomRegion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            className="h-10 rounded-xl w-60"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddCustom}
            className="h-10 rounded-xl gap-1.5 shrink-0"
          >
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Praças Atualmente Selecionadas */}
      {selectedRegions.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {selectedRegions.length} {selectedRegions.length === 1 ? "Praça Selecionada" : "Praças Selecionadas"} para o Plano
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 text-[11px] text-muted-foreground hover:text-destructive px-2"
            >
              Limpar todas
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedRegions.map((reg) => (
              <Badge
                key={reg}
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs py-1 px-2.5 flex items-center gap-1.5 shadow-xs"
              >
                <span>{reg}</span>
                <button
                  type="button"
                  onClick={() => toggleRegion(reg)}
                  className="rounded-full hover:bg-black/20 p-0.5 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Praças Derivadas do Inventário */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
        {filteredPracas.map((reg) => {
          const isSelected = selectedRegions.includes(reg.nome);
          return (
            <Card
              key={reg.nome}
              onClick={() => toggleRegion(reg.nome)}
              className={cn(
                "cursor-pointer transition-all duration-200 border rounded-2xl relative overflow-hidden group hover:border-amber-500/50 hover:shadow-md",
                isSelected
                  ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-xs"
                  : "bg-card border-border/70 hover:bg-accent/40"
              )}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-foreground leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                    {reg.nome}
                  </div>
                  <div
                    className={cn(
                      "size-5 rounded-md flex items-center justify-center shrink-0 border transition-all",
                      isSelected
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "border-border/80 group-hover:border-amber-400 text-transparent"
                    )}
                  >
                    <Check className="size-3.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] gap-2">
                  <div className="font-medium text-amber-700 dark:text-amber-300/90 flex items-center gap-1 truncate">
                    <Building className="size-3 shrink-0" />
                    <span className="truncate">{reg.cluster}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
                    {reg.totalProdutos} {reg.totalProdutos === 1 ? "produto" : "produtos"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {reg.midias.map((m) => (
                    <span key={m} className="px-1.5 py-0.2 rounded bg-muted/80 text-[10px] font-semibold text-muted-foreground">
                      {m}
                    </span>
                  ))}
                </div>

                <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {reg.perfil}
                </div>

                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground/80">
                    {reg.classe}
                  </span>
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <TrendingUp className="size-3 text-emerald-600" />
                    {reg.fluxo}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
