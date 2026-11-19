import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RotateCcw, 
  Building2, 
  TrendingUp, 
  Target, 
  Layers, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatMensagemCopiloto, PlanejamentoEstrategicoCompleto } from "@/lib/copiloto-planejamento.types";

interface CopilotoChatPanelProps {
  mensagens: ChatMensagemCopiloto[];
  planejamento: PlanejamentoEstrategicoCompleto | null;
  carregando: boolean;
  clientes: Array<{ id: string; nome: string; segmento?: string; cidade?: string }>;
  clienteSelecionadoId: string | null;
  onSelecionarCliente: (clienteId: string | null) => void;
  onEnviarMensagem: (texto: string) => void;
  onReiniciarConversa: () => void;
}

export const CopilotoChatPanel: React.FC<CopilotoChatPanelProps> = ({
  mensagens,
  planejamento,
  carregando,
  clientes,
  clienteSelecionadoId,
  onSelecionarCliente,
  onEnviarMensagem,
  onReiniciarConversa,
}) => {
  const [inputTexto, setInputTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, carregando]);

  const handleEnviar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim() || carregando) return;
    const txt = inputTexto.trim();
    setInputTexto("");
    onEnviarMensagem(txt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadBriefing = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const conteudo = event.target?.result as string;
      const textoBriefing = `[BRIEFING ANEXADO: ${file.name}]\n${conteudo.slice(0, 3000)}\n\nPor favor, analise este briefing, entenda os objetivos comerciais e estruture o planejamento de mídia completo.`;
      onEnviarMensagem(textoBriefing);
    };
    reader.readAsText(file);
    // Limpar input
    e.target.value = "";
  };

  const sugestoesIniciais = [
    "Preciso criar uma campanha para uma rede de supermercados aumentar fluxo nas lojas.",
    "Montar plano com foco em alta frequência no centro",
    "Priorizar painéis digitais de LED (DOOH)",
    "Simular cenário com orçamento de R$ 35.000",
    "Elaborar defesa imbatível contra anúncios no Meta e Google",
    "Focar em público de alto padrão (Classes A e B)",
  ];

  const ultimasAcoes = mensagens.length > 0 ? mensagens[mensagens.length - 1].acoes_sugeridas : undefined;

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border-r border-slate-800/80 text-slate-100">
      {/* Input oculto para upload de briefing */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx,.csv,.json"
        onChange={handleUploadBriefing}
        className="hidden"
      />

      {/* Header do Chat */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white">MÍDIA.OS INTELLIGENCE</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-400 bg-blue-500/10">
                4.0 Senior
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">Estrategista de Mídia & Planejamento</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Upload de Briefing / Documentos
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReiniciarConversa}
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Reiniciar Conversa e Planejamento
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Seletor Rápido de Cliente CRM */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-[11px] font-medium text-slate-400 shrink-0">Cliente CRM:</span>
        <select
          value={clienteSelecionadoId || ""}
          onChange={(e) => onSelecionarCliente(e.target.value || null)}
          className="bg-slate-950 text-xs text-slate-200 border border-slate-700/70 rounded px-2 py-1 flex-1 focus:outline-none focus:border-blue-500 truncate"
        >
          <option value="">Novo Cliente / Sem Vínculo Prévio</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} {c.segmento ? `(${c.segmento})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Área de Mensagens (Estilo ChatGPT) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs leading-relaxed ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <Avatar className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-700 shrink-0 border border-blue-400/30">
                  <AvatarFallback className="bg-transparent text-white text-[11px] font-bold">
                    IA
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-md ${
                  isUser
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>
                <div
                  className={`mt-1.5 text-[10px] text-right ${
                    isUser ? "text-blue-200" : "text-slate-500"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {isUser && (
                <Avatar className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 border border-slate-700">
                  <AvatarFallback className="bg-transparent text-slate-300 text-[11px]">
                    <User className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {/* Indicador de Raciocínio da IA */}
        {carregando && (
          <div className="flex gap-3 text-xs justify-start items-center">
            <Avatar className="w-7 h-7 rounded-lg bg-blue-600 shrink-0 animate-pulse">
              <AvatarFallback className="bg-transparent text-white text-[11px]">IA</AvatarFallback>
            </Avatar>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-slate-400 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[11px] text-blue-300 font-medium">
                Estrategista sênior analisando território, inventário e KPIs...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chips de Ações Sugeridas */}
      <div className="px-3 pt-2 pb-1 border-t border-slate-800/80 bg-slate-950/90">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
            Ações Rápidas Sugeridas:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {(ultimasAcoes && ultimasAcoes.length > 0 ? ultimasAcoes : sugestoesIniciais).map((sugestao, idx) => (
            <button
              key={idx}
              disabled={carregando}
              onClick={() => onEnviarMensagem(sugestao)}
              className="text-[11px] text-left bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-800 hover:border-blue-500/50 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{sugestao}</span>
              <ArrowRight className="w-2.5 h-2.5 text-blue-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Campo de Entrada de Mensagem (Tipo ChatGPT) */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleEnviar} className="relative">
          <Textarea
            ref={textareaRef}
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Converse com o Estrategista de Mídia... (Ex: 'Aumente o foco em DOOH na zona sul')"
            rows={2}
            disabled={carregando}
            className="w-full bg-slate-950 border-slate-700/80 rounded-xl pr-20 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivo de briefing"
            className="absolute left-2.5 bottom-3.5 text-slate-400 hover:text-blue-400 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <Button
            type="submit"
            size="icon"
            disabled={!inputTexto.trim() || carregando}
            className="absolute right-2.5 bottom-2.5 h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-all shadow-md shadow-blue-600/30"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
        <p className="text-[10px] text-slate-500 text-center mt-1.5">
          Pressione <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-[9px]">Enter</kbd> para enviar • <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-[9px]">Shift+Enter</kbd> para quebrar linha
        </p>
      </div>
    </div>
  );
};
