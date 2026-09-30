import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  FORMAS_PAGAMENTO,
  upsertTransacaoFinanceira,
  type TransacaoFinanceira,
  type TipoTransacao,
  type StatusTransacao,
} from "@/lib/financeiro.functions";
import { listClientes } from "@/lib/clientes.functions";
import { listParceiros } from "@/lib/parceiros.functions";
import { listPis } from "@/lib/pi.functions";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Calendar, DollarSign, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<TransacaoFinanceira> | null;
  tipoPadrao?: TipoTransacao;
};

export function TransacaoFormDialog({ open, onOpenChange, initial, tipoPadrao = "saida" }: Props) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertTransacaoFinanceira);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(),
  });
  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros"],
    queryFn: () => listParceiros(),
  });
  const { data: pis = [] } = useQuery({ queryKey: ["pis-select"], queryFn: () => listPis() });

  const [form, setForm] = useState<Partial<TransacaoFinanceira>>({
    tipo: tipoPadrao,
    descricao: "",
    categoria: tipoPadrao === "entrada" ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_SAIDA[0],
    valor: 0,
    data_competencia: new Date().toISOString().split("T")[0],
    data_vencimento: new Date().toISOString().split("T")[0],
    data_pagamento: null,
    status: "pendente",
    forma_pagamento: "PIX",
    recorrente: false,
    observacoes: "",
    cliente_id: null,
    parceiro_id: null,
    pi_id: null,
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          ...initial,
          valor: Number(initial.valor || 0),
          tipo: initial.tipo || tipoPadrao,
        });
      } else {
        const today = new Date().toISOString().split("T")[0];
        setForm({
          tipo: tipoPadrao,
          descricao: "",
          categoria: tipoPadrao === "entrada" ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_SAIDA[0],
          valor: 0,
          data_competencia: today,
          data_vencimento: today,
          data_pagamento: null,
          status: "pendente",
          forma_pagamento: "PIX",
          recorrente: false,
          observacoes: "",
          cliente_id: null,
          parceiro_id: null,
          pi_id: null,
        });
      }
    }
  }, [open, initial, tipoPadrao]);

  const set = (patch: Partial<TransacaoFinanceira>) => setForm((prev) => ({ ...prev, ...patch }));

  const saveMut = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["dicas_financeiras"] });
      toast.success(
        form.tipo === "entrada"
          ? "Receita/Entrada registrada com sucesso!"
          : "Despesa/Saída registrada com sucesso!",
      );
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar lançamento financeiro."),
  });

  const categorias = form.tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                form.tipo === "entrada"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {form.tipo === "entrada" ? (
                <ArrowUpCircle className="size-5" />
              ) : (
                <ArrowDownCircle className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle>
                {form.id
                  ? "Editar Lançamento Financeiro"
                  : form.tipo === "entrada"
                    ? "Nova Entrada (Receita)"
                    : "Nova Saída (Despesa)"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.descricao?.trim()) return toast.error("Informe a descrição");
            if (!form.valor || form.valor <= 0)
              return toast.error("Informe um valor maior que zero");
            saveMut.mutate(form);
          }}
          className="space-y-4 pt-1"
        >
          {/* Seletor Tipo: Entrada / Saída */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border">
            <button
              type="button"
              onClick={() => {
                set({
                  tipo: "entrada",
                  categoria: CATEGORIAS_ENTRADA[0],
                });
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                form.tipo === "entrada"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpCircle className="size-4" />
              Entrada / Receita
            </button>
            <button
              type="button"
              onClick={() => {
                set({
                  tipo: "saida",
                  categoria: CATEGORIAS_SAIDA[0],
                });
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                form.tipo === "saida"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownCircle className="size-4" />
              Saída / Despesa
            </button>
          </div>

          {/* Descrição e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label>Descrição do Lançamento *</Label>
              <Input
                required
                placeholder={
                  form.tipo === "entrada"
                    ? "Ex.: Pagamento PI 2026/042, Projeto Verão..."
                    : "Ex.: Comissão Executivo, Aluguel Antena, Licença..."
                }
                value={form.descricao ?? ""}
                onChange={(e) => set({ descricao: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={form.valor ? form.valor : ""}
                onChange={(e) => set({ valor: e.target.value ? Number(e.target.value) : 0 })}
                className="font-mono font-semibold"
              />
            </div>
          </div>

          {/* Categoria e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria *</Label>
              <Select
                value={form.categoria ?? categorias[0]}
                onValueChange={(v) => set({ categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select
                value={form.forma_pagamento ?? "PIX"}
                onValueChange={(v) => set({ forma_pagamento: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas: Competência, Vencimento e Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Competência</Label>
              <Input
                type="date"
                value={form.data_competencia ?? ""}
                onChange={(e) => set({ data_competencia: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Data de Vencimento *</Label>
              <Input
                type="date"
                required
                value={form.data_vencimento ?? ""}
                onChange={(e) => set({ data_vencimento: e.target.value })}
                className="text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Data de Pagamento</Label>
              <Input
                type="date"
                value={form.data_pagamento ?? ""}
                onChange={(e) => {
                  const val = e.target.value || null;
                  set({
                    data_pagamento: val,
                    status: val ? "pago" : form.status === "pago" ? "pendente" : form.status,
                  });
                }}
                className="text-xs"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Status do Pagamento</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  s: "pendente",
                  label: "Pendente",
                  color: "border-amber-500/40 text-amber-700 bg-amber-50/50",
                },
                {
                  s: "pago",
                  label: "Pago / Liquidado",
                  color: "border-emerald-500/40 text-emerald-700 bg-emerald-50/50",
                },
                {
                  s: "agendado",
                  label: "Agendado",
                  color: "border-blue-500/40 text-blue-700 bg-blue-50/50",
                },
                {
                  s: "cancelado",
                  label: "Cancelado",
                  color: "border-slate-300 text-slate-500 bg-slate-50",
                },
              ].map(({ s, label, color }) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const st = s as StatusTransacao;
                    const patch: Partial<TransacaoFinanceira> = { status: st };

                    if (st === "pago" && !form.data_pagamento) {
                      patch.data_pagamento = new Date().toISOString().split("T")[0];
                    }
                    set(patch);
                  }}
                  className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                    form.status === s
                      ? `${color} ring-2 ring-primary/30 font-bold shadow-sm`
                      : "border-muted hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Vínculos Opcionais (Cliente, Parceiro, PI) */}
          <div className="rounded-xl border p-3 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Vínculos Opcionais (Controle e Rastreabilidade)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cliente / Anunciante</Label>
                <Select
                  value={form.cliente_id ?? "nenhum"}
                  onValueChange={(v) => set({ cliente_id: v === "nenhum" ? null : v })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Sem vínculo de cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">— Nenhum —</SelectItem>
                    {clientes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_fantasia || c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Parceiro Comercial</Label>
                <Select
                  value={form.parceiro_id ?? "nenhum"}
                  onValueChange={(v) => set({ parceiro_id: v === "nenhum" ? null : v })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Sem vínculo de parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">— Nenhum —</SelectItem>
                    {parceiros.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_fantasia || p.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-muted">
              <Label className="text-xs flex items-center gap-2">
                Nota Fiscal / Documento Comprobatório (URL)
              </Label>
              <Input
                placeholder="Ex.: https://link-para-a-nota-fiscal.pdf"
                value={form.comprovante_url ?? ""}
                onChange={(e) => {
                  set({ comprovante_url: e.target.value });
                }}
                className="text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                Cole o link da Nota Fiscal ou do documento comprobatório emitido pelo Parceiro.
              </p>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-xs">Observações adicionais</Label>
            <Textarea
              rows={2}
              placeholder="Ex.: Dados bancários, chave PIX, notas de liquidação..."
              value={form.observacoes ?? ""}
              onChange={(e) => set({ observacoes: e.target.value })}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMut.isPending}
              className={
                form.tipo === "entrada"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }
            >
              {saveMut.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar Lançamento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
