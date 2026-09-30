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
import { Building2, Search, Loader2, DollarSign, Handshake, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  upsertParceiro,
  SEGMENTOS_MIDIA,
  MODELOS_REMUNERACAO,
  type Parceiro,
} from "@/lib/parceiros.functions";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { lookupCep, formatCEP } from "@/lib/geocode.functions";

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

  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [customSegmento, setCustomSegmento] = useState("");

  const [form, setForm] = useState<Partial<Parceiro>>({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
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
      setForm(
        initial || {
          razao_social: "",
          nome_fantasia: "",
          cnpj: "",
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
      toast.error(err.message || "Erro ao consultar CNPJ na Receita Federal.");
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
      toast.error(err.message || "Erro ao buscar CEP.");
    } finally {
      setSearchingCep(false);
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
    onError: (e: Error) => toast.error(e.message),
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
            if (!form.razao_social?.trim()) {
              toast.error("Informe a Razão Social do parceiro.");
              return;
            }
            saveMut.mutate(form);
          }}
          className="space-y-4 pt-2"
        >
          {/* Identificação e CNPJ */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Building2 className="size-3.5 text-primary" />
              Identificação & Receita Federal
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CNPJ</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj ?? ""}
                    onChange={(e) => set({ cnpj: formatCNPJ(e.target.value) })}
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

              <div className="sm:col-span-2">
                <Label className="text-xs">Razão Social *</Label>
                <Input
                  required
                  className="mt-1 text-xs"
                  placeholder="Nome empresarial completo da empresa parceira"
                  value={form.razao_social ?? ""}
                  onChange={(e) => set({ razao_social: e.target.value })}
                />
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
              <div>
                <Label className="text-xs">E-mail Comercial</Label>
                <Input
                  type="email"
                  className="mt-1 text-xs"
                  placeholder="comercial@parceiro.com.br"
                  value={form.contato_email ?? ""}
                  onChange={(e) => set({ contato_email: e.target.value })}
                />
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
