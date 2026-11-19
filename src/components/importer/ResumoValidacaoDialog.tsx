import React, { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Building2,
  DollarSign,
  MapPin,
  Image as ImageIcon,
  Copy,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import type { ProdutoExtraidoMidiaKit } from "@/lib/midia-kit-ai.functions";

interface ResumoValidacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoExtraidoMidiaKit[];
  nomeParceiro: string;
  totalFotosNoKit: number;
  totalFotosPendentes: number;
  duplicidadesEncontradas: { id: string; nome: string }[];
  isSaving: boolean;
  onConfirmarCadastro: (apenasValidos: boolean) => void;
}

export function ResumoValidacaoDialog({
  open,
  onOpenChange,
  produtos,
  nomeParceiro,
  totalFotosNoKit,
  totalFotosPendentes,
  duplicidadesEncontradas,
  isSaving,
  onConfirmarCadastro,
}: ResumoValidacaoDialogProps) {
  const [apenasValidos, setApenasValidos] = useState(false);

  const selecionados = produtos.filter((p) => p.selecionado);
  const total = produtos.length;
  const totalSel = selecionados.length;

  // Análises de completude
  const semNome = selecionados.filter((p) => !p.nome || p.nome.trim().length === 0);
  const semPreco = selecionados.filter((p) => !p.valor_unit || Number(p.valor_unit) <= 0);
  const semLocalizacao = selecionados.filter((p) => !p.cidade && !p.endereco && !p.ponto_referencia);
  const semFoto = selecionados.filter((p) => !p.fotos || p.fotos.length === 0);

  // Erros que impedem o cadastro: nome obrigatório
  const errosImpedem = semNome.length > 0;

  // Produtos estritamente válidos (com nome e preço positivo)
  const produtosValidos = selecionados.filter(
    (p) => Boolean(p.nome && p.nome.trim().length > 0 && Number(p.valor_unit) > 0),
  );
  const produtosIncompletos = selecionados.filter(
    (p) => !p.nome || p.nome.trim().length === 0 || !p.valor_unit || Number(p.valor_unit) <= 0,
  );

  const totalParaCadastrar = apenasValidos ? produtosValidos.length : totalSel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Validação Pré-Cadastro no Inventário
                <Badge variant="outline" className="text-xs">
                  {nomeParceiro}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Auditoria de integridade dos dados antes da gravação permanente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 overflow-y-auto pr-1 flex-1 text-xs">
          {/* PAINEL DE MÉTRICAS AUDITADAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-lg border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Total Encontrados</span>
              <span className="text-lg font-bold text-foreground">{total}</span>
            </div>

            <div className="p-2.5 rounded-lg border bg-primary/5 border-primary/20">
              <span className="text-[11px] text-primary block">Selecionados</span>
              <span className="text-lg font-bold text-primary">{totalSel}</span>
            </div>

            <div className="p-2.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">Completos & Válidos</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {produtosValidos.length}
              </span>
            </div>

            <div className={`p-2.5 rounded-lg border ${produtosIncompletos.length > 0 ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300" : "bg-muted/30"}`}>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 block">Incompletos</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {produtosIncompletos.length}
              </span>
            </div>
          </div>

          {/* DIAGNÓSTICO DETALHADO POR CATEGORIA */}
          <div className="p-3 rounded-xl border bg-background space-y-2.5">
            <span className="font-semibold text-foreground text-xs block">Diagnóstico de Qualidade dos Dados:</span>

            <div className="space-y-2">
              {/* Preço */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="size-3.5 text-emerald-600" />
                  Produtos sem Preço de Tabela (R$ 0,00):
                </span>
                {semPreco.length > 0 ? (
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300">
                    {semPreco.length} produtos
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                    ✓ Todos com preço
                  </Badge>
                )}
              </div>

              {/* Localização */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-3.5 text-blue-600" />
                  Produtos sem Localização (Cidade/UF/Endereço):
                </span>
                {semLocalizacao.length > 0 ? (
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300">
                    {semLocalizacao.length} produtos
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                    ✓ Todos localizados
                  </Badge>
                )}
              </div>

              {/* Fotografias */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ImageIcon className="size-3.5 text-purple-600" />
                  Produtos com "Foto Real Pendente":
                </span>
                {semFoto.length > 0 ? (
                  <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-300">
                    {semFoto.length} pontos sem foto
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                    ✓ Todos com foto real
                  </Badge>
                )}
              </div>

              {/* Fotos no kit pendentes de associação */}
              {totalFotosPendentes > 0 && (
                <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ImageIcon className="size-3.5 text-amber-600" />
                    Fotos do Mídia Kit não associadas:
                  </span>
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300">
                    {totalFotosPendentes} imagens
                  </Badge>
                </div>
              )}

              {/* Duplicidades potenciais */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Copy className="size-3.5 text-indigo-600" />
                  Produtos com mesmo nome no Inventário Existente:
                </span>
                {duplicidadesEncontradas.length > 0 ? (
                  <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-300">
                    {duplicidadesEncontradas.length} serão atualizados (sem duplicar)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                    Nenhuma duplicidade
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ERRO IMPEDIENTE (Nome vazio) */}
          {errosImpedem && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-900/60 rounded-xl flex items-start gap-2 text-destructive">
              <XCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold">Atenção: Existem produtos selecionados sem Nome!</span>
                <p className="text-[11px] text-destructive/90">
                  Preencha o nome de todos os produtos antes de cadastrar ou desmarque os itens vazios.
                </p>
              </div>
            </div>
          )}

          {/* OPÇÃO DE CADASTRAR APENAS OS VÁLIDOS */}
          {produtosIncompletos.length > 0 && (
            <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="chk-apenas-validos"
                  checked={apenasValidos}
                  onCheckedChange={(c) => setApenasValidos(Boolean(c))}
                />
                <Label htmlFor="chk-apenas-validos" className="text-xs font-semibold cursor-pointer">
                  Cadastrar somente os {produtosValidos.length} produtos válidos agora e manter os incompletos ({produtosIncompletos.length}) em revisão
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Voltar e Corrigir
          </Button>

          <Button
            type="button"
            onClick={() => onConfirmarCadastro(apenasValidos)}
            disabled={isSaving || totalParaCadastrar === 0 || errosImpedem}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Cadastrando no Inventário...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Confirmar Cadastro de {totalParaCadastrar} Produtos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
