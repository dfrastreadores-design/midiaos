import { useEffect, useState, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriceCalculator, type CalcItemOut, type CalcTotals } from "@/components/PriceCalculator";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { upsertPi, substituirPi, enviarPiParaAprovacao } from "@/lib/pi.functions";
import { notificarRenovacaoPi, agendarFollowUpRenovacao } from "@/lib/notificacoes.functions";
import { vincularPropostaAoPi } from "@/lib/propostas.functions";
import { getMeuPerfil, listUsuarios } from "@/lib/usuarios.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { buildProdutoObservacoes, mergeObservacao } from "@/lib/produto-observacoes";
import { useUserRoles } from "@/hooks/use-roles";
import { useActingAsExecutivo } from "@/hooks/use-acting-as";

import { listEmissoras } from "@/lib/emissoras.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Calendar, Calculator, Receipt, FileText, Info, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { NovoClienteButton, NovaAgenciaButton } from "@/components/QuickCadastroButtons";
import { EntidadeSearchSelect } from "@/components/EntidadeSearchSelect";
import { PisAnexosSection } from "@/components/PisAnexosSection";
import { InvestimentoMensalSection, serializeInvestimentosMensais } from "@/components/InvestimentoMensalSection";
import { useFormErrors, errorFieldClass, errorInputClass, type FieldErrors } from "@/lib/form-errors";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propostaOrigemId?: string | null;
  renovadoDeId?: string | null;
  initial?: {

    id?: string;
    original_pi_id?: string;
    numero?: string;
    cliente_id?: string | null;
    agencia_id?: string | null;
    campanha?: string;
    mes_veiculacao?: number;
    ano_veiculacao?: number;
    observacao?: string | null;
    faturamento_contra?: "cliente" | "agencia" | null;
    faturamento_tipo?: "bruto" | "liquido" | null;
    data_faturamento?: string | null;
    data_envio_nota?: string | null;
    data_vencimento_nota?: string | null;
    vencimento_tipo?: string | null;
    permuta?: boolean | null;
    permuta_detalhes?: string | null;
    permuta_valor_faturado?: number | null;
    valor_opec?: number | null;
    executivo_id?: string | null;
    responsavel_negociacao_id?: string | null;
    executivo_execucao_id?: string | null;
    valor_manual?: number | null;
    email_faturamento?: string | null;
    producao_tipo?: "cliente" | "interna" | null;
    producao_contato?: string | null;
    producao_data?: string | null;
    producao_material_tipo?: string | null;
    producao_localizacao?: string | null;
    producao_observacoes?: string | null;
    permuta_uso?: "empresa" | "comercial" | null;
    emissora_id?: string | null;
    sem_comissao?: boolean | null;
    status?: string | null;
    itens?: CalcItemOut[];
    investimentos_mensais?: Record<string, number> | null;
  };
};


export function PiFormDialog({ open, onOpenChange, initial, propostaOrigemId, renovadoDeId }: Props) {
  const { roles, isAdmin: isGlobalAdmin, isSuperAdmin } = useUserRoles();
  const isProducaoOnly = roles.includes("producao") && !roles.includes("admin") && !roles.includes("executivo") && !roles.includes("opec");
  // Perfis internos (OPEC/financeiro/diretoria/admin) veem valores internos da permuta.
  // Vendedor (executivo) vê apenas o valor que aparece para o cliente.
  const canSeeInternalPermuta =
    isSuperAdmin || isGlobalAdmin ||
    roles.includes("opec") || roles.includes("financeiro") || roles.includes("diretoria");
  const isVendedorOnly = roles.includes("executivo") && !canSeeInternalPermuta;
  
  const qc = useQueryClient();
  const navigate = useNavigate();

  const now = new Date();
  const [clienteId, setClienteId] = useState<string>(initial?.cliente_id ?? "");
  const [agenciaId, setAgenciaId] = useState<string>(initial?.agencia_id ?? "");
  const [temAgencia, setTemAgencia] = useState<boolean>(!!initial?.agencia_id);

  const [campanha, setCampanha] = useState(initial?.campanha ?? "");
  const [mes, setMes] = useState(initial?.mes_veiculacao ?? now.getMonth() + 1);
  const [ano, setAno] = useState(initial?.ano_veiculacao ?? now.getFullYear());
  const [mesMeta, setMesMeta] = useState<number | null>((initial as any)?.mes_meta ?? null);
  const [anoMeta, setAnoMeta] = useState<number | null>((initial as any)?.ano_meta ?? null);
  const [observacao, setObservacao] = useState(initial?.observacao ?? "");
  const [items, setItems] = useState<CalcItemOut[]>([]);
  const [totals, setTotals] = useState<CalcTotals>({ tabela: 0, desconto: 0, negociado: 0, insercoes: 0 });
  const [fatContra, setFatContra] = useState<"" | "cliente" | "agencia">(initial?.faturamento_contra ?? "");
  const [fatTipo, setFatTipo] = useState<"" | "bruto" | "liquido">(initial?.faturamento_tipo ?? "");
  const [dataFat, setDataFat] = useState<string>((initial?.data_faturamento ?? "").split("T")[0]);
  const [dataEnvio, setDataEnvio] = useState<string>((initial?.data_envio_nota ?? "").split("T")[0]);
  const [dataVenc, setDataVenc] = useState<string>((initial?.data_vencimento_nota ?? "").split("T")[0]);
  const [vencTipo, setVencTipo] = useState<string>(initial?.vencimento_tipo ?? "manual");
  const [permuta, setPermuta] = useState<boolean>(initial?.permuta ?? false);
  const [permutaDetalhes, setPermutaDetalhes] = useState<string>(initial?.permuta_detalhes ?? "");
  const [permutaValorFaturado, setPermutaValorFaturado] = useState<string>(
    initial?.permuta_valor_faturado ? String(initial.permuta_valor_faturado).replace(".", ",") : ""
  );
  const [permutaValor, setPermutaValor] = useState<string>("");
  const [valorOpec, setValorOpec] = useState<string>(
    initial?.valor_opec != null ? String(initial.valor_opec).replace(".", ",") : ""
  );
  const actingAs = useActingAsExecutivo();
  const [execId, setExecId] = useState<string>(initial?.executivo_id ?? actingAs ?? "");

  const [negocId, setNegocId] = useState<string>(initial?.responsavel_negociacao_id ?? "");
  const [execucaoId, setExecucaoId] = useState<string>(initial?.executivo_execucao_id ?? "");
  const [valorManualAtivo, setValorManualAtivo] = useState<boolean>(initial?.valor_manual != null);
  const [valorManual, setValorManual] = useState<string>(
    initial?.valor_manual != null ? String(initial.valor_manual).replace(".", ",") : ""
  );
  const [emailFaturamento, setEmailFaturamento] = useState(initial?.email_faturamento ?? "");
  
  const [producaoTipo, setProducaoTipo] = useState<"cliente" | "interna" | "">(initial?.producao_tipo ?? "");
  const [producaoContato, setProducaoContato] = useState(initial?.producao_contato ?? "");
  const [producaoData, setProducaoData] = useState(initial?.producao_data ? initial.producao_data.split("T")[0] : "");
  const [producaoMaterial, setProducaoMaterial] = useState(initial?.producao_material_tipo ?? "");
  const [producaoLocal, setProducaoLocal] = useState(initial?.producao_localizacao ?? "");
  const [producaoObs, setProducaoObs] = useState(initial?.producao_observacoes ?? "");
  const [producaoEmail, setProducaoEmail] = useState("");
  const [permutaUso, setPermutaUso] = useState<"empresa" | "comercial" | "">(initial?.permuta_uso ?? "empresa");
  const [emissoraId, setEmissoraId] = useState<string>(initial?.emissora_id ?? "");
  const [semComissao, setSemComissao] = useState<boolean>(!!initial?.sem_comissao);

  // Investimento mensal do cliente por mês do contrato (chave "YYYY-MM").
  // Vazio → PDF usa a soma automática das entregas daquele mês.
  const [investimentosMensais, setInvestimentosMensais] = useState<Record<string, string>>(() => {
    const src = initial?.investimentos_mensais ?? {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(src)) {
      if (v != null) out[k] = String(v).replace(".", ",");
    }
    return out;
  });

  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: () => listClientes() });
  const { data: agencias = [] } = useQuery({ queryKey: ["agencias"], queryFn: () => listAgencias() });
  const { data: produtos = [] } = useQuery({ queryKey: ["produtos"], queryFn: () => listProdutos() });
  const { data: emissoras = [] } = useQuery({ queryKey: ["emissoras"], queryFn: () => listEmissoras() });

  // Seleciona emissora padrão se nenhuma foi escolhida
  useEffect(() => {
    if (emissoraId) return;
    // 1) Tenta deduzir pela emissora vinculada ao 1º produto dos itens
    const prods = produtos as Array<{ id: string; tipo: string | null; programa: string | null; formato: string | null; emissora_id: string | null }>;
    for (const it of items) {
      const p = prods.find(
        (x) =>
          (x.tipo ?? "") === (it.tipo ?? "") &&
          (x.programa ?? "") === (it.programa ?? "") &&
          (x.formato ?? "") === (it.formato ?? ""),
      );
      if (p?.emissora_id) {
        setEmissoraId(p.emissora_id);
        return;
      }
    }
    // 2) Fallback: emissora padrão
    const ativas = (emissoras as Array<{ id: string; padrao: boolean; ativo: boolean }>).filter((e) => e.ativo);
    const padrao = ativas.find((e) => e.padrao) ?? (ativas.length === 1 ? ativas[0] : null);
    if (padrao) setEmissoraId(padrao.id);
  }, [emissoras, emissoraId, items, produtos]);

  const targetEntityId = fatContra === "agencia" ? agenciaId : clienteId;
  const targetEntity = useMemo(() => {
    const entities = fatContra === "agencia" ? agencias : clientes;
    return (entities as any[]).find((e: any) => e.id === targetEntityId);
  }, [fatContra, targetEntityId, agencias, clientes]);

  const autoContato = useMemo(() => {
    if (!targetEntity?.contatos || !Array.isArray(targetEntity.contatos)) return "";
    return targetEntity.contatos[0]?.nome || "";
  }, [targetEntity]);

  const autoEmail = useMemo(() => {
    if (!targetEntity?.contatos || !Array.isArray(targetEntity.contatos)) return "";
    return targetEntity.contatos[0]?.email || targetEntity.contatos.find((c: any) => c?.email)?.email || "";
  }, [targetEntity]);

  const autoEndereco = useMemo(() => {
    return targetEntity?.endereco || "";
  }, [targetEntity]);


  // Sugestão automática: com agência → líquido; sem agência → bruto.
  // O usuário pode alterar manualmente abaixo.
  useEffect(() => {
    if (agenciaId) {
      setFatTipo((prev) => prev || "liquido");
      setFatContra((prev) => prev || "agencia");
    } else {
      // Sem agência: força Bruto e faturar contra Cliente (não há comissão).
      setFatTipo("bruto");
      setFatContra((prev) => (prev === "agencia" ? "cliente" : prev || "cliente"));
    }
  }, [agenciaId]);

  // Atribuição automática do executivo (atendimento) conforme cadastro
  // do cliente ou agência. Só aplica em PI novo (sem id) e quando o
  // usuário ainda não escolheu manualmente um executivo.
  useEffect(() => {
    if (initial?.id) return;
    const cli = (clientes as any[]).find((c) => c.id === clienteId);
    const ag = (agencias as any[]).find((a) => a.id === agenciaId);
    const autoExec = cli?.executivo_id || ag?.executivo_id || null;
    if (!autoExec) return;
    setExecId((prev) => (prev ? prev : autoExec));
  }, [clienteId, agenciaId, clientes, agencias, initial?.id]);





  useEffect(() => {
    if (!open) return;
    setClienteId(initial?.cliente_id ?? "");
    setAgenciaId(initial?.agencia_id ?? "");
    setTemAgencia(!!initial?.agencia_id);

    setCampanha(initial?.campanha ?? "");
    setMes(initial?.mes_veiculacao ?? now.getMonth() + 1);
    setAno(initial?.ano_veiculacao ?? now.getFullYear());
    setMesMeta((initial as any)?.mes_meta ?? null);
    setAnoMeta((initial as any)?.ano_meta ?? null);
    setObservacao(initial?.observacao ?? "");
    setFatContra(initial?.faturamento_contra ?? "");
    setFatTipo(initial?.faturamento_tipo ?? "");
    setDataFat((initial?.data_faturamento ?? "").split("T")[0]);
    setDataEnvio((initial?.data_envio_nota ?? "").split("T")[0]);
    setDataVenc((initial?.data_vencimento_nota ?? "").split("T")[0]);
    setVencTipo(initial?.vencimento_tipo ?? "manual");
    setPermuta(initial?.permuta ?? false);
    setPermutaDetalhes(initial?.permuta_detalhes ?? "");
    setPermutaValorFaturado(initial?.permuta_valor_faturado ? String(initial.permuta_valor_faturado).replace(".", ",") : "");
    {
      const vn = Number((initial as any)?.valor_negociado ?? 0);
      const vf = Number(initial?.permuta_valor_faturado ?? 0);
      const vp = Math.max(vn - vf, 0);
      setPermutaValor(initial?.permuta && vp > 0 ? String(vp.toFixed(2)).replace(".", ",") : "");
    }
    setValorOpec(initial?.valor_opec != null ? String(initial.valor_opec).replace(".", ",") : "");
    setExecId(initial?.executivo_id ?? actingAs ?? "");
    setNegocId(initial?.responsavel_negociacao_id ?? "");
    setExecucaoId(initial?.executivo_execucao_id ?? "");
    setValorManualAtivo(initial?.valor_manual != null);
    setValorManual(initial?.valor_manual != null ? String(initial.valor_manual).replace(".", ",") : "");
    setEmailFaturamento(initial?.email_faturamento ?? "");
    setProducaoTipo(initial?.producao_tipo ?? "");
    setProducaoContato(initial?.producao_contato ?? "");
    setProducaoData(initial?.producao_data ? initial.producao_data.split("T")[0] : "");
    setProducaoMaterial(initial?.producao_material_tipo ?? "");
    setProducaoLocal(initial?.producao_localizacao ?? "");
    setProducaoObs(initial?.producao_observacoes ?? "");
    setPermutaUso(initial?.permuta_uso ?? "empresa");
    setEmissoraId(initial?.emissora_id ?? "");
    setSemComissao(!!initial?.sem_comissao);
    {
      const src = initial?.investimentos_mensais ?? {};
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(src)) {
        if (v != null) next[k] = String(v).replace(".", ",");
      }
      setInvestimentosMensais(next);
    }



    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id, initial?.executivo_id]);

  useEffect(() => {
    if (vencTipo === "manual") return;
    
    let targetMes = mes + 1;
    let targetAno = ano;
    if (targetMes > 12) {
      targetMes = 1;
      targetAno += 1;
    }
    
    const dia = vencTipo === "15dfm" ? 15 : 30;
    // Para 30 dfm, garantimos que não passe do último dia do mês (ex: Fevereiro)
    const ultimoDiaDoMes = new Date(targetAno, targetMes, 0).getDate();
    const diaFinal = Math.min(dia, ultimoDiaDoMes);

    // Monta YYYY-MM-DD direto, sem passar por Date/toISOString (evita shift de timezone)
    const mm = String(targetMes).padStart(2, "0");
    const dd = String(diaFinal).padStart(2, "0");
    setDataVenc(`${targetAno}-${mm}-${dd}`);
  }, [vencTipo, mes, ano]);

  const { data: meu } = useQuery({ queryKey: ["meu-perfil"], queryFn: () => getMeuPerfil() });
  const isAdmin = !!meu?.isAdmin || isGlobalAdmin || isSuperAdmin;
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listUsuarios(),
    enabled: isAdmin,
  });
  const executivos = useMemo(
    () => (usuarios as Array<{ id: string; nome: string; email: string; ativo: boolean; roles: string[] }>)
      .filter((u) => u.ativo && (u.roles.includes("executivo") || u.roles.includes("admin"))),
    [usuarios],
  );

  const parceiros = useMemo(
    () => (usuarios as Array<{ id: string; nome: string; email: string; ativo: boolean; roles: string[] }>)
      .filter((u) => u.ativo && u.roles.includes("parceiro_comercial")),
    [usuarios],
  );

  const obsProdutos = buildProdutoObservacoes(items, produtos as any[]);

  // Auto-fill do e-mail de faturamento caso esteja vazio
  useEffect(() => {
    if (!open || emailFaturamento) return;

    const targetId = fatContra === "agencia" ? agenciaId : clienteId;
    if (!targetId) return;

    const entities = fatContra === "agencia" ? agencias : clientes;
    const entity = (entities as any[]).find((e: any) => e.id === targetId);
    
    if (entity?.contatos && Array.isArray(entity.contatos)) {
      const email = entity.contatos[0]?.email || entity.contatos.find((c: any) => c?.email)?.email || "";
      if (email) setEmailFaturamento(email);
    }
  }, [clienteId, agenciaId, fatContra, open, emailFaturamento, clientes, agencias]);


  const anos = useMemo(() => Array.from({ length: 6 }, (_, i) => now.getFullYear() - 1 + i), [now]);

  // Bruto = Custo Total c/Desc. Líquido = bruto - 20% (comissão de agência).
  const valorBruto = totals.negociado;
  const valorLiquido = agenciaId && fatTipo === "liquido" ? +(valorBruto * 0.8).toFixed(2) : valorBruto;
  const valorCalculado = fatTipo === "liquido" ? valorLiquido : valorBruto;
  const valorManualNum = Number((valorManual || "").replace(/\./g, "").replace(",", ".")) || 0;
  const valorFinal = valorManualAtivo ? valorManualNum : valorCalculado;

  // Renovação sempre cria um PI novo (nunca edita/substitui o original).
  const isEdit = !!initial?.id && !renovadoDeId;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number | "page-fit" | "page-width">("page-width");
  const [shareLoading, setShareLoading] = useState(false);
  const [whatsLoading, setWhatsLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  async function gerarLinkCompartilhavel(): Promise<string> {
    if (!previewUrl) throw new Error("Gere a prévia primeiro");
    if (!initial?.id) throw new Error("Salve o PI antes de compartilhar");
    const { supabase } = await import("@/integrations/supabase/client");
    const blob = await fetch(previewUrl).then((r) => r.blob());
    const path = `share/${initial.id}-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("pi-anexos").upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) throw error;
    const expiresIn = 60 * 60 * 24 * 7;
    const { data, error: sErr } = await supabase.storage
      .from("pi-anexos")
      .createSignedUrl(path, expiresIn);
    if (sErr || !data?.signedUrl) throw sErr || new Error("Falha ao gerar link");

    const token =
      (crypto as any).randomUUID?.().replace(/-/g, "") ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { data: auth } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("pi_share_links").insert({
      token,
      pi_id: initial.id,
      signed_url: data.signedUrl,
      storage_path: path,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      created_by: auth?.user?.id ?? null,
    });
    if (insErr) throw insErr;

    return `${window.location.origin}/api/public/pi-share/${token}`;
  }


  async function handleShareLink() {
    if (!previewUrl) return;
    try {
      setShareLoading(true);
      const url = await gerarLinkCompartilhavel();
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Válido por 7 dias.");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar link compartilhável");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleShareWhatsapp() {
    if (!previewUrl) return;
    try {
      setWhatsLoading(true);
      const url = await gerarLinkCompartilhavel();
      const { openWhatsapp } = await import("@/lib/whatsapp-share");
      const cliente = (clientes as any[]).find((c) => c.id === clienteId);
      const agencia = (agencias as any[]).find((a) => a.id === agenciaId);
      const phone = cliente?.telefone || cliente?.whatsapp || agencia?.telefone || agencia?.whatsapp || "";
      const titulo = initial?.numero ? `PI ${initial.numero}` : "Pedido de Inserção";
      const msg = `Olá! Segue o ${titulo}${campanha ? ` — ${campanha}` : ""} para conferência:\n${url}\n\n(Link válido por 7 dias)`;
      openWhatsapp(phone, msg);
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar via WhatsApp");
    } finally {
      setWhatsLoading(false);
    }
  }

  async function handleShareEmail() {
    if (!previewUrl) return;
    const cliente = (clientes as any[]).find((c) => c.id === clienteId);
    const agencia = (agencias as any[]).find((a) => a.id === agenciaId);
    const destinoSugerido = cliente?.email || agencia?.email || "";
    const to = window.prompt("Confirme o e-mail do destinatário:", destinoSugerido);
    if (!to) return;
    try {
      setEmailLoading(true);
      const url = await gerarLinkCompartilhavel();
      const titulo = initial?.numero ? `PI ${initial.numero}` : "Pedido de Inserção";
      const subject = `${titulo}${campanha ? ` — ${campanha}` : ""} para conferência`;
      const body = `Olá!\n\nSegue o ${titulo}${campanha ? ` — ${campanha}` : ""} para conferência:\n${url}\n\n(Link válido por 7 dias)`;
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (initial?.id) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: auth } = await supabase.auth.getUser();
          await supabase.from("pi_historico").insert({
            pi_id: initial.id,
            cliente_id: clienteId || null,
            agencia_id: agenciaId || null,
            acao: "envio_link_email",
            user_id: auth?.user?.id ?? null,
            detalhes: { destinatario: to, link: url, enviado_em: new Date().toISOString() },
          });
        } catch (logErr) {
          console.warn("Falha ao registrar envio no histórico:", logErr);
        }
      }
      toast.success(`E-mail preparado para ${to}. Envio registrado no histórico.`);
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar por e-mail");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePreview() {
    try {
      setPreviewLoading(true);
      const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const todasDatas: string[] = [];
      for (const it of items) {
        const m = it.mes || mes;
        const a = it.ano || ano;
        const ultimoDia = new Date(a, m, 0).getDate();
        const diasMesArr = (it.dias_mes ?? []).map(Number);
        const diasSem = new Set((it.dias_semana ?? []).map((s) => s.toLowerCase().slice(0, 3)));
        for (let d = 1; d <= ultimoDia; d++) {
          const dt = new Date(a, m - 1, d);
          const dow = DOW[dt.getDay()];
          const marcado = diasMesArr.includes(d)
            || (diasMesArr.length === 0 && diasSem.has(dow))
            || (diasMesArr.length === 0 && diasSem.size === 0);
          if (marcado) todasDatas.push(`${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        }
      }
      todasDatas.sort();
      const cliente = (clientes as any[]).find((c) => c.id === clienteId) ?? null;
      const agencia = (agencias as any[]).find((a) => a.id === agenciaId) ?? null;
      const emissora = (emissoras as any[]).find((e) => e.id === emissoraId) ?? null;
      const piPreview: any = {
        numero: initial?.numero || "PRÉVIA",
        campanha: campanha || "—",
        status: "rascunho",
        mes_veiculacao: mes,
        ano_veiculacao: ano,
        periodo_inicio: todasDatas[0] || null,
        periodo_fim: todasDatas[todasDatas.length - 1] || null,
        observacao: mergeObservacao(observacao, obsProdutos),
        valor_tabela: totals.tabela,
        valor_desconto: totals.desconto,
        valor_negociado: valorFinal,
        total_insercoes: totals.insercoes,
        faturamento_tipo: fatTipo,
        faturamento_contra: fatContra,
        data_faturamento: dataFat || null,
        data_envio_nota: dataEnvio || null,
        data_vencimento_nota: dataVenc || null,
        permuta,
        permuta_detalhes: permuta ? permutaDetalhes : null,
        permuta_valor_faturado: 0,
        email_faturamento: emailFaturamento || null,
        cliente,
        agencia,
        emissora,
        itens: items,
        investimentos_mensais: serializeInvestimentosMensais(investimentosMensais),
        atendimento: meu ? { nome: (meu as any).nome || "", email: (meu as any).email || "" } : null,
      };
      const { gerarPdfPi } = await import("@/lib/pi-pdf");
      const { loadPiLayoutCached } = await import("@/lib/pi-layout.functions");
      const { getEmissoraOrTenantLogoDataUrl } = await import("@/lib/tenant-logo-pdf");
      const piLayout = await loadPiLayoutCached();
      const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl((emissora as any)?.logo_url ?? null);
      const url = gerarPdfPi(piPreview, "blob", null, { layout: piLayout, tenantLogoDataUrl }) as string;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar prévia");
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);


  const { errors: formErrors, setErrors: setFormErrors, has: hasErr, clear: clearErr } = useFormErrors();

  function validateSave(): FieldErrors {
    const errs: FieldErrors = {};
    if (!campanha.trim()) errs.campanha = "Informe o nome da campanha";
    if (!clienteId && !agenciaId) errs.cliente = "Selecione cliente ou agência";
    if (!fatContra) errs.fatContra = "Selecione contra quem faturar (Cliente ou Agência)";
    if (!fatTipo) errs.fatTipo = "Selecione o tipo de faturamento (Bruto ou Líquido)";
    if (fatContra === "agencia" && !agenciaId) errs.cliente = "Selecione a agência para faturar contra ela";
    if (fatContra === "cliente" && !clienteId) errs.cliente = "Selecione o cliente para faturar contra ele";
    if (permuta) {
      const vp = Number((permutaValor || "").replace(/\./g, "").replace(",", ".")) || 0;
      if (vp <= 0) errs.permutaValor = "Informe o valor permutado";
      else if (vp > valorFinal) errs.permutaValor = "O valor permutado não pode ser maior que o valor do PI";
    }
    return errs;
  }

  const save = useMutation({
    mutationFn: async (status: "rascunho" | "enviado") => {

      const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const todasDatas: string[] = [];
      for (const it of items) {
        const m = it.mes || mes;
        const a = it.ano || ano;
        const ultimoDia = new Date(a, m, 0).getDate();
        const diasMesArr = (it.dias_mes ?? []).map(Number);
        const diasSem = new Set((it.dias_semana ?? []).map((s) => s.toLowerCase().slice(0, 3)));
        for (let d = 1; d <= ultimoDia; d++) {
          const dt = new Date(a, m - 1, d);
          const dow = DOW[dt.getDay()];
          const marcado =
            diasMesArr.includes(d) ||
            (diasMesArr.length === 0 && diasSem.has(dow)) ||
            (diasMesArr.length === 0 && diasSem.size === 0);
          if (marcado) {
            todasDatas.push(`${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
          }
        }
      }
      todasDatas.sort();
      const periodo_inicio = todasDatas.length > 0 ? todasDatas[0] : null;
      const periodo_fim = todasDatas.length > 0 ? todasDatas[todasDatas.length - 1] : null;


      const payload = {
        cliente_id: clienteId || null,
        agencia_id: agenciaId || null,
        campanha: campanha.trim(),
        mes_veiculacao: mes,
        ano_veiculacao: ano,
        mes_meta: mesMeta,
        ano_meta: anoMeta,
        periodo_inicio,
        periodo_fim,
        observacao: mergeObservacao(observacao, obsProdutos),
        status,
        valor_tabela: totals.tabela,
        valor_desconto: totals.desconto,
        valor_negociado: valorFinal,
        valor_manual: valorManualAtivo ? valorManualNum : null,
        total_insercoes: totals.insercoes,
        faturamento_contra: fatContra as "cliente" | "agencia",
        faturamento_tipo: fatTipo as "bruto" | "liquido",
        data_faturamento: dataFat || null,
        data_envio_nota: dataEnvio || null,
        data_vencimento_nota: dataVenc || null,
        vencimento_tipo: vencTipo,
        permuta,
        permuta_detalhes: permuta ? permutaDetalhes.trim() || null : null,
        permuta_uso: permuta ? (permutaUso || "empresa") : null,
        permuta_valor_faturado: permuta
          ? ((Number((permutaValorFaturado || "").replace(/\./g, "").replace(",", ".")) || 0)
            || Math.max(valorFinal - (Number((permutaValor || "").replace(/\./g, "").replace(",", ".")) || 0), 0))
          : 0,
        valor_opec: permuta
          ? (Number((valorOpec || "").replace(/\./g, "").replace(",", ".")) || null)
          : null,
        email_faturamento: emailFaturamento || null,
        emissora_id: emissoraId || null,
        sem_comissao: semComissao,
        executivo_id: isAdmin ? (execId || null) : undefined,
        responsavel_negociacao_id: negocId || null,
        executivo_execucao_id: execucaoId || null,
        producao_tipo: producaoTipo || null,
        producao_contato: producaoContato || autoContato || null,
        producao_email: producaoEmail || autoEmail || null,
        producao_data: producaoData || null,
        producao_material_tipo: producaoMaterial || null,
        producao_localizacao: producaoLocal || autoEndereco || null,
        producao_observacoes: producaoObs || null,

        itens: items,
        investimentos_mensais: serializeInvestimentosMensais(investimentosMensais),
      };

      if (isEdit && initial?.id) {
        // Rascunho: edita o próprio PI mantendo o mesmo número (sem substituir)
        if (initial.status === "rascunho") {
          return upsertPi({ data: { ...payload, id: initial.id } });
        }
        return substituirPi({ data: { ...payload, original_id: initial.id } });
      }
      return upsertPi({ data: payload });
    },

    onSuccess: async (res: { id: string; numero?: string; original_numero?: string }, statusSalvo) => {
      if (propostaOrigemId && res?.id) {
        try {
          await vincularPropostaAoPi({ data: { proposta_id: propostaOrigemId, pi_id: res.id } });
          qc.invalidateQueries({ queryKey: ["propostas"] });
        } catch (e) {
          toast.error(`PI salvo, mas falhou ao vincular à proposta: ${(e as Error).message}`);
        }
      }
      // Notificação automática de renovação de contrato (PI renovado é um novo contrato,
      // independente, e deve aparecer normalmente na relação de PIs).
      if (renovadoDeId && res?.id && !isEdit) {
        try {
          await notificarRenovacaoPi({ data: { original_id: renovadoDeId, novo_id: res.id } });
        } catch (e) {
          console.error("Falha ao notificar renovação:", e);
        }
      }
      // Follow-up automático na agenda próximo à data de vigência para renovação
      if (res?.id) {
        try {
          await agendarFollowUpRenovacao({ data: { pi_id: res.id } });
        } catch (e) {
          console.error("Falha ao agendar follow-up de renovação:", e);
        }
      }

      // Quando o usuário clica em "Salvar e Enviar", envia automaticamente para aprovação da Diretoria
      if (statusSalvo === "enviado" && res?.id) {
        try {
          await enviarPiParaAprovacao({ data: { id: res.id } });
          toast.success("PI enviado para aprovação da Diretoria");
        } catch (e) {
          toast.error(`PI salvo, mas falhou ao enviar para aprovação: ${(e as Error).message}`);
        }
      } else if (res?.original_numero && res?.numero) {
        toast.success(`CS gerado: ${res.numero} (substitui ${res.original_numero})`);
      } else {
        toast.success("PI salvo com sucesso");
      }

      // Se admin trocou o executivo responsável em um PI existente, regenera o PDF
      // automaticamente para refletir o novo atendimento/executivo.
      if (isAdmin && isEdit && res?.id && execId && execId !== (initial?.executivo_id ?? "")) {
        try {
          const { getPi } = await import("@/lib/pi.functions");
          const { gerarPdfPi } = await import("@/lib/pi-pdf");
          const { loadPiLayoutCached } = await import("@/lib/pi-layout.functions");
          const { getEmissoraOrTenantLogoDataUrl } = await import("@/lib/tenant-logo-pdf");
          const { getAssinaturaExecutivoDoPi, getAssinaturaClienteDoPi, getAssinaturaDiretoriaDoPi } =
            await import("@/lib/assinaturas.functions");
          const [full, sigExec, sigCli, sigDir] = await Promise.all([
            getPi({ data: { id: res.id } }) as Promise<any>,
            getAssinaturaExecutivoDoPi({ data: { pi_id: res.id } }).catch(() => ({ dataUrl: null, nome: null })),
            getAssinaturaClienteDoPi({ data: { pi_id: res.id } }).catch(() => null),
            getAssinaturaDiretoriaDoPi({ data: { pi_id: res.id } }).catch(() => ({ dataUrl: null, nome: null })),
          ]);
          const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl((full as any)?.emissora?.logo_url ?? null);
          const piLayout = await loadPiLayoutCached();
          const url = gerarPdfPi(full, "blob", null, {
            layout: piLayout,
            tenantLogoDataUrl,
            assinaturaExecutivoDataUrl: (sigExec as any)?.dataUrl,
            nomeExecutivo: (sigExec as any)?.nome,
            assinaturaCliente: sigCli as any,
            assinaturaDiretoriaDataUrl: (sigDir as any)?.dataUrl,
            nomeDiretoria: (sigDir as any)?.nome,
          }) as unknown as string;
          window.open(url, "_blank");
          toast.success("PDF do PI regenerado com o novo executivo");

          // Notifica o executivo responsável por email e WhatsApp
          try {
            const { notificarPiReemitidoParaExecutivo } = await import("@/lib/pi-notificacoes.functions");
            const { openWhatsapp, isValidWhatsappPhone } = await import("@/lib/whatsapp-share");
            const r: any = await notificarPiReemitidoParaExecutivo({ data: { pi_id: res.id } });
            if (r?.ok) {
              if (r.emailOk) toast.success("Executivo notificado por email");
              const phone = r?.whatsapp?.phone;
              const message = r?.whatsapp?.message;
              if (phone && message && isValidWhatsappPhone(phone)) {
                openWhatsapp(phone, message);
              } else if (message) {
                toast.info("Executivo sem WhatsApp cadastrado — envie manualmente");
              }
            }
          } catch (e) {
            console.error("Falha ao notificar executivo:", e);
          }
        } catch (e) {
          console.error("Falha ao regenerar PDF:", e);
        }
      }
      qc.invalidateQueries({ queryKey: ["pis"] });
      onOpenChange(false);
      if (propostaOrigemId) navigate({ to: "/pi" });
    },

    onError: (e: Error) => toast.error(e.message),
  });

  // Autosave como rascunho: salva silenciosamente enquanto o usuário digita,
  // evitando perda de informação em caso de fechamento acidental / queda de conexão.
  const draftIdRef = useRef<string | null>(initial?.id ?? null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavingRef = useRef(false);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => { draftIdRef.current = initial?.id ?? null; }, [initial?.id, open]);
  useEffect(() => {
    if (!open) return;
    if (isProducaoOnly) return;
    // Renovação deve gerar um único novo PI apenas quando o usuário salvar.
    // O autosave aqui poderia criar rascunhos extras durante a conferência.
    if (renovadoDeId) return;
    // Não autossalva PIs já enviados/aprovados: nesses casos "salvar" gera CS.
    if (isEdit && initial?.status && initial.status !== "rascunho") return;
    if (save.isPending) return;
    if (!campanha.trim()) return;
    if (!clienteId && !agenciaId) return;
    if (!fatContra || !fatTipo) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      if (autosavingRef.current) return;
      autosavingRef.current = true;
      setAutosaveState("saving");
      try {
        const payload: any = {
          id: draftIdRef.current ?? undefined,
          cliente_id: clienteId || null,
          agencia_id: agenciaId || null,
          campanha: campanha.trim(),
          mes_veiculacao: mes,
          ano_veiculacao: ano,
          mes_meta: mesMeta,
          ano_meta: anoMeta,
          observacao: mergeObservacao(observacao, obsProdutos),
          status: "rascunho",
          valor_tabela: totals.tabela,
          valor_desconto: totals.desconto,
          valor_negociado: valorFinal,
          valor_manual: valorManualAtivo ? valorManualNum : null,
          total_insercoes: totals.insercoes,
          faturamento_contra: fatContra as "cliente" | "agencia",
          faturamento_tipo: fatTipo as "bruto" | "liquido",
          data_faturamento: dataFat || null,
          data_envio_nota: dataEnvio || null,
          data_vencimento_nota: dataVenc || null,
          vencimento_tipo: vencTipo,
          permuta,
          permuta_detalhes: permuta ? permutaDetalhes.trim() || null : null,
          permuta_uso: permuta ? (permutaUso || "empresa") : null,
          permuta_valor_faturado: 0,
          valor_opec: permuta
            ? (Number((valorOpec || "").replace(/\./g, "").replace(",", ".")) || null)
            : null,
          email_faturamento: emailFaturamento || null,
          emissora_id: emissoraId || null,
          sem_comissao: semComissao,
          executivo_id: isAdmin ? (execId || null) : undefined,
          responsavel_negociacao_id: negocId || null,
          executivo_execucao_id: execucaoId || null,
          producao_tipo: producaoTipo || null,
          producao_contato: producaoContato || null,
          producao_data: producaoData || null,
          producao_material_tipo: producaoMaterial || null,
          producao_localizacao: producaoLocal || null,
          producao_observacoes: producaoObs || null,
          itens: items,
          investimentos_mensais: serializeInvestimentosMensais(investimentosMensais),
        };
        const res: any = await upsertPi({ data: payload });
        if (res?.id) draftIdRef.current = res.id;
        setAutosaveState("saved");
        qc.invalidateQueries({ queryKey: ["pis"] });
      } catch (e) {
        // silencioso — o usuário ainda pode salvar manualmente
        console.warn("Autosave PI falhou:", e);
        setAutosaveState("idle");
      } finally {
        autosavingRef.current = false;
      }
    }, 2500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open, campanha, clienteId, agenciaId, mes, ano, observacao,
    fatContra, fatTipo, dataFat, dataEnvio, dataVenc, vencTipo,
    permuta, permutaDetalhes, permutaUso, emailFaturamento, emissoraId,
    semComissao, execId, negocId, execucaoId, producaoTipo, producaoContato,
    producaoData, producaoMaterial, producaoLocal, producaoObs, items,
    valorFinal, valorManualAtivo, renovadoDeId, valorOpec,
  ]);

  const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const SectionHeader = ({ icon: Icon, title, hint }: { icon: typeof Building2; title: string; hint?: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-sm font-semibold leading-none">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[960px] max-h-[92vh] overflow-y-auto p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                {isProducaoOnly 
                  ? `Observações de Produção — PI ${initial?.numero ?? ""}`
                  : (isEdit
                      ? `Editar PI ${initial?.numero ?? ""}`
                      : (renovadoDeId ? "Renovação de contrato — Novo PI" : "Novo Pedido de Inserção"))}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {isProducaoOnly 
                  ? "Inclua observações e ressalvas sobre a gravação do material."
                  : (isEdit
                    ? "Ao salvar, será gerado um novo PI (CS) e o atual ficará marcado como substituído."
                    : (renovadoDeId
                        ? "Um novo número de PI será gerado. O contrato original permanece inalterado."
                        : "Número único é gerado automaticamente ao salvar."))}
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Resumo de valores</div>
              <div className="flex flex-col items-end leading-none">
                <div className="text-[11px] text-muted-foreground flex gap-2">
                  <span>Bruto: {fmtBRL(valorBruto)}</span>
                  <span>Líquido: {fmtBRL(valorLiquido)}</span>
                </div>
                <div className="font-display font-semibold text-lg text-primary mt-1">{fmtBRL(valorFinal)}</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{totals.insercoes} inserções</div>
              {autosaveState !== "idle" && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {autosaveState === "saving" ? "Salvando rascunho…" : "Rascunho salvo automaticamente"}
                </div>
              )}
            </div>
          </div>
          {isEdit && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 text-amber-900 px-3 py-2 text-xs dark:bg-amber-950/40 dark:text-amber-200">
              <Info className="size-4 mt-0.5 shrink-0" />
              <span>
                <strong>Carta de Substituição (CS):</strong> ao salvar, o PI <strong>{initial?.numero}</strong> será marcado como <em>substituído</em>
                {" "}e um novo PI será criado citando esta referência na observação.
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {!isProducaoOnly && (
            <>
              {/* 1. Partes envolvidas */}
          <section>
            <SectionHeader icon={Building2} title="Partes envolvidas" hint="Quem é o cliente final e, se houver, a agência intermediária." />
            <div className="grid sm:grid-cols-2 gap-3" data-field="cliente">
              <div className={`space-y-1.5 ${errorFieldClass(hasErr("cliente"))}`}>
                <Label>Cliente {hasErr("cliente") && <span className="text-destructive text-xs">*{formErrors.cliente}</span>}</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <EntidadeSearchSelect
                      value={clienteId}
                      onChange={setClienteId}
                      items={clientes as any}
                      placeholder="Buscar cliente por nome ou razão social"
                      emptyLabel="— Sem cliente —"
                    />
                  </div>
                  <NovoClienteButton />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Agência</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={temAgencia}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        setTemAgencia(checked);
                        if (!checked) setAgenciaId("");
                      }}
                    />
                    Cliente possui agência
                  </label>
                </div>
                {temAgencia ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <EntidadeSearchSelect
                        value={agenciaId}
                        onChange={setAgenciaId}
                        items={agencias as any}
                        placeholder="Buscar agência por nome ou razão social"
                        emptyLabel="— Selecione a agência —"
                      />
                    </div>
                    <NovaAgenciaButton />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Cliente direto, sem agência intermediária.</p>
                )}
              </div>


              {isAdmin && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Executivo responsável (a quem o PI será emitido)</Label>
                  <Select value={execId || (meu?.profile?.id ?? "none")} onValueChange={(v) => setExecId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o executivo" /></SelectTrigger>
                    <SelectContent>
                      {meu?.profile?.id && (
                        <SelectItem value={meu.profile?.id}>— Eu ({meu.profile?.nome ?? "admin"}) —</SelectItem>
                      )}
                      {executivos.filter((u) => u.id !== meu?.profile?.id).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">O PI será emitido em nome deste executivo e contará na meta/comissão dele.</p>
                </div>
              )}
              {false && (
              <div className="space-y-1.5">
                <Label>Responsável pela Negociação (Parceiro)</Label>
                <Select value={negocId || "none"} onValueChange={(v) => setNegocId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o parceiro" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {parceiros.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
              {false && (
              <div className="space-y-1.5">
                <Label>Executivo de Execução</Label>
                <Select value={execucaoId || "none"} onValueChange={(v) => setExecucaoId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o executivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {executivos.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Emissora (CNPJ que emite o PI) <span className="text-destructive">*</span></Label>
                {(emissoras as Array<{ id: string; ativo: boolean }>).filter((e) => e.ativo).length > 0 ? (
                  <>
                    <Select value={emissoraId || "none"} onValueChange={(v) => setEmissoraId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione a emissora" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Selecionar —</SelectItem>
                        {(emissoras as Array<{ id: string; nome: string; cnpj: string | null; padrao: boolean; ativo: boolean }>)
                          .filter((e) => e.ativo)
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}{e.cnpj ? ` — ${e.cnpj}` : ""}{e.padrao ? " (padrão)" : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Sugerida automaticamente pela emissora vinculada ao 1º produto. Pode ser alterada.</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/40">
                    Nenhuma emissora cadastrada. Cadastre em <strong>Configurações → Emissoras</strong> para escolher o CNPJ que emite o PI.
                  </p>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* 2. Campanha e veiculação */}
          <section>
            <SectionHeader icon={Calendar} title="Campanha & Veiculação" hint="Identifique a campanha e o período de exibição." />
            <div className="grid sm:grid-cols-4 gap-3">
              <div className={`space-y-1.5 sm:col-span-2 ${errorFieldClass(hasErr("campanha"))}`} data-field="campanha">
                <Label>Campanha <span className="text-destructive">*</span> {hasErr("campanha") && <span className="text-destructive text-xs">{formErrors.campanha}</span>}</Label>
                <Input value={campanha} onChange={(e) => setCampanha(e.target.value)} placeholder="Nome da campanha" className={errorInputClass(hasErr("campanha"))} />
              </div>
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anos.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Uso interno — Atribuição à meta do executivo</div>
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Mês da meta</Label>
                  <Select value={mesMeta ? String(mesMeta) : "none"} onValueChange={(v) => setMesMeta(v === "none" ? null : Number(v))}>
                    <SelectTrigger><SelectValue placeholder="(usar mês da veiculação)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Usar mês da veiculação —</SelectItem>
                      {MESES.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ano da meta</Label>
                  <Select value={anoMeta ? String(anoMeta) : "none"} onValueChange={(v) => setAnoMeta(v === "none" ? null : Number(v))}>
                    <SelectTrigger><SelectValue placeholder="(usar ano da veiculação)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Usar ano da veiculação —</SelectItem>
                      {anos.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 text-xs text-muted-foreground self-center">
                  Use quando o cliente aprovar a campanha em um mês mas a veiculação ocorrer em outro. Se vazio, o PI conta no mês da veiculação.
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed flex items-start gap-2">
                <Checkbox
                  id="sem-comissao"
                  checked={semComissao}
                  onCheckedChange={(v) => setSemComissao(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor="sem-comissao" className="text-sm font-medium cursor-pointer">
                    Não entra no cálculo de comissão
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Quando marcado, este PI é excluído do cálculo de comissão do executivo (continua valendo para a meta).
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* 3. Produtos */}
          <section>
            <SectionHeader icon={Calculator} title="Produtos & Calculadora" hint="Adicione produtos e marque as datas exatas de veiculação no calendário." />
            <PriceCalculator
              key={`${initial?.id || "new"}-${initial?.original_pi_id || ""}-${open ? "o" : "c"}`}
              title=""
              description=""
              mes={mes}
              ano={ano}
              initialItems={initial?.itens}
              onChange={(its, tt) => { setItems(its); setTotals(tt); }}
            />
            <InvestimentoMensalSection
              items={items}
              defaultMes={mes}
              defaultAno={ano}
              values={investimentosMensais}
              onChange={setInvestimentosMensais}
            />
          </section>

          <Separator />

          {/* 4. Faturamento */}
          <section>
            <SectionHeader icon={Receipt} title="Faturamento" hint="Defina contra quem faturar, o tipo (Bruto/Líquido) e as datas fiscais." />
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className={`space-y-1.5 ${errorFieldClass(hasErr("fatContra"))}`} data-field="fatContra">
                  <Label>Faturar contra <span className="text-destructive">*</span> {hasErr("fatContra") && <span className="text-destructive text-xs">{formErrors.fatContra}</span>}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={fatContra === "cliente" ? "default" : "outline"} onClick={() => setFatContra("cliente")}>Cliente</Button>
                    <Button type="button" variant={fatContra === "agencia" ? "default" : "outline"} onClick={() => setFatContra("agencia")}>Agência</Button>
                  </div>
                </div>
                <div className={`space-y-1.5 ${errorFieldClass(hasErr("fatTipo"))}`} data-field="fatTipo">
                  <Label>Tipo <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={fatTipo === "bruto" ? "default" : "outline"} onClick={() => setFatTipo("bruto")}>Bruto</Button>
                    <Button
                      type="button"
                      variant={fatTipo === "liquido" ? "default" : "outline"}
                      onClick={() => setFatTipo("liquido")}
                    >
                      Líquido{agenciaId ? " (−20%)" : ""}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {agenciaId
                      ? "Com agência: Líquido = Bruto − 20% (comissão de agência)."
                      : "Sem agência: Líquido = Bruto (não há comissão a deduzir)."}
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Permuta <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-2 max-w-xs">
                    <Button type="button" variant={permuta === false ? "default" : "outline"} onClick={() => setPermuta(false)}>Não</Button>
                    <Button type="button" variant={permuta === true ? "default" : "outline"} onClick={() => setPermuta(true)}>Sim</Button>
                  </div>
                  {permuta && (
                    <div className="space-y-4 mt-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Destino da permuta <span className="text-destructive">*</span></Label>
                        <div className="grid grid-cols-2 gap-2 max-w-xs">
                          <Button 
                            type="button" 
                            variant={permutaUso === "empresa" ? "default" : "outline"} 
                            onClick={() => setPermutaUso("empresa")}
                            className="text-xs"
                          >
                            Uso da Empresa
                          </Button>
                          <Button 
                            type="button" 
                            variant={permutaUso === "comercial" ? "default" : "outline"} 
                            onClick={() => setPermutaUso("comercial")}
                            className="text-xs"
                          >
                            Uso Comercial
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                          {permutaUso === "empresa" 
                            ? "✓ Contabiliza na meta do executivo." 
                            : "✕ NÃO contabiliza na meta do executivo."}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Detalhes da permuta</Label>
                        <Textarea 
                          placeholder="Ex: 10 diárias de hotel, crédito em produtos..."
                          value={permutaDetalhes}
                          onChange={(e) => setPermutaDetalhes(e.target.value)}
                          className="h-20"
                        />
                      </div>

                      <div className={`space-y-1.5 ${errorFieldClass(hasErr("permutaValor"))}`} data-field="permutaValor">
                        <Label className="text-xs">Valor permutado <span className="text-destructive">*</span> {hasErr("permutaValor") && <span className="text-destructive">{formErrors.permutaValor}</span>}</Label>
                        <Input
                          inputMode="decimal"
                          placeholder="0,00"
                          value={permutaValor}
                          onChange={(e) => setPermutaValor(e.target.value)}
                          className={errorInputClass(hasErr("permutaValor"))}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                          Valor total da permuta neste PI. Diferença
                          ({(Math.max(valorFinal - (Number((permutaValor || "").replace(/\./g, "").replace(",", ".")) || 0), 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                          será faturada em dinheiro.
                        </p>
                      </div>

                      {canSeeInternalPermuta && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Valor a ser faturado (parcial)</Label>
                            <Input
                              inputMode="decimal"
                              placeholder="0,00"
                              value={permutaValorFaturado}
                              onChange={(e) => setPermutaValorFaturado(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                              Opcional. Se preenchido, sobrescreve a diferença calculada acima.
                            </p>
                          </div>

                          <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                            <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                              Valor OPEC (uso interno)
                            </Label>
                            <Input
                              inputMode="decimal"
                              placeholder="0,00"
                              value={valorOpec}
                              onChange={(e) => setValorOpec(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                              Valor real considerado internamente (OPEC, comissões, relatórios).
                              <strong> Não aparece no PI enviado ao cliente.</strong> O cliente vê
                              apenas o valor negociado ({valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).
                            </p>
                          </div>
                        </>
                      )}

                      {isVendedorOnly && (
                        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
                          Os campos de <strong>faturamento parcial</strong> e <strong>Valor OPEC (uso interno)</strong> são
                          gerenciados pela equipe interna (OPEC/Financeiro). O cliente vê apenas o
                          valor permutado informado acima.
                        </div>
                      )}
                    </div>
                  )}
                </div>


                <div className="space-y-1.5">
                  <Label>E-mail para envio de nota</Label>
                  <Input
                    type="email"
                    placeholder="exemplo@empresa.com.br"
                    value={emailFaturamento}
                    onChange={(e) => setEmailFaturamento(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se não preenchido, será utilizado o e-mail do cadastro.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border bg-background p-3">

                <div className={`rounded-md p-2 ${fatTipo === "bruto" ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor Bruto</div>
                  <div className="font-display font-semibold text-lg">{fmtBRL(valorBruto)}</div>
                </div>
                <div className={`rounded-md p-2 ${fatTipo === "liquido" ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor Líquido (−20%)</div>
                  <div className="font-display font-semibold text-lg">{fmtBRL(valorLiquido)}</div>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground border-t pt-2">
                  Valor que será salvo: <strong className="text-foreground">{fmtBRL(valorFinal)}</strong>
                  {" · "}{valorManualAtivo ? "Manual" : (fatTipo === "bruto" ? "Bruto" : fatTipo === "liquido" ? "Líquido" : "—")}{" "}
                  {fatContra ? `· contra ${fatContra === "cliente" ? "Cliente" : "Agência"}` : ""}
                </div>
                <div className="col-span-2 border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Digitar valor manualmente</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant={valorManualAtivo ? "default" : "outline"}
                      onClick={() => {
                        const next = !valorManualAtivo;
                        setValorManualAtivo(next);
                        if (next && !valorManual) {
                          setValorManual(valorCalculado.toFixed(2).replace(".", ","));
                        }
                      }}
                    >
                      {valorManualAtivo ? "Usando valor manual" : "Usar valor manual"}
                    </Button>
                  </div>
                  {valorManualAtivo && (
                    <>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={valorManual}
                        onChange={(e) => setValorManual(e.target.value.replace(/[^\d.,]/g, ""))}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Substitui o valor calculado. Use vírgula para centavos (ex: 1500,00).
                      </p>
                    </>
                  )}
                </div>
              </div>


              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Envio da nota</Label>
                  <Input type="date" value={dataEnvio} onChange={(e) => setDataEnvio(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex justify-between items-center">
                    Vencimento da nota
                    <Select value={vencTipo} onValueChange={setVencTipo}>
                      <SelectTrigger className="h-6 w-24 text-[10px] py-0 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="15dfm">15 DFM</SelectItem>
                        <SelectItem value="30dfm">30 DFM</SelectItem>
                      </SelectContent>
                    </Select>
                  </Label>
                  <Input 
                    type="date" 
                    value={dataVenc} 
                    onChange={(e) => {
                      setDataVenc(e.target.value);
                      if (vencTipo !== "manual") setVencTipo("manual");
                    }} 
                  />
                </div>
              </div>

            </div>
          </section>

            </>
          )}

          <Separator />

          {/* 5. Produção */}
          <section>
            <SectionHeader icon={FileText} title="Produção de Material" hint="Informações sobre a produção do material publicitário." />
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>O material será enviado pronto ou nós produziremos?</Label>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                  <Button type="button" variant={producaoTipo === "cliente" ? "default" : "outline"} onClick={() => setProducaoTipo("cliente")}>Cliente envia pronto</Button>
                  <Button type="button" variant={producaoTipo === "interna" ? "default" : "outline"} onClick={() => setProducaoTipo("interna")}>Nós produziremos</Button>
                </div>
              </div>

              {producaoTipo === "interna" && (
                <div className="grid sm:grid-cols-2 gap-3 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do contato</Label>
                    <Input 
                      value={producaoContato} 
                      onChange={(e) => setProducaoContato(e.target.value)} 
                      placeholder={autoContato || "Nome da pessoa para contato"} 
                    />
                    {!producaoContato && autoContato && (
                      <p className="text-[10px] text-muted-foreground italic">Sugestão: {autoContato}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail do contato</Label>
                    <Input 
                      value={producaoEmail} 
                      onChange={(e) => setProducaoEmail(e.target.value)} 
                      placeholder={autoEmail || "exemplo@email.com"} 
                    />
                    {!producaoEmail && autoEmail && (
                      <p className="text-[10px] text-muted-foreground italic">Sugestão: {autoEmail}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data da produção (combinar previamente)</Label>
                    <Input type="date" value={producaoData} onChange={(e) => setProducaoData(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de material</Label>
                    <Select value={producaoMaterial} onValueChange={setProducaoMaterial}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VT">VT</SelectItem>
                        <SelectItem value="Vitrine">Vitrine</SelectItem>
                        <SelectItem value="Falso Vivo">Falso Vivo</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Endereço (localização)</Label>
                    <Input 
                      value={producaoLocal} 
                      onChange={(e) => setProducaoLocal(e.target.value)} 
                      placeholder={autoEndereco || "Local da gravação"} 
                    />
                    {!producaoLocal && autoEndereco && (
                      <p className="text-[10px] text-muted-foreground italic">Sugestão: {autoEndereco}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Observação sobre a gravação</Label>
                    <Textarea rows={2} value={producaoObs} onChange={(e) => setProducaoObs(e.target.value)} placeholder="Detalhes importantes para a equipe de produção..." />
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* 6. Observação */}
          <section>
            <SectionHeader icon={FileText} title="Observações" hint="Instruções da agência, condições especiais, etc." />
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações internas, instruções da agência, condições especiais…" />
            {obsProdutos && (
              <div className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 text-amber-900 px-3 py-2 text-xs whitespace-pre-line dark:bg-amber-950/40 dark:text-amber-200">
                <strong>Observações dos produtos selecionados (serão incluídas automaticamente):</strong>
                {"\n"}{obsProdutos}
              </div>
            )}
          </section>

          {isEdit && initial?.id && (
            <>
              <Separator />
              <section>
                <PisAnexosSection
                  piId={initial.id}
                  title="Anexos deste PI"
                  hint="PDFs originais, comprovantes ou versões externas deste PI."
                />
              </section>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
            <Eye className="size-4 mr-1" />
            {previewLoading ? "Gerando..." : "Visualizar PI"}
          </Button>
          <Button variant="secondary" disabled={save.isPending} onClick={() => {
            const e = validateSave();
            if (Object.keys(e).length) { setFormErrors(e); return; }
            setFormErrors({});
            save.mutate("rascunho");
          }}>
            {isProducaoOnly 
              ? "Salvar Observações" 
              : (isEdit ? "Salvar CS como Rascunho" : "Salvar Rascunho")}
          </Button>
          {!isProducaoOnly && (
            <Button disabled={save.isPending} onClick={() => {
              const e = validateSave();
              if (Object.keys(e).length) { setFormErrors(e); return; }
              setFormErrors({});
              save.mutate("enviado");
            }}>
              {isEdit ? "Gerar CS e Enviar" : "Salvar e Enviar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewZoom("page-width"); } }}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] h-[92vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-3 border-b">
            <DialogTitle>Prévia do PI</DialogTitle>
            <DialogDescription>Visualização para conferência — nada foi salvo.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background flex-wrap">
            <Button type="button" size="sm" variant="outline" onClick={() => setPreviewZoom((z) => typeof z === "number" ? Math.max(25, z - 25) : 75)}>−</Button>
            <span className="text-sm w-16 text-center tabular-nums">
              {typeof previewZoom === "number" ? `${previewZoom}%` : previewZoom === "page-fit" ? "Página" : "Largura"}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => setPreviewZoom((z) => typeof z === "number" ? Math.min(400, z + 25) : 125)}>+</Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button type="button" size="sm" variant={previewZoom === 100 ? "default" : "outline"} onClick={() => setPreviewZoom(100)}>100%</Button>
            <Button type="button" size="sm" variant={previewZoom === "page-width" ? "default" : "outline"} onClick={() => setPreviewZoom("page-width")}>Ajustar largura</Button>
            <Button type="button" size="sm" variant={previewZoom === "page-fit" ? "default" : "outline"} onClick={() => setPreviewZoom("page-fit")}>Ajustar página</Button>
            {previewUrl && (
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleShareLink} disabled={shareLoading}>
                  {shareLoading ? "Gerando..." : "Copiar link compartilhável"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleShareWhatsapp} disabled={whatsLoading}>
                  {whatsLoading ? "Gerando..." : "Enviar por WhatsApp"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleShareEmail} disabled={emailLoading}>
                  {emailLoading ? "Gerando..." : "Enviar por e-mail"}
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={previewUrl} target="_blank" rel="noreferrer">Abrir em nova aba</a>
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 bg-muted">
            {previewUrl && (
              <iframe
                key={String(previewZoom)}
                src={`${previewUrl}#zoom=${previewZoom}&view=FitH&toolbar=1&navpanes=0`}
                title="Prévia do PI"
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );

}
