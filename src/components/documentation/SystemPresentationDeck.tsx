import React, { useState, useEffect } from "react";
import {
  SLIDES_APRESENTACAO,
  exportarApresentacaoSistemaPPTX,
  exportarManualSistemaPDF,
} from "@/lib/sistema-presentation.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface SystemPresentationDeckProps {
  nomeEmpresa?: string;
}

export function SystemPresentationDeck({ nomeEmpresa = "Mídia.OS" }: SystemPresentationDeckProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const totalSlides = SLIDES_APRESENTACAO.length;
  const slide = SLIDES_APRESENTACAO[currentSlideIndex];

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
      }, 7000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalSlides]);

  const handleNext = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleDownloadPPTX = async () => {
    try {
      setIsExportingPptx(true);
      toast.info("Gerando apresentação executiva em PowerPoint (.PPTX)...");
      await exportarApresentacaoSistemaPPTX(nomeEmpresa);
      toast.success("Apresentação baixada com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar apresentação PPTX: " + (err?.message || "Tente novamente."));
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("Gerando Manual do Usuário diagramado em PDF...");
      await exportarManualSistemaPDF(nomeEmpresa);
      toast.success("Manual do Usuário em PDF baixado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar manual em PDF: " + (err?.message || "Tente novamente."));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div
      className={`space-y-4 transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-6 overflow-y-auto flex flex-col justify-between"
          : ""
      }`}
    >
      {/* Barra de Ações Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-mono">
            Slide {currentSlideIndex + 1} de {totalSlides}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            {slide.badge}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Controles de Reprodução */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pausar Apresentação" : "Iniciar Apresentação Automática"}
            className="h-8 gap-1.5"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 text-amber-500" /> : <Play className="h-3.5 w-3.5" />}
            <span className="text-xs">{isPlaying ? "Pausar" : "Apresentar"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Modo Tela Cheia"
            className="h-8 gap-1.5"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="text-xs hidden sm:inline">{isFullscreen ? "Sair" : "Tela Cheia"}</span>
          </Button>

          {/* Exportações */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPPTX}
            disabled={isExportingPptx}
            className="h-8 gap-1.5 border-orange-500/30 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="text-xs">Baixar PPTX</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isExportingPdf}
            className="h-8 gap-1.5 shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs">Baixar Manual PDF</span>
          </Button>
        </div>
      </div>

      {/* Slide Visual Interativo */}
      <Card className="border shadow-lg relative overflow-hidden bg-gradient-to-br from-card to-card/90">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

        <CardContent className="p-6 sm:p-10 space-y-6">
          {/* Header do Slide */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wider text-[11px] font-semibold">
                {slide.badge}
              </Badge>
              <span className="text-xs text-muted-foreground">• {nomeEmpresa} 3.0</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {slide.titulo}
            </h2>

            <p className="text-base text-muted-foreground max-w-4xl">
              {slide.subtitulo}
            </p>
          </div>

          {/* Grid com os 4 Pontos de Conteúdo */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            {slide.pontos.map((ponto, i) => (
              <div
                key={i}
                className="group relative p-4 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-all hover:border-primary/40 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {ponto.titulo}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                  {ponto.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Destaque / Impacto no Rodapé do Slide */}
          {slide.destaque && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Impacto Operacional & Diferencial Competitivo
                </p>
                <p className="text-xs text-foreground/90 font-medium mt-0.5">
                  {slide.destaque}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de Navegação de Slides */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          className="gap-1.5 h-9"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs">Slide Anterior</span>
        </Button>

        {/* Indicadores de bolinha / barra de progresso */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
          {SLIDES_APRESENTACAO.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentSlideIndex
                  ? "w-8 bg-primary"
                  : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
              title={`Ir para Slide ${idx + 1}: ${s.badge}`}
            />
          ))}
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleNext}
          className="gap-1.5 h-9"
        >
          <span className="text-xs">Próximo Slide</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
