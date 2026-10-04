import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, FileText, Package, Users, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenInstallDialog: () => void;
}

export function MobileBottomNav({ onOpenMobileMenu, onOpenInstallDialog }: MobileBottomNavProps) {
  const location = useLocation();

  const items = [
    { to: "/", label: "Início", icon: Home },
    { to: "/propostas", label: "Propostas", icon: FileText },
    { to: "/produtos", label: "Produtos", icon: Package },
    { to: "/clientes", label: "Clientes", icon: Users },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-2xl border-t border-border/60 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
      <nav className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all relative select-none touch-manipulation",
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute top-0 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
              )}
              <Icon className={cn("size-5 mb-0.5 transition-transform", active ? "scale-110 text-primary" : "opacity-80")} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Botão de Menu Completo Sempre Visível */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-primary hover:text-primary/80 transition-all select-none touch-manipulation group"
          aria-label="Abrir Menu Completo de Módulos"
        >
          <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-active:scale-95 transition-transform mb-0.5">
            <Menu className="size-4.5 text-primary" />
          </div>
          <span className="text-[10px] font-bold text-foreground tracking-tight">Menu</span>
        </button>
      </nav>
    </div>
  );
}
