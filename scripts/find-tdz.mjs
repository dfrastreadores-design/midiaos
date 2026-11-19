import fs from 'fs';
import * as acorn from 'acorn';

function isDeclaration(node, parent) {
  if (!parent) return false;
  if (parent.type === 'VariableDeclarator' && parent.id === node) return true;
  if (parent.type === 'FunctionDeclaration' && parent.id === node) return true;
  if (parent.type === 'ClassDeclaration' && parent.id === node) return true;
  if (parent.type === 'CatchClause' && parent.param === node) return true;
  // Patterns
  if (parent.type === 'Property' && parent.value === node) {
    // If property is inside an ObjectPattern
    // We would need to check parent's parent, but simple:
    return true;
  }
  if (parent.type === 'ArrayPattern') return true;
  if (parent.type === 'RestElement') return true;
  if (parent.type === 'AssignmentPattern' && parent.left === node) return true;
  return false;
}

function analyzeFile(filePath) {
  console.log('Analyzing:', filePath);
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (err) {
    console.error('Parse error:', err.message);
    return;
  }

  const items = [];
  function walk(node, ancestors = []) {
    if (!node || typeof node !== 'object') return;
    const currentAncestors = [...ancestors, node];

    if (node.type === 'Identifier' && node.name === 'E') {
      const parent = ancestors[ancestors.length - 1];
      if (parent) {
        const isProp = (parent.type === 'Property' && parent.key === node && !parent.computed) ||
                       (parent.type === 'MemberExpression' && parent.property === node && !parent.computed);
        if (!isProp) {
          const isDecl = isDeclaration(node, parent);
          const isParam = ancestors.some(a => 
            (a.type === 'FunctionDeclaration' || a.type === 'FunctionExpression' || a.type === 'ArrowFunctionExpression') &&
            a.params.includes(node)
          );
          const enclosingScope = ancestors.slice().reverse().find(a => 
            a.type === 'FunctionDeclaration' || 
            a.type === 'FunctionExpression' || 
            a.type === 'ArrowFunctionExpression' ||
            a.type === 'Program'
          );
          items.push({
            pos: node.start,
            decl: isDecl || isParam,
            scopeType: enclosingScope?.type,
            scopeName: enclosingScope?.id?.name || 'anon',
            scopeStart: enclosingScope?.start,
            snippet: code.slice(Math.max(0, node.start - 25), Math.min(code.length, node.start + 35)).replace(/\n/g, ' ')
          });
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item, currentAncestors);
      } else if (child && typeof child === 'object') {
        walk(child, currentAncestors);
      }
    }
  }

  walk(ast);
  console.log(`Total occurrences in ${filePath}:`, items.length);

  // Group by scopeStart
  const byScope = {};
  for (const it of items) {
    byScope[it.scopeStart] = byScope[it.scopeStart] || [];
    byScope[it.scopeStart].push(it);
  }

  for (const [start, group] of Object.entries(byScope)) {
    // Check if first occurrence in scope is a USE before any DECL in that scope
    const first = group[0];
    const hasDecl = group.some(x => x.decl);
    if (!first.decl && hasDecl) {
      console.warn('⚠️ POTENTIAL TDZ: First occurrence is USE before DECL in scope starting at', start);
      group.forEach(g => console.log(`   ${g.decl ? '[DECL]' : '[USE ]'} at ${g.pos}: ${g.snippet}`));
    }
  }
}

analyzeFile('D:/midiaos_build/.output/public/assets/index-SOBZgYIe.js');
analyzeFile('D:/midiaos_build/.output/public/assets/index-Do2c2MKw.js');
