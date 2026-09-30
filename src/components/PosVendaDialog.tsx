import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, Send, Trash2, Upload, Mail, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import {
  gerarPosVenda,
  atualizarPosVenda,
  marcarPosVendaEnviada,
  listPosVendaAnexos,
  uploadPosVendaAnexo,
  removerPosVendaAnexo,
} from "@/lib/pos-venda.functions";
import { openWhatsapp } from "@/lib/whatsapp-share";

type PiLite = {
  id: string;
  numero: string;
  campanha: string;
  cliente?: { razao_social?: string; nome_fantasia?: string; contatos?: any[] } | null;
  agencia?: { razao_social?: string; nome_fantasia?: string; contatos?: any[] } | null;
};

export function PosVendaDialog({ pi, onClose }: { pi: PiLite | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [pv, setPv] = useState<{ id: string; token: string } | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [linkProvas, setLinkProvas] = useState("");

  const ger = useMutation({
    mutationFn: (pi_id: string) => gerarPosVenda({ data: { pi_id } }),
    onSuccess: (d) => setPv({ id: d.id, token: d.token }),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (pi && !pv) ger.mutate(pi.id);
    if (!pi) {
      setPv(null);
      setMensagem("");
      setLinkProvas("");
    }
  }, [pi]);

  const anexosQ = useQuery({
    queryKey: ["pos-venda-anexos", pv?.id],
    queryFn: () => listPosVendaAnexos({ data: { pos_venda_id: pv!.id } }),
    enabled: !!pv?.id,
  });

  const salvar = useMutation({
    mutationFn: () =>
      atualizarPosVenda({ data: { id: pv!.id, mensagem, link_provas: linkProvas } }),
    onSuccess: () => toast.success("Comprovação atualizada"),
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const b64 = await fileToBase64(file);
      return uploadPosVendaAnexo({
        data: {
          pos_venda_id: pv!.id,
          nome: file.name,
          mime: file.type || "application/octet-stream",
          data_base64: b64,
        },
      });
    },
    onSuccess: () => {
      toast.success("Arquivo enviado");
      qc.invalidateQueries({ queryKey: ["pos-venda-anexos", pv?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerPosVendaAnexo({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-venda-anexos", pv?.id] }),
  });

  if (!pi) return null;
  const url = pv
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/pos-venda/${pv.token}`
    : "";

  const ent: any = pi.cliente || pi.agencia || {};
  const telefoneSugerido = ent.contatos?.[0]?.telefone || "";
  const emailSugerido = ent.contatos?.[0]?.email || "";

  const enviarWhatsapp = async () => {
    await salvar.mutateAsync().catch(() => {});
    const phone = window.prompt(
      "Telefone do cliente (com DDD; DDI 55 será adicionado):",
      telefoneSugerido,
    );
    if (phone === null) return;
    const msg = window.prompt(
      "Mensagem do WhatsApp:",
      `Olá! Segue a comprovação de veiculação da campanha "${pi.campanha}" (PI ${pi.numero}).\n\n📎 ${url}\n\nFico à disposição para renovarmos juntos! 🎯`,
    );
    if (msg === null) return;
    openWhatsapp(phone, msg);
    await marcarPosVendaEnviada({ data: { id: pv!.id } });
    toast.success("WhatsApp aberto");
  };

  const enviarEmail = async () => {
    await salvar.mutateAsync().catch(() => {});
    const to = window.prompt("E-mail do destinatário:", emailSugerido);
    if (!to) return;
    const subject = encodeURIComponent(`Comprovação de veiculação — PI ${pi.numero}`);
    const body = encodeURIComponent(
      `Olá!\n\nSegue a comprovação de veiculação da campanha "${pi.campanha}" (PI ${pi.numero}).\n\nAcesse pelo link: ${url}\n\nFico à disposição.`,
    );
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
    await marcarPosVendaEnviada({ data: { id: pv!.id } });
  };

  return (
    <Dialog open={!!pi} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Comprovação de Pós-Venda <Badge variant="outline">PI {pi.numero}</Badge>
          </DialogTitle>
          <DialogDescription>
            Gere e compartilhe com o cliente a comprovação de veiculação. Ótimo gancho para renovar
            a campanha.
          </DialogDescription>
        </DialogHeader>

        {ger.isPending || !pv ? (
          <div className="py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Preparando…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Link público da comprovação</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button variant="outline" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem para o cliente (opcional)</Label>
              <Textarea
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex.: Sua campanha foi veiculada conforme o PI. Obrigado pela parceria — vamos renovar?"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Link externo com provas (Drive / pasta de mídias)</Label>
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={linkProvas}
                onChange={(e) => setLinkProvas(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Anexos de prova (mapas, prints, áudios)</Label>
                <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary hover:underline">
                  <Upload className="size-3" /> Adicionar
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload.mutate(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="space-y-1">
                {upload.isPending && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Enviando…
                  </div>
                )}
                {(anexosQ.data ?? []).map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm border rounded-md px-3 py-1.5"
                  >
                    <a
                      href={a.signed_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate hover:underline flex items-center gap-2"
                    >
                      <Download className="size-3" /> {a.nome}
                    </a>
                    <Button size="icon" variant="ghost" onClick={() => remover.mutate(a.id)}>
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {(!anexosQ.data || anexosQ.data.length === 0) && !upload.isPending && (
                  <div className="text-xs text-muted-foreground">Nenhum arquivo anexado.</div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {pv && (
            <>
              <Button variant="outline" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
                {salvar.isPending && <Loader2 className="size-4 mr-2 animate-spin" />} Salvar
              </Button>
              <Button variant="outline" onClick={enviarEmail}>
                <Mail className="size-4 mr-2" /> E-mail
              </Button>
              <Button
                onClick={enviarWhatsapp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="size-4 mr-2" /> WhatsApp
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
