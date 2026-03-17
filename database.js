const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'cool-school-bank'
});

const db = admin.firestore();

// Helper: delete all documents in a collection
async function deleteCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

// Seed data function - FORCE RESEED to replace old data
async function seedData() {
  try {
    // Force clean all old data first
    const collections = ['belt_colors', 'subjects', 'students', 'student_belts', 'config', 'jobs', 'fine_rules', 'shop_categories', 'shop_items', 'transactions'];
    console.log('  🧹 Nettoyage des anciennes donnees...');
    for (const col of collections) {
      const deleted = await deleteCollection(col);
      if (deleted > 0) console.log(`    🗑️ ${col}: ${deleted} documents supprimes`);
    }
    console.log('  ✅ Nettoyage termine, re-seed en cours...');

    // --- Belt Colors (11 ceintures La HERSE) ---
    {
      const beltColors = [
        { name: 'Rose',     color_hex: '#FFD4E8', text_hex: '#000000', rank: 1 },
        { name: 'Blanche',  color_hex: '#FFFFFF', text_hex: '#000000', rank: 2 },
        { name: 'Jaune',    color_hex: '#FFFF00', text_hex: '#000000', rank: 3 },
        { name: 'Orange',   color_hex: '#FFA500', text_hex: '#000000', rank: 4 },
        { name: 'Verte',    color_hex: '#00B050', text_hex: '#000000', rank: 5 },
        { name: 'Bleue',    color_hex: '#4472C4', text_hex: '#FFFFFF', rank: 6 },
        { name: 'Violette', color_hex: '#9933FF', text_hex: '#FFFFFF', rank: 7 },
        { name: 'Marron',   color_hex: '#833C0B', text_hex: '#FFFFFF', rank: 8 },
        { name: 'Grise',    color_hex: '#A6A6A6', text_hex: '#000000', rank: 9 },
        { name: 'Noire',    color_hex: '#000000', text_hex: '#FFFFFF', rank: 10 },
        { name: 'Doree',    color_hex: '#FFD700', text_hex: '#000000', rank: 11 }
      ];
      const batch = db.batch();
      for (const belt of beltColors) {
        batch.set(db.collection('belt_colors').doc(), belt);
      }
      await batch.commit();
      console.log('  ✅ 11 ceintures La HERSE initialisees');
    }

    // --- Subjects (20 matieres La HERSE) ---
    {
      const subjects = [
        { name: 'Ecriture',                      icon: '✍️',  category: 'francais' },
        { name: 'Lecture',                        icon: '📖', category: 'francais' },
        { name: 'Conjugaison',                    icon: '🔄', category: 'francais' },
        { name: 'Dictee',                         icon: '📝', category: 'francais' },
        { name: "Orthographe d'usage",            icon: '📏', category: 'francais' },
        { name: 'Orthographe grammaticale',       icon: '📐', category: 'francais' },
        { name: "Production d'ecrit",             icon: '✏️',  category: 'francais' },
        { name: 'Grammaire de la phrase',         icon: '📋', category: 'francais' },
        { name: 'Grammaire natures et fonctions', icon: '🏷️', category: 'francais' },
        { name: 'Homophones grammaticaux',        icon: '🔀', category: 'francais' },
        { name: 'Vocabulaire',                    icon: '📚', category: 'francais' },
        { name: 'Numeration',                     icon: '🔢', category: 'maths' },
        { name: 'Operations',                     icon: '➕', category: 'maths' },
        { name: 'Problemes',                      icon: '🧩', category: 'maths' },
        { name: 'Mesure',                         icon: '📏', category: 'maths' },
        { name: 'Geometrie',                      icon: '📐', category: 'maths' },
        { name: 'Tables',                         icon: '✖️', category: 'maths' },
        { name: 'Calcul rapide',                  icon: '⚡', category: 'maths' },
        { name: 'Poesie',                         icon: '🎭', category: 'autre' },
        { name: 'Anglais',                        icon: '🇬🇧', category: 'autre' }
      ];
      const batch = db.batch();
      for (const subject of subjects) {
        batch.set(db.collection('subjects').doc(), subject);
      }
      await batch.commit();
      console.log('  ✅ 20 matieres La HERSE initialisees');
    }

    // --- Jobs ---
    {
      const jobs = [
        { name: 'Banquier', icon: '🏦', weekly_pay: 150 },
        { name: 'Chef des geneurs', icon: '🔔', weekly_pay: 100 },
        { name: 'Meteorologue', icon: '🌤️', weekly_pay: 100 },
        { name: 'Facteur', icon: '✉️', weekly_pay: 100 },
        { name: 'Bibliothecaire', icon: '📚', weekly_pay: 100 },
        { name: 'Responsable materiel', icon: '🧹', weekly_pay: 100 },
        { name: 'Responsable tableau', icon: '📋', weekly_pay: 100 },
        { name: 'Informaticien', icon: '💻', weekly_pay: 120 }
      ];
      const batch = db.batch();
      for (const job of jobs) {
        batch.set(db.collection('jobs').doc(), job);
      }
      await batch.commit();
      console.log('  ✅ Metiers initialises');
    }

    // --- Fine Rules ---
    {
      const fines = [
        { name: 'Geneur', icon: '🔔', amount: 10, is_active: true },
        { name: 'Bavardage', icon: '🗣️', amount: 5, is_active: true },
        { name: 'Materiel oublie', icon: '🎒', amount: 10, is_active: true },
        { name: 'Devoir non fait', icon: '📝', amount: 15, is_active: true },
        { name: 'Retard', icon: '⏰', amount: 5, is_active: true },
        { name: 'Bagarre', icon: '👊', amount: 30, is_active: true },
        { name: 'Insolence', icon: '😤', amount: 20, is_active: true },
        { name: 'Triche', icon: '🃏', amount: 50, is_active: true }
      ];
      const batch = db.batch();
      for (const fine of fines) {
        batch.set(db.collection('fine_rules').doc(), fine);
      }
      await batch.commit();
      console.log('  ✅ Regles amendes initialisees');
    }

    // --- Config ---
    {
      await db.collection('config').doc('main').set({
        teacher_pin: '1234',
        school_name: 'Ecole primaire publique la Herse',
        class_name: 'CM2',
        school_year: '2025-2026',
        teacher_name: 'Mme Trouve'
      });
      console.log('  ✅ Configuration initialisee');
    }

    // --- Students (23 eleves La HERSE) ---
    {
      const students = [
        { first_name: 'Celestin',  last_name: 'Auclair',              class_number: 1 },
        { first_name: 'Baptiste',  last_name: 'Froin Blaineau',       class_number: 2 },
        { first_name: 'Martin',    last_name: 'Gauthier',             class_number: 3 },
        { first_name: 'Damani',    last_name: 'Gaychet',              class_number: 4 },
        { first_name: 'Loevan',    last_name: 'Hollard',              class_number: 5 },
        { first_name: 'Clemence',  last_name: 'Klein',                class_number: 6 },
        { first_name: 'Margaux',   last_name: 'Klein',                class_number: 7 },
        { first_name: 'Laylana',   last_name: 'Pourchasse',           class_number: 8 },
        { first_name: 'Bastien',   last_name: 'Tcha Bucher',          class_number: 9 },
        { first_name: 'Martin',    last_name: 'Verneuil',             class_number: 10 },
        { first_name: 'Nazar',     last_name: 'Annich',               class_number: 11 },
        { first_name: 'Mathis',    last_name: 'Aubert Bachmann',      class_number: 12 },
        { first_name: 'Gabriel',   last_name: 'Balieu',               class_number: 13 },
        { first_name: 'Mickael',   last_name: 'Cha',                  class_number: 14 },
        { first_name: 'Lucilia',   last_name: 'Guerra',               class_number: 15 },
        { first_name: 'Louna',     last_name: 'Martin Mace',          class_number: 16 },
        { first_name: 'Mathys',    last_name: 'Moran Alliot',         class_number: 17 },
        { first_name: 'Louna',     last_name: 'Pilch Mauduchet',      class_number: 18 },
        { first_name: 'Daina',     last_name: 'Raffault Deplechin',   class_number: 19 },
        { first_name: 'Mylan',     last_name: 'Soreau',               class_number: 20 },
        { first_name: 'Miyuki',    last_name: 'Tcha Carton',          class_number: 21 },
        { first_name: 'Enzo',      last_name: 'Civrais',              class_number: 22 },
        { first_name: 'Sarah',     last_name: 'Logie',                class_number: 23 }
      ];

      // Get belt_colors to assign Rose (rank 1) to all students
      const beltSnap = await db.collection('belt_colors').where('rank', '==', 1).limit(1).get();
      const roseBeltId = beltSnap.empty ? null : beltSnap.docs[0].id;

      // Get all subjects
      const subjectSnap = await db.collection('subjects').get();
      const subjectIds = subjectSnap.docs.map(d => d.id);

      for (const student of students) {
        const studentRef = await db.collection('students').add({
          first_name: student.first_name,
          last_name: student.last_name,
          class_number: student.class_number,
          pin_code: '0000',
          banker_code: null,
          avatar_config: '{}',
          balance: 0,
          is_active: true,
          created_at: new Date().toISOString()
        });

        // Initialize belts for this student (Rose belt for all subjects)
        if (roseBeltId && subjectIds.length > 0) {
          const beltBatch = db.batch();
          for (const subjectId of subjectIds) {
            beltBatch.set(db.collection('student_belts').doc(), {
              student_id: studentRef.id,
              subject_id: subjectId,
              belt_color_id: roseBeltId,
              achieved_at: new Date().toISOString()
            });
          }
          await beltBatch.commit();
        }
      }
      console.log('  ✅ 23 eleves La HERSE initialises avec ceintures Rose');
    }

    // --- Shop Categories & Items ---
    {
      const categoryData = [
        { name: 'Skins Avatar', icon: '👤' },
        { name: 'Chapeaux', icon: '🎩' },
        { name: 'Accessoires', icon: '✨' },
        { name: 'Fonds', icon: '🖼️' },
        { name: 'Billets Personnalises', icon: '💰' }
      ];

      const categoryIds = [];
      const catBatch = db.batch();
      for (const cat of categoryData) {
        const ref = db.collection('shop_categories').doc();
        catBatch.set(ref, cat);
        categoryIds.push(ref.id);
      }
      await catBatch.commit();

      const items = [
        { category_id: categoryIds[0], name: 'Peau Bleue', description: 'Colorie ton avatar en bleu !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#4A90D9"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Verte', description: 'Colorie ton avatar en vert !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#4AD97A"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Rose', description: 'Colorie ton avatar en rose !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#D94A8B"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Doree', description: 'Avatar en or pur !', price: 500, item_type: 'avatar_skin', item_data: '{"color":"#FFD700"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Arc-en-ciel', description: 'Toutes les couleurs !', price: 2000, item_type: 'avatar_skin', item_data: '{"color":"rainbow"}', is_available: true },
        { category_id: categoryIds[1], name: 'Casquette', description: 'Une casquette stylee', price: 100, item_type: 'avatar_hat', item_data: '{"type":"cap"}', is_available: true },
        { category_id: categoryIds[1], name: 'Couronne', description: 'Pour les rois et reines !', price: 800, item_type: 'avatar_hat', item_data: '{"type":"crown"}', is_available: true },
        { category_id: categoryIds[1], name: 'Chapeau Magicien', description: 'Abracadabra !', price: 300, item_type: 'avatar_hat', item_data: '{"type":"wizard"}', is_available: true },
        { category_id: categoryIds[1], name: 'Bandeau Ninja', description: 'Mode ninja active', price: 200, item_type: 'avatar_hat', item_data: '{"type":"ninja"}', is_available: true },
        { category_id: categoryIds[1], name: 'Casque Spatial', description: 'Direction la lune !', price: 1500, item_type: 'avatar_hat', item_data: '{"type":"space"}', is_available: true },
        { category_id: categoryIds[2], name: 'Lunettes Cool', description: 'Des lunettes de star', price: 150, item_type: 'avatar_accessory', item_data: '{"type":"sunglasses"}', is_available: true },
        { category_id: categoryIds[2], name: 'Etoiles Autour', description: 'Des etoiles brillantes', price: 250, item_type: 'avatar_accessory', item_data: '{"type":"stars"}', is_available: true },
        { category_id: categoryIds[2], name: 'Ailes', description: 'Des petites ailes !', price: 1000, item_type: 'avatar_accessory', item_data: '{"type":"wings"}', is_available: true },
        { category_id: categoryIds[2], name: 'Flammes', description: 'Trop chaud !', price: 600, item_type: 'avatar_accessory', item_data: '{"type":"flames"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Galaxie', description: 'L espace infini', price: 200, item_type: 'avatar_background', item_data: '{"type":"galaxy"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Foret', description: 'Nature et arbres', price: 150, item_type: 'avatar_background', item_data: '{"type":"forest"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Ocean', description: 'Sous la mer', price: 150, item_type: 'avatar_background', item_data: '{"type":"ocean"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Lave', description: 'Comme un volcan !', price: 400, item_type: 'avatar_background', item_data: '{"type":"lava"}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Centicool', description: 'Personnalise tes centicools !', price: 100, item_type: 'cool_design_centicool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Decicool', description: 'Personnalise tes decicools !', price: 500, item_type: 'cool_design_decicool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Cool', description: 'Personnalise tes cools !', price: 1000, item_type: 'cool_design_cool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Super Cool', description: 'Personnalise tes super cools !', price: 5000, item_type: 'cool_design_supercool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Mega Cool', description: 'Personnalise tes mega cools !', price: 7500, item_type: 'cool_design_megacool', item_data: '{}', is_available: true }
      ];

      const itemBatch = db.batch();
      for (const item of items) {
        itemBatch.set(db.collection('shop_items').doc(), item);
      }
      await itemBatch.commit();
      console.log('  ✅ Boutique initialisee');
    }

    console.log('✅ Seed data check complete - La HERSE');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run seed on startup
seedData().catch(console.error);

module.exports = db;
