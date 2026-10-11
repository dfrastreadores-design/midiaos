import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ExternalLink,
  Layers,
  MapPin,
  Sparkles,
  Monitor,
  Radio,
  Tv,
  Globe,
  Newspaper,
  Tags,
  Upload,
} from "lucide-react";
import { listProdutos } from "@/lib/produtos.functions";
import type { Parceiro } from "@/types/representacao-comercial.types";
import type { Produto } from "@/components/ProdutoFormDialog";
import { formatBRL } from "@/lib/mock-data";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";

interface ParceiroProdutosModalProps {
  parceiro: Parceiro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenImport?: (parceiroId: string) => void;
}

export function ParceiroProdutosModal({
  parceiro,
  open,
  onOpenChange,
  onOpenImport,
}: ParceiroProdutosModalProps) {
  const { data: allProdutos = [], isLoading } = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: () => listProdutos(),
    enabled: open && !!parceiro,
  });

  if (!parceiro) return null;

  const parceiroNome = (parceiro.nome_fantasia || parceiro.razao_social || "").trim().toLowerCase();
  const parceiroCnpjClean = (parceiro.cnpj || "").replace(/\D/g, "");

  const produtosDoParceiro = (allProdutos as Produto[]).filter((p) => {
    if (p.parceiro_id && p.parceiro_id === parceiro.id) return true;
    if (parceiroNome) {
      const pNome = (p.parceiro_nome || "").toLowerCase().trim();
      if (pNome && (pNome.includes(parceiroNome) || parceiroNome.includes(pNome))) return true;
      if (p.parceiro_cnpj && parceiroCnpjClean && p.parceiro_cnpj.replace(/\D/g, "").includes(parceiroCnpjClean)) {
        return true;
      }
      const words = parceiroNome
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["ltda", "me", "epp", "e", "paineis"].includes(w));
      if (words.some((w) => pNome.includes(w))) return true;
    }
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 gap-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
              <Layers className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Mídias & Produtos: {parceiro.nome_fantasia || parceiro.razao_social}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {parceiro.cnpj ? `CNPJ: ${parceiro.cnpj} • ` : ""}
                Total de {produtosDoParceiro.length} item(ns) cadastrados no catálogo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[240px] max-h-[55vh] border rounded-xl">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
              Carregando inventário do parceiro...
            </div>
          ) : produtosDoParceiro.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="size-12 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto text-purple-600">
                <Layers className="size-6" />
              </div>
              <h3 className="text-base font-semibold">Nenhum produto listado para este parceiro</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Você pode importar planilhas ou mídia kit em PDF para cadastrar os pontos comerciais
                automaticamente vinculados a este veículo.
              </p>
              {onOpenImport && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenImport(parceiro.id);
                  }}
                  className="gap-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Upload className="size-3.5" />
                  Importar Produtos Agora
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-12">Foto</TableHead>
                  <TableHead>Ponto / Produto</TableHead>
                  <TableHead>Mídia & Tipo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Valor Unitário</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosDoParceiro.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="p-2">
                      {p.fotos && p.fotos.length > 0 ? (
                        <div className="size-10 rounded-md overflow-hidden border">
                          <ProdutoFotoImg
                            stored={p.fotos[0]}
                            alt={p.nome}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-10 rounded-md bg-muted/40 border border-dashed flex items-center justify-center text-muted-foreground text-[10px]">
                          Sem foto
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{p.nome}</div>
                      {p.programa && (
                        <div className="text-xs text-muted-foreground">{p.programa}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0 font-bold">
                          {p.midia}
                        </Badge>
                        {p.tipo && (
                          <span className="text-xs text-muted-foreground">{p.tipo}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 shrink-0 text-muted-foreground/60" />
                        <span className="truncate max-w-[180px]">
                          {[p.localizacao, p.bairro, p.cidade].filter(Boolean).join(" • ") || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatBRL(p.valor_unit || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={p.ativo ? "default" : "secondary"}
                        className={p.ativo ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            size="sm"
            asChild
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Link
              to="/produtos"
              search={{
                parceiro_id: parceiro.id,
                parceiro: parceiro.nome_fantasia || parceiro.razao_social,
                view: "tabela",
              } as any}
              onClick={() => onOpenChange(false)}
            >
              Abrir no Inventário Geral
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
