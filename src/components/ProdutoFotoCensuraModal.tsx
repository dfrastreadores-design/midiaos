import { useEffect, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  ShieldCheck,
  Droplets,
  Grid,
  Square,
  Undo2,
  Trash2,
  Eye,
  Check,
  Loader2,
  Sparkles,
  Download,
  Maximize2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type CensuraRegiao,
  type CensuraTipo,
  type LogoEstilo,
  carregarImagem,
  renderizarCensurasNoCanvas,
} from "@/lib/foto-censura";
import { uploadProdutoFoto, getProdutoFotoUrl } from "@/lib/produto-foto";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import logoNexoAsset from "@/assets/logo-nexo.jpg";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fotoSrc: string | null;
  onSave: (newUrl: string) => void;
  tituloProduto?: string;
};

export function ProdutoFotoCensuraModal({
  open,
  onOpenChange,
  fotoSrc,
  onSave,
  tituloProduto,
}: Props) {
  const { logoSrc: tenantLogoSrc } = useTenantBranding();

  const [loadingImg, setLoadingImg] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [activeTool, setActiveTool] = useState<CensuraTipo>("logo_nexo");
  const [logoEstilo, setLogoEstilo] = useState<LogoEstilo>("selo_escuro");
  const [intensidade, setIntensidade] = useState<number>(18);
  const [corTarja, setCorTarja] = useState<string>("#0f172a");

  const [regioes, setRegioes] = useState<CensuraRegiao[]>([]);
  const [viewOriginal, setViewOriginal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const logoObjRef = useRef<HTMLImageElement | null>(null);

  // Estado de arraste de seleção
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );

  // 1. Carrega a imagem base e o logo Nexo
  useEffect(() => {
    if (!open || !fotoSrc) {
      setRegioes([]);
      imageObjRef.current = null;
      return;
    }

    let cancelled = false;
    setLoadingImg(true);

    const carregarTudo = async () => {
      try {
        const resolvedUrl = (await getProdutoFotoUrl(fotoSrc)) || fotoSrc;
        const img = await carregarImagem(resolvedUrl);

        if (cancelled) return;
        imageObjRef.current = img;

        // Carrega o logo oficial da Nexo fornecido
        try {
          const logoUrl = logoNexoAsset || tenantLogoSrc || "/logo-nexo.jpg";
          const logoImg = await carregarImagem(logoUrl);
          if (!cancelled) logoObjRef.current = logoImg;
        } catch {
          logoObjRef.current = null;
        }

        // Renderiza canvas inicial
        if (canvasRef.current) {
          renderizarCensurasNoCanvas(
            canvasRef.current,
            img,
            [],
            logoObjRef.current,
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Erro ao carregar foto para edição:", err);
          toast.error("Não foi possível carregar a imagem para edição.");
        }
      } finally {
        if (!cancelled) setLoadingImg(false);
      }
    };

    carregarTudo();

    return () => {
      cancelled = true;
    };
  }, [open, fotoSrc, tenantLogoSrc]);

  // 2. Atualiza o canvas sempre que as regiões ou viewOriginal mudam
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    if (viewOriginal) {
      // Exibe original puro
      renderizarCensurasNoCanvas(canvas, img, [], null);
    } else {
      renderizarCensurasNoCanvas(
        canvas,
        img,
        regioes,
        logoObjRef.current,
      );
    }
  }, [regioes, viewOriginal]);

  // Coordenadas relativas do evento de mouse no canvas
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (loadingImg || !imageObjRef.current) return;
    const { x, y } = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const { x, y } = getCanvasCoords(e);
    const rx = Math.min(startPoint.x, x);
    const ry = Math.min(startPoint.y, y);
    const rw = Math.abs(x - startPoint.x);
    const rh = Math.abs(y - startPoint.y);
    setCurrentBox({ x: rx, y: ry, w: rw, h: rh });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !startPoint) {
      setIsDrawing(false);
      setCurrentBox(null);
      setStartPoint(null);
      return;
    }

    // Se o arraste foi muito pequeno (menos de 1.5% da tela), ignora ou cria tamanho padrão
    let { x, y, w, h } = currentBox;
    if (w < 0.02 || h < 0.02) {
      // Clique rápido: cria caixa de tamanho padrão centralizada no ponto
      if (activeTool === "logo_nexo") {
        w = 0.28;
        h = 0.12;
        x = Math.max(0, Math.min(1 - w, startPoint.x - w / 2));
        y = Math.max(0, Math.min(1 - h, startPoint.y - h / 2));
      } else {
        w = 0.2;
        h = 0.08;
        x = Math.max(0, Math.min(1 - w, startPoint.x - w / 2));
        y = Math.max(0, Math.min(1 - h, startPoint.y - h / 2));
      }
    }

    const novaRegiao: CensuraRegiao = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      tipo: activeTool,
      x,
      y,
      width: w,
      height: h,
      intensidade,
      corTarja,
      logoEstilo,
    };

    setRegioes((prev) => [...prev, novaRegiao]);
    setIsDrawing(false);
    setCurrentBox(null);
    setStartPoint(null);

    toast.success(
      activeTool === "logo_nexo"
        ? "Selo Nexo inserido na área demarcada!"
        : activeTool === "blur"
          ? "Área desfocada com sucesso!"
          : activeTool === "pixel"
            ? "Mosaico aplicado na área!"
            : "Tarja neutra aplicada!",
    );
  };

  // Presets Rápidos de 1 Clique
  const aplicarPreset = (preset: "canto_inferior_dir" | "canto_superior_dir" | "tarja_rodape" | "canto_inferior_esq") => {
    let novaRegiao: CensuraRegiao;

    switch (preset) {
      case "canto_inferior_dir":
        novaRegiao = {
          id: String(Date.now()),
          tipo: "logo_nexo",
          x: 0.68,
          y: 0.83,
          width: 0.3,
          height: 0.14,
          logoEstilo: "selo_escuro",
        };
        break;
      case "canto_inferior_esq":
        novaRegiao = {
          id: String(Date.now()),
          tipo: "logo_nexo",
          x: 0.02,
          y: 0.83,
          width: 0.3,
          height: 0.14,
          logoEstilo: "selo_escuro",
        };
        break;
      case "canto_superior_dir":
        novaRegiao = {
          id: String(Date.now()),
          tipo: "logo_nexo",
          x: 0.68,
          y: 0.03,
          width: 0.3,
          height: 0.14,
          logoEstilo: "selo_escuro",
        };
        break;
      case "tarja_rodape":
        // Cobre toda a base inferior da imagem (ótimo para apagar telefones de contato de terceiros)
        novaRegiao = {
          id: String(Date.now()),
          tipo: "logo_nexo",
          x: 0,
          y: 0.87,
          width: 1,
          height: 0.13,
          logoEstilo: "tarja_rodape",
          textoPersonalizado: "COMERCIALIZAÇÃO OFICIAL • NEXO MÍDIA",
        };
        break;
    }

    setRegioes((prev) => [...prev, novaRegiao]);
    toast.success("Preset aplicado! Você pode adicionar mais áreas se desejar.");
  };

  const handleUndo = () => {
    setRegioes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setRegioes([]);
    toast.info("Todas as alterações foram limpas.");
  };

  // Salva no storage e repassa a nova URL
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (regioes.length === 0) {
      toast.info("Nenhuma modificação foi feita na foto.");
      onOpenChange(false);
      return;
    }

    setSalvando(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Falha ao gerar o arquivo de imagem.");

      const file = new File([blob], `nexo-sanitized-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const res = await uploadProdutoFoto(file);
      onSave(res.url);
      toast.success("Foto atualizada e protegida com a marca Nexo!");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar foto censurada:", err);
      toast.error(err.message || "Erro ao salvar a foto.");
    } finally {
      setSalvando(false);
    }
  };

  // Download local da imagem editada
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.download = `foto-nexo-${Date.now()}.jpg`;
    a.click();
    toast.success("Download iniciado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh] bg-background">
        {/* Cabeçalho */}
        <DialogHeader className="p-4 pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-5 text-emerald-500" />
                Ocultar Logo / Telefone do Parceiro
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {tituloProduto ? `Produto: ${tituloProduto} · ` : ""}
                Borre contatos ou sobreponha a logo da Nexo para apresentar ao cliente com exclusividade.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {regioes.length} {regioes.length === 1 ? "área editada" : "áreas editadas"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Ferramentas */}
        <div className="p-3 border-b bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          {/* Seleção de Ferramenta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Ferramenta:</span>
            <Tabs
              value={activeTool}
              onValueChange={(v) => setActiveTool(v as CensuraTipo)}
              className="h-8"
            >
              <TabsList className="h-8 p-0.5 bg-muted/60">
                <TabsTrigger value="logo_nexo" className="text-xs h-7 gap-1.5 px-2.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Logo Nexo
                </TabsTrigger>
                <TabsTrigger value="blur" className="text-xs h-7 gap-1.5 px-2.5">
                  <Droplets className="size-3.5 text-blue-500" />
                  Desfocar (Blur)
                </TabsTrigger>
                <TabsTrigger value="pixel" className="text-xs h-7 gap-1.5 px-2.5">
                  <Grid className="size-3.5 text-purple-500" />
                  Mosaico
                </TabsTrigger>
                <TabsTrigger value="tarja" className="text-xs h-7 gap-1.5 px-2.5">
                  <Square className="size-3.5 text-slate-500" />
                  Tarja Neutra
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Ações Rápidas em 1 Clique */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground hidden sm:inline">1-Clique:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => aplicarPreset("tarja_rodape")}
              title="Insere tarja completa no rodapé para cobrir telefones e endereços de terceiros"
            >
              <Sparkles className="size-3" />
              Cobrir Rodapé (Telefone)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => aplicarPreset("canto_inferior_dir")}
              title="Adiciona selo Nexo no canto inferior direito"
            >
              Selo Canto Inf.
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => aplicarPreset("canto_superior_dir")}
              title="Adiciona selo Nexo no canto superior direito"
            >
              Selo Canto Sup.
            </Button>
          </div>

          {/* Controles de Desfazer e Comparar */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleUndo}
              disabled={regioes.length === 0}
              title="Desfazer última alteração (Ctrl+Z)"
            >
              <Undo2 className="size-3" />
              Desfazer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10"
              onClick={handleClear}
              disabled={regioes.length === 0}
              title="Limpar todas as modificações"
            >
              <Trash2 className="size-3" />
              Limpar
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1 select-none"
              onMouseDown={() => setViewOriginal(true)}
              onMouseUp={() => setViewOriginal(false)}
              onMouseLeave={() => setViewOriginal(false)}
              onTouchStart={() => setViewOriginal(true)}
              onTouchEnd={() => setViewOriginal(false)}
              title="Segure o botão para ver a imagem original sem edições"
            >
              <Eye className="size-3" />
              Ver Original
            </Button>
          </div>
        </div>

        {/* Sub-configuração da Ferramenta Ativa */}
        <div className="px-4 py-2 bg-muted/30 border-b flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          {activeTool === "logo_nexo" ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-foreground">Estilo do Selo Nexo:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="logoEstilo"
                  checked={logoEstilo === "selo_escuro"}
                  onChange={() => setLogoEstilo("selo_escuro")}
                  className="size-3"
                />
                <span>Selo Escuro (cobre 100%)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="logoEstilo"
                  checked={logoEstilo === "selo_claro"}
                  onChange={() => setLogoEstilo("selo_claro")}
                  className="size-3"
                />
                <span>Selo Branco</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="logoEstilo"
                  checked={logoEstilo === "limpo"}
                  onChange={() => setLogoEstilo("limpo")}
                  className="size-3"
                />
                <span>Sem Fundo</span>
              </label>
            </div>
          ) : activeTool === "tarja" ? (
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">Cor da Tarja:</span>
              <button
                type="button"
                className={`size-5 rounded border ${corTarja === "#0f172a" ? "ring-2 ring-primary" : ""}`}
                style={{ backgroundColor: "#0f172a" }}
                onClick={() => setCorTarja("#0f172a")}
                title="Preto / Grafite"
              />
              <button
                type="button"
                className={`size-5 rounded border ${corTarja === "#1e293b" ? "ring-2 ring-primary" : ""}`}
                style={{ backgroundColor: "#1e293b" }}
                onClick={() => setCorTarja("#1e293b")}
                title="Cinza Escuro"
              />
              <button
                type="button"
                className={`size-5 rounded border ${corTarja === "#ffffff" ? "ring-2 ring-primary" : ""}`}
                style={{ backgroundColor: "#ffffff" }}
                onClick={() => setCorTarja("#ffffff")}
                title="Branco"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 w-64">
              <span className="font-semibold text-foreground">Intensidade:</span>
              <Slider
                value={[intensidade]}
                onValueChange={(v) => setIntensidade(v[0])}
                min={8}
                max={36}
                step={2}
                className="w-36"
              />
              <span className="tabular-nums">{intensidade}px</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-foreground/80">
            <HelpCircle className="size-3.5 text-primary" />
            <span>Arraste o mouse sobre a imagem para selecionar a área do parceiro/telefone.</span>
          </div>
        </div>

        {/* Área do Canvas Interativo */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[380px] max-h-[56vh] bg-black/95 flex items-center justify-center p-3 select-none overflow-auto"
        >
          {loadingImg && (
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="text-xs">Carregando imagem em alta resolução...</span>
            </div>
          )}

          <div className="relative inline-block max-h-full max-w-full">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`max-h-[52vh] max-w-full object-contain rounded shadow-2xl cursor-crosshair ${
                loadingImg ? "hidden" : "block"
              }`}
            />

            {/* Caixa de seleção dinâmica durante arraste */}
            {isDrawing && currentBox && (
              <div
                className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/20 pointer-events-none transition-none shadow-sm rounded-sm"
                style={{
                  left: `${currentBox.x * 100}%`,
                  top: `${currentBox.y * 100}%`,
                  width: `${currentBox.w * 100}%`,
                  height: `${currentBox.h * 100}%`,
                }}
              >
                <span className="absolute -top-5 left-0 bg-cyan-500 text-black text-[9px] font-bold px-1 rounded">
                  {activeTool === "logo_nexo"
                    ? "Inserir Nexo"
                    : activeTool === "blur"
                      ? "Borrar"
                      : activeTool === "pixel"
                        ? "Mosaico"
                        : "Tarja"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé e Salvar */}
        <DialogFooter className="p-3 border-t bg-muted/20 flex items-center justify-between sm:justify-between w-full">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>💡 <strong>Dica:</strong> A resolução original da foto é 100% preservada.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="size-3.5" />
              Baixar Cópia
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={salvando || loadingImg || regioes.length === 0}
              className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {salvando ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Salvando foto...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Salvar Foto Editada
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
