const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== HELPERS ====================

function generateBankerCode() {
  let code;
  do {
    code = String(Math.floor(10000 + Math.random() * 90000));
  } while (db.prepare('SELECT id FROM students WHERE banker_code = ?').get(code));
  return code;
}

function getConfig(key) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

// Sanitize input strings
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])).trim();
}

// ==================== API CONFIG ====================

app.get('/api/config', (req, res) => {
  const config = {};
  const rows = db.prepare('SELECT key, value FROM config').all();
  for (const row of rows) {
    if (row.key !== 'teacher_pin') config[row.key] = row.value;
  }
  res.json(config);
});

app.put('/api/config', (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'Cle et valeur requises' });
  if (key === 'teacher_pin') return res.status(403).json({ error: 'Utilisez /api/teacher/pin' });
  setConfig(sanitize(key), sanitize(value));
  res.json({ message: 'Configuration mise a jour' });
});

// ==================== API ELEVES ====================

app.get('/api/students', (req, res) => {
  const students = db.prepare(`
    SELECT id, first_name, last_name, avatar_config, class_number, balance, is_active
    FROM students WHERE is_active = 1 ORDER BY first_name
  `).all();
  res.json(students);
});

app.get('/api/students/admin', (req, res) => {
  const students = db.prepare(`
    SELECT id, first_name, last_name, avatar_config, pin_code, banker_code, class_number, balance, is_active
    FROM students WHERE is_active = 1 ORDER BY first_name
  `).all();
  res.json(students);
});

app.get('/api/students/:id', (req, res) => {
  const student = db.prepare(`
    SELECT * FROM students WHERE id = ? AND is_active = 1
  `).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Eleve non trouve' });
  // Calculate total earned (all earn transactions)
  const earned = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE student_id = ? AND type IN ('earn', 'market_sell', 'refund') AND is_reversed = 0
  `).get(req.params.id);
  student.total_earned = earned.total;
  res.json(student);
});

app.post('/api/students', (req, res) => {
  const first_name = sanitize(req.body.first_name);
  const last_name = sanitize(req.body.last_name);
  const pin_code = req.body.pin_code || '0000';
  const class_number = req.body.class_number ? parseInt(req.body.class_number) : null;
  if (!first_name || !last_name) return res.status(400).json({ error: 'Prenom et nom requis' });

  const result = db.prepare('INSERT INTO students (first_name, last_name, pin_code, class_number) VALUES (?, ?, ?, ?)')
    .run(first_name, last_name, pin_code, class_number);

  // Initialize belts (Rose belt for all subjects)
  const subjects = db.prepare('SELECT id FROM subjects').all();
  const firstBelt = db.prepare('SELECT id FROM belt_colors WHERE rank = 1').get();
  if (firstBelt) {
    const insertBelt = db.prepare('INSERT INTO student_belts (student_id, subject_id, belt_color_id) VALUES (?, ?, ?)');
    for (const subject of subjects) {
      insertBelt.run(result.lastInsertRowid, subject.id, firstBelt.id);
    }
  }

  res.json({ id: result.lastInsertRowid, message: `${first_name} ${last_name} ajoute !` });
});

app.post('/api/students/bulk', (req, res) => {
  const { students: studentList } = req.body;
  if (!studentList || !Array.isArray(studentList) || studentList.length === 0) {
    return res.status(400).json({ error: 'Liste d\'eleves vide' });
  }

  const subjects = db.prepare('SELECT id FROM subjects').all();
  const firstBelt = db.prepare('SELECT id FROM belt_colors WHERE rank = 1').get();
  const insertStudent = db.prepare('INSERT INTO students (first_name, last_name, pin_code) VALUES (?, ?, ?)');
  const insertBelt = db.prepare('INSERT INTO student_belts (student_id, subject_id, belt_color_id) VALUES (?, ?, ?)');

  const created = [];
  const doBulk = db.transaction(() => {
    for (const s of studentList) {
      const fn = sanitize(s.first_name);
      const ln = sanitize(s.last_name);
      if (!fn || !ln) continue;
      const cn = s.class_number ? parseInt(s.class_number) : null;
      const result = insertStudent.run(fn, ln, s.pin_code || '0000');
      if (cn) db.prepare('UPDATE students SET class_number = ? WHERE id = ?').run(cn, result.lastInsertRowid);
      if (firstBelt) {
        for (const subject of subjects) {
          insertBelt.run(result.lastInsertRowid, subject.id, firstBelt.id);
        }
      }
      created.push({ id: result.lastInsertRowid, name: `${fn} ${ln}` });
    }
  });
  doBulk();

  res.json({ message: `${created.length} eleves crees !`, created });
});

app.post('/api/students/bulk-delete', (req, res) => {
  const { student_ids } = req.body;
  if (!student_ids || student_ids.length === 0) return res.status(400).json({ error: 'Aucun eleve selectionne' });

  const doDelete = db.transaction(() => {
    const stmt = db.prepare('UPDATE students SET is_active = 0 WHERE id = ?');
    for (const id of student_ids) {
      stmt.run(id);
    }
  });
  doDelete();

  res.json({ message: `${student_ids.length} eleves supprimes` });
});

app.delete('/api/students/:id', (req, res) => {
  db.prepare('UPDATE students SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Eleve desactive' });
});

// ==================== API AUTH ====================

app.post('/api/students/login', (req, res) => {
  const { id, pin_code } = req.body;
  const student = db.prepare('SELECT * FROM students WHERE id = ? AND pin_code = ? AND is_active = 1').get(id, pin_code);
  if (!student) return res.status(401).json({ error: 'Code PIN incorrect' });
  student.first_login = (student.pin_code === '0000');
  res.json(student);
});

app.put('/api/students/:id/pin', (req, res) => {
  const { new_pin } = req.body;
  if (!new_pin || new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
    return res.status(400).json({ error: 'Le code doit etre 4 chiffres' });
  }
  if (new_pin === '0000') {
    return res.status(400).json({ error: 'Choisis un code different de 0000 !' });
  }
  db.prepare('UPDATE students SET pin_code = ? WHERE id = ?').run(new_pin, req.params.id);
  res.json({ message: 'Code PIN change !' });
});

// Reset PIN (teacher only) - resets to 0000
app.put('/api/students/:id/pin/reset', (req, res) => {
  db.prepare('UPDATE students SET pin_code = ? WHERE id = ?').run('0000', req.params.id);
  const student = db.prepare('SELECT first_name, last_name FROM students WHERE id = ?').get(req.params.id);
  res.json({ message: `PIN de ${student.first_name} ${student.last_name} reinitialise a 0000` });
});

app.post('/api/banker/login', (req, res) => {
  const { code } = req.body;
  const student = db.prepare('SELECT * FROM students WHERE banker_code = ? AND is_active = 1').get(code);
  if (!student) return res.status(401).json({ error: 'Code banquier incorrect' });
  res.json(student);
});

app.post('/api/teacher/login', (req, res) => {
  const { pin } = req.body;
  const teacherPin = getConfig('teacher_pin') || '1234';
  if (pin === teacherPin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Code incorrect' });
  }
});

// Change teacher PIN
app.put('/api/teacher/pin', (req, res) => {
  const { old_pin, new_pin } = req.body;
  const currentPin = getConfig('teacher_pin') || '1234';
  if (old_pin !== currentPin) return res.status(401).json({ error: 'Ancien code incorrect' });
  if (!new_pin || new_pin.length < 4) return res.status(400).json({ error: 'Nouveau code trop court' });
  setConfig('teacher_pin', new_pin);
  res.json({ message: 'Code professeur modifie !' });
});

// Update class number
app.put('/api/students/:id/number', (req, res) => {
  const { class_number } = req.body;
  const cn = class_number ? parseInt(class_number) : null;
  db.prepare('UPDATE students SET class_number = ? WHERE id = ?').run(cn, req.params.id);
  const student = db.prepare('SELECT first_name, last_name FROM students WHERE id = ?').get(req.params.id);
  res.json({ message: `Numero de ${student.first_name} ${student.last_name} mis a jour` });
});

app.put('/api/students/:id/avatar', (req, res) => {
  const { avatar_config } = req.body;
  db.prepare('UPDATE students SET avatar_config = ? WHERE id = ?').run(JSON.stringify(avatar_config), req.params.id);
  res.json({ message: 'Avatar mis a jour !' });
});

// ==================== API TRANSACTIONS ====================

app.get('/api/students/:id/transactions', (req, res) => {
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE student_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(req.params.id);
  res.json(transactions);
});

app.get('/api/transactions/all', (req, res) => {
  const transactions = db.prepare(`
    SELECT t.*, s.first_name, s.last_name
    FROM transactions t
    JOIN students s ON t.student_id = s.id
    ORDER BY t.created_at DESC LIMIT 200
  `).all();
  res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
  const { student_id, amount, type, reason, created_by } = req.body;
  if (!student_id || !amount || !type) return res.status(400).json({ error: 'Donnees manquantes' });

  const student = db.prepare('SELECT balance FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Eleve non trouve' });

  let newBalance = student.balance;
  if (type === 'earn' || type === 'market_sell') {
    newBalance += Math.abs(amount);
  } else {
    newBalance -= Math.abs(amount);
  }

  db.prepare('UPDATE students SET balance = ? WHERE id = ?').run(newBalance, student_id);
  db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(student_id, Math.abs(amount), type, sanitize(reason || ''), created_by || 'teacher');

  res.json({ balance: newBalance, message: 'Transaction effectuee !' });
});

app.post('/api/transactions/bulk', (req, res) => {
  const { student_ids, amount, type, reason, created_by } = req.body;

  const updateBalance = db.prepare('UPDATE students SET balance = balance + ? WHERE id = ?');
  const insertTransaction = db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)');

  const doTransaction = db.transaction(() => {
    const effectiveAmount = (type === 'earn' || type === 'market_sell') ? Math.abs(amount) : -Math.abs(amount);
    for (const sid of student_ids) {
      updateBalance.run(effectiveAmount, sid);
      insertTransaction.run(sid, Math.abs(amount), type, sanitize(reason || ''), created_by || 'teacher');
    }
  });

  doTransaction();
  res.json({ message: `Transaction appliquee a ${student_ids.length} eleves` });
});

// Undo/reverse a transaction
app.post('/api/transactions/:id/reverse', (req, res) => {
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction non trouvee' });
  if (txn.is_reversed) return res.status(400).json({ error: 'Transaction deja annulee' });

  const doReverse = db.transaction(() => {
    // Reverse the balance effect
    const reverseAmount = (txn.type === 'earn' || txn.type === 'market_sell')
      ? -Math.abs(txn.amount)
      : Math.abs(txn.amount);
    db.prepare('UPDATE students SET balance = balance + ? WHERE id = ?').run(reverseAmount, txn.student_id);

    // Mark as reversed
    db.prepare('UPDATE transactions SET is_reversed = 1 WHERE id = ?').run(txn.id);

    // Log the reversal
    db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(txn.student_id, txn.amount, 'refund', `Annulation: ${txn.reason || 'transaction #' + txn.id}`, 'teacher');
  });
  doReverse();

  const newBalance = db.prepare('SELECT balance FROM students WHERE id = ?').get(txn.student_id).balance;
  res.json({ message: 'Transaction annulee !', balance: newBalance });
});

// ==================== API CEINTURES ====================

app.get('/api/belts/colors', (req, res) => {
  res.json(db.prepare('SELECT * FROM belt_colors ORDER BY rank').all());
});

app.get('/api/subjects', (req, res) => {
  res.json(db.prepare('SELECT * FROM subjects ORDER BY category, name').all());
});

app.get('/api/students/:id/belts', (req, res) => {
  const belts = db.prepare(`
    SELECT sb.*, s.name as subject_name, s.icon as subject_icon, s.category as subject_category,
           bc.name as belt_name, bc.color_hex, bc.text_hex, bc.rank
    FROM student_belts sb
    JOIN subjects s ON sb.subject_id = s.id
    JOIN belt_colors bc ON sb.belt_color_id = bc.id
    WHERE sb.student_id = ?
    ORDER BY s.category, s.name
  `).all(req.params.id);
  res.json(belts);
});

// Belt history for a student
app.get('/api/students/:id/belts/history', (req, res) => {
  const history = db.prepare(`
    SELECT bh.*, s.name as subject_name, bc.name as belt_name, bc.color_hex
    FROM belt_history bh
    JOIN subjects s ON bh.subject_id = s.id
    JOIN belt_colors bc ON bh.belt_color_id = bc.id
    WHERE bh.student_id = ?
    ORDER BY bh.achieved_at DESC LIMIT 50
  `).all(req.params.id);
  res.json(history);
});

app.put('/api/students/:id/belts/:subjectId', (req, res) => {
  const studentId = parseInt(req.params.id);
  const subjectId = parseInt(req.params.subjectId);

  const currentBelt = db.prepare(`
    SELECT sb.belt_color_id, bc.rank FROM student_belts sb
    JOIN belt_colors bc ON sb.belt_color_id = bc.id
    WHERE sb.student_id = ? AND sb.subject_id = ?
  `).get(studentId, subjectId);

  if (!currentBelt) return res.status(404).json({ error: 'Ceinture non trouvee' });

  const nextBelt = db.prepare('SELECT id, name FROM belt_colors WHERE rank = ?').get(currentBelt.rank + 1);
  if (!nextBelt) return res.status(400).json({ error: 'Deja au niveau maximum !' });

  const doUpgrade = db.transaction(() => {
    db.prepare('UPDATE student_belts SET belt_color_id = ?, achieved_at = CURRENT_TIMESTAMP WHERE student_id = ? AND subject_id = ?')
      .run(nextBelt.id, studentId, subjectId);

    // Log in history
    db.prepare('INSERT INTO belt_history (student_id, subject_id, belt_color_id, direction) VALUES (?, ?, ?, ?)')
      .run(studentId, subjectId, nextBelt.id, 'up');

    // Reward: rank * 50 centicools
    const reward = currentBelt.rank * 50;
    db.prepare('UPDATE students SET balance = balance + ? WHERE id = ?').run(reward, studentId);
    db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(studentId, reward, 'earn', `Ceinture ${nextBelt.name} obtenue !`, 'system');
  });
  doUpgrade();

  const reward = currentBelt.rank * 50;
  res.json({ message: `Ceinture ${nextBelt.name} obtenue ! +${reward} centicools`, reward });
});

// Set belt to specific level (teacher shortcut)
app.put('/api/students/:id/belts/:subjectId/set', (req, res) => {
  const studentId = parseInt(req.params.id);
  const subjectId = parseInt(req.params.subjectId);
  const { belt_rank } = req.body;

  const targetBelt = db.prepare('SELECT * FROM belt_colors WHERE rank = ?').get(belt_rank);
  if (!targetBelt) return res.status(400).json({ error: 'Rang de ceinture invalide' });

  const currentBelt = db.prepare(`
    SELECT sb.belt_color_id, bc.rank FROM student_belts sb
    JOIN belt_colors bc ON sb.belt_color_id = bc.id
    WHERE sb.student_id = ? AND sb.subject_id = ?
  `).get(studentId, subjectId);

  if (!currentBelt) return res.status(404).json({ error: 'Ceinture non trouvee' });

  const direction = belt_rank > currentBelt.rank ? 'up' : 'down';

  db.prepare('UPDATE student_belts SET belt_color_id = ?, achieved_at = CURRENT_TIMESTAMP WHERE student_id = ? AND subject_id = ?')
    .run(targetBelt.id, studentId, subjectId);

  db.prepare('INSERT INTO belt_history (student_id, subject_id, belt_color_id, direction) VALUES (?, ?, ?, ?)')
    .run(studentId, subjectId, targetBelt.id, direction);

  res.json({ message: `Ceinture definie a ${targetBelt.name}` });
});

app.put('/api/students/:id/belts/:subjectId/down', (req, res) => {
  const studentId = parseInt(req.params.id);
  const subjectId = parseInt(req.params.subjectId);

  const currentBelt = db.prepare(`
    SELECT sb.belt_color_id, bc.rank FROM student_belts sb
    JOIN belt_colors bc ON sb.belt_color_id = bc.id
    WHERE sb.student_id = ? AND sb.subject_id = ?
  `).get(studentId, subjectId);

  if (!currentBelt) return res.status(404).json({ error: 'Ceinture non trouvee' });
  if (currentBelt.rank <= 1) return res.status(400).json({ error: 'Deja au niveau minimum !' });

  const prevBelt = db.prepare('SELECT id, name FROM belt_colors WHERE rank = ?').get(currentBelt.rank - 1);

  db.prepare('UPDATE student_belts SET belt_color_id = ?, achieved_at = CURRENT_TIMESTAMP WHERE student_id = ? AND subject_id = ?')
    .run(prevBelt.id, studentId, subjectId);

  db.prepare('INSERT INTO belt_history (student_id, subject_id, belt_color_id, direction) VALUES (?, ?, ?, ?)')
    .run(studentId, subjectId, prevBelt.id, 'down');

  res.json({ message: `Ceinture redescendue a ${prevBelt.name}` });
});

// Bulk belt overview (all students, all subjects)
app.get('/api/belts/overview', (req, res) => {
  const data = db.prepare(`
    SELECT sb.student_id, s.first_name, s.last_name,
           sub.name as subject_name, sub.category as subject_category,
           bc.name as belt_name, bc.color_hex, bc.text_hex, bc.rank
    FROM student_belts sb
    JOIN students s ON sb.student_id = s.id
    JOIN subjects sub ON sb.subject_id = sub.id
    JOIN belt_colors bc ON sb.belt_color_id = bc.id
    WHERE s.is_active = 1
    ORDER BY s.first_name, sub.category, sub.name
  `).all();
  res.json(data);
});

// ==================== API METIERS ====================

app.get('/api/jobs', (req, res) => {
  res.json(db.prepare('SELECT * FROM jobs ORDER BY name').all());
});

app.get('/api/jobs/current', (req, res) => {
  const assignments = db.prepare(`
    SELECT ja.*, j.name as job_name, j.icon as job_icon, j.weekly_pay,
           s.first_name, s.last_name
    FROM job_assignments ja
    JOIN jobs j ON ja.job_id = j.id
    JOIN students s ON ja.student_id = s.id
    WHERE ja.week_start = date('now', 'weekday 0', '-6 days')
  `).all();
  res.json(assignments);
});

app.post('/api/jobs/assign', (req, res) => {
  const { assignments } = req.body;
  const weekStart = db.prepare("SELECT date('now', 'weekday 0', '-6 days') as d").get().d;

  db.prepare('DELETE FROM job_assignments WHERE week_start = ?').run(weekStart);

  const insert = db.prepare('INSERT INTO job_assignments (student_id, job_id, week_start) VALUES (?, ?, ?)');
  const bankerJob = db.prepare("SELECT id FROM jobs WHERE name = 'Banquier'").get();
  db.prepare('UPDATE students SET banker_code = NULL WHERE banker_code IS NOT NULL').run();

  for (const a of assignments) {
    insert.run(a.student_id, a.job_id, weekStart);
    if (bankerJob && a.job_id === bankerJob.id) {
      const code = generateBankerCode();
      db.prepare('UPDATE students SET banker_code = ? WHERE id = ?').run(code, a.student_id);
    }
  }
  res.json({ message: 'Metiers attribues !' });
});

app.post('/api/jobs/pay', (req, res) => {
  const weekStart = db.prepare("SELECT date('now', 'weekday 0', '-6 days') as d").get().d;
  const unpaid = db.prepare(`
    SELECT ja.*, j.weekly_pay, j.name as job_name FROM job_assignments ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE ja.week_start = ? AND ja.paid = 0
  `).all(weekStart);

  const pay = db.transaction(() => {
    for (const assignment of unpaid) {
      db.prepare('UPDATE students SET balance = balance + ? WHERE id = ?').run(assignment.weekly_pay, assignment.student_id);
      db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(assignment.student_id, assignment.weekly_pay, 'earn', `Salaire : ${assignment.job_name}`, 'system');
      db.prepare('UPDATE job_assignments SET paid = 1 WHERE id = ?').run(assignment.id);
    }
  });
  pay();

  res.json({ message: `${unpaid.length} salaires verses !` });
});

// ==================== API PASSES JOURNALIERS ====================

const PASS_TYPES = {
  'jeux': { name: 'Passe Jeux', price: 20, icon: '🎮', desc: 'Acces jeux Lego + Salle de jeux' }
};

// Get today's passes for a student
app.get('/api/students/:id/passes', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const passes = db.prepare(`
    SELECT * FROM daily_passes WHERE student_id = ? AND pass_date = ?
  `).all(req.params.id, today);
  res.json({ passes, pass_types: PASS_TYPES, today });
});

// Get all passes for today (teacher view)
app.get('/api/passes/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const passes = db.prepare(`
    SELECT dp.*, s.first_name, s.last_name
    FROM daily_passes dp
    JOIN students s ON dp.student_id = s.id
    WHERE dp.pass_date = ?
    ORDER BY dp.purchased_at DESC
  `).all(today);
  res.json({ passes, today });
});

// Buy a daily pass
app.post('/api/passes/buy', (req, res) => {
  const { student_id, pass_type } = req.body;
  const passInfo = PASS_TYPES[pass_type];
  if (!passInfo) return res.status(400).json({ error: 'Type de passe invalide' });

  const student = db.prepare('SELECT balance FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Eleve non trouve' });
  if (student.balance < passInfo.price) {
    return res.status(400).json({ error: `Pas assez de centicools ! Il te faut ${passInfo.price} cc (2 decicools).` });
  }

  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT id FROM daily_passes WHERE student_id = ? AND pass_type = ? AND pass_date = ?').get(student_id, pass_type, today);
  if (existing) return res.status(400).json({ error: 'Tu as deja ton passe pour aujourd\'hui !' });

  const doBuy = db.transaction(() => {
    db.prepare('UPDATE students SET balance = balance - ? WHERE id = ?').run(passInfo.price, student_id);
    db.prepare('INSERT INTO daily_passes (student_id, pass_type, pass_date) VALUES (?, ?, ?)').run(student_id, pass_type, today);
    db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(student_id, passInfo.price, 'spend', `${passInfo.name} du jour`, 'pass');
  });
  doBuy();

  const newBalance = db.prepare('SELECT balance FROM students WHERE id = ?').get(student_id).balance;
  res.json({ message: `${passInfo.name} achete ! Bonne journee de jeux ! 🎮`, balance: newBalance });
});

// Buy passes for a group of students (banker/teacher)
app.post('/api/passes/buy-group', (req, res) => {
  const { student_ids, pass_type } = req.body;
  const passInfo = PASS_TYPES[pass_type];
  if (!passInfo) return res.status(400).json({ error: 'Type de passe invalide' });
  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: 'Aucun eleve selectionne' });
  }

  const today = new Date().toISOString().split('T')[0];
  const results = { success: [], errors: [] };

  const doBuyGroup = db.transaction(() => {
    for (const sid of student_ids) {
      const student = db.prepare('SELECT id, first_name, balance FROM students WHERE id = ?').get(sid);
      if (!student) { results.errors.push({ id: sid, reason: 'Eleve non trouve' }); continue; }
      if (student.balance < passInfo.price) { results.errors.push({ id: sid, name: student.first_name, reason: 'Pas assez de cc' }); continue; }
      const existing = db.prepare('SELECT id FROM daily_passes WHERE student_id = ? AND pass_type = ? AND pass_date = ?').get(sid, pass_type, today);
      if (existing) { results.errors.push({ id: sid, name: student.first_name, reason: 'Deja achete' }); continue; }

      db.prepare('UPDATE students SET balance = balance - ? WHERE id = ?').run(passInfo.price, sid);
      db.prepare('INSERT INTO daily_passes (student_id, pass_type, pass_date) VALUES (?, ?, ?)').run(sid, pass_type, today);
      db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(sid, passInfo.price, 'spend', `${passInfo.name} du jour`, 'pass-group');
      results.success.push({ id: sid, name: student.first_name });
    }
  });
  doBuyGroup();

  const msg = results.success.length > 0
    ? `${results.success.length} passe(s) achete(s) ! 🎮`
    : 'Aucun passe achete.';
  res.json({ message: msg, results });
});

// Get students eligible for pass today (balance >= price, no pass yet)
app.get('/api/passes/eligible/:pass_type', (req, res) => {
  const passInfo = PASS_TYPES[req.params.pass_type];
  if (!passInfo) return res.status(400).json({ error: 'Type de passe invalide' });
  const today = new Date().toISOString().split('T')[0];

  const students = db.prepare(`
    SELECT s.id, s.first_name, s.last_name, s.balance, s.class_number, s.avatar_config,
      CASE WHEN dp.id IS NOT NULL THEN 1 ELSE 0 END as has_pass
    FROM students s
    LEFT JOIN daily_passes dp ON dp.student_id = s.id AND dp.pass_type = ? AND dp.pass_date = ?
    ORDER BY s.first_name
  `).all(req.params.pass_type, today);

  res.json({
    students: students.map(s => ({
      ...s,
      can_buy: s.balance >= passInfo.price && !s.has_pass,
      has_pass: !!s.has_pass
    })),
    price: passInfo.price,
    today
  });
});

// ==================== API BOUTIQUE ====================

app.get('/api/shop', (req, res) => {
  const categories = db.prepare('SELECT * FROM shop_categories ORDER BY id').all();
  const items = db.prepare('SELECT * FROM shop_items WHERE is_available = 1 ORDER BY price').all();
  res.json({ categories, items });
});

app.get('/api/students/:id/purchases', (req, res) => {
  const purchases = db.prepare(`
    SELECT p.*, si.name, si.item_type, si.item_data
    FROM purchases p
    JOIN shop_items si ON p.item_id = si.id
    WHERE p.student_id = ?
    ORDER BY p.purchased_at DESC
  `).all(req.params.id);
  res.json(purchases);
});

app.post('/api/shop/buy', (req, res) => {
  const { student_id, item_id } = req.body;

  const student = db.prepare('SELECT balance FROM students WHERE id = ?').get(student_id);
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ? AND is_available = 1').get(item_id);

  if (!student) return res.status(404).json({ error: 'Eleve non trouve' });
  if (!item) return res.status(404).json({ error: 'Article non disponible' });

  const alreadyOwned = db.prepare('SELECT id FROM purchases WHERE student_id = ? AND item_id = ?').get(student_id, item_id);
  if (alreadyOwned) return res.status(400).json({ error: 'Tu as deja cet article !' });

  if (student.balance < item.price) {
    return res.status(400).json({ error: `Pas assez de centicools ! Il te manque ${item.price - student.balance} centicools.` });
  }

  const buy = db.transaction(() => {
    db.prepare('UPDATE students SET balance = balance - ? WHERE id = ?').run(item.price, student_id);
    db.prepare('INSERT INTO purchases (student_id, item_id) VALUES (?, ?)').run(student_id, item_id);
    db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(student_id, item.price, 'spend', `Achat : ${item.name}`, 'shop');
  });
  buy();

  const newBalance = db.prepare('SELECT balance FROM students WHERE id = ?').get(student_id).balance;
  res.json({ message: `${item.name} achete !`, balance: newBalance });
});

// ==================== API MARCHE ====================

app.get('/api/market', (req, res) => {
  const items = db.prepare(`
    SELECT mi.*, s.first_name as seller_name
    FROM market_items mi
    LEFT JOIN students s ON mi.seller_id = s.id
    WHERE mi.is_sold = 0
    ORDER BY mi.price
  `).all();
  res.json(items);
});

app.post('/api/market/add', (req, res) => {
  const { seller_id, name, description, price } = req.body;
  const today = new Date().toISOString().split('T')[0];
  db.prepare('INSERT INTO market_items (seller_id, name, description, price, market_date) VALUES (?, ?, ?, ?, ?)')
    .run(seller_id || null, sanitize(name), sanitize(description || ''), price, today);
  res.json({ message: 'Article ajoute au marche !' });
});

app.post('/api/market/buy', (req, res) => {
  const { buyer_id, item_id } = req.body;

  const buyer = db.prepare('SELECT * FROM students WHERE id = ?').get(buyer_id);
  const item = db.prepare('SELECT * FROM market_items WHERE id = ? AND is_sold = 0').get(item_id);

  if (!buyer) return res.status(404).json({ error: 'Acheteur non trouve' });
  if (!item) return res.status(404).json({ error: 'Article non disponible' });
  if (buyer.balance < 0) return res.status(400).json({ error: 'Solde negatif ! Tu ne peux pas participer au marche.' });
  if (buyer.balance < item.price) return res.status(400).json({ error: 'Pas assez de centicools !' });

  const buy = db.transaction(() => {
    db.prepare('UPDATE students SET balance = balance - ? WHERE id = ?').run(item.price, buyer_id);
    db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(buyer_id, item.price, 'market_buy', `Marche : ${item.name}`, 'market');

    if (item.seller_id) {
      db.prepare('UPDATE students SET balance = balance + ? WHERE id = ?').run(item.price, item.seller_id);
      db.prepare('INSERT INTO transactions (student_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(item.seller_id, item.price, 'market_sell', `Vente marche : ${item.name}`, 'market');
    }

    db.prepare('UPDATE market_items SET is_sold = 1, buyer_id = ? WHERE id = ?').run(buyer_id, item_id);
  });
  buy();

  res.json({ message: `${item.name} achete au marche !` });
});

// ==================== API STATS ====================

app.get('/api/stats', (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students WHERE is_active = 1').get().count;
  const totalCool = db.prepare('SELECT SUM(balance) as total FROM students WHERE is_active = 1').get().total || 0;
  const negativeStudents = db.prepare('SELECT COUNT(*) as count FROM students WHERE balance < 0 AND is_active = 1').get().count;
  const richest = db.prepare('SELECT first_name, last_name, balance FROM students WHERE is_active = 1 ORDER BY balance DESC LIMIT 5').all();
  const poorest = db.prepare('SELECT first_name, last_name, balance FROM students WHERE is_active = 1 ORDER BY balance ASC LIMIT 5').all();
  const avgBalance = db.prepare('SELECT AVG(balance) as avg FROM students WHERE is_active = 1').get().avg || 0;

  // Belt stats
  const beltDistribution = db.prepare(`
    SELECT bc.name, bc.color_hex, COUNT(*) as count
    FROM student_belts sb
    JOIN belt_colors bc ON sb.belt_color_id = bc.id
    JOIN students s ON sb.student_id = s.id
    WHERE s.is_active = 1
    GROUP BY bc.id
    ORDER BY bc.rank
  `).all();

  res.json({ totalStudents, totalCool, negativeStudents, richest, poorest, avgBalance, beltDistribution });
});

// ==================== BACKUP ====================

app.get('/api/backup', (req, res) => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `cool-school-${timestamp}.db`);

  db.backup(backupPath).then(() => {
    res.json({ message: `Sauvegarde creee: cool-school-${timestamp}.db`, path: backupPath });
  }).catch(err => {
    res.status(500).json({ error: 'Erreur de sauvegarde: ' + err.message });
  });
});

// Export data as JSON
app.get('/api/export', (req, res) => {
  const data = {
    students: db.prepare('SELECT * FROM students WHERE is_active = 1').all(),
    belts: db.prepare(`
      SELECT sb.student_id, s.name as subject, bc.name as belt, bc.rank
      FROM student_belts sb
      JOIN subjects sub ON sb.subject_id = sub.id
      JOIN belt_colors bc ON sb.belt_color_id = bc.id
      JOIN students s ON sb.student_id = s.id
      WHERE s.is_active = 1
    `).all(),
    transactions: db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 500').all(),
    config: db.prepare("SELECT * FROM config WHERE key != 'teacher_pin'").all(),
    exported_at: new Date().toISOString()
  };
  res.json(data);
});

// ==================== START ====================

app.listen(PORT, () => {
  const teacherPin = getConfig('teacher_pin') || '1234';
  const schoolName = getConfig('school_name') || 'Cool School';
  console.log(`\n🏦 COOL School Bank - ${schoolName}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`👨‍🏫 Code prof : ${teacherPin}`);
  console.log(`👦 Code eleve par defaut : 0000`);
  console.log(`📊 11 ceintures | 20 matieres | Systeme La HERSE\n`);
});
