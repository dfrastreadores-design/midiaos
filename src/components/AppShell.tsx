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
  ChevronDown,
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
  MapPin,
  Brain,
  Bot,
  Palette,
  Layers,
  Network,
  Briefcase,
} from "lucide-react";
import { useState, useMemo } from "react";
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
import { MasterCompanySelector } from "@/components/MasterCompanySelector";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { useTenantModulos } from "@/hooks/use-tenant-modulos";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { SessionExpiredDialog } from "@/components/SessionExpiredDialog";
import { Badge } from "@/components/ui/badge";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export type NavCategoria =
  | "Dashboard"
  | "Comercial"
  | "Planejamento"
  | "Inventário"
  | "Operação"
  | "Financeiro"
  | "Administração"
  | "Ferramentas de IA";

export const CATEGORIA_LABELS: Record<NavCategoria, string> = {
  Dashboard: "🏠 Dashboard",
  Comercial: "💼 Comercial",
  Planejamento: "🎯 Planejamento",
  Inventário: "📍 Inventário",
  Operação: "⚙️ Operação",
  Financeiro: "💰 Financeiro",
  Administração: "🛠️ Administração",
  "Ferramentas de IA": "✨ Ferramentas de IA",
};

const nav = [
  // 🏠 Dashboard
  { to: "/", label: "Dashboard", icon: LayoutDashboard, modulo: null, categoria: "Dashboard" as const },
  { to: "/owner", label: "Painel do Proprietário", icon: ShieldCheck, modulo: null, categoria: "Dashboard" as const },
  { to: "/monitoramento", label: "Monitoramento", icon: Activity, modulo: null, categoria: "Dashboard" as const },

  // 💼 Comercial
  { to: "/clientes", label: "Clientes", icon: Users, modulo: null, categoria: "Comercial" as const },
  { to: "/agencias", label: "Agências", icon: Building2, modulo: null, categoria: "Comercial" as const },
  { to: "/propostas", label: "Propostas Comerciais", icon: FileText, modulo: "propostas", categoria: "Comercial" as const },
  { to: "/crm", label: "CRM", icon: KanbanSquare, modulo: "crm", categoria: "Comercial" as const },

  // 🎯 Planejamento
  { to: "/planejamento", label: "Campanhas", icon: Compass, modulo: null, categoria: "Planejamento" as const },
  { to: "/nova-campanha", label: "Criar Campanha", icon: Sparkles, modulo: null, categoria: "Planejamento" as const },
  { to: "/centralizadores", label: "Estratégias & Metas", icon: Target, modulo: "centralizadores", categoria: "Planejamento" as const },

  // 📍 Inventário
  { to: "/produtos", label: "Produtos & Pontos", icon: Package, modulo: null, categoria: "Inventário" as const },
  { to: "/rede-inventario", label: "Circuitos & Rede", icon: Network, modulo: null, categoria: "Inventário" as const },
  { to: "/parceiros", label: "Parceiros & Veículos", icon: Handshake, modulo: null, categoria: "Inventário" as const },

  // ⚙️ Operação
  { to: "/pi", label: "Pedidos de Inserção (PI)", icon: FileText, modulo: "pi", categoria: "Operação" as const },
  { to: "/pi?tab=checking", label: "Checking & Comprovação", icon: CheckSquare, modulo: "pi", categoria: "Operação" as const },
  { to: "/contratos", label: "Contratos", icon: FileSignature, modulo: null, categoria: "Operação" as const },
  { to: "/historico-veiculacao", label: "Veiculação", icon: Radio, modulo: "pi", categoria: "Operação" as const },
  { to: "/assinaturas", label: "Central de Assinaturas", icon: FileSignature, modulo: "assinaturas", categoria: "Operação" as const },

  // 💰 Financeiro
  { to: "/financeiro", label: "Faturamento", icon: Wallet, modulo: "financeiro", categoria: "Financeiro" as const },
  { to: "/comissoes", label: "Comissões", icon: Percent, modulo: "comissoes", categoria: "Financeiro" as const },
  { to: "/financeiro?tab=dre", label: "DRE Gerencial", icon: BarChart3, modulo: "financeiro", categoria: "Financeiro" as const },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, modulo: "relatorios", categoria: "Financeiro" as const },

  // 🛠️ Administração
  { to: "/usuarios", label: "Usuários", icon: ShieldCheck, modulo: null, categoria: "Administração" as const },
  { to: "/usuarios?tab=permissoes", label: "Permissões", icon: ShieldCheck, modulo: null, categoria: "Administração" as const },
  { to: "/configuracoes?tab=branding", label: "White Label", icon: Palette, modulo: null, categoria: "Administração" as const },
  { to: "/configuracoes", label: "Configurações", icon: Settings, modulo: null, categoria: "Administração" as const },
  { to: "/lixeira", label: "Lixeira", icon: Trash2, modulo: null, categoria: "Administração" as const },
  { to: "/documentacao", label: "Apresentação & Manual", icon: BookOpen, modulo: null, categoria: "Administração" as const },

  // ✨ Ferramentas de IA
  { to: "/copiloto-comercial", label: "Mídia.OS Intelligence", icon: Brain, modulo: null, categoria: "Ferramentas de IA" as const },
  { to: "/ooh-intelligence", label: "OOH Intelligence", icon: Compass, modulo: null, categoria: "Ferramentas de IA" as const },
  { to: "/sales-copilot", label: "Sales Copilot", icon: Briefcase, modulo: null, categoria: "Ferramentas de IA" as const },
  { to: "/centralizadores?tab=ia", label: "Planejamento com IA", icon: Sparkles, modulo: "centralizadores", categoria: "Ferramentas de IA" as const },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <AppShellInner>{children}</AppShellInner>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { can, loading: rolesLoading, isSuperAdmin, isAdmin } = useUserRoles();
  const actingAs = useActingAsExecutivo();
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const { logoSrc: tenantLogo, nome: tenantNome } = useTenantBranding();
  const { isNexo, nome: orgNome, siteUrl: orgSiteUrl } = useCurrentOrg();
  const { hasModulo } = useTenantModulos();

  const displayName =
    (user?.user_metadata?.nome as string) || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const visibleNav = useMemo(() => {
    return nav
      .filter((item) => {
        const basePath = item.to.split("?")[0];
        if (basePath === "/owner" || basePath === "/monitoramento") return isSuperAdmin;
        if (basePath === "/lixeira") return isAdmin;
        const canAccess = can(basePath);
        const hasMod = item.modulo == null || hasModulo(item.modulo);
        return canAccess && hasMod;
      })
      .map((item) => {
        if (isNexo) {
          if (item.to === "/produtos") {
            return { ...item, label: "Soluções Próprias & Parceiros" };
          }
          if (item.to === "/centralizadores") {
            return { ...item, label: "Planejamento 360° & Radar DF" };
          }
        }
        return item;
      });
  }, [can, hasModulo, isAdmin, isSuperAdmin, isNexo]);

  const navSections = useMemo(() => {
    const list: { title: NavCategoria; items: typeof visibleNav }[] = [];
    for (const item of visibleNav) {
      let group = list.find((g) => g.title === item.categoria);
      if (!group) {
        group = { title: item.categoria, items: [] };
        list.push(group);
      }
      group.items.push(item);
    }
    return list;
  }, [visibleNav]);

  const isItemActive = (to: string) => {
    // Normalização defensiva: TanStack Router pode expor search como objeto (Record<string, unknown>)
    // ou searchStr como string. Tratamos todos os formatos com segurança.
    const rawSearch = (location as any)?.searchStr ?? location?.search;
    let searchString = "";
    if (typeof rawSearch === "string") {
      searchString = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
    } else if (rawSearch && typeof rawSearch === "object") {
      try {
        searchString = new URLSearchParams(rawSearch as Record<string, string>).toString();
      } catch {
        searchString = "";
      }
    } else if (typeof window !== "undefined" && window.location?.search) {
      searchString = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    }

    if (to === "/") {
      return location.pathname === "/" && !searchString;
    }
    if (to.includes("?")) {
      const [path, search] = to.split("?");
      if (location.pathname !== path) return false;
      const params = new URLSearchParams(search);
      const currentParams = new URLSearchParams(searchString);
      for (const [key, val] of params.entries()) {
        if (currentParams.get(key) !== val) return false;
      }
      return true;
    }
    if (location.pathname === to) {
      const hasSpecificQueryMatch = nav.some(
        (other) =>
          other.to.includes("?") &&
          other.to.startsWith(to + "?") &&
          searchString.includes(other.to.split("?")[1]),
      );
      if (hasSpecificQueryMatch) return false;
      return true;
    }
    return location.pathname.startsWith(to + "/");
  };

  const matchedNavItem = nav.find((item) => {
    const basePath = item.to.split("?")[0];
    return (
      basePath === location.pathname ||
      (basePath !== "/" && location.pathname.startsWith(basePath))
    );
  });

  const blocked =
    !rolesLoading &&
    ((!isSuperAdmin &&
      (location.pathname.startsWith("/owner") || location.pathname.startsWith("/monitoramento"))) ||
      !can(location.pathname) ||
      (matchedNavItem
        ? !can(matchedNavItem.to.split("?")[0]) ||
          (matchedNavItem.modulo != null && !hasModulo(matchedNavItem.modulo))
        : false));

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
            {isNexo ? (
              <a
                href={orgSiteUrl || "https://nexomidiaerepresentacao.com.br"}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
                title="Acessar site da Nexo Mídia e Representação"
              >
                <div className="font-display font-bold text-sm tracking-tight text-sidebar group-hover:text-primary transition-colors leading-tight">
                  NEXO Mídia e Representação
                </div>
                <div className="text-[10px] tracking-wide font-semibold text-sky-600 truncate mt-0.5">
                  Hub de Negócios & Soluções Estratégicas em Mídia
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                    Mídia.OS • Plataforma Oficial de Inteligência Comercial
                  </span>
                </div>
              </a>
            ) : (
              <>
                <div className="font-display font-bold text-lg tracking-tight text-sidebar truncate flex items-center gap-1.5">
                  {tenantNome || (
                    <>
                      Mídia<span className="text-gold">.</span>OS
                      <Badge className="text-[9px] bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white border-none py-0 px-1 ml-1 font-bold">
                        4.0
                      </Badge>
                    </>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-sidebar/50 truncate flex items-center gap-1">
                  <Sparkles className="size-2.5 text-purple-600 animate-pulse" />
                  <span>AI Media Operating System</span>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-border/50">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-sidebar-foreground/45 select-none">
                {CATEGORIA_LABELS[section.title] ?? section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isItemActive(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 relative overflow-hidden",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary shadow-xs font-bold"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="size-3 text-sidebar-primary/60 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
        <header className="sticky top-0 z-30 pt-[max(var(--sat),0px)] bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16 transition-all">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden shrink-0 h-10 px-2.5 rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  aria-label="Abrir Menu do Sistema"
                >
                  <Menu className="size-5" />
                  <span className="text-xs font-bold tracking-tight">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[85vw] max-w-xs sm:w-80 p-0 border-r border-sidebar-border/50 bg-sidebar text-sidebar-foreground flex flex-col h-[100dvh] pt-[max(var(--sat),0px)] pb-[max(var(--sab),0.5rem)]"
              >
                <div className="px-6 py-6 flex items-center gap-3.5 border-b border-sidebar-border/30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                  <div className="size-10 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-slate-100">
                    <img src={brandLogo} alt={brandAlt} className="h-full w-auto object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-sm tracking-tight text-sidebar">
                      {isNexo ? (
                        <>
                          <div className="leading-tight truncate">NEXO Mídia e Representação</div>
                          <div className="text-[10px] font-semibold text-sky-600 tracking-wide mt-0.5 truncate">
                            Hub de Negócios & Soluções 360°
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                              Mídia.OS Oficial
                            </span>
                          </div>
                        </>
                      ) : (
                        <>Mídia<span className="text-gold">.</span>OS</>
                      )}
                    </div>
                  </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin overscroll-contain">
                  {navSections.map((section) => (
                    <div key={section.title} className="space-y-1">
                      <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-sidebar-foreground/45 select-none">
                        {CATEGORIA_LABELS[section.title] ?? section.title}
                      </div>
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const active = isItemActive(item.to);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setMobileNavOpen(false)}
                              className={cn(
                                "group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[38px]",
                                active
                                  ? "bg-sidebar-accent text-sidebar-primary shadow-xs font-bold"
                                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-4 shrink-0",
                                  active ? "text-sidebar-primary" : "text-sidebar-foreground/50",
                                )}
                              />
                              <span className="flex-1 truncate">{item.label}</span>
                              {active && <span className="size-1.5 rounded-full bg-primary" />}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
              <img src={brandLogo} alt={brandAlt} className="h-6 w-auto shrink-0 object-contain" />
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-xs truncate">
                  {isNexo ? "NEXO Mídia" : "Mídia.OS"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {matchedNavItem?.label || "Painel"}
                </span>
              </div>
            </div>

            {/* Desktop Clean Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground">
                {matchedNavItem?.categoria || "Sistema"}
              </span>
              <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
              <h1 className="text-sm font-bold text-foreground tracking-tight truncate">
                {matchedNavItem?.label || (isNexo ? "NEXO Mídia e Representação" : "Painel")}
              </h1>
              {isSuperAdmin && (
                <div className="ml-2 pl-2 border-l border-border/60">
                  <MasterCompanySelector />
                </div>
              )}
            </div>
          </div>

          {/* Busca Global Centralizada */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-auto">
            <GlobalSearch />
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Link Manual / Documentação */}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg gap-1.5 hidden xl:inline-flex"
            >
              <Link to="/documentacao" title="Manual e Apresentação do Sistema">
                <BookOpen className="size-3.5 text-sky-600 dark:text-sky-400" />
                <span>Manual</span>
              </Link>
            </Button>

            {/* Botão App Mobile */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setInstallDialogOpen(true)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg gap-1.5 hidden xl:inline-flex"
              title="Instalar App no Celular ou Tablet"
            >
              <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>App Mobile</span>
            </Button>

            {/* Notificações */}
            <NotificacoesBell />

            <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />

            {/* Perfil do Usuário com Dropdown profissional */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-muted/60 transition-colors outline-hidden cursor-pointer"
                >
                  <Avatar className="size-8 border border-border/60 shadow-2xs">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col min-w-0 max-w-[120px] text-left leading-none">
                    <span className="text-xs font-semibold text-foreground truncate">{displayName.split(" ")[0]}</span>
                    <span className="text-[10px] text-muted-foreground truncate mt-0.5">{tenantNome || "Nexo Mídia"}</span>
                  </div>
                  <ChevronDown className="size-3 text-muted-foreground/60 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg border border-border/80">
                <div className="px-2.5 py-2">
                  <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link to="/minha-conta" className="flex items-center gap-2">
                    <UserCog className="size-4 text-muted-foreground" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setInstallDialogOpen(true)}
                  className="rounded-lg cursor-pointer flex items-center gap-2"
                >
                  <Smartphone className="size-4 text-emerald-600" />
                  <span>Instalar App Mobile</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link to="/documentacao" className="flex items-center gap-2">
                    <BookOpen className="size-4 text-sky-600" />
                    <span>Manual & Documentação</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setImpersonateOpen(true)}
                      className="rounded-lg cursor-pointer flex items-center gap-2"
                    >
                      <UserCheck className="size-4 text-muted-foreground" />
                      <span>Trocar de Perfil</span>
                    </DropdownMenuItem>
                    {actingAs && (
                      <DropdownMenuItem
                        onClick={() => {
                          setActingAsExecutivo(null);
                          window.location.reload();
                        }}
                        className="rounded-lg cursor-pointer flex items-center gap-2 text-amber-700"
                      >
                        <UserCheck className="size-4" />
                        <span>Sair do modo "atuar como"</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-lg cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  <span>Sair do Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <SessionExpiredDialog />

        <main className="flex-1 px-3 sm:px-6 lg:px-12 py-4 sm:py-8 lg:py-12 pb-[calc(6.5rem+var(--sab))] lg:pb-12 max-w-[1600px] w-full mx-auto animate-fade-up min-w-0 space-y-6">
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

        {/* Rodapé Institucional */}
        <footer className="border-t border-border/40 py-5 px-4 sm:px-8 text-xs text-muted-foreground bg-background/60 backdrop-blur-sm mt-auto pb-20 lg:pb-5">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span>Operado por</span>
              <a
                href={orgSiteUrl || "https://nexomidiaerepresentacao.com.br"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline flex items-center gap-1"
                title="Acessar portal da Nexo Mídia e Representação"
              >
                NEXO Mídia e Representação — nexomidiaerepresentacao.com.br
              </a>
              <span className="hidden sm:inline text-muted-foreground/50">•</span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Hub de Negócios & Soluções Estratégicas em Mídia
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mídia.OS • Plataforma Oficial de Inteligência Comercial
              </span>
            </div>
          </div>
        </footer>

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
