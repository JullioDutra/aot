import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_SPECS, OUTFITS } from '../src/character-specs.js';
import { CHAPTERS } from '../src/campaign/chapters.js';
import { ERAS, eraOf, eraLook, dressFor } from '../src/campaign/wardrobe.js';

test('eras cover all 47 chapters without gaps', () => {
  for (let n = 1; n <= 47; n++) assert.ok(ERAS.some(e => n >= e.from && n <= e.to), `chapter ${n}`);
  assert.equal(eraOf(7).id, 'cadetes'); assert.equal(eraOf(13).id, 'tropa'); assert.equal(eraOf(36).id, 'marley');
  for (const c of CHAPTERS) assert.ok(c.year >= eraOf(c.number).year, `chapter ${c.number} is not earlier than its era`);
});

test('cadets wear the trainee uniform through Trost, then the Survey Corps cloak', () => {
  assert.equal(dressFor(CHARACTER_SPECS.mikasa, 9).outfit, 'training');
  assert.equal(dressFor(CHARACTER_SPECS.mikasa, 14).outfit, 'survey');
  assert.equal(dressFor(CHARACTER_SPECS.levi, 9).outfit, 'survey', 'Levi was never a cadet in this story');
});

test('timeline marks: Annie in the police at Stohess, Hange eyepatch, Levi scars, Mikasa scar', () => {
  assert.equal(dressFor(CHARACTER_SPECS.annie, 18).outfit, 'police');
  assert.ok(!eraLook('hange', 30)?.extras?.includes('eyepatch'));
  assert.ok(dressFor(CHARACTER_SPECS.hange, 33).extras.includes('eyepatch'));
  assert.ok(!dressFor(CHARACTER_SPECS.levi, 39).face.marks.includes('slashScars'));
  assert.ok(dressFor(CHARACTER_SPECS.levi, 41).face.marks.includes('slashScars'));
  assert.ok(dressFor(CHARACTER_SPECS.mikasa, 38).face.marks.includes('cheekScar'));
  assert.equal(dressFor(CHARACTER_SPECS.mikasa, 38).outfit, 'survey-854');
});

test('every outfit a look asks for exists, and specs keep their own fields', () => {
  for (const id of Object.keys(CHARACTER_SPECS)) for (let n = 1; n <= 47; n++) {
    const dressed = dressFor(CHARACTER_SPECS[id], n);
    assert.ok(OUTFITS[dressed.outfit], `${id} in chapter ${n}: ${dressed.outfit}`);
    assert.equal(dressed.id, id); assert.ok(dressed.hair.color);
  }
  assert.equal(dressFor(CHARACTER_SPECS.pixis, 40), CHARACTER_SPECS.pixis, 'no look keeps the same spec');
});
