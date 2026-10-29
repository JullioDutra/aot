import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_SPECS, OUTFITS } from '../src/character-specs.js';
import { HAIR_STYLES, characterProportions } from '../src/character-model.js';
import { characterPose, POSES } from '../src/character-animation.js';
import { TITAN_FORMS } from '../src/titan-forms.js';
import { CHAPTERS } from '../src/campaign/chapters.js';

test('every spec uses a known hair style, outfit and face shape', () => {
  for (const spec of Object.values(CHARACTER_SPECS)) {
    assert.ok(HAIR_STYLES[spec.hair.style], `${spec.id} hair ${spec.hair.style}`);
    assert.ok(OUTFITS[spec.outfit], `${spec.id} outfit ${spec.outfit}`);
    assert.match(spec.face.iris, /^#[0-9a-f]{6}$/i);
    assert.ok(spec.height > 1 && spec.height < 2.1, `${spec.id} height`);
  }
});

test('reference traits are encoded for the main cast', () => {
  const s = CHARACTER_SPECS;
  assert.equal(s.mikasa.extras.includes('scarf'), true);
  assert.equal(s.levi.extras.includes('cravat'), true);
  assert.equal(s.hange.extras.includes('glasses'), true);
  assert.equal(s.armin.hair.style, 'bowl');
  assert.equal(s.levi.hair.style, 'undercut-curtain');
  assert.equal(s.annie.hair.style, 'bun');
  assert.ok(s.levi.height < s.eren.height && s.eren.height < s.erwin.height, 'Levi is the shortest, Erwin the tallest of the three');
  assert.ok(s['eren-child'].height < s.eren.height);
  assert.equal(OUTFITS.survey.emblem, 'wings');
  assert.equal(OUTFITS.garrison.emblem, 'roses');
});

test('point-of-view characters of the first chapters and of Levi vs Beast have models', () => {
  const needed = { 1: ['eren-child', 'mikasa-child', 'armin-child', 'hannes', 'carla', 'grisha'], 2: ['eren-child', 'hannes', 'carla'], 32: ['levi', 'erwin', 'soldier-m', 'recruit-m'] };
  for (const [number, ids] of Object.entries(needed)) {
    assert.ok(CHAPTERS[number - 1]);
    for (const id of ids) assert.ok(CHARACTER_SPECS[id], `${id} for chapter ${number}`);
  }
});

test('children have proportionally larger heads and shorter legs', () => {
  const adult = characterProportions(CHARACTER_SPECS.eren), child = characterProportions(CHARACTER_SPECS['eren-child']);
  assert.ok(child.headH / child.H > adult.headH / adult.H);
  assert.ok(child.hipY / child.H < adult.hipY / adult.H);
  for (const p of [adult, child]) assert.ok(p.torso > 0 && p.headR > 0);
});

test('poses keep joint values finite and flight tucks the legs forward', () => {
  for (const kind of POSES) for (const t of [0, .4, 1.3]) {
    const pose = characterPose(kind, t, { progress: t % 1 });
    for (const value of [pose.hips, pose.spine, pose.head, ...pose.arms, pose.elbows, pose.legs, pose.knees].flat()) assert.ok(Number.isFinite(value), `${kind} ${t}`);
  }
  const odm = characterPose('odm', 0);
  assert.ok(odm.legs.every(v => v < 0) && odm.knees.every(v => v > 0));
  assert.ok(characterPose('grief', 0).rise < 0);
  const walkA = characterPose('walk', 0.1), walkB = characterPose('walk', 0.4);
  assert.notDeepEqual(walkA.legs, walkB.legs);
});

test('titan forms cover pure archetypes and the Nine with canonical heights', () => {
  const byId = Object.fromEntries(TITAN_FORMS.map(t => [t.id, t]));
  assert.ok(TITAN_FORMS.filter(t => t.group === 'pure').length >= 6);
  for (const [id, h] of [['ataque', 15], ['colossal', 60], ['blindado', 15], ['femea', 14], ['bestial', 17], ['carroca', 4], ['mandibula', 5], ['martelo', 15]]) assert.equal(byId[id]?.height, h, id);
  assert.equal(byId.ataque.face.lipless, true);
  assert.equal(byId.sorridente.face.grin, 1);
  assert.ok(byId.barbudo.face.beard);
});
