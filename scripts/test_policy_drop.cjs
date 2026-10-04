const fs = require('fs');

let sc = fs.readFileSync('supabase/schema_completo.sql', 'utf8');

// Policy protection
const polRegex = /CREATE\s+POLICY\s+("[^"]+"|[a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+(?:%I)?)/gi;
let polCount = 0;
sc = sc.replace(polRegex, (match, polName, tblName) => {
  if (tblName.includes('%') || tblName.includes('$') || polName.includes('%')) {
    return match;
  }
  polCount++;
  return `DROP POLICY IF EXISTS ${polName} ON ${tblName};\nCREATE POLICY ${polName} ON ${tblName}`;
});

// Trigger protection (only standalone CREATE TRIGGER, ignoring format/%I strings)
const trgRegex = /^(\s*CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)[\s\S]*?ON\s+([a-zA-Z0-9_.]+))/gmi;
let trgCount = 0;
sc = sc.replace(trgRegex, (match, full, trgName, tblName) => {
  if (tblName.includes('%') || tblName.includes('$') || trgName.includes('%')) {
    return match;
  }
  trgCount++;
  return `DROP TRIGGER IF EXISTS ${trgName} ON ${tblName};\n${full.trimStart()}`;
});

console.log('Protected policies:', polCount);
console.log('Protected triggers:', trgCount);
