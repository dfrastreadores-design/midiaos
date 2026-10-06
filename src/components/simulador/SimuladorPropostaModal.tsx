import { useState, useMemo, useEffect, useRef } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Calculator,
  Plus,
  Trash2,
  Sparkles,
  Handshake,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Save,
  FileSpreadsheet,
  Printer,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import {
  gerarPdfPropostaExecutivaCoBranding,
  type PropostaApresentacao,
} from "@/lib/proposta-presentation";
import {
  Proposal,
  ProposalSimulationItemInput,
  calculateItemFinancials,
  calculateProposalTotals,
} from "@/types/simulador-proposta.types";
import {
  saveProposal,
  getProposalById,
  convertProposalToPi,
} from "@/lib/simulador-propostas.functions";
import { listMediaCatalog } from "@/lib/representacao-comercial.functions";
import { listClientes } from "@/lib/clientes.functions";
import { MediaServiceCatalogItem, TIPOS_COBRANCA_LABELS } from "@/types/representacao-comercial.types";
import { cn } from "@/lib/utils";

interface SimuladorPropostaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId?: string | null;
  initialCatalogItem?: MediaServiceCatalogItem | null;
  onSuccess?: () => void;
}

export function SimuladorPropostaModal({
  open,
  onOpenChange,
  proposalId,
  initialCatalogItem,
  onSuccess,
}: SimuladorPropostaModalProps) {
  const qc = useQueryClient();

  // Server functions
  const saveProposalFn = useServerFn(saveProposal);
  const getProposalFn = useServerFn(getProposalById);
  const convertToPiFn = useServerFn(convertProposalToPi);
  const fetchCatalogFn = useServerFn(listMediaCatalog);
  const fetchClientesFn = useServerFn(listClientes);

  // Queries
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["media_services_catalog"],
    queryFn: () => fetchCatalogFn({ data: {} }),
    enabled: open,
  });

  const { data: clientesList = [] } = useQuery({
    queryKey: ["clientes_simulador"],
    queryFn: () => fetchClientesFn(),
    enabled: open,
  });

  // State
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientLogoUrl, setClientLogoUrl] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [items, setItems] = useState<ProposalSimulationItemInput[]>([]);

  // Item Picker Modal State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // Loading existing proposal
  useEffect(() => {
    if (proposalId && open) {
      getProposalFn({ data: { id: proposalId } })
        .then((prop) => {
          setClientName(prop.client_name || "");
          setClientId(prop.client_id || null);
          setClientLogoUrl(prop.client_logo_url || "");
          setCampaignTitle(prop.campaign_title || "");
          setNotes(prop.notes || "");
          setStatus(prop.status || "draft");
          if (prop.items && prop.items.length > 0) {
            setItems(
              prop.items.map((it) => ({
                id: it.id,
                media_service_id: it.media_service_id,
                partner_id: it.partner_id,
                product_name: it.product_name,
                is_own_product: it.is_own_product,
                quantity: it.quantity,
                billing_type: it.billing_type,
                unit_price: it.unit_price,
                discount_type: "fixed",
                discount_value: it.discount,
                agency_commission_percent: it.agency_commission_percent,
                min_negotiated_unit_price: it.min_negotiated_unit_price,
                notes: it.notes,
                partner: it.partner,
                media_service: it.media_service,
              })),
            );
          }
        })
        .catch((err) => toast.error(err.message));
    } else if (!proposalId && open) {
      setClientName("");
      setClientId(null);
      setClientLogoUrl("");
      setCampaignTitle("");
      setNotes("");
      setStatus("draft");

      // Se foi aberto com um item de catálogo específico
      if (initialCatalogItem) {
        addItemFromCatalog(initialCatalogItem);
      } else {
        setItems([]);
      }
    }
  }, [proposalId, open, initialCatalogItem]);

  // Upload de logomarca do anunciante
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `client-logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const path = `logos/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from("partner-logos")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (!upErr) {
        const { data: pubData } = supabase.storage.from("partner-logos").getPublicUrl(path);
        if (pubData?.publicUrl) {
          setClientLogoUrl(pubData.publicUrl);
          toast.success("Logomarca do anunciante enviada com sucesso!");
          return;
        }
      }

      // Fallback: codifica em base64 DataURL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setClientLogoUrl(base64);
        toast.success("Logomarca carregada com sucesso!");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Falha ao carregar logo: " + (err?.message || "erro"));
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Função para adicionar item do catálogo
  const addItemFromCatalog = (cat: MediaServiceCatalogItem) => {
    const isOwn = Boolean(cat.is_own_product);
    const commPercent = isOwn
      ? 100
      : cat.comissao_percentual_especifica ??
        cat.partner?.comissao_padrao_percentual ??
        20;

    const newItem: ProposalSimulationItemInput = {
      media_service_id: cat.id,
      partner_id: isOwn ? null : cat.partner_id,
      product_name: cat.nome_produto,
      is_own_product: isOwn,
      quantity: 1,
      billing_type: cat.tipo_cobranca,
      unit_price: Number(cat.valor_tabela) || 0,
      discount_type: "percent",
      discount_value: 0,
      agency_commission_percent: commPercent,
      min_negotiated_unit_price: cat.valor_negociado_minimo ? Number(cat.valor_negociado_minimo) : null,
      partner: cat.partner,
      media_service: {
        id: cat.id,
        categoria_midia: cat.categoria_midia,
        cidade: cat.cidade,
        estado: cat.estado,
        imagem_url: cat.imagem_url,
      },
    };

    setItems((prev) => [...prev, newItem]);
    setPickerOpen(false);
  };

  // Função para adicionar item livre / personalizado
  const addCustomItem = () => {
    const newItem: ProposalSimulationItemInput = {
      product_name: "Espaço Publicitário Personalizado",
      is_own_product: true,
      quantity: 1,
      billing_type: "insercao",
      unit_price: 1000,
      discount_type: "percent",
      discount_value: 0,
      agency_commission_percent: 100,
      min_negotiated_unit_price: null,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Atualização de campos de um item
  const updateItem = (index: number, updates: Partial<ProposalSimulationItemInput>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Remoção de item
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculo dos itens e totais em tempo real
  const computedItemsWithTotals = useMemo(() => {
    const calculated = items.map((it) => {
      const fin = calculateItemFinancials({
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_type: it.discount_type,
        discount_value: it.discount_value,
        is_own_product: it.is_own_product,
        agency_commission_percent: it.agency_commission_percent,
        min_negotiated_unit_price: it.min_negotiated_unit_price,
      });

      return {
        ...it,
        fin,
        gross_price: fin.grossPrice,
        discount: fin.discountVal,
        net_client_val: fin.netClientVal,
        agency_commission_val: fin.agencyCommissionVal,
        partner_payout_val: fin.partnerPayoutVal,
      };
    });

    const totals = calculateProposalTotals(calculated);
    return { calculated, totals };
  }, [items]);

  // Mutation: Salvar proposta
  const saveMutation = useMutation({
    mutationFn: (targetStatus?: string) =>
      saveProposalFn({
        data: {
          id: proposalId || undefined,
          client_name: clientName || "Cliente em Negociação",
          client_id: clientId,
          client_logo_url: clientLogoUrl || null,
          campaign_title: campaignTitle || "Campanha Multiveículos",
          status: targetStatus || status,
          notes,
          items,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta comercial salva com sucesso!");
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar proposta"),
  });

  // Mutation: Gerar PI / Converter
  const convertMutation = useMutation({
    mutationFn: async () => {
      // Primeiro garante o salvamento da proposta
      const saved = await saveProposalFn({
        data: {
          id: proposalId || undefined,
          client_name: clientName || "Cliente em Negociação",
          client_id: clientId,
          client_logo_url: clientLogoUrl || null,
          campaign_title: campaignTitle || "Campanha Multiveículos",
          status: "approved",
          notes,
          items,
        },
      });

      // Em seguida converte em PI
      return convertToPiFn({
        data: { proposal_id: saved.id },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["pis"] });
      toast.success(`Pedido de Inserção gerado com sucesso! (${res.pi_numero})`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao converter em PI"),
  });

  // Exportar PDF Executivo Co-Branding
  const handleExportExecutivePdf = async () => {
    if (!clientName.trim()) {
      toast.error("Informe o Nome / Razão Social do Anunciante antes de gerar o PDF.");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione ao menos um espaço publicitário para gerar a proposta executiva.");
      return;
    }

    setGeneratingPdf(true);
    try {
      const propApres: PropostaApresentacao = {
        id: proposalId || "temp",
        numero: proposalId?.slice(0, 8).toUpperCase() || "SIMULAÇÃO",
        titulo: campaignTitle || "Plano Comercial Estratégico Multiveículos",
        client_name: clientName,
        client_logo_url: clientLogoUrl || null,
        cliente: {
          id: clientId || undefined,
          nome_fantasia: clientName,
          razao_social: clientName,
          logo_url: clientLogoUrl || null,
        },
        valor_tabela: totals.totalGross,
        valor_negociado: totals.totalNetClient,
        valor_desconto: totals.totalDiscount,
        total_insercoes: items.reduce((acc, it) => acc + (it.quantity || 1), 0),
        itens: calculated.map((it) => ({
          tipo: it.media_service?.categoria_midia || (it.is_own_product ? "Produto Próprio" : "Veículo Parceiro"),
          programa: it.product_name,
          formato: TIPOS_COBRANCA_LABELS[it.billing_type] || it.billing_type,
          insercoes_dia: it.quantity,
          total_insercoes: it.quantity,
          valor_unit: it.unit_price,
          valor_tabela: it.gross_price,
          desconto: it.fin.discountPercent,
          valor_negociado: it.net_client_val,
          endereco_ponto: it.media_service?.cidade
            ? `${it.media_service?.cidade}/${it.media_service?.estado || ""}`
            : undefined,
        })),
        observacoes: notes,
      };

      await gerarPdfPropostaExecutivaCoBranding(propApres);
      toast.success("PDF Executivo Co-Branding gerado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar PDF Co-Branding:", err);
      toast.error("Erro ao gerar PDF: " + (err?.message || "falha na renderização"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Filtro de itens no modal de busca do catálogo
  const filteredCatalogForPicker = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return catalogItems;
    return catalogItems.filter(
      (it) =>
        it.nome_produto.toLowerCase().includes(q) ||
        it.partner?.nome_fantasia?.toLowerCase().includes(q) ||
        it.partner?.razao_social.toLowerCase().includes(q) ||
        it.cidade?.toLowerCase().includes(q),
    );
  }, [catalogItems, pickerSearch]);

  const { totals, calculated } = computedItemsWithTotals;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
          {/* Header */}
          <DialogHeader className="p-5 border-b bg-card/60 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    Simulador de Propostas & Rateio de Comissões
                    <Badge variant="outline" className="text-xs bg-primary/5 text-primary">
                      Multiveículos
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Monte pacotes publicitários integrados, simule descontos e calcule em tempo real
                    as comissões retidas e repasses a veículos parceiros.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar do Catálogo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomItem}
                  className="gap-1.5 text-xs h-9"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Item Avulso
                </Button>
              </div>
            </div>

            {/* Inputs Principais: Cliente e Campanha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div>
                <Label className="text-xs font-medium">Cliente / Anunciante *</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    placeholder="Ex: Banco de Brasília, Óticas Diniz..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  {clientesList.length > 0 && (
                    <Select
                      value={clientId || ""}
                      onValueChange={(val) => {
                        setClientId(val);
                        const c = (clientesList as any[]).find((x) => x.id === val);
                        if (c) {
                          setClientName(c.nome_fantasia || c.razao_social || c.nome);
                          if (c.logo_url) {
                            setClientLogoUrl(c.logo_url);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-24 text-[11px] shrink-0">
                        <SelectValue placeholder="Clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        {(clientesList as any[]).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_fantasia || c.razao_social || c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Título da Campanha</Label>
                <Input
                  placeholder="Ex: Campanha Institucional Q4 2026..."
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Status da Proposta</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="sent">Enviada ao Cliente</SelectItem>
                    <SelectItem value="approved">Aprovada</SelectItem>
                    <SelectItem value="rejected">Recusada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bloco de Co-Branding Executivo & Personalização Visual */}
            <div className="mt-3 p-3 rounded-xl border border-border/80 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Upload & URL da Logo (md:col-span-6) */}
                <div className="md:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />
                      Logomarca do Anunciante
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (Opcional - Co-branding no PDF)
                      </span>
                    </Label>
                    {clientLogoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setClientLogoUrl("")}
                        className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-3 h-3 mr-1" /> Remover Logo
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="h-8 text-xs gap-1.5 shrink-0 bg-background"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {uploadingLogo ? "Enviando..." : "Carregar Imagem"}
                    </Button>
                    <Input
                      placeholder="Ou cole o link direto da logomarca (https://...)"
                      value={clientLogoUrl}
                      onChange={(e) => setClientLogoUrl(e.target.value)}
                      className="h-8 text-xs bg-background flex-1"
                    />
                  </div>
                </div>

                {/* Card de Preview em Tempo Real do Co-Branding (md:col-span-6) */}
                <div className="md:col-span-6">
                  <div className="rounded-lg border border-primary/20 bg-card p-2.5 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold tracking-wider uppercase text-primary flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Preview do Co-Branding Executivo
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        PROPOSTA EXCLUSIVA DESENVOLVIDA PARA:
                      </div>
                      <div className="text-xs font-bold text-foreground truncate mt-0.5">
                        {clientName || "Nome do Cliente Anunciante"}
                      </div>
                    </div>

                    <div className="w-28 h-12 rounded border bg-muted/40 flex items-center justify-center p-1 overflow-hidden shrink-0">
                      {clientLogoUrl ? (
                        <img
                          src={clientLogoUrl}
                          alt="Logo Anunciante"
                          className="max-h-full max-w-full object-contain"
                          onError={() => {
                            toast.error("Não foi possível carregar a prévia da logo pela URL.");
                          }}
                        />
                      ) : (
                        <div className="text-center px-1">
                          <span className="text-[10px] font-bold text-muted-foreground line-clamp-1">
                            {clientName ? clientName.slice(0, 14) : "SEM LOGO"}
                          </span>
                          <span className="text-[8px] text-muted-foreground/70 block">
                            Tipografia Padrão
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Body: Tabela Interativa de Itens + Resumo Lateral */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tabela Interativa (Cols 1,2,3) */}
            <div className="lg:col-span-3 space-y-4">
              {items.length === 0 ? (
                <div className="border-dashed border-2 rounded-xl py-16 text-center flex flex-col items-center justify-center space-y-3 bg-muted/20">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Nenhum espaço publicitário adicionado à proposta
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Clique no botão abaixo para buscar no catálogo de veículos parceiros e produtos
                    próprios da representação.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Explorar Catálogo de Mídias
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCustomItem}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Criar Item Avulso
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="text-xs">
                          <TableHead className="min-w-[200px]">Espaço / Veículo</TableHead>
                          <TableHead className="w-[100px]">Qtd / Modelo</TableHead>
                          <TableHead className="w-[110px]">Valor Tabela</TableHead>
                          <TableHead className="w-[140px]">Desconto</TableHead>
                          <TableHead className="w-[120px] text-right">Faturado Anunciante</TableHead>
                          <TableHead className="w-[120px] text-right">Comissão Agência</TableHead>
                          <TableHead className="w-[120px] text-right">Repasse Veículo</TableHead>
                          <TableHead className="w-[45px] text-center"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculated.map((it, idx) => (
                          <TableRow key={idx} className="text-xs hover:bg-muted/30">
                            {/* Nome e Origem */}
                            <TableCell className="align-top py-3">
                              <div className="space-y-1">
                                <Input
                                  value={it.product_name}
                                  onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                                  className="h-7 text-xs font-medium"
                                  placeholder="Nome do Espaço"
                                />
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {it.is_own_product ? (
                                    <Badge className="bg-amber-600/90 text-white text-[9px] px-1.5 py-0 border-0 flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      Produto Próprio
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-purple-700/90 text-white text-[9px] px-1.5 py-0 border-0 flex items-center gap-1">
                                      <Handshake className="w-2.5 h-2.5" />
                                      {it.partner?.nome_fantasia ||
                                        it.partner?.razao_social ||
                                        "Veículo Parceiro"}
                                    </Badge>
                                  )}
                                  {it.fin.isBelowMinimum && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[9px] px-1.5 py-0 flex items-center gap-1 bg-rose-600 animate-pulse"
                                      title={`Valor mínimo acordado: ${formatBRL(it.min_negotiated_unit_price || 0)}`}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Abaixo do Mínimo!
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Qtd & Tipo de Cobrança */}
                            <TableCell className="align-top py-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="any"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    updateItem(idx, { quantity: Number(e.target.value) || 1 })
                                  }
                                  className="h-7 text-xs w-full"
                                />
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {TIPOS_COBRANCA_LABELS[it.billing_type] || it.billing_type}
                                </span>
                              </div>
                            </TableCell>

                            {/* Valor Unitário de Tabela */}
                            <TableCell className="align-top py-3">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={it.unit_price}
                                onChange={(e) =>
                                  updateItem(idx, { unit_price: Number(e.target.value) || 0 })
                                }
                                className="h-7 text-xs"
                              />
                              <span className="text-[10px] text-muted-foreground block mt-1">
                                Total: {formatBRL(it.gross_price)}
                              </span>
                            </TableCell>

                            {/* Desconto */}
                            <TableCell className="align-top py-3">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.discount_value}
                                  onChange={(e) =>
                                    updateItem(idx, {
                                      discount_value: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="h-7 text-xs flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-1.5 text-[10px] font-bold"
                                  onClick={() =>
                                    updateItem(idx, {
                                      discount_type: it.discount_type === "percent" ? "fixed" : "percent",
                                    })
                                  }
                                  title="Alternar entre % e R$"
                                >
                                  {it.discount_type === "percent" ? "%" : "R$"}
                                </Button>
                              </div>
                              <span className="text-[10px] text-muted-foreground block mt-1">
                                -{formatBRL(it.discount)} ({it.fin.discountPercent.toFixed(1)}%)
                              </span>
                            </TableCell>

                            {/* Faturado ao Anunciante */}
                            <TableCell className="align-top py-3 text-right">
                              <div className="font-bold text-foreground text-xs sm:text-sm">
                                {formatBRL(it.net_client_val)}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Unit: {formatBRL(it.fin.effectiveUnitPrice)}
                              </span>
                            </TableCell>

                            {/* Comissão da Agência */}
                            <TableCell className="align-top py-3 text-right">
                              <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">
                                {formatBRL(it.agency_commission_val)}
                              </div>
                              {it.is_own_product ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  100% In-House
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={it.agency_commission_percent}
                                    onChange={(e) =>
                                      updateItem(idx, {
                                        agency_commission_percent: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="w-10 h-5 text-[10px] text-right border rounded px-1 bg-background"
                                  />
                                  <span className="text-[10px] text-muted-foreground">%</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Repasse ao Veículo Parceiro */}
                            <TableCell className="align-top py-3 text-right">
                              <div className="font-semibold text-purple-700 dark:text-purple-300 text-xs sm:text-sm">
                                {formatBRL(it.partner_payout_val)}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {it.is_own_product ? "Sem repasse" : "Líquido parceiro"}
                              </span>
                            </TableCell>

                            {/* Excluir */}
                            <TableCell className="align-top py-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(idx)}
                                title="Remover item da proposta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Observações da Proposta */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-medium">Condições Comerciais e Observações</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Prazo de pagamento em 28 DDL. Materiais devem ser entregues com 48h de antecedência..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>
            </div>

            {/* Resumo Executivo em Tempo Real (Col 4 - Sticky Lateral) */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-border/80 shadow-md bg-card sticky top-0 overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-primary via-emerald-500 to-purple-600" />
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Resumo Financeiro</span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3.5 text-xs">
                  {/* Faturamento Bruto de Tabela */}
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Valor Bruto Tabela</span>
                    <span className="font-semibold">{formatBRL(totals.totalGross)}</span>
                  </div>

                  {/* Total de Descontos */}
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Descontos Concedidos</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      -{formatBRL(totals.totalDiscount)}
                    </span>
                  </div>

                  {/* Faturamento Total ao Anunciante */}
                  <div className="p-2.5 rounded-lg bg-muted/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium block">
                      Total Faturado ao Cliente
                    </span>
                    <div className="text-lg font-bold text-foreground">
                      {formatBRL(totals.totalNetClient)}
                    </div>
                  </div>

                  {/* Comissão Líquida da Representação (DESTAQUE MÁXIMO) */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        Receita Líquida da Agência
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                      {formatBRL(totals.totalNetAgency)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 text-emerald-700/90 dark:text-emerald-400 font-medium">
                      <span>Margem Média:</span>
                      <span className="font-bold">{totals.profitMarginPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Repasse aos Veículos Parceiros */}
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-0.5">
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium block">
                      Total Repasse aos Veículos
                    </span>
                    <div className="text-base font-bold text-purple-800 dark:text-purple-200">
                      {formatBRL(totals.totalPayoutPartners)}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Distribuído entre os veículos parceiros
                    </span>
                  </div>

                  {/* Indicador de Saúde da Proposta */}
                  <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{items.length} espaços/veículos configurados</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer com Ações */}
          <DialogFooter className="p-4 border-t bg-card/60 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportExecutivePdf}
                disabled={generatingPdf || items.length === 0}
                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 flex-1 sm:flex-initial"
                title="Gera o PDF Executivo oficial com co-branding do anunciante"
              >
                {generatingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                Exportar PDF Executivo
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => saveMutation.mutate("draft")}
                disabled={saveMutation.isPending || convertMutation.isPending}
                className="gap-1.5 text-xs flex-1 sm:flex-initial"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Rascunho
              </Button>

              <Button
                type="button"
                onClick={() => convertMutation.mutate()}
                disabled={items.length === 0 || convertMutation.isPending || saveMutation.isPending}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-initial"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                {convertMutation.isPending ? "Gerando PI..." : "Gerar PI / Espelho"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SELEÇÃO DINÂMICA DO CATÁLOGO DE MÍDIAS */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Selecionar Espaço Publicitário do Catálogo
            </DialogTitle>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquise por nome, veículo parceiro, formato ou cidade..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 divide-y">
            {filteredCatalogForPicker.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Nenhum espaço encontrado no catálogo com o termo pesquisado.
              </div>
            ) : (
              filteredCatalogForPicker.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => addItemFromCatalog(cat)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {cat.nome_produto}
                    </div>
                    <div className="flex items-center gap-2">
                      {cat.is_own_product ? (
                        <Badge className="bg-amber-600/90 text-white text-[9px] px-1.5 py-0">
                          ⭐ Produto Próprio
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-700/90 text-white text-[9px] px-1.5 py-0">
                          🤝 {cat.partner?.nome_fantasia || cat.partner?.razao_social} •{" "}
                          {cat.comissao_percentual_especifica ??
                            cat.partner?.comissao_padrao_percentual ??
                            0}
                          % comissão
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {TIPOS_COBRANCA_LABELS[cat.tipo_cobranca] || cat.tipo_cobranca}
                      </span>
                      {cat.cidade && (
                        <span className="text-[10px] text-muted-foreground">
                          • {cat.cidade}/{cat.estado || ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs text-foreground">
                      {cat.valor_tabela ? formatBRL(cat.valor_tabela) : "Sob Consulta"}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-primary gap-1 p-0 mt-0.5 group-hover:underline"
                    >
                      Adicionar <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="p-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
