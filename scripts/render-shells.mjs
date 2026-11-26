import fs from 'node:fs';
import path from 'node:path';
import { compile } from 'svelte/compiler';

const ROOT = path.resolve(import.meta.dirname, '..');
const swSource = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swVerMatch = /const CACHE_NAME = 'finkas-v(\d+)';/.exec(swSource);
if (!swVerMatch) throw new Error('[render-shells] Could not read CACHE_NAME version from sw.js');
const v = swVerMatch[1];

const indexHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Finkas</title>
  <meta name="description" content="Aplikasi Manajemen Kas & Iuran Anggota">
  <meta name="theme-color" content="#f4f7fb">

  <!-- Social Preview / Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Finkas">
  <meta property="og:title" content="Finkas: Pembukuan Kas & Iuran Anggota">
  <meta property="og:description" content="Pembukuan kas kelompok yang sederhana, rapi, dan terbuka.">
  <meta property="og:image" content="icons/icon-512.png">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Finkas: Pembukuan Kas & Iuran Anggota">
  <meta name="twitter:description" content="Pembukuan kas kelompok yang sederhana, rapi, dan terbuka.">
  <meta name="twitter:image" content="icons/icon-512.png">

  <!-- PWA Meta Tags -->
  <link rel="manifest" href="manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="icons/icon-192.png">

  <link rel="stylesheet" href="fonts/phosphor/phosphor.css">
  <link rel="icon" type="image/svg+xml" href="icons/favicon.svg">
</head>
<body data-palette="cobalt" data-canvas="aurora" data-workspace-state="loading">
  <script src="src/workspace-boot-theme.js?v=${v}"></script>
  <div id="app"></div>

  <script type="module" src="/src/entries/workspace.ts"></script>
  <script src="src/sw-register.js?v=${v}" defer></script>
</body>
</html>\n`;

const onboardingHtml = `<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Finkas - Pembukuan Kas Komunitas Modern &amp; Terbuka</title>
  <meta name="description" content="Pembukuan kas kelompok yang sederhana, rapi, dan terbuka untuk RT/RW, kas kelas, dan arisan.">
  <meta id="meta-theme-color" name="theme-color" content="#faf8f6">

  <!-- Social Preview / Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Finkas">
  <meta property="og:title" content="Finkas - Pembukuan Kas Komunitas Modern &amp; Terbuka">
  <meta property="og:description" content="Pembukuan kas kelompok yang sederhana, rapi, dan terbuka.">
  <meta property="og:image" content="icons/icon-512.png">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Finkas - Pembukuan Kas Komunitas Modern &amp; Terbuka">
  <meta name="twitter:description" content="Pembukuan kas kelompok yang sederhana, rapi, dan terbuka.">
  <meta name="twitter:image" content="icons/icon-512.png">
  <link rel="icon" type="image/svg+xml" href="icons/favicon.svg">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous">

  <script src="src/pages/onboarding-boot-theme.js?v=${v}"></script>
</head>
<body>
  <div id="app"></div>

  <script type="module" src="/src/entries/onboarding.ts"></script>
</body>
</html>\n`;

const privacyHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>Kebijakan Privasi - Finkas</title>
  <meta name="description" content="Kebijakan Privasi dan Perlindungan Data Aplikasi Pembukuan Kas Finkas.">
  <meta name="theme-color" content="#f4f7fb">
  <link rel="icon" type="image/svg+xml" href="icons/favicon.svg">
  <link rel="stylesheet" href="fonts/phosphor/phosphor.css">
</head>
<body class="privacy-page" data-palette="cobalt" data-canvas="aurora">
  <script src="src/workspace-boot-theme.js?v=${v}"></script>
  <div id="app"></div>

  <script type="module" src="/src/entries/privacy.ts"></script>
</body>
</html>\n`;

function collectSvelteFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSvelteFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.svelte')) out.push(full);
  }
  return out;
}

function compileStyleBlock(rel) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!/<style\b/.test(source)) return null;
  const compiled = compile(source, { filename: rel });
  const css = compiled.css?.code?.trim();
  return css ? `/* ${rel} */\n${css}` : null;
}

const featureRelPaths = collectSvelteFiles(path.join(ROOT, 'src', 'svelte'))
  .map((filePath) => path.relative(ROOT, filePath).split(path.sep).join('/'));

const svelteStyleChunks = featureRelPaths.map(compileStyleBlock).filter(Boolean);

const ONBOARDING_CSS_ORDER = [
  'src/styles/onboarding/icons.css',
  'src/styles/onboarding/base.css',
  'src/styles/onboarding/hero-stage.css',
  'src/styles/onboarding/sections.css',
  'src/styles/onboarding/footer-portal.css',
  'src/styles/onboarding/motion.css',
];
const onboardingCssChunks = ONBOARDING_CSS_ORDER.map((rel) =>
  `/* ${rel} */\n${fs.readFileSync(path.join(ROOT, rel), 'utf8').trim()}`
);

const writeIfChanged = (filePath, content) => {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
};

const scopedHeader = '/* Generated from Svelte <style> blocks by scripts/render-shells.mjs. */\n';
fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });
writeIfChanged(
  path.join(ROOT, 'css', 'svelte-scoped.css'),
  scopedHeader + (svelteStyleChunks.length ? `${svelteStyleChunks.join('\n\n')}\n` : '')
);
writeIfChanged(
  path.join(ROOT, 'css', 'onboarding-scoped.css'),
  `/* Generated from src/styles/onboarding/*.css by scripts/render-shells.mjs. */\n${onboardingCssChunks.join('\n\n')}\n`
);

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'onboarding.html'), onboardingHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'privacy.html'), privacyHtml, 'utf8');
fs.copyFileSync(path.join(ROOT, 'src/pages/404.html'), path.join(ROOT, '404.html'));
fs.copyFileSync(path.join(ROOT, 'src/pages/offline.html'), path.join(ROOT, 'offline.html'));
console.log(`[render-shells] Rendered MPA Svelte root shells (index, onboarding, privacy) + CSS at v${v}.`);
