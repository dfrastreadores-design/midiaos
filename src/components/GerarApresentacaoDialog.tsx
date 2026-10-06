import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Sparkles,
  FileText,
  Presentation,
  Upload,
  X,
  Search,
  Eye,
  MessageCircle,
  Sliders,
  MapPin,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import { uploadPdfSigned } from "@/lib/whatsapp-share";
import { WhatsappQrDialog } from "@/components/WhatsappQrDialog";
import { toast } from "sonner";
import { getProposta, salvarPropostaLogo } from "@/lib/propostas.functions";
import { gerarResumoIA } from "@/lib/proposta-resumo.functions";
import { buscarLogos, baixarLogoDataUrl, type LogoResultado } from "@/lib/logo-search.functions";
import type { PropostaApresentacao } from "@/lib/proposta-presentation";
import { listProposalLayouts } from "@/lib/layouts.functions";
import { getLogoSignedUrl } from "@/lib/logo-url";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportarModeloPropostaDialog } from "@/components/ImportarModeloPropostaDialog";
import { useCurrentOrg } from "@/hooks/use-current-org";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; propostaId: string | null };

export function GerarApresentacaoDialog({ open, onOpenChange, propostaId }: Props) {
  const [proposta, setProposta] = useState<PropostaApresentacao | null>(null);
  const [resumo, setResumo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [clienteNome, setClienteNome] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoResultados, setLogoResultados] = useState<LogoResultado[]>([]);
  const [logoQuery, setLogoQuery] = useState("");
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("default");
  const [importarModeloOpen, setImportarModeloOpen] = useState(false);
  const [modoApresentacao, setModoApresentacao] = useState<"detalhado" | "pacote_midia">(
    "detalhado",
  );
  const [mostrarEndereco, setMostrarEndereco] = useState(true);
  const [mostrarFotos, setMostrarFotos] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const { org } = useCurrentOrg();

  const { data: layouts = [] } = useQuery({
    queryKey: ["proposal_layouts"],
    queryFn: () => listProposalLayouts(),
    enabled: open,
  });

  const selectedLayout =
    layouts.find((l: any) => l.id === selectedLayoutId) || layouts.find((l: any) => l.is_default);

  useEffect(() => {
    if (!open || !propostaId) {
      setProposta(null);
      setResumo("");
      setClienteNome("");
      setLogoDataUrl(null);
      setLogoResultados([]);
      setLogoQuery("");
      return;
    }
    setCarregando(true);
    getProposta({ data: { id: propostaId } })
      .then(async (p: any) => {
        setProposta(p as unknown as PropostaApresentacao);
        const nome =
          p.cliente?.nome_fantasia ||
          p.cliente?.razao_social ||
          p.agencia?.nome_fantasia ||
          p.agencia?.razao_social ||
          "";
        setClienteNome(nome);
        if (p.modo_apresentacao) {
          setModoApresentacao(p.modo_apresentacao);
        } else {
          setModoApresentacao("detalhado");
        }
        if (typeof p.mostrar_endereco === "boolean") {
          setMostrarEndereco(p.mostrar_endereco);
        } else {
          setMostrarEndereco(true);
        }
        if (typeof p.mostrar_fotos === "boolean") {
          setMostrarFotos(p.mostrar_fotos);
        } else {
          setMostrarFotos(true);
        }
        // Prefer logo salva na proposta; fallback para logo do cliente/agencia (bucket privado)
        if (p.logo_data_url) {
          setLogoDataUrl(p.logo_data_url);
        } else {
          const logoPath = p.cliente?.logo_url || p.agencia?.logo_url || null;
          const signed = logoPath ? await getLogoSignedUrl(logoPath) : null;
          setLogoDataUrl(signed);
        }
        setLogoQuery(
          p.cliente?.nome_fantasia ||
            p.cliente?.razao_social ||
            p.agencia?.nome_fantasia ||
            p.agencia?.razao_social ||
            nome ||
            "",
        );
        setResumo("");
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setCarregando(false));
  }, [open, propostaId]);

  const regerar = useMutation({
    mutationFn: async () => {
      if (!proposta) return;
      const itens_resumo = (proposta.itens ?? [])
        .slice(0, 30)
        .map(
          (it) =>
            `- ${it.tipo}${it.programa ? ` em ${it.programa}` : ""}${it.formato ? ` (${it.formato})` : ""}: ${it.total_insercoes} inserções`,
        )
        .join("\n");
      const { texto } = await gerarResumoIA({
        data: {
          campanha: proposta.campanha,
          cliente: clienteNome || "Cliente",
          valor_negociado: proposta.valor_negociado,
          total_insercoes: proposta.total_insercoes,
          itens_resumo,
          observacao: proposta.observacao,
        },
      });
      setResumo(texto);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const persistirLogo = async (dataUrl: string | null) => {
    if (!propostaId) return;
    try {
      await salvarPropostaLogo({ data: { id: propostaId, logo_data_url: dataUrl } });
    } catch (e) {
      toast.error("Não foi possível salvar a logo: " + (e as Error).message);
    }
  };

  const onLogoFile = (file: File | null) => {
    if (!file) {
      setLogoDataUrl(null);
      void persistirLogo(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo muito grande (máx 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setLogoDataUrl(url);
      void persistirLogo(url);
    };
    reader.onerror = () => toast.error("Falha ao ler imagem");
    reader.readAsDataURL(file);
  };

  const buscar = useMutation({
    mutationFn: async () => {
      const q = (logoQuery || clienteNome).trim();
      if (!q) throw new Error("Informe um nome para buscar");
      const { results } = await buscarLogos({ data: { query: q } });
      setLogoResultados(results);
      if (results.length === 0) toast.info("Nenhuma logo encontrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const escolher = useMutation({
    mutationFn: async (url: string) => {
      const { dataUrl } = await baixarLogoDataUrl({ data: { url } });
      setLogoDataUrl(dataUrl);
      await persistirLogo(dataUrl);
      toast.success("Logo aplicada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const propostaParaExport = (): PropostaApresentacao | null => {
    if (!proposta) return null;
    return {
      ...proposta,
      modo_apresentacao: modoApresentacao,
      mostrar_endereco: mostrarEndereco,
      mostrar_fotos: mostrarFotos,
      cliente: {
        ...(proposta.cliente ?? {}),
        nome_fantasia: clienteNome || proposta.cliente?.nome_fantasia || null,
        razao_social: proposta.cliente?.razao_social ?? null,
        logo_url: logoDataUrl,
      },
      organizacao: (proposta as any).organizacao || org,
    };
  };

  const getLayoutPayload = () => {
    if (!selectedLayout) return undefined;
    return {
      ...selectedLayout.config,
      slides: selectedLayout.slides,
      mapeamento: selectedLayout.mapeamento,
      name: selectedLayout.name,
    };
  };

  const exportarPptx = async () => {
    const p = propostaParaExport();
    if (!p) return;
    try {
      console.log("Iniciando exportação PPTX para proposta:", p.numero, p);
      const { gerarPptxProposta } = await import("@/lib/proposta-presentation");
      await gerarPptxProposta(p, resumo, getLayoutPayload());
      toast.success("PPTX gerado com sucesso");
    } catch (e) {
      console.error("Erro exportarPptx:", e);
      toast.error("Erro ao gerar PPTX: " + (e as Error).message);
    }
  };
  const exportarPdf = async () => {
    const p = propostaParaExport();
    if (!p) return;
    try {
      if (selectedLayoutId === "__nexo_slides__") {
        const { gerarPdfPropostaNexo } = await import("@/lib/proposta-presentation");
        await gerarPdfPropostaNexo(p, resumo);
      } else {
        const { gerarPdfProposta } = await import("@/lib/proposta-presentation");
        await gerarPdfProposta(p, resumo, getLayoutPayload());
      }
      toast.success("PDF gerado com sucesso");
    } catch (e) {
      console.error("Erro exportarPdf:", e);
      toast.error("Erro ao gerar PDF: " + (e as Error).message);
    }
  };
  const exportarPdfExecutivoCoBranding = async () => {
    const p = propostaParaExport();
    if (!p) return;
    try {
      const { gerarPdfPropostaExecutivaCoBranding } = await import("@/lib/proposta-presentation");
      await gerarPdfPropostaExecutivaCoBranding(p);
      toast.success("PDF Executivo Co-Branding gerado com sucesso!");
    } catch (e) {
      console.error("Erro exportarPdfExecutivoCoBranding:", e);
      toast.error("Erro ao gerar PDF Co-Branding: " + (e as Error).message);
    }
  };
  const visualizar = async () => {
    const p = propostaParaExport();
    if (!p) return;
    setPreviewLoading(true);
    try {
      const { gerarPdfProposta, gerarPdfPropostaNexo } = await import("@/lib/proposta-presentation");
      const blob = (selectedLayoutId === "__nexo_slides__"
        ? await gerarPdfPropostaNexo(p, resumo, { returnBlob: true })
        : await gerarPdfProposta(p, resumo, getLayoutPayload(), { returnBlob: true })
      ) as Blob;
      const buf = await blob.arrayBuffer();

      const pdfjs: any = await import("pdfjs-dist");
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const pdf = await pdfjs.getDocument({ data: buf }).promise;

      // Abre o dialog de preview e aguarda o container montar
      setPreviewUrl("open");
      let container: HTMLDivElement | null = null;
      for (let tries = 0; tries < 30 && !container; tries++) {
        await new Promise((r) => setTimeout(r, 50));
        container = previewContainerRef.current;
      }
      if (!container) {
        toast.error("Não foi possível abrir a pré-visualização");
        return;
      }
      container.innerHTML = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "mx-auto my-2 shadow-md max-w-full h-auto";
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        container.appendChild(canvas);
      }
    } catch (e) {
      toast.error("Erro ao gerar pré-visualização: " + (e as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const [sharing, setSharing] = useState(false);
  const [whatsQr, setWhatsQr] = useState<{ phone: string; message: string; title?: string } | null>(
    null,
  );
  const enviarWhatsapp = async () => {
    const p = propostaParaExport();
    if (!p || !propostaId) return;
    const phoneSugerido =
      (proposta as any)?.cliente?.telefone ||
      (proposta as any)?.cliente?.contato_telefone ||
      (proposta as any)?.agencia?.telefone ||
      (proposta as any)?.agencia?.contato_telefone ||
      "";
    const phone = window.prompt(
      "Telefone do destinatário (com DDD; DDI 55 será adicionado automaticamente):",
      phoneSugerido,
    );
    if (phone === null) return;
    setSharing(true);
    try {
      const { gerarPdfProposta, gerarPdfPropostaNexo } = await import("@/lib/proposta-presentation");
      const blob = (selectedLayoutId === "__nexo_slides__"
        ? await gerarPdfPropostaNexo(p, resumo, { returnBlob: true })
        : await gerarPdfProposta(p, resumo, getLayoutPayload(), { returnBlob: true })
      ) as Blob;
      const fileName = `Proposta-${p.numero || propostaId}.pdf`;
      const url = await uploadPdfSigned("proposta-anexos", propostaId, fileName, blob);
      const msgPadrao = `Olá! Segue a proposta comercial ${p.numero ? `nº ${p.numero}` : ""}${p.campanha ? ` — ${p.campanha}` : ""}.\n\nPDF: ${url}`;
      const msg = window.prompt("Personalize a mensagem do WhatsApp:", msgPadrao);
      if (msg === null) return;
      setWhatsQr({ phone, message: msg, title: `Enviar Proposta ${p.numero ?? ""}`.trim() });
      toast.success("QR/Link pronto para envio");
    } catch (e) {
      toast.error("Erro ao preparar envio: " + (e as Error).message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Apresentação da Proposta</DialogTitle>
            <DialogDescription>
              Informe o nome e a logo do cliente para a capa, ajuste o resumo gerado pela IA e
              exporte.
            </DialogDescription>
          </DialogHeader>

          {carregando ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Buscando proposta e gerando resumo com IA…</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proposta && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Proposta:</span>{" "}
                      <span className="font-mono">{proposta.numero}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Campanha:</span> {proposta.campanha}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Modelo de Layout</Label>
                    <button
                      type="button"
                      onClick={() => setImportarModeloOpen(true)}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <Sliders className="size-3.5" />
                      {selectedLayout?.slides?.length
                        ? "Editar Modelo da Empresa"
                        : "Importar Modelo Próprio"}
                    </button>
                  </div>
                  <Select
                    value={selectedLayoutId}
                    onValueChange={(v) => {
                      if (v === "__novo_modelo__") {
                        setImportarModeloOpen(true);
                        return;
                      }
                      setSelectedLayoutId(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="__nexo_slides__"
                        className="text-[#ff6b00] font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-[#ff6b00]/10 cursor-pointer"
                      >
                        🌟 Lâminas Nexo (Slides 16:9 • Volvo Standard)
                      </SelectItem>
                      <SelectItem
                        value="__novo_modelo__"
                        className="text-primary font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-primary/10 cursor-pointer"
                      >
                        ➕ Importar / Cadastrar Novo Modelo...
                      </SelectItem>
                      <SelectItem value="default">Layout Padrão TVB</SelectItem>
                      {layouts.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.slides?.length ? "🖼️ " : ""}
                          {l.name} {l.is_default ? "(Padrão)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Formato de Apresentação e Valores da Proposta */}
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Package className="size-4 text-primary" />
                    Formato de Valores e Exibição
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defina se a proposta detalha cada item ou consolida como pacote de mídia, além
                    de exibir endereço, mapa e fotos.
                  </p>
                </div>

                {/* Seletor Segmentado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setModoApresentacao("detalhado")}
                    className={`p-3 rounded-lg border text-left transition relative flex flex-col gap-1.5 ${
                      modoApresentacao === "detalhado"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <FileText className="size-3.5" />
                        Valor Total da Proposta
                      </span>
                      {modoApresentacao === "detalhado" && (
                        <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Tabela detalhada com valores unitários, totais por item, descontos aplicados e
                      destaque do{" "}
                      <strong className="text-foreground">VALOR TOTAL DA PROPOSTA</strong>.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoApresentacao("pacote_midia")}
                    className={`p-3 rounded-lg border text-left transition relative flex flex-col gap-1.5 ${
                      modoApresentacao === "pacote_midia"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Package className="size-3.5" />
                        Pacote de Mídia
                      </span>
                      {modoApresentacao === "pacote_midia" && (
                        <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Oculta valores individuais por produto e apresenta o investimento global
                      consolidado como <strong className="text-foreground">PACOTE DE MÍDIA</strong>.
                    </p>
                  </button>
                </div>

                {/* Switches para Endereço/GPS e Fotos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between rounded-lg border bg-background/80 p-2.5">
                    <div className="space-y-0.5 pr-2">
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-blue-600" />
                        Endereço e Geolocalização
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Inclui endereço do ponto e link do mapa para produtos cadastrados.
                      </p>
                    </div>
                    <Switch checked={mostrarEndereco} onCheckedChange={setMostrarEndereco} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-background/80 p-2.5">
                    <div className="space-y-0.5 pr-2">
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-amber-600" />
                        Link das Fotos dos Produtos
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Inclui link clicável direto para fotos cadastradas no produto.
                      </p>
                    </div>
                    <Switch checked={mostrarFotos} onCheckedChange={setMostrarFotos} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
                <div className="space-y-2">
                  <Label htmlFor="cliente-nome">Nome do cliente (capa)</Label>
                  <Input
                    id="cliente-nome"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Ex: Banco XPTO"
                  />
                  <p className="text-xs text-muted-foreground">
                    Não é necessário cadastrar o cliente — basta informar nome e logo aqui.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Logo do cliente</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-16 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                      {logoDataUrl ? (
                        <img
                          src={logoDataUrl}
                          alt="logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">sem logo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="size-3.5 mr-1" /> Enviar
                      </Button>
                      {logoDataUrl && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onLogoFile(null)}
                        >
                          <X className="size-3.5 mr-1" /> Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3 bg-muted/20">
                <Label className="text-sm">Buscar logo automaticamente</Label>
                <div className="flex gap-2">
                  <Input
                    value={logoQuery}
                    onChange={(e) => setLogoQuery(e.target.value)}
                    placeholder="Nome, razão social ou CNPJ"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        buscar.mutate();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={buscar.isPending}
                    onClick={() => buscar.mutate()}
                  >
                    {buscar.isPending ? (
                      <Loader2 className="size-4 animate-spin mr-1" />
                    ) : (
                      <Search className="size-4 mr-1" />
                    )}
                    Buscar
                  </Button>
                </div>
                {logoResultados.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {logoResultados.map((r) => (
                      <button
                        key={r.dominio}
                        type="button"
                        disabled={escolher.isPending}
                        onClick={() => escolher.mutate(r.icone)}
                        className="group border rounded-md p-2 bg-background hover:border-primary hover:shadow-sm transition flex flex-col items-center gap-1 text-left"
                        title={`${r.nome} (${r.dominio})`}
                      >
                        <div className="w-full h-14 flex items-center justify-center overflow-hidden">
                          <img
                            src={r.icone}
                            alt={r.nome}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate w-full">
                          {r.dominio}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Pesquisamos pelo nome ou CNPJ. Clique em uma opção para usá-la na capa.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Resumo da proposta (editável)</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={regerar.isPending}
                    onClick={() => regerar.mutate()}
                  >
                    {regerar.isPending ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="size-3.5 mr-1" />
                    )}
                    {resumo ? "Regenerar com IA" : "Gerar com IA"}
                  </Button>
                </div>
                <Textarea
                  rows={resumo ? 12 : 3}
                  value={resumo}
                  onChange={(e) => setResumo(e.target.value)}
                  placeholder="Texto que aparecerá no slide 'A Proposta'…"
                />
                <p className="text-xs text-muted-foreground">
                  Separe parágrafos com linha em branco. Será inserido no slide da apresentação.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="outline"
              disabled={!proposta || carregando || previewLoading}
              onClick={visualizar}
            >
              {previewLoading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Eye className="size-4 mr-2" />
              )}
              Visualizar
            </Button>
            <Button variant="secondary" disabled={!proposta || carregando} onClick={exportarPdf}>
              <FileText className="size-4 mr-2" /> Baixar PDF
            </Button>
            <Button
              variant="outline"
              disabled={!proposta || carregando}
              onClick={exportarPdfExecutivoCoBranding}
              className="border-primary/40 text-primary hover:bg-primary/10"
              title="Gera o PDF Executivo sob medida com o co-branding do anunciante"
            >
              <Sparkles className="size-4 mr-2" /> PDF Co-Branding
            </Button>
            <Button disabled={!proposta || carregando} onClick={exportarPptx}>
              <Presentation className="size-4 mr-2" /> Baixar PPTX
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!proposta || carregando || sharing}
              onClick={enviarWhatsapp}
              title="Gera o PDF, envia para o storage e abre o WhatsApp com o link"
            >
              {sharing ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="size-4 mr-2" />
              )}
              WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>

        <Dialog
          open={!!previewUrl}
          onOpenChange={(v) => {
            if (!v) setPreviewUrl(null);
          }}
        >
          <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col">
            <DialogHeader className="px-4 pt-4">
              <DialogTitle>Pré-visualização da Proposta</DialogTitle>
            </DialogHeader>
            <div
              ref={previewContainerRef}
              className="flex-1 overflow-auto bg-muted/30 p-4 rounded-b-md border-t"
            />
          </DialogContent>
        </Dialog>
      </Dialog>
      <WhatsappQrDialog
        open={!!whatsQr}
        onOpenChange={(v) => {
          if (!v) setWhatsQr(null);
        }}
        phone={whatsQr?.phone ?? ""}
        message={whatsQr?.message ?? ""}
        title={whatsQr?.title}
      />
      <ImportarModeloPropostaDialog
        open={importarModeloOpen}
        onOpenChange={setImportarModeloOpen}
        initial={selectedLayout?.slides?.length ? selectedLayout : null}
        onSaved={(res) => {
          if (res?.id) setSelectedLayoutId(res.id);
        }}
      />
    </>
  );
}
