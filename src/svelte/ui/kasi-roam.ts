/**
 * Pure roaming geometry, perch calculation, static trick/action catalogs,
 * and kinematic step helpers for the Kasi floating mascot.
 */

export const PERCH_SELECTORS =
  '.bento-kpi, #spotlight-card:not([hidden]), #admin-priorities:not([hidden]), #section-rekap:not([hidden]), .chart-card';

export const FLOAT_TRICKS = [
  { mood: 'happy', cls: 'is-waving', dur: 1700, particles: ['coin', 'star'], msg: { id: 'Sapaan Maneki-neko! Semoga kas lancar!', en: 'Maneki wave! May inflows stay brisk!' } },
  { mood: 'explain', cls: '', dur: 2400, particles: ['star'], msg: { id: 'Kacamata audit siap cek transaksi!', en: 'Audit glasses on to review entries!' } },
  { mood: 'curious', cls: 'is-booped', dur: 700, particles: ['heart', 'star'], msg: { id: 'Boop! Hidung Kasi geli nih!', en: 'Boop! That tickles Kasi\u2019s nose!' } },
  { mood: 'sleepy', cls: '', dur: 3000, particles: [], msg: { id: 'Hoamm~ tidur sebentar dulu...', en: 'Yawn~ quick catnap...' } }
];

export const ACTIONS = {
  pet: { mood: 'petting', pose: 'is-purring', dur: 900, particles: ['heart', 'star', 'note'], msg: { id: 'Kasi senang dielus!', en: 'Kasi loves the pets!' } },
  coin: { mood: 'coin', pose: 'is-catching', dur: 680, particles: ['star', 'coin', 'heart'], msg: { id: 'Ting! Koin kas tertangkap!', en: 'Clink! Ledger coin caught!' } },
  fish: { mood: 'happy', pose: 'is-chomping', dur: 620, particles: ['note', 'heart', 'star'], msg: { id: 'Nyam! Ikan segar tertangkap!', en: 'Nom! Fresh fish caught!' } },
  flip: { mood: 'celebrate', pose: 'is-flipping', dur: 820, particles: ['star', 'heart', 'star'], msg: { id: 'Zoomies! Salto kas!', en: 'Zoomies! Happy flip!' } },
  celebrate: { mood: 'coin', pose: 'is-catching', dur: 700, particles: ['star', 'coin', 'heart'], msg: { id: 'Kasi merayakan iuran lunas!', en: 'Kasi celebrates settled dues!' } }
};

export type RoamMode = 'idle' | 'walk' | 'jump' | 'fall' | 'chase' | 'drag';
export interface RectLike { left: number; right: number; top: number; width: number; height: number; }
export interface LedgeRect<T = Element> { el: T; y: number; left: number; minX: number; maxX: number; }
export interface JumpState {
  sx: number; sy: number; tx: number; ty: number; startAt: number; dur: number;
  arcH: number; targetEl: Element | null; onArrive: (() => void) | null;
}
export interface ChaseState { tx: number; ty: number; speed: number; perchEl: Element | null; onArrive: () => void; }
export interface RoamState {
  x: number; y: number; vy: number; dir: number; swing: number; targetSwing: number;
  pupilX: number; pupilY: number; targetPupilX: number; targetPupilY: number;
  mode: RoamMode; perchedEl: Element | null; perchOffsetX: number; walkTargetX: number; walkSpeed: number;
  jumpStart: JumpState | null; chase: ChaseState | null;
  hovering: boolean; sleeping: boolean; lastFrameAt: number; rafId: number;
}
export interface HoverRubState {
  x: number | null; y: number | null;
  segs: Array<{ t: number; d: number; dx: number; dy: number }>;
  lastFire: number; suppressUntil: number;
}
export interface DragState { id: number; startX: number; startY: number; x: number; y: number; moved: boolean; }
export interface RoamStepHooks {
  resolveLedge: (el: Element | null) => LedgeRect | null;
  findDrop: (x: number, curY: number) => { el: Element | null; y: number };
  isPaused: () => boolean;
  scheduleNextRoam: () => void;
  onFallLand: () => void;
  onChaseMove?: (tx: number, ty: number) => void;
}

/** Create the initial mutable roaming state for Kasi. */
export const createRoamState = (): RoamState => ({
  x: 0, y: 0, vy: 0, dir: 1, swing: 0, targetSwing: 0,
  pupilX: 0, pupilY: 0, targetPupilX: 0, targetPupilY: 0,
  mode: 'idle', perchedEl: null, perchOffsetX: 0, walkTargetX: 0, walkSpeed: 92,
  jumpStart: null, chase: null, hovering: false, sleeping: false, lastFrameAt: 0, rafId: 0
});

/** Create the hover-rub gesture tracker state. */
export const createHoverRubState = (): HoverRubState => ({ x: null, y: null, segs: [], lastFire: 0, suppressUntil: 0 });

/** Clear accumulated hover-rub segments and optionally suppress triggers for `suppressMs`. */
export const resetHoverRubState = (hover: HoverRubState, suppressMs = 0, now = Date.now()) => {
  hover.x = null; hover.y = null; hover.segs = [];
  if (suppressMs > 0) hover.suppressUntil = Math.max(hover.suppressUntil, now + suppressMs);
};

/** Clamp a numeric value inclusively to `[low, high]`. */
export const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(v, high));

/** Resolve Kasi's square hit-target size in px from measured width or viewport breakpoint. */
export const kasiSizeForWidth = (viewportWidth: number, buttonWidth?: number) =>
  buttonWidth || (viewportWidth <= 768 ? 54 : 64);

/** Compute the floor Y coordinate above mobile bottom navigation or desktop margin. */
export const computeFloorY = (
  viewportWidth: number, viewportHeight: number, kasiSize: number, hasNav = false, navTop = viewportHeight
) => {
  const bottomLimit = hasNav
    ? Math.min(viewportHeight - 80, navTop - 12)
    : viewportHeight - (viewportWidth <= 768 ? 80 : 16);
  return Math.max(70, bottomLimit - kasiSize);
};

/** Compute a valid top-ledge perch rect for an element, or `null` if too small. */
export const computeLedgeRect = <T>(
  el: T, rect: RectLike, kasiSize: number, viewportWidth: number
): LedgeRect<T> | null => {
  if (rect.width < kasiSize + 16 || rect.height < 36) return null;
  const minX = Math.max(12, rect.left + 8);
  const maxX = Math.max(minX, Math.min(viewportWidth - kasiSize - 12, rect.right - kasiSize - 8));
  return { el, y: rect.top - kasiSize + 8, left: rect.left, minX, maxX };
};

/** Filter candidate ledges to those strictly within the safe vertical and horizontal roam band. */
export const filterPerchCandidates = <T>(
  ledges: Array<LedgeRect<T> | null>, topBound: number, floorBound: number
): LedgeRect<T>[] => {
  const top = topBound + 10;
  const floor = floorBound - 12;
  return ledges.filter((l): l is LedgeRect<T> =>
    l !== null && l.y >= top && l.y <= floor && l.maxX - l.minX >= 16
  );
};

/** Return perches whose horizontal span overlaps `x` within a 10px margin. */
export const findPerchesAt = <T>(candidates: LedgeRect<T>[], x: number): LedgeRect<T>[] =>
  candidates.filter((c) => x >= c.minX - 10 && x <= c.maxX + 10);

/** Return the closest perch vertically within `tolerance` px at horizontal position `x`. */
export const findNearestPerch = <T>(
  candidates: LedgeRect<T>[], x: number, curY: number, tolerance: number
): LedgeRect<T> | null => {
  let best: LedgeRect<T> | null = null;
  let bestDist = Infinity;
  for (const perch of findPerchesAt(candidates, x)) {
    const distance = Math.abs(curY - perch.y);
    if (distance <= tolerance && distance < bestDist) { bestDist = distance; best = perch; }
  }
  return best;
};

/** Choose the highest perch below `curY - 6` at `x`, falling back to `floor`. */
export const selectDropTarget = <T>(
  candidates: LedgeRect<T>[], x: number, curY: number, floor: number
): { el: T | null; y: number } =>
  findPerchesAt(candidates, x).filter((c) => c.y >= curY - 6).sort((a, b) => a.y - b.y)[0] || { el: null, y: floor };

/** Compute `--kasi-bubble-left` offset relative to `roamX`, clamped within viewport padding. */
export const computeBubbleOffsetX = (roamX: number, kasiSize: number, bubbleWidth: number, viewportWidth: number) => {
  const bw = bubbleWidth || 180;
  return clamp(roamX + (kasiSize - bw) / 2, 10, viewportWidth - bw - 10) - roamX;
};

/** Compute `--kasi-halo-left` offset relative to `roamX`, clamped within viewport padding. */
export const computeHaloOffsetX = (roamX: number, kasiSize: number, viewportWidth: number) => {
  const haloWidth = Math.min(viewportWidth <= 440 ? 260 : 378, viewportWidth - 20);
  return clamp(roamX + (kasiSize - haloWidth) / 2, 10, viewportWidth - haloWidth - 10) - roamX;
};

/** Derive transform CSS values and pose class flags from `roam` state. */
export const computeTransformProps = (
  roam: RoamState, kasiSize: number, viewportWidth: number, isFlipping: boolean
) => ({
  tx: roam.mode === 'idle' ? Math.round(roam.x) : Number(roam.x.toFixed(1)),
  ty: roam.mode === 'idle' ? Math.round(roam.y) : Number(roam.y.toFixed(1)),
  haloBelow: roam.y < 125,
  isPerched: Boolean(roam.perchedEl) && roam.mode !== 'drag',
  haloLeft: computeHaloOffsetX(roam.x, kasiSize, viewportWidth),
  swingDeg: `${(roam.swing * roam.dir).toFixed(1)}deg`,
  isWalking: roam.mode === 'walk' || roam.mode === 'chase',
  isJumping: roam.mode === 'jump' && !isFlipping,
  isDangling: roam.mode === 'drag'
});

/** Re-clamp `roam` coordinates on scroll/resize and report whether a perch needs deferred rejoin. */
export const resolveSyncedBounds = (
  roam: RoamState, ledge: LedgeRect | null, topBound: number, floor: number,
  kasiSize: number, viewportWidth: number, fromResize: boolean
): 'stay' | 'rejoin' | 'floor' => {
  if (ledge && ledge.y <= floor && !(fromResize && ledge.y < topBound + 4)) {
    roam.y = ledge.y;
    roam.x = clamp(ledge.left + roam.perchOffsetX, ledge.minX, ledge.maxX);
    return ledge.y < topBound - kasiSize ? 'rejoin' : 'stay';
  }
  roam.perchedEl = null;
  roam.y = floor;
  roam.x = clamp(roam.x, 12, Math.max(12, viewportWidth - kasiSize - 12));
  return 'floor';
};

/** Compute Kasi's initial resting coordinates on the first perch or bottom-right floor. */
export const computeHomeDockTarget = <T>(
  firstPerch: LedgeRect<T> | undefined, kasiSize: number, viewportWidth: number, floor: number
) => {
  if (firstPerch) {
    const x = firstPerch.maxX - firstPerch.minX >= 100 ? firstPerch.maxX - 46 : firstPerch.maxX;
    return { x, y: firstPerch.y, perchedEl: firstPerch.el as T | null, perchOffsetX: x - firstPerch.left };
  }
  return {
    x: Math.max(12, viewportWidth - kasiSize - (viewportWidth <= 768 ? 14 : 18)),
    y: floor, perchedEl: null as T | null, perchOffsetX: 0
  };
};

/** Compute destination coordinates for a thrown treat and chase path. */
export const computeTreatChaseTarget = <T>(
  roamX: number, activeLedge: LedgeRect<T> | null, kasiSize: number,
  viewportWidth: number, floor: number, rand = Math.random()
) => {
  const wide = activeLedge && (activeLedge.maxX - roamX >= 130 || roamX - activeLedge.minX >= 130);
  const minX = wide ? activeLedge.minX : 12;
  const maxX = wide ? activeLedge.maxX : Math.max(12, viewportWidth - kasiSize - 12);
  const ty = wide ? activeLedge.y : floor;
  const off = 135 + rand * 75;
  const tx = roamX + off <= maxX ? roamX + off : clamp(roamX - off, minX, maxX);
  return {
    tx, ty, wx: tx + kasiSize / 2 - 14, wy: ty + kasiSize - 28,
    perchedEl: wide ? activeLedge.el : null,
    perchOffsetFromCurrent: wide ? roamX - activeLedge.left : 0,
    perchOffsetAtTarget: wide ? tx - activeLedge.left : 0
  };
};

/** Compute jump coordinates for a celebratory flip action. */
export const computeFlipTarget = (
  roamX: number, cands: LedgeRect[], kasiSize: number, viewportWidth: number,
  floor: number, randIdx = Math.random(), randPos = Math.random()
) => {
  const target = cands.length ? cands[Math.floor(randIdx * cands.length)] : null;
  return {
    tx: target
      ? target.minX + randPos * (target.maxX - target.minX)
      : (roamX > viewportWidth * 0.5 ? 28 : viewportWidth - kasiSize - 28),
    ty: target ? target.y : floor,
    el: target?.el || null
  };
};

/** Compute jump coordinates to move Kasi clear of an overlapping toast notification. */
export const computeToastDodgeTarget = (
  toastRect: { left: number; top: number }, roamX: number, kasiSize: number, topBound: number, floor: number
) => {
  const canShiftLeft = toastRect.left - kasiSize - 16 >= 12;
  return {
    tx: canShiftLeft ? toastRect.left - kasiSize - 16 : roamX,
    ty: canShiftLeft ? floor : Math.max(topBound + 12, toastRect.top - kasiSize - 16)
  };
};

/** Compute clamped drag coordinates and pendulum swing angle from pointer deltas. */
export const computeDragPosition = (
  startX: number, startY: number, dx: number, dy: number, movementX: number,
  kasiSize: number, viewportWidth: number, topBound: number, floor: number
) => ({
  x: clamp(startX + dx, 12, Math.max(12, viewportWidth - kasiSize - 12)),
  y: clamp(startY + dy, Math.max(8, topBound - 24), floor),
  targetSwing: clamp(-movementX * 1.4, -26, 26)
});

/** Record a hover-pointer movement sample and return `true` when rub petting triggers. */
export const recordHoverRubSample = (
  hover: HoverRubState, clientX: number, clientY: number, now: number
): boolean => {
  const dx = hover.x === null ? 0 : clientX - hover.x;
  const dy = hover.y === null ? 0 : clientY - hover.y;
  const step = Math.hypot(dx, dy);
  hover.x = clientX; hover.y = clientY;
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
    resetHoverRubState(hover, 300, now);
    hover.lastFire = now;
    return true;
  }
  return false;
};

/** Plan the next autonomous roam walk target along `[minX, maxX]`, or `null` if too narrow. */
export const computeWalkTarget = (
  roamX: number, minX: number, maxX: number, randDist = Math.random(), randSpeed = Math.random()
) => {
  if (maxX - minX < 40) return null;
  const sign = roamX - minX > maxX - roamX ? -1 : 1;
  const tx = clamp(roamX + sign * Math.min(maxX - minX, 55 + randDist * 110), minX, maxX);
  if (Math.abs(tx - roamX) < 24) return null;
  return { tx, speed: 78 + randSpeed * 40, dir: tx >= roamX ? 1 : -1 };
};

function stepJump(roam: RoamState, now: number, hooks: RoamStepHooks) {
  const j = roam.jumpStart;
  if (!j) return;
  const jL = j.targetEl ? hooks.resolveLedge(j.targetEl) : null;
  if (jL) { j.ty = jL.y; j.tx = clamp(j.tx, jL.minX, jL.maxX); }
  const t = Math.min(1, (now - j.startAt) / j.dur);
  roam.x = j.sx + (j.tx - j.sx) * t;
  roam.y = j.sy + (j.ty - j.sy) * t - 4 * j.arcH * t * (1 - t);
  if (t >= 1) {
    roam.x = j.tx; roam.y = j.ty; roam.perchedEl = j.targetEl;
    roam.perchOffsetX = jL ? roam.x - jL.left : 0;
    roam.jumpStart = null; roam.mode = 'idle';
    hooks.scheduleNextRoam();
    j.onArrive?.();
  }
}

function stepFall(roam: RoamState, dt: number, hooks: RoamStepHooks) {
  const drop = hooks.findDrop(roam.x, roam.y);
  roam.vy += 1500 * dt;
  roam.y += roam.vy * dt;
  if (roam.y >= drop.y) {
    roam.y = drop.y; roam.vy = 0; roam.perchedEl = drop.el;
    const dL = drop.el ? hooks.resolveLedge(drop.el) : null;
    roam.perchOffsetX = dL ? roam.x - dL.left : 0;
    roam.mode = 'idle';
    hooks.scheduleNextRoam();
    hooks.onFallLand();
  }
}

function stepChase(roam: RoamState, dt: number, hooks: RoamStepHooks) {
  const ch = roam.chase;
  if (!ch) return;
  const cL = ch.perchEl ? hooks.resolveLedge(ch.perchEl) : null;
  if (cL) {
    ch.ty = cL.y; ch.tx = clamp(ch.tx, cL.minX, cL.maxX);
    hooks.onChaseMove?.(ch.tx, ch.ty);
  }
  const dx = ch.tx - roam.x, dy = ch.ty - roam.y, dist = Math.hypot(dx, dy), step = ch.speed * dt;
  if (dist <= Math.max(6, step)) {
    roam.x = ch.tx; roam.y = ch.ty; roam.perchedEl = ch.perchEl || null;
    roam.perchOffsetX = cL ? roam.x - cL.left : 0;
    roam.chase = null; roam.mode = 'idle';
    hooks.scheduleNextRoam();
    ch.onArrive?.();
  } else {
    roam.dir = dx >= 0 ? 1 : -1;
    roam.x += (dx / dist) * step; roam.y += (dy / dist) * step;
  }
}

function stepWalk(roam: RoamState, dt: number, hooks: RoamStepHooks) {
  if (hooks.isPaused()) { roam.mode = 'idle'; return; }
  const wL = roam.perchedEl ? hooks.resolveLedge(roam.perchedEl) : null;
  if (wL) { roam.y = wL.y; roam.walkTargetX = clamp(roam.walkTargetX, wL.minX, wL.maxX); }
  const wdx = roam.walkTargetX - roam.x, wStep = roam.walkSpeed * dt;
  if (Math.abs(wdx) <= wStep + 1) {
    roam.x = roam.walkTargetX; roam.mode = 'idle';
    hooks.scheduleNextRoam();
  } else {
    roam.dir = wdx >= 0 ? 1 : -1;
    roam.x += Math.sign(wdx) * wStep;
  }
  if (wL) roam.perchOffsetX = roam.x - wL.left;
}

/** Advance roam kinematics, easing, and active movement mode for frame timestamp `now`. */
export const stepRoamFrame = (roam: RoamState, now: number, hooks: RoamStepHooks): boolean => {
  const dt = Math.min(0.12, Math.max(0.004, (now - (roam.lastFrameAt || now)) / 1000));
  roam.lastFrameAt = now;

  const pLerp = 1 - Math.exp(-16 * dt);
  if (roam.mode === 'chase' && roam.chase) {
    roam.targetPupilX = clamp((roam.chase.tx - roam.x) / 60, -1.5, 1.5);
    roam.targetPupilY = clamp((roam.chase.ty - roam.y + 8) / 60, -1.5, 1.5);
  }
  roam.pupilX += (roam.targetPupilX - roam.pupilX) * pLerp;
  roam.pupilY += (roam.targetPupilY - roam.pupilY) * pLerp;
  roam.targetSwing *= Math.exp(-10 * dt);
  roam.swing += (roam.targetSwing - roam.swing) * (1 - Math.exp(-18 * dt));

  if (roam.mode === 'jump') stepJump(roam, now, hooks);
  else if (roam.mode === 'fall') stepFall(roam, dt, hooks);
  else if (roam.mode === 'chase') stepChase(roam, dt, hooks);
  else if (roam.mode === 'walk') stepWalk(roam, dt, hooks);

  const settling =
    Math.hypot(roam.pupilX - roam.targetPupilX, roam.pupilY - roam.targetPupilY) > 0.02 ||
    Math.abs(roam.swing) > 0.05;
  return roam.mode !== 'idle' || settling;
};

/** Resolve Kasi's button size in px from the live DOM/viewport. */
export const sz = (button?: HTMLElement | null) => kasiSizeForWidth(innerWidth, button?.offsetWidth);

/** Return the bottom edge of `.hybrid-topbar` or the default header height (58px). */
export const topBottom = () => document.querySelector('.hybrid-topbar')?.getBoundingClientRect().bottom || 58;

/** Compute Kasi's resting floor Y coordinate in the current viewport. */
export const floorY = (button?: HTMLElement | null) => {
  const nav = document.querySelector('.bottom-nav');
  const hasNav = Boolean(nav?.getClientRects().length);
  const navTop = hasNav && nav ? nav.getBoundingClientRect().top : innerHeight;
  return computeFloorY(innerWidth, innerHeight, sz(button), hasNav, navTop);
};

/** Collect all currently visible card elements eligible as Kasi perches. */
export const cards = () =>
  [...document.querySelectorAll(PERCH_SELECTORS)].filter((el) => el.getClientRects().length);

/** Measure a perchable element's top ledge geometry in viewport coordinates. */
export const ledgeRect = (el: Element | null, button?: HTMLElement | null): LedgeRect | null => {
  if (!el?.isConnected || !el.getClientRects().length) return null;
  return computeLedgeRect(el, el.getBoundingClientRect(), sz(button), innerWidth);
};

/** Compute all currently valid perch ledges within the safe viewport vertical band. */
export const perchCandidates = (button?: HTMLElement | null) =>
  filterPerchCandidates(cards().map((el) => ledgeRect(el, button)), topBottom(), floorY(button));

/** Find valid perches overlapping horizontal coordinate `x`. */
export const perchesAt = (x: number, button?: HTMLElement | null) => findPerchesAt(perchCandidates(button), x);

/** Find the nearest perch at `x` within vertical `tolerance` px of `curY`. */
export const nearestPerch = (x: number, curY: number, tolerance: number, button?: HTMLElement | null) =>
  findNearestPerch(perchCandidates(button), x, curY, tolerance);

/** Find the drop landing target (nearest perch below `curY`, or viewport floor). */
export const findDropTarget = (x: number, curY: number, button?: HTMLElement | null) =>
  selectDropTarget(perchCandidates(button), x, curY, floorY(button));
