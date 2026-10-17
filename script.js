/* UNLOCK final script (single-page site). Text lives in content.json. */
const $ = id => document.getElementById(id);
const PAGES = [['#home','Home'],['#about','About'],['team.html','Our Team'],['#timeline','Timeline'],['#summit','Summit'],['#sponsors','Sponsors'],['#faq','Rules & FAQ'],['#contact','Contacts']];
const B = document.body.dataset.page === 'index' ? '' : 'index.html';
const Hf = p => p[0][0] === '#' ? B + p[0] : p[0];
const here = document.body.dataset.page;

let LOGO = 'assets/logo.png';

// ---- Unlock gate with Pixelated Squares Expansion Transition ----
if (!sessionStorage.getItem('unlocked')) {
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="gate">
      <canvas id="pixelCanvas"></canvas>
      <div class="gate-center">
        <img src="${LOGO}" alt="UNLOCK">
        <button class="btn" id="unlockBtn">UNLOCK</button>
      </div>
    </div>
  `);
  
  const btn = $('unlockBtn');
  btn.focus();
  
  btn.onclick = () => {
    const canvas = $('pixelCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Pixelated squares ring expansion effect
    let progress = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.hypot(centerX, centerY);
    
    document.getElementById('gate').querySelector('.gate-center').style.opacity = '0';
    
    function animatePixels() {
      progress += 0.035;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const currentRadius = progress * maxRadius;
      const tileSize = 24;
      
      for (let x = 0; x < canvas.width; x += tileSize) {
        for (let y = 0; y < canvas.height; y += tileSize) {
          const dist = Math.hypot(x - centerX, y - centerY);
          if (dist <= currentRadius && dist >= currentRadius - tileSize * 3) {
            ctx.fillStyle = '#1B32F5';
            ctx.fillRect(x, y, tileSize - 2, tileSize - 2);
          } else if (dist < currentRadius - tileSize * 3) {
            ctx.fillStyle = '#F5F2EB';
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
      }
      
      if (progress < 1.2) {
        requestAnimationFrame(animatePixels);
      } else {
        sessionStorage.setItem('unlocked', '1');
        $('gate').classList.add('done');
      }
    }
    requestAnimationFrame(animatePixels);
  };
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
document.body.insertAdjacentHTML('beforeend','<a class="btn primary fab" href="${B}#register">Register</a>');
document.querySelectorAll('.nav nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu')));

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in');
  if (e.target.tagName === 'SECTION') document.querySelectorAll('.nav nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); } }), { threshold: .04 });
document.querySelectorAll('section').forEach(x => io.observe(x));
document.querySelectorAll('.card, h2, .trk, .steps, .crit, .prize, .stat, .sp').forEach(x => { if (!x.closest('.hero')) { x.classList.add('rv'); io.observe(x); } });

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
  set('cPhone', 'Phone: ' + c.contact.phone); set('cEmail', `Email: <a href="mailto:${c.contact.email}">${c.contact.email}</a>`, 1); set('cLoc', 'Location: ' + c.contact.location);
  extra(c); styleTitles(); renderTeam(c); touchHighlight(); enhance(c); countdown(c.eventDate); counters(c.live); askBar(c);
}).catch(() => console.error('Could not load content.json'));

function countdown(date) {
  const el = $('countdown'); if (!el) return;
  const tick = () => { let s = Math.max(0, (new Date(date) - Date.now()) / 1000);
    const v = [['days',86400],['hrs',3600],['min',60],['sec',1]].map(([n,d]) => { const x = Math.floor(s / d); s -= x * d; return `<div><b>${String(x).padStart(2,'0')}</b><small>${n}</small></div>`; });
    el.innerHTML = v.join(''); };
  tick(); setInterval(tick, 1000);
}

function counters(cfg) {
  const el = $('counters'); if (!el) return;
  const box = (k, label, cap) => `<div class="ctr"><span>${label}</span><br><b id="${k}Left">--</b> <span id="${k}Sfx">of ${cap} team spots left</span><div class="bar"><i id="${k}Bar"></i></div></div>`;
  el.innerHTML = box('s','Students',cfg.studentCap) + box('p','Professionals',cfg.professionalCap) + '<p class="mono muted" id="liveNote" style="font-size:.75rem"></p>';
  const show = (k, cap, n) => { const left = Math.max(cap - n, 0); $(k+'Left').textContent = left \vert{}\vert{} 'Full';$(k+'Sfx').textContent = left ? `of ${cap} team spots left` : 'registration closed for this group'; $(k+'Left').closest('.ctr').classList.toggle('full', !left);$(k+'Bar').style.width = Math.min(n / cap * 100, 100) + '%'; };
  if (!cfg.appsScriptUrl || cfg.appsScriptUrl.includes('PASTE')) { $('liveNote').textContent = 'Live counter not connected yet.'; return; }
  const load = () => fetch(cfg.appsScriptUrl).then(r => r.json()).then(d => { show('s', cfg.studentCap, +d.students||0); show('p', cfg.professionalCap, +d.professionals||0); }).catch(() => {});
  load(); setInterval(load, 30000);
}

function askBar(c) {
  const form = $('askForm'); if (!form) return;
  const stop = 'the and for are you how what who when where can does this that with have from your our any about will there many much people some did not get got could would should been has was were its also into use need want tell give know please which they them their then than just more only each every here very really still sit'.split(' ');
  const words = s => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []).map(w => w.length > 3 ? w.replace(/s$/, '') : w).filter(w => !stop.includes(w));
  const all = c.faqs.concat(c.askOnly || []);
  const digits = String(c.contact.phone || '').replace(/\D/g, ''), wa = /EDIT/i.test(c.contact.phone || '') || digits.length < 9 ? '' : (digits[0] === '0' ? '6' + digits : digits);
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact.email || '') ? c.contact.email : '';
  const fb = ['I am not sure about that one, but our team can help. Please message us on WhatsApp or send us an email and we will answer you personally.'];
  const links = q => [wa ? `<a class="btn small" href="https://wa.me/${wa}?text=${encodeURIComponent('Hi UNLOCK team, I have a question: ' + q)}" target="_blank" rel="noopener">WhatsApp us</a>` : '', mail ? `<a class="btn small" href="mailto:${mail}">Email us</a>` : ''].join('');
  const answer = q => { const w = words(q);
    const scored = all.map(f => { const tt = words(f.q), kk = words(f.kw || ''), at = words(f.a);
      const a = w.filter(x => tt.includes(x)).length, b = w.filter(x => kk.includes(x)).length, d = w.filter(x => at.includes(x)).length;
      return { f, sc: a + b >= 1 || d >= 2 ? a * 4 + b * 3 + d : 0 }; }).sort((a, b) => b.sc - a.sc);
    if (scored[0] && scored[0].sc >= 3) { return { text: scored[0].f.a, contact: false }; }
    return { text: fb[0], contact: true }; };
  const run = q => { if (!q.trim()) return; $('askInput').value = q; $('askOut').hidden = false; const t = $('askText'), r = answer(q); t.textContent = r.text; $('askLinks').innerHTML = r.contact ? links(q) : ''; };
  form.onsubmit = e => { e.preventDefault(); run($('askInput').value); };$('askChips').innerHTML = c.hero.prompts.map(p => `<button type="button">${p}</button>`).join('');
  $('askChips').onclick = e => e.target.tagName === 'BUTTON' && run(e.target.textContent);
}

document.body.insertAdjacentHTML('afterbegin', '<div class="progress" id="prog"></div>');
addEventListener('scroll', () => { const d = document.documentElement; $('prog').style.width = (d.scrollTop / (d.scrollHeight - d.clientHeight) * 100) + '%'; document.querySelector('.nav').classList.toggle('scrolled', d.scrollTop > 20); }, { passive: true });

function extra(c) {
  list('stats', c.stats, s => `<div class="stat"><b data-n="${s.n}">0</b><span>${s.label}</span></div>`);
  list('tracks', c.about.tracks, (t, i) => `<div class="trk"><i>0${i + 1}</i><span class="tt">${t}</span></div>`);
  list('ticker', c.about.tracks.concat(c.about.tracks), t => `<span>${t}</span>`);
  list('cohort', c.about.cohort, t => `<li>${t}</li>`);
  list('prepare', c.registration.prepare, t => `<li>${t}</li>`); list('regSteps', c.registration.steps, t => `<li>${t}</li>`);
  if ($('stuForm')) { $('stuForm').href = c.forms.student; $('proForm').href = c.forms.professional; }
  list('zones', c.summit.zones, z => `<div class="card accent"><h3>${z.t}</h3><p>${z.d}</p></div>`);
  list('passport', c.summit.passport, p => `<span>${p}</span>`); set('passportText', c.summit.passportText); set('peoples', c.summit.peoples);
  list('criteria', c.criteria, (x, i) => `<div class="crit rv"><i>${String(i + 1).padStart(2, '0')}</i><span>${x}</span></div>`);
  list('prizeGrid', c.awards, a => `<div class="prize rv"><b>${a.n}</b><strong>${a.label}</strong><small>${a.d}</small></div>`);
  list('submitList', c.submissions, t => `<li>${t}</li>`);
  list('rules', c.rules, (r, i) => { const t = r.t; return `<div class="card hl"><h3 class="rt"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t"><b>${t[0]}</b>${t.slice(1)}</span></h3><ul>${r.items.map(x => `<li>${x}</li>`).join('')}</ul></div>`; });
  const ini = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), link = o => o.url || '#';
  list('sponsorList', c.sponsors, o => `<a class="sp rv" href="${link(o)}" target="_blank" rel="noopener"><div class="lg"><b>${ini(o.name)}</b></div><b>${o.name}</b><small>${o.role}</small><span class="go">VISIT &rarr;</span></a>`);
  list('partners', c.partners, o => `<a class="pt" href="${link(o)}" target="_blank" rel="noopener"><span class="mono-badge">${ini(o.name)}</span><span><b>${o.name}</b><small>${o.role}</small></span></a>`);
  list('socials', c.socials, o => `<a class="btn primary" href="${o.url}" target="_blank" rel="noopener">${o.name} <span class="mono" style="margin-left:8px;opacity:.8">${o.handle}</span></a>`);
}

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
(function logo3d() {
  const box = $('logo3d'); if (!box) return;
  box.innerHTML = `<div class="rig" id="rig"><img class="front" src="${LOGO}" alt="UNLOCK"></div>`;
})();

function titleFx(t) {
  const h = $('heroTitle'); if (!h) return;
  h.textContent = t;
}

(function net() {
  const cv = $('net'); if (!cv) return;
  const ctx = cv.getContext('2d'), hero = cv.parentElement;
  let W, H, pts = [];
  const size = () => { W = hero.offsetWidth; H = hero.offsetHeight; cv.width = W; cv.height = H; pts = Array.from({length: 40}, () => ({x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3})); };
  size(); addEventListener('resize', size);
  (function draw() { requestAnimationFrame(draw); ctx.clearRect(0,0,W,H);
    for(const p of pts){ p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1; ctx.fillStyle='rgba(38,32,138,0.5)'; ctx.fillRect(p.x,p.y,2,2); }
  })();
})();

function enhance(c) {}
function styleTitles() {}
function touchHighlight() {}

// ---- Render Team with Bigger Leadership/HOD Frames & Bureau Side Layout ----
function avFail(img) { img.remove(); }
function renderTeam(c) {
  const root = $('teamRoot'); if (!root || !c.team) return; const T = c.team; let k = 0;
  const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ini = n => n.replace(/^dr\.?\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const person = (p, role) => typeof p === 'string' ? { name: p, role } : { role, ...p };
  const av = (p, cls) => `<div class="av ${cls} ${k++ % 2 ? 'b2' : 'b1'}"><span>${ini(p.name)}</span><img src="assets/team/${slug(p.name)}.jpg" alt="${p.name}" loading="lazy" onerror="avFail(this)"></div>`;
  
  // Card builder with support for bigger frames
  const card = (p, cls, isBig = false) => `
    <div class="pcard hl rv ${isBig ? 'big-frame' : ''}">
      ${av(p, cls)}
      <b class="pn">${p.name}</b>
      <small class="pr">${p.role || ''}</small>
    </div>
  `;

  const total = T.advisors.length + T.leadership.reduce((a, g) => a + g.people.length, 0) + T.bureaus.reduce((a, b) => a + b.hods.length + b.members.length, 0);
  set('tmCount', `${total} committee members · ${T.bureaus.length} bureaus`);
  
  const chips = [['advisors', 'Advisors'], ['leadership', 'Leadership']].concat(T.bureaus.map(b => [slug(b.name), b.name.replace(' Bureau', '')]));
  $('tmChips').innerHTML = chips.map(x => `<a href="#${x[0]}">${x[1]}</a>`).join('');

  root.innerHTML = `
    <figure class="group rv"><img src="${T.photo}" alt="The UNLOCK committee"></figure>
    <div class="tm-block" id="advisors"><span class="mono label">Guided by</span><h2 class="ttl">Advisors</h2><div class="people">${T.advisors.map(p => card(person(p, 'Advisor'), 'xl', true)).join('')}</div></div>
    <div class="tm-block" id="leadership"><span class="mono label">Leading UNLOCK</span><h2 class="ttl">Leadership</h2>${T.leadership.map(g => `<h3 class="ttl tm-sub">${g.title}</h3><div class="people">${g.people.map(p => card(person(p, p.role), 'lg', true)).join('')}</div>`).join('')}</div>
    ${T.bureaus.map(b => `
      <div class="tm-block" id="${slug(b.name)}">
        <span class="mono label">${b.hods.length + b.members.length} members</span>
        <h2 class="ttl">${b.name}</h2>
        <div class="bureau-container">
          <div class="bureau-hods">
            ${b.hods.map(h => card(person(h, h.role), 'lg', true)).join('')}
          </div>
          <div class="bureau-team">
            ${b.members.map(m => card(person(m, b.name.replace(' Bureau', '')), 'md', false)).join('')}
          </div>
        </div>
      </div>
    `).join('')}
  `;
  root.querySelectorAll('.rv').forEach(x => io.observe(x));
  list('tmSocials', c.socials, o => `<a class="btn primary" href="${o.url}" target="_blank" rel="noopener">${o.name} <span class="mono" style="margin-left:8px;opacity:.8">${o.handle}</span></a>`);
}
