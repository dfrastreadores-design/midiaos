import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal,
  Undo2,
  MapPin,
  Download,
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  CheckCheck,
  ChevronDown,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  DollarSign,
  HelpCircle,
} from "lucide-react";

export type FiltroProduto =
  | "todos"
  | "incompletos"
  | "sem_preco"
  | "sem_localizacao"
  | "sem_foto"
  | "pendentes_revisao"
  | "erros_validacao"
  | "apenas_selecionados";

interface LoteAcoesBarProps {
  totalProdutos: number;
  totalSelecionados: number;
  totalFiltrados: number;
  filtroAtivo: FiltroProduto;
  onMudarFiltro: (filtro: FiltroProduto) => void;
  busca: string;
  onBuscaChange: (termo: string) => void;
  onSelecionarTodos: () => void;
  onSelecionarNenhum: () => void;
  onSelecionarFiltrados: () => void;
  onAbrirEdicaoLote: () => void;
  onAbrirAplicarPadrao: () => void;
  onDesfazerLote: () => void;
  podeDesfazer: boolean;
  totalUndoDisponivel: number;
  onGeocodificarSelecionados: () => void;
  geocodificandoLote: boolean;
  onExportarExcel: (formato: "xlsx" | "csv") => void;
  onImportarPlanilhaClick: () => void;
  totalFotosPendentes: number;
  onToggleGaleriaFotos: () => void;
  mostrarGaleriaFotos: boolean;
  contadoresFiltros: {
    todos: number;
    incompletos: number;
    sem_preco: number;
    sem_localizacao: number;
    sem_foto: number;
    pendentes_revisao: number;
    erros_validacao: number;
  };
}

export function LoteAcoesBar({
  totalProdutos,
  totalSelecionados,
  totalFiltrados,
  filtroAtivo,
  onMudarFiltro,
  busca,
  onBuscaChange,
  onSelecionarTodos,
  onSelecionarNenhum,
  onSelecionarFiltrados,
  onAbrirEdicaoLote,
  onAbrirAplicarPadrao,
  onDesfazerLote,
  podeDesfazer,
  totalUndoDisponivel,
  onGeocodificarSelecionados,
  geocodificandoLote,
  onExportarExcel,
  onImportarPlanilhaClick,
  totalFotosPendentes,
  onToggleGaleriaFotos,
  mostrarGaleriaFotos,
  contadoresFiltros,
}: LoteAcoesBarProps) {
  return (
    <div className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/80">
      {/* LINHA 1: BARRA DE AÇÕES PARA PRODUTOS SELECIONADOS */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Controle de Seleção */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium">
                {totalSelecionados === 0 ? (
                  <Square className="size-3.5 text-muted-foreground" />
                ) : totalSelecionados === totalProdutos ? (
                  <CheckCheck className="size-3.5 text-primary" />
                ) : (
                  <CheckSquare className="size-3.5 text-primary" />
                )}
                <span>Seleção ({totalSelecionados})</span>
                <ChevronDown className="size-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 text-xs">
              <DropdownMenuItem onClick={onSelecionarTodos} className="gap-2">
                <CheckCheck className="size-3.5 text-primary" />
                Selecionar Todos ({totalProdutos})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSelecionarFiltrados} className="gap-2">
                <CheckSquare className="size-3.5 text-primary" />
                Selecionar Itens Filtrados ({totalFiltrados})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSelecionarNenhum} className="gap-2 text-muted-foreground">
                <Square className="size-3.5" />
                Desmarcar Todos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant="secondary" className="text-[11px] font-semibold h-7 px-2">
            {totalSelecionados} de {totalProdutos} selecionados
            {totalFiltrados !== totalProdutos && ` (${totalFiltrados} na visão)`}
          </Badge>

          {/* Botão de Desfazer Última Edição em Lote */}
          {podeDesfazer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDesfazerLote}
              className="h-8 text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100"
              title="Desfazer a última alteração em lote feita nesta sessão"
            >
              <Undo2 className="size-3.5" />
              Desfazer Lote ({totalUndoDisponivel})
            </Button>
          )}
        </div>

        {/* Botões de Ação em Lote */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onAbrirEdicaoLote}
            disabled={totalSelecionados === 0}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs"
            title="Alterar múltiplos produtos de uma vez"
          >
            <SlidersHorizontal className="size-3.5" />
            Editar em Lote ({totalSelecionados})
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAbrirAplicarPadrao}
            disabled={totalSelecionados === 0}
            className="h-8 text-xs gap-1.5"
            title="Aplicar valores padrão aos selecionados (ex: Brasília/DF, Formato, Mídia) sem perder dados já preenchidos"
          >
            <Sparkles className="size-3.5 text-purple-600" />
            Aplicar Padrão
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGeocodificarSelecionados}
            disabled={totalSelecionados === 0 || geocodificandoLote}
            className="h-8 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
            title="Buscar coordenadas dos endereços dos produtos selecionados via serviço de mapas"
          >
            <MapPin className="size-3.5 text-emerald-600" />
            {geocodificandoLote ? "Geocodificando..." : "Geocodificar Lote"}
          </Button>

          {/* Dropdown de Exportar / Importar Planilha */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                <span>Planilha</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem onClick={() => onExportarExcel("xlsx")} className="gap-2">
                <Download className="size-3.5 text-emerald-600" />
                Exportar Grade para Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportarExcel("csv")} className="gap-2">
                <Download className="size-3.5" />
                Exportar Grade para CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onImportarPlanilhaClick} className="gap-2 text-primary font-medium">
                <Upload className="size-3.5 text-primary" />
                Importar Planilha Corrigida...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Toggle da Galeria de Fotos */}
          <Button
            type="button"
            variant={mostrarGaleriaFotos ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleGaleriaFotos}
            className="h-8 text-xs gap-1"
          >
            <ImageIcon className="size-3.5 text-primary" />
            Fotos Mídia Kit
            {totalFotosPendentes > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
                {totalFotosPendentes} pendentes
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* LINHA 2: CHIPS DE FILTRO E CAMPO DE BUSCA RÁPIDA */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <Button
            type="button"
            size="sm"
            variant={filtroAtivo === "todos" ? "secondary" : "ghost"}
            className={`h-7 text-xs px-2.5 rounded-full ${
              filtroAtivo === "todos" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
            }`}
            onClick={() => onMudarFiltro("todos")}
          >
            Todos ({contadoresFiltros.todos})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filtroAtivo === "incompletos" ? "secondary" : "ghost"}
            className={`h-7 text-xs px-2.5 rounded-full ${
              filtroAtivo === "incompletos"
                ? "bg-red-500/15 text-red-700 dark:text-red-300 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => onMudarFiltro("incompletos")}
          >
            Incompletos ({contadoresFiltros.incompletos})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filtroAtivo === "sem_preco" ? "secondary" : "ghost"}
            className={`h-7 text-xs px-2.5 rounded-full ${
              filtroAtivo === "sem_preco"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => onMudarFiltro("sem_preco")}
          >
            Sem Preço ({contadoresFiltros.sem_preco})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filtroAtivo === "sem_localizacao" ? "secondary" : "ghost"}
            className={`h-7 text-xs px-2.5 rounded-full ${
              filtroAtivo === "sem_localizacao"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => onMudarFiltro("sem_localizacao")}
          >
            Sem Localização ({contadoresFiltros.sem_localizacao})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filtroAtivo === "sem_foto" ? "secondary" : "ghost"}
            className={`h-7 text-xs px-2.5 rounded-full ${
              filtroAtivo === "sem_foto"
                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => onMudarFiltro("sem_foto")}
          >
            Sem Foto Real ({contadoresFiltros.sem_foto})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filtroAtivo === "pendentes_revisao" ? "secondary" : "ghost"}
            className={`h-7 text-xs px-2.5 rounded-full ${
              filtroAtivo === "pendentes_revisao"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => onMudarFiltro("pendentes_revisao")}
          >
            Pendentes Revisão ({contadoresFiltros.pendentes_revisao})
          </Button>

          {contadoresFiltros.erros_validacao > 0 && (
            <Button
              type="button"
              size="sm"
              variant={filtroAtivo === "erros_validacao" ? "secondary" : "ghost"}
              className={`h-7 text-xs px-2.5 rounded-full ${
                filtroAtivo === "erros_validacao"
                  ? "bg-destructive/15 text-destructive font-semibold"
                  : "text-destructive"
              }`}
              onClick={() => onMudarFiltro("erros_validacao")}
            >
              Erros ({contadoresFiltros.erros_validacao})
            </Button>
          )}

          {totalSelecionados > 0 && (
            <Button
              type="button"
              size="sm"
              variant={filtroAtivo === "apenas_selecionados" ? "secondary" : "ghost"}
              className={`h-7 text-xs px-2.5 rounded-full ${
                filtroAtivo === "apenas_selecionados"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
              onClick={() => onMudarFiltro("apenas_selecionados")}
            >
              Apenas Selecionados ({totalSelecionados})
            </Button>
          )}
        </div>

        {/* Busca por texto */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, ponto, cidade..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="h-7 text-xs pl-8 pr-2"
          />
        </div>
      </div>
    </div>
  );
}
