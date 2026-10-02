import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  UserCheck,
  Plus,
  Search,
  Percent,
  QrCode,
  DollarSign,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Copy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  listIndicadores,
  deleteIndicador,
  type IndicadorInput,
} from "@/lib/indicadores.functions";
import { IndicadorFormDialog } from "./IndicadorFormDialog";
import { toast } from "sonner";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function IndicadoresTab() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [indicadorEdicao, setIndicadorEdicao] = useState<IndicadorInput | null>(null);

  const { data: indicadores = [], isLoading } = useQuery({
    queryKey: ["indicadores"],
    queryFn: () => listIndicadores(),
  });

  const { mutateAsync: remover } = useMutation({
    mutationFn: (id: string) => deleteIndicador({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      toast.success("Indicador removido");
    },
    onError: (err: any) => {
      toast.error("Erro ao remover: " + err.message);
    },
  });

  const filtrados = indicadores.filter((ind: any) => {
    const q = busca.toLowerCase();
    return (
      ind.nome.toLowerCase().includes(q) ||
      (ind.email && ind.email.toLowerCase().includes(q)) ||
      (ind.telefone && ind.telefone.includes(q)) ||
      (ind.chave_pix && ind.chave_pix.toLowerCase().includes(q))
    );
  });

  const totalIndicadores = indicadores.length;
  const totalClientesIndicados = indicadores.reduce(
    (s: number, i: any) => s + (i.clientes_count || 0),
    0
  );
  const totalComissoesPendentes = indicadores.reduce(
    (s: number, i: any) => s + (i.total_comissao_pendente || 0),
    0
  );
  const totalComissoesPagas = indicadores.reduce(
    (s: number, i: any) => s + (i.total_comissao_paga || 0),
    0
  );

  const copiarPix = (chave: string) => {
    navigator.clipboard.writeText(chave);
    toast.success("Chave PIX copiada para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas do Módulo de Representação e Indicação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Indicadores Ativos</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalIndicadores}</h3>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Clientes Indicados</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {totalClientesIndicados}
              </h3>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Comissões a Pagar (PIX)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">
                {fmtBRL(totalComissoesPendentes)}
              </h3>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Comissões Pagas</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {fmtBRL(totalComissoesPagas)}
              </h3>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou PIX..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Button
          onClick={() => {
            setIndicadorEdicao(null);
            setDialogAberto(true);
          }}
          className="w-full sm:w-auto gap-1.5 text-xs bg-primary hover:bg-primary/90 h-9"
        >
          <Plus className="size-3.5" />
          Cadastrar Pessoa que Indica
        </Button>
      </div>

      {/* Tabela de Indicadores */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs">
              <TableHead>Pessoa / Indicador</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-center">Comissão %</TableHead>
              <TableHead>Chave PIX para Repasse</TableHead>
              <TableHead className="text-center">Clientes</TableHead>
              <TableHead className="text-right">A Receber</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  Carregando indicadores...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <UserCheck className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Nenhuma pessoa cadastrada para indicação
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cadastre promotores e parceiros para vincular aos clientes e automatizar comissões de representação.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((ind: any) => (
                <TableRow key={ind.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {ind.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{ind.nome}</div>
                        {ind.cpf_cnpj && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {ind.cpf_cnpj}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5">
                      {ind.telefone && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Phone className="size-3" /> {ind.telefone}
                        </div>
                      )}
                      {ind.email && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Mail className="size-3" /> {ind.email}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                      {ind.percentual_comissao_padrao}%
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {ind.chave_pix ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border truncate max-w-[170px]">
                          {ind.chave_pix}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="Copiar Chave PIX"
                          onClick={() => copiarPix(ind.chave_pix)}
                        >
                          <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        Não cadastrada
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center font-bold">
                    {ind.clientes_count}
                  </TableCell>

                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        ind.total_comissao_pendente > 0
                          ? "text-amber-600 font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {fmtBRL(ind.total_comissao_pendente)}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setIndicadorEdicao(ind);
                          setDialogAberto(true);
                        }}
                      >
                        <Edit2 className="size-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Remover "${ind.nome}" das indicações?`)) {
                            remover(ind.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {dialogAberto && (
        <IndicadorFormDialog
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          indicador={indicadorEdicao}
          onSaved={() => qc.invalidateQueries({ queryKey: ["indicadores"] })}
        />
      )}
    </div>
  );
}
