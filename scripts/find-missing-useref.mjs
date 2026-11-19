import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (['node_modules', '.git', 'dist', '.output', 'backups', 'hostinger'].includes(file)) continue;
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
  
  // Look for any word useRef
  if (/\buseRef\b/.test(content)) {
    // Check if useRef is imported
    const importRegex = /import\s+[^;]*\buseRef\b[^;]*from\s+['"]react['"]/;
    const hasImport = importRegex.test(content);
    
    // Check if it's only React.useRef and React is imported
    const usesOnlyReactDotUseRef = !/(?<!\.)\buseRef\b/.test(content.replace(/import\s+[^;]+;/g, ''));
    
    console.log(`FILE: ${filePath} | hasImport: ${hasImport} | onlyReactDot: ${usesOnlyReactDotUseRef}`);
    if (!hasImport && !usesOnlyReactDotUseRef) {
      problemFiles.push(filePath);
    }
  }
}

console.log('PROBLEM FILES:', JSON.stringify(problemFiles, null, 2));
