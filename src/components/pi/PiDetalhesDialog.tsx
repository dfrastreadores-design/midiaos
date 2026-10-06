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
                <TabsContent value="itens">
                  <Card className="border shadow-sm">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10 text-xs">
                            <TableHead>Veículo Executor</TableHead>
                            <TableHead>Formato / Descrição</TableHead>
                            <TableHead className="text-center">Inserções</TableHead>
                            <TableHead className="text-right">Valor Unitário</TableHead>
                            <TableHead className="text-right">Valor Bruto</TableHead>
                            <TableHead className="text-right">Líquido Veículo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(pi.items || []).map((it) => (
                            <TableRow key={it.id} className="text-xs">
                              <TableCell className="font-semibold text-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="size-3.5 text-muted-foreground" />
                                  <span>{it.vehicle?.nome_fantasia || it.vehicle?.razao_social || "Veículo Parceiro"}</span>
                                </div>
                              </TableCell>
                              <TableCell>{it.format_description}</TableCell>
                              <TableCell className="text-center">{it.insertions_count}</TableCell>
                              <TableCell className="text-right">{formatBRL(it.unit_price)}</TableCell>
                              <TableCell className="text-right font-bold text-foreground">
                                {formatBRL(it.total_price)}
                              </TableCell>
                              <TableCell className="text-right text-primary font-medium">
                                {formatBRL(it.vehicle_net_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
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
