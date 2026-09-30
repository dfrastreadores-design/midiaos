import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  listInfluenciadores,
  upsertInfluenciador,
  deleteInfluenciador,
} from "@/lib/influenciadores.functions";

export const Route = createFileRoute("/influenciadores")({
  head: () => ({ meta: [{ title: "Influenciadores & Criadores — Mídia.OS" }] }),
  component: InfluenciadoresPage,
});

type Influ = Awaited<ReturnType<typeof listInfluenciadores>>[number];

const empty = {
  id: undefined as string | undefined,
  nome: "",
  tipo: "influenciador" as "influenciador" | "criador",
  nicho: "",
  cidade: "",
  estado: "",
  email: "",
  telefone: "",
  whatsapp: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  facebook: "",
  twitter: "",
  outras_redes: "",
  seguidores_total: "" as string | number,
  cache_valor: "" as string | number,
  observacoes: "",
  ativo: true,
};

function InfluenciadoresPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>({ ...empty });

  const { data = [], isLoading } = useQuery({
    queryKey: ["influenciadores"],
    queryFn: () => listInfluenciadores(),
  });

  const save = useMutation({
    mutationFn: (payload: any) => upsertInfluenciador({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["influenciadores"] });
      toast.success("Salvo com sucesso");
      setOpen(false);
      setForm({ ...empty });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteInfluenciador({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["influenciadores"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r: Influ) =>
      [r.nome, r.nicho, r.cidade, r.instagram, r.tiktok, r.youtube]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(term)),
    );
  }, [data, q]);

  function openNew() {
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(r: Influ) {
    setForm({
      id: r.id,
      nome: r.nome ?? "",
      tipo: (r.tipo as any) ?? "influenciador",
      nicho: r.nicho ?? "",
      cidade: r.cidade ?? "",
      estado: r.estado ?? "",
      email: r.email ?? "",
      telefone: r.telefone ?? "",
      whatsapp: r.whatsapp ?? "",
      instagram: r.instagram ?? "",
      tiktok: r.tiktok ?? "",
      youtube: r.youtube ?? "",
      facebook: r.facebook ?? "",
      twitter: r.twitter ?? "",
      outras_redes: r.outras_redes ?? "",
      seguidores_total: r.seguidores_total ?? "",
      cache_valor: r.cache_valor ?? "",
      observacoes: r.observacoes ?? "",
      ativo: r.ativo ?? true,
    });
    setOpen(true);
  }

  function submit() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    const payload: any = {
      ...form,
      seguidores_total:
        form.seguidores_total === "" || form.seguidores_total === null
          ? null
          : Number(form.seguidores_total),
      cache_valor:
        form.cache_valor === "" || form.cache_valor === null ? null : Number(form.cache_valor),
    };
    if (!payload.id) delete payload.id;
    save.mutate(payload);
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              Influenciadores & Criadores
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastro de influenciadores e criadores de conteúdo (acesso restrito: Admin e
              Produção).
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="size-4 mr-2" /> Novo cadastro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar" : "Novo"} influenciador/criador</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="md:col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="influenciador">Influenciador</SelectItem>
                      <SelectItem value="criador">Criador de conteúdo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nicho</Label>
                  <Input
                    value={form.nicho}
                    onChange={(e) => setForm({ ...form, nicho: e.target.value })}
                    placeholder="Moda, gastronomia, esportes..."
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input
                    maxLength={2}
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={form.instagram}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>
                <div>
                  <Label>TikTok</Label>
                  <Input
                    value={form.tiktok}
                    onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input
                    value={form.youtube}
                    onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input
                    value={form.facebook}
                    onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Twitter / X</Label>
                  <Input
                    value={form.twitter}
                    onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Outras redes</Label>
                  <Input
                    value={form.outras_redes}
                    onChange={(e) => setForm({ ...form, outras_redes: e.target.value })}
                    placeholder="Twitch, Kwai, LinkedIn..."
                  />
                </div>
                <div>
                  <Label>Seguidores (total)</Label>
                  <Input
                    type="number"
                    value={form.seguidores_total}
                    onChange={(e) => setForm({ ...form, seguidores_total: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cachê (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cache_valor}
                    onChange={(e) => setForm({ ...form, cache_valor: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={save.isPending}>
                  {save.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, nicho, cidade ou rede..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cadastro encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((r: Influ) => (
                  <div key={r.id} className="border rounded-lg p-4 space-y-2 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{r.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {[r.cidade, r.estado].filter(Boolean).join(" - ") || "—"}
                        </div>
                      </div>
                      <Badge variant={r.tipo === "criador" ? "secondary" : "default"}>
                        {r.tipo === "criador" ? "Criador" : "Influencer"}
                      </Badge>
                    </div>
                    {r.nicho && (
                      <div className="text-xs">
                        <b>Nicho:</b> {r.nicho}
                      </div>
                    )}
                    <div className="text-xs space-y-0.5">
                      {r.instagram && <div>IG: {r.instagram}</div>}
                      {r.tiktok && <div>TikTok: {r.tiktok}</div>}
                      {r.youtube && <div>YT: {r.youtube}</div>}
                    </div>
                    <div className="text-xs">
                      {r.seguidores_total != null && (
                        <span className="mr-3">
                          <b>Seguidores:</b> {Number(r.seguidores_total).toLocaleString("pt-BR")}
                        </span>
                      )}
                      {r.cache_valor != null && (
                        <span>
                          <b>Cachê:</b> R${" "}
                          {Number(r.cache_valor).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil className="size-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Remover ${r.nome}?`)) del.mutate(r.id);
                        }}
                      >
                        <Trash2 className="size-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
