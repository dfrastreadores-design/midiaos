import React, { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TerritoryOption {
  nome: string;
  cluster: string;
  perfil: string;
  classe: string;
  fluxo: string;
}

const REGIOES_PRESET: TerritoryOption[] = [
  {
    nome: "Plano Piloto (Asa Sul / Norte / Esplanada)",
    cluster: "Centro Político & Executivo",
    perfil: "Poder Público, Corporativo, Servidores e Alto Padrão",
    classe: "Classe A/B",
    fluxo: "Massivo (Eixo Rodoviário e W3)",
  },
  {
    nome: "Águas Claras",
    cluster: "Alta Densidade Vertical",
    perfil: "Jovens Profissionais, Famílias e Comércio Vibrante",
    classe: "Classe A/B",
    fluxo: "Intenso (Castanheiras e Araucárias)",
  },
  {
    nome: "Taguatinga",
    cluster: "Polo Comercial Tradicional",
    perfil: "Comércio Varejista, Empresarial e Serviços",
    classe: "Classe B/C",
    fluxo: "Massivo (Pistão Sul/Norte e Comercial Norte)",
  },
  {
    nome: "Sudoeste / Octogonal",
    cluster: "Residencial Nobre",
    perfil: "Famílias de Alta Renda e Formadores de Opinião",
    classe: "Classe A",
    fluxo: "Alto (Primeira e Segunda Avenidas)",
  },
  {
    nome: "Lago Sul & Lago Norte",
    cluster: "Mansões & Embaixadas",
    perfil: "Altíssima Renda, Diplomatas e Empresários",
    classe: "Classe A+",
    fluxo: "Focado (Pontes e Balões Troncais)",
  },
  {
    nome: "Ceilândia",
    cluster: "Maior População & Varejo",
    perfil: "Comércio Forte, População Ativa e Grande Consumo",
    classe: "Classe B/C/D",
    fluxo: "Gigantesco (Hélio Prates e Centro)",
  },
  {
    nome: "Guará (I e II)",
    cluster: "Residencial Consolidado",
    perfil: "Famílias Estáveis, Servidores e Comércio de Bairro",
    classe: "Classe B",
    fluxo: "Alto (Avenida Contorno e EPTG)",
  },
  {
    nome: "Vicente Pires",
    cluster: "Expansão Residencial & Gastronomia",
    perfil: "Famílias de Média-Alta Renda e Polo Gastronômico",
    classe: "Classe A/B",
    fluxo: "Intenso (Ruas 03, 08 e Estrutural)",
  },
  {
    nome: "Samambaia",
    cluster: "Expansão Urbana",
    perfil: "Jovens Casais, Expansão Imobiliária e Serviços",
    classe: "Classe C/D",
    fluxo: "Alto (Primeira Avenida)",
  },
  {
    nome: "Gama & Santa Maria",
    cluster: "Eixo Sul Industrial/Saúde",
    perfil: "Polo de Saúde, Universitário e Residencial",
    classe: "Classe B/C",
    fluxo: "Contínuo (BR-040 e Eixo Sul)",
  },
  {
    nome: "Sobradinho & Planaltina",
    cluster: "Eixo Norte / Condomínios",
    perfil: "Condomínios Fechados e Centros Históricos",
    classe: "Classe B/C",
    fluxo: "Concentrado (BR-020)",
  },
  {
    nome: "Nacional / Principais Capitais (SP, RJ, MG, etc.)",
    cluster: "Cobertura Multimercado",
    perfil: "Grandes Centros Urbanos e Campanhas Nacionais",
    classe: "Multi-Classe",
    fluxo: "Nacional",
  },
];

interface TerritorySelectorProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
  className?: string;
}

export function TerritorySelector({
  selectedRegions,
  onChange,
  className,
}: TerritorySelectorProps) {
  const [search, setSearch] = useState("");
  const [customRegion, setCustomRegion] = useState("");

  const toggleRegion = (nome: string) => {
    if (selectedRegions.includes(nome)) {
      onChange(selectedRegions.filter((r) => r !== nome));
    } else {
      onChange([...selectedRegions, nome]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customRegion.trim();
    if (!trimmed) return;
    if (!selectedRegions.includes(trimmed)) {
      onChange([...selectedRegions, trimmed]);
    }
    setCustomRegion("");
  };

  const filteredPresets = REGIOES_PRESET.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.cluster.toLowerCase().includes(search.toLowerCase()) ||
      p.perfil.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra de Busca e Região Customizada */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar região, cluster ou perfil territorial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar região customizada..."
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

      {/* Regiões Atualmente Selecionadas */}
      {selectedRegions.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {selectedRegions.length} {selectedRegions.length === 1 ? "Região Selecionada" : "Regiões Selecionadas"} para o Plano
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
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

      {/* Grid de Territórios Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredPresets.map((reg) => {
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

                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300/90 flex items-center gap-1">
                  <Building className="size-3 shrink-0" />
                  <span className="truncate">{reg.cluster}</span>
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
