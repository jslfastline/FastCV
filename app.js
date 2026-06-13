/* ═══════════════════════════════════════════════════════
   FastCV v2 — app.js
   Template chooser · Full form · Live preview · PDF export
═══════════════════════════════════════════════════════ */
'use strict';

/* ── Constants ────────────────────────────────────── */
const STORAGE_KEY = 'fastcv_v2';
const USER_KEY    = 'fastcv_user';
const LANG_LEVELS  = { Native:100, Fluent:85, Advanced:70, Intermediate:50, Basic:30 };

/* Template tier metadata */
const TEMPLATES = {
  nexus:    { name:'Nexus',    isPremium:false },
  prestige: { name:'Prestige', isPremium:true  },
  minimal:  { name:'Minimal',  isPremium:true  },
};

/* ── User / monetization state ──────────────────────── */
let user = { hasPaid:false };

/* Required fields */
const REQUIRED = [
  { id:'fullName', label:'Full Name' },
  { id:'proTitle', label:'Professional Title' },
  { id:'email',    label:'Email' },
  { id:'summary',  label:'Professional Summary' },
];

/* Simple text fields to watch */
const TEXT_FIELDS = [
  'fullName','proTitle','email','phone','location',
  'nationality','dob','gender','marital','linkedin','summary'
];

/* ── State ────────────────────────────────────────── */
let state = {
  template : 'nexus',
  step     : 0,
  skills   : [],
  education: [],
  work     : [],
  languages: [],
  certs    : [],
  refs     : [],
};

/* Counters for unique IDs */
let counters = { edu:0, work:0, lang:0, cert:0, ref:0 };

/* ── Toast timer ──────────────────────────────────── */
let toastTimer = null;
let saveTimer  = null;

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Simulate loading
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
  }, 1400);

  loadState();
  loadUser();
  bindHeader();
  bindTemplateChooser();
  bindFormEvents();
  bindButtons();
  bindPremiumUI();
  updatePremiumUI();
  updateAllPreviews();
  updateProgress();

  // Go to editor directly if we have saved data
  if (localStorage.getItem(STORAGE_KEY)) {
    switchStep(1);
  }
});

/* ══════════════════════════════════════════════════
   STEP MANAGEMENT
══════════════════════════════════════════════════ */
function switchStep(n) {
  state.step = n;

  // Show/hide screens
  document.querySelectorAll('.step-screen').forEach(s => s.classList.remove('active-step'));
  const screens = ['stepTemplate','stepEditor'];
  if (screens[n]) document.getElementById(screens[n]).classList.add('active-step');

  // Update step pills
  document.querySelectorAll('.step-pill').forEach(p => {
    const i = parseInt(p.dataset.step);
    p.classList.toggle('active', i === n);
    p.classList.toggle('done',   i < n);
  });

  // Enable Export pill once on step 1
  if (n >= 1) document.querySelector('[data-step="2"]').removeAttribute('disabled');

  updateProgress();
}

/* ══════════════════════════════════════════════════
   HEADER BINDINGS
══════════════════════════════════════════════════ */
function bindHeader() {
  document.querySelectorAll('.step-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const s = parseInt(pill.dataset.step);
      if (!pill.disabled) switchStep(s);
    });
  });
}

/* ══════════════════════════════════════════════════
   PREMIUM / MONETIZATION
══════════════════════════════════════════════════ */
function bindPremiumUI() {
  const modal   = document.getElementById('paymentModal');
  const closeBtn= document.getElementById('paymentModalClose');
  const laterBtn= document.getElementById('paymentMaybeLaterBtn');
  const upgrBtn = document.getElementById('paymentUpgradeBtn');
  const aiBtn   = document.getElementById('aiOptimizerBtn');

  closeBtn?.addEventListener('click', () => closePaymentModal());
  laterBtn?.addEventListener('click', () => closePaymentModal());
  modal?.addEventListener('click', e => { if (e.target === modal) closePaymentModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePaymentModal();
  });

  document.getElementById('goProBtn')?.addEventListener('click', () => openPaymentModal());

  upgrBtn?.addEventListener('click', () => {
    // Simulated payment success
    user.hasPaid = true;
    saveUser();
    updatePremiumUI();
    updateAllPreviews();
    closePaymentModal();
    showToast('Premium unlocked ✓ Enjoy FastCV Pro!', 'success');
  });

  aiBtn?.addEventListener('click', () => {
    if (!user.hasPaid) {
      openPaymentModal();
    } else {
      showToast('AI ATS Optimizer is analyzing your CV…', 'success');
    }
  });
}

function openPaymentModal() {
  document.getElementById('paymentModal')?.classList.add('show');
}
function closePaymentModal() {
  document.getElementById('paymentModal')?.classList.remove('show');
}

/* Refresh all premium-gated UI: AI widget, lock badges, watermark hints */
function updatePremiumUI() {
  document.body.classList.toggle('is-pro', !!user.hasPaid);

  const aiWidget = document.getElementById('aiOptimizer');
  if (aiWidget) aiWidget.classList.toggle('unlocked', user.hasPaid);

  const aiBtn = document.getElementById('aiOptimizerBtn');
  if (aiBtn) aiBtn.textContent = user.hasPaid ? 'Run AI Optimizer' : 'Unlock AI Optimizer';

  // Hide lock badges once paid
  document.querySelectorAll('.tcard[data-premium="true"]').forEach(card => {
    card.classList.toggle('is-premium', !user.hasPaid);
  });
}


function bindTemplateChooser() {
  document.querySelectorAll('.tcard').forEach(card => {
    const tpl = card.dataset.template;
    const btn = card.querySelector('.btn');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectTemplate(tpl);
    });
    card.addEventListener('click', () => selectTemplate(tpl));
  });

  document.getElementById('changeTemplateBtn')?.addEventListener('click', () => switchStep(0));
}

function selectTemplate(tpl) {
  state.template = tpl;
  saveState();
  updateTemplateUI();
  updatePremiumUI();
  switchStep(1);
  const meta = TEMPLATES[tpl];
  if (meta?.isPremium && !user.hasPaid) {
    showToast(`Template "${capitalise(tpl)}" selected · Premium 🔒`, '');
  } else {
    showToast(`Template "${capitalise(tpl)}" selected ✓`, 'success');
  }
}

function updateTemplateUI() {
  const tpl = state.template;
  const paper = document.getElementById('resumePreview');
  if (!paper) return;

  paper.className = `resume-paper tpl-${tpl}`;

  const chip = document.getElementById('pvChip');
  if (chip) chip.textContent = capitalise(tpl);

  // Theme tokens per template (CV accent identity)
  const THEMES = {
    nexus:    { '--cv-primary':'#0f172a', '--cv-accent':'#00e5ff', '--cv-sidebar-bg':'#0f172a' },
    prestige: { '--cv-primary':'#0f172a', '--cv-accent':'#00e5ff', '--cv-sidebar-bg':'#0f172a' },
    minimal:  { '--cv-primary':'#0f172a', '--cv-accent':'#00e5ff', '--cv-sidebar-bg':'#ffffff' },
  };
  const theme = THEMES[tpl] || THEMES.nexus;
  Object.entries(theme).forEach(([k,v]) => paper.style.setProperty(k, v));
}

/* ══════════════════════════════════════════════════
   FORM EVENT BINDING
══════════════════════════════════════════════════ */
function bindFormEvents() {
  /* Text field live sync */
  TEXT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => { onFormChange(); clearErr(id); });
    el.addEventListener('change', () => onFormChange()); // for selects/date
  });

  /* Section collapse */
  document.querySelectorAll('.fs-caret').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const fs = btn.closest('.fs');
      fs.classList.toggle('collapsed');
    });
  });
  document.querySelectorAll('.fs-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.fs').classList.toggle('collapsed');
    });
  });

  /* Skills */
  document.getElementById('addSkillBtn').addEventListener('click', addSkill);
  document.getElementById('skillInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  });

  /* Repeatable add buttons */
  document.getElementById('addEduBtn') .addEventListener('click', () => addEduItem());
  document.getElementById('addWorkBtn').addEventListener('click', () => addWorkItem());
  document.getElementById('addLangBtn').addEventListener('click', () => addLangItem());
  document.getElementById('addCertBtn').addEventListener('click', () => addCertItem());
  document.getElementById('addRefBtn') .addEventListener('click', () => addRefItem());
}

function onFormChange() {
  updateAllPreviews();
  updateProgress();
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  const badge = document.getElementById('autosaveBadge');
  const text  = document.getElementById('autosaveText');
  if (text) { text.textContent = 'Saving…'; badge.style.color = 'var(--accent)'; }
  saveTimer = setTimeout(() => {
    saveState();
    if (text) { text.textContent = 'Saved'; badge.style.color = ''; }
  }, 800);
}

/* ══════════════════════════════════════════════════
   SKILLS
══════════════════════════════════════════════════ */
function addSkill() {
  const input = document.getElementById('skillInput');
  const raw   = input.value.trim();
  if (!raw) return;

  raw.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
    if (state.skills.length < 25 && !state.skills.includes(s)) {
      state.skills.push(s);
    }
  });

  input.value = '';
  input.focus();
  renderSkillTags();
  onFormChange();
}

function removeSkill(i) {
  state.skills.splice(i, 1);
  renderSkillTags();
  onFormChange();
}

function renderSkillTags() {
  const wrap = document.getElementById('skillsTags');
  wrap.innerHTML = '';
  state.skills.forEach((s, i) => {
    const tag = el('span', 'stag');
    tag.textContent = s;
    const rm = el('button', 'stag-rm');
    rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', `Remove ${s}`);
    rm.onclick = () => removeSkill(i);
    tag.appendChild(rm);
    wrap.appendChild(tag);
  });
}

/* ══════════════════════════════════════════════════
   EDUCATION
══════════════════════════════════════════════════ */
function addEduItem(data={}) {
  const id = ++counters.edu;
  if (!data.id) data.id = id;
  state.education.push({ id, school:'', degree:'', from:'', to:'', desc:'', ...data });
  renderEduList();
  onFormChange();
}

function renderEduList() {
  const list = document.getElementById('eduList');
  list.innerHTML = '';
  state.education.forEach((edu, i) => {
    const item = el('div', 'rep-item');
    item.innerHTML = `
      <div class="rep-item-header">
        <span class="rep-item-title">Education ${i+1}</span>
        <button class="rep-remove" data-i="${i}">Remove</button>
      </div>
      <div class="fg">
        <div class="f f2">
          <label>School / University</label>
          <input type="text" value="${esc(edu.school)}" placeholder="University of Dar es Salaam" data-field="school" data-i="${i}"/>
        </div>
        <div class="f f2">
          <label>Degree / Qualification</label>
          <input type="text" value="${esc(edu.degree)}" placeholder="B.Sc. Computer Science" data-field="degree" data-i="${i}"/>
        </div>
        <div class="f">
          <label>From (Year)</label>
          <input type="number" value="${esc(edu.from)}" placeholder="2018" min="1950" max="2035" data-field="from" data-i="${i}"/>
        </div>
        <div class="f">
          <label>To (Year / Expected)</label>
          <input type="number" value="${esc(edu.to)}" placeholder="2022" min="1950" max="2035" data-field="to" data-i="${i}"/>
        </div>
        <div class="f f2">
          <label>Notes / Achievements <span class="opt">optional</span></label>
          <textarea rows="2" placeholder="GPA, honours, notable courses…" data-field="desc" data-i="${i}">${esc(edu.desc)}</textarea>
        </div>
      </div>
    `;
    bindRepItem(item, 'education');
    list.appendChild(item);
  });
}

/* ══════════════════════════════════════════════════
   WORK EXPERIENCE
══════════════════════════════════════════════════ */
function addWorkItem(data={}) {
  const id = ++counters.work;
  state.work.push({ id, company:'', role:'', from:'', to:'', current:false, desc:'', ...data });
  renderWorkList();
  onFormChange();
}

function renderWorkList() {
  const list = document.getElementById('workList');
  list.innerHTML = '';
  state.work.forEach((w, i) => {
    const item = el('div', 'rep-item');
    item.innerHTML = `
      <div class="rep-item-header">
        <span class="rep-item-title">Experience ${i+1}</span>
        <button class="rep-remove" data-i="${i}">Remove</button>
      </div>
      <div class="fg">
        <div class="f f2">
          <label>Company / Organisation</label>
          <input type="text" value="${esc(w.company)}" placeholder="Vodacom Tanzania" data-field="company" data-i="${i}"/>
        </div>
        <div class="f f2">
          <label>Job Title / Role</label>
          <input type="text" value="${esc(w.role)}" placeholder="Senior Network Engineer" data-field="role" data-i="${i}"/>
        </div>
        <div class="f">
          <label>From (Month/Year)</label>
          <input type="text" value="${esc(w.from)}" placeholder="Jan 2020" data-field="from" data-i="${i}"/>
        </div>
        <div class="f">
          <label>To</label>
          <input type="text" value="${esc(w.to)}" placeholder="Dec 2023 or Present" data-field="to" data-i="${i}"/>
        </div>
        <div class="f f2">
          <label>Key Responsibilities / Achievements</label>
          <textarea rows="3" placeholder="• Managed a team of 5 network engineers&#10;• Reduced downtime by 40%…" data-field="desc" data-i="${i}">${esc(w.desc)}</textarea>
        </div>
      </div>
    `;
    bindRepItem(item, 'work');
    list.appendChild(item);
  });
}

/* ══════════════════════════════════════════════════
   LANGUAGES
══════════════════════════════════════════════════ */
function addLangItem(data={}) {
  const id = ++counters.lang;
  state.languages.push({ id, name:'', level:'Fluent', ...data });
  renderLangList();
  onFormChange();
}

function renderLangList() {
  const list = document.getElementById('langList');
  list.innerHTML = '';
  state.languages.forEach((lang, i) => {
    const item = el('div', 'rep-item');
    item.innerHTML = `
      <div class="rep-item-header">
        <span class="rep-item-title">Language ${i+1}</span>
        <button class="rep-remove" data-i="${i}">Remove</button>
      </div>
      <div class="fg">
        <div class="f">
          <label>Language</label>
          <input type="text" value="${esc(lang.name)}" placeholder="Swahili" data-field="name" data-i="${i}"/>
        </div>
        <div class="f">
          <label>Proficiency</label>
          <select data-field="level" data-i="${i}">
            ${Object.keys(LANG_LEVELS).map(l => `<option value="${l}" ${lang.level===l?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
    bindRepItem(item, 'languages');
    list.appendChild(item);
  });
}

/* ══════════════════════════════════════════════════
   CERTIFICATIONS
══════════════════════════════════════════════════ */
function addCertItem(data={}) {
  const id = ++counters.cert;
  state.certs.push({ id, name:'', org:'', year:'', ...data });
  renderCertList();
  onFormChange();
}

function renderCertList() {
  const list = document.getElementById('certList');
  list.innerHTML = '';
  state.certs.forEach((c, i) => {
    const item = el('div', 'rep-item');
    item.innerHTML = `
      <div class="rep-item-header">
        <span class="rep-item-title">Certificate ${i+1}</span>
        <button class="rep-remove" data-i="${i}">Remove</button>
      </div>
      <div class="fg">
        <div class="f f2">
          <label>Certificate Name</label>
          <input type="text" value="${esc(c.name)}" placeholder="CCNA Routing & Switching" data-field="name" data-i="${i}"/>
        </div>
        <div class="f">
          <label>Issuing Organisation</label>
          <input type="text" value="${esc(c.org)}" placeholder="Cisco" data-field="org" data-i="${i}"/>
        </div>
        <div class="f">
          <label>Year</label>
          <input type="number" value="${esc(c.year)}" placeholder="2023" data-field="year" data-i="${i}"/>
        </div>
      </div>
    `;
    bindRepItem(item, 'certs');
    list.appendChild(item);
  });
}

/* ══════════════════════════════════════════════════
   REFERENCES
══════════════════════════════════════════════════ */
function addRefItem(data={}) {
  const id = ++counters.ref;
  state.refs.push({ id, name:'', role:'', company:'', email:'', phone:'', ...data });
  renderRefList();
  onFormChange();
}

function renderRefList() {
  const list = document.getElementById('refList');
  list.innerHTML = '';
  state.refs.forEach((r, i) => {
    const item = el('div', 'rep-item');
    item.innerHTML = `
      <div class="rep-item-header">
        <span class="rep-item-title">Reference ${i+1}</span>
        <button class="rep-remove" data-i="${i}">Remove</button>
      </div>
      <div class="fg">
        <div class="f">
          <label>Full Name</label>
          <input type="text" value="${esc(r.name)}" placeholder="Dr. Amina Mwanga" data-field="name" data-i="${i}"/>
        </div>
        <div class="f">
          <label>Position / Role</label>
          <input type="text" value="${esc(r.role)}" placeholder="Head of IT" data-field="role" data-i="${i}"/>
        </div>
        <div class="f">
          <label>Company</label>
          <input type="text" value="${esc(r.company)}" placeholder="TANESCO" data-field="company" data-i="${i}"/>
        </div>
        <div class="f">
          <label>Email / Phone</label>
          <input type="text" value="${esc(r.email)}" placeholder="amina@company.com" data-field="email" data-i="${i}"/>
        </div>
      </div>
    `;
    bindRepItem(item, 'refs');
    list.appendChild(item);
  });
}

/* ── Generic repeatable item binding ─────────────── */
function bindRepItem(container, arrayKey) {
  /* Remove button */
  container.querySelector('.rep-remove')?.addEventListener('click', e => {
    const i = parseInt(e.currentTarget.dataset.i);
    state[arrayKey].splice(i, 1);
    rerenderList(arrayKey);
    onFormChange();
  });

  /* Field inputs */
  container.querySelectorAll('input,textarea,select').forEach(inp => {
    inp.addEventListener('input', e => {
      const i     = parseInt(inp.dataset.i);
      const field = inp.dataset.field;
      if (state[arrayKey][i] !== undefined) {
        state[arrayKey][i][field] = inp.value;
        onFormChange();
      }
    });
    inp.addEventListener('change', e => {
      const i     = parseInt(inp.dataset.i);
      const field = inp.dataset.field;
      if (state[arrayKey][i] !== undefined) {
        state[arrayKey][i][field] = inp.value;
        onFormChange();
      }
    });
  });
}

function rerenderList(key) {
  const fns = {
    education: renderEduList,
    work:      renderWorkList,
    languages: renderLangList,
    certs:     renderCertList,
    refs:      renderRefList,
  };
  fns[key]?.();
}

/* ══════════════════════════════════════════════════
   HEADER BUTTONS
══════════════════════════════════════════════════ */
function bindButtons() {
  document.getElementById('downloadBtn').addEventListener('click', downloadPDF);
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear all your data? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

/* ══════════════════════════════════════════════════
   LIVE PREVIEW — renders correct template
══════════════════════════════════════════════════ */
function updateAllPreviews() {
  updateTemplateUI();
  const paper = document.getElementById('resumePreview');
  if (!paper) return;

  const d = getFormData();

  if (state.template === 'prestige') {
    renderPrestige(paper, d);
  } else if (state.template === 'minimal') {
    renderMinimal(paper, d);
  } else {
    renderNexus(paper, d);
  }
}

/* ── Get form data snapshot ───────────────────────── */
function getFormData() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    fullName    : v('fullName'),
    proTitle    : v('proTitle'),
    email       : v('email'),
    phone       : v('phone'),
    location    : v('location'),
    nationality : v('nationality'),
    dob         : v('dob'),
    gender      : v('gender'),
    marital     : v('marital'),
    linkedin    : v('linkedin'),
    summary     : v('summary'),
  };
}

/* ── Format DOB ───────────────────────────────────── */
function formatDob(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
}

/* ── Contact icon helpers ─────────────────────────── */
const ICONS = {
  email: '✉',
  phone: '📞',
  location: '📍',
  linkedin: '🔗',
};

function contactItem(text, iconKey, cls='') {
  if (!text) return '';
  return `<span class="cv-contact-item ${cls}"><span>${ICONS[iconKey]}</span> ${esc(text)}</span>`;
}

/* ── Watermark (free tier only) ───────────────────── */
function watermarkBlock() {
  if (user.hasPaid) return '';
  return `<div class="cv-watermark">Created via <span>JSL FastLine CV Builder</span></div>`;
}

/* ── Personal details grid ────────────────────────── */
function personalDetailsGrid(d, lightClass='') {
  const rows = [
    d.dob         ? { label:'Date of Birth',   value: formatDob(d.dob) } : null,
    d.gender      ? { label:'Gender',          value: d.gender }          : null,
    d.marital     ? { label:'Marital Status',  value: d.marital }         : null,
    d.nationality ? { label:'Nationality',     value: d.nationality }     : null,
  ].filter(Boolean);

  if (!rows.length) return '';
  return `
    <div class="cv-section">
      <span class="cv-section-title">Personal Details</span>
      <div class="cv-details-grid">
        ${rows.map(r => `
          <div class="cv-detail-row">
            <span class="cv-detail-label ${lightClass}">${r.label}</span>
            <span class="cv-detail-value ${lightClass}">${esc(r.value)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ── Summary section ──────────────────────────────── */
function summarySection(text, cls='') {
  return `
    <div class="cv-section">
      <span class="cv-section-title">Professional Profile</span>
      <p class="cv-summary ${cls}">${text ? esc(text) : '<span class="cv-placeholder">Your professional summary will appear here…</span>'}</p>
    </div>
  `;
}

/* ── Education section ────────────────────────────── */
function educationSection(lightClass='', dateClass='') {
  if (!state.education.length) return `
    <div class="cv-section">
      <span class="cv-section-title">Academic Background</span>
      <p class="cv-placeholder">Add your education in the form →</p>
    </div>`;

  return `
    <div class="cv-section">
      <span class="cv-section-title">Academic Background</span>
      ${state.education.map(e => `
        <div class="cv-entry ${lightClass?'dark-sep':''}">
          <div class="cv-entry-top">
            <div>
              <div class="cv-entry-title ${lightClass}">${esc(e.school) || 'School Name'}</div>
              <div class="cv-entry-sub ${lightClass}">${esc(e.degree) || 'Degree'}</div>
            </div>
            <span class="cv-entry-date ${dateClass}">${esc(e.from)}${e.from&&e.to?' – ':''}${esc(e.to)}</span>
          </div>
          ${e.desc ? `<p class="cv-entry-desc ${lightClass}">${esc(e.desc)}</p>` : ''}
        </div>
      `).join('')}
    </div>`;
}

/* ── Work section ─────────────────────────────────── */
function workSection(lightClass='', dateClass='') {
  if (!state.work.length) return `
    <div class="cv-section">
      <span class="cv-section-title">Work Experience</span>
      <p class="cv-placeholder">Add your experience in the form →</p>
    </div>`;

  return `
    <div class="cv-section">
      <span class="cv-section-title">Work Experience</span>
      ${state.work.map(w => `
        <div class="cv-entry ${lightClass?'dark-sep':''}">
          <div class="cv-entry-top">
            <div>
              <div class="cv-entry-title ${lightClass}">${esc(w.role) || 'Job Title'}</div>
              <div class="cv-entry-sub ${lightClass}">${esc(w.company)}${w.company&&(w.from||w.to)?' · ':''}${esc(w.from)}${w.from&&w.to?' – ':''}${esc(w.to)}</div>
            </div>
            <span class="cv-entry-date ${dateClass}">${esc(w.from)||''}${w.from&&w.to?' – ':''}${esc(w.to)||''}</span>
          </div>
          ${w.desc ? `<p class="cv-entry-desc ${lightClass}" style="white-space:pre-line">${esc(w.desc)}</p>` : ''}
        </div>
      `).join('')}
    </div>`;
}

/* ── Skills section ───────────────────────────────── */
function skillsSection(pillClass='') {
  return `
    <div class="cv-section">
      <span class="cv-section-title">Skills &amp; Tools</span>
      ${state.skills.length
        ? `<div class="cv-skills-wrap">${state.skills.map(s => `<span class="cv-skill-pill ${pillClass}">${esc(s)}</span>`).join('')}</div>`
        : `<p class="cv-placeholder">Add your skills in the form →</p>`}
    </div>`;
}

/* ── Languages section ────────────────────────────── */
function languagesSection(barClass='', nameClass='', levelClass='') {
  if (!state.languages.length) return '';
  return `
    <div class="cv-section">
      <span class="cv-section-title">Languages</span>
      ${state.languages.map(l => `
        <div class="cv-lang-row">
          <span class="cv-lang-name ${nameClass}">${esc(l.name)}</span>
          <span class="cv-lang-level ${levelClass}">${l.level}</span>
          <div class="cv-lang-bar ${barClass}">
            <div class="cv-lang-fill" style="width:${LANG_LEVELS[l.level]||50}%"></div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

/* ── Certifications section ───────────────────────── */
function certsSection(nameClass='', orgClass='') {
  if (!state.certs.length) return '';
  return `
    <div class="cv-section">
      <span class="cv-section-title">Certifications</span>
      ${state.certs.map(c => `
        <div class="cv-cert ${nameClass==='light'?'dark':''}">
          <div>
            <div class="cv-cert-name ${nameClass}">${esc(c.name)}</div>
            <div class="cv-cert-org ${orgClass}">${esc(c.org)}</div>
          </div>
          <span class="cv-cert-year">${esc(c.year)}</span>
        </div>
      `).join('')}
    </div>`;
}

/* ── References section ───────────────────────────── */
function refsSection(nameClass='', roleClass='') {
  if (!state.refs.length) return '';
  return `
    <div class="cv-section">
      <span class="cv-section-title">References</span>
      ${state.refs.map(r => `
        <div class="cv-ref ${nameClass==='light'?'dark':''}">
          <div class="cv-ref-name ${nameClass}">${esc(r.name)}</div>
          <div class="cv-ref-role ${roleClass}">${esc(r.role)}${r.role&&r.company?' · ':''}${esc(r.company)}</div>
          ${r.email ? `<div class="cv-ref-contact">${esc(r.email)}</div>` : ''}
        </div>
      `).join('')}
    </div>`;
}

/* ══════════════════════════════════════════════════
   NEXUS TEMPLATE RENDERER
══════════════════════════════════════════════════ */
function renderNexus(paper, d) {
  const initial = d.fullName ? d.fullName.charAt(0).toUpperCase() : '?';

  paper.innerHTML = `
    <div class="cv-header">
      <div class="cv-avatar">${initial}</div>
      <div>
        <div class="cv-name">${d.fullName || '<span style="opacity:.3">Your Name</span>'}</div>
        <div class="cv-title">${d.proTitle || '<span style="opacity:.3;color:#94a3b8">Professional Title</span>'}</div>
      </div>
    </div>

    <div class="cv-contact-strip">
      ${contactItem(d.email,    'email')}
      ${contactItem(d.phone,    'phone')}
      ${contactItem(d.location, 'location')}
      ${contactItem(d.linkedin, 'linkedin')}
    </div>

    <div class="cv-body">
      ${summarySection(d.summary)}
      ${personalDetailsGrid(d)}
      ${workSection()}
      ${educationSection()}
      ${skillsSection()}
      ${languagesSection()}
      ${certsSection()}
      ${refsSection()}
    </div>
    ${watermarkBlock()}
  `;
}

/* ══════════════════════════════════════════════════
   PRESTIGE TEMPLATE RENDERER
══════════════════════════════════════════════════ */
function renderPrestige(paper, d) {
  const initial = d.fullName ? d.fullName.charAt(0).toUpperCase() : '?';

  paper.innerHTML = `
    <div class="cv-sidebar">
      <div class="cv-avatar">${initial}</div>
      <div class="cv-name">${d.fullName || '<span style="opacity:.3">Your Name</span>'}</div>
      <div class="cv-title">${d.proTitle || '<span style="opacity:.25;color:#94a3b8">Title</span>'}</div>

      <div class="cv-sidebar-section" style="margin-top:16px">
        <div class="cv-sidebar-title">Contact</div>
        ${contactItem(d.email,    'email',    'light')}
        ${contactItem(d.phone,    'phone',    'light')}
        ${contactItem(d.location, 'location', 'light')}
        ${contactItem(d.linkedin, 'linkedin', 'light')}
      </div>

      ${d.dob||d.gender||d.marital||d.nationality ? `
        <div class="cv-sidebar-section">
          <div class="cv-sidebar-title">Personal</div>
          ${d.dob         ? `<p class="cv-sidebar-text">📅 ${formatDob(d.dob)}</p>` : ''}
          ${d.gender      ? `<p class="cv-sidebar-text">👤 ${esc(d.gender)}</p>` : ''}
          ${d.marital     ? `<p class="cv-sidebar-text">💍 ${esc(d.marital)}</p>` : ''}
          ${d.nationality ? `<p class="cv-sidebar-text">🌍 ${esc(d.nationality)}</p>` : ''}
        </div>
      ` : ''}

      ${state.skills.length ? `
        <div class="cv-sidebar-section">
          <div class="cv-sidebar-title">Skills</div>
          <div class="cv-skills-wrap" style="margin-top:6px">
            ${state.skills.map(s => `<span class="cv-skill-pill light">${esc(s)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${languagesSection('dark','light','light')}
    </div>

    <div class="cv-main">
      ${summarySection(d.summary, 'light')}
      ${workSection('light','minimal')}
      ${educationSection('light','minimal')}
      ${certsSection('light','light')}
      ${refsSection('light','light')}
    </div>
    ${watermarkBlock()}
  `;
}

/* ══════════════════════════════════════════════════
   MINIMAL TEMPLATE RENDERER
══════════════════════════════════════════════════ */
function renderMinimal(paper, d) {
  paper.innerHTML = `
    <div class="cv-header">
      <div class="cv-name">${d.fullName || '<span style="opacity:.3;color:#0f172a">Your Name</span>'}</div>
      <div class="cv-title">${d.proTitle || '<span style="opacity:.3">Professional Title</span>'}</div>
      <div class="cv-contact-strip">
        ${contactItem(d.email,    'email')}
        ${contactItem(d.phone,    'phone')}
        ${contactItem(d.location, 'location')}
        ${contactItem(d.linkedin, 'linkedin')}
      </div>
    </div>

    <div class="cv-body">
      ${summarySection(d.summary)}
      ${personalDetailsGrid(d, 'dark')}
      ${workSection('','minimal')}
      ${educationSection('','minimal')}
      ${skillsSection('minimal')}
      ${languagesSection()}
      ${certsSection()}
      ${refsSection()}
    </div>
    ${watermarkBlock()}
  `;
}

/* ══════════════════════════════════════════════════
   PROGRESS
══════════════════════════════════════════════════ */
function updateProgress() {
  const d      = getFormData();
  const checks = [
    d.fullName, d.proTitle, d.email, d.phone,
    d.location, d.summary,
    state.education.length > 0,
    state.work.length > 0,
    state.skills.length > 0,
    d.dob || d.gender || d.marital,
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  const fill = document.getElementById('fpFill');
  const pctEl= document.getElementById('fpPct');
  const hFill= document.getElementById('headerProgressFill');

  if (fill)  fill.style.width  = pct + '%';
  if (pctEl) pctEl.textContent = pct + '% filled';
  if (hFill) hFill.style.width = pct + '%';
}

/* ══════════════════════════════════════════════════
   VALIDATION
══════════════════════════════════════════════════ */
function validate() {
  let ok = true;
  clearErrors();

  REQUIRED.forEach(({ id, label }) => {
    const val = (document.getElementById(id)?.value || '').trim();
    if (!val) { showErr(id, `${label} is required.`); ok = false; }
    else if (id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showErr(id, 'Enter a valid email address.'); ok = false;
    }
  });
  return ok;
}
function showErr(id, msg) {
  document.getElementById(id)?.classList.add('invalid');
  const e = document.getElementById('err-'+id);
  if (e) e.textContent = msg;
}
function clearErr(id) {
  document.getElementById(id)?.classList.remove('invalid');
  const e = document.getElementById('err-'+id);
  if (e) e.textContent = '';
}
function clearErrors() { REQUIRED.forEach(({id}) => clearErr(id)); }

/* ══════════════════════════════════════════════════
   PDF DOWNLOAD
══════════════════════════════════════════════════ */
function downloadPDF() {
  if (state.step < 1) { showToast('Fill your details first.','error'); switchStep(1); return; }
  if (!validate()) {
    showToast('Please fill required fields.', 'error');
    // Scroll to first error
    document.querySelector('input.invalid,textarea.invalid')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }

  // Premium gate — paywall before export
  const meta = TEMPLATES[state.template];
  if (meta?.isPremium && !user.hasPaid) {
    openPaymentModal();
    return;
  }

  const btn = document.getElementById('downloadBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';

  const paper = document.getElementById('resumePreview');
  const name  = (document.getElementById('fullName')?.value||'CV').replace(/\s+/g,'_');

  // Temporarily scale to 100% for export
  const prevTransform = paper.style.transform;
  const prevMargin    = paper.style.marginTop;
  paper.style.transform = 'scale(1)';
  paper.style.marginTop = '0';

  const opt = {
    margin   : [8,8,8,8],
    filename : `${name}_FastCV.pdf`,
    image    : { type:'jpeg', quality:.98 },
    html2canvas: { scale:2, useCORS:true, logging:false },
    jsPDF    : { unit:'mm', format:'a4', orientation:'portrait' },
  };

  html2pdf().set(opt).from(paper).save()
    .then(() => {
      paper.style.transform = prevTransform;
      paper.style.marginTop = prevMargin;
      btn.disabled   = false;
      btn.innerHTML  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF';
      showToast('PDF downloaded! ✓', 'success');
    })
    .catch(err => {
      console.error(err);
      paper.style.transform = prevTransform;
      paper.style.marginTop = prevMargin;
      btn.disabled   = false;
      btn.innerHTML  = 'Download PDF';
      showToast('PDF generation failed. Try again.', 'error');
    });
}

/* ══════════════════════════════════════════════════
   LOCAL STORAGE
══════════════════════════════════════════════════ */
function saveState() {
  try {
    const payload = {
      template  : state.template,
      skills    : state.skills,
      education : state.education,
      work      : state.work,
      languages : state.languages,
      certs     : state.certs,
      refs      : state.refs,
      fields    : getFormData(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch(e) { console.warn('FastCV: save failed', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);

    // Restore template
    if (p.template) state.template = p.template;

    // Restore text fields
    if (p.fields) {
      Object.entries(p.fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      });
    }

    // Restore arrays
    if (p.skills)    { state.skills    = p.skills;    renderSkillTags(); }
    if (p.education) { state.education = p.education; renderEduList(); }
    if (p.work)      { state.work      = p.work;      renderWorkList(); }
    if (p.languages) { state.languages = p.languages; renderLangList(); }
    if (p.certs)     { state.certs     = p.certs;     renderCertList(); }
    if (p.refs)      { state.refs      = p.refs;      renderRefList(); }
  } catch(e) { console.warn('FastCV: load failed', e); }
}

/* ── Paid-user flag (separate from CV data) ──────────── */
function saveUser() {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  catch(e) { console.warn('FastCV: user save failed', e); }
}
function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) user = { ...user, ...JSON.parse(raw) };
  } catch(e) { console.warn('FastCV: user load failed', e); }
}

/* ══════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════ */
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════ */
function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
function id(i)  { return document.getElementById(i); }
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
