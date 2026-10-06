// Component: NovoPiModal.tsx
// Formulário para criação e edição de Pedido de Inserção (PI) com Liquidação Bimodal e Itens de Mídia

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BillingType,
  BILLING_TYPE_METADATA,
  calculatePiSplits,
} from "@/types/insertion-orders.types";
import { saveInsertionOrder } from "@/lib/insertion-orders.functions";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listParceiros } from "@/lib/parceiros.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (piId: string) => void;
}

interface FormItem {
  id?: string;
  vehicle_id: string;
  format_description: string;
  insertions_count: number;
  unit_price: number;
  total_price: number;
  period_start: string;
  period_end: string;
}

function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

export function NovoPiModal({ open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient();

  const saveFn = useServerFn(saveInsertionOrder);
  const listClientesFn = useServerFn(listClientes);
  const listAgenciasFn = useServerFn(listAgencias);
  const listParceirosFn = useServerFn(listParceiros);

  const [loading, setLoading] = useState<boolean>(false);

  // Consultas de apoio
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select-list"],
    queryFn: () => listClientesFn(),
    enabled: open,
  });

  const { data: agencias = [] } = useQuery({
    queryKey: ["agencias-select-list"],
    queryFn: () => listAgenciasFn(),
    enabled: open,
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros-select-list"],
    queryFn: () => listParceirosFn(),
    enabled: open,
  });

  // Estados do formulário
  const [clientId, setClientId] = useState<string>("");
  const [agencyId, setAgencyId] = useState<string>("");
  const [billingType, setBillingType] = useState<BillingType>("REPRESENTATIVE_BILLING");
  const [campaignTitle, setCampaignTitle] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(new Date().toISOString().split("T")[0]);
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [commissionRate, setCommissionRate] = useState<number>(20);
  const [notes, setNotes] = useState<string>("");

  const [items, setItems] = useState<FormItem[]>([
    {
      vehicle_id: "",
      format_description: "Inserção Comercial 30s",
      insertions_count: 10,
      unit_price: 350,
      total_price: 3500,
      period_start: new Date().toISOString().split("T")[0],
      period_end: "",
    },
  ]);

  // Cálculos em tempo real de split e valores
  const totals = useMemo(() => {
    const gross = items.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0);
    return calculatePiSplits(gross, commissionRate, items);
  }, [items, commissionRate]);

  // Adicionar linha de mídia
  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        vehicle_id: "",
        format_description: "Inserção Comercial 30s",
        insertions_count: 5,
        unit_price: 300,
        total_price: 1500,
        period_start: periodStart,
        period_end: periodEnd,
      },
    ]);
  }, [periodStart, periodEnd]);

  // Remover linha de mídia
  const handleRemoveItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Alterar campo de linha de mídia
  const handleItemChange = useCallback((idx: number, field: keyof FormItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: val };

      if (field === "unit_price" || field === "insertions_count") {
        const u = field === "unit_price" ? Number(val) || 0 : item.unit_price;
        const c = field === "insertions_count" ? Number(val) || 0 : item.insertions_count;
        item.total_price = Math.round(u * c * 100) / 100;
      }

      next[idx] = item;
      return next;
    });
  }, []);

  // Salvar PI
  const handleSave = useCallback(async () => {
    if (!clientId) {
      toast.error("Selecione o Cliente / Anunciante do PI.");
      return;
    }

    if (!campaignTitle.trim()) {
      toast.error("Informe o título da Campanha.");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione ao menos uma linha de mídia / veículo.");
      return;
    }

    try {
      setLoading(true);
      const res = await saveFn({
        data: {
          client_id: clientId,
          agency_id: agencyId || null,
          billing_type: billingType,
          campaign_title: campaignTitle.trim(),
          period_start: periodStart || null,
          period_end: periodEnd || null,
          representative_commission_rate: commissionRate,
          notes: notes || null,
          items: items.map((it) => ({
            vehicle_id: it.vehicle_id || null,
            format_description: it.format_description,
            insertions_count: it.insertions_count,
            unit_price: it.unit_price,
            total_price: it.total_price,
            period_start: it.period_start || periodStart || null,
            period_end: it.period_end || periodEnd || null,
          })),
        },
      });

      toast.success(`Pedido de Inserção ${res.pi_number} criado com sucesso!`);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.id!);
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(`Erro ao criar PI: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    clientId,
    agencyId,
    billingType,
    campaignTitle,
    periodStart,
    periodEnd,
    commissionRate,
    notes,
    items,
    saveFn,
    onOpenChange,
    onSuccess,
    qc,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Novo Pedido de Inserção (PI 360°)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ordem formal de compra de mídia com trava de checking e liquidação financeira bimodal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* SELETOR DE MODALIDADE DE FATURAMENTO */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Modalidade de Faturamento & Liquidação *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setBillingType("REPRESENTATIVE_BILLING")}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  billingType === "REPRESENTATIVE_BILLING"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-foreground">
                    Modalidade 1: Via Representante
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Conta Própria
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Representante fatura o Cliente integralmente, retém a comissão acordada e faz o repasse/split líquido aos veículos.
                </p>
              </div>

              <div
                onClick={() => setBillingType("DIRECT_VEHICLE_BILLING")}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  billingType === "DIRECT_VEHICLE_BILLING"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-foreground">
                    Modalidade 2: Faturamento Direto
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Representação Pura
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Veículo fatura o anunciante diretamente após aprovação do checking. Após o pagamento, o veículo repassa a comissão devida ao representante.
                </p>
              </div>
            </div>
          </div>

          {/* DADOS BÁSICOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente / Anunciante *</Label>
              <select
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Selecione o anunciante...</option>
                {clientes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia || c.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Agência de Publicidade (Opcional)</Label>
              <select
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
              >
                <option value="">Sem agência intermediária (Direto)</option>
                {agencias.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nome_fantasia || a.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Campanha *</Label>
              <Input
                placeholder="Ex: Campanha Black Friday 2026"
                className="h-9 text-xs"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Início da Veiculação</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fim da Veiculação</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Comissão Representante (%) *</span>
                <span className="text-emerald-600 font-bold">{commissionRate}%</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="h-9 text-xs font-bold"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* LINHAS DE MÍDIA / ITENS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Linhas de Mídia & Veículos Parceiros ({items.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Cada veículo parceiro será auditado individualmente no módulo de checking.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="h-8 text-xs gap-1.5">
                <Plus className="size-3.5" /> Adicionar Veículo / Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 rounded-xl border bg-card space-y-2 text-xs shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* VEÍCULO */}
                    <div className="sm:col-span-4">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Veículo Executor</Label>
                      <select
                        className="w-full text-xs h-8 rounded border border-input bg-background px-2 shadow-sm"
                        value={it.vehicle_id}
                        onChange={(e) => handleItemChange(idx, "vehicle_id", e.target.value)}
                      >
                        <option value="">Selecione o veículo...</option>
                        {parceiros.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.nome_fantasia || p.razao_social} ({p.tipo_veiculo || "Mídia"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* FORMATO */}
                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Formato / Descrição</Label>
                      <Input
                        className="h-8 text-xs"
                        value={it.format_description}
                        onChange={(e) => handleItemChange(idx, "format_description", e.target.value)}
                      />
                    </div>

                    {/* INSERÇÕES */}
                    <div className="sm:col-span-1">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Ins.</Label>
                      <Input
                        type="number"
                        min="1"
                        className="h-8 text-xs"
                        value={it.insertions_count}
                        onChange={(e) => handleItemChange(idx, "insertions_count", Number(e.target.value))}
                      />
                    </div>

                    {/* VALOR UNIT */}
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Valor Unit. (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-xs"
                        value={it.unit_price}
                        onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value))}
                      />
                    </div>

                    {/* TOTAL */}
                    <div className="sm:col-span-1 text-right">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Total</Label>
                      <span className="font-bold text-xs text-foreground block pt-1">
                        {formatBRL(it.total_price)}
                      </span>
                    </div>

                    {/* REMOVER */}
                    <div className="sm:col-span-1 text-right pt-2.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="size-7 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL DE SPLIT E FECHAMENTO FINANCEIRO */}
          <Card className="border border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                  Valor Bruto do PI
                </span>
                <span className="text-xl font-bold text-foreground mt-0.5 block">
                  {formatBRL(totals.grossAmount)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                  Comissão Representante ({totals.commissionRate}%)
                </span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatBRL(totals.commissionAmount)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                  Líquido Consolidado Veículos
                </span>
                <span className="text-xl font-bold text-primary mt-0.5 block">
                  {formatBRL(totals.netVehicleAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observações / Instruções Operacionais</Label>
            <Textarea
              placeholder="Instruções de checking, prazos de envio de comprovantes ou condições específicas..."
              rows={2}
              className="text-xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Criar Pedido de Inserção (PI)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
