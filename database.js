const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'cool-school-bank'
});

const db = admin.firestore();

// Seed data function - checks if collections are empty before seeding
async function seedData() {
  try {
    // --- Belt Colors ---
    const beltsSnap = await db.collection('belt_colors').limit(1).get();
    if (beltsSnap.empty) {
      const beltColors = [
        { name: 'Blanche', color_hex: '#FFFFFF', rank: 1 },
        { name: 'Jaune', color_hex: '#FFD700', rank: 2 },
        { name: 'Orange', color_hex: '#FF8C00', rank: 3 },
        { name: 'Verte', color_hex: '#228B22', rank: 4 },
        { name: 'Bleue', color_hex: '#1E90FF', rank: 5 },
        { name: 'Violette', color_hex: '#8B008B', rank: 6 },
        { name: 'Marron', color_hex: '#795548', rank: 7 },
        { name: 'Grise', color_hex: '#9E9E9E', rank: 8 },
        { name: 'Noire', color_hex: '#1a1a1a', rank: 9 },
        { name: 'Dorée', color_hex: '#FFD700', rank: 10 }
      ];
      const batch = db.batch();
      for (const belt of beltColors) {
        batch.set(db.collection('belt_colors').doc(), belt);
      }
      await batch.commit();
      console.log('✅ Belt colors seeded');
    }

    // --- Subjects ---
    const subjectsSnap = await db.collection('subjects').limit(1).get();
    if (subjectsSnap.empty) {
      const subjects = [
        { name: 'Numération', icon: '🔢' },
        { name: 'Opérations', icon: '➕' },
        { name: 'Problèmes', icon: '🧩' },
        { name: 'Mesure', icon: '📏' },
        { name: 'Géométrie', icon: '📐' },
        { name: 'Tables', icon: '✖️' },
        { name: 'Calcul rapide', icon: '⚡' },
        { name: 'Écriture', icon: '✍️' },
        { name: 'Lecture', icon: '📖' },
        { name: 'Conjugaison', icon: '📝' },
        { name: 'Dictée', icon: '🔤' },
        { name: "Orthographe d'usage", icon: '📘' },
        { name: 'Orthographe grammaticale', icon: '📗' },
        { name: "Production d'écrit", icon: '✏️' },
        { name: 'Grammaire de la phrase', icon: '📋' },
        { name: 'Grammaire natures et fonctions', icon: '🏷️' },
        { name: 'Homophones grammaticaux', icon: '🔀' },
        { name: 'Vocabulaire', icon: '📚' }
      ];
      const batch = db.batch();
      for (const subject of subjects) {
        batch.set(db.collection('subjects').doc(), subject);
      }
      await batch.commit();
      console.log('✅ Subjects seeded');
    }

    // --- Jobs ---
    const jobsSnap = await db.collection('jobs').limit(1).get();
    if (jobsSnap.empty) {
      const jobs = [
        { name: 'Banquier', icon: '🏦', weekly_pay: 150 },
        { name: 'Chef des gêneurs', icon: '🔔', weekly_pay: 100 },
        { name: 'Météorologue', icon: '🌤️', weekly_pay: 100 },
        { name: 'Facteur', icon: '✉️', weekly_pay: 100 },
        { name: 'Bibliothécaire', icon: '📚', weekly_pay: 100 },
        { name: 'Responsable matériel', icon: '🧹', weekly_pay: 100 },
        { name: 'Responsable tableau', icon: '📋', weekly_pay: 100 },
        { name: 'Informaticien', icon: '💻', weekly_pay: 120 }
      ];
      const batch = db.batch();
      for (const job of jobs) {
        batch.set(db.collection('jobs').doc(), job);
      }
      await batch.commit();
      console.log('✅ Jobs seeded');
    }

    // --- Fine Rules ---
    const finesSnap = await db.collection('fine_rules').limit(1).get();
    if (finesSnap.empty) {
      const fines = [
        { name: 'Gêneur', icon: '🔔', amount: 10, is_active: true },
        { name: 'Bavardage', icon: '🗣️', amount: 5, is_active: true },
        { name: 'Matériel oublié', icon: '🎒', amount: 10, is_active: true },
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
      console.log('✅ Fine rules seeded');
    }

    // --- Shop Categories & Items ---
    const categoriesSnap = await db.collection('shop_categories').limit(1).get();
    if (categoriesSnap.empty) {
      // Create categories and store their IDs for items
      const categoryData = [
        { name: 'Skins Avatar', icon: '👤' },
        { name: 'Chapeaux', icon: '🎩' },
        { name: 'Accessoires', icon: '✨' },
        { name: 'Fonds', icon: '🖼️' },
        { name: 'Billets Personnalisés', icon: '💰' }
      ];

      const categoryIds = [];
      const catBatch = db.batch();
      for (const cat of categoryData) {
        const ref = db.collection('shop_categories').doc();
        catBatch.set(ref, cat);
        categoryIds.push(ref.id);
      }
      await catBatch.commit();

      // Shop items
      const items = [
        // Skins avatar (category index 0)
        { category_id: categoryIds[0], name: 'Peau Bleue', description: 'Colorie ton avatar en bleu !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#4A90D9"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Verte', description: 'Colorie ton avatar en vert !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#4AD97A"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Rose', description: 'Colorie ton avatar en rose !', price: 50, item_type: 'avatar_skin', item_data: '{"color":"#D94A8B"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Dorée', description: 'Avatar en or pur !', price: 500, item_type: 'avatar_skin', item_data: '{"color":"#FFD700"}', is_available: true },
        { category_id: categoryIds[0], name: 'Peau Arc-en-ciel', description: 'Toutes les couleurs !', price: 2000, item_type: 'avatar_skin', item_data: '{"color":"rainbow"}', is_available: true },
        // Chapeaux (category index 1)
        { category_id: categoryIds[1], name: 'Casquette', description: 'Une casquette stylée', price: 100, item_type: 'avatar_hat', item_data: '{"type":"cap"}', is_available: true },
        { category_id: categoryIds[1], name: 'Couronne', description: 'Pour les rois et reines !', price: 800, item_type: 'avatar_hat', item_data: '{"type":"crown"}', is_available: true },
        { category_id: categoryIds[1], name: 'Chapeau Magicien', description: 'Abracadabra !', price: 300, item_type: 'avatar_hat', item_data: '{"type":"wizard"}', is_available: true },
        { category_id: categoryIds[1], name: 'Bandeau Ninja', description: 'Mode ninja activé', price: 200, item_type: 'avatar_hat', item_data: '{"type":"ninja"}', is_available: true },
        { category_id: categoryIds[1], name: 'Casque Spatial', description: 'Direction la lune !', price: 1500, item_type: 'avatar_hat', item_data: '{"type":"space"}', is_available: true },
        // Accessoires (category index 2)
        { category_id: categoryIds[2], name: 'Lunettes Cool', description: 'Des lunettes de star', price: 150, item_type: 'avatar_accessory', item_data: '{"type":"sunglasses"}', is_available: true },
        { category_id: categoryIds[2], name: 'Étoiles Autour', description: 'Des étoiles brillantes', price: 250, item_type: 'avatar_accessory', item_data: '{"type":"stars"}', is_available: true },
        { category_id: categoryIds[2], name: 'Ailes', description: 'Des petites ailes !', price: 1000, item_type: 'avatar_accessory', item_data: '{"type":"wings"}', is_available: true },
        { category_id: categoryIds[2], name: 'Flammes', description: 'Trop chaud !', price: 600, item_type: 'avatar_accessory', item_data: '{"type":"flames"}', is_available: true },
        // Fonds (category index 3)
        { category_id: categoryIds[3], name: 'Fond Galaxie', description: 'L espace infini', price: 200, item_type: 'avatar_background', item_data: '{"type":"galaxy"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Forêt', description: 'Nature et arbres', price: 150, item_type: 'avatar_background', item_data: '{"type":"forest"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Océan', description: 'Sous la mer', price: 150, item_type: 'avatar_background', item_data: '{"type":"ocean"}', is_available: true },
        { category_id: categoryIds[3], name: 'Fond Lave', description: 'Comme un volcan !', price: 400, item_type: 'avatar_background', item_data: '{"type":"lava"}', is_available: true },
        // Billets personnalisés (category index 4)
        { category_id: categoryIds[4], name: 'Design Centicool', description: 'Personnalise tes centicools !', price: 100, item_type: 'cool_design_centicool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Décicool', description: 'Personnalise tes décicools !', price: 500, item_type: 'cool_design_decicool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Cool', description: 'Personnalise tes cools !', price: 1000, item_type: 'cool_design_cool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Super Cool', description: 'Personnalise tes super cools !', price: 5000, item_type: 'cool_design_supercool', item_data: '{}', is_available: true },
        { category_id: categoryIds[4], name: 'Design Méga Cool', description: 'Personnalise tes méga cools !', price: 7500, item_type: 'cool_design_megacool', item_data: '{}', is_available: true }
      ];

      // Batch write items (23 items, well under 500 limit)
      const itemBatch = db.batch();
      for (const item of items) {
        itemBatch.set(db.collection('shop_items').doc(), item);
      }
      await itemBatch.commit();
      console.log('✅ Shop categories & items seeded');
    }

    console.log('✅ Seed data check complete');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run seed on startup
seedData().catch(console.error);

module.exports = db;
