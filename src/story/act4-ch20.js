import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { castExtra } from './extras.js';
import { createSiege, siegeStep } from './act4-rules.js';
import { CHAPTER_20 } from './act4-scripts.js';

// Chapter 20: Utgard castle at night. On top of the ruined tower, with no
// gas left, stab the hands of the titans that climb from four sides for 40 s.
// The veterans die below; Ymir jumps and, as a small titan with jaws, bites
// the titans at the foot of the tower until they bury her.
const HOLD = 40, NEEDED = 5, SIDE_NAMES = ['leste', 'sul', 'oeste', 'norte'];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio, FIELD } = ctx;
    const [tx, tz] = FIELD.tower, H = FIELD.towerHeight, R = FIELD.towerRadius;
    stage.ground = (x, z) => (Math.hypot(x - tx, z - tz) < R ? H : 0);
    const nanaba = castExtra(ctx, 'nanaba', tx, tz + 2, Math.PI);
    const walker = ctx.useWalker(nanaba, { colliders: [], bounds: { minX: tx - 6.2, maxX: tx + 6.2, minZ: tz - 6.2, maxZ: tz + 6.2 } });
    const top = ['historia', 'ymir', 'connie', 'reiner', 'bertholdt'].map((id, i) => ctx.cast(id, id, tx - 3 + i * 1.5, tz - 3 + (i % 2), 0));
    const [historia, ymir, connie, reiner] = top;
    const sides = [0, 1, 2, 3].map(i => i * Math.PI / 2 + .4);
    const climbers = sides.map((a, i) => { const t = horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo'][i], tx + Math.cos(a) * (R + 1.6), tz + Math.sin(a) * (R + 1.6), { height: 9 + i, kind: 'idle' }); t.titan.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); return t; });
    for (let i = 0; i < 8; i++) { const a = i * .8; horde.spawn(['pequeno', 'nariz', 'gordo'][i % 3], tx + Math.cos(a) * (R + 10 + i * 2), tz + Math.sin(a) * (R + 10 + i * 2), { height: 6 + (i * 2) % 7, kind: 'idle', sight: 80 }); }
    let siege = createSiege(4), held = 0, worst = 0, health = 100, bites = 0, dawn = false;
    const tmp = new THREE.Vector3();

    function poseClimbers() {
      siege.climbers.forEach((c, i) => {
        const t = climbers[i]; if (!t.alive) return; const h = t.titan.spec.height;
        t.titan.root.position.y = c.progress * (H + 2) - h * .95;
        t.titan.arms.forEach(a => { a.rotation.x = -2.9; }); t.titan.root.visible = true;
      });
    }
    // Index of the climber whose hands are within reach of the player.
    function nearSide() {
      const p = nanaba.rig.root.position;
      return sides.findIndex(a => Math.hypot(p.x - (tx + Math.cos(a) * (R - 1.5)), p.z - (tz + Math.sin(a) * (R - 1.5))) < 3);
    }

    const handlers = {
      utgard: () => { poseClimbers(); stage.setShot([tx + 26, H + 10, tz + 26], [tx, H - 4, tz], 55); },
      'veterans-fall': () => {
        nanaba.pose = 'fall'; const a = sides[0]; stage.place(nanaba, tx + Math.cos(a) * (R + .5), tz + Math.sin(a) * (R + .5)); nanaba.rig.root.position.y = H - 4;
        stage.after(.9, () => { nanaba.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 40, 5); nanaba.rig.root.visible = false; });
        stage.setShot([tx + Math.cos(a) * (R + 14), H + 4, tz + Math.sin(a) * (R + 14)], [tx + Math.cos(a) * R, H - 4, tz + Math.sin(a) * R], 52);
      },
      'reiner-arm': () => {
        const t = climbers[1], a = sides[1]; t.titan.root.position.y = -t.titan.spec.height + H + 2; stage.place(reiner, tx + Math.cos(a) * (R - 1.2), tz + Math.sin(a) * (R - 1.2)); reiner.pose = 'punch';
        stage.place(connie, tx + Math.cos(a) * (R - 3), tz + Math.sin(a) * (R - 3)); connie.pose = 'fall';
        stage.setShot([tx + Math.cos(a) * 3 - 4, H + 3, tz + Math.sin(a) * 3 - 4], [tx + Math.cos(a) * R, H + 1, tz + Math.sin(a) * R], 50);
      },
      'ymir-jumps': () => {
        stage.place(ymir, tx, tz + R - 1); ymir.pose = 'fall';
        stage.after(.8, () => {
          ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1); ymir.rig.root.visible = false;
          climbers.forEach(t => { t.titan.root.position.y = 0; t.titan.root.position.set(t.home[0] * 1 + (t.home[0] - tx) * .8, 0, t.home[1] + (t.home[1] - tz) * .8); t.titan.arms.forEach(a => { a.rotation.x = 0; }); });
          horde.list.forEach(t => { if (t.alive) t.kind = 'hunt'; });
          const titan = ctx.useTitan([tx, tz + R + 4], 0, 'mandibula'); titan.speedScale = 1.3;
          stage.particles.burst(new THREE.Vector3(tx, 3, tz + R + 4), 'steam', 80, 8);
        });
        stage.setShot([tx + 14, H + 2, tz + R + 18], [tx, H - 6, tz + R], 55);
      },
      'ymir-swarmed': () => {
        const P = ctx.titan.titan.root.position;
        horde.alive().slice(0, 4).forEach((t, i) => { t.kind = 'idle'; t.titan.root.position.set(P.x + Math.cos(i * 1.6) * 3, 0, P.z + Math.sin(i * 1.6) * 3); t.titan.chest.rotation.x = .6; });
        stage.particles.burst(P.clone().setY(3), 'blood', 60, 6); stage.setShot([P.x + 16, 12, P.z + 16], [P.x, 3, P.z], 55);
      },
      dawn: () => {
        dawn = true; stage.scene.background.set('#d9b48e'); stage.scene.fog.color.set('#d9b48e'); stage.hemisphere.intensity = 1.5; stage.sun.color.set('#ffd2a0'); stage.sun.intensity = 2.2;
        for (let i = 0; i < 8; i++) ctx.mount(ctx.cast(`survey-${i}`, i % 2 ? 'soldier-f' : 'soldier-m', tx + 120 + i * 6, tz + 80), tx + 120 + i * 6, tz + 80 + (i % 3) * 5, '#6b4a33').goal = [tx + 30, tz + 20 + i * 3];
        ctx.mounts.forEach(m => { m.speed = 14; });
        stage.setShot([tx + 60, 20, tz + 60], [tx, 10, tz], 60);
      },
    };

    function update(dt, input, control, view) {
      if (ctx.mission === 'torre' && control === 'walk') {
        walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
        let stab = -1;
        if (input.pressed.attack) { stab = nearSide(); nanaba.pose = 'strike'; stage.after(.3, () => { nanaba.pose = 'idle'; }); if (stab >= 0) { climbers[stab].titan.hands[0].getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 20, 4); audio.play('punch', 1, 0, .6); } else ui.toast('Longe demais da beirada: chegue perto das mãos.', 1); }
        siege = siegeStep(siege, dt, stab); held += dt;
        worst = Math.max(worst, ...siege.climbers.map(c => c.progress));
        poseClimbers(); horde.update(dt, { freeze: true });
        if (siege.breached >= 0) return 'Um titã chegou ao topo da torre. Ande de beirada em beirada e corte as mãos que mais subiram.';
        if (held >= HOLD) ctx.goals.add('torre');
        return null;
      }
      if (control === 'titan') {
        const r = ctx.titan.step(dt, input, true), P = ctx.titan.titan.root.position;
        const result = horde.update(dt, { prey: [{ id: 'ymir', position: P }] });
        // Jaws: a bite reaches the nape of whatever titan is close.
        if (r.punch) for (const t of horde.alive()) if (t.titan.root.visible && t.titan.root.position.distanceTo(P) < 6) { horde.kill(t); bites++; ui.toast(`Mordida na nuca · ${bites} / ${NEEDED}`, 1); break; }
        if (result.grabbed) { health -= 5; ui.flash('#6a0909', .4); stage.particles.burst(P.clone().setY(4), 'blood', 24, 4); }
        if (health <= 0) return 'Os titãs cobriram Ymir. Morda um de cada vez e não fique cercada.';
        if (bites >= NEEDED) ctx.goals.add('ymir');
        return null;
      }
      horde.update(dt, { freeze: true }); if (!dawn && ctx.mission === 'torre') poseClimbers();
      ctx.mounts.forEach(m => { if (m.goal) m.speed = 14; });
      return null;
    }

    return {
      script: CHAPTER_20, par: 240,
      start() { poseClimbers(); stage.setShot([tx + 26, H + 10, tz + 26], [tx, H - 4, tz], 55); },
      handlers, update,
      markerHeight: () => H + 2,
      status() {
        if (ctx.control === 'walk') { const i = siege.climbers.reduce((b, c, k) => (c.progress > siege.climbers[b].progress ? k : b), 0); return `Resistir ${Math.floor(held)} / ${HOLD} s · Mais alto: lado ${SIDE_NAMES[i]} (${Math.round(siege.climbers[i].progress * 100)}%)`; }
        if (ctx.control === 'titan') return `Mordidas ${bites} / ${NEEDED} · Corpo ${Math.max(0, health)}%`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'torre') { siege = createSiege(4); held = 0; stage.place(nanaba, tx, tz + 2); nanaba.rig.root.position.y = H; }
        if (snapshot?.mission === 'ymir') { health = 100; bites = 0; }
      },
      challenges: () => (ctx.goals.has('torre') && worst < .85 ? [ctx.data.challenges[0]] : []),
      debug: { stabWorst() { const i = siege.climbers.reduce((b, c, k) => (c.progress > siege.climbers[b].progress ? k : b), 0), a = sides[i]; stage.place(nanaba, tx + Math.cos(a) * (R - 1.6), tz + Math.sin(a) * (R - 1.6)); nanaba.rig.root.position.y = H; siege = siegeStep(siege, 0, i); }, biteAll() { ctx.titan.punchQueued = true; } },
      snapshot: () => ({ held: +held.toFixed(1), worst: +worst.toFixed(2), stabs: siege.stabs, bites, health, dawn, climbers: siege.climbers.map(c => +c.progress.toFixed(2)) }),
    };
  }, { sky: '#1d2534', fog: [50, 320], light: ['#9fb4d8', 1.1], hemi: ['#7f93b8', '#2a2a30', .9], world: { tower: true, castle: false } });
}
