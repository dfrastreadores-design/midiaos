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
  Building2,
  Search,
  Loader2,
  DollarSign,
  Handshake,
  Plus,
  X,
  Globe,
  Instagram,
  Linkedin,
  Facebook,
  AlertCircle,
  Sparkles,
  Upload,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoImg } from "@/components/LogoImg";
import { TIPOS_VEICULO_LIST, STATUS_PARTNER_CONFIG } from "@/types/representacao-comercial.types";
import {
  upsertParceiro,
  SEGMENTOS_MIDIA,
  MODELOS_REMUNERACAO,
  type Parceiro,
} from "@/lib/parceiros.functions";
import { enriquecerParceiroPorUrl } from "@/lib/parceiro-scraper.functions";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { lookupCep, formatCEP } from "@/lib/geocode.functions";
import { traduzirErro } from "@/lib/error-translator";
import {
  FormFieldError,
  errorLabelClass,
  errorInputClass,
  scrollToFirstError,
} from "@/lib/form-errors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<Parceiro> | null;
  onSuccess?: (parceiro: Parceiro) => void;
};

export function ParceiroFormDialog({ open, onOpenChange, initial, onSuccess }: Props) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertParceiro);
  const lookupCepFn = useServerFn(lookupCep);
  const enriquecerFn = useServerFn(enriquecerParceiroPorUrl);

  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [customSegmento, setCustomSegmento] = useState("");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [wasValidated, setWasValidated] = useState(false);

  const [form, setForm] = useState<Partial<Parceiro>>({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    logo_url: "",
    tipo_veiculo: "Painel OOH/DOOH",
    status: "ativo",
    comissao_padrao_percentual: 20.0,
    site: "",
    instagram: "",
    linkedin: "",
    facebook: "",
    segmentos: [],
    modelo_remuneracao: "comissao_percentual",
    comissao_padrao_pct: 20.0,
    prazo_repasse: "30 dias após emissão da fatura",
    condicoes_comerciais: "",
    contato_nome: "",
    contato_email: "",
    contato_telefone: "",
    chave_pix: "",
    dados_bancarios: "",
    endereco: "",
    cidade: "",
    uf: "",
    cep: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (open) {
      setErrors({});
      setWasValidated(false);
      setForm(
        initial
          ? {
              ...initial,
              logo_url: initial.logo_url ?? "",
              tipo_veiculo: initial.tipo_veiculo ?? "Painel OOH/DOOH",
              status: initial.status ?? (initial.ativo === false ? "inativo" : "ativo"),
              comissao_padrao_percentual:
                initial.comissao_padrao_percentual ?? initial.comissao_padrao_pct ?? 20.0,
              comissao_padrao_pct:
                initial.comissao_padrao_pct ?? initial.comissao_padrao_percentual ?? 20.0,
            }
          : {
              razao_social: "",
              nome_fantasia: "",
              cnpj: "",
              logo_url: "",
              tipo_veiculo: "Painel OOH/DOOH",
              status: "ativo",
              comissao_padrao_percentual: 20.0,
              site: "",
              instagram: "",
              linkedin: "",
              facebook: "",
              segmentos: [],
              modelo_remuneracao: "comissao_percentual",
              comissao_padrao_pct: 20.0,
              prazo_repasse: "30 dias após emissão da fatura",
              condicoes_comerciais: "",
              contato_nome: "",
              contato_email: "",
              contato_telefone: "",
              chave_pix: "",
              dados_bancarios: "",
              endereco: "",
              cidade: "",
              uf: "",
              cep: "",
              observacoes: "",
              ativo: true,
            },
      );
      setCustomSegmento("");
    }
  }, [open, initial]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo de logo deve ter no máximo 5MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `partner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      let bucket = "partner-logos";
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
      set({ logo_url: url });
      toast.success("Logomarca do veículo parceiro enviada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro no upload: ${err?.message || "Tente novamente"}`);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const set = (patch: Partial<Parceiro>) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleSegmento = (seg: string) => {
    const cur = new Set(form.segmentos ?? []);
    if (cur.has(seg)) cur.delete(seg);
    else cur.add(seg);
    set({ segmentos: Array.from(cur) });
  };

  const addCustomSegmento = () => {
    const val = customSegmento.trim();
    if (!val) return;
    const cur = new Set(form.segmentos ?? []);
    cur.add(val);
    set({ segmentos: Array.from(cur) });
    setCustomSegmento("");
  };

  const handleBuscarCnpj = async () => {
    const raw = form.cnpj || "";
    const digits = onlyDigits(raw);
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    setSearchingCnpj(true);
    try {
      const data = await fetchCnpj(digits);
      set({
        cnpj: formatCNPJ(digits),
        razao_social: data.razaoSocial || form.razao_social,
        nome_fantasia: data.nomeFantasia || form.nome_fantasia || data.razaoSocial,
        contato_email: data.email || form.contato_email,
        contato_telefone: data.telefone || form.contato_telefone,
        endereco: [data.logradouro, data.numero, data.bairro].filter(Boolean).join(", "),
        cidade: data.cidade || form.cidade,
        uf: data.estado || form.uf,
        cep: data.cep ? formatCEP(data.cep) : form.cep,
      });
      toast.success("Dados da empresa carregados da Receita Federal!");
    } catch (err: any) {
      toast.error(traduzirErro(err) || "Erro ao consultar CNPJ na Receita Federal.");
    } finally {
      setSearchingCnpj(false);
    }
  };

  const handleBuscarCep = async () => {
    const digits = onlyDigits(form.cep || "");
    if (digits.length !== 8) {
      toast.error("Informe um CEP com 8 dígitos.");
      return;
    }
    setSearchingCep(true);
    try {
      const res = await lookupCepFn({ data: { cep: digits } });
      if (res.ok) {
        set({
          cep: res.cep,
          endereco: [res.logradouro, res.bairro].filter(Boolean).join(" — "),
          cidade: res.cidade,
          uf: res.uf,
        });
        toast.success("Endereço carregado pelo CEP!");
      } else {
        toast.error(res.error || "CEP não encontrado.");
      }
    } catch (err: any) {
      toast.error(traduzirErro(err) || "Erro ao buscar CEP.");
    } finally {
      setSearchingCep(false);
    }
  };

  const handleEnriquecerPorSiteRedes = async () => {
    if (!form.site && !form.instagram) {
      toast.warning("Informe o Site Oficial ou Instagram do parceiro para pesquisar.");
      return;
    }
    setEnriching(true);
    try {
      const res = await enriquecerFn({
        data: {
          siteUrl: form.site || undefined,
          instagram: form.instagram || undefined,
          nomeParceiro: form.nome_fantasia || form.razao_social || undefined,
        },
      });

      if (res.sucesso) {
        setForm((prev) => {
          const patch: Partial<Parceiro> = {};
          if (res.nome_fantasia && !prev.nome_fantasia) patch.nome_fantasia = res.nome_fantasia;
          if (res.razao_social && !prev.razao_social) patch.razao_social = res.razao_social;
          if (res.cnpj && !prev.cnpj) patch.cnpj = res.cnpj;
          if (res.telefone && !prev.contato_telefone) patch.contato_telefone = res.telefone;
          if (res.email && !prev.contato_email) patch.contato_email = res.email;
          if (res.site && !prev.site) patch.site = res.site;
          if (res.instagram && !prev.instagram) patch.instagram = res.instagram;
          if (res.linkedin && !prev.linkedin) patch.linkedin = res.linkedin;
          if (res.facebook && !prev.facebook) patch.facebook = res.facebook;
          if (res.cidade && !prev.cidade) patch.cidade = res.cidade;
          if (res.uf && !prev.uf) patch.uf = res.uf;
          if (res.endereco && !prev.endereco) patch.endereco = res.endereco;

          if (Array.isArray(res.segmentos) && res.segmentos.length > 0) {
            const currentSegs = new Set(prev.segmentos || []);
            res.segmentos.forEach((s) => currentSegs.add(s));
            patch.segmentos = Array.from(currentSegs);
          }

          if (res.descricao || (res.particularidades && res.particularidades.length > 0)) {
            const partText = res.particularidades?.length
              ? `\nParticularidades de Mídia: ${res.particularidades.join("; ")}`
              : "";
            if (!prev.observacoes) {
              patch.observacoes = `${res.descricao || ""}${partText}`.trim();
            }
          }

          return { ...prev, ...patch };
        });

        toast.success("Dados do parceiro, contatos e particularidades capturados com sucesso!");
      }
    } catch (err: any) {
      toast.error(`Erro ao capturar dados: ${err?.message || "Falha na leitura"}`);
    } finally {
      setEnriching(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["parceiros"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(
        form.id ? "Parceiro atualizado com sucesso" : "Parceiro cadastrado com sucesso",
      );
      onOpenChange(false);
      if (onSuccess) onSuccess(saved);
    },
    onError: (e: Error) => {
      toast.error(traduzirErro(e));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="size-5 text-primary" />
            {form.id ? "Editar Parceiro de Mídia" : "Novo Parceiro de Mídia"}
          </DialogTitle>
          <DialogDescription>
            Cadastre os veículos, exibidores e proprietários de pontos que disponibilizam inventário
            para comercialização.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const errs: Record<string, string> = {};
            if (!form.razao_social?.trim()) {
              errs.razao_social = "Informe a Razão Social do parceiro.";
            }
            if (form.cnpj?.trim()) {
              const digits = onlyDigits(form.cnpj);
              if (digits.length > 0 && digits.length !== 14) {
                errs.cnpj = "CNPJ incompleto (deve conter 14 dígitos).";
              }
            }
            if (form.contato_email?.trim()) {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contato_email.trim())) {
                errs.contato_email = "Formato de e-mail inválido.";
              }
            }

            if (Object.keys(errs).length > 0) {
              setErrors(errs);
              setWasValidated(true);
              toast.error("Por favor, preencha os campos obrigatórios destacados em vermelho.");
              scrollToFirstError(errs);
              return;
            }

            setErrors({});
            saveMut.mutate(form);
          }}
          className={`space-y-4 pt-2 ${wasValidated ? "was-validated" : ""}`}
        >

          {/* Logomarca do Veículo Parceiro */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <ImageIcon className="size-3.5 text-primary" />
              Logomarca do Veículo / Exibidor Parceiro
            </Label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="size-20 rounded-xl border border-dashed border-border bg-background flex items-center justify-center overflow-hidden shrink-0 relative group shadow-xs">
                {form.logo_url ? (
                  <div className="size-full flex items-center justify-center p-1.5 bg-white">
                    <LogoImg
                      stored={form.logo_url}
                      alt={form.nome_fantasia || form.razao_social || "Logo"}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center p-2 text-muted-foreground">
                    <Building2 className="size-7 mx-auto opacity-40 mb-1" />
                    <span className="text-[10px] block font-medium">Sem logo</span>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <label
                    htmlFor="logo-partner-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Upload className="size-3.5" />
                    {uploadingLogo ? "Enviando..." : form.logo_url ? "Alterar Logomarca" : "Enviar Logomarca"}
                  </label>
                  <input
                    id="logo-partner-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={handleUploadLogo}
                  />

                  {form.logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                      onClick={() => set({ logo_url: "" })}
                    >
                      <Trash2 className="size-3.5" />
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, WebP ou SVG (máx. 5MB). A logomarca será exibida nos cards, no catálogo e nas propostas comerciais enviadas aos anunciantes.
                </p>
              </div>
            </div>
          </div>

          {/* Identificação e CNPJ */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Building2 className="size-3.5 text-primary" />
              Identificação & Receita Federal
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div data-field="cnpj">
                <Label htmlFor="parceiro-cnpj" className={errorLabelClass(!!errors.cnpj, "text-xs")}>
                  CNPJ
                </Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    id="parceiro-cnpj"
                    name="cnpj"
                    error={errors.cnpj}
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj ?? ""}
                    onChange={(e) => {
                      set({ cnpj: formatCNPJ(e.target.value) });
                      if (errors.cnpj) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.cnpj;
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBuscarCnpj();
                      }
                    }}
                    className="font-mono text-xs"
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
                <FormFieldError message={errors.cnpj} />
              </div>

              <div>
                <Label className="text-xs">Nome Fantasia / Nome Comercial</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Grupo OOH / Mídia Painéis"
                  value={form.nome_fantasia ?? ""}
                  onChange={(e) => set({ nome_fantasia: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2" data-field="razao_social">
                <Label
                  htmlFor="parceiro-razao-social"
                  className={errorLabelClass(!!errors.razao_social, "text-xs")}
                >
                  Razão Social *
                </Label>
                <Input
                  id="parceiro-razao-social"
                  name="razao_social"
                  required
                  error={errors.razao_social}
                  className="mt-1 text-xs"
                  placeholder="Nome empresarial completo da empresa parceira"
                  value={form.razao_social ?? ""}
                  onChange={(e) => {
                    set({ razao_social: e.target.value });
                    if (errors.razao_social) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.razao_social;
                        return next;
                      });
                    }
                  }}
                />
                <FormFieldError message={errors.razao_social} />
              </div>

              <div>
                <Label className="text-xs font-medium">Tipo de Veículo / Mídia Principal *</Label>
                <Select
                  value={form.tipo_veiculo || "Painel OOH/DOOH"}
                  onValueChange={(v) => set({ tipo_veiculo: v })}
                >
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_VEICULO_LIST.map((tipo) => (
                      <SelectItem key={tipo} value={tipo} className="text-xs">
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium">Status da Parceria</Label>
                <Select
                  value={(form.status as any) || (form.ativo ? "ativo" : "inativo")}
                  onValueChange={(v) => set({ status: v as any, ativo: v === "ativo" })}
                >
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo" className="text-xs text-emerald-600 font-medium">
                      ● Ativo (Inventário disponível)
                    </SelectItem>
                    <SelectItem value="em_negociacao" className="text-xs text-amber-600 font-medium">
                      ● Em Negociação (Contrato pendente)
                    </SelectItem>
                    <SelectItem value="inativo" className="text-xs text-slate-500 font-medium">
                      ● Inativo (Pausado temporariamente)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Segmentos de Mídia Comercializados */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Itens & Segmentos de Mídia Comercializados
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {(form.segmentos ?? []).length} selecionado(s)
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Selecione os tipos de mídia e pontos que este parceiro fornece para você
              comercializar:
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1 max-h-40 overflow-y-auto pr-1">
              {SEGMENTOS_MIDIA.map((seg) => {
                const active = (form.segmentos ?? []).includes(seg);
                return (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleSegmento(seg)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background/80 hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {seg}
                  </button>
                );
              })}

              {(form.segmentos ?? [])
                .filter((s) => !SEGMENTOS_MIDIA.includes(s as any))
                .map((seg) => (
                  <span
                    key={seg}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 text-white text-[11px] font-medium"
                  >
                    {seg}
                    <button
                      type="button"
                      onClick={() => toggleSegmento(seg)}
                      className="hover:text-red-200"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
            </div>

            <div className="flex gap-1.5 pt-1.5">
              <Input
                placeholder="Outro segmento de mídia (ex: Totens em Aeroportos, Empenas, etc.)"
                value={customSegmento}
                onChange={(e) => setCustomSegmento(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSegmento();
                  }
                }}
                className="text-xs h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0 gap-1"
                onClick={addCustomSegmento}
              >
                <Plus className="size-3.5" /> Adicionar
              </Button>
            </div>
          </div>

          {/* Acordo Comercial & Remuneração do Inquilino */}
          <div className="rounded-xl border p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                <DollarSign className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Remuneração do Inquilino & Condições Comerciais
              </Label>
              <Badge className="bg-emerald-600 text-white text-[10px]">
                {form.comissao_padrao_pct ?? 20}% de comissão
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Modelo de Remuneração</Label>
                <Select
                  value={form.modelo_remuneracao ?? "comissao_percentual"}
                  onValueChange={(v) => set({ modelo_remuneracao: v })}
                >
                  <SelectTrigger className="mt-1 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS_REMUNERACAO.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Comissão do Inquilino (%)
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    required
                    value={form.comissao_padrao_pct ?? 20}
                    onChange={(e) => set({ comissao_padrao_pct: Number(e.target.value) })}
                    className="font-mono text-xs pr-7 bg-background"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-muted-foreground font-semibold">
                    %
                  </span>
                </div>
              </div>

              <div className="sm:col-span-3">
                <Label className="text-xs">Prazo e Condições de Repasse / Pagamento</Label>
                <Input
                  placeholder="Ex: 30 dias após veiculação / Pagamento quinzenal / Repasse após liquidação do cliente"
                  value={form.prazo_repasse ?? ""}
                  onChange={(e) => set({ prazo_repasse: e.target.value })}
                  className="mt-1 text-xs bg-background"
                />
              </div>

              <div className="sm:col-span-3">
                <Label className="text-xs">Regras Comerciais / Acordo Contratual</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Exclusividade na praça DF; desconto máximo de 10% permitido sem aprovação prévia; bonificação de 10% em campanhas acima de R$ 50k..."
                  value={form.condicoes_comerciais ?? ""}
                  onChange={(e) => set({ condicoes_comerciais: e.target.value })}
                  className="mt-1 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Contato & Dados Financeiros do Parceiro */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contato & Repasse Financeiro
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Responsável / Comercial</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Nome do contato"
                  value={form.contato_nome ?? ""}
                  onChange={(e) => set({ contato_nome: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Telefone / WhatsApp</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="(00) 00000-0000"
                  value={form.contato_telefone ?? ""}
                  onChange={(e) => set({ contato_telefone: e.target.value })}
                />
              </div>
              <div data-field="contato_email">
                <Label
                  htmlFor="parceiro-contato-email"
                  className={errorLabelClass(!!errors.contato_email, "text-xs")}
                >
                  E-mail Comercial
                </Label>
                <Input
                  id="parceiro-contato-email"
                  name="contato_email"
                  type="email"
                  className="mt-1 text-xs"
                  placeholder="comercial@parceiro.com.br"
                  value={form.contato_email ?? ""}
                  error={errors.contato_email}
                  onChange={(e) => {
                    set({ contato_email: e.target.value });
                    if (errors.contato_email) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.contato_email;
                        return next;
                      });
                    }
                  }}
                />
                <FormFieldError message={errors.contato_email} />
              </div>

              <div className="sm:col-span-1">
                <Label className="text-xs">Chave PIX para Repasse</Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="CNPJ, E-mail, Celular..."
                  value={form.chave_pix ?? ""}
                  onChange={(e) => set({ chave_pix: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Dados Bancários (opcional)</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Banco, Agência, Conta Corrente..."
                  value={form.dados_bancarios ?? ""}
                  onChange={(e) => set({ dados_bancarios: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Website & Redes Sociais do Parceiro (Opcional) */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <Globe className="size-3.5 text-primary" />
                Website & Redes Sociais
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enriching || (!form.site && !form.instagram)}
                onClick={handleEnriquecerPorSiteRedes}
                className="h-7 text-[11px] gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                title="Rastrear site e redes do parceiro com IA para extrair dados cadastrais, particularidades e produtos"
              >
                {enriching ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3 text-purple-600" />
                )}
                Capturar Dados do Site & Redes (IA)
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Site Oficial / Portal</Label>
                <div className="relative mt-1">
                  <Globe className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 text-xs"
                    placeholder="https://www.parceiro.com.br"
                    value={form.site ?? ""}
                    onChange={(e) => set({ site: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Instagram</Label>
                <div className="relative mt-1">
                  <Instagram className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-pink-600" />
                  <Input
                    className="pl-9 text-xs"
                    placeholder="@parceiro ou link do perfil"
                    value={form.instagram ?? ""}
                    onChange={(e) => set({ instagram: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">LinkedIn</Label>
                <div className="relative mt-1">
                  <Linkedin className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <Input
                    className="pl-9 text-xs"
                    placeholder="linkedin.com/company/parceiro"
                    value={form.linkedin ?? ""}
                    onChange={(e) => set({ linkedin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Facebook</Label>
                <div className="relative mt-1">
                  <Facebook className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-700" />
                  <Input
                    className="pl-9 text-xs"
                    placeholder="facebook.com/parceiro"
                    value={form.facebook ?? ""}
                    onChange={(e) => set({ facebook: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço / Localização da Sede */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Endereço da Sede do Parceiro
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">CEP</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    className="text-xs font-mono"
                    placeholder="00000-000"
                    value={form.cep ?? ""}
                    onChange={(e) => set({ cep: formatCEP(e.target.value) })}
                    onBlur={handleBuscarCep}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 px-2 text-xs"
                    disabled={searchingCep}
                    onClick={handleBuscarCep}
                  >
                    {searchingCep ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Search className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Logradouro e Número</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Av. das Nações, 100 — Sala 501"
                  value={form.endereco ?? ""}
                  onChange={(e) => set({ endereco: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Cidade</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Brasília / São Paulo..."
                  value={form.cidade ?? ""}
                  onChange={(e) => set({ cidade: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Input
                  className="mt-1 text-xs uppercase"
                  maxLength={2}
                  placeholder="DF"
                  value={form.uf ?? ""}
                  onChange={(e) => set({ uf: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>

          {/* Observações e Ativo */}
          <div className="space-y-2">
            <Label className="text-xs">Observações Internas</Label>
            <Textarea
              rows={2}
              placeholder="Anotações internas sobre o histórico de parceria, contatos secundários, etc."
              value={form.observacoes ?? ""}
              onChange={(e) => set({ observacoes: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Switch
              id="parceiro-ativo"
              checked={form.ativo ?? true}
              onCheckedChange={(v) => set({ ativo: v })}
            />
            <Label htmlFor="parceiro-ativo" className="text-xs font-medium cursor-pointer">
              Parceiro Ativo (produtos disponíveis no catálogo para comercialização)
            </Label>
          </div>


          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMut.isPending} className="gap-2">
              {saveMut.isPending && <Loader2 className="size-4 animate-spin" />}
              {form.id ? "Salvar Alterações" : "Cadastrar Parceiro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
