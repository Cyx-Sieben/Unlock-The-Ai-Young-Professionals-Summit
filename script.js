/* UNLOCK final script (single-page site). Text lives in content.json. */
const $ = id => document.getElementById(id);
const PAGES = [['#home','Home'],['#about','About'],['#timeline','Timeline'],['#summit','Summit'],['#faq','Rules & FAQ'],['#sponsors','Sponsors'],['#contact','Contacts']];
const here = document.body.dataset.page;

// ---- Unlock gate (once per session) ----
let LOGO = 'assets/logo.png';
if (!sessionStorage.getItem('unlocked')) {
  document.body.insertAdjacentHTML('afterbegin', `<div id="gate"><div class="panel left"></div><div class="panel right"></div><div class="gate-center">
  <img src="${LOGO}" alt="UNLOCK"><button class="btn" id="unlockBtn">UNLOCK</button></div></div>`);
  $('unlockBtn').focus();
  $('unlockBtn').onclick = () => { $('gate').classList.add('opening'); sessionStorage.setItem('unlocked','1'); setTimeout(() => $('gate').classList.add('done'), 1300); };
}

// ---- Shared nav, footer, command palette ----
$('navMount').outerHTML = `<header class="nav"><a class="logo" href="#home"><img src="${LOGO}" alt="UNLOCK home"></a>
<button class="burger" aria-label="Menu" onclick="document.body.classList.toggle('menu')">&#9776;</button>
<nav>${PAGES.map(p => `<a href="${p[0]}" class="${p[0]===here?'on':''}">${p[1]}</a>`).join('')}<a class="btn primary" href="#register">Register Now!</a></nav></header>`;
$('footMount').outerHTML = `<footer>&copy; 2026 UNLOCK &middot; In collaboration with iCEP &middot; UiTM Shah Alam</footer>`;
document.body.insertAdjacentHTML('beforeend', `<div id="cmd"><div><input placeholder="Go to page..." aria-label="Go to page">${PAGES.map(p=>`<a href="${p[0]}">${p[1]}</a>`).join('')}</div></div>`);
const cmd = $('cmd'), cin = cmd.querySelector('input');
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmd.classList.add('show'); cin.focus(); }
  if (e.key === 'Escape') cmd.classList.remove('show');
});
cmd.onclick = e => { if (e.target === cmd) cmd.classList.remove('show'); };
cin.oninput = () => cmd.querySelectorAll('a').forEach(a => a.style.display = a.textContent.toLowerCase().includes(cin.value.toLowerCase()) ? '' : 'none');
document.body.insertAdjacentHTML('beforeend','<a class="btn primary fab" href="#register">Register</a>');
document.querySelectorAll('.nav nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu')));
// highlight the current section in the nav, and fade blocks in as they scroll into view
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in');
  if (e.target.tagName === 'SECTION') document.querySelectorAll('.nav nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); } }), { threshold: .2 });
document.querySelectorAll('section').forEach(x => io.observe(x));
document.querySelectorAll('.card, h2, .trk, .steps, .crit, .prize, .stat').forEach(x => { if (!x.closest('.hero')) { x.classList.add('rv'); io.observe(x); } });
// cursor glow on cards
document.addEventListener('mousemove', e => { const c = e.target.closest && e.target.closest('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX-r.left+'px'); c.style.setProperty('--my', e.clientY-r.top+'px'); } });

// ---- Fill pages from content.json (each block only runs if that element exists) ----
const set = (id, v, html) => { const el = $(id); if (el) el[html ? 'innerHTML' : 'textContent'] = v; };
const list = (id, items, fn) => set(id, items.map(fn).join(''), true);
fetch('content.json').then(r => r.json()).then(c => {
  LOGO = c.logo || LOGO;
  document.querySelectorAll('[data-register]').forEach(a => a.href = c.registerUrl);
  titleFx(c.hero.title); set('heroSub', c.hero.subtitle); set('heroChip', c.hero.status);
  set('aboutSummary', c.about.summary); set('vision', '<b>Vision:</b> ' + c.about.vision, 1); set('mission', '<b>Mission:</b> ' + c.about.mission, 1);
  list('objectives', c.about.objectives, t => `<li>${t}</li>`); 
  
  list('timelineList', c.timeline, t => `<li><b>${t.date}: ${t.title}</b><br><span class="muted">${t.detail}</span></li>`);
  
  list('faqList', c.faqs, f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`);
  list('sponsorList', c.sponsors, s => `<div>${s.logo ? `<img src="${s.logo}" alt="${s.name}">` : `<b>${s.name}</b>`}<small>${s.role}</small></div>`);
  set('cPhone', 'Phone: ' + c.contact.phone); set('cEmail', `Email: <a href="mailto:${c.contact.email}">${c.contact.email}</a>`, 1); set('cLoc', 'Location: ' + c.contact.location);
  [['waLink','whatsapp'],['igLink','instagram'],['ttLink','tiktok'],['ytLink','youtube']].forEach(([id,k]) => $(id) && ($(id).href = c.social[k]));
  extra(c); enhance(c); countdown(c.eventDate); counters(c.live); askBar(c);
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
  const load = () => fetch(cfg.appsScriptUrl).then(r => r.json()).then(d => { show('s', cfg.studentCap, +d.students||0); show('p', cfg.professionalCap, +d.professionals||0); $('liveNote').textContent = 'Live. Updated ' + new Date().toLocaleTimeString(); })
    .catch(() => $('liveNote').textContent = 'Live count unavailable. Please check again soon.');
  load(); setInterval(load, 30000);
}

// ---- "Ask UNLOCK" bar: matches the question to your FAQs and streams the answer ----
function askBar(c) {
  const form = $('askForm'); if (!form) return;
  const stop = 'the and for are you how what who when where can does this that with have from your our any about will'.split(' ');
  const words = s => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(w => !stop.includes(w));
  const answer = q => { const w = words(q);
    const scored = c.faqs.map(f => { const qt = words(f.q + ' ' + (f.kw || '')), at = words(f.a);
      return { f, sc: w.filter(x => qt.some(t => t.startsWith(x) || x.startsWith(t))).length * 3 + w.filter(x => at.includes(x)).length }; }).sort((a, b) => b.sc - a.sc);
    if (scored[0].sc > 0) return scored[0].f.a;
    return 'I am not sure about that one. Try asking about: ' + c.hero.prompts.slice(0, 4).join(', ') + '. Or contact the team in the Contacts section.'; };
  const run = q => { if (!q.trim()) return; $('askInput').value = q; $('askOut').hidden = false; const t = $('askText'), a = answer(q); t.textContent = ''; let i = 0;
    clearInterval(run.t); run.t = setInterval(() => { t.textContent = a.slice(0, ++i); if (i >= a.length) clearInterval(run.t); }, 12); };
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
  list('tracks', c.about.tracks, (t, i) => `<div class="trk"><i>0${i + 1}</i>${t}</div>`);
  list('ticker', c.about.tracks.concat(c.about.tracks), t => `<span>${t}</span>`);
  list('cohort', c.about.cohort, t => `<li>${t}</li>`);
  list('prepare', c.registration.prepare, t => `<li>${t}</li>`); list('regSteps', c.registration.steps, t => `<li>${t}</li>`);
  $('stuForm').href = c.forms.student; $('proForm').href = c.forms.professional;
  list('zones', c.summit.zones, z => `<div class="card accent"><h3>${z.t}</h3><p>${z.d}</p></div>`);
  list('passport', c.summit.passport, p => `<span>${p}</span>`); set('passportText', c.summit.passportText); set('peoples', c.summit.peoples);
  list('criteria', c.criteria, x => `<div class="crit rv"><span>${x.name}</span><b>${x.w}%</b><div class="bar"><i style="--w:${x.w}%"></i></div></div>`);
  list('prizeGrid', c.awards, a => `<div class="prize rv"><b>${a.n}</b><strong>${a.label}</strong><small>${a.d}</small></div>`);
  list('submitList', c.submissions, t => `<li>${t}</li>`);
  list('rules', c.rules, r => `<div class="card"><h3>${r.t}</h3><ul>${r.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`);
  document.querySelectorAll('.crit,.prize,.trk,.stat').forEach(x => { x.classList.add('rv'); io.observe(x); });
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
  let h = ''; for (let i = lite ? 3 : 5; i >= 1; i--) h += `<img class="ly" src="${LOGO}" alt="" style="transform:translateZ(${-i * 3}px);filter:brightness(${1 - i * .09})">`;
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
  const chars = [...h.querySelectorAll('.ch')]; if (calm) return;
  chars.forEach(c => c.style.opacity = 0);
  // 1. Entrance: letters rise out of a soft blur, one after another (starts after UNLOCK is pressed)
  const enter = () => { chars.forEach((c, i) => { const a = c.animate([{ opacity: 0, transform: 'translateY(.5em) rotateX(-80deg)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
      { duration: 1000, delay: i * 40, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); a.onfinish = () => { c.style.opacity = 1; a.cancel(); }; });
    // 2. A soft light wave travels across the letters every 8 seconds
    const wave = () => chars.forEach((c, i) => c.animate([{ filter: 'brightness(1)', transform: 'translateY(0)' }, { filter: 'brightness(1.7)', transform: 'translateY(-.08em)', offset: .5 }, { filter: 'brightness(1)', transform: 'translateY(0)' }], { duration: 900, delay: i * 55, easing: 'ease-in-out' }));
    setTimeout(() => { wave(); setInterval(wave, lite ? 10000 : 8000); }, 3500); };
  const btn = $('unlockBtn'); if (btn) btn.addEventListener('click', () => setTimeout(enter, 900)); else setTimeout(enter, 200);
  // 3. The whole title tilts gently toward the cursor
  h.style.transition = 'transform .3s ease-out';
  addEventListener('mousemove', e => { h.style.transform = `perspective(900px) rotateY(${(e.clientX / innerWidth - .5) * 8}deg) rotateX(${-(e.clientY / innerHeight - .5) * 5}deg)`; });
}

// ---- Hero background: a visible network of nodes and "atoms" (full on desktop, lighter on phones and tablets) ----
(function net() {
  const cv = $('net'); if (!cv || calm) return;
  const ctx = cv.getContext('2d'), hero = cv.parentElement, BL = '38,32,138', BR = '140,109,70'; let W, H, pts = [], mx = -999, my = -999, on = true, T, last = 0, lw = innerWidth;
  const size = () => { const r = hero.getBoundingClientRect(), d = lite ? Math.min(devicePixelRatio || 1, 2) : (devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    T = innerWidth < 640 ? { max: 60, den: 11000, link: 120, atom: .1, r: 2, ar: 3.2, rx: 10, ry: 5 }          // phone
      : lite ? { max: 80, den: 13000, link: 130, atom: .12, r: 2.2, ar: 3.6, rx: 11, ry: 5 }                   // tablet
      : { max: 130, den: 9500, link: 150, atom: .14, r: 2.3, ar: 4, rx: 13, ry: 6 };                           // laptop / desktop
    pts = Array.from({ length: Math.round(Math.min(T.max, W * H / T.den)) }, () => { const atom = Math.random() < T.atom;
      return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, c: Math.random() < .42 ? BR : BL, atom, r: atom ? T.ar : T.r, a: Math.random() * 6.28 }; }); };
  size(); addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; size(); } });   // ignore phone address-bar resizes
  const point = (x, y) => { const r = cv.getBoundingClientRect(); mx = x - r.left; my = y - r.top; };
  hero.addEventListener('mousemove', e => point(e.clientX, e.clientY)); hero.addEventListener('mouseleave', () => mx = -999);
  hero.addEventListener('touchmove', e => point(e.touches[0].clientX, e.touches[0].clientY), { passive: true }); hero.addEventListener('touchend', () => mx = -999);  // nodes react to a finger too
  new IntersectionObserver(es => on = es[0].isIntersecting).observe(cv);
  (function draw(ts) { requestAnimationFrame(draw); if (!on || document.hidden) return; if (lite && ts - last < 33) return; last = ts; ctx.clearRect(0, 0, W, H);   // ~30 fps on phones and tablets
    for (const p of pts) { const dm = Math.hypot(p.x - mx, p.y - my);
      if (dm < 130) { p.x += (p.x - mx) / dm * .9; p.y += (p.y - my) / dm * .9; }
      p.x += p.vx; p.y += p.vy; p.a += .025; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
    for (let i = 0; i < pts.length; i++) { const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) { const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < T.link) { ctx.strokeStyle = `rgba(${a.c === b.c ? a.c : BR},${(1 - d / T.link) * .4})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
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
    document.querySelectorAll('.trk, .prize, .stat, #zones .card').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.transition = 'transform .15s ease-out');
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-3px)`; });
      el.addEventListener('mouseleave', () => { el.style.transition = 'transform .5s cubic-bezier(.22,.8,.24,1)'; el.style.transform = ''; }); });
    document.querySelectorAll('.btn.primary, .btn.brown').forEach(b => {
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .15}px, ${(e.clientY - r.top - r.height / 2) * .25}px)`; });
      b.addEventListener('mouseleave', () => b.style.transform = ''); });
  }
  const tio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
  document.querySelectorAll('#timelineList li').forEach(li => tio.observe(li));
  const inp = $('askInput'); let pi = 0;
  if (inp && !calm) setInterval(() => { if (document.activeElement !== inp && !inp.value) inp.placeholder = 'Try: ' + c.hero.prompts[pi++ % c.hero.prompts.length]; }, 3500);
}
