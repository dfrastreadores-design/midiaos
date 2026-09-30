import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Handshake,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Loader2,
  Send,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCampanhaRateio,
  salvarCampanhaRateio,
  gerarPisIndividuaisParceiros,
  atualizarStatusRepasse,
  calcularRateio,
  type CampanhaRateioItem,
  type CampanhaRateioResumo,
  type StatusRepasse,
} from "@/lib/campanha-rateio.functions";
import { listParceiros } from "@/lib/parceiros.functions";

interface Props {
  pi: { id: string; numero: string; campanha: string; valor_negociado: number };
  onClose: () => void;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function CampanhaRateioDialog({ pi, onClose }: Props) {
  const qc = useQueryClient();
  const getRateioFn = useServerFn(getCampanhaRateio);
  const saveRateioFn = useServerFn(salvarCampanhaRateio);
  const gerarPisFn = useServerFn(gerarPisIndividuaisParceiros);
  const statusRepasseFn = useServerFn(atualizarStatusRepasse);
  const listParceirosFn = useServerFn(listParceiros);

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros-list"],
    queryFn: () => listParceirosFn(),
  });

  const { data: resumo, isLoading } = useQuery<CampanhaRateioResumo>({
    queryKey: ["campanha-rateio", pi.id],
    queryFn: () => getRateioFn({ data: { piId: pi.id } }),
  });

  const [rateios, setRateios] = useState<CampanhaRateioItem[]>([]);
  const [novoParceiroId, setNovoParceiroId] = useState("");

  useEffect(() => {
    if (resumo?.rateios) {
      setRateios(resumo.rateios);
    }
  }, [resumo]);

  // Cálculos dinâmicos
  const totalComercializado = rateios.reduce((acc, r) => acc + (Number(r.valor_comercializado) || 0), 0);
  const totalComissao = rateios.reduce((acc, r) => acc + (Number(r.comissao_valor) || 0), 0);
  const totalRepasse = rateios.reduce((acc, r) => acc + (Number(r.repasse_valor) || 0), 0);
  const valorCampanha = Number(pi.valor_negociado) || 0;
  const diferenca = Math.abs(valorCampanha - totalComercializado);
  const fechou = diferenca < 0.05;

  function handleUpdateItem(idx: number, campo: "valor_comercializado" | "comissao_pct", valor: number) {
    setRateios((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx] };
      if (campo === "valor_comercializado") item.valor_comercializado = valor;
      if (campo === "comissao_pct") item.comissao_pct = valor;

      const { comissaoValor, repasseValor } = calcularRateio(item.valor_comercializado, item.comissao_pct);
      item.comissao_valor = comissaoValor;
      item.repasse_valor = repasseValor;
      copy[idx] = item;
      return copy;
    });
  }

  function handleAdicionarParceiro() {
    if (!novoParceiroId) return;
    const parc = parceiros.find((p: any) => p.id === novoParceiroId);
    if (!parc) return;

    const pct = Number(parc.comissao_padrao_pct) || 20;
    const vRestante = Math.max(0, valorCampanha - totalComercializado);
    const { comissaoValor, repasseValor } = calcularRateio(vRestante, pct);

    setRateios((prev) => [
      ...prev,
      {
        pi_id: pi.id,
        parceiro_id: parc.id,
        parceiro_nome: parc.nome_fantasia || parc.razao_social,
        parceiro_cnpj: parc.cnpj || "",
        parceiro_chave_pix: parc.chave_pix || "",
        valor_comercializado: vRestante,
        comissao_pct: pct,
        comissao_valor: comissaoValor,
        repasse_valor: repasseValor,
        status_repasse: "pendente",
      },
    ]);
    setNovoParceiroId("");
  }

  function handleRemoverParceiro(idx: number) {
    setRateios((prev) => prev.filter((_, i) => i !== idx));
  }

  const saveMut = useMutation({
    mutationFn: () =>
      saveRateioFn({
        data: {
          piId: pi.id,
          rateios: rateios.map((r) => ({
            id: r.id,
            parceiro_id: r.parceiro_id,
            valor_comercializado: r.valor_comercializado,
            comissao_pct: r.comissao_pct,
            status_repasse: r.status_repasse,
            data_previsao_repasse: r.data_previsao_repasse,
            observacoes: r.observacoes,
          })),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanha-rateio", pi.id] });
      qc.invalidateQueries({ queryKey: ["pis"] });
      toast.success("Rateio salvo com sucesso e totalizadores atualizados!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const gerarPisMut = useMutation({
    mutationFn: () => gerarPisFn({ data: { piMaeId: pi.id } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["pis"] });
      toast.success(`${res.quantidade} PIs individuais para parceiros foram geradas com sucesso!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusRepasseMut = useMutation({
    mutationFn: (vars: { rateioId: string; status: StatusRepasse }) =>
      statusRepasseFn({
        data: { rateioId: vars.rateioId, statusRepasse: vars.status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanha-rateio", pi.id] });
      toast.success("Status de repasse atualizado!");
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Handshake className="size-5 text-primary" />
            <DialogTitle>Rateio da Campanha & Repasse a Parceiros</DialogTitle>
          </div>
          <DialogDescription>
            Distribuição de valores e cálculo automático de comissão e repasse para cada veículo de mídia.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando rateio…
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs text-muted-foreground font-medium">Campanha Total</span>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatBRL(valorCampanha)}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs text-muted-foreground font-medium">Distribuído</span>
                <div className="text-lg font-bold text-blue-600">
                  {formatBRL(totalComercializado)}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Comissão Total</span>
                <div className="text-lg font-bold text-emerald-600">
                  {formatBRL(totalComissao)}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-slate-500/10">
                <span className="text-xs text-muted-foreground font-medium">Repasse Líquido</span>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {formatBRL(totalRepasse)}
                </div>
              </div>
            </div>

            {/* Alerta de Validação Matemática */}
            {!fechou && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  <strong>Atenção:</strong> A soma dos parceiros ({formatBRL(totalComercializado)}) diverge do total da campanha ({formatBRL(valorCampanha)}) em {formatBRL(diferenca)}. O fechamento deve ser exato.
                </span>
              </div>
            )}

            {/* Tabela de Parceiros */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo / Parceiro</TableHead>
                    <TableHead className="w-32">Comercializado (R$)</TableHead>
                    <TableHead className="w-24">Comissão %</TableHead>
                    <TableHead className="w-28 text-right">Comissão (R$)</TableHead>
                    <TableHead className="w-28 text-right">Repasse Líquido</TableHead>
                    <TableHead className="w-28 text-center">Status Repasse</TableHead>
                    <TableHead className="w-12 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                        Nenhum parceiro alocado neste rateio. Adicione os veículos abaixo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rateios.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-semibold text-sm">{r.parceiro_nome}</div>
                          {r.parceiro_cnpj && (
                            <div className="text-xs text-muted-foreground">CNPJ: {r.parceiro_cnpj}</div>
                          )}
                          {r.parceiro_chave_pix && (
                            <div className="text-xs text-emerald-600">PIX: {r.parceiro_chave_pix}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 text-xs font-semibold"
                            value={r.valor_comercializado || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, "valor_comercializado", Number(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={r.comissao_pct || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, "comissao_pct", Number(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-600">
                          {formatBRL(r.comissao_valor)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-800 dark:text-slate-100">
                          {formatBRL(r.repasse_valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.id ? (
                            <select
                              value={r.status_repasse}
                              onChange={(e) =>
                                statusRepasseMut.mutate({
                                  rateioId: r.id!,
                                  status: e.target.value as StatusRepasse,
                                })
                              }
                              className="text-xs rounded border p-1 bg-background"
                            >
                              <option value="pendente">Pendente</option>
                              <option value="aprovado">Aprovado</option>
                              <option value="pago">Pago</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {r.status_repasse}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoverParceiro(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Adicionar Parceiro */}
            <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-muted/30 rounded-lg border">
              <Label className="text-xs shrink-0 font-medium">Incluir Parceiro:</Label>
              <select
                value={novoParceiroId}
                onChange={(e) => setNovoParceiroId(e.target.value)}
                className="text-xs rounded-md border h-8 px-2 bg-background flex-1"
              >
                <option value="">Selecione um veículo ou parceiro de mídia...</option>
                {parceiros.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nome_fantasia || p.razao_social} (Comissão: {p.comissao_padrao_pct || 20}%)
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!novoParceiroId}
                onClick={handleAdicionarParceiro}
                className="gap-1 text-xs h-8"
              >
                <Plus className="size-3.5" />
                Adicionar ao Rateio
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => gerarPisMut.mutate()}
              disabled={gerarPisMut.isPending || rateios.length === 0}
              className="gap-1.5 text-xs"
              title="Cria automaticamente PIs individuais para cada veículo participante com seus repasses"
            >
              <Send className="size-3.5" />
              {gerarPisMut.isPending ? "Gerando PIs…" : "Gerar PIs para Parceiros"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !fechou}
              className="gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              {saveMut.isPending ? "Salvando…" : "Salvar Rateio"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
