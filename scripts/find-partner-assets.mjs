import fs from "fs";
import path from "path";

function findFiles(dir, exts, max = 50) {
  let found = [];
  if (!fs.existsSync(dir)) return found;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === ".tanstack-start" || ent.name === "dist") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        found = found.concat(findFiles(full, exts, max - found.length));
        if (found.length >= max) break;
      } else {
        const ext = path.extname(ent.name).toLowerCase();
        if (exts.includes(ext)) {
          found.push(full);
          if (found.length >= max) break;
        }
      }
    }
  } catch (e) {}
  return found;
}

console.log("Checking d:\\Projetos\\Midia.os for files...");
const projFiles = findFiles("d:\\Projetos\\Midia.os", [".pdf", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"], 100);
console.log(`Found in Midia.os: ${projFiles.length}`);
projFiles.slice(0, 30).forEach(f => console.log(f));

console.log("\nChecking d:\\midiaos_build for files...");
const buildFiles = findFiles("d:\\midiaos_build", [".pdf", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"], 100);
console.log(`Found in midiaos_build: ${buildFiles.length}`);
buildFiles.slice(0, 30).forEach(f => console.log(f));
