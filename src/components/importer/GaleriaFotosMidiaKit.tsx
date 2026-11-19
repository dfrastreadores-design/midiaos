import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Link,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { uploadProdutoFoto } from "@/lib/produto-foto";
import type { ImagemExtraidaMidiaKit, ProdutoExtraidoMidiaKit } from "@/lib/midia-kit-ai.functions";

interface GaleriaFotosMidiaKitProps {
  imagensExtraidas: ImagemExtraidaMidiaKit[];
  produtos: ProdutoExtraidoMidiaKit[];
  onAssociarFotoAProduto: (prodIdTemp: string, fotoUrl: string, origem: "documento" | "upload_manual") => void;
  onDesassociarFotoDeProduto: (prodIdTemp: string, fotoUrl: string) => void;
  onAdicionarFotoManual: (file: File, prodIdTemp?: string) => Promise<void>;
}

export function GaleriaFotosMidiaKit({
  imagensExtraidas,
  produtos,
  onAssociarFotoAProduto,
  onDesassociarFotoDeProduto,
  onAdicionarFotoManual,
}: GaleriaFotosMidiaKitProps) {
  const [uploading, setUploading] = useState(false);
  const [filtroAssociacao, setFiltroAssociacao] = useState<"todas" | "pendentes" | "associadas">("todas");
  const [imagensSelecionadas, setImagensSelecionadas] = useState<string[]>([]);
  const [produtoDestinoLote, setProdutoDestinoLote] = useState<string>("");

  // Encontra qual produto está associado a cada imagem
  function getProdutoAssociado(dataUrl: string) {
    return produtos.find((p) => p.fotos && p.fotos.includes(dataUrl));
  }

  const imagensFiltradas = imagensExtraidas.filter((img) => {
    const associado = getProdutoAssociado(img.dataUrl);
    if (filtroAssociacao === "pendentes") return !associado;
    if (filtroAssociacao === "associadas") return Boolean(associado);
    return true;
  });

  const totalPendentes = imagensExtraidas.filter((img) => !getProdutoAssociado(img.dataUrl)).length;

  async function handleUploadManual(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        await onAdicionarFotoManual(file);
      }
      toast.success(`${files.length} foto(s) reais adicionada(s) com sucesso.`);
    } catch (err: any) {
      toast.error(`Erro ao carregar fotografia: ${err.message || "Falha no upload"}`);
    } finally {
      setUploading(false);
    }
  }

  function toggleSelecionarImagem(id: string) {
    setImagensSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function handleAssociarLote() {
    if (!produtoDestinoLote || imagensSelecionadas.length === 0) return;
    const targetProd = produtos.find((p) => p.id_temp === produtoDestinoLote);
    if (!targetProd) return;

    for (const imgId of imagensSelecionadas) {
      const img = imagensExtraidas.find((i) => i.id === imgId);
      if (img) {
        onAssociarFotoAProduto(produtoDestinoLote, img.dataUrl, "documento");
      }
    }

    toast.success(`${imagensSelecionadas.length} foto(s) vinculada(s) a "${targetProd.nome}"!`);
    setImagensSelecionadas([]);
    setProdutoDestinoLote("");
  }

  return (
    <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 space-y-3">
      {/* CABEÇALHO DA GALERIA */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <ImageIcon className="size-4 text-primary" />
            Galeria de Fotografias Reais ({imagensExtraidas.length} imagens no kit)
            {totalPendentes > 0 ? (
              <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-500/10 border-amber-400">
                {totalPendentes} pendentes de associação
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-500/10 border-emerald-400">
                Todas associadas
              </Badge>
            )}
          </span>
          <p className="text-[11px] text-muted-foreground">
            Associe as fotos originais aos pontos correspondentes. Imagens sintéticas ou geradas por IA são proibidas.
          </p>
        </div>

        {/* Filtros e Upload Manual */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => setFiltroAssociacao("todas")}
              className={`px-2 py-1 rounded text-[11px] ${
                filtroAssociacao === "todas" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              Todas ({imagensExtraidas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroAssociacao("pendentes")}
              className={`px-2 py-1 rounded text-[11px] ${
                filtroAssociacao === "pendentes" ? "bg-amber-600 text-white font-semibold" : "text-muted-foreground"
              }`}
            >
              Pendentes ({totalPendentes})
            </button>
            <button
              type="button"
              onClick={() => setFiltroAssociacao("associadas")}
              className={`px-2 py-1 rounded text-[11px] ${
                filtroAssociacao === "associadas" ? "bg-emerald-600 text-white font-semibold" : "text-muted-foreground"
              }`}
            >
              Associadas ({imagensExtraidas.length - totalPendentes})
            </button>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={handleUploadManual}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 pointer-events-none"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Upload Manual de Foto Real
            </Button>
          </label>
        </div>
      </div>

      {/* AVISO DE POLÍTICA DE FOTOS REAIS */}
      <div className="flex items-start gap-2 p-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-[11px] text-blue-900 dark:text-blue-200">
        <ShieldAlert className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>Diretriz de Integridade Comercial:</strong> Apenas fotografias reais extraídas do material do parceiro ou fornecidas diretamente por ele são aceitas. Produtos sem foto permanecem com status "Foto real pendente".
        </span>
      </div>

      {/* AÇÕES EM LOTE DE IMAGENS SELECIONADAS */}
      {imagensSelecionadas.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg text-xs">
          <span className="font-semibold text-primary">
            {imagensSelecionadas.length} foto(s) marcada(s)
          </span>
          <span className="text-muted-foreground">→ Vincular ao produto:</span>
          <Select value={produtoDestinoLote} onValueChange={(v) => setProdutoDestinoLote(v)}>
            <SelectTrigger className="h-7 text-xs max-w-[240px] bg-background">
              <SelectValue placeholder="Selecione o produto..." />
            </SelectTrigger>
            <SelectContent>
              {produtos.map((p) => (
                <SelectItem key={p.id_temp} value={p.id_temp} className="text-xs">
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={handleAssociarLote}
            disabled={!produtoDestinoLote}
            className="h-7 text-xs bg-primary text-white"
          >
            Vincular Fotos aos Produtos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setImagensSelecionadas([])}
            className="h-7 text-xs"
          >
            Limpar
          </Button>
        </div>
      )}

      {/* GRID DE IMAGENS */}
      {imagensFiltradas.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border rounded-lg bg-background">
          Nenhuma imagem corresponde ao filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {imagensFiltradas.map((img) => {
            const prodAssociado = getProdutoAssociado(img.dataUrl);
            const selecionada = imagensSelecionadas.includes(img.id);

            return (
              <div
                key={img.id}
                className={`group relative rounded-lg border overflow-hidden bg-background p-1.5 space-y-1.5 transition-all ${
                  selecionada ? "ring-2 ring-primary border-primary" : "hover:border-border/80"
                }`}
              >
                {/* Checkbox de seleção */}
                <div className="relative aspect-video w-full rounded overflow-hidden bg-muted/60">
                  <img
                    src={img.dataUrl}
                    alt={img.nomeArquivo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSelecionarImagem(img.id)}
                    className="absolute top-1 left-1 bg-black/60 hover:bg-black/80 text-white rounded p-1 text-[10px]"
                    title="Marcar imagem para vinculação em lote"
                  >
                    {selecionada ? "✓" : "○"}
                  </button>

                  {img.slideOuPagina && (
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded font-mono">
                      Slide {img.slideOuPagina}
                    </span>
                  )}
                </div>

                {/* Detalhes de origem */}
                <div className="text-[10px] space-y-0.5">
                  <p className="truncate font-mono text-muted-foreground" title={img.nomeArquivo}>
                    {img.nomeArquivo}
                  </p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400">
                    Foto original extraída do documento
                  </p>
                </div>

                {/* Status e Seletor de Associação */}
                {prodAssociado ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 p-1 rounded">
                      <span className="truncate max-w-[100px] font-medium" title={prodAssociado.nome}>
                        ✓ {prodAssociado.nome}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDesassociarFotoDeProduto(prodAssociado.id_temp, img.dataUrl)}
                        className="text-destructive hover:underline text-[9px]"
                        title="Desvincular deste produto"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <Select
                    value=""
                    onValueChange={(prodIdTemp) => {
                      if (prodIdTemp) {
                        onAssociarFotoAProduto(prodIdTemp, img.dataUrl, "documento");
                        const pNome = produtos.find((p) => p.id_temp === prodIdTemp)?.nome;
                        toast.success(`Foto associada a "${pNome}"!`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 text-[10px] w-full px-1 bg-muted/30">
                      <SelectValue placeholder="Vincular a..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => (
                        <SelectItem key={p.id_temp} value={p.id_temp} className="text-xs">
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
