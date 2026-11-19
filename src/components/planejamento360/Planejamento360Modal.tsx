import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sparkles,
  Compass,
  MapPin,
  Car,
  Building2,
  Utensils,
  Radio,
  Globe,
  CheckCircle2,
  Copy,
  ExternalLink,
  Navigation,
  Loader2,
  Store,
  Layers,
  Share2,
  Handshake,
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  HelpCircle,
  Target,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/use-current-org";
import {
  gerarPlano360Comercial,
  salvarDemandaCaptacao,
  type Plano360Resultado,
  type ItemPlano360,
} from "@/lib/planejamento-360.functions";
import {
  TODAS_RAS_DF,
  UFS_BRASIL,
  HISTORICO_SUCESSO_OPCOES,
  PILARES_360,
} from "@/lib/df-regioes-inteligencia";
import { getDistinctPracasECidades } from "@/lib/representacao-comercial.functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome?: string | null;
  clienteId?: string | null;
  onAplicarAoPlano?: (itens: ItemPlano360[], defesaComercial: string) => void;
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function Planejamento360Modal({
  open,
  onOpenChange,
  clienteNome = "Cliente Comercial",
  clienteId = null,
  onAplicarAoPlano,
}: Props) {
  const { isNexo } = useCurrentOrg();
  const gerarPlanoFn = useServerFn(gerarPlano360Comercial);
  const salvarDemandaFn = useServerFn(salvarDemandaCaptacao);
  const getDistinctLocsFn = useServerFn(getDistinctPracasECidades);

  // Consulta de praças e UFs cadastradas dinamicamente
  const { data: locsData } = useQuery({
    queryKey: ["distinct_pracas_cidades"],
    queryFn: () => getDistinctLocsFn(),
    enabled: open,
  });

  // 1. Briefing Comercial ao Vivo com Suporte Multi-Regional e Nacional
  const [tipoAbrangencia, setTipoAbrangencia] = useState<"local" | "regional" | "nacional">("local");
  const [estadoUf, setEstadoUf] = useState<string>("DF");
  const [cidade, setCidade] = useState<string>("Brasília");
  const [bairroRegiao, setBairroRegiao] = useState<string>("Ceilândia");
  const [regiaoDesafio, setRegiaoDesafio] = useState<string>("Ceilândia");
  const [classes, setClasses] = useState<string[]>(["Classe B/C"]);
  const [estilosVida, setEstilosVida] = useState<string[]>([
    "Famílias/Moradores Locais",
    "Consumo/Comércio",
  ]);
  const [historicoSucesso, setHistoricoSucesso] = useState<string[]>([
    "Ações no PDV / Inauguração",
    "Rádio / Locução Comercial",
  ]);
  const [aprendizados, setAprendizados] = useState<string>(
    "Ações de PDV com locução trouxeram filas imediatas; precisamos expandir para as vias de acesso e elevadores.",
  );
  const [orcamento, setOrcamento] = useState<number>(45000);
  const [duracaoDias, setDuracaoDias] = useState<number>(30);

  // Handlers para troca dinâmica de praça e cobertura
  const handleSelectTipoAbrangencia = (tipo: "local" | "regional" | "nacional") => {
    setTipoAbrangencia(tipo);
    if (tipo === "nacional") {
      setRegiaoDesafio("Nacional / Todo o Brasil");
      setEstadoUf("BR");
      setCidade("Todo o Brasil");
    } else if (tipo === "regional") {
      const est = estadoUf === "BR" ? "GO" : estadoUf;
      if (estadoUf === "BR") setEstadoUf("GO");
      setRegiaoDesafio(cidade ? `${cidade} (${est})` : `${est} Regional`);
    } else {
      if (estadoUf === "BR") setEstadoUf("DF");
      setRegiaoDesafio(bairroRegiao || cidade || "DF");
    }
  };

  const handleSelectUf = (uf: string) => {
    setEstadoUf(uf);
    if (uf === "DF") {
      setCidade("Brasília");
      setBairroRegiao("Ceilândia");
      setRegiaoDesafio(tipoAbrangencia === "local" ? "Ceilândia" : "Distrito Federal");
    } else {
      const cidadesDesteEstado = locsData?.cidadesPorEstado?.[uf] || [];
      const primeiraCidade =
        cidadesDesteEstado[0] ||
        (uf === "GO" ? "Luziânia" : uf === "SP" ? "São Paulo" : uf === "RJ" ? "Rio de Janeiro" : "");
      setCidade(primeiraCidade);
      setBairroRegiao("");
      setRegiaoDesafio(primeiraCidade ? `${primeiraCidade} (${uf})` : `${uf} Regional`);
    }
  };

  const handleCidadeChange = (novaCidade: string) => {
    setCidade(novaCidade);
    if (tipoAbrangencia === "regional") {
      setRegiaoDesafio(novaCidade ? `${novaCidade} (${estadoUf})` : `${estadoUf} Regional`);
    } else if (tipoAbrangencia === "local") {
      setRegiaoDesafio(bairroRegiao ? `${bairroRegiao} — ${novaCidade}` : novaCidade);
    }
  };

  const handleRaChange = (novaRa: string) => {
    setBairroRegiao(novaRa);
    setRegiaoDesafio(novaRa);
  };

  const handleBairroChange = (novoBairro: string) => {
    setBairroRegiao(novoBairro);
    setRegiaoDesafio(novoBairro ? `${novoBairro} (${cidade || estadoUf})` : cidade || estadoUf);
  };

  // Cidades disponíveis para o estado selecionado
  const cidadesDisponiveis = useMemo(() => {
    if (estadoUf === "DF") return ["Brasília", "Taguatinga", "Ceilândia", "Águas Claras"];
    const doEstado = locsData?.cidadesPorEstado?.[estadoUf] || [];
    if (doEstado.length > 0) return doEstado;
    if (estadoUf === "GO") return ["Luziânia", "Valparaíso de Goiás", "Goiânia", "Anápolis", "Águas Lindas"];
    if (estadoUf === "SP") return ["São Paulo", "Campinas", "Guarulhos", "São Bernardo do Campo"];
    if (estadoUf === "RJ") return ["Rio de Janeiro", "Niterói", "Duque de Caxias"];
    if (estadoUf === "MG") return ["Belo Horizonte", "Uberlândia", "Contagem"];
    return locsData?.cidadesCadastradas || [];
  }, [estadoUf, locsData]);

  // Estado do Resultado
  const [resultado, setResultado] = useState<Plano360Resultado | null>(null);
  const [pilarAtivo, setPilarAtivo] = useState<string>("todos");
  const [abaPrincipal, setAbaPrincipal] = useState<"diagnostico" | "plano" | "radar">("diagnostico");

  // Estado do Modal Rápido de Solicitação de Captação
  const [solicitandoCaptacao, setSolicitandoCaptacao] = useState(false);
  const [tipoMidiaCaptacao, setTipoMidiaCaptacao] = useState("Painel LED Rodoviário");
  const [obsCaptacao, setObsCaptacao] = useState("");
  const [captacaoConcluida, setCaptacaoConcluida] = useState(false);

  // Mutation para Gerar Plano 360°
  const gerarMutation = useMutation({
    mutationFn: () =>
      gerarPlanoFn({
        data: {
          cliente_id: clienteId,
          cliente_nome: clienteNome || "Cliente em Reunião",
          tipo_abrangencia: tipoAbrangencia,
          estado_uf: estadoUf,
          cidade: cidade,
          regiao_desafio: regiaoDesafio,
          bairro_regiao: bairroRegiao,
          classes,
          estilos_vida: estilosVida,
          historico_sucesso: historicoSucesso,
          aprendizados_passado: aprendizados,
          orcamento_alvo: orcamento,
          duracao_dias: duracaoDias,
          incluir_radar_automatico: true,
        },
      }),
    onSuccess: (data) => {
      setResultado(data);
      setAbaPrincipal("plano");
      toast.success(`Plano Estratégico 360° gerado para ${regiaoDesafio}!`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao gerar o planejamento 360°");
    },
  });


  // Mutation para Salvar Demanda de Captação no Radar
  const salvarDemandaMutation = useMutation({
    mutationFn: () =>
      salvarDemandaFn({
        data: {
          cliente_id: clienteId,
          cliente_nome: clienteNome || "Cliente em Reunião",
          regiao_administrativa: regiaoDesafio,
          tipo_midia: tipoMidiaCaptacao,
          formato_desejado: "Mídia Exterior OOH/DOOH",
          perfil_publico: { classes, estilos_vida: estilosVida },
          historico_sucesso: { historico: historicoSucesso, aprendizados },
          sugestoes_prospeccao: resultado?.prospects_prospeccao_sugeridos || [],
          observacoes: obsCaptacao || `Demanda originada em reunião para o cliente ${clienteNome} na região ${regiaoDesafio}.`,
        },
      }),
    onSuccess: () => {
      setCaptacaoConcluida(true);
      setSolicitandoCaptacao(false);
      toast.success("Demanda registrada com sucesso no Radar de Expansão!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao registrar demanda");
    },
  });

  const toggleClasse = (c: string) => {
    setClasses((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const toggleEstilo = (e: string) => {
    setEstilosVida((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const toggleHistorico = (h: string) => {
    setHistoricoSucesso((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h],
    );
  };

  const copiarPitch = () => {
    if (!resultado?.pitch_consultor_reuniao) return;
    navigator.clipboard.writeText(resultado.pitch_consultor_reuniao);
    toast.success("Argumentação copiada para a área de transferência!");
  };

  const copiarDefesa = () => {
    if (!resultado?.defesa_comercial_executiva) return;
    navigator.clipboard.writeText(resultado.defesa_comercial_executiva);
    toast.success("Defesa comercial completa copiada!");
  };

  const itensFiltrados = useMemo(() => {
    if (!resultado) return [];
    if (pilarAtivo === "todos") return resultado.itens_todos;
    return resultado.itens_por_pilar[pilarAtivo] || [];
  }, [resultado, pilarAtivo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Cabeçalho Tecnológico */}
        <div className="p-5 border-b bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                <Compass className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold tracking-tight text-white">
                    {isNexo ? "Hub Nexo 360° — Inteligência Territorial & Radar DF" : "Planejamento Estratégico 360° & Radar de Expansão"}
                  </DialogTitle>
                  <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/40 text-[10px] uppercase font-semibold">
                    {isNexo ? "⭐ Nexo Mídia Hub" : "Reunião Comercial"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-sky-200/80 mt-0.5">
                  {isNexo
                    ? "Diagnóstico executivo oficial da Nexo Mídia e Representação, catálogo de soluções próprias, veículos representados e radar DF."
                    : "Diagnóstico ao vivo, inteligência de público do DF e recomendação multicanal com radar de novas praças."}
                </DialogDescription>
              </div>
            </div>
            {clienteNome && (
              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-sky-300/80 block">Cliente em Atendimento</span>
                <span className="text-sm font-semibold text-white">{clienteNome}</span>
              </div>
            )}
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              variant={abaPrincipal === "diagnostico" ? "default" : "secondary"}
              className={`text-xs h-8 ${
                abaPrincipal === "diagnostico"
                  ? "bg-sky-500 hover:bg-sky-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white border-0"
              }`}
              onClick={() => setAbaPrincipal("diagnostico")}
            >
              1. Briefing & Diagnóstico ao Vivo
            </Button>
            <Button
              size="sm"
              variant={abaPrincipal === "plano" ? "default" : "secondary"}
              disabled={!resultado}
              className={`text-xs h-8 ${
                abaPrincipal === "plano"
                  ? "bg-sky-500 hover:bg-sky-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white border-0"
              }`}
              onClick={() => setAbaPrincipal("plano")}
            >
              2. Pilares 360° & Métricas {resultado ? `(${resultado.itens_todos.length} pontos)` : ""}
            </Button>
            {resultado?.radar_acionado && (
              <Button
                size="sm"
                variant={abaPrincipal === "radar" ? "default" : "secondary"}
                className={`text-xs h-8 border ${
                  abaPrincipal === "radar"
                    ? "bg-amber-500 text-black font-semibold border-amber-400"
                    : "bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30"
                }`}
                onClick={() => setAbaPrincipal("radar")}
              >
                📡 Radar de Expansão Ativo ({resultado.total_pontos_diretos} diretos)
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ========================================================================= */}
          {/* ABA 1: BRIEFING COMERCIAL AO VIVO                                         */}
          {/* ========================================================================= */}
          {abaPrincipal === "diagnostico" && (
            <div className="space-y-6">
              {/* Bloco 1: Abrangência Geográfica e Praça do Desafio (Multi-Regional & Nacional) */}
              <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <Label className="text-sm font-bold text-foreground">
                      1. Abrangência Geográfica & Praça da Campanha
                    </Label>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] bg-primary/5 text-primary border-primary/20"
                  >
                    DF • Goiás/Entorno • Qualquer Estado do Brasil
                  </Badge>
                </div>

                {/* Tipo de Abrangência */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Tipo de Abrangência da Campanha:
                  </span>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: "local",
                        label: "Local / Hiperlocal",
                        desc: "Bairros ou RAs específicas (ex: Ceilândia, Taguatinga, Jardins)",
                      },
                      {
                        id: "regional",
                        label: "Regional / Estadual",
                        desc: "Cidades ou Estados (ex: DF, Entorno-GO, Goiânia, SP, MG, RJ)",
                      },
                      {
                        id: "nacional",
                        label: "Multi-estadual / Nacional",
                        desc: "Cobertura ampla e simultânea em múltiplas praças e capitais",
                      },
                    ].map((tipo) => {
                      const active = tipoAbrangencia === tipo.id;
                      return (
                        <button
                          key={tipo.id}
                          type="button"
                          onClick={() => handleSelectTipoAbrangencia(tipo.id as any)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            active
                              ? "bg-primary/10 border-primary text-primary shadow-xs font-medium"
                              : "bg-background/80 hover:bg-muted/50 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{tipo.label}</span>
                            {active && <CheckCircle2 className="size-3.5 text-primary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                            {tipo.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seleção Dinâmica de Estados e Cidades */}
                {tipoAbrangencia !== "nacional" ? (
                  <div className="grid sm:grid-cols-12 gap-3 pt-1">
                    {/* Estado / UF */}
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-medium">Estado / UF</Label>
                      <Select value={estadoUf} onValueChange={handleSelectUf}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione o Estado" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {UFS_BRASIL.map((u) => (
                            <SelectItem key={u.uf} value={u.uf} className="text-xs">
                              {u.uf} — {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cidade */}
                    <div className="sm:col-span-4 space-y-1">
                      <Label className="text-xs font-medium">Cidade / Praça</Label>
                      <div className="relative">
                        <Input
                          value={cidade}
                          onChange={(e) => handleCidadeChange(e.target.value)}
                          placeholder="Digite ou escolha a Cidade..."
                          className="h-9 text-xs"
                          list="cidades-planejamento-sugeridas"
                        />
                        <datalist id="cidades-planejamento-sugeridas">
                          {cidadesDisponiveis.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Bairro / Região / RA */}
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-medium">
                        {estadoUf === "DF" ? "Região Administrativa (RA)" : "Bairro / Região"}
                      </Label>
                      {estadoUf === "DF" ? (
                        <Select value={bairroRegiao} onValueChange={handleRaChange}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecione a RA" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {TODAS_RAS_DF.map((ra) => (
                              <SelectItem key={ra} value={ra} className="text-xs">
                                📍 {ra}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={bairroRegiao}
                          onChange={(e) => handleBairroChange(e.target.value)}
                          placeholder="Ex: Centro, Setor Bueno, Zona Sul..."
                          className="h-9 text-xs"
                        />
                      )}
                    </div>

                    {/* Budget Previsto */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-medium">Budget Alvo (R$)</Label>
                      <Input
                        type="number"
                        value={orcamento}
                        onChange={(e) => setOrcamento(Number(e.target.value))}
                        placeholder="R$ 45.000"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Globe className="size-3.5" /> Cobertura Nacional / Todo o Brasil Ativada
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        A IA sugerirá mídias digitais de alta capilaridade, redes de TV/áudio nacional e circuitos de OOH nas maiores capitais e aeroportos, com prioridade máxima para produtos próprios.
                      </p>
                    </div>
                    <div className="w-full sm:w-36 shrink-0">
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Budget Nacional (R$)
                      </Label>
                      <Input
                        type="number"
                        value={orcamento}
                        onChange={(e) => setOrcamento(Number(e.target.value))}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>


              {/* Bloco 2: Perfil do Público-Alvo */}
              <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-sky-500" />
                  <Label className="text-sm font-bold text-foreground">
                    2. Perfil do Público-Alvo da Região
                  </Label>
                </div>

                {/* Classes Econômicas */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Classes Econômicas:</span>
                  <div className="flex flex-wrap gap-2">
                    {(["Classe A/B", "Classe B/C", "Classe C/D"] as const).map((cls) => {
                      const active = classes.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleClasse(cls)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            active
                              ? "bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estilos de Vida */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Estilo de Vida & Hábitos:</span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "Famílias/Moradores Locais",
                        "Executivos/Tomadores de Decisão",
                        "Estudantes/Jovens",
                        "Consumo/Comércio",
                      ] as const
                    ).map((estilo) => {
                      const active = estilosVida.includes(estilo);
                      return (
                        <button
                          key={estilo}
                          type="button"
                          onClick={() => toggleEstilo(estilo)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            active
                              ? "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border-indigo-500"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {estilo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bloco 3: Histórico de Sucesso do Cliente */}
              <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-500" />
                  <Label className="text-sm font-bold text-foreground">
                    3. O Que Já Deu Certo no Passado (Histórico de Sucesso)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Marque os canais que geraram resultado real para o cliente para que a IA os integre e potencialize na estratégia 360°:
                </p>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {HISTORICO_SUCESSO_OPCOES.map((opt) => {
                    const checked = historicoSucesso.includes(opt.label);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleHistorico(opt.label)}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                          checked
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-900 dark:text-emerald-200 font-medium"
                            : "bg-card hover:bg-muted/50 border-border text-muted-foreground"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleHistorico(opt.label)} />
                        <span className="text-xs">{opt.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Aprendizados / O que trouxe mais retorno real:
                  </Label>
                  <Textarea
                    value={aprendizados}
                    onChange={(e) => setAprendizados(e.target.value)}
                    placeholder="Ex: Ações de rua com carro de som e ofertas de fim de semana dobraram o ticket médio; posts no Instagram funcionam melhor quando há um painel na entrada da cidade."
                    className="text-xs min-h-[70px]"
                  />
                </div>
              </div>

              {/* Botão de Disparo */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  size="lg"
                  disabled={gerarMutation.isPending}
                  onClick={() => gerarMutation.mutate()}
                  className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md gap-2"
                >
                  {gerarMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Calculando Estratégia 360° & Radar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Gerar Plano 360° em Tempo Real
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: PILARES 360° E MÉTRICAS CONSOLIDADAS                                */}
          {/* ========================================================================= */}
          {abaPrincipal === "plano" && resultado && (
            <div className="space-y-6">
              {/* Alerta de Radar se Acionado */}
              {resultado.radar_acionado && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-950 dark:text-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span className="text-lg">📡</span>
                      <span>Radar de Expansão & Oportunidades Acionado ({resultado.regiao_desafio})</span>
                    </div>
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/20 text-amber-900 dark:text-amber-100 text-[11px]">
                      {resultado.total_pontos_diretos} ponto(s) diretos no banco
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
                    {resultado.motivo_radar}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100"
                      onClick={() => setAbaPrincipal("radar")}
                    >
                      Ver Análise do Radar & Solicitar Captação
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-amber-900 dark:text-amber-200 hover:underline"
                      onClick={copiarPitch}
                    >
                      Copiar Argumentação para Reunião
                    </Button>
                  </div>
                </div>
              )}

              {/* Barra de Métricas em Tempo Real */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-sky-500/5 border-sky-500/20 shadow-none">
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground font-medium">Impactos / Mês</div>
                    <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                      {resultado.metricas_consolidadas.total_impactos_mes.toLocaleString("pt-BR")}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Pessoas únicas projetadas</span>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-none">
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground font-medium">CPM Consolidado</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      R$ {resultado.metricas_consolidadas.cpm_consolidado.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Custo a cada mil impactos</span>
                  </CardContent>
                </Card>

                <Card className="bg-indigo-500/5 border-indigo-500/20 shadow-none">
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground font-medium">Valor Negociado 360°</div>
                    <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {fmtBRL(resultado.metricas_consolidadas.valor_negociado_total)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Tabela: {fmtBRL(resultado.metricas_consolidadas.valor_tabela_total)}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-purple-500/5 border-purple-500/20 shadow-none">
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground font-medium">Economia / Desconto</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                      {resultado.metricas_consolidadas.desconto_medio_pct}% OFF
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Economia: {fmtBRL(resultado.metricas_consolidadas.economia_desconto_total)}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Seletor dos 5 Pilares */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Os 5 Pilares de Cobertura 360°
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Filtrar por pilar ou visualizar plano completo
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={pilarAtivo === "todos" ? "default" : "outline"}
                    className="h-8 text-xs font-semibold"
                    onClick={() => setPilarAtivo("todos")}
                  >
                    Todos os Pilares ({resultado.itens_todos.length})
                  </Button>
                  {PILARES_360.map((p) => {
                    const count = (resultado.itens_por_pilar[p.id] || []).length;
                    return (
                      <Button
                        key={p.id}
                        size="sm"
                        variant={pilarAtivo === p.id ? "default" : "outline"}
                        className="h-8 text-xs font-semibold"
                        onClick={() => setPilarAtivo(p.id)}
                      >
                        {p.numero}. {p.nome} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Tabela dos Pontos do Plano */}
              <div className="space-y-3">
                {itensFiltrados.map((it) => (
                  <div
                    key={it.id}
                    className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{it.nome}</span>
                          <Badge variant="outline" className="text-[10px] bg-muted/50">
                            {it.pilar_nome}
                          </Badge>
                          {it.tipo_origem === "confirmado" && (
                            <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 text-[10px]">
                              ✓ Ponto Confirmado
                            </Badge>
                          )}
                          {it.tipo_origem === "transbordamento_radar" && (
                            <Badge className="bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40 text-[10px]">
                              📡 Transbordamento Troncal ({it.via_troncal})
                            </Badge>
                          )}
                          {it.tipo_origem === "oportunidade_mapeamento" && (
                            <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 text-[10px]">
                              ⭐ Mapeamento / Reserva Técnica
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                          <MapPin className="size-3 text-red-500 shrink-0" />
                          <span>{it.localizacao}</span>
                          {it.sentido_via && (
                            <span className="font-medium text-sky-700 dark:text-sky-300">
                              • {it.sentido_via}
                            </span>
                          )}
                          {it.ponto_referencia && (
                            <span className="italic">• Ref: {it.ponto_referencia}</span>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-foreground">
                          {fmtBRL(it.valor_negociado)}
                        </div>
                        <div className="text-[11px] text-muted-foreground line-through">
                          {fmtBRL(it.valor_tabela)}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/80 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <strong>Racional Tático:</strong> {it.justificativa_estrategica}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span>
                          <strong>Impactos:</strong> {it.impactos_mes_estimados.toLocaleString("pt-BR")}/mês
                        </span>
                        <span>
                          <strong>Inserções:</strong> {it.insercoes_mes} veiculações
                        </span>
                        {it.parceiro_nome && (
                          <span>
                            <strong>Veículo:</strong> {it.parceiro_nome}
                          </span>
                        )}
                      </div>

                      {it.link_maps && (
                        <a
                          href={it.link_maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-sky-600 hover:text-sky-800 dark:text-sky-400 hover:underline"
                        >
                          <Navigation className="size-3" />
                          <span>Google Maps / Street View</span>
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Caixa de Argumentação Pronta para a Reunião */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-sky-950 dark:text-sky-200">
                    <MessageSquareText className="size-4 text-sky-600 dark:text-sky-400" />
                    <span>Argumentação Pronta para Falar ao Cliente na Reunião</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copiarPitch}>
                    <Copy className="size-3" /> Copiar Texto
                  </Button>
                </div>
                <p className="text-xs text-sky-900 dark:text-sky-200/90 leading-relaxed italic bg-white/70 dark:bg-black/30 p-3 rounded-lg border border-sky-200/60 dark:border-sky-800/60">
                  "{resultado.pitch_consultor_reuniao}"
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {resultado.conexao_historico_sucesso}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: RADAR DE EXPANSÃO & OPORTUNIDADES REGIONAIS                         */}
          {/* ========================================================================= */}
          {abaPrincipal === "radar" && resultado && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                  <span className="text-xl">📍</span>
                  <span>Diagnóstico Geográfico de {resultado.regiao_desafio}</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {resultado.inteligencia_regiao.perfilPredominante}
                </p>
              </div>

              {/* Formatos Mais Recomendados para a Região */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  a) Formatos Mais Recomendados para a Geografia Local
                </Label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {resultado.inteligencia_regiao.formatosRecomendados.map((fmt, idx) => (
                    <Card key={idx} className="bg-card border-border shadow-none">
                      <CardHeader className="p-3.5 pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                          <Layers className="size-3.5 text-primary" />
                          {fmt.formato}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3.5 pt-0 text-xs text-muted-foreground leading-relaxed">
                        {fmt.porQue}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Rotas e Vias de Transbordamento */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  b) Rotas & Vias de Transbordamento (Impacto Indireto Diário)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quem reside ou consome em {resultado.regiao_desafio} passa obrigatoriamente por estas artérias todos os dias:
                </p>
                <div className="space-y-2.5">
                  {resultado.inteligencia_regiao.viasTransbordamento.map((via, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border bg-card text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Navigation className="size-3.5 text-sky-500" />
                          {via.via}
                        </span>
                        <Badge variant="outline" className="text-[10px] border-sky-400 text-sky-700 dark:text-sky-300">
                          Fluxo: {via.fluxoEstimado}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{via.descricao}</p>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-foreground/80">
                        <span className="font-medium text-primary">Pontos de Retenção:</span>
                        {via.pontosEstrategicos.map((p, i) => (
                          <span key={i} className="bg-muted px-2 py-0.5 rounded text-[10px]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entidades e Empresas Locais para Captação */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  c) Entidades & Veículos Locais para Prospecção Ativa
                </Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {resultado.inteligencia_regiao.prospectsLocaisSugeridos.map((prosp, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border bg-card text-xs space-y-1">
                      <span className="font-bold text-foreground block">{prosp.categoria}</span>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {prosp.exemplos.map((ex, i) => (
                          <li key={i}>{ex}</li>
                        ))}
                      </ul>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block pt-1 font-medium">
                        💡 Dica: {prosp.contatoDica}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulário Rápido de Solicitação de Captação */}
              <div className="p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Handshake className="size-4 text-primary" />
                    <span>Solicitar Captação de Ponto / Parceiro em {resultado.regiao_desafio}</span>
                  </div>
                  {captacaoConcluida && (
                    <Badge className="bg-emerald-500 text-white text-[10px] gap-1">
                      <Check className="size-3" /> Demanda Registrada no Radar
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registra esta demanda na fila da equipe de prospecção comercial para homologar novos pontos nesta região para o cliente {clienteNome}.
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Tipo de Mídia / Veículo Desejado</Label>
                    <Select value={tipoMidiaCaptacao} onValueChange={setTipoMidiaCaptacao}>
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Painel LED Rodoviário">Painel LED Rodoviário</SelectItem>
                        <SelectItem value="Front Light">Front Light</SelectItem>
                        <SelectItem value="Mídia em Elevador">Mídia em Elevadores Residenciais</SelectItem>
                        <SelectItem value="Outdoor Tradicional">Outdoor Rodoviário DER/DNIT</SelectItem>
                        <SelectItem value="Rádio Comunitária / Regional">Rádio Regional</SelectItem>
                        <SelectItem value="Empena Comercial de Rua">Empena Comercial de Rua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Observações Específicas da Reunião</Label>
                    <Input
                      value={obsCaptacao}
                      onChange={(e) => setObsCaptacao(e.target.value)}
                      placeholder="Ex: Cliente tem 2 lojas na Av. Comercial e prefere face sentido centro."
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    disabled={salvarDemandaMutation.isPending || captacaoConcluida}
                    onClick={() => salvarDemandaMutation.mutate()}
                    className="text-xs gap-1.5"
                  >
                    {salvarDemandaMutation.isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Handshake className="size-3.5" />
                    )}
                    {captacaoConcluida ? "Demanda Registrada no Radar" : "Registrar Demanda de Captação"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações Rápidas */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          {resultado && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={copiarDefesa}
              >
                <FileText className="size-3.5" /> Copiar Defesa Comercial
              </Button>
              {onAplicarAoPlano && (
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground text-xs gap-1.5 shadow-sm font-semibold"
                  onClick={() => {
                    onAplicarAoPlano(resultado.itens_todos, resultado.defesa_comercial_executiva);
                    onOpenChange(false);
                    toast.success("Itens e defesa comercial transferidos para a proposta!");
                  }}
                >
                  <Sparkles className="size-3.5" />
                  Aplicar à Proposta Comercial ({resultado.itens_todos.length} itens)
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MessageSquareText(props: any) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M13 8H7" />
      <path d="M17 12H7" />
    </svg>
  );
}
