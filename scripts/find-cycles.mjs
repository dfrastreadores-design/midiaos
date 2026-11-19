import fs from 'fs';
import path from 'path';

const graph = {};

function getImports(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  const imports = [];
  const regex = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    let target = m[1];
    if (target.startsWith('@/')) {
      target = path.resolve('src', target.slice(2));
    } else if (target.startsWith('.')) {
      target = path.resolve(dir, target);
    } else {
      continue;
    }
    for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
      if (fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) {
        imports.push(path.normalize(target + ext));
        break;
      }
    }
  }
  return imports;
}

function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      scan(p);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      graph[path.normalize(p)] = getImports(p);
    }
  }
}

scan(path.resolve('src'));
console.log('Total files scanned:', Object.keys(graph).length);

const cycles = [];
function findCycles(node, visited, stack) {
  visited.add(node);
  stack.push(node);

  for (const dep of graph[node] || []) {
    if (!visited.has(dep)) {
      findCycles(dep, visited, stack);
    } else if (stack.includes(dep)) {
      const cycle = stack.slice(stack.indexOf(dep));
      cycle.push(dep);
      cycles.push(cycle);
    }
  }
  stack.pop();
}

const visited = new Set();
for (const node of Object.keys(graph)) {
  if (!visited.has(node)) findCycles(node, visited, []);
}

console.log('Total circular dependencies found:', cycles.length);
cycles.forEach((c, i) => {
  console.log(`\nCycle ${i + 1}:`);
  c.forEach(f => console.log('  ->', path.relative(process.cwd(), f)));
});
