// Entry point para hospedagens Node.js (Hostinger hPanel, cPanel, PM2, etc.)
// Carrega o servidor compilado pelo Nitro/TanStack Start em .output/server/index.mjs

import("./.output/server/index.mjs").catch((err) => {
  console.error("Erro ao iniciar o servidor da aplicação mídia.OS:", err);
  process.exit(1);
});
