import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  Eye,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCheck,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type EntidadeAnexoTipo =
  | "parceiro"
  | "centralizador"
  | "cliente"
  | "agencia"
  | "contrato"
  | "pi"
  | "proposta"
  | "geral";

export interface UniversalAnexosModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidadeTipo: EntidadeAnexoTipo;
  entidadeId?: string | null;
  entidadeNome?: string;
  tituloCustomizado?: string;
}

const CATEGORIAS_DOCUMENTO: Record<EntidadeAnexoTipo, string[]> = {
  parceiro: [
    "Mídia Kit Oficial",
    "Tabela de Preços",
    "Comprovante de Audiência / IBOPE",
    "Contrato de Representação",
    "Relatório de Tráfego / DOOH",
    "Outros Documentos",
  ],
  centralizador: [
    "Defesa de Mídia Consolidada",
    "Briefing do Cliente Assinado",
    "Grade de Veiculação / Cronograma",
    "Mapeamento de Concorrência",
    "Outros Documentos",
  ],
  cliente: [
    "Cartão CNPJ",
    "Contrato Social",
    "Certidão Negativa",
    "Documento dos Sócios",
    "Briefing de Campanha",
    "Outros Documentos",
  ],
  agencia: [
    "Certificado CENP",
    "Cartão CNPJ",
    "Termo de Bonificação / BV",
    "Outros Documentos",
  ],
  contrato: [
    "Contrato Assinado (PDF)",
    "Minuta de Contrato",
    "Termo Aditivo",
    "Procuração",
    "Outros Documentos",
  ],
  pi: [
    "PI Assinado pelo Cliente",
    "Autorização de Veiculação",
    "Comprovante de Checking / Exibição",
    "Outros Documentos",
  ],
  proposta: [
    "Apresentação Comercial em PDF",
    "Briefing Validado",
    "Carta Proposta Assinada",
    "Outros Documentos",
  ],
  geral: [
    "Documento Geral",
    "Relatório",
    "Comprovante",
    "Planilha de Apoio",
    "Outros",
  ],
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
}

function getFileIcon(tipo: string | null, nome: string) {
  const t = (tipo || "").toLowerCase();
  const n = (nome || "").toLowerCase();
  if (t.includes("pdf") || n.endsWith(".pdf")) return <FileText className="size-4 text-rose-500" />;
  if (t.includes("sheet") || t.includes("csv") || n.endsWith(".xlsx") || n.endsWith(".csv"))
    return <FileSpreadsheet className="size-4 text-emerald-600" />;
  if (t.includes("image") || n.endsWith(".jpg") || n.endsWith(".png") || n.endsWith(".jpeg"))
    return <ImageIcon className="size-4 text-sky-500" />;
  return <Paperclip className="size-4 text-muted-foreground" />;
}

export function UniversalAnexosModal({
  isOpen,
  onClose,
  entidadeTipo,
  entidadeId,
  entidadeNome,
  tituloCustomizado,
}: UniversalAnexosModalProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [categoria, setCategoria] = useState<string>(
    CATEGORIAS_DOCUMENTO[entidadeTipo]?.[0] || "Outros Documentos",
  );
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const scopeKey = `${entidadeTipo}:${entidadeId || "geral"}`;
  const queryKey = ["anexos-universais", scopeKey];

  // Busca os anexos vinculados a esta entidade em materiais_apoio
  const { data: anexos = [], isLoading } = useQuery({
    queryKey,
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiais_apoio")
        .select("*")
        .eq("categoria", scopeKey)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[UniversalAnexosModal] Erro ao buscar anexos:", error.message);
        return [];
      }
      return data || [];
    },
  });

  // Upload do arquivo
  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo para anexar");
      return;
    }
    if (!novoTitulo.trim()) {
      toast.error("Informe um título para o documento");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `anexos/${entidadeTipo}/${entidadeId || "geral"}/${crypto.randomUUID()}_${cleanName}`;

      // Upload no storage (bucket materiais-apoio)
      const { error: uploadError } = await supabase.storage
        .from("materiais-apoio")
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      // Inserção do metadado na tabela materiais_apoio
      const { error: dbError } = await supabase.from("materiais_apoio").insert({
        titulo: novoTitulo.trim(),
        descricao: descricao.trim() ? `${categoria} — ${descricao.trim()}` : categoria,
        categoria: scopeKey,
        arquivo_path: storagePath,
        arquivo_nome: file.name,
        arquivo_tipo: file.type || ext,
        arquivo_tamanho: file.size,
        created_by: user?.id || null,
      });

      if (dbError) throw dbError;

      toast.success("Documento anexado com sucesso!");
      qc.invalidateQueries({ queryKey });

      // Limpa formulário
      setFile(null);
      setNovoTitulo("");
      setDescricao("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error("Falha ao anexar documento: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Download do arquivo com Signed URL
  const handleDownload = async (arquivoPath: string, arquivoNome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("materiais-apoio")
        .createSignedUrl(arquivoPath, 120, { download: arquivoNome });
      if (error || !data?.signedUrl) throw new Error("Erro ao gerar link de download");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Visualizar no navegador
  const handleVisualizar = async (arquivoPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("materiais-apoio")
        .createSignedUrl(arquivoPath, 120);
      if (error || !data?.signedUrl) throw new Error("Erro ao abrir visualização");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Excluir anexo
  const handleExcluir = async (id: string, arquivoPath: string) => {
    if (!confirm("Deseja realmente excluir este documento anexado?")) return;
    try {
      await supabase.storage.from("materiais-apoio").remove([arquivoPath]);
      const { error } = await supabase.from("materiais_apoio").delete().eq("id", id);
      if (error) throw error;
      toast.success("Documento excluído");
      qc.invalidateQueries({ queryKey });
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  };

  const categorias = CATEGORIAS_DOCUMENTO[entidadeTipo] || CATEGORIAS_DOCUMENTO.geral;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Paperclip className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {tituloCustomizado || `Documentos & Anexos — ${entidadeNome || entidadeTipo.toUpperCase()}`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Anexe PDFs, contratos, comprovantes de mídia, imagens ou planilhas referentes a este registro.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Formulário de Novo Anexo */}
          <div className="p-3.5 rounded-lg border bg-muted/30 space-y-3">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Upload className="size-3.5 text-primary" />
              Adicionar Novo Documento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-[11px] font-semibold">Título do Documento *</Label>
                <Input
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Mídia Kit 2026, Contrato Social, IBOPE..."
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Tipo / Categoria *</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Observações (Opcional)</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Versão atualizada enviada pelo diretor comercial..."
                className="mt-1 h-8 text-xs"
              />
            </div>

            {/* Input de Arquivo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      if (!novoTitulo) {
                        setNovoTitulo(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="h-8 text-xs gap-1.5 bg-background"
                >
                  <Paperclip className="size-3.5" />
                  {file ? "Trocar Arquivo" : "Selecionar Arquivo"}
                </Button>
                {file && (
                  <span className="text-[11px] font-medium text-foreground truncate max-w-[220px]">
                    {file.name} ({formatBytes(file.size)})
                  </span>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                disabled={uploading || !file}
                onClick={handleUpload}
                className="h-8 text-xs gap-1.5 font-semibold bg-primary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="size-3.5" />
                    Salvar Anexo
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Lista de Documentos Anexados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileCheck className="size-4 text-emerald-600" />
                Documentos Anexados ({anexos.length})
              </span>
              <span className="text-[11px] text-muted-foreground">Armazenamento em Nuvem Seguro</span>
            </div>

            {isLoading && (
              <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" /> Carregando documentos...
              </div>
            )}

            {!isLoading && anexos.length === 0 && (
              <div className="p-8 text-center border rounded-lg border-dashed text-xs text-muted-foreground">
                Nenhum documento anexado ainda para este registro.
              </div>
            )}

            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {anexos.map((anexo: any) => (
                <div
                  key={anexo.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-1.5 rounded bg-muted">
                      {getFileIcon(anexo.arquivo_tipo, anexo.arquivo_nome)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                        <span className="truncate">{anexo.titulo}</span>
                        {anexo.arquivo_tamanho && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-mono">
                            {formatBytes(anexo.arquivo_tamanho)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {anexo.arquivo_nome} • {new Date(anexo.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => handleVisualizar(anexo.arquivo_path)}
                      title="Visualizar documento"
                    >
                      <Eye className="size-3.5 text-sky-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => handleDownload(anexo.arquivo_path, anexo.arquivo_nome)}
                      title="Baixar arquivo"
                    >
                      <Download className="size-3.5 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => handleExcluir(anexo.id, anexo.arquivo_path)}
                      title="Excluir anexo"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
