import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Building2,
  Handshake,
  DollarSign,
  MapPin,
  Upload,
  Trash2,
  Loader2,
  Sparkles,
  Camera,
  Layers,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import { lookupCep, formatCEP, geocodeAddress } from "@/lib/geocode.functions";
import { onlyDigits } from "@/lib/cnpj";
import {
  upsertMediaCatalogItem,
  listPartners,
} from "@/lib/representacao-comercial.functions";
import {
  CATEGORIAS_MIDIA_CONFIG,
  TIPOS_COBRANCA_CONFIG,
  type MediaServiceCatalogItem,
  type MediaServiceCatalogInput,
  type CategoriaMidiaRepresentacao,
  type TipoCobrancaRepresentacao,
} from "@/types/representacao-comercial.types";
import { useQuery } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<MediaServiceCatalogItem> | null;
  editingItem?: Partial<MediaServiceCatalogItem> | null;
  partners?: any[];
  onSuccess?: (item: MediaServiceCatalogItem) => void;
};

export function MediaServiceFormDialog({
  open,
  onOpenChange,
  initial,
  editingItem,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const upsertItemFn = useServerFn(upsertMediaCatalogItem);
  const listPartnersFn = useServerFn(listPartners);
  const lookupCepFn = useServerFn(lookupCep);
  const geocodeFn = useServerFn(geocodeAddress);

  const targetItem = initial || editingItem;

  const { data: partners = [] } = useQuery({
    queryKey: ["partners_list_select"],
    queryFn: () => listPartnersFn(),
    enabled: open,
  });

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const [form, setForm] = useState<Partial<MediaServiceCatalogInput>>({
    is_own_product: false,
    partner_id: null,
    nome_produto: "",
    categoria_midia: "ooh_dooh",
    tipo_cobranca: "insercao",
    valor_tabela: 0,
    valor_negociado_minimo: null,
    comissao_percentual_especifica: null,
    quantidade_disponivel: 1,
    estoque_espacos: 1,
    endereco: "",
    bairro: "",
    cidade: "Brasília",
    estado: "DF",
    cep: "",
    latitude: -15.7942,
    longitude: -47.8822,
    especificacoes_tecnicas: {
      resolucao: "1920x1080 Full HD",
      formato_video_audio: "MP4 (H.264)",
      dimensoes_metros_pixels: "",
      duracao_segundos: 15,
      frequencia_loop: "A cada 3 minutos",
    },
    fotos: [],
    imagem_url: "",
    ativo: true,
  });

  useEffect(() => {
    if (open) {
      if (targetItem) {
        setForm({
          id: targetItem.id,
          is_own_product: targetItem.is_own_product ?? false,
          partner_id: targetItem.partner_id ?? null,
          nome_produto: targetItem.nome_produto || "",
          categoria_midia: targetItem.categoria_midia || "ooh_dooh",
          tipo_cobranca: (targetItem.tipo_cobranca as TipoCobrancaRepresentacao) || "insercao",
          valor_tabela: Number(targetItem.valor_tabela || 0),
          valor_negociado_minimo:
            targetItem.valor_negociado_minimo != null ? Number(targetItem.valor_negociado_minimo) : null,
          comissao_percentual_especifica:
            targetItem.comissao_percentual_especifica != null
              ? Number(targetItem.comissao_percentual_especifica)
              : null,
          quantidade_disponivel: targetItem.quantidade_disponivel ?? 1,
          estoque_espacos: targetItem.estoque_espacos ?? 1,
          endereco: targetItem.endereco || "",
          bairro: targetItem.bairro || "",
          cidade: targetItem.cidade || "Brasília",
          estado: targetItem.estado || "DF",
          cep: targetItem.cep || "",
          latitude: targetItem.latitude ?? -15.7942,
          longitude: targetItem.longitude ?? -47.8822,
          especificacoes_tecnicas: targetItem.especificacoes_tecnicas || {
            resolucao: "1920x1080 Full HD",
            formato_video_audio: "MP4 (H.264)",
            dimensoes_metros_pixels: "",
            duracao_segundos: 15,
            frequencia_loop: "A cada 3 minutos",
          },
          fotos: targetItem.fotos || [],
          imagem_url: targetItem.imagem_url || "",
          ativo: targetItem.ativo ?? true,
        });
      } else {
        setForm({
          is_own_product: false,
          partner_id: null,
          nome_produto: "",
          categoria_midia: "ooh_dooh",
          tipo_cobranca: "insercao",
          valor_tabela: 0,
          valor_negociado_minimo: null,
          comissao_percentual_especifica: null,
          quantidade_disponivel: 1,
          estoque_espacos: 1,
          endereco: "",
          bairro: "",
          cidade: "Brasília",
          estado: "DF",
          cep: "",
          latitude: -15.7942,
          longitude: -47.8822,
          especificacoes_tecnicas: {
            resolucao: "1920x1080 Full HD",
            formato_video_audio: "MP4 (H.264)",
            dimensoes_metros_pixels: "",
            duracao_segundos: 15,
            frequencia_loop: "A cada 3 minutos",
          },
          fotos: [],
          imagem_url: "",
          ativo: true,
        });
      }
    }
  }, [open, initial]);

  const set = (patch: Partial<MediaServiceCatalogInput>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const setSpec = (field: string, val: any) =>
    setForm((prev) => ({
      ...prev,
      especificacoes_tecnicas: {
        ...(prev.especificacoes_tecnicas as any),
        [field]: val,
      },
    }));

  const selectedPartner = partners.find((p) => p.id === form.partner_id) || null;

  // Upload de fotos do produto / espaço publicitário
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 8MB");
      return;
    }
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `midia_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      let bucket = "produto-fotos";

      let { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      if (error) {
        bucket = "client-logos";
        const r2 = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
        if (r2.error) throw r2.error;
      }

      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pubData?.publicUrl || path;

      const currentFotos = form.fotos || [];
      const updatedFotos = [...currentFotos, url];
      set({
        fotos: updatedFotos,
        imagem_url: updatedFotos[0] || url,
      });

      toast.success("Foto / Mock-up adicionado com sucesso!");
    } catch (err: any) {
      toast.error(`Falha no upload: ${err?.message || "Tente novamente"}`);
    } finally {
      setUploadingFoto(false);
      e.target.value = "";
    }
  };

  const handleRemoverFoto = (idx: number) => {
    const updated = (form.fotos || []).filter((_, i) => i !== idx);
    set({
      fotos: updated,
      imagem_url: updated[0] || "",
    });
  };

  // Busca de CEP
  const handleLookupCep = async () => {
    const raw = form.cep || "";
    const digits = onlyDigits(raw);
    if (digits.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos");
      return;
    }
    setSearchingCep(true);
    try {
      const res = await lookupCepFn({ data: { cep: digits } });
      if (res.ok && res.data) {
        set({
          endereco: res.data.logradouro || form.endereco,
          bairro: res.data.bairro || form.bairro,
          cidade: res.data.cidade || form.cidade,
          estado: res.data.uf || form.estado,
          cep: formatCEP(digits),
          latitude: res.data.latitude ?? form.latitude,
          longitude: res.data.longitude ?? form.longitude,
        });
        toast.success("Endereço localizado via CEP!");
      } else {
        toast.error(res.error || "CEP não encontrado.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro na consulta de CEP");
    } finally {
      setSearchingCep(false);
    }
  };

  // Geocodificação de endereço
  const handleGeocode = async () => {
    const full = `${form.endereco || ""}, ${form.bairro || ""}, ${form.cidade || ""}, ${form.estado || ""}`.trim();
    if (full.length < 5) {
      toast.error("Informe um endereço para buscar no mapa.");
      return;
    }
    setSearchingAddress(true);
    try {
      const res = await geocodeFn({ data: { address: full } });
      if (res.ok && res.latitude != null && res.longitude != null) {
        set({
          latitude: res.latitude,
          longitude: res.longitude,
        });
        toast.success("Localização atualizada no mapa!");
      } else {
        toast.error(res.error || "Endereço não localizado no mapa.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro na busca de coordenadas");
    } finally {
      setSearchingAddress(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: (data: any) => upsertItemFn({ data }),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["media_services_catalog"] });
      qc.invalidateQueries({ queryKey: ["media_catalog"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["public_inventory_assets"] });
      toast.success(
        form.id
          ? "Espaço/Serviço publicitário atualizado!"
          : "Novo espaço/serviço cadastrado no catálogo!",
      );
      onOpenChange(false);
      if (onSuccess) onSuccess(saved);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar item");
    },
  });

  const isOOH = form.categoria_midia === "ooh_dooh";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            {form.id ? "Editar Espaço / Serviço Publicitário" : "Cadastrar Espaço ou Serviço Publicitário"}
          </DialogTitle>
          <DialogDescription>
            Defina o modelo de representação comercial, precificação de tabela, estoque e especificações técnicas para propostas e veiculações.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.nome_produto?.trim()) {
              toast.error("Informe o nome do espaço ou serviço publicitário.");
              return;
            }
            if (!form.is_own_product && !form.partner_id) {
              toast.error("Selecione o veículo parceiro ou marque como 'Produto Próprio'.");
              return;
            }
            saveMut.mutate(form);
          }}
          className="space-y-4 pt-1"
        >
          {/* 1. TOGGLE: PRODUTO PRÓPRIO VS VEÍCULO PARCEIRO */}
          <div className="rounded-xl border p-4 bg-gradient-to-r from-muted/40 to-muted/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="toggle-is-own"
                  checked={form.is_own_product}
                  onCheckedChange={(checked) => {
                    set({
                      is_own_product: checked,
                      partner_id: checked ? null : form.partner_id,
                    });
                  }}
                />
                <div>
                  <Label htmlFor="toggle-is-own" className="text-sm font-bold cursor-pointer">
                    É Produto / Solução Própria da Representação?
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.is_own_product
                      ? "⭐ Sim: Serviço ou produto in-house (sem repasse a veículo parceiro)"
                      : "🤝 Não: Espaço comercializado de veículo de comunicação parceiro (com comissão de representação)"}
                  </p>
                </div>
              </div>

              <Badge
                className={
                  form.is_own_product
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-purple-600 text-white font-bold"
                }
              >
                {form.is_own_product
                  ? "⭐ Produto Próprio (Comercialização Direta)"
                  : "🤝 Veículo Parceiro (Representação Comercial)"}
              </Badge>
            </div>

            {/* SELEÇÃO DO PARCEIRO (ESCONDIDA SE FOR PRODUTO PRÓPRIO) */}
            {!form.is_own_product && (
              <div className="pt-2 border-t border-border/60">
                <Label className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                  Veículo de Comunicação Parceiro *
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                  <div className="sm:col-span-2">
                    <Select
                      value={form.partner_id || ""}
                      onValueChange={(val) => {
                        const p = partners.find((item) => item.id === val);
                        set({
                          partner_id: val,
                          comissao_percentual_especifica:
                            form.comissao_percentual_especifica || p?.comissao_padrao_percentual || 20,
                        });
                      }}
                    >
                      <SelectTrigger className="text-xs bg-background">
                        <SelectValue placeholder="Selecione o veículo parceiro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {partners.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            🤝 {p.nome_fantasia || p.razao_social} ({p.tipo_veiculo || "Mídia"} • {p.comissao_padrao_percentual}% comissão)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        placeholder="Comissão %"
                        value={
                          form.comissao_percentual_especifica ??
                          selectedPartner?.comissao_padrao_percentual ??
                          20
                        }
                        onChange={(e) =>
                          set({
                            comissao_percentual_especifica: Number(e.target.value),
                          })
                        }
                        className="font-mono text-xs pr-7 bg-background"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-muted-foreground font-semibold">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Taxa de comissão
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. DADOS PRINCIPAIS DO PRODUTO & CATEGORIA */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Layers className="size-3.5 text-primary" />
              Identificação & Categoria de Mídia
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Nome do Espaço / Serviço Publicitário *</Label>
                <Input
                  required
                  placeholder="Ex: Painel LED Digital EPTG Km 04 • Inserção 15s • Frontlight 9x3m • Banner Topo"
                  value={form.nome_produto}
                  onChange={(e) => set({ nome_produto: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Categoria de Mídia *</Label>
                <Select
                  value={form.categoria_midia}
                  onValueChange={(val) => set({ categoria_midia: val })}
                >
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIAS_MIDIA_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {CATEGORIAS_MIDIA_CONFIG[form.categoria_midia as CategoriaMidiaRepresentacao]?.descricao}
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium">Modelo de Cobrança / Valoração *</Label>
                <Select
                  value={form.tipo_cobranca}
                  onValueChange={(val) => set({ tipo_cobranca: val as TipoCobrancaRepresentacao })}
                >
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_COBRANCA_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {cfg.label} ({cfg.sufixo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {TIPOS_COBRANCA_CONFIG[form.tipo_cobranca as TipoCobrancaRepresentacao]?.descricao}
                </p>
              </div>
            </div>
          </div>

          {/* 3. PRECIFICAÇÃO E ESTOQUE */}
          <div className="rounded-xl border p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <DollarSign className="size-3.5 text-emerald-600" />
              Precificação & Disponibilidade de Espaços
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Valor de Tabela (Bruto de Face) *
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">
                    R$
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={form.valor_tabela ?? 0}
                    onChange={(e) => set({ valor_tabela: Number(e.target.value) })}
                    className="pl-8 font-mono text-xs bg-background font-bold text-emerald-700 dark:text-emerald-300"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Valor nominal de tabela
                </span>
              </div>

              <div>
                <Label className="text-xs font-medium">Valor Negociado Mínimo</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">
                    R$
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Opcional"
                    value={form.valor_negociado_minimo ?? ""}
                    onChange={(e) =>
                      set({
                        valor_negociado_minimo: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="pl-8 font-mono text-xs bg-background"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Piso comercial para descontos
                </span>
              </div>

              <div>
                <Label className="text-xs font-medium">Estoque / Espaços Disponíveis</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.estoque_espacos ?? 1}
                  onChange={(e) =>
                    set({
                      estoque_espacos: Number(e.target.value),
                      quantidade_disponivel: Number(e.target.value),
                    })
                  }
                  className="mt-1 font-mono text-xs bg-background"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Faces, cotas ou telas ativas
                </span>
              </div>
            </div>
          </div>

          {/* 4. FOTOS E MOCK-UPS */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <Camera className="size-3.5 text-primary" />
                Fotos & Mock-ups do Ponto / Formato
              </Label>
              <label
                htmlFor="upload-foto-input"
                className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Upload className="size-3" />
                {uploadingFoto ? "Enviando..." : "Adicionar Foto"}
              </label>
              <input
                id="upload-foto-input"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingFoto}
                onChange={handleUploadFoto}
              />
            </div>

            {(form.fotos || []).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {(form.fotos || []).map((foto, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-border group bg-background shadow-xs aspect-video"
                  >
                    <img src={foto} alt={`Foto ${idx + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoverFoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-red-600 transition-colors opacity-90 group-hover:opacity-100"
                      title="Remover foto"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground bg-background/50">
                <Camera className="size-6 mx-auto opacity-30 mb-1" />
                Nenhuma foto cadastrada. Adicione fotos do ponto real ou mock-ups comerciais para enriquecer as propostas.
              </div>
            )}
          </div>

          {/* 5. GEOLOCALIZAÇÃO & MAPA (SE FOR OOH / DOOH OU PONTO FÍSICO) */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5 text-primary" />
              Localização Física & Ponto no Mapa
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <Label className="text-xs">CEP</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    placeholder="00000-000"
                    value={form.cep ?? ""}
                    onChange={(e) => set({ cep: formatCEP(e.target.value) })}
                    className="text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-2"
                    disabled={searchingCep}
                    onClick={handleLookupCep}
                    title="Buscar CEP"
                  >
                    {searchingCep ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <Label className="text-xs">Endereço Completo</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    placeholder="Ex: Av. W3 Sul, Quadra 502 • EPTG Km 04"
                    value={form.endereco ?? ""}
                    onChange={(e) => set({ endereco: e.target.value })}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-2"
                    disabled={searchingAddress}
                    onClick={handleGeocode}
                    title="Plotar no Mapa"
                  >
                    {searchingAddress ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <MapPin className="size-3.5 text-primary" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs">Bairro</Label>
                <Input
                  value={form.bairro ?? ""}
                  onChange={(e) => set({ bairro: e.target.value })}
                  placeholder="Ex: Asa Sul, Taguatinga Centro"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={form.cidade ?? "Brasília"}
                  onChange={(e) => set({ cidade: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Estado / UF</Label>
                <Input
                  value={form.estado ?? "DF"}
                  maxLength={2}
                  onChange={(e) => set({ estado: e.target.value.toUpperCase() })}
                  className="mt-1 text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* SE FOR OOH / DOOH OU SE TIVER COORDENADAS, MOSTRA O MAPA */}
            <div className="pt-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Ponto de Exibição no Mapa (Arraste o pino para refinar as coordenadas)
              </Label>
              <div className="rounded-lg overflow-hidden border border-border h-56">
                <LocationPickerMap
                  latitude={form.latitude ?? -15.7942}
                  longitude={form.longitude ?? -47.8822}
                  onChange={({ latitude, longitude }) => {
                    set({ latitude, longitude });
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>Lat: {form.latitude?.toFixed(6)} | Lng: {form.longitude?.toFixed(6)}</span>
                <span className="font-semibold text-emerald-600">Plotagem automática ativa</span>
              </div>
            </div>
          </div>

          {/* 6. ESPECIFICAÇÕES TÉCNICAS */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Especificações Técnicas de Veiculação
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Formato de Arquivo / Mídia</Label>
                <Input
                  placeholder="Ex: MP4 (H.264), Lona Frontlight, HTML5"
                  value={(form.especificacoes_tecnicas as any)?.formato_video_audio ?? ""}
                  onChange={(e) => setSpec("formato_video_audio", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Resolução / Dimensões</Label>
                <Input
                  placeholder="Ex: 1920x1080 (16:9), 9x3m"
                  value={(form.especificacoes_tecnicas as any)?.resolucao ?? ""}
                  onChange={(e) => setSpec("resolucao", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Duração / Loop</Label>
                <Input
                  placeholder="Ex: 15s a cada 3 min, 30s rotativo"
                  value={(form.especificacoes_tecnicas as any)?.frequencia_loop ?? ""}
                  onChange={(e) => setSpec("frequencia_loop", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMut.isPending}
              className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5"
            >
              {saveMut.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Salvando...
                </>
              ) : form.id ? (
                "Atualizar Espaço"
              ) : (
                "Cadastrar Espaço no Inventário"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
