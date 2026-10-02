import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/use-roles";
import {
  getNotificacaoConfig,
  updateNotificacaoConfig,
  rodarAgendadorAgora,
} from "@/lib/notificacoes.functions";
import { listPermissions, setRolePermission } from "@/lib/permissions.functions";
import {
  listTodasAnnouncements,
  salvarAnnouncement,
  excluirAnnouncement,
  type SystemAnnouncement,
} from "@/lib/system-announcements.functions";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Trash2, Pencil, Plus, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { listEmissoras, saveEmissora, excluirEmissora } from "@/lib/emissoras.functions";
import { fetchCnpj } from "@/lib/cnpj";
import { supabase } from "@/integrations/supabase/client";
import { getLogoSignedUrl } from "@/lib/logo-url";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { getMeuTenantPerfil, updateMeuTenantPerfil } from "@/lib/tenants.functions";

const ROLES: {
  key:
    | "admin"
    | "executivo"
    | "opec"
    | "financeiro"
    | "producao"
    | "diretoria"
    | "parceiro_comercial";
  label: string;
}[] = [
  { key: "admin", label: "Admin" },
  { key: "executivo", label: "Executivo" },
  { key: "opec", label: "OPEC" },
  { key: "financeiro", label: "Financeiro" },
  { key: "producao", label: "Produção" },
  { key: "diretoria", label: "Diretoria" },
  { key: "parceiro_comercial", label: "Parceiro Comercial (Briefing)" },
];

export const Route = createFileRoute("/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { isAdmin, isSuperAdmin, loading } = useUserRoles();
  if (loading)
    return (
      <AppShell>
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      </AppShell>
    );
  if (!isAdmin)
    return (
      <AppShell>
        <div className="p-6 text-sm">Acesso restrito a administradores.</div>
      </AppShell>
    );
  return (
    <AppShell>
      <Inner isSuperAdmin={isSuperAdmin} />
    </AppShell>
  );
}

function Inner({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getNotificacaoConfig);
  const saveCfg = useServerFn(updateNotificacaoConfig);
  const runNow = useServerFn(rodarAgendadorAgora);

  const { data } = useQuery({ queryKey: ["notif-config"], queryFn: () => fetchCfg() });

  const [form, setForm] = useState({
    ativo_inicio: true,
    dias_antes_inicio: 7,
    ativo_fim: true,
    dias_antes_fim: 7,
    ativo_progresso: true,
    marcos_percentual: "50,75,90",
    ativo_validade: true,
    dias_antes_validade: 7,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      ativo_inicio: data.ativo_inicio,
      dias_antes_inicio: data.dias_antes_inicio,
      ativo_fim: data.ativo_fim,
      dias_antes_fim: data.dias_antes_fim,
      ativo_progresso: data.ativo_progresso,
      marcos_percentual: (data.marcos_percentual ?? []).join(","),
      ativo_validade: data.ativo_validade,
      dias_antes_validade: data.dias_antes_validade,
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () =>
      saveCfg({
        data: {
          ativo_inicio: form.ativo_inicio,
          dias_antes_inicio: Number(form.dias_antes_inicio) || 0,
          ativo_fim: form.ativo_fim,
          dias_antes_fim: Number(form.dias_antes_fim) || 0,
          ativo_progresso: form.ativo_progresso,
          marcos_percentual: form.marcos_percentual
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => n > 0 && n <= 100),
          ativo_validade: form.ativo_validade,
          dias_antes_validade: Number(form.dias_antes_validade) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["notif-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: async () => runNow({ data: undefined as never }),
    onSuccess: (r: { inserted: number }) =>
      toast.success(`Job executado: ${r.inserted} notificação(ões) geradas`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-semibold">Configurações da Empresa</h1>
        <p className="text-sm text-muted-foreground">
          Perfil da empresa vinculada, CNPJs emissores, permissões e notificações.
        </p>
      </div>

      <PerfilEmpresaCard />

      <Card>
        <CardHeader>
          <CardTitle>Notificações de campanhas e propostas</CardTitle>
          <CardDescription>
            O agendador roda diariamente e avisa o executivo responsável + administradores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Bloco
            title="Campanha próxima de iniciar"
            ativo={form.ativo_inicio}
            onAtivo={(v) => setForm((f) => ({ ...f, ativo_inicio: v }))}
          >
            <Label className="text-xs">Dias de antecedência</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={form.dias_antes_inicio}
              onChange={(e) =>
                setForm((f) => ({ ...f, dias_antes_inicio: Number(e.target.value) }))
              }
              className="w-28"
            />
          </Bloco>

          <Separator />

          <Bloco
            title="Campanha próxima de terminar"
            ativo={form.ativo_fim}
            onAtivo={(v) => setForm((f) => ({ ...f, ativo_fim: v }))}
          >
            <Label className="text-xs">Dias de antecedência</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={form.dias_antes_fim}
              onChange={(e) => setForm((f) => ({ ...f, dias_antes_fim: Number(e.target.value) }))}
              className="w-28"
            />
          </Bloco>

          <Separator />

          <Bloco
            title="Campanha em andamento (marcos de %)"
            ativo={form.ativo_progresso}
            onAtivo={(v) => setForm((f) => ({ ...f, ativo_progresso: v }))}
          >
            <Label className="text-xs">Marcos (separados por vírgula, ex: 50,75,90)</Label>
            <Input
              value={form.marcos_percentual}
              onChange={(e) => setForm((f) => ({ ...f, marcos_percentual: e.target.value }))}
              className="w-64"
            />
          </Bloco>

          <Separator />

          <Bloco
            title="Proposta próxima do vencimento"
            ativo={form.ativo_validade}
            onAtivo={(v) => setForm((f) => ({ ...f, ativo_validade: v }))}
          >
            <Label className="text-xs">Dias de antecedência</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={form.dias_antes_validade}
              onChange={(e) =>
                setForm((f) => ({ ...f, dias_antes_validade: Number(e.target.value) }))
              }
              className="w-28"
            />
          </Bloco>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar configuração
            </Button>
            <Button variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? "Executando…" : "Executar agora"}
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Voltar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin && <AnnouncementsCard />}

      <EmissorasCard />

      <PermissoesCard />
    </div>
  );
}

function PermissoesCard() {
  const qc = useQueryClient();
  const fetchPerms = useServerFn(listPermissions);
  const savePerm = useServerFn(setRolePermission);
  const { data, isLoading } = useQuery({ queryKey: ["perms-config"], queryFn: () => fetchPerms() });

  const toggle = useMutation({
    mutationFn: async (vars: {
      role:
        | "admin"
        | "executivo"
        | "opec"
        | "financeiro"
        | "producao"
        | "diretoria"
        | "parceiro_comercial";
      permission_key: string;
      enabled: boolean;
    }) => savePerm({ data: vars }),
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["perms-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const has = (role: string, key: string) =>
    (data?.rolePermissions ?? []).some((rp: any) => rp.role === role && rp.permission_key === key);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões por perfil</CardTitle>
        <CardDescription>
          Defina quais módulos e ações cada perfil pode acessar. O perfil <strong>Admin</strong>{" "}
          sempre tem acesso total. Os módulos <strong>Usuários</strong> e{" "}
          <strong>Configurações</strong> são exclusivos do admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Permissão</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="text-center py-2 px-3 font-medium w-28">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.permissions ?? []).map((p: any) => (
                  <tr key={p.key} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{p.label}</div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      )}
                    </td>
                    {ROLES.map((r) => {
                      const enabled = has(r.key, p.key);
                      return (
                        <td key={r.key} className="text-center px-3">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) =>
                              toggle.mutate({ role: r.key, permission_key: p.key, enabled: v })
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Bloco({
  title,
  ativo,
  onAtivo,
  children,
}: {
  title: string;
  ativo: boolean;
  onAtivo: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <Switch checked={ativo} onCheckedChange={onAtivo} />
      </div>
      {ativo && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function AnnouncementsCard() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listTodasAnnouncements);
  const save = useServerFn(salvarAnnouncement);
  const del = useServerFn(excluirAnnouncement);
  const { data, isLoading } = useQuery({
    queryKey: ["system-announcements-all"],
    queryFn: () => fetchAll(),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemAnnouncement | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    mensagem: "",
    emoji: "✨",
    versao: "",
    ativo: true,
  });

  function openNew() {
    setEditing(null);
    setForm({ titulo: "", mensagem: "", emoji: "✨", versao: "", ativo: true });
    setOpen(true);
  }
  function openEdit(a: SystemAnnouncement) {
    setEditing(a);
    setForm({
      titulo: a.titulo,
      mensagem: a.mensagem,
      emoji: a.emoji ?? "✨",
      versao: a.versao ?? "",
      ativo: a.ativo,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () =>
      save({
        data: {
          id: editing?.id,
          titulo: form.titulo.trim(),
          mensagem: form.mensagem.trim(),
          emoji: form.emoji.trim() || "✨",
          versao: form.versao.trim() || null,
          ativo: form.ativo,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Aviso atualizado" : "Aviso publicado para todos os inquilinos");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["system-announcements-all"] });
      qc.invalidateQueries({ queryKey: ["system-announcements-ativos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Aviso excluído");
      qc.invalidateQueries({ queryKey: ["system-announcements-all"] });
      qc.invalidateQueries({ queryKey: ["system-announcements-ativos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Avisos de atualização do sistema
            </CardTitle>
            <CardDescription>
              Publique uma mensagem humanizada que aparecerá como um pop-up para todos os inquilinos
              no próximo acesso. Cada usuário vê o aviso apenas uma vez.
            </CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo aviso
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum aviso publicado ainda.</div>
        ) : (
          <div className="space-y-3">
            {(data ?? []).map((a) => (
              <div key={a.id} className="flex items-start gap-3 border rounded-lg p-3">
                <span className="text-2xl">{a.emoji || "✨"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{a.titulo}</div>
                    {a.versao && <Badge variant="secondary">v{a.versao}</Badge>}
                    {a.ativo ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1 line-clamp-3">
                    {a.mensagem}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Excluir este aviso?")) delMut.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar aviso" : "Publicar nova atualização"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[80px_1fr_120px] gap-2">
              <div>
                <Label className="text-xs">Emoji</Label>
                <Input
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  maxLength={4}
                />
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Novo módulo de Relatórios Fiscais!"
                />
              </div>
              <div>
                <Label className="text-xs">Versão</Label>
                <Input
                  value={form.versao}
                  onChange={(e) => setForm((f) => ({ ...f, versao: e.target.value }))}
                  placeholder="1.4.0"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Mensagem humanizada</Label>
              <Textarea
                rows={6}
                value={form.mensagem}
                onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                placeholder="Olá! 👋 Acabamos de liberar uma novidade que vai facilitar o seu dia a dia: agora os relatórios fiscais saem direto em Excel. Esperamos que goste!"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <Label className="text-sm">Ativo (exibir para os inquilinos)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.titulo.trim() || !form.mensagem.trim()}
            >
              {saveMut.isPending ? "Salvando…" : editing ? "Salvar" : "Publicar para todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type Emissora = {
  id: string;
  nome: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  observacoes: string | null;
  entrega_material: string | null;
  padrao: boolean;
  ativo: boolean;
};

function EmissorasCard() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listEmissoras);
  const save = useServerFn(saveEmissora);
  const del = useServerFn(excluirEmissora);
  const { data, isLoading } = useQuery({ queryKey: ["emissoras"], queryFn: () => fetchAll() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emissora | null>(null);
  const empty = {
    nome: "",
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    cpf: "",
    pessoa_tipo: "pj" as "pj" | "cpf",
    nome_artistico: "",
    tipo_midia: "" as
      | ""
      | "tv"
      | "radio"
      | "portal"
      | "ooh"
      | "dooh"
      | "influencer"
      | "redes_sociais"
      | "agencia_publicidade"
      | "produtora"
      | "grafica"
      | "estudio"
      | "assessoria_imprensa"
      | "marketing_digital"
      | "evento"
      | "editora"
      | "outros",
    comissao_padrao_pct: "" as string | number,
    inscricao_estadual: "",
    inscricao_municipal: "",
    endereco: "",
    cidade: "",
    uf: "",
    cep: "",
    telefone: "",
    email: "",
    logo_url: "",
    observacoes: "",
    entrega_material: "",
    padrao: false,
    ativo: true,
  };
  const [form, setForm] = useState(empty);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!form.logo_url) {
        setLogoPreview(null);
        return;
      }
      const url = await getLogoSignedUrl(form.logo_url);
      if (!cancel) setLogoPreview(url);
    })();
    return () => {
      cancel = true;
    };
  }, [form.logo_url]);

  async function handleLogoUpload(file: File) {
    try {
      setLogoUploading(true);
      const ext = file.name.split(".").pop() || "png";
      const path = `emissora-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logo enviada");
    } catch (e) {
      toast.error("Erro ao enviar logo: " + (e as Error).message);
    } finally {
      setLogoUploading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(e: Emissora) {
    setEditing(e);
    setForm({
      nome: e.nome ?? "",
      razao_social: e.razao_social ?? "",
      nome_fantasia: e.nome_fantasia ?? "",
      cnpj: e.cnpj ?? "",
      cpf: (e as any).cpf ?? "",
      pessoa_tipo: ((e as any).pessoa_tipo ?? "pj") as "pj" | "cpf",
      nome_artistico: (e as any).nome_artistico ?? "",
      tipo_midia: ((e as any).tipo_midia ?? "") as any,
      comissao_padrao_pct: (e as any).comissao_padrao_pct ?? "",
      inscricao_estadual: e.inscricao_estadual ?? "",
      inscricao_municipal: e.inscricao_municipal ?? "",
      endereco: e.endereco ?? "",
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      cep: e.cep ?? "",
      telefone: e.telefone ?? "",
      email: e.email ?? "",
      logo_url: e.logo_url ?? "",
      observacoes: e.observacoes ?? "",
      entrega_material: e.entrega_material ?? "",
      padrao: e.padrao,
      ativo: e.ativo,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () =>
      save({
        data: {
          ...form,
          id: editing?.id,
          tipo_midia: form.tipo_midia ? form.tipo_midia : null,
          comissao_padrao_pct:
            form.comissao_padrao_pct === "" || form.comissao_padrao_pct === null
              ? null
              : Number(form.comissao_padrao_pct),
        } as any,
      }),
    onSuccess: () => {
      toast.success(editing ? "Emissora atualizada" : "Emissora cadastrada");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["emissoras"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Emissora excluída");
      qc.invalidateQueries({ queryKey: ["emissoras"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Emissoras (CNPJs emissores do PI)
            </CardTitle>
            <CardDescription>
              Cadastre os CNPJs da sua empresa que podem emitir Pedidos de Inserção. No momento de
              criar um PI, o usuário escolhe qual CNPJ aparecerá no documento.
            </CardDescription>
          </div>
          <NovaEmissoraGate count={(data ?? []).length} onNew={openNew} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma emissora cadastrada. Cadastre ao menos uma para emitir PIs com o CNPJ correto.
          </div>
        ) : (
          <div className="space-y-2">
            {((data ?? []) as Emissora[]).map((e) => (
              <div key={e.id} className="flex items-start gap-3 border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{e.nome}</div>
                    {e.padrao && <Badge>Padrão</Badge>}
                    {!e.ativo && <Badge variant="outline">Inativa</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[
                      e.razao_social,
                      e.cnpj && `CNPJ ${e.cnpj}`,
                      [e.cidade, e.uf].filter(Boolean).join("/"),
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Excluir esta emissora?")) delMut.mutate(e.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar emissora" : "Nova emissora"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Apelido / Nome curto *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Mídia.OS Matriz / Emissora Parceira / João Silva"
              />
            </div>
            <div>
              <Label className="text-xs">Tipo de pessoa</Label>
              <Select
                value={form.pessoa_tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, pessoa_tipo: v as "pj" | "cpf" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pj">PJ (CNPJ)</SelectItem>
                  <SelectItem value="cpf">Pessoa Física (CPF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo de fornecedor / mídia</Label>
              <Select
                value={form.tipo_midia || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo_midia: (v === "none" ? "" : v) as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— não informado —</SelectItem>
                  <SelectItem value="tv">TV</SelectItem>
                  <SelectItem value="radio">Rádio</SelectItem>
                  <SelectItem value="portal">Portal / Site</SelectItem>
                  <SelectItem value="ooh">OOH (mídia externa)</SelectItem>
                  <SelectItem value="dooh">DOOH / Busdoor</SelectItem>
                  <SelectItem value="influencer">Influenciador</SelectItem>
                  <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                  <SelectItem value="agencia_publicidade">Agência de Publicidade</SelectItem>
                  <SelectItem value="produtora">Produtora (audiovisual)</SelectItem>
                  <SelectItem value="estudio">Estúdio (foto/áudio)</SelectItem>
                  <SelectItem value="grafica">Gráfica</SelectItem>
                  <SelectItem value="marketing_digital">Marketing Digital / Performance</SelectItem>
                  <SelectItem value="assessoria_imprensa">Assessoria de Imprensa</SelectItem>
                  <SelectItem value="evento">Eventos / Ativação</SelectItem>
                  <SelectItem value="editora">Editora / Impressos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.pessoa_tipo === "cpf" && (
              <>
                <div>
                  <Label className="text-xs">CPF</Label>
                  <Input
                    value={form.cpf}
                    onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nome artístico</Label>
                  <Input
                    value={form.nome_artistico}
                    onChange={(e) => setForm((f) => ({ ...f, nome_artistico: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">Comissão padrão (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.comissao_padrao_pct as any}
                onChange={(e) => setForm((f) => ({ ...f, comissao_padrao_pct: e.target.value }))}
                placeholder="Ex: 15"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                CNPJ {cnpjLoading && <span className="text-muted-foreground">(buscando…)</span>}
              </Label>
              <Input
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                onBlur={async (e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  if (digits.length !== 14) return;
                  try {
                    setCnpjLoading(true);
                    const d = await fetchCnpj(digits);
                    const endereco = [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", ");
                    setForm((f) => ({
                      ...f,
                      cnpj: digits,
                      razao_social: d.razaoSocial || f.razao_social,
                      nome_fantasia: d.nomeFantasia || f.nome_fantasia,
                      inscricao_estadual:
                        d.inscricaoEstadual && d.inscricaoEstadual !== "ISENTA"
                          ? d.inscricaoEstadual
                          : f.inscricao_estadual,
                      inscricao_municipal:
                        d.inscricaoMunicipal && d.inscricaoMunicipal !== "ISENTA"
                          ? d.inscricaoMunicipal
                          : f.inscricao_municipal,
                      endereco: endereco || f.endereco,
                      cidade: d.cidade || f.cidade,
                      uf: d.estado || f.uf,
                      cep: d.cep || f.cep,
                      telefone: d.telefone || f.telefone,
                      email: d.email || f.email,
                    }));
                    toast.success("Dados do CNPJ preenchidos");
                  } catch (err: any) {
                    toast.error(err?.message || "Não foi possível buscar o CNPJ");
                  } finally {
                    setCnpjLoading(false);
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Razão social</Label>
              <Input
                value={form.razao_social}
                onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Nome fantasia</Label>
              <Input
                value={form.nome_fantasia}
                onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Inscrição estadual</Label>
              <Input
                value={form.inscricao_estadual}
                onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Inscrição municipal</Label>
              <Input
                value={form.inscricao_municipal}
                onChange={(e) => setForm((f) => ({ ...f, inscricao_municipal: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Endereço</Label>
              <Input
                value={form.endereco}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">UF</Label>
                <Input
                  maxLength={2}
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <Label className="text-xs">CEP</Label>
                <Input
                  value={form.cep}
                  onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Logo da emissora (aparece no PDF do PI)</Label>
              <div className="flex items-center gap-3 mt-1">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-14 w-auto max-w-[140px] object-contain border rounded bg-white p-1"
                  />
                ) : (
                  <div className="h-14 w-24 border border-dashed rounded flex items-center justify-center text-[10px] text-muted-foreground">
                    sem logo
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    disabled={logoUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                    }}
                  />
                  {form.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs w-fit"
                      onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                    >
                      Remover logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Observações (aparecem no PDF do PI)</Label>
              <Textarea
                rows={4}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Ex: condições de pagamento padrão, cláusulas fiscais, dados bancários da emissora…"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Entrega de material (aparece no PDF do PI)</Label>
              <Textarea
                rows={3}
                value={form.entrega_material}
                onChange={(e) => setForm((f) => ({ ...f, entrega_material: e.target.value }))}
                placeholder="Ex: enviar material em MP4 H.264, 1920x1080, 25fps, até 48h antes da veiculação para tráfego@emissora.com.br"
              />
            </div>
            <div className="col-span-2 flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={form.padrao}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, padrao: v }))}
                />
                Emissora padrão (selecionada automaticamente no novo PI)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                />
                Ativa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.nome.trim()}
            >
              {saveMut.isPending ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NovaEmissoraGate({ count, onNew }: { count: number; onNew: () => void }) {
  const { isAdmin } = useUserRoles();
  if (!isAdmin) return null;
  return (
    <Button onClick={onNew}>
      <Plus className="h-4 w-4 mr-1" /> Nova emissora
    </Button>
  );
}

function PerfilEmpresaCard() {
  const qc = useQueryClient();
  const fetchTenant = useServerFn(getMeuTenantPerfil);
  const saveTenant = useServerFn(updateMeuTenantPerfil);
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["meu-tenant-perfil"],
    queryFn: () => fetchTenant(),
  });

  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    contato_nome: "",
    contato_email: "",
    contato_whatsapp: "",
    logo_url: "",
    favicon_url: "",
    cor_primaria: "#3B82F6",
    cor_secundaria: "#10B981",
    subdominio: "",
    dominio_proprio: "",
    prefixo_pi: "PI",
    prefixo_proposta: "PROP",
    comissao_padrao_pct: 20,
  });
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setForm({
        razao_social: tenant.razao_social ?? "",
        nome_fantasia: tenant.nome_fantasia ?? "",
        cnpj: tenant.cnpj ?? "",
        contato_nome: tenant.contato_nome ?? "",
        contato_email: tenant.contato_email ?? "",
        contato_whatsapp: tenant.contato_whatsapp ?? "",
        logo_url: tenant.logo_url ?? "",
        favicon_url: tenant.favicon_url ?? "",
        cor_primaria: tenant.cor_primaria ?? "#3B82F6",
        cor_secundaria: tenant.cor_secundaria ?? "#10B981",
        subdominio: tenant.subdominio ?? "",
        dominio_proprio: tenant.dominio_proprio ?? "",
        prefixo_pi: tenant.prefixo_pi ?? "PI",
        prefixo_proposta: tenant.prefixo_proposta ?? "PROP",
        comissao_padrao_pct: tenant.comissao_padrao_pct ?? 20,
      });
    }
  }, [tenant]);

  useEffect(() => {
    let cancel = false;
    if (!form.logo_url) {
      setLogoPreview(null);
      return;
    }
    if (form.logo_url.startsWith("data:") || form.logo_url.startsWith("http")) {
      setLogoPreview(form.logo_url);
      return;
    }
    getLogoSignedUrl(form.logo_url).then((url) => {
      if (!cancel) setLogoPreview(url);
    });
    return () => {
      cancel = true;
    };
  }, [form.logo_url]);

  const saveMut = useMutation({
    mutationFn: async () => saveTenant({ data: form }),
    onSuccess: () => {
      toast.success("Perfil e configurações White-Label atualizados com sucesso!");
      qc.invalidateQueries({ queryKey: ["meu-tenant-perfil"] });
      qc.invalidateQueries({ queryKey: ["my-tenant-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLogoUpload = async (file: File) => {
    try {
      setLogoUploading(true);
      const ext = file.name.split(".").pop();
      const path = `tenant-logos/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logotipo enviado com sucesso");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar logotipo");
    } finally {
      setLogoUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Carregando dados da empresa vinculada…
        </CardContent>
      </Card>
    );
  }

  if (!tenant) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-6 flex items-center gap-3 text-amber-800">
          <Building2 className="h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <div className="font-semibold text-sm">Nenhuma empresa vinculada</div>
            <p className="text-xs text-amber-700">
              Seu usuário ainda não foi associado a um perfil de empresa. Entre em contato com o
              suporte ou proprietário do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" /> Perfil da Empresa & White-Label
            </CardTitle>
            <CardDescription>
              Personalize a identidade da sua empresa, cores corporativas, regras operacionais e prefixos de documentos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-semibold">
              Plano: {tenant.plano?.toUpperCase() || "ATIVO"}
            </Badge>
            <Badge className="bg-emerald-600 text-white">
              Status: {tenant.status?.toUpperCase() || "ATIVO"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold">Razão Social *</Label>
            <Input
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              placeholder="Razão social oficial da empresa"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Nome Fantasia / Marca</Label>
            <Input
              value={form.nome_fantasia}
              onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              placeholder="Nome exibido no cabeçalho e relatórios"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">
              CNPJ da Empresa{" "}
              {cnpjLoading && <span className="text-muted-foreground">(consultando Receita…)</span>}
            </Label>
            <Input
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              onBlur={async (e) => {
                const digits = e.target.value.replace(/\D/g, "");
                if (digits.length !== 14) return;
                try {
                  setCnpjLoading(true);
                  const d = await fetchCnpj(digits);
                  setForm((f) => ({
                    ...f,
                    cnpj: digits,
                    razao_social: d.razaoSocial || f.razao_social,
                    nome_fantasia: d.nomeFantasia || f.nome_fantasia,
                    contato_email: d.email || f.contato_email,
                    contato_whatsapp: d.telefone || f.contato_whatsapp,
                  }));
                  toast.success("Dados cadastrais do CNPJ preenchidos");
                } catch (err: any) {
                  toast.error(err?.message || "Não foi possível consultar o CNPJ");
                } finally {
                  setCnpjLoading(false);
                }
              }}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Nome do Responsável / Contato</Label>
            <Input
              value={form.contato_nome}
              onChange={(e) => setForm({ ...form, contato_nome: e.target.value })}
              placeholder="Ex: Roberto Gomes (Diretoria Comercial)"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">E-mail Comercial Oficial</Label>
            <Input
              type="email"
              value={form.contato_email}
              onChange={(e) => setForm({ ...form, contato_email: e.target.value })}
              placeholder="comercial@empresa.com.br"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">WhatsApp / Telefone</Label>
            <Input
              value={form.contato_whatsapp}
              onChange={(e) => setForm({ ...form, contato_whatsapp: e.target.value })}
              placeholder="(61) 99999-9999"
            />
          </div>
        </div>

        {/* Bloco White-Label & Customização de Marca */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Personalização White-Label & Domínio
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Subdomínio SaaS (Exclusivo)</Label>
              <div className="flex items-center mt-1">
                <Input
                  value={form.subdominio}
                  onChange={(e) => setForm({ ...form, subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="suaempresa"
                  className="rounded-r-none"
                />
                <span className="bg-muted px-3 py-2 text-xs border border-l-0 rounded-r-md text-muted-foreground font-mono">
                  .midiaos.com.br
                </span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Domínio Próprio / CNAME (Opcional)</Label>
              <Input
                value={form.dominio_proprio}
                onChange={(e) => setForm({ ...form, dominio_proprio: e.target.value.toLowerCase().trim() })}
                placeholder="sistema.suaempresa.com.br"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Cor Primária da Interface</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.cor_primaria || "#3B82F6"}
                  onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })}
                  className="w-10 h-10 p-0.5 rounded cursor-pointer border"
                />
                <Input
                  value={form.cor_primaria}
                  onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })}
                  className="font-mono text-xs max-w-[120px]"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Cor Secundária da Interface</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.cor_secundaria || "#10B981"}
                  onChange={(e) => setForm({ ...form, cor_secundaria: e.target.value })}
                  className="w-10 h-10 p-0.5 rounded cursor-pointer border"
                />
                <Input
                  value={form.cor_secundaria}
                  onChange={(e) => setForm({ ...form, cor_secundaria: e.target.value })}
                  className="font-mono text-xs max-w-[120px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco Operação Comercial & Documentos */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Numeração de Documentos & Regras Comerciais
          </h4>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Prefixo dos Pedidos de Inserção (PI)</Label>
              <Input
                value={form.prefixo_pi}
                onChange={(e) => setForm({ ...form, prefixo_pi: e.target.value.toUpperCase().trim() })}
                placeholder="Ex: PI, NEX, CEN"
                className="mt-1"
              />
              <span className="text-[10px] text-muted-foreground">Ex: {form.prefixo_pi || "PI"}-2026-000001</span>
            </div>
            <div>
              <Label className="text-xs font-semibold">Prefixo das Propostas Comerciais</Label>
              <Input
                value={form.prefixo_proposta}
                onChange={(e) => setForm({ ...form, prefixo_proposta: e.target.value.toUpperCase().trim() })}
                placeholder="Ex: PROP, PRP"
                className="mt-1"
              />
              <span className="text-[10px] text-muted-foreground">Ex: {form.prefixo_proposta || "PROP"}-0001</span>
            </div>
            <div>
              <Label className="text-xs font-semibold">Comissão Padrão de Representação (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.comissao_padrao_pct}
                onChange={(e) => setForm({ ...form, comissao_padrao_pct: Number(e.target.value) })}
                className="mt-1"
              />
              <span className="text-[10px] text-muted-foreground">Aplicada em novos rateios de mídia</span>
            </div>
          </div>
        </div>

        {/* Logotipo */}
        <div className="border-t pt-4">
          <Label className="text-xs font-semibold">
            Logotipo da Empresa (exibido na interface e PDFs de Propostas, PIs e Contratos)
          </Label>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo da Empresa"
                className="h-14 w-auto max-w-[180px] object-contain border rounded-xl bg-white p-2 shadow-sm"
              />
            ) : (
              <div className="h-14 w-28 border border-dashed rounded-xl flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
                sem logo
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                disabled={logoUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                }}
                className="max-w-xs text-xs"
              />
              {form.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs w-fit text-destructive hover:text-destructive"
                  onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                >
                  Remover logotipo
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.razao_social.trim()}
            className="rounded-xl px-6"
          >
            {saveMut.isPending ? "Salvando…" : "Salvar Configurações da Empresa"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
