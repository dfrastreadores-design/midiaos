import fs from 'node:fs';

if (fs.existsSync('.env.staging')) {
  const content = fs.readFileSync('.env.staging', 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (/PASS|KEY|SECRET|TOKEN/i.test(key)) {
      console.log(`${key} = [PRESENT, length: ${val.length}]`);
    } else {
      console.log(`${key} = ${val}`);
    }
  });
} else {
  console.log('.env.staging not found');
}

