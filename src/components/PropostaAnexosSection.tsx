import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Trash2, FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function PropostaAnexosSection({ propostaId }: { propostaId?: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [descricao, setDescricao] = useState("");

  const queryKey = ["proposta-anexos", propostaId];

  const { data: anexos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposta_anexos" as any)
        .select("*")
        .eq("proposta_id", propostaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!propostaId,
  });

  const remove = useMutation({
    mutationFn: async (row: any) => {
      await supabase.storage.from("proposta-anexos").remove([row.arquivo_path]);
      const { error } = await supabase
        .from("proposta_anexos" as any)
        .delete()
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anexo removido");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDownload = async (row: any) => {
    const { data, error } = await supabase.storage
      .from("proposta-anexos")
      .download(row.arquivo_path);
    if (error) return toast.error("Erro no download");
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = row.arquivo_nome;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !propostaId) return;

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${propostaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("proposta-anexos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error } = await supabase.from("proposta_anexos" as any).insert({
        proposta_id: propostaId,
        created_by: user.id,
        arquivo_nome: file.name,
        arquivo_path: path,
        arquivo_tipo: file.type,
        arquivo_tamanho: file.size,
        descricao: descricao.trim() || null,
      } as any);

      if (error) {
        await supabase.storage.from("proposta-anexos").remove([path]);
        throw error;
      }

      toast.success("Anexo enviado!");
      setDescricao("");
      qc.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  if (!propostaId) {
    return (
      <div className="p-6 border-2 border-dashed rounded-2xl bg-slate-50/50 text-center">
        <Paperclip className="size-7 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">
          Salve a proposta primeiro para anexar arquivos externos (PDF, imagens, etc).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
          Anexar proposta externa
        </Label>
        <div className="flex gap-2">
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (opcional): Ex. Proposta personalizada do cliente"
            className="rounded-xl border-slate-200"
          />
          <div className="relative">
            <input
              type="file"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <Button disabled={isUploading} className="rounded-xl font-bold" type="button">
              {isUploading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Paperclip className="size-4 mr-2" />
              )}
              {isUploading ? "Subindo..." : "Anexar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {isLoading ? (
          <div className="h-16 animate-pulse bg-slate-100 rounded-xl" />
        ) : anexos.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-sm italic">
            Nenhum anexo enviado.
          </div>
        ) : (
          anexos.map((anexo: any) => (
            <div
              key={anexo.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{anexo.arquivo_nome}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    {((anexo.arquivo_tamanho || 0) / 1024).toFixed(1)} KB
                    {anexo.descricao ? ` · ${anexo.descricao}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(anexo)}
                  className="size-8 rounded-lg text-slate-400 hover:text-primary"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove.mutate(anexo)}
                  className="size-8 rounded-lg text-slate-400 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
