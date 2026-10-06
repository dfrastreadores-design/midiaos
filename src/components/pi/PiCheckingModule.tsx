// Component: PiCheckingModule.tsx
// Módulo de Auditoria e Comprovação de Mídia com Trava Universal de Faturamento

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  InsertionOrder,
  PiItem,
  PiChecking,
  CheckingFileType,
  CHECKING_STATUS_METADATA,
} from "@/types/insertion-orders.types";
import {
  uploadPiChecking,
  reviewPiCheckingItem,
  approveCheckingAndReleaseBilling,
} from "@/lib/insertion-orders.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck,
  Upload,
  ExternalLink,
  Eye,
  Lock,
  Unlock,
  Radio,
  FileText,
  Tv,
  Image as ImageIcon,
  Video,
  Sparkles,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  pi: InsertionOrder;
  onRefresh?: () => void;
  onDossierGenerated?: () => void;
}

export function PiCheckingModule({ pi, onRefresh, onDossierGenerated }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFn = useServerFn(uploadPiChecking);
  const reviewFn = useServerFn(reviewPiCheckingItem);
  const approveAndReleaseFn = useServerFn(approveCheckingAndReleaseBilling);

  // Estados locais
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState<boolean>(false);
  const [selectedCheckingId, setSelectedCheckingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const [loadingUpload, setLoadingUpload] = useState<boolean>(false);
  const [loadingReview, setLoadingReview] = useState<boolean>(false);
  const [loadingRelease, setLoadingRelease] = useState<boolean>(false);

  // Form de Upload
  const [uploadForm, setUploadForm] = useState<{
    pi_item_id: string;
    vehicle_id: string;
    file_type: CheckingFileType;
    file_name: string;
    file_url: string;
    external_link: string;
    broadcast_date: string;
    broadcast_time: string;
    notes: string;
  }>({
    pi_item_id: "",
    vehicle_id: "",
    file_type: "foto",
    file_name: "",
    file_url: "",
    external_link: "",
    broadcast_date: new Date().toISOString().split("T")[0],
    broadcast_time: "12:00",
    notes: "",
  });

  const items = useMemo(() => pi.items || [], [pi.items]);
  const checkings = useMemo(() => pi.checkings || [], [pi.checkings]);

  // Auditoria de cobertura
  const coverageAudit = useMemo(() => {
    const totalItems = items.length;
    const approvedCheckings = checkings.filter((c) => c.status === "approved");
    const rejectedCheckings = checkings.filter((c) => c.status === "rejected");
    const pendingCheckings = checkings.filter((c) => c.status === "pending_review");

    const coveredItemIds = new Set(
      approvedCheckings.map((c) => c.pi_item_id).filter(Boolean),
    );

    const itemsCoveredCount = items.filter((it) => coveredItemIds.has(it.id)).length;
    const is100PercentApproved =
      totalItems > 0 &&
      itemsCoveredCount === totalItems &&
      rejectedCheckings.length === 0 &&
      pendingCheckings.length === 0;

    return {
      totalItems,
      itemsCoveredCount,
      approvedCount: approvedCheckings.length,
      rejectedCount: rejectedCheckings.length,
      pendingCount: pendingCheckings.length,
      is100PercentApproved,
    };
  }, [items, checkings]);

  // Filtragem de checkings
  const filteredCheckings = useMemo(() => {
    if (selectedItemId === "all") return checkings;
    return checkings.filter((c) => c.pi_item_id === selectedItemId);
  }, [checkings, selectedItemId]);

  // Handler de aprovação direta
  const handleApproveItem = useCallback(
    async (checkingId: string) => {
      try {
        setLoadingReview(true);
        await reviewFn({
          data: {
            checking_id: checkingId,
            decision: "approved",
          },
        });
        toast.success("Comprovante auditado e APROVADO com sucesso!");
        if (onRefresh) onRefresh();
        qc.invalidateQueries({ queryKey: ["insertion_orders"] });
      } catch (err: any) {
        toast.error(`Erro ao aprovar item: ${err?.message || "Erro desconhecido"}`);
      } finally {
        setLoadingReview(false);
      }
    },
    [reviewFn, onRefresh, qc],
  );

  // Abrir modal de rejeição
  const handleOpenReject = useCallback((checkingId: string) => {
    setSelectedCheckingId(checkingId);
    setRejectionReason("");
    setRejectionModalOpen(true);
  }, []);

  // Confirmar rejeição com motivo
  const handleConfirmReject = useCallback(async () => {
    if (!selectedCheckingId) return;
    if (!rejectionReason.trim()) {
      toast.error("Por favor, informe a justificativa da recusa para o veículo.");
      return;
    }

    try {
      setLoadingReview(true);
      await reviewFn({
        data: {
          checking_id: selectedCheckingId,
          decision: "rejected",
          rejection_reason: rejectionReason.trim(),
        },
      });
      toast.warning("Comprovante rejeitado. Veículo notificado para substituição.");
      setRejectionModalOpen(false);
      if (onRefresh) onRefresh();
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(`Erro ao rejeitar: ${err?.message}`);
    } finally {
      setLoadingReview(false);
    }
  }, [selectedCheckingId, rejectionReason, reviewFn, onRefresh, qc]);

  // Submissão do novo comprovante
  const handleSaveUpload = useCallback(async () => {
    if (!uploadForm.file_url && !uploadForm.external_link) {
      toast.error("Informe a URL do arquivo ou link externo do comprovante.");
      return;
    }

    try {
      setLoadingUpload(true);
      await uploadFn({
        data: {
          pi_id: pi.id,
          pi_item_id: uploadForm.pi_item_id || null,
          vehicle_id: uploadForm.vehicle_id || null,
          file_type: uploadForm.file_type,
          file_name: uploadForm.file_name || "Comprovante de Veiculação",
          file_url: uploadForm.file_url || uploadForm.external_link,
          external_link: uploadForm.external_link || null,
          broadcast_date: uploadForm.broadcast_date || null,
          broadcast_time: uploadForm.broadcast_time || null,
          notes: uploadForm.notes || null,
        },
      });
      toast.success("Comprovante anexado! Pronto para auditoria.");
      setUploadDialogOpen(false);
      setUploadForm({
        pi_item_id: "",
        vehicle_id: "",
        file_type: "foto",
        file_name: "",
        file_url: "",
        external_link: "",
        broadcast_date: new Date().toISOString().split("T")[0],
        broadcast_time: "12:00",
        notes: "",
      });
      if (onRefresh) onRefresh();
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(`Erro ao enviar comprovante: ${err?.message}`);
    } finally {
      setLoadingUpload(false);
    }
  }, [uploadForm, pi.id, uploadFn, onRefresh, qc]);

  // Gatekeeper: Liberar faturamento
  const handleReleaseBilling = useCallback(async () => {
    if (!coverageAudit.is100PercentApproved) {
      toast.error(
        "TRAVA UNIVERSAL ATIVA: Não é possível liberar o faturamento sem 100% dos comprovantes auditados e aprovados pelo Representante!",
      );
      return;
    }

    try {
      setLoadingRelease(true);
      const res = await approveAndReleaseFn({ data: { pi_id: pi.id } });
      toast.success(res.message);
      if (onDossierGenerated) onDossierGenerated();
      if (onRefresh) onRefresh();
      qc.invalidateQueries({ queryKey: ["insertion_orders"] });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao liberar faturamento.");
    } finally {
      setLoadingRelease(false);
    }
  }, [coverageAudit.is100PercentApproved, approveAndReleaseFn, pi.id, onDossierGenerated, onRefresh, qc]);

  // Ícone representativo por tipo de mídia
  const renderTypeIcon = (type: CheckingFileType) => {
    switch (type) {
      case "foto":
        return <ImageIcon className="size-4 text-emerald-600" />;
      case "video":
        return <Video className="size-4 text-purple-600" />;
      case "irradiacao":
        return <Radio className="size-4 text-amber-600" />;
      case "relatorio":
      case "clipping":
        return <FileText className="size-4 text-blue-600" />;
      default:
        return <Tv className="size-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* BANNER VISUAL DE TRAVA UNIVERSAL DE CHECKING */}
      {coverageAudit.is100PercentApproved ? (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-base flex items-center gap-2">
                Checking 100% Auditado e Aprovado
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Liberado</Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todos os {items.length} itens veiculados possuem comprovação pericial validada.
                O pacote de faturamento e o dossiê digital estão prontos para emissão.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleReleaseBilling}
            disabled={loadingRelease || pi.status === "checking_approved" || pi.status === "billed"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2 shrink-0 shadow-sm"
          >
            {loadingRelease ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Unlock className="size-4" />
            )}
            {pi.status === "checking_approved" || pi.status === "billed"
              ? "Dossiê Gerado / Liberado"
              : "Aprovar Checking e Gerar Pacote de Faturamento"}
          </Button>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Lock className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-base flex items-center gap-2">
                Checking Pendente de Validação — Faturamento Bloqueado
                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
                  Trava Universal Ativa
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Regra Inviolável Mídia.OS: Nenhuma fatura ou ordem de cobrança pode ser emitida ou enviada ao Cliente sem que 100% das comprovações de veiculação sejam aprovadas pelo Representante.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={true}
            className="opacity-75 cursor-not-allowed border-amber-400 text-amber-800 dark:text-amber-300 gap-2 shrink-0"
          >
            <Lock className="size-4 text-amber-600" />
            Faturamento Bloqueado
          </Button>
        </div>
      )}

      {/* PAINEL DE CONTROLE E AÇÕES DO MÓDULO */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="size-5 text-primary" />
                Auditoria de Comprovação de Mídia ({checkings.length} Comprovantes)
              </CardTitle>
              <CardDescription className="text-xs">
                Audite fotos, relatórios, certidões de irradiação e clippings enviados pelos veículos parceiros.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setUploadDialogOpen(true)}
                className="gap-1.5"
              >
                <Upload className="size-4" />
                Anexar Comprovante
              </Button>

              <Button
                size="sm"
                onClick={handleReleaseBilling}
                disabled={!coverageAudit.is100PercentApproved || loadingRelease}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium"
              >
                {loadingRelease ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileCheck className="size-4" />
                )}
                Aprovar Checking e Gerar Pacote de Faturamento
              </Button>
            </div>
          </div>

          {/* KPI TABS / FILTROS RÁPIDOS */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <span className="text-xs text-muted-foreground font-medium mr-1">Filtrar por Veículo / Item:</span>
            <Button
              size="sm"
              variant={selectedItemId === "all" ? "secondary" : "ghost"}
              onClick={() => setSelectedItemId("all")}
              className="h-7 text-xs px-2.5"
            >
              Todos ({checkings.length})
            </Button>
            {items.map((it) => {
              const itemCheckings = checkings.filter((c) => c.pi_item_id === it.id);
              const isItemApproved = itemCheckings.some((c) => c.status === "approved");

              return (
                <Button
                  key={it.id}
                  size="sm"
                  variant={selectedItemId === it.id ? "secondary" : "ghost"}
                  onClick={() => setSelectedItemId(it.id)}
                  className="h-7 text-xs px-2.5 gap-1.5"
                >
                  {isItemApproved ? (
                    <CheckCircle2 className="size-3 text-emerald-600" />
                  ) : (
                    <Clock className="size-3 text-amber-500" />
                  )}
                  {it.vehicle?.nome_fantasia || "Veículo"} — {it.format_description} ({itemCheckings.length})
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {filteredCheckings.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/10">
              <FileCheck className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <h5 className="font-medium text-sm text-foreground">Nenhum comprovante anexado</h5>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Solicite ao veículo parceiro ou faça o upload manual de prints, certidões de irradiação ou links de veiculação.
              </p>
              <Button size="sm" onClick={() => setUploadDialogOpen(true)} className="gap-1.5">
                <Upload className="size-4" />
                Fazer Upload de Comprovante
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCheckings.map((c) => {
                const item = items.find((it) => it.id === c.pi_item_id);

                return (
                  <Card
                    key={c.id}
                    className={`border transition-all shadow-sm ${
                      c.status === "approved"
                        ? "border-emerald-300/80 bg-emerald-500/[0.02]"
                        : c.status === "rejected"
                        ? "border-rose-300 bg-rose-500/[0.02]"
                        : "border-amber-300 bg-amber-500/[0.02]"
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      {/* TOPO DO CARD */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-muted border">
                            {renderTypeIcon(c.file_type)}
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold truncate max-w-[180px]">
                              {c.file_name || "Comprovante"}
                            </h5>
                            <span className="text-[11px] text-muted-foreground">
                              {c.broadcast_date ? `Veiculado em ${c.broadcast_date}` : "Data não especificada"}
                            </span>
                          </div>
                        </div>

                        {/* STATUS BADGE */}
                        {c.status === "approved" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[10px]">
                            Aprovado
                          </Badge>
                        ) : c.status === "rejected" ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 text-[10px]">
                            Rejeitado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-[10px]">
                            Em Análise
                          </Badge>
                        )}
                      </div>

                      {/* VEÍCULO / ITEM VINCULADO */}
                      <div className="text-xs p-2 rounded-lg bg-muted/40 border space-y-0.5">
                        <div className="text-muted-foreground font-medium">
                          Veículo:{" "}
                          <span className="text-foreground font-semibold">
                            {c.vehicle?.nome_fantasia || item?.vehicle?.nome_fantasia || "Veículo Parceiro"}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          Formato:{" "}
                          <span className="text-foreground">
                            {item?.format_description || "Geral"}
                          </span>
                        </div>
                      </div>

                      {/* PREVIEW DO ARQUIVO OU LINK */}
                      <div className="rounded-lg overflow-hidden border bg-background/50 h-36 flex items-center justify-center relative group">
                        {c.file_type === "foto" && c.file_url ? (
                          <img
                            src={c.file_url}
                            alt="Checking"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                            {renderTypeIcon(c.file_type)}
                            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                              {c.file_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              Formato: {c.file_type}
                            </span>
                          </div>
                        )}

                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                        >
                          <Eye className="size-4" /> Visualizar Evidência
                        </a>
                      </div>

                      {/* MOTIVO DE RECUSA (SE HOUVER) */}
                      {c.status === "rejected" && c.rejection_reason && (
                        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          <strong>Motivo da Recusa:</strong> {c.rejection_reason}
                        </div>
                      )}

                      {/* AÇÕES DE AUDITORIA */}
                      <div className="pt-2 border-t flex items-center justify-between gap-2">
                        {c.status !== "approved" ? (
                          <Button
                            size="sm"
                            onClick={() => handleApproveItem(c.id)}
                            disabled={loadingReview}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="size-3.5" /> Aprovar Item
                          </Button>
                        ) : (
                          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Auditado pelo Representante
                          </div>
                        )}

                        {c.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReject(c.id)}
                            disabled={loadingReview}
                            className="text-xs h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <XCircle className="size-3.5 mr-1" /> Recusar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: ANEXAR COMPROVANTE */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              Anexar Comprovante de Veiculação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vincule o comprovante (foto, link, vídeo ou certidão de irradiação) ao item do PI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Linha de Mídia / Veículo Destino *</Label>
              <select
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={uploadForm.pi_item_id}
                onChange={(e) => {
                  const itId = e.target.value;
                  const item = items.find((i) => i.id === itId);
                  setUploadForm((prev) => ({
                    ...prev,
                    pi_item_id: itId,
                    vehicle_id: item?.vehicle_id || "",
                  }));
                }}
              >
                <option value="">Selecione a linha de mídia...</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.vehicle?.nome_fantasia || "Veículo"} — {it.format_description} ({it.insertions_count} inserções)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Comprovante *</Label>
                <select
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={uploadForm.file_type}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, file_type: e.target.value as CheckingFileType }))
                  }
                >
                  <option value="foto">Foto / Print de Tela</option>
                  <option value="video">Vídeo de Exibição</option>
                  <option value="irradiacao">Certidão de Irradiação (Rádio/TV)</option>
                  <option value="relatorio">Relatório Consolidado</option>
                  <option value="clipping">Clipping de Notícia / Matéria</option>
                  <option value="link">Link Externo / Transmissão</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data da Veiculação</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={uploadForm.broadcast_date}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, broadcast_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título ou Descrição do Comprovante</Label>
              <Input
                placeholder="Ex: Print Painel Digital Av. Paulista ou Certidão Dia 05"
                className="h-9 text-xs"
                value={uploadForm.file_name}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, file_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL do Arquivo / Storage *</Label>
              <Input
                placeholder="https://... link da imagem, PDF ou certificado"
                className="h-9 text-xs"
                value={uploadForm.file_url}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, file_url: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações do Checking</Label>
              <Textarea
                placeholder="Observações complementares, horário de veiculação ou canal de transmissão..."
                rows={2}
                className="text-xs"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveUpload} disabled={loadingUpload}>
              {loadingUpload ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Salvar Comprovante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECUSAR COMPROVANTE (JUSTIFICATIVA) */}
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              Solicitar Correção do Checking
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a inconformidade identificada para que o veículo parceiro faça a devida adequação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Justificativa da Recusa *</Label>
            <Textarea
              placeholder="Ex: Foto com má resolução onde não é possível identificar a campanha, certidão sem horário de veiculação correspondente ao PI..."
              rows={3}
              className="text-xs"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectionModalOpen(false)}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={loadingReview}
            >
              {loadingReview ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
