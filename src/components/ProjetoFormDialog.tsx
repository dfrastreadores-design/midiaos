import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertProjeto, sugerirClientesProjeto } from "@/lib/projetos.functions";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Paperclip, Sparkles, Download } from "lucide-react";
import { NovoClienteButton, NovaAgenciaButton } from "@/components/QuickCadastroButtons";

type Initial = {
  id?: string;
  nome?: string;
  descricao?: string | null;
  cliente_alvo?: string | null;
  cliente_id?: string | null;
  agencia_id?: string | null;
  comercializacao_inicio?: string | null;
  comercializacao_fim?: string;
  valor_estimado?: number | null;
  materiais?: string | null;
  observacao?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  status?: "em_comercializacao" | "vendido" | "encerrado" | "cancelado";
};

type Sugestao = { cliente_id: string; nome: string; motivo: string; score: number };

async function extrairTextoArquivo(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { extractPdfText } = await import("@/lib/pdf-extract");
    return await extractPdfText(file);
  }
  return await file.text();
}

export function ProjetoFormDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Initial | null }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nome: "", descricao: "", cliente_alvo: "", cliente_id: "", agencia_id: "",
    inicio: "", fim: "", valor: 0, materiais: "", observacao: "",
    arquivo_url: "", arquivo_nome: "",
    status: "em_comercializacao" as Initial["status"],
  });
  const [uploading, setUploading] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);

  useEffect(() => {
    if (!open) return;
    setF({
      nome: initial?.nome ?? "",
      descricao: initial?.descricao ?? "",
      cliente_alvo: initial?.cliente_alvo ?? "",
      cliente_id: initial?.cliente_id ?? "",
      agencia_id: initial?.agencia_id ?? "",
      inicio: initial?.comercializacao_inicio ?? "",
      fim: initial?.comercializacao_fim ?? "",
      valor: initial?.valor_estimado ?? 0,
      materiais: initial?.materiais ?? "",
      observacao: initial?.observacao ?? "",
      arquivo_url: initial?.arquivo_url ?? "",
      arquivo_nome: initial?.arquivo_nome ?? "",
      status: initial?.status ?? "em_comercializacao",
    });
    setSugestoes([]);
  }, [open, initial]);

  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: () => listClientes() });
  const { data: agencias = [] } = useQuery({ queryKey: ["agencias"], queryFn: () => listAgencias() });

  const uploadArquivo = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) return toast.error("Arquivo deve ter no máximo 15MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("projetos-especiais").upload(path, file, {
        upsert: false, contentType: file.type,
      });
      if (error) throw error;
      setF((s) => ({ ...s, arquivo_url: path, arquivo_nome: file.name }));
      toast.success("Arquivo anexado");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  };

  const baixarArquivo = async () => {
    if (!f.arquivo_url) return;
    const { data, error } = await supabase.storage
      .from("projetos-especiais")
      .createSignedUrl(f.arquivo_url, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const sugerir = async (file?: File) => {
    setSugerindo(true);
    setSugestoes([]);
    try {
      let texto = "";
      if (file) {
        texto = await extrairTextoArquivo(file);
      } else if (f.arquivo_url) {
        const { data, error } = await supabase.storage
          .from("projetos-especiais")
          .download(f.arquivo_url);
        if (error) throw error;
        texto = await extrairTextoArquivo(new File([data], f.arquivo_nome || "arquivo.pdf", { type: data.type }));
      }
      const base = [f.nome, f.descricao, f.cliente_alvo, f.materiais, f.observacao].filter(Boolean).join("\n\n");
      const combinado = (base + "\n\n" + texto).trim();
      if (combinado.length < 20) throw new Error("Adicione descrição ou anexe um arquivo legível");
      const { sugestoes: s } = await sugerirClientesProjeto({ data: { texto: combinado } });
      setSugestoes(s);
      if (s.length === 0) toast.info("Nenhuma sugestão encontrada");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSugerindo(false); }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!f.nome.trim()) throw new Error("Informe o nome do projeto");
      if (!f.fim) throw new Error("Defina o prazo final de comercialização");
      return upsertProjeto({
        data: {
          id: initial?.id,
          nome: f.nome.trim(),
          descricao: f.descricao || null,
          cliente_alvo: f.cliente_alvo || null,
          cliente_id: f.cliente_id || null,
          agencia_id: f.agencia_id || null,
          comercializacao_inicio: f.inicio || null,
          comercializacao_fim: f.fim,
          valor_estimado: f.valor || null,
          materiais: f.materiais || null,
          observacao: f.observacao || null,
          arquivo_url: f.arquivo_url || null,
          arquivo_nome: f.arquivo_nome || null,
          status: f.status ?? "em_comercializacao",
        },
      });
    },
    onSuccess: () => {
      toast.success("Projeto salvo");
      qc.invalidateQueries({ queryKey: ["projetos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar Projeto Especial" : "Novo Projeto Especial"}</DialogTitle>
          <DialogDescription>Defina o prazo de comercialização para receber alertas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome do projeto *</Label>
              <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Especial Copa do Mundo" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente alvo (texto livre)</Label>
              <Input value={f.cliente_alvo} onChange={(e) => setF({ ...f, cliente_alvo: e.target.value })} placeholder="Segmento/perfil" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as Initial["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_comercializacao">Em comercialização</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente vinculado</Label>
              <div className="flex gap-2">
                <Select value={f.cliente_id || "none"} onValueChange={(v) => setF({ ...f, cliente_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
                <NovoClienteButton />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Agência vinculada</Label>
              <div className="flex gap-2">
                <Select value={f.agencia_id || "none"} onValueChange={(v) => setF({ ...f, agencia_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {agencias.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome_fantasia || a.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
                <NovaAgenciaButton />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Início da comercialização</Label>
              <Input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim da comercialização *</Label>
              <Input type="date" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Valor estimado (R$)</Label>
              <Input type="number" min={0} step="0.01" value={f.valor}
                onChange={(e) => setF({ ...f, valor: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Materiais / entregáveis</Label>
              <Textarea rows={3} value={f.materiais} onChange={(e) => setF({ ...f, materiais: e.target.value })} placeholder="Ex: 4 VTs 30s, ativações em redes sociais…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} />
            </div>

            <div className="space-y-2 sm:col-span-2 border-t pt-4">
              <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexo do projeto (PDF / TXT)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadArquivo(file);
                  }}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {f.arquivo_nome && (
                  <Button type="button" variant="outline" size="sm" onClick={baixarArquivo}>
                    <Download className="h-4 w-4 mr-1" /> {f.arquivo_nome}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => sugerir()} disabled={sugerindo}>
                  {sugerindo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Sugerir clientes com IA
                </Button>
                <span className="text-xs text-muted-foreground">Usa o anexo e a descrição para indicar clientes do seu cadastro com maior aderência.</span>
              </div>

              {sugestoes.length > 0 && (
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <div className="text-sm font-medium">Clientes sugeridos</div>
                  <ul className="space-y-2">
                    {sugestoes.map((s) => (
                      <li key={s.cliente_id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex-1">
                          <div className="font-medium">{s.nome} <span className="text-xs text-muted-foreground">· score {s.score}</span></div>
                          <div className="text-xs text-muted-foreground">{s.motivo}</div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setF((st) => ({ ...st, cliente_id: s.cliente_id }));
                            toast.success(`Cliente "${s.nome}" vinculado`);
                          }}
                        >
                          Vincular
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
