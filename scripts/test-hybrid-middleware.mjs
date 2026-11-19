import { createMiddleware } from "@tanstack/react-start";

const middleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  return next({ context: { ok: true } });
});

const hybridAuth = Object.assign(
  async function() {
    return { ok: true, directCall: true };
  },
  middleware
);

console.log("É função?", typeof hybridAuth === "function");
console.log("Chamada direta:", await hybridAuth());
console.log("Propriedade options do middleware:", typeof hybridAuth.options);
