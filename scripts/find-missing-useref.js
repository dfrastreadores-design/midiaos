const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.output') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else if (/\.(tsx|jsx|ts|js)$/.test(file)) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return results;
}

const allFiles = walk('.');
console.log('Total files found:', allFiles.length);

const problemFiles = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Look for standalone useRef usage (not preceded by . as in React.useRef)
  // Matching: (?<!\.)useRef\s*[<(]
  const usesDirectUseRefRegex = /(?<![.\w$])useRef\s*(<|\()/g;
  
  let match;
  let hasDirectUseRef = false;
  while ((match = usesDirectUseRefRegex.exec(content)) !== null) {
    hasDirectUseRef = true;
    break;
  }

  if (hasDirectUseRef) {
    // Check if useRef is imported
    // e.g. import ... useRef ... from 'react' or from "react"
    const importReactRegex = /import\s+[^;]*\buseRef\b[^;]*from\s+['"]react['"]/;
    if (!importReactRegex.test(content)) {
      console.log('FOUND MISSING IMPORT IN:', filePath);
      problemFiles.push(filePath);
    }
  }
}

console.log('Problem files count:', problemFiles.length);
