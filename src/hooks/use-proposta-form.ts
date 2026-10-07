import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertProposta, getProposta } from "@/lib/propostas.functions";
import { mergeObservacao } from "@/lib/produto-observacoes";
import { addBusinessDays } from "@/lib/services/proposta-utils";
import { CalcItemOut, CalcTotals } from "@/components/PriceCalculator";
import { toast } from "sonner";
import { useActingAsExecutivo } from "@/hooks/use-acting-as";
import { useFormErrors, type FieldErrors } from "@/lib/form-errors";
import { useFormDraft } from "@/hooks/use-form-draft";

interface PropostaDraftData {
  clienteId: string;
  agenciaId: string;
  executivoId: string;
  executivoParceiroId: string;
  clienteAvulso: string;
  campanha: string;
  validade: string;
  observacao: string;
  items: CalcItemOut[];
}

export function usePropostaForm(initial: any, onOpenChange: (v: boolean) => void) {
  const qc = useQueryClient();
  const actingAs = useActingAsExecutivo();
  const [clienteId, setClienteId] = useState("");

  const [agenciaId, setAgenciaId] = useState("");
  const [executivoId, setExecutivoId] = useState("");
  const [executivoParceiroId, setExecutivoParceiroId] = useState("");
  const [clienteAvulso, setClienteAvulso] = useState("");
  const [campanha, setCampanha] = useState("");
  const [validade, setValidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [items, setItems] = useState<CalcItemOut[]>([]);
  const [totals, setTotals] = useState<CalcTotals>({
    tabela: 0,
    desconto: 0,
    negociado: 0,
    insercoes: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadedBriefingId, setLoadedBriefingId] = useState<string | null>(null);
  const isNewProposal = !initial?.id && !initial?.isCopy;
  const [draftRestored, setDraftRestored] = useState(false);

  const { loadDraft, saveDraft, clearDraft } = useFormDraft<PropostaDraftData>({
    draftKey: "nova_proposta_form",
    initialData: {
      clienteId: "",
      agenciaId: "",
      executivoId: "",
      executivoParceiroId: "",
      clienteAvulso: "",
      campanha: "",
      validade: "",
      observacao: "",
      items: [],
    },
    enabled: isNewProposal,
  });

  // Salva rascunho automaticamente a cada alteração
  useEffect(() => {
    if (!isNewProposal) return;
    if (campanha || clienteId || agenciaId || items.length > 0 || observacao) {
      saveDraft({
        clienteId,
        agenciaId,
        executivoId,
        executivoParceiroId,
        clienteAvulso,
        campanha,
        validade,
        observacao,
        items,
      });
    }
  }, [
    isNewProposal,
    clienteId,
    agenciaId,
    executivoId,
    executivoParceiroId,
    clienteAvulso,
    campanha,
    validade,
    observacao,
    items,
    saveDraft,
  ]);

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftRestored(false);
    setClienteId("");
    setAgenciaId("");
    setExecutivoId(actingAs ?? "");
    setExecutivoParceiroId("");
    setClienteAvulso("");
    setCampanha("");
    setValidade("");
    setObservacao("");
    setItems([]);
    toast.info("Rascunho descartado.");
  };

  useEffect(() => {
    if (!initial) {
      const saved = loadDraft();
      if (saved && (saved.campanha || saved.clienteId || (saved.items && saved.items.length > 0))) {
        setClienteId(saved.clienteId || "");
        setAgenciaId(saved.agenciaId || "");
        setExecutivoId(saved.executivoId || actingAs || "");
        setExecutivoParceiroId(saved.executivoParceiroId || "");
        setClienteAvulso(saved.clienteAvulso || "");
        setCampanha(saved.campanha || "");
        setValidade(saved.validade || "");
        setObservacao(saved.observacao || "");
        setItems(saved.items || []);
        setDraftRestored(true);
      } else {
        // Reset form
        setClienteId("");
        setAgenciaId("");
        setExecutivoId(actingAs ?? "");
        setExecutivoParceiroId("");
        setClienteAvulso("");
        setCampanha("");
        setValidade("");
        setObservacao("");
        setItems([]);
        setLoadedBriefingId(null);
      }
      return;
    }

    const loadData = async () => {
      if (initial?.id) {
        setIsLoading(true);
        try {
          const p = await getProposta({ data: { id: initial.id } });
          if (p) {
            setClienteId(p.cliente_id ?? "");
            setAgenciaId(p.agencia_id ?? "");
            setExecutivoId(p.executivo_id ?? "");
            setExecutivoParceiroId((p as any).executivo_parceiro_id ?? "");
            setClienteAvulso(p.cliente_avulso ?? "");
            setCampanha(p.campanha ?? "");
            setValidade(p.validade ?? "");
            setObservacao(p.observacao ?? "");
            setItems(p.itens || []);
            setLoadedBriefingId((p as any).briefing_id ?? null);
          }
        } catch (e) {
          toast.error("Erro ao carregar itens da proposta");
        } finally {
          setIsLoading(false);
        }
      } else {
        setClienteId(initial?.cliente_id ?? "");
        setAgenciaId(initial?.agencia_id ?? "");
        setExecutivoId(initial?.executivo_id ?? actingAs ?? "");
        setExecutivoParceiroId(initial?.executivo_parceiro_id ?? "");
        setClienteAvulso(initial?.cliente_avulso ?? "");
        setCampanha(initial?.campanha ?? "");
        setValidade(initial?.validade ?? "");
        setObservacao(initial?.observacao ?? "");
        setItems(initial?.itens || []);
      }
    };

    loadData();
    // Depende apenas do id (e flag isCopy) para evitar recarregar o form
    // toda vez que o pai re-renderiza e passa um novo objeto `initial`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id, initial?.isCopy, initial == null]);

  const { errors, setErrors, clear: clearError, has: hasError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: async ({
      status,
      obsProdutos,
    }: {
      status: "rascunho" | "enviada";
      obsProdutos: string;
    }) => {
      const validadeFinal =
        validade || (status === "enviada" ? addBusinessDays(new Date(), 10) : null);

      return upsertProposta({
        data: {
          id: initial?.id && !initial.isCopy ? initial.id : undefined,
          cliente_id: clienteId || null,
          agencia_id: agenciaId || null,
          executivo_id: executivoId || null,
          executivo_parceiro_id: executivoParceiroId || null,
          cliente_avulso: clienteAvulso.trim() || null,
          campanha: campanha.trim(),
          validade: validadeFinal,
          observacao: mergeObservacao(observacao, obsProdutos),
          status,
          valor_tabela: totals.tabela,
          valor_desconto: totals.desconto,
          valor_negociado: totals.negociado,
          total_insercoes: totals.insercoes,
          comissao_pct: 0,
          itens: items,
          briefing_id: loadedBriefingId || initial?.briefing_id || null,
        },
      });
    },
    onSuccess: () => {
      clearDraft();
      toast.success("Proposta salva");
      qc.invalidateQueries({ queryKey: ["propostas"] });
      if (initial?.id) {
        qc.invalidateQueries({ queryKey: ["propostas", initial.id] });
      }
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error("Erro ao salvar proposta: " + e.message);
    },
  });

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!campanha.trim()) errs.campanha = "Informe a campanha";
    if (!clienteId && !agenciaId && !clienteAvulso.trim()) {
      errs.cliente = "Selecione cliente/agência ou informe o nome do cliente";
    }
    if (!items.length) {
      errs.items = "Adicione ao menos um item à proposta";
    } else {
      const semFormato = items.findIndex((it) => !it.formato || !String(it.formato).trim());
      if (semFormato >= 0) errs.items = `Informe o formato no item ${semFormato + 1}`;
    }
    return errs;
  }

  function save(status: "rascunho" | "enviada", obsProdutos: string) {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    saveMutation.mutate({ status, obsProdutos });
  }

  return {
    state: {
      clienteId,
      setClienteId,
      agenciaId,
      setAgenciaId,
      executivoId,
      setExecutivoId,
      executivoParceiroId,
      setExecutivoParceiroId,
      clienteAvulso,
      setClienteAvulso,
      campanha,
      setCampanha,
      validade,
      setValidade,
      observacao,
      setObservacao,
      items,
      setItems,
      totals,
      setTotals,
      isLoading,
      draftRestored,
      handleDiscardDraft,
    },
    save,
    isSaving: saveMutation.isPending,
    errors,
    hasError,
    clearError,
  };
}
