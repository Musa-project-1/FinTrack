import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const OWNED_STYLE_AND_UI_FILES = [
  'src/svelte/shell/styles/HybridMotionStyle.svelte',
  'src/svelte/shell/styles/KasiMascotStyle.svelte',
  'src/svelte/shell/styles/KasiStageStyle.svelte',
  'src/svelte/shell/styles/ToastsStyle.svelte',
  'src/svelte/shell/styles/ButtonsStyle.svelte',
  'src/svelte/shell/styles/CardsStyle.svelte',
  'src/svelte/shell/styles/TablesStyle.svelte',
  'src/svelte/dashboard/MemberSpotlight.svelte'
];

/** Extract the <style> block contents from a Svelte component. */
function extractStyleBlock(source) {
  const match = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(source);
  return match ? match[1] : '';
}

/** Extract rule blocks inside `@media` headers matching a substring. */
function collectMediaBlocks(cssSource, headerNeedle) {
  const clean = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  let idx = 0;
  while ((idx = clean.indexOf('@media', idx)) !== -1) {
    const braceStart = clean.indexOf('{', idx);
    if (braceStart === -1) break;
    const header = clean.slice(idx, braceStart).replace(/\s+/g, ' ').trim();
    let depth = 1;
    let cursor = braceStart + 1;
    while (cursor < clean.length && depth > 0) {
      if (clean[cursor] === '{') depth += 1;
      else if (clean[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    if (header.includes(headerNeedle)) {
      blocks.push(clean.slice(braceStart + 1, cursor - 1));
    }
    idx = cursor;
  }
  return blocks;
}

/** Collect `:hover` rules containing `transform:` outside `@media (hover: hover) and (pointer: fine)`. */
function collectUnprotectedHoverTransformRules(cssSource) {
  const clean = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
  const violations = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < clean.length; i += 1) {
    if (clean[i] === '{') {
      const header = clean.slice(start, i).replace(/\s+/g, ' ').trim();
      stack.push({ header, bodyStart: i + 1 });
      start = i + 1;
    } else if (clean[i] === '}') {
      const frame = stack.pop();
      if (!frame) continue;
      const body = clean.slice(frame.bodyStart, i);
      const inFineHoverMedia = stack.some(
        (parent) =>
          parent.header.includes('@media') &&
          parent.header.includes('hover: hover') &&
          parent.header.includes('pointer: fine')
      );
      if (frame.header.includes(':hover') && /\btransform\s*:/.test(body) && !inFineHoverMedia) {
        violations.push(frame.header);
      }
      start = i + 1;
    }
  }
  return violations;
}

test('all 8 owned files obey < 750 LOC, Zero Green, zero transition: all, and zero scale(0)', () => {
  for (const rel of OWNED_STYLE_AND_UI_FILES) {
    const src = read(rel);
    const loc = src.split('\n').length - 1;
    assert.ok(loc < 750, `${rel} has ${loc} lines (must stay < 750)`);
    assert.doesNotMatch(src, /#(10b981|008254|f3f7f5)\b/i, `${rel} violates Zero Green`);
    assert.doesNotMatch(src, /transition\s*:\s*all\b/i, `${rel} must not use transition: all`);
    assert.doesNotMatch(src, /\bscale\(\s*0\s*(?:,\s*0\s*)?\)/, `${rel} must not use scale(0)`);
  }
});

test('all 8 owned files enforce >= 11px font-size floor (including badges and clamp floors)', () => {
  for (const rel of OWNED_STYLE_AND_UI_FILES) {
    const style = extractStyleBlock(read(rel)).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of style.matchAll(/font-size\s*:\s*([^;}{]+);/gi)) {
      const expr = match[1].trim();
      for (const pxMatch of expr.matchAll(/([0-9.]+)px\b/gi)) {
        const px = Number(pxMatch[1]);
        assert.ok(px >= 11, `${rel} has sub-11px font-size (${px}px in "${expr}")`);
      }
      for (const remMatch of expr.matchAll(/([0-9.]+)rem\b/gi)) {
        const pxEquiv = Number(remMatch[1]) * 16;
        assert.ok(pxEquiv >= 11, `${rel} has sub-11px rem font-size (${remMatch[0]} = ${pxEquiv}px)`);
      }
    }
  }
});

test('all :hover rules with transform: across owned files are gated in @media (hover: hover) and (pointer: fine)', () => {
  for (const rel of OWNED_STYLE_AND_UI_FILES) {
    const style = extractStyleBlock(read(rel));
    const violations = collectUnprotectedHoverTransformRules(style);
    assert.deepEqual(
      violations,
      [],
      `${rel} has :hover transform rules outside @media (hover: hover) and (pointer: fine): ${violations.join(', ')}`
    );
  }
  const kasiStyle = extractStyleBlock(read('src/svelte/shell/styles/KasiMascotStyle.svelte'));
  const kasiFineBlocks = collectMediaBlocks(kasiStyle, 'pointer: fine').join('\n');
  assert.match(kasiFineBlocks, /\.kasi-fab:hover\s+\.kasi-paw-right/);
  assert.match(kasiFineBlocks, /\.kasi-stage-pet-zone:hover\s+\.kasi-paw-right/);
});

test('KasiMascotStyle pauses infinite animations when startup/dock/body hidden and resets reduced-motion', () => {
  const src = read('src/svelte/shell/styles/KasiMascotStyle.svelte');
  const style = extractStyleBlock(src);
  const clean = style.replace(/\/\*[\s\S]*?\*\//g, '');

  assert.match(clean, /body:not\(\[data-workspace-state="ready"\]\)[\s\S]*?animation-play-state\s*:\s*paused\s*;/);
  assert.match(clean, /#kasi-dock\[hidden\][\s\S]*?animation-play-state\s*:\s*paused\s*;/);
  assert.match(clean, /body\.kasi-hidden[\s\S]*?animation-play-state\s*:\s*paused\s*;/);
  assert.match(clean, /dialog:not\(\[open\]\)[\s\S]*?animation-play-state\s*:\s*paused\s*;/);
  assert.match(clean, /\.kasi-treat\[hidden\]\s+\.kasi-world-treat-svg\s*\{[^}]*animation-play-state\s*:\s*paused\s*;/);

  const reduced = collectMediaBlocks(style, 'prefers-reduced-motion').join('\n');
  assert.match(reduced, /\.kasi-svg[\s\S]*?\.kasi-svg-float[\s\S]*?\.kasi-world-treat-svg\s*\{[^}]*animation\s*:\s*none\s*!important/);
  assert.match(reduced, /will-change\s*:\s*auto\s*;/);
});

test('HybridMotionStyle pauses ambient aurora/topo animations during startup and resets will-change in reduced motion', () => {
  const style = extractStyleBlock(read('src/svelte/shell/styles/HybridMotionStyle.svelte'));
  const clean = style.replace(/\/\*[\s\S]*?\*\//g, '');

  assert.match(
    clean,
    /body:not\(\[data-workspace-state="ready"\]\)\s+:is\(\.aurora-orb,\s*\.topo-svg,\s*\.topo-wave\)[\s\S]*?animation-play-state\s*:\s*paused\s*;/
  );
  assert.match(clean, /body:not\(\[data-canvas="aurora"\]\)\s+\.aurora-orb[\s\S]*?animation-play-state\s*:\s*paused\s*;/);
  assert.match(clean, /body:not\(\[data-canvas="topo"\]\)\s+:is\(\.topo-svg,\s*\.topo-wave\)[\s\S]*?animation-play-state\s*:\s*paused\s*;/);

  const reduced = collectMediaBlocks(style, 'prefers-reduced-motion').join('\n');
  assert.match(reduced, /\.aurora-orb,\s*\.topo-svg,\s*\.topo-wave\s*\{[^}]*animation\s*:\s*none\s*!important/);
  assert.match(reduced, /\.aurora-orb,\s*\.topo-svg\s*\{[^}]*will-change\s*:\s*auto\s*;/);
});

test('MemberSpotlight pauses ring tide wave animations when spotlight is hidden or in admin/startup mode and preserves SVG attrs', () => {
  const src = read('src/svelte/dashboard/MemberSpotlight.svelte');
  const style = extractStyleBlock(src);
  const clean = style.replace(/\/\*[\s\S]*?\*\//g, '');

  assert.match(
    clean,
    /:is\(#member-spotlight\[hidden\],\s*#spotlight-card\[hidden\],[^\n]*\)\s+\.ring-tide-level::before[\s\S]*?animation-play-state\s*:\s*paused\s*;/
  );
  assert.match(
    clean,
    /:is\(#member-spotlight\[hidden\],\s*#spotlight-card\[hidden\],[^\n]*\)\s+\.ring-tide-level::after[\s\S]*?animation-play-state\s*:\s*paused\s*;/
  );
  assert.match(src, /<svg[^>]*class="ring-svg"[^>]*viewBox="0 0 86 86">/);
  assert.match(src, /<circle[^>]*class="ring-track"\s+cx="43"\s+cy="43"\s+r="35"/);
  assert.match(src, /<circle[^>]*class="ring-progress"\s+cx="43"\s+cy="43"[^>]*id="spotlight-ring-arc"[^>]*r="35"/);
});

test('compiled css/svelte-scoped.css retains hidden animation-play-state guards and reduced-motion will-change: auto', () => {
  const compiledPath = path.join(ROOT, 'css/svelte-scoped.css');
  if (!fs.existsSync(compiledPath)) return;
  const compiled = read('css/svelte-scoped.css');
  assert.match(compiled, /#kasi-dock\[hidden\][\s\S]*?animation-play-state\s*:\s*paused/);
  assert.match(compiled, /#member-spotlight\[hidden\][\s\S]*?animation-play-state\s*:\s*paused/);
  assert.match(compiled, /will-change\s*:\s*auto/);
});
