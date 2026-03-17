// ========== COOL SCHOOL BANK - APP v2 ==========

let currentStudent = null;
let isTeacher = false;
let isBanker = false;
let allStudents = [];
let allBeltColors = [];
let appConfig = {};
let currentPin = '';
let teacherPin = '';
let bankerPin = '';
let selectedStudentId = null;
let selectedManageStudents = new Set();
let selectedDeleteStudents = new Set();
let selectedBankerStudent = null;
let currentShopCategory = null;
let currentAvatarConfig = { ...DEFAULT_AVATAR };
let newPinValue = '';
let newPinConfirm = '';
let newPinStep = 'enter';
let pendingConfirmCallback = null;

// ==================== HELPERS ====================

function safeParseJSON(str) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str || {}); }
  catch(e) { return {}; }
}

function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

function notify(text, isError = false) {
  const el = document.getElementById('notification');
  const textEl = document.getElementById('notification-text');
  textEl.textContent = text;
  el.className = 'notification' + (isError ? ' error' : '');
  setTimeout(() => { el.classList.add('hidden'); }, 3000);
}

async function apiCall(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      notify(data.error || 'Erreur serveur', true);
      return null;
    }
    return data;
  } catch(e) {
    notify('Erreur de connexion au serveur !', true);
    return null;
  }
}

function showConfirm(title, message, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  pendingConfirmCallback = callback;
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function confirmAction() {
  document.getElementById('confirm-modal').classList.add('hidden');
  if (pendingConfirmCallback) {
    pendingConfirmCallback();
    pendingConfirmCallback = null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ==================== INIT ====================

async function loadConfig() {
  appConfig = await apiCall('/api/config') || {};
  const info = document.getElementById('login-school-info');
  if (info && appConfig.school_name) {
    info.textContent = `${appConfig.school_name} - ${appConfig.class_name || ''} - ${appConfig.school_year || ''}`;
  }
}

async function loadBeltColors() {
  allBeltColors = await apiCall('/api/belts/colors') || [];
}

async function loadStudents() {
  allStudents = await apiCall('/api/students') || [];
  return allStudents;
}

async function loadStudentsAdmin() {
  allStudents = await apiCall('/api/students/admin') || [];
  return allStudents;
}

// Load config and belt colors on startup
loadConfig();
loadBeltColors();

// Herse intro animation - zoom into gate after herse lifts
(function() {
  const overlay = document.getElementById('herse-intro');
  if (!overlay) return;
  const gate = document.getElementById('herse-gate');
  if (gate) {
    gate.addEventListener('animationend', function(e) {
      if (e.animationName === 'herseLift') {
        overlay.classList.add('herse-zoom');
      }
    });
  }
  overlay.addEventListener('animationend', function(e) {
    if (e.animationName === 'zoomIntoGate') {
      overlay.style.display = 'none';
      overlay.remove();
    }
  });
})();

// ==================== KEYBOARD SUPPORT ====================
// Route keyboard input to the active PIN/modal entry

document.addEventListener('keydown', (e) => {
  // Don't intercept if user is typing in an input/textarea/select
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const key = e.key;
  const isDigit = key >= '0' && key <= '9';
  const isBackspace = key === 'Backspace' || key === 'Delete';
  const isEnter = key === 'Enter';
  const isEscape = key === 'Escape';

  // Determine which modal/PIN is active
  const studentModal = document.getElementById('student-login-modal');
  const bankerModal = document.getElementById('banker-login-modal');
  const teacherModal = document.getElementById('teacher-login-modal');
  const firstPinModal = document.getElementById('first-pin-modal');

  const studentModalOpen = studentModal && !studentModal.classList.contains('hidden');
  const bankerModalOpen = bankerModal && !bankerModal.classList.contains('hidden');
  const teacherModalOpen = teacherModal && !teacherModal.classList.contains('hidden');
  const firstPinModalOpen = firstPinModal && !firstPinModal.classList.contains('hidden');

  // Escape closes any open modal
  if (isEscape) {
    if (firstPinModalOpen) { closeModal('first-pin-modal'); return; }
    if (studentModalOpen) { closeModal('student-login-modal'); return; }
    if (bankerModalOpen) { closeModal('banker-login-modal'); return; }
    if (teacherModalOpen) { closeModal('teacher-login-modal'); return; }
    // Close confirm modal if open
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
      confirmModal.classList.add('hidden');
      return;
    }
    return;
  }

  // First PIN modal (change PIN on first login)
  if (firstPinModalOpen) {
    if (isDigit) { enterNewPin(parseInt(key)); e.preventDefault(); }
    else if (isBackspace) { clearNewPin(); e.preventDefault(); }
    else if (isEnter) { submitNewPin(); e.preventDefault(); }
    return;
  }

  // Student PIN entry (only when pin-entry is visible)
  if (studentModalOpen) {
    const pinEntry = document.getElementById('pin-entry');
    if (pinEntry && !pinEntry.classList.contains('hidden')) {
      if (isDigit) { enterPin(parseInt(key)); e.preventDefault(); }
      else if (isBackspace) { clearPin(); e.preventDefault(); }
      else if (isEnter) { submitPin(); e.preventDefault(); }
    }
    return;
  }

  // Banker PIN
  if (bankerModalOpen) {
    if (isDigit) { enterBankerPin(parseInt(key)); e.preventDefault(); }
    else if (isBackspace) { clearBankerPin(); e.preventDefault(); }
    else if (isEnter) { submitBankerPin(); e.preventDefault(); }
    return;
  }

  // Teacher PIN
  if (teacherModalOpen) {
    if (isDigit) { enterTeacherPin(parseInt(key)); e.preventDefault(); }
    else if (isBackspace) { clearTeacherPin(); e.preventDefault(); }
    else if (isEnter) { submitTeacherPin(); e.preventDefault(); }
    return;
  }

  // Confirm modal - Enter to confirm, Escape already handled above
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal && !confirmModal.classList.contains('hidden')) {
    if (isEnter) { confirmAction(); e.preventDefault(); }
    return;
  }
});

// ==================== LOGIN ====================

async function showStudentLogin() {
  await loadStudents();
  const modal = document.getElementById('student-login-modal');
  const pinEntry = document.getElementById('pin-entry');

  pinEntry.classList.add('hidden');
  selectedStudentId = null;
  currentPin = '';
  updatePinDots('student-pin-display', 4, currentPin);

  renderStudentLoginList(allStudents);
  modal.classList.remove('hidden');
}

function renderStudentLoginList(students) {
  const list = document.getElementById('student-list');
  if (students.length === 0) {
    list.innerHTML = '<p style="grid-column:1/-1; color:var(--text-muted);">Pas encore d\'eleves ! Le prof doit d\'abord vous ajouter.</p>';
  } else {
    list.innerHTML = students.map(s => `
      <div class="student-card-login" onclick="selectStudent('${s.id}')">
        <div class="mini-avatar-login" id="login-avatar-${s.id}"></div>
        <div>${s.class_number ? '<span class="student-num">' + s.class_number + '</span> ' : ''}${s.first_name}</div>
      </div>
    `).join('');

    setTimeout(() => {
      students.forEach(s => {
        const container = document.getElementById(`login-avatar-${s.id}`);
        if (container) drawMiniAvatar(container, safeParseJSON(s.avatar_config), 48);
      });
    }, 50);
  }
}

function filterStudentLogin() {
  const q = document.getElementById('student-search').value.toLowerCase();
  const filtered = allStudents.filter(s =>
    s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q)
  );
  renderStudentLoginList(filtered);
}

function selectStudent(id) {
  selectedStudentId = id;
  currentPin = '';
  updatePinDots('student-pin-display', 4, currentPin);
  document.getElementById('pin-entry').classList.remove('hidden');
}

function enterPin(digit) {
  if (currentPin.length >= 4) return;
  currentPin += digit;
  updatePinDots('student-pin-display', 4, currentPin);
  if (currentPin.length === 4) setTimeout(submitPin, 200);
}

function clearPin() {
  currentPin = '';
  updatePinDots('student-pin-display', 4, currentPin);
}

async function submitPin() {
  const data = await apiCall('/api/students/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: selectedStudentId, pin_code: currentPin })
  });

  if (data) {
    currentStudent = data;
    isTeacher = false;
    isBanker = false;
    closeModal('student-login-modal');

    if (currentStudent.first_login) {
      showFirstPinModal();
    } else {
      enterStudentScreen();
    }
  } else {
    clearPin();
  }
}

function showFirstPinModal() {
  newPinValue = '';
  newPinConfirm = '';
  newPinStep = 'enter';
  updatePinDots('new-pin-display', 4, newPinValue);
  document.getElementById('new-pin-step').textContent = 'Choisis ton nouveau code :';
  document.getElementById('first-pin-modal').classList.remove('hidden');
}

function enterNewPin(digit) {
  if (newPinStep === 'enter') {
    if (newPinValue.length >= 4) return;
    newPinValue += digit;
    updatePinDots('new-pin-display', 4, newPinValue);
  } else {
    if (newPinConfirm.length >= 4) return;
    newPinConfirm += digit;
    updatePinDots('new-pin-display', 4, newPinConfirm);
    if (newPinConfirm.length === 4) setTimeout(submitNewPin, 200);
  }
}

function clearNewPin() {
  if (newPinStep === 'enter') {
    newPinValue = '';
    updatePinDots('new-pin-display', 4, newPinValue);
  } else {
    newPinConfirm = '';
    updatePinDots('new-pin-display', 4, newPinConfirm);
  }
}

async function submitNewPin() {
  if (newPinStep === 'enter') {
    if (newPinValue.length !== 4 || newPinValue === '0000') {
      notify('Choisis un code different de 0000 !', true);
      newPinValue = '';
      updatePinDots('new-pin-display', 4, '');
      return;
    }
    newPinStep = 'confirm';
    updatePinDots('new-pin-display', 4, '');
    document.getElementById('new-pin-step').textContent = 'Confirme ton code :';
    return;
  }

  if (newPinValue !== newPinConfirm) {
    notify('Les codes ne correspondent pas !', true);
    newPinStep = 'enter';
    newPinValue = '';
    newPinConfirm = '';
    updatePinDots('new-pin-display', 4, '');
    document.getElementById('new-pin-step').textContent = 'Choisis ton nouveau code :';
    return;
  }

  const data = await apiCall(`/api/students/${currentStudent.id}/pin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_pin: newPinValue })
  });

  if (data) {
    notify('Code PIN change !');
    closeModal('first-pin-modal');
    enterStudentScreen();
  }
}

// ========== BANKER LOGIN ==========

function showBankerLogin() {
  bankerPin = '';
  updatePinDots('banker-pin-display', 5, bankerPin);
  document.getElementById('banker-login-modal').classList.remove('hidden');
}

function enterBankerPin(digit) {
  if (bankerPin.length >= 5) return;
  bankerPin += digit;
  updatePinDots('banker-pin-display', 5, bankerPin);
  if (bankerPin.length === 5) setTimeout(submitBankerPin, 200);
}

function clearBankerPin() {
  bankerPin = '';
  updatePinDots('banker-pin-display', 5, bankerPin);
}

async function submitBankerPin() {
  const data = await apiCall('/api/banker/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: bankerPin })
  });

  if (data) {
    currentStudent = data;
    isBanker = true;
    isTeacher = false;
    closeModal('banker-login-modal');
    enterBankerScreen();
  } else {
    clearBankerPin();
  }
}

// ========== TEACHER LOGIN ==========

function showTeacherLogin() {
  teacherPin = '';
  updatePinDots('teacher-pin-display', 4, teacherPin);
  document.getElementById('teacher-login-modal').classList.remove('hidden');
}

function enterTeacherPin(digit) {
  if (teacherPin.length >= 4) return;
  teacherPin += digit;
  updatePinDots('teacher-pin-display', 4, teacherPin);
  if (teacherPin.length === 4) setTimeout(submitTeacherPin, 200);
}

function clearTeacherPin() {
  teacherPin = '';
  updatePinDots('teacher-pin-display', 4, teacherPin);
}

async function submitTeacherPin() {
  const data = await apiCall('/api/teacher/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: teacherPin })
  });

  if (data && data.success) {
    isTeacher = true;
    isBanker = false;
    currentStudent = null;
    closeModal('teacher-login-modal');
    enterTeacherScreen();
  } else {
    clearTeacherPin();
  }
}

// ==================== SCREENS ====================

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function logout() {
  currentStudent = null;
  isTeacher = false;
  isBanker = false;
  showScreen('login-screen');
}

function updatePinDots(displayId, count, value) {
  const display = document.getElementById(displayId);
  if (!display) return;
  const dots = display.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < value.length);
  });
}

// ==================== STUDENT SCREEN ====================

async function enterStudentScreen() {
  showScreen('student-screen');
  drawClassroomBg('classroom-bg');

  // Update nav
  document.getElementById('nav-name').textContent = currentStudent.first_name;
  document.getElementById('nav-balance').textContent = currentStudent.balance;
  document.getElementById('nav-balance').className = 'balance-amount' + (currentStudent.balance < 0 ? ' negative' : '');

  const navAvatar = document.getElementById('nav-avatar');
  drawMiniAvatar(navAvatar, safeParseJSON(currentStudent.avatar_config), 40);

  showTab('dashboard');
  loadDashboard();
}

function showTab(tabName) {
  document.querySelectorAll('#student-screen .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#student-screen .tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`#student-screen .tab[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'dashboard') loadDashboard();
  else if (tabName === 'avatar') loadAvatarEditor();
  else if (tabName === 'belts') loadStudentBelts();
  else if (tabName === 'shop') loadShop();
  else if (tabName === 'passes') loadPasses();
  else if (tabName === 'history') loadHistory();
}

async function loadDashboard() {
  // Refresh student data
  const fresh = await apiCall(`/api/students/${currentStudent.id}`);
  if (fresh) {
    currentStudent = fresh;
    document.getElementById('nav-balance').textContent = currentStudent.balance;
    document.getElementById('nav-balance').className = 'balance-amount' + (currentStudent.balance < 0 ? ' negative' : '');
  }

  renderCoolBreakdown('cool-breakdown', currentStudent.balance);

  // Balance status
  const status = document.getElementById('balance-status');
  if (currentStudent.balance < 0) {
    status.className = 'balance-status danger';
    status.textContent = '⚠️ Attention, tu es dans le rouge !';
  } else if (currentStudent.balance < 50) {
    status.className = 'balance-status warning';
    status.textContent = '💡 Bientot a sec, fais attention !';
  } else {
    status.className = 'balance-status ok';
    status.textContent = '✅ Ton compte est en forme !';
  }

  // Avatar
  const dashAvatar = document.getElementById('dashboard-avatar');
  drawAvatar(dashAvatar, safeParseJSON(currentStudent.avatar_config), 120);

  // Job
  const jobsData = await apiCall('/api/jobs/current');
  const myJob = jobsData ? jobsData.find(j => j.student_id === currentStudent.id) : null;
  const jobEl = document.getElementById('my-job');
  if (myJob) {
    jobEl.innerHTML = `<div class="job-display"><span class="job-icon">${myJob.job_icon}</span><div><div class="job-name">${myJob.job_name}</div><div class="job-pay">+${myJob.weekly_pay} centicools/semaine</div></div></div>`;
  } else {
    jobEl.textContent = 'Pas de metier cette semaine';
  }

  // Recent transactions
  const txns = await apiCall(`/api/students/${currentStudent.id}/transactions`);
  const recentEl = document.getElementById('recent-transactions');
  if (txns && txns.length > 0) {
    recentEl.innerHTML = txns.slice(0, 5).map(t => `
      <div class="transaction-item ${t.is_reversed ? 'reversed' : ''}">
        <span class="transaction-reason">${t.reason || t.type}</span>
        <span class="transaction-amount ${['earn','market_sell','refund'].includes(t.type) ? 'positive' : 'negative'}">
          ${['earn','market_sell','refund'].includes(t.type) ? '+' : '-'}${t.amount}
        </span>
      </div>
    `).join('');
  } else {
    recentEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Aucune activite</p>';
  }

  // Dashboard pass quick card
  loadDashboardPass();
}

async function loadDashboardPass() {
  const data = await apiCall(`/api/students/${currentStudent.id}/passes`);
  if (!data) return;

  const card = document.getElementById('dash-pass-card');
  const statusEl = document.getElementById('dash-pass-status');
  const btn = document.getElementById('dash-pass-btn');
  const hasPass = data.passes.some(p => p.pass_type === 'jeux');

  if (hasPass) {
    card.classList.add('pass-active-card');
    statusEl.innerHTML = '✅ <span style="color:var(--success)">Actif aujourd\'hui !</span>';
    btn.innerHTML = '✅<br><small>Actif</small>';
    btn.disabled = true;
    btn.classList.add('pass-owned');
  } else if (currentStudent.balance >= 20) {
    card.classList.remove('pass-active-card');
    statusEl.textContent = 'Disponible — 20 cc / jour';
    btn.innerHTML = 'Acheter<br><small>20 cc</small>';
    btn.disabled = false;
    btn.classList.remove('pass-owned');
  } else {
    card.classList.remove('pass-active-card');
    statusEl.innerHTML = '<span style="color:var(--danger)">Pas assez de cc</span>';
    btn.innerHTML = 'Acheter<br><small>20 cc</small>';
    btn.disabled = true;
    btn.classList.remove('pass-owned');
  }
}

async function quickBuyPass() {
  showConfirm('Acheter le Passe Jeux ?', 'Acheter le passe du jour pour 20 centicools (2 decicools) ?', async () => {
    const data = await apiCall('/api/passes/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: currentStudent.id, pass_type: 'jeux' })
    });
    if (data) {
      currentStudent.balance = data.balance;
      document.getElementById('nav-balance').textContent = data.balance;
      notify(data.message);
      loadDashboardPass();
    }
  });
}

// ========== BELTS ==========

async function loadStudentBelts() {
  const belts = await apiCall(`/api/students/${currentStudent.id}/belts`);
  if (!belts) return;
  renderBeltsGrid('belts-grid', belts, false);
}

function renderBeltsGrid(containerId, belts, isTeacherMode) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = belts.map(b => {
    const dots = allBeltColors.map(bc => `
      <div class="belt-dot ${bc.rank <= b.rank ? 'achieved' : ''}"
           style="background:${bc.color_hex};${bc.rank <= b.rank ? '' : 'opacity:0.2;'}"></div>
    `).join('');

    const teacherControls = isTeacherMode ? `
      <button class="belt-upgrade-btn" onclick="upgradeBelt('${b.student_id}', '${b.subject_id}')">⬆️ Monter</button>
      <button class="belt-downgrade-btn" onclick="downgradeBelt('${b.student_id}', '${b.subject_id}')">⬇️ Descendre</button>
    ` : '';

    return `
      <div class="belt-card" style="border-color:${b.color_hex}" data-category="${b.subject_category || 'other'}">
        <div class="subject-icon">${b.subject_icon}</div>
        <div class="subject-name">${b.subject_name}</div>
        <div class="belt-indicator" style="background:${b.color_hex}"></div>
        <div class="belt-name" style="color:${b.color_hex}">${b.belt_name}</div>
        <div class="belt-progress">${dots}</div>
        ${teacherControls}
      </div>
    `;
  }).join('');
}

function filterBelts(category) {
  document.querySelectorAll('#tab-belts .belt-cat-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  document.querySelectorAll('#belts-grid .belt-card').forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterTeacherBelts(category) {
  document.querySelectorAll('#teacher-belt-cats .belt-cat-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  document.querySelectorAll('#belt-management-grid .belt-card').forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// ========== AVATAR ==========

function loadAvatarEditor() {
  currentAvatarConfig = { ...DEFAULT_AVATAR, ...safeParseJSON(currentStudent.avatar_config) };

  // Render current avatar
  drawAvatar(document.getElementById('avatar-canvas'), currentAvatarConfig, 200);

  // Skin colors
  document.getElementById('skin-colors').innerHTML = SKIN_COLORS.map((c, i) =>
    `<div class="color-swatch ${currentAvatarConfig.skinColor === c ? 'selected' : ''}" style="background:${c}" onclick="setAvatarOption('skinColor','${c}', this)"></div>`
  ).join('');

  // Eyes
  document.getElementById('eye-options').innerHTML = EYE_STYLES.map((e, i) =>
    `<div class="pixel-option ${currentAvatarConfig.eyeStyle === i ? 'selected' : ''}" onclick="setAvatarOption('eyeStyle',${i}, this)">${e.emoji}</div>`
  ).join('');

  // Mouths
  document.getElementById('mouth-options').innerHTML = MOUTH_STYLES.map((m, i) =>
    `<div class="pixel-option ${currentAvatarConfig.mouthStyle === i ? 'selected' : ''}" onclick="setAvatarOption('mouthStyle',${i}, this)">${m.emoji}</div>`
  ).join('');

  // Hair
  document.getElementById('hair-options').innerHTML = HAIR_STYLES.map((h, i) =>
    `<div class="pixel-option ${currentAvatarConfig.hairStyle === i ? 'selected' : ''}" onclick="setAvatarOption('hairStyle',${i}, this)">${h.emoji}</div>`
  ).join('');

  // Hair colors
  document.getElementById('hair-colors').innerHTML = HAIR_COLORS.map(c =>
    `<div class="color-swatch ${currentAvatarConfig.hairColor === c ? 'selected' : ''}" style="background:${c}" onclick="setAvatarOption('hairColor','${c}', this)"></div>`
  ).join('');

  // Owned items
  loadOwnedItems();
}

function setAvatarOption(key, value, el) {
  currentAvatarConfig[key] = value;
  drawAvatar(document.getElementById('avatar-canvas'), currentAvatarConfig, 200);

  // Update selection visuals
  if (el) {
    const parent = el.parentElement;
    parent.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
  }
}

async function loadOwnedItems() {
  const purchases = await apiCall(`/api/students/${currentStudent.id}/purchases`);
  const list = document.getElementById('owned-items-list');
  if (!purchases || purchases.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:11px;">Achete des items dans la boutique !</p>';
    return;
  }

  list.innerHTML = purchases.map(p => {
    const data = safeParseJSON(p.item_data);
    let equipped = false;
    if (p.item_type === 'avatar_skin') equipped = currentAvatarConfig.skinOverride === data.color;
    else if (p.item_type === 'avatar_hat') equipped = currentAvatarConfig.hat === data.type;
    else if (p.item_type === 'avatar_accessory') equipped = currentAvatarConfig.accessory === data.type;
    else if (p.item_type === 'avatar_background') equipped = currentAvatarConfig.background === data.type;
    else if (p.item_type === 'avatar_head') equipped = currentAvatarConfig.head === data.type;
    else if (p.item_type === 'avatar_border') {
      if (data.type === 'solid') equipped = currentAvatarConfig.border === data.color;
      else equipped = currentAvatarConfig.border === data.type;
    }

    const safeData = btoa(JSON.stringify(data));
    return `<div class="owned-item ${equipped ? 'equipped' : ''}" onclick="equipItem('${p.item_type}', '${safeData}')">
      ${equipped ? '✅' : '⬜'} ${p.name}
    </div>`;
  }).join('');
}

function equipItem(itemType, dataStr) {
  const data = JSON.parse(atob(dataStr));
  if (itemType === 'avatar_skin') {
    currentAvatarConfig.skinOverride = currentAvatarConfig.skinOverride === data.color ? null : data.color;
  } else if (itemType === 'avatar_hat') {
    currentAvatarConfig.hat = currentAvatarConfig.hat === data.type ? null : data.type;
  } else if (itemType === 'avatar_accessory') {
    currentAvatarConfig.accessory = currentAvatarConfig.accessory === data.type ? null : data.type;
  } else if (itemType === 'avatar_background') {
    currentAvatarConfig.background = currentAvatarConfig.background === data.type ? null : data.type;
  } else if (itemType === 'avatar_head') {
    // Toggle creature head — removes hat when equipping a head
    if (currentAvatarConfig.head === data.type) {
      currentAvatarConfig.head = null;
    } else {
      currentAvatarConfig.head = data.type;
      currentAvatarConfig.hat = null; // head replaces hat
    }
  } else if (itemType === 'avatar_border') {
    // Toggle border — solid borders use color, animated use type
    if (data.type === 'solid') {
      currentAvatarConfig.border = currentAvatarConfig.border === data.color ? null : data.color;
    } else {
      currentAvatarConfig.border = currentAvatarConfig.border === data.type ? null : data.type;
    }
  }
  drawAvatar(document.getElementById('avatar-canvas'), currentAvatarConfig, 200);
  loadOwnedItems();
}

async function saveAvatar() {
  const data = await apiCall(`/api/students/${currentStudent.id}/avatar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar_config: currentAvatarConfig })
  });
  if (data) {
    currentStudent.avatar_config = JSON.stringify(currentAvatarConfig);
    drawMiniAvatar(document.getElementById('nav-avatar'), currentAvatarConfig, 40);
    notify('Avatar sauvegarde !');
  }
}

// ========== SHOP ==========

async function loadShop() {
  const shopData = await apiCall('/api/shop');
  const purchases = await apiCall(`/api/students/${currentStudent.id}/purchases`);
  if (!shopData) return;

  const ownedIds = new Set((purchases || []).map(p => p.item_id));

  // Categories
  const catContainer = document.getElementById('shop-categories');
  catContainer.innerHTML = shopData.categories.map(c =>
    `<button class="shop-cat-btn ${currentShopCategory === c.id ? 'active' : ''}" onclick="filterShop('${c.id}')">${c.icon} ${c.name}</button>`
  ).join('');

  // Items
  const itemsContainer = document.getElementById('shop-items');
  const items = currentShopCategory
    ? shopData.items.filter(i => i.category_id === currentShopCategory)
    : shopData.items;

  const totalEarned = currentStudent.total_earned || 0;

  itemsContainer.innerHTML = items.map(item => {
    const owned = ownedIds.has(item.id);
    const rarity = item.price >= 7500 ? 'mythic' : item.price >= 5000 ? 'legendary' : item.price >= 1000 ? 'epic' : item.price >= 500 ? 'rare' : item.price >= 200 ? 'uncommon' : 'common';
    const mythicLocked = rarity === 'mythic' && totalEarned < 10000;
    const canBuy = !owned && !mythicLocked && currentStudent.balance >= item.price;
    const typeIcon = getShopItemIcon(item.item_type, item.item_data);
    const typeAnim = getShopItemAnim(item.item_type);
    const needsEnchant = ['rare','epic','legendary','mythic'].includes(rarity);

    let btnText = owned ? '✅ Possede' : (canBuy ? '🛒 Acheter' : '🔒 Trop cher');
    let mythicMsg = '';
    if (mythicLocked) {
      btnText = '🔮 Verrouille';
      mythicMsg = `<div class="mythic-lock-msg">🔮 Il faut avoir gagne 10 000 cc au total pour debloquer ! (${totalEarned}/10 000)</div>`;
    }

    const innerContent = `
        <div class="shop-item-visual ${typeAnim}">${typeIcon}</div>
        <div class="shop-rarity-label rarity-${rarity}">${rarityLabel(rarity)}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.description || ''}</div>
        ${mythicMsg}
        <div class="shop-item-price">${item.price} cc</div>
        <button class="buy-btn" ${!canBuy ? 'disabled' : ''} onclick="buyItem('${item.id}', '${item.name}', ${item.price})">
          ${btnText}
        </button>
    `;

    if (needsEnchant) {
      return `
        <div class="shop-item ${owned ? 'owned' : ''} rarity-${rarity}">
          <div class="enchant-border enchant-${rarity}">
            <div class="shop-item-inner">${innerContent}</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="shop-item ${owned ? 'owned' : ''} rarity-${rarity}">
        ${innerContent}
      </div>
    `;
  }).join('');
}

function getShopItemIcon(type, itemData) {
  // Specific icons per item based on item_data
  if (itemData) {
    try {
      const data = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;

      // Heads — each creature gets its own emoji
      if (type === 'avatar_head') {
        const headIcons = {
          'wolf': '🐺', 'fox': '🦊', 'dragon': '🐉', 'lion': '🦁',
          'cat': '🐱', 'panda': '🐼', 'robot': '🤖', 'zombie': '🧟',
          'eagle': '🦅', 'owl': '🦉', 'shark': '🦈', 'monkey': '🐵',
          'unicorn': '🦄', 'phoenix': '🔥', 'demon': '👿'
        };
        return headIcons[data.type] || '🐲';
      }

      // Hats — each hat type gets its own emoji
      if (type === 'avatar_hat') {
        const hatIcons = {
          'cap': '🧢', 'crown': '👑', 'wizard': '🧙', 'ninja': '🥷', 'space': '🚀'
        };
        return hatIcons[data.type] || '🎩';
      }

      // Skins — each skin color gets its own emoji
      if (type === 'avatar_skin') {
        const skinIcons = {
          '#4A90D9': '🔵', '#4AD97A': '🟢', '#D94A8B': '🩷',
          '#FFD700': '🌟', 'rainbow': '🌈'
        };
        return skinIcons[data.color] || '🎨';
      }

      // Accessories — each type gets its own emoji
      if (type === 'avatar_accessory') {
        const accIcons = {
          'sunglasses': '🕶️', 'stars': '⭐', 'wings': '🪽', 'flames': '🔥'
        };
        return accIcons[data.type] || '✨';
      }

      // Backgrounds — each type gets its own emoji
      if (type === 'avatar_background') {
        const bgIcons = {
          'galaxy': '🌌', 'forest': '🌲', 'ocean': '🌊', 'lava': '🌋',
          'snow': '❄️', 'sunset': '🌅', 'deepspace': '🚀', 'rainbow': '🌈',
          'graffiti': '🎨', 'minecraft': '⛏️', 'matrix': '💻', 'aurora': '🏔️'
        };
        return bgIcons[data.type] || '🖼️';
      }

      // Borders — each type gets its own emoji
      if (type === 'avatar_border') {
        if (data.type === 'solid') {
          const colorIcons = {
            '#FF4444': '🟥', '#4488FF': '🟦', '#44DD44': '🟩',
            '#AA44FF': '🟪', '#FF69B4': '💗', '#FF8C00': '🟧'
          };
          return colorIcons[data.color] || '⬜';
        }
        const borderIcons = {
          'rainbow': '🌈', 'gold': '🥇', 'silver': '🥈', 'iridescent': '🔮',
          'sparkle': '✨', 'flames': '🔥', 'ice': '❄️', 'dragon': '🐲',
          'neon': '💡', 'pixel': '👾', 'galaxy': '🌌', 'lava': '🌋',
          'legendary': '👑', 'shadow': '🌑'
        };
        return borderIcons[data.type] || '🖼️';
      }
    } catch(e) {}
  }

  // Fallback generic icons
  const icons = {
    'avatar_skin': '🎨', 'avatar_hat': '🎩', 'avatar_accessory': '✨',
    'avatar_background': '🖼️', 'avatar_head': '🐲', 'avatar_border': '🖼️', 'cool_design_centicool': '🪙',
    'cool_design_decicool': '💵', 'cool_design_cool': '💎',
    'cool_design_supercool': '👑', 'cool_design_megacool': '🌟', 'special': '🎁'
  };
  return icons[type] || '📦';
}

function getShopItemAnim(type) {
  if (type === 'avatar_border') return 'anim-pulse';
  if (type === 'avatar_head') return 'anim-bounce';
  if (type.startsWith('avatar_skin')) return 'anim-pulse';
  if (type.startsWith('avatar_hat')) return 'anim-bounce';
  if (type.startsWith('avatar_accessory')) return 'anim-sparkle';
  if (type.startsWith('avatar_background')) return 'anim-glow';
  if (type.startsWith('cool_design')) return 'anim-spin';
  return 'anim-float';
}

function rarityLabel(rarity) {
  const labels = { common: 'Commun', uncommon: 'Peu commun', rare: 'Rare', epic: 'Epique', legendary: 'Legendaire', mythic: 'Mystique' };
  return labels[rarity] || '';
}

function filterShop(catId) {
  currentShopCategory = currentShopCategory === catId ? null : catId;
  loadShop();
}

async function buyItem(itemId, itemName, price) {
  showConfirm('Acheter ?', `Acheter ${itemName} pour ${price} centicools ?`, async () => {
    const data = await apiCall('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: currentStudent.id, item_id: itemId })
    });
    if (data) {
      currentStudent.balance = data.balance;
      document.getElementById('nav-balance').textContent = data.balance;
      notify(data.message);
      loadShop();
    }
  });
}

// ========== PASSES JEUX ==========

async function loadPasses() {
  const data = await apiCall(`/api/students/${currentStudent.id}/passes`);
  if (!data) return;

  const statusEl = document.getElementById('pass-status');
  const buyBtn = document.getElementById('pass-buy-btn');
  const card = document.getElementById('game-pass-card');
  const dateEl = document.getElementById('pass-card-date');
  const hasPass = data.passes.some(p => p.pass_type === 'jeux');

  // Show today's date on the pass
  const today = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  dateEl.textContent = today.toLocaleDateString('fr-FR', options);

  if (hasPass) {
    card.classList.add('pass-card-active');
    statusEl.innerHTML = `
      <div class="pass-status-active">
        <div class="pass-status-active-icon">✅</div>
        <div class="pass-status-active-text">
          Passe actif !<br>Amuse-toi bien !
        </div>
      </div>
    `;
    buyBtn.disabled = true;
    buyBtn.textContent = '✅ Passe deja achete';
    buyBtn.classList.add('pass-owned');
  } else {
    card.classList.remove('pass-card-active');
    const canBuy = currentStudent.balance >= 20;
    statusEl.innerHTML = `
      <div class="pass-status-inactive">
        <div class="pass-status-inactive-icon">🔒</div>
        <div class="pass-status-inactive-text">
          ${canBuy ? 'Achete ton passe !' : '<span style="color:var(--danger)">Pas assez de cc</span>'}
        </div>
      </div>
    `;
    buyBtn.disabled = !canBuy;
    buyBtn.textContent = '🎮 Acheter mon Passe Jeux (20 cc)';
    buyBtn.classList.remove('pass-owned');
  }
}

async function buyDailyPass(passType) {
  showConfirm('Acheter le Passe Jeux ?', 'Acheter le passe du jour pour 20 centicools (2 decicools) ?', async () => {
    const data = await apiCall('/api/passes/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: currentStudent.id, pass_type: passType })
    });
    if (data) {
      currentStudent.balance = data.balance;
      document.getElementById('nav-balance').textContent = data.balance;
      notify(data.message);
      loadPasses();
    }
  });
}

// ========== HISTORY ==========

async function loadHistory() {
  const txns = await apiCall(`/api/students/${currentStudent.id}/transactions`);
  const list = document.getElementById('transaction-list');
  if (!txns || txns.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">Aucune transaction</p>';
    return;
  }

  list.innerHTML = txns.map(t => `
    <div class="transaction-item ${t.is_reversed ? 'reversed' : ''}">
      <span class="transaction-reason">${t.reason || t.type}</span>
      <span class="transaction-amount ${['earn','market_sell','refund'].includes(t.type) ? 'positive' : 'negative'}">
        ${['earn','market_sell','refund'].includes(t.type) ? '+' : '-'}${t.amount}
      </span>
      <span class="transaction-date">${formatDate(t.created_at)}</span>
    </div>
  `).join('');
}

// ==================== BANKER SCREEN ====================

async function enterBankerScreen() {
  showScreen('banker-screen');
  await loadStudents();

  document.getElementById('banker-nav-name').textContent = currentStudent.first_name;
  drawMiniAvatar(document.getElementById('banker-nav-avatar'), safeParseJSON(currentStudent.avatar_config), 40);

  renderBankerStudentList(allStudents);
  loadBankerHistory();
  loadPassEligible();
}

function renderBankerStudentList(students) {
  const list = document.getElementById('banker-student-list');
  list.innerHTML = students.map(s => `
    <div class="banker-student-item ${selectedBankerStudent === s.id ? 'selected' : ''}"
         onclick="selectBankerStudent('${s.id}', '${s.first_name} ${s.last_name}')">
      <div class="mini-avatar" id="banker-list-av-${s.id}"></div>
      <span>${s.first_name} ${s.last_name}</span>
      <span style="margin-left:auto;color:var(--secondary);font-size:11px;">${s.balance} cc</span>
    </div>
  `).join('');

  setTimeout(() => {
    students.forEach(s => {
      const c = document.getElementById(`banker-list-av-${s.id}`);
      if (c) drawMiniAvatar(c, safeParseJSON(s.avatar_config), 40);
    });
  }, 50);
}

function filterBankerStudents(query) {
  const q = query.toLowerCase();
  const filtered = allStudents.filter(s =>
    s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q)
  );
  renderBankerStudentList(filtered);
}

function selectBankerStudent(id, name) {
  selectedBankerStudent = id;
  document.getElementById('banker-selected-name').textContent = name;
  document.querySelectorAll('.banker-student-item').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

function setBankerAmount(val) {
  document.getElementById('banker-amount').value = val;
}

function updateBankerPresets() {
  const type = document.getElementById('banker-type').value;
  const container = document.getElementById('banker-presets');
  const isLose = type === 'lose';
  const sign = isLose ? '-' : '+';
  const values = [1, 5, 10, 50, 100];

  container.innerHTML = values.map(v =>
    `<button class="preset-btn ${isLose ? 'preset-negative' : ''}" onclick="setBankerAmount(${v})">${sign}${v}</button>`
  ).join('');

  document.getElementById('banker-amount').placeholder = isLose ? 'Montant a retirer' : 'Montant';
}

async function bankerTransaction() {
  if (!selectedBankerStudent) return notify('Selectionne un eleve !', true);
  const amount = parseInt(document.getElementById('banker-amount').value);
  if (!amount || amount <= 0) return notify('Montant invalide !', true);
  const type = document.getElementById('banker-type').value;
  const reason = document.getElementById('banker-reason').value;

  const data = await apiCall('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: selectedBankerStudent,
      amount, type, reason,
      created_by: `banker:${currentStudent.first_name}`
    })
  });

  if (data) {
    notify(data.message);
    document.getElementById('banker-amount').value = '';
    document.getElementById('banker-reason').value = '';
    await loadStudents();
    renderBankerStudentList(allStudents);
    loadBankerHistory();
  }
}

async function loadBankerHistory() {
  const txns = await apiCall('/api/transactions/all');
  const el = document.getElementById('banker-history');
  if (!txns || txns.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);">Aucune transaction</p>';
    return;
  }
  el.innerHTML = txns.slice(0, 20).map(t => `
    <div class="transaction-item ${t.is_reversed ? 'reversed' : ''}">
      <span style="min-width:80px;font-weight:600;">${t.first_name} ${t.last_name}</span>
      <span class="transaction-reason">${t.reason || t.type}</span>
      <span class="transaction-amount ${['earn','market_sell','refund'].includes(t.type) ? 'positive' : 'negative'}">
        ${['earn','market_sell','refund'].includes(t.type) ? '+' : '-'}${t.amount}
      </span>
    </div>
  `).join('');
}

// ==================== BANKER PASS GROUP ====================

let passGroupSelected = new Set();
let passEligibleStudents = [];

async function loadPassEligible() {
  const data = await apiCall('/api/passes/eligible/jeux');
  if (data) passEligibleStudents = data.students;
}

function searchPassStudents(query) {
  const suggestions = document.getElementById('pass-search-suggestions');
  if (!query || query.length < 1) {
    suggestions.classList.add('hidden');
    return;
  }
  const q = query.toLowerCase();
  const matches = passEligibleStudents.filter(s =>
    (s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q)) &&
    !passGroupSelected.has(s.id)
  ).slice(0, 8);

  if (matches.length === 0) {
    suggestions.classList.add('hidden');
    return;
  }

  suggestions.innerHTML = matches.map(s => {
    let statusClass = 'can-buy', statusText = '✅ Eligible';
    if (s.has_pass) { statusClass = 'has-pass'; statusText = '🎮 Deja achete'; }
    else if (!s.can_buy) { statusClass = 'no-funds'; statusText = '❌ Pas assez'; }

    return `
      <div class="pass-suggestion-item" onclick="addToPassGroup('${s.id}')">
        <span class="sugg-name">${s.first_name} ${s.last_name}</span>
        <span class="sugg-status ${statusClass}">${statusText}</span>
        <span class="sugg-balance">${s.balance} cc</span>
      </div>
    `;
  }).join('');
  suggestions.classList.remove('hidden');
}

function addToPassGroup(studentId) {
  const student = passEligibleStudents.find(s => s.id === studentId);
  if (!student || !student.can_buy) {
    if (student && student.has_pass) notify('Cet eleve a deja son passe !', true);
    else if (student) notify('Pas assez de centicools !', true);
    return;
  }
  passGroupSelected.add(studentId);
  document.getElementById('pass-group-search').value = '';
  document.getElementById('pass-search-suggestions').classList.add('hidden');
  renderPassGroupChips();
}

function removeFromPassGroup(studentId) {
  passGroupSelected.delete(studentId);
  renderPassGroupChips();
}

function renderPassGroupChips() {
  const container = document.getElementById('pass-group-selected');
  const emptyMsg = document.getElementById('pass-group-empty');
  const countEl = document.getElementById('pass-group-count');

  if (passGroupSelected.size === 0) {
    container.innerHTML = '<p class="pass-group-empty" id="pass-group-empty">Aucun eleve selectionne — cherche un nom ci-dessus</p>';
    countEl.textContent = '0';
    return;
  }

  container.innerHTML = Array.from(passGroupSelected).map(id => {
    const s = passEligibleStudents.find(st => st.id === id);
    if (!s) return '';
    return `
      <div class="pass-group-chip">
        <span>${s.first_name}</span>
        <span class="chip-remove" onclick="removeFromPassGroup('${id}')">✕</span>
      </div>
    `;
  }).join('');
  countEl.textContent = passGroupSelected.size;
}

function selectAllEligibleForPass() {
  passEligibleStudents.forEach(s => {
    if (s.can_buy) passGroupSelected.add(s.id);
  });
  renderPassGroupChips();
  notify(`${passGroupSelected.size} eleve(s) selectionne(s)`);
}

function clearPassGroup() {
  passGroupSelected.clear();
  renderPassGroupChips();
}

async function buyGroupPass() {
  if (passGroupSelected.size === 0) return notify('Selectionne au moins un eleve !', true);

  const names = Array.from(passGroupSelected).map(id => {
    const s = passEligibleStudents.find(st => st.id === id);
    return s ? s.first_name : '?';
  }).join(', ');

  showConfirm(
    `Acheter ${passGroupSelected.size} passe(s) ?`,
    `Acheter le Passe Jeux pour : ${names} (20 cc chacun)`,
    async () => {
      const data = await apiCall('/api/passes/buy-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: Array.from(passGroupSelected), pass_type: 'jeux' })
      });
      if (data) {
        notify(data.message);
        const summaryEl = document.getElementById('pass-group-summary');
        let html = '';
        if (data.results.success.length > 0) {
          html += `<div class="pass-group-result success">✅ Passes achetes pour : ${data.results.success.map(s => s.name).join(', ')}</div>`;
        }
        if (data.results.errors.length > 0) {
          html += `<div class="pass-group-result has-errors">⚠️ Erreurs : ${data.results.errors.map(e => `${e.name || '?'} (${e.reason})`).join(', ')}</div>`;
        }
        summaryEl.innerHTML = html;
        passGroupSelected.clear();
        renderPassGroupChips();
        await loadPassEligible();
        await loadStudents();
        renderBankerStudentList(allStudents);
        loadBankerHistory();
      }
    }
  );
}

// ==================== TEACHER SCREEN ====================

async function enterTeacherScreen() {
  showScreen('teacher-screen');
  await loadStudentsAdmin();
  await loadBeltColors();
  showTeacherTab('t-dashboard');
}

function showTeacherTab(tabName) {
  document.querySelectorAll('#teacher-screen .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#teacher-screen .tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`#teacher-screen .tab[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 't-dashboard') loadTeacherDashboard();
  else if (tabName === 't-manage') loadManageSection();
  else if (tabName === 't-students') loadStudentManagement();
  else if (tabName === 't-belts') loadBeltManagement();
  else if (tabName === 't-jobs') loadJobManagement();
  else if (tabName === 't-market') loadMarketManagement();
  else if (tabName === 't-history') loadGlobalHistory();
  else if (tabName === 't-config') loadConfigSection();
}

// ========== TEACHER DASHBOARD ==========

async function loadTeacherDashboard() {
  const stats = await apiCall('/api/stats');
  if (!stats) return;

  document.getElementById('teacher-stats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${stats.totalStudents}</div><div class="stat-label">Eleves</div></div>
    <div class="stat-card"><div class="stat-value">${stats.totalCool}</div><div class="stat-label">Total centicools</div></div>
    <div class="stat-card"><div class="stat-value">${Math.round(stats.avgBalance)}</div><div class="stat-label">Moyenne</div></div>
    <div class="stat-card" style="border-color:${stats.negativeStudents > 0 ? 'var(--danger)' : 'var(--success)'}">
      <div class="stat-value" style="color:${stats.negativeStudents > 0 ? 'var(--danger)' : 'var(--success)'}">${stats.negativeStudents}</div>
      <div class="stat-label">En negatif</div>
    </div>
  `;

  renderClassOverview(allStudents);
}

function renderClassOverview(students) {
  document.getElementById('class-overview').innerHTML = students.map(s => `
    <div class="class-student-card ${s.balance < 0 ? 'negative' : ''}" data-name="${s.first_name} ${s.last_name}">
      <div class="class-student-name">${s.first_name} ${s.last_name}</div>
      <div class="class-student-balance ${s.balance < 0 ? 'negative' : ''}">${s.balance} cc</div>
    </div>
  `).join('');
}

function filterClassOverview(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#class-overview .class-student-card').forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
}

// ========== MANAGE COOL ==========

function loadManageSection() {
  renderManageStudentList(allStudents);
}

function renderManageStudentList(students) {
  const list = document.getElementById('manage-student-list');
  list.innerHTML = students.map(s => `
    <div class="manage-student-item ${selectedManageStudents.has(s.id) ? 'selected' : ''}"
         onclick="toggleManageStudent('${s.id}')" data-name="${s.first_name} ${s.last_name}">
      <input type="checkbox" ${selectedManageStudents.has(s.id) ? 'checked' : ''} onclick="event.stopPropagation(); toggleManageStudent('${s.id}')">
      <span>${s.first_name} ${s.last_name}</span>
      <span style="margin-left:auto;color:var(--secondary);font-size:11px;">${s.balance} cc</span>
    </div>
  `).join('');
}

function filterManageStudents(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#manage-student-list .manage-student-item').forEach(item => {
    const name = item.dataset.name.toLowerCase();
    item.style.display = name.includes(q) ? '' : 'none';
  });
}

function toggleManageStudent(id) {
  if (selectedManageStudents.has(id)) selectedManageStudents.delete(id);
  else selectedManageStudents.add(id);
  renderManageStudentList(allStudents);
}

function selectAllStudents() {
  allStudents.forEach(s => selectedManageStudents.add(s.id));
  renderManageStudentList(allStudents);
}

function deselectAllStudents() {
  selectedManageStudents.clear();
  renderManageStudentList(allStudents);
}

function setAmount(val) {
  document.getElementById('cool-amount').value = val;
}

function updateCoolPresets() {
  const type = document.getElementById('cool-type').value;
  const container = document.getElementById('cool-presets');
  const isLose = type === 'lose';
  const sign = isLose ? '-' : '+';
  const values = [1, 5, 10, 50, 100];

  container.innerHTML = values.map(v =>
    `<button class="preset-btn ${isLose ? 'preset-negative' : ''}" onclick="setAmount(${v})">${sign}${v}</button>`
  ).join('');

  // Update the input placeholder
  document.getElementById('cool-amount').placeholder = isLose ? 'Montant a retirer' : 'Montant personnalise';
}

async function distributeCoool() {
  if (selectedManageStudents.size === 0) return notify('Selectionne au moins un eleve !', true);
  const amount = parseInt(document.getElementById('cool-amount').value);
  if (!amount || amount <= 0) return notify('Montant invalide !', true);
  const type = document.getElementById('cool-type').value;
  const reason = document.getElementById('cool-reason').value;

  showConfirm(
    type === 'earn' ? 'Donner des COOL ?' : 'Retirer des COOL ?',
    `${type === 'earn' ? 'Donner' : 'Retirer'} ${amount} centicools a ${selectedManageStudents.size} eleve(s) ?`,
    async () => {
      const data = await apiCall('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: [...selectedManageStudents],
          amount, type, reason,
          created_by: 'teacher'
        })
      });
      if (data) {
        notify(data.message);
        document.getElementById('cool-amount').value = '';
        document.getElementById('cool-reason').value = '';
        selectedManageStudents.clear();
        await loadStudentsAdmin();
        renderManageStudentList(allStudents);
      }
    }
  );
}

// ========== STUDENT MANAGEMENT ==========

async function loadStudentManagement() {
  await loadStudentsAdmin();
  renderStudentManagementList(allStudents);
}

function renderStudentManagementList(students) {
  document.getElementById('student-management-list').innerHTML = students.map(s => `
    <div class="student-manage-card" data-name="${s.first_name} ${s.last_name}">
      <input type="checkbox" ${selectedDeleteStudents.has(s.id) ? 'checked' : ''}
             onchange="toggleDeleteStudent('${s.id}')">
      <div class="student-number-edit">
        <input type="number" class="number-input" value="${s.class_number || ''}" min="1" max="40"
               placeholder="N°" title="Numero en classe"
               onchange="updateClassNumber('${s.id}', this.value)">
      </div>
      <div class="student-info">${s.first_name} ${s.last_name}</div>
      <div class="student-balance">${s.balance} cc</div>
      <div class="student-pin-info">PIN: ${s.pin_code}</div>
      ${s.banker_code ? `<div class="banker-code-info">Banquier: ${s.banker_code}</div>` : ''}
      <button class="reset-pin-btn" onclick="resetStudentPin('${s.id}', '${s.first_name}')">🔑 Reset PIN</button>
    </div>
  `).join('');
}

async function updateClassNumber(studentId, number) {
  const cn = number ? parseInt(number) : null;
  await apiCall(`/api/students/${studentId}/number`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class_number: cn })
  });
}

function filterStudentManagement(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#student-management-list .student-manage-card').forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
}

function toggleDeleteStudent(id) {
  if (selectedDeleteStudents.has(id)) selectedDeleteStudents.delete(id);
  else selectedDeleteStudents.add(id);
}

function selectAllManageStudents() {
  allStudents.forEach(s => selectedDeleteStudents.add(s.id));
  renderStudentManagementList(allStudents);
}

function deselectAllManageStudents() {
  selectedDeleteStudents.clear();
  renderStudentManagementList(allStudents);
}

async function addStudent() {
  const fn = document.getElementById('new-first-name').value.trim();
  const ln = document.getElementById('new-last-name').value.trim();
  const pin = document.getElementById('new-pin').value || '0000';
  const cn = document.getElementById('new-class-number').value || null;

  if (!fn || !ln) return notify('Prenom et nom requis !', true);

  const data = await apiCall('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: fn, last_name: ln, pin_code: pin, class_number: cn })
  });

  if (data) {
    notify(data.message);
    document.getElementById('new-first-name').value = '';
    document.getElementById('new-last-name').value = '';
    document.getElementById('new-pin').value = '';
    document.getElementById('new-class-number').value = '';
    loadStudentManagement();
  }
}

async function addBulkStudents() {
  const text = document.getElementById('bulk-students').value.trim();
  if (!text) return notify('Liste vide !', true);

  const lines = text.split('\n').filter(l => l.trim());
  const students = lines.map(l => {
    const parts = l.trim().split(/\s+/);
    return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
  }).filter(s => s.first_name && s.last_name);

  if (students.length === 0) return notify('Format invalide !', true);

  const data = await apiCall('/api/students/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students })
  });

  if (data) {
    notify(data.message);
    document.getElementById('bulk-students').value = '';
    loadStudentManagement();
  }
}

function bulkDeleteStudents() {
  if (selectedDeleteStudents.size === 0) return notify('Aucun eleve selectionne !', true);

  showConfirm('Supprimer ?', `Supprimer ${selectedDeleteStudents.size} eleve(s) ? Cette action est irreversible.`, async () => {
    const data = await apiCall('/api/students/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_ids: [...selectedDeleteStudents] })
    });
    if (data) {
      notify(data.message);
      selectedDeleteStudents.clear();
      loadStudentManagement();
    }
  });
}

async function resetStudentPin(id, name) {
  showConfirm('Reset PIN ?', `Reinitialiser le PIN de ${name} a 0000 ?`, async () => {
    const data = await apiCall(`/api/students/${id}/pin/reset`, { method: 'PUT' });
    if (data) {
      notify(data.message);
      loadStudentManagement();
    }
  });
}

// ========== BELT MANAGEMENT ==========

async function loadBeltManagement() {
  const select = document.getElementById('belt-student-select');
  select.innerHTML = '<option value="">Choisir un eleve...</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');
}

async function loadStudentBeltsTeacher() {
  const studentId = document.getElementById('belt-student-select').value;
  if (!studentId) {
    document.getElementById('belt-management-grid').innerHTML = '';
    return;
  }

  const belts = await apiCall(`/api/students/${studentId}/belts`);
  if (belts) {
    renderBeltsGrid('belt-management-grid', belts, true);
  }
}

async function upgradeBelt(studentId, subjectId) {
  const data = await apiCall(`/api/students/${studentId}/belts/${subjectId}`, { method: 'PUT' });
  if (data) {
    notify(data.message);
    loadStudentBeltsTeacher();
  }
}

async function downgradeBelt(studentId, subjectId) {
  showConfirm('Descendre ?', 'Descendre cette ceinture d\'un niveau ?', async () => {
    const data = await apiCall(`/api/students/${studentId}/belts/${subjectId}/down`, { method: 'PUT' });
    if (data) {
      notify(data.message);
      loadStudentBeltsTeacher();
    }
  });
}

// ========== JOBS ==========

async function loadJobManagement() {
  const [jobs, current] = await Promise.all([
    apiCall('/api/jobs'),
    apiCall('/api/jobs/current')
  ]);
  if (!jobs) return;

  const assignments = current || [];

  document.getElementById('jobs-management').innerHTML = jobs.map(job => {
    const assigned = assignments.find(a => a.job_id === job.id);
    return `
      <div class="job-card">
        <div class="job-header">
          <span class="job-icon-lg">${job.icon}</span>
          <span class="job-title">${job.name}</span>
        </div>
        <div class="job-pay-info">+${job.weekly_pay} cc/semaine</div>
        <select class="pixel-select" id="job-assign-${job.id}" onchange="assignJob('${job.id}')">
          <option value="">-- Non attribue --</option>
          ${allStudents.map(s =>
            `<option value="${s.id}" ${assigned && assigned.student_id === s.id ? 'selected' : ''}>${s.first_name} ${s.last_name}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }).join('');
}

async function assignJob(jobId) {
  // Collect all current assignments
  const jobs = await apiCall('/api/jobs');
  if (!jobs) return;

  const assignments = [];
  for (const job of jobs) {
    const select = document.getElementById(`job-assign-${job.id}`);
    if (select && select.value) {
      assignments.push({ student_id: select.value, job_id: job.id });
    }
  }

  const data = await apiCall('/api/jobs/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignments })
  });

  if (data) notify(data.message);
}

async function payJobs() {
  showConfirm('Payer les salaires ?', 'Verser les salaires de la semaine a tous les employes ?', async () => {
    const data = await apiCall('/api/jobs/pay', { method: 'POST' });
    if (data) {
      notify(data.message);
      await loadStudentsAdmin();
    }
  });
}

// ========== MARKET ==========

async function loadMarketManagement() {
  // Populate seller select
  const seller = document.getElementById('market-seller');
  seller.innerHTML = '<option value="">Objet de la classe</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');

  const items = await apiCall('/api/market');
  const list = document.getElementById('market-items-list');
  if (!items || items.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">Aucun article en vente</p>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="market-item-card">
      <div class="market-item-name">${item.name}</div>
      <div class="market-item-seller">${item.seller_name ? 'Par ' + item.seller_name : 'Objet de la classe'}</div>
      <div class="market-item-price">${item.price} cc</div>
      ${item.description ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${item.description}</div>` : ''}
    </div>
  `).join('');
}

async function addMarketItem() {
  const seller = document.getElementById('market-seller').value;
  const name = document.getElementById('market-item-name').value.trim();
  const desc = document.getElementById('market-item-desc').value.trim();
  const price = parseInt(document.getElementById('market-item-price').value);

  if (!name || !price) return notify('Nom et prix requis !', true);

  const data = await apiCall('/api/market/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seller_id: seller || null, name, description: desc, price })
  });

  if (data) {
    notify(data.message);
    document.getElementById('market-item-name').value = '';
    document.getElementById('market-item-desc').value = '';
    document.getElementById('market-item-price').value = '';
    loadMarketManagement();
  }
}

// ========== GLOBAL HISTORY ==========

async function loadGlobalHistory() {
  const txns = await apiCall('/api/transactions/all');
  const list = document.getElementById('global-transaction-list');
  if (!txns || txns.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">Aucune transaction</p>';
    return;
  }

  list.innerHTML = txns.map(t => `
    <div class="transaction-item ${t.is_reversed ? 'reversed' : 'clickable'}"
         ${!t.is_reversed ? `onclick="reverseTransaction('${t.id}', '${(t.reason||'').replace(/'/g,"\\'")}', ${t.amount})"` : ''}>
      <span style="min-width:90px;font-weight:600;">${t.first_name} ${t.last_name}</span>
      <span class="transaction-reason">${t.reason || t.type}</span>
      <span class="transaction-amount ${['earn','market_sell','refund'].includes(t.type) ? 'positive' : 'negative'}">
        ${['earn','market_sell','refund'].includes(t.type) ? '+' : '-'}${t.amount}
      </span>
      <span class="transaction-by">${t.created_by}</span>
      <span class="transaction-date">${formatDate(t.created_at)}</span>
    </div>
  `).join('');
}

async function reverseTransaction(txnId, reason, amount) {
  showConfirm('Annuler cette transaction ?', `Annuler "${reason}" (${amount} cc) ?`, async () => {
    const data = await apiCall(`/api/transactions/${txnId}/reverse`, { method: 'POST' });
    if (data) {
      notify(data.message);
      await loadStudentsAdmin();
      loadGlobalHistory();
    }
  });
}

// ========== CONFIG ==========

function loadConfigSection() {
  document.getElementById('config-school-name').value = appConfig.school_name || '';
  document.getElementById('config-teacher-name').value = appConfig.teacher_name || '';
  document.getElementById('config-class-name').value = appConfig.class_name || '';
  document.getElementById('config-school-year').value = appConfig.school_year || '';
}

async function saveConfig() {
  const configs = [
    ['school_name', document.getElementById('config-school-name').value],
    ['teacher_name', document.getElementById('config-teacher-name').value],
    ['class_name', document.getElementById('config-class-name').value],
    ['school_year', document.getElementById('config-school-year').value]
  ];

  for (const [key, value] of configs) {
    if (value) {
      await apiCall('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    }
  }

  notify('Configuration sauvegardee !');
  await loadConfig();
}

async function changeTeacherPin() {
  const oldPin = document.getElementById('config-old-pin').value;
  const newPin = document.getElementById('config-new-pin').value;

  if (!oldPin || !newPin) return notify('Remplis les deux champs !', true);

  const data = await apiCall('/api/teacher/pin', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_pin: oldPin, new_pin: newPin })
  });

  if (data) {
    notify(data.message);
    document.getElementById('config-old-pin').value = '';
    document.getElementById('config-new-pin').value = '';
  }
}

async function backupData() {
  showLoading();
  const data = await apiCall('/api/backup');
  hideLoading();
  if (data) notify(data.message);
}

async function exportData() {
  const data = await apiCall('/api/export');
  if (!data) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cool-school-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  notify('Export telecharge !');
}

// ==================== CLASSROOM BACKGROUND ====================

function drawClassroomBg(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const container = canvas.parentElement;
  canvas.width = container.clientWidth || window.innerWidth;
  canvas.height = container.clientHeight || window.innerHeight;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Wall gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
  wallGrad.addColorStop(0, '#1a1a3e');
  wallGrad.addColorStop(0.5, '#151530');
  wallGrad.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, h);

  // Floor with perspective
  const floorY = h * 0.55;
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
  floorGrad.addColorStop(0, '#2a2010');
  floorGrad.addColorStop(0.5, '#1e180c');
  floorGrad.addColorStop(1, '#141008');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, w, h - floorY);

  // Floor lines (wood planks)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let y = floorY; y < h; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Wall baseboard
  ctx.fillStyle = '#3a2a10';
  ctx.fillRect(0, floorY - 4, w, 8);

  // Windows (left and right)
  const winW = w * 0.08;
  const winH = h * 0.2;
  const winY = h * 0.08;
  for (const wx of [w * 0.03, w * 0.89]) {
    // Window frame
    ctx.fillStyle = '#5a4520';
    ctx.fillRect(wx - 3, winY - 3, winW + 6, winH + 6);
    // Window pane
    const skyGrad = ctx.createLinearGradient(0, winY, 0, winY + winH);
    skyGrad.addColorStop(0, '#1a2a5a');
    skyGrad.addColorStop(1, '#2a4a7a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(wx, winY, winW, winH);
    // Stars in window
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 3; i++) {
      const sx = wx + 5 + (i * winW / 3.5);
      const sy = winY + 8 + (i * 15 % winH * 0.6);
      ctx.fillRect(sx, sy, 2, 2);
    }
    // Window cross
    ctx.fillStyle = '#5a4520';
    ctx.fillRect(wx + winW/2 - 1, winY, 3, winH);
    ctx.fillRect(wx, winY + winH/2 - 1, winW, 3);
  }

  // Ceiling light
  ctx.fillStyle = '#3a3a2a';
  ctx.fillRect(w/2 - 40, 0, 80, 8);
  ctx.fillStyle = '#2a2a1a';
  ctx.fillRect(w/2 - 2, 8, 4, 15);
  // Light bulb glow
  const glowGrad = ctx.createRadialGradient(w/2, 28, 5, w/2, 28, 120);
  glowGrad.addColorStop(0, 'rgba(255,240,180,0.15)');
  glowGrad.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(w/2 - 120, 0, 240, 200);
  // Bulb
  ctx.fillStyle = 'rgba(255,240,180,0.4)';
  ctx.beginPath();
  ctx.arc(w/2, 28, 6, 0, Math.PI * 2);
  ctx.fill();

  // Clock on wall
  const clockX = w * 0.82;
  const clockY = h * 0.12;
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath();
  ctx.arc(clockX, clockY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Clock hands
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX, clockY - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + 8, clockY + 3);
  ctx.stroke();

  // Poster on wall
  ctx.fillStyle = '#e8d8a8';
  ctx.fillRect(w * 0.14, h * 0.06, w * 0.06, h * 0.1);
  ctx.fillStyle = '#c8b888';
  ctx.fillRect(w * 0.14 + 4, h * 0.06 + 4, w * 0.06 - 8, h * 0.1 - 8);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.font = '6px sans-serif';
  ctx.fillText('ABC', w * 0.14 + 10, h * 0.06 + 20);
}

// ==================== CLASSROOM STUDENTS ON LOGIN ====================

// Shuffle array randomly (Fisher-Yates)
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function renderClassroomStudents() {
  let students = [];
  try {
    const res = await fetch('/api/students');
    students = await res.json();
  } catch(e) {}

  const grid = document.getElementById('classroom-students-grid');
  if (!grid) return;

  if (students.length === 0) {
    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      grid.innerHTML += `
        <div class="classroom-row" style="display:inline-flex;">
          <div class="classroom-seat empty">
            <div class="seat-avatar"></div>
            <div class="seat-desk"></div>
          </div>
        </div>`;
    }
    return;
  }

  // Melanger les places aleatoirement a chaque chargement !
  students = shuffleArray(students);

  // Arrange students in rows with smart distribution
  const maxPerRow = 8;
  const numRows = Math.ceil(students.length / maxPerRow);
  const basePerRow = Math.floor(students.length / numRows);
  const extra = students.length % numRows;

  const rows = [];
  let idx = 0;
  for (let r = 0; r < numRows; r++) {
    const rowSize = basePerRow + (r < extra ? 1 : 0);
    rows.push(students.slice(idx, idx + rowSize));
    idx += rowSize;
  }
  // Reverse so back rows (smaller) render first at top
  rows.reverse();

  let html = '';
  const totalRows = rows.length;
  rows.forEach((row, ri) => {
    const distFromFront = totalRows - 1 - ri;
    const scale = 1 - distFromFront * 0.12;
    const opacity = 1 - distFromFront * 0.1;
    html += `<div class="classroom-row" style="transform:scale(${scale}); opacity:${opacity};">`;
    row.forEach(s => {
      const numBadge = s.class_number ? `<span class="seat-number">${s.class_number}</span>` : '';
      html += `
        <div class="classroom-seat">
          ${numBadge}
          <div class="seat-avatar" id="seat-av-${s.id}"></div>
          <div class="seat-desk"></div>
          <div class="seat-name">${s.first_name}</div>
        </div>`;
    });
    html += '</div>';
  });

  grid.innerHTML = html;

  // Draw avatars
  setTimeout(() => {
    students.forEach(s => {
      const container = document.getElementById(`seat-av-${s.id}`);
      if (container) drawMiniAvatar(container, safeParseJSON(s.avatar_config), 48);
    });
  }, 100);
}

// Draw login background & students
setTimeout(() => {
  drawClassroomBg('login-classroom-bg');
  renderClassroomStudents();
}, 100);

window.addEventListener('resize', () => {
  drawClassroomBg('login-classroom-bg');
  drawClassroomBg('classroom-bg');
});
