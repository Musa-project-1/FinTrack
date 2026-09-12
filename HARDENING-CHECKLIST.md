# Finkas — Security Hardening Checklist

Every finding in `CODE-REVIEW.md` has been fixed. This file records what changed and how it
was verified.

---

## ✅ Server (`api/`)

- [x] **`api/_sa.js`** — service account + Firestore REST helpers (`fsGet`, `fsPatch`, `fsDelete`, `fsCommit`, `fsListAll`), OAuth token cached across warm invocations, `constantTimeEqual`, recursive `encodeFields`/`decodeFields`. The public-constant token generator is gone. **(C3, W4, W10)**
- [x] **`api/_session.js`** — HMAC-signed sessions with an expiry, `ROLES` plus `canReadGroup`/`canWriteGroup`, scrypt hashing, an upgrade-aware `secretMatches`, Firestore-backed rate limiting, `clientIp`. **(C3, C6, W2)**
- [x] **`api/_store.js`** — one source of truth for collection paths, credential documents, id generation, audit logging, the public group directory and full group deletion. **(W9)**
- [x] **`api/_group-read.js`** — `readGroupData`, `readAuditLog`.
- [x] **`api/_group-write.js`** — every mutation with server-side validation and de-duplication, plus the allow-listed `catatAktivitas` action. **(W7)**
- [x] **`api/data.js`** — the authenticated gateway: public group directory, authorized reads, writes gated on a group-admin or superadmin session. **(C5)**
- [x] **`api/verify-group-pin.js`** — reads the hash only from `private/config`, counts attempts server-side per group and per IP, returns a signed session, migrates a legacy hash to scrypt on first correct use. **(C2, W2)**
- [x] **`api/login.js`** — scrypt verification, timing-safe compares, unconditional rate limiting, no `NODE_ENV` bypass, no credential echoed back, legacy upgrade path. **(C4, C6)**
- [x] **`api/login-google.js`** — no `NODE_ENV` fail-open, no dev-email backdoor, and `list`/`add`/`remove` require a real superadmin session. **(C4, W8)**
- [x] **`api/create-group.js`** — session-only authorization, the `isSuperAdmin` body bypass removed, cryptographically random passwords, group deletion removes nested data. **(C1, C4)**
- [x] **`api/delete-transaction.js`** — deleted; deletion is a `data.js` write action.
- [x] **`firestore.rules`** — denies all direct client access. **(C1, C2, C5, W1)**

## ✅ Client (`js/`)

- [x] **`js/core/config.js`** — API endpoint map, session storage keys, no Firebase client config.
- [x] **`js/core/state.js`** — signed session tokens in `sessionStorage`, a per-group token map, `resolveSessionToken(gid, needsWrite)`, no credential persistence. **(C3, W3)**
- [x] **`js/core/api-client.js`** — `apiPost`, `dataRequest` (with `requiresAuth` for the public directory), `logAuditEvent` restricted to an allow-list. **(W7)**
- [x] **`js/core/api-scope.js`** — deleted. **(W9)**
- [x] **`js/core/api.js`** — no direct Firestore calls; reads, writes, audit and the group directory all go through the gateway.
- [x] **`js/core/api-auth.js`** — password sent once over TLS, verified server-side; only a session token comes back. **(C3, I3)**
- [x] **`js/core/utils.js`** — `hashText` removed (it existed only to hash credentials in the browser). **(I1)**
- [x] **`js/handlers/groups.js`** — no direct Firestore writes, no reading of `pin_hash`, no client-side lockout, no unauthorized `callGroupAdmin` fallback. **(C1, C2, W8)**
- [x] **`js/handlers/auth.js`** — session-based UI, no client-side hashing. **(W3)**
- [x] **`js/handlers/transactions.js`** — `deliverMutation` and `withBusyButton` remove the duplicated submit paths; credential plumbing gone; temp ids use `crypto.randomUUID`.
- [x] **`js/handlers/master.js`** — audit labels completed; unused imports removed. **(I1)**
- [x] **`js/render/rekap.js`** — every interpolation escaped; admin gate uses `getIsAdminSession()`. **(W6)**
- [x] **`js/ui/modal.js`** — inline `onchange` removed; dead exports dropped. **(W5, I1)**
- [x] **`js/app.js`** — no-arg `handleUI()`, delegated `change` listener for the iuran checkboxes, dead imports removed.

## ✅ Build, config and docs

- [x] **`sw.js`** — precache list corrected (`api-client.js` and `handlers/backup.js` added, `api-scope.js` removed), cache bumped to v115. **(I5)**
- [x] **`vercel.json`** — `Content-Security-Policy` with an explicit `script-src`, plus `Cross-Origin-Opener-Policy`; the deprecated `X-XSS-Protection` dropped. **(W5)**
- [x] **`scripts/verify.mjs`** — parses every module, checks the SW precache list against the real module set, and fails if `index.html` is older than its fragments. **(I4, I5)**
- [x] **`package.json`** — `verify`, `test` and `check` scripts.
- [x] **`html/modals/group-pin.html`** — lockout copy corrected (the server locks 5 minutes).
- [x] **`html/modals/faq.html`** — security answer rewritten for the new model.
- [x] **`README.md`** — documents the server-mediated security model and the environment variables the deployment now requires.
- [x] **`CODE-REVIEW.md`** — resolution table mapping every finding to its fix.

## ✅ Tests

The original suite was 14 tests, three of which re-implemented copies of the code they claimed to test. That is now **61 tests** that import the real modules. **(I6)**

- [x] **`tests/session.test.mjs`** — sign/verify round-trip, expiry, tampered payload, tampered signature, malformed tokens, the full authorization matrix, scrypt hashing, `secretMatches` with both hash formats, `clientIp`. **(C3, C4, C6)**
- [x] **`tests/encoding.test.mjs`** — Firestore codec round-trip including numeric and object arrays. **(W10)**
- [x] **`tests/group-write.test.mjs`** — every validation reject path, the collection allow-list, the audit allow-list, iuran de-duplication, and the dispatch table. **(C1, W7)**
- [x] **`tests/state-session.test.mjs`** — client session storage, token resolution, and an assertion that no bearer token ever reaches `localStorage`. **(C3, W3)**
- [x] **`tests/utils.test.mjs`** — `formatRp`, `getInitials`, and stronger `escapeHtml` coverage including the attribute-breaking vector. **(W6)**
- [x] Removed: `rekap.test.mjs`, `group-pin.test.mjs`, `admin-auth.test.mjs`.

## ✅ Verification

- [x] `npm run verify` — **39 files parsed, 26 client modules precached, `index.html` current.**
- [x] `npm test` — **61 passing, 0 failing.**
- [x] `npm run build` — `build:html` (1368 lines from 10 fragments) and `build:css` (Tailwind v4.3.3) both succeed.

---

## ⬜ Remaining — deploy step

- [ ] **`firebase deploy --only firestore:rules`**

  This must ship **together with the new client**, not before it. The rules deny all direct
  browser access, and the currently deployed client still reads Firestore directly — so
  applying the rules on their own would take the live app down. Deploy the client first, or
  both at the same time, then apply the rules.

---

## ⚠️ Known limitations (documented, not fixed)

- **Session tokens live in `sessionStorage`.** Better than persisting a credential in `localStorage` — they are tab-scoped, they expire, and they can be invalidated by rotating the signing secret — but they are still readable by any script on the page. Moving to `HttpOnly` cookies set by the API would remove that class of risk entirely.
- **`FINKAS_SESSION_SECRET` should be set explicitly in production.** Without it the signing secret is derived from the service-account private key; that works, but rotating the key invalidates every active session.
- **Legacy credentials migrate on use.** Existing groups keep `pin_hash` / `admin_password_hash` on the group document until someone enters the PIN or logs in once; the code reads both locations, rewrites the private one, and clears the public copy.
- **CDN scripts are not pinned with SRI.** The CSP restricts which hosts may serve scripts, but a compromised CDN could still serve altered code.
- **Rate limiting writes to `_ratelimit/*`.** It uses the same service account, so no extra configuration is needed, but the write volume is worth watching.
