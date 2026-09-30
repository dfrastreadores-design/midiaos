import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/site/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade (LGPD) — mídia.OS" },
      {
        name: "description",
        content:
          "Como o mídia.OS coleta, trata, armazena e protege seus dados pessoais em conformidade com a LGPD (Lei 13.709/2018).",
      },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site/privacidade" }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-invert prose-headings:font-display">
      <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
        LGPD — Lei nº 13.709/2018
      </p>
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-[var(--m-muted)]">
        Última atualização: 27 de junho de 2026 · Versão 2026-06-27
      </p>

      <h2>1. Quem somos</h2>
      <p>
        O mídia.OS é o controlador dos dados coletados nesta plataforma. Contato do Encarregado
        (DPO):{" "}
        <a className="text-indigo-300" href="mailto:dpo@midiaos.online">
          dpo@midiaos.online
        </a>
        .
      </p>

      <h2>2. Princípio de minimização</h2>
      <p>Coletamos apenas os dados estritamente necessários para o funcionamento do serviço:</p>
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail, WhatsApp, CNPJ e razão social da empresa.
        </li>
        <li>
          <strong>Operacional:</strong> dados de clientes, propostas, PIs e materiais que você mesmo
          cadastra.
        </li>
        <li>
          <strong>Técnico:</strong> data/hora de acesso, IP e identificador de sessão (registros de
          auditoria).
        </li>
      </ul>
      <p>Não coletamos dados sensíveis (origem racial, opção política, saúde, biometria).</p>

      <h2>3. Bases legais (art. 7º LGPD)</h2>
      <ul>
        <li>
          <strong>Execução do contrato</strong> — para fornecer o sistema contratado.
        </li>
        <li>
          <strong>Consentimento expresso</strong> — coletado no cadastro e revogável a qualquer
          momento.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal</strong> — fiscal, trabalhista e regulatória.
        </li>
        <li>
          <strong>Legítimo interesse</strong> — prevenção a fraudes e melhoria do produto.
        </li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com operadores estritamente necessários: provedor de
        banco/hospedagem (Supabase/Cloudflare), serviço de e-mail transacional e gateway de
        pagamento. Nenhum dado é vendido a terceiros.
      </p>

      <h2>5. Segurança</h2>
      <ul>
        <li>
          Senhas armazenadas com hash forte (bcrypt/scrypt via Supabase Auth) — nunca em texto puro.
        </li>
        <li>Verificação contra senhas vazadas (HIBP) habilitada.</li>
        <li>Transporte criptografado (TLS 1.2+).</li>
        <li>
          Isolamento por inquilino (multi-tenant) com Row Level Security (RLS) — cada usuário
          enxerga somente os dados da sua empresa.
        </li>
        <li>Registros de auditoria de criação, alteração e exclusão de dados sensíveis.</li>
      </ul>

      <h2>6. Retenção</h2>
      <p>
        Dados ativos são mantidos enquanto a conta estiver em uso. Após cancelamento, mantemos os
        dados por até 5 anos para cumprir obrigações fiscais; em seguida são anonimizados ou
        eliminados.
      </p>

      <h2>7. Direitos do titular (art. 18 LGPD)</h2>
      <p>
        Você pode, a qualquer momento, exercer os seguintes direitos diretamente em{" "}
        <strong>Minha Conta → Privacidade &amp; LGPD</strong>:
      </p>
      <ul>
        <li>
          Confirmação e <strong>acesso</strong> aos seus dados.
        </li>
        <li>
          <strong>Correção</strong> de dados incompletos, inexatos ou desatualizados.
        </li>
        <li>
          <strong>Portabilidade</strong> (exportação em JSON).
        </li>
        <li>
          <strong>Eliminação</strong> dos dados tratados com base no consentimento (direito ao
          esquecimento).
        </li>
        <li>
          <strong>Revogação do consentimento</strong>.
        </li>
      </ul>
      <p>
        Solicitações também podem ser enviadas para{" "}
        <a className="text-indigo-300" href="mailto:dpo@midiaos.online">
          dpo@midiaos.online
        </a>{" "}
        — respondemos em até 15 dias.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais para manter sua sessão autenticada. Não utilizamos cookies
        de rastreamento publicitário de terceiros.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Mudanças relevantes nesta política serão comunicadas por e-mail e exigirão novo
        consentimento dentro do sistema.
      </p>

      <p className="mt-12 text-sm text-[var(--m-muted)]">
        Leia também os nossos{" "}
        <Link className="text-indigo-300" to="/site/termos">
          Termos de Uso
        </Link>
        .
      </p>
    </article>
  );
}
