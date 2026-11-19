// Component: PiPainelFinanceiro.tsx
// Painel Financeiro e Esteira de Liquidação Bimodal do Pedido de Inserção (PI)

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  InsertionOrder,
  PiSettlement,
  BILLING_TYPE_METADATA,
  SETTLEMENT_STATUS_METADATA,
  SETTLEMENT_TYPE_LABELS,
} from "@/types/insertion-orders.types";
import {
  emitirFaturamentoDossie,
  registrarPagamentoCliente,
  confirmarLiquidacaoRepasse,
} from "@/lib/insertion-orders.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickDateInput } from "@/components/ui/quick-date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  Building2,
  FileText,
  Lock,
  Unlock,
  CreditCard,
  Send,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  pi: InsertionOrder;
  onRefresh?: () => void;
  onOpenDossier?: () => void;
}

function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

export function PiPainelFinanceiro({ pi, onRefresh, onOpenDossier }: Props) {
  const qc = useQueryClient();

  const emitirFatFn = useServerFn(emitirFaturamentoDossie);
  const registrarPagamentoFn = useServerFn(registrarPagamentoCliente);
  const confirmarLiquidacaoFn = useServerFn(confirmarLiquidacaoRepasse);

  // Estados de diálogo
  const [faturamentoModalOpen, setFaturamentoModalOpen] = useState<boolean>(false);
  const [pagamentoClienteModalOpen, setPagamentoClienteModalOpen] = useState<boolean>(false);
  const [liquidarRepasseModalOpen, setLiquidarRepasseModalOpen] = useState<boolean>(false);
  const [selectedSettlement, setSelectedSettlement] = useState<PiSettlement | null>(null);

  // Estados de loading
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // Form de Faturamento
  const [faturamentoForm, setFaturamentoForm] = useState<{
    invoice_number: string;
    invoice_url: string;
    vehicle_invoice_number: string;
    vehicle_invoice_url: string;
  }>({
    invoice_number: pi.invoice_number || "",
    invoice_url: pi.invoice_url || "",
    vehicle_invoice_number: pi.vehicle_invoice_number || "",
    vehicle_invoice_url: pi.vehicle_invoice_url || "",
  });

  // Form de Pagamento do Cliente
  const [pagamentoClienteForm, setPagamentoClienteForm] = useState<{
    receipt_url: string;
    payment_method: string;
    paid_date: string;
  }>({
    receipt_url: "",
    payment_method: "PIX",
    paid_date: new Date().toISOString().split("T")[0],
  });

  // Form de Liquidação / Repasse
  const [repasseForm, setRepasseForm] = useState<{
    receipt_url: string;
    payment_method: string;
  }>({
    receipt_url: "",
    payment_method: "PIX / Transferência Bancária",
  });

  const settlements = useMemo(() => pi.settlements || [], [pi.settlements]);
  const isCheckingApproved = pi.checking_status === "approved";

  // Determinar o progresso na esteira operacional
  const esteiraEtapas = useMemo(() => {
    // 0: Veiculação
    // 1: Checking Aprovado
    // 2: Cobrança Cliente
    // 3: Repasses / Splits
    const isBroadcast = ["in_broadcast", "awaiting_checking", "checking_approved", "billed", "paid_by_client", "settled"].includes(pi.status);
    const isCheckingValid = isCheckingApproved || ["checking_approved", "billed", "paid_by_client", "settled"].includes(pi.status);
    const isBilled = ["billed", "paid_by_client", "settled"].includes(pi.status);
    const isSettled = pi.status === "settled";

    return [
      {
        id: "veiculacao",
        label: "1. Veiculação",
        desc: "Exibição nas mídias",
        active: isBroadcast,
        completed: isCheckingValid,
      },
      {
        id: "checking",
        label: "2. Checking Aprovado",
        desc: "Auditoria pericial 100%",
        active: isCheckingValid,
        completed: isBilled,
      },
      {
        id: "cobranca",
        label: "3. Cobrança Cliente",
        desc: pi.billing_type === "REPRESENTATIVE_BILLING" ? "NF Representante" : "Fatura Direta Veículo",
        active: isBilled,
        completed: ["paid_by_client", "settled"].includes(pi.status),
      },
      {
        id: "repasses",
        label: "4. Repasses / Splits",
        desc: pi.billing_type === "REPRESENTATIVE_BILLING" ? "Saldo aos Veículos" : "Comissão do Representante",
        active: ["paid_by_client", "settled"].includes(pi.status),
        completed: isSettled,
      },
    ];
  }, [pi.status, isCheckingApproved, pi.billing_type]);

  // Handler: Emitir Faturamento e Dossiê
  const handleConfirmarFaturamento = useCallback(async () => {
    if (!isCheckingApproved) {
      toast.error("Trava Universal: Faturamento bloqueado sem aprovação de checking!");
      return;
    }

    try {
      setLoadingAction(true);
      await emitirFatFn({
        data: {
          pi_id: pi.id,
          invoice_number: faturamentoForm.invoice_number || undefined,
          invoice_url: faturamentoForm.invoice_url || undefined,
          vehicle_invoice_number: faturamentoForm.vehicle_invoice_number || undefined,
          vehicle_invoice_url: faturamentoForm.vehicle_invoice_url || undefined,
        },
      });
      toast.success("Faturamento emitido e Dossiê liberado para o anunciante!");
      setFaturamentoModalOpen(false);
      if (onRefresh) onRefresh();
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(`Erro ao faturar: ${err?.message}`);
    } finally {
      setLoadingAction(false);
    }
  }, [isCheckingApproved, faturamentoForm, emitirFatFn, pi.id, onRefresh, qc]);

  // Handler: Registrar Pagamento do Cliente
  const handleConfirmarPagamentoCliente = useCallback(async () => {
    try {
      setLoadingAction(true);
      await registrarPagamentoFn({
        data: {
          pi_id: pi.id,
          receipt_url: pagamentoClienteForm.receipt_url || undefined,
          payment_method: pagamentoClienteForm.payment_method,
          paid_date: pagamentoClienteForm.paid_date,
        },
      });
      toast.success(
        pi.billing_type === "REPRESENTATIVE_BILLING"
          ? "Pagamento do Cliente confirmado! Fila de repasses líquidos liberada para os veículos."
          : "Quitação confirmada! Comissão devida ao Representante ativada.",
      );
      setPagamentoClienteModalOpen(false);
      if (onRefresh) onRefresh();
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(`Erro: ${err?.message}`);
    } finally {
      setLoadingAction(false);
    }
  }, [pi.id, pi.billing_type, pagamentoClienteForm, registrarPagamentoFn, onRefresh, qc]);

  // Handler: Liquidar Repasse Individual
  const handleConfirmarRepasse = useCallback(async () => {
    if (!selectedSettlement) return;

    try {
      setLoadingAction(true);
      const res = await confirmarLiquidacaoFn({
        data: {
          settlement_id: selectedSettlement.id,
          receipt_url: repasseForm.receipt_url || undefined,
          payment_method: repasseForm.payment_method,
        },
      });

      toast.success(
        res.all_settled
          ? "Título liquidado! Todas as comissões e repasses foram concluídos com sucesso (PI Liquidado)."
          : "Título liquidado com sucesso!",
      );
      setLiquidarRepasseModalOpen(false);
      setSelectedSettlement(null);
      if (onRefresh) onRefresh();
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(`Erro na liquidação: ${err?.message}`);
    } finally {
      setLoadingAction(false);
    }
  }, [selectedSettlement, repasseForm, confirmarLiquidacaoFn, onRefresh, qc]);

  return (
    <div className="space-y-6">
      {/* 1. VISÃO EM ESTEIRA COM MARCADORES OPERACIONAIS */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                Esteira de Liquidação Operacional & Financeira
              </h4>
              <Badge variant="outline" className="text-xs font-normal">
                {BILLING_TYPE_METADATA[pi.billing_type].badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhamento de ponta a ponta: do checking pericial ao split e quitação de comissões.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDossier && (
              <Button size="sm" variant="outline" onClick={onOpenDossier} className="text-xs h-8 gap-1.5">
                <FileText className="size-3.5 text-primary" /> Visualizar Dossiê Unificado
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {esteiraEtapas.map((step, idx) => {
              const isLast = idx === esteiraEtapas.length - 1;

              return (
                <div key={step.id} className="relative flex flex-col items-start p-3 rounded-xl border bg-card">
                  <div className="flex items-center gap-2 w-full mb-1.5">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.completed
                          ? "bg-emerald-500 text-white shadow-sm"
                          : step.active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground border"
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="size-4" /> : idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate">{step.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. CARDS DE RESUMO FINANCEIRO (PRECISÃO DECIMAL RIGOROSA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VALOR BRUTO TOTAL */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Valor Bruto do PI
              </span>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {formatBRL(pi.gross_amount)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Investimento total em mídia contratada
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* COMISSÃO DO REPRESENTANTE */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Comissão de Representação
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0">
                  {pi.representative_commission_rate}%
                </Badge>
              </span>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBRL(pi.representative_commission_amount)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pi.billing_type === "REPRESENTATIVE_BILLING"
                  ? "Retido na liquidação do Cliente"
                  : "A ser repassado pelo Veículo"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* VALOR LÍQUIDO DO(S) VEÍCULO(S) */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Líquido para Veículo(s)
              </span>
              <h3 className="text-2xl font-bold text-primary mt-1">
                {formatBRL(pi.net_vehicle_amount)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pi.billing_type === "REPRESENTATIVE_BILLING"
                  ? "Split / Repasse após receber do Cliente"
                  : "Faturado diretamente pelo Veículo"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. FLUXO FINANCEIRO E TÍTULOS DE LIQUIDAÇÃO */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                Quadro de Títulos de Liquidação & Repasse
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de recebíveis do Cliente e repasses aos Veículos Parceiros.
              </CardDescription>
            </div>

            {/* BOTÕES DE AÇÃO CONTEXTUAIS CONFORME O ESTADO DO PI */}
            <div className="flex items-center gap-2">
              {/* GATILHO 1: EMITIR FATURAMENTO / ANEXAR NOTA */}
              {isCheckingApproved && ["checking_approved", "in_broadcast"].includes(pi.status) && (
                <Button
                  size="sm"
                  onClick={() => setFaturamentoModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
                >
                  <FileText className="size-3.5" />
                  {pi.billing_type === "REPRESENTATIVE_BILLING"
                    ? "Emitir Cobrança / NF ao Cliente"
                    : "Liberar Dossiê para Faturamento Direto"}
                </Button>
              )}

              {/* GATILHO 2: CONFIRMAR PAGAMENTO DO CLIENTE */}
              {pi.status === "billed" && (
                <Button
                  size="sm"
                  onClick={() => setPagamentoClienteModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                >
                  <CreditCard className="size-3.5" />
                  {pi.billing_type === "REPRESENTATIVE_BILLING"
                    ? "Registrar Pagamento do Cliente"
                    : "Registrar Quitação Cliente -> Veículo"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 text-xs">
                <TableHead>Tipo de Título</TableHead>
                <TableHead>Pagador</TableHead>
                <TableHead>Beneficiário</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                    Nenhum título gerado ainda. Salve o Pedido de Inserção com linhas de mídia.
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((s) => {
                  const statusMeta = SETTLEMENT_STATUS_METADATA[s.status];

                  return (
                    <TableRow key={s.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{SETTLEMENT_TYPE_LABELS[s.type] || s.type}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {s.notes || "-"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[11px]">
                          {s.payer_type === "client" ? "Anunciante / Cliente" : s.payer_type === "representative" ? "Representante" : s.vehicle?.nome_fantasia || "Veículo"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium">
                          {s.receiver_type === "representative"
                            ? "Representante Comercial"
                            : s.vehicle?.nome_fantasia || "Veículo Parceiro"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-bold text-foreground">
                        {formatBRL(s.amount)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`${statusMeta?.color || "bg-muted"} text-[10px]`}
                        >
                          {statusMeta?.label || s.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {s.status === "awaiting_payment" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedSettlement(s);
                              setLiquidarRepasseModalOpen(true);
                            }}
                            className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 gap-1"
                          >
                            <CheckCircle2 className="size-3" /> Liquidar
                          </Button>
                        )}
                        {s.status === "paid" && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="size-3" /> Quitado
                          </span>
                        )}
                        {s.status === "pending_checking" && (
                          <span className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                            <Lock className="size-3 text-amber-500" /> Aguardando Checking
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL 1: EMITIR FATURAMENTO / ANEXAR NOTA FISCAL */}
      <Dialog open={faturamentoModalOpen} onOpenChange={setFaturamentoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Emitir Faturamento & Liberar Dossiê
            </DialogTitle>
            <DialogDescription className="text-xs">
              O checking foi 100% aprovado. Preencha os dados fiscais para anexar a Nota Fiscal ao Dossiê Digital.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {pi.billing_type === "REPRESENTATIVE_BILLING" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Número da NF do Representante (Conta Própria)</Label>
                  <Input
                    placeholder="Ex: NFS-e 004128"
                    className="h-9 text-xs"
                    value={faturamentoForm.invoice_number}
                    onChange={(e) =>
                      setFaturamentoForm((prev) => ({ ...prev, invoice_number: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">URL ou Link do PDF da NF</Label>
                  <Input
                    placeholder="https://... link da NF-e"
                    className="h-9 text-xs"
                    value={faturamentoForm.invoice_url}
                    onChange={(e) =>
                      setFaturamentoForm((prev) => ({ ...prev, invoice_url: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Número da NF Direta do Veículo</Label>
                  <Input
                    placeholder="Ex: NF 1209 emitido pelo Veículo"
                    className="h-9 text-xs"
                    value={faturamentoForm.vehicle_invoice_number}
                    onChange={(e) =>
                      setFaturamentoForm((prev) => ({
                        ...prev,
                        vehicle_invoice_number: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">URL da NF do Veículo</Label>
                  <Input
                    placeholder="https://... link da NF direta"
                    className="h-9 text-xs"
                    value={faturamentoForm.vehicle_invoice_url}
                    onChange={(e) =>
                      setFaturamentoForm((prev) => ({ ...prev, vehicle_invoice_url: e.target.value }))
                    }
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFaturamentoModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirmarFaturamento} disabled={loadingAction}>
              {loadingAction ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Confirmar Faturamento & Dossiê
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REGISTRAR PAGAMENTO DO CLIENTE */}
      <Dialog open={pagamentoClienteModalOpen} onOpenChange={setPagamentoClienteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CreditCard className="size-5" />
              Confirmar Recebimento do Cliente
            </DialogTitle>
            <DialogDescription className="text-xs">
              {pi.billing_type === "REPRESENTATIVE_BILLING"
                ? "Confirmação de liquidação financeira do anunciante. A comissão do representante será retida e a fila de repasses aos veículos será liberada."
                : "Confirmação de que o cliente pagou diretamente ao veículo parceiro. A comissão devida ao Representante será ativada para quitação."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Forma de Pagamento</Label>
              <select
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={pagamentoClienteForm.payment_method}
                onChange={(e) =>
                  setPagamentoClienteForm((prev) => ({ ...prev, payment_method: e.target.value }))
                }
              >
                <option value="PIX">PIX</option>
                <option value="Transferência Bancária / TED">Transferência Bancária / TED</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data do Pagamento</Label>
              <QuickDateInput
                className="h-9"
                value={pagamentoClienteForm.paid_date}
                onChange={(val) =>
                  setPagamentoClienteForm((prev) => ({ ...prev, paid_date: val }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Comprovante de Transferência (URL)</Label>
              <Input
                placeholder="https://... link do comprovante bancário"
                className="h-9 text-xs"
                value={pagamentoClienteForm.receipt_url}
                onChange={(e) =>
                  setPagamentoClienteForm((prev) => ({ ...prev, receipt_url: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPagamentoClienteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleConfirmarPagamentoCliente}
              disabled={loadingAction}
            >
              {loadingAction ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Confirmar Quitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: LIQUIDAR REPASSE AO VEÍCULO OU COMISSÃO */}
      <Dialog open={liquidarRepasseModalOpen} onOpenChange={setLiquidarRepasseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Liquidação de Título / Split
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirmar transferência de saldo para:{" "}
              <strong>
                {selectedSettlement?.receiver_type === "representative"
                  ? "Representante Comercial"
                  : selectedSettlement?.vehicle?.nome_fantasia || "Veículo Parceiro"}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
              <div className="text-xs text-muted-foreground">Valor a Liquidar:</div>
              <div className="text-xl font-bold text-foreground">
                {formatBRL(selectedSettlement?.amount || 0)}
              </div>
              {selectedSettlement?.vehicle?.chave_pix && (
                <div className="text-xs text-emerald-700 font-mono mt-1">
                  Chave PIX: {selectedSettlement.vehicle.chave_pix}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Forma de Pagamento</Label>
              <Input
                className="h-9 text-xs"
                value={repasseForm.payment_method}
                onChange={(e) => setRepasseForm((prev) => ({ ...prev, payment_method: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Comprovante de Transferência / PIX (URL)</Label>
              <Input
                placeholder="https://... link do comprovante do repasse"
                className="h-9 text-xs"
                value={repasseForm.receipt_url}
                onChange={(e) => setRepasseForm((prev) => ({ ...prev, receipt_url: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLiquidarRepasseModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleConfirmarRepasse}
              disabled={loadingAction}
            >
              {loadingAction ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Confirmar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
