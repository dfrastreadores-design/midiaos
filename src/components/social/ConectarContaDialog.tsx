import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PLATAFORMAS_CONFIG, PlataformaSocial, SocialConta } from "@/lib/social-media.functions";
import { Link2, Loader2, ShieldCheck } from "lucide-react";

interface ConectarContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (conta: Partial<SocialConta>) => Promise<void>;
}

export function ConectarContaDialog({ open, onOpenChange, onConnect }: ConectarContaDialogProps) {
  const [plataforma, setPlataforma] = useState<PlataformaSocial>("instagram");
  const [nomeConta, setNomeConta] = useState("");
  const [username, setUsername] = useState("");
  const [seguidores, setSeguidores] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeConta.trim()) {
      toast.error("Informe o nome de exibição da conta ou página.");
      return;
    }

    setIsLoading(true);
    try {
      const novaConta: Partial<SocialConta> = {
        plataforma,
        nome_conta: nomeConta.trim(),
        username: username.trim() || undefined,
        seguidores: parseInt(seguidores, 10) || 0,
        taxa_engajamento: 4.5,
        status: "conectado",
        avatar_url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80`,
      };

      await onConnect(novaConta);
      toast.success(`Conta ${PLATAFORMAS_CONFIG[plataforma].nome} conectada com sucesso!`);
      setNomeConta("");
      setUsername("");
      setSeguidores("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao conectar conta: " + (err.message || "Tente novamente"));
    } finally {
      setIsLoading(false);
    }
  };

  const cfg = PLATAFORMAS_CONFIG[plataforma];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Link2 className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Conectar Canal de Mídia Social
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Vincule contas corporativas ou perfis de tráfego para agendamento automático e
              sincronização de métricas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rede ou Plataforma</Label>
              <Select value={plataforma} onValueChange={(val: any) => setPlataforma(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram Profissional / Creator</SelectItem>
                  <SelectItem value="meta_ads">
                    Meta Ads (Gerenciador de Anúncios Facebook/IG)
                  </SelectItem>
                  <SelectItem value="facebook">Facebook Página Comercial</SelectItem>
                  <SelectItem value="tiktok">TikTok Business / Creator</SelectItem>
                  <SelectItem value="linkedin">LinkedIn Company Page</SelectItem>
                  <SelectItem value="youtube">Canal do YouTube</SelectItem>
                  <SelectItem value="google_ads">Google Ads (Campanhas de Tráfego)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Conta / Empresa</Label>
              <Input
                placeholder="Ex: Nexo Mídia Brasil"
                value={nomeConta}
                onChange={(e) => setNomeConta(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Username / Identificador (@handle ou ID da Conta)
              </Label>
              <Input
                placeholder="Ex: @nexomidia.oficial ou act_12345678"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Base de Seguidores / Alcance Estimado</Label>
              <Input
                type="number"
                placeholder="Ex: 25000"
                value={seguidores}
                onChange={(e) => setSeguidores(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
              <span>
                Conexão segura via API oficial criptografada com permissões de publicação e leitura
                de métricas de alcance.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Confirmar Conexão"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
