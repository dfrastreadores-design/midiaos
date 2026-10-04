import { useState, useEffect } from "react";
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
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  Building2,
  AlertCircle,
  Plus,
  Trash2,
  MapPin,
  ExternalLink,
  Search,
  Handshake,
  Percent,
  HelpCircle,
  Phone,
  Mail,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { uploadProdutoFoto } from "@/lib/produto-foto";
import { listParceiros, type Parceiro } from "@/lib/parceiros.functions";
import { geocodeAddress } from "@/lib/geocode.functions";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { processarArquivoImportacao } from "@/lib/documento-importer";
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

type TipoVinculo = "novo" | "existente" | "proprio";

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

  // Arquivos enviados
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

  // Vínculo e dados cadastrais do parceiro
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>("novo");
  const [parceiroId, setParceiroId] = useState<string>(parceiroInicialId || "");
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [mostrarEditarParceiro, setMostrarEditarParceiro] = useState(false);

  const [parceiroForm, setParceiroForm] = useState({
    cnpj: "",
    semCnpj: false,
    razao_social: "",
    nome_fantasia: "",
    comissao_padrao_pct: 20.0,
    contato_nome: "",
    contato_telefone: "",
    contato_email: "",
    cidade: "",
    uf: "",
    endereco: "",
  });

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

  const parceiroSelecionado = parceiros.find((p) => p.id === parceiroId);

  // Sincroniza estado inicial quando modal abre
  useEffect(() => {
    if (open) {
      if (parceiroInicialId) {
        setParceiroId(parceiroInicialId);
        setTipoVinculo("existente");
      }
    }
  }, [open, parceiroInicialId]);

  // Se o usuário seleciona um parceiro existente, reflete seus dados
  useEffect(() => {
    if (parceiroSelecionado && tipoVinculo === "existente") {
      setParceiroForm((prev) => ({
        ...prev,
        cnpj: parceiroSelecionado.cnpj || prev.cnpj,
        razao_social: parceiroSelecionado.razao_social || prev.razao_social,
        nome_fantasia: parceiroSelecionado.nome_fantasia || prev.nome_fantasia,
        comissao_padrao_pct: parceiroSelecionado.comissao_padrao_pct ?? prev.comissao_padrao_pct,
        contato_telefone: parceiroSelecionado.contato_telefone || prev.contato_telefone,
        contato_email: parceiroSelecionado.contato_email || prev.contato_email,
      }));
    }
  }, [parceiroSelecionado, tipoVinculo]);

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

  // Busca de CNPJ automática via BrasilAPI / ReceitaWS
  async function handleBuscarCnpj(cnpjParaBuscar?: string) {
    const raw = cnpjParaBuscar || parceiroForm.cnpj || "";
    const digits = onlyDigits(raw);
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ válido com 14 dígitos para consultar.");
      return;
    }

    setSearchingCnpj(true);
    try {
      // 1. Verifica se já existe um parceiro com esse CNPJ no sistema
      const parceiroExistente = parceiros.find(
        (p) => p.cnpj && onlyDigits(p.cnpj) === digits,
      );

      if (parceiroExistente) {
        toast.info(
          `Parceiro já cadastrado: ${parceiroExistente.nome_fantasia || parceiroExistente.razao_social}. Selecionado automaticamente!`,
        );
        setParceiroId(parceiroExistente.id!);
        setTipoVinculo("existente");
        setParceiroForm((prev) => ({
          ...prev,
          cnpj: formatCNPJ(digits),
          razao_social: parceiroExistente.razao_social,
          nome_fantasia: parceiroExistente.nome_fantasia || parceiroExistente.razao_social,
          comissao_padrao_pct: parceiroExistente.comissao_padrao_pct ?? 20.0,
          contato_telefone: parceiroExistente.contato_telefone || "",
          contato_email: parceiroExistente.contato_email || "",
        }));
        return;
      }

      // 2. Consulta na Receita Federal / BrasilAPI
      const data = await fetchCnpj(digits);
      setParceiroForm((prev) => ({
        ...prev,
        cnpj: formatCNPJ(digits),
        razao_social: data.razaoSocial || prev.razao_social,
        nome_fantasia: data.nomeFantasia || data.razaoSocial || prev.nome_fantasia,
        contato_telefone: data.telefone || prev.contato_telefone,
        contato_email: data.email || prev.contato_email,
        cidade: data.cidade || prev.cidade,
        uf: data.estado || prev.uf,
        endereco: data.logradouro
          ? `${data.logradouro}, ${data.numero || "S/N"} - ${data.bairro}`
          : prev.endereco,
      }));

      toast.success(`CNPJ localizado: ${data.nomeFantasia || data.razaoSocial}!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar CNPJ na Receita");
    } finally {
      setSearchingCnpj(false);
    }
  }

  // Mutação para extração inteligente (PDF ou Excel)
  const extrairMutation = useMutation({
    mutationFn: async () => {
      if (!midiaKitFile && !tabelaPrecosFile) {
        throw new Error("Por favor, selecione ao menos o arquivo do Mídia Kit (PDF) ou Planilha (Excel/CSV).");
      }

      setStatusMsg("Lendo e decodificando arquivos...");
      let textoPrincipal = "";
      let dadosPistas: any = {};

      if (midiaKitFile) {
        const proc = await processarArquivoImportacao(midiaKitFile);
        textoPrincipal = proc.textoCompleto;
        dadosPistas = proc.parceiroDetectado || {};
      }

      let textoSecundario = "";
      if (tabelaPrecosFile) {
        const procSec = await processarArquivoImportacao(tabelaPrecosFile);
        textoSecundario = procSec.textoCompleto;
        if (!dadosPistas.cnpj && procSec.parceiroDetectado?.cnpj) {
          dadosPistas.cnpj = procSec.parceiroDetectado.cnpj;
        }
      }

      const textoFinal = textoPrincipal || textoSecundario;
      if (!textoFinal || textoFinal.trim().length < 5) {
        throw new Error("Não foi possível extrair dados dos arquivos enviados.");
      }

      setStatusMsg("Mídia.OS IA identificando parceiro, produtos, programas e preços...");
      const targetParc = parceiros.find((p) => p.id === (parceiroId || parceiroInicialId));

      const res = await extrairFn({
        data: {
          texto: textoFinal,
          tabelaPrecosTexto: textoSecundario || undefined,
          parceiroNome: targetParc?.nome_fantasia || targetParc?.razao_social || dadosPistas.nome || undefined,
        },
      });

      return {
        ...res,
        pistasLocais: dadosPistas,
      };
    },
    onSuccess: (data: any) => {
      if (!data.produtos || data.produtos.length === 0) {
        toast.warning("A IA não identificou produtos automaticamente. Você pode adicionar manualmente.");
      } else {
        toast.success(`${data.produtos.length} produtos e formatos identificados!`);
      }

      // Distribui fotos já enviadas entre os produtos
      const prodsWithFotos = (data.produtos || []).map((p: any, idx: number) => ({
        ...p,
        fotos: fotosUrls[idx] ? [fotosUrls[idx]] : p.fotos || [],
        selecionado: true,
      }));

      setProdutosDetectados(prodsWithFotos);
      setResumoIa(data.resumoApresentacao || "");

      // Identifica ou pré-preenche dados do parceiro se ainda não vinculado
      const parcDetectado = data.parceiroDetectado || {};
      const pistas = data.pistasLocais || {};
      const cnpjEncontrado = parcDetectado.cnpj || pistas.cnpj || "";
      const nomeEncontrado =
        parcDetectado.nome || data.parceiroIdentificado || pistas.nome || "";

      // Se encontrou CNPJ, verifica se já existe na base
      if (cnpjEncontrado) {
        const cleanCnpj = onlyDigits(cnpjEncontrado);
        const match = parceiros.find((p) => p.cnpj && onlyDigits(p.cnpj) === cleanCnpj);
        if (match) {
          setParceiroId(match.id!);
          setTipoVinculo("existente");
          toast.info(`Vinculado ao parceiro existente: ${match.nome_fantasia || match.razao_social}`);
        } else {
          setTipoVinculo("novo");
          setParceiroForm((prev) => ({
            ...prev,
            cnpj: formatCNPJ(cnpjEncontrado),
            razao_social: nomeEncontrado || prev.razao_social,
            nome_fantasia: nomeEncontrado || prev.nome_fantasia,
            contato_telefone: parcDetectado.telefone || pistas.telefone || prev.contato_telefone,
            contato_email: parcDetectado.email || pistas.email || prev.contato_email,
          }));
        }
      } else if (!parceiroId) {
        // Se não tem CNPJ nem parceiro selecionado, prepara formulário com o nome detectado
        setTipoVinculo("novo");
        setParceiroForm((prev) => ({
          ...prev,
          razao_social: nomeEncontrado || prev.razao_social,
          nome_fantasia: nomeEncontrado || prev.nome_fantasia,
          contato_telefone: parcDetectado.telefone || pistas.telefone || prev.contato_telefone,
          contato_email: parcDetectado.email || pistas.email || prev.contato_email,
        }));
      }

      setStep("revisao");
      setStatusMsg("");
    },
    onError: (err: any) => {
      setStatusMsg("");
      toast.error(err.message || "Erro durante o processamento dos arquivos");
    },
  });

  // Mutação para salvar os produtos e cadastrar/atualizar o parceiro atomicamente
  const salvarMutation = useMutation({
    mutationFn: async () => {
      const selecionados = produtosDetectados.filter((p) => p.selecionado);
      if (!selecionados.length) {
        throw new Error("Selecione ao menos um produto para cadastrar.");
      }

      // Validações do parceiro
      if (tipoVinculo === "novo") {
        if (!parceiroForm.razao_social.trim()) {
          throw new Error("Informe a Razão Social ou Nome do Parceiro para vincular os produtos.");
        }
        if (!parceiroForm.semCnpj) {
          const digits = onlyDigits(parceiroForm.cnpj);
          if (digits.length !== 14) {
            throw new Error("Informe o CNPJ com 14 dígitos para vincular o parceiro comercial ou marque 'Parceiro sem CNPJ'.");
          }
        }
      } else if (tipoVinculo === "existente") {
        if (!parceiroId) {
          throw new Error("Selecione um parceiro cadastrado ou alterne para 'Cadastrar Novo Parceiro'.");
        }
      }

      const res = await salvarFn({
        data: {
          parceiroId: tipoVinculo === "existente" ? parceiroId : null,
          novoParceiro:
            tipoVinculo === "novo"
              ? {
                  razao_social: parceiroForm.razao_social.trim(),
                  nome_fantasia: (parceiroForm.nome_fantasia || parceiroForm.razao_social).trim(),
                  cnpj: parceiroForm.semCnpj ? null : formatCNPJ(parceiroForm.cnpj),
                  comissao_padrao_pct: Number(parceiroForm.comissao_padrao_pct) || 20.0,
                  contato_nome: parceiroForm.contato_nome.trim() || null,
                  contato_telefone: parceiroForm.contato_telefone.trim() || null,
                  contato_email: parceiroForm.contato_email.trim() || null,
                  cidade: parceiroForm.cidade.trim() || null,
                  uf: parceiroForm.uf.trim() || null,
                  endereco: parceiroForm.endereco.trim() || null,
                }
              : tipoVinculo === "existente" && parceiroForm.cnpj
              ? {
                  razao_social: parceiroSelecionado?.razao_social || "",
                  cnpj: formatCNPJ(parceiroForm.cnpj),
                  contato_telefone: parceiroForm.contato_telefone.trim() || null,
                  contato_email: parceiroForm.contato_email.trim() || null,
                }
              : null,
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
    onSuccess: (res: any) => {
      toast.success(
        `Sucesso! ${res.cadastrados} produto(s) cadastrado(s) para ${res.parceiroNome || "o inventário"}!`,
      );
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["parceiros"] });
      qc.invalidateQueries({ queryKey: ["painel-centralizadores"] });
      onOpenChange(false);
      resetState();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar parceiro e produtos");
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
    setMostrarEditarParceiro(false);
    setParceiroForm({
      cnpj: "",
      semCnpj: false,
      razao_social: "",
      nome_fantasia: "",
      comissao_padrao_pct: 20.0,
      contato_nome: "",
      contato_telefone: "",
      contato_email: "",
      cidade: "",
      uf: "",
      endereco: "",
    });
  }

  function handleToggleAll(checked: boolean) {
    setProdutosDetectados((prev) => prev.map((p) => ({ ...p, selecionado: checked })));
  }

  function handleUpdateProduto(id_temp: string, field: keyof ProdutoExtraidoMidiaKit, value: any) {
    setProdutosDetectados((prev) =>
      prev.map((p) => (p.id_temp === id_temp ? { ...p, [field]: value } : p)),
    );
  }

  function handleRemoverProduto(id_temp: string) {
    setProdutosDetectados((prev) => prev.filter((p) => p.id_temp !== id_temp));
  }

  function handleAdicionarProdutoManual() {
    const novoProduto: ProdutoExtraidoMidiaKit = {
      id_temp: `temp-${Date.now()}`,
      nome: `Novo Produto ${produtosDetectados.length + 1}`,
      midia: "DOOH",
      canal_macro: "OFF",
      tipo: "Inserção Comercial",
      duracao_segundos: 10,
      insercoes_padrao: 1,
      valor_unit: 1000,
      selecionado: true,
      fotos: [],
    };
    setProdutosDetectados((prev) => [...prev, novoProduto]);
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
  const valorTotalSelecionados = produtosDetectados
    .filter((p) => p.selecionado)
    .reduce((acc, cur) => acc + (Number(cur.valor_unit) || 0), 0);

  // Verifica se faltam informações vitais (CNPJ ou Razão Social)
  const faltaCnpj =
    tipoVinculo === "novo" && !parceiroForm.semCnpj && onlyDigits(parceiroForm.cnpj).length !== 14;
  const faltaNome =
    tipoVinculo === "novo" && !parceiroForm.razao_social.trim();
  const parceiroPronto =
    tipoVinculo === "proprio" ||
    (tipoVinculo === "existente" && Boolean(parceiroId)) ||
    (tipoVinculo === "novo" && !faltaNome && (!faltaCnpj || parceiroForm.semCnpj));

  const nomeExibicaoParceiro =
    tipoVinculo === "proprio"
      ? "Inventário Próprio"
      : tipoVinculo === "existente"
      ? parceiroSelecionado?.nome_fantasia || parceiroSelecionado?.razao_social || "Parceiro Existente"
      : parceiroForm.nome_fantasia || parceiroForm.razao_social || "Novo Parceiro Comercial";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Importar Parceiro & Produtos (PDF ou Excel com IA)
                  <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold"
                  >
                    Mídia.OS IA
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Envie o material do parceiro (Mídia Kit em PDF, apresentação comercial ou planilha Excel/CSV).
                  O sistema extrai os produtos, formatos e preços, e solicita os dados cadastrais (como CNPJ) caso faltem para vinculação.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {step === "upload" ? (
            <div className="space-y-4 py-3 overflow-y-auto pr-1 flex-1">
              {/* Seleção Prévia de Parceiro (Opcional) */}
              <div className="p-3.5 bg-muted/40 rounded-xl border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/90">
                    <Handshake className="h-4 w-4 text-primary" />
                    Parceiro de Mídia Destino (Opcional neste momento)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Se não souber, deixe em branco que a IA identificará ou solicitará o CNPJ a seguir.
                  </span>
                </div>
                <Select
                  value={parceiroId || "__novo__"}
                  onValueChange={(val) => {
                    if (val === "__novo__") {
                      setParceiroId("");
                      setTipoVinculo("novo");
                    } else if (val === "__proprio__") {
                      setParceiroId("");
                      setTipoVinculo("proprio");
                    } else {
                      setParceiroId(val);
                      setTipoVinculo("existente");
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background h-9 text-xs">
                    <SelectValue placeholder="Identificar automaticamente do documento ou escolher parceiro..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__novo__" className="font-semibold text-primary">
                      ✨ Identificar do Documento / Cadastrar Novo Parceiro (com CNPJ)
                    </SelectItem>
                    <SelectItem value="__proprio__">
                      🏢 Inventário Próprio (Sem Parceiro Externo)
                    </SelectItem>
                    {parceiros.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_fantasia || p.razao_social} {p.cnpj ? `(${p.cnpj})` : ""} — {p.comissao_padrao_pct}% comissão
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grid de Uploads: PDF e Excel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Arquivo Principal: Mídia Kit ou Planilha */}
                <div className="p-4 border-2 border-dashed rounded-xl bg-muted/20 hover:bg-muted/30 transition flex flex-col items-center justify-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <Label className="text-sm font-semibold cursor-pointer">
                    Mídia Kit ou Planilha Principal *
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-xs">
                    Suporta <strong>PDF</strong> (Mídia Kit comercial, rate card) ou <strong>Excel/CSV</strong> (.xlsx, .xls, .csv).
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.txt"
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
                  <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <Label className="text-sm font-semibold cursor-pointer">
                    Tabela de Preços / Tarifário (Opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-xs">
                    Envie caso a tabela de valores venha em um Excel ou PDF separado.
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,.txt"
                    onChange={(e) => setTabelaPrecosFile(e.target.files?.[0] || null)}
                    className="max-w-xs text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white"
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
                      Fotos e Imagens dos Produtos / Telas (Opcional)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Selecione imagens (fachada, telas de LED, outdoor, totens) para associar diretamente aos produtos.
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    {fotosUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative w-14 h-14 rounded-md overflow-hidden border border-border group bg-muted"
                      >
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotosUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px]"
                        >
                          Remover
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
                    <p className="font-semibold text-primary">Processando Documentos com IA</p>
                    <p className="text-xs text-muted-foreground">
                      {statusMsg || "Aguarde enquanto a IA faz a leitura de parceiro, produtos, cotas e preços..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Passo 2: Dados Complementares do Parceiro + Revisão dos Produtos */
            <div className="flex-1 flex flex-col space-y-3 overflow-hidden py-2">
              {/* CARD DE VÍNCULO & DADOS DO PARCEIRO */}
              <div className="rounded-xl border p-3.5 bg-gradient-to-r from-purple-500/5 via-primary/5 to-indigo-500/5 border-purple-200 dark:border-purple-900 shrink-0">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-200/60 dark:border-purple-800/60">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-purple-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Vínculo & Cadastro do Parceiro Comercial
                    </span>
                    {parceiroPronto ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 className="size-3" />
                        Pronto para Vínculo: {nomeExibicaoParceiro}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertCircle className="size-3" />
                        Informações Pendentes (CNPJ / Razão Social)
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant={tipoVinculo === "novo" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setTipoVinculo("novo")}
                    >
                      <Plus className="size-3 mr-1" />
                      Novo Parceiro
                    </Button>
                    <Button
                      type="button"
                      variant={tipoVinculo === "existente" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setTipoVinculo("existente")}
                    >
                      <Handshake className="size-3 mr-1" />
                      Parceiro Existente
                    </Button>
                    <Button
                      type="button"
                      variant={tipoVinculo === "proprio" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setTipoVinculo("proprio")}
                    >
                      Inventário Próprio
                    </Button>
                  </div>
                </div>

                {/* MODO NOVO PARCEIRO */}
                {tipoVinculo === "novo" && (
                  <div className="space-y-3 pt-1">
                    {faltaCnpj && !parceiroForm.semCnpj && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                        <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
                        <span>
                          <strong>CNPJ não detectado no arquivo:</strong> Informe o CNPJ abaixo para
                          consultar os dados automaticamente na Receita Federal e vincular os produtos.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                      {/* CNPJ + Botão de Busca */}
                      <div className="md:col-span-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-semibold">CNPJ do Parceiro *</Label>
                          <label className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                            <Checkbox
                              checked={parceiroForm.semCnpj}
                              onCheckedChange={(c) =>
                                setParceiroForm((prev) => ({ ...prev, semCnpj: Boolean(c) }))
                              }
                              className="size-3"
                            />
                            Sem CNPJ (Pessoa Física)
                          </label>
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            placeholder="00.000.000/0000-00"
                            value={parceiroForm.cnpj}
                            disabled={parceiroForm.semCnpj}
                            onChange={(e) => {
                              const fmt = formatCNPJ(e.target.value);
                              setParceiroForm((prev) => ({ ...prev, cnpj: fmt }));
                              if (onlyDigits(fmt).length === 14) {
                                handleBuscarCnpj(fmt);
                              }
                            }}
                            className="h-8 text-xs font-mono"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs px-2.5 shrink-0"
                            disabled={searchingCnpj || parceiroForm.semCnpj}
                            onClick={() => handleBuscarCnpj()}
                            title="Consultar CNPJ na Receita Federal"
                          >
                            {searchingCnpj ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Search className="size-3.5" />
                            )}
                            <span className="ml-1 hidden sm:inline">Buscar</span>
                          </Button>
                        </div>
                      </div>

                      {/* Razão Social */}
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-[11px] font-semibold">Razão Social / Empresa *</Label>
                        <Input
                          placeholder="Ex: TV CARS PUBLICIDADE LTDA"
                          value={parceiroForm.razao_social}
                          onChange={(e) =>
                            setParceiroForm((prev) => ({ ...prev, razao_social: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Nome Fantasia */}
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] font-semibold">Nome Fantasia</Label>
                        <Input
                          placeholder="Ex: TV Cars"
                          value={parceiroForm.nome_fantasia}
                          onChange={(e) =>
                            setParceiroForm((prev) => ({ ...prev, nome_fantasia: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Comissão % */}
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1">
                          <Percent className="size-3 text-purple-600" />
                          Comissão %
                        </Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={parceiroForm.comissao_padrao_pct}
                          onChange={(e) =>
                            setParceiroForm((prev) => ({
                              ...prev,
                              comissao_padrao_pct: Number(e.target.value),
                            }))
                          }
                          className="h-8 text-xs font-semibold text-purple-700 dark:text-purple-300"
                        />
                      </div>
                    </div>

                    {/* Contatos Opcionais (Telefone, Email) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-0.5">
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3" /> Telefone / WhatsApp Comercial
                        </Label>
                        <Input
                          placeholder="(61) 99999-9999"
                          value={parceiroForm.contato_telefone}
                          onChange={(e) =>
                            setParceiroForm((prev) => ({ ...prev, contato_telefone: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Mail className="size-3" /> E-mail Comercial
                        </Label>
                        <Input
                          placeholder="comercial@parceiro.com.br"
                          value={parceiroForm.contato_email}
                          onChange={(e) =>
                            setParceiroForm((prev) => ({ ...prev, contato_email: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Cidade / UF</Label>
                        <Input
                          placeholder="Brasília / DF"
                          value={
                            parceiroForm.cidade
                              ? `${parceiroForm.cidade}${parceiroForm.uf ? ` / ${parceiroForm.uf}` : ""}`
                              : ""
                          }
                          onChange={(e) =>
                            setParceiroForm((prev) => ({ ...prev, cidade: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* MODO PARCEIRO EXISTENTE */}
                {tipoVinculo === "existente" && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                      <div className="md:col-span-7 space-y-1">
                        <Label className="text-[11px] font-semibold">
                          Selecione o Parceiro Cadastrado
                        </Label>
                        <Select value={parceiroId} onValueChange={(val) => setParceiroId(val)}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Escolha um parceiro..." />
                          </SelectTrigger>
                          <SelectContent>
                            {parceiros.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome_fantasia || p.razao_social}{" "}
                                {p.cnpj ? `(${p.cnpj})` : "(Sem CNPJ)"} — {p.comissao_padrao_pct}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Se o parceiro não possui CNPJ, exibe input para complementar agora */}
                      {parceiroSelecionado && !parceiroSelecionado.cnpj && (
                        <div className="md:col-span-5 space-y-1">
                          <Label className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Complementar CNPJ do Parceiro *
                          </Label>
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="00.000.000/0000-00"
                              value={parceiroForm.cnpj}
                              onChange={(e) =>
                                setParceiroForm((prev) => ({
                                  ...prev,
                                  cnpj: formatCNPJ(e.target.value),
                                }))
                              }
                              className="h-8 text-xs font-mono"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs px-2"
                              onClick={() => handleBuscarCnpj()}
                              disabled={searchingCnpj}
                            >
                              Buscar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MODO INVENTÁRIO PRÓPRIO */}
                {tipoVinculo === "proprio" && (
                  <div className="text-xs text-muted-foreground py-1 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>
                      Estes produtos serão adicionados ao <strong>catálogo próprio</strong> da
                      emissora/veículo, sem repasse de comissão a terceiros.
                    </span>
                  </div>
                )}
              </div>

              {/* BARRA DE TÍTULO DA TABELA DE PRODUTOS */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>{produtosDetectados.length} Produtos Encontrados</span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      Total: R${" "}
                      {valorTotalSelecionados.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Revise preços, formatos e fotos. Desmarque itens que não deseja incluir no catálogo.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleAdicionarProdutoManual}
                  >
                    <Plus className="size-3.5" />
                    Adicionar Produto
                  </Button>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {totalSelecionados} de {produtosDetectados.length} selecionados
                  </Badge>
                </div>
              </div>

              {/* TABELA DE PRODUTOS */}
              <div className="flex-1 overflow-y-auto border rounded-lg min-h-[220px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            totalSelecionados === produtosDetectados.length &&
                            produtosDetectados.length > 0
                          }
                          onCheckedChange={(c) => handleToggleAll(Boolean(c))}
                        />
                      </TableHead>
                      <TableHead className="w-16">Foto</TableHead>
                      <TableHead>Produto / Formato</TableHead>
                      <TableHead className="w-28">Mídia / Canal</TableHead>
                      <TableHead className="w-28">Duração / Inserções</TableHead>
                      <TableHead className="w-52">Localização / Ponto</TableHead>
                      <TableHead className="w-28 text-right">Tabela Unit. (R$)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosDetectados.map((prod) => (
                      <TableRow key={prod.id_temp} className={!prod.selecionado ? "opacity-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={prod.selecionado}
                            onCheckedChange={(c) =>
                              handleUpdateProduto(prod.id_temp, "selecionado", Boolean(c))
                            }
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
                            className="h-8 text-xs font-semibold"
                          />
                          {prod.detalhes_venda && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                              {prod.detalhes_venda}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Select
                              value={prod.midia}
                              onValueChange={(v) => handleUpdateProduto(prod.id_temp, "midia", v)}
                            >
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DOOH">DOOH</SelectItem>
                                <SelectItem value="TV">TV</SelectItem>
                                <SelectItem value="Radio">Rádio</SelectItem>
                                <SelectItem value="Digital">Digital</SelectItem>
                                <SelectItem value="OOH">OOH</SelectItem>
                                <SelectItem value="Impresso">Impresso</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={prod.tipo || ""}
                              onChange={(e) => handleUpdateProduto(prod.id_temp, "tipo", e.target.value)}
                              className="h-7 text-[11px]"
                              placeholder="Tipo / Formato"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={prod.duracao_segundos || 30}
                              onChange={(e) =>
                                handleUpdateProduto(prod.id_temp, "duracao_segundos", Number(e.target.value))
                              }
                              className="h-7 text-[11px]"
                              title="Duração em Segundos"
                            />
                            <Input
                              type="number"
                              value={prod.insercoes_padrao || 1}
                              onChange={(e) =>
                                handleUpdateProduto(prod.id_temp, "insercoes_padrao", Number(e.target.value))
                              }
                              className="h-7 text-[11px]"
                              title="Inserções Padrão"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[180px]">
                            {prod.latitude != null && prod.longitude != null ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 py-0"
                                  >
                                    <MapPin className="size-3 text-emerald-600" />
                                    {prod.latitude.toFixed(4)}, {prod.longitude.toFixed(4)}
                                  </Badge>
                                  <a
                                    href={
                                      prod.link_maps ||
                                      `https://www.google.com/maps?q=${prod.latitude},${prod.longitude}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="size-3" /> Ver
                                  </a>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openGeoModal(prod)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground underline block"
                                >
                                  Ajustar mapa
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Input
                                  value={prod.ponto_referencia || prod.faixa || ""}
                                  onChange={(e) =>
                                    handleUpdateProduto(prod.id_temp, "ponto_referencia", e.target.value)
                                  }
                                  placeholder="Endereço / Referência"
                                  className="h-7 text-[11px]"
                                />
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 gap-1 border-primary/30 text-primary"
                                    disabled={geocodingId === prod.id_temp}
                                    onClick={() => handleBuscarCoordenadas(prod)}
                                  >
                                    {geocodingId === prod.id_temp ? (
                                      <Loader2 className="size-2.5 animate-spin" />
                                    ) : (
                                      <Search className="size-2.5" />
                                    )}
                                    Geolocalizar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-muted-foreground"
                                    onClick={() => openGeoModal(prod)}
                                  >
                                    Colar Link Maps
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
                            onChange={(e) =>
                              handleUpdateProduto(prod.id_temp, "valor_unit", Number(e.target.value))
                            }
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

          <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between shrink-0">
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
                      Lendo Documentos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analisar Documento & Extrair Produtos (IA)
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
                    disabled={salvarMutation.isPending || totalSelecionados === 0 || !parceiroPronto}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    {salvarMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cadastrando Parceiro & Produtos...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar e Cadastrar {totalSelecionados} Produtos em "{nomeExibicaoParceiro}"
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
              Ajuste as coordenadas ou cole o link do Google Maps enviado pelo parceiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Link do Google Maps</Label>
              <Input
                placeholder="https://maps.google.com/?q=..."
                value={tempLinkMaps}
                onChange={(e) => {
                  const url = e.target.value;
                  setTempLinkMaps(url);
                  const extracted = extrairCoordenadasDeTextoOuUrl(url);
                  if (extracted.latitude != null && extracted.longitude != null) {
                    setTempLat(String(extracted.latitude));
                    setTempLng(String(extracted.longitude));
                  }
                }}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Latitude</Label>
                <Input
                  placeholder="-15.8341"
                  value={tempLat}
                  onChange={(e) => setTempLat(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Longitude</Label>
                <Input
                  placeholder="-48.0567"
                  value={tempLng}
                  onChange={(e) => setTempLng(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sentido da Via / Fluxo</Label>
              <Input
                placeholder="Ex: Sentido Plano Piloto"
                value={tempSentido}
                onChange={(e) => setTempSentido(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ponto de Referência</Label>
              <Input
                placeholder="Ex: Em frente à concessionária / Km 4"
                value={tempRef}
                onChange={(e) => setTempRef(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setProdGeoModal(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveGeoModal} className="bg-primary text-white">
              Salvar Localização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
