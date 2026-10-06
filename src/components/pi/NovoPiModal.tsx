// Component: NovoPiModal.tsx
// Formulário para criação e edição de Pedido de Inserção (PI) com Custos de Produção (EMBEDDED e ITEMIZED)

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BillingType,
  BILLING_TYPE_METADATA,
  calculatePiSplitsWithProduction,
  PiItemType,
  PiDisplayMode,
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
import { useFormDraft } from "@/hooks/use-form-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  Clapperboard,
  Tv,
  Eye,
  EyeOff,
  Link as LinkIcon,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (piId: string) => void;
}

interface FormItem {
  id: string;
  vehicle_id: string;
  format_description: string;
  insertions_count: number;
  unit_price: number;
  total_price: number;
  period_start: string;
  period_end: string;
  item_type: PiItemType;
  display_mode: PiDisplayMode;
  parent_media_item_id: string | null;
  is_commissionable: boolean;
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

  const defaultItems: FormItem[] = [
    {
      id: "media-1",
      vehicle_id: "",
      format_description: "Inserção Comercial 30s",
      insertions_count: 10,
      unit_price: 350,
      total_price: 3500,
      period_start: new Date().toISOString().split("T")[0],
      period_end: "",
      item_type: "MEDIA",
      display_mode: "ITEMIZED",
      parent_media_item_id: null,
      is_commissionable: true,
    },
  ];

  const [items, setItems] = useState<FormItem[]>(defaultItems);

  // Hook de Persistência Segura contra Perda Acidental de Dados
  interface NovoPiDraftData {
    clientId: string;
    agencyId: string;
    billingType: BillingType;
    campaignTitle: string;
    periodStart: string;
    periodEnd: string;
    commissionRate: number;
    notes: string;
    items: FormItem[];
  }

  const { loadDraft, saveDraft, clearDraft } = useFormDraft<NovoPiDraftData>({
    draftKey: "novo_pi_modal_state",
    initialData: {
      clientId: "",
      agencyId: "",
      billingType: "REPRESENTATIVE_BILLING",
      campaignTitle: "",
      periodStart: new Date().toISOString().split("T")[0],
      periodEnd: "",
      commissionRate: 20,
      notes: "",
      items: defaultItems,
    },
  });

  const [draftRestored, setDraftRestored] = useState<boolean>(false);
  const draftInitializedRef = useRef<boolean>(false);

  // Restaura automaticamente os dados já digitados pelo usuário se a janela foi fechada ou recarregada
  useEffect(() => {
    if (!open) return;
    if (draftInitializedRef.current) return;

    const draft = loadDraft();
    if (draft && (draft.campaignTitle || draft.clientId || (draft.items && draft.items.length > 0))) {
      if (draft.clientId) setClientId(draft.clientId);
      if (draft.agencyId) setAgencyId(draft.agencyId);
      if (draft.billingType) setBillingType(draft.billingType);
      if (draft.campaignTitle) setCampaignTitle(draft.campaignTitle);
      if (draft.periodStart) setPeriodStart(draft.periodStart);
      if (draft.periodEnd) setPeriodEnd(draft.periodEnd);
      if (draft.commissionRate !== undefined) setCommissionRate(draft.commissionRate);
      if (draft.notes) setNotes(draft.notes);
      if (draft.items && draft.items.length > 0) setItems(draft.items);
      setDraftRestored(true);
    }
    draftInitializedRef.current = true;
  }, [open, loadDraft]);

  // Persiste em tempo real no localStorage enquanto o usuário digita
  useEffect(() => {
    if (!open) return;
    if (campaignTitle || clientId || items.length > 0 || notes || agencyId) {
      saveDraft({
        clientId,
        agencyId,
        billingType,
        campaignTitle,
        periodStart,
        periodEnd,
        commissionRate,
        notes,
        items,
      });
    }
  }, [
    open,
    clientId,
    agencyId,
    billingType,
    campaignTitle,
    periodStart,
    periodEnd,
    commissionRate,
    notes,
    items,
    saveDraft,
  ]);

  // Limpar / Descartar rascunho
  const handleDiscardDraft = useCallback(() => {
    if (window.confirm("Deseja descartar as informações digitadas e reiniciar o formulário?")) {
      clearDraft();
      setClientId("");
      setAgencyId("");
      setBillingType("REPRESENTATIVE_BILLING");
      setCampaignTitle("");
      setPeriodStart(new Date().toISOString().split("T")[0]);
      setPeriodEnd("");
      setCommissionRate(20);
      setNotes("");
      setItems(defaultItems);
      setDraftRestored(false);
      toast.info("Rascunho descartado.");
    }
  }, [clearDraft]);

  // Lista de itens de mídia elegíveis para serem pais de produções embutidas
  const mediaItems = useMemo(
    () => items.filter((it) => it.item_type === "MEDIA"),
    [items],
  );

  // Cálculos em tempo real com suporte a comissão sobre produção
  const splitTotals = useMemo(() => {
    return calculatePiSplitsWithProduction(items, commissionRate);
  }, [items, commissionRate]);

  // Adicionar linha de mídia
  const handleAddMediaItem = useCallback(() => {
    const newId = `media-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        vehicle_id: "",
        format_description: "Inserção Comercial 30s",
        insertions_count: 5,
        unit_price: 300,
        total_price: 1500,
        period_start: periodStart,
        period_end: periodEnd,
        item_type: "MEDIA",
        display_mode: "ITEMIZED",
        parent_media_item_id: null,
        is_commissionable: true,
      },
    ]);
  }, [periodStart, periodEnd]);

  // Adicionar custo de produção
  const handleAddProductionItem = useCallback(() => {
    const newId = `prod-${Date.now()}`;
    const firstMediaId = mediaItems[0]?.id || null;

    setItems((prev) => [
      ...prev,
      {
        id: newId,
        vehicle_id: "",
        format_description: "Gravação e Produção de Spot 30s",
        insertions_count: 1,
        unit_price: 600,
        total_price: 600,
        period_start: periodStart,
        period_end: periodEnd,
        item_type: "PRODUCTION",
        display_mode: "EMBEDDED", // Padrão recomendado: Embutido / Oculto
        parent_media_item_id: firstMediaId,
        is_commissionable: false, // Padrão: produção repassada 100% sem comissão
      },
    ]);
  }, [mediaItems, periodStart, periodEnd]);

  // Remover linha
  const handleRemoveItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Alterar campo de linha
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
            id: it.id,
            vehicle_id: it.vehicle_id || null,
            format_description: it.format_description,
            insertions_count: it.insertions_count,
            unit_price: it.unit_price,
            total_price: it.total_price,
            period_start: it.period_start || periodStart || null,
            period_end: it.period_end || periodEnd || null,
            item_type: it.item_type,
            display_mode: it.display_mode,
            parent_media_item_id: it.parent_media_item_id || null,
            is_commissionable: it.is_commissionable,
          })),
        },
      });

      toast.success(`Pedido de Inserção ${res.pi_number} criado com sucesso!`);
      clearDraft();
      setDraftRestored(false);
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
    clearDraft,
    onOpenChange,
    onSuccess,
    qc,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.stopPropagation();
        }}
      >
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Novo Pedido de Inserção (PI 360°)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ordem formal de compra de mídia com suporte a Custos de Produção (Embutido / Discriminado) e Liquidação Bimodal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* AVISO DE RASCUNHO RECUPERADO */}
          {draftRestored && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-950 dark:text-amber-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-amber-600 shrink-0" />
                <span>Rascunho recuperado automaticamente. Seus dados e linhas adicionadas estão salvos.</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDiscardDraft}
                className="h-7 text-xs border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
              >
                Descartar Rascunho
              </Button>
            </div>
          )}
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
                  Representante fatura o Cliente integralmente, retém a comissão acordada e faz o repasse/split líquido aos veículos e produtores.
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

          {/* LINHAS DE MÍDIA E CUSTOS DE PRODUÇÃO */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Itens do PI: Mídias & Custos de Produção ({items.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Adicione inserções de mídia e custos de produção (spots, vídeos, artes) no modo embutido ou transparente.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleAddMediaItem} className="h-8 text-xs gap-1.5">
                  <Tv className="size-3.5 text-primary" /> + Linha de Mídia
                </Button>
                <Button size="sm" variant="secondary" onClick={handleAddProductionItem} className="h-8 text-xs gap-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300">
                  <Clapperboard className="size-3.5" /> + Custo de Produção
                </Button>
              </div>
            </div>

            <div className="space-y-2.5">
              {items.map((it, idx) => {
                const isProduction = it.item_type === "PRODUCTION";
                const isEmbedded = it.display_mode === "EMBEDDED";

                // Calcular se há produções embutidas neste item de mídia
                const embeddedProdsForThisMedia = items.filter(
                  (p) => p.item_type === "PRODUCTION" && p.display_mode === "EMBEDDED" && p.parent_media_item_id === it.id,
                );
                const embeddedSum = embeddedProdsForThisMedia.reduce((s, p) => s + p.total_price, 0);

                return (
                  <div
                    key={it.id || idx}
                    className={`p-3.5 rounded-xl border space-y-2.5 text-xs shadow-sm transition-all ${
                      isProduction
                        ? "border-purple-200 bg-purple-500/[0.02]"
                        : "border-border bg-card"
                    }`}
                  >
                    {/* CABEÇALHO DO ITEM */}
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        {isProduction ? (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] gap-1">
                            <Clapperboard className="size-3" /> Custo de Produção
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Tv className="size-3 text-primary" /> Mídia Veiculada
                          </Badge>
                        )}

                        {isProduction && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isEmbedded
                                ? "bg-amber-50 text-amber-700 border-amber-300 font-medium"
                                : "bg-blue-50 text-blue-700 border-blue-300"
                            }`}
                          >
                            {isEmbedded ? (
                              <span className="flex items-center gap-1">
                                <EyeOff className="size-3" /> Embutido na Mídia (Oculto ao Cliente)
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Eye className="size-3" /> Discriminado no PI (Aberto)
                              </span>
                            )}
                          </Badge>
                        )}

                        {isProduction && (
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {it.is_commissionable ? "Comissionável" : "Sem comissão comercial (100% repasse)"}
                          </Badge>
                        )}
                      </div>

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

                    {/* CAMPOS PRINCIPAIS */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* VEÍCULO / PARCEIRO */}
                      <div className="sm:col-span-4">
                        <Label className="text-[10px] text-muted-foreground block mb-0.5">
                          {isProduction ? "Produtora / Veículo Executor" : "Veículo Executor"}
                        </Label>
                        <select
                          className="w-full text-xs h-8 rounded border border-input bg-background px-2 shadow-sm"
                          value={it.vehicle_id}
                          onChange={(e) => handleItemChange(idx, "vehicle_id", e.target.value)}
                        >
                          <option value="">Selecione o parceiro...</option>
                          {parceiros.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.nome_fantasia || p.razao_social} ({p.tipo_veiculo || "Parceiro"})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* FORMATO / DESCRIÇÃO */}
                      <div className="sm:col-span-3">
                        <Label className="text-[10px] text-muted-foreground block mb-0.5">
                          {isProduction ? "Descrição do Material" : "Formato / Descrição"}
                        </Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder={isProduction ? "Ex: Gravação de Spot 30s" : "Ex: Spot 30s Rotativo"}
                          value={it.format_description}
                          onChange={(e) => handleItemChange(idx, "format_description", e.target.value)}
                        />
                      </div>

                      {/* INSERÇÕES */}
                      <div className="sm:col-span-1">
                        <Label className="text-[10px] text-muted-foreground block mb-0.5">Qtd/Ins.</Label>
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
                      <div className="sm:col-span-2 text-right">
                        <Label className="text-[10px] text-muted-foreground block mb-0.5">Total</Label>
                        <span className="font-bold text-xs text-foreground block pt-1">
                          {formatBRL(it.total_price)}
                        </span>
                      </div>
                    </div>

                    {/* CONFIGURAÇÕES ESPECÍFICAS DE PRODUÇÃO */}
                    {isProduction && (
                      <div className="p-2.5 rounded-lg bg-muted/40 border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-1">
                        {/* MODO DE EXIBIÇÃO NO PI */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground block mb-1 font-semibold">
                            Exibição no PI / Espelho do Cliente
                          </Label>
                          <select
                            className="w-full text-xs h-7 rounded border border-input bg-background px-2"
                            value={it.display_mode}
                            onChange={(e) => handleItemChange(idx, "display_mode", e.target.value as PiDisplayMode)}
                          >
                            <option value="EMBEDDED">Embutir no valor da Mídia (Ocultar)</option>
                            <option value="ITEMIZED">Discriminar no PI (Aberto/Transparente)</option>
                          </select>
                        </div>

                        {/* VÍNCULO DE DILUIÇÃO */}
                        {isEmbedded && (
                          <div>
                            <Label className="text-[10px] text-muted-foreground block mb-1 font-semibold">
                              Diluir na Linha de Mídia:
                            </Label>
                            <select
                              className="w-full text-xs h-7 rounded border border-input bg-background px-2"
                              value={it.parent_media_item_id || ""}
                              onChange={(e) => handleItemChange(idx, "parent_media_item_id", e.target.value || null)}
                            >
                              <option value="">Selecione a linha de mídia...</option>
                              {mediaItems.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.format_description} ({formatBRL(m.total_price)})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* INCIDÊNCIA DE COMISSÃO */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground block mb-1 font-semibold">
                            Comissão Comercial sobre Produção
                          </Label>
                          <select
                            className="w-full text-xs h-7 rounded border border-input bg-background px-2"
                            value={it.is_commissionable ? "sim" : "nao"}
                            onChange={(e) => handleItemChange(idx, "is_commissionable", e.target.value === "sim")}
                          >
                            <option value="nao">Não comissionar (100% repasse produtor)</option>
                            <option value="sim">Sim, aplicar comissão padrão ({commissionRate}%)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* NOTA DE PRODUÇÃO EMBUTIDA NA LINHA DE MÍDIA */}
                    {!isProduction && embeddedSum > 0 && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] flex items-center justify-between">
                        <span>
                          <strong>Produção embutida nesta mídia:</strong> + {formatBRL(embeddedSum)}
                        </span>
                        <span className="font-bold">
                          Total visível ao cliente: {formatBRL(it.total_price + embeddedSum)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL DE SPLIT E FECHAMENTO FINANCEIRO COM DETALHES DE PRODUÇÃO */}
          <Card className="border border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                    Valor Bruto do PI
                  </span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {formatBRL(splitTotals.grossAmount)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                    Base Comissionável
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                    {formatBRL(splitTotals.commissionableGross)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                    Comissão Representante
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatBRL(splitTotals.commissionAmount)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                    Líquido Veículos & Produtores
                  </span>
                  <span className="text-xl font-bold text-primary mt-0.5 block">
                    {formatBRL(splitTotals.netVehicleAmount)}
                  </span>
                </div>
              </div>

              {splitTotals.nonCommissionableGross > 0 && (
                <div className="text-[11px] text-muted-foreground border-t pt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Aviso Contábil</Badge>
                  <span>
                    R$ {formatBRL(splitTotals.nonCommissionableGross)} referem-se a custos de produção não comissionáveis e serão repassados integralmente aos executores.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observações / Instruções Operacionais</Label>
            <Textarea
              placeholder="Instruções de produção, prazos de envio de material ou condições de checking..."
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
