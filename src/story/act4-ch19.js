import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { odmCombat } from './trost-chapter.js';
import { castExtra } from './extras.js';
import { aimTarget, blindTime } from './act4-rules.js';
import { CHAPTER_19 } from './act4-scripts.js';

// Chapter 19: titans inside Wall Rose at night. As Mike, hold nine titans at
// the abandoned village while the recruits ride off, until the Beast Titan
// speaks. As Sasha, lead a girl to a horse with only a bow: an arrow in the
// eye blinds the titan for a moment. As Connie, walk into empty Ragako.
const NEEDED = 4, HORSE = [-40, -110];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio, FIELD } = ctx;
    const [vx, vz] = FIELD.village;
    const mike = castExtra(ctx, 'mike', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(mike.rig); pilot.place(vx + 30, 0, vz + 10, Math.PI);
    const recruits = ['nanaba', 'connie', 'sasha', 'reiner'].map((id, i) => {
      const a = id === 'nanaba' ? castExtra(ctx, id, vx + 40, vz + 20 + i * 3) : ctx.cast(`${id}-r`, id, vx + 40, vz + 20 + i * 3);
      const m = ctx.mount(a, vx + 40 + i * 2, vz + 22 + i * 3, ['#6b4a33', '#5a3f2c', '#7a5a3f', '#4a3428'][i]); m.speed = 0; return m;
    });
    const beast = ctx.titanForm('bestial'); beast.root.visible = false; ctx.scene.add(beast.root);
    for (let i = 0; i < 9; i++) horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], vx - 40 + (i % 3) * 30, vz - 120 - Math.floor(i / 3) * 25, { height: 6 + (i * 3) % 8, sight: 140 });
    // Sasha's part: her, the girl and the small titan at the house.
    const sasha = ctx.cast('sasha', 'sasha', vx + 70, vz - 10, -Math.PI / 2); sasha.rig.root.visible = false;
    const girl = ctx.cast('girl', 'civilian-f', vx + 52, vz - 4, 0, { override: { height: 1.12, age: 'child', hair: { style: 'bob', color: '#3a2a20' } } }); girl.rig.root.visible = false;
    const horse = ctx.mount(ctx.cast('horse-rider', 'soldier-m', ...HORSE), ...HORSE, '#6b4a33'); horse.actor.rig.root.visible = false;
    const connie = ctx.cast('connie', 'connie', vx + 40, vz - 30, Math.PI); connie.rig.root.visible = false;
    const mother = ctx.titanForm('pequeno'); mother.root.scale.setScalar(7); mother.root.visible = false; ctx.scene.add(mother.root);
    let hunter = null, blind = 0, arrows = 0, arrowLine = null, walker = null;
    const tmp = new THREE.Vector3();

    function shoot() {
      const p = sasha.rig.root.position, list = hunter?.alive ? [hunter] : [];
      const i = aimTarget([p.x, p.z], walker.yaw, list.map(t => [t.titan.root.position.x, t.titan.root.position.z]));
      audio.play('dodge', 1, 0, .6);
      if (arrowLine) { ctx.scene.remove(arrowLine); arrowLine = null; }
      if (i < 0) { ui.toast('Errou: mire no titã à sua frente.', 1.2); return; }
      const t = list[i]; t.titan.head.getWorldPosition(tmp); arrows++;
      arrowLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().setY(1.5), tmp.clone()]), new THREE.LineBasicMaterial({ color: '#d8c8a0' })); ctx.scene.add(arrowLine);
      stage.after(.3, () => { if (arrowLine) { ctx.scene.remove(arrowLine); arrowLine = null; } });
      stage.particles.burst(tmp, 'blood', 16, 3);
      blind = blindTime(arrows); t.kind = 'idle'; t.titan.head.rotation.x = -.5; ui.toast(`No olho! Ele está cego por ${blind.toFixed(1)} s`, 1.4);
    }

    const handlers = {
      'titans-south': () => { stage.setShot([vx + 40, 14, vz + 30], [vx, 6, vz - 110], 58); },
      beast: () => {
        beast.root.visible = true; beast.root.position.set(vx + 20, 0, vz - 70); beast.root.rotation.y = 0;
        horde.alive().forEach(t => { t.kind = 'idle'; });
        stage.setShot([vx + 34, 6, vz - 20], [vx + 20, 14, vz - 70], 55);
      },
      'horse-flees': () => {
        const p = pilot.odm.player.position; pilot.odm.releaseAll(); stage.scene.add(mike.rig.root);
        const t = horde.alive()[0] ?? horde.spawn('gordo', p.x + 6, p.z, { height: 9 });
        t.titan.root.position.set(p.x + 5, 0, p.z); t.titan.arms[1].rotation.x = -1.4;
        stage.after(.8, () => { t.titan.hands[1].getWorldPosition(tmp); mike.rig.root.position.copy(tmp); mike.pose = 'carried'; stage.particles.burst(tmp, 'blood', 30, 4); });
        stage.after(2, () => { mike.rig.root.visible = false; stage.particles.burst(tmp, 'blood', 50, 6); });
        stage.setShot([p.x - 10, 6, p.z + 14], [p.x + 4, 5, p.z], 52);
      },
      'sasha-village': () => {
        ui.setFade(1);
        stage.after(.8, () => {
          ui.setFade(0); horde.list.forEach(t => { t.titan.root.visible = false; t.alive = false; }); beast.root.visible = false;
          sasha.rig.root.visible = true; girl.rig.root.visible = true; stage.place(sasha, vx + 70, vz - 10); stage.place(girl, vx + 64, vz - 8);
          hunter = horde.spawn('pequeno', vx + 46, vz - 18, { height: 5, sight: 60 }); hunter.speed = 3.6;
          walker = ctx.useWalker(sasha); walker.lookAt(vx + 46, vz - 18);
          stage.setShot([vx + 78, 4, vz - 2], [vx + 56, 2, vz - 14], 52);
        });
      },
      'girl-rides': () => { girl.follow = null; stage.place(girl, ...HORSE); girl.pose = 'ride'; stage.setShot([HORSE[0] + 6, 3, HORSE[1] + 8], [...HORSE.slice(0, 1), 1.5, HORSE[1]], 50); horse.goal = [HORSE[0] + 40, HORSE[1] + 160]; horse.speed = 14; horse.horse.saddle.add(girl.rig.root); girl.rig.root.position.set(0, -.95, 0); },
      ragako: () => {
        ui.setFade(1);
        stage.after(.8, () => {
          ui.setFade(0); stage.scene.background.set('#c9c4b4'); stage.scene.fog.color.set('#c9c4b4'); stage.hemisphere.intensity = 1.6; stage.sun.intensity = 2;
          sasha.rig.root.visible = false; if (hunter) { hunter.titan.root.visible = false; hunter.alive = false; }
          connie.rig.root.visible = true; stage.place(connie, vx + 40, vz - 30); walker = ctx.useWalker(connie); walker.lookAt(vx + 24, vz + 8);
          mother.root.visible = true; mother.root.position.set(vx + 18, 6, vz + 18); mother.root.rotation.set(-Math.PI / 2, .3, 0);
        });
      },
      mother: () => { stage.setShot([vx + 26, 3, vz + 8], [vx + 18, 6, vz + 18], 50); mother.head.rotation.x = .3; },
    };

    function update(dt, input, control, view) {
      if (beast.root.visible) beast.animate(stage.time);
      if (ctx.mission === 'mike') {
        // Recruits gallop off once Mike stays behind.
        if (control === 'odm') recruits.forEach((m, i) => { m.goal = [vx + 80 + i * 6, vz + 260]; m.speed = 14; });
        if (control !== 'odm') { horde.update(dt, { freeze: true }); return null; }
        const r = odmCombat(ctx, dt, input, { grabMessage: 'Um titã agarrou Mike. Fique alto, sobre os telhados, e corte por trás.' });
        if (r.fail) return r.fail;
        if (horde.list.filter(t => !t.alive).length >= NEEDED) ctx.goals.add('mike');
        return null;
      }
      if (ctx.mission === 'sasha' && hunter) {
        if (control === 'walk') {
          walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
          if (input.pressed.attack) shoot();
          if (!girl.follow) { girl.follow = sasha; girl.followGap = 1.6; girl.followSpeed = 5.2; }
        }
        if (blind > 0 && (blind -= dt) <= 0) { hunter.kind = 'hunt'; hunter.titan.head.rotation.x = 0; }
        const prey = control === 'walk' ? [{ id: 'sasha', position: sasha.rig.root.position }, { id: 'girl', position: girl.rig.root.position }] : [];
        const result = horde.update(dt, { prey, freeze: control !== 'walk' });
        if (result.grabbed) { stage.particles.burst(result.grabbed.prey.position.clone().setY(1), 'blood', 30, 4); return result.grabbed.prey.id === 'girl' ? 'O titã pegou a menina. Uma flecha no olho dele compra alguns segundos.' : 'O titã pegou Sasha. Atire no olho e só depois corra.'; }
        if (control === 'walk' && Math.hypot(sasha.rig.root.position.x - HORSE[0], sasha.rig.root.position.z - HORSE[1]) < 4 && girl.rig.root.position.distanceTo(sasha.rig.root.position) < 4) ctx.goals.add('sasha');
        return null;
      }
      if (control === 'walk' && walker) walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
      return null;
    }

    return {
      script: CHAPTER_19, par: 320,
      start() { stage.setShot([vx + 40, 14, vz + 30], [vx, 6, vz - 110], 58); },
      handlers, update,
      markerHeight: () => 2,
      status() {
        if (ctx.mission === 'mike' && ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Titãs ${horde.list.filter(t => !t.alive).length} / ${NEEDED}`;
        if (ctx.mission === 'sasha' && ctx.control === 'walk') return `Cavalo a ${Math.round(Math.hypot(sasha.rig.root.position.x - HORSE[0], sasha.rig.root.position.z - HORSE[1]))} m · Flechas ${arrows}${blind > 0 ? ` · Titã cego ${blind.toFixed(1)} s` : ''}`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'mike') { pilot.place(vx + 30, 0, vz + 10, Math.PI); horde.list.forEach(t => horde.reset(t)); }
        if (snapshot?.mission === 'sasha' && hunter) { horde.reset(hunter, vx + 46, vz - 18); hunter.kind = 'hunt'; blind = 0; stage.place(sasha, vx + 70, vz - 10); girl.follow = null; stage.place(girl, vx + 64, vz - 8); }
      },
      challenges: () => (ctx.goals.has('sasha') && arrows <= 3 ? [ctx.data.challenges[0]] : []),
      debug: { shoot() { if (walker && hunter) { const p = sasha.rig.root.position, h = hunter.titan.root.position; walker.lookAt(h.x, h.z); shoot(); } } },
      snapshot: () => ({ arrows, blind: +blind.toFixed(1), hunter: hunter ? hunter.kind : null, mother: mother.root.visible, mike: mike.rig.root.visible }),
    };
  }, { sky: '#1d2534', fog: [50, 300], light: ['#9fb4d8', 1.1], hemi: ['#7f93b8', '#2a2a30', .9] });
}
