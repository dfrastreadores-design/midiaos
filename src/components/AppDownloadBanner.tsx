import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Download, Sparkles, X, CheckCircle2 } from "lucide-react";
import { InstallAppDialog } from "./InstallAppDialog";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface AppDownloadBannerProps {
  className?: string;
  variant?: "full" | "compact";
}

export function AppDownloadBanner({ className = "", variant = "full" }: AppDownloadBannerProps) {
  const { isStandalone, platform } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabInicial, setTabInicial] = useState<"android" | "ios" | "desktop">("android");
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    try {
      const salp = localStorage.getItem("midiaos_app_banner_dismissed");
      if (salp === "1") setDispensado(true);
    } catch {}
  }, []);

  // Se já estiver rodando instalado como app nativo standalone, não exibe o banner
  if (isStandalone || dispensado) {
    return null;
  }

  const abrirDialog = (tab: "android" | "ios" | "desktop") => {
    setTabInicial(tab);
    setDialogOpen(true);
  };

  const dispensar = () => {
    setDispensado(true);
    try {
      localStorage.setItem("midiaos_app_banner_dismissed", "1");
    } catch {}
  };

  if (variant === "compact") {
    return (
      <>
        <div
          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-sky-500/15 border border-emerald-500/30 text-xs shadow-sm ${className}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-7 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Smartphone className="size-4 animate-pulse" />
            </span>
            <div className="truncate">
              <strong className="text-foreground">App Mídia.OS Mobile:</strong> Disponível para{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Android</span> e{" "}
              <span className="font-semibold text-sky-700 dark:text-sky-300">iPhone (iOS)</span>.
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => abrirDialog(platform === "ios" ? "ios" : "android")}
              className="h-7 text-[11px] font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 gap-1"
            >
              <Download className="size-3" /> Instalar App
            </Button>
            <button
              onClick={dispensar}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Dispensar aviso"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <InstallAppDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialTab={tabInicial}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border border-indigo-500/30 shadow-xl ${className}`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={dispensar}
          className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Fechar banner"
        >
          <X className="size-4" />
        </button>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-bold gap-1 py-0.5">
                <Smartphone className="size-3.5 text-emerald-400" /> App Oficial Mobile
              </Badge>
              <Badge className="bg-white/10 text-white/90 border-white/20 text-[10px] font-medium">
                Android & iOS (iPhone / iPad)
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-medium">
                <Sparkles className="size-3 mr-1" /> Acesso Instantâneo
              </Badge>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white">
              Leve o Mídia.OS no seu celular Android ou iPhone
            </h3>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Consulte propostas comerciais, aprove pedidos de inserção (PIs) na rua ou com clientes e receba notificações de vencimento direto no seu smartphone, sem precisar abrir o navegador.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => abrirDialog("android")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg gap-2"
            >
              <Smartphone className="size-4" />
              <span>Instalar no <strong>Android</strong></span>
            </Button>

            <Button
              type="button"
              onClick={() => abrirDialog("ios")}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg gap-2"
            >
              <Smartphone className="size-4" />
              <span>Instalar no <strong>iPhone (iOS)</strong></span>
            </Button>
          </div>
        </div>
      </div>

      <InstallAppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialTab={tabInicial}
      />
    </>
  );
}
