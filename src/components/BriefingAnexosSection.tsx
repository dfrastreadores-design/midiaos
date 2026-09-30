import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "briefing-anexos";

export function BriefingAnexosSection({ briefingId }: { briefingId?: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ["briefing-anexos", briefingId],
    enabled: !!briefingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefing_anexos")
        .select("*")
        .eq("briefing_id", briefingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (a: any) => {
      await supabase.storage.from(BUCKET).remove([a.arquivo_path]);
      const { error } = await supabase.from("briefing_anexos").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anexo removido");
      qc.invalidateQueries({ queryKey: ["briefing-anexos", briefingId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const handleDownload = async (a: any) => {
    const { data, error } = await supabase.storage.from(BUCKET).download(a.arquivo_path);
    if (error) return toast.error(error.message);
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.arquivo_nome;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !user || !briefingId) return;
    if (!titulo.trim()) return toast.error("Informe um título para o anexo");
    setUploading(true);
    const path = `${briefingId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error: dbErr } = await supabase.from("briefing_anexos").insert({
      briefing_id: briefingId,
      titulo: titulo.trim(),
      arquivo_path: path,
      arquivo_nome: file.name,
      arquivo_tipo: file.type,
      arquivo_tamanho: file.size,
      created_by: user.id,
    } as never);
    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      setUploading(false);
      return toast.error(dbErr.message);
    }
    setTitulo("");
    setUploading(false);
    toast.success("Anexo enviado");
    qc.invalidateQueries({ queryKey: ["briefing-anexos", briefingId] });
  };

  if (!briefingId) {
    return (
      <p className="text-sm text-muted-foreground">
        Salve o briefing primeiro para anexar arquivos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Título do anexo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="flex-1"
        />
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
          <Button type="button" asChild disabled={uploading}>
            <span>
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              Anexar
            </span>
          </Button>
        </label>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : anexos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {anexos.map((a: any) => (
            <li key={a.id} className="flex items-center justify-between p-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.titulo}</div>
                <div className="text-xs text-muted-foreground truncate">{a.arquivo_nome}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleDownload(a)}>
                  <Download className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(a)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
