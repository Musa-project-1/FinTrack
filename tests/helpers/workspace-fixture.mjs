import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const stripBlocks = (src) =>
  src
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>\s*/g, '');

const MODAL_FILES = [
  'AuthModals.svelte',
  'GroupsModal.svelte',
  'GroupPinModal.svelte',
  'GroupAdminModals.svelte',
  'NavigationModals.svelte',
  'QuickPayModal.svelte',
  'MasterModals.svelte',
  'ReportsModals.svelte',
  'TransactionsModals.svelte',
  'FaqModals.svelte',
  'TampilanModal.svelte',
  'SelfPayModal.svelte',
  'StrukModal.svelte',
];

let cachedHtml = null;

/**
 * Build a full Workspace DOM fixture from the Svelte shell & modal components
 * for legacy JSDOM-based Node tests while `index.html` is a clean `<div id="app">`.
 */
export function readWorkspaceFixtureHtml() {
  if (cachedHtml) return cachedHtml;
  const shell = stripBlocks(
    fs.readFileSync(path.join(ROOT, 'src/svelte/shell/WorkspaceShell.svelte'), 'utf8')
  );
  const modals = MODAL_FILES
    .map((file) =>
      stripBlocks(fs.readFileSync(path.join(ROOT, 'src/svelte/shell/modals', file), 'utf8')).trim()
    )
    .join('\n\n');
  const body = shell.replace('{@render modals?.()}', () => modals);
  cachedHtml = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Finkas</title></head><body data-palette="cobalt" data-canvas="aurora" data-workspace-state="loading">${body}</body></html>`;
  return cachedHtml;
}
