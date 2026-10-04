import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Building2,
  Search,
  Loader2,
  X,
  MapPin,
  Navigation,
  Percent,
  Handshake,
  Plus,
  Globe,
  Radio,
  Tv,
  Sparkles,
  Layers,
  MousePointerClick,
  Eye,
  TrendingUp,
  Share2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { upsertProduto, upsertProdutoTipo } from "@/lib/produtos.functions";
import { listEmissoras } from "@/lib/emissoras.functions";
import { listParceiros, type Parceiro, SEGMENTOS_MIDIA } from "@/lib/parceiros.functions";
import { listMidiaConfig, upsertMidiaConfig } from "@/lib/midia-config.functions";
import {
  MIDIAS_PARCEIROS_CATALOGO,
  SUGESTOES_TIPOS_POR_MIDIA,
  FORMATOS_SUGERIDOS_POR_MIDIA,
  PROGRAMAS_SUGERIDOS_POR_MIDIA,
  getMacroCanalParaMidia,
} from "@/lib/catalogo-midias";
import { useQuery } from "@tanstack/react-query";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import { ProdutoFotosUploader } from "@/components/ProdutoFotosUploader";
import { ParceiroFormDialog } from "@/components/ParceiroFormDialog";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import {
  geocodeAddress,
  reverseGeocodeCoords,
  lookupCep,
  formatCEP,
} from "@/lib/geocode.functions";
import { FormFieldError, errorLabelClass, scrollToFirstError } from "@/lib/form-errors";
import { traduzirErro } from "@/lib/error-translator";

export type Midia = string;

export type Produto = {
  id: string;
  nome: string;
  midia: Midia;
  canal_macro?: "OFF" | "ON" | "HIBRIDO";
  plataforma_rede?: string | null;
  metricas_digitais?: Record<string, any> | null;
  tipo: string | null;
  programa: string | null;
  formato: string | null;
  faixa: string | null;
  duracao_segundos: number;
  insercoes_padrao: number;
  valor_unit: number;
  ativo: boolean;
  observacao: string | null;
  link_modelo: string | null;
  requer_producao: boolean;
  emissora_id?: string | null;
  veiculacao_tipo?: "livre" | "dias_uteis" | "seg_sab" | "dias_fixos" | "dias_semana";
  dias_fixos?: number[];
  dias_semana_fixos?: number[];
  endereco_ponto?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  link_maps?: string | null;
  sentido_via?: string | null;
  ponto_referencia?: string | null;
  quantidade_telas?: number | null;
  ambientes?: string[];
  formato_tela?: string | null;
  resolucao?: string | null;
  tempo_exibicao_segundos?: number | null;
  loop_minutos?: number | null;
  insercoes_por_hora?: number | null;
  horas_operacao_dia?: number | null;
  detalhes_venda?: string | null;
  parceiro_id?: string | null;
  parceiro_cnpj?: string | null;
  parceiro_nome?: string | null;
  comissao_inquilino_pct?: number | null;
  fotos?: string[] | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Produto> | null;
  sugestoes?: {
    tipos: string[];
    programas: string[];
    formatos: string[];
    faixas?: string[];
  };
  getTiposParaMidia?: (midia: Midia) => string[];
};

export function ProdutoFormDialog({
  open,
  onOpenChange,
  initial,
  sugestoes = { tipos: [], programas: [], formatos: [], faixas: [] },
  getTiposParaMidia,
}: Props) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProduto);
  const upsertTipoFn = useServerFn(upsertProdutoTipo);
  const geocodeAddressFn = useServerFn(geocodeAddress);
  const reverseGeocodeFn = useServerFn(reverseGeocodeCoords);
  const lookupCepFn = useServerFn(lookupCep);
  const upsertConfigFn = useServerFn(upsertMidiaConfig);
  const fetchConfigsFn = useServerFn(listMidiaConfig);
  const fetchEmissorasFn = useServerFn(listEmissoras);

  const [creatingMidia, setCreatingMidia] = useState(false);
  const [creatingTipo, setCreatingTipo] = useState(false);
  const [cadastrarMidiaModalOpen, setCadastrarMidiaModalOpen] = useState(false);
  const [cadastrarParceiroModalOpen, setCadastrarParceiroModalOpen] = useState(false);
  const [novaMidiaForm, setNovaMidiaForm] = useState({
    nome: "",
    razao_social: "",
    cnpj: "",
  });
  const [salvandoNovaMidia, setSalvandoNovaMidia] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [cepInput, setCepInput] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const isResolvingRef = useRef(false);

  const handleCadastrarNovaMidia = async () => {
    const nome = novaMidiaForm.nome.trim();
    if (!nome) {
      toast.error("Informe o nome da mídia a cadastrar");
      return;
    }
    setSalvandoNovaMidia(true);
    try {
      await upsertConfigFn({
        data: {
          midia: nome,
          razao_social: novaMidiaForm.razao_social.trim() || null,
          cnpj: novaMidiaForm.cnpj.trim() || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["midia_config"] });
      set({ midia: nome });
      toast.success(`Mídia "${nome}" cadastrada com sucesso!`);
      setNovaMidiaForm({ nome: "", razao_social: "", cnpj: "" });
      setCadastrarMidiaModalOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvandoNovaMidia(false);
    }
  };

  const { data: configs = [] } = useQuery({
    queryKey: ["midia_config"],
    queryFn: () => fetchConfigsFn(),
  });

  const listParceirosFn = useServerFn(listParceiros);
  const { data: emissoras = [] } = useQuery({
    queryKey: ["emissoras"],
    queryFn: () => fetchEmissorasFn(),
  });
  const { data: parceirosCadastrados = [] } = useQuery<Parceiro[]>({
    queryKey: ["parceiros"],
    queryFn: () => listParceirosFn(),
  });

  // Segmentos extraídos dos parceiros cadastrados no sistema
  const segmentosParceiros = (parceirosCadastrados ?? []).flatMap((p) =>
    Array.isArray(p.segmentos) ? p.segmentos : [],
  );

  // Lista consolidada de todas as mídias: padrão comercial + catálogo parceiros + cadastrados no banco
  const todasMidias = Array.from(
    new Set([
      ...MIDIAS_PARCEIROS_CATALOGO,
      ...SEGMENTOS_MIDIA,
      ...segmentosParceiros,
      ...(configs as any[]).map((c) => c.midia).filter(Boolean),
    ]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const [form, setForm] = useState<Partial<Produto>>({
    midia: "TV",
    canal_macro: "OFF",
    plataforma_rede: null,
    metricas_digitais: null,
    nome: "",
    duracao_segundos: 30,
    insercoes_padrao: 1,
    valor_unit: 0,
    ativo: true,
    parceiro_id: null,
    parceiro_cnpj: null,
    parceiro_nome: null,
    comissao_inquilino_pct: null,
    cep: null,
    fotos: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      const init = initial || {
        midia: "TV",
        canal_macro: "OFF",
        plataforma_rede: null,
        metricas_digitais: null,
        nome: "",
        duracao_segundos: 30,
        insercoes_padrao: 1,
        valor_unit: 0,
        ativo: true,
        parceiro_id: null,
        parceiro_cnpj: null,
        parceiro_nome: null,
        comissao_inquilino_pct: null,
        cep: null,
        fotos: [],
      };
      const canalMacroInicial =
        init.canal_macro ||
        (["Digital", "Social", "Internet", "Web", "Portal"].includes(init.midia || "")
          ? "ON"
          : "OFF");
      setForm({
        ...init,
        canal_macro: canalMacroInicial,
        plataforma_rede: init.plataforma_rede || null,
        metricas_digitais: init.metricas_digitais || null,
        link_maps: init.link_maps || null,
        sentido_via: init.sentido_via || null,
        ponto_referencia: init.ponto_referencia || null,
        fotos: init.fotos || [],
      });
      const rawCep = init.cep || init.endereco_ponto?.match(/\b\d{5}-?\d{3}\b/)?.[0] || "";
      setCepInput(rawCep ? formatCEP(rawCep) : "");
    }
  }, [open, initial]);

  const set = (patch: Partial<Produto>) => setForm((prev) => ({ ...prev, ...patch }));

  const updateMetricaDigital = (key: string, val: any) => {
    setForm((prev) => {
      const cur = { ...(prev.metricas_digitais || {}) };
      if (val === "" || val === null || val === undefined) {
        delete cur[key];
      } else {
        cur[key] = val;
      }
      return { ...prev, metricas_digitais: Object.keys(cur).length ? cur : null };
    });
  };

  const handleReverseGeocode = async (lat: number, lng: number, silent = false) => {
    if (isResolvingRef.current) return;
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    isResolvingRef.current = true;
    setLoadingCoords(true);
    try {
      const res = await reverseGeocodeFn({ data: { latitude: lat, longitude: lng } });
      if (res.ok && res.endereco) {
        set((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          endereco_ponto: res.endereco,
          cep: res.cep || prev.cep || null,
        }));
        if (res.cep) {
          setCepInput(formatCEP(res.cep));
        }
        if (!silent) {
          toast.success("Endereço preenchido pelas coordenadas!", {
            description: res.endereco,
          });
        }
      } else if (!silent && !res.ok) {
        toast.info("Não foi possível identificar o endereço exato para estas coordenadas.");
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Erro ao consultar endereço pelas coordenadas.");
    } finally {
      setLoadingCoords(false);
      isResolvingRef.current = false;
    }
  };

  const handleLookupCep = async (cepValue: string, silent = false) => {
    if (isResolvingRef.current) return;
    const digits = onlyDigits(cepValue);
    if (digits.length !== 8) {
      if (!silent) toast.error("Informe um CEP completo com 8 dígitos.");
      return;
    }

    isResolvingRef.current = true;
    setLoadingCep(true);
    try {
      const res = await lookupCepFn({ data: { cep: digits } });
      if (res.ok) {
        setCepInput(res.cep);
        set((prev) => ({
          ...prev,
          cep: res.cep,
          endereco_ponto: res.endereco || prev.endereco_ponto,
          ...(res.latitude != null && res.longitude != null
            ? { latitude: res.latitude, longitude: res.longitude }
            : {}),
        }));

        if (!silent) {
          const desc = [
            res.endereco,
            res.latitude != null && res.longitude != null ? "Coordenadas marcadas no mapa." : null,
          ]
            .filter(Boolean)
            .join(" • ");

          toast.success("Endereço e localização preenchidos pelo CEP!", {
            description: desc,
          });
        }
      } else {
        if (!silent) toast.error(res.error || "CEP não encontrado.");
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Erro ao buscar CEP.");
    } finally {
      setLoadingCep(false);
      isResolvingRef.current = false;
    }
  };

  const handleGeocodeAddress = async (addressQuery: string, silent = false) => {
    if (isResolvingRef.current) return;
    const query = (addressQuery || "").trim();
    if (query.length < 3) {
      if (!silent) toast.error("Informe um endereço válido para localizar.");
      return;
    }

    // Se for apenas um CEP digitado no campo de endereço, encaminha para busca de CEP
    const digits = onlyDigits(query);
    if (digits.length === 8 && query.length <= 10) {
      return handleLookupCep(digits, silent);
    }

    isResolvingRef.current = true;
    setLoadingAddress(true);
    try {
      const res = await geocodeAddressFn({ data: { address: query } });
      if (res.ok && res.latitude != null && res.longitude != null) {
        set((prev) => ({
          ...prev,
          latitude: res.latitude,
          longitude: res.longitude,
          cep: res.cep || prev.cep || null,
        }));
        if (res.cep && !cepInput) {
          setCepInput(formatCEP(res.cep));
        }
        if (!silent) {
          toast.success("Coordenadas e mapa atualizados pelo endereço!", {
            description: `Lat: ${res.latitude}, Lng: ${res.longitude}${res.cep ? ` • CEP ${res.cep}` : ""}`,
          });
        }
      } else if (!silent && !res.ok) {
        toast.error(res.error || "Endereço não localizado no mapa.");
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Erro ao buscar endereço no mapa.");
    } finally {
      setLoadingAddress(false);
      isResolvingRef.current = false;
    }
  };

  const handleBuscarCnpj = async () => {
    const raw = form.parceiro_cnpj || "";
    const digits = onlyDigits(raw);
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ válido com 14 dígitos para consultar na Receita Federal.");
      return;
    }
    setSearchingCnpj(true);
    try {
      const data = await fetchCnpj(digits);
      const parceiroNome = data.nomeFantasia || data.razaoSocial || "";
      set({
        parceiro_cnpj: formatCNPJ(digits),
        parceiro_nome: parceiroNome,
      });
      toast.success("Dados do parceiro carregados da Receita Federal!", {
        description: `${data.razaoSocial}${data.cidade ? ` • ${data.cidade}/${data.estado}` : ""}`,
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar dados na Receita Federal.");
    } finally {
      setSearchingCnpj(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: (p: any) => upsertFn({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto salvo com sucesso");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(traduzirErro(e)),
  });

  const parceiroSelecionado = parceirosCadastrados.find((p) => p.id === form.parceiro_id) || null;

  const parceirosQueOferecemMidia = form.midia
    ? (parceirosCadastrados ?? []).filter((p) =>
        Array.isArray(p.segmentos) &&
        p.segmentos.some(
          (seg) => seg.trim().toLowerCase() === form.midia!.trim().toLowerCase(),
        ),
      )
    : [];

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.nome?.trim()) {
      errs.nome = "O nome do produto é obrigatório.";
    }
    if (!form.midia?.trim()) {
      errs.midia = "A mídia é obrigatória.";
    }
    if (form.valor_unit == null || isNaN(Number(form.valor_unit)) || Number(form.valor_unit) < 0) {
      errs.valor_unit = "Informe um valor unitário válido.";
    }
    if (!form.duracao_segundos || Number(form.duracao_segundos) <= 0) {
      errs.duracao_segundos = "Duração deve ser maior que zero.";
    }
    if (!form.insercoes_padrao || Number(form.insercoes_padrao) <= 0) {
      errs.insercoes_padrao = "Inserções padrão deve ser pelo menos 1.";
    }
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Por favor, preencha os campos obrigatórios destacados em vermelho.");
      scrollToFirstError(errs);
      return;
    }
    setErrors({});
    saveMut.mutate(form);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seletor Visual de Macro Canal (OFF vs ON vs HÍBRIDO) */}
            <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Classificação do Inventário (Canal Macro) *
                </Label>
                <Badge
                  variant="outline"
                  className={
                    form.canal_macro === "ON"
                      ? "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 text-[11px]"
                      : form.canal_macro === "HIBRIDO"
                        ? "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 text-[11px]"
                        : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px]"
                  }
                >
                  {form.canal_macro === "ON"
                    ? "🌐 Mídia Digital / ON"
                    : form.canal_macro === "HIBRIDO"
                      ? "⚡ Mídia Híbrida 360°"
                      : "📻 Mídia Tradicional / OFF"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    set({ canal_macro: "OFF" });
                    if (form.midia === "Digital" || form.midia === "Social") {
                      set({ midia: "DOOH" });
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    form.canal_macro === "OFF" || !form.canal_macro
                      ? "bg-primary/10 border-primary text-primary shadow-sm font-semibold ring-1 ring-primary/30"
                      : "bg-background border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Radio className="size-5 mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold leading-tight">Mídia OFF</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">OOH, DOOH, TV, Rádio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    set({ canal_macro: "ON" });
                    if (["TV", "Radio", "DOOH"].includes(form.midia || "")) {
                      set({ midia: "Digital" });
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    form.canal_macro === "ON"
                      ? "bg-primary/10 border-primary text-primary shadow-sm font-semibold ring-1 ring-primary/30"
                      : "bg-background border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Globe className="size-5 mb-1 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-bold leading-tight">Mídia ON</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Social, Web, Portais</span>
                </button>

                <button
                  type="button"
                  onClick={() => set({ canal_macro: "HIBRIDO" })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    form.canal_macro === "HIBRIDO"
                      ? "bg-primary/10 border-primary text-primary shadow-sm font-semibold ring-1 ring-primary/30"
                      : "bg-background border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Sparkles className="size-5 mb-1 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold leading-tight">Híbrido 360°</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Físico + Digital</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div data-field="midia">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className={`font-semibold text-xs flex items-center gap-1 ${errors.midia ? errorLabelClass : ""}`}>
                    <span>Mídia *</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setNovaMidiaForm({ nome: "", razao_social: "", cnpj: "" });
                      setCadastrarMidiaModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors"
                  >
                    <Plus className="size-3" />+ Cadastrar Mídia
                  </button>
                </div>
                <CreatableCombobox
                  value={form.midia ?? "DOOH"}
                  onChange={(v) => {
                    set({
                      midia: v,
                      canal_macro: getMacroCanalParaMidia(v),
                    });
                    if (errors.midia) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.midia;
                        return copy;
                      });
                    }
                  }}
                  error={errors.midia}
                  options={todasMidias}
                  placeholder="Selecione ou digite para cadastrar..."
                  emptyLabel="Nenhuma mídia encontrada"
                  creating={creatingMidia}
                  onCreate={async (v) => {
                    if (!v.trim()) return;
                    try {
                      setCreatingMidia(true);
                      await upsertConfigFn({ data: { midia: v.trim() } });
                      await qc.invalidateQueries({ queryKey: ["midia_config"] });
                      await qc.invalidateQueries({ queryKey: ["produto_tipos"] });
                      set({
                        midia: v.trim(),
                        canal_macro: getMacroCanalParaMidia(v.trim()),
                      });
                      if (errors.midia) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.midia;
                          return copy;
                        });
                      }
                      toast.success(`Mídia "${v.trim()}" cadastrada com sucesso!`);
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setCreatingMidia(false);
                    }
                  }}
                />
                <FormFieldError message={errors.midia} />

                {/* Formatos e mídias oferecidas pelo parceiro vinculado */}
                {parceiroSelecionado?.segmentos && parceiroSelecionado.segmentos.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1 mb-1">
                      <Sparkles className="size-3 text-purple-600" />
                      Mídias de {parceiroSelecionado.nome_fantasia || parceiroSelecionado.razao_social}:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parceiroSelecionado.segmentos.map((seg) => (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => {
                            set({
                              midia: seg,
                              canal_macro: getMacroCanalParaMidia(seg),
                            });
                            if (errors.midia) {
                              setErrors((prev) => {
                                const copy = { ...prev };
                                delete copy.midia;
                                return copy;
                              });
                            }
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium transition-all flex items-center gap-0.5 cursor-pointer",
                            form.midia === seg
                              ? "bg-purple-600 text-white shadow-sm font-bold"
                              : "bg-background hover:bg-purple-100 dark:hover:bg-purple-950 text-foreground border border-purple-200 dark:border-purple-800",
                          )}
                        >
                          {form.midia === seg ? "✓ " : "+ "}
                          {seg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sugestão de parceiros homologados que oferecem a mídia selecionada */}
                {!form.parceiro_id && parceirosQueOferecemMidia.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-muted/40 border border-purple-200/60 dark:border-purple-800/60 text-[11px]">
                    <div className="text-muted-foreground flex items-center gap-1 mb-1 font-medium text-[10px]">
                      <Handshake className="size-3 text-purple-600" />
                      <span>Parceiros homologados com este formato:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parceirosQueOferecemMidia.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            set({
                              parceiro_id: p.id,
                              parceiro_cnpj: p.cnpj || null,
                              parceiro_nome: p.nome_fantasia || p.razao_social,
                              comissao_inquilino_pct: p.comissao_padrao_pct ?? 20.0,
                            });
                            toast.info(`Parceiro "${p.nome_fantasia || p.razao_social}" vinculado ao produto!`);
                          }}
                          className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-200 transition-colors cursor-pointer border border-purple-200 dark:border-purple-800 text-[10px]"
                        >
                          🤝 {p.nome_fantasia || p.razao_social} ({p.comissao_padrao_pct ?? 20}%)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Tipo do Produto</Label>
                {(() => {
                  const tiposSugeridosCatalogo = form.midia ? SUGESTOES_TIPOS_POR_MIDIA[form.midia] || [] : [];
                  const tiposOptions = Array.from(
                    new Set([
                      ...(getTiposParaMidia && form.midia ? getTiposParaMidia(form.midia) : []),
                      ...(sugestoes.tipos ?? []),
                      ...tiposSugeridosCatalogo,
                    ]),
                  ).filter(Boolean);

                  return (
                    <CreatableCombobox
                      value={form.tipo ?? ""}
                      onChange={(v) => set({ tipo: v })}
                      options={tiposOptions}
                      placeholder={
                        tiposOptions.length > 0
                          ? "Selecione ou digite para criar..."
                          : "Digite para cadastrar um tipo..."
                      }
                      emptyLabel="Nenhum tipo cadastrado para esta mídia"
                      creating={creatingTipo}
                      onCreate={async (v) => {
                        if (!form.midia) return;
                        try {
                          setCreatingTipo(true);
                          await upsertTipoFn({ data: { nome: v, midia: form.midia } });
                          await qc.invalidateQueries({ queryKey: ["produto_tipos"] });
                          toast.success(`Tipo "${v}" cadastrado para ${form.midia}`);
                        } catch (e) {
                          toast.error((e as Error).message);
                        } finally {
                          setCreatingTipo(false);
                        }
                      }}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Origem do Produto: Próprio do Inquilino vs Parceiro */}
            <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Handshake className="size-4 text-purple-600" />
                    Categorização: Representação vs. Soluções Próprias
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Defina se o produto é um <strong>Veículo Representado / Mídia Externa</strong> ou uma <strong>Solução In-House Nexo</strong>.
                  </p>
                </div>
                {form.parceiro_id || form.parceiro_cnpj?.trim() ? (
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 text-[11px] py-0.5">
                    🤝 Veículo Representado / Mídia Externa
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-sky-500/40 text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 text-[11px] py-0.5 font-bold"
                  >
                    ⭐ Soluções e Serviços Nexo In-House
                  </Badge>
                )}
              </div>

              {/* Seletor rápido de Categoria e Parceiros Cadastrados */}
              <div>
                <Label className="text-xs font-medium">Categoria Comercial / Veículo Representado</Label>
                <Select
                  value={form.parceiro_id || (form.parceiro_cnpj ? "outro" : "nenhum")}
                  onValueChange={(val) => {
                    if (val === "novo") {
                      setCadastrarParceiroModalOpen(true);
                      return;
                    }
                    if (val === "nenhum") {
                      set({
                        parceiro_id: null,
                        parceiro_cnpj: null,
                        parceiro_nome: null,
                        comissao_inquilino_pct: null,
                      });
                    } else if (val === "outro") {
                      set({ parceiro_id: null });
                    } else {
                      const sel = parceirosCadastrados.find((p) => p.id === val);
                      if (sel) {
                        const midiasDoParceiro = Array.isArray(sel.segmentos) ? sel.segmentos : [];
                        const deveTrocarMidia =
                          midiasDoParceiro.length > 0 &&
                          (!form.midia || form.midia === "TV") &&
                          !midiasDoParceiro.includes("TV");
                        const novaMidia = deveTrocarMidia ? midiasDoParceiro[0] : form.midia;

                        set({
                          parceiro_id: sel.id,
                          parceiro_cnpj: sel.cnpj || null,
                          parceiro_nome: sel.nome_fantasia || sel.razao_social,
                          comissao_inquilino_pct: sel.comissao_padrao_pct ?? 20.0,
                          ...(novaMidia ? { midia: novaMidia, canal_macro: getMacroCanalParaMidia(novaMidia) } : {}),
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                    <SelectValue placeholder="Selecione a categoria ou veículo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum" className="font-semibold text-sky-700 dark:text-sky-400">
                      ⭐ Soluções e Serviços Nexo In-House (Planejamento 360°, Produção OOH/DOOH, Projetos Especiais, PDV)
                    </SelectItem>
                    <SelectItem value="novo" className="font-bold text-primary">
                      ✨ Cadastrar Novo Veículo Representado...
                    </SelectItem>
                    {parceirosCadastrados.map((p) => (
                      <SelectItem key={p.id} value={p.id!}>
                        🤝 [Veículo Representado] {p.nome_fantasia || p.razao_social}{" "}
                        {p.comissao_padrao_pct ? `(${p.comissao_padrao_pct}% remuneração)` : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value="outro">
                      ✍️ Outro Veículo Externo (Digitar CNPJ / Razão Social)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-medium">CNPJ do Parceiro (opcional)</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={form.parceiro_cnpj ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        set({ parceiro_cnpj: formatCNPJ(v) });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleBuscarCnpj();
                        }
                      }}
                      className="font-mono text-xs bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      disabled={searchingCnpj}
                      onClick={handleBuscarCnpj}
                      title="Puxar dados da Receita Federal"
                    >
                      {searchingCnpj ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      Receita
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Razão Social / Nome do Parceiro</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      placeholder="Ex: Produtora / Empresa Parceira"
                      value={form.parceiro_nome ?? ""}
                      onChange={(e) => set({ parceiro_nome: e.target.value })}
                      className="text-xs bg-background"
                    />
                    {(form.parceiro_cnpj || form.parceiro_nome || form.parceiro_id) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          set({
                            parceiro_id: null,
                            parceiro_cnpj: "",
                            parceiro_nome: "",
                            comissao_inquilino_pct: null,
                          })
                        }
                        title="Limpar parceiro (tornar produto próprio do inquilino)"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Condição de Remuneração do Inquilino */}
              {(form.parceiro_id || form.parceiro_cnpj || form.parceiro_nome) && (
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Percent className="size-3.5 text-purple-600" />
                      Remuneração do Inquilino (% de comissão sobre a venda)
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Percentual que o inquilino retém por negociar e comercializar este produto do
                      parceiro.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-28">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="20"
                        value={form.comissao_inquilino_pct ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          set({ comissao_inquilino_pct: v });
                        }}
                        className="h-8 text-xs font-semibold pr-7 text-right bg-background"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        %
                      </span>
                    </div>
                    {form.valor_unit && form.comissao_inquilino_pct ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-mono border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 whitespace-nowrap bg-purple-100/50 dark:bg-purple-950/50"
                      >
                        +
                        {((form.valor_unit * form.comissao_inquilino_pct) / 100).toLocaleString(
                          "pt-BR",
                          { style: "currency", currency: "BRL" },
                        )}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className={errors.nome ? errorLabelClass : undefined}>Nome do Produto *</Label>
              <Input
                data-field="nome"
                error={errors.nome}
                value={form.nome ?? ""}
                onChange={(e) => {
                  set({ nome: e.target.value });
                  if (errors.nome) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.nome;
                      return copy;
                    });
                  }
                }}
              />
              <FormFieldError message={errors.nome} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>programa</Label>
                {(() => {
                  const programasCatalogo = form.midia ? PROGRAMAS_SUGERIDOS_POR_MIDIA[form.midia] || [] : [];
                  const progOptions = Array.from(
                    new Set([...(sugestoes.programas ?? []), ...programasCatalogo]),
                  ).filter(Boolean);

                  return (
                    <CreatableCombobox
                      value={form.programa ?? ""}
                      onChange={(v) => set({ programa: v })}
                      options={progOptions}
                      placeholder="Selecione ou crie"
                    />
                  );
                })()}
              </div>
              <div>
                <Label>Formato</Label>
                {(() => {
                  const formatosCatalogo = form.midia ? FORMATOS_SUGERIDOS_POR_MIDIA[form.midia] || [] : [];
                  const formOptions = Array.from(
                    new Set([...(sugestoes.formatos ?? []), ...formatosCatalogo]),
                  ).filter(Boolean);

                  return (
                    <CreatableCombobox
                      value={form.formato ?? ""}
                      onChange={(v) => set({ formato: v })}
                      options={formOptions}
                      placeholder="Selecione ou crie (30s, Página...)"
                    />
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>faixa horária</Label>
                <CreatableCombobox
                  value={form.faixa ?? ""}
                  onChange={(v) => set({ faixa: v })}
                  options={sugestoes.faixas ?? []}
                  placeholder="Selecione ou crie (Manhã, Tarde...)"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className={errors.duracao_segundos ? errorLabelClass : undefined}>Duração (s)</Label>
                  <Input
                    data-field="duracao_segundos"
                    error={errors.duracao_segundos}
                    type="number"
                    min={1}
                    value={form.duracao_segundos ?? 30}
                    onChange={(e) => {
                      set({ duracao_segundos: Number(e.target.value) });
                      if (errors.duracao_segundos) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.duracao_segundos;
                          return copy;
                        });
                      }
                    }}
                  />
                  <FormFieldError message={errors.duracao_segundos} />
                </div>
                <div>
                  <Label className={errors.insercoes_padrao ? errorLabelClass : undefined}>Ins. padrão</Label>
                  <Input
                    data-field="insercoes_padrao"
                    error={errors.insercoes_padrao}
                    type="number"
                    min={1}
                    value={form.insercoes_padrao ?? 1}
                    onChange={(e) => {
                      set({ insercoes_padrao: Number(e.target.value) });
                      if (errors.insercoes_padrao) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.insercoes_padrao;
                          return copy;
                        });
                      }
                    }}
                  />
                  <FormFieldError message={errors.insercoes_padrao} />
                </div>
              </div>
            </div>
            <div>
              <Label className={errors.valor_unit ? errorLabelClass : undefined}>Valor unitário (R$) *</Label>
              <Input
                data-field="valor_unit"
                error={errors.valor_unit}
                type="number"
                min={0}
                step="0.01"
                value={form.valor_unit ?? 0}
                onChange={(e) => {
                  set({ valor_unit: Number(e.target.value) });
                  if (errors.valor_unit) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.valor_unit;
                      return copy;
                    });
                  }
                }}
              />
              <FormFieldError message={errors.valor_unit} />
            </div>
            <div>
              <Label>Link do modelo do produto (opcional)</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={form.link_modelo ?? ""}
                onChange={(e) => set({ link_modelo: e.target.value })}
              />
            </div>
            <div>
              <Label>Emissora (CNPJ que emitirá o PI)</Label>
              <Select
                value={form.emissora_id ?? "none"}
                onValueChange={(v) => set({ emissora_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a emissora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem vínculo —</SelectItem>
                  {(
                    emissoras as Array<{
                      id: string;
                      nome: string;
                      cnpj: string | null;
                      ativo: boolean;
                    }>
                  )
                    .filter((e) => e.ativo)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                        {e.cnpj ? ` — ${e.cnpj}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Ao selecionar este produto em um PI, a emissora correspondente será sugerida
                automaticamente.
              </p>
            </div>

            {/* Bloco Mídia Digital (ON) */}
            {(form.canal_macro === "ON" || form.canal_macro === "HIBRIDO") && (
              <div className="rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-sky-950 dark:text-sky-100">
                        Ativação Digital (Mídia ON)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Redes sociais, portais web, banners, posts patrocinados e métricas de audiência digital.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-sky-100/60 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 text-[10px]">
                    🌐 Canal Digital
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Plataforma / Rede Digital</Label>
                    <CreatableCombobox
                      value={form.plataforma_rede ?? ""}
                      onChange={(v) => {
                        set({ plataforma_rede: v });
                        updateMetricaDigital("plataforma", v);
                      }}
                      options={[
                        "Instagram",
                        "Portal Web / Notícias",
                        "YouTube",
                        "TikTok",
                        "LinkedIn",
                        "Facebook",
                        "X (Twitter)",
                        "Podcast / Spotify",
                        "E-mail / Newsletter",
                        "Google Ads / Display",
                      ]}
                      placeholder="Ex: Instagram, Portal Web..."
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">URL / Perfil do Veículo</Label>
                    <Input
                      placeholder="Ex: @portalnoticias ou https://..."
                      value={form.metricas_digitais?.url_perfil ?? form.link_modelo ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateMetricaDigital("url_perfil", val);
                        if (!form.link_modelo) {
                          set({ link_modelo: val });
                        }
                      }}
                      className="text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Formato Digital</Label>
                    <CreatableCombobox
                      value={form.metricas_digitais?.formato_digital ?? form.formato ?? ""}
                      onChange={(v) => {
                        updateMetricaDigital("formato_digital", v);
                        if (!form.formato || form.formato === "30s") {
                          set({ formato: v });
                        }
                      }}
                      options={[
                        "Post no Feed (Imagem/Carrossel)",
                        "Reels / Vídeo Curto",
                        "Stories com Link (Sequência)",
                        "Banner Super Top (728x90)",
                        "Banner Retângulo (300x250)",
                        "Publieditorial / Matéria Patrocinada",
                        "Pre-roll Vídeo (YouTube)",
                        "Podcast / Testemunhal de Abertura",
                        "Takeover de Página / Pop-up",
                      ]}
                      placeholder="Ex: Post Feed, Banner 728x90..."
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">CPM Estimado (R$ por 1.000 impressões)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="15.00"
                        value={form.metricas_digitais?.cpm_estimado ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          updateMetricaDigital("cpm_estimado", val);
                        }}
                        className="pl-8 text-xs bg-background font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Métricas Estimadas de Entrega */}
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-sky-600" />
                    Métricas Estimadas de Entrega (Estimativas por Campanha)
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2 rounded border bg-background/80">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                        <Eye className="size-3 text-sky-600" />
                        <span>Impressões</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ex: 50000"
                        value={form.metricas_digitais?.impressoes_estimadas ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          updateMetricaDigital("impressoes_estimadas", val);
                        }}
                        className="h-7 text-xs font-mono"
                      />
                    </div>

                    <div className="p-2 rounded border bg-background/80">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                        <Share2 className="size-3 text-purple-600" />
                        <span>Alcance Único</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ex: 35000"
                        value={form.metricas_digitais?.alcance_estimado ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          updateMetricaDigital("alcance_estimado", val);
                        }}
                        className="h-7 text-xs font-mono"
                      />
                    </div>

                    <div className="p-2 rounded border bg-background/80">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                        <MousePointerClick className="size-3 text-emerald-600" />
                        <span>Cliques Estimados</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ex: 1200"
                        value={form.metricas_digitais?.cliques_estimados ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          updateMetricaDigital("cliques_estimados", val);
                        }}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bloco Mídia OFF (Física / OOH / DOOH / Rádio / TV) */}
            {(form.canal_macro === "OFF" ||
              form.canal_macro === "HIBRIDO" ||
              form.midia === "DOOH" ||
              form.midia === "OOH" ||
              form.midia === "TV" ||
              form.midia === "Radio") && (
              <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Radio className="size-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                        Ativação Física / Tradicional (Mídia OFF)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Pontos de rua, painéis LED, outdoors, fluxo de público, dimensões físicas e geolocalização.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 text-[10px]">
                    📍 Canal Físico / OOH
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Tipo de Equipamento / Veículo</Label>
                    <CreatableCombobox
                      value={form.formato_tela ?? form.metricas_digitais?.tipo_equipamento ?? ""}
                      onChange={(v) => {
                        set({ formato_tela: v });
                        updateMetricaDigital("tipo_equipamento", v);
                      }}
                      options={[
                        "Painel LED Digital Outdoor",
                        "Painel LED Indoor",
                        "Frontlight 9x3m",
                        "Outdoor Tradicional 9x3m",
                        "Mupi / Relógio de Rua",
                        "Top Sight Rodoviário",
                        "Busdoor / Traseira de Ônibus",
                        "Abrigo de Ônibus",
                        "Totem Digital de Shopping",
                        "Painel Empena de Prédio",
                        "Rádio Dial FM",
                        "Jornal Impresso / Revista",
                      ]}
                      placeholder="Ex: Painel LED Outdoor..."
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Dimensões Físicas</Label>
                    <Input
                      placeholder="Ex: 9m x 3m, 120x180cm, 55''..."
                      value={form.metricas_digitais?.dimensoes_fisicas ?? ""}
                      onChange={(e) => updateMetricaDigital("dimensoes_fisicas", e.target.value)}
                      className="text-xs bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Fluxo Estimado (Veículos / Pedestres)</Label>
                    <Input
                      placeholder="Ex: 50.000 veículos/dia, 80.000 pessoas/dia..."
                      value={form.metricas_digitais?.fluxo_estimado ?? ""}
                      onChange={(e) => updateMetricaDigital("fluxo_estimado", e.target.value)}
                      className="text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Rede de telas / Ponto DOOH com múltiplas telas */}
                {(form.midia === "DOOH" || form.quantidade_telas != null) && (
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">
                        Rede de telas / ponto com múltiplas telas
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Preencha se o ponto tem mais de uma tela (edifícios corporativos, gastronomia, academias, etc.).
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <Label className="text-xs">Quantidade de telas</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.quantidade_telas ?? ""}
                          onChange={(e) =>
                            set({
                              quantidade_telas: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="Ex.: 12"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Resolução</Label>
                        <Input
                          value={form.resolucao ?? ""}
                          onChange={(e) => set({ resolucao: e.target.value })}
                          placeholder="Full HD, 4K, 1920x1080…"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tempo exibição (s)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.tempo_exibicao_segundos ?? ""}
                          onChange={(e) =>
                            set({
                              tempo_exibicao_segundos:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="Ex.: 15"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Loop (minutos)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.loop_minutos ?? ""}
                          onChange={(e) =>
                            set({ loop_minutos: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          placeholder="Ex.: 10"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Inserções por hora</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.insercoes_por_hora ?? ""}
                          onChange={(e) =>
                            set({
                              insercoes_por_hora: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="Ex.: 6"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Horas operação/dia</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          value={form.horas_operacao_dia ?? ""}
                          onChange={(e) =>
                            set({
                              horas_operacao_dia: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="Ex.: 12"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Ambientes atendidos</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[
                          "Edifícios corporativos",
                          "Edifícios residenciais",
                          "Gastronomia",
                          "Bares",
                          "Academias",
                          "Shoppings",
                          "Farmácias",
                          "Postos de combustível",
                          "Padarias",
                          "Clínicas",
                          "Hospitais",
                          "Universidades",
                          "Aeroportos",
                          "Rodoviárias",
                        ].map((a) => {
                          const active = (form.ambientes ?? []).includes(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() => {
                                const cur = new Set(form.ambientes ?? []);
                                if (cur.has(a)) cur.delete(a);
                                else cur.add(a);
                                set({ ambientes: Array.from(cur) });
                              }}
                              className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                            >
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Geolocalização do ponto (OOH/DOOH) */}
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <MapPin className="size-3.5 text-primary" />
                      Geolocalização e Endereço do Ponto Físico
                    </Label>
                    {(loadingAddress || loadingCoords || loadingCep) && (
                      <Badge variant="outline" className="gap-1.5 text-[11px] animate-pulse">
                        <Loader2 className="size-3 animate-spin text-primary" />
                        {loadingCep
                          ? "Buscando CEP..."
                          : loadingCoords
                            ? "Obtendo endereço..."
                            : "Buscando no mapa..."}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Preencha o CEP ou endereço para localizar as coordenadas, ou posicione no mapa interativo.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-1">
                      <Label className="text-xs font-medium">CEP do ponto</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          placeholder="00000-000"
                          value={cepInput}
                          onChange={(e) => {
                            const val = formatCEP(e.target.value);
                            setCepInput(val);
                            if (onlyDigits(val).length === 8) {
                              handleLookupCep(val);
                            }
                          }}
                          onBlur={() => {
                            if (onlyDigits(cepInput).length === 8) {
                              handleLookupCep(cepInput, true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleLookupCep(cepInput);
                            }
                          }}
                          className="font-mono text-xs bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          disabled={loadingCep || onlyDigits(cepInput).length !== 8}
                          onClick={() => handleLookupCep(cepInput)}
                          title="Buscar dados do CEP"
                        >
                          {loadingCep ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Search className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-medium">Endereço do ponto</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          value={form.endereco_ponto ?? ""}
                          onChange={(e) => set({ endereco_ponto: e.target.value })}
                          onBlur={(e) => {
                            if (e.target.value?.trim().length >= 4) {
                              handleGeocodeAddress(e.target.value, true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleGeocodeAddress(form.endereco_ponto ?? "");
                            }
                          }}
                          placeholder="Av. Paulista, 1000 — Bela Vista, São Paulo/SP"
                          className="text-xs bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          disabled={loadingAddress || !(form.endereco_ponto ?? "").trim()}
                          onClick={() => handleGeocodeAddress(form.endereco_ponto ?? "")}
                          title="Buscar coordenadas pelo endereço"
                        >
                          {loadingAddress ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <MapPin className="size-3.5" />
                          )}
                          Buscar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Sentido da Via & Ponto de Referência */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-xs font-medium">Sentido da Via (Fluxo)</Label>
                      <Input
                        value={form.sentido_via ?? ""}
                        onChange={(e) => set({ sentido_via: e.target.value })}
                        placeholder="Ex: Sentido Plano Piloto / Sentido Taguatinga"
                        className="text-xs bg-background mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Ponto de Referência</Label>
                      <Input
                        value={form.ponto_referencia ?? ""}
                        onChange={(e) => set({ ponto_referencia: e.target.value })}
                        placeholder="Ex: Em frente ao Taguatinga Shopping"
                        className="text-xs bg-background mt-1"
                      />
                    </div>
                  </div>

                  {/* Coordenadas e Mapa */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-xs">Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        value={form.latitude ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          set({ latitude: val });
                        }}
                        onBlur={() => {
                          if (form.latitude != null && form.longitude != null) {
                            handleReverseGeocode(form.latitude, form.longitude, true);
                          }
                        }}
                        placeholder="-23.5613"
                        className="font-mono text-xs bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={form.longitude ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          set({ longitude: val });
                        }}
                        onBlur={() => {
                          if (form.latitude != null && form.longitude != null) {
                            handleReverseGeocode(form.latitude, form.longitude, true);
                          }
                        }}
                        placeholder="-46.6558"
                        className="font-mono text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast.error("Geolocalização não suportada neste navegador");
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const lat = Number(pos.coords.latitude.toFixed(7));
                            const lng = Number(pos.coords.longitude.toFixed(7));
                            set({ latitude: lat, longitude: lng });
                            handleReverseGeocode(lat, lng);
                          },
                          (err) => toast.error("Não foi possível obter localização: " + err.message),
                          { enableHighAccuracy: true, timeout: 10000 },
                        );
                      }}
                    >
                      <Navigation className="size-3.5" />
                      Usar minha localização
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={async () => {
                        const txt = await navigator.clipboard.readText().catch(() => "");
                        const m = txt.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
                        if (!m) {
                          toast.error("Cole coordenadas no formato: -23.5613, -46.6558");
                          return;
                        }
                        const lat = Number(m[1]);
                        const lng = Number(m[2]);
                        set({ latitude: lat, longitude: lng });
                        handleReverseGeocode(lat, lng);
                      }}
                    >
                      Colar do Google Maps
                    </Button>

                    {form.latitude != null && form.longitude != null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                        disabled={loadingCoords}
                        onClick={() => handleReverseGeocode(form.latitude!, form.longitude!)}
                        title="Consultar endereço destas coordenadas"
                      >
                        {loadingCoords ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Search className="size-3.5" />
                        )}
                        Puxar endereço
                      </Button>
                    )}

                    {form.latitude != null && form.longitude != null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground ml-auto"
                        asChild
                      >
                        <a
                          href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver no mapa ↗
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Mapa interativo */}
                  <div className="mt-2">
                    <LocationPickerMap
                      latitude={form.latitude ?? null}
                      longitude={form.longitude ?? null}
                      onChange={(lat, lng) => {
                        set({ latitude: lat, longitude: lng });
                        handleReverseGeocode(lat, lng);
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Clique no mapa ou arraste o marcador para preencher o endereço automaticamente.</span>
                      {form.latitude != null && form.longitude != null && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Link Maps Direto */}
                  <div className="pt-2 border-t border-border/40">
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>Link Maps Direto (Google Maps / Waze)</span>
                      {form.latitude != null && form.longitude != null && !form.link_maps && (
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline font-normal"
                          onClick={() =>
                            set({
                              link_maps: `https://www.google.com/maps?q=${form.latitude},${form.longitude}`,
                            })
                          }
                        >
                          Gerar pelas coordenadas
                        </button>
                      )}
                    </Label>
                    <div className="flex gap-1.5 mt-1">
                      <Input
                        value={form.link_maps ?? ""}
                        onChange={(e) => set({ link_maps: e.target.value })}
                        placeholder="https://maps.google.com/?q=-15.6543,-47.7891"
                        className="text-xs bg-background font-mono"
                      />
                      {form.link_maps?.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          asChild
                        >
                          <a href={form.link_maps.trim()} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" />
                            Abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fotos do Produto (no máximo 2 fotos) */}
            <ProdutoFotosUploader
              fotos={form.fotos}
              onChange={(f) => set({ fotos: f })}
              tituloProduto={form.nome || form.programa || undefined}
            />

            <div>
              <Label>Observação do produto</Label>
              <Textarea
                rows={3}
                value={form.observacao ?? ""}
                onChange={(e) => set({ observacao: e.target.value })}
                placeholder="Ex.: Material em alta definição, prazo de entrega, condições especiais…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quando este produto for adicionado a uma proposta ou PI, esta observação será
                incluída automaticamente no campo de observações.
              </p>
            </div>
            <div className="rounded-md border p-3 bg-muted/30 space-y-2">
              <div>
                <Label>Veiculação permitida no mapa de inserção</Label>
                <Select
                  value={form.veiculacao_tipo ?? "livre"}
                  onValueChange={(v) => set({ veiculacao_tipo: v as Produto["veiculacao_tipo"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="livre">Livre (qualquer dia)</SelectItem>
                    <SelectItem value="dias_uteis">Somente dias úteis (Seg–Sex)</SelectItem>
                    <SelectItem value="seg_sab">Segunda a sábado (Seg–Sáb)</SelectItem>
                    <SelectItem value="dias_semana">
                      Somente dias fixos da semana (ex.: toda quarta)
                    </SelectItem>
                    <SelectItem value="dias_fixos">Somente dias fixos do mês</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Ao selecionar este produto no PI/Proposta, o mapa de inserção só permitirá marcar
                  os dias permitidos.
                </p>
              </div>
              {form.veiculacao_tipo === "dias_semana" && (
                <div>
                  <Label className="text-xs">Dias da semana permitidos</Label>
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {[
                      { d: 0, label: "Dom" },
                      { d: 1, label: "Seg" },
                      { d: 2, label: "Ter" },
                      { d: 3, label: "Qua" },
                      { d: 4, label: "Qui" },
                      { d: 5, label: "Sex" },
                      { d: 6, label: "Sáb" },
                    ].map(({ d, label }) => {
                      const active = (form.dias_semana_fixos ?? []).includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const cur = new Set(form.dias_semana_fixos ?? []);
                            if (cur.has(d)) cur.delete(d);
                            else cur.add(d);
                            set({ dias_semana_fixos: Array.from(cur).sort((a, b) => a - b) });
                          }}
                          className={`h-8 rounded border text-[11px] font-medium ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Marque os dias da semana em que o programa vai ao ar.
                  </p>
                </div>
              )}
              {form.veiculacao_tipo === "dias_fixos" && (
                <div>
                  <Label className="text-xs">Dias fixos do mês</Label>
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const active = (form.dias_fixos ?? []).includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const cur = new Set(form.dias_fixos ?? []);
                            if (cur.has(d)) cur.delete(d);
                            else cur.add(d);
                            set({ dias_fixos: Array.from(cur).sort((a, b) => a - b) });
                          }}
                          className={`h-7 rounded border text-[11px] font-medium ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo ?? true} onCheckedChange={(v) => set({ ativo: v })} />
              <Label>Ativo</Label>
            </div>
            <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/30">
              <Switch
                id="requer_producao"
                checked={form.requer_producao ?? false}
                onCheckedChange={(v) => set({ requer_producao: v })}
              />
              <div className="space-y-0.5">
                <Label htmlFor="requer_producao" className="cursor-pointer">
                  Requer produção
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ao incluir este produto em um PI, o perfil <strong>Produção</strong> será
                  notificado automaticamente.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cadastrarMidiaModalOpen} onOpenChange={setCadastrarMidiaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Cadastrar Nova Mídia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome da Mídia *</Label>
              <Input
                placeholder="Ex.: Internet / Web, Revista, Cinema, Podcasts, Painel LED..."
                value={novaMidiaForm.nome}
                onChange={(e) => setNovaMidiaForm({ ...novaMidiaForm, nome: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Razão Social / Emissora Parceira (Opcional)</Label>
              <Input
                placeholder="Ex.: Empresa Brasil de Comunicação / Parceiro"
                value={novaMidiaForm.razao_social}
                onChange={(e) =>
                  setNovaMidiaForm({ ...novaMidiaForm, razao_social: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CNPJ (Opcional)</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={novaMidiaForm.cnpj}
                onChange={(e) =>
                  setNovaMidiaForm({ ...novaMidiaForm, cnpj: formatCNPJ(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setCadastrarMidiaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={salvandoNovaMidia || !novaMidiaForm.nome.trim()}
              onClick={handleCadastrarNovaMidia}
            >
              {salvandoNovaMidia ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Plus className="size-4 mr-2" />
              )}
              Cadastrar e Selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ParceiroFormDialog
        open={cadastrarParceiroModalOpen}
        onOpenChange={setCadastrarParceiroModalOpen}
        onSuccess={(parceiro) => {
          set({
            parceiro_id: parceiro.id,
            parceiro_cnpj: parceiro.cnpj || null,
            parceiro_nome: parceiro.nome_fantasia || parceiro.razao_social,
            comissao_inquilino_pct: parceiro.comissao_padrao_pct ?? 20.0,
          });
        }}
      />
    </>
  );
}
