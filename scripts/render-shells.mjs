import fs from 'node:fs';
import path from 'node:path';
import { compile } from 'svelte/compiler';

const ROOT = path.resolve(import.meta.dirname, '..');
const stripStyleBlocks = (src) => src.replace(/<style\b[^>]*>[\s\S]*?<\/style>\s*/g, '');
const swSource = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swVerMatch = /const CACHE_NAME = 'finkas-v(\d+)';/.exec(swSource);
if (!swVerMatch) throw new Error('[render-shells] Could not read CACHE_NAME version from sw.js');
const v = swVerMatch[1];

const modalOrder = [
  ['auth.html', 'AuthModals.svelte'],
  ['groups.html', 'GroupsModal.svelte'],
  ['group-pin.html', 'GroupPinModal.svelte'],
  ['group-admin.html', 'GroupAdminModals.svelte'],
  ['navigation.html', 'NavigationModals.svelte'],
  ['master.html', 'MasterModals.svelte'],
  ['reports.html', 'ReportsModals.svelte'],
  ['transactions.html', 'TransactionsModals.svelte'],
  ['faq.html', 'FaqModals.svelte'],
  ['tampilan.html', 'TampilanModal.svelte'],
  ['self-pay.html', 'SelfPayModal.svelte'],
  ['struk.html', 'StrukModal.svelte'],
];

const shellBody = stripStyleBlocks(fs.readFileSync(path.join(ROOT, 'src/svelte/shell/WorkspaceShell.svelte'), 'utf8')).trimEnd();
const modalsContent = modalOrder
  .map(([label, file]) =>
    `  <!-- === Modal Module: ${label} === -->\n` +
    stripStyleBlocks(fs.readFileSync(path.join(ROOT, 'src/svelte/shell/modals', file), 'utf8')).trim()
  )
  .join('\n\n');

const marker = '<!-- @@INJECT_MODALS@@ -->';
if (!shellBody.includes(marker)) {
  throw new Error(`[render-shells] Marker "${marker}" not found in WorkspaceShell.svelte`);
}

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
  <script src="https://accounts.google.com/gsi/client" async defer></script>

  <link rel="icon" type="image/svg+xml" href="icons/favicon.svg">
  <link rel="stylesheet" href="style.css?v=${v}">
</head>
<body data-palette="cobalt" data-canvas="aurora" data-workspace-state="loading">
  <script src="src/workspace-boot-theme.js?v=${v}"></script>
${shellBody.replace(marker, () => modalsContent)}

  <script type="module" src="src/app.js?v=${v}"></script>
  <script src="src/sw-register.js?v=${v}" defer></script>
</body>
</html>\n`;

const onboardingBody = stripStyleBlocks(fs.readFileSync(path.join(ROOT, 'src/svelte/pages/OnboardingShell.svelte'), 'utf8')).trimEnd();
const onboardingHtml = `<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="css/onboarding-scoped.css?v=${v}">
  <script src="src/pages/onboarding-boot-theme.js"></script>
</head>
<body>
${onboardingBody}

  <script type="module" src="src/pages/onboarding.js"></script>
</body>
</html>\n`;

const privacyBody = stripStyleBlocks(fs.readFileSync(path.join(ROOT, 'src/svelte/pages/PrivacyShell.svelte'), 'utf8')).trimEnd();
const privacyHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Kebijakan Privasi - Finkas</title>
  <meta name="description" content="Kebijakan Privasi dan Perlindungan Data Aplikasi Pembukuan Kas Finkas.">
  <meta name="theme-color" content="#f4f7fb">
  <link rel="icon" type="image/svg+xml" href="icons/favicon.svg">
  <link rel="stylesheet" href="fonts/phosphor/phosphor.css">
  <link rel="stylesheet" href="style.css?v=${v}">
</head>
<body class="privacy-page" data-palette="cobalt" data-canvas="aurora">
  <script src="src/workspace-boot-theme.js?v=${v}"></script>

${privacyBody}

  <script type="module" src="src/pages/privacy.js?v=${v}"></script>
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

const PRE_STYLE_ORDER = [
  'src/svelte/shell/styles/TokensStyle.svelte',
  'src/svelte/shell/styles/TypographyStyle.svelte',
  'src/svelte/shell/styles/BaseStyle.svelte',
  'src/svelte/shell/styles/LayoutStyle.svelte',
  'src/svelte/shell/styles/CardsStyle.svelte',
  'src/svelte/shell/styles/ButtonsStyle.svelte',
  'src/svelte/shell/styles/TablesStyle.svelte',
  'src/svelte/shell/styles/FormsStyle.svelte',
  'src/svelte/shell/modals/GroupAdminModals.svelte',
  'src/svelte/modals/SuperAdminList.svelte',
  'src/svelte/shell/styles/ModalsBaseStyle.svelte',
  'src/svelte/shell/styles/ModalsSheetStyle.svelte',
  'src/svelte/shell/styles/ToastsStyle.svelte',
  'src/svelte/shell/styles/HelpersStyle.svelte',
  'src/svelte/shell/styles/CdropStyle.svelte',
  'src/svelte/shell/styles/MpickStyle.svelte',
  'src/svelte/shell/styles/DpickStyle.svelte',
  'src/svelte/shell/styles/ResponsiveTabletStyle.svelte',
];

const POST_STYLE_ORDER = [
  'src/svelte/shell/styles/ResponsiveMobileStyle.svelte',
  'src/svelte/shell/styles/WorkspaceStyle.svelte',
  'src/svelte/shell/styles/KasiMascotStyle.svelte',
  'src/svelte/shell/styles/KasiStageStyle.svelte',
  'src/svelte/shell/styles/HybridLayoutStyle.svelte',
  'src/svelte/shell/styles/HybridMotionStyle.svelte',
  'src/svelte/shell/styles/HybridWorkspaceStyle.svelte',
];

const ONBOARDING_STYLE_ORDER = [
  'src/svelte/pages/onboarding/OnboardingIconsStyle.svelte',
  'src/svelte/pages/onboarding/OnboardingBaseStyle.svelte',
  'src/svelte/pages/onboarding/OnboardingHeroStageStyle.svelte',
  'src/svelte/pages/onboarding/OnboardingSectionsStyle.svelte',
  'src/svelte/pages/onboarding/OnboardingFooterPortalStyle.svelte',
  'src/svelte/pages/onboarding/OnboardingMotionStyle.svelte',
];

function compileStyleBlock(rel) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!/<style\b/.test(source)) return null;
  const compiled = compile(source, { filename: rel });
  const css = compiled.css?.code?.trim();
  return css ? `/* ${rel} */\n${css}` : null;
}

const reserved = new Set([...PRE_STYLE_ORDER, ...POST_STYLE_ORDER, ...ONBOARDING_STYLE_ORDER]);
const featureRelPaths = collectSvelteFiles(path.join(ROOT, 'src', 'svelte'))
  .map((filePath) => path.relative(ROOT, filePath).split(path.sep).join('/'))
  .filter((rel) => !reserved.has(rel));

const svelteStyleChunks = [...PRE_STYLE_ORDER, ...featureRelPaths, ...POST_STYLE_ORDER]
  .map(compileStyleBlock)
  .filter(Boolean);
const onboardingStyleChunks = ONBOARDING_STYLE_ORDER.map(compileStyleBlock).filter(Boolean);

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
  scopedHeader + (onboardingStyleChunks.length ? `${onboardingStyleChunks.join('\n\n')}\n` : '')
);

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'onboarding.html'), onboardingHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'privacy.html'), privacyHtml, 'utf8');
fs.copyFileSync(path.join(ROOT, 'src/pages/404.html'), path.join(ROOT, '404.html'));
fs.copyFileSync(path.join(ROOT, 'src/pages/offline.html'), path.join(ROOT, 'offline.html'));
console.log(`[render-shells] Rendered HTML shells + css/svelte-scoped.css (${svelteStyleChunks.length}) + css/onboarding-scoped.css (${onboardingStyleChunks.length}) at v${v}.`);
