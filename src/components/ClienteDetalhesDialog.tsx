import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Phone, Globe, Instagram, Linkedin, Facebook, Cake } from "lucide-react";

type Contato = {
  nome?: string;
  cargo?: string;
  funcao?: string;
  email?: string;
  telefone?: string;
  aniversario?: string;
};

export type ClienteDetalhes = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  endereco?: string | null;
  cidade: string | null;
  uf: string | null;
  cep?: string | null;
  segmento?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  cnae?: string | null;
  situacao_cadastral?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  data_aniversario?: string | null;
  observacao?: string | null;
  status?: string | null;
  contatos?: Contato[] | null;
  agencia?: { razao_social: string; nome_fantasia: string | null } | null;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value}</div>
    </div>
  );
}

export function ClienteDetalhesDialog({
  open,
  onOpenChange,
  cliente,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: ClienteDetalhes | null;
}) {
  if (!cliente) return null;
  const contatos = (cliente.contatos ?? []) as Contato[];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            {cliente.nome_fantasia || cliente.razao_social}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Dados cadastrais</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Razão social" value={cliente.razao_social} />
              <Field label="Nome fantasia" value={cliente.nome_fantasia} />
              <Field label="CNPJ" value={cliente.cnpj} />
              <Field label="Inscrição estadual" value={cliente.inscricao_estadual} />
              <Field label="Inscrição municipal" value={cliente.inscricao_municipal} />
              <Field label="Situação cadastral" value={cliente.situacao_cadastral} />
              <Field label="Segmento" value={cliente.segmento} />
              <Field label="CNAE" value={cliente.cnae} />
              <Field label="Status" value={cliente.status} />
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-2">Endereço</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Endereço" value={cliente.endereco} />
              <Field label="Cidade" value={cliente.cidade} />
              <Field label="UF" value={cliente.uf} />
              <Field label="CEP" value={cliente.cep} />
            </div>
          </section>

          {(cliente.website ||
            cliente.instagram ||
            cliente.linkedin ||
            cliente.facebook ||
            cliente.data_aniversario) && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold mb-2">Presença digital</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {cliente.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="size-4 text-muted-foreground" />
                      <a
                        href={cliente.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline truncate"
                      >
                        {cliente.website}
                      </a>
                    </div>
                  )}
                  {cliente.instagram && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="size-4 text-muted-foreground" />
                      {cliente.instagram}
                    </div>
                  )}
                  {cliente.linkedin && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin className="size-4 text-muted-foreground" />
                      {cliente.linkedin}
                    </div>
                  )}
                  {cliente.facebook && (
                    <div className="flex items-center gap-2 text-sm">
                      <Facebook className="size-4 text-muted-foreground" />
                      {cliente.facebook}
                    </div>
                  )}
                  {cliente.data_aniversario && (
                    <div className="flex items-center gap-2 text-sm">
                      <Cake className="size-4 text-muted-foreground" />
                      {cliente.data_aniversario}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {cliente.agencia && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold mb-2">Agência</h3>
                <Badge variant="outline">
                  {cliente.agencia.nome_fantasia || cliente.agencia.razao_social}
                </Badge>
              </section>
            </>
          )}

          {contatos.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold mb-2">Contatos ({contatos.length})</h3>
                <div className="space-y-3">
                  {contatos.map((c, i) => (
                    <div key={i} className="border rounded-md p-3 space-y-1">
                      <div className="font-medium text-sm">{c.nome}</div>
                      {(c.cargo || c.funcao) && (
                        <div className="text-xs text-muted-foreground">
                          {[c.cargo, c.funcao].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 mt-1">
                        {c.email && (
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="size-3" />
                            {c.email}
                          </span>
                        )}
                        {c.telefone && (
                          <span className="flex items-center gap-1 text-xs">
                            <Phone className="size-3" />
                            {c.telefone}
                          </span>
                        )}
                        {c.aniversario && (
                          <span className="flex items-center gap-1 text-xs">
                            <Cake className="size-3" />
                            {c.aniversario}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {cliente.observacao && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold mb-2">Observações</h3>
                <p className="text-sm whitespace-pre-wrap">{cliente.observacao}</p>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
