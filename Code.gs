/* =====================================================================================
   UNLOCK 2026: PRE-REGISTRATION, emails, reminders and live team counter (both forms)
   -------------------------------------------------------------------------------------
   1. Max 5 teams per category. The 6th team goes on a WAITLIST, and the form closes itself at 5.
   2. The website "Live team spots" reads doGet() (students / professionals counts).
   3. Every email found in the registration row (leader + members, Gmail/Yahoo/any) gets the
      official PRE-REGISTRATION confirmation email with the WhatsApp community link.
      The email tells them: this is a pre-registration, payment comes LATER.
   4. Reminder emails: 2 days before and on the day of every workshop and of the Grand Finale.
   5. Both forms close by themselves at the pre-registration deadline (CONFIG.REG_CLOSE, 18 Nov 2026).
   6. Safety: duplicate team/email detection, withdraw + waitlist promotion, summaries, email
      list export, quota check and an "UNLOCK Tools" menu inside the Sheet.
   SETUP: edit CONFIG (everything marked EDIT), run setupTriggers() ONCE (run it AGAIN after this update),
   then previewAllMessages().
   UPDATE 12 Nov 2026 v2 (deadline extended to 18 Nov, Workshop 1 date to be announced, smarter tab detection):
     a) paste this whole file over the old one and Save
     b) run extendDeadline() once   (reopens the forms and rebuilds the triggers)
     c) run checkSetup()            (shows which tabs/forms the script found)
     d) Deploy > Manage deployments > Edit (pencil) > Version: NEW VERSION > Deploy
        (the website link stays the same; without a new version the website keeps the OLD code)
   Tabs: the script now finds the Student / Professional response tabs automatically, even if
   they are still called "Form Responses 1" / "Form Responses 2".
   ===================================================================================== */
const MEET = 'https://meet.google.com/bdd-crhp-itn';              // online workshop link (Google Meet)
const CONFIG = {
  STUDENT_TAB: 'Student',            // sheet tab that receives the Student form
  PRO_TAB: 'Professional',           // sheet tab that receives the Professional form
  LIMIT_PER_CATEGORY: 5,
  FROM_NAME: 'UNLOCK Committee',
  REPLY_TO: 'unlockai.project@gmail.com',
  COMMITTEE_EMAIL: 'unlockai.project@gmail.com',
  WHATSAPP_LINK: 'https://chat.whatsapp.com/JMwYcNiirZDFtfbGxxdki4',
  VENUE: 'Dewan Seroja, UiTM Shah Alam',
  REG_CLOSE: '2026-11-18T23:59:00+08:00',                          // pre-registration closes (EXTENDED to 18 Nov 2026): both forms close themselves at this time
  PAYMENT: { Student: 'RM65', Professional: 'RM180' },             // per team. Pre-registration: teams pay LATER
  CLASSES: [   // online on Google Meet. date: '' = TO BE ANNOUNCED (no reminders are sent until you fill it in, e.g. '2026-11-22')
    { date: '',           title: 'Workshop 1: Kickoff & Framing',       link: MEET },
    { date: '2026-11-21', title: 'Workshop 2: System Architecture',     link: MEET },
    { date: '2026-11-28', title: 'Workshop 3: Prototype & Selection',   link: MEET }
  ],
  SUMMIT: { date: '2026-12-06' }
  // Reminders are built automatically below: 2 days before and on the day of every workshop that has a date, and of the summit.
};
function addDays_(ymd, n) { const d = new Date(ymd + 'T12:00:00+08:00'); d.setDate(d.getDate() + n); return Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'); }
CONFIG.REMINDERS = [];
CONFIG.CLASSES.forEach(function (c, i) { if (!c.date) return;
  CONFIG.REMINDERS.push({ key: 'w' + (i + 1) + '_pre', on: addDays_(c.date, -2), type: 'workshop_pre', cls: i }, { key: 'w' + (i + 1) + '_day', on: c.date, type: 'workshop_day', cls: i }); });
CONFIG.REMINDERS.push({ key: 'summit_pre', on: addDays_(CONFIG.SUMMIT.date, -2), type: 'summit_pre' }, { key: 'summit_day', on: CONFIG.SUMMIT.date, type: 'summit_day' });
const TZ = 'Asia/Kuala_Lumpur';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_COUNTED = ['WAITLIST', 'DUPLICATE', 'WITHDRAWN'];

/* ------------------------------ EMAIL WORDING ------------------------------
   *text* becomes bold. {{name}} is filled in automatically. Edit freely. */
const MESSAGES = {
  leader: { subject: '✅ Pre-registration confirmed: {{teamName}} | UNLOCK 2026',
    text: '✅ *PRE-REGISTRATION CONFIRMED - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT*\n\nAssalamualaikum and dear {{leaderName}},\n\nThank you for pre-registering for UNLOCK: The AI & Young Professionals Summit & Innovation Challenge. We are pleased to inform you that your team has been successfully pre-registered.\n\n🧾 Registration ID: *{{regId}}*\n👥 Team: *{{teamName}}* ({{category}} category)\n🎯 Track: {{track}}\n\n💳 *Payment (later):* this is a pre-registration, so you do not need to pay now. The fee is *{{fee}} per team*, and we will email you the payment details later.\n\nAll team members listed in your registration form have received this confirmation.\n\n📅 Online workshops: *{{workshopDates}}*. We will email you each workshop date and link.\n📍 Platform: *{{platform}}*\n\nPlease join our official WhatsApp community for announcements and updates (registered participants only):\n{{whatsapp}}\n\nWe will also email you a reminder 2 days before, and on the day of, every workshop and the Grand Finale on *6 December 2026* at {{venue}}.\n\nStay tuned for more updates, and welcome to UNLOCK! 🚀\n\n#UNLOCKSummit #AIandYoungProfessionals #PreRegistrationConfirmed' },
  member: { subject: '✅ Your team {{teamName}} is pre-registered | UNLOCK 2026',
    text: '✅ *PRE-REGISTRATION CONFIRMED - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT*\n\nAssalamualaikum and hi,\n\nYou have been pre-registered by your team leader, {{leaderName}}, as a member of team *{{teamName}}* ({{category}} category) for UNLOCK: The AI & Young Professionals Summit & Innovation Challenge.\n\n🧾 Registration ID: *{{regId}}*\n🎯 Track: {{track}}\n\n💳 *Payment (later):* this is a pre-registration. The team fee ({{fee}} per team) will be paid later, and the payment details will be emailed to your team leader.\n\n📅 Online workshops: *{{workshopDates}}*. We will email you each workshop date and link.\n📍 Platform: *{{platform}}*\n\nPlease join our official WhatsApp community for announcements and updates (registered participants only):\n{{whatsapp}}\n\nWe will email you a reminder 2 days before, and on the day of, every workshop and the Grand Finale on *6 December 2026* at {{venue}}.\n\nIf you did not agree to join this team, please reply to this email.\n\nStay tuned for more updates, and welcome to UNLOCK! 🚀\n\n#UNLOCKSummit #AIandYoungProfessionals #PreRegistrationConfirmed' },
  waitlist: { subject: 'Waiting list: {{teamName}} | UNLOCK 2026',
    text: '*WAITING LIST - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT*\n\nAssalamualaikum and dear {{leaderName}},\n\nThank you for pre-registering team *{{teamName}}*. The {{category}} category is now full, so your team has been placed on the *waiting list*.\n\nIf a place opens, we will email you straight away. Thank you for your interest in UNLOCK.\n\n#UNLOCKSummit #AIandYoungProfessionals' },

  workshop_pre: { subject: '📢 Workshop reminder: UNLOCK, {{date}}',
    text: '📢 *WORKSHOP REMINDER - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT*\n\nAssalamualaikum and hi everyone! 👋🏻\n\nGet ready to unlock your potential and explore how Artificial Intelligence (AI) is shaping the future of work! 🤖✨\n\nOur upcoming workshop is just around the corner. Don\'t miss this opportunity to gain new insights, develop your skills, and prepare yourself for the future.\n\n📅 Date: *{{date}}* \n📍 Platform: *{{platform}}* \n\nMake sure to mark your calendar and get ready for an exciting learning experience!\n\nStay tuned for more updates, and see you at the workshop! 🚀\n\n#UNLOCKSummit #AIandYoungProfessionals #WorkshopReminder' },
  workshop_day: { subject: '🚨 Final reminder: UNLOCK workshop is TODAY ({{date}})',
    text: '🚨 *FINAL REMINDER - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT* \n\nThe wait is almost over! ⏳🔥\n\nThis is your final reminder that our workshop is happening *today* !\n\nGet ready to explore the world of Artificial Intelligence, discover new opportunities, and gain valuable knowledge to support your professional growth.\n\n📅 Date: {{date}}\n📍 Platform: {{platform}}\n\n✅ Double-check your schedule  \n✅ Prepare everything you need  \n✅ Be on time and ready to participate!\n\nDon\'t miss out on this exciting opportunity. We look forward to seeing you there!\n\nSee you today, future professionals! 🚀\n\n#UNLOCKSummit #AIandYoungProfessionals #FinalReminder' },
  summit_pre: { subject: '📢 Summit reminder: UNLOCK Grand Finale, {{date}}',
    text: '📢 *SUMMIT REMINDER - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT*\n\nAssalamualaikum and hi everyone! 👋🏻\n\nGet ready to unlock your potential and explore how Artificial Intelligence (AI) is shaping the future of work! 🤖✨\n\nOur Summit and Grand Finale is just around the corner. Don\'t miss this opportunity to gain new insights, develop your skills, and prepare yourself for the future.\n\n📅 Date: *{{date}}* \n📍 Venue: *{{venue}}* \n\nMake sure to mark your calendar and get ready for an exciting experience!\n\nStay tuned for more updates, and see you at the Summit! 🚀\n\n#UNLOCKSummit #AIandYoungProfessionals #SummitReminder' },
  summit_day: { subject: '🚨 Final reminder: UNLOCK Grand Finale is TODAY ({{date}})',
    text: '🚨 *FINAL REMINDER - UNLOCK: THE AI & YOUNG PROFESSIONALS SUMMIT* \n\nThe wait is almost over! ⏳🔥\n\nThis is your final reminder that our Summit and Grand Finale is happening *today* !\n\nGet ready to explore the world of Artificial Intelligence, discover new opportunities, and gain valuable knowledge to support your professional growth.\n\n📅 Date: {{date}}\n📍 Venue: {{venue}}\n\n✅ Double-check your schedule  \n✅ Prepare everything you need  \n✅ Be on time and ready to participate!\n\nDon\'t miss out on this exciting opportunity. We look forward to seeing you there!\n\nSee you today, future professionals! 🚀\n\n#UNLOCKSummit #AIandYoungProfessionals #FinalReminder' }
};

/* ------------------------------ helpers ------------------------------ */
const ss_ = () => SpreadsheetApp.getActiveSpreadsheet();
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const isPh = s => !String(s || '').trim() || /^EDIT/i.test(String(s).trim());
const orElse = (s, f) => isPh(s) ? f : String(s).trim();
const validEmail = s => EMAIL_RE.test(String(s || '').trim());
const selfEmail = () => Session.getEffectiveUser().getEmail();
function tpl(s, v) { return String(s).replace(/\{\{(\w+)\}\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }); }
function longDate(ymd) { return Utilities.formatDate(new Date(ymd + 'T12:00:00+08:00'), TZ, 'd MMMM yyyy'); }
function dayDate(ymd) { return Utilities.formatDate(new Date(ymd + 'T12:00:00+08:00'), TZ, 'EEEE, d MMMM yyyy'); }
function toHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, '<br>');
}
function wrap(html) {
  return '<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;color:#1A1530;line-height:1.6"><div style="background:#150061;color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;font-size:19px;font-weight:bold">UNLOCK <span style="color:#D8B98C">2026</span></div>' +
    '<div style="border:1px solid #E6DFD0;border-top:0;padding:22px;border-radius:0 0 12px 12px">' + html + '<hr style="border:0;border-top:1px solid #E6DFD0;margin:22px 0 12px"><p style="color:#5F5648;font-size:12px;margin:0">UNLOCK: The AI &amp; Young Professionals Summit, UiTM Shah Alam.<br>WhatsApp community: <a href="' + CONFIG.WHATSAPP_LINK + '">' + CONFIG.WHATSAPP_LINK + '</a><br>Questions? Just reply to this email.</p></div></div>';
}
function workshopDates_() { return CONFIG.CLASSES.map(function (c, i) { return 'Workshop ' + (i + 1) + ': ' + (c.date ? longDate(c.date) : 'date to be announced'); }).join(' | '); }
function firstClass_() { const c = CONFIG.CLASSES.filter(function (x) { return x.date; })[0]; return c ? dayDate(c.date) : 'to be announced'; }

/* ---- find the two response tabs (exact name first, then the linked form's title, then the tab name) ---- */
const CATS = ['Student', 'Professional'];
const tabMemo_ = {};
function tabFor_(cat) { if (!(cat in tabMemo_)) tabMemo_[cat] = findTab_(cat); return tabMemo_[cat]; }
function findTab_(cat) {
  // Picks the tab that really receives this category's form answers:
  // 1) a tab linked to a Google Form whose title says Student / Professional,
  // 2) a tab named exactly CONFIG.STUDENT_TAB / CONFIG.PRO_TAB,
  // 3) any tab whose name says Student / Professional.
  // If several match, the one with the most answers wins (so an empty tab never hides the real one).
  const want = cat === 'Student' ? CONFIG.STUDENT_TAB : CONFIG.PRO_TAB;
  const re = cat === 'Student' ? /student|pelajar|university|universiti/i : /professional|profesional|young pro|working|\bpro\b/i;
  const other = cat === 'Student' ? /professional|profesional|young pro|working/i : /student|pelajar/i;
  const skip = /^(email list|ask log)$/i, found = [];
  ss_().getSheets().forEach(function (sh) {
    if (skip.test(sh.getName())) return;
    let score = 0, title = '';
    const u = sh.getFormUrl();
    if (u) { try { title = FormApp.openByUrl(u).getTitle(); } catch (e) {} }
    if (title && re.test(title) && !(cat === 'Student' && other.test(title))) score = 3;
    else if (sh.getName() === want) score = 2;
    else if (re.test(sh.getName()) && !other.test(sh.getName())) score = 1;
    if (score) found.push({ sh: sh, score: score, rows: Math.max(sh.getLastRow() - 1, 0) });
  });
  found.sort(function (a, b) { return (b.rows > 0) - (a.rows > 0) || b.score - a.score || b.rows - a.rows; });
  return found.length ? found[0].sh : null;
}

function render(key, v) { const m = MESSAGES[key], text = tpl(m.text, v); return { subject: tpl(m.subject, v), text: text, html: wrap(toHtml(text)) }; }
function mailTo(o) {
  const m = { to: o.to, subject: o.subject, body: o.text, htmlBody: o.html, name: CONFIG.FROM_NAME };
  if (o.bcc) m.bcc = o.bcc; if (validEmail(CONFIG.REPLY_TO)) m.replyTo = CONFIG.REPLY_TO;
  MailApp.sendEmail(m);
}

/* ------------------------------ sheet columns and rows ------------------------------ */
function ensureColumns(sh) {
  const need = ['Registration ID', 'Status', 'Email Sent'], out = {};
  need.forEach(function (name) {
    const last = Math.max(sh.getLastColumn(), 1), hdr = sh.getRange(1, 1, 1, last).getValues()[0]; let i = hdr.indexOf(name);
    if (i < 0) { sh.getRange(1, last + 1).setValue(name); i = last; } out[name] = i + 1;
  });
  return { id: out['Registration ID'], status: out['Status'], sent: out['Email Sent'] };
}
function readRow(sh, row) {
  const last = sh.getLastColumn(), hdr = sh.getRange(1, 1, 1, last).getValues()[0], val = sh.getRange(row, 1, 1, last).getValues()[0];
  const info = { teamName: 'your team', track: '', leaderName: 'Team Leader', leaderEmail: '', emails: [] };
  hdr.forEach(function (h, i) {
    h = String(h); const v = String(val[i] || '').trim();
    if (/team name/i.test(h)) info.teamName = v || info.teamName;
    else if (/track/i.test(h)) info.track = v;
    else if (/leader/i.test(h) && /name/i.test(h) && !/e-?mail/i.test(h)) info.leaderName = v || info.leaderName;
    if (/e-?mail/i.test(h)) (v.match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/g) || []).forEach(function (raw) {   // also works if a cell holds several emails
      const e = raw.toLowerCase(); if (!validEmail(e)) return; if (info.emails.indexOf(e) < 0) info.emails.push(e); if (!info.leaderEmail && !/member/i.test(h)) info.leaderEmail = e; });
  });
  if (!info.leaderEmail && info.emails.length) info.leaderEmail = info.emails[0];
  return info;
}
function categoryOf(sh) { for (let i = 0; i < CATS.length; i++) { const t = tabFor_(CATS[i]); if (t && t.getSheetId() === sh.getSheetId()) return CATS[i]; } return null; }
function countStatus(sh, cols, status, skipRow) {
  const n = sh.getLastRow(); if (n < 2) return 0; const st = sh.getRange(2, cols.status, n - 1, 1).getValues(); let c = 0;
  for (let i = 0; i < st.length; i++) { if (i + 2 === skipRow) continue; if (String(st[i][0]) === status) c++; } return c;
}
function nextId(cat) { const p = PropertiesService.getScriptProperties(), k = 'id_' + cat, n = Number(p.getProperty(k) || 0) + 1; p.setProperty(k, String(n)); return 'UNL-' + cat[0] + '-' + ('00' + n).slice(-3); }
function findDuplicate(sh, row, info) {   // same team name or same email already registered (confirmed or waitlisted)
  let why = '';
  CATS.forEach(function (n) {
    const s = tabFor_(n); if (why || !s || s.getLastRow() < 2) return;
    const cols = ensureColumns(s), st = s.getRange(2, cols.status, s.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < st.length && !why; i++) {
      const r = i + 2, S = String(st[i][0]); if ((s.getSheetId() === sh.getSheetId() && r === row) || (S !== 'CONFIRMED' && S !== 'WAITLIST')) continue;
      const o = readRow(s, r);
      if (info.teamName !== 'your team' && norm(o.teamName) === norm(info.teamName)) why = 'same team name as "' + o.teamName + '" (' + n + ' row ' + r + ')';
      else { const e = info.emails.filter(function (x) { return o.emails.indexOf(x) >= 0; }); if (e.length) why = 'email already used: ' + e.join(', ') + ' (' + n + ' row ' + r + ')'; }
    }
  });
  return why;
}

/* ------------------------------ 1. a registration comes in ------------------------------ */
function onFormSubmit(e) { processRow(e.range.getSheet(), e.range.getRow(), false); }
function processRow(sh, row, skipDup) {
  const cat = categoryOf(sh); if (!cat) { Logger.log('Submission on tab "' + sh.getName() + '" ignored: not recognised as Student or Professional. Run checkSetup().'); return; }
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const cols = ensureColumns(sh);
    if (sh.getRange(row, cols.sent).getValue()) return;                                  // already handled: never email twice
    const info = readRow(sh, row);
    if (!skipDup) { const dup = findDuplicate(sh, row, info);
      if (dup) { sh.getRange(row, cols.id).setValue('-'); sh.getRange(row, cols.status).setValue('DUPLICATE'); sh.getRange(row, cols.sent).setValue('SKIPPED (duplicate)');
        if (validEmail(CONFIG.COMMITTEE_EMAIL)) mailTo({ to: CONFIG.COMMITTEE_EMAIL, subject: 'DUPLICATE registration flagged: ' + info.teamName, text: 'Duplicate in ' + sh.getName() + ' row ' + row + ': ' + dup + '. No email was sent to the team. To accept it anyway: UNLOCK Tools > Accept / resend a row.', html: wrap(toHtml('*Duplicate flagged* in ' + sh.getName() + ' row ' + row + '\n' + dup + '\n\nNo email was sent to the team. To accept it anyway: UNLOCK Tools > Accept / resend a row.')) });
        CacheService.getScriptCache().remove('counts'); return; } }
    const before = countStatus(sh, cols, 'CONFIRMED', row), status = before < CONFIG.LIMIT_PER_CATEGORY ? 'CONFIRMED' : 'WAITLIST';
    const regId = status === 'CONFIRMED' ? nextId(cat) : 'WAIT-' + cat[0] + '-' + (row - 1);
    sh.getRange(row, cols.id).setValue(regId); sh.getRange(row, cols.status).setValue(status);
    const c0 = CONFIG.CLASSES[0], v = { teamName: info.teamName, track: info.track || '-', leaderName: info.leaderName, category: cat, regId: regId, fee: CONFIG.PAYMENT[cat], whatsapp: CONFIG.WHATSAPP_LINK, venue: CONFIG.VENUE, firstClass: firstClass_(), workshopDates: workshopDates_(), platform: 'Google Meet (online) - ' + orElse(c0.link, 'link will be given shortly') };
    const failed = [], send = function (to, key) { try { const m = render(key, v); mailTo({ to: to, subject: m.subject, text: m.text, html: m.html }); } catch (err) { failed.push(to); Logger.log('Email failed ' + to + ': ' + err); } };
    if (status === 'WAITLIST') { if (info.leaderEmail) send(info.leaderEmail, 'waitlist'); }
    else info.emails.forEach(function (to) { send(to, to === info.leaderEmail ? 'leader' : 'member'); });    // leader + every team member
    if (validEmail(CONFIG.COMMITTEE_EMAIL)) { try { mailTo({ to: CONFIG.COMMITTEE_EMAIL, subject: 'New ' + cat + ' pre-registration: ' + info.teamName + ' (' + status + ')', text: status + ' | ' + regId + ' | ' + info.teamName + ' | ' + info.emails.join(', '), html: wrap(toHtml('*' + status + '* | ' + regId + '\nTeam: ' + info.teamName + '\nTrack: ' + info.track + '\nLeader: ' + info.leaderName + ' (' + info.leaderEmail + ')\nEmails sent to: ' + info.emails.join(', ') + '\n\nPayment: pay later (' + CONFIG.PAYMENT[cat] + ' per team). Send the payment details when ready.')) }); } catch (err) { Logger.log(err); } }
    sh.getRange(row, cols.sent).setValue(failed.length ? 'PARTIAL, failed: ' + failed.join(', ') : new Date());
    if (status === 'CONFIRMED' && before + 1 >= CONFIG.LIMIT_PER_CATEGORY) closeForm(sh, cat);               // limit reached: close the form
    CacheService.getScriptCache().remove('counts');
  } finally { lock.releaseLock(); }
}
function closeForm(sh, cat) {
  const url = sh.getFormUrl(); if (!url) { Logger.log('No form linked to tab ' + sh.getName()); return; }
  const f = FormApp.openByUrl(url); f.setAcceptingResponses(false);
  f.setCustomClosedFormMessage('Pre-registration for the ' + cat + ' category is now full (' + CONFIG.LIMIT_PER_CATEGORY + ' teams). Thank you for your interest in UNLOCK!');
}
function reopenForms() {   // reopens every category that still has a free spot (a full category stays closed)
  CATS.forEach(function (n) { const sh = tabFor_(n); if (!sh || !sh.getFormUrl()) return;
    if (countStatus(sh, ensureColumns(sh), 'CONFIRMED', 0) >= CONFIG.LIMIT_PER_CATEGORY) return;
    FormApp.openByUrl(sh.getFormUrl()).setAcceptingResponses(true); });
}
function extendDeadline() {   // run ONCE after changing REG_CLOSE: clears the "already closed" flag, reopens the forms and rebuilds the triggers
  PropertiesService.getScriptProperties().deleteProperty('deadlineClosed');
  reopenForms(); setupTriggers(); CacheService.getScriptCache().remove('counts');
  Logger.log('Deadline is now ' + CONFIG.REG_CLOSE + '. Forms with free spots are open again.\n' + summaryText());
}

/* ------------------------------ 1b. pre-registration deadline (11 Nov 2026) ------------------------------ */
function closeFormsNow_(reason) {   // closes both forms (a category that is already full keeps its "full" message)
  CATS.forEach(function (n) {
    const sh = tabFor_(n), url = sh && sh.getFormUrl(); if (!url) return;
    const f = FormApp.openByUrl(url), full = countStatus(sh, ensureColumns(sh), 'CONFIRMED', 0) >= CONFIG.LIMIT_PER_CATEGORY;
    f.setAcceptingResponses(false);
    if (!full) f.setCustomClosedFormMessage('Pre-registration for UNLOCK closed on ' + longDate(CONFIG.REG_CLOSE.slice(0, 10)) + '. Thank you for your interest!');
  });
  if (validEmail(CONFIG.COMMITTEE_EMAIL)) { try { mailTo({ to: CONFIG.COMMITTEE_EMAIL, subject: 'Pre-registration forms closed', text: reason + '\n\n' + summaryText(), html: wrap(toHtml('*Both pre-registration forms are now closed.*\n' + reason + '\n\n' + summaryText())) }); } catch (err) { Logger.log(err); } }
}
function closeFormsAtDeadline() {   // runs at the deadline (and again each morning as a safety net), but only closes ONCE
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('deadlineClosed') || new Date() < new Date(CONFIG.REG_CLOSE)) return;
  closeFormsNow_('Deadline reached: ' + CONFIG.REG_CLOSE);
  p.setProperty('deadlineClosed', 'yes');   // so "Reopen both forms" (for a waitlist team) is never undone automatically
}
function closeFormsManually() { closeFormsNow_('Closed manually from the UNLOCK Tools menu.'); try { SpreadsheetApp.getUi().alert('Both forms are closed.'); } catch (e) {} }

/* ------------------------------ 2. reminders ------------------------------ */
function participantEmails() {
  const out = [];
  CATS.forEach(function (n) {
    const sh = tabFor_(n); if (!sh || sh.getLastRow() < 2) return; const cols = ensureColumns(sh), st = sh.getRange(2, cols.status, sh.getLastRow() - 1, 1).getValues();
    st.forEach(function (r, i) { if (String(r[0]) === 'CONFIRMED') readRow(sh, i + 2).emails.forEach(function (e) { if (out.indexOf(e) < 0) out.push(e); }); });
  });
  return out;
}
function reminderVars(r) {
  if (r.type.indexOf('summit') === 0) return { date: longDate(CONFIG.SUMMIT.date), venue: CONFIG.VENUE };
  const c = CONFIG.CLASSES[r.cls]; return { date: longDate(c.date), platform: 'Google Meet (online) - ' + orElse(c.link, 'link will be given shortly') };
}
function missingFor(r) {
  const out = []; if (r.type.indexOf('summit') === 0) { return out; }
  const c = CONFIG.CLASSES[r.cls]; if (r.type === 'workshop_day' && isPh(c.link)) out.push(c.title + ' class link'); return out;
}
function runReminder(r) {   // one email to everyone, addresses hidden (BCC), in batches of 40
  const m = render(r.type, reminderVars(r)), list = participantEmails(), to = validEmail(CONFIG.COMMITTEE_EMAIL) ? CONFIG.COMMITTEE_EMAIL : selfEmail();
  for (let i = 0; i < list.length; i += 40) mailTo({ to: to, bcc: list.slice(i, i + 40).join(','), subject: m.subject, text: m.text, html: m.html });
  const miss = missingFor(r); if (miss.length && validEmail(CONFIG.COMMITTEE_EMAIL)) mailTo({ to: CONFIG.COMMITTEE_EMAIL, subject: 'Reminder ' + r.key + ' was sent with missing details', text: 'Still using fallback wording for: ' + miss.join(', '), html: wrap(toHtml('Reminder *' + r.key + '* was sent with fallback wording for: ' + miss.join(', ') + '.\nFill them in CONFIG for the next reminders.')) });
  return list.length;
}
function dailyJob() {   // every day at 9 am: sends only a reminder whose date is today, never twice. Also closes the forms after the deadline.
  closeFormsAtDeadline();
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), p = PropertiesService.getScriptProperties(), log = JSON.parse(p.getProperty('sent') || '{}');
  CONFIG.REMINDERS.forEach(function (r) { if (r.on === today && !log[r.key]) { runReminder(r); log[r.key] = today; p.setProperty('sent', JSON.stringify(log)); } });
}

/* ------------------------------ 3. live counter for the website ------------------------------ */
function countTeams(cat) {
  const sh = tabFor_(cat); if (!sh || sh.getLastRow() < 2) return 0;
  const cols = ensureColumns(sh), n = sh.getLastRow() - 1, ts = sh.getRange(2, 1, n, 1).getValues(), st = sh.getRange(2, cols.status, n, 1).getValues(); let c = 0;
  for (let i = 0; i < n; i++) if (String(ts[i][0]).trim() !== '' && NOT_COUNTED.indexOf(String(st[i][0])) < 0) c++;
  return c;
}
function doGet() {   // public: numbers only, no names or emails
  const cache = CacheService.getScriptCache(); let out = cache.get('counts');
  if (!out) { out = JSON.stringify({ students: countTeams('Student'), professionals: countTeams('Professional'), limit: CONFIG.LIMIT_PER_CATEGORY, closes: CONFIG.REG_CLOSE, payLater: true, updated: new Date().toISOString() }); cache.put('counts', out, 30); }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------ 4. extra commands (also in the "UNLOCK Tools" menu) ------------------------------ */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('UNLOCK Tools').addItem('Registration summary', 'showSummary').addItem('Reminder schedule', 'showReminders').addItem('Send a reminder now', 'sendReminderNow')
    .addSeparator().addItem('Accept / resend a row', 'resendRow').addItem('Withdraw a team', 'withdrawTeam').addItem('Promote next waitlist team', 'promoteWaitlist').addItem('Reopen both forms', 'reopenForms').addItem('Close both forms now', 'closeFormsManually')
    .addSeparator().addItem('Export email list', 'exportEmailList').addItem('Email quota check', 'quotaCheck').addItem('Preview all emails to committee', 'previewAllMessages').addItem('Check setup', 'checkSetup').addItem('Send emails for rows that were missed', 'reprocessUnhandledRows').addItem('Extend deadline (after editing REG_CLOSE)', 'extendDeadline').addToUi();
}
function tally(cat) {
  const t = { CONFIRMED: 0, WAITLIST: 0, DUPLICATE: 0, WITHDRAWN: 0, PENDING: 0 }, sh = tabFor_(cat); if (!sh || sh.getLastRow() < 2) return t;
  const cols = ensureColumns(sh), n = sh.getLastRow() - 1, ts = sh.getRange(2, 1, n, 1).getValues(), st = sh.getRange(2, cols.status, n, 1).getValues();
  for (let i = 0; i < n; i++) if (String(ts[i][0]).trim() !== '') { const s = String(st[i][0]) || 'PENDING'; t[s] = (t[s] || 0) + 1; } return t;
}
function summaryText() {
  const a = tally('Student'), b = tally('Professional'), L = CONFIG.LIMIT_PER_CATEGORY, f = (n, t) => n + ': ' + t.CONFIRMED + '/' + L + ' confirmed, ' + t.PENDING + ' waiting to be processed (no email sent yet), ' + t.WAITLIST + ' waitlist, ' + t.DUPLICATE + ' duplicate, ' + t.WITHDRAWN + ' withdrawn';
  return f('Student', a) + '\n' + f('Professional', b) + '\nEmails that will get reminders: ' + participantEmails().length;
}
function showSummary() { const t = summaryText(); Logger.log(t); try { SpreadsheetApp.getUi().alert('Registration summary', t, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {} }
function showReminders() {
  const log = JSON.parse(PropertiesService.getScriptProperties().getProperty('sent') || '{}'), t = CONFIG.REMINDERS.map(function (r) { const m = missingFor(r); return r.on + '  ' + r.key + '  ' + (log[r.key] ? 'SENT' : 'pending') + (m.length ? '  (missing: ' + m.join(', ') + ')' : ''); }).join('\n');
  Logger.log(t); try { SpreadsheetApp.getUi().alert('Reminder schedule', t, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}
function sendReminderNow() {   // manual: type a key such as w1_pre. Use if a scheduled one was missed.
  const ui = SpreadsheetApp.getUi(), keys = CONFIG.REMINDERS.map(function (r) { return r.key; }).join(', '), a = ui.prompt('Send a reminder to ALL participants now', 'Type one key: ' + keys, ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return; const r = CONFIG.REMINDERS.filter(function (x) { return x.key === a.getResponseText().trim(); })[0]; if (!r) { ui.alert('Unknown key'); return; }
  if (ui.alert('Send "' + r.key + '" to everyone now?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const n = runReminder(r), p = PropertiesService.getScriptProperties(), log = JSON.parse(p.getProperty('sent') || '{}'); log[r.key] = 'manual'; p.setProperty('sent', JSON.stringify(log)); ui.alert('Sent to ' + n + ' people');
}
function askRow_(title) {   // asks for "Student,3" (tab, row number)
  const ui = SpreadsheetApp.getUi(), a = ui.prompt(title, 'Type the tab and row number, for example: Student,3', ui.ButtonSet.OK_CANCEL); if (a.getSelectedButton() !== ui.Button.OK) return null;
  const p = a.getResponseText().split(','), sh = ss_().getSheetByName((p[0] || '').trim()) || tabFor_(/stud/i.test(p[0] || '') ? 'Student' : 'Professional'), row = Number(p[1]); if (!sh || !(row >= 2)) { ui.alert('Could not read that. Example: Student,3'); return null; } return { sh: sh, row: row };
}
function resendRow() {   // accepts a flagged duplicate or resends the confirmation for one row
  const x = askRow_('Accept / resend a row'); if (!x) return; const cols = ensureColumns(x.sh);
  x.sh.getRange(x.row, cols.sent).clearContent(); x.sh.getRange(x.row, cols.status).clearContent(); processRow(x.sh, x.row, true); SpreadsheetApp.getUi().alert('Done. Check the Status column.');
}
function withdrawTeam() {   // frees the spot. Then use "Promote next waitlist team" and/or "Reopen both forms".
  const x = askRow_('Withdraw a team'); if (!x) return; x.sh.getRange(x.row, ensureColumns(x.sh).status).setValue('WITHDRAWN'); CacheService.getScriptCache().remove('counts');
  SpreadsheetApp.getUi().alert('Marked WITHDRAWN. The website counter is updated. Next: promote a waitlist team or reopen the form.');
}
function promoteWaitlist() {
  const ui = SpreadsheetApp.getUi(); let done = false;
  CATS.forEach(function (n) {
    const sh = tabFor_(n); if (done || !sh || sh.getLastRow() < 2) return; const cols = ensureColumns(sh);
    if (countStatus(sh, cols, 'CONFIRMED', 0) >= CONFIG.LIMIT_PER_CATEGORY) return;
    const st = sh.getRange(2, cols.status, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < st.length; i++) if (String(st[i][0]) === 'WAITLIST') { sh.getRange(i + 2, cols.sent).clearContent(); sh.getRange(i + 2, cols.status).clearContent(); processRow(sh, i + 2, true); done = true; ui.alert('Promoted ' + n + ' row ' + (i + 2) + '. Confirmation emails sent.'); return; }
  });
  if (!done) ui.alert('Nothing to promote: no free spot with a waitlist team.');
}
function exportEmailList() {   // writes a clean "Email List" tab (one row per person) for WhatsApp / mailing
  const out = [['Email', 'Team', 'Category', 'Registration ID']];
  CATS.forEach(function (n) {
    const sh = tabFor_(n); if (!sh || sh.getLastRow() < 2) return; const cols = ensureColumns(sh), st = sh.getRange(2, cols.status, sh.getLastRow() - 1, 2).getValues();
    st.forEach(function (r, i) { if (String(r[0]) === 'CONFIRMED') { const o = readRow(sh, i + 2); o.emails.forEach(function (e) { out.push([e, o.teamName, n, sh.getRange(i + 2, cols.id).getValue()]); }); } });
  });
  const s = ss_().getSheetByName('Email List') || ss_().insertSheet('Email List'); s.clear(); s.getRange(1, 1, out.length, 4).setValues(out); Logger.log('Exported ' + (out.length - 1) + ' emails');
}
function quotaCheck() {   // Gmail allows about 100 recipients/day (free) or 1,500 (Google Workspace); reminders use 1 per person
  const t = 'Emails you can still send today: ' + MailApp.getRemainingDailyQuota() + '\nParticipants who get each reminder: ' + participantEmails().length; Logger.log(t); try { SpreadsheetApp.getUi().alert(t); } catch (e) {}
}
function previewAllMessages() {   // sends a sample of every email to the committee so you can read the wording
  const to = validEmail(CONFIG.COMMITTEE_EMAIL) ? CONFIG.COMMITTEE_EMAIL : selfEmail(), c0 = CONFIG.CLASSES[0];
  const base = { teamName: 'Team Sample', track: 'Customer Experience & Support', leaderName: 'Sample Leader', category: 'Student', regId: 'UNL-S-001', fee: CONFIG.PAYMENT.Student, whatsapp: CONFIG.WHATSAPP_LINK, venue: CONFIG.VENUE, firstClass: firstClass_(), workshopDates: workshopDates_(), platform: 'Google Meet (online) - ' + orElse(c0.link, 'link will be given shortly') };
  Object.keys(MESSAGES).forEach(function (k) {
    const r = CONFIG.REMINDERS.filter(function (x) { return x.type === k; })[0], m = render(k, r ? reminderVars(r) : base); mailTo({ to: to, subject: '[PREVIEW] ' + m.subject, text: m.text, html: m.html }); });
}
function checkSetup() {   // shows which tabs/forms were found, the triggers, the counts and anything still to fill in
  const lines = [];
  CATS.forEach(function (n) { const sh = tabFor_(n);
    if (!sh) { lines.push('❌ ' + n + ': NO TAB FOUND. Rename the response tab to "' + (n === 'Student' ? CONFIG.STUDENT_TAB : CONFIG.PRO_TAB) + '".'); return; }
    let form = 'no form linked'; try { if (sh.getFormUrl()) { const f = FormApp.openByUrl(sh.getFormUrl()); form = '"' + f.getTitle() + '" (' + (f.isAcceptingResponses() ? 'OPEN' : 'CLOSED') + ')'; } } catch (e) { form = 'form not readable: ' + e; }
    lines.push('✅ ' + n + ' -> tab "' + sh.getName() + '", form ' + form + ', teams counted on website: ' + countTeams(n)); });
  lines.push('All tabs: ' + ss_().getSheets().map(function (sh) { let t = ''; try { t = sh.getFormUrl() ? ' <- form "' + FormApp.openByUrl(sh.getFormUrl()).getTitle() + '"' : ''; } catch (e) {} return '"' + sh.getName() + '" (' + Math.max(sh.getLastRow() - 1, 0) + ' rows)' + t; }).join(' | '));
  const tr = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction() + ' (' + t.getEventType() + ')'; });
  lines.push('Triggers: ' + (tr.length ? tr.join(', ') : 'NONE: run setupTriggers()'));
  lines.push('Deadline: ' + CONFIG.REG_CLOSE + (PropertiesService.getScriptProperties().getProperty('deadlineClosed') ? ' (deadline flag set: run extendDeadline())' : ''));
  lines.push('Reminders: ' + CONFIG.REMINDERS.map(function (r) { return r.key + ' ' + r.on; }).join(', '));
  lines.push('Emails left today: ' + MailApp.getRemainingDailyQuota());
  const left = JSON.stringify(CONFIG).match(/EDIT: [^"]+/g) || []; if (left.length) lines.push('Still to fill in:\n' + left.join('\n'));
  const t = lines.join('\n'); Logger.log(t); try { SpreadsheetApp.getUi().alert('UNLOCK setup check', t, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}
function reprocessUnhandledRows() {   // sends the confirmation for every row that came in while the script was not working (rows with an empty "Email Sent")
  let n = 0;
  CATS.forEach(function (c) { const sh = tabFor_(c); if (!sh || sh.getLastRow() < 2) return; const cols = ensureColumns(sh);
    const ts = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(), sent = sh.getRange(2, cols.sent, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ts.length; i++) if (String(ts[i][0]).trim() && !sent[i][0]) { processRow(sh, i + 2, false); n++; } });
  Logger.log('Processed ' + n + ' waiting row(s).\n' + summaryText()); try { SpreadsheetApp.getUi().alert('Processed ' + n + ' waiting row(s).'); } catch (e) {}
}
function doPost(e) {   // the website "Ask UNLOCK" box logs questions here (tab "Ask Log")
  try { const d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); if (d.type === 'ask' && d.q) { const s = ss_().getSheetByName('Ask Log') || ss_().insertSheet('Ask Log'); if (s.getLastRow() === 0) s.appendRow(['Time', 'Question']); s.appendRow([new Date(), String(d.q).slice(0, 300)]); } } catch (err) { Logger.log(err); }
  return ContentService.createTextOutput('ok');
}
function setupTriggers() {   // run ONCE (and run it again after updating this script)
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss_()).onFormSubmit().create();
  ScriptApp.newTrigger('dailyJob').timeBased().everyDays(1).atHour(9).inTimezone(TZ).create();
  if (new Date(CONFIG.REG_CLOSE) > new Date()) ScriptApp.newTrigger('closeFormsAtDeadline').timeBased().at(new Date(CONFIG.REG_CLOSE)).create();   // closes both forms at the deadline
  Logger.log('Triggers ready: form submissions + daily 9 am reminders + forms close at ' + CONFIG.REG_CLOSE);
}
function resetIdCounters() {   // run after deleting your TEST registrations
  const p = PropertiesService.getScriptProperties(); p.deleteProperty('id_Student'); p.deleteProperty('id_Professional'); p.deleteProperty('sent'); p.deleteProperty('deadlineClosed'); CacheService.getScriptCache().remove('counts'); Logger.log('ID counters, reminder log and deadline flag reset');
}