// Appearance data for the procedural cast, written from the reference sheets
// the user provided (kept outside the repository). Colors and proportions are
// approximations for an original toon-shaded model, not traced artwork.
//
// hair.style picks a lock layout in character-model.js; face.eyes picks the
// eye shape drawn on the face texture.

const SKIN = { light: '#f1d2b8', fair: '#ecc8a8', warm: '#e2b48f', tan: '#c99673', deep: '#8d5c3e' };

const base = {
  height: 1.7, build: 'average', skin: SKIN.fair, age: 'adult',
  hair: { style: 'short', color: '#3a2a1e' },
  face: { eyes: 'neutral', iris: '#5d6b57', brows: 'flat', mouth: 'neutral', marks: [] },
  outfit: 'survey', extras: [],
};
const spec = (id, name, overrides) => ({ ...base, id, name, ...overrides, hair: { ...base.hair, ...overrides.hair }, face: { ...base.face, ...overrides.face } });

export const CHARACTER_SPECS = Object.freeze({
  'eren-child': spec('eren-child', 'Eren (845)', { height: 1.36, age: 'child', hair: { style: 'eren', color: '#3b2a1f' }, face: { eyes: 'sharp', iris: '#4f8f86', brows: 'angry' }, outfit: 'child-eren' }),
  eren: spec('eren', 'Eren Yeager', { height: 1.7, hair: { style: 'eren', color: '#35251b' }, face: { eyes: 'sharp', iris: '#3f8c80', brows: 'angry', mouth: 'firm' }, outfit: 'survey', extras: ['laceShirt'] }),
  'eren-s4': spec('eren-s4', 'Eren Yeager (854)', { height: 1.83, build: 'lean', hair: { style: 'long', color: '#2f2119' }, face: { eyes: 'tired', iris: '#4c8a7e', brows: 'flat', mouth: 'firm', marks: ['stubble', 'underEye'] }, outfit: 'marley-civilian' }),
  'mikasa-child': spec('mikasa-child', 'Mikasa (845)', { height: 1.33, age: 'child', hair: { style: 'longStraight', color: '#161518' }, face: { eyes: 'calm', iris: '#4b4c55', brows: 'soft' }, outfit: 'child-dress', extras: ['scarf'] }),
  mikasa: spec('mikasa', 'Mikasa Ackerman', { height: 1.7, build: 'athletic-female', skin: SKIN.light, hair: { style: 'bob', color: '#141317' }, face: { eyes: 'calm', iris: '#4a4a55', brows: 'soft', mouth: 'small' }, outfit: 'survey', extras: ['scarf', 'whiteShirt'] }),
  'armin-child': spec('armin-child', 'Armin (845)', { height: 1.3, age: 'child', hair: { style: 'bowl', color: '#e3c66e' }, face: { eyes: 'round', iris: '#5b9fd0', brows: 'worried' }, outfit: 'child-shirt' }),
  armin: spec('armin', 'Armin Arlert', { height: 1.63, build: 'slim', skin: SKIN.light, hair: { style: 'bowl', color: '#e6c76c' }, face: { eyes: 'round', iris: '#5ba0d6', brows: 'soft', mouth: 'small' }, outfit: 'survey', extras: ['whiteShirt'] }),
  levi: spec('levi', 'Levi Ackerman', { height: 1.6, build: 'athletic', skin: SKIN.light, hair: { style: 'undercut-curtain', color: '#151416' }, face: { eyes: 'narrow', iris: '#5a5d63', brows: 'flat', mouth: 'flat', marks: ['underEye'] }, outfit: 'survey', extras: ['cravat', 'whiteShirt'] }),
  erwin: spec('erwin', 'Erwin Smith', { height: 1.88, build: 'broad', hair: { style: 'sidepart', color: '#d8c27d' }, face: { eyes: 'neutral', iris: '#6c9cc9', brows: 'thick', mouth: 'firm' }, outfit: 'survey', extras: ['bolo', 'whiteShirt'] }),
  hange: spec('hange', 'Hange Zoë', { height: 1.7, build: 'average', hair: { style: 'ponytail-messy', color: '#5c3424' }, face: { eyes: 'round', iris: '#7a4a33', brows: 'raised', mouth: 'open' }, outfit: 'survey', extras: ['glasses', 'goggles'] }),
  jean: spec('jean', 'Jean Kirstein', { height: 1.9, build: 'athletic', hair: { style: 'undercut-top', color: '#8c6a4a', under: '#4a3628' }, face: { eyes: 'narrow', iris: '#7a6a4c', brows: 'angry', mouth: 'flat' }, outfit: 'survey', extras: ['whiteShirt'] }),
  sasha: spec('sasha', 'Sasha Blouse', { height: 1.68, build: 'athletic-female', hair: { style: 'ponytail-high', color: '#6b3324' }, face: { eyes: 'round', iris: '#7b5a3d', brows: 'soft', mouth: 'smile' }, outfit: 'survey', extras: ['whiteShirt'] }),
  connie: spec('connie', 'Connie Springer', { height: 1.58, build: 'slim', skin: SKIN.warm, hair: { style: 'buzz', color: '#5a5550' }, face: { eyes: 'round', iris: '#6a6040', brows: 'raised', mouth: 'open' }, outfit: 'survey', extras: ['whiteShirt'] }),
  reiner: spec('reiner', 'Reiner Braun', { height: 1.85, build: 'broad', hair: { style: 'cropped', color: '#d9c47a' }, face: { eyes: 'neutral', iris: '#a59a6a', brows: 'thick', mouth: 'firm' }, outfit: 'survey' }),
  bertholdt: spec('bertholdt', 'Bertholdt Hoover', { height: 1.92, build: 'lean', skin: SKIN.warm, hair: { style: 'short', color: '#1c1714' }, face: { eyes: 'neutral', iris: '#3e3a35', brows: 'worried', mouth: 'small' }, outfit: 'survey' }),
  annie: spec('annie', 'Annie Leonhart', { height: 1.53, build: 'athletic-female', skin: SKIN.light, hair: { style: 'bun', color: '#e2cf86' }, face: { eyes: 'narrow', iris: '#7aa2bf', brows: 'flat', mouth: 'flat' }, outfit: 'training', extras: ['hoodie'] }),
  historia: spec('historia', 'Historia Reiss', { height: 1.45, build: 'slim', skin: SKIN.light, hair: { style: 'longStraight', color: '#efd88f' }, face: { eyes: 'round', iris: '#5fb0d8', brows: 'soft', mouth: 'small' }, outfit: 'survey', extras: ['whiteShirt'] }),
  ymir: spec('ymir', 'Ymir', { height: 1.72, build: 'lean', skin: SKIN.tan, hair: { style: 'ponytail-low', color: '#3c2a20' }, face: { eyes: 'narrow', iris: '#6b5a3a', brows: 'flat', mouth: 'smirk', marks: ['freckles'] }, outfit: 'survey' }),
  marco: spec('marco', 'Marco Bott', { height: 1.78, hair: { style: 'middlepart', color: '#1d1916' }, face: { eyes: 'round', iris: '#4b3c30', brows: 'soft', mouth: 'smile', marks: ['freckles'] }, outfit: 'training' }),
  hannes: spec('hannes', 'Hannes', { height: 1.86, build: 'broad', hair: { style: 'spiky', color: '#cdb36a' }, face: { eyes: 'neutral', iris: '#6c7a52', brows: 'flat', mouth: 'flat', marks: ['stubble'] }, outfit: 'garrison' }),
  carla: spec('carla', 'Carla Yeager', { height: 1.62, build: 'slim', hair: { style: 'ponytail-side', color: '#4a2f22' }, face: { eyes: 'calm', iris: '#7b5e45', brows: 'soft', mouth: 'small' }, outfit: 'civilian-dress' }),
  grisha: spec('grisha', 'Grisha Yeager', { height: 1.83, build: 'lean', hair: { style: 'ponytail-low', color: '#2a1f18' }, face: { eyes: 'neutral', iris: '#5b4a3a', brows: 'flat', mouth: 'flat', marks: ['stubble'] }, outfit: 'civilian-coat', extras: ['glasses'] }),
  pixis: spec('pixis', 'Dot Pyxis', { height: 1.78, build: 'lean', hair: { style: 'bald', color: '#d9d4c8' }, face: { eyes: 'neutral', iris: '#6d7158', brows: 'thick', mouth: 'flat', marks: ['mustache', 'wrinkles'] }, outfit: 'commander' }),
  shadis: spec('shadis', 'Keith Shadis', { height: 1.92, build: 'broad', skin: SKIN.warm, hair: { style: 'bald', color: '#2b241f' }, face: { eyes: 'narrow', iris: '#3a332c', brows: 'angry', mouth: 'firm', marks: ['goatee', 'underEye'] }, outfit: 'training' }),
  zeke: spec('zeke', 'Zeke Yeager', { height: 1.83, build: 'average', hair: { style: 'cropped', color: '#d4b56b' }, face: { eyes: 'neutral', iris: '#7d8a5a', brows: 'flat', mouth: 'smirk', marks: ['beard'] }, outfit: 'marley', extras: ['roundGlasses', 'armband'] }),
  pieck: spec('pieck', 'Pieck Finger', { height: 1.6, build: 'slim', skin: SKIN.light, hair: { style: 'longStraight', color: '#18161a' }, face: { eyes: 'tired', iris: '#4a4a4f', brows: 'soft', mouth: 'smile' }, outfit: 'marley', extras: ['armband'] }),
  falco: spec('falco', 'Falco Grice', { height: 1.55, age: 'teen', hair: { style: 'short', color: '#c9a76a' }, face: { eyes: 'round', iris: '#c0a050', brows: 'worried', mouth: 'small' }, outfit: 'marley', extras: ['armband'] }),
  gabi: spec('gabi', 'Gabi Braun', { height: 1.45, age: 'teen', skin: SKIN.warm, hair: { style: 'bob', color: '#2a1e18' }, face: { eyes: 'round', iris: '#5a3e2c', brows: 'angry', mouth: 'open' }, outfit: 'marley', extras: ['armband'] }),
  'soldier-m': spec('soldier-m', 'Soldado da Tropa', { hair: { style: 'short', color: '#4b3a2c' }, outfit: 'survey' }),
  'soldier-f': spec('soldier-f', 'Soldada da Tropa', { build: 'athletic-female', hair: { style: 'ponytail-low', color: '#6a4a33' }, outfit: 'survey' }),
  'recruit-m': spec('recruit-m', 'Recruta', { height: 1.72, hair: { style: 'short', color: '#2a2622' }, face: { eyes: 'round', brows: 'worried' }, outfit: 'survey' }),
  'civilian-m': spec('civilian-m', 'Morador', { hair: { style: 'short', color: '#5a4636' }, outfit: 'civilian-shirt' }),
  'civilian-f': spec('civilian-f', 'Moradora', { height: 1.6, build: 'slim', hair: { style: 'ponytail-side', color: '#6b4b34' }, outfit: 'civilian-dress' }),
});

export const OUTFITS = Object.freeze({
  survey: { jacket: '#8b5b37', shirt: '#d9cdb2', pants: '#e9e4d8', boots: '#3a2a20', straps: '#2e1f17', emblem: 'wings', cloak: '#36513c', gear: true },
  training: { jacket: '#8b5b37', shirt: '#d9cdb2', pants: '#e9e4d8', boots: '#3a2a20', straps: '#2e1f17', emblem: 'swords', gear: true },
  garrison: { jacket: '#865a39', shirt: '#cfc6b0', pants: '#e2ddcf', boots: '#3a2a20', straps: '#2e1f17', emblem: 'roses', gear: true },
  commander: { jacket: '#3c3d36', shirt: '#e6e2d6', pants: '#e2ddcf', boots: '#2d241e', straps: null, emblem: 'roses', coat: true },
  // Military Police: same cut, unicorn emblem.
  police: { jacket: '#8b5b37', shirt: '#d9cdb2', pants: '#e9e4d8', boots: '#3a2a20', straps: '#2e1f17', emblem: 'unicorn', gear: true },
  // Paradis 854: dark jacket and long coat over the anti-personnel gear.
  'survey-854': { jacket: '#2b2b2d', shirt: '#e6e2d8', pants: '#3b3934', boots: '#1d1916', straps: '#151210', emblem: 'wings', gear: true, coat: true },
  royal: { jacket: null, shirt: '#f1ede2', pants: '#f1ede2', boots: '#6b5a48', straps: null, emblem: null, skirt: '#e9e4d6', apron: '#c9d6e6' },
  marley: { jacket: '#7d7655', shirt: '#7d7655', pants: '#6f694c', boots: '#3a2c22', straps: '#3a2c22', emblem: null },
  'marley-civilian': { jacket: '#3a3732', shirt: '#cdc4b0', pants: '#3a3a36', boots: '#2b231d', straps: null, emblem: null, coat: true },
  'child-eren': { jacket: null, shirt: '#ddd3c1', pants: '#6f5a45', boots: '#4a3526', straps: null, emblem: null },
  'child-shirt': { jacket: null, shirt: '#cfd7dc', pants: '#5b4a3c', boots: '#4a3526', straps: null, emblem: null },
  'child-dress': { jacket: null, shirt: '#e8e1d2', pants: '#e8e1d2', boots: '#5a3f2c', straps: null, emblem: null, skirt: '#9fa4a0' },
  'civilian-dress': { jacket: null, shirt: '#ece4d2', pants: '#ece4d2', boots: '#4a3526', straps: null, emblem: null, skirt: '#a08a73', apron: '#f0ece2' },
  'civilian-shirt': { jacket: null, shirt: '#c8b89a', pants: '#5c5145', boots: '#4a3526', straps: null, emblem: null },
  'civilian-coat': { jacket: '#5b5348', shirt: '#e3ddd0', pants: '#4c463e', boots: '#2b231d', straps: null, emblem: null, coat: true },
});

export function characterSpec(id) {
  return CHARACTER_SPECS[id] ?? null;
}
