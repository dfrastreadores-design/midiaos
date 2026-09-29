import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Camera } from "lucide-react";
import { getProdutoFotoUrl } from "@/lib/produto-foto";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fotos: string[];
  titulo?: string;
  subtitulo?: string;
};

export function ProdutoFotoGalleryModal({
  open,
  onOpenChange,
  fotos = [],
  titulo = "Fotos do Produto",
  subtitulo,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeIndex = Math.min(currentIndex, Math.max(0, fotos.length - 1));
  const activeFoto = fotos[activeIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % fotos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + fotos.length) % fotos.length);
  };

  const handleOpenOriginal = async () => {
    if (!activeFoto) return;
    const url = await getProdutoFotoUrl(activeFoto);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (!fotos || fotos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                {titulo}
              </DialogTitle>
              {subtitulo && <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                Foto {activeIndex + 1} de {fotos.length}
              </Badge>
              {activeFoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={handleOpenOriginal}
                  title="Abrir imagem original em nova aba"
                >
                  <ExternalLink className="size-3.5" />
                  <span className="hidden sm:inline">Ver Original</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="relative bg-black/95 flex items-center justify-center min-h-[340px] max-h-[70vh] p-4">
          <div className="relative max-w-full max-h-[60vh] flex items-center justify-center">
            <ProdutoFotoImg
              stored={activeFoto}
              alt={`${titulo} - Imagem ${activeIndex + 1}`}
              className="max-h-[60vh] max-w-full object-contain rounded shadow-lg"
              showLoadingSpinner
            />
          </div>

          {fotos.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 hover:bg-background shadow-md"
                onClick={handlePrev}
                title="Foto anterior"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 hover:bg-background shadow-md"
                onClick={handleNext}
                title="Próxima foto"
              >
                <ChevronRight className="size-5" />
              </Button>
            </>
          )}
        </div>

        {fotos.length > 1 && (
          <div className="p-3 bg-muted/30 border-t flex items-center justify-center gap-2">
            {fotos.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`relative size-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeIndex
                    ? "border-primary ring-2 ring-primary/20 scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <ProdutoFotoImg stored={f} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-white text-center py-0.5 font-bold">
                  {i === 0 ? "Principal" : `Foto ${i + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
