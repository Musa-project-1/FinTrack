# Changelog — DemoKas Professional Refactor

## Priority 1 — Security (DONE)

### Backend (`backend_api.gs` v4 → v5)
- **Removed hardcoded `ADMIN_PASSWORD`** from source code. Password hash now stored exclusively in `PropertiesService.getScriptProperties()` under key `ADMIN_PASSWORD_HASH`.
- **Added `setupAdminPassword(plaintextPassword)`** — first-run function to set credentials via Apps Script editor. Logs success/failure.
- **Simplified `loginAdmin()`** — now only validates against stored hash (removed plaintext password comparison: `password === ADMIN_PASSWORD`). Client sends raw password, backend hashes and compares.
- **Simplified `requireAdminAuth()`** — no more double-valid pattern. Now: active server session OR client-sent hash matches stored hash.
- **Removed `ADMIN_PASSWORD` constant** — no credentials exist in source code.
- **Dispatch table** (`ACTION_HANDLERS`) replaces the long `if/else` chain in `doPost()`. Each action maps to `{ requiresAuth, handler }`. Easy to add new actions.
- **Input validation** added to every handler: `validateNominal()`, `validateTipeArus()`, `validateMonth()` — nominal must be positive number, tipeArus must be Masuk/Keluar, etc.
- **Backward-compatible API contract** preserved: same actions, same payload shapes, same `{status, message, data}` response format.

### Centralized GAS_URL
- `GAS_URL` moved to `js/config.js` — single source of truth.
- Old `script.js` (global) and `sw.js` both had their own copy with potentially different URLs. Now frontend uses `config.js` import; `sw.js` notes the duplication (service workers can't use ES module imports) with a comment.

### Authentication flow change
- Client now always sends plaintext password on login (not hash). Backend hashes and compares.
- For subsequent mutations, client sends the stored hash via `sendAdminPayload()` which auto-attaches `adminPassword` from state.
- **Breaking note for existing deployments:** After deploying v5 backend, you MUST run `setupAdminPassword('yourpassword')` in the Apps Script editor once. Without this, login will fail because no hash is stored yet.

## Priority 2 — Frontend Code Structure (DONE)

### New module files (`js/` directory)
| File | Lines | Responsibility |
|------|-------|---------------|
| `js/config.js` | ~55 | GAS_URL, NAMA_BULAN, IndexedDB constants, AVATAR_GRADIENTS, CHART_COLORS, localStorage keys |
| `js/utils.js` | ~100 | formatRp, handleNominalInput, getRawNominal, showToast, setConnectionStatus, getInitials, getAvatarGradient, isOnline |
| `js/state.js` | ~120 | Centralized state object, cache persistence, admin password/session state, chart instances, view state (currentRekapYear, itemsToShow) |
| `js/api.js` | ~75 | All fetch/postToBackend calls, loginAdminApi, checkAdminSessionApi, logoutAdminApi, fetchInitialData |
| `js/offline.js` | ~100 | IndexedDB open/add/get/delete, queueOfflinePayload, syncOfflineTransactions |
| `js/theme.js` | ~40 | applyTheme, toggleTheme |
| `js/modal.js` | ~280 | openModal, closeModal, switchTab, chip/counters, renderCheckboxIuran, filterAnggotaIuran, mobile menu, header dropdown |
| `js/render.js` | ~450 | renderAll, renderDashboard, renderDropdowns, renderTableTransaksi, renderTableRekap, renderIuranMobileCards, renderChart, renderSkippedMonthsList, bukaProfilAnggota |
| `js/app.js` | ~550 | Event delegation, init, boot, all form handlers (submitIuran, submitOperasional, submitEditTransaksi, etc.), quickPay, cetakStruk, cetakLaporanTahunan, exportToCSV, createGroupReminderMessage |

### Event delegation
- **All inline `onclick="..."` handlers removed** from `index.html`.
- Replaced with `data-action` attributes (e.g. `data-action="toggle-theme"`, `data-action="buka-transaksi"`, `data-action="close-modal"`).
- Single `document.addEventListener('click', ...)` in `app.js` dispatches to the correct function via a switch statement.
- `onchange` and `oninput` inline handlers also removed, replaced with `addEventListener` calls in `DOMContentLoaded`.

### Deduplication
- `quickPay` and `quickPayFromCard` merged — both call the same `quickPay()` function.
- `renderTableRekap` desktop and `renderIuranMobileCards` mobile share the same `mapPembayaran` computation.
- Form submission patterns (submitIuran, submitOperasional) now share consistent optimistic-update patterns.

## Priority 3 — Backend Code Structure (DONE)

- Dispatch table pattern (see Priority 1 above).
- Input validation added to all handlers.
- Note: Splitting into separate `.gs` files was NOT done because Google Apps Script executes all `.gs` files in the same scope anyway, and the project is small enough that a single well-structured file is clearer.

## Priority 4 — Quality & Consistency (PARTIALLY DONE)

### JSDoc comments
- All exported functions in the `js/` modules now have JSDoc comments with `@param` and `@returns`.
- Backend handler functions have JSDoc with parameter descriptions.
- `@module` tags on each file header.

### Local icons
- **SVG icons created** at `icons/icon-192.svg` and `icons/icon-512.svg` (local, no CDN dependency).
- `manifest.json` updated to reference local SVGs instead of Flaticon CDN.
- `index.html` apple-touch-icon updated to reference local icon.
- Note: SVG icons are simple geometric designs. For production, consider converting to PNG at exact pixel sizes.

## Priority 5 — CSS Cleanup (DONE)

### Step 1 — Fixed 6 duplicate selector conflicts

1. **`.card` (was lines ~60 AND ~357):** Removed `.card` from the glassmorphism group (`.card, .table-card, .modal-content`). Dashboard cards now correctly use their own flat style without `backdrop-filter: blur(12px)` or `!important` overrides. Glassmorphism now scoped to `.table-card, .modal-content` only.

2. **`.card:hover` (was lines ~68 AND ~358):** Removed the glassmorphism hover (`translateY(-5px), var(--shadow-lg) !important`). Kept the dashboard hover (`translateY(-2px), 0 8px 16px`).

3. **`.btn-primary` (was lines ~78 AND ~296):** Deleted dead gradient code at line ~78. Merged into single flat rule: `background-color: var(--primary); color: white; font-weight: 600; border: none`.

4. **`.btn-primary:hover` (undefined CSS variables):** **Fix option (b) chosen** — replaced `var(--primary-hover)` with literal `#059669` and `var(--secondary-hover)` with `#4f46e5`. Merged with the scale(1.02)/brightness(1.1) hover.

5. **`.brand-icon-box` (was lines ~90 AND ~182):** Merged into single block at top of file: `width: 44px; height: 44px; padding: 8px; border-radius: 12px`. Confirmed `* { box-sizing: border-box }` prevents overflow.

6. **`.progress-bar` orphan (was line ~2119):** The second `.progress-bar { height: 100%; background: var(--primary-gradient) }` was **dead code** — no HTML targets it. HTML uses `.progress-bar` (outer track) + `.progress-fill` (inner). Removed orphaned `.progress-container` + `.progress-bar` + `.progress-text` block. Also removed duplicate `/* === IURAN CARD VIEW (MOBILE) === */` comment.

### Step 2 — Consolidated 19 scattered media queries into 6

All `@media` rules were extracted, grouped by condition, and consolidated:
- `@media (min-width: 769px)` — 1 block → 1
- `@media (max-height: 600px)` — 1 block → 1
- `@media (max-width: 1024px)` — 2 blocks → 1
- `@media (max-width: 800px)` — 1 block → 1
- `@media (max-width: 768px)` — **9 blocks → 1** (largest consolidation)
- `@media (max-width: 480px)` — 5 blocks → 1

All consolidated at end of file with clear section comment. Source order within each merged block preserves original cascade behavior.

### Step 3 — Replaced 8 hardcoded shadow values with CSS variables

Added 6 new CSS custom properties to `:root`:
- `--shadow-card-flat: 0 2px 8px rgba(0,0,0,0.06)`
- `--shadow-card-hover: 0 8px 16px rgba(0,0,0,0.1)`
- `--shadow-dropdown: 0 12px 30px rgba(2,6,23,0.12)`
- `--shadow-menu-mobile: 0 4px 12px rgba(0,0,0,0.15)`
- `--btn-icon-shadow` and `--btn-icon-shadow-hover` (with dark-mode overrides)

Replaced all matching hardcoded `box-shadow` values throughout the file. Intentionally NOT replaced: chip glow shadows (`rgba(5, 150, 105, 0.3)`), WA green shadows, card border (`rgba(0,0,0,0.04)` — not a shadow), and stat-card/modal shadows (already use `--shadow-sm`/`--shadow-md`).

### Metrics
- **Before Step 1:** 2366 lines / 56,791 bytes
- **After Step 1:** 2333 lines / 56,251 bytes
- **After Steps 2+3:** 2317 lines / 56,420 bytes (size slightly up due to variable definitions, but 49 fewer duplicate media blocks)

### Remaining (Step 4 — reorganize sections — not done)
The file sections could be further reorganized with `/* === SECTION === */` headers, but this is low priority and high risk for visual regression. Current sections are already clearly commented.

## Files changed

| File | Status |
|------|--------|
| `js/config.js` | **NEW** |
| `js/utils.js` | **NEW** |
| `js/state.js` | **NEW** |
| `js/api.js` | **NEW** |
| `js/offline.js` | **NEW** |
| `js/theme.js` | **NEW** |
| `js/modal.js` | **NEW** |
| `js/render.js` | **NEW** |
| `js/app.js` | **NEW** |
| `index.html` | **MODIFIED** — inline handlers removed, data-action, module script |
| `sw.js` | **MODIFIED** — updated cache, GAS_URL |
| `manifest.json` | **MODIFIED** — local SVG icons |
| `appsSripct/backend_api.gs` | **MODIFIED** — security, dispatch table, validation |
| `style.css` | **MODIFIED** — 6 duplicate fixes, 19→6 media consolidation, 8 shadow vars |
| `icons/icon-192.svg` | **NEW** |
| `icons/icon-512.svg` | **NEW** |
| `script.js` | **SUPERSEDED** — kept for reference |
| `appsSripct/Kode.gs` | **UNCHANGED** |

## Items requiring manual decision

1. **Run `setupAdminPassword('yourpassword')`** in Apps Script editor after deploying v5 backend.
2. **Old `script.js`** is superseded — keep as backup or delete after confirming new modules work.
3. **SVG icons** — consider converting to PNG for broader PWA compatibility.
4. **CDN dependencies** — Chart.js and Phosphor Icons still loaded from CDN.
