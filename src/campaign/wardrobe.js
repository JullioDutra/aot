// What each character wears, and how they look, at each point of the
// campaign. eraLook(id, chapter) returns overrides for a character spec or
// null when the base spec already fits. Pure data with tests.
const CADETS = ['eren', 'mikasa', 'armin', 'jean', 'sasha', 'connie', 'reiner', 'bertholdt', 'annie', 'historia', 'ymir', 'marco'];
const SCOUTS_854 = ['mikasa', 'armin', 'jean', 'sasha', 'connie', 'levi', 'hange', 'historia', 'soldier-m', 'soldier-f'];

export const ERAS = Object.freeze([
  { id: 'queda', from: 1, to: 3, year: 845, label: 'Shiganshina, 845' },
  { id: 'cadetes', from: 4, to: 12, year: 847, label: '104º Corpo de Treinamento' },
  { id: 'tropa', from: 13, to: 34, year: 850, label: 'Tropa de Exploração' },
  { id: 'marley', from: 35, to: 47, year: 854, label: 'Quatro anos depois' },
]);

export function eraOf(chapter) {
  return ERAS.find(e => chapter >= e.from && chapter <= e.to) ?? ERAS[0];
}

export function eraLook(id, chapter) {
  if (!chapter) return null;
  const era = eraOf(chapter).id, look = {};
  // Trainees wear the crossed swords until they pick a regiment.
  if (era === 'cadetes' && CADETS.includes(id)) look.outfit = 'training';
  // Annie joins the Military Police; Stohess (18) is in that uniform.
  if (id === 'annie' && chapter >= 13 && chapter <= 18) look.outfit = 'police';
  if (id === 'historia' && chapter >= 28 && chapter <= 34) look.outfit = 'royal';
  // Hange loses the left eye in the Colossal's blast (31).
  if (id === 'hange' && chapter >= 32) look.extras = ['eyepatch', 'glasses'];
  if (era === 'marley') {
    if (SCOUTS_854.includes(id)) look.outfit = 'survey-854';
    if (id === 'historia') look.outfit = 'royal';
    if (id === 'mikasa') { look.marks = ['cheekScar']; look.hair = { style: 'bob' }; }
    // Eren at 19: long hair tied back loosely, stubble, tired eyes, civilian coat.
    if (id === 'eren') { look.outfit = 'marley-civilian'; look.hair = { style: 'long', color: '#2f2119' }; look.marks = ['stubble', 'underEye']; }
    if (id === 'jean') look.marks = ['stubble'];
    if (id === 'reiner') { look.outfit = 'marley'; look.marks = ['stubble', 'underEye']; look.extras = ['armband']; }
    if (id === 'hange') look.extras = ['eyepatch', 'glasses'];
    // The thunder spear blast in the forest (39) scars Levi's face.
    if (id === 'levi' && chapter >= 40) look.marks = ['underEye', 'slashScars'];
  }
  return Object.keys(look).length ? look : null;
}

// Merges a look into a spec the way stage.actor merges overrides.
export function dressFor(spec, chapter) {
  const look = eraLook(spec.id, chapter);
  if (!look) return spec;
  return {
    ...spec, ...look,
    hair: { ...spec.hair, ...look.hair },
    face: { ...spec.face, marks: [...new Set([...(spec.face.marks ?? []), ...(look.marks ?? [])])] },
    // A look that lists extras replaces them (Hange trades the goggles for the patch).
    extras: look.extras ? [...look.extras, ...spec.extras.filter(e => ['scarf', 'whiteShirt', 'cravat', 'laceShirt'].includes(e))] : spec.extras,
  };
}
