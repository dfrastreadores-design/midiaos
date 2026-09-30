import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  getPiPublicoPorToken,
  registrarAssinaturaCliente,
  getAssinaturaExecutivoPorToken,
} from "@/lib/assinaturas.functions";
import {
  getDocumentoPublicoPorToken,
  registrarAssinaturaDigitalPublica,
  recusarAssinaturaPublica,
  uploadDocumentoManualAssinado,
} from "@/lib/assinaturas-universal.functions";
import { LABELS_DOCUMENTO_TIPO } from "@/types/assinaturas.types";
import { toast } from "sonner";
import {
  CheckCircle2,
  ShieldCheck,
  FileText,
  Download,
  User,
  Info,
  Loader2,
  PenLine,
  Printer,
  Upload,
  XCircle,
  AlertTriangle,
  Building2,
  FileSignature,
} from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { gerarHtmlDocumentoImpressao } from "@/lib/signatures/print-template";

export const Route = createFileRoute("/assinar/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Portal de Assinatura — Mídia.OS" }] }),
  component: AssinarPublicoPage,
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function AssinarPublicoPage() {
  const { token } = Route.useParams();

  // Consulta 1: Tenta PI legado
  const {
    data: dataPi,
    isLoading: loadingPi,
    error: errorPi,
    refetch: refetchPi,
  } = useQuery({
    queryKey: ["pi-publico", token],
    queryFn: () => getPiPublicoPorToken({ data: { token } }),
    retry: false,
  });

  // Consulta 2: Tenta Documento Universal se o PI não existir
  const {
    data: dataDoc,
    isLoading: loadingDoc,
    error: errorDoc,
    refetch: refetchDoc,
  } = useQuery({
    queryKey: ["doc-universal-publico", token],
    queryFn: () => getDocumentoPublicoPorToken({ data: { token } }),
    retry: false,
    enabled: !!errorPi || (!loadingPi && !dataPi),
  });

  if (loadingPi || (errorPi && loadingDoc)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Carregando dados do documento...</p>
      </div>
    );
  }

  // Se encontrou documento universal
  if (dataDoc?.documento && dataDoc?.signatario) {
    return (
      <AssinaturaUniversalView
        token={token}
        data={dataDoc}
        refetch={refetchDoc}
      />
    );
  }

  // Se encontrou PI legado
  if (dataPi?.pi) {
    return <AssinarPiView token={token} data={dataPi} refetch={refetchPi} />;
  }

  // Link inválido em ambas as bases
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-6 space-y-4">
        <div className="mx-auto p-3 rounded-full bg-rose-100 text-rose-600 w-fit">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <CardTitle className="text-lg font-bold">Link Inválido ou Expirado</CardTitle>
        <CardDescription>
          Este link de assinatura não foi localizado no sistema, já foi finalizado ou expirou. Por favor, entre em contato com o responsável pela emissão.
        </CardDescription>
      </Card>
    </div>
  );
}

/**
 * VIEW DO MÓDULO UNIVERSAL DE ASSINATURAS
 */
function AssinaturaUniversalView({
  token,
  data,
  refetch,
}: {
  token: string;
  data: {
    documento: any;
    signatario: any;
  };
  refetch: () => void;
}) {
  const { documento, signatario } = data;
  const [nome, setNome] = useState(signatario.nome || "");
  const [cpf, setCpf] = useState(signatario.cpf_cnpj || "");
  const [email, setEmail] = useState(signatario.email || "");
  const [aceito, setAceito] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [opcaoManual, setOpcaoManual] = useState(signatario.metodo === "manual");
  const [uploadFile, setUploadFile] = useState<{ nome: string; dataUrl: string } | null>(null);

  const padRef = useRef<SignaturePadHandle>(null);

  // Mutation para registrar assinatura digital
  const assinarMutation = useMutation({
    mutationFn: async () => {
      if (!padRef.current || padRef.current.isEmpty()) {
        throw new Error("Desenhe sua assinatura no quadro abaixo");
      }
      const dataUrl = padRef.current.toDataURL();
      if (!dataUrl) throw new Error("Não foi possível capturar a assinatura");

      return registrarAssinaturaDigitalPublica({
        data: {
          token,
          nome,
          cpf_cnpj: cpf || undefined,
          email: email || undefined,
          assinatura_data_url: dataUrl,
          user_agent: navigator.userAgent.slice(0, 500),
        },
      });
    },
    onSuccess: () => {
      toast.success("Assinatura formalizada com sucesso!");
      refetch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Mutation para recusa formal
  const recusarMutation = useMutation({
    mutationFn: () =>
      recusarAssinaturaPublica({
        data: { token, motivo: motivoRecusa },
      }),
    onSuccess: () => {
      toast.warning("Recusa registrada no histórico do documento.");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Mutation para upload manual pelo próprio signatário (Portal do Parceiro / Cliente)
  const uploadManualMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) throw new Error("Selecione o arquivo digitalizado");
      return uploadDocumentoManualAssinado({
        data: {
          documento_id: documento.id,
          nomeArquivo: uploadFile.nome,
          dataUrl: uploadFile.dataUrl,
        },
      });
    },
    onSuccess: () => {
      toast.success("Documento assinado enviado com sucesso para validação!");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadFile({ nome: file.name, dataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const jaAssinado = signatario.status === "assinado";
  const jaRecusado = signatario.status === "recusado";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <ShieldCheck className="h-4 w-4" />
            Portal Seguro de Assinatura Eletrônica — Mídia OS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {documento.titulo}
          </h1>
          <p className="text-xs text-muted-foreground">
            Documento {documento.numero || "S/N"} • Versão v{documento.versao} • Tipo:{" "}
            {LABELS_DOCUMENTO_TIPO[documento.documento_tipo as keyof typeof LABELS_DOCUMENTO_TIPO] ||
              documento.documento_tipo}
          </p>
        </div>

        {/* Status: Já assinado */}
        {jaAssinado && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <div className="font-bold text-lg text-emerald-800 dark:text-emerald-300">
                Você já assinou este documento!
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Assinatura confirmada em{" "}
                {signatario.assinado_em
                  ? new Date(signatario.assinado_em).toLocaleString("pt-BR")
                  : "data recente"}
                . O registro encontra-se arquivado com trilha de auditoria e carimbo temporal.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status: Já recusado */}
        {jaRecusado && (
          <Card className="border-rose-500/40 bg-rose-500/5">
            <CardContent className="p-6 text-center space-y-2">
              <XCircle className="h-12 w-12 text-rose-600 mx-auto" />
              <div className="font-bold text-lg text-rose-800 dark:text-rose-300">
                Assinatura Recusada Formalmente
              </div>
              <p className="text-xs text-muted-foreground">
                Motivo registrado: "{signatario.recusado_motivo || "Não especificado"}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dados do Documento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Detalhes do Documento</span>
              <Badge variant="outline" className="text-xs">
                {documento.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {documento.descricao && (
              <div className="p-3 rounded bg-muted/40 text-muted-foreground leading-relaxed">
                {documento.descricao}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-3">
              <div>
                <span className="text-muted-foreground block text-[11px]">Seu Papel</span>
                <span className="font-semibold uppercase">{signatario.tipo_participante}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Seu Nome</span>
                <span className="font-semibold">{signatario.nome}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Empresa</span>
                <span className="font-semibold">{signatario.empresa || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Método Previsto</span>
                <span className="font-semibold capitalize">{signatario.metodo}</span>
              </div>
            </div>

            {/* Demais Signatários */}
            {documento.signatarios && documento.signatarios.length > 1 && (
              <div className="border-t pt-3">
                <div className="font-semibold mb-2 text-muted-foreground text-[11px] uppercase tracking-wider">
                  Todas as Partes Envolvidas:
                </div>
                <div className="flex flex-wrap gap-2">
                  {documento.signatarios.map((s: any) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className={`text-xs py-1 px-2.5 ${
                        s.status === "assinado"
                          ? "border-emerald-400 bg-emerald-500/10 text-emerald-700"
                          : "border-slate-300 text-muted-foreground"
                      }`}
                    >
                      {s.nome} ({s.tipo_participante.toUpperCase()}) —{" "}
                      {s.status === "assinado" ? "Assinado ✓" : "Pendente ⏳"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Área de Ação de Assinatura */}
        {!jaAssinado && !jaRecusado && (
          <Card className="border-primary/30 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PenLine className="h-5 w-5 text-primary" />
                    Formalizar Assinatura
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escolha entre assinar digitalmente na tela ou optar pela assinatura física (manual).
                  </CardDescription>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={!opcaoManual ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOpcaoManual(false)}
                    className="h-8 text-xs"
                  >
                    Digital (Na Tela)
                  </Button>
                  <Button
                    variant={opcaoManual ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOpcaoManual(true)}
                    className="h-8 text-xs"
                  >
                    Manual (Física)
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {!opcaoManual ? (
                // ASSINATURA DIGITAL NA TELA
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-xs">Confirmar Nome Completo *</Label>
                      <Input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="h-9 text-xs"
                        placeholder="Nome como no documento de identidade"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <Input
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="h-9 text-xs"
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <PenLine className="h-4 w-4 text-primary" />
                      Desenhe sua Rubrica / Assinatura no Quadro Abaixo:
                    </Label>
                    <SignaturePad ref={padRef} height={180} />
                    <p className="text-[11px] text-muted-foreground">
                      Utilize o mouse, caneta touch ou o próprio dedo na tela para desenhar sua assinatura.
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded border text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <Checkbox
                        checked={aceito}
                        onCheckedChange={(v) => setAceito(!!v)}
                        className="mt-0.5"
                      />
                      <span className="text-muted-foreground leading-relaxed">
                        Declaro que li e concordo integralmente com os termos deste documento e o assino
                        eletronicamente com fé pública e validade nos termos da legislação brasileira (MP 2.200-2/2001).
                        Compreendo que meu endereço IP e dados de conexão serão registrados para fins de auditoria.
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      className="flex-1 h-11 text-sm font-semibold"
                      disabled={!nome.trim() || !aceito || assinarMutation.isPending}
                      onClick={() => assinarMutation.mutate()}
                    >
                      {assinarMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processando Assinatura...
                        </>
                      ) : (
                        "Confirmar e Assinar Eletronicamente"
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRecusando(!recusando)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Recusar Documento
                    </Button>
                  </div>
                </div>
              ) : (
                // ASSINATURA MANUAL (IMPRESSÃO & UPLOAD)
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-2 text-amber-900 dark:text-amber-200">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Printer className="h-4 w-4" />
                      Fluxo de Coleta Física de Assinatura
                    </div>
                    <p>
                      1. Clique abaixo para abrir a folha oficial de impressão.<br />
                      2. Colete a rubrica e assinatura física no campo reservado.<br />
                      3. Fotografe ou digitalize o documento e anexe o arquivo (PDF, JPG, PNG) abaixo.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const html = gerarHtmlDocumentoImpressao(documento, documento.signatarios || [], {
                          nome: "Mídia OS — Gestão de Mídia",
                        });
                        const win = window.open("", "_blank");
                        if (win) {
                          win.document.write(html);
                          win.document.close();
                        }
                      }}
                      className="text-xs bg-background gap-1 mt-1"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Abrir Folha para Impressão
                    </Button>
                  </div>

                  <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/20">
                    <input
                      type="file"
                      id="upload-doc-manual-public"
                      className="hidden"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="upload-doc-manual-public"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs font-semibold">
                        {uploadFile ? uploadFile.nome : "Anexar Documento Digitalizado Assinado"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        PDF, JPG ou PNG (máx. 15MB)
                      </span>
                    </label>
                  </div>

                  <Button
                    className="w-full h-11 text-sm bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={!uploadFile || uploadManualMutation.isPending}
                    onClick={() => uploadManualMutation.mutate()}
                  >
                    {uploadManualMutation.isPending ? "Enviando arquivo..." : "Enviar Documento Físico Assinado"}
                  </Button>
                </div>
              )}

              {/* Bloco de Recusa Formal */}
              {recusando && (
                <div className="border-t pt-3 mt-3 space-y-2">
                  <Label className="text-xs text-rose-600 font-semibold">
                    Motivo da Recusa Formal *
                  </Label>
                  <Textarea
                    placeholder="Descreva claramente o motivo pelo qual você está recusando a assinatura deste documento..."
                    rows={2}
                    className="text-xs"
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setRecusando(false)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!motivoRecusa.trim() || recusarMutation.isPending}
                      onClick={() => recusarMutation.mutate()}
                      className="text-xs"
                    >
                      {recusarMutation.isPending ? "Registrando..." : "Confirmar Recusa"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * VIEW DO PI LEGADO (Para manter 100% de retrocompatibilidade com links antigos)
 */
function AssinarPiView({
  token,
  data,
  refetch,
}: {
  token: string;
  data: any;
  refetch: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [aceito, setAceito] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  const formatarCpf = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    return v;
  };

  const assinar = useMutation({
    mutationFn: async () => {
      if (!padRef.current || padRef.current.isEmpty()) {
        throw new Error("Desenhe sua assinatura no quadro abaixo");
      }
      const dataUrl = padRef.current.toDataURL();
      if (!dataUrl) throw new Error("Não foi possível capturar a assinatura");
      return registrarAssinaturaCliente({
        data: {
          token,
          nome,
          cpf: cpf.replace(/\D/g, ""),
          email: email || undefined,
          user_agent: navigator.userAgent.slice(0, 500),
          assinatura_data_url: dataUrl,
        },
      });
    },
    onSuccess: () => {
      toast.success("PI assinado com sucesso!");
      refetch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [gerandoPdf, setGerandoPdf] = useState(false);
  const visualizarPdf = async () => {
    if (!data?.pi || gerandoPdf) return;
    const win = window.open("", "_blank");
    setGerandoPdf(true);
    try {
      const { gerarPdfPi } = await import("@/lib/pi-pdf");
      const sigs = (await getAssinaturaExecutivoPorToken({ data: { token } })) as any;
      const url = gerarPdfPi(data.pi as any, "blob", null, {
        assinaturaExecutivoDataUrl: sigs.exec?.dataUrl,
        nomeExecutivo: sigs.exec?.nome,
        assinaturaDiretoriaDataUrl: sigs.dir?.dataUrl,
        nomeDiretoria: sigs.dir?.nome,
      }) as string;

      if (win && !win.closed) {
        win.location.href = url;
      }
    } catch (e: any) {
      if (win && !win.closed) win.close();
      toast.error(e?.message || "Erro ao gerar o PDF");
    } finally {
      setGerandoPdf(false);
    }
  };

  const jaAssinado = data.assinatura?.status === "assinado";
  const pi = data.pi;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-background shadow-xs">
            <ShieldCheck className="size-3.5 text-primary" />
            Portal Seguro de Assinatura Eletrônica — Mídia.OS
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Pedido de Inserção nº {pi.numero}
          </h1>
          <p className="text-sm text-muted-foreground">{pi.campanha}</p>
        </div>

        {jaAssinado && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
              <div className="font-semibold text-lg text-emerald-950 dark:text-emerald-100">
                PI assinado com sucesso!
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Assinado por <strong>{data.assinatura.nome_assinante}</strong> em{" "}
                {new Date(data.assinatura.assinado_em).toLocaleString("pt-BR")}.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Resumo da Veiculação
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={visualizarPdf}
              disabled={gerandoPdf}
              className="gap-1.5"
            >
              {gerandoPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Visualizar PI Completo (PDF)
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Linha l="Cliente" v={pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "—"} />
              <Linha l="Agência" v={pi.agencia?.nome_fantasia || pi.agencia?.razao_social || "Direto"} />
              <Linha l="Período" v={`${pi.periodo_inicio || "—"} até ${pi.periodo_fim || "—"}`} />
              <Linha l="Valor Líquido" v={fmtBRL(pi.valor_liquido || 0)} forte />
            </div>
          </CardContent>
        </Card>

        {!jaAssinado && (
          <Card className="border-primary/30 shadow-lg shadow-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-primary" />
                Dados do Signatário
              </CardTitle>
              <CardDescription>
                Informe seus dados para validade jurídica desta assinatura digital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <Label>CPF *</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label>Nome completo *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome como no CPF"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>E-mail para confirmação</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <PenLine className="size-4 text-primary" />
                  Assinatura *
                </Label>
                <SignaturePad ref={padRef} height={180} />
              </div>

              <div className="rounded-lg bg-muted/50 p-4 border border-dashed text-xs">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={aceito} onCheckedChange={(v) => setAceito(!!v)} className="mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">
                    Declaro que li e concordo integralmente com o conteúdo deste Pedido de Inserção e o assino
                    eletronicamente, com validade jurídica nos termos da MP 2.200-2/2001.
                  </span>
                </label>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold"
                disabled={!nome.trim() || cpf.replace(/\D/g, "").length < 11 || !aceito || assinar.isPending}
                onClick={() => assinar.mutate()}
              >
                {assinar.isPending ? "Processando assinatura..." : "Confirmar e Assinar Eletronicamente"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Linha({ l, v, forte }: { l: string; v: string; forte?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{l}</div>
      <div className={forte ? "font-semibold text-primary" : ""}>{v}</div>
    </div>
  );
}
