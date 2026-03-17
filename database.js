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

// Seed data function - conditional seeding (only if collections are empty)
async function seedData() {
  try {
    // Toujours verifier les fournitures (ajout independant)
    {
      const suppliesSnap = await db.collection('supply_items').limit(1).get();
      if (suppliesSnap.empty) {
        console.log('  ✏️ Ajout des fournitures scolaires...');
        const supplies = [
          { name: 'Stylo bleu', icon: '🖊️', price: 5, stock: 20 },
          { name: 'Stylo rouge', icon: '🖊️', price: 5, stock: 15 },
          { name: 'Stylo vert', icon: '🖊️', price: 5, stock: 15 },
          { name: 'Crayon a papier', icon: '✏️', price: 3, stock: 30 },
          { name: 'Gomme', icon: '🧹', price: 4, stock: 20 },
          { name: 'Taille-crayon', icon: '🔧', price: 4, stock: 15 },
          { name: 'Colle', icon: '🧴', price: 6, stock: 20 },
          { name: 'Paire de ciseaux', icon: '✂️', price: 8, stock: 10 },
          { name: 'Regle 20cm', icon: '📏', price: 5, stock: 15 },
          { name: 'Regle 30cm', icon: '📏', price: 7, stock: 10 },
          { name: 'Equerre', icon: '📐', price: 8, stock: 10 },
          { name: 'Compas', icon: '🔵', price: 10, stock: 8 },
          { name: 'Surligneur jaune', icon: '🖍️', price: 5, stock: 15 },
          { name: 'Surligneur rose', icon: '🖍️', price: 5, stock: 15 },
          { name: 'Feutre fin noir', icon: '🖋️', price: 4, stock: 15 },
          { name: 'Cahier petit format', icon: '📓', price: 12, stock: 10 },
          { name: 'Cahier grand format', icon: '📒', price: 15, stock: 10 },
          { name: 'Pochette de feutres', icon: '🎨', price: 20, stock: 5 },
          { name: 'Pochette crayons couleur', icon: '🖍️', price: 18, stock: 5 },
          { name: 'Ardoise + feutre', icon: '📋', price: 15, stock: 8 },
        ];
        const batch = db.batch();
        for (const s of supplies) {
          const ref = db.collection('supply_items').doc();
          batch.set(ref, { ...s, created_at: new Date().toISOString() });
        }
        await batch.commit();
        console.log(`    ✅ ${supplies.length} fournitures ajoutees`);
      }
    }

    // Check if main data already exists
    const studentsSnap = await db.collection('students').limit(1).get();
    if (!studentsSnap.empty) {
      console.log('  ✅ Donnees existantes detectees, pas de re-seed');
      return;
    }
    console.log('  🌱 Base vide, initialisation des donnees La HERSE...');

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
        { name: 'Billets Personnalises', icon: '💰' },
        { name: 'Tetes', icon: '🐲' },
        { name: 'Bordures', icon: '🖼️' }
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
        // --- Skins Avatar (5) ---
        { category_id: categoryIds[0], name: 'Peau Bleue', description: 'Colorie ton avatar en bleu !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#4A90D9"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Verte', description: 'Colorie ton avatar en vert !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#4AD97A"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Rose', description: 'Colorie ton avatar en rose !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#D94A8B"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Doree', description: 'Avatar en or pur !', price: 500, item_type: 'avatar_skin', item_data: '{"color":"#FFD700"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Arc-en-ciel', description: 'Toutes les couleurs !', price: 2000, item_type: 'avatar_skin', item_data: '{"color":"rainbow"}', is_available: true },
        // --- Chapeaux (5) ---
        { category_id: categoryIds[1], name: 'Casquette', description: 'Une casquette stylee', price: 100, item_type: 'avatar_hat', item_data: '{"type":"cap"}', is_available: true },
        { category_id: categoryIds[1], name: 'Couronne', description: 'Pour les rois et reines !', price: 800, item_type: 'avatar_hat', item_data: '{"type":"crown"}', is_available: true },
        { category_id: categoryIds[1], name: 'Chapeau Magicien', description: 'Abracadabra !', price: 300, item_type: 'avatar_hat', item_data: '{"type":"wizard"}', is_available: true },
        { category_id: categoryIds[1], name: 'Bandeau Ninja', description: 'Mode ninja active', price: 200, item_type: 'avatar_hat', item_data: '{"type":"ninja"}', is_available: true },
        { category_id: categoryIds[1], name: 'Casque Spatial', description: 'Direction la lune !', price: 1500, item_type: 'avatar_hat', item_data: '{"type":"space"}', is_available: true },
        // --- Accessoires (4) ---
        { category_id: categoryIds[2], name: 'Lunettes Cool', description: 'Des lunettes de star', price: 150, item_type: 'avatar_accessory', item_data: '{"type":"sunglasses"}', is_available: true },
        { category_id: categoryIds[2], name: 'Etoiles Autour', description: 'Des etoiles brillantes', price: 250, item_type: 'avatar_accessory', item_data: '{"type":"stars"}', is_available: true },
        { category_id: categoryIds[2], name: 'Ailes', description: 'Des petites ailes !', price: 1000, item_type: 'avatar_accessory', item_data: '{"type":"wings"}', is_available: true },
        { category_id: categoryIds[2], name: 'Flammes', description: 'Trop chaud !', price: 600, item_type: 'avatar_accessory', item_data: '{"type":"flames"}', is_available: true },
        // --- Fonds (4) ---
        { category_id: categoryIds[3], name: 'Fond Galaxie', description: 'L espace infini', price: 200, item_type: 'avatar_background', item_data: '{"type":"galaxy"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Foret', description: 'Nature et arbres', price: 150, item_type: 'avatar_background', item_data: '{"type":"forest"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Ocean', description: 'Sous la mer', price: 150, item_type: 'avatar_background', item_data: '{"type":"ocean"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Lave', description: 'Comme un volcan !', price: 400, item_type: 'avatar_background', item_data: '{"type":"lava"}', is_available: true },
        // --- Billets Personnalises (5) ---
        { category_id: categoryIds[4], name: 'Design Centicool', description: 'Personnalise tes centicools !', price: 100, item_type: 'cool_design_centicool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Decicool', description: 'Personnalise tes decicools !', price: 500, item_type: 'cool_design_decicool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Cool', description: 'Personnalise tes cools !', price: 1000, item_type: 'cool_design_cool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Super Cool', description: 'Personnalise tes super cools !', price: 5000, item_type: 'cool_design_supercool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Mega Cool', description: 'Personnalise tes mega cools !', price: 7500, item_type: 'cool_design_megacool', item_data: '{}', is_available: true },
        // --- Tetes (15) ---
        { category_id: categoryIds[5], name: 'Tete de Loup', description: 'Grrrr ! Le loup feroce !', price: 300, item_type: 'avatar_head', item_data: '{"type":"wolf"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Renard', description: 'Ruse comme un renard !', price: 300, item_type: 'avatar_head', item_data: '{"type":"fox"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Dragon', description: 'Crache du feu !', price: 800, item_type: 'avatar_head', item_data: '{"type":"dragon"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Lion', description: 'Le roi de la jungle !', price: 600, item_type: 'avatar_head', item_data: '{"type":"lion"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Chat', description: 'Miaou ! Trop mignon !', price: 150, item_type: 'avatar_head', item_data: '{"type":"cat"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Panda', description: 'Noir et blanc zen !', price: 250, item_type: 'avatar_head', item_data: '{"type":"panda"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Robot', description: 'Bip bop ! Mode robot !', price: 500, item_type: 'avatar_head', item_data: '{"type":"robot"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Zombie', description: 'Braaains ! Attention !', price: 400, item_type: 'avatar_head', item_data: '{"type":"zombie"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete d Aigle', description: 'Vue percante !', price: 350, item_type: 'avatar_head', item_data: '{"type":"eagle"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Hibou', description: 'Sage comme un hibou !', price: 200, item_type: 'avatar_head', item_data: '{"type":"owl"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Requin', description: 'Les dents de la mer !', price: 700, item_type: 'avatar_head', item_data: '{"type":"shark"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Singe', description: 'Ouh ouh ah ah !', price: 250, item_type: 'avatar_head', item_data: '{"type":"monkey"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Licorne', description: 'Magique et unique !', price: 1500, item_type: 'avatar_head', item_data: '{"type":"unicorn"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Phoenix', description: 'Renaissance eternelle !', price: 3000, item_type: 'avatar_head', item_data: '{"type":"phoenix"}', is_available: true },
        { category_id: categoryIds[5], name: 'Tete de Demon', description: 'L ombre incarnee !', price: 2000, item_type: 'avatar_head', item_data: '{"type":"demon"}', is_available: true },
        // --- Bordures (20) ---
        { category_id: categoryIds[6], name: 'Bordure Rouge', description: 'Un cadre rouge vif !', price: 60, item_type: 'avatar_border', item_data: '{"type":"solid","color":"#FF4444"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Bleue', description: 'Un cadre bleu ocean !', price: 60, item_type: 'avatar_border', item_data: '{"type":"solid","color":"#4488FF"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Verte', description: 'Un cadre vert nature !', price: 60, item_type: 'avatar_border', item_data: '{"type":"solid","color":"#44DD44"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Violette', description: 'Un cadre violet royal !', price: 60, item_type: 'avatar_border', item_data: '{"type":"solid","color":"#AA44FF"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Rose', description: 'Un cadre rose bonbon !', price: 60, item_type: 'avatar_border', item_data: '{"type":"solid","color":"#FF69B4"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Orange', description: 'Un cadre orange energie !', price: 60, item_type: 'avatar_border', item_data: '{"type":"solid","color":"#FF8C00"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Arc-en-ciel', description: 'Toutes les couleurs qui tournent !', price: 360, item_type: 'avatar_border', item_data: '{"type":"rainbow"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Doree', description: 'Un cadre en or massif !', price: 600, item_type: 'avatar_border', item_data: '{"type":"gold"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Argentee', description: 'Un cadre en argent poli !', price: 480, item_type: 'avatar_border', item_data: '{"type":"silver"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Iridescente', description: 'Reflets changeants magiques !', price: 960, item_type: 'avatar_border', item_data: '{"type":"iridescent"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Paillettes', description: 'Ca brille de partout !', price: 720, item_type: 'avatar_border', item_data: '{"type":"sparkle"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Flammes', description: 'Ton avatar est en feu !', price: 840, item_type: 'avatar_border', item_data: '{"type":"flames"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Glace', description: 'Givre et cristaux de glace !', price: 840, item_type: 'avatar_border', item_data: '{"type":"ice"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Dragon', description: 'Ecailles et griffes de dragon !', price: 1200, item_type: 'avatar_border', item_data: '{"type":"dragon"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Neon', description: 'Lumieres neon fluo !', price: 600, item_type: 'avatar_border', item_data: '{"type":"neon"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Pixel', description: 'Style retro pixelise !', price: 240, item_type: 'avatar_border', item_data: '{"type":"pixel"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Galaxie', description: 'Les etoiles autour de toi !', price: 1080, item_type: 'avatar_border', item_data: '{"type":"galaxy"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Lave', description: 'Magma en fusion !', price: 960, item_type: 'avatar_border', item_data: '{"type":"lava"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Legendaire', description: 'La bordure ultime !', price: 3600, item_type: 'avatar_border', item_data: '{"type":"legendary"}', is_available: true },
        { category_id: categoryIds[6], name: 'Bordure Ombre', description: 'L obscurite t entoure !', price: 1800, item_type: 'avatar_border', item_data: '{"type":"shadow"}', is_available: true }
      ];

      // Firestore batch max is 500 ops, we have 58 items - split into 2 batches
      const batch1 = db.batch();
      const batch2 = db.batch();
      for (let i = 0; i < items.length; i++) {
        const ref = db.collection('shop_items').doc();
        if (i < 30) batch1.set(ref, items[i]);
        else batch2.set(ref, items[i]);
      }
      await batch1.commit();
      await batch2.commit();
      console.log('  ✅ Boutique initialisee (58 articles: skins, chapeaux, accessoires, fonds, billets, tetes, bordures)');
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
