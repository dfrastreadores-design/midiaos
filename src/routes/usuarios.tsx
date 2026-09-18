import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { listUsuarios, setUserRole, toggleUserAtivo, createUsuario, listAuditoriaAcessos, adminResetPassword, deleteUsuario } from "@/lib/usuarios.functions";
import { uploadAssinaturaExecutivo, removerAssinaturaExecutivo } from "@/lib/assinaturas.functions";
import { listPermissions, setRolePermission } from "@/lib/permissions.functions";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-roles";
import { useTenantModulos } from "@/hooks/use-tenant-modulos";
import { toast } from "sonner";
import { UserPlus, ShieldAlert, History, PenLine, Trash2, KeyRound, Lock } from "lucide-react";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e Perfis — Mídia.OS" }] }),
  component: UsuariosPage,
});

type RoleKey = "admin" | "executivo" | "opec" | "financeiro" | "producao" | "diretoria" | "parceiro_comercial" | "teste";
const ROLES: { key: RoleKey; label: string; desc: string }[] = [
  { key: "admin", label: "Admin", desc: "Acesso total" },
  { key: "executivo", label: "Executivo", desc: "Comercial / PI" },
  { key: "opec", label: "OPEC", desc: "Programação" },
  { key: "financeiro", label: "Financeiro", desc: "Faturamento" },
  { key: "producao", label: "Produção", desc: "Recebe avisos de produção de material" },
  { key: "diretoria", label: "Diretoria", desc: "Visualização e aprovação" },
  { key: "parceiro_comercial", label: "Parceiro (Briefing)", desc: "Solicita briefings de proposta" },
  { key: "teste", label: "Teste", desc: "Cadastro via site (avaliação)" },
];

function UsuariosHeader({ createFn }: { createFn: ReturnType<typeof useServerFn<typeof createUsuario>> }) {
  const qc = useQueryClient();
  const { userCount, userLimit, loaded } = useTenantModulos();
  const atingiuLimite = loaded && userLimit != null && userCount >= userLimit;
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">Usuários e Perfis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Apenas administradores podem criar, ativar/inativar usuários e atribuir perfis.
        </p>
        {loaded && (
          <p className={`text-xs mt-1 ${atingiuLimite ? "text-destructive" : "text-muted-foreground"}`}>
            Usuários cadastrados: <strong>{userCount}</strong>
            {userLimit != null ? ` de ${userLimit} (limite do plano)` : " (ilimitado)"}
            {atingiuLimite && " — limite atingido. Atualize o plano para adicionar mais usuários."}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <AuditoriaDialog />
        <PermissoesGeraisDialog />
        <NovoUsuarioDialog
          disabled={atingiuLimite}
          onCreate={async (vars) => {
            await createFn({ data: vars });
            qc.invalidateQueries({ queryKey: ["usuarios"] });
            qc.invalidateQueries({ queryKey: ["my-tenant-plano"] });
          }}
        />
      </div>
    </div>
  );
}

function UsuariosPage() {

  const qc = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const fetchList = useServerFn(listUsuarios);
  const setRole = useServerFn(setUserRole);
  const toggleAtivo = useServerFn(toggleUserAtivo);
  const createFn = useServerFn(createUsuario);

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => fetchList(),
    enabled: isAdmin,
  });

  const roleMut = useMutation({
    mutationFn: (vars: { user_id: string; role: RoleKey; enabled: boolean }) =>
      setRole({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Perfil atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ativoMut = useMutation({
    mutationFn: (vars: { user_id: string; ativo: boolean }) => toggleAtivo({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rolesLoading) {
    return (
      <AppShell>
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto mt-20 text-center space-y-3">
          <ShieldAlert className="size-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Apenas administradores</h1>
          <p className="text-sm text-muted-foreground">
            Somente o perfil <strong>Admin</strong> pode gerenciar usuários e permissões.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <UsuariosHeader createFn={createFn} />

      {data && data.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Usuários ativos por perfil</div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => {
                const count = data.filter((u) => u.ativo && u.roles.includes(r.key)).length;
                return (
                  <Badge key={r.key} variant={count > 0 ? "default" : "secondary"} className="gap-1.5">
                    <span>{r.label}</span>
                    <span className="font-mono opacity-80">{count}</span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}




      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r.key} className="text-center">
                    <div>{r.label}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">{r.desc}</div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Senha</TableHead>
                <TableHead className="text-center">Assinatura</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && data?.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum usuário ainda.</TableCell></TableRow>
              )}
              {data?.map((u) => {
                const initials = (u.nome || u.email).split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium">{u.nome}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                          {!u.ativo && <Badge variant="secondary" className="mt-1">Inativo</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    {ROLES.map((r) => {
                      const enabled = u.roles.includes(r.key);
                      return (
                        <TableCell key={r.key} className="text-center">
                          <Checkbox
                            checked={enabled}
                            onCheckedChange={(v) =>
                              roleMut.mutate({ user_id: u.id, role: r.key, enabled: Boolean(v) })
                            }
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <RedefinirSenhaDialog userId={u.id} userEmail={u.email} />
                    </TableCell>
                    <TableCell className="text-center">
                      <AssinaturaCell userId={u.id} assinaturaPath={u.assinatura_url} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={u.ativo}
                        onCheckedChange={(v) => ativoMut.mutate({ user_id: u.id, ativo: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ExcluirUsuarioButton userId={u.id} userEmail={u.email} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function NovoUsuarioDialog({
  onCreate,
  disabled,
}: {
  onCreate: (vars: { email: string; password: string; nome: string; cargo: string; telefone: string; roles: RoleKey[] }) => Promise<void>;
  disabled?: boolean;
}) {

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<RoleKey[]>(["executivo"]);
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: RoleKey, on: boolean) => {
    setRoles((cur) => (on ? Array.from(new Set([...cur, r])) : cur.filter((x) => x !== r)));
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roles.length === 0) return toast.error("Selecione ao menos um perfil");
    if (nome.trim().split(/\s+/).length < 2) return toast.error("Informe o nome completo");
    if (telefone.trim().length < 8) return toast.error("Informe um telefone válido");
    setSaving(true);
    try {
      await onCreate({ email, password, nome: nome.trim(), cargo: cargo.trim(), telefone: telefone.trim(), roles });
      toast.success("Usuário criado");
      setOpen(false);
      setNome(""); setCargo(""); setTelefone(""); setEmail(""); setPassword(""); setRoles(["executivo"]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <DialogTrigger asChild>
        <Button disabled={disabled} title={disabled ? "Limite de usuários do plano atingido" : undefined}>
          <UserPlus className="size-4 mr-2" />Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar usuário</DialogTitle></DialogHeader>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" required />
          </div>
          <div>
            <Label>Função na empresa (cargo)</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Executivo de contas, Diretor Comercial…" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(61) 99999-9999" required />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Senha provisória</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <p className="text-xs text-muted-foreground mt-1">Compartilhe com o usuário. Ele poderá alterá-la depois.</p>
          </div>
          <div>
            <Label>Perfis</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ROLES.map((r) => (
                <label key={r.key} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={roles.includes(r.key)}
                    onCheckedChange={(v) => toggleRole(r.key, Boolean(v))}
                  />
                  <div>
                    <div className="font-medium">{r.label}</div>
                    <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Criando…" : "Criar usuário"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ACAO_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  usuario_criado: { label: "Usuário criado", variant: "default" },
  usuario_ativado: { label: "Ativado", variant: "default" },
  usuario_desativado: { label: "Desativado", variant: "destructive" },
  papel_concedido: { label: "Perfil concedido", variant: "default" },
  papel_revogado: { label: "Perfil revogado", variant: "destructive" },
  senha_redefinida: { label: "Senha alterada", variant: "secondary" },
};

function AuditoriaDialog() {
  const [open, setOpen] = useState(false);
  const fetchLog = useServerFn(listAuditoriaAcessos);
  const { data, isLoading } = useQuery({
    queryKey: ["auditoria-acessos"],
    queryFn: () => fetchLog(),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><History className="size-4 mr-2" />Auditoria</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Histórico de alterações de acesso</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário alvo</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Autor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum registro ainda.</TableCell></TableRow>
              )}
              {data?.map((row: any) => {
                const info = ACAO_LABEL[row.acao] ?? { label: row.acao, variant: "outline" as const };
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.target_email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.role ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.actor_email ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissoesGeraisDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const fetchPerms = useServerFn(listPermissions);
  const setPerm = useServerFn(setRolePermission);

  const { data, isLoading } = useQuery({
    queryKey: ["permissions-matrix"],
    queryFn: () => fetchPerms(),
    enabled: open,
  });

  const permMut = useMutation({
    mutationFn: (vars: { role: RoleKey; permission_key: string; enabled: boolean }) =>
      setPerm({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions-matrix"] });
      toast.success("Permissão atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Lock className="size-4 mr-2" />Permissões</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar permissões por perfil</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Módulo / Permissão</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r.key} className="text-center">{r.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={ROLES.length + 1} className="text-center py-8">Carregando…</TableCell></TableRow>
              )}
              {data?.permissions.map((p: any) => (
                <TableRow key={p.key}>
                  <TableCell>
                    <div className="font-medium text-sm">{p.name || p.key}</div>
                    {p.description && <div className="text-[10px] text-muted-foreground">{p.description}</div>}
                  </TableCell>
                  {ROLES.map((r) => {
                    const has = data.rolePermissions.some(
                      (rp: any) => rp.role === r.key && rp.permission_key === p.key
                    );
                    return (
                      <TableCell key={r.key} className="text-center">
                        <Checkbox
                          checked={has}
                          onCheckedChange={(v) =>
                            permMut.mutate({ role: r.key, permission_key: p.key, enabled: Boolean(v) })
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssinaturaCell({ userId, assinaturaPath }: { userId: string; assinaturaPath: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const uploadFn = useServerFn(uploadAssinaturaExecutivo);
  const removeFn = useServerFn(removerAssinaturaExecutivo);

  const { data: previewUrl } = useQuery({
    queryKey: ["assinatura-preview", userId, assinaturaPath],
    queryFn: async () => {
      if (!assinaturaPath) return null;
      const { data } = await supabase.storage.from("assinaturas").createSignedUrl(assinaturaPath, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: open && Boolean(assinaturaPath),
  });

  const handleFile = async (file: File) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast.error("Envie um arquivo PNG ou JPG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 2MB)");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await uploadFn({ data: { user_id: userId, dataUrl } });
      toast.success("Assinatura enviada");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeFn({ data: { user_id: userId } });
      toast.success("Assinatura removida");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={assinaturaPath ? "outline" : "ghost"} size="sm">
          <PenLine className="size-4 mr-1.5" />
          {assinaturaPath ? "Enviada" : "Enviar"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assinatura do executivo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie uma imagem PNG ou JPG (fundo transparente recomendado). Ela será inserida automaticamente nos PIs gerados por este usuário.
          </p>
          {assinaturaPath && previewUrl && (
            <div className="border rounded-md p-3 bg-muted/30 flex justify-center">
              <img src={previewUrl} alt="Assinatura atual" className="max-h-24 object-contain" />
            </div>
          )}
          <div>
            <Label>Arquivo (PNG ou JPG, máx 2MB)</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          {assinaturaPath && (
            <Button variant="destructive" onClick={handleRemove} disabled={busy}>
              <Trash2 className="size-4 mr-1.5" />Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RedefinirSenhaDialog({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const resetFn = useServerFn(adminResetPassword);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    setBusy(true);
    try {
      await resetFn({ data: { user_id: userId, password } });
      toast.success(`Senha de ${userEmail} alterada com sucesso`);
      setOpen(false);
      setPassword("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyRound className="size-4 mr-1.5" />
          Redefinir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Alterando a senha de: <strong>{userEmail}</strong>
          </p>
          <div>
            <Label>Nova senha (mínimo 6 caracteres)</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Digite a nova senha"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Alterando..." : "Salvar nova senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirUsuarioButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const deleteFn = useServerFn(deleteUsuario);

  const handle = async () => {
    if (confirm !== userEmail) {
      toast.error("Digite o e-mail exato para confirmar");
      return;
    }
    setBusy(true);
    try {
      await deleteFn({ data: { user_id: userId } });
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      setOpen(false);
      setConfirm("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            Esta ação remove <strong>{userEmail}</strong> de todo o sistema (login, perfil e permissões). Não pode ser desfeita.
          </p>
          <div>
            <Label>Digite o e-mail do usuário para confirmar</Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={userEmail} autoComplete="off" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="destructive" onClick={handle} disabled={busy || confirm !== userEmail}>
            {busy ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
