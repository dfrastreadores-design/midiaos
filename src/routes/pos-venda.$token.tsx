import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPosVendaPublica } from "@/lib/pos-venda.functions";
import {
  CheckCircle2,
  ShieldCheck,
  FileText,
  Download,
  ExternalLink,
  Sparkles,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/pos-venda/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Comprovação de Veiculação — Mídia.OS" }] }),
  component: PosVendaPublica,
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function PosVendaPublica() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["pos-venda-publica", token],
    queryFn: () => getPosVendaPublica({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-2">
            <h1 className="text-lg font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Não foi possível abrir esta comprovação."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pi: any = data.pi;
  const pv: any = data.pos_venda;
  const anexos = (data.anexos ?? []) as any[];
  const cli = pi?.cliente?.nome_fantasia || pi?.cliente?.razao_social || "—";
  const ag = pi?.agencia?.nome_fantasia || pi?.agencia?.razao_social || "Direto";
  const periodo =
    pi?.periodo_inicio && pi?.periodo_fim
      ? `${new Date(pi.periodo_inicio).toLocaleDateString("pt-BR")} a ${new Date(pi.periodo_fim).toLocaleDateString("pt-BR")}`
      : `${String(pi?.mes_veiculacao ?? "").padStart(2, "0")}/${pi?.ano_veiculacao ?? ""}`;

  const wppExec = data.executivo?.whatsapp?.replace(/\D+/g, "");
  const wppLink = wppExec
    ? `https://wa.me/${wppExec.length === 10 || wppExec.length === 11 ? "55" + wppExec : wppExec}?text=${encodeURIComponent(
        `Olá ${data.executivo?.nome ?? ""}! Recebi a comprovação do PI ${pi?.numero}. Gostaria de renovar a campanha.`,
      )}`
    : null;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" />
            <span className="font-semibold">Mídia.OS</span>
          </div>
          <h1 className="text-2xl font-semibold">Comprovação de Veiculação</h1>
          <p className="text-sm text-muted-foreground">
            Pós-venda do Pedido de Inserção {pi?.numero}
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="size-5 text-primary" />
                PI {pi?.numero}
              </CardTitle>
              <Badge variant="outline" className="capitalize">
                {pv.status === "visualizada" ? (
                  <>
                    <CheckCircle2 className="size-3 mr-1" /> Visualizada
                  </>
                ) : (
                  pv.status
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
            <Linha l="Cliente" v={cli} />
            <Linha l="Agência" v={ag} />
            <Linha l="Campanha" v={pi?.campanha ?? "—"} />
            <Linha l="Período de veiculação" v={periodo} />
            <Linha l="Total de inserções contratadas" v={String(pi?.total_insercoes ?? 0)} />
            <Linha l="Valor da campanha" v={fmtBRL(Number(pi?.valor_negociado))} forte />
          </CardContent>
        </Card>

        {pv.mensagem && (
          <Card>
            <CardContent className="p-4 text-sm whitespace-pre-wrap">{pv.mensagem}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Itens veiculados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programa</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-right">Inserções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pi?.itens ?? []).map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.programa ?? it.tipo}</TableCell>
                    <TableCell>{it.formato ?? "—"}</TableCell>
                    <TableCell className="text-right">{it.total_insercoes}</TableCell>
                  </TableRow>
                ))}
                {(!pi?.itens || pi.itens.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      Sem itens cadastrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {(anexos.length > 0 || pv.link_provas) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Provas de entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {pv.link_provas && (
                <a
                  href={pv.link_provas}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-4" /> Abrir provas externas
                </a>
              )}
              {anexos.map((a) => (
                <a
                  key={a.id}
                  href={a.signed_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2 hover:bg-muted"
                >
                  <span className="truncate">{a.nome}</span>
                  <Download className="size-4 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-6 text-center space-y-3">
            <Sparkles className="size-6 mx-auto text-emerald-600" />
            <h3 className="text-lg font-semibold">Vamos renovar sua campanha?</h3>
            <p className="text-sm text-muted-foreground">
              Fale com {data.executivo?.nome ?? "seu executivo"} para aproveitar o melhor da
              audiência no próximo ciclo.
            </p>
            {wppLink && (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <a href={wppLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4 mr-2" /> Falar no WhatsApp
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
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
