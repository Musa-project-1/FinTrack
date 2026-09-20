/**
 * Build script for assembling index.html from modular HTML fragments.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const templatePath = path.join(rootDir, 'html', 'index.template.html');
const modalsDir = path.join(rootDir, 'html', 'modals');
const outputPath = path.join(rootDir, 'index.html');

const modalFiles = [
  'auth.html',
  'groups.html',
  'group-pin.html',
  'group-admin.html',
  'navigation.html',
  'master.html',
  'reports.html',
  'riwayat.html',
  'transactions.html',
  'faq.html',
  'tampilan.html'
];

const dirFiles = fs.readdirSync(modalsDir).filter(f => f.endsWith('.html'));
const dirSet = new Set(dirFiles);
const declaredSet = new Set(modalFiles);

for (const file of modalFiles) {
  if (!dirSet.has(file)) {
    throw new Error(`[build:html] Declared modal fragment "${file}" does not exist in ${modalsDir}`);
  }
}

for (const file of dirFiles) {
  if (!declaredSet.has(file)) {
    throw new Error(`[build:html] Found untracked modal fragment "${file}" in ${modalsDir} that is not listed in modalFiles.`);
  }
}

let template = fs.readFileSync(templatePath, 'utf8');

const modalsContent = modalFiles
  .map(file => {
    const filePath = path.join(modalsDir, file);
    return `  <!-- === Modal Module: ${file} === -->\n` + fs.readFileSync(filePath, 'utf8').trim();
  })
  .join('\n\n');

const marker = '<!-- @@INJECT_MODALS@@ -->';
if (!template.includes(marker)) {
  throw new Error(`[build:html] Marker "${marker}" not found in ${templatePath}`);
}
const finalHtml = template.replace(marker, () => modalsContent);
fs.writeFileSync(outputPath, finalHtml, 'utf8');

console.log(`[build:html] Successfully assembled index.html (${finalHtml.split('\n').length} lines) from ${modalFiles.length} modular fragments.`);
