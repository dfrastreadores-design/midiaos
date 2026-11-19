import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  Maximize2, 
  Minimize2,
  Columns,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listClientes } from "@/lib/clientes.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { 
  conversarCopilotoPlanejamento,
  registrarAprendizadoCopiloto,
  converterPlanejamentoEmPi,
  gerarPlanejamentoInicialHeuristico
} from "@/lib/copiloto-planejamento.functions";
import { 
  exportarApresentacaoPptx, 
  exportarPlanejamentoPdf 
} from "@/lib/copiloto-export-apresentacao";
import type { 
  PlanejamentoEstrategicoCompleto, 
  ChatMensagemCopiloto 
} from "@/lib/copiloto-planejamento.types";
import { CopilotoChatPanel } from "./CopilotoChatPanel";
import { CopilotoDossieCanvas } from "./CopilotoDossieCanvas";

export const CopilotoPlanejamentoMasterView: React.FC = () => {
  const queryClient = useQueryClient();

  // Queries de CRM e Inventário
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-copiloto-plan"],
    queryFn: () => listClientes(),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-copiloto-plan"],
    queryFn: () => listProdutos(),
  });

  // Server functions
  const conversarFn = useServerFn(conversarCopilotoPlanejamento);
  const registrarAprendizadoFn = useServerFn(registrarAprendizadoCopiloto);
  const converterPiFn = useServerFn(converterPlanejamentoEmPi);

  // Estados locais
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);
  const [planejamento, setPlanejamento] = useState<PlanejamentoEstrategicoCompleto | null>(null);
  const [mensagens, setMensagens] = useState<ChatMensagemCopiloto[]>([]);
  const [modoMobile, setModoMobile] = useState<"chat" | "dossie">("dossie");

  // Inicialização com primeiro planejamento heurístico ao carregar
  useEffect(() => {
    if (!planejamento && produtos.length >= 0) {
      const planoInicial = gerarPlanejamentoInicialHeuristico({
        clienteCrm: null,
        produtos: produtos || [],
      });
      setPlanejamento(planoInicial);
      setMensagens(planoInicial.mensagens_chat);
    }
  }, [produtos]);

  // Se trocar cliente no dropdown, recalibrar o plano inicial para o novo cliente
  const handleSelecionarCliente = (clienteId: string | null) => {
    setClienteSelecionadoId(clienteId);
    const cli = clientes.find((c: any) => c.id === clienteId);
    if (cli) {
      const planoNovo = gerarPlanejamentoInicialHeuristico({
        clienteCrm: cli,
        clienteNome: cli.nome,
        segmento: cli.segmento,
        praca: cli.cidade || "Capital e Região Metropolitana",
        orcamento: 30000,
        duracaoDias: 30,
        produtos: produtos || [],
      });
      setPlanejamento(planoNovo);
      setMensagens(planoNovo.mensagens_chat);
      toast.info(`Estrategista calibrado para o cliente ${cli.nome}.`);
    }
  };

  // Mutação para conversar com a IA
  const mutationConversar = useMutation({
    mutationFn: async (texto: string) => {
      // Adicionar mensagem do usuário localmente imediato
      const msgUsuario: ChatMensagemCopiloto = {
        id: "msg_user_" + Date.now().toString(36),
        role: "user",
        content: texto,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMensagens((prev) => [...prev, msgUsuario]);

      const cli = clientes.find((c: any) => c.id === clienteSelecionadoId);

      const res = await conversarFn({
        data: {
          mensagem_usuario: texto,
          historico_mensagens: [...mensagens, msgUsuario],
          planejamento_atual: planejamento,
          cliente_id: clienteSelecionadoId,
          cliente_nome: cli?.nome || planejamento?.briefing.cliente_nome,
          segmento: cli?.segmento || planejamento?.briefing.segmento,
          praca: cli?.cidade || planejamento?.briefing.praca_alvo,
          orcamento: planejamento?.briefing.orcamento_total,
          duracao_dias: planejamento?.briefing.duracao_dias,
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      if (data?.sucesso && data?.planejamento) {
        setPlanejamento(data.planejamento);
        if (data.mensagem_ia) {
          setMensagens((prev) => [...prev, data.mensagem_ia]);
        }
        toast.success("Planejamento estratégico atualizado pelo Estrategista!");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao consultar o estrategista de mídia.");
    },
  });

  // Mutação para Converter em Pedido de Inserção (PI)
  const mutationConverterPi = useMutation({
    mutationFn: async () => {
      if (!planejamento) throw new Error("Nenhum planejamento disponível.");
      return await converterPiFn({
        data: {
          planejamento: planejamento,
          cliente_id: clienteSelecionadoId || planejamento.briefing.cliente_id,
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.sucesso) {
        toast.success(res.mensagem || "Pedido de Inserção gerado com sucesso!", {
          duration: 6000,
        });
        if (res.proposta_id) {
          queryClient.invalidateQueries({ queryKey: ["propostas"] });
        }
        if (res.pi_id) {
          queryClient.invalidateQueries({ queryKey: ["pedidos_insercao"] });
        }
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao gerar Pedido de Inserção.");
    },
  });

  // Mutação para Registrar Aprendizado Contínuo da IA
  const mutationAprendizado = useMutation({
    mutationFn: async (dados: { estrelas: number; feedback: string }) => {
      if (!planejamento) return;
      return await registrarAprendizadoFn({
        data: {
          planejamento_id: planejamento.id,
          status_aprovacao: "aprovado",
          estrelas_avaliacao: dados.estrelas,
          feedback_usuario: dados.feedback,
          planejamento_snapshot: planejamento,
        },
      });
    },
    onSuccess: () => {
      toast.success("Feedback registrado! A IA aprendeu com suas preferências para próximos planejamentos.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar avaliação.");
    },
  });

  // Exportações
  const handleExportarPptx = async () => {
    if (!planejamento) return;
    toast.promise(exportarApresentacaoPptx(planejamento), {
      loading: "Gerando apresentação 16:9 em PPTX...",
      success: "Apresentação executiva baixada com sucesso!",
      error: "Falha ao gerar arquivo PPTX.",
    });
  };

  const handleExportarPdf = () => {
    if (!planejamento) return;
    try {
      exportarPlanejamentoPdf(planejamento);
      toast.success("Dossiê estratégico em PDF gerado!");
    } catch (e: any) {
      toast.error("Falha ao exportar PDF: " + e.message);
    }
  };

  const handleSelecionarCenario = (cenarioId: "conservador" | "recomendado" | "agressivo") => {
    if (!planejamento) return;
    const novo = { ...planejamento };
    novo.cenarios = { ...novo.cenarios, ativo: cenarioId };
    
    // Recalibrar valor total conforme o cenário
    const cen = novo.cenarios.lista.find((c) => c.id === cenarioId);
    if (cen) {
      novo.distribuicao_investimento.valor_total = cen.investimento_total;
      novo.briefing.orcamento_total = cen.investimento_total;
    }
    setPlanejamento(novo);
    toast.info(`Cenário "${cen?.nome}" ativado no dossiê.`);
  };

  const handleReiniciar = () => {
    const planoNovo = gerarPlanejamentoInicialHeuristico({
      clienteCrm: null,
      produtos: produtos || [],
    });
    setClienteSelecionadoId(null);
    setPlanejamento(planoNovo);
    setMensagens(planoNovo.mensagens_chat);
    toast.info("Sessão reiniciada.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-slate-950 overflow-hidden">
      {/* Barra de Alternância em Telas Pequenas (Mobile/Tablet) */}
      <div className="lg:hidden flex items-center justify-between p-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <Button
            size="sm"
            variant={modoMobile === "chat" ? "default" : "ghost"}
            onClick={() => setModoMobile("chat")}
            className="text-xs h-7"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            Chat IA
          </Button>
          <Button
            size="sm"
            variant={modoMobile === "dossie" ? "default" : "ghost"}
            onClick={() => setModoMobile("dossie")}
            className="text-xs h-7"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Dossiê Estratégico
          </Button>
        </div>
      </div>

      {/* Layout Split-Screen Desktop */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: ChatGPT do Estrategista de Mídia */}
        <div
          className={`w-full lg:w-[420px] xl:w-[480px] h-full flex flex-col shrink-0 ${
            modoMobile === "dossie" ? "hidden lg:flex" : "flex"
          }`}
        >
          <CopilotoChatPanel
            mensagens={mensagens}
            planejamento={planejamento}
            carregando={mutationConversar.isPending}
            clientes={clientes}
            clienteSelecionadoId={clienteSelecionadoId}
            onSelecionarCliente={handleSelecionarCliente}
            onEnviarMensagem={(txt) => mutationConversar.mutate(txt)}
            onReiniciarConversa={handleReiniciar}
          />
        </div>

        {/* Painel Direito: Dossiê Estratégico Interativo (9 Seções) */}
        <div
          className={`flex-1 h-full flex flex-col min-w-0 ${
            modoMobile === "chat" ? "hidden lg:flex" : "flex"
          }`}
        >
          {planejamento ? (
            <CopilotoDossieCanvas
              planejamento={planejamento}
              onExportarPptx={handleExportarPptx}
              onExportarPdf={handleExportarPdf}
              onConverterPi={() => mutationConverterPi.mutate()}
              onSelecionarCenario={handleSelecionarCenario}
              onAvaliarAprendizado={(est, feed) =>
                mutationAprendizado.mutate({ estrelas: est, feedback: feed })
              }
              carregandoAcao={mutationConverterPi.isPending || mutationAprendizado.isPending}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Carregando inteligência de planejamento de mídia...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
