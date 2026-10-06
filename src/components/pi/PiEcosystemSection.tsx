// Component: PiEcosystemSection.tsx
// Ecossistema Integrado de Pedidos de Inserção (PI 360°), Checking de Veiculação e Liquidação Bimodal

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  InsertionOrder,
  BillingType,
  CheckingStatus,
  PIStatus,
  BILLING_TYPE_METADATA,
  CHECKING_STATUS_METADATA,
  PI_STATUS_METADATA,
} from "@/types/insertion-orders.types";
import { listInsertionOrders } from "@/lib/insertion-orders.functions";
import { NovoPiModal } from "./NovoPiModal";
import { PiDetalhesDialog } from "./PiDetalhesDialog";
import { PiDossierModal } from "./PiDossierModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Layers,
  Plus,
  Search,
  Filter,
  FileCheck2,
  DollarSign,
  TrendingUp,
  Building2,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Eye,
  Calendar,
  CreditCard,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  clientId?: string;
}

function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
}

export function PiEcosystemSection({ clientId }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listInsertionOrders);

  // Estados de modais
  const [novoPiOpen, setNovoPiOpen] = useState<boolean>(false);
  const [detalhesPiId, setDetalhesPiId] = useState<string | null>(null);
  const [detalhesTab, setDetalhesTab] = useState<"checking" | "financeiro" | "itens">("checking");
  const [detalhesOpen, setDetalhesOpen] = useState<boolean>(false);
  const [dossierPi, setDossierPi] = useState<InsertionOrder | null>(null);

  // Filtros
  const [search, setSearch] = useState<string>("");
  const [billingFilter, setBillingFilter] = useState<string>("todos");
  const [checkingFilter, setCheckingFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Query dos Pedidos de Inserção
  const { data: insertionOrders = [], isLoading } = useQuery<InsertionOrder[]>({
    queryKey: ["insertion_orders", clientId, search, billingFilter, checkingFilter, statusFilter],
    queryFn: () =>
      listFn({
        data: {
          clientId,
          search: search || undefined,
          billingType: billingFilter !== "todos" ? billingFilter : undefined,
          checkingStatus: checkingFilter !== "todos" ? checkingFilter : undefined,
          status: statusFilter !== "todos" ? statusFilter : undefined,
        },
      }),
  });

  // Métricas agregadas
  const metrics = useMemo(() => {
    const totalOrders = insertionOrders.length;
    const totalBruto = insertionOrders.reduce((acc, o) => acc + (Number(o.gross_amount) || 0), 0);
    const totalComissoes = insertionOrders.reduce(
      (acc, o) => acc + (Number(o.representative_commission_amount) || 0),
      0,
    );
    const totalLiquidoVeiculos = insertionOrders.reduce(
      (acc, o) => acc + (Number(o.net_vehicle_amount) || 0),
      0,
    );
    const bloqueadosChecking = insertionOrders.filter(
      (o) => o.checking_status !== "approved" && o.status !== "canceled",
    ).length;
    const aprovadosChecking = insertionOrders.filter(
      (o) => o.checking_status === "approved",
    ).length;

    return {
      totalOrders,
      totalBruto,
      totalComissoes,
      totalLiquidoVeiculos,
      bloqueadosChecking,
      aprovadosChecking,
    };
  }, [insertionOrders]);

  const handleOpenDetalhes = useCallback(
    (piId: string, tab: "checking" | "financeiro" | "itens" = "checking") => {
      setDetalhesPiId(piId);
      setDetalhesTab(tab);
      setDetalhesOpen(true);
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* 1. HERO & KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL BRUTO */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Investimento Bruto (PIs)
              </span>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {formatBRL(metrics.totalBruto)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics.totalOrders} ordens de compra emitidas
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* COMISSÕES DE REPRESENTAÇÃO */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Comissão de Representação
              </span>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBRL(metrics.totalComissoes)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Margem média acordada em contrato
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* REPASSE LÍQUIDO AOS VEÍCULOS */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Repasse Líquido aos Veículos
              </span>
              <h3 className="text-2xl font-bold text-primary mt-1">
                {formatBRL(metrics.totalLiquidoVeiculos)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Saldo após retenção de comissão
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* GATEKEEPER / TRAVA DE CHECKING */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Trava de Checking
                <Badge
                  variant="outline"
                  className={
                    metrics.bloqueadosChecking > 0
                      ? "text-amber-600 border-amber-300"
                      : "text-emerald-600 border-emerald-300"
                  }
                >
                  {metrics.bloqueadosChecking > 0 ? "Bloqueios Ativos" : "100% Liberado"}
                </Badge>
              </span>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {metrics.aprovadosChecking}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {metrics.totalOrders} auditados
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics.bloqueadosChecking} aguardando auditoria
              </p>
            </div>
            <div
              className={`p-3 rounded-xl ${
                metrics.bloqueadosChecking > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {metrics.bloqueadosChecking > 0 ? (
                <Lock className="size-6" />
              ) : (
                <ShieldCheck className="size-6" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. BARRA DE CONTROLE, BUSCA E FILTROS */}
      <Card className="border shadow-sm">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground">
                Ordens de Compra & Pedidos de Inserção (PI 360°)
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestão integrada de veiculação, conferência de comprovantes e liquidação financeira bimodal.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setNovoPiOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-medium shrink-0"
          >
            <Plus className="size-4" /> Novo Pedido de Inserção (PI)
          </Button>
        </div>

        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº do PI, campanha ou cliente..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* FILTRO MODALIDADE */}
          <select
            className="text-xs h-9 rounded-md border border-input bg-background px-3 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value)}
          >
            <option value="todos">Todas as Modalidades</option>
            <option value="REPRESENTATIVE_BILLING">Modalidade 1: Via Representante (Conta Própria)</option>
            <option value="DIRECT_VEHICLE_BILLING">Modalidade 2: Faturamento Direto pelo Veículo</option>
          </select>

          {/* FILTRO CHECKING */}
          <select
            className="text-xs h-9 rounded-md border border-input bg-background px-3 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={checkingFilter}
            onChange={(e) => setCheckingFilter(e.target.value)}
          >
            <option value="todos">Todos os Status de Checking</option>
            <option value="pending_upload">Aguardando Comprovantes</option>
            <option value="under_review">Em Análise de Auditoria</option>
            <option value="approved">100% Auditado & Aprovado</option>
            <option value="rejected">Comprovação Rejeitada</option>
          </select>

          {/* FILTRO STATUS CICLO */}
          <select
            className="text-xs h-9 rounded-md border border-input bg-background px-3 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="todos">Todos os Ciclos</option>
            <option value="in_broadcast">Em Veiculação</option>
            <option value="checking_approved">Checking Validado</option>
            <option value="billed">Faturado / Dossiê Enviado</option>
            <option value="paid_by_client">Liquidado pelo Cliente</option>
            <option value="settled">Repasses Concluídos</option>
          </select>
        </div>

        {/* 3. TABELA DE PEDIDOS DE INSERÇÃO */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Carregando Pedidos de Inserção...</span>
            </div>
          ) : insertionOrders.length === 0 ? (
            <div className="py-16 text-center border-b">
              <Layers className="size-12 mx-auto text-muted-foreground/30 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">Nenhum Pedido de Inserção encontrado</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                Crie um novo PI bimodal com linhas de veículos parceiros e trava de checking pericial.
              </p>
              <Button size="sm" onClick={() => setNovoPiOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-4" /> Criar Primeiro PI
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 text-xs">
                  <TableHead>Número / Campanha</TableHead>
                  <TableHead>Cliente / Anunciante</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead className="text-center">Trava de Checking</TableHead>
                  <TableHead className="text-center">Ciclo do PI</TableHead>
                  <TableHead className="text-right">Valor Bruto</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Líquido Veículos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insertionOrders.map((pi) => {
                  const checkMeta = CHECKING_STATUS_METADATA[pi.checking_status];
                  const statusMeta = PI_STATUS_METADATA[pi.status];
                  const isApproved = pi.checking_status === "approved";

                  return (
                    <TableRow key={pi.id} className="text-xs hover:bg-muted/30">
                      {/* NÚMERO / CAMPANHA */}
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span className="font-mono text-primary font-bold">{pi.pi_number}</span>
                          <span className="text-[11px] text-foreground font-medium truncate max-w-[200px]">
                            {pi.campaign_title}
                          </span>
                        </div>
                      </TableCell>

                      {/* CLIENTE */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {pi.client?.nome_fantasia || pi.client?.razao_social || "Cliente"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {pi.agency?.nome_fantasia ? `Agência: ${pi.agency.nome_fantasia}` : "Direto"}
                          </span>
                        </div>
                      </TableCell>

                      {/* MODALIDADE */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] whitespace-nowrap bg-muted/30 font-normal"
                        >
                          {pi.billing_type === "REPRESENTATIVE_BILLING" ? "Via Representante" : "Direto Veículo"}
                        </Badge>
                      </TableCell>

                      {/* TRAVA DE CHECKING */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border"
                          style={{
                            borderColor: isApproved ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.4)",
                            backgroundColor: isApproved ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                            color: isApproved ? "#047857" : "#b45309",
                          }}
                        >
                          {isApproved ? (
                            <>
                              <ShieldCheck className="size-3.5 text-emerald-600" />
                              <span>100% Auditado</span>
                            </>
                          ) : (
                            <>
                              <Lock className="size-3.5 text-amber-600" />
                              <span>Faturamento Bloqueado</span>
                            </>
                          )}
                        </div>
                      </TableCell>

                      {/* STATUS CICLO */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`${statusMeta?.color || "bg-muted"} text-[10px]`}
                        >
                          {statusMeta?.label || pi.status}
                        </Badge>
                      </TableCell>

                      {/* VALOR BRUTO */}
                      <TableCell className="text-right font-bold text-foreground">
                        {formatBRL(pi.gross_amount)}
                      </TableCell>

                      {/* COMISSÃO */}
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatBRL(pi.representative_commission_amount)}
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          ({pi.representative_commission_rate}%)
                        </span>
                      </TableCell>

                      {/* LÍQUIDO */}
                      <TableCell className="text-right text-primary font-medium">
                        {formatBRL(pi.net_vehicle_amount)}
                      </TableCell>

                      {/* AÇÕES */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetalhes(pi.id, "checking")}
                            className="h-7 text-xs px-2 gap-1"
                          >
                            <FileCheck2 className="size-3 text-primary" />
                            Checking
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenDetalhes(pi.id, "financeiro")}
                            className="h-7 text-xs px-2 gap-1"
                          >
                            <DollarSign className="size-3 text-emerald-600" />
                            Financeiro
                          </Button>

                          {pi.dossier_data && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDossierPi(pi)}
                              className="h-7 text-xs px-1.5 text-muted-foreground hover:text-primary"
                              title="Visualizar Dossiê Unificado"
                            >
                              <FileText className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGOS DE AÇÃO */}
      <NovoPiModal
        open={novoPiOpen}
        onOpenChange={setNovoPiOpen}
        onSuccess={(id) => {
          handleOpenDetalhes(id, "checking");
          qc.invalidateQueries({ queryKey: ["insertion_orders"] });
        }}
      />

      <PiDetalhesDialog
        piId={detalhesPiId}
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        defaultTab={detalhesTab}
      />

      {dossierPi && (
        <PiDossierModal
          pi={dossierPi}
          open={!!dossierPi}
          onOpenChange={(op) => !op && setDossierPi(null)}
        />
      )}
    </div>
  );
}
