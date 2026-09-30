import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  FileUp,
  Layout,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Eye,
  Palette,
  CheckCircle2,
  Layers,
  Sliders,
  Presentation,
  Loader2,
  Table as TableIcon,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  upsertProposalLayout,
  type ProposalLayoutRow,
  type SlideTemplateItem,
  type MapeamentoTemplateConfig,
} from "@/lib/layouts.functions";
import {
  uploadSlideImage,
  extrairSlidesDePdf,
  blobToDataUrl,
} from "@/lib/proposta-template-import";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ProposalLayoutRow | null;
  onSaved?: (layout?: { id: string }) => void;
};

const DEFAULT_MAPEAMENTO: MapeamentoTemplateConfig = {
  slideCapaIndex: 0,
  slideProdutosIndex: 1, // se tiver 2+ slides, sugere o slide 2 ou 3
  slideEstrategiaIndex: null,
  slideFinalIndex: null,
  tabela: {
    margemSuperiorPct: 24, // começa a 24% do topo do slide
    margemInferiorPct: 8,
    margemEsquerdaPct: 5,
    margemDireitaPct: 5,
    itensPorSlide: 10,
    corHeader: "#0F5C7C",
    corTextoHeader: "#FFFFFF",
    corTexto: "#1F2937",
    corLinhaDestaque: "#F7B500",
  },
  capa: {
    mostrarLogoCliente: true,
    mostrarNomeCliente: true,
    mostrarCampanha: true,
    mostrarNumeroProposta: true,
    mostrarData: true,
    posicaoVertical: "inferior",
    posicaoHorizontal: "esquerda",
    corTexto: "#FFFFFF",
  },
};

export function ImportarModeloPropostaDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProposalLayout);

  const [tabAtiva, setTabAtiva] = useState<"slides" | "mapeamento" | "estilo">("slides");
  const [nomeModelo, setNomeModelo] = useState("Modelo Oficial da Empresa");
  const [isDefault, setIsDefault] = useState(true);
  const [slides, setSlides] = useState<SlideTemplateItem[]>([]);
  const [mapeamento, setMapeamento] = useState<MapeamentoTemplateConfig>(DEFAULT_MAPEAMENTO);
  const [processandoArquivos, setProcessandoArquivos] = useState(false);
  const [statusProgresso, setStatusProgresso] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setNomeModelo(initial.name || "Modelo da Empresa");
        setIsDefault(!!initial.is_default);
        setSlides(initial.slides || []);
        setMapeamento(initial.mapeamento || DEFAULT_MAPEAMENTO);
      } else {
        setNomeModelo("Modelo Oficial da Empresa");
        setIsDefault(true);
        setSlides([]);
        setMapeamento(DEFAULT_MAPEAMENTO);
      }
      setTabAtiva("slides");
    }
  }, [open, initial]);

  // Se o usuário adiciona slides e ainda não definiu o slide de produtos, sugere o meio ou último
  useEffect(() => {
    if (slides.length > 0 && mapeamento.slideProdutosIndex >= slides.length) {
      setMapeamento((prev) => ({
        ...prev,
        slideProdutosIndex: Math.max(0, slides.length - 1),
      }));
    }
  }, [slides.length, mapeamento.slideProdutosIndex]);

  // Manipulação de Upload (PDF ou Imagens)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessandoArquivos(true);
    setStatusProgresso("Analisando arquivos...");

    try {
      const novosSlides: SlideTemplateItem[] = [...slides];
      const templateId = initial?.id || `tpl-${Date.now()}`;

      for (const file of files) {
        // Se for PDF, extrai cada página
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          setStatusProgresso(`Extraindo páginas do PDF: ${file.name}...`);
          const paginasExtraidas = await extrairSlidesDePdf(file, (atual, total) => {
            setStatusProgresso(`Renderizando página ${atual} de ${total} do PDF...`);
          });

          for (let i = 0; i < paginasExtraidas.length; i++) {
            setStatusProgresso(`Fazendo upload do slide ${i + 1} de ${paginasExtraidas.length}...`);
            const p = paginasExtraidas[i];
            const url = await uploadSlideImage(p.blob, templateId, novosSlides.length);
            const index = novosSlides.length;
            novosSlides.push({
              id: `slide-${Date.now()}-${index}`,
              index,
              imageUrl: url,
              tipo: index === 0 ? "capa" : index === 1 ? "tabela_produtos" : "conteudo",
              titulo: `Slide ${index + 1} (PDF)`,
            });
          }
        } else if (file.type.startsWith("image/")) {
          // Imagem individual
          setStatusProgresso(`Processando imagem: ${file.name}...`);
          const url = await uploadSlideImage(file, templateId, novosSlides.length);
          const index = novosSlides.length;
          novosSlides.push({
            id: `slide-${Date.now()}-${index}`,
            index,
            imageUrl: url,
            tipo: index === 0 ? "capa" : index === 1 ? "tabela_produtos" : "conteudo",
            titulo: file.name.replace(/\.[^/.]+$/, ""),
          });
        }
      }

      setSlides(novosSlides);
      toast.success(`${files.length} arquivo(s) processado(s) com sucesso!`);
      if (novosSlides.length > 1) {
        setTabAtiva("mapeamento");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar slides: " + (err as Error).message);
    } finally {
      setProcessandoArquivos(false);
      setStatusProgresso("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const moverSlide = (index: number, direcao: "cima" | "baixo") => {
    const novoIndex = direcao === "cima" ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= slides.length) return;

    const copia = [...slides];
    const temp = copia[index];
    copia[index] = copia[novoIndex];
    copia[novoIndex] = temp;

    const reindexados = copia.map((s, idx) => ({ ...s, index: idx }));
    setSlides(reindexados);
  };

  const removerSlide = (index: number) => {
    const filtrados = slides
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({ ...s, index: idx }));
    setSlides(filtrados);
  };

  const setTipoSlide = (index: number, tipo: SlideTemplateItem["tipo"]) => {
    const atualizados = slides.map((s, idx) => {
      if (idx === index) return { ...s, tipo };
      if (tipo === "capa" && s.tipo === "capa") return { ...s, tipo: "conteudo" as const };
      if (tipo === "tabela_produtos" && s.tipo === "tabela_produtos")
        return { ...s, tipo: "conteudo" as const };
      return s;
    });
    setSlides(atualizados);

    if (tipo === "capa") setMapeamento((prev) => ({ ...prev, slideCapaIndex: index }));
    if (tipo === "tabela_produtos")
      setMapeamento((prev) => ({ ...prev, slideProdutosIndex: index }));
  };

  // Mutação para salvar layout no banco
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!nomeModelo.trim()) throw new Error("Informe um nome para o modelo");
      if (slides.length === 0) throw new Error("Importe pelo menos 1 slide para o modelo");

      return upsertFn({
        data: {
          id: initial?.id,
          name: nomeModelo.trim(),
          config: {
            tipoTemplate: "custom_slides",
            colors: {
              primary: mapeamento.tabela.corHeader,
              secondary: mapeamento.tabela.corLinhaDestaque,
              text: mapeamento.tabela.corTexto,
              accent: "#F9FAFB",
            },
            font: {
              baseSize: 10,
              titleSize: 22,
            },
            options: {
              showLogo: mapeamento.capa.mostrarLogoCliente,
              showIaSummary: !!mapeamento.slideEstrategiaIndex,
              compactTable: mapeamento.tabela.itensPorSlide > 10,
            },
          },
          slides,
          mapeamento,
          is_default: isDefault,
        },
      });
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["proposal_layouts"] });
      toast.success("Modelo de proposta do inquilino salvo com sucesso!");
      onSaved?.(res);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const slideProdutosAtual = slides[mapeamento.slideProdutosIndex] || slides[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Presentation className="size-6 text-primary" />
            <DialogTitle className="text-xl">Modelo Próprio de Proposta da Empresa</DialogTitle>
          </div>
          <DialogDescription>
            Importe o PDF ou imagens dos slides da sua empresa e aponte onde serão inseridos a Capa,
            os Produtos e os Valores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome e Padrão */}
          <div className="grid sm:grid-cols-3 gap-3 items-end p-3 rounded-xl bg-muted/40 border">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Nome deste Modelo</Label>
              <Input
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
                placeholder="Ex.: Apresentação Comercial Oficial 2026"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Modelo Padrão</Label>
                <p className="text-[10px] text-muted-foreground">
                  Usar automaticamente em novas propostas
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>

          <Tabs value={tabAtiva} onValueChange={(v) => setTabAtiva(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="slides" className="gap-1.5 text-xs">
                <Layers className="size-3.5" />
                1. Slides Importados ({slides.length})
              </TabsTrigger>
              <TabsTrigger
                value="mapeamento"
                disabled={slides.length === 0}
                className="gap-1.5 text-xs"
              >
                <TableIcon className="size-3.5" />
                2. Onde Entram os Produtos
              </TabsTrigger>
              <TabsTrigger
                value="estilo"
                disabled={slides.length === 0}
                className="gap-1.5 text-xs"
              >
                <Palette className="size-3.5" />
                3. Capa & Estilo Visual
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: UPLOAD E ORGANIZAÇÃO DOS SLIDES */}
            <TabsContent value="slides" className="space-y-4 pt-3">
              {/* Dropzone / Upload Button */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={processandoArquivos}
                />
                <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  {processandoArquivos ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <FileUp className="size-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Clique para selecionar sua Apresentação em PDF ou Imagens dos Slides
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Formatos aceitos: <strong>PDF com múltiplas páginas</strong> ou imagens{" "}
                    <strong>PNG, JPG, WEBP</strong> (16:9 widescreen recomendado).
                  </p>
                </div>
                {statusProgresso && (
                  <p className="text-xs font-medium text-primary animate-pulse">
                    {statusProgresso}
                  </p>
                )}
              </div>

              {/* Lista dos Slides Carregados */}
              {slides.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Nenhum slide importado ainda. Selecione um PDF de apresentação ou as imagens dos
                  slides acima.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Organize e defina o papel de cada slide:</span>
                    <span>{slides.length} slides no modelo</span>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {slides.map((s, idx) => {
                      const isCapa = mapeamento.slideCapaIndex === idx;
                      const isProdutos = mapeamento.slideProdutosIndex === idx;

                      return (
                        <Card
                          key={s.id || idx}
                          className={`overflow-hidden border-2 transition-all ${
                            isProdutos
                              ? "border-primary shadow-md bg-primary/5"
                              : isCapa
                                ? "border-amber-500 shadow-md bg-amber-50/20"
                                : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                            <img
                              src={s.imageUrl}
                              alt={s.titulo}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1.5 left-1.5">
                              <Badge
                                variant="secondary"
                                className="bg-black/70 text-white text-[10px] backdrop-blur-xs"
                              >
                                Slide #{idx + 1}
                              </Badge>
                            </div>
                            <div className="absolute top-1.5 right-1.5 flex gap-1">
                              {isCapa && (
                                <Badge className="bg-amber-500 text-white text-[10px]">
                                  📌 Capa
                                </Badge>
                              )}
                              {isProdutos && (
                                <Badge className="bg-primary text-white text-[10px]">
                                  📊 Produtos & Valores
                                </Badge>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-2.5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="truncate">{s.titulo || `Slide ${idx + 1}`}</span>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  disabled={idx === 0}
                                  onClick={() => moverSlide(idx, "cima")}
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  disabled={idx === slides.length - 1}
                                  onClick={() => moverSlide(idx, "baixo")}
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6 text-destructive hover:bg-destructive/10"
                                  onClick={() => removerSlide(idx)}
                                  title="Remover slide"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 pt-1">
                              <Button
                                size="sm"
                                type="button"
                                variant={isCapa ? "default" : "outline"}
                                className="h-7 text-[11px] px-1.5"
                                onClick={() => setTipoSlide(idx, "capa")}
                              >
                                {isCapa ? "✓ Capa" : "Marcar Capa"}
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                variant={isProdutos ? "default" : "outline"}
                                className="h-7 text-[11px] px-1.5"
                                onClick={() => setTipoSlide(idx, "tabela_produtos")}
                              >
                                {isProdutos ? "✓ Produtos" : "Marcar Produtos"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA 2: MAPEAMENTO VISUAL (ONDE ENTRAM OS PRODUTOS E VALORES) */}
            <TabsContent value="mapeamento" className="space-y-4 pt-3">
              <div className="grid md:grid-cols-5 gap-6">
                {/* Painel de Controles */}
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      Qual slide receberá os Produtos e Valores?
                    </Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={mapeamento.slideProdutosIndex}
                      onChange={(e) =>
                        setMapeamento((prev) => ({
                          ...prev,
                          slideProdutosIndex: Number(e.target.value),
                        }))
                      }
                    >
                      {slides.map((s, idx) => (
                        <option key={s.id || idx} value={idx}>
                          Slide #{idx + 1} - {s.titulo || `Slide ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Neste slide, o sistema desenhará a tabela comercial com os programas,
                      inserções, descontos e valores.
                    </p>
                  </div>

                  {/* Coordenadas e Margens da Tabela */}
                  <div className="space-y-3 p-3 rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sliders className="size-3.5 text-primary" />
                      <span>Posicionamento da Tabela no Slide</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Início da Tabela (Topo):</span>
                        <span className="font-semibold">
                          {mapeamento.tabela.margemSuperiorPct}% do topo
                        </span>
                      </div>
                      <Slider
                        value={[mapeamento.tabela.margemSuperiorPct]}
                        min={10}
                        max={60}
                        step={1}
                        onValueChange={([v]) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            tabela: { ...prev.tabela, margemSuperiorPct: v },
                          }))
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Ajuste para deixar o cabeçalho original da sua arte livre.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Margens Laterais (Esquerda/Direita):</span>
                        <span className="font-semibold">
                          {mapeamento.tabela.margemEsquerdaPct}%
                        </span>
                      </div>
                      <Slider
                        value={[mapeamento.tabela.margemEsquerdaPct]}
                        min={2}
                        max={20}
                        step={1}
                        onValueChange={([v]) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            tabela: {
                              ...prev.tabela,
                              margemEsquerdaPct: v,
                              margemDireitaPct: v,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Itens Máximos por Slide:</span>
                        <span className="font-semibold">
                          {mapeamento.tabela.itensPorSlide} linhas
                        </span>
                      </div>
                      <Slider
                        value={[mapeamento.tabela.itensPorSlide]}
                        min={5}
                        max={16}
                        step={1}
                        onValueChange={([v]) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            tabela: { ...prev.tabela, itensPorSlide: v },
                          }))
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Se a proposta tiver mais itens, o sistema gerará automaticamente slides de
                        continuação.
                      </p>
                    </div>
                  </div>

                  {/* Cores da Tabela */}
                  <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Palette className="size-3.5 text-primary" />
                      Cores da Tabela Comercial
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Cabeçalho</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={mapeamento.tabela.corHeader}
                            onChange={(e) =>
                              setMapeamento((prev) => ({
                                ...prev,
                                tabela: { ...prev.tabela, corHeader: e.target.value },
                              }))
                            }
                            className="size-7 rounded cursor-pointer border"
                          />
                          <span className="text-xs font-mono">{mapeamento.tabela.corHeader}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Valor Destaque</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={mapeamento.tabela.corLinhaDestaque}
                            onChange={(e) =>
                              setMapeamento((prev) => ({
                                ...prev,
                                tabela: { ...prev.tabela, corLinhaDestaque: e.target.value },
                              }))
                            }
                            className="size-7 rounded cursor-pointer border"
                          />
                          <span className="text-xs font-mono">
                            {mapeamento.tabela.corLinhaDestaque}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pré-visualização Interativa do Slide com Overlay da Tabela */}
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Pré-visualização do Slide com a Tabela:</span>
                    <Badge variant="outline" className="text-[10px]">
                      Slide #{mapeamento.slideProdutosIndex + 1}
                    </Badge>
                  </div>

                  <div className="relative aspect-video rounded-xl overflow-hidden border bg-slate-900 shadow-md">
                    {slideProdutosAtual?.imageUrl ? (
                      <img
                        src={slideProdutosAtual.imageUrl}
                        alt="Slide Produtos"
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Nenhum slide selecionado
                      </div>
                    )}

                    {/* Overlay Dinâmico da Tabela */}
                    <div
                      style={{
                        top: `${mapeamento.tabela.margemSuperiorPct}%`,
                        left: `${mapeamento.tabela.margemEsquerdaPct}%`,
                        right: `${mapeamento.tabela.margemDireitaPct}%`,
                        bottom: `${mapeamento.tabela.margemInferiorPct}%`,
                      }}
                      className="absolute border-2 border-dashed border-primary bg-primary/10 rounded-lg p-2 flex flex-col justify-between backdrop-blur-xs pointer-events-none transition-all duration-200"
                    >
                      <div
                        style={{ backgroundColor: mapeamento.tabela.corHeader }}
                        className="h-6 rounded flex items-center justify-between px-2 text-[10px] text-white font-semibold"
                      >
                        <span>TIPO · PROGRAMA · FORMATO · HORÁRIO</span>
                        <span>INSERÇÕES · VALORES (R$)</span>
                      </div>

                      <div className="space-y-1 py-1 flex-1 flex flex-col justify-center">
                        <div className="h-4 bg-white/70 dark:bg-black/50 rounded flex items-center justify-between px-2 text-[9px]">
                          <span>Comercial TV 30s · Jornal Regional</span>
                          <span className="font-semibold">30 ins · R$ 15.000,00</span>
                        </div>
                        <div className="h-4 bg-white/70 dark:bg-black/50 rounded flex items-center justify-between px-2 text-[9px]">
                          <span>Spot Rádio 30s · Manhã Total</span>
                          <span className="font-semibold">60 ins · R$ 8.400,00</span>
                        </div>
                        <div className="h-4 bg-white/70 dark:bg-black/50 rounded flex items-center justify-between px-2 text-[9px]">
                          <span>Painel LED DOOH 10s · Av. Central</span>
                          <span className="font-semibold">720 ins · R$ 5.200,00</span>
                        </div>
                      </div>

                      <div
                        style={{ borderColor: mapeamento.tabela.corLinhaDestaque }}
                        className="border-t-2 pt-1 flex items-center justify-between text-[11px] font-bold text-foreground bg-white/80 dark:bg-black/70 px-2 rounded"
                      >
                        <span>TOTAL DO INVESTIMENTO:</span>
                        <span style={{ color: mapeamento.tabela.corHeader }}>R$ 28.600,00</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    A área delimitada acima representa o espaço exato onde o Mídia.OS renderizará os
                    produtos da proposta.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: CAPA & DADOS DA EMPRESA */}
            <TabsContent value="estilo" className="space-y-4 pt-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                  <Label className="text-xs font-semibold">Configurações do Slide de Capa</Label>
                  <p className="text-xs text-muted-foreground">
                    Escolha qual slide é a capa e quais dados serão inseridos:
                  </p>

                  <div className="space-y-1">
                    <Label className="text-xs">Slide de Capa</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none"
                      value={mapeamento.slideCapaIndex}
                      onChange={(e) =>
                        setMapeamento((prev) => ({
                          ...prev,
                          slideCapaIndex: Number(e.target.value),
                        }))
                      }
                    >
                      {slides.map((s, idx) => (
                        <option key={s.id || idx} value={idx}>
                          Slide #{idx + 1} - {s.titulo || `Slide ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span>Inserir Logo do Cliente na Capa</span>
                      <Switch
                        checked={mapeamento.capa.mostrarLogoCliente}
                        onCheckedChange={(v) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            capa: { ...prev.capa, mostrarLogoCliente: v },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Inserir Nome do Cliente na Capa</span>
                      <Switch
                        checked={mapeamento.capa.mostrarNomeCliente}
                        onCheckedChange={(v) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            capa: { ...prev.capa, mostrarNomeCliente: v },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Inserir Nome da Campanha na Capa</span>
                      <Switch
                        checked={mapeamento.capa.mostrarCampanha}
                        onCheckedChange={(v) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            capa: { ...prev.capa, mostrarCampanha: v },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Inserir Número da Proposta & Data</span>
                      <Switch
                        checked={mapeamento.capa.mostrarData}
                        onCheckedChange={(v) =>
                          setMapeamento((prev) => ({
                            ...prev,
                            capa: { ...prev.capa, mostrarData: v },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Pré-visualização da Capa */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Pré-visualização da Capa</Label>
                  <div className="relative aspect-video rounded-xl overflow-hidden border bg-slate-900 shadow-md">
                    {slides[mapeamento.slideCapaIndex]?.imageUrl ? (
                      <img
                        src={slides[mapeamento.slideCapaIndex].imageUrl}
                        alt="Slide Capa"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Nenhum slide de capa
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 p-2 rounded bg-black/60 backdrop-blur-xs text-white max-w-[80%] space-y-0.5">
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        PROPOSTA COMERCIAL
                      </p>
                      <p className="text-sm font-bold leading-tight">Nome do Cliente Exemplo</p>
                      <p className="text-xs text-slate-300">Campanha de Lançamento 2026</p>
                      <p className="text-[10px] text-slate-400 font-mono">Proposta Nº 001/2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saveMut.isPending || slides.length === 0}
            onClick={() => saveMut.mutate()}
            className="gap-1.5 shadow-sm"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Salvar Modelo da Empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
