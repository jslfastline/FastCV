/* FastCV Pro - Enhanced Application */

'use strict';

// State Management
let appState = {
  skills: [],
  experiences: [],
  education: [],
  certifications: [],
  languages: [],
  currentTemplate: 'modern'
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  bindEvents();
  loadFromStorage();
  updatePreview();
  updateProgress();
});

function initializeApp() {
  // Add empty experience field
  addExperienceField();
  addEducationField();
  addCertificationField();
  addLanguageField();
  
  // Show template modal on first visit
  if (!localStorage.getItem('template_selected')) {
    setTimeout(() => showTemplateModal(), 500);
  }
}

function bindEvents() {
  // Personal info fields
  const personalFields = ['fullName', 'proTitle', 'email', 'phone', 'dob', 
                          'maritalStatus', 'location', 'linkedin', 'github', 'summary'];
  
  personalFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updatePreview();
        saveToStorage();
        flashSaved();
      });
    }
  });
  
  // Add buttons
  document.getElementById('addExperienceBtn')?.addEventListener('click', () => addExperienceField());
  document.getElementById('addEducationBtn')?.addEventListener('click', () => addEducationField());
  document.getElementById('addCertificationBtn')?.addEventListener('click', () => addCertificationField());
  document.getElementById('addLanguageBtn')?.addEventListener('click', () => addLanguageField());
  document.getElementById('addSkillBtn')?.addEventListener('click', addSkill);
  document.getElementById('templateBtn')?.addEventListener('click', showTemplateModal);
  document.getElementById('downloadBtn')?.addEventListener('click', downloadPDF);
  document.getElementById('clearBtn')?.addEventListener('click', confirmClear);
  
  // Skill input enter key
  document.getElementById('skillInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSkill();
  });
}

// Work Experience Functions
function addExperienceField(data = null) {
  const container = document.getElementById('experiencesContainer');
  const index = appState.experiences.length;
  
  const expDiv = document.createElement('div');
  expDiv.className = 'exp-item';
  expDiv.innerHTML = `
    <button class="remove-item" onclick="removeExperience(${index})">×</button>
    <div class="field-grid">
      <div class="field field-full">
        <label>Job Title</label>
        <input type="text" class="exp-title" placeholder="e.g., Senior Software Engineer" value="${data?.title || ''}">
      </div>
      <div class="field field-full">
        <label>Company Name</label>
        <input type="text" class="exp-company" placeholder="e.g., Google, Microsoft" value="${data?.company || ''}">
      </div>
      <div class="field">
        <label>Start Date</label>
        <input type="month" class="exp-start" value="${data?.startDate || ''}">
      </div>
      <div class="field">
        <label>End Date</label>
        <input type="month" class="exp-end" value="${data?.endDate || ''}" placeholder="Present">
      </div>
      <div class="field field-full">
        <label>Key Achievements</label>
        <textarea class="exp-description" rows="3" placeholder="• Led a team of 5 developers...&#10;• Increased efficiency by 40%...">${data?.description || ''}</textarea>
      </div>
    </div>
  `;
  
  // Add event listeners
  const inputs = expDiv.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      updateExperience(index);
      updatePreview();
      saveToStorage();
    });
  });
  
  container.appendChild(expDiv);
  
  if (!data) {
    appState.experiences.push({ title: '', company: '', startDate: '', endDate: '', description: '' });
  }
}

function updateExperience(index) {
  const expDiv = document.querySelectorAll('.exp-item')[index];
  if (expDiv) {
    appState.experiences[index] = {
      title: expDiv.querySelector('.exp-title')?.value || '',
      company: expDiv.querySelector('.exp-company')?.value || '',
      startDate: expDiv.querySelector('.exp-start')?.value || '',
      endDate: expDiv.querySelector('.exp-end')?.value || '',
      description: expDiv.querySelector('.exp-description')?.value || ''
    };
  }
}

function removeExperience(index) {
  appState.experiences.splice(index, 1);
  renderExperiences();
  updatePreview();
  saveToStorage();
}

function renderExperiences() {
  const container = document.getElementById('experiencesContainer');
  container.innerHTML = '';
  appState.experiences.forEach((exp, i) => {
    addExperienceField(exp);
  });
}

// Similar functions for Education, Certifications, Languages...

// Preview Renderer
function updatePreview() {
  const template = appState.currentTemplate;
  const previewDiv = document.getElementById('resumePreview');
  
  let html = '';
  
  switch(template) {
    case 'modern':
      html = renderModernTemplate();
      break;
    case 'classic':
      html = renderClassicTemplate();
      break;
    case 'minimal':
      html = renderMinimalTemplate();
      break;
    case 'technical':
      html = renderTechnicalTemplate();
      break;
    default:
      html = renderModernTemplate();
  }
  
  previewDiv.innerHTML = html;
  previewDiv.className = `resume-card template-${template}`;
}

function renderModernTemplate() {
  const data = getFormData();
  
  return `
    <div class="cv-header-modern">
      <h1 class="cv-name">${escapeHtml(data.fullName) || 'Your Name'}</h1>
      <p class="cv-title">${escapeHtml(data.proTitle) || 'Professional Title'}</p>
      <div class="cv-contact-info">
        ${data.email ? `<span><i class="fas fa-envelope"></i> ${escapeHtml(data.email)}</span>` : ''}
        ${data.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(data.phone)}</span>` : ''}
        ${data.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(data.location)}</span>` : ''}
      </div>
    </div>
    <div class="cv-body">
      ${renderPersonalDetailsSection(data)}
      ${renderSummarySection(data.summary)}
      ${renderExperienceSection()}
      ${renderEducationSection()}
      ${renderSkillsSection()}
      ${renderCertificationsSection()}
      ${renderLanguagesSection()}
    </div>
  `;
}

function renderPersonalDetailsSection(data) {
  let details = [];
  if (data.dob) details.push(`<span><i class="fas fa-birthday-cake"></i> ${data.dob}</span>`);
  if (data.maritalStatus) details.push(`<span><i class="fas fa-heart"></i> ${data.maritalStatus}</span>`);
  if (data.linkedin) details.push(`<span><i class="fab fa-linkedin"></i> <a href="${data.linkedin}">LinkedIn</a></span>`);
  if (data.github) details.push(`<span><i class="fab fa-github"></i> <a href="${data.github}">GitHub</a></span>`);
  
  if (details.length === 0) return '';
  
  return `
    <div class="cv-section">
      <h3 class="cv-section-title">Personal Details</h3>
      <div class="cv-personal-details">
        ${details.join(' · ')}
      </div>
    </div>
  `;
}

function renderSummarySection(summary) {
  if (!summary) return '';
  return `
    <div class="cv-section">
      <h3 class="cv-section-title">Professional Summary</h3>
      <p class="cv-summary">${escapeHtml(summary)}</p>
    </div>
  `;
}

function renderExperienceSection() {
  if (appState.experiences.length === 0) return '';
  
  let html = `
    <div class="cv-section">
      <h3 class="cv-section-title">Work Experience</h3>
  `;
  
  appState.experiences.forEach(exp => {
    if (exp.title || exp.company) {
      html += `
        <div class="cv-experience-item">
          <div class="cv-exp-header">
            <div>
              <strong>${escapeHtml(exp.title)}</strong><br>
              <em>${escapeHtml(exp.company)}</em>
            </div>
            <div class="cv-exp-date">
              ${exp.startDate} - ${exp.endDate || 'Present'}
            </div>
          </div>
          ${exp.description ? `<div class="cv-exp-description">${formatDescription(exp.description)}</div>` : ''}
        </div>
      `;
    }
  });
  
  html += `</div>`;
  return html;
}

function renderSkillsSection() {
  if (appState.skills.length === 0) return '';
  
  return `
    <div class="cv-section">
      <h3 class="cv-section-title">Skills</h3>
      <div class="cv-skills-tags">
        ${appState.skills.map(skill => `<span class="cv-skill-pill">${escapeHtml(skill)}</span>`).join('')}
      </div>
    </div>
  `;
}

// Helper Functions
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function formatDescription(text) {
  if (!text) return '';
  // Convert bullet points with • or - to HTML lists
  let lines = text.split('\n');
  let html = '<ul>';
  lines.forEach(line => {
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
      html += `<li>${escapeHtml(line.trim().substring(1).trim())}</li>`;
    } else if (line.trim()) {
      html += `<li>${escapeHtml(line.trim())}</li>`;
    }
  });
  html += '</ul>';
  return html;
}

// Template selection modal
function showTemplateModal() {
  const modal = document.getElementById('templateModal');
  modal.classList.add('show');
  
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const template = card.dataset.template;
      appState.currentTemplate = template;
      updatePreview();
      localStorage.setItem('template_selected', 'true');
      localStorage.setItem('current_template', template);
      modal.classList.remove('show');
      showToast(`Template changed to ${template}`, 'success');
    });
  });
  
  document.querySelector('.modal-close').addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

// PDF Download
function downloadPDF() {
  const element = document.getElementById('resumePreview');
  const name = document.getElementById('fullName')?.value.trim() || 'CV';
  const filename = `${name.replace(/\s+/g, '_')}_CV.pdf`;
  
  const opt = {
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}