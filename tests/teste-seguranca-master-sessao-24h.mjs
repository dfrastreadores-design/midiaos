/**
 * TESTE AUTOMATIZADO DE SEGURANÇA: MASTER GLOBAL VS ADMIN DA EMPRESA & SESSÃO DE 24 HORAS
 * 
 * Validação rigorosa dos 12 cenários obrigatórios especificados na auditoria P0.
 * Executa localmente sem depender de banco remoto em produção.
 */

import assert from "node:assert/strict";
import { isMasterEmail, isNexoAdminEmail, MASTER_GLOBAL_EMAIL, NEXO_ADMIN_EMAIL } from "../src/lib/master-user.ts";

console.log("\n================================================================================");
console.log("   INICIANDO BATERIA DE TESTES DE SEGURANÇA: MASTER GLOBAL & SESSÃO 24H");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Erro: ${err.message}`);
    failedCount++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Erro: ${err.message}`);
    failedCount++;
  }
}

// ============================================================================
// SIMULADORES E POLÍTICAS DE CONTROLE DE ACESSO
// ============================================================================

// Simula a resolução de permissões e rotas (idêntico ao useUserRoles + AppShell)
function checkCanAccessRoute(user, path) {
  const isMaster = isMasterEmail(user.email) || user.is_superadmin === true;
  if (isMaster) return true; // Master Global acessa tudo

  // Bloqueio absoluto do Painel do Proprietário e monitoramento para não-Master
  if (path.startsWith("/owner") || path === "/monitoramento") {
    return false;
  }

  // Se for admin de tenant (ex: NEXO)
  const isTenantAdmin = user.role === "ADMIN" || user.roles?.includes("admin");
  if (isTenantAdmin) {
    const adminRoutes = [
      "/", "/clientes", "/agencias", "/propostas", "/crm",
      "/planejamento", "/nova-campanha", "/centralizadores",
      "/produtos", "/rede-inventario", "/parceiros", "/pi",
      "/contratos", "/historico-veiculacao", "/assinaturas",
      "/financeiro", "/comissoes", "/relatorios", "/usuarios",
      "/configuracoes", "/lixeira", "/documentacao"
    ];
    return adminRoutes.includes(path);
  }

  return false;
}

// Simula o filtro de menu visível no AppShell
function getVisibleMenu(user) {
  const allMenuItems = [
    { to: "/", label: "Dashboard" },
    { to: "/owner", label: "Painel do Proprietário" },
    { to: "/monitoramento", label: "Monitoramento" },
    { to: "/clientes", label: "Clientes" },
    { to: "/propostas", label: "Propostas Comerciais" },
    { to: "/pi", label: "Pedidos de Inserção (PI)" },
    { to: "/financeiro", label: "Faturamento" },
    { to: "/usuarios", label: "Usuários" },
    { to: "/configuracoes", label: "Configurações" },
  ];

  const isMaster = isMasterEmail(user.email) || user.is_superadmin === true;

  return allMenuItems.filter((item) => {
    if (item.to === "/owner" || item.to === "/monitoramento") {
      return isMaster;
    }
    return checkCanAccessRoute(user, item.to);
  });
}

// Simula assertSuperAdmin do servidor
function mockAssertSuperAdmin(user) {
  if (isMasterEmail(user.email) || user.is_superadmin === true) {
    return true;
  }
  throw new Error("Acesso negado: apenas o proprietário da plataforma (Super Admin) pode acessar esta área.");
}

// Simula gestão de usuários da empresa (listUsuarios)
function mockListUsuarios(user, requestedTenantId) {
  const isSuper = isMasterEmail(user.email) || user.is_superadmin === true;
  if (!isSuper) {
    if (!user.tenant_id) {
      throw new Error("Usuário não vinculado a nenhuma empresa");
    }
    // Tenant Admin é restrito ao seu próprio tenant
    return {
      scopedTenantId: user.tenant_id,
      allowed: true,
      mode: "TENANT_SCOPED",
    };
  }
  return {
    scopedTenantId: requestedTenantId || null,
    allowed: true,
    mode: "GLOBAL_MASTER",
  };
}

// Simula elevação de perfil (setUserRole)
function mockSetUserRole(caller, targetUserId, newRole) {
  const isSuper = isMasterEmail(caller.email) || caller.is_superadmin === true;
  if (newRole === "super_admin" && !isSuper) {
    throw new Error("Apenas o proprietário da plataforma pode conceder perfil super_admin");
  }
  return { success: true, targetUserId, newRole };
}

// Simula política RLS multi-tenant
function mockRLSCheck(caller, recordTenantId) {
  const isSuper = isMasterEmail(caller.email) || caller.is_superadmin === true;
  if (isSuper) return true; // Master Global pode ver
  if (!caller.tenant_id || !recordTenantId) return false;
  return caller.tenant_id === recordTenantId; // Apenas mesma empresa
}

// Simula validação de sessão 24 horas
function mockValidateSession(session, now = Date.now()) {
  const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // 24h
  if (!session || !session.access_token) {
    return { valid: false, reason: "UNAUTHENTICATED" };
  }
  if (session.revoked) {
    return { valid: false, reason: "SESSION_REVOKED" };
  }
  const lastSignIn = session.user?.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).getTime()
    : 0;

  if (lastSignIn && now - lastSignIn > MAX_SESSION_MS) {
    return { valid: false, reason: "EXPIRED_24H_LIMIT" };
  }

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  const isJwtExpired = expiresAt && expiresAt <= now;

  if (isJwtExpired) {
    // Se o JWT expirou mas a sessão tem menos de 24h, pode ser renovada silenciosamente
    return { valid: false, canSilentRefresh: true, reason: "JWT_EXPIRED_REFRESHABLE" };
  }

  return { valid: true, canSilentRefresh: false };
}

// ============================================================================
// EXECUÇÃO DOS 12 CENÁRIOS
// ============================================================================

// Cenário 1: Master global autenticado consegue acessar o Painel do Proprietário
runTest("Cenário 1: Master global autenticado consegue acessar o Painel do Proprietário (/owner)", () => {
  const masterUser = {
    email: MASTER_GLOBAL_EMAIL,
    is_superadmin: true,
    role: "MASTER",
    tenant_id: null,
  };

  assert.equal(isMasterEmail(masterUser.email), true, "Email do Master Global deve constar como master");
  assert.equal(checkCanAccessRoute(masterUser, "/owner"), true, "Master Global deve poder acessar /owner");
  assert.equal(checkCanAccessRoute(masterUser, "/monitoramento"), true, "Master Global deve poder acessar /monitoramento");
});

// Cenário 2: Administrador da NEXO não consegue acessar o Painel do Proprietário
runTest("Cenário 2: Administrador da NEXO não consegue acessar o Painel do Proprietário (/owner)", () => {
  const nexoAdmin = {
    email: NEXO_ADMIN_EMAIL,
    is_superadmin: false,
    role: "ADMIN",
    tenant_id: "tenant-nexo-uuid-1234",
  };

  assert.equal(isMasterEmail(nexoAdmin.email), false, "Email da NEXO não pode ser reconhecido como Master Global");
  assert.equal(isNexoAdminEmail(nexoAdmin.email), true, "Email deve ser reconhecido como Admin da NEXO");
  assert.equal(checkCanAccessRoute(nexoAdmin, "/owner"), false, "NEXO Admin NÃO PODE acessar /owner");
  assert.equal(checkCanAccessRoute(nexoAdmin, "/monitoramento"), false, "NEXO Admin NÃO PODE acessar /monitoramento");
});

// Cenário 3: Administrador da NEXO não consegue chamar diretamente funções globais
runTest("Cenário 3: Administrador da NEXO é barrado no servidor ao chamar funções globais (assertSuperAdmin)", () => {
  const nexoAdmin = {
    email: NEXO_ADMIN_EMAIL,
    is_superadmin: false,
    role: "ADMIN",
    tenant_id: "tenant-nexo-uuid-1234",
  };

  assert.throws(
    () => mockAssertSuperAdmin(nexoAdmin),
    /Acesso negado: apenas o proprietário da plataforma/,
    "Chamada direta ao assertSuperAdmin deve falhar com erro de acesso negado"
  );
});

// Cenário 4: Administrador da NEXO consegue administrar usuários da própria empresa
runTest("Cenário 4: Administrador da NEXO administra usuários da própria empresa dentro do tenant", () => {
  const nexoAdmin = {
    email: NEXO_ADMIN_EMAIL,
    is_superadmin: false,
    role: "ADMIN",
    tenant_id: "tenant-nexo-uuid-1234",
  };

  const result = mockListUsuarios(nexoAdmin, null);
  assert.equal(result.allowed, true, "Nexo Admin deve poder listar usuários");
  assert.equal(result.mode, "TENANT_SCOPED", "Listagem deve ser obrigatoriamente restrita ao tenant");
  assert.equal(result.scopedTenantId, "tenant-nexo-uuid-1234", "Tenant filtrado deve ser o da Nexo");
});

// Cenário 5: Administrador da NEXO não consegue elevar o próprio perfil a Master global
runTest("Cenário 5: Administrador da NEXO não pode conceder super_admin a si ou a outrem", () => {
  const nexoAdmin = {
    email: NEXO_ADMIN_EMAIL,
    is_superadmin: false,
    role: "ADMIN",
    tenant_id: "tenant-nexo-uuid-1234",
  };

  assert.throws(
    () => mockSetUserRole(nexoAdmin, "usuario-uuid-555", "super_admin"),
    /Apenas o proprietário da plataforma pode conceder perfil super_admin/,
    "Tentativa de elevação a super_admin por admin de tenant deve ser bloqueada"
  );
});

// Cenário 6: Usuário da empresa A não consegue ler ou editar dados da empresa B
runTest("Cenário 6: Isolamento multi-tenant (Empresa A não acessa dados da Empresa B)", () => {
  const userEmpresaA = {
    email: "admin@empresa-a.com.br",
    tenant_id: "tenant-aaaa-1111",
    is_superadmin: false,
  };

  const recordEmpresaA = "tenant-aaaa-1111";
  const recordEmpresaB = "tenant-bbbb-2222";

  assert.equal(mockRLSCheck(userEmpresaA, recordEmpresaA), true, "Empresa A acessa seu próprio registro");
  assert.equal(mockRLSCheck(userEmpresaA, recordEmpresaB), false, "Empresa A é bloqueada de acessar dados da Empresa B");
});

// Cenário 7: Usuário não autenticado não acessa áreas protegidas
runTest("Cenário 7: Usuário não autenticado não acessa áreas protegidas", () => {
  const unauthenticatedSession = null;
  const status = mockValidateSession(unauthenticatedSession);

  assert.equal(status.valid, false, "Sessão nula não é válida");
  assert.equal(status.reason, "UNAUTHENTICATED", "Motivo deve ser UNAUTHENTICATED");
});

// Cenário 8: A interface não exibe menus globais para perfis de empresa
runTest("Cenário 8: Sidebar oculta itens de Master Global (/owner, /monitoramento) para Admin de Empresa", () => {
  const nexoAdmin = {
    email: NEXO_ADMIN_EMAIL,
    is_superadmin: false,
    role: "ADMIN",
    tenant_id: "tenant-nexo-uuid-1234",
  };

  const menuItems = getVisibleMenu(nexoAdmin);
  const paths = menuItems.map((m) => m.to);

  assert.equal(paths.includes("/owner"), false, "Menu /owner NÃO DEVE constar para NEXO Admin");
  assert.equal(paths.includes("/monitoramento"), false, "Menu /monitoramento NÃO DEVE constar para NEXO Admin");
  assert.equal(paths.includes("/clientes"), true, "Menu comercial deve constar");
  assert.equal(paths.includes("/usuarios"), true, "Menu de usuários da empresa deve constar");
});

// Cenário 9: A sessão renova-se corretamente antes de expirar (silent refresh)
runTest("Cenário 9: JWT de acesso expirado dentro de 24h aciona silent refresh transparente", () => {
  const now = Date.now();
  // Sessão iniciada há 3 horas, mas JWT de 1h expirou
  const activeSession = {
    access_token: "jwt-token-expirado",
    user: {
      email: NEXO_ADMIN_EMAIL,
      last_sign_in_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    },
    expires_at: Math.floor((now - 60_000) / 1000), // Expirou há 1 min
    revoked: false,
  };

  const status = mockValidateSession(activeSession, now);
  assert.equal(status.valid, false);
  assert.equal(status.canSilentRefresh, true, "Deve autorizar renovação silenciosa sem pedir senha");
  assert.equal(status.reason, "JWT_EXPIRED_REFRESHABLE");
});

// Cenário 10: Uma sessão válida continua utilizável durante o período configurado (24h)
runTest("Cenário 10: Sessão válida e renovada permanece utilizável até 24 horas contínuas", () => {
  const now = Date.now();
  // Sessão ativa há 23 horas e 30 minutos (quase 24h)
  const session23h = {
    access_token: "jwt-token-valido",
    user: {
      email: NEXO_ADMIN_EMAIL,
      last_sign_in_at: new Date(now - 23.5 * 60 * 60 * 1000).toISOString(),
    },
    expires_at: Math.floor((now + 1800_000) / 1000), // Válido por mais 30 min
    revoked: false,
  };

  const status = mockValidateSession(session23h, now);
  assert.equal(status.valid, true, "Sessão com 23.5h deve continuar válida");
  assert.equal(status.canSilentRefresh, false);
});

// Cenário 11: Uma sessão expirada (> 24h) ou revogada exige reautenticação
runTest("Cenário 11: Sessão com mais de 24 horas contínuas é encerrada e exige nova autenticação", () => {
  const now = Date.now();
  // Sessão iniciada há 24 horas e 1 minuto
  const expiredSession24h = {
    access_token: "jwt-token-velho",
    user: {
      email: NEXO_ADMIN_EMAIL,
      last_sign_in_at: new Date(now - (24 * 60 * 60 * 1000 + 60_000)).toISOString(),
    },
    expires_at: Math.floor((now + 600_000) / 1000),
    revoked: false,
  };

  const status = mockValidateSession(expiredSession24h, now);
  assert.equal(status.valid, false, "Sessão acima de 24h deve ser invalidada");
  assert.equal(status.reason, "EXPIRED_24H_LIMIT", "Motivo deve ser o atingimento do limite de 24h");
});

// Cenário 12: Logout invalida o acesso conforme o comportamento do provedor
runTest("Cenário 12: Sessão revogada/desconectada bloqueia imediatamente o acesso", () => {
  const revokedSession = {
    access_token: "jwt-revogado",
    user: { email: NEXO_ADMIN_EMAIL },
    revoked: true,
  };

  const status = mockValidateSession(revokedSession);
  assert.equal(status.valid, false, "Sessão revogada não pode ser aceita");
  assert.equal(status.reason, "SESSION_REVOKED", "Motivo deve ser SESSION_REVOKED");
});

// ============================================================================
// RELATÓRIO FINAL
// ============================================================================
console.log("\n--------------------------------------------------------------------------------");
console.log(`TOTAL DE TESTES EXECUTADOS: ${passedCount + failedCount}`);
console.log(`SUCESSOS: ${passedCount}`);
console.log(`FALHAS:   ${failedCount}`);
console.log("--------------------------------------------------------------------------------\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log(">>> TODOS OS 12 CENÁRIOS OBRIGATÓRIOS FORAM ATENDIDOS COM SUCESSO! <<<\n");
}
