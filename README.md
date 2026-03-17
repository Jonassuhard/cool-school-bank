# 🏰 COOL School Bank — École La HERSE

## C'est quoi ?

**COOL School Bank** est une application web de **monnaie virtuelle scolaire** pour l'**École primaire publique La Herse** à Montreuil-Bellay (49260, Maine-et-Loire). Les élèves gagnent des "centicools" (cc) grâce à leur comportement, travail et métiers de classe, et peuvent les dépenser dans une boutique d'avatars.

- **École** : La Herse, Place de la République, 49260 Montreuil-Bellay
- **Niveau** : Primaire (enfants 6-11 ans), ~130 élèves
- **Classe configurée** : 23 élèves

---

## 🌐 Liens importants

| Service | URL | Identifiants |
|---------|-----|-------------|
| **Site live** | https://cool-school-bank.onrender.com | — |
| **Render Dashboard** | https://dashboard.render.com/web/srv-d6s186npm1nc73drvdr0 | Compte Jonas |
| **Firebase Console** | https://console.firebase.google.com/u/0/project/cool-school-bank | Compte Jonas |
| **GitHub Repo** | https://github.com/Jonassuhard/cool-school-bank | Branche `main` |

### Codes d'accès à l'app
- **Code Prof** : `1234` (par défaut — CHANGE-LE en production via l'interface Prof > Paramètres)
- **Code Élève** : `0000` (PIN par défaut, chaque élève peut le changer)
- **Code Banquier** : Code unique à 5 chiffres attribué automatiquement aux élèves ayant le métier Banquier

---

## 📁 Où sont les fichiers ?

```
/Users/asterion/Desktop/COOL-LA-HERSE-DEPLOY/    ← DOSSIER PRINCIPAL (source de vérité)
├── database.js          ← Connexion Firebase + seed data (23 élèves, 58 articles boutique)
├── server.js            ← Backend Express.js (API REST, sécurité, auth)
├── package.json         ← Dépendances Node.js
├── package-lock.json
├── README.md            ← Ce fichier
└── public/              ← Frontend (HTML/CSS/JS statique)
    ├── index.html       ← Page principale (château + herse animation)
    ├── teaser.html      ← Page teaser
    ├── css/
    │   └── style.css    ← Styles (château, herse, animations, pixel art)
    └── js/
        ├── app.js       ← Logique frontend (2000+ lignes)
        └── avatar.js    ← Système d'avatars pixel art

/tmp/cool-school-bank/                            ← REPO GIT (clone du GitHub)
├── (mêmes fichiers, synchronisés avec GitHub)
└── .git/

/Users/asterion/Desktop/PROJETS_DEV/COOL LA HERSE/  ← ANCIEN projet SQLite (archivé, référence)
```

---

## 🏗️ Architecture technique

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Navigateur     │────▶│   Render (Node)   │────▶│ Firebase         │
│   (HTML/JS/CSS)  │◀────│   Express.js      │◀────│ Firestore DB     │
│                  │     │   Port 10000      │     │ cool-school-bank │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Stack
- **Frontend** : HTML5/CSS3/JS vanilla (pas de framework) + animations CSS
- **Backend** : Node.js + Express.js
- **Base de données** : Firebase Firestore (NoSQL, cloud)
- **Hébergement** : Render.com (plan Free, spin down après 15 min d'inactivité)
- **Repo** : GitHub (Jonassuhard/cool-school-bank), branche `main`, deploy manuel

### Collections Firestore
| Collection | Contenu | Docs |
|---|---|---|
| `students` | 23 élèves (prénom, nom, PIN, balance, avatar) | 23 |
| `belt_colors` | 11 couleurs de ceintures (Rose → Dorée) | 11 |
| `subjects` | 20 matières scolaires | 20 |
| `student_belts` | Progression des ceintures par élève/matière | ~460 |
| `shop_categories` | 7 catégories boutique | 7 |
| `shop_items` | 58 articles (skins, chapeaux, accessoires, fonds, billets, têtes, bordures) | 58 |
| `jobs` | 8 métiers de classe (Banquier, Facteur, etc.) | 8 |
| `fine_rules` | Règles d'amendes | 8 |
| `config` | Configuration (teacher_pin, etc.) | ~2 |
| `transactions` | Historique de toutes les transactions | variable |
| `purchases` | Achats boutique des élèves | variable |
| `daily_passes` | Passes Jeux achetés | variable |
| `job_assignments` | Attribution hebdomadaire des métiers | variable |
| `auctions` | Enchères | variable |
| `auction_bids` | Mises aux enchères | variable |

---

## 🔒 Sécurité (ajoutée le 17/03/2026)

| Protection | Détail |
|---|---|
| **Sessions serveur** | Tokens crypto 64 chars, TTL 8h, stockés en mémoire |
| **Rate limiting** | Max 8 tentatives de login / 2 minutes par IP |
| **Auth middleware** | `requireTeacher` (14 routes), `requireTeacherOrBanker` (7 routes), `requireAuth` (5 routes) |
| **Headers CSP** | Content-Security-Policy, X-Frame-Options DENY, X-XSS-Protection, nosniff |
| **Sanitisation** | HTML entities escaped dans les raisons de transactions |
| **Limite payload** | express.json limit 100kb |

### Routes protégées
- **Prof uniquement** : `/api/students/admin`, `/api/config`, créer/supprimer élèves, export, amendes, enchères
- **Prof ou Banquier** : Transactions, attribution métiers, payer salaires, amendes
- **Tout utilisateur connecté** : Historique, profil, ceintures, achats

---

## 🎮 Fonctionnalités

### Pour les élèves (login par avatar + PIN)
- 💰 Voir son solde en centicools (cc)
- 🛒 Acheter dans la boutique (58 articles : skins, chapeaux, têtes d'animaux, bordures...)
- 🎮 Acheter un Passe Jeux (20cc/jour)
- 🎨 Personnaliser son avatar pixel art
- 📊 Voir son historique de transactions
- 🥋 Voir ses ceintures par matière (11 niveaux × 20 matières)

### Pour le banquier (login par code 5 chiffres)
- 💸 Donner/retirer des cools aux élèves
- 📋 Voir les transactions
- ✅ Appliquer des amendes

### Pour le professeur (login par code PIN)
- 👨‍🏫 Gérer tous les élèves (ajouter, supprimer, reset PIN)
- 💰 Donner/retirer des cools (individuel ou en masse)
- 🥋 Gérer les ceintures (monter, descendre, régler)
- 💼 Attribuer les métiers de la semaine
- 💵 Payer les salaires
- ⚖️ Gérer les règles d'amendes
- 🔨 Créer des enchères
- 📊 Voir les statistiques et exporter les données
- 🔑 Changer le code prof

---

## 🚀 Comment déployer une mise à jour

### 1. Modifier les fichiers dans COOL-LA-HERSE-DEPLOY
```bash
cd /Users/asterion/Desktop/COOL-LA-HERSE-DEPLOY/
# Faire tes modifications...
```

### 2. Copier vers le repo git et pousser
```bash
cp -r /Users/asterion/Desktop/COOL-LA-HERSE-DEPLOY/* /tmp/cool-school-bank/
cd /tmp/cool-school-bank
git add -A
git commit -m "Description de la modification"
git push origin main
```

### 3. Déployer sur Render
1. Aller sur https://dashboard.render.com/web/srv-d6s186npm1nc73drvdr0
2. Cliquer **Manual Deploy** → **Deploy latest commit**
3. Attendre ~2 min que le build et deploy finissent
4. Vérifier sur https://cool-school-bank.onrender.com

### ⚠️ Points importants
- Le deploy est **MANUEL** (pas d'auto-deploy)
- Render plan Free : le serveur **s'éteint après 15 min d'inactivité** → premier chargement peut prendre ~50 sec
- Le seed des données est **conditionnel** : ne re-seed que si la collection `students` est vide
- Pour forcer un re-seed : supprimer manuellement la collection `students` dans Firebase Console, puis redéployer
- Les sessions sont en mémoire : un redéploiement **déconnecte tout le monde** (ils doivent se re-loguer)

---

## 🔑 Variables d'environnement Render

| Variable | Valeur | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | `{"type":"service_account",...}` | JSON complet du service account Firebase |
| `TEACHER_PIN` | (optionnel) | PIN prof par défaut si pas dans Firestore |

Le `FIREBASE_SERVICE_ACCOUNT` est configuré dans Render > Environment. Ne JAMAIS le mettre dans le code ou sur GitHub.

---

## 📝 Pour une prochaine instance de Claude

Si tu reprends ce projet, voici ce qu'il faut savoir :

1. **Le dossier source de vérité** est `/Users/asterion/Desktop/COOL-LA-HERSE-DEPLOY/`
2. **Le repo git** est à `/tmp/cool-school-bank/` — il faut le re-cloner si le /tmp est vidé :
   ```bash
   cd /tmp && git clone https://github.com/Jonassuhard/cool-school-bank.git
   ```
3. **Firebase** : projet `cool-school-bank`, la clé est dans les env vars de Render
4. **Le deploy est manuel** sur Render : il faut push sur GitHub puis cliquer "Deploy latest commit"
5. **Le seed est conditionnel** : ne touche pas les données existantes au redémarrage
6. **Les 23 élèves** sont hardcodés dans `database.js` (fonction `seedData`)
7. **Les 58 articles boutique** sont aussi dans `database.js` (7 catégories)
8. **La sécurité** utilise des tokens en mémoire (pas de JWT/cookies) — simple mais suffisant pour une école primaire
9. **Le frontend** est 100% vanilla JS, pas de build step, pas de framework
10. **L'animation du château** est en pure CSS dans `style.css` + HTML dans `index.html`

### Fichiers clés à lire en priorité :
- `server.js` : toutes les routes API (~2050 lignes)
- `public/js/app.js` : toute la logique frontend (~2060 lignes)
- `database.js` : seed data et connexion Firebase (~320 lignes)
- `public/css/style.css` : styles et animations
- `public/index.html` : structure HTML du château et de l'app
