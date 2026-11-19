import fs from "node:fs";

const html = fs.readFileSync("drive_response.html", "utf-8");

// Search for data arrays in Google Drive initial data: window['_DRIVE_ivd'] or similar
const ivdMatch = html.match(/_DRIVE_ivd\s*=\s*['"](.*?)['"];/s);
if (ivdMatch) {
  console.log("Found _DRIVE_ivd of length:", ivdMatch[1].length);
  try {
    const unescaped = JSON.parse(`"${ivdMatch[1]}"`);
    console.log("Unescaped length:", unescaped.length);
  } catch (e) {
    console.log("Error parsing _DRIVE_ivd:", e.message);
  }
}

// Let's search for subfolder names and IDs
const regex = /\["([a-zA-Z0-9_-]{25,})",\["([^"]+)"/g;
let match;
const items = [];
while ((match = regex.exec(html)) !== null) {
  items.push({ id: match[1], name: match[2] });
}
console.log("Found matched items via regex:", items.length);
const unique = new Map();
for (const it of items) {
  if (!unique.has(it.name) && it.name.length > 2) {
    unique.set(it.name, it);
  }
}
console.log("Unique items:");
for (const [name, it] of unique.entries()) {
  console.log(`- [${it.id}] ${name}`);
}
