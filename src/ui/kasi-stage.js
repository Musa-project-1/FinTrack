import { getActiveGroupId, getGroupName, getIsAdminView } from '../core/state.js';
import { launchKasiTreat, spawnKasiParticles } from './kasi-effects.js';

const PETS_KEY = 'finkas_kasi_pets_v1';

export const KASI_PET_QUOTES = {
  id: [
    'Purrr~ makasih elusannya!',
    'Nyaa! Semangat jaga buku kasnya!',
    'Hangat sekali~ ekor Kasi goyang terus!',
    'Kas rapi, hati Kasi ikut senang!'
  ],
  en: [
    'Purrr~ thanks for the pets!',
    'Meow! Keep up the great ledger work!',
    'So cozy~ Kasi\u2019s tail is wagging!',
    'Tidy books make Kasi happy!'
  ]
};

export const KASI_BOOP_QUOTES = {
  id: [
    'Boop! Hidung Kasi geli nih!',
    'Meong! Lagi cek laporan iuran loh!',
    'Sapaan Maneki! Semoga iuran lancar!',
    'Hehe, colek terus ya kalau kangen~'
  ],
  en: [
    'Boop! That tickles Kasi\u2019s nose!',
    'Meow! Checking the dues report right now!',
    'Maneki wave! May inflows stay brisk!',
    'Hehe, keep booping anytime~'
  ]
};

export const KASI_TRICKS = [
  {
    label: { id: 'Salto 360', en: '360 Flip' },
    mood: 'celebrate',
    action: 'is-flipping',
    dur: 840,
    speech: { id: 'Wush! Salto 360 derajat merayakan kas yang rapi!', en: 'Whoosh! 360-degree flip celebrating a tidy ledger!' },
    particles: ['star', 'heart', 'star']
  },
  {
    label: { id: 'Sapaan Maneki', en: 'Maneki Wave' },
    mood: 'happy',
    action: 'is-waving',
    dur: 1700,
    speech: { id: 'Sapaan Maneki-neko! Semoga pemasukan bulan ini ramai!', en: 'Maneki-neko wave! Wishing strong inflows this month!' },
    particles: ['coin', 'star']
  },
  {
    label: { id: 'Mode Detektif', en: 'Detective Mode' },
    mood: 'explain',
    action: null,
    dur: 2400,
    speech: { id: 'Kacamata audit siap! Semua transaksi bisa dicek transparan.', en: 'Audit glasses on! Every transaction stays transparent.' },
    particles: []
  },
  {
    label: { id: 'Tidur Zzz', en: 'Sleepy Zzz' },
    mood: 'sleepy',
    action: null,
    dur: 3000,
    speech: { id: 'Hoamm~ Kasi tidur sejenak sambil memeluk buku kas...', en: 'Yawn~ Kasi is taking a quick nap hugging the ledger...' },
    particles: []
  }
];

let pets = 0;
try { pets = Number.parseInt(localStorage.getItem(PETS_KEY) || '0', 10) || 0; } catch {}
let affection = 0;
let trickIdx = 0;
let boopTimes = [];
let suppressTapUntil = 0;
let moodTimer;
let flipResetTimer;
const actionTimers = {};
const ACTION_CLASSES = ['is-purring', 'is-booped', 'is-dizzy', 'is-catching', 'is-chomping', 'is-flipping', 'is-waving'];

const isEn = () => document.body?.dataset?.lang === 'en';
const langKey = () => (isEn() ? 'en' : 'id');
const stageMascots = () => [...document.querySelectorAll('[data-kasi-mascot]:not(#tour-kasi-mini)')];

export const getPetCount = () => pets;

export const syncAllMascotMood = (mood, tempDurationMs = 0) => {
  clearTimeout(moodTimer);
  moodTimer = undefined;
  for (const svg of stageMascots()) svg.setAttribute('data-mood', mood || 'idle');
  if (tempDurationMs > 0) {
    moodTimer = setTimeout(() => {
      moodTimer = undefined;
      for (const svg of stageMascots()) svg.setAttribute('data-mood', 'idle');
    }, tempDurationMs);
  }
};

export const triggerAllMascotAction = (cls, durMs = 700) => {
  if (!cls) return;
  for (const svg of stageMascots()) {
    svg.classList.remove(cls);
    void svg.getBoundingClientRect();
    svg.classList.add(cls);
  }
  clearTimeout(actionTimers[cls]);
  actionTimers[cls] = setTimeout(() => {
    delete actionTimers[cls];
    for (const svg of stageMascots()) svg.classList.remove(cls);
  }, durMs);
};

export const setStageSpeech = (text) => {
  const el = document.getElementById('kasi-speech-text');
  if (el && text) el.textContent = text;
};

export const renderAffectionUI = () => {
  const chip = document.getElementById('kasi-pet-count-chip');
  const track = document.getElementById('kasi-love-track');
  const fill = document.getElementById('kasi-love-fill');
  const pct = Math.max(0, Math.min(100, Math.round(affection)));
  if (chip) chip.textContent = isEn() ? `Loved: ${pets}x` : `Disayang: ${pets}x`;
  if (track) track.setAttribute('aria-valuenow', String(pct));
  if (fill) fill.style.width = `${pct}%`;
};

/** @param {number} [delta] @param {Element|null} [anchorEl] @param {((text:string, duration:number)=>void)|null} [onBubble] */
export const incrementKasiAffection = (delta = 20, anchorEl = null, onBubble = null) => {
  if (flipResetTimer) {
    clearTimeout(flipResetTimer);
    flipResetTimer = undefined;
    if (affection >= 100) affection = 0;
  }
  pets += 1;
  try { localStorage.setItem(PETS_KEY, String(pets)); } catch {}
  affection = Math.min(100, affection + delta);
  renderAffectionUI();

  if (affection >= 100) {
    triggerAllMascotAction('is-flipping', 840);
    syncAllMascotMood('celebrate', 2200);
    const zone = anchorEl || document.getElementById('kasi-stage-pet-zone') || document.getElementById('kasi-fab');
    if (zone) spawnKasiParticles(zone, ['heart', 'star', 'heart', 'note', 'heart'], 5);
    const cheer = isEn()
      ? 'YAY 100% LOVE! Kasi flips 360 degrees celebrating your kindness!'
      : 'YEAY 100% SAYANG! Kasi salto 360 derajat merayakan kasih sayangmu!';
    setStageSpeech(cheer);
    if (onBubble) onBubble(isEn() ? 'Yay 100%! Happy flip~' : 'Hore 100%! Salto bahagia~', 2400);
    flipResetTimer = setTimeout(() => {
      flipResetTimer = undefined;
      affection = 0;
      renderAffectionUI();
    }, 960);
    return true;
  }
  return false;
};

const stagePet = (anchorEl, delta = 20) => {
  syncAllMascotMood('petting', 2200);
  triggerAllMascotAction('is-purring', 950);
  const quote = KASI_PET_QUOTES[langKey()][pets % KASI_PET_QUOTES[langKey()].length];
  setStageSpeech(quote);
  spawnKasiParticles(anchorEl, ['heart', 'star', 'note', 'heart'], 4);
  incrementKasiAffection(delta, anchorEl);
};

const stageBoop = (anchorEl) => {
  const now = Date.now();
  boopTimes = boopTimes.filter((ts) => now - ts < 1600);
  boopTimes.push(now);
  if (boopTimes.length >= 4) {
    boopTimes = [];
    triggerAllMascotAction('is-dizzy', 680);
    syncAllMascotMood('curious', 1600);
    setStageSpeech(isEn()
      ? 'Whoa dizzy~ easy on the boops, or Kasi might miscount the ledger!'
      : 'Wah pusing~ pelan-pelan coleknya, nanti salah hitung saldo!');
    spawnKasiParticles(anchorEl, ['star', 'star', 'star'], 3);
    return;
  }
  triggerAllMascotAction('is-booped', 520);
  triggerAllMascotAction('is-waving', 920);
  syncAllMascotMood('happy', 1600);
  setStageSpeech(KASI_BOOP_QUOTES[langKey()][boopTimes.length % KASI_BOOP_QUOTES[langKey()].length]);
  spawnKasiParticles(anchorEl, ['star', 'heart', 'note'], 3);
};

const attachStageRub = (zone) => {
  /** @type {{id: number, x: number, y: number, dist: number, lastFire: number} | null} */
  let drag = null;
  /** @type {{x:number|null, y:number|null, segs:{t:number, d:number}[], lastFire:number}} */
  const hover = { x: null, y: null, segs: [], lastFire: 0 };
  zone.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dist: 0, lastFire: 0 };
  });
  zone.addEventListener('pointermove', (e) => {
    const now = Date.now();
    if (drag && drag.id === e.pointerId) {
      drag.dist += Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (drag.dist >= 18) {
        suppressTapUntil = now + 420;
        if (now - drag.lastFire >= 450) {
          drag.lastFire = now;
          stagePet(zone, 20);
        }
      }
      return;
    }
    if (e.pointerType === 'touch') return;
    const step = hover.x === null || hover.y === null ? 0 : Math.hypot(e.clientX - hover.x, e.clientY - hover.y);
    hover.x = e.clientX;
    hover.y = e.clientY;
    if (step > 0 && step < 180) hover.segs.push({ t: now, d: step });
    hover.segs = hover.segs.filter((s) => now - s.t <= 900);
    if (hover.segs.reduce((sum, s) => sum + s.d, 0) >= 28 && now - hover.lastFire >= 480) {
      hover.segs = [];
      hover.lastFire = now;
      stagePet(zone, 20);
    }
  });
  const end = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.dist >= 18) suppressTapUntil = Date.now() + 420;
    drag = null;
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('pointerleave', () => { hover.x = null; hover.segs = []; });
  zone.addEventListener('click', () => {
    if (Date.now() >= suppressTapUntil) stageBoop(zone);
  });
};

export const initKasiStage = () => {
  const modal = /** @type {HTMLDialogElement | null} */ (document.getElementById('modal-faq'));
  const zone = document.getElementById('kasi-stage-pet-zone');
  if (!modal || !zone) return;

  attachStageRub(zone);

  document.getElementById('btn-kasi-pet')?.addEventListener('click', () => stagePet(zone, 25));
  const btnCoin = document.getElementById('btn-kasi-coin');
  btnCoin?.addEventListener('click', () => {
    launchKasiTreat(btnCoin, zone, 'coin', () => {
      syncAllMascotMood('coin', 2200);
      triggerAllMascotAction('is-catching', 680);
      setStageSpeech(isEn()
        ? 'Clink! Coin caught! Kasi\u2019s golden bell is ringing!'
        : 'Ting! Koin kas masuk! Lonceng emas Kasi ikut berbunyi!');
      spawnKasiParticles(zone, ['star', 'coin', 'star', 'heart'], 4);
      incrementKasiAffection(25, zone);
    });
  });

  const btnFish = document.getElementById('btn-kasi-fish');
  btnFish?.addEventListener('click', () => {
    launchKasiTreat(btnFish, zone, 'fish', () => {
      syncAllMascotMood('happy', 2200);
      triggerAllMascotAction('is-chomping', 620);
      setStageSpeech(isEn()
        ? 'Nom nom~ fresh fish! Kasi feels extra energized!'
        : 'Nyam nyam~ ikan segar! Kasi makin rajin jaga kas!');
      spawnKasiParticles(zone, ['note', 'heart', 'note', 'star'], 4);
      incrementKasiAffection(25, zone);
    });
  });

  document.getElementById('btn-kasi-trick')?.addEventListener('click', () => {
    const trick = KASI_TRICKS[trickIdx++ % KASI_TRICKS.length];
    for (const cls of ACTION_CLASSES) {
      clearTimeout(actionTimers[cls]);
      delete actionTimers[cls];
      for (const svg of stageMascots()) svg.classList.remove(cls);
    }
    const lbl = document.getElementById('kasi-trick-label');
    if (lbl) lbl.textContent = trick.label[langKey()];
    syncAllMascotMood(trick.mood, trick.dur);
    if (trick.action) triggerAllMascotAction(trick.action, trick.dur);
    setStageSpeech(trick.speech[langKey()]);
    if (trick.particles.length) spawnKasiParticles(zone, trick.particles, trick.particles.length);
  });

  document.addEventListener('finkas:modal-opened', (e) => {
    if (e.detail?.id !== 'modal-faq') return;
    const groupName = document.getElementById('app-group-name')?.textContent?.trim() || getGroupName(getActiveGroupId()) || 'Finkas';
    const greeting = getIsAdminView()
      ? (isEn() ? `Meow Treasurer! Ready in ${groupName}? Pet Kasi or test tricks while managing kas.` : `Miaw Pengurus! Di buku ${groupName}, elus Kasi atau coba trik sambil kelola kas.`)
      : (isEn() ? `Meow! I'm Kasi, your ledger companion in ${groupName}. Pet me, toss coins, or check the guide!` : `Miaw! Saya Kasi si kucing kas (${groupName}). Elus kepalaku, beri koin, atau baca panduan di bawah!`);
    setStageSpeech(greeting);
    renderAffectionUI();
  });

  modal.addEventListener('close', () => {
    syncAllMascotMood('idle');
    const lbl = document.getElementById('kasi-trick-label');
    if (lbl) lbl.textContent = isEn() ? 'Tricks & Nap' : 'Trik & Tidur';
  });

  const stageSvg = document.getElementById('kasi-stage-avatar');
  const stagePupils = stageSvg?.querySelectorAll('[data-kasi-stage-pupil]') || [];
  let pupilRaf = 0;
  modal.addEventListener('pointermove', (e) => {
    if (!modal.open || pupilRaf || !stageSvg || e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pupilRaf = requestAnimationFrame(() => {
      pupilRaf = 0;
      const r = stageSvg.getBoundingClientRect();
      const px = Math.max(-1.5, Math.min(1.5, (e.clientX - r.left - r.width / 2) / 90));
      const py = Math.max(-1.5, Math.min(1.5, (e.clientY - r.top - r.height / 2) / 90));
      for (const p of stagePupils) /** @type {SVGElement} */ (p).style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`;
    });
  }, { passive: true });

  renderAffectionUI();
};
