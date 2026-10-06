import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  Globe,
  Instagram,
  Linkedin,
  Facebook,
} from "lucide-react";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { listExecutivos, findByCnpj } from "@/lib/atendimento.functions";
import { useUserRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import { LogoImg } from "@/components/LogoImg";
import { PisAnexosSection } from "@/components/PisAnexosSection";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias, upsertAgencia } from "@/lib/agencias.functions";
import { listIndicadores } from "@/lib/indicadores.functions";
import { IndicadorFormDialog } from "@/components/indicadores/IndicadorFormDialog";
import { traduzirErro } from "@/lib/error-translator";
import { FormFieldError, errorLabelClass, scrollToFirstError } from "@/lib/form-errors";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2 } from "lucide-react";

export type Contato = {
  nome: string;
  cargo?: string;
  funcao?: string;
  email?: string;
  telefone?: string;
  aniversario?: string;
};

function formatCPF(s: string): string {
  const d = (s || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function formatDoc(s: string): string {
  const d = (s || "").replace(/\D/g, "");
  if (d.length <= 11) return formatCPF(d);
  return formatCNPJ(d);
}

function parseDataAniversario(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  // Excel serial date (number) → DD/MM
  if (typeof input === "number") {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(input) : null;
    if (d) return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}`;
  }
  const s = String(input).trim();
  // ISO YYYY-MM-DD → DD/MM
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}`;
  // DD/MM/YYYY or DD-MM-YYYY → DD/MM
  m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-]\d{2,4}$/);
  if (m) return `${m[1]}/${m[2]}`;
  // Already DD/MM
  m = s.match(/^(\d{2})\/(\d{2})$/);
  if (m) return `${m[1]}/${m[2]}`;
  return null;
}

export type EntityFormData = {
  id?: string;
  razao_social: string;
  nome_fantasia: string | null;
  apelido?: string | null;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  agencia_id?: string | null;
  executivo_id?: string | null;
  observacao: string | null;
  contatos: Contato[];
  logo_url?: string | null;
  segmento?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  cnae?: string | null;
  situacao_cadastral?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  data_aniversario?: string | null;
  status: string;
  indicador_id?: string | null;
  comissao_indicacao_pct?: number | null;
};

type ImportResult = {
  razao_social: string;
  cnpj: string;
  status: "sucesso" | "duplicado" | "erro";
  mensagem?: string;
};

const SEGMENTOS_PADRAO = [
  "Varejo",
  "Supermercado",
  "Automotivo",
  "Imobiliário",
  "Construção Civil",
  "Saúde",
  "Educação",
  "Alimentação / Restaurantes",
  "Moda e Vestuário",
  "Beleza e Estética",
  "Turismo e Hotelaria",
  "Tecnologia",
  "Serviços Financeiros",
  "Indústria",
  "Agronegócio",
  "Telecomunicações",
  "Energia",
  "Governo / Setor Público",
  "ONG / Terceiro Setor",
  "Entretenimento e Eventos",
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: Partial<EntityFormData> | null;
  agencias?: { id: string; nome: string }[];
  showLogo?: boolean;
  onSubmit: (data: EntityFormData) => Promise<unknown>;
  queryKey: string;
  tipo: "cliente" | "agencia";
  onSuccess?: (savedData: any) => void;
};

export function EntityFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  agencias,
  showLogo,
  onSubmit,
  queryKey,
  tipo,
  onSuccess,
}: Props) {
  const { isAdmin } = useUserRoles();
  const { user } = useAuth();
  const [cadastrarAgenciaOpen, setCadastrarAgenciaOpen] = useState(false);
  const [cadastrarIndicadorOpen, setCadastrarIndicadorOpen] = useState(false);
  const [novaAgenciaNome, setNovaAgenciaNome] = useState("");
  const [novaAgenciaCnpj, setNovaAgenciaCnpj] = useState("");
  const [salvandoNovaAgencia, setSalvandoNovaAgencia] = useState(false);
  const { data: executivos = [] } = useQuery({
    queryKey: ["executivos-atendimento"],
    queryFn: () =>
      listExecutivos() as unknown as Promise<{ id: string; nome: string; email: string }[]>,
    enabled: open,
  });
  const [duplicate, setDuplicate] = useState<null | {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    executivo_nome: string | null;
    executivo_id: string | null;
  }>(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<EntityFormData>({
    razao_social: "",
    nome_fantasia: "",
    apelido: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    uf: "",
    cep: "",
    agencia_id: null,
    executivo_id: null,
    observacao: "",
    logo_url: null,
    segmento: null,
    inscricao_estadual: "",
    inscricao_municipal: "",
    cnae: "",
    situacao_cadastral: "",
    website: "",
    instagram: "",
    linkedin: "",
    facebook: "",
    data_aniversario: null,
    status: "ativo",
    indicador_id: null,
    comissao_indicacao_pct: null,
    contatos: initial?.id ? [] : [{ nome: "", funcao: "", email: "", telefone: "" }],
  });
  const [segmentoCustom, setSegmentoCustom] = useState("");
  const [segmentoMode, setSegmentoMode] = useState<"none" | "padrao" | "outro">("none");
  const [clientesVinculados, setClientesVinculados] = useState<Set<string>>(new Set());
  const [clientesVinculadosInicial, setClientesVinculadosInicial] = useState<Set<string>>(
    new Set(),
  );
  const [filtroCliente, setFiltroCliente] = useState("");
  const [importExecOpen, setImportExecOpen] = useState(false);
  const [pendingExcelData, setPendingExcelData] = useState<any[] | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [isImportingBulk, setIsImportingBulk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quando estiver cadastrando/editando uma agência, listar clientes para vincular.
  const { data: clientesAll = [] } = useQuery({
    queryKey: ["clientes-para-vincular"],
    queryFn: () =>
      listClientes() as unknown as Promise<
        Array<{
          id: string;
          razao_social: string;
          nome_fantasia: string | null;
          agencia_id: string | null;
        }>
      >,
    enabled: open && tipo === "agencia",
  });

  // Se a prop agencias não veio (chamada antiga), buscamos aqui para o seletor do cliente.
  const { data: agenciasFetched = [] } = useQuery({
    queryKey: ["agencias-para-vincular"],
    queryFn: async () => {
      const rows = (await listAgencias()) as unknown as Array<{
        id: string;
        razao_social: string;
        nome_fantasia: string | null;
      }>;
      return rows.map((a) => ({ id: a.id, nome: a.nome_fantasia || a.razao_social }));
    },
    enabled: open && tipo === "cliente" && !agencias,
  });
  const agenciasList = agencias ?? agenciasFetched;

  const { data: indicadoresList = [] } = useQuery({
    queryKey: ["indicadores-para-vincular"],
    queryFn: () => listIndicadores(),
    enabled: open && tipo === "cliente",
  });

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDuplicate(null);
    const seg = initial?.segmento ?? null;
    const isCustom = !!seg && !SEGMENTOS_PADRAO.includes(seg);
    setSegmentoCustom(isCustom ? seg! : "");
    setSegmentoMode(!seg ? "none" : isCustom ? "outro" : "padrao");
    setForm({
      id: initial?.id,
      razao_social: initial?.razao_social ?? "",
      nome_fantasia: initial?.nome_fantasia ?? "",
      apelido: initial?.apelido ?? "",
      cnpj: initial?.cnpj ?? "",
      endereco: initial?.endereco ?? "",
      cidade: initial?.cidade ?? "",
      uf: initial?.uf ?? "",
      cep: initial?.cep ?? "",
      agencia_id: initial?.agencia_id ?? null,
      executivo_id: initial?.executivo_id ?? (initial?.id ? null : (user?.id ?? null)),
      observacao: initial?.observacao ?? "",
      logo_url: initial?.logo_url ?? null,
      segmento: seg,
      inscricao_estadual: initial?.inscricao_estadual ?? "",
      inscricao_municipal: initial?.inscricao_municipal ?? "",
      cnae: initial?.cnae ?? "",
      situacao_cadastral: initial?.situacao_cadastral ?? "",
      website: initial?.website ?? "",
      instagram: initial?.instagram ?? "",
      linkedin: initial?.linkedin ?? "",
      facebook: initial?.facebook ?? "",
      data_aniversario: initial?.data_aniversario ?? null,
      status: initial?.status ?? "ativo",
      indicador_id: (initial as any)?.indicador_id ?? null,
      comissao_indicacao_pct: (initial as any)?.comissao_indicacao_pct ?? null,
      contatos:
        initial?.contatos && initial.contatos.length > 0
          ? initial.contatos
          : [{ nome: "", funcao: "", email: "", telefone: "" }],
    });
    setFiltroCliente("");
  }, [open, initial, user?.id]);

  // Pré-seleciona clientes já vinculados a esta agência (modo edição)
  useEffect(() => {
    if (!open || tipo !== "agencia") return;
    if (!initial?.id) {
      setClientesVinculados(new Set());
      setClientesVinculadosInicial(new Set());
      return;
    }
    const ids = new Set(clientesAll.filter((c) => c.agencia_id === initial.id).map((c) => c.id));
    setClientesVinculados(ids);
    setClientesVinculadosInicial(ids);
  }, [open, tipo, initial?.id, clientesAll]);

  // Auto-check duplicates by CNPJ
  useEffect(() => {
    if (!open) return;
    const digits = onlyDigits(form.cnpj ?? "");
    if (digits.length !== 14) {
      setDuplicate(null);
      return;
    }
    if (initial?.id) return; // editing existing
    let cancelled = false;
    setCheckingDup(true);
    const t = setTimeout(async () => {
      try {
        const res = await findByCnpj({ data: { tipo, cnpj: digits } });
        if (!cancelled) setDuplicate(res as never);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCheckingDup(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.cnpj, open, initial?.id, tipo]);

  const doLookup = async (silent = false, specificCnpj?: string) => {
    const targetCnpj = specificCnpj || form.cnpj;
    if (onlyDigits(targetCnpj ?? "").length !== 14) {
      if (!silent) toast.error("Informe um CNPJ válido");
      return null;
    }
    setLoading(true);
    try {
      const d = await fetchCnpj(targetCnpj ?? "");
      const updatedData = {
        cnpj: d.cnpj,
        razao_social: d.razaoSocial || form.razao_social,
        nome_fantasia: form.nome_fantasia || d.nomeFantasia,
        cep: d.cep || form.cep,
        endereco: [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", ") || form.endereco,
        cidade: d.cidade || form.cidade,
        uf: d.estado || form.uf,
        cnae: d.cnae || form.cnae || "",
        situacao_cadastral: d.situacaoCadastral || form.situacao_cadastral || "",
        inscricao_estadual:
          form.inscricao_estadual && form.inscricao_estadual.trim()
            ? form.inscricao_estadual
            : d.inscricaoEstadual || "ISENTA",
        inscricao_municipal:
          form.inscricao_municipal && form.inscricao_municipal.trim()
            ? form.inscricao_municipal
            : d.inscricaoMunicipal || "ISENTA",
        // Adicionando campos para evitar erros de tipagem no bulk import
        website: (d as any).website || "",
      };

      if (!specificCnpj) {
        setForm((f) => ({
          ...f,
          ...updatedData,
        }));
      }

      if (!silent) toast.success("Dados preenchidos pela Receita Federal");
      return updatedData;
    } catch (e) {
      if (!silent) toast.error((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const lookup = () => doLookup(false);

  const processImportedData = async (data: any[], forcedExecId?: string) => {
    try {
      if (data.length === 0) {
        toast.error("Planilha vazia");
        return;
      }

      // Se houver mais de um registro, fazemos a importação em lote (bulk)
      if (data.length > 1) {
        setIsImportingBulk(true);
        const results: ImportResult[] = [];
        setLoading(true);

        for (const row of data) {
          const cnpjRaw = String(row.cnpj || row.CNPJ || "");
          const cnpjDigits = onlyDigits(cnpjRaw);
          const razaoSocial =
            row.razao_social ||
            row.RAZAO_SOCIAL ||
            row["Razão Social"] ||
            row.nome ||
            row.NOME ||
            "Sem nome";

          if (cnpjDigits.length !== 14) {
            results.push({
              razao_social: razaoSocial,
              cnpj: cnpjRaw,
              status: "erro",
              mensagem: "CNPJ inválido",
            });
            continue;
          }

          // Verifica se já possui cadastro
          const exists = await findByCnpj({ data: { tipo, cnpj: cnpjDigits } });
          if (exists) {
            results.push({
              razao_social: razaoSocial,
              cnpj: formatCNPJ(cnpjDigits),
              status: "duplicado",
              mensagem: "Já cadastrado",
            });
            continue;
          }

          try {
            // Busca dados do CNPJ na Receita
            const cnpjData = await doLookup(true, cnpjDigits);
            const email = row.email || row.Email || row.EMAIL || "";
            const atendimentoNome = String(
              row.atendimento || row.Atendimento || row.executivo || row.Executivo || "",
            ).trim();
            const matchedExec = atendimentoNome
              ? executivos.find(
                  (ex) =>
                    ex.nome?.toLowerCase() === atendimentoNome.toLowerCase() ||
                    ex.email?.toLowerCase() === atendimentoNome.toLowerCase(),
                )
              : null;
            const dataAniv = parseDataAniversario(
              row.data_aniversario ||
                row["Data de Aniversário"] ||
                row["Data Aniversario"] ||
                row.aniversario ||
                row.Aniversario,
            );

            const entityData: EntityFormData = {
              razao_social:
                row.razao_social ||
                row.RAZAO_SOCIAL ||
                row["Razão Social"] ||
                cnpjData?.razao_social ||
                razaoSocial,
              nome_fantasia:
                row.nome_fantasia ||
                row.NOME_FANTASIA ||
                row["Nome Fantasia"] ||
                cnpjData?.nome_fantasia ||
                null,
              cnpj: formatCNPJ(cnpjDigits),
              executivo_id:
                matchedExec?.id || forcedExecId || form.executivo_id || user?.id || null,
              contatos: email ? [{ nome: "Importado", email, funcao: "", telefone: "" }] : [],
              website:
                row.website || row.Website || row.site || row.Site || cnpjData?.website || null,
              instagram: row.instagram || row.Instagram || null,
              linkedin: row.linkedin || row.Linkedin || null,
              facebook: row.facebook || row.Facebook || null,
              data_aniversario: dataAniv,
              endereco: cnpjData?.endereco || null,
              cidade: cnpjData?.cidade || null,
              uf: cnpjData?.uf || null,
              cep: cnpjData?.cep || null,
              inscricao_estadual: cnpjData?.inscricao_estadual || "ISENTA",
              inscricao_municipal: cnpjData?.inscricao_municipal || "ISENTA",
              cnae: cnpjData?.cnae || null,
              situacao_cadastral: cnpjData?.situacao_cadastral || null,
              observacao: "Importado via planilha",
              status: "ativo",
            };

            await onSubmit(entityData);
            results.push({
              razao_social: entityData.razao_social,
              cnpj: entityData.cnpj!,
              status: "sucesso",
            });

            // Pequeno delay para evitar rate limits excessivos nas APIs de CNPJ
            await new Promise((r) => setTimeout(r, 600));
          } catch (err) {
            results.push({
              razao_social: razaoSocial,
              cnpj: formatCNPJ(cnpjDigits),
              status: "erro",
              mensagem: (err as Error).message,
            });
          }
        }

        const sCount = results.filter((r) => r.status === "sucesso").length;
        const dCount = results.filter((r) => r.status === "duplicado").length;
        const eCount = results.filter((r) => r.status === "erro").length;

        setImportResults(results);
        toast.info(`Importação concluída: ${sCount} novos, ${dCount} duplicados, ${eCount} erros.`);

        qc.invalidateQueries({ queryKey: [queryKey] });
        qc.invalidateQueries({ queryKey: ["clientes"] });
        qc.invalidateQueries({ queryKey: ["agencias"] });
        return;
      }

      // Comportamento original para apenas 1 registro (preencher o formulário atual)
      const first = data[0];
      const cnpjRaw = String(first.cnpj || first.CNPJ || "");
      const cnpj = onlyDigits(cnpjRaw);

      let cnpjData: any = null;
      if (cnpj.length === 14) {
        cnpjData = await doLookup(true, cnpj);
      }

      const email = first.email || first.Email || first.EMAIL || "";
      const atendimentoNome = String(
        first.atendimento || first.Atendimento || first.executivo || first.Executivo || "",
      ).trim();
      const matchedExec = atendimentoNome
        ? executivos.find(
            (ex) =>
              ex.nome?.toLowerCase() === atendimentoNome.toLowerCase() ||
              ex.email?.toLowerCase() === atendimentoNome.toLowerCase(),
          )
        : null;
      const dataAniv = parseDataAniversario(
        first.data_aniversario ||
          first["Data de Aniversário"] ||
          first["Data Aniversario"] ||
          first.aniversario ||
          first.Aniversario,
      );

      setForm((f) => ({
        ...f,
        ...(cnpjData || {}),
        cnpj: cnpj.length === 14 ? formatCNPJ(cnpj) : f.cnpj,
        razao_social:
          first.razao_social ||
          first.RAZAO_SOCIAL ||
          first["Razão Social"] ||
          cnpjData?.razao_social ||
          f.razao_social,
        nome_fantasia:
          first.nome_fantasia ||
          first.NOME_FANTASIA ||
          first["Nome Fantasia"] ||
          cnpjData?.nome_fantasia ||
          f.nome_fantasia,
        executivo_id: matchedExec?.id || forcedExecId || f.executivo_id,
        contatos: email ? [{ nome: "Importado", email, funcao: "", telefone: "" }] : f.contatos,
        website: first.website || first.Website || first.site || first.Site || f.website,
        instagram: first.instagram || first.Instagram || f.instagram,
        linkedin: first.linkedin || first.Linkedin || f.linkedin,
        facebook: first.facebook || first.Facebook || f.facebook,
        data_aniversario: dataAniv ?? f.data_aniversario,
      }));

      toast.success("Dados importados da planilha. Verifique os campos.");
    } catch (err) {
      toast.error("Erro ao processar dados da planilha");
    } finally {
      setLoading(false);
      setIsImportingBulk(false);
    }
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (isAdmin && executivos.length > 0) {
          setPendingExcelData(data);
          setImportExecOpen(true);
        } else {
          await processImportedData(data);
        }
      } catch (err) {
        toast.error("Erro ao ler planilha");
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Auto-consulta CNPJ ao completar 14 dígitos (apenas em novos cadastros)
  const lastAutoCnpjRef = useRef<string>("");
  useEffect(() => {
    if (!open || initial?.id) return;
    const digits = onlyDigits(form.cnpj ?? "");
    if (digits.length !== 14) return;
    if (lastAutoCnpjRef.current === digits) return;
    if (form.razao_social.trim()) return; // já preenchido manualmente
    lastAutoCnpjRef.current = digits;
    const t = setTimeout(() => {
      doLookup(true);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cnpj, open, initial?.id]);

  const uploadLogo = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) return toast.error("Logo deve ter no máximo 4MB");
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("client-logos").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      // Bucket privado: guardamos apenas o path; URL assinada é gerada na exibição.
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logo enviada");
    } catch (e) {
      toast.error(traduzirErro(e));
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const docDigits = onlyDigits(form.cnpj ?? "");
      const docValid =
        tipo === "cliente"
          ? docDigits.length === 11 || docDigits.length === 14
          : docDigits.length === 14;
      if (!form.cnpj?.trim() || !docValid) {
        throw new Error(
          tipo === "cliente" ? "CPF ou CNPJ válido é obrigatório" : "CNPJ válido é obrigatório",
        );
      }
      if (!form.razao_social.trim()) throw new Error("Razão social obrigatória");

      if (duplicate && !form.id) {
        throw new Error(
          `Já existe um cadastro com este documento (${duplicate.nome_fantasia || duplicate.razao_social}).`,
        );
      }
      const ie = (form.inscricao_estadual ?? "").trim();
      const im = (form.inscricao_municipal ?? "").trim();
      const result = await onSubmit({
        ...form,
        inscricao_estadual: ie || "ISENTA",
        inscricao_municipal: im || "ISENTA",
        contatos: form.contatos.filter((c) => c.nome?.trim()),
      });
      // Vincular/desvincular clientes desta agência
      if (tipo === "agencia") {
        const agenciaId = (result as { id?: string } | undefined)?.id ?? form.id;
        if (agenciaId) {
          const toLink = [...clientesVinculados].filter((id) => !clientesVinculadosInicial.has(id));
          const toUnlink = [...clientesVinculadosInicial].filter(
            (id) => !clientesVinculados.has(id),
          );
          if (toLink.length > 0) {
            const { error } = await supabase
              .from("clientes")
              .update({ agencia_id: agenciaId })
              .in("id", toLink);
            if (error) throw new Error(`Falha ao vincular clientes: ${error.message}`);
          }
          if (toUnlink.length > 0) {
            const { error } = await supabase
              .from("clientes")
              .update({ agencia_id: null })
              .in("id", toUnlink);
            if (error) throw new Error(`Falha ao desvincular clientes: ${error.message}`);
          }
        }
      }
      return result;
    },
    onSuccess: (res: any) => {
      toast.success("Salvo com sucesso");
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["agencias"] });
      qc.invalidateQueries({ queryKey: ["clientes-para-vincular"] });
      onOpenChange(false);
      if (onSuccess) onSuccess(res);
    },
    onError: (e: Error) => toast.error(traduzirErro(e)),
  });

  const handleValidateAndSave = () => {
    const errs: Record<string, string> = {};
    const docDigits = onlyDigits(form.cnpj ?? "");
    const docValid =
      tipo === "cliente"
        ? docDigits.length === 11 || docDigits.length === 14
        : docDigits.length === 14;

    if (!form.cnpj?.trim()) {
      errs.cnpj = tipo === "cliente" ? "CPF ou CNPJ é obrigatório." : "CNPJ é obrigatório.";
    } else if (!docValid) {
      errs.cnpj =
        tipo === "cliente"
          ? "Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ)."
          : "CNPJ deve conter 14 dígitos.";
    }

    if (!form.razao_social?.trim()) {
      errs.razao_social = "Razão social é obrigatória.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Por favor, preencha os campos obrigatórios destacados em vermelho.");
      scrollToFirstError(errs);
      return;
    }

    setErrors({});
    save.mutate();
  };

  const updateContato = (i: number, patch: Partial<Contato>) =>
    setForm((f) => ({
      ...f,
      contatos: f.contatos.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            const t = e.target as Element | null;
            if (
              t?.closest(
                "[data-radix-select-content],[data-radix-select-viewport],[data-radix-popper-content-wrapper]",
              )
            ) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            e.stopPropagation();
          }}
          onPointerDownOutside={(e) => {
            e.stopPropagation();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Busque pelo CNPJ para preencher automaticamente.</span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="excel-import"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={importExcel}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={() => document.getElementById("excel-import")?.click()}
                  disabled={loading}
                >
                  <FileSpreadsheet className="size-3 mr-1" />
                  Importar Excel
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5" data-field="cnpj">
              <Label htmlFor="entity-cnpj" className={errorLabelClass(!!errors.cnpj)}>
                {tipo === "cliente" ? "CPF / CNPJ *" : "CNPJ *"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="entity-cnpj"
                  name="cnpj"
                  error={errors.cnpj}
                  value={form.cnpj ?? ""}
                  placeholder={tipo === "cliente" ? "CPF ou CNPJ" : "00.000.000/0000-00"}
                  maxLength={18}
                  inputMode="numeric"
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      cnpj:
                        tipo === "cliente" ? formatDoc(e.target.value) : formatCNPJ(e.target.value),
                    }));
                    if (errors.cnpj) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.cnpj;
                        return next;
                      });
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={lookup} disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  <span className="ml-2">Buscar</span>
                </Button>
              </div>
              <FormFieldError message={errors.cnpj} />
              <p className="text-[11px] text-muted-foreground">
                A consulta é automática ao digitar os 14 dígitos.
              </p>
              {loading && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Consultando Receita Federal…
                </p>
              )}
              {(form.cnae || form.situacao_cadastral) && (
                <div className="grid sm:grid-cols-2 gap-2 pt-1">
                  {form.situacao_cadastral && (
                    <div className="text-xs rounded-md border bg-muted/30 px-2 py-1.5">
                      <div className="text-muted-foreground">Situação cadastral</div>
                      <div
                        className={`font-medium ${form.situacao_cadastral === "ATIVA" ? "text-success" : "text-destructive"}`}
                      >
                        {form.situacao_cadastral}
                      </div>
                    </div>
                  )}
                  {form.cnae && (
                    <div className="text-xs rounded-md border bg-muted/30 px-2 py-1.5">
                      <div className="text-muted-foreground">CNAE principal</div>
                      <div className="font-medium truncate" title={form.cnae}>
                        {form.cnae}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {checkingDup && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Verificando atendimento existente…
                </p>
              )}
              {duplicate && !form.id && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-destructive">
                      Já existe cadastro com este CNPJ
                    </div>
                    <div className="text-muted-foreground">
                      <strong>{duplicate.nome_fantasia || duplicate.razao_social}</strong>
                      {" — atendimento: "}
                      <strong>{duplicate.executivo_nome || "sem responsável"}</strong>.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipo === "cliente" ? (
                    <>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="ativo">Ativa</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                      <SelectItem value="bloqueada">Bloqueada</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <UserCheck className="size-4" /> Atendimento (executivo responsável)
                </Label>
                <Select
                  value={form.executivo_id ?? "__none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, executivo_id: v === "__none" ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o executivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sem atendimento</SelectItem>
                    {executivos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipo === "cliente" && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="size-4" /> Agência vinculada
                </Label>
                <Select
                  value={form.agencia_id ?? "__none"}
                  onValueChange={(v) => {
                    if (v === "__nova_agencia__") {
                      setCadastrarAgenciaOpen(true);
                      return;
                    }
                    setForm((f) => ({ ...f, agencia_id: v === "__none" ? null : v }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a agência (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__nova_agencia__"
                      className="text-primary font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-primary/10 cursor-pointer"
                    >
                      ➕ Cadastrar Nova Agência...
                    </SelectItem>
                    <SelectItem value="__none">Sem agência (cliente direto)</SelectItem>
                    {agenciasList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Vincule este cliente a uma agência de publicidade.
                </p>
              </div>
            )}

            {tipo === "cliente" && (
              <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <UserCheck className="size-4 text-emerald-600" />
                    Indicado por (Pessoa que indicou / Representação)
                  </Label>
                  {form.indicador_id && (
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 font-bold">
                      Comissão: {form.comissao_indicacao_pct ?? 5}%
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <Select
                      value={form.indicador_id ?? "__none"}
                      onValueChange={(v) => {
                        if (v === "__novo_indicador__") {
                          setCadastrarIndicadorOpen(true);
                          return;
                        }
                        const indId = v === "__none" ? null : v;
                        const indSel = (indicadoresList as any[]).find((i: any) => i.id === indId);
                        setForm((f) => ({
                          ...f,
                          indicador_id: indId,
                          comissao_indicacao_pct: indSel ? indSel.percentual_comissao_padrao : null,
                        }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione quem indicou (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="__novo_indicador__"
                          className="text-primary font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-primary/10 cursor-pointer"
                        >
                          ➕ Cadastrar Novo Indicador...
                        </SelectItem>
                        <SelectItem value="__none">Nenhuma indicação (Cliente Direto / Próprio)</SelectItem>
                        {(indicadoresList as any[]).map((ind: any) => (
                          <SelectItem key={ind.id} value={ind.id}>
                            {ind.nome} ({ind.percentual_comissao_padrao}% padrão)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.indicador_id && (
                    <div>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="% Comissão"
                        className="h-8 text-xs font-semibold"
                        value={form.comissao_indicacao_pct ?? 5}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            comissao_indicacao_pct: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Quando este cliente fechar contrato e pagar, a pessoa que indicou receberá esta porcentagem de remuneração.
                </p>
              </div>
            )}

            {tipo === "agencia" && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="size-4" /> Clientes vinculados
                </Label>
                <Input
                  placeholder="Buscar cliente…"
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                  {clientesAll.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </div>
                  )}
                  {clientesAll
                    .filter((c) => {
                      const q = filtroCliente.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (c.nome_fantasia || "").toLowerCase().includes(q) ||
                        c.razao_social.toLowerCase().includes(q)
                      );
                    })
                    .map((c) => {
                      const checked = clientesVinculados.has(c.id);
                      const outraAg = c.agencia_id && c.agencia_id !== initial?.id;
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 p-2 text-sm hover:bg-muted/40 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setClientesVinculados((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(c.id);
                                else next.delete(c.id);
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{c.nome_fantasia || c.razao_social}</div>
                            {outraAg && !checked && (
                              <div className="text-[10px] text-amber-600">
                                Já vinculado a outra agência — marcar irá transferir.
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Selecione os clientes que esta agência atende. As alterações são aplicadas ao
                  salvar.
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className={errors.razao_social ? errorLabelClass : undefined}>Razão Social *</Label>
                <Input
                  data-field="razao_social"
                  error={errors.razao_social}
                  value={form.razao_social}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, razao_social: e.target.value }));
                    if (errors.razao_social) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.razao_social;
                        return copy;
                      });
                    }
                  }}
                />
                <FormFieldError message={errors.razao_social} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={form.nome_fantasia ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Apelido / Como chamamos{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (apenas para facilitar a busca)
                  </span>
                </Label>
                <Input
                  placeholder="Ex.: nome curto, sigla ou apelido interno"
                  value={form.apelido ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={form.endereco ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  value={form.cep ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input
                  maxLength={2}
                  value={form.uf ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Inscrição Estadual</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setForm((f) => ({ ...f, inscricao_estadual: "ISENTA" }))}
                  >
                    ISENTA
                  </button>
                </div>
                <Input
                  placeholder="Informe a IE ou marque ISENTA"
                  value={form.inscricao_estadual ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Inscrição Municipal</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setForm((f) => ({ ...f, inscricao_municipal: "ISENTA" }))}
                  >
                    ISENTA
                  </button>
                </div>
                <Input
                  placeholder="Informe a IM ou marque ISENTA"
                  value={form.inscricao_municipal ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, inscricao_municipal: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Aniversário {tipo === "cliente" ? "do cliente" : "da agência"} (DD/MM)
                </Label>
                <Input
                  placeholder="DD/MM"
                  maxLength={5}
                  value={form.data_aniversario ?? ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                    const formatted =
                      digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                    setForm((f) => ({ ...f, data_aniversario: formatted || null }));
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Apenas dia e mês — usado em lembretes e felicitações.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2 pt-2 border-t">
                <Label className="flex items-center gap-2">
                  <Globe className="size-4 text-primary" /> Website e Redes Sociais
                </Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Globe className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Website (ex: www.cliente.com.br)"
                      value={form.website ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Instagram className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Instagram (ex: @cliente)"
                      value={form.instagram ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Linkedin className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="LinkedIn (URL ou perfil)"
                      value={form.linkedin ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Facebook className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Facebook (URL ou perfil)"
                      value={form.facebook ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {tipo === "cliente" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Segmento de atuação</Label>
                  <Select
                    value={
                      segmentoMode === "none"
                        ? "__none"
                        : segmentoMode === "outro"
                          ? "__outro"
                          : (form.segmento ?? "__none")
                    }
                    onValueChange={(v) => {
                      if (v === "__none") {
                        setSegmentoMode("none");
                        setForm((f) => ({ ...f, segmento: null }));
                        setSegmentoCustom("");
                      } else if (v === "__outro") {
                        setSegmentoMode("outro");
                        setForm((f) => ({ ...f, segmento: segmentoCustom || null }));
                      } else {
                        setSegmentoMode("padrao");
                        setForm((f) => ({ ...f, segmento: v }));
                        setSegmentoCustom("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento">
                        {segmentoMode === "none"
                          ? "— Não informado —"
                          : segmentoMode === "outro"
                            ? segmentoCustom || "Outro (digitar)"
                            : form.segmento}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Não informado —</SelectItem>
                      {SEGMENTOS_PADRAO.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                      <SelectItem value="__outro">Outro (digitar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {segmentoMode === "outro" && (
                    <Input
                      placeholder="Digite o segmento personalizado"
                      value={segmentoCustom}
                      onChange={(e) => {
                        setSegmentoCustom(e.target.value);
                        setForm((f) => ({ ...f, segmento: e.target.value || null }));
                      }}
                      maxLength={120}
                    />
                  )}
                </div>
              )}
            </div>

            {showLogo && (
              <div className="space-y-1.5">
                <Label>Logo do Cliente (usada na apresentação)</Label>
                <div className="flex items-center gap-3">
                  {form.logo_url && (
                    <div className="relative h-16 w-16 rounded-md border bg-muted/30 overflow-hidden">
                      <LogoImg
                        stored={form.logo_url}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, logo_url: null }))}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLogo(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="size-4 mr-2" />
                    )}
                    {form.logo_url ? "Trocar logo" : "Enviar logo"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contatos</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      contatos: [...f.contatos, { nome: "", funcao: "", email: "", telefone: "" }],
                    }))
                  }
                >
                  <Plus className="size-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              {form.contatos.map((c, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 border rounded-md p-2">
                  <Input
                    placeholder="Nome"
                    value={c.nome}
                    onChange={(e) => updateContato(i, { nome: e.target.value })}
                  />
                  <Input
                    placeholder="Cargo (ex: Diretor de Marketing)"
                    value={c.cargo ?? ""}
                    onChange={(e) => updateContato(i, { cargo: e.target.value })}
                  />
                  <Input
                    placeholder="Função"
                    value={c.funcao ?? ""}
                    onChange={(e) => updateContato(i, { funcao: e.target.value })}
                  />
                  <Input
                    placeholder="E-mail"
                    value={c.email ?? ""}
                    onChange={(e) => updateContato(i, { email: e.target.value })}
                  />
                  <Input
                    placeholder="Telefone"
                    value={c.telefone ?? ""}
                    onChange={(e) => updateContato(i, { telefone: e.target.value })}
                  />
                  <Input
                    placeholder="Aniversário (DD/MM)"
                    maxLength={5}
                    value={c.aniversario ?? ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                      const formatted =
                        digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                      updateContato(i, { aniversario: formatted });
                    }}
                  />
                  <div className="flex justify-end">
                    {form.contatos.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            contatos: f.contatos.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea
                rows={3}
                value={form.observacao ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </div>

            {initial?.id && (
              <div className="pt-2 border-t">
                <PisAnexosSection
                  clienteId={tipo === "cliente" ? initial.id : null}
                  agenciaId={tipo === "agencia" ? initial.id : null}
                  hint="Anexe PIs anteriores ou atuais que não foram gerados pelo sistema."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleValidateAndSave} disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importExecOpen} onOpenChange={setImportExecOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Importar Planilha</DialogTitle>
            <DialogDescription>Para qual executivo deseja importar esses dados?</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Executivo Responsável</Label>
              <Select
                onValueChange={(v) => {
                  if (pendingExcelData) {
                    processImportedData(pendingExcelData, v === "__none" ? undefined : v);
                    setImportExecOpen(false);
                    setPendingExcelData(null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o executivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Manter padrão</SelectItem>
                  {executivos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                if (pendingExcelData) processImportedData(pendingExcelData);
                setImportExecOpen(false);
                setPendingExcelData(null);
              }}
            >
              Pular / Manter Padrão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cadastrarAgenciaOpen} onOpenChange={setCadastrarAgenciaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Cadastrar Nova Agência
            </DialogTitle>
            <DialogDescription>
              Informe os dados da agência parceira para vincular a este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">CNPJ da Agência (opcional)</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={novaAgenciaCnpj}
                onChange={(e) => setNovaAgenciaCnpj(formatCNPJ(e.target.value))}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Razão Social / Nome da Agência *</Label>
              <Input
                placeholder="Nome da agência"
                value={novaAgenciaNome}
                onChange={(e) => setNovaAgenciaNome(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCadastrarAgenciaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvandoNovaAgencia || !novaAgenciaNome.trim()}
              onClick={async () => {
                if (!novaAgenciaNome.trim()) return;
                setSalvandoNovaAgencia(true);
                try {
                  const res = await upsertAgencia({
                    data: {
                      razao_social: novaAgenciaNome.trim(),
                      cnpj: novaAgenciaCnpj.trim() || null,
                      status: "ativo",
                      contatos: [],
                    },
                  });
                  qc.invalidateQueries({ queryKey: ["agencias"] });
                  if (res?.id) {
                    setForm((f) => ({ ...f, agencia_id: res.id }));
                  }
                  toast.success(`Agência "${novaAgenciaNome.trim()}" cadastrada!`);
                  setCadastrarAgenciaOpen(false);
                  setNovaAgenciaNome("");
                  setNovaAgenciaCnpj("");
                } catch (e: any) {
                  toast.error(traduzirErro(e) || "Erro ao cadastrar agência");
                } finally {
                  setSalvandoNovaAgencia(false);
                }
              }}
            >
              {salvandoNovaAgencia ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Plus className="size-3 mr-1" />
              )}
              Salvar e Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IndicadorFormDialog
        open={cadastrarIndicadorOpen}
        onOpenChange={setCadastrarIndicadorOpen}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["indicadores"] });
        }}
      />

      <ImportReportDialog
        open={!!importResults}
        results={importResults || []}
        onOpenChange={(v) => !v && setImportResults(null)}
      />
    </>
  );
}

function ImportReportDialog({
  results,
  open,
  onOpenChange,
}: {
  results: ImportResult[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const sucessos = results.filter((r) => r.status === "sucesso").length;
  const duplicados = results.filter((r) => r.status === "duplicado").length;
  const erros = results.filter((r) => r.status === "erro").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle>Relatório de Importação</DialogTitle>
            <DialogDescription>Resumo do processamento da planilha.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="bg-green-50 p-2.5 rounded-lg border border-green-100 flex flex-col items-center">
              <div className="text-green-600 text-xs font-medium uppercase tracking-wider">
                Sucesso
              </div>
              <div className="text-xl font-bold text-green-700">{sucessos}</div>
            </div>
            <div className="bg-yellow-50 p-2.5 rounded-lg border border-yellow-100 flex flex-col items-center">
              <div className="text-yellow-600 text-xs font-medium uppercase tracking-wider">
                Existentes
              </div>
              <div className="text-xl font-bold text-yellow-700">{duplicados}</div>
            </div>
            <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 flex flex-col items-center">
              <div className="text-red-600 text-xs font-medium uppercase tracking-wider">Erros</div>
              <div className="text-xl font-bold text-red-700">{erros}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9">Entidade</TableHead>
                  <TableHead className="h-9">CNPJ</TableHead>
                  <TableHead className="h-9">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell
                      className="py-2 text-[13px] max-w-[180px] truncate"
                      title={r.razao_social}
                    >
                      {r.razao_social}
                    </TableCell>
                    <TableCell className="py-2 text-[12px] whitespace-nowrap">{r.cnpj}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        {r.status === "sucesso" && (
                          <Badge className="bg-green-500 text-[10px] h-4">Sucesso</Badge>
                        )}
                        {r.status === "duplicado" && (
                          <Badge
                            variant="outline"
                            className="text-yellow-600 border-yellow-600 text-[10px] h-4"
                          >
                            Ignorado
                          </Badge>
                        )}
                        {r.status === "erro" && (
                          <>
                            <Badge variant="destructive" className="text-[10px] h-4">
                              Erro
                            </Badge>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {r.mensagem}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 mt-auto border-t">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
