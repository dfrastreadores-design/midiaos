import fs from "node:fs";

const html = fs.readFileSync("drive_response.html", "utf-8");

// Regex to extract aria-label="... Shared folder" and ssk='5:auSv138:<id>-...'
const folderRegex = /aria-label="([^"]+?)\s+Shared folder"[^>]*?ssk='[^']*?:([^'-]+)[^']*'/g;
let m;
const folders = [];
while ((m = folderRegex.exec(html)) !== null) {
  folders.push({
    name: m[1].trim(),
    folderId: m[2].trim(),
    url: `https://drive.google.com/drive/folders/${m[2].trim()}`,
  });
}

console.log(`Found ${folders.length} subfolders:`);
console.log(JSON.stringify(folders, null, 2));
