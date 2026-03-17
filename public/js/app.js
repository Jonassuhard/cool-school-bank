// ========== COOL SCHOOL BANK - APP ==========

let currentStudent = null;
let isTeacher = false;
let isBanker = false;
let allStudents = [];
let currentPin = '';
let teacherPin = '';
let bankerPin = '';
let selectedStudentId = null;
let selectedManageStudents = new Set();
let selectedDeleteStudents = new Set();
let selectedBankerStudent = null;
let currentShopCategory = null;
let currentAvatarConfig = { ...DEFAULT_AVATAR };

// ==================== INIT ====================

async function loadStudents() {
  const res = await fetch('/api/students');
  allStudents = await res.json();
  return allStudents;
}

async function loadStudentsAdmin() {
  const res = await fetch('/api/students/admin');
  allStudents = await res.json();
  return allStudents;
}

// ==================== LOGIN ====================

async function showStudentLogin() {
  await loadStudents();
  const modal = document.getElementById('student-login-modal');
  const list = document.getElementById('student-list');
  const pinEntry = document.getElementById('pin-entry');

  pinEntry.classList.add('hidden');
  selectedStudentId = null;
  currentPin = '';
  updatePinDots('student-pin-display', 4, currentPin);

  if (allStudents.length === 0) {
    list.innerHTML = '<p style="font-size:8px; color: var(--text-muted); grid-column: 1/-1;">Pas encore d\'élèves ! Le prof doit d\'abord vous ajouter.</p>';
  } else {
    list.innerHTML = allStudents.map(s => {
      const config = safeParseJSON(s.avatar_config);
      return `
        <div class="student-card-login" onclick="selectStudent('${s.id}')">
          <div class="mini-avatar-login" id="login-avatar-${s.id}"></div>
          <div>${s.first_name}</div>
          <div class="profile-peek-btn" onclick="event.stopPropagation(); showStudentProfile('${s.id}')">👁️</div>
        </div>
      `;
    }).join('');

    setTimeout(() => {
      allStudents.forEach(s => {
        const container = document.getElementById(`login-avatar-${s.id}`);
        if (container) drawMiniAvatar(container, safeParseJSON(s.avatar_config), 48);
      });
    }, 50);
  }

  modal.classList.remove('hidden');
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
  try {
    const res = await fetch('/api/students/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedStudentId, pin_code: currentPin })
    });
    if (res.ok) {
      currentStudent = await res.json();
      isTeacher = false;
      isBanker = false;
      closeModal('student-login-modal');
      enterStudentScreen();
    } else {
      notify('Code PIN incorrect !', true);
      clearPin();
    }
  } catch (e) {
    notify('Erreur de connexion', true);
  }
}

// ---- BANKER LOGIN ----
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
  try {
    const res = await fetch('/api/banker/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: bankerPin })
    });
    if (res.ok) {
      currentStudent = await res.json();
      isBanker = true;
      isTeacher = false;
      closeModal('banker-login-modal');
      enterBankerScreen();
    } else {
      notify('Code banquier incorrect !', true);
      clearBankerPin();
    }
  } catch (e) {
    notify('Erreur de connexion', true);
  }
}

// ---- TEACHER LOGIN ----
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
  try {
    const res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: teacherPin })
    });
    if (res.ok) {
      isTeacher = true;
      isBanker = false;
      currentStudent = null;
      closeModal('teacher-login-modal');
      enterTeacherScreen();
    } else {
      notify('Code incorrect !', true);
      clearTeacherPin();
    }
  } catch (e) {
    notify('Erreur de connexion', true);
  }
}

function updatePinDots(containerId, total, pin) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const dots = container.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < pin.length);
  });
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function logout() {
  currentStudent = null;
  isTeacher = false;
  isBanker = false;
  showScreen('login-screen');
  clearAvatarCache();
  drawLoginClassroom();
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// ==================== CLASSROOM BACKGROUND ====================

// Cache: store rendered avatar canvases to avoid re-rendering
let avatarCache = {};

function getCachedAvatar(studentId, config, size) {
  const key = studentId + '_' + size + '_' + JSON.stringify(config);
  if (avatarCache[key]) return avatarCache[key];

  const container = document.createElement('div');
  drawAvatar(container, config, size);
  const canvas = container.querySelector('canvas');
  if (canvas) avatarCache[key] = canvas;
  return canvas;
}

function clearAvatarCache() {
  avatarCache = {};
}

function drawClassroomOnCanvas(canvas, students, darkenAmount) {
  if (!canvas) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const ps = 4;

  // Floor
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.fillStyle = '#4a3728';
  for (let y = h * 0.55; y < h; y += ps * 8) {
    for (let x = 0; x < w; x += ps * 20) {
      ctx.fillRect(x, y, ps * 19, ps * 7);
    }
  }

  // Back wall
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(0, 0, w, h * 0.55);
  // Wainscoting
  ctx.fillStyle = '#1e3e1e';
  ctx.fillRect(0, h * 0.45, w, h * 0.1);

  // Blackboard
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(w * 0.2, h * 0.04, w * 0.6, h * 0.22);
  ctx.fillStyle = '#0d2e0d';
  ctx.fillRect(w * 0.21, h * 0.05, w * 0.58, h * 0.20);
  // Board frame
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(w * 0.19, h * 0.04, w * 0.62, ps);
  ctx.fillRect(w * 0.19, h * 0.26, w * 0.62, ps);
  ctx.fillRect(w * 0.19, h * 0.04, ps * 2, h * 0.22);
  ctx.fillRect(w * 0.81, h * 0.04, ps * 2, h * 0.22);

  // Chalk tray
  ctx.fillStyle = '#6B4F12';
  ctx.fillRect(w * 0.25, h * 0.26, w * 0.5, ps * 3);

  // Windows (left + right)
  for (const wx of [w * 0.02, w * 0.86]) {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(wx, h * 0.04, w * 0.12, h * 0.2);
    ctx.fillStyle = '#5DADE2';
    ctx.fillRect(wx, h * 0.04, w * 0.12, h * 0.1);
    // Window frame
    ctx.fillStyle = '#8B4513';
    const frameW = ps * 2;
    ctx.fillRect(wx, h * 0.04, w * 0.12, frameW); // top
    ctx.fillRect(wx, h * 0.24 - frameW, w * 0.12, frameW); // bottom
    ctx.fillRect(wx, h * 0.04, frameW, h * 0.2); // left
    ctx.fillRect(wx + w * 0.12 - frameW, h * 0.04, frameW, h * 0.2); // right
    ctx.fillRect(wx + w * 0.06, h * 0.04, frameW, h * 0.2); // middle v
    ctx.fillRect(wx, h * 0.14, w * 0.12, frameW); // middle h
  }

  // Clock on wall
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.32, ps * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.32, ps * 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(w * 0.5 - 1, h * 0.32 - ps * 2, 2, ps * 2);
  ctx.fillRect(w * 0.5, h * 0.32 - 1, ps * 2, 2);

  // 30 desks: 5 rows x 6 cols (pushed down to leave top visible)
  const rows = 5;
  const cols = 6;
  const deskW = ps * 14;
  const deskH = ps * 5;
  const startX = w * 0.08;
  const startY = h * 0.40;
  const gapX = (w * 0.84) / cols;
  const gapY = (h * 0.55) / rows;

  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const dx = startX + c * gapX + (gapX - deskW) / 2;
      const dy = startY + r * gapY;

      const avatarSize = ps * 8;
      const avatarX = dx + (deskW - avatarSize) / 2;
      const avatarY = dy - ps * 2;

      // Draw student avatar if exists (BEHIND the desk)
      if (idx < students.length) {
        const student = students[idx];
        const avatarConfig = safeParseJSON(student.avatar_config);

        try {
          const cached = getCachedAvatar(student.id, avatarConfig, 32);
          if (cached) {
            ctx.drawImage(cached, avatarX, avatarY, avatarSize, avatarSize);
          }
        } catch (e) {
          ctx.fillStyle = avatarConfig.skinColor || '#FFD5B0';
          ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        }

        // Name tag under chair
        ctx.fillStyle = '#FFD700';
        ctx.font = `${Math.max(6, ps * 1.5)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(student.first_name.substring(0, 6), dx + deskW / 2, dy + ps * 18);
      }

      // Desk (in front of avatar)
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(dx, dy + ps * 6, deskW, deskH);
      ctx.fillStyle = '#A07B1A';
      ctx.fillRect(dx, dy + ps * 6, deskW, ps); // top edge highlight
      ctx.fillStyle = '#6B4F12';
      ctx.fillRect(dx, dy + ps * 6 + deskH - ps, deskW, ps); // bottom shadow
      // Desk legs
      ctx.fillStyle = '#5A3E10';
      ctx.fillRect(dx + ps, dy + ps * 11, ps * 2, ps * 3);
      ctx.fillRect(dx + deskW - ps * 3, dy + ps * 11, ps * 2, ps * 3);

      // Chair
      ctx.fillStyle = '#654321';
      ctx.fillRect(dx + ps * 4, dy + ps * 14, ps * 6, ps * 2);
      ctx.fillStyle = '#7B5427';
      ctx.fillRect(dx + ps * 4, dy + ps * 14, ps * 6, ps); // highlight
    }
  }

  // Teacher desk at front
  ctx.fillStyle = '#6B4F12';
  ctx.fillRect(w * 0.35, h * 0.28, w * 0.3, ps * 6);
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(w * 0.35, h * 0.28, w * 0.3, ps * 2);

  // Darken overlay
  ctx.fillStyle = `rgba(26, 26, 46, ${darkenAmount})`;
  ctx.fillRect(0, 0, w, h);
}

async function drawClassroomBackground() {
  await loadStudents();
  drawClassroomOnCanvas(document.getElementById('classroom-bg'), allStudents, 0.55);
}

async function drawLoginClassroom() {
  await loadStudents();
  drawClassroomOnCanvas(document.getElementById('login-classroom-bg'), allStudents, 0.3);
}

// Draw login classroom on page load
document.addEventListener('DOMContentLoaded', () => {
  drawLoginClassroom();
});

// ==================== STUDENT SCREEN ====================

async function enterStudentScreen() {
  showScreen('student-screen');

  document.getElementById('nav-name').textContent = currentStudent.first_name;
  updateBalance();

  const avatarConfig = safeParseJSON(currentStudent.avatar_config);
  currentAvatarConfig = { ...DEFAULT_AVATAR, ...avatarConfig };
  drawMiniAvatar(document.getElementById('nav-avatar'), currentAvatarConfig, 40);

  // Draw classroom background with all avatars
  drawClassroomBackground();

  showTab('dashboard');
  await loadDashboard();
}

async function updateBalance() {
  const res = await fetch(`/api/students/${currentStudent.id}`);
  const data = await res.json();
  currentStudent.balance = data.balance;

  const balanceEl = document.getElementById('nav-balance');
  balanceEl.textContent = data.balance.toLocaleString();
  balanceEl.classList.toggle('negative', data.balance < 0);
}

async function loadDashboard() {
  await updateBalance();

  renderCoolBreakdown('cool-breakdown', currentStudent.balance);

  const statusEl = document.getElementById('balance-status');
  if (currentStudent.balance < 0) {
    statusEl.className = 'balance-status danger';
    statusEl.innerHTML = currentStudent.balance < -500
      ? '🚨 ALERTE ! Tu es très endetté ! Tours de cour à la récré...'
      : '⚠️ Solde négatif ! Pas de marché ni de jeux...';
  } else if (currentStudent.balance < 100) {
    statusEl.className = 'balance-status warning';
    statusEl.textContent = '💡 Continue de bien travailler pour gagner des COOL !';
  } else {
    statusEl.className = 'balance-status ok';
    statusEl.textContent = '✅ Super ! Tu as un bon solde !';
  }

  const dashAvatar = document.getElementById('dashboard-avatar');
  stopAvatarAnimation(dashAvatar);
  drawAnimatedAvatar(dashAvatar, currentAvatarConfig, 120);

  const txRes = await fetch(`/api/students/${currentStudent.id}/transactions?limit=5`);
  const txData = await txRes.json();
  const transactions = txData.transactions || txData;
  const recentEl = document.getElementById('recent-transactions');
  recentEl.innerHTML = transactions.map(tx => renderTransactionItem(tx)).join('')
    || '<p style="font-size:8px; color: var(--text-muted)">Pas encore d\'activité</p>';

  const jobRes = await fetch('/api/jobs/current');
  const jobs = await jobRes.json();
  const myJob = jobs.find(j => j.student_id === currentStudent.id);
  const jobEl = document.getElementById('my-job');
  if (myJob) {
    jobEl.innerHTML = `
      <div class="job-display">
        <span class="job-icon">${myJob.job_icon}</span>
        <div>
          <div class="job-name">${myJob.job_name}</div>
          <div class="job-pay">+${myJob.weekly_pay} centicools/semaine</div>
        </div>
      </div>
    `;
  } else {
    jobEl.textContent = 'Pas de métier cette semaine';
  }
}

function renderTransactionItem(tx) {
  const isPositive = tx.type === 'earn' || tx.type === 'market_sell';
  const sign = isPositive ? '+' : '-';
  const date = new Date(tx.created_at).toLocaleDateString('fr-FR');
  const time = new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const byLabel = tx.created_by === 'teacher' ? '👨‍🏫 Prof' :
                  tx.created_by === 'system' ? '⚙️ Auto' :
                  tx.created_by === 'shop' ? '🛍️ Boutique' :
                  tx.created_by === 'market' ? '🏪 Marché' :
                  tx.created_by ? `🏦 ${tx.created_by}` : '';
  return `
    <div class="transaction-item">
      <span class="transaction-reason">${tx.reason || tx.type}</span>
      <span class="transaction-amount ${isPositive ? 'positive' : 'negative'}">${sign}${tx.amount}</span>
      <span class="transaction-by">${byLabel}</span>
      <span class="transaction-date">${date} ${time}</span>
    </div>
  `;
}

// ==================== TABS ====================

function showTab(tabName) {
  document.querySelectorAll('#student-screen .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#student-screen .tab-content').forEach(t => t.classList.remove('active'));

  document.querySelector(`#student-screen .tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');

  switch(tabName) {
    case 'dashboard': loadDashboard(); break;
    case 'avatar': loadAvatarEditor(); break;
    case 'belts': loadBelts(); break;
    case 'shop': loadShop(); break;
    case 'market': loadStudentMarket(); break;
    case 'auctions': loadStudentAuctions(); break;
    case 'leaderboard': loadStudentLeaderboard(); break;
    case 'history': loadHistory(); break;
  }
}

function showTeacherTab(tabName) {
  document.querySelectorAll('#teacher-screen .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#teacher-screen .tab-content').forEach(t => t.classList.remove('active'));

  document.querySelector(`#teacher-screen .tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');

  switch(tabName) {
    case 't-dashboard': loadTeacherDashboard(); break;
    case 't-manage': loadManageCool(); break;
    case 't-students': loadStudentManagement(); break;
    case 't-belts': loadBeltManagement(); break;
    case 't-jobs': loadJobManagement(); break;
    case 't-market': loadMarketManagement(); break;
    case 't-fines': loadFinesManagement(); break;
    case 't-auctions': loadAuctionManagement(); break;
    case 't-leaderboard': loadLeaderboard(); break;
    case 't-history': loadGlobalHistory(); break;
  }
}

// ==================== AVATAR EDITOR ====================

async function loadAvatarEditor() {
  const purchasesRes = await fetch(`/api/students/${currentStudent.id}/purchases`);
  const purchases = await purchasesRes.json();

  const skinContainer = document.getElementById('skin-colors');
  skinContainer.innerHTML = SKIN_COLORS.map(c => `
    <div class="color-swatch ${currentAvatarConfig.skinColor === c ? 'selected' : ''}"
         style="background: ${c}"
         onclick="setAvatarOption('skinColor', '${c}')"></div>
  `).join('');

  const hairColorContainer = document.getElementById('hair-colors');
  hairColorContainer.innerHTML = HAIR_COLORS.map(c => `
    <div class="color-swatch ${currentAvatarConfig.hairColor === c ? 'selected' : ''}"
         style="background: ${c}"
         onclick="setAvatarOption('hairColor', '${c}')"></div>
  `).join('');

  const eyeContainer = document.getElementById('eye-options');
  eyeContainer.innerHTML = EYE_STYLES.map((e, i) => `
    <div class="pixel-option ${currentAvatarConfig.eyeStyle === i ? 'selected' : ''}"
         onclick="setAvatarOption('eyeStyle', ${i})">${e.emoji}</div>
  `).join('');

  const mouthContainer = document.getElementById('mouth-options');
  mouthContainer.innerHTML = MOUTH_STYLES.map((m, i) => `
    <div class="pixel-option ${currentAvatarConfig.mouthStyle === i ? 'selected' : ''}"
         onclick="setAvatarOption('mouthStyle', ${i})">${m.emoji}</div>
  `).join('');

  const hairContainer = document.getElementById('hair-options');
  hairContainer.innerHTML = HAIR_STYLES.map((h, i) => `
    <div class="pixel-option ${currentAvatarConfig.hairStyle === i ? 'selected' : ''}"
         onclick="setAvatarOption('hairStyle', ${i})">${h.emoji}</div>
  `).join('');

  const ownedContainer = document.getElementById('owned-items-list');
  if (purchases.length > 0) {
    ownedContainer.innerHTML = purchases.map(p => {
      const data = safeParseJSON(p.item_data);
      let equipped = false;
      if (p.item_type === 'avatar_skin' && currentAvatarConfig.skinOverride === data.color) equipped = true;
      if (p.item_type === 'avatar_hat' && currentAvatarConfig.hat === data.type) equipped = true;
      if (p.item_type === 'avatar_accessory' && currentAvatarConfig.accessory === data.type) equipped = true;
      if (p.item_type === 'avatar_background' && currentAvatarConfig.background === data.type) equipped = true;

      return `
        <div class="owned-item ${equipped ? 'equipped' : ''}"
             data-item-type="${p.item_type}"
             data-item-data="${encodeURIComponent(JSON.stringify(data))}"
             onclick="equipItemFromEl(this)">
          ${equipped ? '✅' : '⬜'} ${p.name}
        </div>
      `;
    }).join('');
  } else {
    ownedContainer.innerHTML = '<p style="font-size:7px; color: var(--text-muted)">Achète des items dans la boutique !</p>';
  }

  drawAvatar(document.getElementById('avatar-canvas'), currentAvatarConfig, 200);
}

function setAvatarOption(key, value) {
  currentAvatarConfig[key] = value;
  drawAvatar(document.getElementById('avatar-canvas'), currentAvatarConfig, 200);
  loadAvatarEditor();
}

function equipItemFromEl(el) {
  const itemType = el.getAttribute('data-item-type');
  const dataStr = decodeURIComponent(el.getAttribute('data-item-data'));
  equipItem(itemType, dataStr);
}

function equipItem(itemType, dataStr) {
  const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
  switch(itemType) {
    case 'avatar_skin':
      currentAvatarConfig.skinOverride = currentAvatarConfig.skinOverride === data.color ? null : data.color;
      break;
    case 'avatar_hat':
      currentAvatarConfig.hat = currentAvatarConfig.hat === data.type ? null : data.type;
      break;
    case 'avatar_accessory':
      currentAvatarConfig.accessory = currentAvatarConfig.accessory === data.type ? null : data.type;
      break;
    case 'avatar_background':
      currentAvatarConfig.background = currentAvatarConfig.background === data.type ? null : data.type;
      break;
  }
  drawAvatar(document.getElementById('avatar-canvas'), currentAvatarConfig, 200);
  loadAvatarEditor();
}

async function saveAvatar() {
  try {
    await fetch(`/api/students/${currentStudent.id}/avatar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_config: currentAvatarConfig })
    });
    currentStudent.avatar_config = JSON.stringify(currentAvatarConfig);
    drawMiniAvatar(document.getElementById('nav-avatar'), currentAvatarConfig, 40);
    clearAvatarCache();
    drawClassroomBackground();
    notify('Avatar sauvegardé !');
  } catch (e) {
    notify('Erreur de sauvegarde', true);
  }
}

// ==================== BELTS ====================

async function loadBelts() {
  const res = await fetch(`/api/students/${currentStudent.id}/belts`);
  const belts = await res.json();
  const colorsRes = await fetch('/api/belts/colors');
  const allColors = await colorsRes.json();

  const grid = document.getElementById('belts-grid');
  grid.innerHTML = belts.map(b => {
    const progressDots = allColors.map(c => `
      <div class="belt-dot ${c.rank <= b.rank ? 'achieved' : ''}" style="background: ${c.color_hex}"></div>
    `).join('');
    const isDoree = b.belt_name === 'Dorée';
    const subLevel = b.sub_level || 0;
    return `
      <div class="belt-card ${isDoree ? 'belt-doree' : ''}" style="border-color: ${b.color_hex}">
        <div class="subject-icon">${b.subject_icon}</div>
        <div class="subject-name">${b.subject_name}</div>
        <div class="belt-indicator" style="background: ${b.color_hex}"></div>
        <div class="belt-name" style="color: ${b.color_hex}">Ceinture ${b.belt_name}</div>
        ${subLevel > 0 ? `<div class="belt-sublevel">Palier ${subLevel}</div>` : ''}
        <div class="belt-progress">${progressDots}</div>
      </div>
    `;
  }).join('');
}

// ==================== SHOP ====================

async function loadShop() {
  const shopRes = await fetch('/api/shop');
  const { categories, items } = await shopRes.json();
  const purchasesRes = await fetch(`/api/students/${currentStudent.id}/purchases`);
  const purchases = await purchasesRes.json();
  const ownedIds = new Set(purchases.map(p => p.item_id));

  const catContainer = document.getElementById('shop-categories');
  catContainer.innerHTML = `
    <button class="shop-cat-btn ${!currentShopCategory ? 'active' : ''}" onclick="filterShop(null)">Tout</button>
    ${categories.map(c => `
      <button class="shop-cat-btn ${currentShopCategory === c.id ? 'active' : ''}"
              onclick="filterShop('${c.id}')">${c.icon} ${c.name}</button>
    `).join('')}
  `;

  const filteredItems = currentShopCategory ? items.filter(i => i.category_id === currentShopCategory) : items;
  const itemsContainer = document.getElementById('shop-items');
  itemsContainer.innerHTML = filteredItems.map(item => {
    const owned = ownedIds.has(item.id);
    const canAfford = currentStudent.balance >= item.price;
    const tier = item.price >= 1000 ? 'legendary' : item.price >= 500 ? 'epic' : item.price >= 200 ? 'rare' : 'common';
    const typeClass = item.item_type ? `shop-type-${item.item_type.replace('avatar_', '')}` : '';
    return `
      <div class="shop-item ${owned ? 'owned' : ''} shop-tier-${tier} ${typeClass}" data-price="${item.price}" data-type="${item.item_type || ''}">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.description}</div>
        <div class="shop-item-price">💰 ${item.price.toLocaleString()} cc</div>
        ${owned
          ? '<button class="buy-btn" disabled>✅ Déjà acheté</button>'
          : `<button class="buy-btn" ${!canAfford ? 'disabled' : ''} onclick="buyItem('${item.id}')">
              ${canAfford ? '🛒 Acheter' : '🔒 Pas assez'}
            </button>`
        }
      </div>
    `;
  }).join('');
}

function filterShop(categoryId) {
  currentShopCategory = categoryId;
  loadShop();
}

async function buyItem(itemId) {
  try {
    const res = await fetch('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: currentStudent.id, item_id: itemId })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message);
      currentStudent.balance = data.balance;
      document.getElementById('nav-balance').textContent = data.balance.toLocaleString();
      loadShop();
    } else {
      notify(data.error, true);
    }
  } catch (e) {
    notify('Erreur d\'achat', true);
  }
}

// ==================== HISTORY ====================

async function loadHistory() {
  const res = await fetch(`/api/students/${currentStudent.id}/transactions?limit=100`);
  const data = await res.json();
  const transactions = data.transactions || data;
  const container = document.getElementById('transaction-list');
  if (transactions.length === 0) {
    container.innerHTML = '<p style="font-size:8px; color: var(--text-muted)">Pas encore d\'historique</p>';
    return;
  }
  container.innerHTML = transactions.map(tx => renderTransactionItem(tx)).join('');
}

// ==================== BANKER SCREEN ====================

async function enterBankerScreen() {
  showScreen('banker-screen');
  await loadStudents();

  document.getElementById('banker-nav-name').textContent = currentStudent.first_name;
  drawMiniAvatar(document.getElementById('banker-nav-avatar'), safeParseJSON(currentStudent.avatar_config), 40);

  loadBankerStudentList();
  loadBankerHistory();
}

async function loadBankerStudentList() {
  const container = document.getElementById('banker-student-list');
  container.innerHTML = allStudents
    .filter(s => s.id !== currentStudent.id) // Can't modify own account
    .map(s => `
    <div class="banker-student-item ${selectedBankerStudent === s.id ? 'selected' : ''}"
         onclick="selectBankerStudent('${s.id}', '${s.first_name} ${s.last_name}')">
      ${s.first_name} ${s.last_name}
      <span style="margin-left:auto; color:${s.balance < 0 ? 'var(--danger)' : 'var(--secondary)'}">${s.balance} cc</span>
    </div>
  `).join('');
}

function selectBankerStudent(id, name) {
  selectedBankerStudent = id;
  document.getElementById('banker-selected-name').textContent = `Élève : ${name}`;
  loadBankerStudentList();
}

function setBankerAmount(val) {
  document.getElementById('banker-amount').value = val;
}

async function bankerTransaction() {
  if (!selectedBankerStudent) return notify('Choisis un élève !', true);

  const amount = parseInt(document.getElementById('banker-amount').value);
  const type = document.getElementById('banker-type').value;
  const reason = document.getElementById('banker-reason').value;

  if (!amount || amount <= 0) return notify('Entre un montant !', true);

  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selectedBankerStudent,
        amount,
        type,
        reason: reason || (type === 'earn' ? 'Dépôt' : 'Retrait'),
        created_by: currentStudent.first_name
      })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message);
      document.getElementById('banker-amount').value = '';
      document.getElementById('banker-reason').value = '';
      await loadStudents();
      loadBankerStudentList();
      loadBankerHistory();
    } else {
      notify(data.error, true);
    }
  } catch (e) {
    notify('Erreur', true);
  }
}

async function loadBankerHistory() {
  const res = await fetch('/api/transactions/all?limit=30');
  const data = await res.json();
  const transactions = data.transactions || data;
  const container = document.getElementById('banker-history');
  container.innerHTML = transactions.map(tx => {
    const isPositive = tx.type === 'earn' || tx.type === 'market_sell';
    const sign = isPositive ? '+' : '-';
    const date = new Date(tx.created_at).toLocaleDateString('fr-FR');
    const time = new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="transaction-item">
        <span class="transaction-reason">${tx.first_name} - ${tx.reason || tx.type}</span>
        <span class="transaction-amount ${isPositive ? 'positive' : 'negative'}">${sign}${tx.amount}</span>
        <span class="transaction-by">${tx.created_by || ''}</span>
        <span class="transaction-date">${date} ${time}</span>
      </div>
    `;
  }).join('') || '<p style="font-size:8px; color: var(--text-muted)">Aucune transaction</p>';
}

// ==================== TEACHER SCREEN ====================

async function enterTeacherScreen() {
  showScreen('teacher-screen');
  await loadStudentsAdmin();
  showTeacherTab('t-dashboard');
}

async function loadTeacherDashboard() {
  await loadStudentsAdmin();

  const statsRes = await fetch('/api/stats');
  const stats = await statsRes.json();

  const statsContainer = document.getElementById('teacher-stats');
  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Élèves</div>
      <div class="stat-value">${stats.totalStudents}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">COOL en circulation</div>
      <div class="stat-value">${stats.totalCool.toLocaleString()}</div>
    </div>
    <div class="stat-card" style="border-color: ${stats.negativeStudents > 0 ? 'var(--danger)' : 'var(--success)'}">
      <div class="stat-label">Soldes négatifs</div>
      <div class="stat-value" style="color: ${stats.negativeStudents > 0 ? 'var(--danger)' : 'var(--success)'}">${stats.negativeStudents}</div>
    </div>
  `;

  const overviewContainer = document.getElementById('class-overview');
  overviewContainer.innerHTML = allStudents.map(s => `
    <div class="class-student-card ${s.balance < 0 ? 'negative' : ''}" onclick="showStudentProfile('${s.id}')" style="cursor:pointer">
      <div class="class-student-avatar" id="class-avatar-${s.id}"></div>
      <div class="class-student-name">${s.first_name} ${s.last_name}</div>
      <div class="class-student-balance ${s.balance < 0 ? 'negative' : ''}">${s.balance.toLocaleString()} cc</div>
    </div>
  `).join('');

  // Render avatars
  setTimeout(() => {
    allStudents.forEach(s => {
      const container = document.getElementById(`class-avatar-${s.id}`);
      if (container) drawMiniAvatar(container, safeParseJSON(s.avatar_config), 48);
    });
  }, 50);
}

// ==================== MANAGE COOL ====================

async function loadManageCool() {
  await loadStudentsAdmin();
  const container = document.getElementById('manage-student-list');
  container.innerHTML = allStudents.map(s => `
    <label class="manage-student-item ${selectedManageStudents.has(s.id) ? 'selected' : ''}"
           onclick="toggleManageStudent('${s.id}')">
      <input type="checkbox" ${selectedManageStudents.has(s.id) ? 'checked' : ''}>
      ${s.first_name} ${s.last_name}
      <span style="margin-left: auto; color: ${s.balance < 0 ? 'var(--danger)' : 'var(--secondary)'}">${s.balance} cc</span>
    </label>
  `).join('');
}

function toggleManageStudent(id) {
  if (selectedManageStudents.has(id)) selectedManageStudents.delete(id);
  else selectedManageStudents.add(id);
  loadManageCool();
}

function selectAllStudents() {
  allStudents.forEach(s => selectedManageStudents.add(s.id));
  loadManageCool();
}

function deselectAllStudents() {
  selectedManageStudents.clear();
  loadManageCool();
}

function setAmount(val) {
  document.getElementById('cool-amount').value = val;
}

async function distributeCoool() {
  const amount = parseInt(document.getElementById('cool-amount').value);
  const type = document.getElementById('cool-type').value;
  const reason = document.getElementById('cool-reason').value;

  if (!amount || amount <= 0) return notify('Entre un montant !', true);
  if (selectedManageStudents.size === 0) return notify('Sélectionne des élèves !', true);

  try {
    const res = await fetch('/api/transactions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_ids: Array.from(selectedManageStudents),
        amount,
        type,
        reason: reason || (type === 'earn' ? 'Bon travail' : 'Gêneur'),
        created_by: 'teacher'
      })
    });
    const data = await res.json();
    notify(data.message);
    document.getElementById('cool-amount').value = '';
    document.getElementById('cool-reason').value = '';
    loadManageCool();
  } catch (e) {
    notify('Erreur', true);
  }
}

// ==================== STUDENT MANAGEMENT ====================

async function loadStudentManagement() {
  await loadStudentsAdmin();
  selectedDeleteStudents.clear();

  const container = document.getElementById('student-management-list');
  container.innerHTML = allStudents.map(s => `
    <div class="student-manage-card">
      <input type="checkbox" onchange="toggleDeleteStudent('${s.id}', this.checked)">
      <div class="student-info">${s.first_name} ${s.last_name}</div>
      <div class="student-balance" style="color: ${s.balance < 0 ? 'var(--danger)' : 'var(--secondary)'}">${s.balance.toLocaleString()} cc</div>
      <div class="student-pin-info">PIN: ${s.pin_code || '0000'}</div>
      ${s.banker_code ? `<div class="banker-code-info">🏦 Code banquier: ${s.banker_code}</div>` : ''}
      <button class="delete-btn" onclick="deleteStudent('${s.id}', '${s.first_name}')">Supprimer</button>
    </div>
  `).join('');
}

function toggleDeleteStudent(id, checked) {
  if (checked) selectedDeleteStudents.add(id);
  else selectedDeleteStudents.delete(id);
}

function selectAllManageStudents() {
  const checkboxes = document.querySelectorAll('#student-management-list input[type="checkbox"]');
  checkboxes.forEach(cb => { cb.checked = true; });
  allStudents.forEach(s => selectedDeleteStudents.add(s.id));
}

function deselectAllManageStudents() {
  const checkboxes = document.querySelectorAll('#student-management-list input[type="checkbox"]');
  checkboxes.forEach(cb => { cb.checked = false; });
  selectedDeleteStudents.clear();
}

async function bulkDeleteStudents() {
  if (selectedDeleteStudents.size === 0) return notify('Sélectionne des élèves à supprimer !', true);
  if (!confirm(`Supprimer ${selectedDeleteStudents.size} élèves ?`)) return;

  try {
    const res = await fetch('/api/students/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_ids: Array.from(selectedDeleteStudents) })
    });
    const data = await res.json();
    notify(data.message);
    selectedDeleteStudents.clear();
    loadStudentManagement();
  } catch (e) {
    notify('Erreur', true);
  }
}

async function addStudent() {
  const firstNameEl = document.getElementById('new-first-name');
  const lastNameEl = document.getElementById('new-last-name');
  const pinEl = document.getElementById('new-pin');
  const feedbackEl = document.getElementById('add-student-feedback');

  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const pin = pinEl.value.trim() || '0000';

  if (!firstName) { feedbackEl.innerHTML = '<span style="color:var(--danger)">❌ Écris le prénom !</span>'; firstNameEl.focus(); return; }
  if (!lastName) { feedbackEl.innerHTML = '<span style="color:var(--danger)">❌ Écris le nom !</span>'; lastNameEl.focus(); return; }

  feedbackEl.innerHTML = '<span style="color:var(--warning)">⏳ Création en cours...</span>';

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, pin_code: pin })
    });
    const data = await res.json();
    if (res.ok) {
      feedbackEl.innerHTML = `<span style="color:var(--success)">✅ ${firstName} ${lastName} ajouté ! (PIN: ${pin})</span>`;
      notify(`${firstName} ajouté !`);
      firstNameEl.value = '';
      lastNameEl.value = '';
      pinEl.value = '';
      loadStudentManagement();
    } else {
      feedbackEl.innerHTML = `<span style="color:var(--danger)">❌ ${data.error}</span>`;
    }
  } catch (e) {
    feedbackEl.innerHTML = '<span style="color:var(--danger)">❌ Erreur de connexion au serveur</span>';
  }
}

async function addBulkStudents() {
  const textarea = document.getElementById('bulk-students');
  const feedbackEl = document.getElementById('bulk-feedback');
  const text = textarea.value.trim();

  if (!text) { feedbackEl.innerHTML = '<span style="color:var(--danger)">❌ Écris des noms !</span>'; return; }

  const lines = text.split('\n').filter(l => l.trim());
  const studentList = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      studentList.push({ first_name: firstName, last_name: lastName, pin_code: '0000' });
    } else if (parts.length === 1) {
      studentList.push({ first_name: parts[0], last_name: '-', pin_code: '0000' });
    }
  }

  if (studentList.length === 0) { feedbackEl.innerHTML = '<span style="color:var(--danger)">❌ Format incorrect</span>'; return; }

  feedbackEl.innerHTML = `<span style="color:var(--warning)">⏳ Création de ${studentList.length} élèves...</span>`;

  try {
    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: studentList })
    });
    const data = await res.json();
    if (res.ok) {
      feedbackEl.innerHTML = `<span style="color:var(--success)">✅ ${data.message}</span>`;
      notify(data.message);
      textarea.value = '';
      loadStudentManagement();
    } else {
      feedbackEl.innerHTML = `<span style="color:var(--danger)">❌ ${data.error}</span>`;
    }
  } catch (e) {
    feedbackEl.innerHTML = '<span style="color:var(--danger)">❌ Erreur de connexion</span>';
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Supprimer ${name} ?`)) return;
  try {
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    notify(`${name} supprimé`);
    loadStudentManagement();
  } catch (e) {
    notify('Erreur', true);
  }
}

// ==================== BELT MANAGEMENT ====================

async function loadBeltManagement() {
  await loadStudentsAdmin();
  const select = document.getElementById('belt-student-select');
  const currentVal = select.value;
  select.innerHTML = '<option value="">Choisir un élève...</option>' +
    allStudents.map(s => `<option value="${s.id}" ${s.id == currentVal ? 'selected' : ''}>${s.first_name} ${s.last_name}</option>`).join('');
  if (currentVal) loadStudentBeltsTeacher();
}

async function loadStudentBeltsTeacher() {
  const studentId = document.getElementById('belt-student-select').value;
  if (!studentId) return;

  const beltsRes = await fetch(`/api/students/${studentId}/belts`);
  const belts = await beltsRes.json();
  const colorsRes = await fetch('/api/belts/colors');
  const allColors = await colorsRes.json();

  const grid = document.getElementById('belt-management-grid');
  grid.innerHTML = belts.map(b => {
    const isMax = b.rank >= allColors.length;
    const progressDots = allColors.map(c => `
      <div class="belt-dot ${c.rank <= b.rank ? 'achieved' : ''}" style="background: ${c.color_hex}"></div>
    `).join('');
    const isDoree = b.belt_name === 'Dorée';
    const subLevel = b.sub_level || 0;
    return `
      <div class="belt-card ${isDoree ? 'belt-doree' : ''}" style="border-color: ${b.color_hex}">
        <div class="subject-icon">${b.subject_icon}</div>
        <div class="subject-name">${b.subject_name}</div>
        <div class="belt-indicator" style="background: ${b.color_hex}"></div>
        <div class="belt-name" style="color: ${b.color_hex}">Ceinture ${b.belt_name}</div>
        <div class="belt-sublevel-controls">
          <button class="sublevel-btn" onclick="changeSubLevel('${studentId}', '${b.subject_id}', 'down')">−</button>
          <span class="sublevel-display">Palier ${subLevel}</span>
          <button class="sublevel-btn" onclick="changeSubLevel('${studentId}', '${b.subject_id}', 'up')">+</button>
        </div>
        <div class="belt-progress">${progressDots}</div>
        ${!isMax ? `<button class="belt-upgrade-btn" onclick="upgradeBelt('${studentId}', '${b.subject_id}')">⬆ Ceinture suivante</button>` : '<div style="font-size:7px;color:var(--secondary);margin-top:5px">MAX !</div>'}
        ${b.rank > 1 ? `<button class="belt-downgrade-btn" onclick="downgradeBelt('${studentId}', '${b.subject_id}')">⬇ Descendre</button>` : ''}
      </div>
    `;
  }).join('');
}

async function upgradeBelt(studentId, subjectId) {
  try {
    const res = await fetch(`/api/students/${studentId}/belts/${subjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.ok) { notify(data.message); loadStudentBeltsTeacher(); }
    else notify(data.error, true);
  } catch (e) { notify('Erreur', true); }
}

async function changeSubLevel(studentId, subjectId, direction) {
  try {
    const res = await fetch(`/api/students/${studentId}/belts/${subjectId}/sublevel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction })
    });
    const data = await res.json();
    if (res.ok) { loadStudentBeltsTeacher(); }
    else notify(data.error, true);
  } catch (e) { notify('Erreur', true); }
}

async function downgradeBelt(studentId, subjectId) {
  try {
    const res = await fetch(`/api/students/${studentId}/belts/${subjectId}/down`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) { notify(data.message); loadStudentBeltsTeacher(); }
    else notify(data.error, true);
  } catch (e) { notify('Erreur', true); }
}

// ==================== JOB MANAGEMENT ====================

async function loadJobManagement() {
  await loadStudentsAdmin();
  const jobsRes = await fetch('/api/jobs');
  const jobs = await jobsRes.json();
  const currentRes = await fetch('/api/jobs/current');
  const currentJobs = await currentRes.json();

  const container = document.getElementById('jobs-management');
  container.innerHTML = jobs.map(job => {
    const assigned = currentJobs.find(j => j.job_id === job.id);
    const isBankerJob = job.name === 'Banquier';
    return `
      <div class="job-card" ${isBankerJob ? 'style="border-color:var(--success)"' : ''}>
        <div class="job-header">
          <span class="job-icon-lg">${job.icon}</span>
          <span class="job-title">${job.name}</span>
        </div>
        <div class="job-pay-info">+${job.weekly_pay} cc/semaine</div>
        ${isBankerJob && assigned ? `<div class="banker-code-info">Code banquier: ${allStudents.find(s => s.id === assigned.student_id)?.banker_code || 'Non généré'}</div>` : ''}
        <select class="pixel-select" onchange="assignJob('${job.id}', this.value)" style="font-size:7px">
          <option value="">Non attribué</option>
          ${allStudents.map(s => `
            <option value="${s.id}" ${assigned && assigned.student_id === s.id ? 'selected' : ''}>${s.first_name} ${s.last_name}</option>
          `).join('')}
        </select>
      </div>
    `;
  }).join('');
}

async function assignJob(jobId, studentId) {
  if (!studentId) return;
  const selects = document.querySelectorAll('#jobs-management select');
  const assignments = [];
  selects.forEach(select => {
    if (select.value) {
      const jId = select.getAttribute('onchange').match(/assignJob\('([^']+)'/)[1];
      assignments.push({ student_id: select.value, job_id: jId });
    }
  });

  try {
    await fetch('/api/jobs/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments })
    });
    notify('Métiers attribués !');
    await loadStudentsAdmin();
    loadJobManagement();
  } catch (e) { notify('Erreur', true); }
}

async function payJobs() {
  try {
    const res = await fetch('/api/jobs/pay', { method: 'POST' });
    const data = await res.json();
    notify(data.message);
  } catch (e) { notify('Erreur', true); }
}

// ==================== MARKET MANAGEMENT ====================

async function loadMarketManagement() {
  await loadStudentsAdmin();
  const sellerSelect = document.getElementById('market-seller');
  sellerSelect.innerHTML = '<option value="">Objet de la classe</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');

  const res = await fetch('/api/market');
  const items = await res.json();
  const container = document.getElementById('market-items-list');
  container.innerHTML = items.map(item => `
    <div class="market-item-card">
      <div class="market-item-name">${item.name}</div>
      <div class="market-item-seller">${item.seller_name ? `Vendeur: ${item.seller_name}` : 'Objet de la classe'}</div>
      ${item.description ? `<div class="shop-item-desc">${item.description}</div>` : ''}
      <div class="market-item-price">💰 ${item.price.toLocaleString()} cc</div>
    </div>
  `).join('') || '<p style="font-size:8px; color: var(--text-muted)">Pas d\'articles en vente</p>';
}

async function addMarketItem() {
  const sellerId = document.getElementById('market-seller').value;
  const name = document.getElementById('market-item-name').value.trim();
  const desc = document.getElementById('market-item-desc').value.trim();
  const price = parseInt(document.getElementById('market-item-price').value);

  if (!name || !price) return notify('Nom et prix requis !', true);

  try {
    await fetch('/api/market/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller_id: sellerId || null, name, description: desc, price })
    });
    notify('Article ajouté au marché !');
    document.getElementById('market-item-name').value = '';
    document.getElementById('market-item-desc').value = '';
    document.getElementById('market-item-price').value = '';
    loadMarketManagement();
  } catch (e) { notify('Erreur', true); }
}

// ==================== GLOBAL HISTORY (TEACHER) ====================

async function loadGlobalHistory() {
  const res = await fetch('/api/transactions/all?limit=200');
  const data = await res.json();
  const transactions = data.transactions || data;
  const container = document.getElementById('global-transaction-list');

  if (transactions.length === 0) {
    container.innerHTML = '<p style="font-size:8px; color: var(--text-muted)">Aucune transaction</p>';
    return;
  }

  container.innerHTML = transactions.map(tx => {
    const isPositive = tx.type === 'earn' || tx.type === 'market_sell';
    const sign = isPositive ? '+' : '-';
    const date = new Date(tx.created_at).toLocaleDateString('fr-FR');
    const time = new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const byLabel = tx.created_by === 'teacher' ? '👨‍🏫 Prof' :
                    tx.created_by === 'system' ? '⚙️ Auto' :
                    tx.created_by === 'shop' ? '🛍️ Boutique' :
                    tx.created_by === 'market' ? '🏪 Marché' :
                    tx.created_by ? `🏦 ${tx.created_by}` : '';
    return `
      <div class="transaction-item">
        <span class="transaction-reason"><strong>${tx.first_name} ${tx.last_name}</strong> — ${tx.reason || tx.type}</span>
        <span class="transaction-amount ${isPositive ? 'positive' : 'negative'}">${sign}${tx.amount}</span>
        <span class="transaction-by">${byLabel}</span>
        <span class="transaction-date">${date} ${time}</span>
      </div>
    `;
  }).join('');
}

// ==================== STUDENT MARKET ====================

async function loadStudentMarket() {
  const res = await fetch('/api/market');
  const items = await res.json();
  const container = document.getElementById('student-market-items');

  if (items.length === 0) {
    container.innerHTML = '<p style="font-size:8px; color: var(--text-muted)">Pas d\'articles en vente pour le moment.</p>';
    return;
  }

  container.innerHTML = items.map(item => {
    const canAfford = currentStudent.balance >= item.price;
    return `
      <div class="market-item-card student-market-card">
        <div class="market-item-name">${item.name}</div>
        <div class="market-item-seller">${item.seller_name ? `Vendeur: ${item.seller_name}` : '🏫 Objet de la classe'}</div>
        ${item.description ? `<div class="shop-item-desc">${item.description}</div>` : ''}
        <div class="market-item-price">💰 ${item.price.toLocaleString()} cc</div>
        <button class="buy-btn" ${!canAfford ? 'disabled' : ''} onclick="buyMarketItem('${item.id}')">
          ${canAfford ? '🛒 Acheter' : '🔒 Pas assez'}
        </button>
      </div>
    `;
  }).join('');
}

async function buyMarketItem(itemId) {
  try {
    const res = await fetch('/api/market/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: currentStudent.id, item_id: itemId })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message || 'Achat effectué !');
      if (data.balance !== undefined) {
        currentStudent.balance = data.balance;
        document.getElementById('nav-balance').textContent = data.balance.toLocaleString();
      } else {
        await updateBalance();
      }
      loadStudentMarket();
    } else {
      notify(data.error || 'Erreur d\'achat', true);
    }
  } catch (e) {
    notify('Erreur d\'achat', true);
  }
}

// ==================== PIN CHANGE ====================

function showPinChangeModal() {
  document.getElementById('old-pin').value = '';
  document.getElementById('new-pin-change').value = '';
  document.getElementById('confirm-pin').value = '';
  document.getElementById('pin-change-modal').classList.remove('hidden');
}

async function changePin() {
  const oldPin = document.getElementById('old-pin').value.trim();
  const newPin = document.getElementById('new-pin-change').value.trim();
  const confirmPin = document.getElementById('confirm-pin').value.trim();

  if (!oldPin || oldPin.length !== 4) return notify('Ancien PIN invalide (4 chiffres)', true);
  if (!newPin || newPin.length !== 4) return notify('Nouveau PIN invalide (4 chiffres)', true);
  if (newPin !== confirmPin) return notify('Les PINs ne correspondent pas !', true);

  try {
    const res = await fetch(`/api/students/${currentStudent.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_pin: oldPin, new_pin: newPin })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message || 'PIN changé avec succès !');
      closeModal('pin-change-modal');
    } else {
      notify(data.error || 'Erreur de changement de PIN', true);
    }
  } catch (e) {
    notify('Erreur de connexion', true);
  }
}

// ==================== EXPORT DATA ====================

async function exportData() {
  try {
    const res = await fetch('/api/export');
    if (!res.ok) {
      notify('Erreur d\'export', true);
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cool-school-bank-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Données exportées !');
  } catch (e) {
    notify('Erreur d\'export', true);
  }
}

// ==================== STUDENT PROFILE (teacher click) ====================

async function showStudentProfile(studentId) {
  try {
    const res = await fetch(`/api/students/${studentId}/profile`);
    const { student, belts, transactions, job } = await res.json();
    const colorsRes = await fetch('/api/belts/colors');
    const allColors = await colorsRes.json();

    const modal = document.getElementById('student-profile-modal');
    const content = document.getElementById('student-profile-content');

    const beltCards = belts.map(b => {
      const subLevel = b.sub_level || 0;
      const isDoree = b.belt_name === 'Dorée';
      return `
        <div class="profile-belt ${isDoree ? 'belt-doree' : ''}" style="border-left: 4px solid ${b.color_hex}">
          <span class="profile-belt-icon">${b.subject_icon}</span>
          <span class="profile-belt-subject">${b.subject_name}</span>
          <span class="profile-belt-name" style="color: ${b.color_hex}">${b.belt_name}</span>
          ${subLevel > 0 ? `<span class="profile-belt-sublevel">P.${subLevel}</span>` : ''}
        </div>
      `;
    }).join('');

    const txList = transactions.slice(0, 10).map(tx => {
      const isPositive = tx.type === 'earn' || tx.type === 'market_sell';
      const sign = isPositive ? '+' : '-';
      const date = new Date(tx.created_at).toLocaleDateString('fr-FR');
      return `<div class="profile-tx ${isPositive ? 'positive' : 'negative'}">${sign}${tx.amount} cc - ${tx.reason || tx.type} (${date})</div>`;
    }).join('') || '<div style="font-size:7px;color:var(--text-muted)">Aucune transaction</div>';

    content.innerHTML = `
      <h2 style="font-size:12px;color:var(--secondary);margin-bottom:15px">${student.first_name} ${student.last_name}</h2>
      <div class="profile-stats">
        <div class="profile-stat"><span class="profile-stat-label">Solde</span><span class="profile-stat-value" style="color:${student.balance < 0 ? 'var(--danger)' : 'var(--secondary)'}">${student.balance.toLocaleString()} cc</span></div>
        ${job ? `<div class="profile-stat"><span class="profile-stat-label">Métier</span><span class="profile-stat-value">${job.icon} ${job.name}</span></div>` : ''}
      </div>
      <h3 style="font-size:9px;color:var(--text-muted);margin:15px 0 8px">Ceintures</h3>
      <div class="profile-belts-grid">${beltCards}</div>
      <h3 style="font-size:9px;color:var(--text-muted);margin:15px 0 8px">Dernières transactions</h3>
      <div class="profile-tx-list">${txList}</div>
    `;

    modal.style.display = 'flex';
  } catch (e) {
    notify('Erreur chargement profil', true);
  }
}

function closeStudentProfile() {
  document.getElementById('student-profile-modal').style.display = 'none';
}

// ==================== FINES (AMENDES) ====================

let selectedFineRule = null;
let selectedFineStudents = new Set();

async function loadFinesManagement() {
  await loadStudentsAdmin();

  // Load rules list
  const rulesRes = await fetch('/api/fines/rules');
  const rules = await rulesRes.json();

  const rulesList = document.getElementById('fine-rules-list');
  rulesList.innerHTML = rules.map(r => `
    <div class="fine-rule-item">
      <span class="fine-icon">${r.icon}</span>
      <span class="fine-name">${r.name}</span>
      <span class="fine-amount">-${r.amount} cc</span>
      <button class="fine-delete" onclick="deleteFineRule('${r.id}')">X</button>
    </div>
  `).join('') || '<p style="font-size:7px;color:var(--text-muted)">Aucune règle</p>';

  // Load rule buttons for applying
  const buttonsContainer = document.getElementById('fine-rule-buttons');
  buttonsContainer.innerHTML = rules.map(r => `
    <button class="fine-rule-btn ${selectedFineRule === r.id ? 'active' : ''}" onclick="selectFineRule('${r.id}')">
      ${r.icon} ${r.name} (-${r.amount})
    </button>
  `).join('');

  // Load student checkboxes
  const studentList = document.getElementById('fine-student-list');
  studentList.innerHTML = allStudents.map(s => `
    <label class="manage-student-item ${selectedFineStudents.has(s.id) ? 'selected' : ''}" onclick="toggleFineStudent('${s.id}')">
      <input type="checkbox" ${selectedFineStudents.has(s.id) ? 'checked' : ''}>
      ${s.first_name} ${s.last_name}
      <span style="margin-left:auto;color:${s.balance < 0 ? 'var(--danger)' : 'var(--secondary)'}">${s.balance} cc</span>
    </label>
  `).join('');
}

function selectFineRule(id) {
  selectedFineRule = selectedFineRule === id ? null : id;
  loadFinesManagement();
}

function toggleFineStudent(id) {
  if (selectedFineStudents.has(id)) selectedFineStudents.delete(id);
  else selectedFineStudents.add(id);
  loadFinesManagement();
}

function selectAllFineStudents() {
  allStudents.forEach(s => selectedFineStudents.add(s.id));
  loadFinesManagement();
}

function deselectAllFineStudents() {
  selectedFineStudents.clear();
  loadFinesManagement();
}

async function addFineRule() {
  const name = document.getElementById('fine-rule-name').value.trim();
  const icon = document.getElementById('fine-rule-icon').value.trim() || '⚠️';
  const amount = parseInt(document.getElementById('fine-rule-amount').value);

  if (!name || !amount) return notify('Nom et montant requis !', true);

  try {
    await fetch('/api/fines/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, amount })
    });
    notify('Règle ajoutée !');
    document.getElementById('fine-rule-name').value = '';
    document.getElementById('fine-rule-icon').value = '';
    document.getElementById('fine-rule-amount').value = '';
    loadFinesManagement();
  } catch (e) { notify('Erreur', true); }
}

async function deleteFineRule(id) {
  try {
    await fetch(`/api/fines/rules/${id}`, { method: 'DELETE' });
    notify('Règle supprimée');
    loadFinesManagement();
  } catch (e) { notify('Erreur', true); }
}

async function applyFine() {
  if (!selectedFineRule) return notify('Choisis une règle d\'amende !', true);
  if (selectedFineStudents.size === 0) return notify('Sélectionne des élèves !', true);

  try {
    const res = await fetch('/api/fines/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_ids: Array.from(selectedFineStudents), rule_id: selectedFineRule })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message);
      selectedFineStudents.clear();
      selectedFineRule = null;
      loadFinesManagement();
    } else {
      notify(data.error, true);
    }
  } catch (e) { notify('Erreur', true); }
}

// ==================== AUCTIONS (ENCHÈRES) ====================

let currentDiceAuction = null;
let diceResults = {};

async function loadAuctionManagement() {
  const res = await fetch('/api/auctions');
  const auctions = await res.json();

  const openList = document.getElementById('auctions-open-list');
  const closedList = document.getElementById('auctions-closed-list');

  const open = auctions.filter(a => a.status === 'open' || a.status === 'dice_tiebreak');
  const closed = auctions.filter(a => a.status === 'closed');

  openList.innerHTML = open.length ? await Promise.all(open.map(a => renderTeacherAuctionCard(a))).then(cards => cards.join(''))
    : '<p style="font-size:8px;color:var(--text-muted)">Aucune enchère en cours</p>';

  closedList.innerHTML = closed.slice(0, 10).map(a => `
    <div class="auction-card closed">
      <div class="auction-card-name">${a.name}</div>
      <div class="auction-card-price">💰 ${a.current_price} cc</div>
      <span class="auction-card-status closed">Terminée</span>
      ${a.winner_name ? `<div class="auction-winner">🏆 ${a.winner_name} ${a.winner_last || ''}</div>` : '<div style="font-size:7px;color:var(--text-muted)">Pas d\'enchérisseur</div>'}
    </div>
  `).join('') || '<p style="font-size:8px;color:var(--text-muted)">Aucune enchère terminée</p>';
}

async function renderTeacherAuctionCard(a) {
  const detailRes = await fetch(`/api/auctions/${a.id}`);
  const { bids } = await detailRes.json();

  const bidsHtml = bids.slice(0, 5).map((b, i) => `
    <div class="auction-bid-item">${i === 0 ? '👑 ' : ''}${b.first_name} ${b.last_name}: ${b.amount} cc</div>
  `).join('');

  return `
    <div class="auction-card ${a.status}">
      <div class="auction-card-name">${a.name}</div>
      ${a.description ? `<div class="auction-card-desc">${a.description}</div>` : ''}
      <div class="auction-card-price">💰 ${a.current_price} cc</div>
      <span class="auction-card-status ${a.status}">${a.status === 'open' ? '🟢 En cours' : '🎲 Égalité - Dés !'}</span>
      ${bids.length > 0 ? `<div class="auction-bids-list">${bidsHtml}</div>` : '<div style="font-size:7px;color:var(--text-muted);margin-top:5px">Aucune mise</div>'}
      ${a.status === 'open' ? `<button class="action-btn" style="margin-top:10px;background:var(--danger);border-color:#c0392b" onclick="closeAuction('${a.id}')">🔨 Fermer l'enchère</button>` : ''}
      ${a.status === 'dice_tiebreak' ? `<button class="action-btn" style="margin-top:10px;background:var(--secondary);border-color:#DAA520;color:var(--bg)" onclick="openDiceModal('${a.id}')">🎲 Lancer les dés</button>` : ''}
    </div>
  `;
}

async function createAuction() {
  const name = document.getElementById('auction-name').value.trim();
  const desc = document.getElementById('auction-desc').value.trim();
  const startPrice = parseInt(document.getElementById('auction-start-price').value) || 1;

  if (!name) return notify('Nom requis !', true);

  try {
    const res = await fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, starting_price: startPrice })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message);
      document.getElementById('auction-name').value = '';
      document.getElementById('auction-desc').value = '';
      document.getElementById('auction-start-price').value = '1';
      loadAuctionManagement();
    } else {
      notify(data.error, true);
    }
  } catch (e) { notify('Erreur', true); }
}

async function closeAuction(auctionId) {
  try {
    const res = await fetch(`/api/auctions/${auctionId}/close`, { method: 'POST' });
    const data = await res.json();

    if (data.tied) {
      notify(data.message);
      currentDiceAuction = { id: auctionId, bidders: data.tiedBidders };
      openDiceModal(auctionId);
    } else {
      notify(data.message);
    }
    loadAuctionManagement();
  } catch (e) { notify('Erreur', true); }
}

async function openDiceModal(auctionId) {
  // Fetch tied bidders
  const res = await fetch(`/api/auctions/${auctionId}`);
  const { auction, bids } = await res.json();

  if (auction.status !== 'dice_tiebreak') {
    notify('Pas en mode départage', true);
    return;
  }

  const maxAmount = Math.max(...bids.map(b => b.amount));
  const tiedBidders = bids.filter(b => b.amount === maxAmount);

  currentDiceAuction = { id: auctionId, bidders: tiedBidders.map(b => ({ student_id: b.student_id, name: `${b.first_name} ${b.last_name}`, amount: b.amount })) };
  diceResults = {};

  const modal = document.getElementById('dice-modal');
  const playersContainer = document.getElementById('dice-players');
  const resultContainer = document.getElementById('dice-result');
  resultContainer.innerHTML = '';

  playersContainer.innerHTML = currentDiceAuction.bidders.map(b => `
    <div class="dice-player" id="dice-player-${b.student_id}">
      <div class="dice-player-name">${b.name}</div>
      <div class="dice-player-bid" style="font-size:7px;color:var(--warning)">${b.amount} cc</div>
      <div class="dice-container">
        <div class="dice" id="dice1-${b.student_id}">?</div>
        <div class="dice" id="dice2-${b.student_id}">?</div>
      </div>
      <div class="dice-total" id="dice-total-${b.student_id}">-</div>
      <button class="dice-roll-btn" id="dice-btn-${b.student_id}" onclick="rollDice('${b.student_id}')">🎲 Lancer !</button>
    </div>
  `).join('');

  modal.style.display = 'flex';
}

function rollDice(studentId) {
  if (diceResults[studentId]) return; // Already rolled

  const dice1El = document.getElementById(`dice1-${studentId}`);
  const dice2El = document.getElementById(`dice2-${studentId}`);
  const btn = document.getElementById(`dice-btn-${studentId}`);

  dice1El.classList.add('rolling');
  dice2El.classList.add('rolling');
  btn.disabled = true;
  btn.style.opacity = '0.5';

  let rollCount = 0;
  const rollInterval = setInterval(() => {
    dice1El.textContent = Math.ceil(Math.random() * 6);
    dice2El.textContent = Math.ceil(Math.random() * 6);
    rollCount++;

    if (rollCount >= 15) {
      clearInterval(rollInterval);
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      dice1El.textContent = d1;
      dice2El.textContent = d2;
      dice1El.classList.remove('rolling');
      dice2El.classList.remove('rolling');

      const total = d1 + d2;
      diceResults[studentId] = total;
      document.getElementById(`dice-total-${studentId}`).textContent = `Total: ${total}`;

      // Check if all have rolled
      const allRolled = currentDiceAuction.bidders.every(b => diceResults[b.student_id] !== undefined);
      if (allRolled) {
        resolveDiceTiebreak();
      }
    }
  }, 80);
}

async function resolveDiceTiebreak() {
  // Find highest total
  let maxTotal = 0;
  let winnerId = null;

  for (const b of currentDiceAuction.bidders) {
    const total = diceResults[b.student_id];
    if (total > maxTotal) {
      maxTotal = total;
      winnerId = b.student_id;
    }
  }

  // Check for another tie
  const tiedAgain = currentDiceAuction.bidders.filter(b => diceResults[b.student_id] === maxTotal);

  if (tiedAgain.length > 1) {
    // Another tie! Reset and re-roll
    const resultContainer = document.getElementById('dice-result');
    resultContainer.innerHTML = `<p style="font-size:10px;color:var(--warning);margin-top:10px">🎲 Encore une égalité ! Relancez les dés !</p>`;
    diceResults = {};
    // Re-enable buttons
    for (const b of currentDiceAuction.bidders) {
      const btn = document.getElementById(`dice-btn-${b.student_id}`);
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
    return;
  }

  // Highlight winner
  document.getElementById(`dice-player-${winnerId}`).classList.add('winner');

  const winnerName = currentDiceAuction.bidders.find(b => b.student_id === winnerId).name;
  const resultContainer = document.getElementById('dice-result');
  resultContainer.innerHTML = `<p style="font-size:12px;color:var(--secondary);margin-top:15px">🏆 ${winnerName} gagne avec ${maxTotal} !</p>`;

  // Resolve on server
  try {
    await fetch(`/api/auctions/${currentDiceAuction.id}/dice-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id: winnerId })
    });
    setTimeout(() => {
      notify(`${winnerName} remporte l'enchère !`);
      loadAuctionManagement();
    }, 2000);
  } catch (e) { notify('Erreur', true); }
}

function closeDiceModal() {
  document.getElementById('dice-modal').style.display = 'none';
}

// ==================== STUDENT AUCTIONS ====================

async function loadStudentAuctions() {
  const res = await fetch('/api/auctions');
  const auctions = await res.json();
  const open = auctions.filter(a => a.status === 'open');

  const container = document.getElementById('student-auctions-list');

  if (open.length === 0) {
    container.innerHTML = '<p style="font-size:8px;color:var(--text-muted)">Pas d\'enchère en cours pour le moment.</p>';
    return;
  }

  const cards = await Promise.all(open.map(async a => {
    const detailRes = await fetch(`/api/auctions/${a.id}`);
    const { bids } = await detailRes.json();
    const myBid = bids.find(b => b.student_id === currentStudent.id);
    const topBid = bids.length > 0 ? bids[0] : null;

    return `
      <div class="auction-card open">
        <div class="auction-card-name">${a.name}</div>
        ${a.description ? `<div class="auction-card-desc">${a.description}</div>` : ''}
        <div class="auction-card-price">💰 ${a.current_price} cc</div>
        ${topBid ? `<div style="font-size:7px;color:var(--text-muted);margin-bottom:5px">Meilleure mise: ${topBid.first_name} - ${topBid.amount} cc</div>` : ''}
        ${myBid ? `<div style="font-size:7px;color:var(--success);margin-bottom:5px">Ta mise: ${myBid.amount} cc</div>` : ''}
        <div class="auction-bid-form">
          <input type="number" id="bid-input-${a.id}" placeholder="Ta mise" min="${a.current_price}" value="${a.current_price + 1}">
          <button class="auction-bid-btn" onclick="placeBid('${a.id}')">Miser</button>
        </div>
      </div>
    `;
  }));

  container.innerHTML = cards.join('');
}

async function placeBid(auctionId) {
  const input = document.getElementById(`bid-input-${auctionId}`);
  const amount = parseInt(input.value);

  if (!amount || amount <= 0) return notify('Entre un montant !', true);

  try {
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: currentStudent.id, amount })
    });
    const data = await res.json();
    if (res.ok) {
      notify(data.message);
      loadStudentAuctions();
    } else {
      notify(data.error, true);
    }
  } catch (e) { notify('Erreur', true); }
}

// ==================== LEADERBOARD (CLASSEMENTS) ====================

async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();

  renderLeaderboardContent('lb-richest', 'lb-belts', 'lb-subjects', data);
}

async function loadStudentLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();

  renderLeaderboardContent('slb-richest', 'slb-belts', 'slb-subjects', data);
}

function getSubjectCategory(icon) {
  const mathIcons = ['🔢', '➕', '✖️', '⚡'];
  const geoIcons = ['📏', '📐'];
  const puzzleIcons = ['🧩'];
  const writeIcons = ['✍️', '✏️', '📝'];
  const readIcons = ['📖', '📚'];
  const spellIcons = ['🔤', '📘', '📗', '🔀'];
  const gramIcons = ['📋', '🏷️'];
  if (mathIcons.includes(icon)) return 'math';
  if (geoIcons.includes(icon)) return 'geometry';
  if (puzzleIcons.includes(icon)) return 'puzzle';
  if (writeIcons.includes(icon)) return 'writing';
  if (readIcons.includes(icon)) return 'reading';
  if (spellIcons.includes(icon)) return 'spelling';
  if (gramIcons.includes(icon)) return 'grammar';
  return 'default';
}

function renderLeaderboardContent(richestId, beltsId, subjectsId, data) {
  // Richest
  const richestContainer = document.getElementById(richestId);
  const medals = ['🥇', '🥈', '🥉'];
  richestContainer.innerHTML = `<div class="leaderboard-list">${data.richest.map((s, i) => `
    <div class="leaderboard-item ${i === 0 ? 'lb-richest-first' : ''}" data-lb-rank="${i + 1}">
      <span class="leaderboard-rank">${i < 3 ? medals[i] : (i + 1)}</span>
      <span class="leaderboard-name">${s.first_name} ${s.last_name}</span>
      <span class="leaderboard-value" style="color:${s.balance < 0 ? 'var(--danger)' : 'var(--secondary)'}">${s.balance.toLocaleString()} cc</span>
      ${i === 0 ? '<span class="lb-richest-crown">👑</span>' : ''}
    </div>
  `).join('')}</div>`;

  // Belt ranking
  const beltsContainer = document.getElementById(beltsId);
  beltsContainer.innerHTML = `<div class="leaderboard-list">${data.beltRanking.map((s, i) => {
    const isTop10 = i < 10;
    const beltColor = s.highest_belt_color || '#FFFFFF';
    return `
    <div class="leaderboard-item ${isTop10 ? 'lb-belt-glow' : ''}"
         data-lb-rank="${i + 1}"
         ${isTop10 ? `style="--belt-color: ${beltColor}; border-color: ${beltColor};"` : ''}>
      <span class="leaderboard-rank" ${isTop10 ? `style="color: ${beltColor}; text-shadow: 0 0 8px ${beltColor}, 0 0 16px ${beltColor};"` : ''}>${i < 3 ? medals[i] : (i + 1)}</span>
      <span class="leaderboard-name">${s.first_name} ${s.last_name}</span>
      <span class="leaderboard-value">${s.total_rank} pts</span>
      <span class="leaderboard-detail">${s.gold_count > 0 ? `${s.gold_count}x 🏅` : ''}${isTop10 && s.highest_belt_name ? ` ${s.highest_belt_name}` : ''}</span>
    </div>`;
  }).join('')}</div>`;

  // Per subject
  const subjectsContainer = document.getElementById(subjectsId);
  const subjects = Object.values(data.bySubject);
  subjectsContainer.innerHTML = subjects.map(sub => {
    const top5 = sub.students.slice(0, 5);
    const category = getSubjectCategory(sub.icon);
    return `
      <div class="subject-leaderboard" data-subject-cat="${category}">
        <div class="subject-leaderboard-title">${sub.icon} ${sub.name}</div>
        <div class="leaderboard-list">${top5.map((s, i) => `
          <div class="leaderboard-item ${i < 3 ? 'lb-subject-top lb-subject-top' + (i + 1) : ''}"
               data-subject-cat="${category}" data-lb-rank="${i + 1}">
            <span class="leaderboard-rank">${i < 3 ? medals[i] : (i + 1)}</span>
            <span class="leaderboard-name">${s.first_name} ${s.last_name}</span>
            <span class="leaderboard-value" style="color:${s.color_hex}">${s.belt_name}${s.sub_level > 0 ? ` P.${s.sub_level}` : ''}</span>
            ${i < 3 ? `<span class="lb-subject-particles" data-cat="${category}"></span>` : ''}
          </div>
        `).join('')}</div>
      </div>
    `;
  }).join('');
}

function showLeaderboardTab(tabId) {
  document.querySelectorAll('#tab-t-leaderboard .leaderboard-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#tab-t-leaderboard .shop-cat-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  event.target.classList.add('active');
}

function showStudentLeaderboardTab(tabId) {
  document.querySelectorAll('#tab-leaderboard .leaderboard-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#tab-leaderboard .shop-cat-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  event.target.classList.add('active');
}

// ==================== UTILITIES ====================

function notify(message, isError = false) {
  const el = document.getElementById('notification');
  const textEl = document.getElementById('notification-text');
  textEl.textContent = message;
  el.className = `notification ${isError ? 'error' : ''}`;
  setTimeout(() => { el.classList.add('hidden'); }, 3000);
}

function safeParseJSON(str) {
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str || '{}');
  } catch { return {}; }
}

// Resize classroom background on window resize
window.addEventListener('resize', () => {
  if (document.getElementById('student-screen').classList.contains('active')) {
    drawClassroomBackground();
  }
});
