import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUp, FileText, Presentation, Loader2, Sparkles, CheckCircle2, AlertCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listUsuarios } from "@/lib/usuarios.functions";
import { upsertProposta } from "@/lib/propostas.functions";
import { extractDocumentText, parsePropostaDocument, type ParsedPropostaData } from "@/lib/proposta-import-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (newPropostaId: string) => void;
};

export function ImportarPropostaDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStep, setSaveStep] = useState<string>("");
  const [showRawText, setShowRawText] = useState(false);

  // Formulário preenchido automaticamente
  const [formData, setFormData] = useState<ParsedPropostaData>({
    cliente_id: null,
    cliente_avulso: null,
    agencia_id: null,
    campanha: "",
    valor_negociado: 0,
    valor_tabela: 0,
    validade: "",
    observacao: "",
    rawText: "",
  });

  const [executivoId, setExecutivoId] = useState<string>("");
  const [tipoCliente, setTipoCliente] = useState<"cadastrado" | "avulso">("cadastrado");

  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: () => listClientes(), enabled: open });
  const { data: agencias = [] } = useQuery({ queryKey: ["agencias"], queryFn: () => listAgencias(), enabled: open });
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => listUsuarios(), enabled: open && isAdmin });

  const executivos = usuarios.filter((u: any) => u.roles?.includes("executivo") || u.roles?.includes("admin"));

  // Resetar estado ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSaving) {
      if (!newOpen) {
        setFile(null);
        setFormData({
          cliente_id: null,
          cliente_avulso: null,
          agencia_id: null,
          campanha: "",
          valor_negociado: 0,
          valor_tabela: 0,
          validade: "",
          observacao: "",
          rawText: "",
        });
        setShowRawText(false);
      }
      onOpenChange(newOpen);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    const ext = (selectedFile.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "pptx", "ppt"].includes(ext)) {
      toast.error("Formato inválido. Selecione um arquivo PDF ou PowerPoint (.pptx).");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const extractedText = await extractDocumentText(selectedFile);
      if (!extractedText || extractedText.length < 15) {
        toast.warning("Pouco texto detectado no documento. Preencha os campos principais manualmente.");
      }

      const parsed = parsePropostaDocument(selectedFile.name, extractedText, clientes as any[], agencias as any[]);
      setFormData(parsed);

      if (parsed.cliente_id) {
        setTipoCliente("cadastrado");
      } else if (parsed.cliente_avulso) {
        setTipoCliente("avulso");
      }

      toast.success("Documento lido e dados sugeridos com sucesso!");
    } catch (err: any) {
      toast.error("Aviso ao ler documento: " + (err.message || "Tente preencher manualmente."));
      // Mesmo com erro de leitura de texto, permite manter o arquivo anexado
      setFormData((prev) => ({
        ...prev,
        campanha: selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        observacao: `Arquivo importado: ${selectedFile.name}`,
      }));
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!file) {
      toast.error("Selecione um arquivo PDF ou PPTX para importar.");
      return;
    }

    if (!formData.campanha.trim()) {
      toast.error("Informe o nome da campanha.");
      return;
    }

    if (tipoCliente === "cadastrado" && !formData.cliente_id) {
      toast.error("Selecione o cliente cadastrado ou alterne para cliente avulso.");
      return;
    }

    if (tipoCliente === "avulso" && !formData.cliente_avulso?.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    setIsSaving(true);
    try {
      setSaveStep("Criando registro da proposta…");

      const payload: any = {
        campanha: formData.campanha.trim(),
        cliente_id: tipoCliente === "cadastrado" ? formData.cliente_id : null,
        cliente_avulso: tipoCliente === "avulso" ? formData.cliente_avulso?.trim() : null,
        agencia_id: formData.agencia_id || null,
        executivo_id: executivoId || null,
        validade: formData.validade || null,
        observacao: formData.observacao.trim() || null,
        status: "rascunho" as const,
        valor_tabela: Number(formData.valor_tabela || formData.valor_negociado || 0),
        valor_desconto: Math.max(0, Number(formData.valor_tabela || 0) - Number(formData.valor_negociado || 0)),
        valor_negociado: Number(formData.valor_negociado || formData.valor_tabela || 0),
        total_insercoes: 1,
        comissao_pct: 0,
        itens: [
          {
            tipo: "Proposta Externa Importada",
            programa: file.name,
            horario: null,
            formato: file.name.split(".").pop()?.toUpperCase() || "DOC",
            insercoes_dia: 1,
            dias_semana: [],
            dias_mes: [],
            desconto: 0,
            valor_unit: Number(formData.valor_negociado || 0),
            valor_tabela: Number(formData.valor_tabela || formData.valor_negociado || 0),
            valor_negociado: Number(formData.valor_negociado || 0),
            total_insercoes: 1,
          },
        ],
      };

      const result = await upsertProposta({ data: payload });
      const propostaId = (result as any)?.id;

      if (!propostaId) {
        throw new Error("Não foi possível obter o ID da nova proposta criada.");
      }

      setSaveStep("Enviando arquivo em anexo…");

      // Upload do arquivo para o bucket proposta-anexos
      const ext = file.name.split(".").pop();
      const storagePath = `${propostaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("proposta-anexos").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (upErr) {
        console.warn("Aviso ao fazer upload do anexo:", upErr);
      } else {
        // Registra o anexo no banco de dados
        await supabase.from("proposta_anexos" as any).insert({
          proposta_id: propostaId,
          created_by: user?.id || (result as any)?.created_by,
          arquivo_nome: file.name,
          arquivo_path: storagePath,
          arquivo_tipo: file.type || (ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
          arquivo_tamanho: file.size,
          descricao: `Proposta comercial importada pelo cliente (${ext?.toUpperCase()})`,
        } as any);
      }

      toast.success("Proposta importada com sucesso!", {
        description: `Proposta Nº ${(result as any)?.numero || ""} criada com o arquivo ${file.name} em anexo.`,
      });

      qc.invalidateQueries({ queryKey: ["propostas"] });
      onSuccess?.(propostaId);
      handleOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao importar proposta: " + (err.message || "Tente novamente."));
    } finally {
      setIsSaving(false);
      setSaveStep("");
    }
  };

  const isPdf = file?.name.toLowerCase().endsWith(".pdf");
  const isPptx = file?.name.toLowerCase().endsWith(".pptx") || file?.name.toLowerCase().endsWith(".ppt");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <FileUp className="size-5 text-primary" /> Importar Proposta do Cliente
          </DialogTitle>
          <DialogDescription>
            Envie a proposta comercial em formato <strong>PDF</strong> ou <strong>PowerPoint (PPTX)</strong>. Os dados serão lidos automaticamente e o arquivo ficará guardado nos anexos da proposta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Área de Seleção de Arquivo */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-slate-50/50"
            >
              <div className="flex gap-2">
                <div className="size-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
                  <FileText className="size-6" />
                </div>
                <div className="size-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                  <Presentation className="size-6" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Clique para selecionar o arquivo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: <strong>PDF</strong> (.pdf) ou <strong>PowerPoint</strong> (.pptx, .ppt)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isPdf ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {isPdf ? <FileText className="size-6" /> : <Presentation className="size-6" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{file.name}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                      {isPdf ? "PDF" : "PowerPoint"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                    {isParsing && <span className="ml-2 text-primary font-medium">· Lendo arquivo…</span>}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isParsing || isSaving}
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4 mr-1" /> Trocar
              </Button>
            </div>
          )}

          {isParsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-primary">
              <Loader2 className="size-5 animate-spin" />
              <span>Processando e reconhecendo dados do documento com IA…</span>
            </div>
          )}

          {/* Dados reconhecidos / formulário de confirmação */}
          {file && !isParsing && (
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  <CheckCircle2 className="size-4" /> Dados identificados para a proposta
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-xs text-muted-foreground"
                >
                  {showRawText ? <ChevronUp className="size-3.5 mr-1" /> : <ChevronDown className="size-3.5 mr-1" />}
                  {showRawText ? "Ocultar texto extraído" : "Ver texto extraído"}
                </Button>
              </div>

              {showRawText && formData.rawText && (
                <ScrollArea className="h-32 rounded-xl border bg-slate-900 text-slate-100 p-3 text-xs font-mono">
                  <pre className="whitespace-pre-wrap">{formData.rawText}</pre>
                </ScrollArea>
              )}

              {/* Seletor de Cliente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase text-slate-500">Cliente *</Label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTipoCliente("cadastrado")}
                      className={`px-2 py-0.5 rounded ${
                        tipoCliente === "cadastrado" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      Cliente Cadastrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoCliente("avulso")}
                      className={`px-2 py-0.5 rounded ${
                        tipoCliente === "avulso" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      Cliente Avulso
                    </button>
                  </div>
                </div>

                {tipoCliente === "cadastrado" ? (
                  <Select
                    value={formData.cliente_id || "none"}
                    onValueChange={(val) => setFormData((f) => ({ ...f, cliente_id: val === "none" ? null : val }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o cliente cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Selecione um cliente —</SelectItem>
                      {clientes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_fantasia || c.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Nome da empresa ou anunciante avulso"
                    value={formData.cliente_avulso || ""}
                    onChange={(e) => setFormData((f) => ({ ...f, cliente_avulso: e.target.value }))}
                    className="rounded-xl"
                  />
                )}
              </div>

              {/* Campanha */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-500">Nome da Campanha *</Label>
                <Input
                  value={formData.campanha}
                  onChange={(e) => setFormData((f) => ({ ...f, campanha: e.target.value }))}
                  placeholder="Ex: Campanha Dia das Mães 2026"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Agência */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Agência (opcional)</Label>
                  <Select
                    value={formData.agencia_id || "none"}
                    onValueChange={(val) => setFormData((f) => ({ ...f, agencia_id: val === "none" ? null : val }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhuma —</SelectItem>
                      {agencias.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome_fantasia || a.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Executivo */}
                {isAdmin && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-500">Executivo Responsável</Label>
                    <Select value={executivoId || "none"} onValueChange={(val) => setExecutivoId(val === "none" ? "" : val)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Usar meu perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Usar meu perfil —</SelectItem>
                        {executivos.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Valor Negociado */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Valor Negociado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_negociado || ""}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        valor_negociado: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="rounded-xl font-semibold text-primary"
                  />
                </div>

                {/* Valor de Tabela */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Valor Tabela / Bruto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_tabela || ""}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        valor_tabela: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="rounded-xl"
                  />
                </div>

                {/* Validade */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Validade</Label>
                  <Input
                    type="date"
                    value={formData.validade}
                    onChange={(e) => setFormData((f) => ({ ...f, validade: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-500">Observações</Label>
                <Textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData((f) => ({ ...f, observacao: e.target.value }))}
                  rows={3}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!file || isParsing || isSaving}
            className="rounded-xl font-semibold gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {saveStep || "Importando…"}
              </>
            ) : (
              <>
                <FileUp className="size-4" />
                Criar Proposta e Anexar Arquivo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
