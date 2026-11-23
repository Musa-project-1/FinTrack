/**
 * @module onboarding-stage
 * Interactive product showcase stage on onboarding.html:
 * precision odometer rollers, Optical Audit Lens slider, 12-month matrix
 * crosshair + stamp buttons, live simulator, and thermal receipt feed.
 */

const el = (id) => document.getElementById(id);

export const INITIAL_DEMO_SALDO = 14850000;

export const formatRp = (num) =>
  'Rp ' + Math.max(0, Math.round(Number(num) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const flashSaldo = (node) => {
  if (!node) return;
  node.classList.remove('is-lp-flash');
  void node.offsetWidth;
  node.classList.add('is-lp-flash');
};

const buildOdometerWrap = (formatted, instant) => {
  const wrap = document.createElement('span');
  wrap.className = 'odo-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  const chars = formatted.split('');
  const digitTotal = chars.filter((c) => /\d/.test(c)).length;
  let seenDigits = 0;

  chars.forEach((ch) => {
    if (/\d/.test(ch)) {
      const slot = document.createElement('span');
      slot.className = 'odo-slot';
      const reel = document.createElement('span');
      reel.className = 'odo-reel';
      const stagger = Math.max(0, digitTotal - 1 - seenDigits);
      seenDigits += 1;
      reel.style.setProperty('--stagger', String(instant ? 0 : stagger));
      reel.style.setProperty('--d', ch);
      for (let n = 0; n <= 9; n += 1) {
        const span = document.createElement('span');
        span.textContent = String(n);
        reel.appendChild(span);
      }
      slot.appendChild(reel);
      wrap.appendChild(slot);
    } else {
      const sep = document.createElement('span');
      sep.className = 'odo-sep';
      sep.textContent = ch;
      wrap.appendChild(sep);
    }
  });
  return wrap;
};

const setOdometerValue = (node, formatted, reducedMotion, instant = false) => {
  if (!node) return;
  node.dataset.value = formatted;
  node.setAttribute('aria-label', formatted);

  if (reducedMotion.matches) {
    node.textContent = formatted;
    return;
  }

  const existingWrap = node.querySelector(':scope > .odo-wrap');
  const chars = formatted.split('');
  const canReuse = existingWrap && existingWrap.children.length === chars.length &&
    Array.from(existingWrap.children).every((child, idx) => {
      const isDigit = /\d/.test(chars[idx]);
      return isDigit
        ? child.classList.contains('odo-slot')
        : child.classList.contains('odo-sep') && child.textContent === chars[idx];
    });

  if (canReuse) {
    const reels = Array.from(existingWrap.querySelectorAll('.odo-reel'));
    const digitChars = chars.filter((c) => /\d/.test(c));
    reels.forEach((reel, idx) => {
      const stagger = Math.max(0, digitChars.length - 1 - idx);
      reel.style.setProperty('--stagger', String(instant ? 0 : stagger));
      reel.style.setProperty('--d', digitChars[idx]);
    });
    return;
  }

  node.replaceChildren(buildOdometerWrap(formatted, instant));
};

const launchLedgerImpulse = (fromEl, toEl, isPositive, reducedMotion, onLand) => {
  if (reducedMotion.matches || !fromEl || !toEl) {
    onLand();
    return;
  }
  const r0 = fromEl.getBoundingClientRect();
  const r1 = toEl.getBoundingClientRect();
  const x0 = r0.left + r0.width / 2;
  const y0 = r0.top + r0.height / 2;
  const x1 = r1.left + Math.min(r1.width * 0.6, 120);
  const y1 = r1.top + r1.height / 2;
  const cx = (x0 + x1) * 0.5 + (x1 >= x0 ? -42 : 42);
  const cy = Math.min(y0, y1) - 64;

  const dot = document.createElement('span');
  dot.className = isPositive ? 'ledger-impulse-dot' : 'ledger-impulse-dot is-neg';
  document.body.appendChild(dot);

  const duration = 340;
  const startedAt = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - startedAt) / duration);
    const t = 1 - Math.pow(1 - p, 3);
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x1;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y1;
    dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(1 - 0.25 * t).toFixed(2)})`;
    dot.style.opacity = String(p < 0.85 ? 1 : Math.max(0.2, (1 - p) / 0.15));
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      dot.remove();
      onLand();
    }
  };
  requestAnimationFrame(step);
};

/** @param {{ reducedMotion?: MediaQueryList, onWave?: (direction: number) => void }} options */
export const initOnboardingStage = ({ reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)'), onWave } = {}) => {
  let currentSaldo = INITIAL_DEMO_SALDO;
  let isBudiPaid = false;
  let hasHeroRolled = false;
  let receiptSeq = 34;

  const wibTimeFmt = (() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (_) {
      return null;
    }
  })();

  const syncAuditBlueprint = () => {
    const formulaEl = el('audit-saldo-formula');
    if (formulaEl) {
      const count = Math.round(currentSaldo / 50000);
      formulaEl.textContent = `${formatRp(currentSaldo)} = ${count} SETORAN × Rp 50.000`;
    }
    const auditBudi = el('audit-budi-badge');
    if (auditBudi) {
      auditBudi.className = isBudiPaid ? 'mock-badge paid' : 'mock-badge unpaid';
      auditBudi.textContent = isBudiPaid ? 'VERIFIED' : 'PENDING';
    }
  };

  const syncDemoBalances = () => {
    const formatted = formatRp(currentSaldo);
    hasHeroRolled = true;
    const heroEl = el('hero-demo-saldo');
    const simEl = el('sim-saldo');
    if (heroEl) { setOdometerValue(heroEl, formatted, reducedMotion, false); flashSaldo(heroEl); }
    if (simEl) { setOdometerValue(simEl, formatted, reducedMotion, false); flashSaldo(simEl); }
    syncAuditBlueprint();
  };

  const pickVisibleBalanceTarget = () => {
    const simEl = el('sim-saldo');
    const heroEl = el('hero-demo-saldo');
    if (!simEl) return heroEl;
    if (!heroEl) return simEl;
    const mid = window.innerHeight * 0.5;
    return Math.abs(simEl.getBoundingClientRect().top - mid) <= Math.abs(heroEl.getBoundingClientRect().top - mid)
      ? simEl
      : heroEl;
  };

  const emitReceiptSlip = (title, amountLabel, isNeg = false) => {
    const stack = el('sim-receipt-stack');
    if (!stack) return;
    receiptSeq += 1;
    const num = String(receiptSeq).padStart(3, '0');
    const timeStr = wibTimeFmt ? `${wibTimeFmt.format(new Date())} WIB` : '11:00 WIB';

    const slip = document.createElement('div');
    slip.className = 'receipt-slip';

    const meta = document.createElement('div');
    meta.className = 'receipt-slip-meta';
    const titleEl = document.createElement('span');
    titleEl.className = 'receipt-slip-title';
    titleEl.textContent = title;
    const subEl = document.createElement('span');
    subEl.className = 'receipt-slip-sub';
    subEl.textContent = `STRUK #${num} · ${timeStr}`;
    meta.append(titleEl, subEl);

    const amtEl = document.createElement('span');
    amtEl.className = isNeg ? 'receipt-slip-amt is-neg' : 'receipt-slip-amt';
    amtEl.textContent = amountLabel;

    slip.append(meta, amtEl);
    stack.prepend(slip);
    while (stack.children.length > 3) stack.lastElementChild?.remove();
  };

  /* Optical Audit Transparency Lens */
  const stageFrameEl = /** @type {HTMLElement | null} */ (document.querySelector('.stage-frame'));
  const lensRail = el('audit-lens-rail');
  const defaultLensPct = () => (window.innerWidth <= 640 ? 85 : 76);
  let lensSweepCancelled = false;

  const setLensPct = (pct) => {
    if (!stageFrameEl) return;
    const clamped = Math.max(4, Math.min(96, pct));
    stageFrameEl.style.setProperty('--lens-x', `${clamped.toFixed(1)}%`);
    lensRail?.setAttribute('aria-valuenow', String(Math.round(clamped)));
  };

  if (window.innerWidth <= 640) {
    lensRail?.setAttribute('aria-valuenow', '85');
  }

  const startAuditLensSweep = () => {
    if (reducedMotion.matches || lensSweepCancelled || !stageFrameEl) return;
    const restPct = defaultLensPct();
    const t0 = performance.now();
    const duration = 1850;
    const step = (now) => {
      if (lensSweepCancelled) return;
      const p = Math.min(1, (now - t0) / duration);
      const half = p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
      const ease = half * half * (3 - 2 * half);
      setLensPct(p < 0.5 ? 94 - (94 - 28) * ease : 28 + (restPct - 28) * ease);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (stageFrameEl && lensRail) {
    let draggingLens = false;
    const moveLensFromClientX = (clientX) => {
      const rect = stageFrameEl.getBoundingClientRect();
      if (rect.width) setLensPct(((clientX - rect.left) / rect.width) * 100);
    };

    lensRail.addEventListener('pointerdown', (e) => {
      lensSweepCancelled = true;
      draggingLens = true;
      lensRail.classList.add('is-dragging');
      lensRail.setPointerCapture?.(e.pointerId);
      moveLensFromClientX(e.clientX);
    });
    lensRail.addEventListener('pointermove', (e) => {
      if (draggingLens) moveLensFromClientX(e.clientX);
    });
    const endLensDrag = () => {
      if (!draggingLens) return;
      draggingLens = false;
      lensRail.classList.remove('is-dragging');
    };
    lensRail.addEventListener('pointerup', endLensDrag);
    lensRail.addEventListener('pointercancel', endLensDrag);
    lensRail.addEventListener('keydown', (e) => {
      const cur = Number(lensRail.getAttribute('aria-valuenow') || 76);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        lensSweepCancelled = true;
        setLensPct(cur + (e.key === 'ArrowLeft' ? -5 : 5));
      }
    });
  }

  /* Matrix Crosshair & Stamp Interaction */
  const matrixTable = document.querySelector('.matrix-table');
  const matrixBody = el('matrix-tbody');
  const matrixHeaders = matrixTable ? Array.from(matrixTable.querySelectorAll('thead th')) : [];

  const clearCrosshair = () => {
    matrixTable?.querySelectorAll('.is-row-active').forEach((n) => n.classList.remove('is-row-active'));
    matrixTable?.querySelectorAll('.is-col-active').forEach((n) => n.classList.remove('is-col-active'));
  };

  const highlightCrosshair = (cell) => {
    if (!matrixTable || !cell) return;
    clearCrosshair();
    cell.closest('tr')?.classList.add('is-row-active');
    const colIdx = cell.cellIndex;
    if (colIdx > 0) {
      matrixHeaders[colIdx]?.classList.add('is-col-active');
      matrixBody?.querySelectorAll('tr').forEach((tr) => tr.cells[colIdx]?.classList.add('is-col-active'));
    }
  };

  matrixBody?.addEventListener('pointerover', (e) => {
    if (!(e.target instanceof Element)) return;
    const td = e.target.closest('td');
    if (td) highlightCrosshair(td);
  });
  matrixBody?.addEventListener('pointerleave', clearCrosshair);
  matrixBody?.addEventListener('focusin', (e) => {
    if (!(e.target instanceof Element)) return;
    const td = e.target.closest('td');
    if (td) highlightCrosshair(td);
  });
  matrixBody?.addEventListener('focusout', (e) => {
    if (!(e.relatedTarget instanceof Node) || !matrixBody.contains(e.relatedTarget)) clearCrosshair();
  });

  document.querySelectorAll('[data-matrix-cell]').forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    btn.addEventListener('click', () => {
      const wasPaid = btn.classList.contains('is-paid');
      const cell = btn.closest('td');
      const row = btn.closest('tr');
      const member = row?.cells?.[0]?.textContent?.trim() || 'Anggota';
      const month = cell && matrixHeaders[cell.cellIndex] ? matrixHeaders[cell.cellIndex].textContent.trim() : 'BLN';

      btn.classList.toggle('is-paid', !wasPaid);
      btn.classList.toggle('is-unpaid', wasPaid);
      btn.textContent = wasPaid ? '−' : 'LUNAS';
      btn.classList.remove('is-toggled', 'is-ink-ripple', 'is-stamped-in');
      void btn.offsetWidth;
      btn.classList.add('is-toggled', 'is-ink-ripple');
      if (!wasPaid) btn.classList.add('is-stamped-in');

      currentSaldo = Math.max(0, currentSaldo + (wasPaid ? -50000 : 50000));
      const msg = el('sim-feedback-msg');
      if (msg) {
        msg.textContent = wasPaid
          ? `Status ${member} (${month}) dibatalkan (−Rp 50.000). Saldo kini ${formatRp(currentSaldo)}.`
          : `${member} (${month}) distempel LUNAS (+Rp 50.000). Saldo kini ${formatRp(currentSaldo)}.`;
      }
      emitReceiptSlip(`${member} · ${month}`, wasPaid ? '−Rp 50.000' : '+Rp 50.000', wasPaid);
      launchLedgerImpulse(btn, pickVisibleBalanceTarget(), !wasPaid, reducedMotion, () => {
        syncDemoBalances();
        onWave?.(wasPaid ? -1 : 1);
      });
    });
  });

  el('sim-btn-add-income')?.addEventListener('click', (e) => {
    currentSaldo += 50000;
    const msg = el('sim-feedback-msg');
    if (msg) msg.textContent = `+Rp 50.000 tercatat. Saldo simulasi sekarang ${formatRp(currentSaldo)}.`;
    emitReceiptSlip('Setoran Iuran Simulasi', '+Rp 50.000', false);
    launchLedgerImpulse(e.currentTarget, el('sim-saldo'), true, reducedMotion, () => {
      syncDemoBalances();
      onWave?.(1);
    });
  });

  el('sim-btn-toggle-dues')?.addEventListener('click', () => {
    isBudiPaid = !isBudiPaid;
    const badge = el('hero-demo-budi-badge');
    if (badge) {
      badge.className = isBudiPaid ? 'mock-badge paid' : 'mock-badge unpaid';
      badge.textContent = isBudiPaid ? 'LUNAS' : 'BELUM';
    }
    syncAuditBlueprint();
    emitReceiptSlip('Status Iuran Budi Santoso', isBudiPaid ? 'LUNAS' : 'BELUM', !isBudiPaid);
    onWave?.(isBudiPaid ? 0.6 : -0.6);
    const msg = el('sim-feedback-msg');
    if (msg) {
      msg.textContent = isBudiPaid
        ? 'Status iuran Budi Santoso diubah menjadi LUNAS.'
        : 'Status iuran Budi Santoso diubah menjadi BELUM bayar.';
    }
  });

  el('sim-btn-reset')?.addEventListener('click', () => {
    currentSaldo = INITIAL_DEMO_SALDO;
    isBudiPaid = false;
    syncDemoBalances();
    const badge = el('hero-demo-budi-badge');
    if (badge) {
      badge.className = 'mock-badge unpaid';
      badge.textContent = 'BELUM';
    }
    document.querySelectorAll('[data-matrix-cell]').forEach((btn) => {
      const isInitialPaid = btn.getAttribute('data-initial') === 'paid';
      btn.classList.toggle('is-paid', isInitialPaid);
      btn.classList.toggle('is-unpaid', !isInitialPaid);
      btn.classList.remove('is-toggled', 'is-ink-ripple', 'is-stamped-in');
      btn.textContent = isInitialPaid ? 'LUNAS' : '−';
    });
    const stack = el('sim-receipt-stack');
    if (stack) stack.replaceChildren();
    receiptSeq = 34;
    onWave?.(0);
    const msg = el('sim-feedback-msg');
    if (msg) msg.textContent = 'Simulasi dan matriks dikembalikan ke saldo awal.';
  });

  setOdometerValue(el('sim-saldo'), formatRp(INITIAL_DEMO_SALDO), reducedMotion, true);
  syncAuditBlueprint();

  return {
    getSaldo: () => currentSaldo,
    startBalanceCountUp: () => {
      const node = el('hero-demo-saldo');
      if (!node || hasHeroRolled) return;
      hasHeroRolled = true;
      startAuditLensSweep();
      if (reducedMotion.matches || currentSaldo !== INITIAL_DEMO_SALDO) {
        setOdometerValue(node, formatRp(currentSaldo), reducedMotion, true);
        return;
      }
      setOdometerValue(node, formatRp(10000000), reducedMotion, true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (currentSaldo === INITIAL_DEMO_SALDO) {
            setOdometerValue(node, formatRp(INITIAL_DEMO_SALDO), reducedMotion, false);
          }
        });
      });
    }
  };
};
