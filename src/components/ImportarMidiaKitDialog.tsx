import { useRef, useState, useEffect, useMemo, useCallback } from "react";
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
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { uploadProdutoFoto } from "@/lib/produto-foto";
import { listParceiros, type Parceiro } from "@/lib/parceiros.functions";
import { geocodeAddress } from "@/lib/geocode.functions";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { processarArquivoImportacao } from "@/lib/documento-importer";
import { enriquecerParceiroPorUrl } from "@/lib/parceiro-scraper.functions";
import {
  extrairProdutosDeMidiaKit,
  salvarProdutosExtraidosMidiaKit,
  verificarDuplicidadesImportacao,
  extrairCoordenadasDeTextoOuUrl,
  extrairRotaEReferencia,
  type ProdutoExtraidoMidiaKit,
  type ImagemExtraidaMidiaKit,
} from "@/lib/midia-kit-ai.functions";
import {
  exportarProdutosMidiaKitExcel,
  parsePlanilhaCorrigidaMidiaKit,
  type ResultadoValidacaoPlanilha,
} from "@/lib/midia-kit-excel";
import { LoteAcoesBar, type FiltroProduto } from "@/components/importer/LoteAcoesBar";
import { EdicaoLoteDialog, type DadosEdicaoLote } from "@/components/importer/EdicaoLoteDialog";
import { PlanilhaPreviewDialog } from "@/components/importer/PlanilhaPreviewDialog";
import { GaleriaFotosMidiaKit } from "@/components/importer/GaleriaFotosMidiaKit";
import { ResumoValidacaoDialog } from "@/components/importer/ResumoValidacaoDialog";

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
  const verificarDuplicidadesFn = useServerFn(verificarDuplicidadesImportacao);
  const geocodeAddressFn = useServerFn(geocodeAddress);
  const enriquecerFn = useServerFn(enriquecerParceiroPorUrl);

  // Arquivos enviados
  const [midiaKitFile, setMidiaKitFile] = useState<File | null>(null);
  const [tabelaPrecosFile, setTabelaPrecosFile] = useState<File | null>(null);
  const [fotosUpload, setFotosUpload] = useState<File[]>([]);
  const [fotosUrls, setFotosUrls] = useState<string[]>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  // Captura direta via Site e Redes Sociais
  const [siteUrlInput, setSiteUrlInput] = useState("");
  const [instagramInput, setInstagramInput] = useState("");
  const [enrichingWeb, setEnrichingWeb] = useState(false);
  const [particularidadesDetectadas, setParticularidadesDetectadas] = useState<string[]>([]);

  // Estados do fluxo
  const [step, setStep] = useState<"upload" | "revisao">("upload");
  const [statusMsg, setStatusMsg] = useState("");
  const [produtosDetectados, setProdutosDetectados] = useState<ProdutoExtraidoMidiaKit[]>([]);
  const [resumoIa, setResumoIa] = useState("");
  const [todasImagensExtraidas, setTodasImagensExtraidas] = useState<ImagemExtraidaMidiaKit[]>([]);
  const [fotosPendentes, setFotosPendentes] = useState<ImagemExtraidaMidiaKit[]>([]);
  const [mostrarGaleriaFotos, setMostrarGaleriaFotos] = useState(false);

  // Estados de Edição em Lote, Filtros e Histórico de Desfazer (Undo)
  const [historicoUndo, setHistoricoUndo] = useState<ProdutoExtraidoMidiaKit[][]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroProduto>("todos");
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(50);
  const [modalEdicaoLoteOpen, setModalEdicaoLoteOpen] = useState(false);
  const [modoEdicaoLote, setModoEdicaoLote] = useState<"edicao_lote" | "aplicar_padrao">("edicao_lote");
  const [geocodificandoLote, setGeocodificandoLote] = useState(false);

  // Estados para Planilha Corrigida (Excel/CSV)
  const [modalPlanilhaPreviewOpen, setModalPlanilhaPreviewOpen] = useState(false);
  const [resultadoPlanilha, setResultadoPlanilha] = useState<ResultadoValidacaoPlanilha | null>(null);
  const [planilhaArquivoNome, setPlanilhaArquivoNome] = useState("");
  const planilhaInputRef = useRef<HTMLInputElement>(null);

  // Estados para Resumo de Validação Pré-Cadastro
  const [modalResumoValidacaoOpen, setModalResumoValidacaoOpen] = useState(false);
  const [duplicidadesEncontradas, setDuplicidadesEncontradas] = useState<{ id: string; nome: string }[]>([]);
  const [verificandoDuplicidades, setVerificandoDuplicidades] = useState(false);

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

  // Captura direta via Site e Redes Sociais do Parceiro
  async function handleCapturarSiteRedes() {
    if (!siteUrlInput && !instagramInput) {
      toast.warning("Informe o Site ou Instagram do parceiro para leitura automática.");
      return;
    }
    setEnrichingWeb(true);
    setStatusMsg("Acessando site/redes e extraindo particularidades comerciais...");
    try {
      const res = await enriquecerFn({
        data: {
          siteUrl: siteUrlInput || undefined,
          instagram: instagramInput || undefined,
        },
      });

      if (res.sucesso) {
        setParceiroForm((prev) => ({
          ...prev,
          razao_social: res.razao_social || res.nome_fantasia || prev.razao_social,
          nome_fantasia: res.nome_fantasia || prev.nome_fantasia,
          cnpj: res.cnpj || prev.cnpj,
          contato_telefone: res.telefone || prev.contato_telefone,
          contato_email: res.email || prev.contato_email,
          cidade: res.cidade || prev.cidade,
          uf: res.uf || prev.uf,
          endereco: res.endereco || prev.endereco,
        }));

        setParticularidadesDetectadas(res.particularidades || []);

        if (res.produtosDetectados && res.produtosDetectados.length > 0) {
          const prods: ProdutoExtraidoMidiaKit[] = res.produtosDetectados.map((p, idx) => ({
            id_temp: `web-${Date.now()}-${idx}`,
            nome: p.nome,
            midia: p.midia,
            tipo: p.tipo,
            duracao_segundos: p.duracao_segundos || 15,
            insercoes_padrao: p.insercoes_padrao || 1,
            valor_unit: p.valor_unit || 0,
            detalhes_venda: p.detalhes_venda,
            selecionado: true,
            fotos: [],
          }));
          setProdutosDetectados(prods);
        }

        setTipoVinculo("novo");
        setStep("revisao");
        toast.success("Dados do site, particularidades e produtos capturados com sucesso!");
      }
    } catch (err: any) {
      toast.error(`Falha ao ler site/redes: ${err?.message || "Erro de conexão"}`);
    } finally {
      setEnrichingWeb(false);
      setStatusMsg("");
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
      let base64Pdf: string | undefined;
      const todasImgsExtraidas: any[] = [];

      if (midiaKitFile) {
        // Se for PDF, prepara Base64 para envio multimodal direto à IA
        if (midiaKitFile.name.toLowerCase().endsWith(".pdf")) {
          try {
            base64Pdf = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve("");
              reader.readAsDataURL(midiaKitFile);
            });
          } catch (b64Err) {
            console.warn("Aviso ao ler Base64 do PDF:", b64Err);
          }
        }

        try {
          const proc = await processarArquivoImportacao(midiaKitFile);
          textoPrincipal = proc.textoCompleto;
          dadosPistas = proc.parceiroDetectado || {};
          if (proc.imagensExtraidas && proc.imagensExtraidas.length > 0) {
            todasImgsExtraidas.push(...proc.imagensExtraidas);
          }
        } catch (procErr: any) {
          console.warn("Aviso na decodificação local do Mídia Kit:", procErr);
          textoPrincipal = `Mídia Kit: ${midiaKitFile.name}`;
        }
      }

      let textoSecundario = "";
      if (tabelaPrecosFile) {
        try {
          const procSec = await processarArquivoImportacao(tabelaPrecosFile);
          textoSecundario = procSec.textoCompleto;
          if (!dadosPistas.cnpj && procSec.parceiroDetectado?.cnpj) {
            dadosPistas.cnpj = procSec.parceiroDetectado.cnpj;
          }
          if (procSec.imagensExtraidas && procSec.imagensExtraidas.length > 0) {
            todasImgsExtraidas.push(...procSec.imagensExtraidas);
          }
        } catch (procSecErr: any) {
          console.warn("Aviso na tabela de preços:", procSecErr);
        }
      }

      const textoFinal = textoPrincipal || textoSecundario || "Mídia Kit Comercial";

      setStatusMsg("Mídia.OS IA identificando parceiro, produtos, programas, fotos e preços...");
      const targetParc = parceiros.find((p) => p.id === (parceiroId || parceiroInicialId));

      const res = await extrairFn({
        data: {
          texto: textoFinal,
          tabelaPrecosTexto: textoSecundario || undefined,
          parceiroNome: targetParc?.nome_fantasia || targetParc?.razao_social || dadosPistas.nome || undefined,
          conteudoBase64: base64Pdf || undefined,
          nomeArquivo: midiaKitFile?.name || tabelaPrecosFile?.name || undefined,
          imagensExtraidas: todasImgsExtraidas.length > 0 ? todasImgsExtraidas : undefined,
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

      if (data.imagensExtraidas) {
        setTodasImagensExtraidas(data.imagensExtraidas);
      }
      if (data.fotosPendentes) {
        setFotosPendentes(data.fotosPendentes);
      }

      // Distribui fotos já enviadas entre os produtos se houver
      const prodsWithFotos = (data.produtos || []).map((p: any, idx: number) => {
        let fotos = Array.isArray(p.fotos) && p.fotos.length > 0 ? p.fotos : [];
        if (fotos.length === 0 && fotosUrls[idx]) {
          fotos = [fotosUrls[idx]];
        }
        return {
          ...p,
          fotos,
          selecionado: true,
        };
      });

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
    mutationFn: async (params?: { apenasValidos?: boolean }) => {
      const selecionados = produtosDetectados.filter((p) => p.selecionado);
      let alvos = selecionados;
      if (params?.apenasValidos) {
        alvos = selecionados.filter((p) => Boolean(p.nome && p.nome.trim().length > 0 && Number(p.valor_unit) > 0));
      }
      if (!alvos.length) {
        throw new Error("Selecione ao menos um produto válido para cadastrar.");
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
          produtos: alvos.map((p) => ({
            id: p.id || null,
            nome: p.nome,
            midia: p.midia,
            canal_macro: p.canal_macro || (["DOOH", "OOH", "Radio", "TV"].includes(p.midia) ? "OFF" : "ON"),
            plataforma_rede: p.plataforma_rede || null,
            tipo: p.tipo || null,
            categoria_midia: p.categoria_midia || null,
            tipo_cobranca: p.tipo_cobranca || null,
            programa: p.programa || null,
            faixa: p.faixa || null,
            duracao_segundos: p.duracao_segundos || 30,
            insercoes_padrao: p.insercoes_padrao || 1,
            valor_unit: Number(p.valor_unit) || 0,
            formato: p.formato || p.tipo || null,
            detalhes_venda: p.detalhes_venda || null,
            cidade: p.cidade || null,
            estado: p.estado || null,
            endereco: p.endereco || null,
            bairro: p.bairro || null,
            regiao_administrativa: p.regiao_administrativa || null,
            status_operacional: p.status_operacional || null,
            precisao_geo: p.precisao_geo || null,
            status_validacao: p.status_validacao || null,
            valores_originais: p.valores_originais || null,
            origem: p.origem || null,
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
        `Sucesso! ${res.cadastrados} cadastrado(s) e ${res.atualizados || 0} atualizado(s) para ${res.parceiroNome || "o inventário"}!`,
      );
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["produtos-planejamento"] });
      qc.invalidateQueries({ queryKey: ["parceiros"] });
      qc.invalidateQueries({ queryKey: ["painel-centralizadores"] });
      setModalResumoValidacaoOpen(false);
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
    setHistoricoUndo([]);
    setFiltroAtivo("todos");
    setBusca("");
    setPaginaAtual(1);
    setStatusMsg("");
    setProdGeoModal(null);
    setMostrarEditarParceiro(false);
    setModalResumoValidacaoOpen(false);
    setModalEdicaoLoteOpen(false);
    setModalPlanilhaPreviewOpen(false);
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

  // Abertura do modal de validação pré-cadastro com verificação de duplicidades
  async function handleIniciarConfirmacaoCadastro() {
    const selecionados = produtosDetectados.filter((p) => p.selecionado);
    if (!selecionados.length) {
      toast.warning("Selecione ao menos um produto para cadastrar.");
      return;
    }

    if (tipoVinculo === "novo") {
      if (!parceiroForm.razao_social.trim()) {
        toast.error("Informe a Razão Social ou Nome do Parceiro antes de prosseguir.");
        return;
      }
      if (!parceiroForm.semCnpj) {
        const digits = onlyDigits(parceiroForm.cnpj);
        if (digits.length !== 14) {
          toast.error("Informe um CNPJ válido com 14 dígitos ou marque 'Parceiro sem CNPJ'.");
          return;
        }
      }
    } else if (tipoVinculo === "existente" && !parceiroId) {
      toast.error("Selecione um parceiro cadastrado.");
      return;
    }

    setVerificandoDuplicidades(true);
    try {
      const res = await verificarDuplicidadesFn({
        data: {
          parceiroId: tipoVinculo === "existente" ? parceiroId : null,
          nomes: selecionados.map((p) => p.nome),
        },
      });
      setDuplicidadesEncontradas(res.duplicidades || []);
    } catch (errCheck) {
      console.warn("Aviso ao verificar duplicidades:", errCheck);
      setDuplicidadesEncontradas([]);
    } finally {
      setVerificandoDuplicidades(false);
      setModalResumoValidacaoOpen(true);
    }
  }

  // Contadores para os filtros rápidos
  const contadoresFiltros = useMemo(() => {
    return {
      todos: produtosDetectados.length,
      incompletos: produtosDetectados.filter(
        (p) => !p.nome?.trim() || !p.valor_unit || Number(p.valor_unit) <= 0 || !p.cidade,
      ).length,
      sem_preco: produtosDetectados.filter((p) => !p.valor_unit || Number(p.valor_unit) <= 0).length,
      sem_localizacao: produtosDetectados.filter(
        (p) => !p.cidade && !p.endereco && !p.ponto_referencia,
      ).length,
      sem_foto: produtosDetectados.filter((p) => !p.fotos || p.fotos.length === 0).length,
      pendentes_revisao: produtosDetectados.filter((p) => p.status_validacao === "pendente_revisao").length,
      erros_validacao: produtosDetectados.filter((p) => !p.nome || p.nome.trim().length === 0).length,
    };
  }, [produtosDetectados]);

  // Produtos filtrados por chip de status e busca textual
  const produtosFiltrados = useMemo(() => {
    return produtosDetectados.filter((p) => {
      if (filtroAtivo === "apenas_selecionados" && !p.selecionado) return false;
      if (filtroAtivo === "incompletos") {
        const isIncompleto = !p.nome?.trim() || !p.valor_unit || Number(p.valor_unit) <= 0 || !p.cidade;
        if (!isIncompleto) return false;
      }
      if (filtroAtivo === "sem_preco" && Number(p.valor_unit) > 0) return false;
      if (filtroAtivo === "sem_localizacao" && (p.cidade || p.endereco || p.ponto_referencia)) return false;
      if (filtroAtivo === "sem_foto" && p.fotos && p.fotos.length > 0) return false;
      if (filtroAtivo === "pendentes_revisao" && p.status_validacao !== "pendente_revisao") return false;
      if (filtroAtivo === "erros_validacao" && Boolean(p.nome && p.nome.trim().length > 0)) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const nomeMatch = p.nome.toLowerCase().includes(termo);
        const cidadeMatch = (p.cidade || "").toLowerCase().includes(termo);
        const endMatch = (p.endereco || "").toLowerCase().includes(termo);
        const refMatch = (p.ponto_referencia || "").toLowerCase().includes(termo);
        const midiaMatch = p.midia.toLowerCase().includes(termo);
        const tipoMatch = (p.tipo || "").toLowerCase().includes(termo);
        const bairroMatch = (p.bairro || "").toLowerCase().includes(termo);
        const regiaoMatch = (p.regiao_administrativa || "").toLowerCase().includes(termo);
        const slideMatch = String(p.origem?.pagina_ou_slide || "").includes(termo);

        if (
          !nomeMatch &&
          !cidadeMatch &&
          !endMatch &&
          !refMatch &&
          !midiaMatch &&
          !tipoMatch &&
          !bairroMatch &&
          !regiaoMatch &&
          !slideMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [produtosDetectados, filtroAtivo, busca]);

  // Paginação inteligente para performance com catálogos de centenas de produtos
  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina) || 1;
  const produtosExibidos = useMemo(() => {
    if (itensPorPagina >= 9999) return produtosFiltrados;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return produtosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [produtosFiltrados, paginaAtual, itensPorPagina]);

  function handleSelecionarTodos() {
    setProdutosDetectados((prev) => prev.map((p) => ({ ...p, selecionado: true })));
  }

  function handleSelecionarNenhum() {
    setProdutosDetectados((prev) => prev.map((p) => ({ ...p, selecionado: false })));
  }

  function handleSelecionarFiltrados() {
    const idsFiltrados = new Set(produtosFiltrados.map((p) => p.id_temp));
    setProdutosDetectados((prev) =>
      prev.map((p) => (idsFiltrados.has(p.id_temp) ? { ...p, selecionado: true } : p)),
    );
  }

  function handleUpdateProduto(id_temp: string, field: keyof ProdutoExtraidoMidiaKit, value: any) {
    setProdutosDetectados((prev) =>
      prev.map((p) => {
        if (p.id_temp !== id_temp) return p;
        const originalVal = p.valores_originais?.[field];
        const isDiferente = originalVal !== undefined && originalVal !== value;
        const atualizado = {
          ...p,
          [field]: value,
          editado_manualmente: p.editado_manualmente || isDiferente,
        };

        // Se alterou coordenadas manualmente, ajusta precisao
        if (field === "latitude" || field === "longitude") {
          if (atualizado.latitude != null && atualizado.longitude != null) {
            atualizado.precisao_geo = "exata";
          } else if (atualizado.cidade) {
            atualizado.precisao_geo = "cidade_uf";
          }
        }

        return atualizado;
      }),
    );
  }

  function handleRestaurarOriginal(id_temp: string) {
    setProdutosDetectados((prev) =>
      prev.map((p) => {
        if (p.id_temp !== id_temp || !p.valores_originais) return p;
        return {
          ...p,
          ...p.valores_originais,
          editado_manualmente: false,
        };
      }),
    );
    toast.success("Valores originais extraídos restaurados!");
  }

  function handleRemoverProduto(id_temp: string) {
    setHistoricoUndo((prev) => [...prev, produtosDetectados.map((p) => ({ ...p }))]);
    setProdutosDetectados((prev) => prev.filter((p) => p.id_temp !== id_temp));
  }

  function handleAdicionarProdutoManual() {
    const novoProduto: ProdutoExtraidoMidiaKit = {
      id_temp: `temp-${Date.now()}`,
      nome: `Novo Produto ${produtosDetectados.length + 1}`,
      midia: "DOOH",
      canal_macro: "OFF",
      tipo: "Inserção Comercial",
      tipo_cobranca: "insercao",
      duracao_segundos: 10,
      insercoes_padrao: 1,
      valor_unit: 1000,
      cidade: parceiroForm.cidade || "Brasília",
      estado: parceiroForm.uf || "DF",
      selecionado: true,
      status_validacao: "aprovado",
      precisao_geo: "cidade_uf",
      situacao_foto: "pendente",
      origem_foto: "pendente",
      fotos: [],
      editado_manualmente: true,
    };
    setProdutosDetectados((prev) => [...prev, novoProduto]);
  }

  // APLICAÇÃO DE EDIÇÃO EM LOTE / PADRÕES
  function handleAplicarEdicaoLote(dados: DadosEdicaoLote) {
    const selecionados = produtosDetectados.filter((p) => p.selecionado);
    if (!selecionados.length) return;

    // Guarda snapshot para histórico de Undo
    setHistoricoUndo((prev) => [...prev, produtosDetectados.map((p) => ({ ...p }))]);

    setProdutosDetectados((prev) =>
      prev.map((item) => {
        if (!item.selecionado) return item;

        const atualizado = { ...item };
        const somenteVazios = dados.somente_campos_vazios;

        if (dados.aplicar_midia) {
          if (!somenteVazios || !atualizado.midia) {
            atualizado.midia = dados.midia;
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_categoria_midia) {
          if (!somenteVazios || !atualizado.categoria_midia) {
            atualizado.categoria_midia = dados.categoria_midia;
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_tipo) {
          if (!somenteVazios || !atualizado.tipo) {
            atualizado.tipo = dados.tipo;
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_tipo_cobranca) {
          if (!somenteVazios || !atualizado.tipo_cobranca) {
            atualizado.tipo_cobranca = dados.tipo_cobranca;
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_cidade_uf) {
          if (!somenteVazios || (!atualizado.cidade && !atualizado.estado)) {
            atualizado.cidade = dados.cidade || atualizado.cidade;
            atualizado.estado = dados.estado || atualizado.estado;
            if (atualizado.precisao_geo !== "exata") {
              atualizado.precisao_geo = "cidade_uf";
            }
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_regiao_bairro) {
          if (!somenteVazios || (!atualizado.regiao_administrativa && !atualizado.bairro)) {
            atualizado.regiao_administrativa = dados.regiao_administrativa || atualizado.regiao_administrativa;
            atualizado.bairro = dados.bairro || atualizado.bairro;
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_duracao_insercoes) {
          if (!somenteVazios || !atualizado.duracao_segundos) {
            atualizado.duracao_segundos = dados.duracao_segundos;
            atualizado.insercoes_padrao = dados.insercoes_padrao;
            atualizado.editado_manualmente = true;
          }
        }

        if (dados.aplicar_status_validacao) {
          atualizado.status_validacao = dados.status_validacao;
          atualizado.editado_manualmente = true;
        }

        if (dados.aplicar_status_operacional) {
          atualizado.status_operacional = dados.status_operacional;
          atualizado.editado_manualmente = true;
        }

        if (dados.aplicar_canal_macro) {
          atualizado.canal_macro = dados.canal_macro;
          atualizado.editado_manualmente = true;
        }

        // Preço bruto: somente quando optado explicitamente
        if (dados.substituir_preco_bruto) {
          atualizado.valor_unit = Number(dados.valor_unit) || 0;
          atualizado.editado_manualmente = true;
        }

        return atualizado;
      }),
    );

    toast.success(`Alterações aplicadas a ${selecionados.length} produto(s) selecionado(s)!`);
  }

  // DESFAZER ÚLTIMA EDIÇÃO EM LOTE (UNDO)
  function handleDesfazerLote() {
    if (historicoUndo.length === 0) return;
    const snapshotAnterior = historicoUndo[historicoUndo.length - 1];
    setHistoricoUndo((prev) => prev.slice(0, prev.length - 1));
    setProdutosDetectados(snapshotAnterior);
    toast.success("Última edição em lote desfeita com sucesso!");
  }

  // GEOLOCALIZAÇÃO EM LOTE DOS SELECIONADOS
  async function handleGeocodificarSelecionados() {
    const selecionados = produtosDetectados.filter((p) => p.selecionado);
    if (!selecionados.length) {
      toast.warning("Selecione ao menos um produto para geocodificar.");
      return;
    }

    const paraGeocodificar = selecionados.filter((p) => {
      const q = p.ponto_referencia || p.endereco || p.faixa || p.nome;
      return Boolean(q && q.trim().length >= 4);
    });

    if (!paraGeocodificar.length) {
      toast.warning("Nenhum dos produtos selecionados possui endereço ou referência textual para geocodificação.");
      return;
    }

    setHistoricoUndo((prev) => [...prev, produtosDetectados.map((p) => ({ ...p }))]);
    setGeocodificandoLote(true);

    let sucessos = 0;
    let mantidosPraca = 0;

    try {
      for (const prod of paraGeocodificar) {
        const partes = [prod.ponto_referencia || prod.endereco || prod.nome];
        if (prod.bairro) partes.push(prod.bairro);
        if (prod.cidade) partes.push(prod.cidade);
        if (prod.estado) partes.push(prod.estado);
        const query = partes.filter(Boolean).join(", ");

        try {
          const res = await geocodeAddressFn({ data: { address: query } });
          if (res.ok && res.latitude != null && res.longitude != null) {
            const link = `https://www.google.com/maps?q=${res.latitude},${res.longitude}`;
            setProdutosDetectados((prev) =>
              prev.map((item) =>
                item.id_temp === prod.id_temp
                  ? {
                      ...item,
                      latitude: res.latitude,
                      longitude: res.longitude,
                      link_maps: link,
                      precisao_geo: "exata",
                      ponto_referencia: item.ponto_referencia || res.endereco || item.ponto_referencia,
                      editado_manualmente: true,
                    }
                  : item,
              ),
            );
            sucessos++;
          } else {
            mantidosPraca++;
            if (prod.cidade && prod.estado) {
              setProdutosDetectados((prev) =>
                prev.map((item) =>
                  item.id_temp === prod.id_temp ? { ...item, precisao_geo: "cidade_uf" } : item,
                ),
              );
            }
          }
        } catch {
          mantidosPraca++;
        }
      }

      if (sucessos > 0) {
        toast.success(`${sucessos} produto(s) geocodificado(s) com precisão exata!`);
      }
      if (mantidosPraca > 0) {
        toast.info(
          `${mantidosPraca} produto(s) mantidos na precisão de praça (cidade/UF) por falta de endereço exato.`,
        );
      }
    } finally {
      setGeocodificandoLote(false);
    }
  }

  // EXPORTAÇÃO E IMPORTAÇÃO DE PLANILHA CORRIGIDA
  function handleExportarExcel(formato: "xlsx" | "csv") {
    exportarProdutosMidiaKitExcel(produtosDetectados, nomeExibicaoParceiro, formato);
    toast.success(`Planilha de produtos exportada em formato .${formato}!`);
  }

  async function handleImportarPlanilhaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPlanilhaArquivoNome(file.name);
      const res = await parsePlanilhaCorrigidaMidiaKit(file, produtosDetectados);
      setResultadoPlanilha(res);
      setModalPlanilhaPreviewOpen(true);
    } catch (err: any) {
      toast.error(`Erro ao ler planilha: ${err.message || "Formato inválido"}`);
    } finally {
      if (planilhaInputRef.current) {
        planilhaInputRef.current.value = "";
      }
    }
  }

  function handleConfirmarPlanilhaCorrigida() {
    if (!resultadoPlanilha) return;
    setHistoricoUndo((prev) => [...prev, produtosDetectados.map((p) => ({ ...p }))]);
    setProdutosDetectados(resultadoPlanilha.produtosAtualizados);
    setModalPlanilhaPreviewOpen(false);
    toast.success(
      `${resultadoPlanilha.alteracoes.length} produto(s) atualizado(s) com as correções da planilha!`,
    );
  }

  // ASSOCIAÇÃO E UPLOAD DE FOTOGRAFIAS REAIS
  async function handleAdicionarFotoManual(file: File, prodIdTemp?: string) {
    const res = await uploadProdutoFoto(file);
    if (!res?.url) throw new Error("Falha no upload da foto");

    const novaImg: ImagemExtraidaMidiaKit = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nomeArquivo: file.name,
      dataUrl: res.url,
      tipoMime: file.type || "image/jpeg",
      tamanhoBytes: file.size || 0,
      slideOuPagina: null,
      contextoTexto: "Foto real autorizada adicionada manualmente pelo usuário",
      produtoIdAssociado: prodIdTemp || null,
    };
    setTodasImagensExtraidas((prev) => [novaImg, ...prev]);

    if (prodIdTemp) {
      setProdutosDetectados((prev) =>
        prev.map((p) =>
          p.id_temp === prodIdTemp
            ? {
                ...p,
                fotos: Array.from(new Set([...(p.fotos || []), res.url])),
                situacao_foto: "real_associada",
                origem_foto: "upload_manual",
                editado_manualmente: true,
              }
            : p,
        ),
      );
    }
  }

  function handleAssociarFotoAProduto(
    prodIdTemp: string,
    fotoUrl: string,
    origem: "documento" | "upload_manual",
  ) {
    setProdutosDetectados((prev) =>
      prev.map((p) =>
        p.id_temp === prodIdTemp
          ? {
              ...p,
              fotos: Array.from(new Set([...(p.fotos || []), fotoUrl])),
              situacao_foto: "real_associada",
              origem_foto: origem,
              editado_manualmente: true,
            }
          : p,
      ),
    );
  }

  function handleDesassociarFotoDeProduto(prodIdTemp: string, fotoUrl: string) {
    setProdutosDetectados((prev) =>
      prev.map((p) => {
        if (p.id_temp !== prodIdTemp) return p;
        const novasFotos = (p.fotos || []).filter((f) => f !== fotoUrl);
        return {
          ...p,
          fotos: novasFotos,
          situacao_foto: novasFotos.length > 0 ? "real_associada" : "pendente",
          origem_foto: novasFotos.length > 0 ? p.origem_foto : "pendente",
          editado_manualmente: true,
        };
      }),
    );
  }

  // Geocodificação individual por clique no item da tabela
  async function handleBuscarCoordenadas(prod: ProdutoExtraidoMidiaKit) {
    const query = prod.ponto_referencia || prod.endereco || prod.faixa || prod.nome;
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
        handleUpdateProduto(prod.id_temp, "precisao_geo", "exata");
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
                    Suporta <strong>PDF</strong>, <strong>PowerPoint</strong> (.pptx), <strong>Word</strong> (.docx), <strong>Excel/CSV</strong> (.xlsx, .csv) e <strong>Fotos</strong> (.jpg, .png, .webp).
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.pptx,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt"
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
                    Envie caso a tabela de valores venha em um Excel, PDF ou documento separado.
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,.docx,.txt"
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

              {/* Leitura e Enriquecimento Automático por Site ou Redes Sociais */}
              <div className="p-3.5 border rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-purple-900 dark:text-purple-200">
                    <Globe className="size-3.5 text-purple-600" />
                    Ou capture direto pelo Site Oficial ou Instagram do Parceiro
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-100/50">
                    IA Conectada
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Se o parceiro possui site ou perfil no Instagram com fotos e formatos, informe o link para a IA extrair dados cadastrais, particularidades técnicas e produtos automaticamente:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Site (ex: https://tvcars.com.br)"
                      value={siteUrlInput}
                      onChange={(e) => setSiteUrlInput(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      placeholder="Instagram (ex: @tvcars)"
                      value={instagramInput}
                      onChange={(e) => setInstagramInput(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={enrichingWeb || (!siteUrlInput && !instagramInput)}
                      onClick={handleCapturarSiteRedes}
                      className="h-8 w-full text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    >
                      {enrichingWeb ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      Rastrear
                    </Button>
                  </div>
                </div>
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

              {/* PARTICULARIDADES COMERCIAIS IDENTIFICADAS PELA IA */}
              {particularidadesDetectadas.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60">
                  <span className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1 text-[11px] shrink-0">
                    <Sparkles className="size-3.5 text-purple-600" />
                    Particularidades e Diferenciais de Mídia:
                  </span>
                  {particularidadesDetectadas.map((part, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-[10px] bg-white dark:bg-purple-900/50 text-purple-900 dark:text-purple-200 border border-purple-200/60"
                    >
                      {part}
                    </Badge>
                  ))}
                </div>
              )}

              {/* BARRA DE AÇÕES EM LOTE, FILTROS E BUSCA */}
              <input
                ref={planilhaInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportarPlanilhaFile}
              />

              <LoteAcoesBar
                totalProdutos={produtosDetectados.length}
                totalSelecionados={totalSelecionados}
                totalFiltrados={produtosFiltrados.length}
                filtroAtivo={filtroAtivo}
                onMudarFiltro={(f) => {
                  setFiltroAtivo(f);
                  setPaginaAtual(1);
                }}
                busca={busca}
                onBuscaChange={(b) => {
                  setBusca(b);
                  setPaginaAtual(1);
                }}
                onSelecionarTodos={handleSelecionarTodos}
                onSelecionarNenhum={handleSelecionarNenhum}
                onSelecionarFiltrados={handleSelecionarFiltrados}
                onAbrirEdicaoLote={() => {
                  setModoEdicaoLote("edicao_lote");
                  setModalEdicaoLoteOpen(true);
                }}
                onAbrirAplicarPadrao={() => {
                  setModoEdicaoLote("aplicar_padrao");
                  setModalEdicaoLoteOpen(true);
                }}
                onDesfazerLote={handleDesfazerLote}
                podeDesfazer={historicoUndo.length > 0}
                totalUndoDisponivel={historicoUndo.length}
                onGeocodificarSelecionados={handleGeocodificarSelecionados}
                geocodificandoLote={geocodificandoLote}
                onExportarExcel={handleExportarExcel}
                onImportarPlanilhaClick={() => planilhaInputRef.current?.click()}
                totalFotosPendentes={
                  produtosDetectados.filter((p) => !p.fotos || p.fotos.length === 0).length
                }
                onToggleGaleriaFotos={() => setMostrarGaleriaFotos(!mostrarGaleriaFotos)}
                mostrarGaleriaFotos={mostrarGaleriaFotos}
                contadoresFiltros={contadoresFiltros}
              />

              {/* GALERIA DE FOTOS DO MÍDIA KIT */}
              {mostrarGaleriaFotos && todasImagensExtraidas.length > 0 && (
                <GaleriaFotosMidiaKit
                  imagensExtraidas={todasImagensExtraidas}
                  produtos={produtosDetectados}
                  onAssociarFotoAProduto={handleAssociarFotoAProduto}
                  onDesassociarFotoDeProduto={handleDesassociarFotoDeProduto}
                  onAdicionarFotoManual={handleAdicionarFotoManual}
                />
              )}

              {/* GRADE DE PRODUTOS — EDIÇÃO DIRETA EM TABELA */}
              <div className="flex-1 overflow-auto border rounded-xl min-h-[280px] bg-background">
                <Table>
                  <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur text-[11px]">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            produtosFiltrados.length > 0 &&
                            produtosFiltrados.every((p) => p.selecionado)
                          }
                          onCheckedChange={(c) => {
                            const ids = new Set(produtosFiltrados.map((p) => p.id_temp));
                            setProdutosDetectados((prev) =>
                              prev.map((p) => (ids.has(p.id_temp) ? { ...p, selecionado: Boolean(c) } : p)),
                            );
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-16">Foto Real</TableHead>
                      <TableHead className="min-w-[220px]">Produto / Origem</TableHead>
                      <TableHead className="w-32">Mídia & Categoria</TableHead>
                      <TableHead className="w-32">Formato / Tipo</TableHead>
                      <TableHead className="w-28 text-right">Tabela Unit. (R$)</TableHead>
                      <TableHead className="w-32">Cobrança & Inserções</TableHead>
                      <TableHead className="w-48">Cidade, UF & Bairro</TableHead>
                      <TableHead className="w-52">Endereço & Referência</TableHead>
                      <TableHead className="w-40">Geolocalização</TableHead>
                      <TableHead className="w-28">Status Revisão</TableHead>
                      <TableHead className="w-12 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosExibidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                          Nenhum produto encontrado com os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      produtosExibidos.map((prod) => {
                        const isIncompleto =
                          !prod.nome?.trim() || !prod.valor_unit || Number(prod.valor_unit) <= 0 || !prod.cidade;
                        const temFoto = prod.fotos && prod.fotos.length > 0;
                        const precoDiferente =
                          prod.valores_originais?.valor_unit !== undefined &&
                          Number(prod.valores_originais.valor_unit) !== Number(prod.valor_unit);

                        return (
                          <TableRow
                            key={prod.id_temp}
                            className={`text-xs transition-colors ${
                              !prod.selecionado ? "opacity-50 bg-muted/10" : ""
                            } ${isIncompleto ? "bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
                          >
                            {/* 1. Seleção */}
                            <TableCell className="align-top py-2.5">
                              <Checkbox
                                checked={prod.selecionado}
                                onCheckedChange={(c) =>
                                  handleUpdateProduto(prod.id_temp, "selecionado", Boolean(c))
                                }
                              />
                            </TableCell>

                            {/* 2. Foto Real */}
                            <TableCell className="align-top py-2.5">
                              <div className="space-y-1">
                                {temFoto ? (
                                  <div className="relative group/foto inline-block">
                                    <img
                                      src={prod.fotos![0]}
                                      alt={prod.nome}
                                      className="w-12 h-12 object-cover rounded-md border shadow-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateProduto(prod.id_temp, "fotos", [])}
                                      className="absolute -top-1 -right-1 bg-destructive text-white rounded-full size-4 flex items-center justify-center opacity-0 group-hover/foto:opacity-100 transition-opacity text-[10px]"
                                      title="Remover foto do ponto"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : todasImagensExtraidas.length > 0 ? (
                                  <Select
                                    value=""
                                    onValueChange={(url) =>
                                      handleAssociarFotoAProduto(prod.id_temp, url, "documento")
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-14 p-0 flex justify-center text-[10px] bg-muted/40">
                                      <ImageIcon className="h-4 w-4 text-primary" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {todasImagensExtraidas.map((img, idx) => (
                                        <SelectItem key={img.id || idx} value={img.dataUrl} className="text-xs">
                                          {img.slideOuPagina ? `Slide ${img.slideOuPagina}` : `Foto #${idx + 1}`} ({img.nomeArquivo})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleAdicionarFotoManual(file, prod.id_temp);
                                      }}
                                    />
                                    <div
                                      className="w-11 h-11 rounded-md border border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors text-[9px]"
                                      title="Carregar foto real autorizada deste ponto"
                                    >
                                      <ImageIcon className="h-4 w-4 opacity-50" />
                                      <span>+ Foto</span>
                                    </div>
                                  </label>
                                )}
                              </div>
                            </TableCell>

                            {/* 3. Produto & Origem */}
                            <TableCell className="align-top py-2.5">
                              <div className="space-y-1">
                                <Input
                                  value={prod.nome}
                                  onChange={(e) =>
                                    handleUpdateProduto(prod.id_temp, "nome", e.target.value)
                                  }
                                  className="h-8 text-xs font-semibold"
                                  placeholder="Nome do produto ou ponto comercial"
                                />
                                <div className="flex flex-wrap items-center gap-1">
                                  {prod.editado_manualmente ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] py-0 px-1 bg-blue-50/70 text-blue-700 dark:text-blue-300 border-blue-300"
                                      title={
                                        prod.valores_originais?.nome
                                          ? `Original: ${prod.valores_originais.nome}`
                                          : "Modificado manualmente"
                                      }
                                    >
                                      Editado
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] py-0 px-1 text-muted-foreground border-border/60"
                                    >
                                      Original
                                    </Badge>
                                  )}

                                  {prod.origem?.pagina_ou_slide && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      Slide/Pág. {prod.origem.pagina_ou_slide}
                                    </span>
                                  )}

                                  <Badge variant="secondary" className="text-[9px] py-0 px-1 text-muted-foreground">
                                    {nomeExibicaoParceiro}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>

                            {/* 4. Mídia & Categoria */}
                            <TableCell className="align-top py-2.5">
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
                                    <SelectItem value="OOH">OOH</SelectItem>
                                    <SelectItem value="TV">TV</SelectItem>
                                    <SelectItem value="Radio">Rádio</SelectItem>
                                    <SelectItem value="Digital">Digital</SelectItem>
                                    <SelectItem value="Impresso">Impresso</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={prod.categoria_midia || ""}
                                  onChange={(e) =>
                                    handleUpdateProduto(prod.id_temp, "categoria_midia", e.target.value)
                                  }
                                  className="h-6 text-[10px]"
                                  placeholder="Categoria (ex: ooh_dooh)"
                                />
                              </div>
                            </TableCell>

                            {/* 5. Formato / Tipo */}
                            <TableCell className="align-top py-2.5">
                              <Input
                                value={prod.tipo || ""}
                                onChange={(e) => handleUpdateProduto(prod.id_temp, "tipo", e.target.value)}
                                className="h-7 text-[11px]"
                                placeholder="Formato / Tipo"
                              />
                            </TableCell>

                            {/* 6. Preço Bruto / Tabela Unit (R$) */}
                            <TableCell className="align-top py-2.5 text-right">
                              <div className="space-y-0.5">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={prod.valor_unit}
                                  onChange={(e) =>
                                    handleUpdateProduto(prod.id_temp, "valor_unit", Number(e.target.value))
                                  }
                                  className={`h-7 text-xs text-right font-semibold ${
                                    Number(prod.valor_unit) > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-destructive border-destructive"
                                  }`}
                                />
                                {precoDiferente && (
                                  <span className="text-[10px] text-muted-foreground block line-through">
                                    Orig: R$ {Number(prod.valores_originais?.valor_unit || 0).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* 7. Cobrança & Inserções */}
                            <TableCell className="align-top py-2.5">
                              <div className="space-y-1">
                                <Select
                                  value={prod.tipo_cobranca || "insercao"}
                                  onValueChange={(v) => handleUpdateProduto(prod.id_temp, "tipo_cobranca", v)}
                                >
                                  <SelectTrigger className="h-6 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="insercao">Inserção</SelectItem>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                    <SelectItem value="diaria">Diária</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="quinzenal">Bi-semana</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    value={prod.duracao_segundos || 30}
                                    onChange={(e) =>
                                      handleUpdateProduto(prod.id_temp, "duracao_segundos", Number(e.target.value))
                                    }
                                    className="h-6 text-[10px] w-1/2"
                                    title="Duração em segundos"
                                  />
                                  <Input
                                    type="number"
                                    value={prod.insercoes_padrao || 1}
                                    onChange={(e) =>
                                      handleUpdateProduto(prod.id_temp, "insercoes_padrao", Number(e.target.value))
                                    }
                                    className="h-6 text-[10px] w-1/2"
                                    title="Inserções padrão"
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* 8. Cidade, UF & Bairro */}
                            <TableCell className="align-top py-2.5">
                              <div className="space-y-1">
                                <div className="flex gap-1">
                                  <Input
                                    value={prod.cidade || ""}
                                    onChange={(e) =>
                                      handleUpdateProduto(prod.id_temp, "cidade", e.target.value)
                                    }
                                    placeholder="Cidade"
                                    className="h-6 text-[10px] flex-1"
                                  />
                                  <Input
                                    value={prod.estado || ""}
                                    onChange={(e) =>
                                      handleUpdateProduto(prod.id_temp, "estado", e.target.value.toUpperCase())
                                    }
                                    placeholder="UF"
                                    maxLength={2}
                                    className="h-6 text-[10px] w-12 font-mono uppercase"
                                  />
                                </div>
                                <Input
                                  value={prod.bairro || prod.regiao_administrativa || ""}
                                  onChange={(e) =>
                                    handleUpdateProduto(prod.id_temp, "bairro", e.target.value)
                                  }
                                  placeholder="Bairro / Região"
                                  className="h-6 text-[10px]"
                                />
                              </div>
                            </TableCell>

                            {/* 9. Endereço & Referência */}
                            <TableCell className="align-top py-2.5">
                              <Input
                                value={prod.endereco || prod.ponto_referencia || ""}
                                onChange={(e) => {
                                  handleUpdateProduto(prod.id_temp, "endereco", e.target.value);
                                  handleUpdateProduto(prod.id_temp, "ponto_referencia", e.target.value);
                                }}
                                placeholder="Endereço / Referência"
                                className="h-7 text-[11px]"
                              />
                            </TableCell>

                            {/* 10. Geolocalização */}
                            <TableCell className="align-top py-2.5">
                              <div className="space-y-1">
                                {prod.latitude != null && prod.longitude != null ? (
                                  <div className="space-y-0.5">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-mono gap-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 py-0"
                                    >
                                      <MapPin className="size-2.5 text-emerald-600" />
                                      {prod.latitude.toFixed(3)}, {prod.longitude.toFixed(3)}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <a
                                        href={
                                          prod.link_maps ||
                                          `https://www.google.com/maps?q=${prod.latitude},${prod.longitude}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                                      >
                                        <ExternalLink className="size-2.5" /> Maps
                                      </a>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={() => openGeoModal(prod)}
                                        className="text-muted-foreground hover:text-foreground underline"
                                      >
                                        Ajustar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {prod.cidade && prod.estado ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] text-sky-700 bg-sky-50 dark:bg-sky-950/20 border-sky-300 py-0"
                                      >
                                        Praça {prod.cidade}/{prod.estado}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-300 py-0"
                                      >
                                        Pendente
                                      </Badge>
                                    )}

                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-5 text-[9px] px-1 gap-0.5 border-primary/30 text-primary"
                                        disabled={geocodingId === prod.id_temp}
                                        onClick={() => handleBuscarCoordenadas(prod)}
                                      >
                                        {geocodingId === prod.id_temp ? (
                                          <Loader2 className="size-2 animate-spin" />
                                        ) : (
                                          <MapPin className="size-2" />
                                        )}
                                        Geolocalizar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-[9px] px-1 text-muted-foreground"
                                        onClick={() => openGeoModal(prod)}
                                      >
                                        Link
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* 11. Status Revisão */}
                            <TableCell className="align-top py-2.5">
                              <Select
                                value={prod.status_validacao || "extraido"}
                                onValueChange={(v: any) =>
                                  handleUpdateProduto(prod.id_temp, "status_validacao", v)
                                }
                              >
                                <SelectTrigger className="h-6 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="aprovado">Aprovado</SelectItem>
                                  <SelectItem value="pendente_revisao">Pendente</SelectItem>
                                  <SelectItem value="incompleto">Incompleto</SelectItem>
                                  <SelectItem value="extraido">Extraído</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* 12. Ações */}
                            <TableCell className="align-top py-2.5 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                {prod.editado_manualmente && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => handleRestaurarOriginal(prod.id_temp)}
                                    title="Restaurar valores originais extraídos do mídia kit"
                                  >
                                    ↺
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoverProduto(prod.id_temp)}
                                  title="Remover produto da importação"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* BARRA DE PAGINAÇÃO RESPONSIVA */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-xs border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>
                    Exibindo {produtosExibidos.length} de {produtosFiltrados.length} produto(s) filtrado(s)
                    {totalSelecionados > 0 && ` (${totalSelecionados} selecionados no total)`}
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span>Por página:</span>
                    <Select
                      value={String(itensPorPagina)}
                      onValueChange={(v) => {
                        setItensPorPagina(Number(v));
                        setPaginaAtual(1);
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-18">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="9999">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {totalPaginas > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      disabled={paginaAtual <= 1}
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="text-[11px] font-semibold text-foreground px-1">
                      Página {paginaAtual} de {totalPaginas}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      disabled={paginaAtual >= totalPaginas}
                      onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
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
                    onClick={handleIniciarConfirmacaoCadastro}
                    disabled={
                      salvarMutation.isPending ||
                      verificandoDuplicidades ||
                      totalSelecionados === 0 ||
                      !parceiroPronto
                    }
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    {verificandoDuplicidades ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validando Inventário...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Revisar e Cadastrar {totalSelecionados} Produtos em "{nomeExibicaoParceiro}"
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO EM LOTE E APLICAR PADRÃO */}
      <EdicaoLoteDialog
        open={modalEdicaoLoteOpen}
        onOpenChange={setModalEdicaoLoteOpen}
        produtosSelecionados={produtosDetectados.filter((p) => p.selecionado)}
        modo={modoEdicaoLote}
        onConfirmar={handleAplicarEdicaoLote}
      />

      {/* MODAL DE PRÉVIA DE CORREÇÃO VIA PLANILHA */}
      <PlanilhaPreviewDialog
        open={modalPlanilhaPreviewOpen}
        onOpenChange={setModalPlanilhaPreviewOpen}
        resultado={resultadoPlanilha}
        nomeArquivo={planilhaArquivoNome}
        onConfirmarAplicacao={handleConfirmarPlanilhaCorrigida}
        onReenviarPlanilha={() => planilhaInputRef.current?.click()}
      />

      {/* MODAL DE RESUMO E AUDITORIA PRÉ-CADASTRO */}
      <ResumoValidacaoDialog
        open={modalResumoValidacaoOpen}
        onOpenChange={setModalResumoValidacaoOpen}
        produtos={produtosDetectados}
        nomeParceiro={nomeExibicaoParceiro}
        totalFotosNoKit={todasImagensExtraidas.length}
        totalFotosPendentes={
          todasImagensExtraidas.filter(
            (img) => !produtosDetectados.some((p) => p.fotos && p.fotos.includes(img.dataUrl)),
          ).length
        }
        duplicidadesEncontradas={duplicidadesEncontradas}
        isSaving={salvarMutation.isPending}
        onConfirmarCadastro={(apenasValidos) => salvarMutation.mutate({ apenasValidos })}
      />

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
