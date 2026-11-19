import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  Layers,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/mock-data";
import {
  CircuitBundle,
  CircuitBundleInput,
  CircuitBundleItem,
  CircuitPricingType,
  CIRCUIT_PRICING_TYPES,
} from "@/types/circuitos-bundles.types";
import {
  listCircuitBundles,
  upsertCircuitBundle,
  deleteCircuitBundle,
} from "@/lib/circuitos-bundles.functions";
import { listParceiros, type Parceiro } from "@/lib/parceiros.functions";
import { listMediaCatalog } from "@/lib/representacao-comercial.functions";
import { MediaServiceCatalogItem } from "@/types/representacao-comercial.types";

interface CircuitosBundlesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CircuitosBundlesManager({ open, onOpenChange }: CircuitosBundlesManagerProps) {
  const qc = useQueryClient();

  const listBundlesFn = useServerFn(listCircuitBundles);
  const upsertBundleFn = useServerFn(upsertCircuitBundle);
  const deleteBundleFn = useServerFn(deleteCircuitBundle);
  const listParceirosFn = useServerFn(listParceiros);
  const listCatalogFn = useServerFn(listMediaCatalog);

  // Queries
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["circuit_bundles_manager"],
    queryFn: () => listBundlesFn({ data: { only_active: false } }),
    enabled: open,
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros_manager_select"],
    queryFn: () => listParceirosFn(),
    enabled: open,
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["media_catalog_manager_select"],
    queryFn: () => listCatalogFn({ data: {} }),
    enabled: open,
  });

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Partial<CircuitBundleInput> | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("DOOH");
  const [partnerId, setPartnerId] = useState<string>("TODOS");
  const [pricingType, setPricingType] = useState<CircuitPricingType>("discount_percentage");
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [fixedPrice, setFixedPrice] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<Omit<CircuitBundleItem, "id" | "bundle_id" | "created_at">[]>([]);
  const [allowedPartnerIds, setAllowedPartnerIds] = useState<string[]>([]);

  const handleOpenNew = () => {
    setEditingBundle(null);
    setName("");
    setCode(`CIR-${Math.floor(100 + Math.random() * 900)}`);
    setDescription("");
    setMediaType("DOOH");
    setPartnerId("TODOS");
    setPricingType("discount_percentage");
    setDiscountValue(15);
    setFixedPrice(0);
    setIsActive(true);
    setItems([]);
    setAllowedPartnerIds([]);
    setEditorOpen(true);
  };

  const handleOpenEdit = (bundle: CircuitBundle) => {
    setEditingBundle(bundle);
    setName(bundle.name);
    setCode(bundle.code);
    setDescription(bundle.description || "");
    setMediaType(bundle.media_type || "DOOH");
    setPartnerId(bundle.partner_id || "TODOS");
    setPricingType(bundle.pricing_type);
    setDiscountValue(Number(bundle.discount_value) || 0);
    setFixedPrice(Number(bundle.fixed_price) || 0);
    setIsActive(bundle.is_active);
    setItems(
      (bundle.items || []).map((it) => ({
        media_service_id: it.media_service_id,
        produto_id: it.produto_id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        is_mandatory: it.is_mandatory,
        order_index: it.order_index,
      }))
    );
    setAllowedPartnerIds(bundle.allowed_partner_ids || []);
    setEditorOpen(true);
  };

  // Add Item from Catalog
  const handleAddItemFromCatalog = (catId: string) => {
    const found = catalogItems.find((c) => c.id === catId);
    if (!found) return;

    setItems((prev) => [
      ...prev,
      {
        media_service_id: found.id,
        produto_id: null,
        product_name: found.nome_produto,
        quantity: 1,
        unit_price: Number(found.valor_tabela) || 0,
        is_mandatory: true,
        order_index: prev.length,
      },
    ]);
  };

  // Add Custom Item
  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        media_service_id: null,
        produto_id: null,
        product_name: "Ponto de Mídia do Circuito",
        quantity: 1,
        unit_price: 1000,
        is_mandatory: true,
        order_index: prev.length,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (
    idx: number,
    updates: Partial<Omit<CircuitBundleItem, "id" | "bundle_id" | "created_at">>
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...updates };
      return copy;
    });
  };

  // Mutation Save
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome do circuito.");
      if (!code.trim()) throw new Error("Informe o código identificador.");
      if (items.length < 2) throw new Error("Um circuito deve conter pelo menos 2 pontos/itens de mídia.");

      const payload: CircuitBundleInput = {
        id: (editingBundle as any)?.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        media_type: mediaType,
        partner_id: partnerId === "TODOS" ? null : partnerId,
        pricing_type: pricingType,
        discount_value: Number(discountValue) || 0,
        fixed_price: pricingType === "fixed_price" ? Number(fixedPrice) || null : null,
        is_active: isActive,
        items,
        allowed_partner_ids: allowedPartnerIds,
      };

      return upsertBundleFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Circuito salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["circuit_bundles_manager"] });
      qc.invalidateQueries({ queryKey: ["circuit_bundles"] });
      setEditorOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao salvar circuito.");
    },
  });

  // Mutation Delete
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBundleFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Circuito excluído!");
      qc.invalidateQueries({ queryKey: ["circuit_bundles_manager"] });
      qc.invalidateQueries({ queryKey: ["circuit_bundles"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir circuito.");
    },
  });

  // Totais do editor
  const editorSum = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    0
  );

  let editorFinalPrice = editorSum;
  let editorSavings = 0;
  if (pricingType === "fixed_price") {
    editorFinalPrice = Number(fixedPrice) || editorSum;
    editorSavings = Math.max(0, editorSum - editorFinalPrice);
  } else if (pricingType === "discount_percentage") {
    const pct = Math.min(100, Math.max(0, Number(discountValue) || 0));
    editorSavings = Math.round(((editorSum * pct) / 100) * 100) / 100;
    editorFinalPrice = editorSum - editorSavings;
  } else if (pricingType === "discount_nominal") {
    editorSavings = Math.min(editorSum, Number(discountValue) || 0);
    editorFinalPrice = editorSum - editorSavings;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="size-5 text-blue-600" />
                  Gestão de Circuitos e Bundles de Mídia
                </DialogTitle>
                <DialogDescription>
                  Configure pacotes fechados de inventário com descontos exclusivos para parceiros autorizados.
                </DialogDescription>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                onClick={handleOpenNew}
              >
                <Plus className="size-4" /> Novo Circuito
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-5 animate-spin" /> Carregando circuitos...
            </div>
          ) : bundles.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Layers className="size-10 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Nenhum circuito cadastrado ainda</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Crie circuitos combinando pontos de mídia estratégicos com descontos comerciais para parceiros selecionados.
              </p>
              <Button type="button" size="sm" onClick={handleOpenNew} className="bg-blue-600 text-white">
                <Plus className="size-4 mr-1" /> Criar Primeiro Circuito
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código / Nome</TableHead>
                    <TableHead>Veículo / Parceiro</TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Regra de Preço</TableHead>
                    <TableHead className="text-center">Pontos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundles.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-bold text-xs">{b.name}</div>
                        <span className="font-mono text-[10px] text-muted-foreground">{b.code}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.partner ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">
                              {b.partner.nome_fantasia || b.partner.razao_social}
                            </span>
                            {b.partner.allows_circuit_bundles && (
                              <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-300">
                                Elegível
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Global (Todos os Elegíveis)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {b.media_type || "DOOH"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.pricing_type === "discount_percentage" && (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            {b.discount_value}% OFF
                          </Badge>
                        )}
                        {b.pricing_type === "fixed_price" && (
                          <span className="font-bold text-blue-600">
                            {formatBRL(b.fixed_price || 0)} fixo
                          </span>
                        )}
                        {b.pricing_type === "discount_nominal" && (
                          <span className="font-bold text-emerald-600">
                            -{formatBRL(b.discount_value)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">
                        {b.items?.length || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={b.is_active ? "default" : "secondary"}
                          className={b.is_active ? "bg-emerald-500/10 text-emerald-700 border-emerald-300" : ""}
                        >
                          {b.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleOpenEdit(b)}
                        >
                          <Pencil className="size-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir o circuito "${b.name}"?`)) {
                              deleteMut.mutate(b.id);
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" />
              {editingBundle ? "Editar Circuito" : "Novo Circuito de Mídia"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Nome do Circuito *</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Circuito EPTG Prime 10 Pontos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Código Identificador *</Label>
                <Input
                  className="mt-1 text-xs font-mono uppercase"
                  placeholder="CIR-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="sm:col-span-3">
                <Label className="text-xs">Descrição Comercial / Localização</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Abrangência completa do eixo Taguatinga - Plano Piloto em painéis de alta resolução"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Tipo de Mídia Principal</Label>
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOOH">DOOH (Digital Out Of Home)</SelectItem>
                    <SelectItem value="OOH">OOH (Mídia Exterior Estática)</SelectItem>
                    <SelectItem value="RADIO">Rádio / Áudio</SelectItem>
                    <SelectItem value="DIGITAL">Digital / Portais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Veículo Fornecedor</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Global / Multiparceiro</SelectItem>
                    {parceiros.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_fantasia || p.razao_social}
                        {p.allows_circuit_bundles ? " (Elegível)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between sm:pt-5">
                <div>
                  <Label className="text-xs font-semibold block">Circuito Ativo</Label>
                  <span className="text-[10px] text-muted-foreground">Disponível para venda</span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            {/* Regra de Precificação e Desconto */}
            <div className="rounded-xl border p-3.5 bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/30 space-y-3">
              <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-blue-600" />
                Regra de Precificação do Circuito Fechado
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Modalidade do Preço</Label>
                  <Select
                    value={pricingType}
                    onValueChange={(v) => setPricingType(v as CircuitPricingType)}
                  >
                    <SelectTrigger className="mt-1 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CIRCUIT_PRICING_TYPES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  {pricingType === "discount_percentage" && (
                    <>
                      <Label className="text-xs">Desconto sobre a soma unitária (%)</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          className="font-mono text-xs pr-7 bg-background"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-semibold text-muted-foreground">
                          %
                        </span>
                      </div>
                    </>
                  )}

                  {pricingType === "fixed_price" && (
                    <>
                      <Label className="text-xs">Valor Fixo Promocional Fechado (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        className="mt-1 font-mono text-xs bg-background"
                        value={fixedPrice}
                        onChange={(e) => setFixedPrice(Number(e.target.value) || 0)}
                      />
                    </>
                  )}

                  {pricingType === "discount_nominal" && (
                    <>
                      <Label className="text-xs">Desconto Nominal em Reais (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        className="mt-1 font-mono text-xs bg-background"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Preview Financeiro */}
              <div className="p-2.5 rounded bg-background/80 border flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Soma Unitária dos Itens</span>
                  <span className="font-bold text-xs line-through text-muted-foreground">
                    {formatBRL(editorSum)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-emerald-600 block">
                    Preço Final Promocional (Economia de {formatBRL(editorSavings)})
                  </span>
                  <span className="font-extrabold text-sm text-blue-600">
                    {formatBRL(editorFinalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Composição de Itens */}
            <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Composição dos Pontos do Pacote ({items.length})
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Se qualquer item marcado como obrigatório for removido no checkout, o desconto é desarmado.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleAddCustomItem}
                  >
                    <Plus className="size-3" /> Ponto Avulso
                  </Button>
                </div>
              </div>

              {/* Seletor rápido de catálogo */}
              <div className="flex items-center gap-2">
                <Select onValueChange={handleAddItemFromCatalog}>
                  <SelectTrigger className="text-xs bg-background h-8">
                    <SelectValue placeholder="+ Adicionar item do catálogo de mídia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogItems.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome_produto} — {c.cidade || "DF"} ({formatBRL(Number(c.valor_tabela) || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela de itens do circuito */}
              {items.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-background border flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <Input
                          className="h-7 text-xs font-medium"
                          value={it.product_name}
                          onChange={(e) => handleUpdateItem(idx, { product_name: e.target.value })}
                        />
                      </div>

                      <div className="w-16 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          className="h-7 text-xs font-mono text-center"
                          value={it.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, { quantity: Number(e.target.value) || 1 })
                          }
                          title="Quantidade"
                        />
                      </div>

                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          className="h-7 text-xs font-mono"
                          value={it.unit_price}
                          onChange={(e) =>
                            handleUpdateItem(idx, { unit_price: Number(e.target.value) || 0 })
                          }
                          title="Preço unitário de tabela"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Label className="text-[10px] text-muted-foreground">Obrigatório</Label>
                        <Switch
                          checked={it.is_mandatory}
                          onCheckedChange={(checked) =>
                            handleUpdateItem(idx, { is_mandatory: checked })
                          }
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? "Salvando..." : "Salvar Circuito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
