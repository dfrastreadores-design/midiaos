import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMeuPerfil, updateUsuarioPerfil, listUsuarios } from "@/lib/usuarios.functions";
import { uploadAssinaturaExecutivo, removerAssinaturaExecutivo, getAssinaturaExecutivoDoPi } from "@/lib/assinaturas.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRef } from "react";
import { exportarMeusDados, solicitarExclusao, listarMinhasSolicitacoes } from "@/lib/lgpd.functions";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({ meta: [{ title: "Minha Conta — Mídia.OS" }] }),
  component: MinhaConta,
});

type Form = {
  user_id: string;
  nome: string;
  cargo: string;
  telefone: string;
  whatsapp: string;
  email: string;
  password: string;
};

const EMPTY: Form = { user_id: "", nome: "", cargo: "", telefone: "", whatsapp: "", email: "", password: "" };

function MinhaConta() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ["meu-perfil"], queryFn: () => getMeuPerfil() });
  const isAdmin = !!me?.isAdmin;
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listUsuarios(),
    enabled: isAdmin,
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<Form>(EMPTY);

  useEffect(() => {
    if (me?.profile && !selectedId) {
      setSelectedId(me.profile.id);
    }
  }, [me, selectedId]);

  useEffect(() => {
    const target =
      selectedId === me?.profile?.id
        ? me?.profile
        : (usuarios as any[]).find((u) => u.id === selectedId);
    if (target) {
      setForm({
        user_id: target.id,
        nome: target.nome ?? "",
        cargo: target.cargo ?? "",
        telefone: target.telefone ?? "",
        whatsapp: target.whatsapp ?? "",
        email: target.email ?? "",
        password: "",
      });
    }
  }, [selectedId, me, usuarios]);

  const save = useMutation({
    mutationFn: () =>
      updateUsuarioPerfil({
        data: {
          user_id: form.user_id,
          nome: form.nome,
          cargo: form.cargo || null,
          telefone: form.telefone || null,
          whatsapp: form.whatsapp || null,
          email: form.email || undefined,
          password: form.password || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Dados atualizados");
      setForm((f) => ({ ...f, password: "" }));
      qc.invalidateQueries({ queryKey: ["meu-perfil"] });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editingSelf = form.user_id === me?.profile?.id;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Atualize seus dados pessoais e de acesso.
          {isAdmin && " Como administrador, você também pode editar as informações de outros usuários."}
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : (
        <div className="grid gap-6 max-w-3xl">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editar informações de</CardTitle>
                <CardDescription>Selecione qualquer usuário do sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                  <SelectContent>
                    {(usuarios as any[]).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {editingSelf ? "Meus dados" : "Dados do usuário"}
                {!editingSelf && <Badge variant="secondary">Edição administrativa</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome completo</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail de acesso</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nova senha</Label>
                  <Input
                    type="password"
                    placeholder="Deixe em branco para não alterar"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button disabled={save.isPending || !form.nome.trim()} onClick={() => save.mutate()}>
                  Salvar alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          <AssinaturaCard userId={form.user_id} />

          {editingSelf && <LgpdCard />}
        </div>
      )}
    </AppShell>
  );
}

function AssinaturaCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: assin, isLoading } = useQuery({
    queryKey: ["assinatura-exec", userId],
    queryFn: async () => {
      // Busca via PI fictício? Simples: lê o profile direto.
      const { data } = await supabase.from("profiles").select("assinatura_url").eq("id", userId).maybeSingle();
      if (!data?.assinatura_url) return { url: null as string | null };
      const { data: signed } = await supabase.storage.from("assinaturas").createSignedUrl(data.assinatura_url, 3600);
      return { url: signed?.signedUrl ?? null };
    },
    enabled: !!userId,
  });

  const upload = useMutation({
    mutationFn: (dataUrl: string) => uploadAssinaturaExecutivo({ data: { user_id: userId, dataUrl } }),
    onSuccess: () => { toast.success("Assinatura salva"); qc.invalidateQueries({ queryKey: ["assinatura-exec", userId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: () => removerAssinaturaExecutivo({ data: { user_id: userId } }),
    onSuccess: () => { toast.success("Assinatura removida"); qc.invalidateQueries({ queryKey: ["assinatura-exec", userId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onPick = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => upload.mutate(reader.result as string);
    reader.readAsDataURL(file);
  };

  // referência fantasma para evitar tree-shake do helper (usado em pi.tsx)
  void getAssinaturaExecutivoDoPi;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assinatura para PIs</CardTitle>
        <CardDescription>
          Envie sua assinatura em PNG transparente. Ela será inserida automaticamente no PDF dos PIs que você gerar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4 flex items-center justify-center min-h-[100px]">
          {isLoading ? (
            <span className="text-xs text-muted-foreground">Carregando…</span>
          ) : assin?.url ? (
            <img src={assin.url} alt="Assinatura" className="max-h-24 object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Nenhuma assinatura cadastrada</span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {assin?.url ? "Trocar assinatura" : "Enviar assinatura"}
          </Button>
          {assin?.url && (
            <Button variant="ghost" onClick={() => remover.mutate()} disabled={remover.isPending}>Remover</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LgpdCard() {
  const exportar = useServerFn(exportarMeusDados);
  const excluir = useServerFn(solicitarExclusao);
  const { data: solicitacoes, refetch } = useQuery({
    queryKey: ["lgpd-solicitacoes"],
    queryFn: () => listarMinhasSolicitacoes(),
  });
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  const onExportar = async () => {
    setBusy(true);
    try {
      const json = await exportar();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-midiaos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Seus dados foram exportados.");
      refetch();
    } catch (e: any) {
      toast.error("Falha ao exportar", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onExcluir = async () => {
    if (!confirm("Confirma a solicitação de exclusão definitiva da sua conta e dados pessoais? Esta ação é irreversível após processamento.")) return;
    setBusy(true);
    try {
      await excluir({ data: { observacoes: motivo.trim() || undefined } } as never);
      toast.success("Solicitação registrada. Nossa equipe processará em até 15 dias.");
      setMotivo("");
      refetch();
    } catch (e: any) {
      toast.error("Não foi possível registrar", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Privacidade &amp; LGPD</CardTitle>
        <CardDescription>
          Exerça seus direitos como titular de dados. Leia também nossa{" "}
          <Link to="/site/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-medium text-sm">Acessar e exportar meus dados (portabilidade)</h4>
          <p className="text-xs text-muted-foreground">
            Baixe uma cópia em JSON do seu perfil e dos registros que você criou (PIs, propostas, clientes, briefings, tarefas e auditoria).
          </p>
          <Button variant="outline" size="sm" onClick={onExportar} disabled={busy}>
            Exportar meus dados
          </Button>
        </div>

        <div className="rounded-lg border border-destructive/40 p-4 space-y-2">
          <h4 className="font-medium text-sm text-destructive">Solicitar exclusão definitiva (direito ao esquecimento)</h4>
          <p className="text-xs text-muted-foreground">
            Sua conta e dados pessoais serão excluídos em até 15 dias. Registros fiscais obrigatórios podem ser mantidos anonimizados.
          </p>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            rows={2}
            maxLength={1000}
          />
          <Button variant="destructive" size="sm" onClick={onExcluir} disabled={busy}>
            Solicitar exclusão
          </Button>
        </div>

        {solicitacoes && solicitacoes.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Minhas solicitações</h4>
            <ul className="text-sm space-y-1">
              {solicitacoes.map((s: any) => (
                <li key={s.id} className="flex justify-between border-b py-1.5">
                  <span className="capitalize">{s.tipo}</span>
                  <span className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")} · <Badge variant="secondary">{s.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
