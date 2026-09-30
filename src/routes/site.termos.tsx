import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/site/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — mídia.OS" },
      {
        name: "description",
        content:
          "Termos de uso da plataforma mídia.OS, regras de utilização e responsabilidades de contratantes e usuários.",
      },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site/termos" }],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-invert prose-headings:font-display">
      <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
        Documento legal
      </p>
      <h1>Termos de Uso</h1>
      <p className="text-sm text-[var(--m-muted)]">
        Última atualização: 27 de junho de 2026 · Versão 2026-06-27
      </p>

      <h2>1. Aceitação</h2>
      <p>
        Ao criar uma conta no mídia.OS você declara ter lido e aceito integralmente estes Termos e a
        nossa{" "}
        <Link to="/site/privacidade" className="text-indigo-300">
          Política de Privacidade
        </Link>
        . Caso não concorde, não utilize o serviço.
      </p>

      <h2>2. Objeto</h2>
      <p>
        O mídia.OS é um sistema SaaS para gestão comercial de veículos de comunicação, agências e
        representantes, incluindo CRM, propostas, pedidos de inserção (PI), briefings, comissões e
        relatórios.
      </p>

      <h2>3. Cadastro e responsabilidades do usuário</h2>
      <ul>
        <li>Os dados informados devem ser verdadeiros e mantidos atualizados.</li>
        <li>O titular da conta é responsável por toda atividade realizada com suas credenciais.</li>
        <li>
          É vedado o uso para fins ilícitos, envio de spam ou violação de direitos de terceiros.
        </li>
      </ul>

      <h2>4. Planos, cobrança e cancelamento</h2>
      <p>
        Os planos vigentes estão descritos em{" "}
        <Link to="/site/precos" className="text-indigo-300">
          /site/precos
        </Link>
        . O cancelamento pode ser solicitado a qualquer momento pelo painel do usuário ou pelo
        e-mail comercial@midiaos.online; valores já pagos não são reembolsáveis após início da
        vigência mensal.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        Todo o software, layout, marca, código-fonte e documentação são de propriedade do mídia.OS.
        É proibida reprodução, engenharia reversa ou revenda sem autorização.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O serviço é fornecido "como está". O mídia.OS não se responsabiliza por lucros cessantes,
        perda de oportunidades comerciais ou danos indiretos decorrentes de indisponibilidades
        planejadas, casos fortuitos ou força maior.
      </p>

      <h2>7. Suspensão</h2>
      <p>
        Podemos suspender ou encerrar contas em caso de inadimplência, fraude, uso indevido ou
        descumprimento destes Termos.
      </p>

      <h2>8. Foro</h2>
      <p>Fica eleito o foro de Brasília/DF para dirimir quaisquer controvérsias.</p>

      <p className="mt-12 text-sm text-[var(--m-muted)]">
        Dúvidas? Fale com{" "}
        <a className="text-indigo-300" href="mailto:comercial@midiaos.online">
          comercial@midiaos.online
        </a>
        .
      </p>
    </article>
  );
}
