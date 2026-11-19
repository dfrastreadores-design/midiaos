import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log(`Auditing all ${files.length} migration files...\n`);

const issues = [];

files.forEach((f, idx) => {
  const filePath = path.join(migrationsDir, f);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check auth.users direct DML
  if (/INSERT\s+INTO\s+auth\.users/i.test(content)) {
    issues.push({ file: f, issue: 'Direct INSERT into auth.users' });
  }
  if (/UPDATE\s+auth\.users/i.test(content)) {
    issues.push({ file: f, issue: 'Direct UPDATE on auth.users' });
  }
  if (/ALTER\s+TYPE\s+public\.\w+\s+ADD\s+VALUE/i.test(content)) {
    issues.push({ file: f, issue: 'ALTER TYPE ADD VALUE (unsafe in single transaction block)' });
  }
  if (/SET\s+session_replication_role\s*=\s*replica/i.test(content)) {
    issues.push({ file: f, issue: 'SET session_replication_role = replica' });
  }
});

console.log(`Total issues detected: ${issues.length}`);
issues.forEach(i => console.log(`- [${i.file}]: ${i.issue}`));

