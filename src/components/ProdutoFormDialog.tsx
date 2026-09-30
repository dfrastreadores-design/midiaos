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
} from "lucide-react";
import { toast } from "sonner";
import { upsertProduto, upsertProdutoTipo } from "@/lib/produtos.functions";
import { listEmissoras } from "@/lib/emissoras.functions";
import { listParceiros, type Parceiro } from "@/lib/parceiros.functions";
import { listMidiaConfig, upsertMidiaConfig } from "@/lib/midia-config.functions";
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

export type Midia = string;

export type Produto = {
  id: string;
  nome: string;
  midia: Midia;
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
  const todasMidias = Array.from(
    new Set(["TV", "Radio", "DOOH", ...(configs as any[]).map((c) => c.midia).filter(Boolean)]),
  ).sort();

  const listParceirosFn = useServerFn(listParceiros);
  const { data: emissoras = [] } = useQuery({
    queryKey: ["emissoras"],
    queryFn: () => fetchEmissorasFn(),
  });
  const { data: parceirosCadastrados = [] } = useQuery<Parceiro[]>({
    queryKey: ["parceiros"],
    queryFn: () => listParceirosFn(),
  });

  const [form, setForm] = useState<Partial<Produto>>({
    midia: "TV",
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

  useEffect(() => {
    if (open) {
      const init = initial || {
        midia: "TV",
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
      setForm({
        ...init,
        fotos: init.fotos || [],
      });
      const rawCep = init.cep || init.endereco_ponto?.match(/\b\d{5}-?\d{3}\b/)?.[0] || "";
      setCepInput(rawCep ? formatCEP(rawCep) : "");
    }
  }, [open, initial]);

  const set = (patch: Partial<Produto>) => setForm((prev) => ({ ...prev, ...patch }));

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
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="font-semibold text-xs flex items-center gap-1">
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
                  value={form.midia ?? "TV"}
                  onChange={(v) => set({ midia: v })}
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
                      set({ midia: v.trim() });
                      toast.success(`Mídia "${v.trim()}" cadastrada com sucesso!`);
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setCreatingMidia(false);
                    }
                  }}
                />
              </div>
              <div>
                <Label>Tipo do Produto</Label>
                {(() => {
                  const tiposOptions =
                    getTiposParaMidia && form.midia
                      ? getTiposParaMidia(form.midia)
                      : (sugestoes.tipos ?? []);
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
                    Origem do Produto & Parceiro de Mídia
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Selecione um parceiro cadastrado para vincular as condições comerciais ou
                    preencha manualmente.
                  </p>
                </div>
                {form.parceiro_id || form.parceiro_cnpj?.trim() ? (
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 text-[11px] py-0.5">
                    🤝 Produto de Parceiro
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px] py-0.5"
                  >
                    🏢 Próprio do Inquilino
                  </Badge>
                )}
              </div>

              {/* Seletor rápido de Parceiros Cadastrados */}
              <div>
                <Label className="text-xs font-medium">Vincular a Parceiro Cadastrado</Label>
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
                        set({
                          parceiro_id: sel.id,
                          parceiro_cnpj: sel.cnpj || null,
                          parceiro_nome: sel.nome_fantasia || sel.razao_social,
                          comissao_inquilino_pct: sel.comissao_padrao_pct ?? 20.0,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                    <SelectValue placeholder="Selecione um parceiro cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo" className="font-bold text-primary">
                      ✨ Cadastrar Novo Parceiro...
                    </SelectItem>
                    <SelectItem value="nenhum">🏢 Próprio do Inquilino (Sem Parceiro)</SelectItem>
                    {parceirosCadastrados.map((p) => (
                      <SelectItem key={p.id} value={p.id!}>
                        🤝 {p.nome_fantasia || p.razao_social}{" "}
                        {p.comissao_padrao_pct ? `(${p.comissao_padrao_pct}% remuneração)` : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value="outro">
                      ✍️ Outro Parceiro (Digitar CNPJ / Nome Manualmente)
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
              <Label>Nome do Produto *</Label>
              <Input
                required
                value={form.nome ?? ""}
                onChange={(e) => set({ nome: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>programa</Label>
                <CreatableCombobox
                  value={form.programa ?? ""}
                  onChange={(v) => set({ programa: v })}
                  options={sugestoes.programas}
                  placeholder="Selecione ou crie"
                />
              </div>
              <div>
                <Label>Formato</Label>
                <CreatableCombobox
                  value={form.formato ?? ""}
                  onChange={(v) => set({ formato: v })}
                  options={sugestoes.formatos}
                  placeholder="Selecione ou crie (30s, Página...)"
                />
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
                  <Label>Duração (s)</Label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={form.duracao_segundos ?? 30}
                    onChange={(e) => set({ duracao_segundos: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Ins. padrão</Label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={form.insercoes_padrao ?? 1}
                    onChange={(e) => set({ insercoes_padrao: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.valor_unit ?? 0}
                onChange={(e) => set({ valor_unit: Number(e.target.value) })}
              />
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
            {form.midia === "DOOH" && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-3">
                <div>
                  <Label className="text-sm">Rede de telas / ponto com múltiplas telas</Label>
                  <p className="text-xs text-muted-foreground">
                    Preencha se o ponto tem mais de uma tela (edifícios, gastronomia, bares,
                    academias, etc.).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Formato da tela</Label>
                    <Input
                      value={form.formato_tela ?? ""}
                      onChange={(e) => set({ formato_tela: e.target.value })}
                      placeholder="LED, LCD, Painel Digital, Outdoor…"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Resolução</Label>
                    <Input
                      value={form.resolucao ?? ""}
                      onChange={(e) => set({ resolucao: e.target.value })}
                      placeholder="Full HD, 4K, 1920x1080…"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tempo de exibição por inserção (s)</Label>
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
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Horas de operação/dia</Label>
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
                          className={`px-2 py-1 rounded border text-[11px] font-medium ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Detalhes de venda / observações técnicas</Label>
                  <Textarea
                    rows={3}
                    value={form.detalhes_venda ?? ""}
                    onChange={(e) => set({ detalhes_venda: e.target.value })}
                    placeholder="Ex.: 12 telas 55'' distribuídas em elevadores e recepção, exibição das 7h às 22h, 6 inserções/hora em loop de 10 min…"
                  />
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" />
                      Geolocalização do ponto (OOH/DOOH)
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Preencha o CEP ou endereço para localizar as coordenadas, ou posicione no mapa
                    para preencher o endereço automaticamente.
                  </p>
                </div>

                {/* CEP e Endereço */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="font-mono text-xs"
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
                        className="text-xs"
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

                {/* Latitude e Longitude */}
                <div className="grid grid-cols-2 gap-3">
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
                      className="font-mono text-xs"
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
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Ações rápidas de localização */}
                <div className="flex flex-wrap gap-2 items-center">
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
                      Puxar endereço pelas coordenadas
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
                    <span>
                      Clique no mapa ou arraste o marcador para preencher o endereço
                      automaticamente.
                    </span>
                    {form.latitude != null && form.longitude != null && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Fotos do Produto (no máximo 2 fotos) */}
            <ProdutoFotosUploader fotos={form.fotos} onChange={(f) => set({ fotos: f })} />

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
