// 48 Hours in Shanghai - cinematic scroll engine.
// Momentum scroll (Lenis), preloader, scroll-scrubbed parallax + crossfade,
// journey trail, kinetic reveals, film HUD, and a generative ambient soundscape. No build step.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));

/* ---------------------------------------------------------------- preloader */
(function preloader() {
  const loader = document.getElementById('loader');
  const pctEl = document.getElementById('loader-pct');
  const barEl = document.getElementById('loader-bar');
  if (!loader) { document.body.classList.add('loaded'); revealHero(); return; }

  let p = 0, done = false;
  const render = (v) => { if (pctEl) pctEl.textContent = Math.round(v); if (barEl) barEl.style.width = v + '%'; };
  const tick = setInterval(() => { if (done) return; p = Math.min(96, p + Math.random() * 9 + 3); render(p); }, 95);

  const heroReady = new Promise((res) => {
    const img = new Image();
    img.onload = img.onerror = () => res();
    img.src = './assets/hero.jpg';
    if (img.decode) img.decode().then(() => res()).catch(() => {});
  });
  const minTime = new Promise((res) => setTimeout(res, reduce ? 200 : 1500));

  Promise.all([heroReady, minTime]).then(() => {
    done = true; clearInterval(tick); render(100);
    setTimeout(() => { document.body.classList.add('loaded'); revealHero(); }, 240);
  });
})();

function revealHero() {
  document.querySelectorAll('.on-load').forEach((el) => el.classList.add('is-visible'));
}

/* ----------------------------------- seamless scenes (no black pop-in) */
// Fade each scene image in when it decodes; warm the whole set right after the
// hero is up, so a fast scroll never outruns a lazy image into a black frame.
document.querySelectorAll('.chapter__bg img').forEach((img) => {
  if (img.complete && img.naturalWidth) return;
  img.style.opacity = '0';
  img.addEventListener('load', () => { img.style.opacity = '1'; }, { once: true });
});
function warmImages() {
  ['bund', 'nanjing', 'pudong', 'alley', 'garden', 'food', 'outro'].forEach((n) => { const i = new Image(); i.src = './assets/' + n + '.jpg'; });
}
addEventListener('load', () => setTimeout(warmImages, 300));

/* ------------------------------------- reveals (scroll-driven = Lenis-proof) */
// Driven from the frame() loop rather than IntersectionObserver thresholds, so
// headlines reveal reliably no matter how the page is scrolled (wheel, Lenis, jump).
let pending = [...document.querySelectorAll('.reveal:not(.on-load), .kinetic:not(.on-load)')];
if (reduce) { pending.forEach((el) => el.classList.add('is-visible')); pending = []; }
function checkReveals(vh) {
  if (!pending.length) return;
  const keep = [];
  for (const el of pending) {
    // defer the class-add one frame so the base state always paints first
    // (prevents the clip-path/opacity transition stalling on an instant scroll jump)
    if (el.getBoundingClientRect().top < vh * 0.88) requestAnimationFrame(() => el.classList.add('is-visible'));
    else keep.push(el);
  }
  pending = keep;
}

/* ------------------------------------------------- HUD + trail active chapter */
const chapters = [...document.querySelectorAll('.chapter')];
const trailDots = [...document.querySelectorAll('.trail__dot')];
const hudNo = document.getElementById('hud-no'), hudPlace = document.getElementById('hud-place'), hudTime = document.getElementById('hud-time');
let activeIdx = -1;
function setActive(i) {
  if (i === activeIdx) return;
  activeIdx = i;
  const c = chapters[i];
  if (c) {
    if (hudNo) hudNo.textContent = c.dataset.no;
    if (hudPlace) hudPlace.textContent = c.dataset.place;
    if (hudTime) hudTime.textContent = c.dataset.time;
  }
  trailDots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.classList.toggle('is-done', k < i); });
}
// active chapter is computed in frame() (scroll-driven) so the HUD + trail never lag

/* --------------------------------------- scroll-driven parallax + crossfade + trail */
const bgs = [...document.querySelectorAll('[data-parallax]')];
const sections = [...document.querySelectorAll('.chapter')];
const bar = document.getElementById('progress-bar');
const trailFill = document.getElementById('trail-fill');
let ticking = false;

function frame() {
  const vh = window.innerHeight;
  checkReveals(vh);
  if (!reduce) {
    // ken-burns parallax drift
    for (const bg of bgs) {
      const host = bg.closest('.chapter') || bg.closest('.intro') || bg.closest('.outro') || bg.parentElement;
      const r = host.getBoundingClientRect();
      const prog = (vh - r.top) / (vh + r.height);
      const t = (clamp(prog) - 0.5) * 2;
      bg.style.transform = `translate3d(0, ${(t * 6).toFixed(2)}%, 0) scale(1.08)`;
    }
    // crossfade: each scene melts in as it rises into the frame
    for (const sec of sections) {
      const sticky = sec.firstElementChild;
      const r = sec.getBoundingClientRect();
      const enter = clamp((vh - r.top) / (vh * 0.62));
      if (sticky) sticky.style.opacity = enter.toFixed(3);
    }
  }
  const max = document.documentElement.scrollHeight - vh;
  const sp = max > 0 ? clamp(window.scrollY / max) : 0;
  if (bar) bar.style.width = (sp * 100).toFixed(2) + '%';
  if (trailFill) trailFill.style.height = (sp * 100).toFixed(2) + '%';
  // active chapter = the last scene scrolled to at least the viewport middle
  let act = -1;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].getBoundingClientRect().top <= vh * 0.5) act = i; else break;
  }
  if (act >= 0) setActive(act);
  ticking = false;
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
window.__frame = frame;

/* ------------------------------------------------ momentum scroll (Lenis) */
let lenis = null;
async function initScroll() {
  if (!reduce) {
    try {
      const mod = await import('lenis');
      const Lenis = mod.default || mod.Lenis;
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true, touchMultiplier: 1.6 });
      window.__lenis = lenis;
      lenis.on('scroll', onScroll);
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { /* graceful fallback to native scroll */ }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();
}
initScroll();

// smooth anchor jumps (trail dots, scroll-again, skip link)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (ev) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    ev.preventDefault();
    const y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });
});

/* -------------------------------------------- generative ambient soundscape */
(function ambient() {
  const btn = document.getElementById('sound');
  if (!btn) return;
  let ctx = null, master = null, nodes = [], on = false;

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // low drone - two detuned oscillators through a lowpass = warm city hum
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
    lp.connect(master);
    [55, 82.5, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f * (1 + (i - 1) * 0.004);
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.12 : 0.22;
      o.connect(g).connect(lp); o.start();
      // slow LFO drift on gain for life
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.03 + i * 0.017;
      const lg = ctx.createGain(); lg.gain.value = 0.05;
      lfo.connect(lg).connect(g.gain); lfo.start();
      nodes.push(o, lfo);
    });

    // airy filtered noise = distant traffic / rain shimmer
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0.04;
    noise.connect(bp).connect(ng).connect(master); noise.start();
    nodes.push(noise);
  }

  btn.addEventListener('click', () => {
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    on = !on;
    btn.setAttribute('aria-pressed', String(on));
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(on ? 0.5 : 0, now + (on ? 1.6 : 0.7));
  });
})();
