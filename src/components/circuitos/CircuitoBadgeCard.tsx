import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatBRL } from "@/lib/mock-data";
import { CircuitBundle, CIRCUIT_PRICING_TYPES } from "@/types/circuitos-bundles.types";
import { cn } from "@/lib/utils";

interface CircuitoBadgeCardProps {
  bundle: CircuitBundle;
  isEligiblePartner?: boolean;
  onSelect?: (bundle: CircuitBundle) => void;
  className?: string;
  showDetailsDefault?: boolean;
}

export function CircuitoBadgeCard({
  bundle,
  isEligiblePartner = true,
  onSelect,
  className,
  showDetailsDefault = false,
}: CircuitoBadgeCardProps) {
  const [expanded, setExpanded] = useState(showDetailsDefault);

  // Calcula valores somados regulares
  const items = bundle.items || [];
  const regularTotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    0
  );

  let bundleFinalPrice = regularTotal;
  let savings = 0;
  let discountPct = 0;

  if (bundle.pricing_type === "fixed_price") {
    const fixed = Number(bundle.fixed_price) || regularTotal;
    bundleFinalPrice = Math.min(regularTotal, fixed);
    savings = Math.max(0, regularTotal - bundleFinalPrice);
    discountPct = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;
  } else if (bundle.pricing_type === "discount_percentage") {
    discountPct = Math.min(100, Math.max(0, Number(bundle.discount_value) || 0));
    savings = Math.round(((regularTotal * discountPct) / 100) * 100) / 100;
    bundleFinalPrice = Math.max(0, regularTotal - savings);
  } else if (bundle.pricing_type === "discount_nominal") {
    savings = Math.min(regularTotal, Number(bundle.discount_value) || 0);
    bundleFinalPrice = Math.max(0, regularTotal - savings);
    discountPct = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;
  }

  const pricingLabel =
    CIRCUIT_PRICING_TYPES.find((p) => p.value === bundle.pricing_type)?.label ||
    "Preço Promocional";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 border-2",
        isEligiblePartner
          ? "border-blue-500/40 hover:border-blue-500 shadow-sm hover:shadow-md bg-card"
          : "border-border/60 opacity-80 bg-muted/20",
        className
      )}
    >
      {/* Top Banner Destaque Combo */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-3.5 py-1.5 flex items-center justify-between text-white text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 animate-pulse text-amber-300" />
          <span>CIRCUITO COMPLETO • COMBO PROMOCIONAL</span>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] bg-white/20 text-white border-white/30 backdrop-blur-xs font-bold"
        >
          {bundle.media_type || "DOOH"}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {bundle.code}
              </span>
              <h4 className="font-bold text-base text-foreground leading-tight truncate">
                {bundle.name}
              </h4>
            </div>
            {bundle.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bundle.description}
              </p>
            )}
            {bundle.partner && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <Building2 className="size-3 text-muted-foreground" />
                <span>
                  Veículo: {bundle.partner.nome_fantasia || bundle.partner.razao_social}
                </span>
              </div>
            )}
          </div>

          {/* Tag de Economia Comercial */}
          {savings > 0 && (
            <div className="text-right shrink-0">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs flex items-center gap-1">
                <TrendingDown className="size-3.5" />
                {discountPct}% OFF
              </Badge>
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                Economia de {formatBRL(savings)}
              </span>
            </div>
          )}
        </div>

        {/* Comparativo de Preço "De R$ X por R$ Y" */}
        <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 p-3 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Preço Unitário Somado
            </span>
            <span className="text-xs font-semibold text-muted-foreground line-through">
              {formatBRL(regularTotal)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider block">
              Preço do Circuito Fechado
            </span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {formatBRL(bundleFinalPrice)}
            </span>
          </div>
        </div>

        {/* Resumo da composição dos itens */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="size-3.5" />
              {items.length} ponto(s) integrados no pacote
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] p-0 text-primary hover:bg-transparent"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Ocultar composição <ChevronUp className="size-3 ml-0.5" />
                </>
              ) : (
                <>
                  Ver composição <ChevronDown className="size-3 ml-0.5" />
                </>
              )}
            </Button>
          </div>

          {expanded && (
            <div className="pt-1.5 space-y-1 border-t border-border/60">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/40"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium">{it.product_name}</span>
                    {it.is_mandatory && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-background text-amber-600 border-amber-300">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  <div className="text-right font-mono text-[11px] text-muted-foreground shrink-0">
                    {it.quantity}x • {formatBRL(it.unit_price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ação de seleção ou aviso de inelegibilidade */}
        {isEligiblePartner ? (
          onSelect && (
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-xs"
              onClick={() => onSelect(bundle)}
            >
              <Sparkles className="size-3.5" />
              Inserir Circuito Completo com Desconto
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          )
        ) : (
          <div className="flex items-center gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>
              Parceiro não elegível para comercializar este circuito com desconto. Apenas itens avulsos permitidos.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
