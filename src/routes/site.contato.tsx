import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/site/contato")({
  head: () => ({
    meta: [
      { title: "Agendar demonstração — mídia.OS" },
      {
        name: "description",
        content:
          "Agende uma demonstração gratuita do mídia.OS e veja como aumentar as vendas do seu veículo de comunicação. Resposta em até 1 dia útil.",
      },
      { property: "og:title", content: "Agendar demonstração gratuita — mídia.OS" },
      {
        property: "og:description",
        content: "Fale com o time comercial e veja o mídia.OS em ação no seu cenário.",
      },
      { property: "og:url", content: "https://midiaos.online/site/contato" },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site/contato" }],
  }),
  component: Contato,
});

function Contato() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    veiculo: "",
    email: "",
    telefone: "",
    mensagem: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[mídia.OS] Contato de ${form.nome} — ${form.veiculo}`);
    const body = encodeURIComponent(
      `Nome: ${form.nome}\nVeículo: ${form.veiculo}\nE-mail: ${form.email}\nTelefone: ${form.telefone}\n\n${form.mensagem}`,
    );
    window.location.href = `mailto:comercial@midiaos.online?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 midia-glow pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
              Contato
            </span>
            <h1 className="mt-3 text-5xl lg:text-6xl font-bold leading-[1.05]">
              Vamos <span className="midia-grad-text">conversar</span>
            </h1>
            <p className="mt-6 text-lg text-[var(--m-muted)] max-w-lg">
              Conte um pouco sobre o seu veículo e marcamos uma demonstração ao vivo de 30 minutos —
              sob medida para a sua operação.
            </p>

            <div className="mt-10 space-y-5">
              <ContactItem icon={Mail} label="E-mail" value="comercial@midiaos.online" />
              <a
                href="https://wa.me/5561984746857"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                <ContactItem icon={Phone} label="WhatsApp" value="(61) 9 8474-6857" />
              </a>
              <ContactItem icon={MapPin} label="Endereço" value="Brasília — DF, Brasil" />
            </div>

            <div className="mt-12 midia-card p-6">
              <h3 className="font-semibold mb-2">Por que agendar uma demo?</h3>
              <ul className="space-y-2 text-sm text-[var(--m-muted)]">
                {[
                  "Veja a plataforma com os dados do seu segmento",
                  "Tire dúvidas com quem entende de mídia",
                  "Receba uma proposta personalizada em até 48h",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="midia-card p-8">
            {sent ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold">Mensagem enviada!</h3>
                <p className="mt-2 text-[var(--m-muted)]">Retornaremos em até 1 dia útil.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <Field
                  label="Nome completo"
                  required
                  value={form.nome}
                  onChange={(v) => setForm({ ...form, nome: v })}
                />
                <Field
                  label="Veículo / empresa"
                  required
                  value={form.veiculo}
                  onChange={(v) => setForm({ ...form, veiculo: v })}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    type="email"
                    label="E-mail"
                    required
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                  />
                  <Field
                    label="Telefone"
                    value={form.telefone}
                    onChange={(v) => setForm({ ...form, telefone: v })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--m-muted)] mb-1.5">
                    Como podemos ajudar?
                  </label>
                  <textarea
                    rows={5}
                    value={form.mensagem}
                    onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                    className="w-full rounded-lg bg-white/5 border border-[var(--m-border)] px-4 py-2.5 text-sm text-white placeholder:text-[var(--m-muted)] focus:outline-none focus:border-indigo-400 transition-colors"
                    placeholder="Conte sobre seu veículo, equipe e desafios atuais."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" /> Enviar mensagem
                </button>
                <p className="text-xs text-[var(--m-muted)] text-center">
                  Ao enviar, você concorda em receber contato do time mídia.OS.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-indigo-300" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--m-muted)]">{label}</div>
        <div className="text-white font-medium">{value}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-[var(--m-muted)] mb-1.5">
        {label} {required && <span className="text-indigo-400">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/5 border border-[var(--m-border)] px-4 py-2.5 text-sm text-white placeholder:text-[var(--m-muted)] focus:outline-none focus:border-indigo-400 transition-colors"
      />
    </div>
  );
}
