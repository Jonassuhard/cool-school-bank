const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'cool-school.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Eleves
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_config TEXT DEFAULT '{}',
    pin_code TEXT DEFAULT '0000',
    banker_code TEXT,
    class_number INTEGER,
    balance INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Matieres
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📚',
    category TEXT DEFAULT 'other'
  );

  -- Couleurs de ceintures (ordre de progression)
  CREATE TABLE IF NOT EXISTS belt_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    text_hex TEXT DEFAULT '#000000',
    rank INTEGER NOT NULL
  );

  -- Ceintures des eleves (par matiere)
  CREATE TABLE IF NOT EXISTS student_belts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    belt_color_id INTEGER NOT NULL,
    achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (belt_color_id) REFERENCES belt_colors(id),
    UNIQUE(student_id, subject_id)
  );

  -- Historique des ceintures (pour garder la trace de chaque montee)
  CREATE TABLE IF NOT EXISTS belt_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    belt_color_id INTEGER NOT NULL,
    direction TEXT DEFAULT 'up' CHECK(direction IN ('up', 'down')),
    achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (belt_color_id) REFERENCES belt_colors(id)
  );

  -- Transactions (gains et pertes)
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('earn', 'lose', 'spend', 'market_sell', 'market_buy', 'refund')),
    reason TEXT,
    created_by TEXT DEFAULT 'teacher',
    is_reversed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  -- Metiers
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '💼',
    weekly_pay INTEGER DEFAULT 100
  );

  -- Attribution des metiers (par semaine)
  CREATE TABLE IF NOT EXISTS job_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    week_start DATE NOT NULL,
    paid INTEGER DEFAULT 0,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  -- Boutique - categories
  CREATE TABLE IF NOT EXISTS shop_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🛍️'
  );

  -- Boutique - articles
  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('avatar_skin', 'avatar_hat', 'avatar_accessory', 'avatar_background', 'avatar_head', 'avatar_border', 'cool_design_centicool', 'cool_design_decicool', 'cool_design_cool', 'cool_design_supercool', 'cool_design_megacool', 'special')),
    item_data TEXT DEFAULT '{}',
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES shop_categories(id)
  );

  -- Achats des eleves
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (item_id) REFERENCES shop_items(id)
  );

  -- Marche mensuel - articles mis en vente par les eleves
  CREATE TABLE IF NOT EXISTS market_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    is_sold INTEGER DEFAULT 0,
    buyer_id INTEGER,
    market_date DATE,
    FOREIGN KEY (seller_id) REFERENCES students(id),
    FOREIGN KEY (buyer_id) REFERENCES students(id)
  );

  -- Passes journaliers (jeux, etc.)
  CREATE TABLE IF NOT EXISTS daily_passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    pass_type TEXT NOT NULL,
    pass_date DATE NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE(student_id, pass_type, pass_date)
  );

  -- Configuration (teacher PIN, school info, etc.)
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ==================== MIGRATION / SEED ====================

// Add missing columns if upgrading from old version
try { db.exec('ALTER TABLE belt_colors ADD COLUMN text_hex TEXT DEFAULT "#000000"'); } catch(e) {}
try { db.exec('ALTER TABLE subjects ADD COLUMN category TEXT DEFAULT "other"'); } catch(e) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN is_reversed INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE students ADD COLUMN class_number INTEGER'); } catch(e) {}
try {
  db.exec(`CREATE TABLE IF NOT EXISTS daily_passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    pass_type TEXT NOT NULL,
    pass_date DATE NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, pass_type, pass_date)
  )`);
} catch(e) {}

// Create belt_history table if not exists (already in CREATE above, but safe)
try {
  db.exec(`CREATE TABLE IF NOT EXISTS belt_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    belt_color_id INTEGER NOT NULL,
    direction TEXT DEFAULT 'up',
    achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
} catch(e) {}

// Create config table if not exists
try {
  db.exec(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
} catch(e) {}

// ==================== MIGRATION: Recreate shop_items to support avatar_head ====================
// Test if we can INSERT avatar_head type — if CHECK blocks it, recreate table
try {
  db.exec(`INSERT INTO shop_items (category_id, name, description, price, item_type, item_data) VALUES (1, '__test_head__', 'test', 0, 'avatar_head', '{}')`);
  // It worked — remove test row and continue
  db.exec(`DELETE FROM shop_items WHERE name = '__test_head__'`);
} catch(e) {
  if (e.code === 'SQLITE_CONSTRAINT_CHECK') {
    // CHECK constraint blocks avatar_head — recreate table without strict CHECK
    console.log('  🔄 Migration shop_items: removing CHECK constraint...');
    db.exec(`
      CREATE TABLE shop_items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        item_data TEXT DEFAULT '{}',
        is_available INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES shop_categories(id)
      );
      INSERT INTO shop_items_new SELECT * FROM shop_items;
      DROP TABLE shop_items;
      ALTER TABLE shop_items_new RENAME TO shop_items;
    `);
    console.log('  ✅ Migration shop_items: avatar_head support added');
  }
}

// ==================== SEED: BELT COLORS (11 ceintures La HERSE) ====================
const LA_HERSE_BELTS = [
  ['Rose',     '#FFD4E8', '#000000', 1],
  ['Blanche',  '#FFFFFF', '#000000', 2],
  ['Jaune',    '#FFFF00', '#000000', 3],
  ['Orange',   '#FFA500', '#000000', 4],
  ['Verte',    '#00B050', '#000000', 5],
  ['Bleue',    '#4472C4', '#FFFFFF', 6],
  ['Violette', '#9933FF', '#FFFFFF', 7],
  ['Marron',   '#833C0B', '#FFFFFF', 8],
  ['Grise',    '#A6A6A6', '#000000', 9],
  ['Noire',    '#000000', '#FFFFFF', 10],
  ['Doree',    '#FFD700', '#000000', 11]
];

const existingBelts = db.prepare('SELECT COUNT(*) as count FROM belt_colors').get();
if (existingBelts.count === 0) {
  const seedBelt = db.prepare('INSERT INTO belt_colors (name, color_hex, text_hex, rank) VALUES (?, ?, ?, ?)');
  for (const [name, hex, textHex, rank] of LA_HERSE_BELTS) {
    seedBelt.run(name, hex, textHex, rank);
  }
  console.log('  ✅ 11 ceintures La HERSE initialisees');
} else if (existingBelts.count < 11) {
  // Migration: old 8-belt system -> 11-belt La HERSE system
  console.log(`  ⚠️  Migration ceintures: ${existingBelts.count} -> 11 ceintures`);

  // Drop and recreate
  const oldBelts = db.prepare('SELECT * FROM student_belts').all();
  const oldColors = db.prepare('SELECT * FROM belt_colors ORDER BY rank').all();

  // Build mapping: old rank -> new belt id (best effort)
  db.exec('DELETE FROM belt_colors');
  const seedBelt = db.prepare('INSERT INTO belt_colors (name, color_hex, text_hex, rank) VALUES (?, ?, ?, ?)');
  for (const [name, hex, textHex, rank] of LA_HERSE_BELTS) {
    seedBelt.run(name, hex, textHex, rank);
  }

  // Map old belts to new ones (by rank, offset by 1 since old started at Blanche=1)
  const newColors = db.prepare('SELECT * FROM belt_colors ORDER BY rank').all();
  for (const sb of oldBelts) {
    const oldBelt = oldColors.find(c => c.id === sb.belt_color_id);
    if (oldBelt) {
      // Old rank 1 (Blanche) -> new rank 2 (Blanche)
      const newRank = Math.min(oldBelt.rank + 1, 11);
      const newBelt = newColors.find(c => c.rank === newRank);
      if (newBelt) {
        db.prepare('UPDATE student_belts SET belt_color_id = ? WHERE id = ?').run(newBelt.id, sb.id);
      }
    }
  }
  console.log('  ✅ Migration ceintures terminee');
}

// ==================== SEED: SUBJECTS (20 matieres La HERSE) ====================
const LA_HERSE_SUBJECTS = [
  // Francais (11)
  ['Ecriture',                    '✍️',  'francais'],
  ['Lecture',                     '📖', 'francais'],
  ['Conjugaison',                 '🔄', 'francais'],
  ['Dictee',                      '📝', 'francais'],
  ['Orthographe d\'usage',        '📏', 'francais'],
  ['Orthographe grammaticale',    '📐', 'francais'],
  ['Production d\'ecrit',         '✏️',  'francais'],
  ['Grammaire de la phrase',      '🔤', 'francais'],
  ['Grammaire nature et fonction','🏷️',  'francais'],
  ['Homophones grammaticaux',     '🔀', 'francais'],
  ['Vocabulaire',                 '📚', 'francais'],
  // Mathematiques (8)
  ['Numeration',                  '🔢', 'maths'],
  ['Operations',                  '➕', 'maths'],
  ['Problemes',                   '🧩', 'maths'],
  ['Mesure',                      '📏', 'maths'],
  ['Geometrie',                   '📐', 'maths'],
  ['Tables de multiplication',    '✖️',  'maths'],
  ['Calcul rapide',               '⚡', 'maths'],
  ['Soroban',                     '🧮', 'maths'],
  // Divers (1)
  ['Abacus',                      '🎯', 'divers']
];

const existingSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects').get();
if (existingSubjects.count === 0) {
  const seedSubject = db.prepare('INSERT INTO subjects (name, icon, category) VALUES (?, ?, ?)');
  for (const [name, icon, category] of LA_HERSE_SUBJECTS) {
    seedSubject.run(name, icon, category);
  }
  console.log('  ✅ 20 matieres La HERSE initialisees');
} else if (existingSubjects.count < 20) {
  // Migration: add missing subjects
  console.log(`  ⚠️  Migration matieres: ${existingSubjects.count} -> 20 matieres`);
  const existingNames = db.prepare('SELECT name FROM subjects').all().map(s => s.name);
  const seedSubject = db.prepare('INSERT OR IGNORE INTO subjects (name, icon, category) VALUES (?, ?, ?)');

  // Remove old generic subjects that don't match
  const genericSubjects = ['Sciences', 'Histoire-Geo', 'Anglais', 'Arts', 'Sport'];
  for (const name of genericSubjects) {
    if (existingNames.includes(name)) {
      // Check if any student has a belt for this subject
      const subject = db.prepare('SELECT id FROM subjects WHERE name = ?').get(name);
      if (subject) {
        const hasBelts = db.prepare('SELECT COUNT(*) as c FROM student_belts WHERE subject_id = ?').get(subject.id);
        if (hasBelts.c === 0) {
          db.prepare('DELETE FROM subjects WHERE id = ?').run(subject.id);
        }
      }
    }
  }

  // Rename existing if needed
  const renameMap = {
    'Mathematiques': null, // generic, keep if belts exist
    'Francais': null
  };

  // Add all La HERSE subjects
  for (const [name, icon, category] of LA_HERSE_SUBJECTS) {
    seedSubject.run(name, icon, category);
  }

  // Update category for existing subjects
  db.prepare("UPDATE subjects SET category = 'francais' WHERE name IN ('Ecriture','Lecture','Conjugaison','Dictee','Orthographe d''usage','Orthographe grammaticale','Production d''ecrit','Grammaire de la phrase','Grammaire nature et fonction','Homophones grammaticaux','Vocabulaire')").run();
  db.prepare("UPDATE subjects SET category = 'maths' WHERE name IN ('Numeration','Operations','Problemes','Mesure','Geometrie','Tables de multiplication','Calcul rapide','Soroban')").run();
  db.prepare("UPDATE subjects SET category = 'divers' WHERE name = 'Abacus'").run();

  console.log('  ✅ Migration matieres terminee');
}

// ==================== SEED: JOBS ====================
const seedJobs = db.prepare('INSERT OR IGNORE INTO jobs (name, icon, weekly_pay) VALUES (?, ?, ?)');
const jobs = [
  ['Banquier', '🏦', 150],
  ['Chef des geneurs', '🔔', 100],
  ['Meteorologue', '🌤️', 100],
  ['Facteur', '✉️', 100],
  ['Bibliothecaire', '📚', 100],
  ['Responsable materiel', '🧹', 100],
  ['Responsable tableau', '📋', 100],
  ['Informaticien', '💻', 120]
];

const existingJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
if (existingJobs.count === 0) {
  for (const [name, icon, pay] of jobs) {
    seedJobs.run(name, icon, pay);
  }
  console.log('  ✅ 8 metiers initialises');
}

// ==================== SEED: SHOP ====================
const existingCategories = db.prepare('SELECT COUNT(*) as count FROM shop_categories').get();
if (existingCategories.count === 0) {
  db.exec(`
    INSERT INTO shop_categories (name, icon) VALUES
    ('Skins Avatar', '👤'),
    ('Chapeaux', '🎩'),
    ('Accessoires', '✨'),
    ('Fonds', '🖼️'),
    ('Billets Personnalises', '💰');
  `);

  db.exec(`
    INSERT INTO shop_items (category_id, name, description, price, item_type, item_data) VALUES
    (1, 'Peau Bleue', 'Colorie ton avatar en bleu !', 50, 'avatar_skin', '{"color":"#4A90D9"}'),
    (1, 'Peau Verte', 'Colorie ton avatar en vert !', 50, 'avatar_skin', '{"color":"#4AD97A"}'),
    (1, 'Peau Rose', 'Colorie ton avatar en rose !', 50, 'avatar_skin', '{"color":"#D94A8B"}'),
    (1, 'Peau Doree', 'Avatar en or pur !', 500, 'avatar_skin', '{"color":"#FFD700"}'),
    (1, 'Peau Arc-en-ciel', 'Toutes les couleurs !', 2000, 'avatar_skin', '{"color":"rainbow"}'),
    (2, 'Casquette', 'Une casquette stylee', 100, 'avatar_hat', '{"type":"cap"}'),
    (2, 'Couronne', 'Pour les rois et reines !', 800, 'avatar_hat', '{"type":"crown"}'),
    (2, 'Chapeau Magicien', 'Abracadabra !', 300, 'avatar_hat', '{"type":"wizard"}'),
    (2, 'Bandeau Ninja', 'Mode ninja active', 200, 'avatar_hat', '{"type":"ninja"}'),
    (2, 'Casque Spatial', 'Direction la lune !', 1500, 'avatar_hat', '{"type":"space"}'),
    (3, 'Lunettes Cool', 'Des lunettes de star', 150, 'avatar_accessory', '{"type":"sunglasses"}'),
    (3, 'Etoiles Autour', 'Des etoiles brillantes', 250, 'avatar_accessory', '{"type":"stars"}'),
    (3, 'Ailes', 'Des petites ailes !', 1000, 'avatar_accessory', '{"type":"wings"}'),
    (3, 'Flammes', 'Trop chaud !', 600, 'avatar_accessory', '{"type":"flames"}'),
    (4, 'Fond Galaxie', 'L espace infini', 200, 'avatar_background', '{"type":"galaxy"}'),
    (4, 'Fond Foret', 'Nature et arbres', 150, 'avatar_background', '{"type":"forest"}'),
    (4, 'Fond Ocean', 'Sous la mer', 150, 'avatar_background', '{"type":"ocean"}'),
    (4, 'Fond Lave', 'Comme un volcan !', 400, 'avatar_background', '{"type":"lava"}'),
    (5, 'Design Centicool', 'Personnalise tes centicools !', 100, 'cool_design_centicool', '{}'),
    (5, 'Design Decicool', 'Personnalise tes decicools !', 500, 'cool_design_decicool', '{}'),
    (5, 'Design Cool', 'Personnalise tes cools !', 1000, 'cool_design_cool', '{}'),
    (5, 'Design Super Cool', 'Personnalise tes super cools !', 5000, 'cool_design_supercool', '{}'),
    (5, 'Design Mega Cool', 'Personnalise tes mega cools !', 7500, 'cool_design_megacool', '{}');
  `);
  console.log('  ✅ Boutique initialisee');
}

// ==================== SEED: HEADS CATEGORY (migration for existing DBs) ====================
// Ensure category exists
const hasHeadsCat = db.prepare("SELECT COUNT(*) as c FROM shop_categories WHERE name = 'Tetes'").get();
if (hasHeadsCat.c === 0) {
  db.exec(`INSERT INTO shop_categories (name, icon) VALUES ('Tetes', '🐲')`);
}
const hasHeadItems = db.prepare("SELECT COUNT(*) as c FROM shop_items WHERE item_type = 'avatar_head'").get();
if (hasHeadItems.c === 0) {
  const headsCatId = db.prepare("SELECT id FROM shop_categories WHERE name = 'Tetes'").get().id;
  const insertHead = db.prepare('INSERT INTO shop_items (category_id, name, description, price, item_type, item_data) VALUES (?, ?, ?, ?, ?, ?)');
  const heads = [
    ['Tete de Loup', 'Grrrr ! Le loup feroce !', 300, '{"type":"wolf"}'],
    ['Tete de Renard', 'Ruse comme un renard !', 300, '{"type":"fox"}'],
    ['Tete de Dragon', 'Crache du feu !', 800, '{"type":"dragon"}'],
    ['Tete de Lion', 'Le roi de la jungle !', 600, '{"type":"lion"}'],
    ['Tete de Chat', 'Miaou ! Trop mignon !', 150, '{"type":"cat"}'],
    ['Tete de Panda', 'Noir et blanc zen !', 250, '{"type":"panda"}'],
    ['Tete de Robot', 'Bip bop ! Mode robot !', 500, '{"type":"robot"}'],
    ['Tete de Zombie', 'Braaains ! Attention !', 400, '{"type":"zombie"}'],
    ['Tete d Aigle', 'Vue percante !', 350, '{"type":"eagle"}'],
    ['Tete de Hibou', 'Sage comme un hibou !', 200, '{"type":"owl"}'],
    ['Tete de Requin', 'Les dents de la mer !', 700, '{"type":"shark"}'],
    ['Tete de Singe', 'Ouh ouh ah ah !', 250, '{"type":"monkey"}'],
    ['Tete de Licorne', 'Magique et unique !', 1500, '{"type":"unicorn"}'],
    ['Tete de Phoenix', 'Renaissance eternelle !', 3000, '{"type":"phoenix"}'],
    ['Tete de Demon', 'L ombre incarnee !', 2000, '{"type":"demon"}'],
  ];
  for (const [name, desc, price, data] of heads) {
    insertHead.run(headsCatId, name, desc, price, 'avatar_head', data);
  }
  console.log('  ✅ 15 tetes de creatures ajoutees a la boutique');
}

// ==================== SEED: BORDERS CATEGORY (migration for existing DBs) ====================
const hasBordersCat = db.prepare("SELECT COUNT(*) as c FROM shop_categories WHERE name = 'Bordures'").get();
if (hasBordersCat.c === 0) {
  db.exec(`INSERT INTO shop_categories (name, icon) VALUES ('Bordures', '🖼️')`);
}
const hasBorderItems = db.prepare("SELECT COUNT(*) as c FROM shop_items WHERE item_type = 'avatar_border'").get();
if (hasBorderItems.c === 0) {
  const bordersCatId = db.prepare("SELECT id FROM shop_categories WHERE name = 'Bordures'").get().id;
  const insertBorder = db.prepare('INSERT INTO shop_items (category_id, name, description, price, item_type, item_data) VALUES (?, ?, ?, ?, ?, ?)');
  const borders = [
    ['Bordure Rouge', 'Un cadre rouge vif !', 60, '{"type":"solid","color":"#FF4444"}'],
    ['Bordure Bleue', 'Un cadre bleu ocean !', 60, '{"type":"solid","color":"#4488FF"}'],
    ['Bordure Verte', 'Un cadre vert nature !', 60, '{"type":"solid","color":"#44DD44"}'],
    ['Bordure Violette', 'Un cadre violet royal !', 60, '{"type":"solid","color":"#AA44FF"}'],
    ['Bordure Rose', 'Un cadre rose bonbon !', 60, '{"type":"solid","color":"#FF69B4"}'],
    ['Bordure Orange', 'Un cadre orange energie !', 60, '{"type":"solid","color":"#FF8C00"}'],
    ['Bordure Arc-en-ciel', 'Toutes les couleurs qui tournent !', 360, '{"type":"rainbow"}'],
    ['Bordure Doree', 'Un cadre en or massif !', 600, '{"type":"gold"}'],
    ['Bordure Argentee', 'Un cadre en argent poli !', 480, '{"type":"silver"}'],
    ['Bordure Iridescente', 'Reflets changeants magiques !', 960, '{"type":"iridescent"}'],
    ['Bordure Paillettes', 'Ca brille de partout !', 720, '{"type":"sparkle"}'],
    ['Bordure Flammes', 'Ton avatar est en feu !', 840, '{"type":"flames"}'],
    ['Bordure Glace', 'Givre et cristaux de glace !', 840, '{"type":"ice"}'],
    ['Bordure Dragon', 'Ecailles et griffes de dragon !', 1200, '{"type":"dragon"}'],
    ['Bordure Neon', 'Lumieres neon fluo !', 600, '{"type":"neon"}'],
    ['Bordure Pixel', 'Style retro pixelise !', 240, '{"type":"pixel"}'],
    ['Bordure Galaxie', 'Les etoiles autour de toi !', 1080, '{"type":"galaxy"}'],
    ['Bordure Lave', 'Magma en fusion !', 960, '{"type":"lava"}'],
    ['Bordure Legendaire', 'La bordure ultime !', 3600, '{"type":"legendary"}'],
    ['Bordure Ombre', 'L obscurite t entoure !', 1800, '{"type":"shadow"}'],
  ];
  for (const [name, desc, price, data] of borders) {
    insertBorder.run(bordersCatId, name, desc, price, 'avatar_border', data);
  }
  console.log('  ✅ 20 bordures ajoutees a la boutique');
}

// ==================== SEED: CONFIG ====================
const existingConfig = db.prepare('SELECT COUNT(*) as count FROM config').get();
if (existingConfig.count === 0) {
  const seedConfig = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
  seedConfig.run('teacher_pin', '1234');
  seedConfig.run('school_name', 'Ecole La HERSE');
  seedConfig.run('teacher_name', 'Mme Trouve');
  seedConfig.run('class_name', 'Classe 2');
  seedConfig.run('school_year', '2025-2026');
  console.log('  ✅ Configuration initialisee');
}

module.exports = db;
