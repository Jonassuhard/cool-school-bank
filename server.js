const express = require('express');
const path = require('path');
const db = require('./database');
const { FieldValue } = require('firebase-admin/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: convert Firestore doc to plain object with id
function docToObj(doc) {
  return { id: doc.id, ...doc.data() };
}

// Helper: get current week start (Monday) as YYYY-MM-DD
function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

// Helper: generate unique 5-digit banker code
async function generateBankerCode() {
  let code;
  let exists = true;
  while (exists) {
    code = String(Math.floor(10000 + Math.random() * 90000));
    const snap = await db.collection('students').where('banker_code', '==', code).limit(1).get();
    exists = !snap.empty;
  }
  return code;
}

// ==================== API ÉLÈVES ====================

// Liste tous les élèves (version publique, sans codes)
app.get('/api/students', async (req, res) => {
  try {
    const snap = await db.collection('students')
      .where('is_active', '==', true)
      .orderBy('first_name')
      .get();
    const students = snap.docs.map(doc => {
      const d = doc.data();
      return { id: doc.id, first_name: d.first_name, last_name: d.last_name, avatar_config: d.avatar_config, balance: d.balance, is_active: d.is_active };
    });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste tous les élèves (version prof, avec codes PIN + banquier)
app.get('/api/students/admin', async (req, res) => {
  try {
    const snap = await db.collection('students')
      .where('is_active', '==', true)
      .orderBy('first_name')
      .get();
    const students = snap.docs.map(doc => {
      const d = doc.data();
      return { id: doc.id, first_name: d.first_name, last_name: d.last_name, avatar_config: d.avatar_config, pin_code: d.pin_code, banker_code: d.banker_code, balance: d.balance, is_active: d.is_active };
    });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Un élève par ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const doc = await db.collection('students').doc(req.params.id).get();
    if (!doc.exists || !doc.data().is_active) return res.status(404).json({ error: 'Élève non trouvé' });
    res.json(docToObj(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un élève
app.post('/api/students', async (req, res) => {
  try {
    const { first_name, last_name, pin_code } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'Prénom et nom requis' });

    const studentRef = db.collection('students').doc();
    await studentRef.set({
      first_name,
      last_name,
      avatar_config: '{}',
      pin_code: pin_code || '0000',
      banker_code: null,
      balance: 0,
      is_active: true,
      created_at: new Date().toISOString()
    });

    // Initialize belts (white belt for all subjects)
    const subjectsSnap = await db.collection('subjects').get();
    const whiteBeltSnap = await db.collection('belt_colors').where('rank', '==', 1).limit(1).get();
    const whiteBeltId = whiteBeltSnap.docs[0].id;

    const batch = db.batch();
    for (const subDoc of subjectsSnap.docs) {
      const beltRef = db.collection('student_belts').doc(`${studentRef.id}_${subDoc.id}`);
      batch.set(beltRef, {
        student_id: studentRef.id,
        subject_id: subDoc.id,
        belt_color_id: whiteBeltId,
        sub_level: 0,
        achieved_at: new Date().toISOString()
      });
    }
    await batch.commit();

    res.json({ id: studentRef.id, message: `${first_name} ${last_name} ajouté !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer plusieurs élèves d'un coup
app.post('/api/students/bulk', async (req, res) => {
  try {
    const { students: studentList } = req.body;
    if (!studentList || !Array.isArray(studentList) || studentList.length === 0) {
      return res.status(400).json({ error: "Liste d'élèves vide" });
    }

    const subjectsSnap = await db.collection('subjects').get();
    const whiteBeltSnap = await db.collection('belt_colors').where('rank', '==', 1).limit(1).get();
    const whiteBeltId = whiteBeltSnap.docs[0].id;

    const created = [];

    for (const s of studentList) {
      if (!s.first_name || !s.last_name) continue;

      const studentRef = db.collection('students').doc();
      await studentRef.set({
        first_name: s.first_name,
        last_name: s.last_name,
        avatar_config: '{}',
        pin_code: s.pin_code || '0000',
        banker_code: null,
        balance: 0,
        is_active: true,
        created_at: new Date().toISOString()
      });

      // Initialize belts in batches
      const batch = db.batch();
      for (const subDoc of subjectsSnap.docs) {
        const beltRef = db.collection('student_belts').doc(`${studentRef.id}_${subDoc.id}`);
        batch.set(beltRef, {
          student_id: studentRef.id,
          subject_id: subDoc.id,
          belt_color_id: whiteBeltId,
          sub_level: 0,
          achieved_at: new Date().toISOString()
        });
      }
      await batch.commit();

      created.push({ id: studentRef.id, name: `${s.first_name} ${s.last_name}` });
    }

    res.json({ message: `${created.length} élèves créés !`, created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Suppression en masse
app.post('/api/students/bulk-delete', async (req, res) => {
  try {
    const { student_ids } = req.body;
    if (!student_ids || student_ids.length === 0) return res.status(400).json({ error: 'Aucun élève sélectionné' });

    const batch = db.batch();
    for (const id of student_ids) {
      batch.update(db.collection('students').doc(id), { is_active: false });
    }
    await batch.commit();

    res.json({ message: `${student_ids.length} élèves supprimés` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login élève (par PIN)
app.post('/api/students/login', async (req, res) => {
  try {
    const { id, pin_code } = req.body;
    const doc = await db.collection('students').doc(id).get();
    if (!doc.exists) return res.status(401).json({ error: 'Code PIN incorrect' });
    const student = doc.data();
    if (student.pin_code !== pin_code || !student.is_active) {
      return res.status(401).json({ error: 'Code PIN incorrect' });
    }
    res.json({ id: doc.id, ...student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login banquier (par code 5 chiffres)
app.post('/api/banker/login', async (req, res) => {
  try {
    const { code } = req.body;
    const snap = await db.collection('students')
      .where('banker_code', '==', code)
      .where('is_active', '==', true)
      .limit(1)
      .get();
    if (snap.empty) return res.status(401).json({ error: 'Code banquier incorrect' });
    res.json(docToObj(snap.docs[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour l'avatar
app.put('/api/students/:id/avatar', async (req, res) => {
  try {
    const { avatar_config } = req.body;
    await db.collection('students').doc(req.params.id).update({
      avatar_config: JSON.stringify(avatar_config)
    });
    res.json({ message: 'Avatar mis à jour !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API TRANSACTIONS ====================

// Historique d'un élève (avec pagination)
app.get('/api/students/:id/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));

    // Get total count
    const allSnap = await db.collection('transactions')
      .where('student_id', '==', req.params.id)
      .get();
    const total = allSnap.size;

    // Paginated query
    const offset = (page - 1) * limit;
    const snap = await db.collection('transactions')
      .where('student_id', '==', req.params.id)
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)
      .get();

    const transactions = snap.docs.map(docToObj);
    res.json({ transactions, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Historique global (prof)
app.get('/api/transactions/all', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const totalSnap = await db.collection('transactions').get();
    const total = totalSnap.size;

    const snap = await db.collection('transactions')
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)
      .get();

    // Denormalize: fetch student names
    const transactions = [];
    for (const doc of snap.docs) {
      const t = docToObj(doc);
      const studentDoc = await db.collection('students').doc(t.student_id).get();
      if (studentDoc.exists) {
        const s = studentDoc.data();
        t.first_name = s.first_name;
        t.last_name = s.last_name;
      }
      transactions.push(t);
    }

    res.json({ transactions, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter/retirer des COOL (prof ou banquier)
app.post('/api/transactions', async (req, res) => {
  try {
    const { student_id, amount, type, reason, created_by } = req.body;
    if (!student_id || !amount || !type) return res.status(400).json({ error: 'Données manquantes' });

    const studentRef = db.collection('students').doc(student_id);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists) return res.status(404).json({ error: 'Élève non trouvé' });

    const student = studentDoc.data();
    let newBalance = student.balance;
    if (type === 'earn' || type === 'market_sell') {
      newBalance += Math.abs(amount);
    } else {
      newBalance -= Math.abs(amount);
    }

    await studentRef.update({ balance: newBalance });
    await db.collection('transactions').doc().set({
      student_id,
      amount,
      type,
      reason: reason || null,
      created_by: created_by || 'teacher',
      created_at: new Date().toISOString()
    });

    res.json({ balance: newBalance, message: 'Transaction effectuée !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Transaction groupée (donner/retirer à plusieurs élèves)
app.post('/api/transactions/bulk', async (req, res) => {
  try {
    const { student_ids, amount, type, reason, created_by } = req.body;
    const effectiveAmount = (type === 'earn' || type === 'market_sell') ? Math.abs(amount) : -Math.abs(amount);

    // Firestore batches max 500 ops; each student = 2 ops (update + insert)
    // Process in chunks if needed
    const chunkSize = 250; // 250 students * 2 ops = 500
    for (let i = 0; i < student_ids.length; i += chunkSize) {
      const chunk = student_ids.slice(i, i + chunkSize);
      const batch = db.batch();
      for (const sid of chunk) {
        const studentRef = db.collection('students').doc(sid);
        batch.update(studentRef, { balance: FieldValue.increment(effectiveAmount) });
        const txRef = db.collection('transactions').doc();
        batch.set(txRef, {
          student_id: sid,
          amount: Math.abs(amount),
          type,
          reason: reason || null,
          created_by: created_by || 'teacher',
          created_at: new Date().toISOString()
        });
      }
      await batch.commit();
    }

    res.json({ message: `Transaction appliquée à ${student_ids.length} élèves` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API CEINTURES ====================

app.get('/api/students/:id/belts', async (req, res) => {
  try {
    const snap = await db.collection('student_belts')
      .where('student_id', '==', req.params.id)
      .get();

    // Fetch all subjects and belt_colors for denormalization
    const [subjectsSnap, colorsSnap] = await Promise.all([
      db.collection('subjects').get(),
      db.collection('belt_colors').get()
    ]);

    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = d.data(); });
    const colorsMap = {};
    colorsSnap.docs.forEach(d => { colorsMap[d.id] = d.data(); });

    const belts = snap.docs.map(doc => {
      const b = docToObj(doc);
      const subject = subjectsMap[b.subject_id] || {};
      const color = colorsMap[b.belt_color_id] || {};
      return {
        ...b,
        subject_name: subject.name,
        subject_icon: subject.icon,
        belt_name: color.name,
        color_hex: color.color_hex,
        rank: color.rank
      };
    });

    // Sort by subject name
    belts.sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || ''));
    res.json(belts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/students/:id/belts/:subjectId', async (req, res) => {
  try {
    const studentId = req.params.id;
    const subjectId = req.params.subjectId;
    const { reward } = req.body || {};

    const beltDocId = `${studentId}_${subjectId}`;
    const beltDoc = await db.collection('student_belts').doc(beltDocId).get();
    if (!beltDoc.exists) return res.status(404).json({ error: 'Ceinture non trouvée' });

    const belt = beltDoc.data();
    const currentColorDoc = await db.collection('belt_colors').doc(belt.belt_color_id).get();
    const currentRank = currentColorDoc.data().rank;

    // Find next belt
    const nextSnap = await db.collection('belt_colors').where('rank', '==', currentRank + 1).limit(1).get();
    if (nextSnap.empty) return res.status(400).json({ error: 'Déjà au niveau maximum !' });

    const nextBelt = nextSnap.docs[0];
    const nextBeltData = nextBelt.data();

    await db.collection('student_belts').doc(beltDocId).update({
      belt_color_id: nextBelt.id,
      sub_level: 0,
      achieved_at: new Date().toISOString()
    });

    // Optional reward
    if (reward && reward > 0) {
      const studentRef = db.collection('students').doc(studentId);
      await studentRef.update({ balance: FieldValue.increment(reward) });
      await db.collection('transactions').doc().set({
        student_id: studentId,
        amount: reward,
        type: 'earn',
        reason: `Ceinture ${nextBeltData.name} obtenue !`,
        created_by: 'teacher',
        created_at: new Date().toISOString()
      });
      res.json({ message: `Ceinture ${nextBeltData.name} obtenue ! +${reward} centicools` });
    } else {
      res.json({ message: `Ceinture ${nextBeltData.name} obtenue !` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Monter/descendre un palier intermédiaire
app.put('/api/students/:id/belts/:subjectId/sublevel', async (req, res) => {
  try {
    const studentId = req.params.id;
    const subjectId = req.params.subjectId;
    const { direction } = req.body;

    const beltDocId = `${studentId}_${subjectId}`;
    const beltDoc = await db.collection('student_belts').doc(beltDocId).get();
    if (!beltDoc.exists) return res.status(404).json({ error: 'Ceinture non trouvée' });

    const current = beltDoc.data();
    const newLevel = direction === 'up' ? (current.sub_level || 0) + 1 : Math.max(0, (current.sub_level || 0) - 1);

    await db.collection('student_belts').doc(beltDocId).update({ sub_level: newLevel });
    res.json({ message: `Palier ${newLevel}`, sub_level: newLevel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Profil complet d'un élève (pour vue classe)
app.get('/api/students/:id/profile', async (req, res) => {
  try {
    const studentDoc = await db.collection('students').doc(req.params.id).get();
    if (!studentDoc.exists || !studentDoc.data().is_active) {
      return res.status(404).json({ error: 'Élève non trouvé' });
    }

    const student = { id: studentDoc.id, ...studentDoc.data() };

    // Belts
    const [beltsSnap, subjectsSnap, colorsSnap] = await Promise.all([
      db.collection('student_belts').where('student_id', '==', req.params.id).get(),
      db.collection('subjects').get(),
      db.collection('belt_colors').get()
    ]);

    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = d.data(); });
    const colorsMap = {};
    colorsSnap.docs.forEach(d => { colorsMap[d.id] = d.data(); });

    const belts = beltsSnap.docs.map(doc => {
      const b = docToObj(doc);
      const subject = subjectsMap[b.subject_id] || {};
      const color = colorsMap[b.belt_color_id] || {};
      return { ...b, subject_name: subject.name, subject_icon: subject.icon, belt_name: color.name, color_hex: color.color_hex, rank: color.rank };
    }).sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || ''));

    // Recent transactions
    const txSnap = await db.collection('transactions')
      .where('student_id', '==', req.params.id)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    const transactions = txSnap.docs.map(docToObj);

    // Current job
    const weekStart = getCurrentWeekStart();
    const jobAssignSnap = await db.collection('job_assignments')
      .where('student_id', '==', req.params.id)
      .where('week_start', '==', weekStart)
      .limit(1)
      .get();

    let job = null;
    if (!jobAssignSnap.empty) {
      const assignment = jobAssignSnap.docs[0].data();
      const jobDoc = await db.collection('jobs').doc(assignment.job_id).get();
      if (jobDoc.exists) {
        const j = jobDoc.data();
        job = { name: j.name, icon: j.icon };
      }
    }

    // Remove sensitive data
    delete student.pin_code;
    delete student.banker_code;

    res.json({ student, belts, transactions, job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Descendre de ceinture
app.put('/api/students/:id/belts/:subjectId/down', async (req, res) => {
  try {
    const studentId = req.params.id;
    const subjectId = req.params.subjectId;

    const beltDocId = `${studentId}_${subjectId}`;
    const beltDoc = await db.collection('student_belts').doc(beltDocId).get();
    if (!beltDoc.exists) return res.status(404).json({ error: 'Ceinture non trouvée' });

    const belt = beltDoc.data();
    const currentColorDoc = await db.collection('belt_colors').doc(belt.belt_color_id).get();
    const currentRank = currentColorDoc.data().rank;

    if (currentRank <= 1) return res.status(400).json({ error: 'Déjà au niveau minimum !' });

    const prevSnap = await db.collection('belt_colors').where('rank', '==', currentRank - 1).limit(1).get();
    const prevBelt = prevSnap.docs[0];

    await db.collection('student_belts').doc(beltDocId).update({
      belt_color_id: prevBelt.id,
      achieved_at: new Date().toISOString()
    });

    res.json({ message: `Ceinture redescendue à ${prevBelt.data().name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/belts/colors', async (req, res) => {
  try {
    const snap = await db.collection('belt_colors').orderBy('rank').get();
    res.json(snap.docs.map(docToObj));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/subjects', async (req, res) => {
  try {
    const snap = await db.collection('subjects').orderBy('name').get();
    res.json(snap.docs.map(docToObj));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API MÉTIERS ====================

app.get('/api/jobs', async (req, res) => {
  try {
    const snap = await db.collection('jobs').orderBy('name').get();
    res.json(snap.docs.map(docToObj));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/jobs/current', async (req, res) => {
  try {
    const weekStart = getCurrentWeekStart();
    const snap = await db.collection('job_assignments')
      .where('week_start', '==', weekStart)
      .get();

    const assignments = [];
    for (const doc of snap.docs) {
      const a = docToObj(doc);
      const [jobDoc, studentDoc] = await Promise.all([
        db.collection('jobs').doc(a.job_id).get(),
        db.collection('students').doc(a.student_id).get()
      ]);
      const job = jobDoc.exists ? jobDoc.data() : {};
      const student = studentDoc.exists ? studentDoc.data() : {};
      assignments.push({
        ...a,
        job_name: job.name,
        job_icon: job.icon,
        weekly_pay: job.weekly_pay,
        first_name: student.first_name,
        last_name: student.last_name
      });
    }
    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/jobs/assign', async (req, res) => {
  try {
    const { assignments } = req.body;
    const weekStart = getCurrentWeekStart();

    // Find banker job
    const bankerSnap = await db.collection('jobs').where('name', '==', 'Banquier').limit(1).get();
    const bankerJobId = bankerSnap.empty ? null : bankerSnap.docs[0].id;

    // Clear previous banker codes for this week
    if (bankerJobId) {
      const prevBankerSnap = await db.collection('job_assignments')
        .where('job_id', '==', bankerJobId)
        .where('week_start', '==', weekStart)
        .get();
      const clearBatch = db.batch();
      for (const doc of prevBankerSnap.docs) {
        clearBatch.update(db.collection('students').doc(doc.data().student_id), { banker_code: null });
      }
      await clearBatch.commit();
    }

    // Delete old assignments for this week
    const oldAssignSnap = await db.collection('job_assignments')
      .where('week_start', '==', weekStart)
      .get();
    const deleteBatch = db.batch();
    for (const doc of oldAssignSnap.docs) {
      deleteBatch.delete(doc.ref);
    }
    await deleteBatch.commit();

    // Create new assignments
    for (const a of assignments) {
      await db.collection('job_assignments').doc().set({
        student_id: a.student_id,
        job_id: a.job_id,
        week_start: weekStart,
        paid: false
      });

      // If banker, generate code
      if (bankerJobId && a.job_id === bankerJobId) {
        const code = await generateBankerCode();
        await db.collection('students').doc(a.student_id).update({ banker_code: code });
      }
    }

    res.json({ message: 'Métiers attribués !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/jobs/pay', async (req, res) => {
  try {
    const weekStart = getCurrentWeekStart();
    const snap = await db.collection('job_assignments')
      .where('week_start', '==', weekStart)
      .where('paid', '==', false)
      .get();

    let count = 0;
    for (const doc of snap.docs) {
      const assignment = doc.data();
      const jobDoc = await db.collection('jobs').doc(assignment.job_id).get();
      if (!jobDoc.exists) continue;
      const job = jobDoc.data();

      const batch = db.batch();
      batch.update(db.collection('students').doc(assignment.student_id), {
        balance: FieldValue.increment(job.weekly_pay)
      });
      batch.set(db.collection('transactions').doc(), {
        student_id: assignment.student_id,
        amount: job.weekly_pay,
        type: 'earn',
        reason: `Salaire : ${job.name}`,
        created_by: 'system',
        created_at: new Date().toISOString()
      });
      batch.update(doc.ref, { paid: true });
      await batch.commit();
      count++;
    }

    res.json({ message: `${count} salaires versés !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API BOUTIQUE ====================

app.get('/api/shop', async (req, res) => {
  try {
    const [catSnap, itemSnap] = await Promise.all([
      db.collection('shop_categories').get(),
      db.collection('shop_items').where('is_available', '==', true).orderBy('price').get()
    ]);
    const categories = catSnap.docs.map(docToObj);
    const items = itemSnap.docs.map(docToObj);
    res.json({ categories, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/students/:id/purchases', async (req, res) => {
  try {
    const snap = await db.collection('purchases')
      .where('student_id', '==', req.params.id)
      .orderBy('purchased_at', 'desc')
      .get();

    const purchases = [];
    for (const doc of snap.docs) {
      const p = docToObj(doc);
      const itemDoc = await db.collection('shop_items').doc(p.item_id).get();
      if (itemDoc.exists) {
        const item = itemDoc.data();
        p.name = item.name;
        p.item_type = item.item_type;
        p.item_data = item.item_data;
      }
      purchases.push(p);
    }
    res.json(purchases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/shop/buy', async (req, res) => {
  try {
    const { student_id, item_id } = req.body;

    const [studentDoc, itemDoc] = await Promise.all([
      db.collection('students').doc(student_id).get(),
      db.collection('shop_items').doc(item_id).get()
    ]);

    if (!studentDoc.exists) return res.status(404).json({ error: 'Élève non trouvé' });
    const item = itemDoc.exists ? itemDoc.data() : null;
    if (!item || !item.is_available) return res.status(404).json({ error: 'Article non disponible' });

    const student = studentDoc.data();

    // Check if already owned
    const ownedSnap = await db.collection('purchases')
      .where('student_id', '==', student_id)
      .where('item_id', '==', item_id)
      .limit(1)
      .get();
    if (!ownedSnap.empty) return res.status(400).json({ error: 'Tu as déjà cet article !' });

    if (student.balance < item.price) {
      return res.status(400).json({ error: `Pas assez de centicools ! Il te manque ${item.price - student.balance} centicools.` });
    }

    // Perform purchase in batch
    const batch = db.batch();
    batch.update(db.collection('students').doc(student_id), {
      balance: FieldValue.increment(-item.price)
    });
    batch.set(db.collection('purchases').doc(), {
      student_id,
      item_id,
      purchased_at: new Date().toISOString()
    });
    batch.set(db.collection('transactions').doc(), {
      student_id,
      amount: item.price,
      type: 'spend',
      reason: `Achat : ${item.name}`,
      created_by: 'shop',
      created_at: new Date().toISOString()
    });
    await batch.commit();

    const updatedDoc = await db.collection('students').doc(student_id).get();
    res.json({ message: `${item.name} acheté !`, balance: updatedDoc.data().balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API MARCHÉ ====================

app.get('/api/market', async (req, res) => {
  try {
    const snap = await db.collection('market_items')
      .where('is_sold', '==', false)
      .orderBy('price')
      .get();

    const items = [];
    for (const doc of snap.docs) {
      const mi = docToObj(doc);
      if (mi.seller_id) {
        const sellerDoc = await db.collection('students').doc(mi.seller_id).get();
        if (sellerDoc.exists) {
          mi.seller_name = sellerDoc.data().first_name;
        }
      }
      items.push(mi);
    }
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/market/add', async (req, res) => {
  try {
    const { seller_id, name, description, price } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await db.collection('market_items').doc().set({
      seller_id: seller_id || null,
      name,
      description: description || null,
      price,
      is_sold: false,
      buyer_id: null,
      market_date: today
    });
    res.json({ message: 'Article ajouté au marché !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/market/buy', async (req, res) => {
  try {
    const { buyer_id, item_id } = req.body;

    const [buyerDoc, itemDoc] = await Promise.all([
      db.collection('students').doc(buyer_id).get(),
      db.collection('market_items').doc(item_id).get()
    ]);

    if (!buyerDoc.exists) return res.status(404).json({ error: 'Acheteur non trouvé' });
    const item = itemDoc.exists ? itemDoc.data() : null;
    if (!item || item.is_sold) return res.status(404).json({ error: 'Article non disponible' });

    const buyer = buyerDoc.data();
    if (buyer.balance < item.price) return res.status(400).json({ error: 'Pas assez de centicools !' });

    const batch = db.batch();

    // Buyer pays
    batch.update(db.collection('students').doc(buyer_id), {
      balance: FieldValue.increment(-item.price)
    });
    batch.set(db.collection('transactions').doc(), {
      student_id: buyer_id,
      amount: item.price,
      type: 'market_buy',
      reason: `Marché : ${item.name}`,
      created_by: 'market',
      created_at: new Date().toISOString()
    });

    // Seller receives payment
    if (item.seller_id) {
      batch.update(db.collection('students').doc(item.seller_id), {
        balance: FieldValue.increment(item.price)
      });
      batch.set(db.collection('transactions').doc(), {
        student_id: item.seller_id,
        amount: item.price,
        type: 'market_sell',
        reason: `Vente marché : ${item.name}`,
        created_by: 'market',
        created_at: new Date().toISOString()
      });
    }

    // Mark item as sold
    batch.update(db.collection('market_items').doc(item_id), {
      is_sold: true,
      buyer_id
    });

    await batch.commit();
    res.json({ message: `${item.name} acheté au marché !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API STATS (prof) ====================

app.get('/api/stats', async (req, res) => {
  try {
    const snap = await db.collection('students').where('is_active', '==', true).get();
    const students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalStudents = students.length;
    const totalCool = students.reduce((sum, s) => sum + (s.balance || 0), 0);
    const negativeStudents = students.filter(s => s.balance < 0).length;

    // Sort for richest/poorest
    const sorted = [...students].sort((a, b) => b.balance - a.balance);
    const richest = sorted.slice(0, 5).map(s => ({ first_name: s.first_name, last_name: s.last_name, balance: s.balance }));
    const poorest = sorted.slice(-5).reverse().map(s => ({ first_name: s.first_name, last_name: s.last_name, balance: s.balance }));
    // poorest should be sorted asc
    poorest.sort((a, b) => a.balance - b.balance);

    res.json({ totalStudents, totalCool, negativeStudents, richest, poorest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un élève (soft delete)
app.delete('/api/students/:id', async (req, res) => {
  try {
    await db.collection('students').doc(req.params.id).update({ is_active: false });
    res.json({ message: 'Élève désactivé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== CHANGEMENT DE PIN ====================

app.post('/api/students/:id/pin', async (req, res) => {
  try {
    const { old_pin, new_pin } = req.body;
    if (!old_pin || !new_pin) return res.status(400).json({ error: 'Ancien et nouveau PIN requis' });
    if (new_pin.length < 4) return res.status(400).json({ error: 'Le PIN doit contenir au moins 4 chiffres' });

    const doc = await db.collection('students').doc(req.params.id).get();
    if (!doc.exists || !doc.data().is_active) return res.status(404).json({ error: 'Élève non trouvé' });
    if (doc.data().pin_code !== old_pin) return res.status(401).json({ error: 'Ancien PIN incorrect' });

    await db.collection('students').doc(req.params.id).update({ pin_code: new_pin });
    res.json({ message: 'PIN mis à jour !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== EXPORT DES DONNÉES ====================

app.get('/api/export', async (req, res) => {
  try {
    // Students
    const studentsSnap = await db.collection('students').where('is_active', '==', true).get();
    const students = studentsSnap.docs.map(docToObj);

    // Transactions with student names
    const txSnap = await db.collection('transactions').orderBy('created_at', 'desc').get();
    const studentsMap = {};
    studentsSnap.docs.forEach(d => { studentsMap[d.id] = d.data(); });

    const transactions = txSnap.docs.map(doc => {
      const t = docToObj(doc);
      const s = studentsMap[t.student_id] || {};
      t.first_name = s.first_name;
      t.last_name = s.last_name;
      return t;
    });

    // Belts with denormalized data
    const [beltsSnap, subjectsSnap, colorsSnap] = await Promise.all([
      db.collection('student_belts').get(),
      db.collection('subjects').get(),
      db.collection('belt_colors').get()
    ]);

    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = d.data(); });
    const colorsMap = {};
    colorsSnap.docs.forEach(d => { colorsMap[d.id] = d.data(); });

    const activeStudentIds = new Set(studentsSnap.docs.map(d => d.id));
    const belts = beltsSnap.docs
      .filter(doc => activeStudentIds.has(doc.data().student_id))
      .map(doc => {
        const b = docToObj(doc);
        const s = studentsMap[b.student_id] || {};
        const subject = subjectsMap[b.subject_id] || {};
        const color = colorsMap[b.belt_color_id] || {};
        return {
          ...b,
          first_name: s.first_name,
          last_name: s.last_name,
          subject_name: subject.name,
          belt_name: color.name,
          color_hex: color.color_hex
        };
      });

    res.json({ exported_at: new Date().toISOString(), students, transactions, belts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== TEACHER AUTH ====================
const TEACHER_PIN = process.env.TEACHER_PIN || '1234';

app.post('/api/teacher/login', (req, res) => {
  const { pin } = req.body;
  if (pin === TEACHER_PIN) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Code incorrect' });
  }
});

// ==================== API AMENDES ====================

app.get('/api/fines/rules', async (req, res) => {
  try {
    const snap = await db.collection('fine_rules')
      .where('is_active', '==', true)
      .orderBy('name')
      .get();
    res.json(snap.docs.map(docToObj));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/fines/rules', async (req, res) => {
  try {
    const { name, icon, amount } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Nom et montant requis' });
    await db.collection('fine_rules').doc().set({
      name,
      icon: icon || '⚠️',
      amount,
      is_active: true
    });
    res.json({ message: 'Règle ajoutée !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/fines/rules/:id', async (req, res) => {
  try {
    await db.collection('fine_rules').doc(req.params.id).update({ is_active: false });
    res.json({ message: 'Règle supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/fines/apply', async (req, res) => {
  try {
    const { student_ids, rule_id } = req.body;
    if (!student_ids || student_ids.length === 0 || !rule_id) return res.status(400).json({ error: 'Données manquantes' });

    const ruleDoc = await db.collection('fine_rules').doc(rule_id).get();
    if (!ruleDoc.exists || !ruleDoc.data().is_active) return res.status(404).json({ error: 'Règle non trouvée' });
    const rule = ruleDoc.data();

    // Batch (each student = 2 ops)
    const chunkSize = 250;
    for (let i = 0; i < student_ids.length; i += chunkSize) {
      const chunk = student_ids.slice(i, i + chunkSize);
      const batch = db.batch();
      for (const sid of chunk) {
        batch.update(db.collection('students').doc(sid), {
          balance: FieldValue.increment(-rule.amount)
        });
        batch.set(db.collection('transactions').doc(), {
          student_id: sid,
          amount: rule.amount,
          type: 'lose',
          reason: `${rule.icon} Amende : ${rule.name}`,
          created_by: 'teacher',
          created_at: new Date().toISOString()
        });
      }
      await batch.commit();
    }

    res.json({ message: `Amende "${rule.name}" (-${rule.amount} cc) appliquée à ${student_ids.length} élève(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API ENCHÈRES ====================

app.get('/api/auctions', async (req, res) => {
  try {
    const snap = await db.collection('auctions').orderBy('created_at', 'desc').get();
    const auctions = [];
    for (const doc of snap.docs) {
      const a = docToObj(doc);
      if (a.winner_id) {
        const winnerDoc = await db.collection('students').doc(a.winner_id).get();
        if (winnerDoc.exists) {
          const w = winnerDoc.data();
          a.winner_name = w.first_name;
          a.winner_last = w.last_name;
        }
      }
      auctions.push(a);
    }
    res.json(auctions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/auctions/:id', async (req, res) => {
  try {
    const auctionDoc = await db.collection('auctions').doc(req.params.id).get();
    if (!auctionDoc.exists) return res.status(404).json({ error: 'Enchère non trouvée' });

    const auction = docToObj(auctionDoc);
    if (auction.winner_id) {
      const winnerDoc = await db.collection('students').doc(auction.winner_id).get();
      if (winnerDoc.exists) {
        auction.winner_name = winnerDoc.data().first_name;
      }
    }

    // Bids
    const bidsSnap = await db.collection('auction_bids')
      .where('auction_id', '==', req.params.id)
      .orderBy('amount', 'desc')
      .orderBy('created_at', 'asc')
      .get();

    const bids = [];
    for (const doc of bidsSnap.docs) {
      const b = docToObj(doc);
      const studentDoc = await db.collection('students').doc(b.student_id).get();
      if (studentDoc.exists) {
        const s = studentDoc.data();
        b.first_name = s.first_name;
        b.last_name = s.last_name;
      }
      bids.push(b);
    }

    res.json({ auction, bids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auctions', async (req, res) => {
  try {
    const { name, description, starting_price } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });

    const ref = db.collection('auctions').doc();
    await ref.set({
      name,
      description: description || '',
      starting_price: starting_price || 1,
      current_price: starting_price || 1,
      status: 'open',
      winner_id: null,
      created_at: new Date().toISOString(),
      closed_at: null
    });
    res.json({ id: ref.id, message: 'Enchère créée !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auctions/:id/bid', async (req, res) => {
  try {
    const { student_id, amount } = req.body;
    const auctionDoc = await db.collection('auctions').doc(req.params.id).get();
    if (!auctionDoc.exists || auctionDoc.data().status !== 'open') {
      return res.status(400).json({ error: 'Enchère fermée ou introuvable' });
    }
    const auction = auctionDoc.data();

    const studentDoc = await db.collection('students').doc(student_id).get();
    if (!studentDoc.exists) return res.status(404).json({ error: 'Élève non trouvé' });
    const student = studentDoc.data();

    if (amount < auction.current_price) return res.status(400).json({ error: `Mise minimum : ${auction.current_price} cc` });
    if (student.balance < amount) return res.status(400).json({ error: 'Pas assez de centicools !' });

    // Remove previous bid from this student for this auction
    const prevBids = await db.collection('auction_bids')
      .where('auction_id', '==', req.params.id)
      .where('student_id', '==', student_id)
      .get();
    const delBatch = db.batch();
    for (const doc of prevBids.docs) {
      delBatch.delete(doc.ref);
    }
    await delBatch.commit();

    // Add new bid
    await db.collection('auction_bids').doc().set({
      auction_id: req.params.id,
      student_id,
      amount,
      created_at: new Date().toISOString()
    });

    // Update current price to highest bid
    const allBids = await db.collection('auction_bids')
      .where('auction_id', '==', req.params.id)
      .orderBy('amount', 'desc')
      .limit(1)
      .get();
    if (!allBids.empty) {
      await db.collection('auctions').doc(req.params.id).update({
        current_price: allBids.docs[0].data().amount
      });
    }

    res.json({ message: `Mise de ${amount} cc placée !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Close auction
app.post('/api/auctions/:id/close', async (req, res) => {
  try {
    const auctionDoc = await db.collection('auctions').doc(req.params.id).get();
    if (!auctionDoc.exists || auctionDoc.data().status !== 'open') {
      return res.status(400).json({ error: 'Enchère déjà fermée ou introuvable' });
    }
    const auction = auctionDoc.data();

    const bidsSnap = await db.collection('auction_bids')
      .where('auction_id', '==', req.params.id)
      .orderBy('amount', 'desc')
      .get();

    if (bidsSnap.empty) {
      await db.collection('auctions').doc(req.params.id).update({
        status: 'closed',
        closed_at: new Date().toISOString()
      });
      return res.json({ message: 'Enchère fermée sans enchérisseur', winner: null, tied: false });
    }

    // Get top bids with student names
    const topBids = [];
    for (const doc of bidsSnap.docs) {
      const b = docToObj(doc);
      const studentDoc = await db.collection('students').doc(b.student_id).get();
      if (studentDoc.exists) {
        const s = studentDoc.data();
        b.first_name = s.first_name;
        b.last_name = s.last_name;
        b.balance = s.balance;
      }
      topBids.push(b);
    }

    const maxAmount = topBids[0].amount;
    const tiedBidders = topBids.filter(b => b.amount === maxAmount);

    if (tiedBidders.length > 1) {
      await db.collection('auctions').doc(req.params.id).update({ status: 'dice_tiebreak' });
      return res.json({
        message: 'Égalité ! Lancez les dés pour départager !',
        winner: null,
        tied: true,
        tiedBidders: tiedBidders.map(b => ({ student_id: b.student_id, name: `${b.first_name} ${b.last_name}`, amount: b.amount }))
      });
    }

    // Single winner
    const winner = tiedBidders[0];
    const batch = db.batch();
    batch.update(db.collection('auctions').doc(req.params.id), {
      status: 'closed',
      winner_id: winner.student_id,
      closed_at: new Date().toISOString()
    });
    batch.update(db.collection('students').doc(winner.student_id), {
      balance: FieldValue.increment(-winner.amount)
    });
    batch.set(db.collection('transactions').doc(), {
      student_id: winner.student_id,
      amount: winner.amount,
      type: 'spend',
      reason: `Enchère gagnée : ${auction.name}`,
      created_by: 'auction',
      created_at: new Date().toISOString()
    });
    await batch.commit();

    res.json({
      message: `${winner.first_name} remporte "${auction.name}" pour ${winner.amount} cc !`,
      winner: { student_id: winner.student_id, name: `${winner.first_name} ${winner.last_name}`, amount: winner.amount },
      tied: false
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Resolve dice tiebreak
app.post('/api/auctions/:id/dice-resolve', async (req, res) => {
  try {
    const { winner_id } = req.body;
    const auctionDoc = await db.collection('auctions').doc(req.params.id).get();
    if (!auctionDoc.exists || auctionDoc.data().status !== 'dice_tiebreak') {
      return res.status(400).json({ error: 'Pas en mode départage' });
    }
    const auction = auctionDoc.data();

    // Find winner's bid
    const bidSnap = await db.collection('auction_bids')
      .where('auction_id', '==', req.params.id)
      .where('student_id', '==', winner_id)
      .limit(1)
      .get();
    if (bidSnap.empty) return res.status(400).json({ error: "Ce joueur n'a pas enchéri" });
    const winnerBid = bidSnap.docs[0].data();

    const winnerDoc = await db.collection('students').doc(winner_id).get();
    const winner = winnerDoc.data();

    const batch = db.batch();
    batch.update(db.collection('auctions').doc(req.params.id), {
      status: 'closed',
      winner_id,
      closed_at: new Date().toISOString()
    });
    batch.update(db.collection('students').doc(winner_id), {
      balance: FieldValue.increment(-winnerBid.amount)
    });
    batch.set(db.collection('transactions').doc(), {
      student_id: winner_id,
      amount: winnerBid.amount,
      type: 'spend',
      reason: `Enchère gagnée (dés) : ${auction.name}`,
      created_by: 'auction',
      created_at: new Date().toISOString()
    });
    await batch.commit();

    res.json({ message: `${winner.first_name} remporte l'enchère après les dés !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== API CLASSEMENTS ====================

app.get('/api/leaderboard', async (req, res) => {
  try {
    // Fetch all active students
    const studentsSnap = await db.collection('students').where('is_active', '==', true).get();
    const students = studentsSnap.docs.map(docToObj);

    // Richest (sorted by balance desc)
    const richest = [...students]
      .sort((a, b) => b.balance - a.balance)
      .map(s => ({ id: s.id, first_name: s.first_name, last_name: s.last_name, balance: s.balance, avatar_config: s.avatar_config }));

    // Fetch all belts, subjects, colors
    const [beltsSnap, subjectsSnap, colorsSnap] = await Promise.all([
      db.collection('student_belts').get(),
      db.collection('subjects').get(),
      db.collection('belt_colors').get()
    ]);

    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = d.data(); });
    const colorsMap = {};
    colorsSnap.docs.forEach(d => { colorsMap[d.id] = d.data(); });

    const activeIds = new Set(students.map(s => s.id));
    const studentsMap = {};
    students.forEach(s => { studentsMap[s.id] = s; });

    // Belt ranking: compute total rank per student
    const studentBeltStats = {}; // student_id -> { total_rank, gold_count, highest_rank, highest_color, highest_name }
    for (const doc of beltsSnap.docs) {
      const b = doc.data();
      if (!activeIds.has(b.student_id)) continue;
      const color = colorsMap[b.belt_color_id] || {};
      const rank = color.rank || 0;

      if (!studentBeltStats[b.student_id]) {
        studentBeltStats[b.student_id] = { total_rank: 0, gold_count: 0, highest_rank: 0, highest_belt_color: null, highest_belt_name: null };
      }
      const stats = studentBeltStats[b.student_id];
      stats.total_rank += rank;
      if (rank >= 10) stats.gold_count++;
      if (rank > stats.highest_rank) {
        stats.highest_rank = rank;
        stats.highest_belt_color = color.color_hex;
        stats.highest_belt_name = color.name;
      }
    }

    const beltRanking = Object.entries(studentBeltStats)
      .map(([sid, stats]) => {
        const s = studentsMap[sid] || {};
        return {
          id: sid,
          first_name: s.first_name,
          last_name: s.last_name,
          avatar_config: s.avatar_config,
          total_rank: stats.total_rank,
          gold_count: stats.gold_count,
          highest_belt_color: stats.highest_belt_color,
          highest_belt_name: stats.highest_belt_name
        };
      })
      .sort((a, b) => b.total_rank - a.total_rank);

    // Per-subject leaderboard
    const bySubject = {};
    for (const doc of beltsSnap.docs) {
      const b = doc.data();
      if (!activeIds.has(b.student_id)) continue;
      const subject = subjectsMap[b.subject_id] || {};
      const color = colorsMap[b.belt_color_id] || {};
      const s = studentsMap[b.student_id] || {};

      if (!bySubject[b.subject_id]) {
        bySubject[b.subject_id] = { name: subject.name, icon: subject.icon, students: [] };
      }
      bySubject[b.subject_id].students.push({
        subject_id: b.subject_id,
        subject_name: subject.name,
        subject_icon: subject.icon,
        student_id: b.student_id,
        first_name: s.first_name,
        last_name: s.last_name,
        belt_name: color.name,
        color_hex: color.color_hex,
        rank: color.rank || 0,
        sub_level: b.sub_level || 0
      });
    }

    // Sort each subject's students by rank desc, sub_level desc
    for (const key of Object.keys(bySubject)) {
      bySubject[key].students.sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return b.sub_level - a.sub_level;
      });
    }

    res.json({ richest, beltRanking, bySubject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🏦 COOL School Bank lancé !`);
  console.log(`📍 Ouvre ton navigateur : http://localhost:${PORT}`);
  console.log(`\n👨‍🏫 Code prof : ${TEACHER_PIN}`);
  console.log(`👦 Code élève par défaut : 0000\n`);
});
