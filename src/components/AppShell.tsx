import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Compass,
  KanbanSquare,
  Users,
  Building2,
  FileText,
  FileSignature,
  Wallet,
  WalletCards,
  CalendarDays,
  BarChart3,
  Search,
  Sparkles,
  ShieldCheck,
  Target,
  Package,
  LogOut,
  Settings,
  UserCog,
  History,
  FolderOpen,
  Paperclip,
  RefreshCw,
  Menu,
  CheckSquare,
  ChevronRight,
  BookOpen,
  Percent,
  Activity,
  Radio,
  Handshake,
  Share2,
  Download,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { AppDownloadBanner } from "@/components/AppDownloadBanner";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificacoesBell } from "@/components/NotificacoesBell";
import { AcessoNegadoScreen } from "@/components/AcessoNegadoScreen";
import { TarefasVencendoPopup } from "@/components/TarefasVencendoPopup";
import { CampanhasRenovacaoPopup } from "@/components/CampanhasRenovacaoPopup";
import { SystemUpdatePopup } from "@/components/SystemUpdatePopup";
import { TenantAlertBanner } from "@/components/TenantAlertBanner";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActingAsExecutivo, setActingAsExecutivo } from "@/hooks/use-acting-as";
import { ImpersonateDialog } from "@/components/ImpersonateDialog";
import { UserCheck } from "lucide-react";
import logoMidiaOS from "@/assets/logo-midiaos.png";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { useTenantModulos } from "@/hooks/use-tenant-modulos";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { getInicio } from "@/lib/inicio.functions";
import { Badge } from "@/components/ui/badge";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, modulo: null },
  { to: "/centralizadores", label: "Centralizadores & Planejadores", icon: Compass, modulo: "centralizadores" },
  { to: "/owner", label: "Painel do Proprietário", icon: ShieldCheck, modulo: null },
  { to: "/monitoramento", label: "Monitoramento", icon: Activity, modulo: null },
  { to: "/crm", label: "Funil CRM", icon: KanbanSquare, modulo: "crm" },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare, modulo: null },
  { to: "/clientes", label: "Clientes", icon: Users, modulo: null },
  { to: "/agencias", label: "Agências", icon: Building2, modulo: null },
  { to: "/produtos", label: "Produtos", icon: Package, modulo: null },
  { to: "/parceiros", label: "Parceiros de Mídia", icon: Handshake, modulo: null },
  { to: "/pi", label: "Pedidos de Inserção", icon: FileText, modulo: "pi" },
  { to: "/historico-veiculacao", label: "Histórico de Veiculação", icon: Radio, modulo: "pi" },
  { to: "/propostas", label: "Propostas", icon: FileText, modulo: "propostas" },
  { to: "/contratos", label: "Contratos", icon: FileSignature, modulo: null },
  { to: "/assinaturas", label: "Central de Assinaturas", icon: FileSignature, modulo: "assinaturas" },
  // { to: "/briefings", label: "Briefing de Proposta", icon: FileText, modulo: "briefings" },

  { to: "/financeiro", label: "Financeiro", icon: Wallet, modulo: "financeiro" },
  { to: "/comissoes", label: "Comissões", icon: Percent, modulo: "comissoes" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, modulo: "relatorios" },
  { to: "/materiais-apoio", label: "Material de Apoio", icon: FolderOpen, modulo: null },
  { to: "/landing-pages", label: "Landing Pages", icon: FileSignature, modulo: "landing_pages" },
  { to: "/influenciadores", label: "Influenciadores", icon: Sparkles, modulo: "influenciadores" },
  { to: "/social-media", label: "Redes Sociais & Tráfego", icon: Share2, modulo: null },
  { to: "/usuarios", label: "Usuários", icon: ShieldCheck, modulo: null },
  { to: "/relatorio-sincronizacao", label: "Sincronização CNPJ", icon: RefreshCw, modulo: null },
  { to: "/layouts", label: "Layouts (PI/Propostas)", icon: Settings, modulo: null },
  { to: "/configuracoes", label: "Configurações", icon: Settings, modulo: null },
  { to: "/lixeira", label: "Lixeira", icon: Trash2, modulo: null },

  { to: "/documentacao", label: "Manual do Sistema", icon: BookOpen, modulo: null },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShellInner>{children}</AppShellInner>
    </AuthGuard>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { can, loading: rolesLoading, isSuperAdmin, isAdmin } = useUserRoles();
  const actingAs = useActingAsExecutivo();
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const displayName =
    (user?.user_metadata?.nome as string) || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const { data: inicioData } = useQuery({
    queryKey: ["inicio"],
    queryFn: () => getInicio(),
    staleTime: 5 * 60_000,
  });
  const { hasModulo } = useTenantModulos();
  const visibleNav = nav.filter((item) => {
    if (item.to === "/lixeira") return isAdmin;
    const canAccess = can(item.to);
    const hasMod = item.modulo == null || hasModulo(item.modulo);
    return canAccess && hasMod;
  });
  const matchedNavItem = nav.find(
    (item) =>
      item.to === location.pathname || (item.to !== "/" && location.pathname.startsWith(item.to)),
  );

  const blocked =
    !rolesLoading &&
    ((!isSuperAdmin &&
      (location.pathname.startsWith("/owner") || location.pathname.startsWith("/monitoramento"))) ||
      !can(location.pathname) ||
      (matchedNavItem
        ? !can(matchedNavItem.to) ||
          (matchedNavItem.modulo != null && !hasModulo(matchedNavItem.modulo))
        : false));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const { logoSrc: tenantLogo, nome: tenantNome } = useTenantBranding();
  const brandLogo = tenantLogo ?? logoMidiaOS;
  const brandAlt = tenantNome ?? "mídia.OS";

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      <TarefasVencendoPopup />
      <CampanhasRenovacaoPopup />
      <SystemUpdatePopup />
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border/50 shadow-premium z-40">
        <div className="px-8 py-8 flex items-center gap-4 border-b border-sidebar-border/30 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="size-12 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-slate-100 shrink-0">
            <img src={brandLogo} alt={brandAlt} className="h-full w-auto object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-lg tracking-tight text-sidebar truncate flex items-center gap-1.5">
              {tenantNome || (
                <>
                  Mídia<span className="text-gold">.</span>OS
                </>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-sidebar/40 truncate">
              {isSuperAdmin
                ? "👑 Gestão Global"
                : tenantNome
                  ? "Espaço da Empresa"
                  : "Premium Suite"}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-border/50">
          {visibleNav.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 relative overflow-hidden",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                )}
              >
                <Icon
                  className={cn(
                    "size-4.5 transition-transform duration-300 group-hover:scale-110",
                    active
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="size-3 text-sidebar-primary/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Promo card: App Mobile Android & iOS */}
        <div className="mx-4 mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Smartphone className="size-4 text-emerald-600 animate-pulse" />
              <span>App Móvel Mídia.OS</span>
            </div>
            <div className="flex gap-1 text-[9px] font-bold">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono">
                Android
              </span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-300 font-mono">
                iOS
              </span>
            </div>
          </div>
          <p className="text-[11px] text-sidebar-foreground/80 leading-tight">
            Use no seu <strong>celular Android</strong> ou <strong>iPhone (iOS)</strong> com alertas em tempo real.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setInstallDialogOpen(true)}
            className="w-full h-8 text-[11px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
          >
            <Download className="size-3.5" /> Instalar no Celular
          </Button>
        </div>

        <div className="p-6 border-t border-sidebar-border/30 bg-sidebar/30 backdrop-blur-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full group hover:bg-sidebar-accent/50 rounded-2xl p-2 transition-all duration-300 border border-transparent hover:border-sidebar-border/30">
                <Avatar className="size-10 shadow-sm border-2 border-white ring-2 ring-gold/10">
                  <AvatarFallback className="bg-gradient-to-tr from-gold to-gold/80 text-white font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm min-w-0 flex-1">
                  <div className="font-bold truncate text-sidebar-foreground group-hover:text-sidebar-primary transition-colors">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-sidebar-foreground/40 truncate font-medium">
                    {user?.email}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-2 rounded-2xl shadow-premium border-sidebar-border/30 backdrop-blur-md"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Minha conta
              </DropdownMenuLabel>
              {isSuperAdmin && (
                <DropdownMenuItem
                  asChild
                  className="rounded-xl focus:bg-amber-500/10 focus:text-amber-600 transition-all cursor-pointer py-2.5"
                >
                  <Link to="/owner">
                    <ShieldCheck className="size-4 mr-3 text-amber-500" />
                    <span className="font-bold text-amber-600">Painel do Proprietário</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={() => setImpersonateOpen(true)}
                    className="rounded-xl focus:bg-primary/5 focus:text-primary transition-all cursor-pointer py-2.5"
                  >
                    <UserCheck className="size-4 mr-3 text-muted-foreground" />
                    <span className="font-semibold">Trocar de perfil</span>
                  </DropdownMenuItem>
                  {actingAs && (
                    <DropdownMenuItem
                      onClick={() => {
                        setActingAsExecutivo(null);
                        window.location.reload();
                      }}
                      className="rounded-xl focus:bg-amber-50 text-amber-700 focus:text-amber-800 transition-all cursor-pointer py-2.5"
                    >
                      <UserCheck className="size-4 mr-3" />
                      <span className="font-semibold">Sair do modo "atuar como"</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator className="my-1 bg-sidebar-border/30" />
              <DropdownMenuItem
                asChild
                className="rounded-xl focus:bg-primary/5 focus:text-primary transition-all cursor-pointer py-2.5"
              >
                <Link to="/minha-conta">
                  <UserCog className="size-4 mr-3 text-muted-foreground" />
                  <span className="font-semibold">Editar Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-sidebar-border/30" />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="rounded-xl focus:bg-destructive/5 text-destructive focus:text-destructive transition-all cursor-pointer py-2.5"
              >
                <LogOut className="size-4 mr-3" />
                <span className="font-semibold">Encerrar Sessão</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
        <header className="sticky top-0 z-30 h-16 lg:h-20 bg-background/60 backdrop-blur-xl border-b border-border/40 px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 hover:bg-muted/50 rounded-xl"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[85vw] max-w-xs sm:w-80 p-0 border-r border-sidebar-border/50 bg-sidebar text-sidebar-foreground flex flex-col"
              >
                <div className="px-8 py-8 flex items-center gap-4 border-b border-sidebar-border/30 bg-white/95 backdrop-blur-sm">
                  <div className="size-10 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-slate-100">
                    <img src={brandLogo} alt={brandAlt} className="h-full w-auto object-contain" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base tracking-tight text-sidebar flex items-center">
                      Mídia<span className="text-gold">.</span>OS
                    </div>
                  </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
                  {visibleNav.map((item) => {
                    const active =
                      location.pathname === item.to ||
                      (item.to !== "/" && location.pathname.startsWith(item.to));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-300",
                          active
                            ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4.5",
                            active ? "text-sidebar-primary" : "text-sidebar-foreground/40",
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-6 border-t border-sidebar-border/30 bg-sidebar/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="size-9 shadow-sm border border-white">
                      <AvatarFallback className="bg-gold text-white font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm min-w-0 flex-1">
                      <div className="font-bold truncate text-sidebar-foreground">
                        {displayName}
                      </div>
                      <div className="text-[10px] text-sidebar-foreground/40 truncate font-medium">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="rounded-xl h-9"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Link to="/minha-conta">Perfil</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl h-9 text-destructive"
                      onClick={() => signOut()}
                    >
                      Sair
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMobileNavOpen(false);
                      setInstallDialogOpen(true);
                    }}
                    className="w-full h-9 rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-700 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="size-4 text-amber-600 animate-bounce" />
                    Baixar App no Celular / Tablet
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <img src={brandLogo} alt={brandAlt} className="h-7 w-auto shrink-0" />
              <span className="font-display font-bold text-base sm:text-lg truncate">Mídia.OS</span>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <div className="h-5 w-1 bg-gold/30 rounded-full" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                {tenantNome ? `Empresa: ${tenantNome}` : "Comercial Engine"}
              </h2>
              {isSuperAdmin && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs px-2.5 py-0.5 font-bold flex items-center gap-1"
                >
                  👑 Super Admin Global
                </Badge>
              )}
            </div>
            {(() => {
              const now = new Date();
              const h = now.getHours();
              const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
              const dataFmt = now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
              return (
                <div className="hidden md:flex flex-col leading-tight ml-2 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {saud}, {displayName.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 capitalize truncate">
                    {dataFmt}
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
            <div className="hidden sm:block flex-1">
              <GlobalSearch />
            </div>
            <div className="h-6 w-px bg-border/40 mx-1 hidden sm:block" />

            {/* Botão Baixar App / Instalar */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInstallDialogOpen(true)}
              className="h-9 px-2.5 sm:px-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              title="Instalar App Mídia.OS no Android ou iOS (iPhone)"
            >
              <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">App Android & iOS</span>
              <span className="sm:hidden text-[11px] font-bold">App</span>
              <span className="hidden md:inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold uppercase tracking-wider">
                Instalar
              </span>
            </Button>

            <NotificacoesBell />
            <div className="h-6 w-px bg-border/40 mx-1 hidden sm:block" />
            <HoverCard openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Link
                  to="/minha-conta"
                  className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="size-8 shadow-sm border border-border/40">
                    <AvatarFallback className="bg-gold text-white font-bold text-[11px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-right min-w-0 max-w-[180px]">
                    <div className="text-xs font-bold truncate leading-tight">{displayName}</div>
                    <div className="text-[10px] text-muted-foreground truncate leading-tight">
                      {user?.email}
                    </div>
                  </div>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent align="end" className="w-72">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> Mensagem do dia
                  </div>
                  <p className="text-sm italic text-muted-foreground leading-relaxed">
                    {inicioData?.frase ?? "Carregando…"}
                  </p>
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <div>
                      <div className="text-xs font-semibold truncate">{displayName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstallDialogOpen(true)}
                      className="w-full text-left text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                    >
                      <Smartphone className="size-3.5" /> Baixar App no Android / iOS
                    </button>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </header>
        <div className="sm:hidden px-3 py-2 border-b border-border/40 bg-background/60 backdrop-blur-xl">
          <GlobalSearch />
        </div>
        <TenantAlertBanner />

        {isAdmin && actingAs && (
          <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 flex items-center justify-center gap-3">
            <UserCheck className="size-3.5" />
            <span className="font-semibold">Você está atuando como outro usuário.</span>
            <button
              className="underline font-semibold hover:no-underline"
              onClick={() => {
                setActingAsExecutivo(null);
                window.location.reload();
              }}
            >
              Voltar ao meu perfil
            </button>
          </div>
        )}
        <ImpersonateDialog open={impersonateOpen} onOpenChange={setImpersonateOpen} />

        <main className="flex-1 px-3 sm:px-6 lg:px-12 py-5 sm:py-8 lg:py-12 pb-24 lg:pb-12 max-w-[1600px] w-full mx-auto animate-fade-up min-w-0 space-y-6">
          <PushNotificationBanner />
          {blocked ? (
            <AcessoNegadoScreen
              recurso={matchedNavItem?.label || location.pathname}
              motivo={
                matchedNavItem && matchedNavItem.modulo != null && !hasModulo(matchedNavItem.modulo)
                  ? `O módulo "${matchedNavItem.label}" não está habilitado no plano atual da sua empresa. Entre em contato com a administração para ativação.`
                  : "Seu usuário não possui permissão concedida para acessar esta funcionalidade. Solicite acesso ao administrador da conta."
              }
            />
          ) : (
            children
          )}
        </main>

        {/* Barra de Navegação Inferior para Celular */}
        <MobileBottomNav
          onOpenMobileMenu={() => setMobileNavOpen(true)}
          onOpenInstallDialog={() => setInstallDialogOpen(true)}
        />

        {/* Modal de Instalação e Download do App */}
        <InstallAppDialog open={installDialogOpen} onOpenChange={setInstallDialogOpen} />
      </div>
    </div>
  );
}
