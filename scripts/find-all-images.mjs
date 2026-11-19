import fs from "fs";
import path from "path";

function findImages(dir, max = 200) {
  let found = [];
  if (!fs.existsSync(dir)) return found;
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of list) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === ".output" || ent.name === ".tanstack-start" || ent.name === "dist") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        found = found.concat(findImages(full, max - found.length));
        if (found.length >= max) break;
      } else {
        const ext = path.extname(ent.name).toLowerCase();
        if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          found.push(full);
          if (found.length >= max) break;
        }
      }
    }
  } catch (e) {}
  return found;
}

const images = findImages("d:\\Projetos");
console.log(`Found ${images.length} images in d:\\Projetos:`);
images.forEach(img => console.log(img));
