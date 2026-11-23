export function createKasiVectorSvg(kind: string, clsName: string) {
  const ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(clsName || 'kasi-particle');
  function mk(tag: string, attrs: Record<string, string>) {
    var el = document.createElementNS(ns, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  if (kind === 'heart') {
    svg.appendChild(mk('path', {
      d: 'M12 20.5 C12 20.5 3.5 14.8 3.5 8.8 C3.5 5.8 5.8 3.8 8.3 3.8 C10 3.8 11.3 4.8 12 6 C12.7 4.8 14 3.8 15.7 3.8 C18.2 3.8 20.5 5.8 20.5 8.8 C20.5 14.8 12 20.5 12 20.5 Z',
      fill: 'var(--danger)'
    }));
  } else if (kind === 'note') {
    svg.appendChild(mk('path', {
      d: 'M9 17.5 V6 L18 4.2 V15.5',
      fill: 'none',
      stroke: 'var(--hybrid-spot)',
      'stroke-width': '2.2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));
    svg.appendChild(mk('circle', { cx: '7', cy: '17.5', r: '2.6', fill: 'var(--hybrid-spot)' }));
    svg.appendChild(mk('circle', { cx: '16', cy: '15.5', r: '2.6', fill: 'var(--hybrid-spot)' }));
  } else if (kind === 'coin') {
    svg.appendChild(mk('circle', { cx: '12', cy: '12', r: '9.5', fill: 'var(--hybrid-amber)', stroke: 'var(--accent-ink)', 'stroke-width': '1.4' }));
    svg.appendChild(mk('circle', { cx: '12', cy: '12', r: '6.2', fill: 'none', stroke: 'var(--accent-ink)', 'stroke-width': '1.2' }));
    svg.appendChild(mk('path', { d: 'M12 8.2 V15.8', stroke: 'var(--accent-ink)', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
  } else if (kind === 'fish') {
    svg.appendChild(mk('path', { d: 'M4 12 C8 6.5 15 6.5 18 12 C15 17.5 8 17.5 4 12 Z', fill: 'var(--hybrid-paid)' }));
    svg.appendChild(mk('path', { d: 'M17 12 L22 8 V16 Z', fill: 'var(--hybrid-spot)' }));
    svg.appendChild(mk('circle', { cx: '8.5', cy: '11', r: '1.2', fill: 'var(--kasi-eye-white, #F8FAFC)' }));
  } else {
    svg.appendChild(mk('path', {
      d: 'M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z',
      fill: 'var(--hybrid-amber)'
    }));
  }
  return svg;
}

function getFxHostLayer() {
  var openDlgs = document.querySelectorAll('dialog[open]');
  return openDlgs.length ? openDlgs[openDlgs.length - 1] : document.body;
}

export function spawnKasiParticles(anchorEl: Element | null, kinds: string[], count: number) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !anchorEl) return;
  var r = anchorEl.getBoundingClientRect();
  if (!r.width || !r.height) return;
  var host = getFxHostLayer();
  var cx = r.left + r.width / 2;
  var cy = Math.max(20, r.top + r.height * 0.28);
  var total = Math.max(3, Math.min(5, count || 4));
  var list = (kinds && kinds.length) ? kinds : ['heart', 'star', 'note'];

  for (var i = 0; i < total; i++) {
    (function (idx) {
      var kind = list[idx % list.length];
      var node = createKasiVectorSvg(kind, 'kasi-particle');
      var startX = cx + (idx - (total - 1) / 2) * 14 + (Math.random() * 8 - 4);
      var startY = cy + (Math.random() * 6 - 3);
      node.style.left = (startX - 9).toFixed(1) + 'px';
      node.style.top = (startY - 9).toFixed(1) + 'px';
      host.appendChild(node);

      var dx = (idx - (total - 1) / 2) * 18 + (Math.random() * 14 - 7);
      var dy = -(34 + Math.random() * 26);
      var rot = (idx % 2 === 0 ? 1 : -1) * (12 + Math.random() * 20);
      if (node.animate) {
        var anim = node.animate([
          { transform: 'translate(0px, 0px) scale(0.55) rotate(0deg)', opacity: 0 },
          { transform: 'translate(' + (dx * 0.4).toFixed(1) + 'px, ' + (dy * 0.45).toFixed(1) + 'px) scale(1.08) rotate(' + (rot * 0.5).toFixed(1) + 'deg)', opacity: 1, offset: 0.25 },
          { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(0.85) rotate(' + rot.toFixed(1) + 'deg)', opacity: 0 }
        ], { duration: 760 + idx * 60, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
        anim.onfinish = function () { if (node.parentNode) node.remove(); };
        setTimeout(function () { if (node.parentNode) node.remove(); }, 1150);
      } else {
        node.remove();
      }
    })(i);
  }
}

function flyParabolicTreat(sx: number, sy: number, tx: number, ty: number, size: number, duration: number, kind: string, onImpact: () => void) {
  var reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var node = createKasiVectorSvg(kind, 'kasi-treat-fly');
  if (reduced || !node.animate) {
    if (onImpact) onImpact();
    return function () {};
  }
  node.style.width = size + 'px';
  node.style.height = size + 'px';
  node.style.left = sx.toFixed(1) + 'px';
  node.style.top = sy.toFixed(1) + 'px';
  getFxHostLayer().appendChild(node);

  var dx = tx - sx;
  var dy = ty - sy;
  var arcX = dx * 0.5;
  var arcY = Math.min(0, dy * 0.5) - 48;
  var fired = false;
  let anim: Animation;
  function finishImpact(skipCallback: boolean) {
    if (fired) return;
    fired = true;
    if (node.parentNode) node.remove();
    if (!skipCallback && onImpact) onImpact();
  }
  anim = node.animate([
    { transform: 'translate(0px, 0px) scale(0.85) rotate(0deg)', opacity: 1 },
    { transform: 'translate(' + arcX.toFixed(1) + 'px, ' + arcY.toFixed(1) + 'px) scale(1.22) rotate(180deg)', opacity: 1, offset: 0.52 },
    { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(0.65) rotate(360deg)', opacity: 0.25 }
  ], { duration: duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
  anim.onfinish = function () { finishImpact(false); };
  setTimeout(function () { finishImpact(false); }, duration + 40);
  return function cancel() {
    try { anim.cancel(); } catch (_) {}
    finishImpact(true);
  };
}

export function launchKasiTreat(fromEl: Element | null, toEl: Element | null, kind: string, onImpact: () => void) {
  if (!fromEl || !toEl) {
    if (onImpact) onImpact();
    return function () {};
  }
  var fr = fromEl.getBoundingClientRect();
  var tr = toEl.getBoundingClientRect();
  if (!fr.width || !tr.width) {
    if (onImpact) onImpact();
    return function () {};
  }
  return flyParabolicTreat(
    fr.left + fr.width / 2 - 12,
    fr.top + fr.height / 2 - 12,
    tr.left + tr.width / 2 - 12,
    tr.top + tr.height / 2 - 12,
    24,
    420,
    kind,
    onImpact
  );
}

export function launchKasiTreatToPoint(fromRect: DOMRect, toX: number, toY: number, kind: string, onImpact: () => void) {
  if (!fromRect || !fromRect.width) {
    if (onImpact) onImpact();
    return function () {};
  }
  return flyParabolicTreat(
    fromRect.left + fromRect.width / 2 - 14,
    fromRect.top + fromRect.height / 2 - 14,
    toX,
    toY,
    28,
    360,
    kind,
    onImpact
  );
}
