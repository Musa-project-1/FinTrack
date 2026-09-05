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
  'navigation.html',
  'master.html',
  'reports.html',
  'riwayat.html',
  'transactions.html'
];

let template = fs.readFileSync(templatePath, 'utf8');

const modalsContent = modalFiles
  .map(file => {
    const filePath = path.join(modalsDir, file);
    if (fs.existsSync(filePath)) {
      return `  <!-- === Modal Module: ${file} === -->\n` + fs.readFileSync(filePath, 'utf8').trim();
    }
    return '';
  })
  .filter(Boolean)
  .join('\n\n');

const finalHtml = template.replace('<!-- @@INJECT_MODALS@@ -->', modalsContent);
fs.writeFileSync(outputPath, finalHtml, 'utf8');

console.log(`[build:html] Successfully assembled index.html (${finalHtml.split('\n').length} lines) from ${modalFiles.length} modular fragments.`);
