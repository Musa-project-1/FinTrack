import { getInput } from '../core/utils.js';
import { getActiveGroupId } from '../core/state.js';
import { openModal } from './modal.js';
import { createKasiVectorSvg, launchKasiTreatToPoint, spawnKasiParticles } from './kasi-effects.js';
import { KASI_PET_QUOTES, incrementKasiAffection, initKasiStage, triggerAllMascotAction } from './kasi-stage.js';

const preferenceKey = 'finkas_kasi_visible';
const PERCH_SELECTORS = '.bento-kpi, #spotlight-card:not([hidden]), #admin-priorities:not([hidden]), #section-rekap:not([hidden]), .chart-card';
const FLOAT_TRICKS = [
  { mood: 'happy', cls: 'is-waving', dur: 1700, particles: ['coin', 'star'], msg: { id: 'Sapaan Maneki-neko! Semoga kas lancar!', en: 'Maneki wave! May inflows stay brisk!' } },
  { mood: 'explain', cls: '', dur: 2400, particles: ['star'], msg: { id: 'Kacamata audit siap cek transaksi!', en: 'Audit glasses on to review entries!' } },
  { mood: 'curious', cls: 'is-booped', dur: 700, particles: ['heart', 'star'], msg: { id: 'Boop! Hidung Kasi geli nih!', en: 'Boop! That tickles Kasi\u2019s nose!' } },
  { mood: 'sleepy', cls: '', dur: 3000, particles: [], msg: { id: 'Hoamm~ tidur sebentar dulu...', en: 'Yawn~ quick catnap...' } }
];
const ACTIONS = {
  pet: { mood: 'petting', pose: 'is-purring', dur: 900, particles: ['heart', 'star', 'note'], msg: { id: 'Kasi senang dielus!', en: 'Kasi loves the pets!' } },
  coin: { mood: 'coin', pose: 'is-catching', dur: 680, particles: ['star', 'coin', 'heart'], msg: { id: 'Ting! Koin kas tertangkap!', en: 'Clink! Ledger coin caught!' } },
  fish: { mood: 'happy', pose: 'is-chomping', dur: 620, particles: ['note', 'heart', 'star'], msg: { id: 'Nyam! Ikan segar tertangkap!', en: 'Nom! Fresh fish caught!' } },
  flip: { mood: 'celebrate', pose: 'is-flipping', dur: 820, particles: ['star', 'heart', 'star'], msg: { id: 'Zoomies! Salto kas!', en: 'Zoomies! Happy flip!' } },
  celebrate: { mood: 'coin', pose: 'is-catching', dur: 700, particles: ['star', 'coin', 'heart'], msg: { id: 'Kasi merayakan iuran lunas!', en: 'Kasi celebrates settled dues!' } }
};

let dock, button, halo, bubble, treat, rig;
let enabled = true, suppressClick = false, petCount = 0, trickIdx = 0;
let roamTimer, bubbleTimer, idleTimer, poseTimer, scrollRejoinTimer, syncRafId = 0, syncFromResize = false;
let cancelTreatFlight;
/** @type {{x:number|null, y:number|null, segs:{t:number, d:number, dx:number, dy:number}[], lastFire:number, suppressUntil:number}} */
const hover = { x: null, y: null, segs: [], lastFire: 0, suppressUntil: 0 };
/** @type {{id: number, startX: number, startY: number, x: number, y: number, moved: boolean} | null} */
let drag = null;
const resetHoverRub = (suppressMs = 0) => {
  hover.x = null; hover.y = null; hover.segs = [];
  if (suppressMs > 0) hover.suppressUntil = Math.max(hover.suppressUntil, Date.now() + suppressMs);
};
const roam = {
  x: 0, y: 0, vy: 0, dir: 1, swing: 0, targetSwing: 0,
  pupilX: 0, pupilY: 0, targetPupilX: 0, targetPupilY: 0,
  mode: 'idle', perchedEl: /** @type {Element|null} */ (null), perchOffsetX: 0,
  walkTargetX: 0, walkSpeed: 92,
  /** @type {{sx:number, sy:number, tx:number, ty:number, startAt:number, dur:number, arcH:number, targetEl:Element|null, onArrive:(()=>void)|null} | null} */
  jumpStart: null,
  /** @type {{tx:number, ty:number, speed:number, perchEl:Element|null, onArrive:()=>void} | null} */
  chase: null,
  hovering: false, sleeping: false, lastFrameAt: 0, rafId: 0
};

const isEn = () => document.body?.dataset?.lang === 'en';
const langKey = () => (isEn() ? 'en' : 'id');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, low, high) => Math.max(low, Math.min(v, high));
const sz = () => button?.offsetWidth || (innerWidth <= 768 ? 54 : 64);
const topBottom = () => document.querySelector('.hybrid-topbar')?.getBoundingClientRect().bottom || 58;
const floorY = () => {
  const nav = document.querySelector('.bottom-nav');
  const hasNav = nav?.getClientRects().length;
  const navTop = hasNav ? nav.getBoundingClientRect().top : innerHeight;
  const bottomLimit = hasNav
    ? Math.min(innerHeight - 80, navTop - 12)
    : innerHeight - (innerWidth <= 768 ? 80 : 16);
  return Math.max(70, bottomLimit - sz());
};
const cards = () => [...document.querySelectorAll(PERCH_SELECTORS)].filter((el) => el.getClientRects().length);

const ledgeRect = (el) => {
  if (!el?.isConnected || !el.getClientRects().length) return null;
  const r = el.getBoundingClientRect();
  const s = sz();
  if (r.width < s + 16 || r.height < 36) return null;
  const minX = Math.max(12, r.left + 8);
  const maxX = Math.max(minX, Math.min(innerWidth - s - 12, r.right - s - 8));
  return { el, y: r.top - s + 8, left: r.left, minX, maxX };
};

const perchCandidates = () => {
  const top = topBottom() + 10;
  const floor = floorY() - 12;
  return cards().map(ledgeRect).filter(l => l !== null).filter((l) => l.y >= top && l.y <= floor && l.maxX - l.minX >= 16);
};

const clearTreat = () => {
  cancelTreatFlight?.();
  cancelTreatFlight = undefined;
  if (treat) {
    treat.hidden = true;
    treat.replaceChildren();
  }
};

const hideMiniBubble = () => {
  clearTimeout(bubbleTimer);
  bubbleTimer = undefined;
  if (bubble) bubble.hidden = true;
};

const positionMiniBubble = () => {
  if (!dock || !bubble || bubble.hidden) return;
  const bw = bubble.offsetWidth || 180;
  const bLeft = clamp(roam.x + (sz() - bw) / 2, 10, innerWidth - bw - 10);
  dock.style.setProperty('--kasi-bubble-left', `${bLeft - roam.x}px`);
};

const showMiniBubble = (text, durMs = 2400) => {
  if (!bubble || !text || !halo?.hidden || document.querySelector('#toast-container .toast')) return;
  bubble.textContent = text;
  bubble.hidden = false;
  positionMiniBubble();
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(hideMiniBubble, durMs);
};

const scheduleIdleSleep = () => {
  clearTimeout(idleTimer);
  if (!dock || !rig || dock.hidden) return;
  idleTimer = setTimeout(() => {
    if (!dock.hidden && !drag && halo.hidden && !roam.hovering && roam.mode === 'idle' && rig.dataset.mood === 'idle') {
      roam.sleeping = true;
      rig.dataset.mood = 'sleepy';
    }
  }, 24000);
};

const wakeUp = () => {
  if (roam.sleeping || rig?.dataset.mood === 'sleepy') {
    roam.sleeping = false;
    if (rig) rig.dataset.mood = 'idle';
  }
  scheduleIdleSleep();
};

const setHalo = (shown) => {
  halo.hidden = !shown;
  dock.classList.toggle('has-halo', shown);
  button.setAttribute('aria-expanded', String(shown));
  resetHoverRub(500);
  if (shown) {
    roam.walkTargetX = roam.x;
    if (roam.mode === 'walk') roam.mode = 'idle';
    hideMiniBubble();
  }
  wakeUp();
};

const applyTransform = () => {
  if (!dock || !rig) return;
  const s = sz();
  const tx = roam.mode === 'idle' ? Math.round(roam.x) : Number(roam.x.toFixed(1));
  const ty = roam.mode === 'idle' ? Math.round(roam.y) : Number(roam.y.toFixed(1));
  dock.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  dock.classList.toggle('halo-below', roam.y < 125);
  dock.classList.toggle('is-perched', Boolean(roam.perchedEl) && roam.mode !== 'drag');
  const haloWidth = Math.min(innerWidth <= 440 ? 260 : 378, innerWidth - 20);
  const haloLeft = clamp(roam.x + (s - haloWidth) / 2, 10, innerWidth - haloWidth - 10);
  dock.style.setProperty('--kasi-halo-left', `${haloLeft - roam.x}px`);
  positionMiniBubble();

  rig.style.setProperty('--kasi-dir', String(roam.dir));
  rig.style.setProperty('--swing-deg', `${(roam.swing * roam.dir).toFixed(1)}deg`);
  rig.classList.toggle('is-walking', roam.mode === 'walk' || roam.mode === 'chase');
  rig.classList.toggle('is-jumping', roam.mode === 'jump' && !rig.classList.contains('is-flipping'));
  rig.classList.toggle('is-dangling', roam.mode === 'drag');
  for (const pupil of rig.querySelectorAll('[data-kasi-pupil]')) {
    pupil.style.transform = `translate(${roam.pupilX.toFixed(2)}px, ${roam.pupilY.toFixed(2)}px)`;
  }
};

const scheduleNextRoam = (delay = 2800 + Math.random() * 2700) => {
  clearTimeout(roamTimer);
  if (!dock || dock.hidden || reduced()) return;
  roamTimer = setTimeout(pickNextRoam, delay);
};

const resetTransientPose = () => {
  clearTimeout(poseTimer);
  poseTimer = undefined;
  if (!rig) return;
  rig.classList.remove('is-catching', 'is-chomping', 'is-flipping', 'is-purring', 'is-booped', 'is-dizzy');
  rig.dataset.mood = roam.sleeping ? 'sleepy' : 'idle';
  scheduleIdleSleep();
};

const triggerPose = (mood, pose, durMs = 700, particles = [], bubbleText = '') => {
  wakeUp();
  resetTransientPose();
  rig.dataset.mood = mood || 'idle';
  if (pose) {
    rig.classList.remove(pose);
    void rig.getBoundingClientRect();
    rig.classList.add(pose);
  }
  if (particles.length) spawnKasiParticles(button, particles, particles.length);
  if (bubbleText) {
    const feedback = document.getElementById('kasi-feedback');
    if (feedback) feedback.textContent = bubbleText;
    showMiniBubble(bubbleText, 2400);
  }
  poseTimer = setTimeout(resetTransientPose, durMs);
};

const startJump = (tx, ty, targetEl, opts = {}) => {
  const s = sz();
  const minX = 12;
  const maxX = Math.max(minX, innerWidth - s - 12);
  const clampedX = clamp(tx, minX, maxX);
  roam.dir = clampedX >= roam.x ? 1 : -1;
  roam.perchedEl = null;
  roam.perchOffsetX = 0;
  if (reduced()) {
    roam.x = clampedX;
    roam.y = ty;
    roam.perchedEl = targetEl || null;
    if (targetEl) { const l = ledgeRect(targetEl); roam.perchOffsetX = l ? roam.x - l.left : 0; }
    roam.mode = 'idle';
    applyTransform();
    opts.onArrive?.();
    return;
  }
  roam.mode = 'jump';
  roam.jumpStart = {
    sx: roam.x, sy: roam.y, tx: clampedX, ty,
    startAt: performance.now(), dur: opts.dur || 560, arcH: opts.arcH ?? 46,
    targetEl: targetEl || null, onArrive: opts.onArrive || null
  };
  applyTransform();
  ensureLoop();
};

const perchesAt = x => perchCandidates().filter(c => x >= c.minX - 10 && x <= c.maxX + 10);

const nearestPerch = (x, curY, tolerance) => {
  /** @type {ReturnType<typeof ledgeRect>} */
  let best = null;
  let bestDist = Infinity;
  for (const perch of perchesAt(x)) {
    const distance = Math.abs(curY - perch.y);
    if (distance <= tolerance && distance < bestDist) { bestDist = distance; best = perch; }
  }
  return best;
};

const findDropTarget = (x, curY) =>
  perchesAt(x).filter(c => c.y >= curY - 6).sort((a, b) => a.y - b.y)[0] || { el: null, y: floorY() };

const paused = () => reduced() || document.hidden || Boolean(document.querySelector('dialog[open]')) ||
  !halo?.hidden || roam.hovering || roam.sleeping;

function pickNextRoam() {
  if (!dock || dock.hidden || paused() || roam.mode !== 'idle') return scheduleNextRoam();
  const cands = perchCandidates();
  const floor = floorY();
  const s = sz();

  if (!roam.perchedEl && cands.length && Math.random() < 0.5) {
    const c = cands[Math.floor(Math.random() * cands.length)];
    startJump(c.minX + Math.random() * (c.maxX - c.minX), c.y, c.el, {
      dur: 580, arcH: 48, onArrive: () => triggerPose('idle', 'is-booped', 440, ['star'])
    });
    return scheduleNextRoam();
  }
  if (roam.perchedEl && Math.random() < 0.35) {
    const fx = clamp(roam.x + (Math.random() * 120 - 60), 12, Math.max(12, innerWidth - s - 12));
    startJump(fx, floor, null, {
      dur: 520, arcH: 34, onArrive: () => triggerPose('idle', 'is-booped', 440, ['star'])
    });
    return scheduleNextRoam();
  }
  const active = roam.perchedEl ? ledgeRect(roam.perchedEl) : null;
  const minX = active ? active.minX : 12;
  const maxX = active ? active.maxX : Math.max(12, innerWidth - s - 12);
  if (maxX - minX >= 40) {
    const sign = (roam.x - minX > maxX - roam.x) ? -1 : 1;
    const tx = clamp(roam.x + sign * Math.min(maxX - minX, 55 + Math.random() * 110), minX, maxX);
    if (Math.abs(tx - roam.x) >= 24) {
      roam.mode = 'walk';
      roam.walkTargetX = tx;
      roam.walkSpeed = 78 + Math.random() * 40;
      roam.dir = tx >= roam.x ? 1 : -1;
      applyTransform();
      ensureLoop();
      return;
    }
  }
  scheduleNextRoam();
}

const syncBounds = (fromResize = false) => {
  if (!dock || dock.hidden || roam.mode === 'drag' || roam.mode === 'jump' || roam.mode === 'fall' || roam.mode === 'chase') return;
  const floor = floorY();
  const l = roam.perchedEl ? ledgeRect(roam.perchedEl) : null;
  if (l && l.y <= floor && !(fromResize && l.y < topBottom() + 4)) {
    roam.y = l.y;
    roam.x = clamp(l.left + roam.perchOffsetX, l.minX, l.maxX);
    if (l.y < topBottom() - sz()) {
      clearTimeout(scrollRejoinTimer);
      scrollRejoinTimer = setTimeout(() => {
        if (roam.perchedEl && !drag && roam.mode === 'idle') {
          roam.perchedEl = null;
          roam.y = floorY();
          roam.x = clamp(roam.x, 12, Math.max(12, innerWidth - sz() - 12));
          applyTransform();
        }
      }, 1800);
    } else clearTimeout(scrollRejoinTimer);
  } else {
    clearTimeout(scrollRejoinTimer);
    roam.perchedEl = null;
    roam.y = floor;
    roam.x = clamp(roam.x, 12, Math.max(12, innerWidth - sz() - 12));
  }
  applyTransform();
};

function tickRoam(now) {
  roam.rafId = 0;
  if (!dock || dock.hidden) return;
  const dt = Math.min(0.12, Math.max(0.004, (now - (roam.lastFrameAt || now)) / 1000));
  roam.lastFrameAt = now;

  // Smooth pupil & drag swing easing
  const pLerp = 1 - Math.exp(-16 * dt);
  if (roam.mode === 'chase' && roam.chase) {
    roam.targetPupilX = clamp((roam.chase.tx - roam.x) / 60, -1.5, 1.5);
    roam.targetPupilY = clamp((roam.chase.ty - roam.y + 8) / 60, -1.5, 1.5);
  }
  roam.pupilX += (roam.targetPupilX - roam.pupilX) * pLerp;
  roam.pupilY += (roam.targetPupilY - roam.pupilY) * pLerp;
  roam.targetSwing *= Math.exp(-10 * dt);
  roam.swing += (roam.targetSwing - roam.swing) * (1 - Math.exp(-18 * dt));

  if (roam.mode === 'jump' && roam.jumpStart) {
    const j = roam.jumpStart;
    const jL = j.targetEl ? ledgeRect(j.targetEl) : null;
    if (jL) { j.ty = jL.y; j.tx = clamp(j.tx, jL.minX, jL.maxX); }
    const t = Math.min(1, (now - j.startAt) / j.dur);
    roam.x = j.sx + (j.tx - j.sx) * t;
    roam.y = j.sy + (j.ty - j.sy) * t - 4 * j.arcH * t * (1 - t);
    if (t >= 1) {
      roam.x = j.tx; roam.y = j.ty; roam.perchedEl = j.targetEl;
      roam.perchOffsetX = jL ? roam.x - jL.left : 0;
      roam.jumpStart = null; roam.mode = 'idle';
      scheduleNextRoam();
      j.onArrive?.();
    }
  } else if (roam.mode === 'fall') {
    const drop = findDropTarget(roam.x, roam.y);
    roam.vy += 1500 * dt;
    roam.y += roam.vy * dt;
    if (roam.y >= drop.y) {
      roam.y = drop.y; roam.vy = 0; roam.perchedEl = drop.el;
      const dL = drop.el ? ledgeRect(drop.el) : null;
      roam.perchOffsetX = dL ? roam.x - dL.left : 0;
      roam.mode = 'idle';
      scheduleNextRoam();
      triggerPose('idle', 'is-booped', 460, ['star', 'star', 'heart']);
    }
  } else if (roam.mode === 'chase' && roam.chase) {
    const ch = roam.chase;
    const cL = ch.perchEl ? ledgeRect(ch.perchEl) : null;
    if (cL) {
      ch.ty = cL.y; ch.tx = clamp(ch.tx, cL.minX, cL.maxX);
      if (treat && !treat.hidden) {
        treat.style.transform = `translate3d(${(ch.tx + sz() / 2 - 14).toFixed(1)}px, ${(ch.ty + sz() - 28).toFixed(1)}px, 0)`;
      }
    }
    const dx = ch.tx - roam.x, dy = ch.ty - roam.y, dist = Math.hypot(dx, dy), step = ch.speed * dt;
    if (dist <= Math.max(6, step)) {
      roam.x = ch.tx; roam.y = ch.ty; roam.perchedEl = ch.perchEl || null;
      roam.perchOffsetX = cL ? roam.x - cL.left : 0;
      roam.chase = null; roam.mode = 'idle';
      scheduleNextRoam();
      ch.onArrive?.();
    } else {
      roam.dir = dx >= 0 ? 1 : -1;
      roam.x += (dx / dist) * step; roam.y += (dy / dist) * step;
    }
  } else if (roam.mode === 'walk') {
    if (paused()) { roam.mode = 'idle'; }
    else {
      const wL = roam.perchedEl ? ledgeRect(roam.perchedEl) : null;
      if (wL) { roam.y = wL.y; roam.walkTargetX = clamp(roam.walkTargetX, wL.minX, wL.maxX); }
      const wdx = roam.walkTargetX - roam.x, wStep = roam.walkSpeed * dt;
      if (Math.abs(wdx) <= wStep + 1) {
        roam.x = roam.walkTargetX; roam.mode = 'idle';
        scheduleNextRoam();
      } else {
        roam.dir = wdx >= 0 ? 1 : -1;
        roam.x += Math.sign(wdx) * wStep;
      }
      if (wL) roam.perchOffsetX = roam.x - wL.left;
    }
  }

  applyTransform();
  const settling = Math.hypot(roam.pupilX - roam.targetPupilX, roam.pupilY - roam.targetPupilY) > 0.02 || Math.abs(roam.swing) > 0.05;
  if (roam.mode !== 'idle' || settling) roam.rafId = requestAnimationFrame(tickRoam);
}

function ensureLoop() {
  if (roam.rafId || reduced() || !dock || dock.hidden) return;
  roam.lastFrameAt = performance.now();
  roam.rafId = requestAnimationFrame(tickRoam);
}

const dockToHome = () => {
  const s = sz();
  roam.perchedEl = null;
  roam.perchOffsetX = 0;
  const first = perchCandidates()[0];
  if (first) {
    roam.perchedEl = first.el;
    roam.x = first.maxX - first.minX >= 100 ? first.maxX - 46 : first.maxX;
    roam.y = first.y;
    roam.perchOffsetX = roam.x - first.left;
  } else {
    roam.x = Math.max(12, innerWidth - s - (innerWidth <= 768 ? 14 : 18));
    roam.y = floorY();
  }
  roam.mode = 'idle';
  applyTransform();
};

const spawnTreatAndChase = (kind) => {
  clearTreat();
  const s = sz();
  const active = roam.perchedEl ? ledgeRect(roam.perchedEl) : null;
  const wide = active && (active.maxX - roam.x >= 130 || roam.x - active.minX >= 130);
  const minX = wide ? active.minX : 12;
  const maxX = wide ? active.maxX : Math.max(12, innerWidth - s - 12);
  const ty = wide ? active.y : floorY();
  const off = 135 + Math.random() * 75;
  const tx = roam.x + off <= maxX ? roam.x + off : clamp(roam.x - off, minX, maxX);
  const wx = tx + s / 2 - 14, wy = ty + s - 28;
  const fromRect = button.getBoundingClientRect();

  const catchTreat = () => {
    clearTreat();
    const spec = ACTIONS[kind];
    const msg = spec.msg[langKey()];
    triggerPose(spec.mood, spec.pose, spec.dur, spec.particles, msg);
    incrementKasiAffection(25, button, showMiniBubble);
  };

  if (reduced()) {
    roam.x = tx; roam.y = ty; roam.perchedEl = wide ? active.el : null;
    roam.perchOffsetX = wide ? roam.x - active.left : 0;
    applyTransform();
    return catchTreat();
  }

  let arrived = false;
  rig.dataset.mood = 'curious';
  cancelTreatFlight = launchKasiTreatToPoint(fromRect, wx, wy, kind, () => {
    cancelTreatFlight = undefined;
    if (arrived || !treat) return;
    treat.replaceChildren(createKasiVectorSvg(kind, 'kasi-world-treat-svg'));
    treat.style.transform = `translate3d(${wx.toFixed(1)}px, ${wy.toFixed(1)}px, 0)`;
    treat.hidden = false;
  });

  roam.perchedEl = wide ? active.el : null;
  roam.perchOffsetX = wide ? roam.x - active.left : 0;
  roam.mode = 'chase';
  roam.dir = tx >= roam.x ? 1 : -1;
  roam.chase = {
    tx, ty, speed: 230, perchEl: wide ? active.el : null,
    onArrive: () => { arrived = true; catchTreat(); }
  };
  applyTransform();
  ensureLoop();
};

export const playKasiAction = (action) => {
  if (!dock || dock.hidden) return;
  if (action !== 'celebrate') setHalo(false);
  wakeUp();

  if (action === 'trick') {
    const t = FLOAT_TRICKS[trickIdx++ % FLOAT_TRICKS.length];
    triggerPose(t.mood, t.cls, t.dur, t.particles, t.msg[langKey()]);
    if (t.cls) triggerAllMascotAction(t.cls, t.dur);
    return;
  }
  if (action === 'coin' || action === 'fish') return spawnTreatAndChase(action);

  const spec = ACTIONS[action];
  if (!spec) return;
  const text = action === 'pet'
    ? KASI_PET_QUOTES[langKey()][petCount++ % KASI_PET_QUOTES[langKey()].length]
    : spec.msg[langKey()];

  triggerPose(spec.mood, spec.pose, spec.dur, spec.particles, text);
  if (action === 'pet') incrementKasiAffection(20, button, showMiniBubble);
  if (action === 'flip' && !reduced()) {
    const cands = perchCandidates();
    const target = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
    const tx = target ? target.minX + Math.random() * (target.maxX - target.minX) : (roam.x > innerWidth * 0.5 ? 28 : innerWidth - sz() - 28);
    startJump(tx, target ? target.y : floorY(), target?.el || null, { dur: 620, arcH: 60 });
  }
};

const dodgeToast = () => {
  if (!dock || dock.hidden || drag || !document.querySelector('#toast-container .toast')) return;
  const r = button.getBoundingClientRect();
  for (const t of document.querySelectorAll('#toast-container .toast')) {
    const tr = t.getBoundingClientRect();
    if (!(r.right <= tr.left - 10 || r.left >= tr.right + 10 || r.bottom <= tr.top - 10 || r.top >= tr.bottom + 10)) {
      const tx = tr.left - sz() - 16 >= 12 ? tr.left - sz() - 16 : roam.x;
      const ty = tr.left - sz() - 16 >= 12 ? floorY() : Math.max(topBottom() + 12, tr.top - sz() - 16);
      startJump(tx, ty, null, { dur: 180, arcH: 22 });
      break;
    }
  }
};

const syncVisibility = () => {
  dock.hidden = !enabled || !getActiveGroupId();
  if (dock.hidden) {
    clearTreat();
    hideMiniBubble();
    clearTimeout(roamTimer);
    clearTimeout(idleTimer);
    clearTimeout(scrollRejoinTimer);
    if (roam.rafId) { cancelAnimationFrame(roam.rafId); roam.rafId = 0; }
    if (syncRafId) { cancelAnimationFrame(syncRafId); syncRafId = 0; }
    setHalo(false);
    resetTransientPose();
  } else {
    dockToHome();
    scheduleIdleSleep();
    scheduleNextRoam(3800 + Math.random() * 1400);
  }
};

export const initKasi = () => {
  dock = document.getElementById('kasi-dock');
  if (!dock) return;
  button = document.getElementById('kasi-fab');
  if (!button) return;
  halo = document.getElementById('kasi-halo');
  bubble = document.getElementById('kasi-mini-bubble');
  treat = document.getElementById('kasi-treat');
  rig = button.querySelector('.kasi-svg');
  const toggle = getInput('kasi-enabled');
  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch {}
  if (toggle) {
    toggle.checked = enabled;
    toggle.addEventListener('change', () => {
      enabled = toggle.checked;
      try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch {}
      syncVisibility();
    });
  }

  button.addEventListener('click', () => { if (!suppressClick) setHalo(halo.hidden); });
  button.addEventListener('dblclick', (e) => { e.preventDefault(); setHalo(false); openModal('modal-faq'); });
  dock.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !halo.hidden) { setHalo(false); button.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!halo.hidden && !dock.contains(e.target)) setHalo(false); });

  button.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    wakeUp();
    resetHoverRub(500);
    const r = button.getBoundingClientRect();
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: r.left, y: r.top, moved: false };
    button.setPointerCapture(e.pointerId);
  });

  button.addEventListener('pointermove', (e) => {
    if (!drag && e.pointerType !== 'touch' && e.buttons === 0) {
      const now = Date.now();
      if (!halo.hidden || now < hover.suppressUntil) {
        resetHoverRub();
        return;
      }
      const dx = hover.x === null ? 0 : e.clientX - hover.x;
      const dy = hover.y === null ? 0 : e.clientY - hover.y;
      const step = Math.hypot(dx, dy);
      hover.x = e.clientX; hover.y = e.clientY;
      if (step > 0 && step < 180) hover.segs.push({ t: now, d: step, dx, dy });
      hover.segs = hover.segs.filter((s) => now - s.t <= 900);
      let total = 0, reversals = 0, prevSx = 0, prevSy = 0;
      for (const s of hover.segs) {
        total += s.d;
        const sx = Math.abs(s.dx) >= 2 ? Math.sign(s.dx) : 0;
        const sy = Math.abs(s.dy) >= 2 ? Math.sign(s.dy) : 0;
        if (sx && prevSx && sx !== prevSx) reversals += 1;
        if (sy && prevSy && sy !== prevSy) reversals += 1;
        if (sx) prevSx = sx;
        if (sy) prevSy = sy;
      }
      if (((reversals >= 1 && total >= 72) || total >= 135) && now - hover.lastFire >= 900) {
        resetHoverRub(300);
        hover.lastFire = now;
        playKasiAction('pet');
      }
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      roam.mode = 'drag';
      roam.perchedEl = null;
      roam.jumpStart = null;
      roam.chase = null;
      clearTreat();
      dock.classList.add('is-grabbed');
      setHalo(false);
      rig.dataset.mood = 'curious';
      showMiniBubble(isEn() ? 'Wheee~ flying!' : 'Waa~ terbang!', 1800);
    }
    roam.targetSwing = clamp(-e.movementX * 1.4, -26, 26);
    roam.x = clamp(drag.x + dx, 12, Math.max(12, innerWidth - sz() - 12));
    roam.y = clamp(drag.y + dy, Math.max(8, topBottom() - 24), floorY());
    applyTransform();
    ensureLoop();
  });

  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = drag.moved;
    drag = null;
    dock.classList.remove('is-grabbed');
    if (!moved) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    roam.targetSwing = 0;
    const snap = nearestPerch(roam.x, roam.y, 26);
    if (snap) {
      roam.perchedEl = snap.el; roam.y = snap.y;
      roam.perchOffsetX = roam.x - snap.left;
      roam.mode = 'idle';
      applyTransform();
      triggerPose('idle', 'is-booped', 460, ['star', 'star', 'heart']);
      scheduleNextRoam();
    } else if (reduced()) {
      const drop = findDropTarget(roam.x, roam.y);
      roam.perchedEl = drop.el; roam.y = drop.y;
      roam.mode = 'idle';
      applyTransform();
    } else {
      roam.mode = 'fall'; roam.vy = 0; rig.dataset.mood = 'idle';
      applyTransform(); ensureLoop();
    }
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(t, endDrag);

  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    roam.hovering = true; wakeUp();
    if (roam.mode === 'walk') { roam.mode = 'idle'; applyTransform(); }
    if (!roam.sleeping && rig.dataset.mood === 'idle') rig.dataset.mood = 'curious';
    rig.classList.add('is-waving');
  });
  button.addEventListener('pointerleave', () => {
    roam.hovering = false; resetHoverRub();
    rig.classList.remove('is-waving');
    if (rig.dataset.mood === 'curious') rig.dataset.mood = 'idle';
    scheduleNextRoam();
  });

  document.addEventListener('pointermove', (e) => {
    if (reduced() || dock.hidden || document.hidden || e.pointerType !== 'mouse' ||
        roam.mode === 'chase' || Boolean(document.querySelector('dialog[open]'))) return;
    const r = rig.getBoundingClientRect();
    roam.targetPupilX = clamp((e.clientX - r.left - r.width / 2) / 110, -1.5, 1.5);
    roam.targetPupilY = clamp((e.clientY - r.top - r.height / 2) / 110, -1.5, 1.5);
    ensureLoop();
  }, { passive: true });

  const scheduleSyncBounds = (fromResize = false) => {
    syncFromResize ||= fromResize;
    if (syncRafId) return;
    syncRafId = requestAnimationFrame(() => {
      syncRafId = 0;
      const resize = syncFromResize;
      syncFromResize = false;
      syncBounds(resize);
    });
  };
  document.addEventListener('scroll', () => { wakeUp(); scheduleSyncBounds(false); }, { passive: true });
  window.addEventListener('resize', () => scheduleSyncBounds(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (roam.rafId) { cancelAnimationFrame(roam.rafId); roam.rafId = 0; }
      clearTimeout(roamTimer);
    } else if (!dock.hidden) {
      roam.lastFrameAt = performance.now();
      scheduleNextRoam();
      if (roam.mode !== 'idle') ensureLoop();
    }
  });
  document.addEventListener('finkas:state-changed', syncVisibility);
  document.addEventListener('finkas:modal-opened', () => { hideMiniBubble(); setHalo(false); });
  window.addEventListener('finkas:group-changed', () => { clearTreat(); clearTimeout(roamTimer); syncVisibility(); });
  document.addEventListener('finkas:dues-settled', () => playKasiAction('celebrate'));

  const toasts = document.getElementById('toast-container');
  if (toasts && typeof MutationObserver !== 'undefined') new MutationObserver(dodgeToast).observe(toasts, { childList: true });
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      if (document.body.dataset.workspaceState === 'ready' && !dock.hidden && !drag) {
        requestAnimationFrame(dockToHome);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-workspace-state'] });
  }

  initKasiStage();
  syncVisibility();
};
