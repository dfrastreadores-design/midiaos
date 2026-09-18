import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Paperclip, Upload, Download, Trash2, FileText, Loader2, Sparkles } from "lucide-react";
import { extrairPiDePdf } from "@/lib/pi-ai.functions";
import { extractPdfText } from "@/lib/pdf-extract";

type Row = {
  id: string;
  titulo: string;
  descricao: string | null;
  periodo_referencia: string | null;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  cliente_id: string | null;
  agencia_id: string | null;
  pi_id: string | null;
  created_by: string | null;
  created_at: string;
  valor_bruto: number | null;
  valor_liquido: number | null;
};

function formatBRL(v: number | null) {
  if (v === null || v === undefined) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
}

type Props = {
  clienteId?: string | null;
  agenciaId?: string | null;
  piId?: string | null;
  title?: string;
  hint?: string;
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

export function PisAnexosSection({ clienteId, agenciaId, piId, title, hint }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const fileRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [valorBruto, setValorBruto] = useState("");
  const [valorLiquido, setValorLiquido] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lendoIA, setLendoIA] = useState(false);
  const extrairFn = useServerFn(extrairPiDePdf);

  async function lerDoPdf() {
    if (!file) { toast.error("Selecione o PDF do PI primeiro"); return; }
    if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      toast.error("Apenas PDF é suportado para leitura automática");
      return;
    }
    setLendoIA(true);
    try {
      const texto = await extractPdfText(file);
      if (!texto || texto.length < 20) throw new Error("Não foi possível extrair texto do PDF");
      const dados = await extrairFn({ data: { texto } });
      if (dados.valor_bruto != null) setValorBruto(String(dados.valor_bruto));
      if (dados.valor_liquido != null) setValorLiquido(String(dados.valor_liquido));
      if (dados.valor_bruto == null && dados.valor_liquido == null && dados.valor_negociado != null) {
        setValorBruto(String(dados.valor_negociado));
      }
      toast.success("Valores lidos do PDF");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLendoIA(false);
    }
  }

  const scopeKey = `${clienteId}-${agenciaId}-${piId}`;
  const queryKey = ["pi-anexos", scopeKey];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    enabled: !!(clienteId || agenciaId || piId),
    queryFn: async () => {
      let q = supabase.from("pi_anexos").select("*").order("created_at", { ascending: false });
      
      const filters = [];
      if (piId) filters.push(`pi_id.eq.${piId}`);
      if (clienteId) filters.push(`cliente_id.eq.${clienteId}`);
      if (agenciaId) filters.push(`agencia_id.eq.${agenciaId}`);
      
      if (filters.length > 0) {
        q = q.or(filters.join(","));
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const del = useMutation({
    mutationFn: async (row: Row) => {
      await supabase.storage.from("pi-anexos").remove([row.arquivo_path]);
      const { error } = await supabase.from("pi_anexos").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Anexo removido"); qc.invalidateQueries({ queryKey }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleDownload(row: Row) {
    const { data, error } = await supabase.storage
      .from("pi-anexos")
      .createSignedUrl(row.arquivo_path, 60, { download: row.arquivo_nome });
    if (error || !data?.signedUrl) { toast.error("Erro ao gerar link"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleUpload() {
    if (!file || !titulo.trim() || !user) {
      toast.error("Informe título e selecione o arquivo");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const folder = piId ? `pi/${piId}` : clienteId ? `cliente/${clienteId}` : agenciaId ? `agencia/${agenciaId}` : `geral/${user.id}`;
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("pi-anexos").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from("pi_anexos").insert({
        cliente_id: clienteId ?? null,
        agencia_id: agenciaId ?? null,
        pi_id: piId ?? null,
        titulo: titulo.trim(),
        periodo_referencia: periodo.trim() || null,
        arquivo_path: path,
        arquivo_nome: file.name,
        arquivo_tipo: file.type || null,
        arquivo_tamanho: file.size,
        valor_bruto: valorBruto ? Number(valorBruto) : null,
        valor_liquido: valorLiquido ? Number(valorLiquido) : null,
        created_by: user.id,
      });
      if (error) {
        await supabase.storage.from("pi-anexos").remove([path]);
        throw error;
      }
      toast.success("Anexo enviado");
      setTitulo(""); setPeriodo(""); setValorBruto(""); setValorLiquido(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (!clienteId && !agenciaId && !piId) {
    return (
      <div className="text-xs text-muted-foreground border rounded-md p-3 bg-muted/30">
        Salve o cadastro primeiro para anexar PIs.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Paperclip className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">{title ?? "PIs anexados"}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Título / identificação *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: PI Janeiro/2024 - Globo" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Período de referência</Label>
            <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Ex.: Jan/2024, 2024-Q1..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor bruto (R$)</Label>
            <Input type="number" step="0.01" value={valorBruto} onChange={(e) => setValorBruto(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor líquido (R$)</Label>
            <Input type="number" step="0.01" value={valorLiquido} onChange={(e) => setValorLiquido(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
            className="max-w-xs"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" variant="outline" onClick={lerDoPdf} disabled={lendoIA || !file}>
            {lendoIA ? <Loader2 className="size-4 animate-spin mr-1" /> : <Sparkles className="size-4 mr-1" />}
            Ler valores do PDF
          </Button>
          <Button type="button" size="sm" onClick={handleUpload} disabled={uploading || !file || !titulo.trim()}>
            {uploading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Upload className="size-4 mr-1" />}
            Enviar anexo
          </Button>
          {file && <span className="text-[11px] text-muted-foreground">{file.name} — {formatBytes(file.size)}</span>}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando anexos...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum PI anexado ainda.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const canDelete = isAdmin || row.created_by === user?.id;
            return (
              <div key={row.id} className="flex items-center gap-3 border rounded-md p-2 bg-background">
                <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" title={row.titulo}>{row.titulo}</div>
                  <div className="text-[11px] text-muted-foreground truncate" title={row.arquivo_nome}>
                    {row.arquivo_nome} · {formatBytes(row.arquivo_tamanho)} · {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  {(row.valor_bruto != null || row.valor_liquido != null) && (
                    <div className="text-[11px] mt-0.5 flex gap-2">
                      {row.valor_bruto != null && <span className="text-muted-foreground">Bruto: <span className="font-semibold text-foreground">{formatBRL(row.valor_bruto)}</span></span>}
                      {row.valor_liquido != null && <span className="text-muted-foreground">Líquido: <span className="font-semibold text-foreground">{formatBRL(row.valor_liquido)}</span></span>}
                    </div>
                  )}
                </div>
                {row.periodo_referencia && <Badge variant="secondary" className="hidden sm:inline-flex">{row.periodo_referencia}</Badge>}
                <Button type="button" size="sm" variant="outline" onClick={() => handleDownload(row)}>
                  <Download className="size-4" />
                </Button>
                {canDelete && (
                  <Button type="button" size="sm" variant="ghost" className="text-destructive"
                    onClick={() => { if (confirm("Remover este anexo?")) del.mutate(row); }}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
