import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, Home, Lock, Mail, LogOut, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import { toast } from "sonner";

type Props = {
  recurso?: string;
  motivo?: string;
  onVoltar?: () => void;
};

export function AcessoNegadoScreen({ recurso, motivo, onVoltar }: Props) {
  const { user, signOut } = useAuth();
  const { roles } = useUserRoles();
  const navigate = useNavigate();

  const handleSolicitar = () => {
    toast.info("Solicitação registrada. Comunique o administrador da sua empresa para liberação de perfil.");
  };

  const roleNames: Record<string, string> = {
    admin: "Administrador",
    super_admin: "Super Administrador",
    diretoria: "Diretoria",
    executivo: "Executivo de Vendas",
    comercial: "Comercial",
    parceiro_comercial: "Parceiro Comercial",
    producao: "Produção",
    financeiro: "Financeiro",
    opec: "OPEC / Operações",
  };

  const userRolesList = roles && roles.length > 0
    ? roles.map((r) => roleNames[r] || r).join(", ")
    : "Usuário Padrão";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto p-4 sm:p-8 text-center animate-fade-up">
      {/* Ícone com Destaque */}
      <div className="relative mb-6">
        <div className="size-20 sm:size-24 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/5 shadow-inner">
          <ShieldAlert className="size-10 sm:size-12" />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <Badge variant="destructive" className="font-mono text-[11px] px-2.5 py-0.5 shadow-sm uppercase tracking-wider">
            403 • Acesso Negado
          </Badge>
        </div>
      </div>

      {/* Título e Explicação */}
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Acesso Negado
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          {motivo || "Você não tem permissão para acessar esta área ou funcionalidade do Mídia.OS."}
        </p>
      </div>

      {/* Card de Diagnóstico do Acesso */}
      <Card className="w-full bg-muted/30 border-border/80 text-left mb-6 shadow-xs">
        <CardContent className="p-4 space-y-3 text-xs">
          {recurso && (
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Lock className="size-3.5 text-destructive" />
                Módulo Solicitado:
              </span>
              <span className="font-semibold text-foreground uppercase tracking-wider">
                {recurso}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Mail className="size-3.5" />
              Usuário Conectado:
            </span>
            <span className="font-mono text-foreground font-medium truncate max-w-[220px]" title={user?.email || ""}>
              {user?.email || "Não identificado"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <HelpCircle className="size-3.5" />
              Nível / Perfil Atual:
            </span>
            <Badge variant="outline" className="text-[11px] bg-background">
              {userRolesList}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        <Button
          variant="default"
          onClick={() => navigate({ to: "/" })}
          className="gap-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Home className="size-4" />
          Voltar ao Início
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            if (onVoltar) onVoltar();
            else window.history.back();
          }}
          className="gap-2 px-5"
        >
          <ArrowLeft className="size-4" />
          Página Anterior
        </Button>

        <Button
          variant="ghost"
          onClick={handleSolicitar}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Solicitar Permissão ao Administrador
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-3.5" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}
