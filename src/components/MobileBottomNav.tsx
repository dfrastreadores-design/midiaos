import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, FileText, CheckSquare, Users, Menu, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenInstallDialog: () => void;
}

export function MobileBottomNav({ onOpenMobileMenu, onOpenInstallDialog }: MobileBottomNavProps) {
  const location = useLocation();
  const { isStandalone } = usePwaInstall();

  const items = [
    { to: "/", label: "Início", icon: Home },
    { to: "/pi", label: "PIs", icon: CheckSquare },
    { to: "/propostas", label: "Propostas", icon: FileText },
    { to: "/clientes", label: "Clientes", icon: Users },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50 pb-safe shadow-lg">
      <nav className="flex items-center justify-around h-15 px-2">
        {items.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-colors relative",
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
              )}
              <Icon className={cn("size-5 mb-0.5 transition-transform", active && "scale-110")} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {!isStandalone ? (
          <button
            onClick={onOpenInstallDialog}
            className="flex flex-col items-center justify-center flex-1 py-1 text-amber-500 hover:text-amber-600 transition-colors"
          >
            <Download className="size-5 mb-0.5 animate-bounce" />
            <span className="text-[10px] font-bold tracking-tight">Baixar App</span>
          </button>
        ) : null}

        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mais</span>
        </button>
      </nav>
    </div>
  );
}
