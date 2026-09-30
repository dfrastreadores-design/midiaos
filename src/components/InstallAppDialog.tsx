import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Zap,
  BellRing,
  ExternalLink,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallAppDialog({ open, onOpenChange }: InstallAppDialogProps) {
  const { platform, canPromptNative, promptInstall, isStandalone } = usePwaInstall();
  const [activeTab, setActiveTab] = useState<string>(
    platform === "ios" ? "ios" : platform === "android" ? "android" : "desktop",
  );
  const [installing, setInstalling] = useState(false);

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const installed = await promptInstall();
      if (installed) {
        toast.success("Mídia.OS instalado com sucesso no seu dispositivo!");
        onOpenChange(false);
      }
    } catch {
      toast.error("Não foi possível iniciar a instalação automática.");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur-2xl">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 text-white border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-inner">
              <Download className="size-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display text-white">
                Baixar Mídia.OS no Dispositivo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Acesse como aplicativo nativo no celular, tablet ou computador
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px]">
            <Badge
              variant="outline"
              className="bg-white/5 border-white/20 text-slate-200 gap-1 py-0.5"
            >
              <Zap className="size-3 text-amber-400" /> Ultra Rápido (&lt; 3MB)
            </Badge>
            <Badge
              variant="outline"
              className="bg-white/5 border-white/20 text-slate-200 gap-1 py-0.5"
            >
              <Sparkles className="size-3 text-emerald-400" /> Tela Cheia sem Abas
            </Badge>
            <Badge
              variant="outline"
              className="bg-white/5 border-white/20 text-slate-200 gap-1 py-0.5"
            >
              <BellRing className="size-3 text-sky-400" /> Alertas de Renovação
            </Badge>
          </div>
        </div>

        {/* Conteúdo com seleção de plataforma */}
        <div className="p-6">
          {isStandalone ? (
            <div className="py-6 text-center space-y-3">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="font-bold text-base text-foreground">Aplicativo já instalado!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Você já está utilizando o Mídia.OS em modo aplicativo independente. Todos os
                recursos e notificações estão ativos.
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-5">
                <TabsTrigger value="android" className="flex items-center gap-1.5 text-xs">
                  <Smartphone className="size-3.5" /> Android
                </TabsTrigger>
                <TabsTrigger value="ios" className="flex items-center gap-1.5 text-xs">
                  <Smartphone className="size-3.5" /> iPhone / iPad
                </TabsTrigger>
                <TabsTrigger value="desktop" className="flex items-center gap-1.5 text-xs">
                  <Monitor className="size-3.5" /> Computador
                </TabsTrigger>
              </TabsList>

              {/* Tab Android */}
              <TabsContent value="android" className="space-y-4">
                {canPromptNative ? (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles className="size-4" /> Instalação com 1 Clique
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Seu navegador suporta instalação direta. O ícone do Mídia.OS será adicionado à
                      tela inicial do seu celular.
                    </p>
                    <Button
                      onClick={handleNativeInstall}
                      disabled={installing}
                      className="w-full h-11 bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      <Download className="size-4 mr-2" />
                      {installing ? "Instalando..." : "Instalar Aplicativo Agora"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Para instalar no seu celular ou tablet Android pelo Google Chrome ou Samsung
                      Internet:
                    </p>
                    <ol className="space-y-2.5 text-xs text-foreground/90">
                      <li className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                          1
                        </span>
                        <span>
                          Toque no <strong>menu de três pontinhos (⋮)</strong> no canto superior
                          direito do navegador.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                          2
                        </span>
                        <span>
                          Selecione a opção <strong>"Instalar aplicativo"</strong> ou{" "}
                          <strong>"Adicionar à tela inicial"</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                          3
                        </span>
                        <span>
                          Confirme tocando em <strong>"Instalar"</strong>. Pronto! O app estará na
                          sua gaveta de aplicativos.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}
              </TabsContent>

              {/* Tab iOS (iPhone / iPad) */}
              <TabsContent value="ios" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  No Safari do seu iPhone ou iPad, siga os 3 passos simples abaixo:
                </p>
                <div className="space-y-2.5 text-xs text-foreground/90">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                      <Share2 className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Passo 1: Compartilhar</div>
                      <div className="text-[11px] text-muted-foreground">
                        Toque no botão de compartilhar na barra inferior do Safari.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                      <PlusSquare className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        Passo 2: Adicionar à Tela de Início
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Role a lista de opções para baixo e selecione "Adicionar à Tela de Início".
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Passo 3: Confirmar</div>
                      <div className="text-[11px] text-muted-foreground">
                        Toque em "Adicionar" no canto superior direito. O app abrirá como aplicativo
                        independente.
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab Desktop / Tablet */}
              <TabsContent value="desktop" className="space-y-3">
                {canPromptNative ? (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Monitor className="size-4" /> Instalar no Computador
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Instale o Mídia.OS como aplicativo da Área de Trabalho no Windows ou Mac. Abre
                      em janela própria, super leve e veloz.
                    </p>
                    <Button
                      onClick={handleNativeInstall}
                      disabled={installing}
                      className="w-full h-11 bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      <Download className="size-4 mr-2" />
                      {installing ? "Instalando..." : "Instalar no Computador"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs text-foreground/90">
                    <p className="text-muted-foreground">
                      No Google Chrome, Microsoft Edge ou Brave no computador:
                    </p>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <Download className="size-4 text-primary" /> Ícone na Barra de Endereço
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Olhe no final da barra de endereços (ao lado da estrela de favoritos).
                        Clique no ícone de <strong>Instalar Aplicativo</strong> ou vá em{" "}
                        <strong>Menu (⋮) &gt; Salvar e Compartilhar &gt; Instalar Mídia.OS</strong>.
                      </p>
                    </div>

                    {/* QR Code para abrir no Celular */}
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "https://midiaos.online")}`}
                        alt="QR Code Mídia.OS"
                        className="size-20 rounded-lg bg-white p-1 shrink-0 border border-border/40 shadow-sm"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <Smartphone className="size-3.5 text-primary" /> Abrir no Celular agora
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Aponte a câmera do seu iPhone ou Android para o QR Code ao lado para abrir
                          e instalar o app instantaneamente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t border-border/40 flex justify-between sm:justify-between items-center">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Tablet className="size-3.5 text-muted-foreground" />
            Compatível com Celular, Tablet e Desktop
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
