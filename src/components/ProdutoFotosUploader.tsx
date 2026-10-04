import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";
import { ProdutoFotoGalleryModal } from "@/components/ProdutoFotoGalleryModal";
import { uploadProdutoFoto } from "@/lib/produto-foto";
import {
  Camera,
  Upload,
  Trash2,
  Maximize2,
  Loader2,
  Plus,
  ArrowLeftRight,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ProdutoFotoCensuraModal } from "@/components/ProdutoFotoCensuraModal";

type Props = {
  fotos?: string[] | null;
  onChange: (fotos: string[]) => void;
  disabled?: boolean;
  tituloProduto?: string;
};

export function ProdutoFotosUploader({
  fotos = [],
  onChange,
  disabled = false,
  tituloProduto,
}: Props) {
  const currentFotos = (fotos || []).slice(0, 2);
  const [uploading, setUploading] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [editingFotoIndex, setEditingFotoIndex] = useState<number | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, replaceIdx?: number) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input value para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";

    setUploading(true);
    try {
      if (replaceIdx !== undefined && replaceIdx !== null) {
        // Substituição de uma foto existente
        const file = files[0];
        const res = await uploadProdutoFoto(file);
        const updated = [...currentFotos];
        updated[replaceIdx] = res.url;
        onChange(updated.slice(0, 2));
        toast.success(`Foto ${replaceIdx + 1} atualizada com sucesso!`);
      } else {
        // Adição de fotos (respeitando o limite de 2)
        const slotsAvailable = 2 - currentFotos.length;
        if (slotsAvailable <= 0) {
          toast.info("Limite de 2 fotos atingido.");
          return;
        }

        const filesToUpload = files.slice(0, slotsAvailable);
        const newUrls: string[] = [];

        for (const file of filesToUpload) {
          const res = await uploadProdutoFoto(file);
          newUrls.push(res.url);
        }

        const updated = [...currentFotos, ...newUrls].slice(0, 2);
        onChange(updated);
        toast.success(
          newUrls.length === 1
            ? "Foto adicionada com sucesso!"
            : `${newUrls.length} fotos adicionadas com sucesso!`,
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload da foto.");
    } finally {
      setUploading(false);
      setReplacingIndex(null);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      toast.error("Informe uma URL válida iniciando com https://");
      return;
    }
    if (currentFotos.length >= 2) {
      toast.info("Limite máximo de 2 fotos já atingido.");
      return;
    }
    const updated = [...currentFotos, trimmed].slice(0, 2);
    onChange(updated);
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("Foto vinculada via URL com sucesso!");
  };

  const handleRemove = (index: number) => {
    const updated = currentFotos.filter((_, i) => i !== index);
    onChange(updated);
    toast.info("Foto removida.");
  };

  const handleSwap = () => {
    if (currentFotos.length < 2) return;
    onChange([currentFotos[1], currentFotos[0]]);
    toast.success("Ordem das fotos invertida (Foto 2 tornou-se a Principal)!");
  };

  return (
    <div className="space-y-2 rounded-xl border p-3.5 bg-muted/20">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-primary" />
          <Label className="text-sm font-semibold">Fotos do Produto / Ponto</Label>
          <span className="text-[11px] text-muted-foreground font-normal">(máximo de 2 fotos)</span>
        </div>

        <div className="flex items-center gap-1.5">
          {currentFotos.length === 2 ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] py-0.5">
              <CheckCircle2 className="size-3" />2 de 2 fotos cadastradas
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px] py-0.5">
              {currentFotos.length} de 2 fotos
            </Badge>
          )}

          {currentFotos.length === 2 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 border-muted-foreground/30 hover:bg-muted"
              onClick={handleSwap}
              title="Inverter ordem (definir Foto 2 como principal)"
            >
              <ArrowLeftRight className="size-3" />
              <span className="hidden sm:inline">Inverter ordem</span>
            </Button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Adicione até 2 imagens para demonstrar o ponto, fachada, estúdio, painel de LED ou formato
        comercial (ex.: foto frontal e vista da rua).
      </p>

      {/* Grid de Fotos e Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Renderiza as fotos existentes */}
        {currentFotos.map((foto, index) => (
          <div
            key={index}
            className="group relative rounded-lg border bg-background overflow-hidden shadow-sm flex flex-col"
          >
            {/* Imagem com visualização */}
            <div className="relative aspect-[16/10] bg-black/5 dark:bg-black/30 overflow-hidden flex items-center justify-center">
              <ProdutoFotoImg
                stored={foto}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                showLoadingSpinner
              />

              {/* Badges sobre a foto */}
              <div className="absolute top-2 left-2 flex gap-1 items-center">
                <Badge
                  className={`text-[10px] py-0.5 font-semibold shadow-sm ${
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-800 text-white dark:bg-slate-700"
                  }`}
                >
                  {index === 0 ? "Foto 1 (Principal)" : "Foto 2 (Secundária)"}
                </Badge>
              </div>

              {/* Botão de Expandir / Ver em tela cheia */}
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="absolute top-2 right-2 size-7 rounded-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Ampliar foto"
              >
                <Maximize2 className="size-3.5" />
              </button>

              {/* Botão rápido sobre a imagem para censurar / sobrepor Logo Nexo */}
              <button
                type="button"
                onClick={() => setEditingFotoIndex(index)}
                className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/75 hover:bg-black/90 text-white text-[10px] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow border border-white/10"
                title="Cobrir logo/telefone do parceiro com a logo da Nexo ou desfoque"
              >
                <ShieldCheck className="size-3 text-emerald-400" />
                <span>Ocultar Parceiro / Logo Nexo</span>
              </button>
            </div>

            {/* Ações inferiores da foto */}
            <div className="p-2 bg-muted/20 border-t flex items-center justify-between gap-1 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1 font-medium"
                onClick={() => setEditingFotoIndex(index)}
                disabled={uploading || disabled}
                title="Cobrir logo do parceiro ou telefone com o logo da Nexo ou desfoque"
              >
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Logo Nexo / Borrar</span>
              </Button>

              <div className="flex items-center gap-1 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => {
                    setReplacingIndex(index);
                    replaceInputRef.current?.click();
                  }}
                  disabled={uploading || disabled}
                  title="Trocar esta foto por outro arquivo"
                >
                  <Upload className="size-3" />
                  Trocar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => handleRemove(index)}
                  disabled={uploading || disabled}
                  title="Remover esta foto"
                >
                  <Trash2 className="size-3" />
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Slot de Upload caso haja menos de 2 fotos */}
        {currentFotos.length < 2 && (
          <div className="relative rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors p-4 flex flex-col items-center justify-center text-center gap-2 aspect-[16/10] min-h-[140px]">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 className="size-7 animate-spin" />
                <span className="text-xs font-medium">Enviando foto...</span>
              </div>
            ) : (
              <>
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Camera className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">
                    {currentFotos.length === 0
                      ? "Adicionar Foto 1 (Principal)"
                      : "Adicionar Foto 2 (Secundária)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG ou WEBP até 8MB</p>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-7 px-3 text-xs gap-1 shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                  >
                    <Upload className="size-3" />
                    Escolher Arquivo
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    disabled={disabled}
                    title="Vincular via URL de imagem"
                  >
                    <LinkIcon className="size-3" />
                    URL
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input de URL opcional */}
      {showUrlInput && currentFotos.length < 2 && (
        <div className="p-2.5 rounded-lg border bg-background flex flex-col sm:flex-row gap-2 items-center animate-in fade-in duration-200">
          <Input
            placeholder="Cole o link da foto (https://exemplo.com/foto.jpg)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            className="text-xs h-8"
          />
          <div className="flex gap-1.5 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs px-3"
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
            >
              Adicionar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2 text-muted-foreground"
              onClick={() => {
                setShowUrlInput(false);
                setUrlInput("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Inputs de arquivo ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={currentFotos.length === 0}
        onChange={(e) => handleFileChange(e)}
        className="hidden"
      />

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => handleFileChange(e, replacingIndex ?? undefined)}
        className="hidden"
      />

      {/* Modal de ampliação de fotos */}
      <ProdutoFotoGalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        fotos={currentFotos}
        titulo="Visualização das Fotos do Produto"
        onUpdateFoto={(newUrl, idx) => {
          const updated = [...currentFotos];
          updated[idx] = newUrl;
          onChange(updated);
        }}
      />

      {/* Modal para borrar telefone/parceiro e sobrepor logo Nexo */}
      <ProdutoFotoCensuraModal
        open={editingFotoIndex !== null}
        onOpenChange={(op) => !op && setEditingFotoIndex(null)}
        fotoSrc={editingFotoIndex !== null ? currentFotos[editingFotoIndex] : null}
        onSave={(newUrl) => {
          if (editingFotoIndex === null) return;
          const updated = [...currentFotos];
          updated[editingFotoIndex] = newUrl;
          onChange(updated);
        }}
        tituloProduto={tituloProduto}
      />
    </div>
  );
}
