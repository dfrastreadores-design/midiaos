// Component: PiDetalhesDialog.tsx
// Ficha Detalhada do Pedido de Inserção com Abas de Checking, Painel Financeiro e Itens de Mídia

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  InsertionOrder,
  BILLING_TYPE_METADATA,
  CHECKING_STATUS_METADATA,
  PI_STATUS_METADATA,
} from "@/types/insertion-orders.types";
import { getInsertionOrder } from "@/lib/insertion-orders.functions";
import { PiCheckingModule } from "./PiCheckingModule";
import { PiPainelFinanceiro } from "./PiPainelFinanceiro";
import { PiDossierModal } from "./PiDossierModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCheck2,
  DollarSign,
  Layers,
  FileText,
  Calendar,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Radio,
  Tv,
} from "lucide-react";

interface Props {
  piId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "checking" | "financeiro" | "itens";
}

function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
}

export function PiDetalhesDialog({ piId, open, onOpenChange, defaultTab = "checking" }: Props) {
  const qc = useQueryClient();
  const getPiFn = useServerFn(getInsertionOrder);

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [dossierOpen, setDossierOpen] = useState<boolean>(false);

  const [visaoModo, setVisaoModo] = useState<"cliente" | "interna">("cliente");

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  const {
    data: pi,
    isLoading,
    refetch,
  } = useQuery<InsertionOrder>({
    queryKey: ["insertion_order_detail", piId],
    queryFn: () => getPiFn({ data: { id: piId! } }),
    enabled: !!piId && open,
  });

  const handleRefresh = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: ["insertion_orders"] });
  }, [refetch, qc]);

  // Filtragem de itens: no modo cliente, ocultar produções embutidas (pois já estão somadas na linha pai)
  const itemsExibicao = useMemo(() => {
    const raw = pi?.items || [];
    if (visaoModo === "interna") return raw;
    return raw.filter((it) => !(it.item_type === "PRODUCTION" && it.display_mode === "EMBEDDED"));
  }, [pi?.items, visaoModo]);

  if (!open || !piId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6">
          {isLoading || !pi ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Carregando dados do Pedido de Inserção...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* CABEÇALHO DA FICHA */}
              <DialogHeader className="border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {pi.pi_number}
                      </span>
                      <Badge className={PI_STATUS_METADATA[pi.status]?.color || "bg-muted"}>
                        {PI_STATUS_METADATA[pi.status]?.label || pi.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {BILLING_TYPE_METADATA[pi.billing_type]?.badge}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${
                          CHECKING_STATUS_METADATA[pi.checking_status]?.color || "bg-muted"
                        } text-xs`}
                      >
                        {CHECKING_STATUS_METADATA[pi.checking_status]?.label}
                      </Badge>
                    </div>

                    <DialogTitle className="text-xl font-bold text-foreground">
                      {pi.campaign_title}
                    </DialogTitle>

                    <DialogDescription className="text-xs flex items-center gap-3 text-muted-foreground">
                      <span>
                        Anunciante:{" "}
                        <strong className="text-foreground">
                          {pi.client?.nome_fantasia || pi.client?.razao_social || "Cliente"}
                        </strong>
                      </span>
                      {pi.period_start && (
                        <span>
                          Período: {pi.period_start} a {pi.period_end || "Em veiculação"}
                        </span>
                      )}
                    </DialogDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDossierOpen(true)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <FileText className="size-3.5 text-primary" />
                      Visualizar Dossiê Unificado
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* ABAS DO MODAL */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid grid-cols-3 max-w-md h-9">
                  <TabsTrigger value="checking" className="text-xs gap-1.5">
                    <FileCheck2 className="size-3.5" />
                    Checking & Auditoria
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="text-xs gap-1.5">
                    <DollarSign className="size-3.5" />
                    Painel Financeiro
                  </TabsTrigger>
                  <TabsTrigger value="itens" className="text-xs gap-1.5">
                    <Layers className="size-3.5" />
                    Linhas de Mídia ({pi.items?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* ABA 1: CHECKING & AUDITORIA */}
                <TabsContent value="checking">
                  <PiCheckingModule
                    pi={pi}
                    onRefresh={handleRefresh}
                    onDossierGenerated={() => setDossierOpen(true)}
                  />
                </TabsContent>

                {/* ABA 2: PAINEL FINANCEIRO & ESTEIRA */}
                <TabsContent value="financeiro">
                  <PiPainelFinanceiro
                    pi={pi}
                    onRefresh={handleRefresh}
                    onOpenDossier={() => setDossierOpen(true)}
                  />
                </TabsContent>

                {/* ABA 3: LINHAS DE MÍDIA & VEÍCULOS */}
                <TabsContent value="itens" className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Modo de Visualização dos Itens
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {visaoModo === "cliente"
                          ? "Visão oficial apresentada ao cliente: custos de produção embutidos são diluídos na mídia."
                          : "Visão operacional da agência: custos de mídia, produções e comissões 100% desmembrados."}
                      </span>
                    </div>

                    <div className="bg-background p-1 rounded-lg border flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setVisaoModo("cliente")}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                          visaoModo === "cliente"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Visão do Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisaoModo("interna")}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                          visaoModo === "interna"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Visão Interna (Operacional)
                      </button>
                    </div>
                  </div>

                  <Card className="border shadow-sm">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10 text-xs">
                            <TableHead>Veículo / Parceiro</TableHead>
                            <TableHead>Tipo / Formato</TableHead>
                            <TableHead className="text-center">Inserções</TableHead>
                            <TableHead className="text-right">Valor Unitário</TableHead>
                            <TableHead className="text-right">Valor do Cliente</TableHead>
                            {visaoModo === "interna" && (
                              <>
                                <TableHead className="text-right">Comissão</TableHead>
                                <TableHead className="text-right">Líquido Executor</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemsExibicao.map((it) => {
                            const isProd = it.item_type === "PRODUCTION";
                            const isEmbedded = it.display_mode === "EMBEDDED";
                            const clientTotal =
                              it.client_facing_total !== undefined && it.client_facing_total > 0
                                ? it.client_facing_total
                                : it.total_price;
                            const clientUnit =
                              it.insertions_count > 0 ? clientTotal / it.insertions_count : it.unit_price;

                            return (
                              <TableRow key={it.id} className="text-xs hover:bg-muted/20">
                                <TableCell className="font-semibold text-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="size-3.5 text-muted-foreground" />
                                    <span>
                                      {it.vehicle?.nome_fantasia ||
                                        it.vehicle?.razao_social ||
                                        "Veículo / Produtora"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium">{it.format_description}</span>
                                    {isProd && (
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] ${
                                          isEmbedded
                                            ? "border-amber-300 bg-amber-50 text-amber-700"
                                            : "border-purple-300 bg-purple-50 text-purple-700"
                                        }`}
                                      >
                                        {isEmbedded ? "Produção Embutida" : "Produção Discriminada"}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{it.insertions_count}</TableCell>
                                <TableCell className="text-right">
                                  {formatBRL(visaoModo === "cliente" ? clientUnit : it.unit_price)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-foreground">
                                  {formatBRL(visaoModo === "cliente" ? clientTotal : it.total_price)}
                                </TableCell>
                                {visaoModo === "interna" && (
                                  <>
                                    <TableCell className="text-right text-emerald-600 font-medium">
                                      {formatBRL(it.vehicle_commission_amount || 0)}
                                    </TableCell>
                                    <TableCell className="text-right text-primary font-bold">
                                      {formatBRL(it.vehicle_net_amount)}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE DOSSIÊ DIGITAL UNIFICADO */}
      {pi && (
        <PiDossierModal
          pi={pi}
          open={dossierOpen}
          onOpenChange={setDossierOpen}
        />
      )}
    </>
  );
}
