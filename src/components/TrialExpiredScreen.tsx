import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  MessageCircle,
  Sparkles,
  LogOut,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Zap,
  Quote,
  Flame,
  Lock,
} from "lucide-react";
import { signOut } from "@/hooks/use-auth";
import { UpgradePlanoDialog } from "@/components/UpgradePlanoDialog";

type Plano = {
  nome: string;
  preco: string;
  destaque?: boolean;
  bullets: string[];
};

const PLANOS: Plano[] = [
  {
    nome: "Starter",
    preco: "R$ 250",
    bullets: [
      "Até 3 usuários",
      "Propostas + PI digital",
      "Assinatura eletrônica",
      "Suporte por e-mail",
    ],
  },
  {
    nome: "Profissional",
    preco: "R$ 1.499",
    destaque: true,
    bullets: [
      "Usuários ilimitados",
      "Briefings, Permuta e Projetos",
      "Aprovação da Diretoria via WhatsApp",
      "Relatórios fiscais e comerciais",
      "Suporte prioritário",
    ],
  },
  {
    nome: "Enterprise",
    preco: "Sob consulta",
    bullets: [
      "Multi-emissora e white-label",
      "Integrações personalizadas",
      "Onboarding dedicado",
      "SLA e ambiente exclusivo",
    ],
  },
];

const WHATS = "5561999999999";

function abrirWhatsapp(plano?: string) {
  const msg = encodeURIComponent(
    `Olá! Meu período de teste do mídia.OS expirou e quero contratar${plano ? ` o plano ${plano}` : ""}.`,
  );
  window.open(`https://wa.me/${WHATS}?text=${msg}`, "_blank", "noopener");
}

const DEPOIMENTOS = [
  {
    nome: "Carla M.",
    cargo: "Diretora Comercial — TV regional",
    texto:
      "Reduzimos em 3x o tempo de emissão de PIs. A diretoria aprova pelo WhatsApp e nunca mais perdi um fechamento por burocracia.",
  },
  {
    nome: "Rogério S.",
    cargo: "Head de Vendas — Rádio",
    texto:
      "As propostas ficaram muito mais profissionais. Fechamos 22% a mais no primeiro trimestre usando o mídia.OS.",
  },
  {
    nome: "Juliana P.",
    cargo: "Sócia — Agência de mídia",
    texto:
      "Controle total de permuta, comissões e briefings num único lugar. Não volto mais para planilha nenhuma.",
  },
];

export function TrialExpiredScreen({
  email,
  onUpgraded,
}: {
  email?: string | null;
  onUpgraded?: () => void;
}) {
  const [planoOpen, setPlanoOpen] = useState<string | null>(null);
  // Contagem regressiva para desconto de 24h após expirar
  const [restante, setRestante] = useState<string>("");
  useEffect(() => {
    const alvo = Date.now() + 24 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, alvo - Date.now());
      const h = String(Math.floor(diff / 3_600_000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0");
      setRestante(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <UpgradePlanoDialog
        open={!!planoOpen}
        onOpenChange={(v) => !v && setPlanoOpen(null)}
        plano={planoOpen ?? ""}
        onUpgraded={() => onUpgraded?.()}
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Cabeçalho + urgência */}
        <div className="text-center space-y-3 mb-6">
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3.5" /> Acesso bloqueado — seu teste de 48h terminou
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Não perca os dados que você já configurou
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Seus clientes, propostas, PIs e briefings ficam guardados por até{" "}
            <strong>7 dias</strong>. Ative um plano agora e continue exatamente de onde parou.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-medium bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-full px-4 py-2 mt-2">
            <Flame className="size-4" />
            <span>
              Bônus por contratar hoje: <strong>15% OFF nos 3 primeiros meses</strong> · expira em
            </span>
            <span className="font-mono tabular-nums">{restante}</span>
          </div>
        </div>

        {/* Métricas de impacto */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8 max-w-4xl mx-auto">
          {[
            { icon: TrendingUp, t: "+40%", l: "de produtividade comercial" },
            { icon: Zap, t: "-70%", l: "de tempo emitindo PIs" },
            { icon: ShieldCheck, t: "100%", l: "digital com validade jurídica" },
            { icon: Sparkles, t: "R$ 12mil", l: "economizados/ano em média*" },
          ].map((s) => (
            <Card key={s.t} className="text-center">
              <CardContent className="pt-6">
                <s.icon className="size-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-primary">{s.t}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Planos */}
        <div className="grid gap-4 md:grid-cols-3">
          {PLANOS.map((p) => (
            <Card key={p.nome} className={p.destaque ? "border-primary shadow-lg relative" : ""}>
              {p.destaque && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="size-3" /> Mais escolhido
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between">
                  <span>{p.nome}</span>
                  <span className="text-base font-semibold text-primary">{p.preco}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={p.destaque ? "default" : "outline"}
                  onClick={() =>
                    p.nome === "Enterprise" ? abrirWhatsapp(p.nome) : setPlanoOpen(p.nome)
                  }
                >
                  {p.nome === "Enterprise" ? "Falar com vendas" : `Ativar ${p.nome}`}{" "}
                  <ArrowRight className="size-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Garantia */}
        <div className="mt-8 max-w-3xl mx-auto rounded-xl border bg-card p-5 flex items-start gap-4">
          <ShieldCheck className="size-8 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold">Garantia incondicional de 7 dias</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Se em 7 dias você achar que o mídia.OS não vale cada centavo, devolvemos 100% do valor
              pago — sem perguntas, sem burocracia.
            </p>
          </div>
        </div>

        {/* Depoimentos */}
        <div className="mt-10">
          <h2 className="text-center text-lg font-semibold mb-4">Quem já usa recomenda</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DEPOIMENTOS.map((d) => (
              <Card key={d.nome}>
                <CardContent className="pt-6 space-y-3">
                  <Quote className="size-5 text-primary/60" />
                  <p className="text-sm italic leading-relaxed">"{d.texto}"</p>
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    <div className="font-semibold text-foreground">{d.nome}</div>
                    {d.cargo}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTAs finais */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => abrirWhatsapp()} className="gap-2">
            <MessageCircle className="size-4" /> Falar com um consultor agora
          </Button>
          <Button size="lg" variant="ghost" onClick={() => (window.location.href = "/site/precos")}>
            Ver comparativo completo
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => signOut()}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          *Estimativa baseada em clientes que substituíram planilhas e ferramentas avulsas pelo
          mídia.OS.
        </p>
        {email && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Conta em teste: <span className="font-medium">{email}</span>
          </p>
        )}
      </div>
    </div>
  );
}
