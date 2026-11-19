import fs from 'node:fs';

const content = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');
const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s*Views:/);
if (tablesMatch) {
  const tableLines = tablesMatch[1].match(/^\s{6}([a-zA-Z0-9_]+):\s*\{/gm);
  const tableNames = tableLines?.map(l => l.replace(/^\s{6}/, '').replace(/:\s*\{/, '').trim());
  console.log('Tabelas encontradas em types.ts:', tableNames);
} else {
  console.log('Não deu match');
}
