import fs from "node:fs";
import { execSync } from "node:child_process";

// Se estiver no ambiente Windows com o disco D: preparado, usa build incremental de alta velocidade
if (process.platform === "win32" && fs.existsSync("D:\\midiaos_build")) {
  execSync("node scripts/build-quick.mjs", { stdio: "inherit" });
} else {
  // Em ambientes CI/CD (GitHub Actions, Linux) ou sem disco D:, roda vite build direto
  const cmd = process.platform === "win32"
    ? `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npx vite build"`
    : `NODE_OPTIONS=--max-old-space-size=4096 npx vite build`;
  execSync(cmd, { stdio: "inherit" });
}
