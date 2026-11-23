import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
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

const shellBody = fs.readFileSync(path.join(ROOT, 'src/svelte/shell/WorkspaceShell.svelte'), 'utf8').trimEnd();
const modalsContent = modalOrder
  .map(([label, file]) =>
    `  <!-- === Modal Module: ${label} === -->\n` +
    fs.readFileSync(path.join(ROOT, 'src/svelte/shell/modals', file), 'utf8').trim()
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

const onboardingBody = fs.readFileSync(path.join(ROOT, 'src/svelte/pages/OnboardingShell.svelte'), 'utf8').trimEnd();
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

  <link rel="stylesheet" href="css/onboarding-icons.css?v=${v}">
  <link rel="stylesheet" href="css/onboarding.css?v=${v}">
  <link rel="stylesheet" href="css/onboarding-hero-stage.css?v=${v}">
  <link rel="stylesheet" href="css/onboarding-sections.css?v=${v}">
  <link rel="stylesheet" href="css/onboarding-footer-portal.css?v=${v}">
  <link rel="stylesheet" href="css/onboarding-motion.css?v=${v}">
  <script src="src/pages/onboarding-boot-theme.js"></script>
</head>
<body>
${onboardingBody}

  <script type="module" src="src/pages/onboarding.js"></script>
</body>
</html>\n`;

const privacyBody = fs.readFileSync(path.join(ROOT, 'src/svelte/pages/PrivacyShell.svelte'), 'utf8').trimEnd();
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
  <link rel="stylesheet" href="css/privacy.css?v=${v}">
</head>
<body class="privacy-page" data-palette="cobalt" data-canvas="aurora">
  <script src="src/workspace-boot-theme.js?v=${v}"></script>

${privacyBody}

  <script type="module" src="src/pages/privacy.js?v=${v}"></script>
</body>
</html>\n`;

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'onboarding.html'), onboardingHtml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'privacy.html'), privacyHtml, 'utf8');
console.log(`[render-shells] Rendered index.html (${indexHtml.split('\n').length} lines), onboarding.html (${onboardingHtml.split('\n').length} lines), and privacy.html (${privacyHtml.split('\n').length} lines) at v${v}.`);
