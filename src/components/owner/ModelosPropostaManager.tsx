import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Upload,
  Sliders,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Plus,
  AlertCircle,
  FileCheck,
  Edit2,
  Info,
} from "lucide-react";
import {
  type ModeloPropostaCliente,
  CAMPOS_PADRAO_PROPOSTA,
} from "@/types/modelo-proposta";
import { EditorMapeamentoPropostaDialog } from "./EditorMapeamentoPropostaDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModelosPropostaManagerProps {
  tenantId?: string;
  modelos: ModeloPropostaCliente[];
  onChange: (novosModelos: ModeloPropostaCliente[]) => void;
}

export function ModelosPropostaManager({
  tenantId,
  modelos = [],
  onChange,
}: ModelosPropostaManagerProps) {
  const [editorAberto, setEditorAberto] = useState(false);
  const [modeloEmEdicao, setModeloEmEdicao] = useState<ModeloPropostaCliente | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limiteAtingido = modelos.length >= 3;

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Formato inválido", {
        description: "Envie apenas arquivos no formato PDF.",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande", {
        description: "O modelo em PDF deve ter até 20MB.",
      });
      return;
    }

    if (limiteAtingido) {
      toast.error("Limite atingido", {
        description: "Cada cliente pode ter no máximo 3 modelos de proposta cadastrados.",
      });
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Enviando modelo em PDF...");

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `modelos-proposta/${tenantId || "temp"}/${Date.now()}-${sanitizedName}`;

      // Upload no bucket materiais-apoio
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("materiais-apoio")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      let publicUrl = "";
      if (uploadErr) {
        console.warn("Storage upload fallback: usando dataURL local", uploadErr);
        // Fallback para FileReader se der erro no storage
        const reader = new FileReader();
        publicUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        const { data: urlData } = supabase.storage
          .from("materiais-apoio")
          .getPublicUrl(uploadData.path);
        publicUrl = urlData.publicUrl;
      }

      const novoModelo: ModeloPropostaCliente = {
        id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        nome: file.name.replace(/\.pdf$/i, "").slice(0, 50),
        descricao: "Modelo de proposta comercial importado",
        arquivo_url: publicUrl,
        arquivo_nome: file.name,
        tamanho_bytes: file.size,
        total_paginas: 3,
        criado_em: new Date().toISOString(),
        ativo: true,
        campos_mapeados: CAMPOS_PADRAO_PROPOSTA.map((c, idx) => ({
          ...c,
          id: `campo-${idx}-${Date.now()}`,
        })),
      };

      const novaLista = [...modelos, novoModelo];
      onChange(novaLista);
      toast.dismiss(toastId);
      toast.success("Modelo adicionado com sucesso!", {
        description: "Agora clique em 'Direcionar Campos' para posicionar valores, produtos e defesa.",
      });

      // Abre automaticamente o editor de mapeamento para o usuário direcionar os campos
      setModeloEmEdicao(novoModelo);
      setEditorAberto(true);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Erro ao enviar modelo: " + (err?.message || "falha desconhecida"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemover = (id: string) => {
    const filtrados = modelos.filter((m) => m.id !== id);
    onChange(filtrados);
    toast.success("Modelo removido");
  };

  const handleToggleAtivo = (id: string) => {
    const atualizados = modelos.map((m) =>
      m.id === id ? { ...m, ativo: !m.ativo } : m
    );
    onChange(atualizados);
  };

  const handleAtualizarNome = (id: string, novoNome: string) => {
    const atualizados = modelos.map((m) =>
      m.id === id ? { ...m, nome: novoNome } : m
    );
    onChange(atualizados);
  };

  const handleSalvarModeloMapeado = (modeloSalvo: ModeloPropostaCliente) => {
    const atualizados = modelos.map((m) =>
      m.id === modeloSalvo.id ? modeloSalvo : m
    );
    onChange(atualizados);
  };

  const formatarTamanho = (bytes?: number) => {
    if (!bytes) return "PDF";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            Modelos de Proposta Personalizados do Cliente
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anexe até 3 modelos em PDF e posicione onde ficarão os valores, produtos, defesa da proposta e assinaturas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={limiteAtingido ? "destructive" : "secondary"}
            className="text-xs font-mono"
          >
            {modelos.length} / 3 modelos
          </Badge>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadPdf}
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <Button
            type="button"
            size="sm"
            disabled={limiteAtingido || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
          >
            <Upload className="size-3.5" />
            {uploading ? "Enviando..." : "Anexar Modelo PDF"}
          </Button>
        </div>
      </div>

      {modelos.length === 0 ? (
        <div className="border border-dashed rounded-xl p-6 text-center bg-muted/20">
          <FileText className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <div className="text-xs font-semibold text-foreground">
            Nenhum modelo PDF personalizado anexado
          </div>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto mt-1">
            Se este cliente utiliza uma folha timbrada ou layout de proposta próprio, anexe até 3 arquivos em PDF para direcionar os campos comerciais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {modelos.map((mod, index) => (
            <Card
              key={mod.id}
              className={`border transition-all ${
                mod.ativo
                  ? "bg-card border-border shadow-sm"
                  : "bg-muted/40 opacity-75 border-dashed"
              }`}
            >
              <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <FileCheck className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={mod.nome}
                        onChange={(e) => handleAtualizarNome(mod.id, e.target.value)}
                        className="h-7 text-xs font-semibold max-w-[260px] bg-transparent border-transparent hover:border-input focus:border-input px-1"
                        placeholder="Nome do Modelo"
                      />
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Modelo #{index + 1}
                      </Badge>
                      <Badge
                        variant={mod.ativo ? "default" : "secondary"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => handleToggleAtivo(mod.id)}
                      >
                        {mod.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{formatarTamanho(mod.tamanho_bytes)}</span>
                      <span>•</span>
                      <span>
                        {mod.campos_mapeados?.length || 0} blocos direcionados (Valores, Produtos, Defesa)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setModeloEmEdicao(mod);
                      setEditorAberto(true);
                    }}
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                  >
                    <Sliders className="size-3.5" />
                    Direcionar Campos
                  </Button>

                  {mod.arquivo_url && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      asChild
                    >
                      <a href={mod.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </a>
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemover(mod.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Editor de Mapeamento dos Campos */}
      {editorAberto && modeloEmEdicao && (
        <EditorMapeamentoPropostaDialog
          open={editorAberto}
          onOpenChange={setEditorAberto}
          modelo={modeloEmEdicao}
          onSave={handleSalvarModeloMapeado}
        />
      )}
    </div>
  );
}
