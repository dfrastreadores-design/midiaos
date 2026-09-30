import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSignature,
  Send,
  Printer,
  Upload,
  Users,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  listDocumentosAssinatura,
  upsertDocumentoAssinatura,
  adicionarSignatario,
  solicitarAssinaturaDigital,
  solicitarAssinaturaManual,
} from "@/lib/assinaturas-universal.functions";
import { LABELS_ASSINATURA_STATUS, type DocumentoAssinatura, type DocumentoTipo } from "@/types/assinaturas.types";
import { gerarHtmlDocumentoImpressao } from "@/lib/signatures/print-template";
import { useTenantBranding } from "@/hooks/use-tenant-branding";

interface UniversalAssinaturaProps {
  referenciaTipo: "contratos" | "pis" | "propostas" | "clientes" | "parceiros" | "outro";
  referenciaId: string;
  documentoTipo: DocumentoTipo;
  tituloPadrao: string;
  numeroPadrao?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UniversalAssinaturaModal({
  referenciaTipo,
  referenciaId,
  documentoTipo,
  tituloPadrao,
  numeroPadrao,
  open,
  onOpenChange,
}: UniversalAssinaturaProps) {
  const qc = useQueryClient();
  const { nome: empresaNome, logoSrc, cnpj: empresaCnpj } = useTenantBranding();

  const listDocsFn = useServerFn(listDocumentosAssinatura);
  const upsertDocFn = useServerFn(upsertDocumentoAssinatura);
  const addSigFn = useServerFn(adicionarSignatario);
  const enviarDigitalFn = useServerFn(solicitarAssinaturaDigital);
  const enviarManualFn = useServerFn(solicitarAssinaturaManual);

  // Busca se já existe um documento vinculado a esta referência
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["doc-assinatura-ref", referenciaTipo, referenciaId],
    queryFn: () =>
      listDocsFn({
        data: {
          referencia_tipo: referenciaTipo,
          referencia_id: referenciaId,
        },
      }),
    enabled: open && !!referenciaId,
  });

  const doc = docs[0] as DocumentoAssinatura | undefined;

  const [novoSigNome, setNovoSigNome] = useState("");
  const [novoSigEmail, setNovoSigEmail] = useState("");
  const [novoSigMetodo, setNovoSigMetodo] = useState<"digital" | "manual">("digital");
  const [novoSigTipo, setNovoSigTipo] = useState<any>("cliente");

  // Mutation para criar o documento caso ainda não exista
  const criarDocMutation = useMutation({
    mutationFn: () =>
      upsertDocFn({
        data: {
          titulo: tituloPadrao,
          numero: numeroPadrao,
          documento_tipo: documentoTipo,
          referencia_tipo: referenciaTipo,
          referencia_id: referenciaId,
          necessita_assinatura: true,
          metodo_preferencial: "hibrido",
        },
      }),
    onSuccess: () => {
      toast.success("Controle de assinaturas iniciado!");
      qc.invalidateQueries({ queryKey: ["doc-assinatura-ref", referenciaTipo, referenciaId] });
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation para adicionar signatário
  const addSigMutation = useMutation({
    mutationFn: () => {
      if (!doc) throw new Error("Documento não iniciado");
      return addSigFn({
        data: {
          documento_id: doc.id,
          nome: novoSigNome,
          email: novoSigEmail || undefined,
          metodo: novoSigMetodo,
          tipo_participante: novoSigTipo,
        },
      });
    },
    onSuccess: () => {
      toast.success("Signatário adicionado!");
      setNovoSigNome("");
      setNovoSigEmail("");
      qc.invalidateQueries({ queryKey: ["doc-assinatura-ref", referenciaTipo, referenciaId] });
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Enviar para assinatura digital
  const enviarDigitalMutation = useMutation({
    mutationFn: (docId: string) => enviarDigitalFn({ data: { documento_id: docId } }),
    onSuccess: () => {
      toast.success("Enviado para assinatura digital!");
      qc.invalidateQueries({ queryKey: ["doc-assinatura-ref", referenciaTipo, referenciaId] });
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Preparar para manual e imprimir
  const imprimirManual = (d: DocumentoAssinatura) => {
    enviarManualFn({ data: { documento_id: d.id } });
    const html = gerarHtmlDocumentoImpressao(d, d.signatarios || [], {
      nome: empresaNome || "Mídia OS",
      cnpj: empresaCnpj,
      logoSrc: logoSrc || undefined,
    });
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  const statusMeta = doc ? LABELS_ASSINATURA_STATUS[doc.status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Gestão Universal de Assinaturas
          </DialogTitle>
          <DialogDescription>
            {tituloPadrao} {numeroPadrao ? `(${numeroPadrao})` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando status de assinatura...
          </div>
        ) : !doc ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Este documento ainda não possui fluxo de assinatura iniciado.
            </p>
            <Button
              onClick={() => criarDocMutation.mutate()}
              disabled={criarDocMutation.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {criarDocMutation.isPending ? "Iniciando..." : "Iniciar Fluxo de Assinatura"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Resumo do Status Atual */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div>
                <div className="text-xs text-muted-foreground">Status Atual</div>
                <div className="font-semibold text-sm flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    {statusMeta?.label || doc.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Versão: v{doc.versao} • Método: {doc.metodo_preferencial}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  title="Imprimir folha de assinaturas físicas"
                  onClick={() => imprimirManual(doc)}
                  className="h-8 text-xs gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Manual
                </Button>

                <Button
                  size="sm"
                  onClick={() => enviarDigitalMutation.mutate(doc.id)}
                  disabled={enviarDigitalMutation.isPending || !doc.signatarios?.length}
                  className="h-8 text-xs gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  Disparar Digital
                </Button>
              </div>
            </div>

            {/* Signatários */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Signatários ({doc.signatarios?.length || 0})
              </div>

              {doc.signatarios?.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 border border-dashed rounded text-center">
                  Nenhum signatário adicionado. Cadastre as partes abaixo para colher as assinaturas.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {doc.signatarios?.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between p-2 rounded border text-xs bg-background"
                    >
                      <div>
                        <span className="font-semibold">{sig.nome}</span>
                        <span className="text-muted-foreground ml-1.5">
                          ({sig.tipo_participante} • {sig.metodo})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            sig.status === "assinado"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {sig.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-[11px]"
                          onClick={() => {
                            const url = `${window.location.origin}/assinar/${sig.token}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link do signatário copiado!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar Signatário Rápido */}
            <div className="border-t pt-3">
              <div className="text-xs font-semibold mb-2">Adicionar Signatário</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  placeholder="Nome"
                  className="h-8 text-xs sm:col-span-1"
                  value={novoSigNome}
                  onChange={(e) => setNovoSigNome(e.target.value)}
                />
                <Input
                  placeholder="E-mail (opcional)"
                  type="email"
                  className="h-8 text-xs sm:col-span-1"
                  value={novoSigEmail}
                  onChange={(e) => setNovoSigEmail(e.target.value)}
                />
                <Select value={novoSigMetodo} onValueChange={(v: any) => setNovoSigMetodo(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="manual">Manual (Físico)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => addSigMutation.mutate()}
                  disabled={!novoSigNome.trim() || addSigMutation.isPending}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center sm:justify-between border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              window.open("/assinaturas", "_self");
            }}
            className="text-xs text-primary gap-1"
          >
            Abrir Centralizador Geral <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentoAssinaturaBadge({
  status,
  onClick,
}: {
  status?: string | null;
  onClick?: () => void;
}) {
  const meta = status ? LABELS_ASSINATURA_STATUS[status as any] : null;

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={`cursor-pointer transition-all hover:scale-105 text-[11px] gap-1 ${
        status === "assinado" || status === "assinado_manualmente"
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
          : status === "aguardando_conferencia"
          ? "bg-purple-500/10 text-purple-600 border-purple-300"
          : status === "aguardando_assinatura" || status === "enviado_para_assinatura"
          ? "bg-amber-500/10 text-amber-600 border-amber-300"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <FileSignature className="h-3 w-3" />
      {meta?.label || "Assinatura"}
    </Badge>
  );
}
