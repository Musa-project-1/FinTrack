/**
 * @module onboarding-horizon
 * Living Horizon Spline canvas renderer for onboarding.html.
 * Pauses rAF loops and skips offscreen/hidden redraws when the tab is hidden,
 * skipped by content-visibility, or outside the viewport.
 */

export interface HorizonSplineOptions {
  reducedMotion: MediaQueryList;
  getSaldo: () => number;
  initialSaldo: number;
}

type ContentVisibilityEvent = Event & { skipped?: boolean };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const initHorizonSpline = ({ reducedMotion, getSaldo, initialSaldo }: HorizonSplineOptions) => {
  const canvas = document.getElementById('horizon-canvas') as HTMLCanvasElement | null;
  if (!canvas || !canvas.getContext) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];
  const baseKnots = [0.16, 0.23, 0.30, 0.36, 0.44, 0.50, 0.58, 0.66, 0.74, 0.83, 0.90, 0.98];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let scrollRatio = 0;
  let waveAmp = 0;
  let wavePhase = 0;
  let targetLift = 0;
  let curLift = 0;
  let rafId = 0;

  let isDocHidden = Boolean(document.hidden);
  let isContentSkipped = false;
  let isIntersecting = true;
  let needsRedraw = false;
  let pendingWave = false;

  const isPaused = () => isDocHidden || isContentSkipped || !isIntersecting;
  const hasWaveMotion = () => Math.abs(waveAmp) > 0.08 || Math.abs(targetLift - curLift) > 0.08;

  const cancelWaveRaf = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
  };

  const samplePts = () => {
    const isMobile = width < 700;
    const left = -16;
    const span = width + 32;
    const baseTop = isMobile ? height * 0.91 : height * 0.87;
    const ampY = Math.min(isMobile ? 76 : 128, height * (isMobile ? 0.10 : 0.16));
    return baseKnots.map((k, idx) => {
      const x = left + (idx / (baseKnots.length - 1)) * span;
      const endBoost = (idx / (baseKnots.length - 1)) * curLift;
      const ripple = waveAmp * Math.sin(idx * 0.95 - wavePhase) * (0.35 + (idx / 11) * 0.65);
      return { x, y: baseTop - k * ampY - endBoost + ripple, m: months[idx] };
    });
  };

  const traceSpline = (pts: ReturnType<typeof samplePts>) => {
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      ctx.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
        p2.x, p2.y
      );
    }
  };

  const renderFrame = () => {
    if (!width || !height) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isMobile = width < 700;
    const drawFrac = reducedMotion.matches
      ? 1
      : (isMobile ? 0.14 : 0.16) + (isMobile ? 0.86 : 0.84) * scrollRatio;
    const pts = samplePts();
    const maxX = -16 + (width + 32) * drawFrac;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.min(width, Math.max(0, maxX)), height);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, height);
    ctx.lineTo(pts[0].x, pts[0].y);
    traceSpline(pts);
    ctx.lineTo(pts[pts.length - 1].x, height);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, height * 0.62, 0, height);
    grad.addColorStop(0, isDark ? 'rgba(96, 165, 250, 0.12)' : 'rgba(29, 99, 220, 0.08)');
    grad.addColorStop(1, isDark ? 'rgba(96, 165, 250, 0)' : 'rgba(29, 99, 220, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    if (drawFrac < 0.995 && maxX > 4) {
      const featherW = Math.min(72, Math.max(24, maxX));
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const fadeMask = ctx.createLinearGradient(maxX - featherW, 0, maxX, 0);
      fadeMask.addColorStop(0, 'rgba(0, 0, 0, 0)');
      fadeMask.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = fadeMask;
      ctx.fillRect(maxX - featherW, 0, featherW + 2, height);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    traceSpline(pts);
    ctx.strokeStyle = isDark ? 'rgba(147, 197, 253, 0.48)' : 'rgba(29, 99, 220, 0.36)';
    ctx.lineWidth = 1.35;
    ctx.stroke();
    ctx.restore();

    if (drawFrac > 0.05 && drawFrac < 0.995 && width >= 480) {
      const fIdx = drawFrac * (pts.length - 1);
      const lo = Math.floor(fIdx);
      const hi = Math.min(pts.length - 1, lo + 1);
      const frac = fIdx - lo;
      const bx = lerp(pts[lo].x, pts[hi].x, frac);
      const by = lerp(pts[lo].y, pts[hi].y, frac);

      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(96, 165, 250, 0.18)' : 'rgba(29, 99, 220, 0.14)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#93c5fd' : '#1d63dc';
      ctx.fill();

      const approxJt = (getSaldo() / 1000000).toFixed(2).replace('.', ',');
      const label = `${pts[hi].m} · Rp ${approxJt} jt`;
      ctx.font = '500 10px "JetBrains Mono", monospace';
      const padX = 7;
      const pillH = 18;
      const pillW = Math.ceil(ctx.measureText(label).width + padX * 2);
      const rawX = bx > width - (pillW + 26) ? bx - pillW - 12 : bx + 12;
      const px = Math.max(10, Math.min(width - pillW - 10, rawX));
      const py = Math.max(8, by - pillH - 7);

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(px, py, pillW, pillH, 6);
      } else {
        const r = 6;
        ctx.moveTo(px + r, py);
        ctx.lineTo(px + pillW - r, py);
        ctx.quadraticCurveTo(px + pillW, py, px + pillW, py + r);
        ctx.lineTo(px + pillW, py + pillH - r);
        ctx.quadraticCurveTo(px + pillW, py + pillH, px + pillW - r, py + pillH);
        ctx.lineTo(px + r, py + pillH);
        ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - r);
        ctx.lineTo(px, py + r);
        ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.closePath();
      }
      ctx.fillStyle = isDark ? 'rgba(15, 16, 17, 0.84)' : 'rgba(250, 248, 246, 0.88)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(245, 245, 247, 0.16)' : 'rgba(24, 20, 18, 0.12)';
      ctx.stroke();

      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark ? '#e5e7eb' : '#181412';
      ctx.fillText(label, px + padX, py + pillH / 2 + 0.5);
      ctx.textBaseline = 'alphabetic';
    }
  };

  const draw = () => {
    if (isPaused()) {
      needsRedraw = true;
      return;
    }
    needsRedraw = false;
    renderFrame();
  };

  const tickWave = () => {
    if (isPaused()) {
      rafId = 0;
      pendingWave = true;
      return;
    }
    wavePhase += 0.24;
    waveAmp *= 0.93;
    curLift += (targetLift - curLift) * 0.12;
    renderFrame();
    needsRedraw = false;
    if (hasWaveMotion()) {
      rafId = requestAnimationFrame(tickWave);
    } else {
      waveAmp = 0;
      curLift = targetLift;
      rafId = 0;
      pendingWave = false;
      renderFrame();
    }
  };

  const syncVisibility = () => {
    if (isPaused()) {
      if (rafId) {
        cancelWaveRaf();
        pendingWave = true;
      }
      return;
    }
    if (pendingWave) {
      pendingWave = false;
      if (!reducedMotion.matches && hasWaveMotion()) {
        needsRedraw = false;
        if (!rafId) rafId = requestAnimationFrame(tickWave);
        return;
      }
      waveAmp = 0;
      curLift = targetLift;
      needsRedraw = true;
    }
    if (needsRedraw) draw();
  };

  const onVisibilityChange = () => {
    isDocHidden = Boolean(document.hidden);
    syncVisibility();
  };

  const onContentVisibilityChange = (event: Event) => {
    isContentSkipped = Boolean((event as ContentVisibilityEvent).skipped);
    syncVisibility();
  };

  const onDocumentContentVisibilityChange = (event: Event) => {
    const target = event.target as Node | null;
    const affectsCanvas =
      !target ||
      target === canvas ||
      target === document ||
      (typeof target.contains === 'function' && target.contains(canvas));
    if (!affectsCanvas) return;
    isContentSkipped = Boolean((event as ContentVisibilityEvent).skipped);
    syncVisibility();
  };

  const onReducedMotionChange = () => {
    if (reducedMotion.matches) {
      cancelWaveRaf();
      pendingWave = false;
      waveAmp = 0;
      curLift = targetLift;
    }
    draw();
  };

  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        isIntersecting = Boolean(entry.isIntersecting);
        syncVisibility();
      },
      { threshold: 0 }
    );
    observer.observe(canvas);
  }

  resize();
  draw();
  reducedMotion.addEventListener?.('change', onReducedMotionChange);
  document.addEventListener?.('visibilitychange', onVisibilityChange);
  document.addEventListener?.('contentvisibilityautostatechange', onDocumentContentVisibilityChange, { capture: true });
  canvas.addEventListener?.('contentvisibilityautostatechange', onContentVisibilityChange);

  return {
    redraw: draw,
    setScroll: (ratio: number) => {
      scrollRatio = ratio;
      if (!rafId) draw();
    },
    wave: (dir: number) => {
      targetLift = Math.max(-28, Math.min(36, ((getSaldo() - initialSaldo) / 50000) * 5));
      if (reducedMotion.matches) {
        curLift = targetLift;
        draw();
        return;
      }
      waveAmp = dir === 0 ? 5 : dir * 13;
      if (isPaused()) {
        pendingWave = true;
        needsRedraw = true;
        return;
      }
      if (!rafId) rafId = requestAnimationFrame(tickWave);
    },
    onResize: () => {
      resize();
      draw();
    },
    destroy: () => {
      cancelWaveRaf();
      observer?.disconnect();
      observer = null;
      document.removeEventListener?.('visibilitychange', onVisibilityChange);
      document.removeEventListener?.('contentvisibilityautostatechange', onDocumentContentVisibilityChange, { capture: true });
      canvas.removeEventListener?.('contentvisibilityautostatechange', onContentVisibilityChange);
      reducedMotion.removeEventListener?.('change', onReducedMotionChange);
    }
  };
};
