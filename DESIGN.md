---
version: alpha
name: Finkas Ocean Ledger
description: "Trust-first fintech and tactile cashbook system combining Paper Ocean light mode (#e9edf2) and Navy Ocean dark mode (#08131d) with NerdWallet-inspired 1px hairline ledger matrices, Mercury-inspired tabular balance cards, and Oura-inspired editorial serif headers (Fraunces + Inter + JetBrains Mono)."

colors:
  primary: "#0052ff"
  primary-hover: "#0040c9"
  accent-seafoam: "#60a5fa"
  accent-ink-dark: "#041026"
  on-primary: "#ffffff"
  canvas: "#f3f6fb"
  surface: "#ffffff"
  surface-2: "#eaf0f8"
  surface-3: "#dbe5f3"
  border-hairline: "#cbd8ea"
  border-strong: "#9fb6d4"
  ink: "#061b31"
  ink-muted: "#425466"
  ink-faint: "#334659"
  dark-canvas: "#070d19"
  dark-surface: "#0e172a"
  dark-surface-2: "#16223b"
  dark-ink: "#f0f6fc"
  dark-ink-muted: "#94a9c9"
  income: "#047857"
  danger: "#be123c"
  warning: "#92400e"

typography:
  display-hero:
    fontFamily: Fraunces
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.8px"
  table-title:
    fontFamily: Fraunces
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.3px"
  balance-hero:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.6px"
    fontFeature: "tnum"
  ledger-stamp:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "0.6px"
    fontFeature: "tnum"
  heading-section:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.2px"
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0px"
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0px"
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.2px"

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
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
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-dark-accent:
    backgroundColor: "{colors.accent-seafoam}"
    textColor: "{colors.accent-ink-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  ledger-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
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
    rounded: "{rounded.lg}"
    padding: 24px
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
    rounded: "{rounded.lg}"
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

Finkas uses the **Ocean Ledger (Blue Edition)** design system (`css/modules/tokens.css`), synthesizing three reference architectures from `awesome-design-md`:

1. **Coinbase (`coinbase.md`) — Trust-First Action Blue:** Primary interactive accent in saturated Coinbase Blue (`#0052ff` light / `#3b82f6` dark) over cool alabaster-blue (`#f3f6fb`) and midnight navy (`#070d19`) canvases.
2. **Stripe (`stripe.md`) — Deep Navy Ink & Atmospheric Elevation:** Deep navy typography (`#061b31`), tabular-numeral hero balances (`#ui-saldo`), and subtle navy-tinted card elevation (`--shadow-card`).
3. **Oura (`oura.md`) — Editorial Serif Anchors:** High-contrast `Fraunces` serif titles anchor major ledger sections (`.table-title`) against `Inter` UI controls and `JetBrains Mono` financial figures.

## Colors

- **Cool Alabaster Light Mode (`:root`):**
  - `--bg-color`: `{colors.canvas}` (`#f3f6fb`) — eye-comfort cool alabaster canvas.
  - `--surface` / `--surface-2` / `--surface-3`: `{colors.surface}` (`#ffffff`), `{colors.surface-2}` (`#eaf0f8`), `{colors.surface-3}` (`#dbe5f3`).
  - `--border` / `--border-strong`: `{colors.border-hairline}` (`#cbd8ea`) and `{colors.border-strong}` (`#9fb6d4`).
  - `--text-main` / `--text-muted` / `--text-faint`: `{colors.ink}` (`#061b31`), `{colors.ink-muted}` (`#425466`), `{colors.ink-faint}` (`#334659`).
- **Twilight Midnight Dark Mode (`body.dark-mode`):**
  - `--bg-color`: `{colors.dark-canvas}` (`#070d19`) — midnight navy canvas.
  - `--surface` / `--surface-2`: `{colors.dark-surface}` (`#0e172a`), `{colors.dark-surface-2}` (`#16223b`).
  - `--text-main` / `--text-muted`: `{colors.dark-ink}` (`#f0f6fc`), `{colors.dark-ink-muted}` (`#94a9c9`).
- **Single Brand Accent & Ledger Semantics:**
  - Primary Action Blue (`{colors.primary}` `#0052ff` / `#0040c9` light, `{colors.accent-seafoam}` `#60a5fa` / `#3b82f6` dark, default `data-accent="cyan"`) is reserved for primary actions, active states, focus rings, and top card accent bars.
  - Inflow / Paid (`+`): `{colors.income}` (`#047857` / `#059669` light, `#34d399` dark).
  - Outflow (`-`): Always uses `--text-main` (`{colors.ink}`) prefixed with `"−"`, never red text.
  - Destructive (`{colors.danger}` `#be123c`) is strictly for delete/logout actions; Overdue (`{colors.warning}` `#92400e` / `#b45309`) is strictly for late dues.

## Typography

- **Display & Module Titles (`Fraunces`):** Used on `.table-title` ("Status Iuran") and landing page hero headlines (`{typography.display-hero}`, `{typography.table-title}`).
- **Numeric & Ledger Figures (`JetBrains Mono`):** Mandatory `font-variant-numeric: tabular-nums` (`tnum`) on `#ui-saldo` (`{typography.balance-hero}`), cashflow inflows/outflows, month column headers (`JAN`–`DES`), and the rotated `PAID` stamp (`{typography.ledger-stamp}`).
- **UI & Body (`Inter`):** Weights `400`, `500`, `600`, `700` (`display=optional`) for member names, form inputs, filter pills, and action buttons (`{typography.body}`, `{typography.button}`).

## Layout

- **Spacing Scale:** 4px base unit (`--sp-1: 4px` up to `--sp-18: 72px`, modal padding `24px`).
- **Matrix Table Invariant (`Status Iuran`):** Strictly **13 columns** (1 `Nama Anggota` column + 12 calendar months `JAN` through `DES`) in a continuous scrollable ledger with zero pagination controls.
- **Responsive Modal Split:** `.riwayat-split-body` and `.split-transaction-body` use a 2-column split only at `>= 860px` and collapse to a single-column stack below `860px`. `#modal-kelola-master` is always a 1-column vertical stack.
- **Header & Navigation:** Desktop header keeps `flex-wrap: nowrap` with stats pills (`body.header-stats-active`). Below `768px`, primary actions move to the Mobile Bottom Nav.

## Elevation & Depth

- **Zero Card Blur Shadow:** `--shadow-card`, `--shadow-sm`, and `--shadow-md` are `none`. Surface hierarchy is established solely by surface contrast (`--surface` vs `--surface-2`) and `1px solid var(--border)` hairlines.
- **Floating Exception (`--shadow-pop`):** Only true floating layers (modals, `.cdrop-list` dropdowns, bottom sheets, toasts) receive `--shadow-pop` (`0 12px 32px -8px rgba(14, 36, 55, 0.22)` in light mode, `0 16px 40px -8px rgba(0, 0, 0, 0.65)` in dark mode).

## Shapes

- **Tactile Precision Radii:** `--r-xs: 4px` (stamps, table cells), `--r-sm: 6px` (inputs, inner controls), `--r-md: 8px` (buttons, dropdown panels), `--r-lg: 10px` (ledger cards, modals), `--r-pill: 999px` (header filter pills, year selector).
- **Physical Paid Stamp (`.style-paid`):** Rotated `-3deg` to `-4deg` with a `1.5px solid var(--accent)` border and monospace `PAID` label instead of a generic rounded pill badge.

## Components

- **Buttons (`button-primary`, `button-secondary`, `button-danger`):** Press feedback uses restrained `scale(0.97)` (`100ms` press, `180ms cubic-bezier(0.32, 0.72, 0, 1)` release). Never apply `translateY(-2px)` hover lift. Disabled or busy states (`[aria-disabled="true"]`, `[aria-busy="true"]`) suppress all hover and active transforms.
- **Custom Dropdowns (`.cdrop`):** Toggled via `aria-hidden` (never the `hidden` attribute) so CSS opacity/transform transitions (`150ms`) run smoothly. `.cdrop-btn:focus-visible` uses an explicit `2px solid var(--accent)` outline with `2px` offset.
- **Modals:** Overlay fades `200ms` open / `180ms` close; dialog content scales `0.97 -> 1` with `translateY(8px -> 0)` over `220ms cubic-bezier(0.16, 1, 0.3, 1)`.

## Do's and Don'ts

- **Do** reference canonical CSS variables from `css/modules/tokens.css` (`var(--surface)`, `var(--surface-2)`, `var(--surface-3)`, `var(--border)`, `var(--accent)`).
- **Do** keep `css/onboarding.css` (`--lp-*` tokens) strictly isolated from `css/input.css` and `style.css` (Guardrail G1/G2).
- **Do** run `npm run build:css && npm run build:html && npm run check` after any UI or stylesheet change.
- **Don't** invent non-existent token names such as `var(--surface-card)` or `var(--surface-hover)`.
- **Don't** add summary/percentage columns or pagination footers to the 13-column `Status Iuran` matrix table.
- **Don't** color expense amounts red; expenses use `var(--text-main)` with a leading minus sign (`−`).
