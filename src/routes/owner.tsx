import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Building2,
  DollarSign,
  Activity,
  Clock,
  Lock,
  Unlock,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  BookOpen,
  Users,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  CalendarPlus,
  MessageCircle,
  Mail,
  Copy,
  LogOut,
  ShieldAlert,
  FileSignature,
} from "lucide-react";
import { LogoImg } from "@/components/LogoImg";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";

import {
  listTenants,
  upsertTenant,
  deleteTenant,
  getTenantsStats,
  getOwnerOverview,
  getTenantDetails,
  setTenantAlerta,
  setTenantBloqueio,
  renovarTenantVencimento,
  getOwnerFinanceiro,
  signOutTenant,
  signOutUsuario,
  autoBloquearInadimplentes,
  createTenantUsuario,
  vincularUsuarioTenant,
  desvincularUsuarioTenant,
  type TenantInput,
} from "@/lib/tenants.functions";

import {
  listPlanos,
  setTenantPlano,
  MODULOS_DISPONIVEIS,
  type Plano,
} from "@/lib/planos.functions";
import {
  getPlatformConfig,
  savePlatformConfig,
  DEFAULT_PLATFORM_CONFIG,
  type PlatformConfig,
} from "@/lib/platform-config.functions";
import { CATEGORIAS_SERVICOS } from "@/lib/categorias-servicos";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserRoles } from "@/hooks/use-roles";
import { toast } from "sonner";

export const Route = createFileRoute("/owner")({
  head: () => ({ meta: [{ title: "Painel do Proprietário — mídia.OS" }] }),
  component: () => (
    <AppShell>
      <OwnerInner />
    </AppShell>
  ),
});

const PLANOS = [
  { value: "demo", label: "Demonstração", max: 1 },
  { value: "essencial", label: "Essencial", max: 3 },
  { value: "site", label: "Site", max: 5 },
  { value: "profissional", label: "Profissional", max: 10 },
  { value: "enterprise", label: "Enterprise", max: 50 },
];

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

function OwnerInner() {
  const { isSuperAdmin, loading } = useUserRoles();
  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Esta área é restrita ao proprietário da plataforma.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <OwnerDashboard />;
}

function OwnerDashboard() {
  const list = useServerFn(listTenants);
  const stats = useServerFn(getTenantsStats);
  const overview = useServerFn(getOwnerOverview);
  const financeiro = useServerFn(getOwnerFinanceiro);
  const remove = useServerFn(deleteTenant);
  const bloqueio = useServerFn(setTenantBloqueio);
  const renovar = useServerFn(renovarTenantVencimento);
  const signOutT = useServerFn(signOutTenant);
  const signOutU = useServerFn(signOutUsuario);
  const autoBloq = useServerFn(autoBloquearInadimplentes);
  const qc = useQueryClient();

  const tenantsQuery = useQuery({ queryKey: ["owner", "tenants"], queryFn: () => list() });
  const statsQuery = useQuery({ queryKey: ["owner", "stats"], queryFn: () => stats() });
  const overviewQuery = useQuery({ queryKey: ["owner", "overview"], queryFn: () => overview() });
  const financeiroQuery = useQuery({
    queryKey: ["owner", "financeiro"],
    queryFn: () => financeiro(),
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Empresa removida");
      qc.invalidateQueries({ queryKey: ["owner"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bloqueioMut = useMutation({
    mutationFn: (v: { id: string; bloqueado: boolean; motivo?: string }) => bloqueio({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.bloqueado ? "Cliente bloqueado" : "Cliente desbloqueado");
      qc.invalidateQueries({ queryKey: ["owner"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const renovarMut = useMutation({
    mutationFn: (id: string) => renovar({ data: { id, dias: 30 } }),
    onSuccess: (d: any) => {
      toast.success(
        `Vencimento renovado para ${new Date(d.proximo_vencimento).toLocaleDateString("pt-BR")}`,
      );
      qc.invalidateQueries({ queryKey: ["owner"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const signOutTenantMut = useMutation({
    mutationFn: (id: string) => signOutT({ data: { tenant_id: id } }),
    onSuccess: (d: any) => toast.success(`${d.total} usuário(s) deslogado(s) da empresa`),
    onError: (e: any) => toast.error(e.message),
  });
  const signOutUserMut = useMutation({
    mutationFn: (uid: string) => signOutU({ data: { user_id: uid } }),
    onSuccess: () => toast.success("Usuário deslogado"),
    onError: (e: any) => toast.error(e.message),
  });
  const autoBloqMut = useMutation({
    mutationFn: () => autoBloq({}),
    onSuccess: (d: any) => {
      toast.success(`${d.total} empresa(s) bloqueada(s) por inadimplência`);
      qc.invalidateQueries({ queryKey: ["owner"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const s = statsQuery.data;
  const o = overviewQuery.data;
  const tenants = (tenantsQuery.data ?? []) as any[];

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Painel do Proprietário
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clientes que usam o mídia.OS — plano, acesso e bloqueio por inadimplência.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" title="Gerenciar usuários da plataforma">
            <Link to="/usuarios">
              <Users className="size-4 mr-2" /> Gerenciar Usuários
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/documentacao">
              <BookOpen className="size-4 mr-2" /> Documentação
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/landing-pages">
              <FileSignature className="size-4 mr-2" /> Landing Pages
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={autoBloqMut.isPending}
            onClick={() => {
              if (confirm("Bloquear automaticamente todas as empresas com vencimento atrasado?"))
                autoBloqMut.mutate();
            }}
            title="Bloquear inadimplentes"
          >
            <ShieldAlert className="size-4 mr-2 text-amber-500" /> Bloquear inadimplentes
          </Button>
          <Dialog
            open={editOpen}
            onOpenChange={(o) => {
              setEditOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditing(null)}
                title="Cadastrar novo inquilino (empresa-cliente do sistema)"
              >
                <Plus className="size-4 mr-2" /> Novo inquilino
              </Button>
            </DialogTrigger>
            <TenantDialog
              key={editing?.id ?? "new"}
              editing={editing}
              onSaved={() => {
                setEditOpen(false);
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["owner"] });
              }}
            />
          </Dialog>
        </div>
      </header>

      <PlatformConfigCard />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Ativos"
          value={s?.ativos ?? 0}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={Clock}
          label="Em trial"
          value={s?.trials ?? 0}
          accent="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          icon={Activity}
          label="Inadimplentes / bloqueados"
          value={s?.inadimplentes ?? 0}
          accent="bg-red-500/10 text-red-400"
        />
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={fmtBRL(s?.mrr ?? 0)}
          accent="bg-indigo-500/10 text-indigo-400"
        />
      </div>

      {/* Métricas globais da plataforma */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Uso da plataforma
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            icon={Users}
            label="Usuários totais"
            value={o?.plataforma.usuarios_total ?? 0}
            accent="bg-sky-500/10 text-sky-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Ativos (7d)"
            value={o?.plataforma.usuarios_ativos_7d ?? 0}
            accent="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            icon={Building2}
            label="Empresas-clientes"
            value={tenants.length}
            accent="bg-violet-500/10 text-violet-400"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top clientes por uso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              Top clientes por engajamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Usuários</TableHead>
                  <TableHead className="text-right">Ativos (7d)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(o?.top_clientes ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-4 text-sm"
                    >
                      Sem dados.
                    </TableCell>
                  </TableRow>
                ) : (
                  o!.top_clientes.map((t: any) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailsId(t.id)}
                    >
                      <TableCell className="font-medium">{t.razao_social}</TableCell>
                      <TableCell className="text-right">{t.usuarios}</TableCell>
                      <TableCell className="text-right">{t.mau}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Vencimentos próximos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Vencimentos nos próximos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Venc.</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(o?.vencimentos_proximos ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-4 text-sm"
                    >
                      Nenhum vencimento próximo.
                    </TableCell>
                  </TableRow>
                ) : (
                  o!.vencimentos_proximos.map((t: any) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailsId(t.id)}
                    >
                      <TableCell className="font-medium text-sm">{t.razao_social}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(t.proximo_vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmtBRL(t.valor_mensal)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <FinanceiroSaaS data={financeiroQuery.data} loading={financeiroQuery.isLoading} />

      {/* Novos usuários */}
      {(o?.novos_usuarios ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="size-4" />
              Novos usuários (últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o!.novos_usuarios.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm font-medium">{u.nome ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm">{u.tenant_nome}</TableCell>
                    <TableCell className="text-xs">{fmtDate(u.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Empresas-clientes</CardTitle>
          <div className="flex items-center gap-2">
            <Dialog
              open={editOpen}
              onOpenChange={(o) => {
                setEditOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => setEditing(null)}
                  title="Cadastrar novo inquilino (empresa-cliente do sistema)"
                >
                  <Plus className="size-4 mr-2" /> Novo inquilino
                </Button>
              </DialogTrigger>
              <TenantDialog
                key={editing?.id ?? "new"}
                editing={editing}
                onSaved={() => {
                  setEditOpen(false);
                  setEditing(null);
                  qc.invalidateQueries({ queryKey: ["owner"] });
                }}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Próx. venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma empresa cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => {
                  const plano = PLANOS.find((p) => p.value === t.plano);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.razao_social}</div>
                        {t.nome_fantasia && (
                          <div className="text-xs text-muted-foreground">{t.nome_fantasia}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plano?.label ?? t.plano}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.usuarios_count ?? 0} / {t.max_usuarios ?? plano?.max ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.proximo_vencimento
                          ? new Date(t.proximo_vencimento).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {t.bloqueado ? (
                          <Badge className="bg-red-500/15 text-red-300 border-red-500/30">
                            Bloqueado
                          </Badge>
                        ) : t.status === "inadimplente" ? (
                          <Badge className="bg-red-500/15 text-red-300 border-red-500/30">
                            Inadimplente
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                            {t.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDetailsId(t.id)}
                            title="Gerenciar usuários e detalhes"
                            className="text-sky-500 hover:text-sky-600 hover:bg-sky-500/10"
                          >
                            <UserPlus className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDetailsId(t.id)}
                            title="Visualizar detalhes"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(t);
                              setEditOpen(true);
                            }}
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={renovarMut.isPending}
                            onClick={() => {
                              if (
                                confirm(`Renovar vencimento de "${t.razao_social}" por +30 dias?`)
                              )
                                renovarMut.mutate(t.id);
                            }}
                            title="Renovar +30 dias"
                          >
                            <CalendarPlus className="size-4 text-emerald-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={bloqueioMut.isPending}
                            onClick={() => {
                              if (t.bloqueado) {
                                bloqueioMut.mutate({ id: t.id, bloqueado: false });
                              } else {
                                const motivo = prompt(
                                  `Motivo do bloqueio de "${t.razao_social}":`,
                                  "Pagamento em atraso",
                                );
                                if (motivo && motivo.trim())
                                  bloqueioMut.mutate({
                                    id: t.id,
                                    bloqueado: true,
                                    motivo: motivo.trim(),
                                  });
                              }
                            }}
                            title={t.bloqueado ? "Desbloquear acesso" : "Bloquear acesso"}
                          >
                            {t.bloqueado ? (
                              <Unlock className="size-4 text-emerald-500" />
                            ) : (
                              <Lock className="size-4 text-amber-500" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={signOutTenantMut.isPending}
                            onClick={() => {
                              if (confirm(`Deslogar TODOS os usuários de "${t.razao_social}"?`))
                                signOutTenantMut.mutate(t.id);
                            }}
                            title="Deslogar toda a empresa"
                          >
                            <LogOut className="size-4 text-red-500" />
                          </Button>
                          {t.contato_whatsapp && (
                            <Button
                              size="icon"
                              variant="ghost"
                              asChild
                              title={`WhatsApp ${t.contato_whatsapp}`}
                            >
                              <a
                                href={`https://wa.me/55${String(t.contato_whatsapp).replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle className="size-4 text-green-500" />
                              </a>
                            </Button>
                          )}
                          {t.contato_email && (
                            <Button
                              size="icon"
                              variant="ghost"
                              asChild
                              title={`E-mail ${t.contato_email}`}
                            >
                              <a href={`mailto:${t.contato_email}`}>
                                <Mail className="size-4 text-sky-500" />
                              </a>
                            </Button>
                          )}
                          {t.cnpj && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(String(t.cnpj).replace(/\D/g, ""));
                                toast.success("CNPJ copiado");
                              }}
                              title="Copiar CNPJ"
                            >
                              <Copy className="size-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Remover "${t.razao_social}"?`)) removeMut.mutate(t.id);
                            }}
                            title="Remover"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {detailsId && (
        <TenantDetailsDialog id={detailsId} open={!!detailsId} onClose={() => setDetailsId(null)} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`size-11 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-display font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceiroSaaS({ data, loading }: { data: any; loading: boolean }) {
  if (loading)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Carregando financeiro…
        </CardContent>
      </Card>
    );
  if (!data) return null;
  const r = data.resumo;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Financeiro do SaaS — assinaturas
        </h2>
        <span className="text-xs text-muted-foreground">
          Receita recorrente dos clientes do mídia.OS
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={fmtBRL(r.mrr)}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="ARR projetado"
          value={fmtBRL(r.arr)}
          accent="bg-indigo-500/10 text-indigo-400"
        />
        <StatCard
          icon={Activity}
          label="Ticket médio"
          value={fmtBRL(r.ticket_medio)}
          accent="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          icon={Building2}
          label="Assinaturas ativas"
          value={r.clientes_ativos}
          accent="bg-violet-500/10 text-violet-400"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={AlertTriangle}
          label="A receber (7d)"
          value={fmtBRL(r.valor_a_receber_7d)}
          accent="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="A receber (30d)"
          value={fmtBRL(r.valor_a_receber_30d)}
          accent="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          icon={Lock}
          label="Vencidos em aberto"
          value={fmtBRL(r.valor_vencido)}
          accent="bg-red-500/10 text-red-400"
        />
        <StatCard
          icon={Lock}
          label="Bloqueados (inadimpl.)"
          value={fmtBRL(r.valor_bloqueado)}
          accent="bg-red-500/10 text-red-400"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR por plano</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.por_plano.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-4 text-sm"
                    >
                      Sem assinaturas ativas.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.por_plano.map((p: any) => {
                    const planoLabel = PLANOS.find((x) => x.value === p.plano)?.label ?? p.plano;
                    return (
                      <TableRow key={p.plano}>
                        <TableCell>
                          <Badge variant="outline">{planoLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{p.clientes}</TableCell>
                        <TableCell className="text-right font-medium">{fmtBRL(p.mrr)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              Pagamentos em atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Venceu</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vencidos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-4 text-sm"
                    >
                      Nenhum pagamento em atraso.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.vencidos.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm font-medium">{v.razao_social}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(v.proximo_vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-xs text-red-400">
                        {v.dias_atraso}d
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmtBRL(v.valor_mensal)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos recebimentos (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Em</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.a_receber.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-sm">
                    Nenhum recebimento previsto nos próximos 30 dias.
                  </TableCell>
                </TableRow>
              ) : (
                data.a_receber.map((v: any) => {
                  const planoLabel = PLANOS.find((x) => x.value === v.plano)?.label ?? v.plano;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm font-medium">{v.razao_social}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {planoLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(v.proximo_vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-xs">{v.dias_para_vencer}d</TableCell>
                      <TableCell className="text-right text-sm">{fmtBRL(v.valor_mensal)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {v.contato_whatsapp && (
                            <Button size="icon" variant="ghost" asChild title="WhatsApp">
                              <a
                                href={`https://wa.me/55${String(v.contato_whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Lembrete: sua assinatura do mídia.OS vence em ${new Date(v.proximo_vencimento).toLocaleDateString("pt-BR")} — ${fmtBRL(v.valor_mensal)}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle className="size-4 text-green-500" />
                              </a>
                            </Button>
                          )}
                          {v.contato_email && (
                            <Button size="icon" variant="ghost" asChild title="E-mail">
                              <a
                                href={`mailto:${v.contato_email}?subject=${encodeURIComponent("Lembrete de vencimento — mídia.OS")}`}
                              >
                                <Mail className="size-4 text-sky-500" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantDetailsDialog({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  const detailsFn = useServerFn(getTenantDetails);
  const setAlerta = useServerFn(setTenantAlerta);
  const setBloqueio = useServerFn(setTenantBloqueio);
  const signOutU = useServerFn(signOutUsuario);
  const desvincularU = useServerFn(desvincularUsuarioTenant);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "tenant", id],
    queryFn: () => detailsFn({ data: { id } }),
  });

  const [mensagem, setMensagem] = useState("");
  const [motivo, setMotivo] = useState("");

  // sincroniza ao carregar o tenant (apenas uma vez por tenant)
  useEffect(() => {
    if (q.data?.tenant) {
      setMensagem(q.data.tenant.mensagem_alerta ?? "");
      setMotivo("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.tenant?.id]);

  const t = q.data?.tenant;
  const usuarios = q.data?.usuarios ?? [];
  const historico = q.data?.historico ?? [];
  const stats = q.data?.stats;

  const saveAlerta = async () => {
    try {
      await setAlerta({ data: { id, mensagem: mensagem.trim() || null } });
      toast.success("Mensagem de alerta atualizada");
      qc.invalidateQueries({ queryKey: ["owner", "tenant", id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleBlock = async () => {
    if (!t) return;
    try {
      if (!t.bloqueado && !motivo.trim()) {
        toast.error("Informe o motivo do bloqueio");
        return;
      }
      await setBloqueio({ data: { id, bloqueado: !t.bloqueado, motivo: motivo.trim() } });
      toast.success(t.bloqueado ? "Cliente desbloqueado" : "Cliente bloqueado");
      qc.invalidateQueries({ queryKey: ["owner"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t?.razao_social ?? "Detalhes do cliente"}</DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Carregando…</div>
        ) : !t ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Cliente não encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Info
                label="Plano"
                value={PLANOS.find((p) => p.value === t.plano)?.label ?? t.plano}
              />
              <Info label="Valor" value={fmtBRL(t.valor_mensal)} />
              <Info
                label="Vencimento"
                value={
                  t.proximo_vencimento
                    ? new Date(t.proximo_vencimento).toLocaleDateString("pt-BR")
                    : "—"
                }
              />
              <Info label="Usuários" value={`${usuarios.length} / ${t.max_usuarios ?? "—"}`} />
            </div>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Info label="Última atividade" value={fmtDate(stats.ultima_atividade)} />
                <Info label="CNPJ" value={t.cnpj ?? "—"} />
              </div>
            )}

            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Mensagem de alerta no app do cliente
              </Label>
              <Textarea
                rows={2}
                placeholder="Ex.: Mensalidade vence em 25/06. Regularize para evitar bloqueio."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={saveAlerta}>
                  Salvar mensagem
                </Button>
              </div>
            </div>

            <div
              className={`rounded-lg border p-3 space-y-2 ${t.bloqueado ? "border-red-500/40 bg-red-500/5" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Acesso do cliente
                  </div>
                  <div className="text-sm font-medium">
                    {t.bloqueado ? `Bloqueado — ${t.bloqueado_motivo ?? "sem motivo"}` : "Liberado"}
                  </div>
                </div>
                <Button
                  variant={t.bloqueado ? "outline" : "destructive"}
                  size="sm"
                  onClick={toggleBlock}
                >
                  {t.bloqueado ? (
                    <>
                      <Unlock className="size-4 mr-2" />
                      Desbloquear
                    </>
                  ) : (
                    <>
                      <Lock className="size-4 mr-2" />
                      Bloquear acesso
                    </>
                  )}
                </Button>
              </div>
              {!t.bloqueado && (
                <Input
                  placeholder="Motivo do bloqueio (ex.: pagamento em atraso)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              )}
            </div>

            <Tabs defaultValue="plano">
              <TabsList>
                <TabsTrigger value="plano">Plano & Módulos</TabsTrigger>
                <TabsTrigger value="auth">Usuários ({usuarios.length})</TabsTrigger>
                <TabsTrigger value="hist">Histórico de uso ({historico.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="plano" className="mt-3">
                <TenantPlanoEditor tenant={t} usuariosCount={usuarios.length} />
              </TabsContent>

              <TabsContent value="auth" className="mt-3 space-y-3">
                <TenantUsuariosToolbar
                  tenantId={t.id}
                  onChanged={() => qc.invalidateQueries({ queryKey: ["owner"] })}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Último acesso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Nenhum usuário vinculado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      usuarios.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.nome ?? "—"}</TableCell>
                          <TableCell className="text-xs">{u.email}</TableCell>
                          <TableCell className="text-xs">{fmtDate(u.last_sign_in_at)}</TableCell>
                          <TableCell>
                            {u.banned_until && new Date(u.banned_until) > new Date() ? (
                              <Badge className="bg-red-500/15 text-red-300 border-red-500/30">
                                Bloqueado
                              </Badge>
                            ) : u.ativo === false ? (
                              <Badge variant="outline">Inativo</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                                Ativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!confirm(`Deslogar "${u.nome ?? u.email}"?`)) return;
                                try {
                                  await signOutU({ data: { user_id: u.id } });
                                  toast.success("Usuário deslogado");
                                } catch (e: any) {
                                  toast.error(e.message);
                                }
                              }}
                              title="Deslogar usuário"
                            >
                              <LogOut className="size-4 mr-1 text-red-500" /> Deslogar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!confirm(`Desvincular "${u.nome ?? u.email}" deste inquilino?`))
                                  return;
                                try {
                                  await desvincularU({ data: { user_id: u.id } });
                                  toast.success("Usuário desvinculado");
                                  qc.invalidateQueries({ queryKey: ["owner"] });
                                } catch (e: any) {
                                  toast.error(e.message);
                                }
                              }}
                              title="Desvincular do inquilino"
                            >
                              <Trash2 className="size-4 mr-1" /> Desvincular
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="hist" className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Operação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Sem atividade registrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historico.map((h: any) => {
                        const u = usuarios.find((x: any) => x.id === h.user_id);
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs">{fmtDate(h.created_at)}</TableCell>
                            <TableCell className="text-xs">{u?.nome ?? u?.email ?? "—"}</TableCell>
                            <TableCell className="text-xs">{h.tabela}</TableCell>
                            <TableCell className="text-xs">{h.operacao}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TenantPlanoEditor({ tenant, usuariosCount }: { tenant: any; usuariosCount: number }) {
  const qc = useQueryClient();
  const planosFn = useServerFn(listPlanos);
  const saveFn = useServerFn(setTenantPlano);
  const planosQ = useQuery({ queryKey: ["owner", "planos"], queryFn: () => planosFn() });
  const planos = (planosQ.data ?? []) as Plano[];

  const [planoId, setPlanoId] = useState<string | null>(tenant.plano_id ?? null);
  const [maxUsersOverride, setMaxUsersOverride] = useState<string>(
    tenant.max_usuarios_override != null ? String(tenant.max_usuarios_override) : "",
  );
  const [usarOverrideMods, setUsarOverrideMods] = useState<boolean>(
    Array.isArray(tenant.modulos_override),
  );
  const [modsOverride, setModsOverride] = useState<string[]>(tenant.modulos_override ?? []);

  useEffect(() => {
    setPlanoId(tenant.plano_id ?? null);
    setMaxUsersOverride(
      tenant.max_usuarios_override != null ? String(tenant.max_usuarios_override) : "",
    );
    setUsarOverrideMods(Array.isArray(tenant.modulos_override));
    setModsOverride(tenant.modulos_override ?? []);
  }, [tenant.id]);

  const planoSelecionado = planos.find((p) => p.id === planoId) ?? null;
  const modulosEfetivos = usarOverrideMods ? modsOverride : (planoSelecionado?.modulos ?? []);
  const limiteEfetivo = maxUsersOverride
    ? Number(maxUsersOverride)
    : (planoSelecionado?.max_usuarios ?? null);

  const save = async () => {
    try {
      await saveFn({
        data: {
          tenant_id: tenant.id,
          plano_id: planoId,
          max_usuarios_override: maxUsersOverride ? Number(maxUsersOverride) : null,
          modulos_override: usarOverrideMods ? modsOverride : null,
        },
      });
      toast.success("Plano e módulos atualizados");
      qc.invalidateQueries({ queryKey: ["owner"] });
      qc.invalidateQueries({ queryKey: ["my-tenant-plano"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Plano contratado
          </Label>
          <Select
            value={planoId ?? "none"}
            onValueChange={(v) => setPlanoId(v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem plano</SelectItem>
              {planos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} — {fmtBRL(p.preco_mensal)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Limite de usuários (override)
          </Label>
          <Input
            type="number"
            min={1}
            placeholder={planoSelecionado?.max_usuarios?.toString() ?? "ilimitado"}
            value={maxUsersOverride}
            onChange={(e) => setMaxUsersOverride(e.target.value)}
          />
          <div className="text-[11px] text-muted-foreground mt-1">
            Atual: {usuariosCount} usuário(s). Limite efetivo: {limiteEfetivo ?? "ilimitado"}.
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="override-mods"
            checked={usarOverrideMods}
            onCheckedChange={(v) => setUsarOverrideMods(!!v)}
          />
          <Label htmlFor="override-mods" className="text-sm">
            Personalizar módulos liberados (sobrescreve o plano)
          </Label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MODULOS_DISPONIVEIS.map((m) => {
            const liberado = usarOverrideMods
              ? modsOverride.includes(m.key)
              : (planoSelecionado?.modulos ?? []).includes(m.key);
            return (
              <label
                key={m.key}
                className={`flex items-center gap-2 rounded border p-2 text-sm ${
                  usarOverrideMods ? "cursor-pointer" : "opacity-70"
                }`}
              >
                <Checkbox
                  checked={liberado}
                  disabled={!usarOverrideMods}
                  onCheckedChange={(v) => {
                    if (!usarOverrideMods) return;
                    setModsOverride((prev) =>
                      v ? Array.from(new Set([...prev, m.key])) : prev.filter((x) => x !== m.key),
                    );
                  }}
                />
                <span>{m.label}</span>
              </label>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Módulos efetivos para esta empresa:{" "}
          {modulosEfetivos.length === 0 ? "nenhum" : modulosEfetivos.join(", ")}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save}>Salvar plano & módulos</Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function TenantDialog({ editing, onSaved }: { editing: any | null; onSaved: () => void }) {
  const save = useServerFn(upsertTenant);
  const [form, setForm] = useState<TenantInput>(() => ({
    id: editing?.id,
    razao_social: editing?.razao_social ?? "",
    nome_fantasia: editing?.nome_fantasia ?? "",
    cnpj: editing?.cnpj ?? "",
    contato_nome: editing?.contato_nome ?? "",
    contato_email: editing?.contato_email ?? "",
    contato_whatsapp: editing?.contato_whatsapp ?? "",
    plano: editing?.plano ?? "essencial",
    ciclo: editing?.ciclo ?? "mensal",
    valor_mensal: Number(editing?.valor_mensal ?? 150),
    status: editing?.status ?? "ativo",
    data_inicio: editing?.data_inicio ?? new Date().toISOString().slice(0, 10),
    proximo_vencimento: editing?.proximo_vencimento ?? "",
    observacoes: editing?.observacoes ?? "",
    max_usuarios: Number(
      editing?.max_usuarios ??
        PLANOS.find((p) => p.value === (editing?.plano ?? "essencial"))?.max ??
        5,
    ),
    logo_url: editing?.logo_url ?? null,
    categorias_servicos: Array.isArray(editing?.categorias_servicos)
      ? editing.categorias_servicos
      : [],
    proposta_layout_padrao: editing?.proposta_layout_padrao ?? "padrao",
  }));

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const buscarCnpj = async () => {
    const digits = onlyDigits(form.cnpj ?? "");
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ com 14 dígitos");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const d = await fetchCnpj(digits);
      setForm((f) => ({
        ...f,
        cnpj: formatCNPJ(digits),
        razao_social: f.razao_social || d.razaoSocial || "",
        nome_fantasia: f.nome_fantasia || d.nomeFantasia || "",

        contato_email: f.contato_email || d.email || "",
        contato_whatsapp: f.contato_whatsapp || d.telefone || "",
      }));
      toast.success("Dados do CNPJ preenchidos");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível consultar o CNPJ");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `tenants/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("client-logos").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logo carregada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload da logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const set = (k: keyof TenantInput, v: any) => {
    setForm((f) => {
      const next: any = { ...f, [k]: v };
      if (k === "plano") {
        const p = PLANOS.find((x) => x.value === v);
        if (p) next.max_usuarios = p.max;
      }
      return next;
    });
  };

  const submit = async () => {
    if (!form.razao_social.trim()) return toast.error("Informe a razão social");
    try {
      await save({ data: form });
      toast.success(editing ? "Empresa atualizada" : "Empresa cadastrada");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar inquilino" : "Novo inquilino"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <F label="Razão social *" className="col-span-2">
          <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
        </F>
        <F label="Nome fantasia">
          <Input
            value={form.nome_fantasia ?? ""}
            onChange={(e) => set("nome_fantasia", e.target.value)}
          />
        </F>
        <F label="CNPJ">
          <div className="flex gap-2">
            <Input
              value={form.cnpj ?? ""}
              onChange={(e) => set("cnpj", formatCNPJ(e.target.value))}
              onBlur={() => {
                if (onlyDigits(form.cnpj ?? "").length === 14) buscarCnpj();
              }}
              placeholder="00.000.000/0000-00"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={buscandoCnpj}
              onClick={buscarCnpj}
            >
              {buscandoCnpj ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>
        </F>

        <F label="Contato">
          <Input
            value={form.contato_nome ?? ""}
            onChange={(e) => set("contato_nome", e.target.value)}
          />
        </F>
        <F label="E-mail do contato">
          <Input
            type="email"
            value={form.contato_email ?? ""}
            onChange={(e) => set("contato_email", e.target.value)}
          />
        </F>
        <F label="WhatsApp">
          <Input
            value={form.contato_whatsapp ?? ""}
            onChange={(e) => set("contato_whatsapp", e.target.value)}
          />
        </F>
        <F label="Plano">
          <Select value={form.plano} onValueChange={(v) => set("plano", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Máx. de usuários">
          <Input
            type="number"
            min={1}
            value={form.max_usuarios ?? 5}
            onChange={(e) => set("max_usuarios", Number(e.target.value))}
          />
        </F>
        <F label="Valor mensal (R$)">
          <Input
            type="number"
            step="0.01"
            value={form.valor_mensal}
            onChange={(e) => set("valor_mensal", Number(e.target.value))}
          />
        </F>
        <F label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="inadimplente">Inadimplente</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Início">
          <Input
            type="date"
            value={form.data_inicio ?? ""}
            onChange={(e) => set("data_inicio", e.target.value)}
          />
        </F>
        <F label="Próximo vencimento">
          <Input
            type="date"
            value={form.proximo_vencimento ?? ""}
            onChange={(e) => set("proximo_vencimento", e.target.value)}
          />
        </F>
        <F label="Observações" className="col-span-2">
          <Textarea
            rows={2}
            value={form.observacoes ?? ""}
            onChange={(e) => set("observacoes", e.target.value)}
          />
        </F>
        <F label="Logo da empresa" className="col-span-2">
          <div className="flex items-center gap-3">
            <div className="size-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
              {form.logo_url ? (
                <LogoImg
                  stored={form.logo_url}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">Sem logo</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploadingLogo}
              onClick={() => fileRef.current?.click()}
            >
              {uploadingLogo ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Upload className="size-4 mr-2" />
              )}
              {form.logo_url ? "Trocar logo" : "Enviar logo"}
            </Button>
            {form.logo_url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", null)}>
                Remover
              </Button>
            )}
          </div>
        </F>
        <F label="Layout de Proposta Padrão" className="col-span-2">
          <Select
            value={form.proposta_layout_padrao ?? "padrao"}
            onValueChange={(v) => set("proposta_layout_padrao", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="padrao">Padrão (TV Brasília)</SelectItem>
              <SelectItem value="simplificado">Simplificado (Estratégico DOOH)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1">
            Este modelo será sugerido por padrão ao visualizar propostas para este inquilino.
          </p>
        </F>
      </div>

      <div className="mt-4 rounded-lg border">
        <div className="flex items-center justify-between p-3 border-b bg-muted/40">
          <div>
            <div className="text-sm font-medium">Categorias de serviços oferecidos</div>
            <div className="text-[11px] text-muted-foreground">
              Marque tudo que este inquilino comercializa. Selecionadas:{" "}
              {form.categorias_servicos?.length ?? 0}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => set("categorias_servicos", [])}
            >
              Limpar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const all = CATEGORIAS_SERVICOS.flatMap((g) =>
                  g.itens.flatMap((i) => [i.key, ...(i.subitens?.map((s) => s.key) ?? [])]),
                );
                set("categorias_servicos", all);
              }}
            >
              Marcar tudo
            </Button>
          </div>
        </div>
        <div className="p-3 space-y-4 max-h-[380px] overflow-y-auto">
          {CATEGORIAS_SERVICOS.map((grupo) => {
            const grupoKeys = grupo.itens.flatMap((i) => [
              i.key,
              ...(i.subitens?.map((s) => s.key) ?? []),
            ]);
            const selected = new Set(form.categorias_servicos ?? []);
            const marcadas = grupoKeys.filter((k) => selected.has(k)).length;
            const toggleGrupo = (v: boolean) => {
              const next = new Set(selected);
              for (const k of grupoKeys) v ? next.add(k) : next.delete(k);
              set("categorias_servicos", Array.from(next));
            };
            const toggleItem = (key: string, v: boolean) => {
              const next = new Set(selected);
              v ? next.add(key) : next.delete(key);
              set("categorias_servicos", Array.from(next));
            };
            return (
              <div key={grupo.key} className="rounded border">
                <label className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 cursor-pointer">
                  <Checkbox
                    checked={
                      marcadas === grupoKeys.length
                        ? true
                        : marcadas === 0
                          ? false
                          : "indeterminate"
                    }
                    onCheckedChange={(v) => toggleGrupo(!!v)}
                  />
                  <span className="text-sm font-medium">{grupo.label}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {marcadas}/{grupoKeys.length}
                  </span>
                </label>
                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {grupo.itens.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selected.has(item.key)}
                          onCheckedChange={(v) => toggleItem(item.key, !!v)}
                        />
                        <span>{item.label}</span>
                      </label>
                      {item.subitens && (
                        <div className="ml-6 space-y-1">
                          {item.subitens.map((sub) => (
                            <label
                              key={sub.key}
                              className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                            >
                              <Checkbox
                                checked={selected.has(sub.key)}
                                onCheckedChange={(v) => toggleItem(sub.key, !!v)}
                              />
                              <span>{sub.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        {!editing && (
          <div className="flex-1 flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-dashed">
            <UserPlus className="size-3" />
            Ao salvar, você poderá adicionar usuários no inquilino e configurar as permissões.
          </div>
        )}
        <Button onClick={submit}>{editing ? "Salvar" : "Cadastrar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function F({ label, children, className }: any) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function PlatformConfigCard() {
  const getFn = useServerFn(getPlatformConfig);
  const saveFn = useServerFn(savePlatformConfig);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["platform-config"], queryFn: () => getFn() });
  const [cfg, setCfg] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (v: PlatformConfig) => saveFn({ data: v }),
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["platform-config"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="size-4" /> Modo da plataforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <div className="font-medium">Multi-empresa</div>
            <p className="text-xs text-muted-foreground max-w-xl">
              {cfg.multi_empresa
                ? "Ativado: várias empresas (CNPJs) podem emitir PIs. Somente o proprietário pode cadastrar novos CNPJs de emissão."
                : "Desativado: apenas um CNPJ é usado para emissão de PIs e cadastro de produtos."}
            </p>
          </div>
          <Switch
            checked={cfg.multi_empresa}
            onCheckedChange={(v) => setCfg((c) => ({ ...c, multi_empresa: v }))}
          />
        </div>

        {!cfg.multi_empresa && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ único (emissão de PI)</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cfg.cnpj_padrao}
                onChange={(e) => setCfg((c) => ({ ...c, cnpj_padrao: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Razão social</Label>
              <Input
                value={cfg.razao_social_padrao}
                onChange={(e) => setCfg((c) => ({ ...c, razao_social_padrao: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate(cfg)}>
            Salvar configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const ROLES_TENANT = [
  { value: "admin", label: "Administrador" },
  { value: "executivo", label: "Executivo" },
  { value: "opec", label: "OPEC" },
  { value: "financeiro", label: "Financeiro" },
  { value: "diretoria", label: "Diretoria" },
  { value: "producao", label: "Produção" },
  { value: "parceiro_comercial", label: "Parceiro comercial" },
];

function TenantUsuariosToolbar({
  tenantId,
  onChanged,
}: {
  tenantId: string;
  onChanged: () => void;
}) {
  const criar = useServerFn(createTenantUsuario);
  const vincular = useServerFn(vincularUsuarioTenant);
  const [openNovo, setOpenNovo] = useState(false);
  const [openVinc, setOpenVinc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailExistente, setEmailExistente] = useState("");
  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    cargo: "",
    telefone: "",
    roles: ["executivo"] as string[],
  });

  const toggleRole = (r: string) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
    }));

  const gerarSenha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    const pwd = Array.from(
      { length: 12 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    setForm((f) => ({ ...f, password: pwd }));
    navigator.clipboard?.writeText(pwd).catch(() => {});
    toast.success("Senha gerada e copiada");
  };

  const submitNovo = async () => {
    setSaving(true);
    try {
      await criar({
        data: {
          tenant_id: tenantId,
          ...form,
          cargo: form.cargo || null,
          telefone: form.telefone || null,
        },
      });
      toast.success("Usuário criado e vinculado ao inquilino");
      setOpenNovo(false);
      setForm({ nome: "", email: "", password: "", cargo: "", telefone: "", roles: ["executivo"] });
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitVincular = async () => {
    setSaving(true);
    try {
      await vincular({ data: { tenant_id: tenantId, email: emailExistente } });
      toast.success("Usuário vinculado ao inquilino");
      setOpenVinc(false);
      setEmailExistente("");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Dialog open={openVinc} onOpenChange={setOpenVinc}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Users className="size-4 mr-2" />
            Vincular existente
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular usuário existente</DialogTitle>
          </DialogHeader>
          <F label="E-mail do usuário">
            <Input
              type="email"
              value={emailExistente}
              onChange={(e) => setEmailExistente(e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </F>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenVinc(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={submitVincular}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogTrigger asChild>
          <Button size="sm">
            <UserPlus className="size-4 mr-2" />
            Adicionar usuário
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo usuário do inquilino</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <F label="Nome completo *" className="col-span-2">
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </F>
            <F label="E-mail *" className="col-span-2">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </F>
            <F label="Senha *" className="col-span-2">
              <div className="flex gap-2">
                <Input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <Button type="button" variant="secondary" size="sm" onClick={gerarSenha}>
                  Gerar
                </Button>
              </div>
            </F>
            <F label="Cargo">
              <Input
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </F>
            <F label="Telefone">
              <Input
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </F>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Perfis de acesso</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ROLES_TENANT.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.roles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={submitNovo}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
