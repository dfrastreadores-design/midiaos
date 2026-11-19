import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { 
  MapPin, 
  Sparkles, 
  Layers, 
  SlidersHorizontal, 
  TrendingUp, 
  Users, 
  Eye, 
  DollarSign, 
  Target, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Search, 
  ExternalLink, 
  Compass, 
  Calendar, 
  Zap, 
  ArrowRight,
  Maximize2,
  Image as ImageIcon,
  Award,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/mock-data";
import { 
  listPontosOohInteligentes, 
  planejarOohIa 
} from "@/lib/ooh-intelligence.functions";
import type { 
  PontoOohInteligente, 
  CenarioOohIa 
} from "@/lib/ooh-intelligence.types";

export const OohIntelligenceView: React.FC = () => {
  const [comandoPrompt, setComandoPrompt] = useState("");
  const [abaPrincipal, setAbaPrincipal] = useState<"mapa" | "marketplace" | "cenarios">("mapa");
  const [pontoSelecionado, setPontoSelecionado] = useState<PontoOohInteligente | null>(null);
  const [cenarioAtivoId, setCenarioAtivoId] = useState<"economico" | "recomendado" | "premium">("recomendado");
  const [cenarios, setCenarios] = useState<Record<string, CenarioOohIa> | null>(null);

  // Filtros do marketplace
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroMidia, setFiltroMidia] = useState<string>("todas");
  const [filtroOrigem, setFiltroOrigem] = useState<"todos" | "proprio" | "parceiro">("todos");

  // Server functions
  const listPontosFn = useServerFn(listPontosOohInteligentes);
  const planejarFn = useServerFn(planejarOohIa);

  // Query dos pontos
  const { data, isLoading } = useQuery({
    queryKey: ["pontos-ooh-intelligence"],
    queryFn: () => listPontosFn({ data: {} }),
  });

  const pontos: PontoOohInteligente[] = data?.pontos || [];

  // Planejador OOH Mutation
  const mutationPlanejar = useMutation({
    mutationFn: async (cmd: string) => {
      const res = await planejarFn({
        data: {
          comando: cmd,
          pontos_disponiveis: pontos,
        },
      });
      return res;
    },
    onSuccess: (res: any) => {
      if (res?.cenarios) {
        setCenarios(res.cenarios);
        setCenarioAtivoId("recomendado");
        setAbaPrincipal("cenarios");
        toast.success("Estratégia OOH gerada pela IA com 3 cenários simulados!");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao consultar o Planejador OOH IA.");
    },
  });

  // Inicializar cenários ao carregar pontos
  useEffect(() => {
    if (pontos.length > 0 && !cenarios) {
      mutationPlanejar.mutate("Planejamento padrão de alta afinidade e cobertura regional");
    }
  }, [pontos.length]);

  // Leaflet Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);

  useEffect(() => {
    if (abaPrincipal !== "mapa" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      // Carregar CSS e Script do Leaflet se necessário
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const L = (window as any).L || (await new Promise((resolve) => {
        if ((window as any).L) return resolve((window as any).L);
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve((window as any).L);
        document.head.appendChild(script);
      }));

      if (!isMounted || !mapContainerRef.current) return;

      if (!leafletMapInstance.current) {
        const centerLat = pontos[0]?.latitude || -15.7942;
        const centerLng = pontos[0]?.longitude || -47.8822;

        const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 12);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }).addTo(map);

        leafletMapInstance.current = map;
      }

      const map = leafletMapInstance.current;

      // Limpar marcadores anteriores
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          map.removeLayer(layer);
        }
      });

      // Adicionar marcadores com IA Score OOH
      const bounds = L.latLngBounds([]);

      pontos.forEach((p) => {
        if (!p.latitude || !p.longitude) return;

        const corScore = p.score_ooh >= 90 ? "#10b981" : p.score_ooh >= 75 ? "#3b82f6" : "#f59e0b";

        const iconHtml = `
          <div style="background-color: ${corScore}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">
            ${p.score_ooh}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-leaflet-ooh-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([p.latitude, p.longitude], { icon: customIcon }).addTo(map);

        marker.on("click", () => {
          setPontoSelecionado(p);
        });

        bounds.extend([p.latitude, p.longitude]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [abaPrincipal, pontos]);

  // Filtragem dos pontos no marketplace
  const pontosFiltrados = pontos.filter((p) => {
    if (filtroMidia !== "todas" && p.midia !== filtroMidia) return false;
    if (filtroOrigem !== "todos" && p.origem !== filtroOrigem) return false;
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase();
      return (
        p.nome.toLowerCase().includes(q) ||
        p.endereco.toLowerCase().includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const cenarioAtual = cenarios ? cenarios[cenarioAtivoId] : null;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header MÍDIA.OS 4.0 — OOH INTELLIGENCE */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  MÍDIA.OS OOH INTELLIGENCE
                </h1>
                <Badge className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  4.0 Engine
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Mapa Georreferenciado, IA Score OOH (0 a 100), Perfil do Ativo e Marketplace
              </p>
            </div>
          </div>
        </div>

        {/* Métricas Rápidas do Inventário */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase">Pontos Ativos</span>
            <strong className="text-white text-sm">{pontos.length}</strong>
          </div>
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="text-slate-500 block text-[10px] uppercase">Score Médio OOH</span>
            <strong className="text-emerald-400 text-sm">
              {pontos.length > 0
                ? Math.round(pontos.reduce((acc, p) => acc + p.score_ooh, 0) / pontos.length)
                : 0}
              /100
            </strong>
          </div>
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="text-slate-500 block text-[10px] uppercase">Audiência Mensal</span>
            <strong className="text-blue-400 text-sm">
              {(pontos.reduce((acc, p) => acc + p.impactos_mes_estimados, 0) / 1000000).toFixed(1)}M
            </strong>
          </div>
        </div>
      </div>

      {/* Barra do Planejador OOH IA Conversacional */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 shrink-0">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>Planejador OOH IA:</span>
        </div>
        <div className="flex-1 w-full relative">
          <Input
            value={comandoPrompt}
            onChange={(e) => setComandoPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && comandoPrompt.trim()) {
                mutationPlanejar.mutate(comandoPrompt.trim());
              }
            }}
            placeholder='Ex: "Quero atingir público classe A em Brasília com orçamento de 200 mil"'
            className="w-full bg-slate-950 border-slate-700/80 rounded-xl pr-28 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-500"
          />
          <Button
            size="sm"
            onClick={() => comandoPrompt.trim() && mutationPlanejar.mutate(comandoPrompt.trim())}
            disabled={!comandoPrompt.trim() || mutationPlanejar.isPending}
            className="absolute right-1 top-1 bottom-1 h-7 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg"
          >
            {mutationPlanejar.isPending ? "Processando..." : "Planejar IA"}
          </Button>
        </div>

        {/* Chips de Comando Rápido */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          {[
            "Classe A com R$ 150k",
            "Foco em Telas LED Centro",
            "Reduzir 30% do plano",
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                setComandoPrompt(chip);
                mutationPlanejar.mutate(chip);
              }}
              className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white px-2.5 py-1 rounded-full border border-slate-800 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Principais: Mapa, Marketplace e Cenários */}
      <Tabs value={abaPrincipal} onValueChange={(v) => setAbaPrincipal(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <TabsList className="bg-transparent h-10 p-0 gap-4 justify-start border-none">
            <TabsTrigger
              value="mapa"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Mapa Inteligente ({pontos.length})
            </TabsTrigger>
            <TabsTrigger
              value="marketplace"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Marketplace de Inventário
            </TabsTrigger>
            <TabsTrigger
              value="cenarios"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Simulador de 3 Cenários OOH
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. MAPA INTELIGENTE GEORREFERENCIADO */}
        <TabsContent value="mapa" className="flex-1 m-0 relative overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />

          {/* Legenda do IA Score OOH no Canto do Mapa */}
          <div className="absolute top-4 right-4 z-[1000] bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur text-xs space-y-2">
            <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider">
              Legenda: IA Score OOH
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Score 90-100 (Prime / Alta Qualificação)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-300">Score 75-89 (Forte Fluxo & Visibilidade)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-300">Score 50-74 (Cobertura Regional)</span>
            </div>
          </div>
        </TabsContent>

        {/* 2. MARKETPLACE DE INVENTÁRIO */}
        <TabsContent value="marketplace" className="flex-1 m-0 p-4 overflow-y-auto space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500" />
              <Input
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar por ponto, endereço, bairro ou cidade..."
                className="bg-slate-950 border-slate-800 text-xs h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filtroMidia}
                onChange={(e) => setFiltroMidia(e.target.value)}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none"
              >
                <option value="todas">Todos os Formatos</option>
                <option value="DOOH">Painéis de LED / DOOH</option>
                <option value="OOH">Frontlights & Outdoors</option>
              </select>

              <select
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value as any)}
                className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none"
              >
                <option value="todos">Todos (Próprios e Parceiros)</option>
                <option value="proprio">Inventário Próprio</option>
                <option value="parceiro">Inventário Parceiros</option>
              </select>
            </div>
          </div>

          {/* Grid de Cards dos Pontos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pontosFiltrados.map((ponto) => (
              <div
                key={ponto.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-4 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Foto do Ponto ou Placeholder com Badge de Score */}
                  <div className="w-full h-40 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center relative overflow-hidden mb-3">
                    {ponto.foto_url ? (
                      <img src={ponto.foto_url} alt={ponto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-[10px] font-mono">{ponto.formato}</span>
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-slate-950/80 text-teal-400 border border-teal-500/30 text-[10px]">
                      {ponto.tipo}
                    </Badge>
                    <div className="absolute top-2 right-2 bg-slate-950/90 text-white px-2 py-0.5 rounded-full border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 shadow">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span>Score {ponto.score_ooh}</span>
                    </div>
                  </div>

                  {/* Informações */}
                  <h3 className="font-semibold text-sm text-white truncate">{ponto.nome}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>{ponto.endereco} • {ponto.cidade}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Audiência/Mês</span>
                      <strong className="text-slate-200">{(ponto.impactos_mes_estimados / 1000).toFixed(0)}k</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Valor Tabela</span>
                      <strong className="text-emerald-400">R$ {formatBRL(ponto.valor_tabela)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                    {ponto.origem === "proprio" ? "Próprio" : `Parceiro: ${ponto.parceiro_nome || "Rede"}`}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => setPontoSelecionado(ponto)}
                    className="bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white text-xs h-7 gap-1"
                  >
                    <span>Perfil do Ativo</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 3. SIMULADOR DE 3 CENÁRIOS OOH */}
        <TabsContent value="cenarios" className="flex-1 m-0 p-4 overflow-y-auto space-y-6">
          {cenarios ? (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-bold text-white">Simulação Estratégica de Cenários OOH</h2>
                <p className="text-xs text-slate-400">
                  Compare os 3 cenários gerados pela IA para a praça e escolha a melhor alocação:
                </p>
              </div>

              {/* Grid dos 3 Cenários */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(["economico", "recomendado", "premium"] as const).map((cenId) => {
                  const cenario = cenarios[cenId];
                  if (!cenario) return null;
                  const isAtivo = cenarioAtivoId === cenId;

                  return (
                    <div
                      key={cenId}
                      className={`rounded-2xl p-5 flex flex-col justify-between border-2 transition-all relative ${
                        isAtivo
                          ? "bg-slate-900 border-teal-500 shadow-xl shadow-teal-500/10 ring-2 ring-teal-500/20"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {cenario.destaque && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] font-bold py-0.5 px-3 uppercase tracking-wider">
                          Recomendado IA
                        </Badge>
                      )}

                      <div>
                        <h3 className="font-bold text-base text-white">{cenario.nome}</h3>
                        <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{cenario.descricao}</p>

                        <div className="my-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 uppercase block">Investimento OOH</span>
                          <span className="text-2xl font-black text-emerald-400">
                            R$ {formatBRL(cenario.investimento_total)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            CPM Médio: R$ {cenario.cpm_medio.toFixed(2)} • Score Médio: {cenario.score_medio_ooh}/100
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Pontos Selecionados:</span>
                            <strong>{cenario.quantidade_pontos} pontos</strong>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Impactos Totais:</span>
                            <strong>{(cenario.impactos_totais / 1000000).toFixed(1)}M</strong>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Frequência Média:</span>
                            <strong>{cenario.frequencia_media}x</strong>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Diferenciais:</span>
                          {cenario.diferenciais.map((d, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setCenarioAtivoId(cenId)}
                        className={`mt-5 w-full text-xs font-semibold ${
                          isAtivo
                            ? "bg-teal-600 hover:bg-teal-500 text-white"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                        }`}
                      >
                        {isAtivo ? "Cenário Ativo" : "Selecionar Este Cenário"}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Tabela dos Pontos do Cenário Selecionado */}
              {cenarioAtual && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Pontos Alocados no {cenarioAtual.nome} ({cenarioAtual.pontos.length})
                  </h3>
                  <div className="space-y-2">
                    {cenarioAtual.pontos.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <strong className="text-white block">{p.nome}</strong>
                            <span className="text-slate-400 text-[11px]">{p.endereco} • {p.tipo}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Score OOH</span>
                            <strong className="text-emerald-400 font-bold">{p.score_ooh}/100</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Valor Negociado</span>
                            <strong className="text-white">R$ {formatBRL(p.valor_minimo_negociavel || p.valor_tabela)}</strong>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPontoSelecionado(p)}
                            className="h-7 text-xs text-teal-400 hover:bg-teal-500/10"
                          >
                            Ver Ativo
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
              Carregando simulação de cenários...
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL: PERFIL INTELIGENTE DO ATIVO (ASSET INTELLIGENCE) */}
      <Dialog open={!!pontoSelecionado} onOpenChange={(open) => !open && setPontoSelecionado(null)}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-slate-100 max-h-[85vh] overflow-y-auto">
          {pontoSelecionado && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-xs">
                    {pontoSelecionado.tipo} • {pontoSelecionado.formato}
                  </Badge>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>IA Score OOH: {pontoSelecionado.score_ooh} / 100</span>
                  </div>
                </div>
                <DialogTitle className="text-lg font-bold text-white mt-1">
                  {pontoSelecionado.nome}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{pontoSelecionado.endereco} — {pontoSelecionado.cidade}/{pontoSelecionado.estado}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Decomposição do Score OOH */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3 pb-2 border-b border-slate-800">
                  <CardTitle className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                    Detalhamento dos 5 Vetores do IA Score OOH
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">1. Visibilidade & Impacto Visual</span>
                      <strong className="text-teal-400">{pontoSelecionado.score_detalhes.visibilidade} / 25</strong>
                    </div>
                    <Progress value={(pontoSelecionado.score_detalhes.visibilidade / 25) * 100} className="h-1.5 bg-slate-800" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">2. Fluxo Diário de Veículos & Pedestres</span>
                      <strong className="text-teal-400">{pontoSelecionado.score_detalhes.fluxo} / 25</strong>
                    </div>
                    <Progress value={(pontoSelecionado.score_detalhes.fluxo / 25) * 100} className="h-1.5 bg-slate-800" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">3. Qualificação do Público & Renda</span>
                      <strong className="text-teal-400">{pontoSelecionado.score_detalhes.publico_qualificacao} / 25</strong>
                    </div>
                    <Progress value={(pontoSelecionado.score_detalhes.publico_qualificacao / 25) * 100} className="h-1.5 bg-slate-800" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">4. Localização (Gargalos & Semáforos)</span>
                      <strong className="text-teal-400">{pontoSelecionado.score_detalhes.localizacao_eixo} / 15</strong>
                    </div>
                    <Progress value={(pontoSelecionado.score_detalhes.localizacao_eixo / 15) * 100} className="h-1.5 bg-slate-800" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">5. Eficiência de Custo por Mil (CPM)</span>
                      <strong className="text-teal-400">{pontoSelecionado.score_detalhes.eficiencia_cpm} / 10</strong>
                    </div>
                    <Progress value={(pontoSelecionado.score_detalhes.eficiencia_cpm / 10) * 100} className="h-1.5 bg-slate-800" />
                  </div>
                </CardContent>
              </Card>

              {/* Informações do Perfil */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Perfil Demográfico</span>
                  <p className="text-slate-200 mt-1">
                    {pontoSelecionado.perfil_ativo.classes_predominantes.join(", ")} • {pontoSelecionado.perfil_ativo.faixa_etaria_predominante}
                  </p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Melhor Período de Venda</span>
                  <p className="text-slate-200 mt-1">{pontoSelecionado.perfil_ativo.melhor_periodo_venda}</p>
                </div>
              </div>

              {/* Clientes Potenciais Sugeridos do CRM */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  Clientes Potenciais do CRM com Alto Match:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pontoSelecionado.perfil_ativo.clientes_potenciais_crm.map((cli) => (
                    <div key={cli.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                      <div>
                        <strong className="text-white block">{cli.nome}</strong>
                        <span className="text-slate-500 text-[10px]">{cli.segmento}</span>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[10px]">
                        Match {cli.match_score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valores & Reserva */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Valor Mensal Negociável</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-emerald-400">
                      R$ {formatBRL(pontoSelecionado.valor_minimo_negociavel || pontoSelecionado.valor_tabela)}
                    </span>
                    <span className="text-xs text-slate-500 line-through">
                      Tab: R$ {formatBRL(pontoSelecionado.valor_tabela)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success(`Reserva temporária solicitada para ${pontoSelecionado.nome}!`);
                    setPontoSelecionado(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Reservar Ponto no Inventário
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
