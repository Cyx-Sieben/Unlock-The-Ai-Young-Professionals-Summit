/* UNLOCK final script (single-page site). Text lives in content.json. */
const $ = id => document.getElementById(id);
const PAGES = [['#home','Home'],['#about','About'],['#timeline','Timeline'],['#faq','Rules & FAQ'],['#sponsors','Sponsors'],['#contact','Contacts']];
const here = document.body.dataset.page;

// ---- Unlock gate (once per session) ----
let LOGO = 'assets/logo.png';
if (!sessionStorage.getItem('unlocked')) {
  document.body.insertAdjacentHTML('afterbegin', `<div id="gate"><div class="panel left"></div><div class="panel right"></div><div class="gate-center">
  <img src="${LOGO}" alt="" onerror="this.remove()">
  <svg class="lock" viewBox="0 0 64 64" width="84" height="84" fill="none" stroke="#F5F7FF" stroke-width="3" aria-hidden="true"><rect x="12" y="28" width="40" height="28" rx="6"/><path d="M22 28V20a10 10 0 0 1 20 0v8"/><circle cx="32" cy="42" r="3" fill="#F5F7FF"/></svg>
  <p class="gate-title">UNLOCK</p><p class="gate-sub">The AI &amp; Young Professionals Summit</p><button class="btn" id="unlockBtn">UNLOCK</button></div></div>`);
  $('unlockBtn').focus();
  $('unlockBtn').onclick = () => { $('gate').classList.add('opening'); sessionStorage.setItem('unlocked','1'); setTimeout(() => $('gate').classList.add('done'), 1300); };
}

// ---- Shared nav, footer, command palette ----
$('navMount').outerHTML = `<header class="nav"><a class="logo" href="#home"><img src="${LOGO}" alt="" onerror="this.remove()">UNLOCK</a>
<button class="burger" aria-label="Menu" onclick="document.body.classList.toggle('menu')">&#9776;</button>
<nav>${PAGES.map(p => `<a href="${p[0]}" class="${p[0]===here?'on':''}">${p[1]}</a>`).join('')}<a class="btn primary" data-register href="#" target="_blank" rel="noopener">Register Now!</a></nav></header>`;
$('footMount').outerHTML = `<footer>&copy; 2026 UNLOCK &middot; In collaboration with iCEP &middot; UiTM Shah Alam</footer>`;
document.body.insertAdjacentHTML('beforeend', `<div id="cmd"><div><input placeholder="Go to page..." aria-label="Go to page">${PAGES.map(p=>`<a href="${p[0]}">${p[1]}</a>`).join('')}</div></div>`);
const cmd = $('cmd'), cin = cmd.querySelector('input');
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmd.classList.add('show'); cin.focus(); }
  if (e.key === 'Escape') cmd.classList.remove('show');
});
cmd.onclick = e => { if (e.target === cmd) cmd.classList.remove('show'); };
cin.oninput = () => cmd.querySelectorAll('a').forEach(a => a.style.display = a.textContent.toLowerCase().includes(cin.value.toLowerCase()) ? '' : 'none');
document.body.insertAdjacentHTML('beforeend','<a class="btn primary fab" data-register href="#" target="_blank" rel="noopener">Register</a>');
document.querySelectorAll('.nav nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu')));
// highlight the current section in the nav, and fade blocks in as they scroll into view
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in');
  if (e.target.tagName === 'SECTION') document.querySelectorAll('.nav nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); } }), { threshold: .2 });
document.querySelectorAll('section').forEach(x => io.observe(x));
document.querySelectorAll('.card, h2, .tracks, .steps').forEach(x => { if (!x.closest('.hero')) { x.classList.add('rv'); io.observe(x); } });
// cursor glow on cards
document.addEventListener('mousemove', e => { const c = e.target.closest && e.target.closest('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX-r.left+'px'); c.style.setProperty('--my', e.clientY-r.top+'px'); } });

// ---- Fill pages from content.json (each block only runs if that element exists) ----
const set = (id, v, html) => { const el = $(id); if (el) el[html ? 'innerHTML' : 'textContent'] = v; };
const list = (id, items, fn) => set(id, items.map(fn).join(''), true);
fetch('content.json').then(r => r.json()).then(c => {
  LOGO = c.logo || LOGO;
  document.querySelectorAll('[data-register]').forEach(a => a.href = c.registerUrl);
  set('heroTitle', c.hero.title); set('heroSub', c.hero.subtitle); set('heroChip', c.hero.status);
  set('aboutSummary', c.about.summary); set('vision', '<b>Vision:</b> ' + c.about.vision, 1); set('mission', '<b>Mission:</b> ' + c.about.mission, 1);
  list('objectives', c.about.objectives, t => `<li>${t}</li>`); list('prizes', c.about.prizes, t => `<li>${t}</li>`);
  list('tracks', c.about.tracks, t => `<span>${t}</span>`);
  list('timelineList', c.timeline, t => `<li><b>${t.date}: ${t.title}</b><br><span class="muted">${t.detail}</span></li>`);
  list('rules', c.rules, t => `<li>${t}</li>`);
  list('faqList', c.faqs, f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`);
  list('sponsorList', c.sponsors, s => `<div>${s.logo ? `<img src="${s.logo}" alt="${s.name}">` : `<b>${s.name}</b>`}<small>${s.role}</small></div>`);
  set('cPhone', 'Phone: ' + c.contact.phone); set('cEmail', `Email: <a href="mailto:${c.contact.email}">${c.contact.email}</a>`, 1); set('cLoc', 'Location: ' + c.contact.location);
  [['waLink','whatsapp'],['igLink','instagram'],['ttLink','tiktok'],['ytLink','youtube']].forEach(([id,k]) => $(id) && ($(id).href = c.social[k]));
  countdown(c.eventDate); counters(c.live); askBar(c);
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
  const box = (k, label, cap) => `<div class="ctr"><span>${label}</span><br><b id="${k}Left">--</b> <span id="${k}Sfx">of ${cap} spots left</span><div class="bar"><i id="${k}Bar"></i></div></div>`;
  el.innerHTML = box('s','Students',cfg.studentCap) + box('p','Professionals',cfg.professionalCap) + '<p class="mono muted" id="liveNote" style="font-size:.75rem"></p>';
  const show = (k, cap, n) => { const left = Math.max(cap - n, 0); $(k+'Left').textContent = left || 'Full'; $(k+'Sfx').textContent = left ? `of ${cap} spots left` : 'registration closed for this group'; $(k+'Left').closest('.ctr').classList.toggle('full', !left); $(k+'Bar').style.width = Math.min(n / cap * 100, 100) + '%'; };
  if (!cfg.appsScriptUrl || cfg.appsScriptUrl.includes('PASTE')) { $('liveNote').textContent = 'Live counter not connected yet.'; return; }
  const load = () => fetch(cfg.appsScriptUrl).then(r => r.json()).then(d => { show('s', cfg.studentCap, +d.students||0); show('p', cfg.professionalCap, +d.professionals||0); $('liveNote').textContent = 'Live. Updated ' + new Date().toLocaleTimeString(); })
    .catch(() => $('liveNote').textContent = 'Live count unavailable. Please check again soon.');
  load(); setInterval(load, 30000);
}

// ---- "Ask UNLOCK" bar: matches the question to your FAQs and streams the answer ----
function askBar(c) {
  const form = $('askForm'); if (!form) return;
  const words = s => s.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const answer = q => { const w = words(q); let best = null, top = 0;
    c.faqs.forEach(f => { const t = words(f.q + ' ' + f.a); const sc = w.filter(x => t.includes(x)).length; if (sc > top) { top = sc; best = f; } });
    return best ? best.a : 'I could not find that. Please see the Rules & FAQ page or contact the team.'; };
  const run = q => { if (!q.trim()) return; $('askInput').value = q; $('askOut').hidden = false; const t = $('askText'), a = answer(q); t.textContent = ''; let i = 0;
    clearInterval(run.t); run.t = setInterval(() => { t.textContent = a.slice(0, ++i); if (i >= a.length) clearInterval(run.t); }, 14); };
  form.onsubmit = e => { e.preventDefault(); run($('askInput').value); };
  $('askChips').innerHTML = c.hero.prompts.map(p => `<button type="button">${p}</button>`).join('');
  $('askChips').onclick = e => e.target.tagName === 'BUTTON' && run(e.target.textContent);
}
