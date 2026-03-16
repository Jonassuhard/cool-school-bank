// ========== PIXEL AVATAR SYSTEM ==========
// Avatars are drawn on a canvas using pixel art style

const AVATAR_SIZE = 16; // 16x16 pixel grid
const PIXEL_SCALE = 12; // Each pixel = 12px on screen

// Default avatar config
const DEFAULT_AVATAR = {
  skinColor: '#FFD5B0',
  hairColor: '#4A2800',
  hairStyle: 0,
  eyeStyle: 0,
  mouthStyle: 0,
  shirtColor: '#4A90D9',
  // Equipped items from shop
  hat: null,
  accessory: null,
  background: null,
  skinOverride: null,
  head: null,  // creature head (replaces human head when set)
  border: null  // animated border around avatar
};

// Skin color options
const SKIN_COLORS = [
  '#FFDFC4', '#F0C8A0', '#FFD5B0', '#D4A373',
  '#C68642', '#8D5524', '#6B3A2A', '#4A2511',
  '#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD'
];

// Hair color options
const HAIR_COLORS = [
  '#4A2800', '#1a1a1a', '#8B4513', '#DAA520',
  '#FF6347', '#FF69B4', '#4169E1', '#32CD32',
  '#9400D3', '#FFFFFF', '#FF8C00', '#00CED1'
];

// Hair styles (pixel patterns - relative to head)
const HAIR_STYLES = [
  { name: 'Court', emoji: '👦' },
  { name: 'Long', emoji: '👧' },
  { name: 'Crête', emoji: '🧑' },
  { name: 'Bouclé', emoji: '👩‍🦱' },
  { name: 'Chauve', emoji: '🧑‍🦲' },
  { name: 'Couettes', emoji: '👧' }
];

const EYE_STYLES = [
  { name: 'Normal', emoji: '👀' },
  { name: 'Joyeux', emoji: '😊' },
  { name: 'Étoiles', emoji: '🤩' },
  { name: 'Cool', emoji: '😎' },
  { name: 'Clin', emoji: '😉' }
];

const MOUTH_STYLES = [
  { name: 'Sourire', emoji: '😀' },
  { name: 'Content', emoji: '😄' },
  { name: 'Surpris', emoji: '😮' },
  { name: 'Langue', emoji: '😛' },
  { name: 'Neutre', emoji: '😐' }
];

// Draw a pixel avatar on a canvas element
function drawAvatar(container, config, size = 200) {
  const cfg = { ...DEFAULT_AVATAR, ...config };

  // Create or reuse canvas FIRST (before border, since innerHTML='' would clear overlay)
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);
  }

  // Now apply border (adds overlay after canvas)
  applyAvatarBorder(container, cfg.border, size);

  canvas.width = size;
  canvas.height = size;
  canvas.style.imageRendering = 'pixelated';
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  const ctx = canvas.getContext('2d');
  const ps = size / AVATAR_SIZE; // pixel size

  // Helper to draw a pixel
  function px(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * ps, y * ps, ps, ps);
  }

  // Clear
  ctx.clearRect(0, 0, size, size);

  // Background
  if (cfg.background) {
    drawBackground(ctx, cfg.background, size);
  } else {
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, 0, size, size);
  }

  const skin = cfg.skinOverride === 'rainbow' ? null : (cfg.skinOverride || cfg.skinColor);

  // Body/Shirt (rows 12-15)
  for (let x = 4; x <= 11; x++) {
    for (let y = 12; y <= 15; y++) {
      px(x, y, cfg.shirtColor);
    }
  }
  // Shoulders
  for (let x = 3; x <= 12; x++) {
    px(x, 13, cfg.shirtColor);
    px(x, 14, cfg.shirtColor);
    px(x, 15, cfg.shirtColor);
  }

  // === CREATURE HEAD MODE ===
  if (cfg.head) {
    // Neck matches creature
    const neckColor = getCreatureNeckColor(cfg.head);
    px(7, 11, neckColor);
    px(8, 11, neckColor);
    // Draw creature head (replaces human head, hair, eyes, mouth)
    drawCreatureHead(px, cfg.head);
  } else {
    // === HUMAN HEAD MODE ===
    // Neck
    px(7, 11, skin || '#FFD5B0');
    px(8, 11, skin || '#FFD5B0');

    // Head (rows 3-10, cols 5-10)
    if (cfg.skinOverride === 'rainbow') {
      const rainbow = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF0000'];
      let ci = 0;
      for (let y = 3; y <= 10; y++) {
        for (let x = 5; x <= 10; x++) {
          px(x, y, rainbow[ci % rainbow.length]);
        }
        ci++;
      }
    } else {
      for (let y = 3; y <= 10; y++) {
        for (let x = 5; x <= 10; x++) {
          px(x, y, skin);
        }
      }
    }

    // Ears
    px(4, 6, skin || '#FFD5B0');
    px(4, 7, skin || '#FFD5B0');
    px(11, 6, skin || '#FFD5B0');
    px(11, 7, skin || '#FFD5B0');

    // Eyes
    drawEyes(px, cfg.eyeStyle);

    // Mouth
    drawMouth(px, cfg.mouthStyle);

    // Hair
    drawHair(px, cfg.hairStyle, cfg.hairColor);

    // Hat (from shop)
    if (cfg.hat) {
      drawHat(px, cfg.hat);
    }
  }

  // Accessory (from shop) - works with both modes
  if (cfg.accessory) {
    drawAccessory(ctx, cfg.accessory, size, ps);
  }
}

function drawEyes(px, style) {
  const eyeColor = '#1a1a1a';
  const white = '#FFFFFF';

  switch(style) {
    case 0: // Normal
      px(6, 6, white); px(7, 6, eyeColor);
      px(9, 6, white); px(8, 6, eyeColor);
      break;
    case 1: // Joyeux (fermés)
      px(6, 6, eyeColor); px(7, 6, eyeColor);
      px(9, 6, eyeColor); px(8, 6, eyeColor);
      px(6, 7, eyeColor); px(9, 7, eyeColor);
      break;
    case 2: // Étoiles
      px(6, 6, '#FFD700'); px(7, 6, '#FFD700');
      px(9, 6, '#FFD700'); px(8, 6, '#FFD700');
      px(6, 5, '#FFD700'); px(9, 5, '#FFD700');
      break;
    case 3: // Cool (lunettes)
      px(6, 6, eyeColor); px(7, 6, eyeColor);
      px(8, 6, eyeColor); px(9, 6, eyeColor);
      px(5, 6, '#333'); px(10, 6, '#333');
      px(5, 5, '#333'); px(6, 5, '#333'); px(7, 5, '#333');
      px(8, 5, '#333'); px(9, 5, '#333'); px(10, 5, '#333');
      break;
    case 4: // Clin d'oeil
      px(6, 6, white); px(7, 6, eyeColor);
      px(9, 6, eyeColor); px(8, 6, eyeColor);
      break;
  }
}

function drawMouth(px, style) {
  switch(style) {
    case 0: // Sourire
      px(7, 9, '#C0392B');
      px(8, 9, '#C0392B');
      px(6, 8, '#C0392B');
      px(9, 8, '#C0392B');
      break;
    case 1: // Content (grand sourire)
      px(6, 8, '#C0392B');
      px(7, 9, '#C0392B');
      px(8, 9, '#C0392B');
      px(9, 8, '#C0392B');
      px(7, 8, '#FF6B6B');
      px(8, 8, '#FF6B6B');
      break;
    case 2: // Surpris
      px(7, 8, '#C0392B');
      px(8, 8, '#C0392B');
      px(7, 9, '#C0392B');
      px(8, 9, '#C0392B');
      break;
    case 3: // Langue
      px(7, 8, '#C0392B');
      px(8, 8, '#C0392B');
      px(7, 9, '#FF6B6B');
      px(8, 9, '#FF6B6B');
      px(8, 10, '#FF6B6B');
      break;
    case 4: // Neutre
      px(7, 9, '#C0392B');
      px(8, 9, '#C0392B');
      break;
  }
}

function drawHair(px, style, color) {
  switch(style) {
    case 0: // Court
      for (let x = 5; x <= 10; x++) { px(x, 2, color); px(x, 3, color); }
      px(5, 4, color); px(10, 4, color);
      break;
    case 1: // Long
      for (let x = 5; x <= 10; x++) { px(x, 2, color); px(x, 3, color); }
      px(4, 3, color); px(4, 4, color); px(4, 5, color); px(4, 6, color); px(4, 7, color); px(4, 8, color);
      px(11, 3, color); px(11, 4, color); px(11, 5, color); px(11, 6, color); px(11, 7, color); px(11, 8, color);
      px(5, 4, color); px(10, 4, color);
      break;
    case 2: // Crête
      for (let x = 7; x <= 8; x++) {
        px(x, 0, color); px(x, 1, color); px(x, 2, color); px(x, 3, color);
      }
      for (let x = 5; x <= 10; x++) { px(x, 3, color); }
      break;
    case 3: // Bouclé
      for (let x = 4; x <= 11; x++) { px(x, 2, color); }
      for (let x = 5; x <= 10; x++) { px(x, 3, color); }
      px(4, 3, color); px(4, 4, color); px(4, 5, color);
      px(11, 3, color); px(11, 4, color); px(11, 5, color);
      px(5, 2, color); px(7, 1, color); px(9, 1, color); px(11, 2, color);
      break;
    case 4: // Chauve
      // No hair
      break;
    case 5: // Couettes
      for (let x = 5; x <= 10; x++) { px(x, 2, color); px(x, 3, color); }
      px(5, 4, color); px(10, 4, color);
      // Couettes
      px(3, 4, color); px(3, 5, color); px(3, 6, color); px(3, 7, color); px(3, 8, color);
      px(4, 4, color); px(4, 5, color);
      px(12, 4, color); px(12, 5, color); px(12, 6, color); px(12, 7, color); px(12, 8, color);
      px(11, 4, color); px(11, 5, color);
      break;
  }
}

function drawHat(px, hatType) {
  switch(hatType) {
    case 'cap':
      for (let x = 4; x <= 11; x++) px(x, 2, '#E74C3C');
      for (let x = 5; x <= 10; x++) px(x, 1, '#E74C3C');
      for (let x = 3; x <= 8; x++) px(x, 3, '#C0392B'); // Visière
      break;
    case 'crown':
      for (let x = 5; x <= 10; x++) px(x, 2, '#FFD700');
      px(5, 1, '#FFD700'); px(7, 0, '#FFD700'); px(8, 0, '#FFD700'); px(10, 1, '#FFD700');
      px(6, 1, '#FFD700'); px(9, 1, '#FFD700');
      px(7, 1, '#FF0000'); px(8, 1, '#FF0000'); // Rubis
      break;
    case 'wizard':
      for (let x = 5; x <= 10; x++) px(x, 2, '#9B59B6');
      for (let x = 6; x <= 9; x++) px(x, 1, '#9B59B6');
      for (let x = 7; x <= 8; x++) px(x, 0, '#9B59B6');
      px(7, -1, '#FFD700'); // Étoile au sommet
      break;
    case 'ninja':
      for (let x = 4; x <= 11; x++) px(x, 3, '#1a1a1a');
      for (let x = 5; x <= 10; x++) px(x, 4, '#1a1a1a');
      px(12, 3, '#1a1a1a'); px(13, 4, '#1a1a1a'); // Bandeau
      break;
    case 'space':
      for (let x = 4; x <= 11; x++) {
        px(x, 1, '#BDC3C7');
        px(x, 2, '#BDC3C7');
      }
      px(3, 2, '#BDC3C7'); px(12, 2, '#BDC3C7');
      for (let x = 5; x <= 10; x++) px(x, 0, '#95A5A6');
      px(7, 3, '#3498DB'); px(8, 3, '#3498DB'); // Visière
      break;
  }
}

function drawAccessory(ctx, accessoryType, size, ps) {
  switch(accessoryType) {
    case 'sunglasses':
      ctx.fillStyle = '#1a1a1a';
      // Already handled in eyes style 3, but add frame
      break;
    case 'stars':
      const starPositions = [[1,1],[13,2],[2,12],[14,13],[0,7]];
      for (const [x,y] of starPositions) {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x * ps, y * ps, ps, ps);
        ctx.fillStyle = '#FFF8DC';
        ctx.fillRect(x * ps + ps*0.25, y * ps + ps*0.25, ps*0.5, ps*0.5);
      }
      break;
    case 'wings':
      ctx.fillStyle = '#FFFFFF';
      // Left wing
      for (let i = 0; i < 3; i++) {
        ctx.fillRect((2-i) * ps, (11+i) * ps, ps, ps);
        ctx.fillRect((1-i) * ps, (11+i) * ps, ps, ps);
      }
      // Right wing
      for (let i = 0; i < 3; i++) {
        ctx.fillRect((13+i) * ps, (11+i) * ps, ps, ps);
        ctx.fillRect((14+i) * ps, (11+i) * ps, ps, ps);
      }
      break;
    case 'flames':
      const flameColors = ['#FF4500', '#FF6347', '#FFD700'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = flameColors[i % 3];
        ctx.fillRect((4+i*2) * ps, 0, ps, ps);
        ctx.fillRect((5+i*2) * ps, 1 * ps, ps, ps);
      }
      break;
  }
}

function drawBackground(ctx, bgType, size) {
  const ps = size / AVATAR_SIZE;

  switch(bgType) {
    case 'galaxy':
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, size, size);
      // Stars
      ctx.fillStyle = '#FFFFFF';
      const starPos = [[1,1],[3,4],[12,2],[14,8],[1,13],[10,12],[5,0],[15,15],[8,14],[0,6]];
      for (const [x,y] of starPos) {
        ctx.fillRect(x * ps + ps*0.3, y * ps + ps*0.3, ps*0.4, ps*0.4);
      }
      // Nebula
      ctx.fillStyle = 'rgba(138,43,226,0.2)';
      ctx.fillRect(0, 4*ps, size, 4*ps);
      break;
    case 'forest':
      ctx.fillStyle = '#1a3a1a';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#0d2e0d';
      ctx.fillRect(0, 10*ps, size, 6*ps);
      // Trees
      ctx.fillStyle = '#2d5a2d';
      for (const x of [1, 5, 11, 14]) {
        ctx.fillRect(x*ps, 7*ps, ps, 3*ps);
        ctx.fillRect((x-1)*ps, 6*ps, 3*ps, ps);
        ctx.fillRect((x-1)*ps, 5*ps, 3*ps, ps);
      }
      break;
    case 'ocean':
      ctx.fillStyle = '#0a2a4a';
      ctx.fillRect(0, 0, size, size);
      // Waves
      ctx.fillStyle = '#1a4a7a';
      for (let y = 0; y < 16; y += 3) {
        for (let x = y%2; x < 16; x += 4) {
          ctx.fillRect(x*ps, y*ps, 2*ps, ps);
        }
      }
      break;
    case 'lava':
      ctx.fillStyle = '#2a0a0a';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#FF4500';
      ctx.fillRect(0, 12*ps, size, 4*ps);
      ctx.fillStyle = '#FF6347';
      ctx.fillRect(2*ps, 11*ps, 3*ps, ps);
      ctx.fillRect(8*ps, 11*ps, 4*ps, ps);
      ctx.fillStyle = 'rgba(255,69,0,0.15)';
      ctx.fillRect(0, 8*ps, size, 4*ps);
      break;

    case 'snow':
      // White/light blue snowy landscape
      ctx.fillStyle = '#b8d4e8';
      ctx.fillRect(0, 0, size, size);
      // Snow ground
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 11*ps, size, 5*ps);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(0, 10*ps, size, ps);
      // Snowflakes
      ctx.fillStyle = '#FFFFFF';
      const snowPos = [[2,1],[5,3],[10,0],[14,2],[1,5],[8,4],[12,6],[3,8],[15,7],[6,9],[0,3],[13,5]];
      for (const [sx,sy] of snowPos) {
        ctx.fillRect(sx*ps + ps*0.3, sy*ps + ps*0.3, ps*0.4, ps*0.4);
      }
      // Pine trees
      ctx.fillStyle = '#2d5a3d';
      for (const tx of [1, 12]) {
        ctx.fillRect(tx*ps + ps*0.3, 8*ps, ps*0.4, 3*ps);
        ctx.fillRect((tx-1)*ps, 7*ps, 3*ps, ps);
        ctx.fillRect((tx-1)*ps + ps*0.3, 6*ps, 2*ps + ps*0.4, ps);
      }
      break;

    case 'sunset':
      // Orange/pink sunset gradient
      const sunsetColors = ['#1a0533', '#2d1055', '#6b1d5e', '#c0392b', '#e67e22', '#f39c12', '#f1c40f', '#f7dc6f'];
      for (let row = 0; row < 16; row++) {
        const ci = Math.floor(row / 2);
        ctx.fillStyle = sunsetColors[Math.min(ci, sunsetColors.length - 1)];
        ctx.fillRect(0, row*ps, size, ps);
      }
      // Sun
      ctx.fillStyle = '#f7dc6f';
      ctx.fillRect(5*ps, 10*ps, 6*ps, 3*ps);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(6*ps, 9*ps, 4*ps, ps);
      ctx.fillRect(6*ps, 13*ps, 4*ps, ps);
      // Clouds
      ctx.fillStyle = 'rgba(255,150,100,0.3)';
      ctx.fillRect(1*ps, 4*ps, 5*ps, ps);
      ctx.fillRect(9*ps, 3*ps, 4*ps, ps);
      break;

    case 'deepspace':
      // Deep black with many stars and nebula
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, size, size);
      // Nebula clouds
      ctx.fillStyle = 'rgba(100,0,200,0.15)';
      ctx.fillRect(0, 2*ps, 8*ps, 5*ps);
      ctx.fillStyle = 'rgba(0,100,200,0.12)';
      ctx.fillRect(6*ps, 7*ps, 10*ps, 4*ps);
      ctx.fillStyle = 'rgba(200,50,100,0.1)';
      ctx.fillRect(2*ps, 10*ps, 6*ps, 3*ps);
      // Stars - many
      ctx.fillStyle = '#FFFFFF';
      const dsStars = [[0,0],[2,2],[4,1],[7,3],[10,1],[13,0],[15,2],[1,5],[5,6],[9,5],[12,4],[14,6],
        [0,8],[3,9],[6,10],[11,8],[14,10],[1,12],[4,13],[8,12],[10,14],[13,13],[15,11],[7,15],[2,15]];
      for (const [x,y] of dsStars) {
        const s = Math.random() > 0.7 ? 0.5 : 0.3;
        ctx.fillRect(x*ps + ps*0.2, y*ps + ps*0.2, ps*s, ps*s);
      }
      // Bright stars
      ctx.fillStyle = '#aaccff';
      ctx.fillRect(3*ps, 3*ps, ps*0.6, ps*0.6);
      ctx.fillRect(11*ps, 9*ps, ps*0.6, ps*0.6);
      break;

    case 'rainbow':
      // Rainbow stripes
      const rbColors = ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0088FF','#4B0082','#9400D3','#FF0000',
        '#FF7F00','#FFFF00','#00FF00','#0088FF','#4B0082','#9400D3','#FF0000','#FF7F00'];
      for (let row = 0; row < 16; row++) {
        ctx.fillStyle = rbColors[row] + '55';
        ctx.fillRect(0, row*ps, size, ps);
      }
      // Sparkles
      ctx.fillStyle = '#FFFFFF';
      for (const [x,y] of [[2,2],[7,5],[12,1],[4,10],[14,8],[9,13],[1,7]]) {
        ctx.fillRect(x*ps + ps*0.3, y*ps + ps*0.3, ps*0.3, ps*0.3);
      }
      break;

    case 'graffiti':
      // Urban grey brick wall with color splashes
      ctx.fillStyle = '#555555';
      ctx.fillRect(0, 0, size, size);
      // Bricks
      ctx.fillStyle = '#666666';
      for (let y = 0; y < 16; y += 2) {
        for (let x = (y%4 === 0 ? 0 : 2); x < 16; x += 4) {
          ctx.fillRect(x*ps, y*ps, 3*ps, ps*1.5);
          ctx.strokeStyle = '#444444';
          ctx.strokeRect(x*ps, y*ps, 3*ps, ps*1.5);
        }
      }
      // Paint splashes
      const splashColors = ['#FF1493','#00FF7F','#FFD700','#00BFFF','#FF4500'];
      const splashes = [[1,3,2],[5,8,0],[10,2,3],[13,11,1],[3,12,4],[8,5,2],[14,7,0]];
      for (const [x,y,ci] of splashes) {
        ctx.fillStyle = splashColors[ci] + 'AA';
        ctx.fillRect(x*ps, y*ps, 2*ps, 2*ps);
      }
      break;

    case 'minecraft':
      // Minecraft-style dirt/grass
      ctx.fillStyle = '#8B6B3D';
      ctx.fillRect(0, 0, size, size);
      // Grass top
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, size, 3*ps);
      ctx.fillStyle = '#388E3C';
      for (let x = 0; x < 16; x += 2) {
        ctx.fillRect(x*ps, 3*ps, ps, ps);
      }
      // Dirt texture
      const dirtDark = '#7A5B2E';
      const dirtLight = '#9B7B4A';
      for (let y = 4; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if ((x+y) % 3 === 0) { ctx.fillStyle = dirtDark; ctx.fillRect(x*ps, y*ps, ps, ps); }
          else if ((x*y) % 5 === 0) { ctx.fillStyle = dirtLight; ctx.fillRect(x*ps, y*ps, ps, ps); }
        }
      }
      // Stone at bottom
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 14*ps, size, 2*ps);
      ctx.fillStyle = '#696969';
      ctx.fillRect(2*ps, 14*ps, ps, ps);
      ctx.fillRect(7*ps, 15*ps, ps, ps);
      ctx.fillRect(12*ps, 14*ps, 2*ps, ps);
      break;

    case 'matrix':
      // Matrix-style green on black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);
      // Falling green characters
      ctx.fillStyle = '#00FF00';
      const matrixCols = [0,2,3,5,7,8,10,12,13,15];
      for (const col of matrixCols) {
        const start = (col * 3) % 8;
        for (let row = start; row < 16; row += 2) {
          const brightness = Math.max(0.2, 1 - (row - start) / 12);
          ctx.fillStyle = `rgba(0,255,0,${brightness})`;
          ctx.fillRect(col*ps + ps*0.2, row*ps + ps*0.1, ps*0.6, ps*0.8);
        }
      }
      // Bright leading characters
      ctx.fillStyle = '#AAFFAA';
      for (const col of [2,7,12]) {
        ctx.fillRect(col*ps + ps*0.15, ((col*3)%8)*ps, ps*0.7, ps*0.9);
      }
      break;

    case 'aurora':
      // Dark sky with aurora borealis
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, size, size);
      // Aurora bands
      const auroraColors = ['rgba(0,255,100,0.15)','rgba(0,200,255,0.12)','rgba(100,0,255,0.1)','rgba(0,255,200,0.13)'];
      for (let band = 0; band < 4; band++) {
        ctx.fillStyle = auroraColors[band];
        const yStart = 2 + band * 2;
        for (let x = 0; x < 16; x++) {
          const h = 2 + Math.sin(x * 0.8 + band) * 1.5;
          ctx.fillRect(x*ps, yStart*ps, ps, h*ps);
        }
      }
      // Bright aurora streaks
      ctx.fillStyle = 'rgba(0,255,150,0.25)';
      ctx.fillRect(3*ps, 3*ps, 2*ps, 4*ps);
      ctx.fillRect(8*ps, 2*ps, 2*ps, 5*ps);
      ctx.fillRect(12*ps, 4*ps, 2*ps, 3*ps);
      // Stars
      ctx.fillStyle = '#FFFFFF';
      for (const [x,y] of [[1,0],[5,1],[10,0],[14,1],[0,8],[7,10],[13,9],[4,14],[11,13]]) {
        ctx.fillRect(x*ps + ps*0.35, y*ps + ps*0.35, ps*0.3, ps*0.3);
      }
      // Snow ground
      ctx.fillStyle = '#dde8f0';
      ctx.fillRect(0, 13*ps, size, 3*ps);
      break;

    default:
      ctx.fillStyle = '#2a2a4a';
      ctx.fillRect(0, 0, size, size);
  }
}

// ========== CREATURE HEADS ==========

function getCreatureNeckColor(headType) {
  const colors = {
    wolf: '#666677', fox: '#D4763B', dragon: '#2D8C3C', lion: '#CC8833',
    cat: '#888899', panda: '#FFFFFF', robot: '#8899AA', zombie: '#6B8E5A',
    eagle: '#8B6914', owl: '#8B6C42', shark: '#5577AA', monkey: '#A0724A',
    unicorn: '#FFFFFF', phoenix: '#DD4400', demon: '#553344'
  };
  return colors[headType] || '#FFD5B0';
}

function drawCreatureHead(px, headType) {
  switch(headType) {
    case 'wolf':
      // Grey wolf head
      const wg = '#666677', wl = '#888899', wd = '#444455', ww = '#FFFFFF';
      // Head shape
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, wg);
      // Ears (pointy)
      px(4, 2, wl); px(5, 2, wg); px(5, 3, wg); px(4, 3, wg);
      px(10, 2, wg); px(11, 2, wl); px(10, 3, wg); px(11, 3, wg);
      px(4, 4, wg); px(11, 4, wg);
      // Inner ears
      px(5, 3, '#CC8899');
      px(10, 3, '#CC8899');
      // Snout
      px(6, 8, wl); px(7, 8, wl); px(8, 8, wl); px(9, 8, wl);
      px(7, 9, wl); px(8, 9, wl);
      px(7, 10, wl); px(8, 10, wl);
      // Nose
      px(7, 8, '#1a1a1a'); px(8, 8, '#1a1a1a');
      // Eyes
      px(6, 6, '#FFDD00'); px(9, 6, '#FFDD00');
      px(6, 5, wd); px(9, 5, wd);
      break;

    case 'fox':
      const fo = '#D4763B', fl = '#E8944A', fd = '#AA5522', fw = '#FFFFFF';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, fo);
      // Ears
      px(4, 1, fo); px(5, 2, fo); px(5, 3, fo); px(4, 2, fo); px(4, 3, fo);
      px(11, 1, fo); px(10, 2, fo); px(10, 3, fo); px(11, 2, fo); px(11, 3, fo);
      px(5, 2, '#FFaa77'); px(10, 2, '#FFaa77');
      // White cheeks
      px(5, 8, fw); px(5, 9, fw); px(5, 10, fw);
      px(10, 8, fw); px(10, 9, fw); px(10, 10, fw);
      px(6, 9, fw); px(7, 9, fw); px(8, 9, fw); px(9, 9, fw);
      px(7, 10, fw); px(8, 10, fw);
      // Nose
      px(7, 8, '#1a1a1a'); px(8, 8, '#1a1a1a');
      // Eyes
      px(6, 6, '#333'); px(9, 6, '#333');
      px(6, 5, fd); px(9, 5, fd);
      break;

    case 'dragon':
      const dg = '#2D8C3C', dl = '#44AA55', dd = '#1A6628', dy = '#FFDD00';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, dg);
      // Horns
      px(4, 1, '#888'); px(5, 2, '#999'); px(4, 2, '#777');
      px(11, 1, '#888'); px(10, 2, '#999'); px(11, 2, '#777');
      // Scales on top
      px(5, 3, dl); px(6, 3, dg); px(7, 3, dl); px(8, 3, dg); px(9, 3, dl); px(10, 3, dg);
      // Snout
      px(4, 7, dg); px(4, 8, dg); px(11, 7, dg); px(11, 8, dg);
      px(6, 9, dl); px(7, 9, dl); px(8, 9, dl); px(9, 9, dl);
      px(7, 10, dl); px(8, 10, dl);
      // Nostrils with fire
      px(6, 9, '#FF4400'); px(9, 9, '#FF4400');
      // Eyes (reptilian)
      px(6, 6, dy); px(7, 6, '#FF4400');
      px(9, 6, dy); px(8, 6, '#FF4400');
      // Jaw
      px(6, 10, dg); px(9, 10, dg);
      break;

    case 'lion':
      const lm = '#CC8833', ll = '#DDAA44', ld = '#AA6622', lb = '#885511';
      // Mane (big!)
      for (let x = 3; x <= 12; x++) { px(x, 2, lb); px(x, 3, lb); }
      for (let x = 3; x <= 12; x++) { px(x, 10, lb); }
      px(3, 4, lb); px(3, 5, lb); px(3, 6, lb); px(3, 7, lb); px(3, 8, lb); px(3, 9, lb);
      px(12, 4, lb); px(12, 5, lb); px(12, 6, lb); px(12, 7, lb); px(12, 8, lb); px(12, 9, lb);
      // Face
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, lm);
      px(4, 5, lm); px(4, 6, lm); px(4, 7, lm); px(4, 8, lm);
      px(11, 5, lm); px(11, 6, lm); px(11, 7, lm); px(11, 8, lm);
      // Nose
      px(7, 8, '#AA4444'); px(8, 8, '#AA4444');
      // Mouth
      px(7, 9, ll); px(8, 9, ll);
      // Eyes
      px(6, 6, '#FFAA00'); px(9, 6, '#FFAA00');
      px(6, 5, ld); px(9, 5, ld);
      break;

    case 'cat':
      const cc = '#888899', cl = '#AAAABB', cd = '#666677';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, cc);
      // Ears (triangular)
      px(4, 2, cc); px(5, 3, cc); px(4, 3, cc);
      px(11, 2, cc); px(10, 3, cc); px(11, 3, cc);
      px(5, 2, '#FFaaaa'); px(10, 2, '#FFaaaa');
      // Cheeks
      px(4, 7, cl); px(4, 8, cl); px(11, 7, cl); px(11, 8, cl);
      // Nose (tiny pink)
      px(7, 7, '#FF9999'); px(8, 7, '#FF9999');
      // Whiskers (dots)
      px(4, 8, '#555'); px(3, 7, '#555'); px(3, 9, '#555');
      px(11, 8, '#555'); px(12, 7, '#555'); px(12, 9, '#555');
      // Eyes (big green)
      px(6, 5, '#44DD44'); px(6, 6, '#22AA22');
      px(9, 5, '#44DD44'); px(9, 6, '#22AA22');
      // Mouth
      px(7, 8, cc); px(8, 8, cc); px(7, 9, cl); px(8, 9, cl);
      break;

    case 'panda':
      const pw = '#FFFFFF', pb = '#1a1a1a';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, pw);
      // Ears (black round)
      px(4, 2, pb); px(5, 2, pb); px(4, 3, pb); px(5, 3, pb);
      px(10, 2, pb); px(11, 2, pb); px(10, 3, pb); px(11, 3, pb);
      // Eye patches (black)
      px(5, 5, pb); px(6, 5, pb); px(5, 6, pb); px(6, 6, pb); px(6, 7, pb);
      px(9, 5, pb); px(10, 5, pb); px(9, 6, pb); px(10, 6, pb); px(9, 7, pb);
      // Eyes (white dots in black)
      px(6, 6, '#FFFFFF');
      px(9, 6, '#FFFFFF');
      // Nose
      px(7, 8, pb); px(8, 8, pb);
      // Mouth
      px(7, 9, '#333'); px(8, 9, '#333');
      break;

    case 'robot':
      const rm = '#8899AA', rl = '#AABBCC', rd = '#556677', rb = '#4A90D9';
      for (let y = 3; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, rm);
      // Square head outline
      px(4, 3, rd); px(4, 4, rd); px(4, 5, rd); px(4, 6, rd); px(4, 7, rd); px(4, 8, rd); px(4, 9, rd); px(4, 10, rd);
      px(11, 3, rd); px(11, 4, rd); px(11, 5, rd); px(11, 6, rd); px(11, 7, rd); px(11, 8, rd); px(11, 9, rd); px(11, 10, rd);
      for (let x = 4; x <= 11; x++) { px(x, 3, rd); px(x, 10, rd); }
      // Antenna
      px(7, 1, '#FF4444'); px(8, 1, '#FF4444');
      px(7, 2, rd); px(8, 2, rd);
      // Eyes (LED)
      px(6, 5, '#00FF00'); px(6, 6, '#00FF00');
      px(9, 5, '#00FF00'); px(9, 6, '#00FF00');
      // Mouth (speaker grille)
      px(6, 8, rd); px(7, 8, rl); px(8, 8, rd); px(9, 8, rl);
      px(6, 9, rl); px(7, 9, rd); px(8, 9, rl); px(9, 9, rd);
      // Bolts
      px(5, 4, '#FFD700'); px(10, 4, '#FFD700');
      break;

    case 'zombie':
      const zg = '#6B8E5A', zl = '#8AAA77', zd = '#4A6644';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, zg);
      // Messy hair
      px(5, 2, '#333'); px(6, 2, '#444'); px(7, 3, '#333'); px(9, 2, '#444'); px(10, 2, '#333');
      px(5, 3, '#444'); px(6, 3, '#333');
      // Stitches
      px(7, 5, '#555'); px(8, 5, '#555');
      // Uneven eyes
      px(6, 6, '#FF0000'); px(6, 5, zd);
      px(9, 7, '#FFFF00'); px(9, 6, zd);
      // Rotten mouth
      px(6, 9, zd); px(7, 9, '#1a1a1a'); px(8, 9, zd); px(9, 9, '#1a1a1a');
      px(7, 8, zl); px(8, 8, zl);
      // Exposed bone
      px(5, 8, '#DDDDBB');
      break;

    case 'eagle':
      const eg = '#8B6914', el = '#AA8833', ew = '#FFFFFF', ey = '#FFD700';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, eg);
      // White head feathers
      for (let x = 5; x <= 10; x++) { px(x, 3, ew); px(x, 4, ew); }
      px(5, 5, ew); px(10, 5, ew);
      // Beak (yellow, hooked)
      px(7, 7, ey); px(8, 7, ey); px(7, 8, ey); px(8, 8, ey);
      px(7, 9, ey); px(6, 9, ey);
      // Fierce eyes
      px(6, 5, '#FFAA00'); px(6, 6, '#1a1a1a');
      px(9, 5, '#FFAA00'); px(9, 6, '#1a1a1a');
      // Brow ridge
      px(5, 5, eg); px(10, 5, eg);
      break;

    case 'owl':
      const ob = '#8B6C42', ol = '#AA8855', od = '#664422';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, ob);
      // Ear tufts
      px(4, 2, ob); px(5, 3, ob); px(11, 2, ob); px(10, 3, ob);
      // Big round eyes (signature owl)
      px(5, 5, '#FFD700'); px(6, 5, '#FFD700'); px(5, 6, '#FFD700'); px(6, 6, '#1a1a1a');
      px(9, 5, '#FFD700'); px(10, 5, '#FFD700'); px(9, 6, '#1a1a1a'); px(10, 6, '#FFD700');
      // Eye rings
      px(4, 5, ol); px(4, 6, ol); px(7, 5, ol); px(7, 6, ol);
      px(8, 5, ol); px(8, 6, ol); px(11, 5, ol); px(11, 6, ol);
      // Beak
      px(7, 7, '#DD8800'); px(8, 7, '#DD8800');
      px(7, 8, '#CC7700');
      // Belly feathers
      px(6, 9, ol); px(7, 9, ob); px(8, 9, ol); px(9, 9, ob);
      px(6, 10, ob); px(7, 10, ol); px(8, 10, ob); px(9, 10, ol);
      break;

    case 'shark':
      const sg = '#5577AA', sl = '#7799CC', sd = '#335577';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, sg);
      // Fin on top
      px(7, 1, sd); px(8, 1, sd);
      px(7, 2, sg); px(8, 2, sg);
      px(6, 3, sg); px(7, 3, sg); px(8, 3, sg); px(9, 3, sg);
      // White belly
      px(6, 8, '#DDDDEE'); px(7, 8, '#DDDDEE'); px(8, 8, '#DDDDEE'); px(9, 8, '#DDDDEE');
      px(6, 9, '#DDDDEE'); px(7, 9, '#DDDDEE'); px(8, 9, '#DDDDEE'); px(9, 9, '#DDDDEE');
      px(7, 10, '#DDDDEE'); px(8, 10, '#DDDDEE');
      // Eyes (small, menacing)
      px(6, 5, '#1a1a1a'); px(9, 5, '#1a1a1a');
      px(6, 6, '#FFFFFF'); px(9, 6, '#FFFFFF');
      // Teeth!
      px(5, 9, '#FFFFFF'); px(6, 10, '#FFFFFF'); px(7, 10, '#FFFFFF');
      px(8, 10, '#FFFFFF'); px(9, 10, '#FFFFFF'); px(10, 9, '#FFFFFF');
      // Gills
      px(4, 7, sd); px(4, 8, sd);
      px(11, 7, sd); px(11, 8, sd);
      break;

    case 'monkey':
      const mb = '#A0724A', ml = '#C8956A', md = '#7A5230';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, mb);
      // Ears
      px(4, 5, mb); px(4, 6, ml); px(4, 7, mb);
      px(11, 5, mb); px(11, 6, ml); px(11, 7, mb);
      // Face patch (lighter)
      px(6, 6, ml); px(7, 6, ml); px(8, 6, ml); px(9, 6, ml);
      px(6, 7, ml); px(7, 7, ml); px(8, 7, ml); px(9, 7, ml);
      px(6, 8, ml); px(7, 8, ml); px(8, 8, ml); px(9, 8, ml);
      px(7, 9, ml); px(8, 9, ml);
      // Hair tuft
      px(6, 3, md); px(7, 3, md); px(8, 3, md); px(9, 3, md);
      px(7, 2, md); px(8, 2, md);
      // Eyes
      px(6, 5, '#1a1a1a'); px(9, 5, '#1a1a1a');
      // Nose
      px(7, 7, '#885533'); px(8, 7, '#885533');
      // Big smile
      px(6, 8, '#CC5555'); px(7, 9, '#CC5555'); px(8, 9, '#CC5555'); px(9, 8, '#CC5555');
      break;

    case 'unicorn':
      const uw = '#FFFFFF', up = '#FFaaDD', ul = '#EEEEFF';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, uw);
      // Horn (rainbow!)
      px(7, 0, '#FF4444'); px(8, 0, '#FF4444');
      px(7, 1, '#FFAA00'); px(8, 1, '#FFDD00');
      px(7, 2, '#44DD44'); px(8, 2, '#44AAFF');
      px(7, 3, '#AA44FF');
      // Ears
      px(5, 3, uw); px(4, 2, uw); px(10, 3, uw); px(11, 2, uw);
      // Mane (rainbow)
      px(4, 4, '#FF4444'); px(4, 5, '#FFAA00'); px(4, 6, '#FFDD00');
      px(4, 7, '#44DD44'); px(4, 8, '#44AAFF'); px(4, 9, '#AA44FF');
      // Eyes (sparkly)
      px(6, 6, '#FF69B4'); px(9, 6, '#FF69B4');
      px(6, 5, '#FFaaDD'); px(9, 5, '#FFaaDD');
      // Cute nose
      px(7, 8, up); px(8, 8, up);
      // Smile
      px(7, 9, '#FF69B4'); px(8, 9, '#FF69B4');
      break;

    case 'phoenix':
      const pf = '#DD4400', pl = '#FF8800', pd = '#AA2200', py = '#FFDD00';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, pf);
      // Flame crest
      px(6, 0, py); px(7, 0, '#FF4400'); px(8, 0, py); px(9, 0, '#FF6600');
      px(6, 1, '#FF6600'); px(7, 1, py); px(8, 1, '#FF4400'); px(9, 1, py);
      px(6, 2, pf); px(7, 2, pl); px(8, 2, pf); px(9, 2, pl);
      px(5, 3, pf); px(6, 3, pl); px(7, 3, pf); px(8, 3, pl); px(9, 3, pf); px(10, 3, pl);
      // Eyes (glowing)
      px(6, 6, py); px(9, 6, py);
      px(6, 5, '#FF0000'); px(9, 5, '#FF0000');
      // Beak
      px(7, 8, '#FFaa00'); px(8, 8, '#FFaa00');
      px(7, 9, '#DD8800');
      // Fire aura
      px(4, 5, '#FF440066'); px(4, 8, '#FF440066');
      px(11, 5, '#FF440066'); px(11, 8, '#FF440066');
      px(4, 6, pl); px(4, 7, py);
      px(11, 6, pl); px(11, 7, py);
      break;

    case 'demon':
      const dm = '#553344', dll = '#774466', ddd = '#331122';
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, dm);
      // Horns (red)
      px(4, 1, '#CC0000'); px(3, 0, '#CC0000'); px(5, 2, '#BB0000');
      px(11, 1, '#CC0000'); px(12, 0, '#CC0000'); px(10, 2, '#BB0000');
      px(5, 3, dm); px(10, 3, dm);
      // Eyes (glowing red)
      px(6, 5, '#FF0000'); px(6, 6, '#FF4444');
      px(9, 5, '#FF0000'); px(9, 6, '#FF4444');
      // Dark marks under eyes
      px(6, 7, ddd); px(9, 7, ddd);
      // Fanged mouth
      px(6, 9, '#880000'); px(7, 9, '#AA0000'); px(8, 9, '#AA0000'); px(9, 9, '#880000');
      px(6, 10, '#FFFFFF'); px(9, 10, '#FFFFFF'); // Fangs
      // Pointed chin
      px(7, 10, dm); px(8, 10, dm);
      break;

    default:
      // Fallback: just draw normal head placeholder
      for (let y = 4; y <= 10; y++) for (let x = 5; x <= 10; x++) px(x, y, '#888');
  }
}

// Draw a mini avatar (for lists, nav, etc)
function drawMiniAvatar(container, config, size = 40) {
  drawAvatar(container, config, size);
}

// Format balance into COOL units
function formatCoolBreakdown(balance) {
  const abs = Math.abs(balance);
  const mega = Math.floor(abs / 10000);
  const sup = Math.floor((abs % 10000) / 1000);
  const cool = Math.floor((abs % 1000) / 100);
  const deci = Math.floor((abs % 100) / 10);
  const centi = abs % 10;

  return { mega, super: sup, cool, deci, centi, isNegative: balance < 0 };
}

function renderCoolBreakdown(containerId, balance) {
  const bd = formatCoolBreakdown(balance);
  const container = document.getElementById(containerId);
  if (!container) return;

  const sign = bd.isNegative ? '-' : '';
  const units = [
    { name: 'Méga', value: bd.mega, color: '#FF4500' },
    { name: 'Super', value: bd.super, color: '#9400D3' },
    { name: 'Cool', value: bd.cool, color: '#FFD700' },
    { name: 'Déci', value: bd.deci, color: '#4A90D9' },
    { name: 'Centi', value: bd.centi, color: '#4AD97A' }
  ];

  container.innerHTML = units.map(u => `
    <div class="cool-unit" style="border-color: ${u.color}40; background: ${u.color}15">
      <span class="cool-unit-amount" style="color: ${u.color}">${sign}${u.value}</span>
      <span class="cool-unit-name">${u.name}cool</span>
    </div>
  `).join('');
}

// ========== AVATAR BORDER SYSTEM ==========
function applyAvatarBorder(container, borderType, size) {
  // Remove old border classes
  const toRemove = [];
  container.classList.forEach(cls => {
    if (cls.startsWith('border-anim-') || cls === 'has-avatar-border') toRemove.push(cls);
  });
  toRemove.forEach(cls => container.classList.remove(cls));

  // Remove old border overlay
  const oldOverlay = container.querySelector('.avatar-border-overlay');
  if (oldOverlay) oldOverlay.remove();

  // Remove old particles
  const oldParticles = container.querySelector('.avatar-particles');
  if (oldParticles) oldParticles.remove();

  container.style.removeProperty('border');
  container.style.removeProperty('box-shadow');

  if (!borderType) return;

  const bw = Math.max(3, Math.round(size / 35));

  // Solid color borders (stored as hex color string)
  if (borderType.startsWith && borderType.startsWith('#')) {
    container.style.border = bw + 'px solid ' + borderType;
    container.style.boxShadow = '0 0 ' + (bw * 2) + 'px ' + borderType + '66';
    return;
  }

  // Animated borders — create an overlay div that sits around the canvas
  container.classList.add('has-avatar-border');
  const overlay = document.createElement('div');
  overlay.className = 'avatar-border-overlay border-anim-' + borderType;
  overlay.style.setProperty('--border-w', bw + 'px');
  container.appendChild(overlay);

  // Add particles for special borders (only for sizes >= 80px to avoid clutter on tiny avatars)
  if (size >= 80) {
    spawnBorderParticles(container, borderType, size);
  }
}

// ========== BORDER PARTICLE SYSTEM ==========
// Particles only on premium borders (600cc+)
// Each border has its own animation style for variety
const BORDER_PARTICLES = {
  gold:       { chars: ['✨','⭐','💛'], count: 5, anim: 'sparkle' },
  neon:       { chars: ['⚡','💡','✨'], count: 5, anim: 'wiggle' },
  sparkle:    { chars: ['✨','⭐','💫','💖'], count: 8, anim: 'sparkle' },
  flames:     { chars: ['🔥','🔥','💥'], count: 6, anim: 'float' },
  ice:        { chars: ['❄️','❄️','💎'], count: 6, anim: 'fall' },
  iridescent: { chars: ['💎','🔮','💫'], count: 5, anim: 'drift' },
  lava:       { chars: ['🔥','🌋','💥'], count: 6, anim: 'float' },
  galaxy:     { chars: ['⭐','🌟','💫','🔮'], count: 7, anim: 'orbit' },
  dragon:     { chars: ['🔥','🐲','💀','✨'], count: 6, anim: 'float' },
  shadow:     { chars: ['💀','👻','🌑'], count: 4, anim: 'pulse' },
  legendary:  { chars: ['👑','⭐','💎','✨','🔥','💫'], count: 10, anim: 'mixed' },
};

function spawnBorderParticles(container, borderType, size) {
  // Remove old particles
  const oldP = container.querySelector('.avatar-particles');
  if (oldP) oldP.remove();

  const config = BORDER_PARTICLES[borderType];
  if (!config) return;

  const pad = size * 0.2;
  const particleContainer = document.createElement('div');
  particleContainer.className = 'avatar-particles';
  particleContainer.style.cssText = `
    position: absolute; top: -${pad}px; left: -${pad}px;
    width: ${size + pad*2}px; height: ${size + pad*2}px;
    pointer-events: none; z-index: 3; overflow: visible;
  `;

  const allAnims = ['sparkle', 'float', 'drift', 'pulse', 'wiggle', 'fall'];

  for (let i = 0; i < config.count; i++) {
    const p = document.createElement('span');
    p.className = 'border-particle';
    p.textContent = config.chars[Math.floor(Math.random() * config.chars.length)];

    const pSize = Math.max(8, size / 12 + Math.random() * (size / 10));
    const delay = Math.random() * 4;
    const baseDuration = 2 + Math.random() * 2.5;

    // Pick animation based on border config
    let animType = config.anim;
    if (animType === 'mixed') {
      animType = allAnims[i % allAnims.length];
    }

    // Random position around the avatar border area
    let px, py;
    const side = i % 4; // top, right, bottom, left
    const halfW = (size + pad*2) / 2;
    const halfH = (size + pad*2) / 2;
    const randEdge = () => (Math.random() - 0.5) * size * 0.9;

    switch(side) {
      case 0: px = randEdge(); py = -halfH * 0.6 + Math.random() * 10; break; // top
      case 1: px = halfW * 0.6 + Math.random() * 10; py = randEdge(); break;  // right
      case 2: px = randEdge(); py = halfH * 0.6 + Math.random() * 10; break;  // bottom
      case 3: px = -halfW * 0.6 + Math.random() * 10; py = randEdge(); break; // left
    }

    const drift = 20 + Math.random() * 30;

    let animName, animCss;
    switch(animType) {
      case 'sparkle':
        animName = 'particleSparkle';
        animCss = `${animName} ${baseDuration}s ease-in-out infinite`;
        break;
      case 'float':
        animName = 'particleFloat';
        animCss = `${animName} ${baseDuration * 0.8}s ease-out infinite`;
        break;
      case 'drift':
        animName = 'particleDrift';
        animCss = `${animName} ${baseDuration * 1.2}s ease-in-out infinite`;
        break;
      case 'pulse':
        animName = 'particlePulse';
        animCss = `${animName} ${baseDuration * 0.7}s ease-in-out infinite`;
        break;
      case 'wiggle':
        animName = 'particleWiggle';
        animCss = `${animName} ${baseDuration * 0.6}s ease-in-out infinite`;
        break;
      case 'fall':
        animName = 'particleFall';
        animCss = `${animName} ${baseDuration * 1.1}s ease-in infinite`;
        break;
      case 'orbit':
        animName = 'particleOrbit';
        animCss = `${animName} ${baseDuration * 1.5}s linear infinite`;
        break;
      default:
        animName = 'particleSparkle';
        animCss = `${animName} ${baseDuration}s ease-in-out infinite`;
    }

    if (animType === 'orbit') {
      // Orbit uses center-based rotation
      const startAngle = (i / config.count) * 360;
      const radius = (size / 2) * 1.2;
      p.style.cssText = `
        position: absolute; font-size: ${pSize}px;
        left: 50%; top: 50%;
        animation: ${animCss};
        animation-delay: ${delay}s;
        --start-angle: ${startAngle}deg;
        --radius: ${radius}px;
        opacity: 0;
      `;
    } else {
      // Position-based animations
      p.style.cssText = `
        position: absolute; font-size: ${pSize}px;
        left: 50%; top: 50%;
        --px: ${Math.round(px)}px;
        --py: ${Math.round(py)}px;
        --drift: ${Math.round(drift)}px;
        animation: ${animCss};
        animation-delay: ${delay}s;
        opacity: 0;
      `;
    }

    particleContainer.appendChild(p);
  }

  container.appendChild(particleContainer);
}
