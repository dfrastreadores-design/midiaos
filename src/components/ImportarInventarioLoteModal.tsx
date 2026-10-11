import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FolderUp,
  FileSpreadsheet,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Layers,
  Building2,
  KeyRound,
  RefreshCw,
  FolderSync,
} from "lucide-react";
import { toast } from "sonner";
import {
  processarArquivoInventarioGemini,
  type ResultadoProcessamentoInventario,
} from "@/lib/inventario-gemini.functions";

interface FileItemState {
  id: string;
  file: File;
  name: string;
  size: number;
  type: "pdf" | "planilha" | "csv" | "outro";
  status: "pendente" | "processando" | "sucesso" | "aviso" | "erro";
  etapaTexto?: string;
  resultado?: ResultadoProcessamentoInventario;
  mensagemErro?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parceiroInicialId?: string;
  onSuccess?: () => void;
}

export function ImportarInventarioLoteModal({
  open,
  onOpenChange,
  parceiroInicialId,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const processarFn = useServerFn(processarArquivoInventarioGemini);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItemState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [apiKeyCustom, setApiKeyCustom] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("GEMINI_CUSTOM_KEY") || "" : "";
  });
  const [mostrarConfigKey, setMostrarConfigKey] = useState(false);
  const [resumoFinal, setResumoFinal] = useState<{
    parceirosAfetados: number;
    produtosCadastrados: number;
    produtosAtualizados: number;
    totalProdutos: number;
  } | null>(null);

  // Classifica tipo de arquivo
  const detectFileType = (file: File): "pdf" | "planilha" | "csv" | "outro" => {
    const ext = file.name.toLowerCase();
    if (ext.endsWith(".pdf")) return "pdf";
    if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) return "planilha";
    if (ext.endsWith(".csv")) return "csv";
    return "outro";
  };

  // Converte arquivo para Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Converte planilha (todas as abas) para texto estruturado no browser usando xlsx
  const spreadsheetToStructuredText = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const parts: string[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const csv = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
        if (csv && csv.trim().length > 0) {
          parts.push(`=== ABA: ${sheetName} ===\n${csv}`);
        }
      }

      return parts.join("\n\n");
    } catch (err: any) {
      console.warn("Falha ao ler abas da planilha:", err?.message);
      return await file.text();
    }
  };

  // Adiciona arquivos à fila
  const handleAddFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems: FileItemState[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      const type = detectFileType(f);
      if (type === "outro" && !f.name.toLowerCase().endsWith(".txt")) {
        // Ignora extensões não suportadas
        continue;
      }
      newItems.push({
        id: `${f.name}-${f.size}-${Date.now()}-${i}`,
        file: f,
        name: f.name,
        size: f.size,
        type,
        status: "pendente",
        etapaTexto: "Aguardando início",
      });
    }

    if (newItems.length === 0) {
      toast.warning("Nenhum arquivo PDF, Excel (.xlsx/.xls) ou CSV válido foi selecionado.");
      return;
    }

    setFiles((prev) => [...prev, ...newItems]);
    setResumoFinal(null);
    toast.info(`${newItems.length} arquivo(s) adicionado(s) à fila de importação.`);
  };

  // Salva chave opcional do Gemini no localStorage
  const handleSaveApiKey = (key: string) => {
    setApiKeyCustom(key);
    if (typeof window !== "undefined") {
      if (key.trim()) {
        localStorage.setItem("GEMINI_CUSTOM_KEY", key.trim());
      } else {
        localStorage.removeItem("GEMINI_CUSTOM_KEY");
      }
    }
  };

  // Executa o processamento em lote com concorrência controlada (2 por vez)
  const processarFila = async () => {
    if (files.length === 0) {
      toast.warning("Adicione arquivos antes de iniciar a importação.");
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    setCurrentFileIndex(0);
    setResumoFinal(null);

    const parceirosMap = new Map<string, string>();
    let totalProdsCriados = 0;
    let totalProdsAtualizados = 0;
    const totalFiles = files.length;
    let completedCount = 0;

    // Atualiza status de um item específico na lista
    const updateItem = (id: string, updates: Partial<FileItemState>) => {
      setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    // Função de processamento individual
    const processarArquivoIndividual = async (item: FileItemState, idx: number) => {
      setCurrentFileIndex(idx + 1);
      setStatusMessage(`Analisando arquivo ${idx + 1} de ${totalFiles}: ${item.name}...`);
      updateItem(item.id, {
        status: "processando",
        etapaTexto: "Extraindo dados do arquivo...",
      });

      try {
        let base64Data: string | undefined;
        let textoData: string | undefined;

        if (item.type === "pdf") {
          updateItem(item.id, { etapaTexto: "Convertendo PDF para análise multimodal..." });
          base64Data = await fileToBase64(item.file);
        } else if (item.type === "planilha" || item.type === "csv") {
          updateItem(item.id, { etapaTexto: "Lendo todas as abas da planilha..." });
          textoData = await spreadsheetToStructuredText(item.file);
        } else {
          textoData = await item.file.text();
        }

        updateItem(item.id, { etapaTexto: "Extraindo mídias via IA Gemini 2.5 Flash..." });
        setStatusMessage(`Extraindo mídias via IA para ${item.name}...`);

        const res = await processarFn({
          data: {
            nomeArquivo: item.name,
            tipoArquivo: item.type,
            conteudoBase64: base64Data || null,
            conteudoTexto: textoData || null,
            parceiroIdPredefinido: parceiroInicialId || null,
            apiKeyCustom: apiKeyCustom || null,
          },
        });

        if (res.sucesso) {
          if (res.parceiro?.nome_fantasia) {
            parceirosMap.set(res.parceiro.id || res.parceiro.nome_fantasia, res.parceiro.nome_fantasia);
          }
          totalProdsCriados += res.produtosCadastrados;
          totalProdsAtualizados += res.produtosAtualizados;

          const statusFinal = res.totalProdutos === 0 ? "aviso" : "sucesso";
          const etapaMsg =
            res.totalProdutos === 0
              ? "Sem produtos legíveis detectados"
              : `${res.parceiro.nome_fantasia} (${res.totalProdutos} mídias vinculadas)`;

          updateItem(item.id, {
            status: statusFinal,
            etapaTexto: etapaMsg,
            resultado: res,
          });
        } else {
          updateItem(item.id, {
            status: "erro",
            etapaTexto: "Falha na extração",
            mensagemErro: res.erro || "Não foi possível extrair dados",
          });
        }
      } catch (err: any) {
        console.error(`Erro ao processar ${item.name}:`, err);
        updateItem(item.id, {
          status: "erro",
          etapaTexto: "Erro no processamento",
          mensagemErro: err?.message || "Falha inesperada",
        });
      } finally {
        completedCount++;
        setProgressPercent(Math.round((completedCount / totalFiles) * 100));
      }
    };

    // Concorrência controlada: máximo 2 requisições simultâneas
    const CONCURRENCY = 2;
    const queue = files.map((item, index) => ({ item, index }));
    const workers = Array(Math.min(CONCURRENCY, queue.length))
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (task) {
            await processarArquivoIndividual(task.item, task.index);
          }
        }
      });

    await Promise.allSettled(workers);

    setIsProcessing(false);
    setStatusMessage("Importação concluída com sucesso!");

    const finalSummary = {
      parceirosAfetados: parceirosMap.size,
      produtosCadastrados: totalProdsCriados,
      produtosAtualizados: totalProdsAtualizados,
      totalProdutos: totalProdsCriados + totalProdsAtualizados,
    };
    setResumoFinal(finalSummary);

    // Invalida cache do Supabase para atualizar imediatamente a contagem e a listagem de parceiros
    qc.invalidateQueries({ queryKey: ["parceiros"] });
    qc.invalidateQueries({ queryKey: ["produtos"] });

    toast.success("Importação concluída com sucesso!", {
      description: `${finalSummary.parceirosAfetados} parceiros atualizados e ${finalSummary.totalProdutos} produtos cadastrados com sucesso.`,
    });

    if (onSuccess) {
      onSuccess();
    }
  };

  const handleLimparFila = () => {
    setFiles([]);
    setResumoFinal(null);
    setProgressPercent(0);
    setCurrentFileIndex(0);
    setStatusMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Importação Automática & Extração Inteligente
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Gemini 2.5 Flash
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Arraste arquivos avulsos ou uma pasta inteira de Mídia Kits (PDF), planilhas (Excel/CSV) e propostas comerciais.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => setMostrarConfigKey(!mostrarConfigKey)}
            >
              <KeyRound className="size-3.5" />
              {mostrarConfigKey ? "Ocultar Chave" : "Chave IA"}
            </Button>
          </div>

          {mostrarConfigKey && (
            <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/60 text-xs flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Chave Gemini API (Opcional se já estiver no .env):</label>
              <input
                type="password"
                placeholder="AIzaSy... (se vazio, usa GEMINI_API_KEY do servidor)"
                className="w-full px-2.5 py-1.5 bg-background border rounded text-xs"
                value={apiKeyCustom}
                onChange={(e) => handleSaveApiKey(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">
                A chave é salva localmente no navegador e enviada com segurança apenas para autenticar as requisições ao modelo Gemini.
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Área de Seleção e Arrastar Arquivos */}
        <div className="flex flex-col gap-4 py-3 flex-1 overflow-hidden">
          {files.length === 0 ? (
            <div
              className="border-2 border-dashed border-purple-300 dark:border-purple-900/60 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-purple-50/30 dark:bg-purple-950/10 hover:bg-purple-50/60 dark:hover:bg-purple-950/20 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleAddFiles(e.dataTransfer.files);
              }}
            >
              <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 mb-3">
                <Upload className="size-8" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Arraste seus arquivos aqui ou selecione do computador
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                Suporta múltiplos arquivos simultâneos em PDF (Mídia Kits, tabelas), Excel (.xlsx, .xls) com abas múltiplas e CSVs despadronizados.
              </p>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-purple-300 text-purple-700 dark:text-purple-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FileSpreadsheet className="size-4" />
                  Selecionar Arquivos em Lote
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-indigo-300 text-indigo-700 dark:text-indigo-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    folderInputRef.current?.click();
                  }}
                >
                  <FolderUp className="size-4" />
                  Selecionar Pasta Inteira
                </Button>
              </div>

              {/* Inputs Ocultos */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error webkitdirectory é padrão de pastas
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
              {/* Barra de Ações Rápidas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Fila de Arquivos ({files.length}):
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {files.filter((f) => f.status === "sucesso").length} concluídos
                  </Badge>
                  {files.some((f) => f.status === "aviso") && (
                    <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300">
                      {files.filter((f) => f.status === "aviso").length} avisos
                    </Badge>
                  )}
                </div>

                {!isProcessing && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      + Adicionar Mais
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-destructive hover:bg-destructive/10"
                      onClick={handleLimparFila}
                    >
                      Limpar Fila
                    </Button>
                  </div>
                )}
              </div>

              {/* Indicador de Progresso Geral */}
              {isProcessing && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin text-purple-600" />
                      {statusMessage}
                    </span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {progressPercent}%
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2 bg-purple-200 dark:bg-purple-900" />
                </div>
              )}

              {/* Resumo Final Pós-Processamento */}
              {resumoFinal && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Importação Concluída:</strong> {resumoFinal.parceirosAfetados} parceiros atualizados e{" "}
                      <strong>{resumoFinal.totalProdutos} produtos/mídias cadastrados</strong> no Supabase!
                    </span>
                  </div>
                </div>
              )}

              {/* Lista dos Arquivos na Fila */}
              <ScrollArea className="flex-1 border rounded-lg overflow-y-auto max-h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status / Extração</TableHead>
                      <TableHead className="text-right">Mídias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((item) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-medium max-w-[240px] truncate" title={item.name}>
                          <div className="flex items-center gap-2">
                            {item.type === "pdf" ? (
                              <FileText className="size-4 text-red-500 shrink-0" />
                            ) : (
                              <FileSpreadsheet className="size-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {item.type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {item.status === "processando" && (
                              <Loader2 className="size-3.5 animate-spin text-purple-600 shrink-0" />
                            )}
                            {item.status === "sucesso" && (
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            )}
                            {item.status === "aviso" && (
                              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                            )}
                            {item.status === "erro" && (
                              <XCircle className="size-3.5 text-rose-500 shrink-0" />
                            )}
                            <span
                              className={`truncate max-w-[260px] ${
                                item.status === "sucesso"
                                  ? "text-emerald-700 dark:text-emerald-300 font-medium"
                                  : item.status === "aviso"
                                    ? "text-amber-700 dark:text-amber-300"
                                    : item.status === "erro"
                                      ? "text-rose-600"
                                      : "text-muted-foreground"
                              }`}
                              title={item.mensagemErro || item.etapaTexto}
                            >
                              {item.mensagemErro || item.etapaTexto}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                          {item.resultado ? (
                            <Badge
                              variant="secondary"
                              className={
                                item.resultado.totalProdutos > 0
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {item.resultado.totalProdutos}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex flex-row items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            <span>Vincula e cadastra fornecedores e produtos automaticamente no inventário.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => onOpenChange(false)}
            >
              {resumoFinal ? "Fechar" : "Cancelar"}
            </Button>

            {files.length > 0 && !resumoFinal && (
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
                disabled={isProcessing}
                onClick={processarFila}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Iniciar Extração Inteligente
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
