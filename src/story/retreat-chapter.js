import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTitanForm } from '../titan-forms.js';
import { createShiganshina } from './shiganshina-world.js';
import { createStage, createWalker, createHorde, strideTitan, titanForm } from './kit.js';
import { CHAPTER_3, RETREAT_PLACES } from './act1-scripts.js';

// Chapter 3: the last boat out of Shiganshina, the Armored Titan breaking the
// inner gate and the first day as refugees inside Wall Rose.
const DOCK = new THREE.Vector3(RETREAT_PLACES.dock[0], 0, RETREAT_PLACES.dock[1]);
const SHELTER = [600, 0];
const TOWN = { minX: -118, maxX: 118, minZ: -112, maxZ: 125.5 };
const HALL = { minX: SHELTER[0] - 18, maxX: SHELTER[0] + 18, minZ: -12, maxZ: 12 };
const RESCUE = [[-4, 82], [6, 64], [-22, 96], [30, 92], [-38, 72], [14, 48]];
const BELL = 100;

export function createChapter({ scene, camera, ui, audio, data }) {
  const stage = createStage({ scene, camera, ui, audio, sky: '#d8c7aa', fog: [120, 480], sun: [-140, 70, -40], light: ['#ffc98f', 2.3], hemi: ['#f0e2c8', '#6f6046', 1.5] });
  const world = createShiganshina(scene); stage.ground = world.groundHeight;
  world.breakOuterGate();
  for (const h of world.houses.filter(h => h.z < 10 && Math.abs(h.x) < 60).slice(0, 16)) world.collapse(h);
  const wood = toon('#7a5638'), plank = toon('#9a7a55'), water = new THREE.MeshToonMaterial({ color: '#5f8f9f', transparent: true, opacity: .9 });

  // River outside the inner gate, a pier and the evacuation boats.
  const river = new THREE.Mesh(new THREE.PlaneGeometry(700, 9), water); river.rotation.x = -Math.PI / 2; river.position.set(0, -.4, 130); scene.add(river);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(20, .5, 3.4), plank); pier.position.set(DOCK.x, .1, 124); pier.receiveShadow = true; scene.add(pier);
  function boat(x, z) {
    const g = new THREE.Group(); g.position.set(x, -.3, z); scene.add(g);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(13, 1.4, 4.2), wood); hull.castShadow = true; g.add(hull);
    for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(13, .5, .25), plank); rail.position.set(0, .9, s * 2); g.add(rail); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, 5, 6), plank); mast.position.set(3, 3, 0); g.add(mast);
    return g;
  }
  const lastBoat = boat(DOCK.x, 128.6), otherBoats = [boat(DOCK.x + 40, 129.5), boat(DOCK.x + 75, 130.2)];

  // Shelter in Wall Rose: a long storehouse set far from the district.
  const shelter = new THREE.Group(); shelter.position.set(SHELTER[0], 0, SHELTER[1]); scene.add(shelter);
  const inside = new THREE.MeshToonMaterial({ color: '#5f5141', side: THREE.DoubleSide }), straw = toon('#b8a26c');
  const floor = new THREE.Mesh(new THREE.BoxGeometry(40, .2, 28), toon('#6a5a46')); floor.position.y = -.1; floor.receiveShadow = true; shelter.add(floor);
  for (const [x, z, w, d] of [[0, -14, 40, .4], [0, 14, 40, .4], [-20, 0, .4, 28], [20, 0, .4, 28]]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 9, d), inside); wall.position.set(x, 4.5, z); wall.castShadow = true; shelter.add(wall); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(40, .3, 28), inside); roof.position.y = 9; roof.castShadow = true; shelter.add(roof);
  for (let i = 0; i < 6; i++) { const pile = new THREE.Mesh(new THREE.BoxGeometry(4, .35, 2.4), straw); pile.position.set(-15 + i * 5.6, .1, -9 + (i % 2) * 17); shelter.add(pile); }
  const table = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.4), toon('#4e3524')); table.position.set(12, .5, 10.5); shelter.add(table);
  const bread = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), toon('#c48c4a')); bread.visible = false; scene.add(bread);
  for (let i = 0; i < 4; i++) { const lamp = new THREE.PointLight('#ffb468', 6, 14); lamp.position.set(-14 + i * 9.5, 6, 0); shelter.add(lamp); }
  const hallColliders = [{ minX: SHELTER[0] + 10, maxX: SHELTER[0] + 14, minZ: 9.8, maxZ: 11.2 }];

  // ── Actors ────────────────────────────────────────────────────────────
  const eren = stage.actor('eren', 'eren-child', DOCK.x - 2, 123.5, Math.PI);
  const mikasa = stage.actor('mikasa', 'mikasa-child', DOCK.x + 1, 123.6, Math.PI);
  const armin = stage.actor('armin', 'armin-child', DOCK.x + 3, 123.8, Math.PI);
  const hannes = stage.actor('hannes', 'hannes', DOCK.x + 6, 123.2, Math.PI * .9);
  const passengers = [];
  for (let i = 0; i < 9; i++) { const a = stage.actor(`passageiro-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', DOCK.x - 5 + (i % 5) * 2.3, 128 + (i < 5 ? -.9 : .9), i % 2 ? 0 : Math.PI, { pose: 'sit', y: .5 }); passengers.push(a); }
  const rescue = RESCUE.map(([x, z], i) => ({ actor: stage.actor(`civil-${i}`, i % 2 ? 'civilian-m' : 'civilian-f', x, z, Math.PI, { pose: 'reach' }), state: 'waiting', start: [x, z] }));
  const soldiers = [stage.actor('soldado-pao', 'soldier-m', SHELTER[0] + 12, 12, Math.PI, { override: { outfit: 'garrison' } }), stage.actor('soldado-2', 'soldier-m', SHELTER[0] + 14.5, 11.5, Math.PI, { override: { outfit: 'garrison', hair: { style: 'buzz', color: '#5a4a3a' } } })];
  const refugees = [];
  for (let i = 0; i < 14; i++) { const lying = i % 3 === 0; const a = stage.actor(`refugiado-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', SHELTER[0] - 15 + (i % 7) * 5, i < 7 ? -9 : 8, i < 7 ? 0 : Math.PI, { pose: lying ? 'lie' : 'sit' }); if (lying) { a.rig.root.rotation.x = -Math.PI / 2; a.rig.root.position.y = .25; } refugees.push(a); }

  // ── Titans ────────────────────────────────────────────────────────────
  const anchors = [];
  const horde = createHorde(stage, { anchorRoots: anchors });
  const hunters = [['nariz', -20, -30, 7], ['gordo', 24, -40, 8], ['cabeludo', -50, -10, 10], ['pequeno', 40, 0, 4], ['barbudo', 0, -70, 12]].map(([id, x, z, h]) => horde.spawn(id, x, z, { height: h, sight: 55 }));
  const armored = createTitanForm(titanForm('blindado')); armored.root.visible = false; scene.add(armored.root);
  const debris = [];

  // ── State ─────────────────────────────────────────────────────────────
  const walker = createWalker(stage, eren, { colliders: world.colliders, bounds: TOWN });
  walker.lookAt(0, 80);
  let control = 'none', goals = new Set(), bell = BELL, place = 'town', boatRun = false, armoredRun = false, gateBroken = false, fails = 0;
  const boarded = () => rescue.filter(r => r.state === 'boarded').length, lost = () => rescue.filter(r => r.state === 'lost').length;

  function resetDock() {
    bell = BELL; stage.place(eren, DOCK.x - 2, 123.5); walker.lookAt(0, 80);
    for (const r of rescue) { r.state = 'waiting'; r.actor.follow = null; r.actor.path = null; r.actor.pose = 'reach'; r.actor.rig.root.visible = true; r.actor.rig.root.rotation.set(0, Math.PI, 0); stage.place(r.actor, ...r.start); }
    hunters.forEach(t => horde.reset(t));
  }

  const handlers = {
    'dock-arrival': () => { stage.setShot([DOCK.x + 10, 5, 133], [DOCK.x - 4, 2, 118], 50); stage.after(2.4, () => stage.clearShot()); hannes.pose = 'reach'; },
    'boat-departs': () => {
      boatRun = true; for (const a of [eren, mikasa, armin]) { a.follow = null; a.path = null; }
      [eren, mikasa, armin].forEach((a, i) => { a.rig.root.position.set(DOCK.x - 1 + i * 1.4, .5, 129.6); a.rig.root.rotation.set(0, Math.PI, 0); a.pose = i === 0 ? 'reach' : 'sit'; });
      for (const r of rescue) if (r.state === 'boarded') r.actor.rig.root.visible = true; else r.actor.rig.root.visible = false;
      for (const t of hunters) t.titan.root.visible = false;
      stage.setShot([DOCK.x - 9, 4.5, 134], [0, 16, 112], 55);
    },
    'armored-charge': () => {
      armored.root.visible = true; armored.root.position.set(0, 0, -30); armoredRun = true;
      stage.setShot([26, 60, 126], [0, 8, 50], 55); stage.after(2.8, () => stage.setShot([0, 20, 112], [0, 9, 60], 60));
    },
    'gate-burst': () => {
      gateBroken = true; armoredRun = false; armored.root.position.set(0, 0, 123); armored.root.rotation.y = 0; armored.chest.rotation.x = .35; world.breakInnerGate();
      stage.shake(2.4); audio.play('defeat', 4, 0, 1); ui.flash('#fff3dc', .6);
      stage.particles.burst(new THREE.Vector3(0, 8, 120), 'dust', 60, 14);
      for (let i = 0; i < 14; i++) { const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.8 + (i % 3) * .6, 0), toon('#8d8273')); rock.position.set((i % 5 - 2) * 2, 4 + (i % 4) * 2, 118); scene.add(rock); debris.push({ rock, v: new THREE.Vector3((i % 5 - 2) * 3, 8 + (i % 3) * 3, 10 + (i % 4) * 4) }); }
      stage.setShot([24, 4.5, 142], [0, 12, 118], 55);
    },
    shelter: () => {
      ui.setFade(1);
      stage.after(1.2, () => {
        place = 'shelter'; boatRun = false; walker.colliders = hallColliders; walker.bounds = HALL; stage.focusLight(SHELTER[0], SHELTER[1]); scene.fog.near = 30; scene.fog.far = 140;
        stage.place(eren, SHELTER[0] - 12, 0, Math.PI / 2); stage.place(mikasa, RETREAT_PLACES.friends[0], RETREAT_PLACES.friends[1]); stage.place(armin, RETREAT_PLACES.friends[0] + 1.3, RETREAT_PLACES.friends[1] - .4);
        mikasa.pose = armin.pose = 'sit'; walker.lookAt(SHELTER[0] + 12, 8);
        stage.setShot([SHELTER[0] - 4, 5, -10], [SHELTER[0] - 12, 1, 2], 58); ui.setFade(0); stage.after(1.3, () => stage.clearShot());
      });
    },
    'bread-line': () => { stage.face(eren, SHELTER[0] + 12, 12); stage.face(soldiers[0], eren.rig.root.position.x, eren.rig.root.position.z); stage.setShot([SHELTER[0] + 7, 2.6, 4], [SHELTER[0] + 12.5, 1.5, 10.5], 50); bread.visible = true; },
    'eren-kicks': () => { eren.pose = 'punch'; eren.progress = 0; stage.after(.35, () => { soldiers[1].rig.root.rotation.z = .4; audio.play('punch', 2, 0, .8); stage.shake(.4); }); stage.after(1, () => { eren.pose = 'idle'; soldiers[1].rig.root.rotation.z = 0; }); },
    'armin-bows': () => { stage.walkTo(armin, [[eren.rig.root.position.x - 1, eren.rig.root.position.z - .6]], 4, 'run', a => { a.pose = 'reach'; }); },
    'share-bread': () => { stage.clearShot(); eren.pose = 'sit'; armin.pose = 'sit'; stage.place(armin, RETREAT_PLACES.friends[0] + 1.3, RETREAT_PLACES.friends[1] - .4); stage.setShot([RETREAT_PLACES.friends[0] + 3, 2.2, RETREAT_PLACES.friends[1] + 3], [RETREAT_PLACES.friends[0], .8, RETREAT_PLACES.friends[1]], 48); },
    'year-passes': () => { ui.setFade(1); },
  };

  function update(dt, input, mode, view) {
    stage.tick(dt);
    if (mode !== control) { control = mode; if (mode === 'walk') stage.clearShot(); }
    const talking = view.kind === 'line' || view.kind === 'choice';
    walker.step(dt, input, control, talking);
    let fail = null;
    const P = eren.rig.root.position;
    // Escort: call civilians, lead them to the pier, avoid the titans.
    if (place === 'town' && view.kind === 'goal' && view.id === 'cais') {
      bell -= dt;
      for (const r of rescue) {
        const a = r.actor, p = a.rig.root.position;
        if (r.state === 'waiting' && input.interact && Math.hypot(p.x - P.x, p.z - P.z) < 3) { r.state = 'following'; a.follow = eren; a.followGap = 1.6 + rescue.filter(o => o.state === 'following').length * .9; a.followSpeed = 5.4; ui.toast('Venha comigo! O barco está no portão interno!', 1.6); }
        if (r.state === 'following' && Math.hypot(p.x - DOCK.x, p.z - DOCK.z) < 7) {
          r.state = 'boarded'; a.follow = null;
          stage.walkTo(a, [[DOCK.x - 4 + boarded() * 1.5, 126.6], [DOCK.x - 4 + boarded() * 1.5, 128.6]], 3, 'walk', b => { b.pose = 'sit'; b.rig.root.position.y = .5; });
          ui.toast(`Civil a bordo (${boarded()} / ${rescue.length})`, 1.4);
        }
      }
      const prey = [{ id: 'eren', position: P }, ...rescue.filter(r => r.state !== 'boarded' && r.state !== 'lost').map(r => ({ id: r.actor.id, position: r.actor.rig.root.position, rescue: r }))];
      const { grabbed } = horde.update(dt, { prey });
      if (grabbed?.prey.id === 'eren') { stage.particles.burst(P.clone().setY(1), 'blood', 18, 3); fails++; fail = 'Um titã agarrou Eren entre as casas. Use as ruas estreitas: titãs grandes demoram a virar.'; }
      else if (grabbed?.prey.rescue) {
        const r = grabbed.prey.rescue; r.state = 'lost'; r.actor.follow = null; r.actor.rig.root.visible = false;
        stage.particles.burst(r.actor.rig.root.position.clone().setY(grabbed.titan.titan.spec.height * .7), 'blood', 30, 5); audio.play('punch', 10, 0, .7); ui.toast('Um titã levou alguém que confiava em você.', 2.2);
      }
      const onPier = Math.hypot(P.x - DOCK.x, P.z - DOCK.z) < 8;
      if (onPier && rescue.every(r => r.state === 'boarded' || r.state === 'lost')) goals.add('cais');
      if (bell <= 0) { if (onPier) goals.add('cais'); else fail = 'A sineta tocou e o último barco partiu sem você. Fique de olho no tempo.'; }
    } else horde.update(dt, { prey: [], freeze: true });
    // The boat drifts downstream; the Armored sprints through the district.
    if (boatRun) {
      const dx = dt * 1.6; lastBoat.position.x += dx; for (const o of otherBoats) o.position.x += dx;
      for (const a of [eren, mikasa, armin, ...passengers, ...rescue.filter(r => r.state === 'boarded').map(r => r.actor)]) a.rig.root.position.x += dx;
    }
    if (armoredRun) { armored.animate(stage.time); strideTitan(armored, [0, 108], 17, dt, stage.time * 9); if (Math.random() < .5) stage.particles.burst(armored.root.position.clone().setY(.4), 'dust', 2, 4); }
    if (armored.root.visible && !armoredRun) armored.animate(stage.time);
    for (const d of debris) { d.v.y -= 20 * dt; d.rock.position.addScaledVector(d.v, dt); if (d.rock.position.y < .4) { d.rock.position.y = .4; d.v.set(0, 0, 0); } }
    if (place === 'town') stage.focusLight(P.x, P.z);
    if (bread.visible) { eren.rig.hands[1].getWorldPosition(bread.position); }
    stage.frame(dt, walker.view(), 55);
    return fail ? { fail } : null;
  }

  stage.setShot([DOCK.x + 10, 5, 133], [DOCK.x - 4, 2, 118], 50); stage.frame(1, null);
  return {
    script: CHAPTER_3, par: 330, wantsPointerLock: false,
    playerPosition: () => [eren.rig.root.position.x, eren.rig.root.position.z],
    markerHeight: () => 2.6,
    goals: () => goals,
    status: () => (place === 'town' && !goals.has('cais') ? `Sineta em ${Math.max(0, Math.ceil(bell))} s · No barco ${boarded()} / ${rescue.length}${lost() ? ` · Perdidos ${lost()}` : ''}` : ''),
    onStoryEvent(event) {
      if (event.kind === 'event') handlers[event.id]?.(event);
      if (event.kind === 'interact') { eren.pose = 'reach'; bread.visible = false; }
    },
    update,
    checkpoint: () => ({ place }),
    restore(snapshot) { stage.clearShot(); if (snapshot?.place !== 'shelter') resetDock(); else stage.place(eren, SHELTER[0] - 12, 0); },
    challengesDone: () => (boarded() === rescue.length ? [data.challenges[0]] : []),
    debug: {
      teleport([x, z]) { stage.place(eren, x, z); },
      goal(id) { if (id === 'cais') for (const r of rescue) if (r.state !== 'lost') { r.state = 'boarded'; r.actor.follow = null; stage.place(r.actor, DOCK.x - 4 + boarded() * 1.5, 128.6); r.actor.pose = 'sit'; } goals.add(id); },
      call() { for (const r of rescue) if (r.state === 'waiting') { r.state = 'following'; r.actor.follow = eren; r.actor.followGap = 2; } },
    },
    snapshot: () => ({ place, boarded: boarded(), lost: lost(), bell: Math.round(bell), gateBroken, armoredZ: +armored.root.position.z.toFixed(1), player: eren.rig.root.position.toArray().map(v => +v.toFixed(1)), fails }),
  };
}
