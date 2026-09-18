import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getPiPublicoPorToken, registrarAssinaturaCliente, getAssinaturaExecutivoPorToken } from "@/lib/assinaturas.functions";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, FileText, Download, User, Info, Loader2, PenLine } from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";


export const Route = createFileRoute("/assinar/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Assinar Pedido de Inserção — Mídia.OS" }] }),
  component: AssinarPi,
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function AssinarPi() {
  const { token } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pi-publico", token],
    queryFn: () => getPiPublicoPorToken({ data: { token } }),
    retry: false,
  });

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [aceito, setAceito] = useState(false);
  const [consultandoCpf, setConsultandoCpf] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);


  const formatarCpf = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    return v;
  };

  const consultarCpf = async (cpfPuro: string) => {
    if (cpfPuro.length !== 11) return;
    setConsultandoCpf(true);
    try {
      // Usando uma API pública/gratuita para teste (BrasilAPI ou similar)
      // Nota: Muitas APIs de CPF exigem token ou data de nascimento por segurança.
      // Aqui simulamos a busca ou usamos um serviço que permita consulta básica se disponível.
      const res = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cpfPuro}`).then(r => r.json());
      if (res.nome) {
        setNome(res.nome);
        toast.success("Dados preenchidos via CPF");
      }
    } catch (e) {
      console.error("Erro ao consultar CPF:", e);
    } finally {
      setConsultandoCpf(false);
    }
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
    // Abrir a janela SINCRONAMENTE no clique para evitar bloqueio de pop-up (especialmente no mobile)
    const win = window.open("", "_blank");
    setGerandoPdf(true);
    try {
      const { gerarPdfPi } = await import("@/lib/pi-pdf");
      const sigs = await getAssinaturaExecutivoPorToken({ data: { token } }) as any;
      const url = gerarPdfPi(data.pi as any, "blob", null, {
        assinaturaExecutivoDataUrl: sigs.exec?.dataUrl,
        nomeExecutivo: sigs.exec?.nome,
        assinaturaDiretoriaDataUrl: sigs.dir?.dataUrl,
        nomeDiretoria: sigs.dir?.nome,
      }) as string;

      if (win && !win.closed) {
        win.location.href = url;
      } else {
        // Fallback: força download/abertura inline na mesma aba
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = `PI-${data.pi.numero}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e: any) {
      if (win && !win.closed) win.close();
      toast.error(e?.message || "Erro ao gerar o PDF");
    } finally {
      setGerandoPdf(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-2">
            <h1 className="text-lg font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pi = data!.pi as any;
  const assinatura = data!.assinatura as any;
  const jaAssinado = assinatura.status === "assinado";
  const cli = pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "—";
  const ag = pi.agencia?.nome_fantasia || pi.agencia?.razao_social || "Direto";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-primary"><ShieldCheck className="size-5" /><span className="font-semibold">Mídia.OS · TV Brasília</span></div>
          <h1 className="text-2xl font-semibold">Assinatura do Pedido de Inserção</h1>
          <p className="text-sm text-muted-foreground">Confira os dados e assine eletronicamente.</p>
        </div>

        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  PI {pi.numero}
                </CardTitle>
                <div className="text-xs text-muted-foreground">Campanha: {pi.campanha}</div>
              </div>
              <Badge variant="outline" className="capitalize">
                {pi.status}
              </Badge>
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
                <Info className="size-4" />
                <span>Visualize o documento completo antes de assinar</span>
              </div>
              <Button onClick={visualizarPdf} disabled={gerandoPdf} variant="default" className="w-full sm:w-auto shadow-sm">
                {gerandoPdf ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
                {gerandoPdf ? "Gerando PDF..." : "Visualizar PI (PDF)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {jaAssinado ? (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="py-10 text-center space-y-3">
              <div className="size-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-success">Documento Assinado</h3>
                <p className="text-sm text-muted-foreground">Este Pedido de Inserção foi assinado eletronicamente.</p>
              </div>
              {assinatura.assinatura_signed_url && (
                <div className="mx-auto max-w-xs bg-white rounded-md border p-2">
                  <img src={assinatura.assinatura_signed_url} alt="Assinatura do cliente" className="w-full h-auto" />
                </div>
              )}
              <div className="pt-4 mt-4 border-t border-success/10 text-sm">
                <div className="font-medium">{assinatura.nome_assinante}</div>
                <div className="text-xs text-muted-foreground">CPF: {formatarCpf(assinatura.cpf)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Assinado em {new Date(assinatura.assinado_em).toLocaleString("pt-BR")}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-primary" />
                Dados do Assinante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">Seu CPF *</Label>
                  <div className="relative">
                    <Input 
                      id="cpf"
                      value={cpf} 
                      onChange={(e) => {
                        const v = formatarCpf(e.target.value);
                        setCpf(v);
                        if (v.replace(/\D/g, "").length === 11) {
                          consultarCpf(v.replace(/\D/g, ""));
                        }
                      }} 
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    {consultandoCpf && (
                      <Loader2 className="size-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Seus dados serão preenchidos automaticamente após o CPF</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input 
                    id="nome"
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Nome como consta no documento"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">E-mail para confirmação</Label>
                  <Input 
                    id="email"
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
                <p className="text-[11px] text-muted-foreground">
                  Desenhe sua assinatura no quadro acima usando o mouse, caneta ou dedo (em dispositivos touch).
                </p>
              </div>




              <div className="rounded-lg bg-muted/50 p-4 border border-dashed">
                <label className="flex items-start gap-3 text-sm cursor-pointer group">
                  <Checkbox 
                    id="termos"
                    checked={aceito} 
                    onCheckedChange={(v) => setAceito(!!v)} 
                    className="mt-1"
                  />
                  <span className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    Declaro que li e concordo integralmente com o conteúdo deste Pedido de Inserção e o assino
                    eletronicamente, com validade jurídica nos termos da MP 2.200-2/2001. Serão registrados meu
                    nome, CPF, endereço IP e data/hora desta assinatura para fins de auditoria.
                  </span>
                </label>
              </div>

              <Button
                className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                size="lg"
                disabled={!nome.trim() || cpf.replace(/\D/g, "").length < 11 || !aceito || assinar.isPending}
                onClick={() => assinar.mutate()}
              >
                {assinar.isPending ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    Processando assinatura...
                  </>
                ) : (
                  "Confirmar e Assinar Eletronicamente"
                )}
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
      <div className={forte ? "font-semibold" : ""}>{v}</div>
    </div>
  );
}
