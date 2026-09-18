import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  getPiAprovacaoPorToken,
  registrarAprovacaoDiretoria,
} from "@/lib/aprovacao-diretoria.functions";
import { getAssinaturaExecutivoPorToken } from "@/lib/assinaturas.functions";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, ShieldCheck, FileText, Download, User, Info, Loader2, PenLine,
} from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";

export const Route = createFileRoute("/aprovar-diretoria/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Aprovação da Diretoria — Mídia.OS" }] }),
  component: AprovarPi,
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function AprovarPi() {
  const { token } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pi-aprovacao", token],
    queryFn: () => getPiAprovacaoPorToken({ data: { token } }),
    retry: false,
  });

  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [modo, setModo] = useState<"aprovar" | "reprovar" | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const decidir = useMutation({
    mutationFn: async (decisao: "aprovado" | "reprovado") => {
      if (!nome.trim() || nome.trim().length < 3) throw new Error("Informe seu nome completo");
      let dataUrl: string | undefined;
      if (decisao === "aprovado") {
        if (!padRef.current || padRef.current.isEmpty()) throw new Error("Desenhe sua assinatura");
        dataUrl = padRef.current.toDataURL() ?? undefined;
      } else {
        if (!motivo.trim()) throw new Error("Informe o motivo da reprovação");
      }
      return registrarAprovacaoDiretoria({
        data: {
          token, decisao, nome: nome.trim(),
          cargo: cargo.trim() || undefined,
          motivo: motivo.trim() || undefined,
          assinatura_data_url: dataUrl,
          user_agent: navigator.userAgent.slice(0, 500),
        },
      });
    },
    onSuccess: (r) => {
      toast.success(r.decisao === "aprovado" ? "PI aprovado!" : "PI reprovado");
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
      // reusar fn pública que já retorna exec/dir pelo token de assinatura — aqui não temos.
      // Para preview na aprovação, basta gerar com assinatura do executivo (busca pela mesma pi).
      const sigs = await getAssinaturaExecutivoPorToken({ data: { token } }).catch(() => null);
      const url = gerarPdfPi(data.pi as any, "blob", null, {
        assinaturaExecutivoDataUrl: sigs?.exec?.dataUrl ?? null,
        nomeExecutivo: sigs?.exec?.nome ?? null,
      }) as unknown as string;
      if (win && !win.closed) win.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url; a.target = "_blank"; a.rel = "noopener";
        a.download = `PI-${data.pi.numero}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e: any) {
      if (win && !win.closed) win.close();
      toast.error(e?.message || "Erro ao gerar PDF");
    } finally { setGerandoPdf(false); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full"><CardContent className="py-10 text-center space-y-2">
          <h1 className="text-lg font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </CardContent></Card>
      </div>
    );
  }

  const pi = data!.pi as any;
  const aprov = data!.aprovacao as any;
  const decidido = aprov.status !== "pendente";
  const cli = pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "—";
  const ag = pi.agencia?.nome_fantasia || pi.agencia?.razao_social || "Direto";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-primary"><ShieldCheck className="size-5" /><span className="font-semibold">Mídia.OS</span></div>
          <h1 className="text-2xl font-semibold">Aprovação da Diretoria</h1>
          <p className="text-sm text-muted-foreground">Revise o Pedido de Inserção e registre sua decisão.</p>
        </div>

        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> PI {pi.numero}
                </CardTitle>
                <div className="text-xs text-muted-foreground">Campanha: {pi.campanha}</div>
              </div>
              <Badge variant="outline" className="capitalize">{pi.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 grid sm:grid-cols-2 gap-4 text-sm border-b border-dashed">
              <Linha l="Cliente" v={cli} />
              <Linha l="Agência" v={ag} />
              <Linha l="Veiculação" v={`${String(pi.mes_veiculacao).padStart(2, "0")}/${pi.ano_veiculacao}`} />
              <Linha l="Valor Total" v={fmtBRL(Number(pi.valor_negociado))} forte />
            </div>
            <div className="p-4 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Info className="size-4" /><span>Visualize o documento completo antes de decidir</span>
              </div>
              <Button onClick={visualizarPdf} disabled={gerandoPdf} className="w-full sm:w-auto">
                {gerandoPdf ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
                {gerandoPdf ? "Gerando..." : "Visualizar PI (PDF)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {decidido ? (
          <Card className={aprov.status === "aprovado" ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}>
            <CardContent className="py-10 text-center space-y-3">
              <div className={`size-16 rounded-full flex items-center justify-center mx-auto ${aprov.status === "aprovado" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {aprov.status === "aprovado" ? <CheckCircle2 className="size-10" /> : <XCircle className="size-10" />}
              </div>
              <div className="space-y-1">
                <h3 className={`text-xl font-bold ${aprov.status === "aprovado" ? "text-success" : "text-destructive"}`}>
                  {aprov.status === "aprovado" ? "PI Aprovado" : "PI Reprovado"}
                </h3>
                <p className="text-sm text-muted-foreground">Decisão registrada eletronicamente.</p>
              </div>
              {aprov.assinatura_signed_url && (
                <div className="mx-auto max-w-xs bg-white rounded-md border p-2">
                  <img src={aprov.assinatura_signed_url} alt="Assinatura" className="w-full h-auto" />
                </div>
              )}
              <div className="pt-4 mt-4 border-t text-sm">
                <div className="font-medium">{aprov.aprovador_nome}</div>
                {aprov.aprovador_cargo && <div className="text-xs text-muted-foreground">{aprov.aprovador_cargo}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(aprov.decidido_em).toLocaleString("pt-BR")}
                </div>
                {aprov.motivo_reprovacao && (
                  <div className="text-xs text-destructive mt-2">Motivo: {aprov.motivo_reprovacao}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-primary" /> Dados do Aprovador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Diretor Comercial" />
                </div>
              </div>

              {modo !== "reprovar" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <PenLine className="size-4 text-primary" /> Assinatura *
                  </Label>
                  <SignaturePad ref={padRef} height={180} />
                  <p className="text-[11px] text-muted-foreground">
                    Desenhe sua assinatura usando mouse, caneta ou dedo.
                  </p>
                </div>
              )}

              {modo === "reprovar" && (
                <div className="space-y-1.5">
                  <Label htmlFor="motivo">Motivo da reprovação *</Label>
                  <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 h-12"
                  size="lg"
                  disabled={decidir.isPending}
                  onClick={() => { setModo("aprovar"); decidir.mutate("aprovado"); }}
                >
                  {decidir.isPending && modo === "aprovar"
                    ? <><Loader2 className="size-5 mr-2 animate-spin" />Aprovando...</>
                    : <><CheckCircle2 className="size-5 mr-2" />Aprovar e Assinar</>}
                </Button>
                <Button
                  className="flex-1 h-12"
                  size="lg"
                  variant="outline"
                  disabled={decidir.isPending}
                  onClick={() => {
                    if (modo !== "reprovar") { setModo("reprovar"); return; }
                    decidir.mutate("reprovado");
                  }}
                >
                  <XCircle className="size-5 mr-2" />
                  {modo === "reprovar" ? "Confirmar Reprovação" : "Reprovar"}
                </Button>
              </div>
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
      <div className={forte ? "font-semibold" : ""}>{v}</div>
    </div>
  );
}
