import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  DollarSign,
  Package,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Maximize2,
  Layers,
  Wand2,
  Eye,
  Sliders,
  RotateCcw,
} from "lucide-react";
import {
  type ModeloPropostaCliente,
  type CampoMapeadoProposta,
  type ChaveBlocoProposta,
  CAMPOS_PADRAO_PROPOSTA,
} from "@/types/modelo-proposta";
import { toast } from "sonner";

interface EditorMapeamentoPropostaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelo: ModeloPropostaCliente | null;
  onSave: (modeloAtualizado: ModeloPropostaCliente) => void;
}

const CORES_BLOCOS: Record<
  ChaveBlocoProposta,
  { bg: string; border: string; text: string; badge: string; icon: any }
> = {
  valores: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: DollarSign,
  },
  produtos: {
    bg: "bg-blue-500/10",
    border: "border-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    icon: Package,
  },
  defesa: {
    bg: "bg-purple-500/10",
    border: "border-purple-500",
    text: "text-purple-700 dark:text-purple-300",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    icon: Sparkles,
  },
  cliente: {
    bg: "bg-amber-500/10",
    border: "border-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: UserCheck,
  },
  assinaturas: {
    bg: "bg-slate-500/10",
    border: "border-slate-500",
    text: "text-slate-700 dark:text-slate-300",
    badge: "bg-slate-100 text-slate-800 border-slate-300",
    icon: CheckCircle2,
  },
  executivo: {
    bg: "bg-teal-500/10",
    border: "border-teal-500",
    text: "text-teal-700 dark:text-teal-300",
    badge: "bg-teal-100 text-teal-800 border-teal-300",
    icon: UserCheck,
  },
  cronograma: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: Layers,
  },
};

export function EditorMapeamentoPropostaDialog({
  open,
  onOpenChange,
  modelo,
  onSave,
}: EditorMapeamentoPropostaDialogProps) {
  if (!modelo) return null;

  const [campos, setCampos] = useState<CampoMapeadoProposta[]>(() => {
    if (modelo.campos_mapeados && modelo.campos_mapeados.length > 0) {
      return modelo.campos_mapeados;
    }
    return CAMPOS_PADRAO_PROPOSTA.map((c, idx) => ({
      ...c,
      id: `campo-${idx}-${Date.now()}`,
    }));
  });

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [campoSelecionadoId, setCampoSelecionadoId] = useState<string>(
    campos[0]?.id || ""
  );
  const [modoVisualizacao, setModoVisualizacao] = useState<"editar" | "preview">(
    "editar"
  );

  const campoAtivo = campos.find((c) => c.id === campoSelecionadoId) || campos[0];

  const atualizarCampo = (id: string, updates: Partial<CampoMapeadoProposta>) => {
    setCampos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const autoOrganizarLayout = () => {
    const reorganizados = campos.map((c) => {
      if (c.chave === "cliente") {
        return { ...c, pagina: 1, posicao_x: 5, posicao_y: 8, largura: 90, altura: 14 };
      }
      if (c.chave === "defesa") {
        return { ...c, pagina: 1, posicao_x: 5, posicao_y: 24, largura: 90, altura: 28 };
      }
      if (c.chave === "produtos") {
        return { ...c, pagina: 1, posicao_x: 5, posicao_y: 54, largura: 90, altura: 26 };
      }
      if (c.chave === "valores") {
        return { ...c, pagina: 1, posicao_x: 5, posicao_y: 82, largura: 45, altura: 14 };
      }
      if (c.chave === "assinaturas") {
        return { ...c, pagina: 1, posicao_x: 52, posicao_y: 82, largura: 43, altura: 14 };
      }
      return c;
    });
    setCampos(reorganizados);
    toast.success("Layout auto-organizado com sucesso!", {
      description: "Posições de Valores, Produtos e Defesa alinhadas perfeitamente.",
    });
  };

  const salvarAlteracoes = () => {
    const atualizado: ModeloPropostaCliente = {
      ...modelo,
      campos_mapeados: campos,
      atualizado_em: new Date().toISOString(),
    };
    onSave(atualizado);
    toast.success("Mapeamento do modelo salvo com sucesso!");
    onOpenChange(false);
  };

  const camposNaPagina = campos.filter(
    (c) => c.pagina === paginaAtual && c.ativo
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Mapeamento de Proposta Personalizada — {modelo.nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Defina visualmente onde ficarão os blocos de{" "}
                <strong className="text-foreground">Valores</strong>,{" "}
                <strong className="text-foreground">Grade de Produtos</strong> e{" "}
                <strong className="text-foreground">Defesa da Proposta</strong> no PDF deste cliente.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={autoOrganizarLayout}
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
              >
                <Wand2 className="size-3.5" />
                Auto-alinhar Campos
              </Button>
              <Button
                variant={modoVisualizacao === "preview" ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setModoVisualizacao(modoVisualizacao === "preview" ? "editar" : "preview")
                }
                className="gap-1.5 text-xs"
              >
                <Eye className="size-3.5" />
                {modoVisualizacao === "preview" ? "Voltar ao Editor" : "Ver Simulação"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Seletor de Página do Modelo */}
        <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground">Página de Trabalho:</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((num) => (
                <Button
                  key={num}
                  size="sm"
                  variant={paginaAtual === num ? "default" : "outline"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setPaginaAtual(num)}
                >
                  Página {num}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Total de {camposNaPagina.length} blocos mapeados nesta página
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          {/* Painel Esquerdo: Canvas A4 Visualizador */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/5 dark:bg-slate-950 p-4 rounded-xl border border-dashed">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Maximize2 className="size-3.5" /> Folha PDF Modelo (Página {paginaAtual})
            </div>

            {/* Canvas Folha A4 (Aspect Ratio ~ 1:1.414) */}
            <div
              className="relative w-full max-w-[440px] aspect-[1/1.414] bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 overflow-hidden select-none"
              style={{
                backgroundImage:
                  "radial-gradient(#e2e8f0 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              {/* Header simulado da folha do cliente */}
              <div className="absolute top-2 left-4 right-4 flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Mídia.OS · Proposta Comercial
                </span>
                <span className="text-[8px] text-slate-400 font-mono">
                  Pág. {paginaAtual} / 3
                </span>
              </div>

              {/* Blocos Mapeados posicionados percentualmente */}
              {camposNaPagina.map((campo) => {
                const conf = CORES_BLOCOS[campo.chave] || CORES_BLOCOS.valores;
                const isSelected = campo.id === campoAtivo?.id;
                const Icone = conf.icon;

                return (
                  <div
                    key={campo.id}
                    onClick={() => setCampoSelecionadoId(campo.id)}
                    className={`absolute cursor-pointer transition-all duration-150 rounded border-2 p-2 flex flex-col justify-between overflow-hidden shadow-sm ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-1 z-30 " + conf.border
                        : "hover:ring-1 hover:ring-slate-400 opacity-90 z-10 " + conf.border
                    } ${conf.bg}`}
                    style={{
                      left: `${campo.posicao_x}%`,
                      top: `${campo.posicao_y}%`,
                      width: `${campo.largura}%`,
                      height: `${campo.altura}%`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold truncate">
                        <Icone className="size-3 shrink-0" />
                        {campo.rotulo}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-white font-mono shrink-0">
                          {campo.largura}% × {campo.altura}%
                        </span>
                      )}
                    </div>

                    {modoVisualizacao === "preview" ? (
                      <div className="text-[9px] text-slate-700 leading-tight mt-1 truncate">
                        {campo.chave === "valores" && (
                          <span className="font-bold text-emerald-800">
                            R$ 48.500,00 (À vista ou 3x s/ juros)
                          </span>
                        )}
                        {campo.chave === "produtos" && (
                          <span>
                            TV Aberta (30"), Circuito DOOH Metro, Spot Rádio 98FM
                          </span>
                        )}
                        {campo.chave === "defesa" && (
                          <span className="italic">
                            "A campanha entrega mais de 2.4M de impactos com alto recall na praça..."
                          </span>
                        )}
                        {campo.chave === "cliente" && (
                          <span>Auto Shopping Sul Ltda · CNPJ 00.123.456/0001-00</span>
                        )}
                        {campo.chave === "assinaturas" && (
                          <span>De acordo: _____________________ Data: __/__/__</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[8px] text-slate-500 font-mono mt-0.5 truncate">
                        X: {campo.posicao_x}% | Y: {campo.posicao_y}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Clique em um bloco para editar suas coordenadas e dimensões.
            </p>
          </div>

          {/* Painel Direito: Configuração Detalhada do Bloco Selecionado */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  {campoAtivo && (
                    <Badge
                      variant="outline"
                      className={CORES_BLOCOS[campoAtivo.chave]?.badge}
                    >
                      {campoAtivo.rotulo}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Página {campoAtivo?.pagina || 1}
                </div>
              </div>

              {campoAtivo ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold">Nome do Bloco</Label>
                    <Input
                      value={campoAtivo.rotulo}
                      onChange={(e) =>
                        atualizarCampo(campoAtivo.id, { rotulo: e.target.value })
                      }
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">
                      Página de Inserção no PDF
                    </Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[1, 2, 3].map((p) => (
                        <Button
                          key={p}
                          type="button"
                          size="sm"
                          variant={campoAtivo.pagina === p ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => {
                            atualizarCampo(campoAtivo.id, { pagina: p });
                            setPaginaAtual(p);
                          }}
                        >
                          Página {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs">Posição Vertical (Y - Altura na folha)</Label>
                      <span className="font-mono text-muted-foreground">
                        {campoAtivo.posicao_y}%
                      </span>
                    </div>
                    <Slider
                      value={[campoAtivo.posicao_y]}
                      min={0}
                      max={90}
                      step={1}
                      onValueChange={([v]) =>
                        atualizarCampo(campoAtivo.id, { posicao_y: v })
                      }
                    />

                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs">Posição Horizontal (X)</Label>
                      <span className="font-mono text-muted-foreground">
                        {campoAtivo.posicao_x}%
                      </span>
                    </div>
                    <Slider
                      value={[campoAtivo.posicao_x]}
                      min={0}
                      max={80}
                      step={1}
                      onValueChange={([v]) =>
                        atualizarCampo(campoAtivo.id, { posicao_x: v })
                      }
                    />

                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs">Largura do Bloco (%)</Label>
                      <span className="font-mono text-muted-foreground">
                        {campoAtivo.largura}%
                      </span>
                    </div>
                    <Slider
                      value={[campoAtivo.largura]}
                      min={20}
                      max={95}
                      step={1}
                      onValueChange={([v]) =>
                        atualizarCampo(campoAtivo.id, { largura: v })
                      }
                    />

                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs">Altura do Bloco (%)</Label>
                      <span className="font-mono text-muted-foreground">
                        {campoAtivo.altura}%
                      </span>
                    </div>
                    <Slider
                      value={[campoAtivo.altura]}
                      min={8}
                      max={50}
                      step={1}
                      onValueChange={([v]) =>
                        atualizarCampo(campoAtivo.id, { altura: v })
                      }
                    />
                  </div>

                  <div className="pt-2 border-t text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg space-y-1">
                    <div className="font-semibold text-foreground">
                      💡 Finalidade deste bloco:
                    </div>
                    <div>{campoAtivo.descricao}</div>
                    <div className="italic text-primary/80">
                      {campoAtivo.orientacao_impressao}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  Nenhum bloco selecionado
                </div>
              )}
            </div>

            {/* Lista Rápida dos Blocos */}
            <div className="border rounded-xl p-3 bg-card space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Blocos Disponíveis
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {campos.map((c) => {
                  const conf = CORES_BLOCOS[c.chave] || CORES_BLOCOS.valores;
                  const isSelected = c.id === campoAtivo?.id;
                  const Icone = conf.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCampoSelecionadoId(c.id);
                        setPaginaAtual(c.pagina);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors border text-left ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-semibold"
                          : "hover:bg-muted/60 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icone className="size-3.5 shrink-0" />
                        <span className="truncate">{c.rotulo}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Pág. {c.pagina}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoOrganizarLayout}
              className="gap-1 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Restaurar Padrão
            </Button>
            <Button
              size="sm"
              onClick={salvarAlteracoes}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="size-4" />
              Salvar Mapeamento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
