/**
 * @module journey
 * Scroll-driven backdrop for the landing page: "Perjalanan Visual dari
 * Langit ke Bumi" (docs/plan-landing-redesign.md, Bagian 14).
 *
 * The module owns exactly one job: turn the visitor's scroll position into
 * per-layer state for the fixed `.sky-stage`, by writing custom properties on
 * that element. It paints nothing and animates nothing on its own — the
 * layers, the gradients, and the cross-fade itself live in CSS
 * (css/onboarding.css + css/onboarding-motion.css section 5b).
 *
 * Output contract, consumed by css/onboarding-motion.css:
 *   --lp-j-sky | -ridge-far | -cloud | -land   opacity, 0…1
 *   --lp-y-sky | -ridge-far | -cloud | -land   drift, % of the layer's height
 *
 * Failure behaviour: if `.sky-stage` or the section anchors are missing, the
 * module writes the documented page-top state (sky only) and stops. It never
 * throws, so a broken backdrop can never take the landing page's other
 * wiring down with it.
 */

/* Normalised stops of the journey. Each value is the progress `t` reached
 * when the matching [data-lp-journey] element's top edge touches the top of
 * the viewport. Anchoring to real sections instead of to a raw fraction of
 * the document is what keeps the sky → clouds → mountains beats lined up with
 * the same content on a 390px phone and on a 1280px desktop, whose page
 * heights differ by a factor of several. */
const JOURNEY_STOPS = {
  'clouds-in': 0.22,  // product band: the sky is dissolving, the cloud deck arrives
  'land-in': 0.50,    // feature tiles: ridges rise from behind the cloud deck
  'clouds-out': 0.78, // matrix: clouds are gone, the ridge base is fading out
  'solid': 1.00       // FAQ: the journey is over, the page stands on the canvas
};

/* Per-layer behaviour, all expressed in t.
 *   fadeIn  — t window over which the layer appears
 *   fadeOut — t window over which the layer disappears
 *   drift   — t window over which the layer travels from `from` to `to`
 * `from`/`to` are percentages of the layer's own height; the stage is
 * viewport-sized, so 1% ≈ 1vh. The travel is deliberately small: this is a
 * camera settling, not a parallax rig. Each layer obeys one curve, so the
 * cross-fade can never desynchronise from the scroll position.
 * The windows overlap on purpose — that is what removes the "garis patah"
 * between one visual band and the next. */
const JOURNEY_LAYERS = [
  { name: 'sky',       fadeIn: [0.00, 0.00], fadeOut: [0.14, 0.34], drift: [0.00, 0.34], from: 0,  to: -9 },
  { name: 'ridge-far', fadeIn: [0.24, 0.44], fadeOut: [0.60, 0.86], drift: [0.22, 0.88], from: 30, to: -10 },
  { name: 'cloud',     fadeIn: [0.06, 0.24], fadeOut: [0.56, 0.80], drift: [0.08, 0.80], from: 16, to: -20 },
  { name: 'land',      fadeIn: [0.36, 0.58], fadeOut: [0.68, 0.96], drift: [0.34, 1.00], from: 26, to: -12 }
];

/** Drift is the only part of the journey that moves; reduced motion drops it. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * 0 → 1 as `t` crosses [from, to]. A zero-width window is an on/off switch,
 * which is how a layer that is present for the whole journey is expressed.
 */
const ramp = (t, from, to) => {
  if (to <= from) return t >= to ? 1 : 0;
  return clamp01((t - from) / (to - from));
};

const lerp = (start, end, k) => start + (end - start) * k;

/** Piecewise-linear scrollY → t across the (strictly increasing) anchor stops. */
const progressAt = (scrollY, stops) => {
  if (!stops.length) return 0;
  const first = stops[0];
  if (scrollY <= first.offset) return first.t;

  const last = stops[stops.length - 1];
  if (scrollY >= last.offset) return last.t;

  for (let i = 1; i < stops.length; i += 1) {
    const previous = stops[i - 1];
    const next = stops[i];
    if (scrollY <= next.offset) {
      const span = next.offset - previous.offset;
      return lerp(previous.t, next.t, span > 0 ? (scrollY - previous.offset) / span : 1);
    }
  }
  return last.t;
};

/**
 * Read the document once and turn the [data-lp-journey] markers into scroll
 * offsets. Offsets are clamped to the real scroll range and forced to
 * increase: on a short page two markers can land on the same pixel, and a
 * duplicate offset would make the piecewise interpolation divide by zero.
 */
const collectStops = () => {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const markers = Array.from(document.querySelectorAll('[data-lp-journey]'))
    .map((element) => {
      const t = JOURNEY_STOPS[element.getAttribute('data-lp-journey')];
      if (typeof t !== 'number') return null;
      const offset = element.getBoundingClientRect().top + window.scrollY;
      return { t, offset: Math.min(Math.max(offset, 0), maxScroll) };
    })
    .filter(Boolean)
    .sort((a, b) => a.offset - b.offset);

  const stops = [{ t: 0, offset: 0 }];
  for (const marker of markers) {
    if (marker.offset > stops[stops.length - 1].offset) stops.push(marker);
  }

  /* The journey must always finish by the end of the page. Without this, a
   * page whose last anchor got clamped (or dropped as a duplicate) would leave
   * the visitor on a half-faded mountain. */
  const finalStop = stops[stops.length - 1];
  if (finalStop.t < 1 && maxScroll > finalStop.offset) {
    stops.push({ t: 1, offset: maxScroll });
  }

  return stops.length > 1 ? stops : [];
};

/**
 * The full per-layer state at a given journey progress. Exported so the QA
 * harness (tests/qa/_qa-journey.html) and any future test can reproduce a
 * frame of the journey from the real curves instead of a second copy of them.
 * @param {number} t journey progress, 0…1
 * @param {boolean} [withDrift] drop the travel when reduced motion is on
 * @returns {Array<{name: string, opacity: number, drift: number}>}
 */
export const skyLayerStatesAt = (t, withDrift = true) => JOURNEY_LAYERS.map((layer) => ({
  name: layer.name,
  opacity: ramp(t, layer.fadeIn[0], layer.fadeIn[1])
    * (1 - ramp(t, layer.fadeOut[0], layer.fadeOut[1])),
  drift: withDrift ? lerp(layer.from, layer.to, ramp(t, layer.drift[0], layer.drift[1])) : 0
}));

/**
 * Bind the sky stage to the page scroll. Call once, after the DOM is parsed.
 */
export const initSkyJourney = () => {
  const stage = document.getElementById('sky-stage');
  if (!stage) return;

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const writtenOpacity = new Array(JOURNEY_LAYERS.length).fill('');
  const writtenDrift = new Array(JOURNEY_LAYERS.length).fill('');

  let stops = [];
  let measuredHeight = 0;
  let frameHandle = 0;

  const measure = () => {
    stops = collectStops();
    measuredHeight = document.documentElement.scrollHeight;
  };

  const paint = () => {
    frameHandle = 0;

    /* Content can change height long after load (web fonts, the FAQ accordion,
     * a rotated phone). Re-measure instead of painting against stale anchors. */
    if (document.documentElement.scrollHeight !== measuredHeight) measure();

    const t = progressAt(window.scrollY, stops);
    const allowDrift = !reducedMotion.matches;

    skyLayerStatesAt(t, allowDrift).forEach((layer, index) => {
      const opacityText = layer.opacity.toFixed(3);
      if (opacityText !== writtenOpacity[index]) {
        stage.style.setProperty(`--lp-j-${layer.name}`, opacityText);
        writtenOpacity[index] = opacityText;
      }

      if (!allowDrift) return;
      const driftText = `${layer.drift.toFixed(2)}%`;
      if (driftText !== writtenDrift[index]) {
        stage.style.setProperty(`--lp-y-${layer.name}`, driftText);
        writtenDrift[index] = driftText;
      }
    });
  };

  const schedule = () => {
    if (frameHandle) return;
    frameHandle = window.requestAnimationFrame(paint);
  };

  const remeasureAndSchedule = () => {
    measure();
    schedule();
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasureAndSchedule, { passive: true });
  window.addEventListener('orientationchange', remeasureAndSchedule, { passive: true });
  window.addEventListener('load', remeasureAndSchedule);
  reducedMotion.addEventListener('change', schedule);

  /* Web fonts change the height of every heading on the page. */
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(remeasureAndSchedule);
  }

  /* Paint the first state BEFORE opting in, so the deck is never briefly
   * visible at a stale position. Opting in is what activates the cloud deck
   * and the ridges, which the base stylesheet leaves hidden (Bagian 14.6). */
  measure();
  paint();
  document.documentElement.classList.add('js-motion');
};
