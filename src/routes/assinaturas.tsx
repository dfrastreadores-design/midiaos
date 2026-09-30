import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FileSignature,
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Handshake,
  Users,
  FileText,
  Copy,
  Sparkles,
  ShieldAlert,
  Send,
  Printer,
  Upload,
  History,
  ExternalLink,
  MessageSquare,
  Lock,
  Layers,
  Settings,
  XCircle,
  FileCheck,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  listDocumentosAssinatura,
  getDocumentoAssinaturaById,
  upsertDocumentoAssinatura,
  adicionarSignatario,
  removerSignatario,
  solicitarAssinaturaDigital,
  solicitarAssinaturaManual,
  uploadDocumentoManualAssinado,
  conferirDocumentoManual,
  criarNovaVersaoDocumento,
  enviarLembreteAssinatura,
  getConfigAssinaturaTenant,
  updateConfigAssinaturaTenant,
} from "@/lib/assinaturas-universal.functions";
import {
  LABELS_DOCUMENTO_TIPO,
  LABELS_ASSINATURA_STATUS,
  type DocumentoAssinatura,
  type Signatario,
  type DocumentoTipo,
  type AssinaturaStatus,
  type MetodoAssinatura,
  type OrdemAssinatura,
  type TipoParticipante,
} from "@/types/assinaturas.types";
import { gerarHtmlDocumentoImpressao } from "@/lib/signatures/print-template";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { listClientes } from "@/lib/clientes.functions";
import { listParceiros } from "@/lib/parceiros.functions";
import { listPis } from "@/lib/pi.functions";
import { listContratos } from "@/lib/contratos.functions";

export const Route = createFileRoute("/assinaturas")({
  head: () => ({ meta: [{ title: "Centralizador de Assinaturas — Mídia.OS" }] }),
  component: AssinaturasPage,
});

export function AssinaturasPage() {
  const qc = useQueryClient();
  const { nome: empresaNome, logoSrc, cnpj: empresaCnpj } = useTenantBranding();

  // Server functions
  const listDocsFn = useServerFn(listDocumentosAssinatura);
  const upsertDocFn = useServerFn(upsertDocumentoAssinatura);
  const addSigFn = useServerFn(adicionarSignatario);
  const remSigFn = useServerFn(removerSignatario);
  const enviarDigitalFn = useServerFn(solicitarAssinaturaDigital);
  const enviarManualFn = useServerFn(solicitarAssinaturaManual);
  const uploadManualFn = useServerFn(uploadDocumentoManualAssinado);
  const conferirManualFn = useServerFn(conferirDocumentoManual);
  const novaVersaoFn = useServerFn(criarNovaVersaoDocumento);
  const enviarLembreteFn = useServerFn(enviarLembreteAssinatura);
  const getConfigFn = useServerFn(getConfigAssinaturaTenant);
  const updateConfigFn = useServerFn(updateConfigAssinaturaTenant);

  // Consultas auxiliares para vincular documentos
  const listClientesFn = useServerFn(listClientes);
  const listParceirosFn = useServerFn(listParceiros);
  const listPisFn = useServerFn(listPis);
  const listContratosFn = useServerFn(listContratos);

  // Estados de navegação e filtros
  const [tab, setTab] = useState<"todos" | "aguardando" | "conferencia" | "assinados" | "config">("todos");
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [metodoFiltro, setMetodoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  // Modais
  const [modalNovoDocOpen, setModalNovoDocOpen] = useState(false);
  const [modalSignatariosOpen, setModalSignatariosOpen] = useState(false);
  const [modalConferenciaOpen, setModalConferenciaOpen] = useState(false);
  const [modalTimelineOpen, setModalTimelineOpen] = useState(false);
  const [modalNovaVersaoOpen, setModalNovaVersaoOpen] = useState(false);
  const [modalUploadManualOpen, setModalUploadManualOpen] = useState(false);

  // Documento selecionado para operações
  const [selectedDoc, setSelectedDoc] = useState<DocumentoAssinatura | null>(null);

  // Formulário de Novo Documento
  const [novoDocForm, setNovoDocForm] = useState<{
    titulo: string;
    documento_tipo: DocumentoTipo;
    referencia_tipo: string;
    referencia_id: string;
    numero: string;
    descricao: string;
    necessita_assinatura: boolean;
    metodo_preferencial: MetodoAssinatura;
    ordem_tipo: OrdemAssinatura;
    validade_limite: string;
    provedor_assinatura: string;
  }>({
    titulo: "",
    documento_tipo: "contrato",
    referencia_tipo: "",
    referencia_id: "",
    numero: "",
    descricao: "",
    necessita_assinatura: true,
    metodo_preferencial: "hibrido",
    ordem_tipo: "simultanea",
    validade_limite: "",
    provedor_assinatura: "interno",
  });

  // Formulário de Signatário
  const [sigForm, setSigForm] = useState<{
    nome: string;
    cpf_cnpj: string;
    email: string;
    telefone: string;
    cargo: string;
    empresa: string;
    tipo_participante: TipoParticipante;
    metodo: "digital" | "manual";
    ordem: number;
  }>({
    nome: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
    cargo: "",
    empresa: "",
    tipo_participante: "cliente",
    metodo: "digital",
    ordem: 1,
  });

  // Formulário de Nova Versão
  const [motivoNovaVersao, setMotivoNovaVersao] = useState("");

  // Formulário de Upload Manual
  const [uploadManualFile, setUploadManualFile] = useState<{
    nome: string;
    dataUrl: string;
  } | null>(null);

  // Formulário de Conferência Manual
  const [conferenciaObs, setConferenciaObs] = useState("");

  // Queries
  const { data: documentos = [], isLoading: loadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ["documentos-assinatura"],
    queryFn: () => listDocsFn({ data: {} }),
  });

  const { data: configTenant, refetch: refetchConfig } = useQuery({
    queryKey: ["config-assinatura-tenant"],
    queryFn: () => getConfigFn(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: () => listClientesFn({ data: { limit: 100 } }),
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros-select"],
    queryFn: () => listParceirosFn(),
  });

  const { data: pis = [] } = useQuery({
    queryKey: ["pis-select"],
    queryFn: () => listPisFn({ data: { limit: 100 } }),
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos-select"],
    queryFn: () => listContratosFn(),
  });

  // Indicadores / KPIs
  const kpis = useMemo(() => {
    const total = documentos.length;
    const aguardandoAssinatura = documentos.filter(
      (d) => d.status === "aguardando_assinatura" || d.status === "enviado_para_assinatura"
    ).length;
    const parciais = documentos.filter((d) => d.status === "assinado_parcialmente").length;
    const assinados = documentos.filter(
      (d) => d.status === "assinado" || d.status === "assinado_manualmente"
    ).length;
    const manualPendente = documentos.filter(
      (d) => d.metodo_preferencial === "manual" && d.status !== "assinado" && d.status !== "assinado_manualmente"
    ).length;
    const conferenciaPendente = documentos.filter(
      (d) => d.status === "aguardando_conferencia" || d.status === "documento_assinado_recebido"
    ).length;
    const recusados = documentos.filter((d) => d.status === "recusado").length;
    const expirados = documentos.filter(
      (d) => d.status === "expirado" || d.status === "cancelado"
    ).length;

    return {
      total,
      aguardandoAssinatura,
      parciais,
      assinados,
      manualPendente,
      conferenciaPendente,
      recusados,
      expirados,
    };
  }, [documentos]);

  // Documentos filtrados para exibição
  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      // Filtro de busca textual
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchTitle = doc.titulo.toLowerCase().includes(s);
        const matchNum = doc.numero?.toLowerCase().includes(s);
        const matchDesc = doc.descricao?.toLowerCase().includes(s);
        const matchSig = doc.signatarios?.some((sig) =>
          sig.nome.toLowerCase().includes(s) || sig.email?.toLowerCase().includes(s)
        );
        if (!matchTitle && !matchNum && !matchDesc && !matchSig) return false;
      }

      // Filtro por tipo
      if (tipoFiltro !== "todos" && doc.documento_tipo !== tipoFiltro) {
        return false;
      }

      // Filtro por método
      if (metodoFiltro !== "todos" && doc.metodo_preferencial !== metodoFiltro) {
        return false;
      }

      // Filtro por status
      if (statusFiltro !== "todos" && doc.status !== statusFiltro) {
        return false;
      }

      // Filtro por Abas do Painel
      if (tab === "aguardando") {
        return (
          doc.status === "aguardando_assinatura" ||
          doc.status === "enviado_para_assinatura" ||
          doc.status === "assinado_parcialmente"
        );
      }
      if (tab === "conferencia") {
        return (
          doc.status === "aguardando_conferencia" ||
          doc.status === "documento_assinado_recebido"
        );
      }
      if (tab === "assinados") {
        return doc.status === "assinado" || doc.status === "assinado_manualmente";
      }

      return true;
    });
  }, [documentos, search, tipoFiltro, metodoFiltro, statusFiltro, tab]);

  // Mutations
  const criarDocMutation = useMutation({
    mutationFn: () =>
      upsertDocFn({
        data: {
          ...novoDocForm,
          referencia_tipo: novoDocForm.referencia_tipo || null,
          referencia_id: novoDocForm.referencia_id || null,
          validade_limite: novoDocForm.validade_limite || null,
        },
      }),
    onSuccess: (doc) => {
      toast.success("Documento de assinatura criado com sucesso!");
      setModalNovoDocOpen(false);
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
      // Abre modal de signatários para já configurar as partes
      setSelectedDoc(doc);
      setModalSignatariosOpen(true);
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar documento: ${err.message}`);
    },
  });

  const addSigMutation = useMutation({
    mutationFn: () => {
      if (!selectedDoc) throw new Error("Documento não selecionado");
      return addSigFn({
        data: {
          documento_id: selectedDoc.id,
          ...sigForm,
        },
      });
    },
    onSuccess: () => {
      toast.success("Signatário adicionado!");
      setSigForm({
        nome: "",
        cpf_cnpj: "",
        email: "",
        telefone: "",
        cargo: "",
        empresa: "",
        tipo_participante: "cliente",
        metodo: "digital",
        ordem: (selectedDoc?.signatarios?.length || 0) + 2,
      });
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
      refetchDocs();
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const remSigMutation = useMutation({
    mutationFn: (id: string) => remSigFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Signatário removido.");
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
      refetchDocs();
    },
    onError: (err: any) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const enviarAssinaturaMutation = useMutation({
    mutationFn: (docId: string) => enviarDigitalFn({ data: { documento_id: docId } }),
    onSuccess: () => {
      toast.success("Documento enviado para assinatura com sucesso!");
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const prepararManualMutation = useMutation({
    mutationFn: (docId: string) => enviarManualFn({ data: { documento_id: docId } }),
    onSuccess: () => {
      toast.success("Fluxo de assinatura manual preparado.");
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
  });

  const uploadManualMutation = useMutation({
    mutationFn: () => {
      if (!selectedDoc || !uploadManualFile) throw new Error("Selecione o arquivo");
      return uploadManualFn({
        data: {
          documento_id: selectedDoc.id,
          nomeArquivo: uploadManualFile.nome,
          dataUrl: uploadManualFile.dataUrl,
        },
      });
    },
    onSuccess: (res) => {
      toast.success("Upload realizado! O documento está aguardando conferência.");
      setModalUploadManualOpen(false);
      setUploadManualFile(null);
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
      if (res.iaResult) {
        toast.info(res.iaResult.resumo_analise, { duration: 6000 });
      }
    },
    onError: (err: any) => toast.error(`Erro no upload: ${err.message}`),
  });

  const conferirManualMutation = useMutation({
    mutationFn: (decisao: "aprovar" | "rejeitar" | "solicitar_novo") => {
      if (!selectedDoc) throw new Error("Documento não selecionado");
      return conferirManualFn({
        data: {
          documento_id: selectedDoc.id,
          decisao,
          observacoes: conferenciaObs,
        },
      });
    },
    onSuccess: (_, decisao) => {
      if (decisao === "aprovar") {
        toast.success("Documento aprovado e validado com sucesso!");
      } else {
        toast.warning("Decisão de conferência registrada.");
      }
      setModalConferenciaOpen(false);
      setConferenciaObs("");
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const novaVersaoMutation = useMutation({
    mutationFn: () => {
      if (!selectedDoc) throw new Error("Documento não selecionado");
      return novaVersaoFn({
        data: {
          documento_id: selectedDoc.id,
          motivo_alteracao: motivoNovaVersao,
        },
      });
    },
    onSuccess: (nova) => {
      toast.success(`Nova versão v${nova.versao} gerada com sucesso! Fluxo anterior encerrado.`);
      setModalNovaVersaoOpen(false);
      setMotivoNovaVersao("");
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const lembreteMutation = useMutation({
    mutationFn: ({ docId, sigId }: { docId: string; sigId?: string }) =>
      enviarLembreteFn({ data: { documento_id: docId, signatario_id: sigId } }),
    onSuccess: (res) => {
      toast.success(`Lembrete enviado para ${res.lembradosCount} signatário(s)!`);
      qc.invalidateQueries({ queryKey: ["documentos-assinatura"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Manipulador de leitura de arquivo para upload manual
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadManualFile({
        nome: file.name,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Impressão da via de assinatura manual
  const imprimirDocumentoManual = (doc: DocumentoAssinatura) => {
    const html = gerarHtmlDocumentoImpressao(doc, doc.signatarios || [], {
      nome: empresaNome || "Mídia OS — Gestão de Mídia",
      cnpj: empresaCnpj,
      logoSrc: logoSrc || undefined,
    });
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    } else {
      toast.error("Permita popups para abrir a folha de impressão.");
    }
  };

  // Copiar link de assinatura para área de transferência
  const copiarLinkSignatario = (token: string) => {
    const url = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  // Gerar link formatado para WhatsApp
  const enviarWhatsAppLink = (sig: Signatario, doc: DocumentoAssinatura) => {
    const url = `${window.location.origin}/assinar/${sig.token}`;
    const texto = encodeURIComponent(
      `Olá, ${sig.nome}! Segue o link seguro para assinatura de "${doc.titulo}" (${doc.numero || ""}) via Mídia OS:\n\n${url}\n\nPor favor, acerte sua rubrica diretamente no link acima.`
    );
    const foneLimpo = sig.telefone?.replace(/\D/g, "");
    const waUrl = foneLimpo ? `https://wa.me/55${foneLimpo}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(waUrl, "_blank");
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileSignature className="h-6 w-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Módulo Universal de Assinaturas
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Centralizador e planejador de assinaturas digitais, manuais e híbridas para todos os
              documentos do sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setNovoDocForm({
                  titulo: "",
                  documento_tipo: "contrato",
                  referencia_tipo: "",
                  referencia_id: "",
                  numero: "",
                  descricao: "",
                  necessita_assinatura: true,
                  metodo_preferencial: "hibrido",
                  ordem_tipo: "simultanea",
                  validade_limite: "",
                  provedor_assinatura: configTenant?.provedor_padrao || "interno",
                });
                setModalNovoDocOpen(true);
              }}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Novo Documento para Assinatura
            </Button>
          </div>
        </div>

        {/* Cards de Indicadores / KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card
            onClick={() => setTab("todos")}
            className={`cursor-pointer transition-all hover:border-primary/50 ${tab === "todos" ? "border-primary shadow-sm" : ""}`}
          >
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground font-medium">Total</div>
              <div className="text-2xl font-bold mt-0.5">{kpis.total}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setTab("aguardando")}
            className={`cursor-pointer transition-all hover:border-amber-500/50 ${tab === "aguardando" ? "border-amber-500 shadow-sm" : ""}`}
          >
            <CardContent className="p-3 text-center">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Aguardando</div>
              <div className="text-2xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">
                {kpis.aguardandoAssinatura}
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setTab("todos")}
            className="cursor-pointer transition-all hover:border-blue-500/50"
          >
            <CardContent className="p-3 text-center">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Parciais</div>
              <div className="text-2xl font-bold mt-0.5 text-blue-600 dark:text-blue-400">
                {kpis.parciais}
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setTab("conferencia")}
            className={`cursor-pointer transition-all hover:border-purple-500/50 ${tab === "conferencia" ? "border-purple-500 shadow-sm" : ""}`}
          >
            <CardContent className="p-3 text-center">
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Conferência</div>
              <div className="text-2xl font-bold mt-0.5 text-purple-600 dark:text-purple-400">
                {kpis.conferenciaPendente}
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setTab("assinados")}
            className={`cursor-pointer transition-all hover:border-emerald-500/50 ${tab === "assinados" ? "border-emerald-500 shadow-sm" : ""}`}
          >
            <CardContent className="p-3 text-center">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Assinados</div>
              <div className="text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                {kpis.assinados}
              </div>
            </CardContent>
          </Card>

          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground font-medium">Manuais Pend.</div>
            <div className="text-2xl font-bold mt-0.5">{kpis.manualPendente}</div>
          </Card>

          <Card className="p-3 text-center">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Recusados</div>
            <div className="text-2xl font-bold mt-0.5 text-rose-600 dark:text-rose-400">{kpis.recusados}</div>
          </Card>

          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground font-medium">Expirados</div>
            <div className="text-2xl font-bold mt-0.5">{kpis.expirados}</div>
          </Card>
        </div>

        {/* Abas e Filtros */}
        <div className="space-y-4">
          <Tabs
            value={tab}
            onValueChange={(v: any) => setTab(v)}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="todos" className="gap-1.5 text-xs sm:text-sm">
                  <Layers className="h-4 w-4" />
                  Todos os Documentos
                </TabsTrigger>
                <TabsTrigger value="aguardando" className="gap-1.5 text-xs sm:text-sm">
                  <Clock className="h-4 w-4" />
                  Aguardando Assinatura
                  {kpis.aguardandoAssinatura > 0 && (
                    <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
                      {kpis.aguardandoAssinatura}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="conferencia" className="gap-1.5 text-xs sm:text-sm">
                  <Sparkles className="h-4 w-4" />
                  Conferência Manual (IA)
                  {kpis.conferenciaPendente > 0 && (
                    <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] bg-purple-500/10 text-purple-600 border-purple-300">
                      {kpis.conferenciaPendente}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assinados" className="gap-1.5 text-xs sm:text-sm">
                  <FileCheck className="h-4 w-4" />
                  Assinados & Validados
                </TabsTrigger>
                <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
                  <Settings className="h-4 w-4" />
                  Configurações & Provedores
                </TabsTrigger>
              </TabsList>

              {tab !== "config" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título, número, signatário..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Painel da Aba: Configurações & Provedores */}
            <TabsContent value="config" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    Configuração Universal de Assinaturas (Por Tenant)
                  </CardTitle>
                  <CardDescription>
                    Configure os métodos aceitos, integrações com provedores externos desacoplados
                    (DocuSign, ClickSign, ZapSign) e regras de bloqueio operacional de campanhas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Provedor Padrão */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border bg-muted/20">
                    <div>
                      <Label className="font-semibold text-sm">Provedor Padrão de Assinatura</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Escolha o motor responsável pela coleta das evidências e assinaturas digitais.
                      </p>
                      <Select
                        value={configTenant?.provedor_padrao || "interno"}
                        onValueChange={(val: any) => {
                          updateConfigFn({
                            data: {
                              metodos_permitidos: configTenant?.metodos_permitidos || ["digital", "manual", "hibrido"],
                              provedor_padrao: val,
                              provedor_configs: configTenant?.provedor_configs || {},
                              bloqueios: configTenant?.bloqueios || {},
                              prazo_padrao_dias: configTenant?.prazo_padrao_dias || 5,
                              lembretes_automaticos: configTenant?.lembretes_automaticos ?? true,
                              lembretes_frequencia_dias: configTenant?.lembretes_frequencia_dias || 2,
                              lembretes_max: configTenant?.lembretes_max || 3,
                              canais_notificacao: configTenant?.canais_notificacao || ["email", "sistema"],
                              signatarios_padrao: configTenant?.signatarios_padrao || [],
                            },
                          }).then(() => {
                            toast.success("Provedor atualizado com sucesso!");
                            refetchConfig();
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interno">Mídia OS Nativo (Biometria / Rubrica / SHA-256)</SelectItem>
                          <SelectItem value="docusign">DocuSign eSignature (Desacoplado)</SelectItem>
                          <SelectItem value="clicksign">Clicksign (Desacoplado)</SelectItem>
                          <SelectItem value="zapsign">ZapSign (Desacoplado)</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="mt-4 p-3 rounded-md bg-background border text-xs space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                          Status da Camada de Provedores
                        </div>
                        <p className="text-muted-foreground">
                          O Mídia OS opera com uma camada de abstração flexível (Provider Layer).
                          Quando provedores externos não possuem chaves cadastradas, o sistema
                          utiliza o Provedor Nativo de alta segurança garantindo rastreabilidade
                          integral sem interrupção de operações.
                        </p>
                      </div>
                    </div>

                    {/* Bloqueios de Segurança */}
                    <div>
                      <Label className="font-semibold text-sm">Bloqueios Operacionais Configuráveis</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Impeça que etapas operacionais avancem sem que o documento obrigatório esteja assinado.
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2.5 rounded border bg-background">
                          <div>
                            <div className="font-medium text-xs">Bloquear OPEC sem PI Assinado</div>
                            <div className="text-[11px] text-muted-foreground">
                              Exige assinatura do cliente antes de liberar a grade de inserções
                            </div>
                          </div>
                          <Switch
                            checked={configTenant?.bloqueios?.bloquear_opec_sem_pi ?? true}
                            onCheckedChange={(checked) => {
                              updateConfigFn({
                                data: {
                                  metodos_permitidos: configTenant?.metodos_permitidos || ["digital", "manual", "hibrido"],
                                  provedor_padrao: configTenant?.provedor_padrao || "interno",
                                  provedor_configs: configTenant?.provedor_configs || {},
                                  bloqueios: {
                                    ...(configTenant?.bloqueios || {}),
                                    bloquear_opec_sem_pi: checked,
                                  },
                                  prazo_padrao_dias: configTenant?.prazo_padrao_dias || 5,
                                  lembretes_automaticos: configTenant?.lembretes_automaticos ?? true,
                                  lembretes_frequencia_dias: configTenant?.lembretes_frequencia_dias || 2,
                                  lembretes_max: configTenant?.lembretes_max || 3,
                                  canais_notificacao: configTenant?.canais_notificacao || ["email", "sistema"],
                                  signatarios_padrao: configTenant?.signatarios_padrao || [],
                                },
                              }).then(() => {
                                toast.success("Regra de bloqueio atualizada!");
                                refetchConfig();
                              });
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded border bg-background">
                          <div>
                            <div className="font-medium text-xs">Bloquear Campanha sem Contrato Assinado</div>
                            <div className="text-[11px] text-muted-foreground">
                              Não permite iniciar a campanha até que o contrato formal esteja assinado
                            </div>
                          </div>
                          <Switch
                            checked={configTenant?.bloqueios?.bloquear_campanha_sem_contrato ?? false}
                            onCheckedChange={(checked) => {
                              updateConfigFn({
                                data: {
                                  metodos_permitidos: configTenant?.metodos_permitidos || ["digital", "manual", "hibrido"],
                                  provedor_padrao: configTenant?.provedor_padrao || "interno",
                                  provedor_configs: configTenant?.provedor_configs || {},
                                  bloqueios: {
                                    ...(configTenant?.bloqueios || {}),
                                    bloquear_campanha_sem_contrato: checked,
                                  },
                                  prazo_padrao_dias: configTenant?.prazo_padrao_dias || 5,
                                  lembretes_automaticos: configTenant?.lembretes_automaticos ?? true,
                                  lembretes_frequencia_dias: configTenant?.lembretes_frequencia_dias || 2,
                                  lembretes_max: configTenant?.lembretes_max || 3,
                                  canais_notificacao: configTenant?.canais_notificacao || ["email", "sistema"],
                                  signatarios_padrao: configTenant?.signatarios_padrao || [],
                                },
                              }).then(() => {
                                toast.success("Regra de bloqueio atualizada!");
                                refetchConfig();
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conteúdo das Abas de Tabela */}
            <TabsContent value={tab} className="pt-2">
              {/* Barra de Filtros Rápidos */}
              <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2.5 rounded-lg border mb-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Filtros:
                </div>

                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="h-8 text-xs w-[180px]">
                    <SelectValue placeholder="Tipo de Documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    {Object.entries(LABELS_DOCUMENTO_TIPO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={metodoFiltro} onValueChange={setMetodoFiltro}>
                  <SelectTrigger className="h-8 text-xs w-[150px]">
                    <SelectValue placeholder="Método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Métodos</SelectItem>
                    <SelectItem value="digital">Apenas Digital</SelectItem>
                    <SelectItem value="manual">Apenas Manual</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger className="h-8 text-xs w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    {Object.entries(LABELS_ASSINATURA_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(tipoFiltro !== "todos" || metodoFiltro !== "todos" || statusFiltro !== "todos" || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTipoFiltro("todos");
                      setMetodoFiltro("todos");
                      setStatusFiltro("todos");
                      setSearch("");
                    }}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Tabela de Documentos */}
              <Card>
                <CardContent className="p-0">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[120px]">Número / Versão</TableHead>
                          <TableHead>Documento / Referência</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Signatários & Progresso</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingDocs ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                              Carregando documentos de assinatura...
                            </TableCell>
                          </TableRow>
                        ) : documentosFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                              Nenhum documento encontrado para os filtros selecionados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          documentosFiltrados.map((doc) => {
                            const statusMeta =
                              LABELS_ASSINATURA_STATUS[doc.status] || {
                                label: doc.status,
                                variant: "outline",
                              };
                            const totalSigs = doc.signatarios?.length || 0;
                            const assinadosSigs =
                              doc.signatarios?.filter((s) => s.status === "assinado").length || 0;

                            return (
                              <TableRow key={doc.id} className="hover:bg-muted/30">
                                <TableCell className="font-mono text-xs">
                                  <div className="font-bold">{doc.numero || "S/N"}</div>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">
                                    v{doc.versao}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  <div className="font-semibold text-sm text-foreground">{doc.titulo}</div>
                                  {doc.descricao && (
                                    <div className="text-xs text-muted-foreground line-clamp-1">
                                      {doc.descricao}
                                    </div>
                                  )}
                                  {doc.referencia_tipo && (
                                    <div className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                                      <Link2Icon className="h-3 w-3" />
                                      Ref: {doc.referencia_tipo.toUpperCase()}
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell className="text-xs">
                                  {LABELS_DOCUMENTO_TIPO[doc.documento_tipo] || doc.documento_tipo}
                                </TableCell>

                                <TableCell className="text-xs">
                                  <Badge
                                    variant="outline"
                                    className={`capitalize text-[11px] ${
                                      doc.metodo_preferencial === "digital"
                                        ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                        : doc.metodo_preferencial === "manual"
                                        ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                        : "bg-purple-500/10 text-purple-600 border-purple-200"
                                    }`}
                                  >
                                    {doc.metodo_preferencial}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <div className="text-xs font-medium">
                                      {assinadosSigs}/{totalSigs} assinados
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setModalSignatariosOpen(true);
                                      }}
                                      className="h-6 px-1.5 text-xs text-primary"
                                    >
                                      <Users className="h-3 w-3 mr-1" />
                                      Gerenciar
                                    </Button>
                                  </div>
                                  {totalSigs > 0 && (
                                    <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                                      <div
                                        className="bg-emerald-500 h-full transition-all"
                                        style={{ width: `${(assinadosSigs / totalSigs) * 100}%` }}
                                      />
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <Badge
                                    variant={
                                      statusMeta.variant === "success"
                                        ? "default"
                                        : statusMeta.variant === "warning"
                                        ? "outline"
                                        : (statusMeta.variant as any)
                                    }
                                    className={`text-xs ${
                                      doc.status === "assinado" || doc.status === "assinado_manualmente"
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                        : doc.status === "aguardando_conferencia"
                                        ? "bg-purple-600 text-white hover:bg-purple-700"
                                        : doc.status === "aguardando_assinatura" || doc.status === "enviado_para_assinatura"
                                        ? "bg-amber-500 text-white hover:bg-amber-600"
                                        : ""
                                    }`}
                                  >
                                    {statusMeta.label}
                                  </Badge>
                                </TableCell>

                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Botão de Enviar Assinatura Digital */}
                                    {(doc.status === "aguardando_definicao" || doc.status === "aguardando_assinatura") && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        title="Disparar para Assinatura Digital"
                                        onClick={() => enviarAssinaturaMutation.mutate(doc.id)}
                                        className="h-8 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                      >
                                        <Send className="h-3.5 w-3.5 mr-1" />
                                        Disparar
                                      </Button>
                                    )}

                                    {/* Botão de Imprimir para Assinatura Manual */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Gerar Folha de Assinatura para Impressão Manual"
                                      onClick={() => {
                                        prepararManualMutation.mutate(doc.id);
                                        imprimirDocumentoManual(doc);
                                      }}
                                      className="h-8 px-2 text-xs"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>

                                    {/* Botão de Anexar Documento Manual Assinado */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Fazer Upload do Documento Físico Assinado"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setModalUploadManualOpen(true);
                                      }}
                                      className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-50"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                    </Button>

                                    {/* Botão de Conferência com Mídia OS IA */}
                                    {doc.status === "aguardando_conferencia" && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        title="Conferir Documento Manual com IA"
                                        onClick={() => {
                                          setSelectedDoc(doc);
                                          setModalConferenciaOpen(true);
                                        }}
                                        className="h-8 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Conferir
                                      </Button>
                                    )}

                                    {/* Histórico / Timeline */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Histórico e Auditoria"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setModalTimelineOpen(true);
                                      }}
                                      className="h-8 px-2 text-xs"
                                    >
                                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>

                                    {/* Nova Versão */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Gerar Nova Versão (Invalidar Atual)"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setModalNovaVersaoOpen(true);
                                      }}
                                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      <Layers className="h-3.5 w-3.5" />
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* MODAL 1: NOVO DOCUMENTO DE ASSINATURA */}
        <Dialog open={modalNovoDocOpen} onOpenChange={setModalNovoDocOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                Criar Documento para Assinatura
              </DialogTitle>
              <DialogDescription>
                Cadastre um documento universal para controle de assinaturas digitais, manuais ou híbridas.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="md:col-span-2">
                <Label>Título do Documento *</Label>
                <Input
                  placeholder="Ex: Contrato de Prestação de Serviços de Mídia — Anunciante X"
                  value={novoDocForm.titulo}
                  onChange={(e) => setNovoDocForm({ ...novoDocForm, titulo: e.target.value })}
                />
              </div>

              <div>
                <Label>Tipo de Documento</Label>
                <Select
                  value={novoDocForm.documento_tipo}
                  onValueChange={(val: any) => setNovoDocForm({ ...novoDocForm, documento_tipo: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABELS_DOCUMENTO_TIPO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Método de Assinatura</Label>
                <Select
                  value={novoDocForm.metodo_preferencial}
                  onValueChange={(val: any) => setNovoDocForm({ ...novoDocForm, metodo_preferencial: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hibrido">Híbrido (Digital e/ou Manual)</SelectItem>
                    <SelectItem value="digital">Exclusivamente Digital</SelectItem>
                    <SelectItem value="manual">Exclusivamente Manual (Físico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ordem de Assinatura</Label>
                <Select
                  value={novoDocForm.ordem_tipo}
                  onValueChange={(val: any) => setNovoDocForm({ ...novoDocForm, ordem_tipo: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simultanea">Simultânea (Todos ao mesmo tempo)</SelectItem>
                    <SelectItem value="sequencial">Sequencial (Em ordem pré-definida)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prazo Limite / Validade</Label>
                <Input
                  type="date"
                  value={novoDocForm.validade_limite}
                  onChange={(e) => setNovoDocForm({ ...novoDocForm, validade_limite: e.target.value })}
                />
              </div>

              {/* Vínculo de Módulo (CRM, PI, Contrato, Parceiro, Cliente) */}
              <div>
                <Label>Vincular a Módulo do Sistema</Label>
                <Select
                  value={novoDocForm.referencia_tipo}
                  onValueChange={(val: any) => setNovoDocForm({ ...novoDocForm, referencia_tipo: val, referencia_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contratos">Contratos</SelectItem>
                    <SelectItem value="pis">Pedidos de Inserção (PI)</SelectItem>
                    <SelectItem value="clientes">Clientes</SelectItem>
                    <SelectItem value="parceiros">Parceiros de Mídia</SelectItem>
                    <SelectItem value="outro">Documento Avulso / Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {novoDocForm.referencia_tipo === "contratos" && (
                <div>
                  <Label>Selecionar Contrato</Label>
                  <Select
                    value={novoDocForm.referencia_id}
                    onValueChange={(val) => {
                      const c = contratos.find((ct) => ct.id === val);
                      setNovoDocForm({
                        ...novoDocForm,
                        referencia_id: val,
                        titulo: novoDocForm.titulo || `Contrato: ${c?.titulo || c?.numero}`,
                        numero: c?.numero || novoDocForm.numero,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contratos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.numero} — {c.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {novoDocForm.referencia_tipo === "pis" && (
                <div>
                  <Label>Selecionar Pedido de Inserção (PI)</Label>
                  <Select
                    value={novoDocForm.referencia_id}
                    onValueChange={(val) => {
                      const pi = pis.find((p) => p.id === val);
                      setNovoDocForm({
                        ...novoDocForm,
                        referencia_id: val,
                        titulo: novoDocForm.titulo || `PI ${pi?.numero || ""}: ${pi?.campanha || ""}`,
                        numero: pi?.numero || novoDocForm.numero,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o PI" />
                    </SelectTrigger>
                    <SelectContent>
                      {pis.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          PI {p.numero} — {p.campanha}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-2">
                <Label>Descrição / Objeto</Label>
                <Textarea
                  placeholder="Resumo das cláusulas, objeto de veiculação ou especificações comerciais..."
                  rows={3}
                  value={novoDocForm.descricao}
                  onChange={(e) => setNovoDocForm({ ...novoDocForm, descricao: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalNovoDocOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => criarDocMutation.mutate()}
                disabled={!novoDocForm.titulo.trim() || criarDocMutation.isPending}
              >
                {criarDocMutation.isPending ? "Criando..." : "Criar & Definir Signatários"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: GERENCIAMENTO DE SIGNATÁRIOS */}
        <Dialog open={modalSignatariosOpen} onOpenChange={setModalSignatariosOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Signatários do Documento — {selectedDoc?.titulo}
              </DialogTitle>
              <DialogDescription>
                Cadastre as partes que deverão assinar. Cada signatário pode ter método digital ou manual.
              </DialogDescription>
            </DialogHeader>

            {/* Lista dos signatários cadastrados */}
            <div className="space-y-3 my-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Signatários Atuais ({selectedDoc?.signatarios?.length || 0})
              </div>

              {selectedDoc?.signatarios?.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Nenhum signatário adicionado ainda. Cadastre o primeiro signatário abaixo.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedDoc?.signatarios?.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-background gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{sig.nome}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {sig.tipo_participante}
                          </Badge>
                          <Badge
                            className={`text-[10px] capitalize ${
                              sig.metodo === "digital"
                                ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                : "bg-amber-500/10 text-amber-600 border-amber-200"
                            }`}
                            variant="outline"
                          >
                            {sig.metodo}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${
                              sig.status === "assinado"
                                ? "bg-emerald-600 text-white"
                                : sig.status === "recusado"
                                ? "bg-rose-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {sig.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sig.cargo && `${sig.cargo} • `}
                          {sig.empresa && `${sig.empresa} • `}
                          {sig.email && `${sig.email} • `}
                          {sig.cpf_cnpj && `CPF/CNPJ: ${sig.cpf_cnpj}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* Copiar Link */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Copiar Link Seguro de Assinatura"
                          onClick={() => copiarLinkSignatario(sig.token)}
                          className="h-8 px-2 text-xs"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        {/* Enviar WhatsApp */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Disparar Link por WhatsApp"
                          onClick={() => enviarWhatsAppLink(sig, selectedDoc)}
                          className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>

                        {/* Lembrete individual */}
                        {sig.status !== "assinado" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Disparar Lembrete de Assinatura"
                            onClick={() => lembreteMutation.mutate({ docId: selectedDoc.id, sigId: sig.id })}
                            className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Remover */}
                        {sig.status !== "assinado" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remover Signatário"
                            onClick={() => remSigMutation.mutate(sig.id)}
                            className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulário para Adicionar Signatário */}
            <div className="border-t pt-3 mt-2">
              <div className="text-xs font-semibold mb-2">Adicionar Novo Signatário</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-xs">Nome Completo *</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nome do assinante"
                    value={sigForm.nome}
                    onChange={(e) => setSigForm({ ...sigForm, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">CPF / CNPJ</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="000.000.000-00"
                    value={sigForm.cpf_cnpj}
                    onChange={(e) => setSigForm({ ...sigForm, cpf_cnpj: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    className="h-8 text-xs"
                    type="email"
                    placeholder="email@empresa.com.br"
                    value={sigForm.email}
                    onChange={(e) => setSigForm({ ...sigForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone / WhatsApp</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="(00) 00000-0000"
                    value={sigForm.telefone}
                    onChange={(e) => setSigForm({ ...sigForm, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cargo / Função</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Ex: Diretor Financeiro"
                    value={sigForm.cargo}
                    onChange={(e) => setSigForm({ ...sigForm, cargo: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Empresa</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nome da empresa"
                    value={sigForm.empresa}
                    onChange={(e) => setSigForm({ ...sigForm, empresa: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Papel / Participante</Label>
                  <Select
                    value={sigForm.tipo_participante}
                    onValueChange={(val: any) => setSigForm({ ...sigForm, tipo_participante: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente (Anunciante)</SelectItem>
                      <SelectItem value="parceiro">Parceiro / Veículo de Mídia</SelectItem>
                      <SelectItem value="nexo">Nexo / Mídia OS</SelectItem>
                      <SelectItem value="agencia">Agência de Publicidade</SelectItem>
                      <SelectItem value="testemunha">Testemunha</SelectItem>
                      <SelectItem value="outro">Outro Participante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Método de Assinatura</Label>
                  <Select
                    value={sigForm.metodo}
                    onValueChange={(val: any) => setSigForm({ ...sigForm, metodo: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digital">Assinatura Digital</SelectItem>
                      <SelectItem value="manual">Assinatura Manual (Física)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => addSigMutation.mutate()}
                    disabled={!sigForm.nome.trim() || addSigMutation.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Inserir Signatário
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setModalSignatariosOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: UPLOAD DO DOCUMENTO ASSINADO MANUALMENTE */}
        <Dialog open={modalUploadManualOpen} onOpenChange={setModalUploadManualOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-600" />
                Upload do Documento Físico Assinado
              </DialogTitle>
              <DialogDescription>
                Envie o arquivo digitalizado ou fotografado (PDF, JPG ou PNG) do documento com as assinaturas coletadas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/20">
                <input
                  type="file"
                  id="file-upload-manual"
                  className="hidden"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-upload-manual"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs font-semibold">
                    {uploadManualFile ? uploadManualFile.nome : "Clique para selecionar o arquivo"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    PDF, JPG, JPEG ou PNG (máx. 15MB)
                  </span>
                </label>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-2.5 rounded">
                💡 <strong>Dica Mídia OS IA:</strong> Certifique-se de que todas as páginas e rubricas estejam legíveis e com boa iluminação para que o assistente consiga realizar a pré-conferência.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalUploadManualOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => uploadManualMutation.mutate()}
                disabled={!uploadManualFile || uploadManualMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {uploadManualMutation.isPending ? "Enviando..." : "Enviar para Conferência"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 4: CONFERÊNCIA MANUAL COM MÍDIA OS IA */}
        <Dialog open={modalConferenciaOpen} onOpenChange={setModalConferenciaOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Conferência de Documento Manual — Mídia OS IA
              </DialogTitle>
              <DialogDescription>
                Validação visual assistiva por IA. A decisão final de aprovação é sempre humana.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Resultado da Análise da IA */}
              <div className="p-4 rounded-lg border bg-purple-500/5 border-purple-200 dark:border-purple-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Diagnóstico Assistivo Mídia OS IA
                  </div>
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                    Modo Assistivo
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-background rounded border">
                    <div className="text-muted-foreground">Páginas</div>
                    <div className="font-bold text-base">
                      {selectedDoc?.ia_analise?.paginas_detectadas ?? 1}
                    </div>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <div className="text-muted-foreground">Assinaturas Esperadas</div>
                    <div className="font-bold text-base">
                      {selectedDoc?.ia_analise?.campos_assinatura_encontrados ?? selectedDoc?.signatarios?.length ?? 0}
                    </div>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <div className="text-muted-foreground">Detectadas</div>
                    <div className="font-bold text-base text-emerald-600">
                      {selectedDoc?.ia_analise?.assinaturas_detectadas ?? 1}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {selectedDoc?.ia_analise?.resumo_analise ||
                    "Arquivo recebido e pronto para conferência visual humana."}
                </p>

                {/* Possíveis Inconsistências Encontradas */}
                {selectedDoc?.ia_analise?.possiveis_inconsistencias &&
                  selectedDoc.ia_analise.possiveis_inconsistencias.length > 0 && (
                    <div className="space-y-1.5 border-t border-purple-200 dark:border-purple-900/60 pt-2">
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Possíveis Inconsistências Encontradas:
                      </div>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                        {selectedDoc.ia_analise.possiveis_inconsistencias.map((inc, i) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="text-[11px] text-muted-foreground/80 italic pt-1 border-t">
                  ⚠️ <strong>Disclaimer Obrigatório:</strong> {selectedDoc?.ia_analise?.disclaimer || "A conferência de IA é assistiva e não declara validade jurídica autônoma. O usuário responsável deve inspecionar e aprovar formalmente."}
                </div>
              </div>

              {/* Observações da Conferência */}
              <div>
                <Label>Parecer / Observações do Conferente</Label>
                <Textarea
                  placeholder="Informe observações da conferência visual, confirmação de rubricas ou motivos de solicitação de nova via..."
                  rows={2}
                  value={conferenciaObs}
                  onChange={(e) => setConferenciaObs(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => conferirManualMutation.mutate("rejeitar")}
                  disabled={conferirManualMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar Documento
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => conferirManualMutation.mutate("solicitar_novo")}
                  disabled={conferirManualMutation.isPending}
                >
                  Solicitar Nova Via
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => conferirManualMutation.mutate("aprovar")}
                disabled={conferirManualMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aprovar & Validar Documento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 5: TIMELINE / HISTÓRICO DE AUDITORIA */}
        <Dialog open={modalTimelineOpen} onOpenChange={setModalTimelineOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico & Auditoria — {selectedDoc?.titulo}
              </DialogTitle>
              <DialogDescription>
                Linha do tempo oficial e rastreabilidade integral de todas as ações e eventos documentais.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 max-h-80 overflow-y-auto pr-1">
              {selectedDoc?.historico?.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  Nenhum registro de auditoria ainda.
                </div>
              ) : (
                <div className="relative border-l-2 border-primary/20 ml-3 space-y-4 py-1">
                  {selectedDoc?.historico?.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      <div className="text-xs text-muted-foreground font-mono">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">
                        {item.descricao}
                      </div>
                      {item.signatario && (
                        <div className="text-xs text-primary mt-0.5">
                          Parte: {item.signatario.nome}
                        </div>
                      )}
                      {item.detalhes?.ip && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          IP: {item.detalhes.ip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalTimelineOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 6: NOVA VERSÃO (INVALIDAÇÃO DE FLUXO) */}
        <Dialog open={modalNovaVersaoOpen} onOpenChange={setModalNovaVersaoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Layers className="h-5 w-5" />
                Gerar Nova Versão do Documento
              </DialogTitle>
              <DialogDescription>
                A versão atual (v{selectedDoc?.versao}) será formalmente encerrada e invalidada.
                Uma nova versão (v{(selectedDoc?.versao || 1) + 1}) será criada com novos tokens de assinatura.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label>Motivo da Alteração Contratual / Nova Versão *</Label>
              <Textarea
                placeholder="Ex: Ajuste de cláusula comercial ou alteração no valor da campanha..."
                rows={3}
                value={motivoNovaVersao}
                onChange={(e) => setMotivoNovaVersao(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalNovaVersaoOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => novaVersaoMutation.mutate()}
                disabled={!motivoNovaVersao.trim() || novaVersaoMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {novaVersaoMutation.isPending ? "Gerando..." : "Confirmar & Invalidar Anterior"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function Link2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}
