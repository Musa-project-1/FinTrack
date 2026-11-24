import { getInput } from 'finkas/core/utils';
import { getActiveGroupId } from 'finkas/core/state';
import { openModal } from './modal';
import { createKasiVectorSvg, launchKasiTreatToPoint, spawnKasiParticles } from './kasi-effects';
import { KASI_PET_QUOTES, incrementKasiAffection, initKasiStage, triggerAllMascotAction } from './kasi-stage';
import {
  ACTIONS, FLOAT_TRICKS, clamp, computeBubbleOffsetX, computeDragPosition, computeFlipTarget,
  computeHomeDockTarget, computeToastDodgeTarget, computeTransformProps, computeTreatChaseTarget,
  computeWalkTarget, createHoverRubState, createRoamState, findDropTarget, floorY, ledgeRect,
  nearestPerch, perchCandidates, recordHoverRubSample, resetHoverRubState, resolveSyncedBounds,
  stepRoamFrame, sz, topBottom, type DragState
} from './kasi-roam';

const preferenceKey = 'finkas_kasi_visible';
let dock: HTMLElement, button: HTMLElement, halo: HTMLElement, bubble: HTMLElement, treat: HTMLElement;
let rig: SVGSVGElement;
let enabled = true, suppressClick = false, petCount = 0, trickIdx = 0;
type Timer = ReturnType<typeof setTimeout> | undefined;
let roamTimer: Timer, bubbleTimer: Timer, idleTimer: Timer, poseTimer: Timer, scrollRejoinTimer: Timer;
let syncRafId = 0, syncFromResize = false;
let cancelTreatFlight: (() => void) | undefined;

const hover = createHoverRubState();
const roam = createRoamState();
let drag: DragState | null = null;

const isEn = () => document.body?.dataset?.lang === 'en';
const langKey = () => (isEn() ? 'en' : 'id');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const getSz = () => sz(button);
const getFloorY = () => floorY(button);
const getLedge = (el: Element | null) => ledgeRect(el, button);
const getPerches = () => perchCandidates(button);
const getNearestPerch = (x: number, curY: number, tol: number) => nearestPerch(x, curY, tol, button);
const getDropTarget = (x: number, curY: number) => findDropTarget(x, curY, button);

const clearTreat = () => {
  cancelTreatFlight?.();
  cancelTreatFlight = undefined;
  if (treat) { treat.hidden = true; treat.replaceChildren(); }
};

const hideMiniBubble = () => {
  clearTimeout(bubbleTimer);
  bubbleTimer = undefined;
  if (bubble) bubble.hidden = true;
};

const positionMiniBubble = () => {
  if (!dock || !bubble || bubble.hidden) return;
  const offset = computeBubbleOffsetX(roam.x, getSz(), bubble.offsetWidth || 180, innerWidth);
  dock.style.setProperty('--kasi-bubble-left', `${offset}px`);
};

const showMiniBubble = (text: string, durMs = 2400) => {
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

const setHalo = (shown: boolean) => {
  halo.hidden = !shown;
  dock.classList.toggle('has-halo', shown);
  button.setAttribute('aria-expanded', String(shown));
  resetHoverRubState(hover, 500);
  if (shown) {
    roam.walkTargetX = roam.x;
    if (roam.mode === 'walk') roam.mode = 'idle';
    hideMiniBubble();
  }
  wakeUp();
};

const applyTransform = () => {
  if (!dock || !rig) return;
  const props = computeTransformProps(roam, getSz(), innerWidth, rig.classList.contains('is-flipping'));
  dock.style.transform = `translate3d(${props.tx}px, ${props.ty}px, 0)`;
  dock.classList.toggle('halo-below', props.haloBelow);
  dock.classList.toggle('is-perched', props.isPerched);
  dock.style.setProperty('--kasi-halo-left', `${props.haloLeft}px`);
  positionMiniBubble();
  rig.style.setProperty('--kasi-dir', String(roam.dir));
  rig.style.setProperty('--swing-deg', props.swingDeg);
  rig.classList.toggle('is-walking', props.isWalking);
  rig.classList.toggle('is-jumping', props.isJumping);
  rig.classList.toggle('is-dangling', props.isDangling);
  for (const pupil of rig.querySelectorAll<SVGElement>('[data-kasi-pupil]')) {
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

const triggerPose = (mood: string, pose: string, durMs = 700, particles: string[] = [], bubbleText = '') => {
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

const startJump = (tx: number, ty: number, targetEl: Element | null, opts: { dur?: number; arcH?: number; onArrive?: () => void } = {}) => {
  const clampedX = clamp(tx, 12, Math.max(12, innerWidth - getSz() - 12));
  roam.dir = clampedX >= roam.x ? 1 : -1;
  roam.perchedEl = null;
  roam.perchOffsetX = 0;
  if (reduced()) {
    roam.x = clampedX; roam.y = ty; roam.perchedEl = targetEl || null;
    if (targetEl) { const l = getLedge(targetEl); roam.perchOffsetX = l ? roam.x - l.left : 0; }
    roam.mode = 'idle'; applyTransform(); opts.onArrive?.();
    return;
  }
  roam.mode = 'jump';
  roam.jumpStart = {
    sx: roam.x, sy: roam.y, tx: clampedX, ty,
    startAt: performance.now(), dur: opts.dur || 560, arcH: opts.arcH ?? 46,
    targetEl: targetEl || null, onArrive: opts.onArrive || null
  };
  applyTransform(); ensureLoop();
};

const paused = () => reduced() || document.hidden || Boolean(document.querySelector('dialog[open]')) ||
  !halo?.hidden || roam.hovering || roam.sleeping;

function pickNextRoam() {
  if (!dock || dock.hidden || paused() || roam.mode !== 'idle') return scheduleNextRoam();
  const cands = getPerches(), floor = getFloorY(), s = getSz();
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
  const active = roam.perchedEl ? getLedge(roam.perchedEl) : null;
  const walk = computeWalkTarget(roam.x, active ? active.minX : 12, active ? active.maxX : Math.max(12, innerWidth - s - 12));
  if (walk) {
    roam.mode = 'walk'; roam.walkTargetX = walk.tx; roam.walkSpeed = walk.speed; roam.dir = walk.dir;
    applyTransform(); ensureLoop();
    return;
  }
  scheduleNextRoam();
}

const syncBounds = (fromResize = false) => {
  if (!dock || dock.hidden || roam.mode === 'drag' || roam.mode === 'jump' || roam.mode === 'fall' || roam.mode === 'chase') return;
  const l = roam.perchedEl ? getLedge(roam.perchedEl) : null;
  const outcome = resolveSyncedBounds(roam, l, topBottom(), getFloorY(), getSz(), innerWidth, fromResize);
  if (outcome === 'rejoin') {
    clearTimeout(scrollRejoinTimer);
    scrollRejoinTimer = setTimeout(() => {
      if (roam.perchedEl && !drag && roam.mode === 'idle') {
        roam.perchedEl = null; roam.y = getFloorY();
        roam.x = clamp(roam.x, 12, Math.max(12, innerWidth - getSz() - 12));
        applyTransform();
      }
    }, 1800);
  } else clearTimeout(scrollRejoinTimer);
  applyTransform();
};

function tickRoam(now: number) {
  roam.rafId = 0;
  if (!dock || dock.hidden) return;
  const shouldContinue = stepRoamFrame(roam, now, {
    resolveLedge: getLedge,
    findDrop: getDropTarget,
    isPaused: paused,
    scheduleNextRoam: () => scheduleNextRoam(),
    onFallLand: () => triggerPose('idle', 'is-booped', 460, ['star', 'star', 'heart']),
    onChaseMove: (tx, ty) => {
      if (treat && !treat.hidden) {
        const s = getSz();
        treat.style.transform = `translate3d(${(tx + s / 2 - 14).toFixed(1)}px, ${(ty + s - 28).toFixed(1)}px, 0)`;
      }
    }
  });
  applyTransform();
  if (shouldContinue) roam.rafId = requestAnimationFrame(tickRoam);
}

function ensureLoop() {
  if (roam.rafId || reduced() || !dock || dock.hidden) return;
  roam.lastFrameAt = performance.now();
  roam.rafId = requestAnimationFrame(tickRoam);
}

const dockToHome = () => {
  const home = computeHomeDockTarget(getPerches()[0], getSz(), innerWidth, getFloorY());
  roam.perchedEl = home.perchedEl; roam.perchOffsetX = home.perchOffsetX;
  roam.x = home.x; roam.y = home.y; roam.mode = 'idle';
  applyTransform();
};

const spawnTreatAndChase = (kind: 'fish' | 'coin') => {
  clearTreat();
  const s = getSz();
  const target = computeTreatChaseTarget(roam.x, roam.perchedEl ? getLedge(roam.perchedEl) : null, s, innerWidth, getFloorY());
  const { tx, ty, wx, wy } = target;
  const fromRect = button.getBoundingClientRect();

  const catchTreat = () => {
    clearTreat();
    const spec = ACTIONS[kind];
    triggerPose(spec.mood, spec.pose, spec.dur, spec.particles, spec.msg[langKey()]);
    incrementKasiAffection(25, button, showMiniBubble);
  };

  if (reduced()) {
    roam.x = tx; roam.y = ty; roam.perchedEl = target.perchedEl; roam.perchOffsetX = target.perchOffsetAtTarget;
    applyTransform(); return catchTreat();
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

  roam.perchedEl = target.perchedEl; roam.perchOffsetX = target.perchOffsetFromCurrent;
  roam.mode = 'chase'; roam.dir = tx >= roam.x ? 1 : -1;
  roam.chase = { tx, ty, speed: 230, perchEl: target.perchedEl, onArrive: () => { arrived = true; catchTreat(); } };
  applyTransform(); ensureLoop();
};

/** Trigger a Kasi mascot action (trick, treat chase, pet, flip, or celebration). */
export const playKasiAction = (action: string | undefined) => {
  if (!action || !dock || dock.hidden) return;
  if (action !== 'celebrate') setHalo(false);
  wakeUp();

  if (action === 'trick') {
    const t = FLOAT_TRICKS[trickIdx++ % FLOAT_TRICKS.length];
    triggerPose(t.mood, t.cls, t.dur, t.particles, t.msg[langKey()]);
    if (t.cls) triggerAllMascotAction(t.cls, t.dur);
    return;
  }
  if (action === 'coin' || action === 'fish') return spawnTreatAndChase(action);
  if (!Object.hasOwn(ACTIONS, action)) return;

  const spec = ACTIONS[action as keyof typeof ACTIONS];
  const text = action === 'pet'
    ? KASI_PET_QUOTES[langKey()][petCount++ % KASI_PET_QUOTES[langKey()].length]
    : spec.msg[langKey()];

  triggerPose(spec.mood, spec.pose, spec.dur, spec.particles, text);
  if (action === 'pet') incrementKasiAffection(20, button, showMiniBubble);
  if (action === 'flip' && !reduced()) {
    const flip = computeFlipTarget(roam.x, getPerches(), getSz(), innerWidth, getFloorY());
    startJump(flip.tx, flip.ty, flip.el, { dur: 620, arcH: 60 });
  }
};

const dodgeToast = () => {
  if (!dock || dock.hidden || drag || !document.querySelector('#toast-container .toast')) return;
  const r = button.getBoundingClientRect(), s = getSz();
  for (const t of document.querySelectorAll('#toast-container .toast')) {
    const tr = t.getBoundingClientRect();
    if (!(r.right <= tr.left - 10 || r.left >= tr.right + 10 || r.bottom <= tr.top - 10 || r.top >= tr.bottom + 10)) {
      const target = computeToastDodgeTarget(tr, roam.x, s, topBottom(), getFloorY());
      startJump(target.tx, target.ty, null, { dur: 180, arcH: 22 });
      break;
    }
  }
};

const syncVisibility = () => {
  dock.hidden = !enabled || !getActiveGroupId();
  if (dock.hidden) {
    clearTreat(); hideMiniBubble();
    clearTimeout(roamTimer); clearTimeout(idleTimer); clearTimeout(scrollRejoinTimer);
    if (roam.rafId) { cancelAnimationFrame(roam.rafId); roam.rafId = 0; }
    if (syncRafId) { cancelAnimationFrame(syncRafId); syncRafId = 0; }
    setHalo(false); resetTransientPose();
  } else {
    dockToHome(); scheduleIdleSleep();
    scheduleNextRoam(3800 + Math.random() * 1400);
  }
};

const attachPointerInteractions = () => {
  button.addEventListener('click', () => { if (!suppressClick) setHalo(Boolean(halo.hidden)); });
  button.addEventListener('dblclick', (e) => { e.preventDefault(); setHalo(false); openModal('modal-faq'); });
  dock.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !halo.hidden) { setHalo(false); button.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!halo.hidden && e.target instanceof Node && !dock.contains(e.target)) setHalo(false); });

  button.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    wakeUp(); resetHoverRubState(hover, 500);
    const r = button.getBoundingClientRect();
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: r.left, y: r.top, moved: false };
    button.setPointerCapture(e.pointerId);
  });

  button.addEventListener('pointermove', (e) => {
    if (!drag && e.pointerType !== 'touch' && e.buttons === 0) {
      const now = Date.now();
      if (!halo.hidden || now < hover.suppressUntil) { resetHoverRubState(hover, 0, now); return; }
      if (recordHoverRubSample(hover, e.clientX, e.clientY, now)) playKasiAction('pet');
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) {
      drag.moved = true; roam.mode = 'drag'; roam.perchedEl = null; roam.jumpStart = null; roam.chase = null;
      clearTreat(); dock.classList.add('is-grabbed'); setHalo(false); rig.dataset.mood = 'curious';
      showMiniBubble(isEn() ? 'Wheee~ flying!' : 'Waa~ terbang!', 1800);
    }
    const pos = computeDragPosition(drag.x, drag.y, dx, dy, e.movementX, getSz(), innerWidth, topBottom(), getFloorY());
    roam.targetSwing = pos.targetSwing; roam.x = pos.x; roam.y = pos.y;
    applyTransform(); ensureLoop();
  });

  const endDrag = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = drag.moved;
    drag = null; dock.classList.remove('is-grabbed');
    if (!moved) return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    roam.targetSwing = 0;
    const snap = getNearestPerch(roam.x, roam.y, 26);
    if (snap) {
      roam.perchedEl = snap.el; roam.y = snap.y; roam.perchOffsetX = roam.x - snap.left; roam.mode = 'idle';
      applyTransform(); triggerPose('idle', 'is-booped', 460, ['star', 'star', 'heart']); scheduleNextRoam();
    } else if (reduced()) {
      const drop = getDropTarget(roam.x, roam.y);
      roam.perchedEl = drop.el; roam.y = drop.y; roam.mode = 'idle'; applyTransform();
    } else {
      roam.mode = 'fall'; roam.vy = 0; rig.dataset.mood = 'idle'; applyTransform(); ensureLoop();
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
    roam.hovering = false; resetHoverRubState(hover);
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
};

/** Initialize the floating Kasi mascot dock, pointer interactions, and lifecycle listeners. */
export const initKasi = () => {
  const dockEl = document.getElementById('kasi-dock');
  const buttonEl = document.getElementById('kasi-fab');
  if (!dockEl || !buttonEl) return;
  const haloEl = document.getElementById('kasi-halo');
  const bubbleEl = document.getElementById('kasi-mini-bubble');
  const treatEl = document.getElementById('kasi-treat');
  const svg = buttonEl.querySelector<SVGSVGElement>('.kasi-svg');
  if (!haloEl || !bubbleEl || !treatEl || !svg) return;
  dock = dockEl; button = buttonEl; halo = haloEl; bubble = bubbleEl; treat = treatEl; rig = svg;

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

  attachPointerInteractions();

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
      roam.lastFrameAt = performance.now(); scheduleNextRoam();
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
      if (document.body.dataset.workspaceState === 'ready' && !dock.hidden && !drag) requestAnimationFrame(dockToHome);
    }).observe(document.body, { attributes: true, attributeFilter: ['data-workspace-state'] });
  }

  initKasiStage();
  syncVisibility();
};
