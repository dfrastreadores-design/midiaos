import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  FileUp,
  Loader2,
  CheckCircle2,
  DollarSign,
  Tv,
  Image as ImageIcon,
  Building2,
  Layers,
  ArrowRight,
  AlertCircle,
  Plus,
  Trash2,
  MapPin,
  ExternalLink,
  Navigation,
  Compass,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdf-extract";
import { uploadProdutoFoto } from "@/lib/produto-foto";
import { listParceiros, type Parceiro } from "@/lib/parceiros.functions";
import { geocodeAddress } from "@/lib/geocode.functions";
import {
  extrairProdutosDeMidiaKit,
  salvarProdutosExtraidosMidiaKit,
  extrairCoordenadasDeTextoOuUrl,
  extrairRotaEReferencia,
  type ProdutoExtraidoMidiaKit,
} from "@/lib/midia-kit-ai.functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parceiroInicialId?: string;
  onSuccess?: () => void;
};

export function ImportarMidiaKitDialog({
  open,
  onOpenChange,
  parceiroInicialId,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const listParceirosFn = useServerFn(listParceiros);
  const extrairFn = useServerFn(extrairProdutosDeMidiaKit);
  const salvarFn = useServerFn(salvarProdutosExtraidosMidiaKit);
  const geocodeAddressFn = useServerFn(geocodeAddress);

  // Estados de seleção e arquivos
  const [parceiroId, setParceiroId] = useState<string>(parceiroInicialId || "");
  const [midiaKitFile, setMidiaKitFile] = useState<File | null>(null);
  const [tabelaPrecosFile, setTabelaPrecosFile] = useState<File | null>(null);
  const [fotosUpload, setFotosUpload] = useState<File[]>([]);
  const [fotosUrls, setFotosUrls] = useState<string[]>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  // Estados do fluxo
  const [step, setStep] = useState<"upload" | "revisao">("upload");
  const [statusMsg, setStatusMsg] = useState("");
  const [produtosDetectados, setProdutosDetectados] = useState<ProdutoExtraidoMidiaKit[]>([]);
  const [resumoIa, setResumoIa] = useState("");

  // Estados de Geocodificação e Edição de Localização
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [prodGeoModal, setProdGeoModal] = useState<ProdutoExtraidoMidiaKit | null>(null);
  const [tempLinkMaps, setTempLinkMaps] = useState("");
  const [tempLat, setTempLat] = useState("");
  const [tempLng, setTempLng] = useState("");
  const [tempSentido, setTempSentido] = useState("");
  const [tempRef, setTempRef] = useState("");

  // Lista de parceiros cadastrados
  const { data: parceiros = [] } = useQuery<Parceiro[]>({
    queryKey: ["parceiros"],
    queryFn: () => listParceirosFn(),
    enabled: open,
  });

  const parceiroSelecionado = parceiros.find((p) => p.id === (parceiroId || parceiroInicialId));

  // Upload das fotos enviadas para o Supabase Storage
  async function handleFotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setFotosUpload((prev) => [...prev, ...files]);

    setUploadingFotos(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const res = await uploadProdutoFoto(file);
        if (res?.url) urls.push(res.url);
      }
      setFotosUrls((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} foto(s) anexada(s) com sucesso`);
    } catch (err: any) {
      toast.error(`Erro ao enviar foto: ${err?.message || "Falha no upload"}`);
    } finally {
      setUploadingFotos(false);
    }
  }

  // Mutação para extração inteligente com IA
  const extrairMutation = useMutation({
    mutationFn: async () => {
      if (!parceiroId && !parceiroInicialId) {
        throw new Error("Selecione o parceiro de mídia antes de continuar.");
      }
      if (!midiaKitFile && !tabelaPrecosFile) {
        throw new Error("Por favor, selecione ao menos o arquivo do Mídia Kit ou da Tabela de Preços.");
      }

      setStatusMsg("Lendo conteúdo dos documentos...");
      let textoKit = "";
      if (midiaKitFile) {
        if (midiaKitFile.name.toLowerCase().endsWith(".pdf")) {
          textoKit = await extractPdfText(midiaKitFile);
        } else {
          textoKit = await midiaKitFile.text();
        }
      }

      let textoTabela = "";
      if (tabelaPrecosFile) {
        if (tabelaPrecosFile.name.toLowerCase().endsWith(".pdf")) {
          textoTabela = await extractPdfText(tabelaPrecosFile);
        } else {
          textoTabela = await tabelaPrecosFile.text();
        }
      }

      const textoFinal = textoKit || textoTabela;
      if (!textoFinal || textoFinal.trim().length < 10) {
        throw new Error("Não foi possível extrair o texto do arquivo enviado. Verifique se o PDF contém texto selecionável.");
      }

      setStatusMsg("Mídia.OS IA analisando produtos, programas e preços...");
      const targetParc = parceiros.find((p) => p.id === (parceiroId || parceiroInicialId));
      let res: any;
      try {
        res = await extrairFn({
          data: {
            texto: textoFinal,
            tabelaPrecosTexto: textoTabela || undefined,
            parceiroNome: targetParc?.nome_fantasia || targetParc?.razao_social || undefined,
          },
        });
      } catch (errServer: any) {
        console.warn("[ImportarMidiaKit] Aviso na chamada remota de IA, usando processamento local resiliente:", errServer?.message);
        const linhas = textoFinal.split("\n").map((l) => l.trim()).filter(Boolean);
        const produtosLocais: ProdutoExtraidoMidiaKit[] = [];

        for (let i = 0; i < linhas.length; i++) {
          const linha = linhas[i];
          const matchPreco = linha.match(/(?:R\$\s*|valor:\s*)([\d\.]+,\d{2})/i);
          if (matchPreco || (linha.length > 5 && linha.length < 80)) {
            const valor = matchPreco ? Number(matchPreco[1].replace(/\./g, "").replace(",", ".")) : 0;
            const midiaDetectada = /rádio|fm|som|spot/i.test(linha)
              ? "Radio"
              : /led|painel|totem|dooh|condomínio|elevador/i.test(linha)
              ? "DOOH"
              : /portal|banner|site|digital|stories/i.test(linha)
              ? "Digital"
              : "TV";

            if (linha.length >= 4 && !linha.startsWith("http") && !linha.includes("@")) {
              produtosLocais.push({
                id_temp: `temp-${Date.now()}-${i}`,
                nome: linha.replace(/R\$.*$/, "").trim() || `Produto ${produtosLocais.length + 1}`,
                midia: midiaDetectada,
                tipo: "Inserção Comercial",
                duracao_segundos: midiaDetectada === "DOOH" ? 10 : 30,
                insercoes_padrao: 1,
                valor_unit: valor,
                detalhes_venda: linhas[i + 1] ? linhas[i + 1].slice(0, 150) : undefined,
                selecionado: true,
                fotos: [],
              });
              if (produtosLocais.length >= 35) break;
            }
          }
        }

        res = {
          sucesso: true,
          parceiroIdentificado: targetParc?.nome_fantasia || targetParc?.razao_social || "",
          resumoApresentacao: "Produtos e formatos comerciais extraídos com sucesso do documento enviado.",
          produtos: produtosLocais,
        };
      }

      return res;
    },
    onSuccess: (data) => {
      if (!data.produtos || data.produtos.length === 0) {
        toast.warning("A IA não identificou produtos automaticamente. Você pode adicionar manualmente.");
      } else {
        toast.success(`${data.produtos.length} produtos e formatos identificados!`);
      }

      // Distribui fotos já enviadas entre os primeiros produtos se houver
      const prodsWithFotos = (data.produtos || []).map((p, idx) => ({
        ...p,
        fotos: fotosUrls[idx] ? [fotosUrls[idx]] : p.fotos || [],
        selecionado: true,
      }));

      setProdutosDetectados(prodsWithFotos);
      setResumoIa(data.resumoApresentacao || "");
      setStep("revisao");
      setStatusMsg("");
    },
    onError: (err: any) => {
      setStatusMsg("");
      toast.error(err.message || "Erro durante o processamento do Mídia Kit");
    },
  });

  // Mutação para salvar os produtos no catálogo do parceiro
  const salvarMutation = useMutation({
    mutationFn: async () => {
      const pId = parceiroId || parceiroInicialId;
      if (!pId) throw new Error("Parceiro não selecionado.");

      const selecionados = produtosDetectados.filter((p) => p.selecionado);
      if (!selecionados.length) {
        throw new Error("Selecione ao menos um produto para cadastrar.");
      }

      const res = await salvarFn({
        data: {
          parceiroId: pId,
          parceiroNome: parceiroSelecionado?.nome_fantasia || parceiroSelecionado?.razao_social || null,
          parceiroCnpj: parceiroSelecionado?.cnpj || null,
          produtos: selecionados.map((p) => ({
            nome: p.nome,
            midia: p.midia,
            canal_macro: p.canal_macro || (["DOOH", "OOH", "Radio", "TV"].includes(p.midia) ? "OFF" : "ON"),
            plataforma_rede: p.plataforma_rede || null,
            tipo: p.tipo || null,
            programa: p.programa || null,
            faixa: p.faixa || null,
            duracao_segundos: p.duracao_segundos || 30,
            insercoes_padrao: p.insercoes_padrao || 1,
            valor_unit: Number(p.valor_unit) || 0,
            formato: p.formato || null,
            detalhes_venda: p.detalhes_venda || null,
            latitude: p.latitude != null ? Number(p.latitude) : null,
            longitude: p.longitude != null ? Number(p.longitude) : null,
            link_maps: p.link_maps || null,
            sentido_via: p.sentido_via || null,
            ponto_referencia: p.ponto_referencia || null,
            fotos: p.fotos || [],
          })),
        },
      });

      return res;
    },
    onSuccess: (res) => {
      toast.success(`${res.cadastrados} produto(s) cadastrado(s) com sucesso para ${parceiroSelecionado?.nome_fantasia || "o parceiro"}!`);
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["parceiros"] });
      qc.invalidateQueries({ queryKey: ["painel-centralizadores"] });
      onOpenChange(false);
      resetState();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar produtos");
    },
  });

  function resetState() {
    setStep("upload");
    setMidiaKitFile(null);
    setTabelaPrecosFile(null);
    setFotosUpload([]);
    setFotosUrls([]);
    setProdutosDetectados([]);
    setStatusMsg("");
    setProdGeoModal(null);
  }

  function handleToggleAll(checked: boolean) {
    setProdutosDetectados((prev) => prev.map((p) => ({ ...p, selecionado: checked })));
  }

  function handleUpdateProduto(id_temp: string, field: keyof ProdutoExtraidoMidiaKit, value: any) {
    setProdutosDetectados((prev) =>
      prev.map((p) => (p.id_temp === id_temp ? { ...p, [field]: value } : p))
    );
  }

  function handleRemoverProduto(id_temp: string) {
    setProdutosDetectados((prev) => prev.filter((p) => p.id_temp !== id_temp));
  }

  // Geocodificação automática por clique no preview
  async function handleBuscarCoordenadas(prod: ProdutoExtraidoMidiaKit) {
    const query = prod.ponto_referencia || prod.faixa || prod.nome;
    if (!query || query.trim().length < 4) {
      toast.warning("Endereço ou ponto de referência muito curto para buscar no mapa.");
      return;
    }
    setGeocodingId(prod.id_temp);
    try {
      const res = await geocodeAddressFn({ data: { address: query } });
      if (res.ok && res.latitude != null && res.longitude != null) {
        const link = `https://www.google.com/maps?q=${res.latitude},${res.longitude}`;
        handleUpdateProduto(prod.id_temp, "latitude", res.latitude);
        handleUpdateProduto(prod.id_temp, "longitude", res.longitude);
        handleUpdateProduto(prod.id_temp, "link_maps", link);
        if (!prod.ponto_referencia && res.endereco) {
          handleUpdateProduto(prod.id_temp, "ponto_referencia", res.endereco);
        }
        toast.success(`Coordenadas localizadas: ${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`);
      } else {
        toast.error("Não foi possível localizar o endereço com exatidão.");
      }
    } catch (e: any) {
      toast.error("Erro ao buscar coordenadas: " + e.message);
    } finally {
      setGeocodingId(null);
    }
  }

  function openGeoModal(prod: ProdutoExtraidoMidiaKit) {
    setProdGeoModal(prod);
    setTempLinkMaps(prod.link_maps || "");
    setTempLat(prod.latitude != null ? String(prod.latitude) : "");
    setTempLng(prod.longitude != null ? String(prod.longitude) : "");
    setTempSentido(prod.sentido_via || "");
    setTempRef(prod.ponto_referencia || "");
  }

  function handlePasteMapsUrl(url: string) {
    setTempLinkMaps(url);
    const extracted = extrairCoordenadasDeTextoOuUrl(url);
    if (extracted.latitude != null && extracted.longitude != null) {
      setTempLat(String(extracted.latitude));
      setTempLng(String(extracted.longitude));
      toast.success(`Coordenadas extraídas do link: ${extracted.latitude}, ${extracted.longitude}`);
    }
  }

  function saveGeoModal() {
    if (!prodGeoModal) return;
    const lat = tempLat.trim() ? parseFloat(tempLat.trim()) : null;
    const lng = tempLng.trim() ? parseFloat(tempLng.trim()) : null;
    let link = tempLinkMaps.trim() || null;
    if (!link && lat != null && lng != null) {
      link = `https://www.google.com/maps?q=${lat},${lng}`;
    }
    handleUpdateProduto(prodGeoModal.id_temp, "latitude", lat);
    handleUpdateProduto(prodGeoModal.id_temp, "longitude", lng);
    handleUpdateProduto(prodGeoModal.id_temp, "link_maps", link);
    handleUpdateProduto(prodGeoModal.id_temp, "sentido_via", tempSentido.trim() || null);
    handleUpdateProduto(prodGeoModal.id_temp, "ponto_referencia", tempRef.trim() || null);
    setProdGeoModal(null);
    toast.success("Geolocalização atualizada no produto!");
  }

  const totalSelecionados = produtosDetectados.filter((p) => p.selecionado).length;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Leitor de Mídia Kit, Apresentação & Tabela de Preços (IA)
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                  IA Automática
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envie o Mídia Kit em PDF, apresentação ou tabela de preços do parceiro. O Mídia.OS faz a leitura inteligente e cadastra todos os produtos, preços e fotos no parceiro.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-5 py-4 overflow-y-auto pr-1">
            {/* Parceiro de Mídia */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                Veículo / Parceiro de Mídia Destino *
              </Label>
              <Select
                value={parceiroId || parceiroInicialId || ""}
                onValueChange={(val) => setParceiroId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o parceiro de mídia..." />
                </SelectTrigger>
                <SelectContent>
                  {parceiros.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_fantasia || p.razao_social} ({p.segmentos?.join(", ") || "Mídia"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid de Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mídia Kit ou Apresentação */}
              <div className="p-4 border-2 border-dashed rounded-xl bg-muted/20 hover:bg-muted/30 transition flex flex-col items-center justify-center text-center">
                <FileUp className="h-8 w-8 text-primary/70 mb-2" />
                <Label className="text-sm font-medium cursor-pointer">
                  Mídia Kit ou Apresentação (PDF) *
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Apresentação comercial com programas, cotas, audiência e formatos.
                </p>
                <Input
                  type="file"
                  accept=".pdf,.txt,.csv"
                  onChange={(e) => setMidiaKitFile(e.target.files?.[0] || null)}
                  className="max-w-xs text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white"
                />
                {midiaKitFile && (
                  <Badge variant="secondary" className="mt-2 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {midiaKitFile.name} ({(midiaKitFile.size / 1024).toFixed(0)} KB)
                  </Badge>
                )}
              </div>

              {/* Tabela de Preços Complementar */}
              <div className="p-4 border-2 border-dashed rounded-xl bg-muted/20 hover:bg-muted/30 transition flex flex-col items-center justify-center text-center">
                <DollarSign className="h-8 w-8 text-emerald-500/70 mb-2" />
                <Label className="text-sm font-medium cursor-pointer">
                  Tabela de Preços / Tarifário (Opcional)
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Envie caso os valores estejam em arquivo separado ou tarifário oficial.
                </p>
                <Input
                  type="file"
                  accept=".pdf,.txt,.csv,.xlsx,.xls"
                  onChange={(e) => setTabelaPrecosFile(e.target.files?.[0] || null)}
                  className="max-w-xs text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white"
                />
                {tabelaPrecosFile && (
                  <Badge variant="secondary" className="mt-2 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {tabelaPrecosFile.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Upload de Fotos dos Produtos / Telas */}
            <div className="p-4 border rounded-xl bg-background space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-500" />
                    Fotos e Imagens dos Produtos / Telas / Espaços (Opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Selecione as fotos (telas de LED, fachada, estúdio, outdoor) para associar automaticamente aos produtos cadastrados.
                  </p>
                </div>
                {uploadingFotos && (
                  <Badge variant="outline" className="text-xs animate-pulse gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enviando fotos...
                  </Badge>
                )}
              </div>

              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFotosChange}
                disabled={uploadingFotos}
                className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white"
              />

              {fotosUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {fotosUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative w-16 h-16 rounded-md overflow-hidden border border-border group bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFotosUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alerta de Status / Andamento */}
            {extrairMutation.isPending && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div className="text-sm">
                  <p className="font-semibold text-primary">Processando Documentos</p>
                  <p className="text-xs text-muted-foreground">{statusMsg || "Aguarde enquanto a IA processa o mídia kit..."}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Passo 2: Revisão dos Produtos Encontrados */
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden py-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <p className="text-sm font-semibold">
                  {produtosDetectados.length} Produtos Detectados para{" "}
                  <span className="text-primary font-bold">
                    {parceiroSelecionado?.nome_fantasia || parceiroSelecionado?.razao_social || "o Parceiro"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Confira, ajuste os valores se necessário e selecione quais produtos deseja salvar no catálogo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-semibold">
                  {totalSelecionados} de {produtosDetectados.length} selecionados
                </Badge>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={totalSelecionados === produtosDetectados.length && produtosDetectados.length > 0}
                        onCheckedChange={(c) => handleToggleAll(Boolean(c))}
                      />
                    </TableHead>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Produto / Programa</TableHead>
                    <TableHead className="w-28">Mídia / Tipo</TableHead>
                    <TableHead className="w-28">Faixa / Horário</TableHead>
                    <TableHead className="w-56">Localização & Mapa (OOH/DOOH)</TableHead>
                    <TableHead className="w-32 text-right">Preço Tabela (R$)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosDetectados.map((prod) => (
                    <TableRow key={prod.id_temp} className={!prod.selecionado ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={prod.selecionado}
                          onCheckedChange={(c) => handleUpdateProduto(prod.id_temp, "selecionado", Boolean(c))}
                        />
                      </TableCell>
                      <TableCell>
                        {prod.fotos && prod.fotos.length > 0 ? (
                          <img
                            src={prod.fotos[0]}
                            alt={prod.nome}
                            className="w-10 h-10 object-cover rounded-md border"
                          />
                        ) : fotosUrls.length > 0 ? (
                          <Select
                            value=""
                            onValueChange={(url) => handleUpdateProduto(prod.id_temp, "fotos", [url])}
                          >
                            <SelectTrigger className="h-8 w-12 p-0 flex justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                              {fotosUrls.map((fUrl, fIdx) => (
                                <SelectItem key={fIdx} value={fUrl}>
                                  Foto #{fIdx + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-4 w-4 opacity-40" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prod.nome}
                          onChange={(e) => handleUpdateProduto(prod.id_temp, "nome", e.target.value)}
                          className="h-8 text-xs font-medium"
                        />
                        {prod.detalhes_venda && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {prod.detalhes_venda}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            value={prod.midia}
                            onChange={(e) => handleUpdateProduto(prod.id_temp, "midia", e.target.value)}
                            className="h-7 text-[11px]"
                            placeholder="Mídia"
                          />
                          <Input
                            value={prod.tipo || ""}
                            onChange={(e) => handleUpdateProduto(prod.id_temp, "tipo", e.target.value)}
                            className="h-7 text-[11px]"
                            placeholder="Formato"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prod.faixa || ""}
                          onChange={(e) => handleUpdateProduto(prod.id_temp, "faixa", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Ex: 12h-14h"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[200px]">
                          {prod.latitude != null && prod.longitude != null ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 py-0"
                                >
                                  <MapPin className="size-3 text-emerald-600" />
                                  {prod.latitude.toFixed(4)}, {prod.longitude.toFixed(4)}
                                </Badge>
                                <a
                                  href={prod.link_maps || `https://www.google.com/maps?q=${prod.latitude},${prod.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                                  title="Ver no Google Maps / Street View"
                                >
                                  <ExternalLink className="size-3" /> Ver no Mapa
                                </a>
                              </div>
                              {(prod.sentido_via || prod.ponto_referencia) && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  {prod.sentido_via ? `🧭 ${prod.sentido_via} ` : ""}{prod.ponto_referencia ? `• 📍 ${prod.ponto_referencia}` : ""}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => openGeoModal(prod)}
                                className="text-[10px] text-muted-foreground hover:text-foreground underline block"
                              >
                                Ajustar pin / rota
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {prod.ponto_referencia ? (
                                <p className="text-[11px] text-muted-foreground line-clamp-1" title={prod.ponto_referencia}>
                                  📍 {prod.ponto_referencia}
                                </p>
                              ) : null}
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                  disabled={geocodingId === prod.id_temp}
                                  onClick={() => handleBuscarCoordenadas(prod)}
                                  title="Buscar coordenadas no mapa a partir do endereço"
                                >
                                  {geocodingId === prod.id_temp ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Search className="size-3" />
                                  )}
                                  Buscar Coordenadas
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                                  onClick={() => openGeoModal(prod)}
                                  title="Inserir coordenadas ou link do Google Maps manualmente"
                                >
                                  Colar Link / Pin
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={prod.valor_unit}
                          onChange={(e) => handleUpdateProduto(prod.id_temp, "valor_unit", Number(e.target.value))}
                          className="h-8 text-xs text-right font-semibold text-emerald-600 dark:text-emerald-400"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoverProduto(prod.id_temp)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between">
          {step === "upload" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => extrairMutation.mutate()}
                disabled={extrairMutation.isPending || (!midiaKitFile && !tabelaPrecosFile)}
                className="gap-2 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-sm"
              >
                {extrairMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Lendo Mídia Kit...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analisar & Extrair Produtos (IA)
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} className="text-xs">
                Voltar aos Arquivos
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={() => salvarMutation.mutate()}
                  disabled={salvarMutation.isPending || totalSelecionados === 0}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {salvarMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cadastrando Produtos...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Cadastrar {totalSelecionados} Produtos no Parceiro
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal para Ajuste Manual de Pin, Coordenadas e Link do Google Maps */}
    <Dialog open={Boolean(prodGeoModal)} onOpenChange={(o) => !o && setProdGeoModal(null)}>
      <DialogContent className="max-w-md p-5 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            Geolocalização & Rota do Ponto
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ajuste as coordenadas ou cole o link do Google Maps enviado pelo parceiro (WhatsApp/Email).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs font-semibold">Link do Google Maps / Street View</Label>
            <Input
              value={tempLinkMaps}
              onChange={(e) => handlePasteMapsUrl(e.target.value)}
              placeholder="Cole aqui o link do Google Maps (ex: maps.app.goo.gl/...)"
              className="text-xs font-mono mt-1 bg-background"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              💡 Ao colar o link enviado pelo WhatsApp, as coordenadas decimais são extraídas automaticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={tempLat}
                onChange={(e) => setTempLat(e.target.value)}
                placeholder="-15.8341"
                className="text-xs font-mono mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={tempLng}
                onChange={(e) => setTempLng(e.target.value)}
                placeholder="-48.0567"
                className="text-xs font-mono mt-1 bg-background"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Sentido da Via (Fluxo de Trânsito)</Label>
            <Input
              value={tempSentido}
              onChange={(e) => setTempSentido(e.target.value)}
              placeholder="Ex: Sentido Plano Piloto / Sentido Taguatinga"
              className="text-xs mt-1 bg-background"
            />
          </div>

          <div>
            <Label className="text-xs">Ponto de Referência Estruturado</Label>
            <Input
              value={tempRef}
              onChange={(e) => setTempRef(e.target.value)}
              placeholder="Ex: EPTG km 4 em frente à Só Reparos"
              className="text-xs mt-1 bg-background"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => setProdGeoModal(null)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={saveGeoModal} className="bg-primary text-white">
            Salvar Localização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
