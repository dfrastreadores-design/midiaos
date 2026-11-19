import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  ArrowRight,
  Building2,
  DollarSign,
  Receipt,
  Handshake,
  CheckCircle2,
  Percent,
} from "lucide-react";
import { calculateSplitFinancials, fmtBRL } from "@/lib/representacao-contratos";
import { ModeloFaturamentoRepresentacao } from "@/types/representacao-contratos.types";

interface SimuladorLiquidacaoWidgetProps {
  initialValorBruto?: number;
  initialModelo?: ModeloFaturamentoRepresentacao;
  initialAliquotaImposto?: number;
  initialPercentualComissao?: number;
  onApplySplit?: (split: ReturnType<typeof calculateSplitFinancials>) => void;
  compact?: boolean;
}

export function SimuladorLiquidacaoWidget({
  initialValorBruto = 10000,
  initialModelo = "centralizado_nexo",
  initialAliquotaImposto = 6.0,
  initialPercentualComissao = 35.0,
  onApplySplit,
  compact = false,
}: SimuladorLiquidacaoWidgetProps) {
  const [valorBruto, setValorBruto] = useState<number>(initialValorBruto);
  const [modelo, setModelo] = useState<ModeloFaturamentoRepresentacao>(initialModelo);
  const [aliquotaImposto, setAliquotaImposto] = useState<number>(initialAliquotaImposto);
  const [percentualComissao, setPercentualComissao] = useState<number>(initialPercentualComissao);

  const split = useMemo(() => {
    return calculateSplitFinancials(valorBruto, percentualComissao, aliquotaImposto, modelo);
  }, [valorBruto, percentualComissao, aliquotaImposto, modelo]);

  // Cálculos percentuais para barra visual
  const pctImpostoBar = (split.valorImpostoRetido / Math.max(1, split.valorBruto)) * 100;
  const pctComissaoBar = (split.valorComissaoNexo / Math.max(1, split.valorBruto)) * 100;
  const pctRepasseBar = (split.valorLiquidoRepasseParceiro / Math.max(1, split.valorBruto)) * 100;

  return (
    <Card className="border border-border/70 shadow-sm bg-card overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calculator className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Simulador de Liquidação Financeira & Splits
              </CardTitle>
              <CardDescription className="text-xs">
                Cálculo em tempo real de retenção tributária, comissão da Nexo e repasse ao parceiro
              </CardDescription>
            </div>
          </div>

          <Badge
            variant="outline"
            className={
              modelo === "centralizado_nexo"
                ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 font-semibold"
            }
          >
            {modelo === "centralizado_nexo" ? "Nota Única Nexo" : "Direto pelo Parceiro"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Parâmetros de Entrada */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-semibold">Valor Bruto da Venda (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                step="100"
                value={valorBruto || ""}
                onChange={(e) => setValorBruto(Number(e.target.value) || 0)}
                className="pl-8 text-sm font-bold"
                placeholder="Ex: 10000"
              />
            </div>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-semibold">Modelo de Faturamento</Label>
            <div className="grid grid-cols-2 gap-1 bg-muted/40 p-1 rounded-lg border">
              <Button
                type="button"
                variant={modelo === "centralizado_nexo" ? "default" : "ghost"}
                size="sm"
                onClick={() => setModelo("centralizado_nexo")}
                className="h-7 text-[11px] px-1 font-semibold"
              >
                Centralizado Nexo
              </Button>
              <Button
                type="button"
                variant={modelo === "direto_parceiro" ? "default" : "ghost"}
                size="sm"
                onClick={() => setModelo("direto_parceiro")}
                className="h-7 text-[11px] px-1 font-semibold"
              >
                Direto Parceiro
              </Button>
            </div>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-semibold">
              {modelo === "centralizado_nexo" ? "Imposto Retido NF Nexo (%)" : "Imposto Direto"}
            </Label>
            <div className="relative">
              <Percent className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                disabled={modelo === "direto_parceiro"}
                value={modelo === "centralizado_nexo" ? aliquotaImposto : 0}
                onChange={(e) => setAliquotaImposto(Number(e.target.value) || 0)}
                className="pl-8 text-sm"
                placeholder="Ex: 6.0"
              />
            </div>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-semibold">Comissão Nexo (%)</Label>
            <div className="relative">
              <Percent className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={percentualComissao}
                onChange={(e) => setPercentualComissao(Number(e.target.value) || 0)}
                className="pl-8 text-sm font-semibold text-primary"
                placeholder="Ex: 35.0"
              />
            </div>
          </div>
        </div>

        {/* Barra de Distribuição Visual do Faturamento */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Divisão Percentual do Faturamento</span>
            <span className="font-mono">{fmtBRL(split.valorBruto)}</span>
          </div>

          <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted/60 border">
            {split.modelo === "centralizado_nexo" && split.valorImpostoRetido > 0 && (
              <div
                style={{ width: `${pctImpostoBar}%` }}
                className="bg-amber-500 hover:opacity-90 transition-all flex items-center justify-center text-[9px] font-bold text-white truncate px-1"
                title={`Imposto NF: ${fmtBRL(split.valorImpostoRetido)} (${split.aliquotaImposto}%)`}
              >
                NF {split.aliquotaImposto}%
              </div>
            )}
            <div
              style={{ width: `${pctComissaoBar}%` }}
              className="bg-primary hover:opacity-90 transition-all flex items-center justify-center text-[9px] font-bold text-white truncate px-1"
              title={`Comissão Nexo: ${fmtBRL(split.valorComissaoNexo)} (${split.percentualComissao}%)`}
            >
              Nexo {split.percentualComissao}%
            </div>
            <div
              style={{ width: `${pctRepasseBar}%` }}
              className="bg-emerald-600 hover:opacity-90 transition-all flex items-center justify-center text-[9px] font-bold text-white truncate px-1"
              title={`Parceiro/Veículo: ${fmtBRL(split.valorLiquidoRepasseParceiro)}`}
            >
              Parceiro {pctRepasseBar.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Cards de Apresentação dos Splits */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          {/* Valor Bruto */}
          <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Receipt className="size-3 text-muted-foreground" />
              1. Faturamento Bruto
            </span>
            <div className="text-lg font-bold text-foreground">{fmtBRL(split.valorBruto)}</div>
            <span className="text-[10px] text-muted-foreground block truncate">
              {modelo === "centralizado_nexo" ? "Valor total pago à Nexo" : "Valor total pago ao parceiro"}
            </span>
          </div>

          {/* Imposto Retido */}
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 uppercase font-bold flex items-center gap-1">
              <Building2 className="size-3 text-amber-600" />
              2. Imposto Retido NF ({split.aliquotaImposto}%)
            </span>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {split.valorImpostoRetido > 0 ? `-${fmtBRL(split.valorImpostoRetido)}` : "R$ 0,00"}
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block truncate">
              {modelo === "centralizado_nexo"
                ? "Dedução fiscal direta da NF Nexo"
                : "Imposto sob responsabilidade do parceiro"}
            </span>
          </div>

          {/* Comissão Nexo */}
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <span className="text-[11px] text-primary uppercase font-bold flex items-center gap-1">
              <Handshake className="size-3 text-primary" />
              3. Comissão Nexo ({split.percentualComissao}%)
            </span>
            <div className="text-lg font-extrabold text-primary">
              {fmtBRL(split.valorComissaoNexo)}
            </div>
            <span className="text-[10px] text-muted-foreground block truncate">
              {modelo === "centralizado_nexo"
                ? "Retido diretamente na liquidação"
                : "Faturado via NFS-e de intermediação"}
            </span>
          </div>

          {/* Repasse Líquido ao Parceiro */}
          <div className="p-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 uppercase font-black flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-600" />
                4. Repasse Líquido Parceiro
              </span>
              <Badge className="bg-emerald-600 text-white text-[9px] py-0">Líquido</Badge>
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {fmtBRL(split.valorLiquidoRepasseParceiro)}
            </div>
            <span className="text-[10px] text-emerald-800/80 dark:text-emerald-400 font-medium block truncate">
              {modelo === "centralizado_nexo"
                ? "Transferência PIX em até 3 dias úteis"
                : "Valor integral recebido pelo veículo"}
            </span>
          </div>
        </div>

        {onApplySplit && (
          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => onApplySplit(split)}
              className="gap-1.5 text-xs font-semibold"
            >
              <CheckCircle2 className="size-3.5" />
              Aplicar Valores ao Pedido
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
