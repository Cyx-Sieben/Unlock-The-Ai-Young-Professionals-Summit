/* UNLOCK final script (single-page site). Text lives in content.json. */
const $ = id => document.getElementById(id);
const PAGES = [['#home','Home'],['#about','About'],['team.html','Our Team'],['#timeline','Timeline'],['#summit','Summit'],['#sponsors','Sponsors'],['#faq','Rules & FAQ'],['#contact','Contacts']];
const B = document.body.dataset.page === 'index' ? '' : 'index.html';   // on other pages, anchors point back to the home page
const Hf = p => p[0][0] === '#' ? B + p[0] : p[0];
const here = document.body.dataset.page;

// ---- Unlock gate (once per session): logo + button on a flat blue screen, then a pixel-grid reveal ----
let LOGO = 'assets/logo.png';
if (!sessionStorage.getItem('unlocked')) {
  document.body.classList.add('locked');
  document.body.insertAdjacentHTML('afterbegin', `<div id="gate"><div class="gate-center"><img src="${LOGO}" alt="UNLOCK"><button class="btn" id="unlockBtn" type="button">UNLOCK</button></div></div>`);
  $('unlockBtn').addEventListener('click', () => { sessionStorage.setItem('unlocked', '1'); pixelReveal($('gate')); }, { once: true });
}

/* Pixel reveal. A canvas covers the screen with blue squares. From the centre, a ring of small squares
   spreads outward; inside the ring the blue is gone (the site shows through), and the ring dissolves as it nears the edges.
   Tweak: CELL (square size), BAND (ring thickness, in squares), MS (duration). */
function pixelReveal(gate) {
  const COVER = getComputedStyle(document.documentElement).getPropertyValue('--gate').trim() || '#ffffff', INK = ['21,0,97', '38,32,138'];   // white screen, blue pixels
  const MS = 1900, BAND = 7;
  const finish = () => { gate.remove(); document.body.classList.remove('locked'); };
  gate.classList.add('opening');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTimeout(finish, 500); return; }
  const W = innerWidth, H = innerHeight, CELL = Math.max(18, Math.round(Math.max(W, H) / 52));
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL), cx = cols / 2, cy = rows / 2;
  const cv = document.createElement('canvas'); cv.id = 'pxcv'; cv.width = W; cv.height = H; gate.appendChild(cv);
  const ctx = cv.getContext('2d');
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push({ x: x * CELL, y: y * CELL, d: Math.hypot(x + .5 - cx, y + .5 - cy), n: Math.random() });
  const maxR = Math.hypot(cx, cy) + BAND, ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let t0 = null;
  const draw = ts => {
    if (t0 === null) t0 = ts;
    const t = Math.min((ts - t0) / MS, 1), R = ease(t) * maxR, fade = 1 - Math.pow(t, 3);
    ctx.clearRect(0, 0, W, H);
    for (const c of cells) {
      const u = (R - c.d) / BAND;                     // <0 not reached, 0..1 inside the ring, >1 already cleared
      if (u >= 1) continue;
      if (u <= 0 || c.n > u) { ctx.fillStyle = COVER; ctx.fillRect(c.x, c.y, CELL + 1, CELL + 1); }   // white square still standing
      if (u > 0) { const s = CELL * Math.sin(Math.PI * u) * (.45 + .55 * c.n), o = (CELL - s) / 2;   // small ring squares that grow then vanish
        ctx.fillStyle = `rgba(${INK[c.n > .5 ? 0 : 1]},${.9 * fade})`; ctx.fillRect(c.x + o, c.y + o, s, s); }
    }
    if (t < 1) requestAnimationFrame(draw); else finish();
  };
  gate.style.background = 'transparent';
  requestAnimationFrame(draw);
}

// ---- Shared nav, footer, command palette ----
$('navMount').outerHTML = `<header class="nav"><a class="logo" href="${B || '#home'}"><img src="${LOGO}" alt="UNLOCK home"></a>
<button class="burger" aria-label="Menu" onclick="document.body.classList.toggle('menu')">&#9776;</button>
<nav>${PAGES.map(p => `<a href="${Hf(p)}" class="${p[0]===here?'on':''}">${p[1]}</a>`).join('')}<a class="btn primary" href="${B}#register">Register Now!</a></nav></header>`;
$('footMount').outerHTML = `<footer>&copy; 2026 UNLOCK &middot; In collaboration with iCEP &middot; UiTM Shah Alam</footer>`;
document.body.insertAdjacentHTML('beforeend', `<div id="cmd"><div><input placeholder="Go to page..." aria-label="Go to page">${PAGES.map(p=>`<a href="${Hf(p)}">${p[1]}</a>`).join('')}</div></div>`);
const cmd = $('cmd'), cin = cmd.querySelector('input');
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmd.classList.add('show'); cin.focus(); }
  if (e.key === 'Escape') cmd.classList.remove('show');
});
cmd.onclick = e => { if (e.target === cmd) cmd.classList.remove('show'); };
cin.oninput = () => cmd.querySelectorAll('a').forEach(a => a.style.display = a.textContent.toLowerCase().includes(cin.value.toLowerCase()) ? '' : 'none');
document.querySelectorAll('.nav nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu')));
// highlight the current section in the nav, and fade blocks in as they scroll into view
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in');
  if (e.target.tagName === 'SECTION') document.querySelectorAll('.nav nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); } }), { threshold: .04 });
document.querySelectorAll('section').forEach(x => io.observe(x));
document.querySelectorAll('.card, h2, .trk, .steps, .crit, .prize, .stat, .sp').forEach(x => { if (!x.closest('.hero')) { x.classList.add('rv'); io.observe(x); } });
// cursor glow on cards
document.addEventListener('mousemove', e => { const c = e.target.closest && e.target.closest('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX-r.left+'px'); c.style.setProperty('--my', e.clientY-r.top+'px'); } });

// ---- Fill pages from content.json (each block only runs if that element exists) ----
const set = (id, v, html) => { const el = $(id); if (el) el[html ? 'innerHTML' : 'textContent'] = v; };
const list = (id, items, fn) => set(id, items.map(fn).join(''), true);
fetch('content.json').then(r => r.json()).then(c => {
  LOGO = c.logo || LOGO;
  document.querySelectorAll('[data-register]').forEach(a => a.href = c.registerUrl);
  titleFx(c.hero.title); set('heroSub', c.hero.subtitle); set('heroChip', c.hero.status);
  set('aboutSummary', c.about.summary); set('mission', '<span class="sublabel">OUR MISSION</span>' + c.about.mission, 1); set('vision', '<span class="sublabel">OUR VISION</span>' + c.about.vision, 1);
  set('objectives', c.about.objective); 
  
  list('timelineList', c.timeline, t => `<li><b>${t.date}: <span class="ttl">${t.title}</span></b><br><span class="muted">${t.detail}</span></li>`);
  
  list('faqList', c.faqs, f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`);
  set('cEmail', `Email: <a href="mailto:${c.contact.email}">${c.contact.email}</a>`, 1); set('cLoc', 'Location: ' + c.contact.location);
  extra(c); styleTitles(); renderTeam(c); touchHighlight(); enhance(c); countdown(c.eventDate); counters(c.live); askBar(c);
}).catch(() => console.error('Could not load content.json (open the site through GitHub Pages, not by double-clicking the file).'));

// ---- Countdown ----
function countdown(date) {
  const el = $('countdown'); if (!el) return;
  const tick = () => { let s = Math.max(0, (new Date(date) - Date.now()) / 1000);
    const v = [['days',86400],['hrs',3600],['min',60],['sec',1]].map(([n,d]) => { const x = Math.floor(s / d); s -= x * d; return `<div><b>${String(x).padStart(2,'0')}</b><small>${n}</small></div>`; });
    el.innerHTML = v.join(''); };
  tick(); setInterval(tick, 1000);
}

// ---- Live registration counters (Google Apps Script) ----
function counters(cfg) {
  const el = $('counters'); if (!el) return;
  const box = (k, label, cap) => `<div class="ctr"><span>${label}</span><br><b id="${k}Left">--</b> <span id="${k}Sfx">of ${cap} team spots left</span><div class="bar"><i id="${k}Bar"></i></div></div>`;
  el.innerHTML = box('s','Students',cfg.studentCap) + box('p','Professionals',cfg.professionalCap) + '<p class="mono muted" id="liveNote" style="font-size:.75rem"></p>';
  const show = (k, cap, n) => { const left = Math.max(cap - n, 0); $(k+'Left').textContent = left || 'Full'; $(k+'Sfx').textContent = left ? `of ${cap} team spots left` : 'registration closed for this group'; $(k+'Left').closest('.ctr').classList.toggle('full', !left); $(k+'Bar').style.width = Math.min(n / cap * 100, 100) + '%'; };
  if (!cfg.appsScriptUrl || cfg.appsScriptUrl.includes('PASTE')) { $('liveNote').textContent = 'Live counter not connected yet.'; return; }
  const load = () => fetch(cfg.appsScriptUrl).then(r => r.json()).then(d => { show('s', cfg.studentCap, +d.students||0); show('p', cfg.professionalCap, +d.professionals||0); [['stuForm', cfg.studentCap, d.students, 'Student category is full'], ['proForm', cfg.professionalCap, d.professionals, 'Young Professional category is full']].forEach(([id, cap, n, msg]) => {   // category full: lock its register button
      const b = $(id); if (b && (+n || 0) >= cap) { b.textContent = msg; b.removeAttribute('href'); b.classList.add('is-full'); } });
    $('liveNote').textContent = 'Live. Updated ' + new Date().toLocaleTimeString(); })
    .catch(() => $('liveNote').textContent = 'Live count unavailable. Please check again soon.');
  load(); setInterval(load, 30000);
}

// ---- "Ask UNLOCK" bar: matches the question to your FAQs and streams the answer ----
function askBar(c) {
  const form = $('askForm'); if (!form) return;
  const stop = 'the and for are you how what who when where can does this that with have from your our any about will there many much people some did not get got could would should been has was were its also into use need want tell give know please which they them their then than just more only each every here very really still sit'.split(' ');
  const words = s => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []).map(w => w.length > 3 ? w.replace(/s$/, '') : w).filter(w => !stop.includes(w));
  const all = c.faqs.concat(c.askOnly || []);
  const digits = String(c.contact.phone || '').replace(/\D/g, ''), wa = /EDIT/i.test(c.contact.phone || '') || digits.length < 9 ? '' : (digits[0] === '0' ? '6' + digits : digits);
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact.email || '') ? c.contact.email : '';
  const fb = ['I am not sure about that one, but our team can help. Please send us an email and we will answer you personally.',
              'That is a little outside what I can answer here. For help with this, please email the committee.'];
  let fbn = Math.random() * 2 | 0;
  const links = q => [wa ? `<a class="btn small" href="https://wa.me/${wa}?text=${encodeURIComponent('Hi UNLOCK team, I have a question: ' + q)}" target="_blank" rel="noopener">WhatsApp us</a>` : '',
    mail ? `<a class="btn small" href="mailto:${mail}?subject=${encodeURIComponent('UNLOCK question')}&body=${encodeURIComponent(q)}">Email us</a>` : '', '<a class="btn small" href="#contact">Contacts</a>'].join('');
  const answer = q => { const w = words(q);
    const cp = (p, q) => { let i = 0; while (i < p.length && i < q.length && p[i] === q[i]) i++; return i; };
    const hit = (x, list) => list.some(t => t === x || (Math.min(x.length, t.length) >= 5 && cp(x, t) >= 5));   // same word, or same stem (register / registration)
    const scored = all.map(f => { const tt = words(f.q), kk = words(f.kw || ''), at = words(f.a);
      const a = w.filter(x => hit(x, tt)).length, b = w.filter(x => hit(x, kk)).length, d = w.filter(x => at.includes(x)).length;
      return { f, sc: a + b >= 1 || d >= 2 ? a * 4 + b * 3 + d - tt.length * .01 : 0 }; }).sort((a, b) => b.sc - a.sc);   // must match the question or keywords (or 2+ answer words)
    if (scored[0].sc >= 3) { const f = scored[0].f, v = [f.a].concat(f.alt || []); f._n = f._n === undefined ? Math.random() * v.length | 0 : (f._n + 1) % v.length; return { text: v[f._n], contact: !!f.contact }; }
    fbn = (fbn + 1) % 2; return { text: fb[fbn], contact: true }; };      // not related or no match: point to WhatsApp / email
  const run = q => { if (!q.trim()) return; $('askInput').value = q; $('askOut').hidden = false; const t = $('askText'), r = answer(q); t.textContent = ''; $('askLinks').innerHTML = r.contact ? links(q) : ''; let i = 0;
    clearInterval(run.t); run.t = setInterval(() => { t.textContent = r.text.slice(0, ++i); if (i >= r.text.length) clearInterval(run.t); }, 12); };
  form.onsubmit = e => { e.preventDefault(); run($('askInput').value); };
  $('askChips').innerHTML = c.hero.prompts.map(p => `<button type="button">${p}</button>`).join('');
  $('askChips').onclick = e => e.target.tagName === 'BUTTON' && run(e.target.textContent);
}

// smooth scroll progress bar and nav shadow
document.body.insertAdjacentHTML('afterbegin', '<div class="progress" id="prog"></div>');
addEventListener('scroll', () => { const d = document.documentElement; $('prog').style.width = (d.scrollTop / (d.scrollHeight - d.clientHeight) * 100) + '%'; document.querySelector('.nav').classList.toggle('scrolled', d.scrollTop > 20); }, { passive: true });

// ---- new sections filled from content.json ----
function extra(c) {
  list('stats', c.stats, s => `<div class="stat"><b data-n="${s.n}">0</b><span>${s.label}</span></div>`);
  list('tracks', c.about.tracks, (t, i) => `<div class="trk"><i>0${i + 1}</i><span class="tt">${cap(t)}</span></div>`);
  list('ticker', c.about.tracks.concat(c.about.tracks), t => `<span>${t}</span>`);
  list('cohort', c.about.cohort, t => `<li>${t}</li>`);
  list('prepare', c.registration.prepare, t => `<li>${t}</li>`); list('regSteps', c.registration.steps, t => `<li>${t}</li>`);
  if ($('stuForm')) { $('stuForm').href = c.forms.student; $('proForm').href = c.forms.professional; }
  list('zones', c.summit.zones, z => `<div class="card accent hl"><h3>${z.t}</h3><p>${z.d}</p></div>`);
  list('passport', c.summit.passport, p => `<span>${p}</span>`); set('passportText', c.summit.passportText); set('peoples', c.summit.peoples);
  list('criteria', c.criteria, (x, i) => `<div class="crit rv"><i>${String(i + 1).padStart(2, '0')}</i><span>${x}</span></div>`);
  list('prizeGrid', c.awards, a => `<div class="prize rv"><b>${a.n}</b><strong>${a.label}</strong><small>${a.d}</small></div>`);
  list('submitList', c.submissions, t => `<li>${t}</li>`);
  list('rules', c.rules, (r, i) => { const t = r.t.replace(/^\d+\.\s*/, ''); return `<div class="card hl"><h3 class="rt"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t"><b>${t[0]}</b>${t.slice(1)}</span></h3><ul>${r.items.map(x => `<li>${x}</li>`).join('')}</ul></div>`; });
  const ini = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), link = o => o.url || 'https://www.google.com/search?q=' + encodeURIComponent(o.name),
    mark = (o, wm) => { const b = wm ? `<span class="wm">${o.name}</span>` : `<span class="mono-badge">${ini(o.name)}</span>`; return o.logo ? `<img src="${o.logo}" alt="${o.name} logo" onerror="this.outerHTML=this.dataset.fb" data-fb='${b}'>` : b; };
  list('sponsorList', c.sponsors, o => `<a class="sp rv" href="${link(o)}" target="_blank" rel="noopener sponsored"><div class="lg"${o.bg ? ` style="background:${o.bg}"` : ''}>${mark(o, 1)}</div><b>${o.name}</b><small>${o.role}</small><span class="go">VISIT &rarr;</span></a>`);
  list('partners', c.partners, o => `<a class="pt" href="${link(o)}" target="_blank" rel="noopener">${mark(o, 1)}<span><b>${o.name}</b><small>${o.role}</small></span></a>`);
  list('socials', c.socials, o => `<a class="btn primary" href="${o.url}" target="_blank" rel="noopener">${o.name} <span class="mono" style="margin-left:8px;opacity:.8">${o.handle}</span></a>`);
  const cal = $('calLink'); if (cal) cal.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(c.officialName) + '&dates=20261206/20261207&location=' + encodeURIComponent('Dewan Annex / Dewan Seroja, UiTM Shah Alam');
  const left = Math.ceil((new Date(c.regClose) - Date.now()) / 864e5);   // registration chip: live days left
  set('heroChip', left > 0 ? `Registration open · closes 9 Nov 2026 · ${left} day${left > 1 ? 's' : ''} left` : 'Registration closed');
  document.querySelectorAll('.crit,.prize,.trk,.stat,.sp').forEach(x => { x.classList.add('rv'); io.observe(x); });
  new IntersectionObserver((es, o) => es.forEach(e => { if (!e.isIntersecting) return; o.unobserve(e.target); const b = e.target, n = +b.dataset.n, t0 = performance.now();
    const step = t => { const p = Math.min((t - t0) / 1400, 1); b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }), { threshold: .5 })
    .observe && document.querySelectorAll('.stat b').forEach(b => countObs.observe(b));
}
const countObs = new IntersectionObserver((es, o) => es.forEach(e => { if (!e.isIntersecting) return; o.unobserve(e.target); const b = e.target, n = +b.dataset.n, t0 = performance.now();
  const step = t => { const p = Math.min((t - t0) / 1400, 1); b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }), { threshold: .5 });

// ---- 3D hero logo: stacked layers with a gentle mouse tilt ----
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = matchMedia('(pointer: coarse)').matches || innerWidth < 900;   // phones and tablets
(function logo3d() {
  const box = $('logo3d'); if (!box) return;
  let h = ''; for (let i = lite ? 2 : 5; i >= 1; i--) h += `<img class="ly" src="${LOGO}" alt="" style="transform:translateZ(${-i * 3}px);filter:brightness(${1 - i * .09})">`;
  box.innerHTML = `<div class="rig" id="rig">${h}<img class="front" src="${LOGO}" alt="UNLOCK: The AI & Young Professionals Summit"></div>`;
  const rig = $('rig');
  document.addEventListener('mousemove', e => { if (rig.getAnimations().length) return; const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    rig.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`; });
})();

// ---- 3D title: rise-in entrance, light wave, cursor tilt ----
function titleFx(t) {
  const h = $('heroTitle'); if (!h) return; h.setAttribute('aria-label', t);
  const cut = t.indexOf(':'); let k = 0;
  h.innerHTML = t.split(' ').map(w => `<span class="w">${[...w].map(ch => `<span class="ch ${k++ > cut ? 'br' : ''}" aria-hidden="true">${ch}</span>`).join('')}</span>`).join(' ');
  const chars = [...h.querySelectorAll('.ch')]; chars.forEach(c => c.style.opacity = 0);
  // Entrance. Desktop: rise out of a blur. Phones: simple rise (light on the GPU). Reduce-motion: soft fade only.
  const kf = calm ? [{ opacity: 0 }, { opacity: 1 }]
    : lite ? [{ opacity: 0, transform: 'translateY(.45em)' }, { opacity: 1, transform: 'none' }]
    : [{ opacity: 0, transform: 'translateY(.5em) rotateX(-80deg)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }];
  const enter = () => { chars.forEach((c, i) => { const a = c.animate(kf, { duration: calm ? 900 : 1000, delay: i * (calm ? 12 : lite ? 30 : 40), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      a.onfinish = () => { c.style.opacity = 1; a.cancel(); }; });
    if (calm) return;
    // A soft wave runs across the letters (transform only on phones, plus brightness on desktop)
    const wkf = lite ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-.07em)', offset: .5 }, { transform: 'translateY(0)' }]
      : [{ filter: 'brightness(1)', transform: 'translateY(0)' }, { filter: 'brightness(1.7)', transform: 'translateY(-.08em)', offset: .5 }, { filter: 'brightness(1)', transform: 'translateY(0)' }];
    const wave = () => { if (document.hidden) return; chars.forEach((c, i) => c.animate(wkf, { duration: 900, delay: i * 55, easing: 'ease-in-out' })); };
    setTimeout(() => { wave(); setInterval(wave, lite ? 10000 : 8000); }, 3500); };
  const btn = $('unlockBtn'); if (btn) btn.addEventListener('click', () => setTimeout(enter, 900)); else setTimeout(enter, 200);
  if (!lite && !calm) { h.style.transition = 'transform .3s ease-out';   // cursor tilt (mouse devices only)
    addEventListener('mousemove', e => { h.style.transform = `perspective(900px) rotateY(${(e.clientX / innerWidth - .5) * 8}deg) rotateX(${-(e.clientY / innerHeight - .5) * 5}deg)`; }); }
}

// ---- Hero background: network of nodes and "atoms". Full on desktop, lighter on phones, gentle if Reduce Motion is on ----
(function net() {
  const cv = $('net'); if (!cv) return;
  const ctx = cv.getContext('2d'), hero = cv.parentElement, BL = '38,32,138', BR = '140,109,70', speed = calm ? .4 : 1;
  let W, H, pts = [], mx = -999, my = -999, on = true, T, last = 0, lw = innerWidth, acc = 0, cnt = 0, level = 0;
  const size = () => { const r = hero.getBoundingClientRect(), d = lite ? Math.min(devicePixelRatio || 1, innerWidth < 640 ? 1.25 : 1.5) : (devicePixelRatio || 1);   // smaller canvas = smoother on older phones
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    T = innerWidth < 640 ? { max: 60, den: 11000, link: 120, atom: .1, r: 2, ar: 3.2, rx: 10, ry: 5 }
      : lite ? { max: 80, den: 13000, link: 130, atom: .12, r: 2.2, ar: 3.6, rx: 11, ry: 5 }
      : { max: 130, den: 9500, link: 150, atom: .14, r: 2.3, ar: 4, rx: 13, ry: 6 };
    pts = Array.from({ length: Math.round(Math.min(T.max, W * H / T.den)) }, () => { const atom = Math.random() < T.atom;
      return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, c: Math.random() < .42 ? BR : BL, atom, r: atom ? T.ar : T.r, a: Math.random() * 6.28 }; }); level = 0; };
  size(); addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; size(); } });
  if (!calm) { const point = (x, y) => { const r = cv.getBoundingClientRect(); mx = x - r.left; my = y - r.top; };
    hero.addEventListener('mousemove', e => point(e.clientX, e.clientY)); hero.addEventListener('mouseleave', () => mx = -999);
    hero.addEventListener('touchmove', e => point(e.touches[0].clientX, e.touches[0].clientY), { passive: true }); hero.addEventListener('touchend', () => mx = -999); }
  new IntersectionObserver(es => on = es[0].isIntersecting).observe(cv);
  (function draw(ts) { requestAnimationFrame(draw); if (!on || document.hidden) return; if (lite && ts - last < 28) return;
    const dt = Math.min(ts - last, 100); if (lite && last) { acc += dt; if (++cnt === 90) {           // quality watchdog: slow phone? use fewer nodes automatically
      if (acc / cnt > 42 && level < 2) { level++; pts.length = Math.floor(pts.length * .65); T.link *= .85; if (level === 2) document.documentElement.classList.add('perf-low'); } acc = cnt = 0; } }
    last = ts; ctx.clearRect(0, 0, W, H); const L2 = T.link * T.link;
    for (const p of pts) { const dm = Math.hypot(p.x - mx, p.y - my);
      if (dm < 130) { p.x += (p.x - mx) / dm * .9; p.y += (p.y - my) / dm * .9; }
      p.x += p.vx * speed; p.y += p.vy * speed; p.a += .025 * speed; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
    for (let i = 0; i < pts.length; i++) { const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) { const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < L2) { ctx.strokeStyle = `rgba(${a.c === b.c ? a.c : BR},${(1 - Math.sqrt(d2) / T.link) * .4})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      const dm = Math.hypot(a.x - mx, a.y - my);
      if (dm < 190) { ctx.strokeStyle = `rgba(${BR},${(1 - dm / 190) * .7})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke(); }
      ctx.fillStyle = `rgba(${a.c},.92)`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
      if (a.atom) { ctx.strokeStyle = `rgba(${a.c},.5)`; ctx.beginPath(); ctx.ellipse(a.x, a.y, T.rx, T.ry, a.a * .3, 0, 7); ctx.stroke();
        ctx.fillStyle = `rgba(${a.c === BL ? BR : BL},1)`; ctx.beginPath(); ctx.arc(a.x + Math.cos(a.a) * T.rx, a.y + Math.sin(a.a) * T.ry, 2, 0, 7); ctx.fill(); } }
  })(0);
})();

// ---- Extra interactive polish: card tilt, magnetic buttons, timeline highlight, rotating placeholder ----
function enhance(c) {
  if (!calm && matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.prize, .stat, #zones .card, .sp').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.transition = 'transform .15s ease-out');
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-3px)`; });
      el.addEventListener('mouseleave', () => { el.style.transition = 'transform .5s cubic-bezier(.22,.8,.24,1)'; el.style.transform = ''; }); });
    document.querySelectorAll('.btn.primary, .btn.brown').forEach(b => { if (b.closest('#register')) return;   // register area stays calm and light
     
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .15}px, ${(e.clientY - r.top - r.height / 2) * .25}px)`; });
      b.addEventListener('mouseleave', () => b.style.transform = ''); });
  }
  const tio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
  document.querySelectorAll('#timelineList li').forEach(li => tio.observe(li));
  const inp = $('askInput'); let pi = 0;
  if (inp && !calm) setInterval(() => { if (document.activeElement !== inp && !inp.value) inp.placeholder = 'Try: ' + c.hero.prompts[pi++ % c.hero.prompts.length]; }, 3500);
}

// ---- Phones: the hero logo drifts a little slower than the page, so scrolling feels alive ----
(function parallax() {
  const box = $('logo3d'); if (!box || !lite || calm) return; let busy = false;
  addEventListener('scroll', () => { if (busy) return; busy = true; requestAnimationFrame(() => { busy = false; const y = Math.min(scrollY, 700);
    box.style.transform = `translateY(${y * .18}px)`; box.style.opacity = Math.max(1 - y / 1100, .15); }); }, { passive: true });
})();

// ---- Photo background (About + tracks): scrolls slower than the page, so it drifts as you scroll up and down ----
(function bgParallax() {
  const secs = [...document.querySelectorAll('.px')]; if (!secs.length || calm) return;
  const speed = lite ? .88 : .75;   // 1 = still behind the page; lower = moves more with the page
  let busy = false, lw = innerWidth;
  const size = () => secs.forEach(s => { const bg = s.querySelector('.px-bg'); bg.style.height = Math.ceil(innerHeight + (1 - speed) * s.offsetHeight + 40) + 'px'; });
  const move = () => { busy = false; secs.forEach(s => { const r = s.getBoundingClientRect(); if (r.bottom < -300 || r.top > innerHeight + 300) return;
    const bg = s.querySelector('.px-bg'); const y = Math.max(0, -r.top * speed); bg.style.transform = `translate3d(0,${y}px,0)`; }); };
  size(); move();
  addEventListener('scroll', () => { if (!busy) { busy = true; requestAnimationFrame(move); } }, { passive: true });
  addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; size(); move(); } });   // ignore phone address-bar resizes
  addEventListener('load', () => { size(); move(); });
})();

// ---- Big-first-letter style for card titles and sub-headings; touch highlight for boxes ----
function cap(x) { return `<b class="cap">${x[0]}</b>${x.slice(1)}`; }
function styleTitles() {
  // bold CAPS titles
  document.querySelectorAll('.card.hl h3:not(.rt), #register .card h3, #zones .card h3, h3.sub, #awards .card h3').forEach(h => h.classList.add('ttl'));
  // big first letter for the contact cards
  document.querySelectorAll('#contact .card h3').forEach(h => { if (!h.querySelector('.cap')) h.innerHTML = cap(h.textContent); });
}
function touchHighlight() {   // phones and tablets: tapping a box turns it blue with white text (like hover on a computer)
  document.querySelectorAll('.trk, .card.hl, .pcard').forEach(el => {
    el.addEventListener('touchstart', () => { clearTimeout(el._t); el.classList.add('hot'); }, { passive: true });
    ['touchend', 'touchcancel'].forEach(ev => el.addEventListener(ev, () => { el._t = setTimeout(() => el.classList.remove('hot'), 450); }, { passive: true }));
  });
}

// ---- Our Team page (team.html): everything comes from "team" in content.json ----
function avFail(img) { if (!img.dataset.t) { img.dataset.t = 1; img.src = img.src.replace(/\.jpg$/, '.png'); } else img.remove(); }   // try .jpg, then .png, else keep the initials
function renderTeam(c) {
  const root = $('teamRoot'); if (!root || !c.team) return; const T = c.team; let k = 0, d = 0;
  const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ini = n => n.replace(/^dr\.?\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const person = (p, role) => typeof p === 'string' ? { name: p, role } : { role, ...p };
  const av = (p, cls, extra = '') => `<div class="av ${cls} ${k++ % 2 ? 'b2' : 'b1'}"><span>${ini(p.name)}</span><img src="${p.photo || 'assets/team/' + slug(p.name) + '.jpg'}" alt="${p.name}" loading="lazy" onerror="avFail(this)">${extra}</div>`;
  const dl = () => `style="--d:${(d++ % 5) * 70}ms"`;                       // gentle staggered reveal
  const tp = (p, cls, extra = '', mod = '') => `<figure class="tp ${mod} rv" tabindex="0" ${dl()}>${av(p, cls, extra)}<figcaption><b>${p.name}</b><small>${p.role || ''}</small></figcaption></figure>`;
  const total = T.advisors.length + T.leadership.reduce((a, g) => a + g.people.length, 0) + T.bureaus.reduce((a, b) => a + (b.hods || []).length + b.members.length, 0);
  set('tmCount', `${total} committee members · ${T.bureaus.length} bureaus`);
  const chips = [['advisors', 'Advisors'], ['leadership', 'Leadership']].concat(T.bureaus.map(b => [slug(b.name), b.name.replace(' Bureau', '')]));
  $('tmChips').innerHTML = chips.map(x => `<a href="#${x[0]}">${x[1]}</a>`).join('');
  const hodTag = r => 'HOD' + ((String(r).match(/HOD\)\s*(\d)/) || [])[1] ? ' ' + String(r).match(/HOD\)\s*(\d)/)[1] : '');
  root.innerHTML = `<figure class="group rv"><img src="${T.photo}" alt="The UNLOCK committee" onerror="this.parentElement.remove()"></figure>
    <div class="tm-block" id="advisors"><span class="mono label">Guided by</span><h2 class="ttl">Advisors</h2>
      <div class="adv-grid">${T.advisors.map(p => { p = person(p, 'Advisor'); return `<article class="adv rv" tabindex="0" ${dl()}>${av(p, 'xl')}<div><span class="tag">Advisor</span><b>${p.name}</b><small>Guiding the UNLOCK committee</small></div></article>`; }).join('')}</div></div>
    <div class="tm-block" id="leadership"><span class="mono label">Leading UNLOCK</span><h2 class="ttl">Leadership</h2>
      <div class="exec">${T.leadership.map(g => `<div class="duo rv" ${dl()}><h3>${g.title}</h3><div class="duo-people">${g.people.map(p => tp(person(p, p.role), 'lg', '', 'lead')).join('')}</div></div>`).join('')}</div></div>
    ${T.bureaus.map((b, i) => { const hs = b.hods || [], short = b.name.replace(' Bureau', '');
      return `<div class="tm-block bureau-sec" id="${slug(b.name)}"><div class="b-head"><span class="b-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div><span class="mono label">${hs.length + b.members.length} members</span><h2 class="ttl">${b.name}</h2></div></div>
      <div class="b-body"><div class="b-hods">${hs.map(p => { p = person(p, p.role); return tp(p, 'lg', `<i class="ribbon">${hodTag(p.role)}</i>`, 'hod'); }).join('')}</div>
      <div class="b-crew"><span class="mono crew-label">The ${short} team</span><div class="crew-grid">${b.members.map(m => tp(person(m, short), 'md')).join('')}</div></div></div></div>`; }).join('')}`;
  root.querySelectorAll('.rv').forEach(x => io.observe(x));
  // touch screens have no hover: tapping a person highlights them, tapping elsewhere (or another person) returns to normal
  if (!matchMedia('(hover: hover)').matches) root.addEventListener('click', e => {
    const t = e.target.closest('.tp, .adv');
    root.querySelectorAll('.is-active').forEach(x => x !== t && x.classList.remove('is-active'));
    if (t) t.classList.toggle('is-active');
  });
  list('tmSocials', c.socials, o => `<a class="btn primary" href="${o.url}" target="_blank" rel="noopener">${o.name} <span class="mono" style="margin-left:8px;opacity:.8">${o.handle}</span></a>`);
}
/* UNLOCK additions */
(() => {
const $ = id => document.getElementById(id);
const ready = (id, fn) => { const el = $(id); if (!el) return; if (el.children.length) return fn(el);
  const mo = new MutationObserver(() => { if (el.children.length) { mo.disconnect(); fn(el); } }); mo.observe(el, { childList: true }); };
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const M = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }, p2 = n => String(n).padStart(2, '0');

/* Counter fallback: keep the last good numbers and show them with an "updated at" time if the live call fails */
const _f = window.fetch;
window.fetch = (u, o) => { if (!/script\.google/.test(String(u))) return _f(u, o);
  return _f(u, o).then(r => { if (!r.ok) throw 0; r.clone().json().then(d => { try { localStorage.setItem('unl_cnt', JSON.stringify({ d, t: Date.now() })); } catch (e) {} }); return r; })
    .catch(() => { let s; try { s = JSON.parse(localStorage.getItem('unl_cnt')); } catch (e) {} if (!s) throw 0;
      setTimeout(() => { const n = $('liveNote'); if (n) n.textContent = 'Showing last known count. Updated ' + new Date(s.t).toLocaleString(); }, 80);
      return new Response(JSON.stringify(s.d), { headers: { 'Content-Type': 'application/json' } }); }); };

/* Offline support */
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

fetch('content.json').then(r => r.json()).then(c => {
  /* Ask box: log every question (Apps Script, else a local queue) */
  const af = $('askForm'), au = c.live && c.live.appsScriptUrl;
  if (af) af.addEventListener('submit', () => { const q = $('askInput').value.trim().slice(0, 300); if (!q) return;
    if (au && !/PASTE/.test(au) && navigator.sendBeacon && navigator.sendBeacon(au, JSON.stringify({ type: 'ask', q }))) return;
    try { const a = JSON.parse(localStorage.getItem('unl_q') || '[]'); a.push({ q, t: Date.now() }); localStorage.setItem('unl_q', JSON.stringify(a.slice(-50))); } catch (e) {} }, true);

  /* ONE "Add to calendar" button (countdown): downloads a .ics with every date on the site */
  const cal = $('calLink'); if (cal) { cal.removeAttribute('target'); cal.textContent = 'Add to calendar';
    cal.onclick = e => { e.preventDefault();
      const ev = c.timeline.map(t => { const m = t.date.match(/(\d{1,2})\s([A-Za-z]{3})/); return m && { d: `2026${p2(M[m[2]])}${p2(m[1])}`, t: 'UNLOCK: ' + t.title, x: t.detail }; }).filter(Boolean);
      const next = d => new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6)) + 864e5).toISOString().slice(0, 10).replace(/-/g, '');
      const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UNLOCK 2026//EN'].concat(...ev.map((v, i) => ['BEGIN:VEVENT', `UID:unlock-${v.d}-${i}@unlock`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, '')}`,
        `DTSTART;VALUE=DATE:${v.d}`, `DTEND;VALUE=DATE:${next(v.d)}`, `SUMMARY:${v.t.replace(/[,;]/g, ' ')}`, `DESCRIPTION:${v.x.replace(/[,;\n]/g, ' ')}`, 'LOCATION:UiTM Shah Alam Selangor', 'END:VEVENT'])).concat('END:VCALENDAR').join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'unlock-2026.ics'; a.click(); }; }

  /* Track call-outs TRK-01 to TRK-06 */
  ready('tracks', el => el.querySelectorAll('.trk i').forEach((i, n) => i.textContent = 'TRK-0' + (n + 1)));

  /* News and updates (blue-on-hover cards) */
  const news = c.news || [];
  if ($('news')) { $('news').innerHTML = news.length ? news.map(n => `<article class="card hl news-i"><span class="mono label">${esc(n.date)}</span><h3 class="ttl">${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join('') : '<p class="muted">No updates yet.</p>'; touchHighlight(); }

  /* Track finder quiz */
  const T = c.about.tracks, Q = [['What do you enjoy most?', [['Helping people', [0, 1]], ['Making things run smoothly', [2, 1]], ['Telling stories', [3]], ['Finding patterns', [4, 5]]]],
    ['Which problem bothers you at work?', [['Slow replies and repeated questions', [0]], ['Hiring and onboarding friction', [1]], ['Manual, repetitive tasks', [2]], ['Waste and reporting burden', [5, 4]]]],
    ['Your best skill?', [['Writing and design', [3]], ['Spreadsheets and analysis', [4, 2]], ['Communication', [0, 1]], ['Research and policy', [5]]]]];
  const fin = $('finder'); if (fin) { const sc = Array(T.length).fill(0); let qi = 0;
    const step = () => { if (qi >= Q.length) { const best = sc.indexOf(Math.max(...sc)); fin.innerHTML = `<p class="mono label">Your best fit</p><h3>${esc(T[best])}</h3><p class="muted">Based on ${Q.length} answers. You can pick any track when you register.</p><button class="btn small" type="button" id="fRe">Retake</button>`; $('fRe').onclick = () => { sc.fill(0); qi = 0; step(); }; return; }
      fin.innerHTML = `<p class="mono label">Track finder · question ${qi + 1} of ${Q.length}</p><h3>${Q[qi][0]}</h3><div class="opts">${Q[qi][1].map((o, j) => `<button class="btn" type="button" data-j="${j}">${o[0]}</button>`).join('')}</div>`;
      fin.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { Q[qi][1][b.dataset.j][1].forEach(k => sc[k]++); qi++; step(); }); }; step(); }

  /* Footer policy links */
  const ft = document.querySelector('footer'); if (ft) ft.insertAdjacentHTML('beforeend', '<br><a href="policies.html#conduct">Code of Conduct</a> &middot; <a href="policies.html#ai">AI-use rules</a> &middot; <a href="policies.html#terms">Terms of Participation</a>');
}).catch(() => {});
})();
