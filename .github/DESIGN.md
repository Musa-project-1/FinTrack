---
version: 2.0
name: Finkas Hybrid Kinetic
description: "Trust-first community cashbook & dues ledger combining Hybrid Kinetic translucent cards (20px radii, soft elevation), 4 switchable color harmonies (cobalt default, terracotta, charcoal, indigo), self-hosted Plus Jakarta Sans + JetBrains Mono typography, role-asymmetric spotlights, and a tactile 13-column dues matrix."

colors:
  primary: "#0047e0"
  primary-hover: "#0039b8"
  primary-ocean: "#0052ff"
  accent-seafoam: "#60a5fa"
  accent-ink-dark: "#051229"
  on-primary: "#f8fafe"
  canvas: "#f4f7fb"
  canvas-ocean: "#f3f6fb"
  surface: "#fafcfe"
  surface-ocean: "#ffffff"
  surface-2: "#ebf1f8"
  surface-3: "#dce6f2"
  border-hairline: "#d5e0ee"
  border-strong: "#b4c6df"
  ink: "#0b1526"
  ink-muted: "#4b5c74"
  ink-faint: "#52637a"
  dark-canvas: "#080d16"
  dark-surface: "#101726"
  dark-surface-2: "#172136"
  dark-ink: "#eef4fc"
  dark-ink-muted: "#93a6c4"
  income: "#0284c7"
  income-strong: "#0369a1"
  danger: "#be123c"
  warning: "#b45309"

typography:
  display-hero:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  table-title:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 22px
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  balance-hero:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  ledger-stamp:
    fontFamily: "JetBrains Mono"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "0.04em"
    fontFeature: "tnum"
  heading-section:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0px"
  body-medium:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0px"
  button:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0px"
  caption:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0px"

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  2xl: 14px
  card: 20px
  pill: 999px

spacing:
  sp-1: 4px
  sp-2: 8px
  sp-3: 12px
  sp-4: 16px
  sp-6: 24px
  sp-8: 32px
  sp-12: 48px
  sp-18: 72px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 10px 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 10px 16px
  button-dark-accent:
    backgroundColor: "{colors.accent-seafoam}"
    textColor: "{colors.accent-ink-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 10px 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 10px 16px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 10px 16px
  ledger-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: 20px
  ledger-table-header:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 10px 12px
  ledger-row-alt:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.xs}"
    padding: 10px 12px
  ledger-canvas-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-faint}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 16px
  ledger-hairline-pill:
    backgroundColor: "{colors.border-hairline}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  ledger-strong-badge:
    backgroundColor: "{colors.border-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 4px 8px
  dark-balance-card:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.balance-hero}"
    rounded: "{rounded.card}"
    padding: 20px
  dark-panel-elevated:
    backgroundColor: "{colors.dark-surface-2}"
    textColor: "{colors.dark-ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 16px
  dark-shell:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.display-hero}"
    rounded: "{rounded.card}"
    padding: 32px
  stamp-paid:
    backgroundColor: "{colors.income}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ledger-stamp}"
    rounded: "{rounded.xs}"
    padding: 3px 6px
  badge-overdue:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
---

## Overview

Finkas uses the **Hybrid Kinetic** design system (`css/modules/tokens.css`, `css/modules/hybrid-layout.css`, `css/modules/hybrid-workspace.css`, `css/modules/bento-dashboard.css`), combining translucent card surfaces with crisp `1px solid var(--border)` hairlines, tabular financial precision, and playful community touches:

1. **Four Color Harmonies (`data-palette`):** Default **`cobalt`** (`#0047e0` / `#f4f7fb` light, `#60a5fa` / `#080d16` dark), plus user-selectable **`terracotta`**, **`charcoal`**, and **`indigo`**, built over the `:root` Ocean Ledger fallback (`#0052ff` / `#f3f6fb`).
2. **Three Canvas Stages (`data-canvas`):** **`aurora`** (default ambient glow orbs in `#bg-stage`), **`topo`** (contour waves), **`paper`** (ledger dot grid), and **`clean`** (flat surface).
3. **Self-Hosted Editorial & Tabular Typography (`css/modules/typography.css`):** `Plus Jakarta Sans` (`500–800`) drives all UI labels, display titles, and container-scaled Bento hero balances (`#ui-saldo`), while `JetBrains Mono` (`500–700`, `tabular-nums`) anchors matrix stamps, IDs, keyboard hints, and ledger amounts.

## Colors

- **Default Cobalt Light Mode (`body[data-palette="cobalt"]`):**
  - `--bg-color`: `#F4F7FB` · `--surface`: `#FAFCFE` · `--surface-2`: `#EBF1F8` · `--surface-3`: `#DCE6F2`
  - `--border`: `#D5E0EE` · `--border-strong`: `#B4C6DF`
  - `--text-main`: `#0B1526` · `--text-muted`: `#4B5C74` · `--text-faint`: `#52637A` (`>= 5.0:1` WCAG AA on `--surface-2`)
  - `--accent`: `#0047E0` · `--accent-strong`: `#0039B8` · `--income`: `#0284C7`
- **Default Cobalt Dark Mode (`body[data-palette="cobalt"].dark-mode`):**
  - `--bg-color`: `#080D16` · `--surface`: `#101726` · `--surface-2`: `#172136` · `--surface-3`: `#202E4A`
  - `--text-main`: `#EEF4FC` · `--text-muted`: `#93A6C4` · `--text-faint`: `#788CAE`
  - `--accent`: `#60A5FA` · `--accent-strong`: `#93C5FD` · `--income`: `#38BDF8`
- **Additional Palettes:** `terracotta` (`#C84628` / `#FAF8F6`), `charcoal` (`#181A20` / `#F7F7F9`), and `indigo` (`#4338CA` / `#F6F6FB`) in `css/modules/tokens.css`.
- **Ledger Semantics:**
  - Inflow (`+`): `--income` (`+Rp`).
  - Outflow (`-`): Always uses `--text-main` prefixed with a true minus (`−Rp`), never red text.
  - Destructive (`--danger` `#be123c`): Reserved for delete/logout actions; Overdue (`--warning` `#b45309`): Reserved for priority arrears accents.

## Typography

- **Primary UI & Display (`--font-sans`):** `'Plus Jakarta Sans'` for headers, cards, modal titles, controls, and container-responsive `.bento-amount` / `.bento-money` figures (`tnum` enabled).
- **Monospace Data (`--font-mono`):** `'JetBrains Mono'` with mandatory `font-variant-numeric: tabular-nums` (`tnum`) for matrix `PAID` stamps, `.ledger-amt`, `.master-id-pill`, `.audit-time`, `.workspace-kbd-hint`, and `#bento-spark-value`.
- **Minimum Readability Floor:** Functional labels, status badges, and compact action pills maintain `>= 11px` font size (`11px`–`12px` minimum).

## Layout & Workspace

- **Spacing & Container Scale:** 4px base unit (`--sp-1: 4px` up to `--sp-18: 72px`, modal padding `24px`).
- **3-Card Bento Dashboard:** `#bento-balance` (hero balance + 12-month scrubbable sparkline + annual compliance bar), `#bento-inflow`, and `#bento-outflow` drill-down cards.
- **Role-Asymmetric Spotlight:** Non-admin members see `#member-spotlight` ("Pantau Iuran Saya" with inline month status preview & action CTA); admins see `#admin-priorities` ("Tunggakan Prioritas" + contextual `Pilih Banyak`).
- **Tabbed Workspace (`#workspace-iuran`, `#workspace-history`, `#workspace-stats`):**
  - `Status Iuran` preserves the **13-column** matrix (`Anggota` + `Jan`–`Des`) paired with compact `.dues-pagination` controls (`#dues-pagination`).
  - `Riwayat Arus Kas` renders chronological ledger cards paired with `.dues-pagination` (`#history-pagination`) and the slide-over `#modal-struk` digital receipt drawer.
- **Responsive Modals & Bottom Sheets:** Native `<dialog class="modal-overlay hybrid-dialog">` elements convert into swipeable bottom sheets (`touch-action: pan-y`) at `<= 768px`.

## Elevation & Shapes

- **Hybrid Card Elevation (`--shadow-card`):** `0 12px 30px -8px rgba(0, 0, 0, 0.07), 0 2px 6px -1px rgba(0, 0, 0, 0.03)` paired with `color-mix(in oklab, var(--surface) 90%, transparent)` and `1px solid var(--border)`.
- **Floating Layer Elevation (`--shadow-pop`):** `0 16px 36px -8px rgba(0, 0, 0, 0.16), 0 4px 10px -2px rgba(0, 0, 0, 0.06)` on modals, `.cdrop-list`, `.dpick-pop`, bottom sheets, and toasts.
- **Border Radii:** Major `.hybrid-card` containers (`.bento-kpi`, `.spotlight`, `#section-rekap`, `#workspace-history > .modal-content`, `#workspace-stats > .modal-content`) use `20px`; controls and inputs use `10px–14px` (`--r-lg` to `14px`); pills and badges use `999px` (`--r-pill`); table cells and stamps use `4px–6px` (`--r-xs`/`--r-sm`).

## Components

- **Buttons:** Tactile press uses restrained `scale(0.97)` (`100ms` press, `180ms cubic-bezier(0.32, 0.72, 0, 1)` release). Disabled/busy states suppress transforms.
- **Custom Controls (`.cdrop`, `.mpick`, `.dpick`):** Enhanced via `src/ui/control-a11y.js` to keep native `<select>`/`<input>` constraint validation, `aria-invalid`, and keyboard interactions intact.
- **Command Hub (`#modal-menu`):** Triggered via `#btn-header-menu`, `.workspace-jump`, or `Ctrl+K` / `Cmd+K` shortcut, focusing `#search-nav-menu` on desktop viewports.
- **Kasi Mascot (`#kasi-dock`):** Interactive cash-cat companion perched cleanly across dashboard ledges with radial quick actions (`Elus`, `Koin`, `Ikan`, `Salto`, `Trik`, `Panduan`).

## Do's and Don'ts

- **Do** reference canonical CSS variables from `css/modules/tokens.css` (`var(--surface)`, `var(--surface-2)`, `var(--surface-3)`, `var(--border)`, `var(--accent)`).
- **Do** keep `css/onboarding.css` (`--lp-*` tokens) strictly isolated from `css/input.css` and `style.css` (Guardrail G1/G2).
- **Do** run `npm run build && npm run verify && npm test` after any UI or stylesheet change.
- **Don't** invent non-existent token names such as `var(--surface-card)` or `var(--surface-hover)`.
- **Don't** color expense amounts red; expenses use `var(--text-main)` with a leading minus sign (`−`).
