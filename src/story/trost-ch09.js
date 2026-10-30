import * as THREE from 'three';
import { toon } from '../character-model.js';
import { ROUTES, routeRisk, grabReach } from './story-rules.js';
import { createTrostChapter, odmCombat } from './trost-chapter.js';
import { CHAPTER_9 } from './trost-scripts.js';

// Chapter 9: out of gas on the rooftops. Armin picks a route on a tactical
// view, the unknown titan pulls part of the horde away and Jean leads the
// charge to the supply depot windows.
const WINDOW = new THREE.Vector3(64, 8, 45.5);
const UNKNOWN = [6, 72];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, horde, ui, audio } = ctx;
    const nearest = (x, z) => world.buildings.reduce((best, b) => (Math.hypot(b.x - x, b.z - z) < Math.hypot(best.x - x, best.z - z) ? b : best));
    const start = nearest(-60, 10);
    const S = [start.x, start.h + 1, start.z];
    const PATHS = {
      telhados: [S, [-34, 22, 42], [-4, 24, 64], [34, 22, 58], [WINDOW.x, 12, WINDOW.z + 6]],
      avenida: [S, [-30, 18, 18], [0, 14, 22], [36, 16, 24], [WINDOW.x, 12, WINDOW.z + 6]],
      canal: [S, [-44, 20, -30], [6, 22, -42], [52, 20, -4], [WINDOW.x, 12, WINDOW.z + 6]],
    };
    const outfit = { outfit: 'training' };
    const jean = ctx.cast('jean', 'jean', S[0], S[2], 0, { override: outfit, y: start.h });
    const named = ['mikasa', 'armin', 'connie', 'sasha', 'marco'].map((id, i) => ctx.cast(id, id, S[0] - 3 + i * 1.5, S[2] + 2, Math.PI, { override: outfit, y: world.roofAt(S[0] - 3 + i * 1.5, S[2] + 2) }));
    const squad = ['Benedikt', 'Ruth', 'Tom'].map((name, i) => ({ name, alive: true, actor: ctx.cast(`cadete-${i}`, i === 1 ? 'soldier-f' : 'recruit-m', S[0] + 3 + i, S[2] - 2, Math.PI, { override: outfit, y: world.roofAt(S[0] + 3 + i, S[2] - 2) }) }));
    const pilot = ctx.usePilot(jean.rig, { gas: 42 });
    const unknown = ctx.titanForm('ataque'); unknown.root.position.set(UNKNOWN[0], 0, UNKNOWN[1]); ctx.scene.add(unknown.root);
    // Titans around the depot and along each route.
    for (const [x, z] of [[50, 58], [80, 60], [40, 20], [90, 30], [64, 70], [30, 40]]) horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo'][Math.floor(Math.abs(x * z)) % 4], x, z, { height: 7 + (x % 5), sight: 30 });
    const routeTitans = {};
    for (const route of ROUTES) {
      const path = PATHS[route.id]; routeTitans[route.id] = [];
      for (let i = 0; i < route.titans; i++) { const a = path[1 + (i % 3)], b = path[2 + (i % 3)] ?? path[3]; const t = horde.spawn(['nariz', 'gordo', 'cabeludo', 'pequeno', 'barbudo'][i % 5], (a[0] + b[0]) / 2 + (i - 2) * 6, (a[2] + b[2]) / 2 + (i % 2) * 8, { height: 6 + (i * 3) % 7, sight: 26 }); routeTitans[route.id].push(t); }
    }
    // Tactical overlay: one tube per route.
    const lines = Object.fromEntries(ROUTES.map(route => {
      const curve = new THREE.CatmullRomCurve3(PATHS[route.id].map(([x, , z]) => new THREE.Vector3(x, 28, z)));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 1.1, 6), new THREE.MeshBasicMaterial({ color: '#8a8f92', transparent: true, opacity: .8, depthTest: false }));
      mesh.renderOrder = 5; mesh.visible = false; mesh.userData.noAnchor = true; ctx.scene.add(mesh); return [route.id, mesh];
    }));
    let selected = 0, lastMove = 0, chosen = null, progress = 0, unknownClock = 0, stuck = null, fallen = 0;
    const tmp = new THREE.Vector3();
    const routePath = () => PATHS[chosen ?? ROUTES[selected].id];
    function pointOn(path, t, out) { const k = Math.max(0, Math.min(path.length - 1.001, t)), i = Math.floor(k), f = k - i, a = path[i], b = path[i + 1]; return out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - Math.sin(f * Math.PI) * 8, a[2] + (b[2] - a[2]) * f); }
    function nearestParam(path, P) { let best = 0, d = Infinity; for (let t = 0; t <= path.length - 1; t += .05) { const q = pointOn(path, t, tmp); const dd = q.distanceTo(P); if (dd < d) { d = dd; best = t; } } return best; }

    const handlers = {
      'rooftop-trapped': () => { stage.setShot([S[0] + 12, S[1] + 6, S[2] - 10], [S[0], S[1], S[2] + 2], 52); named.forEach(a => { a.pose = 'grief'; }); named[0].pose = named[1].pose = 'idle'; },
      'cadet-falls': () => {
        const victim = squad.find(s => s.alive); if (!victim) return; stuck = victim;
        pointOn(routePath(), 2.2, tmp); victim.actor.rig.root.position.set(tmp.x, Math.max(2, world.roofAt(tmp.x, tmp.z) + .2), tmp.z); victim.actor.pose = 'reach';
        stage.setShot([tmp.x + 10, tmp.y + 6, tmp.z + 10], [tmp.x, tmp.y - 2, tmp.z], 55);
      },
      'jean-returns': () => {
        if (stuck) { stuck.actor.pose = 'odm'; stuck = null; }
        const other = squad.find(s => s.alive && s.actor.pose !== 'odm') ?? squad.find(s => s.alive); kill(other, 'caiu cobrindo o grupo');
      },
      'jean-leaves': () => { if (stuck) kill(stuck, 'ficou para trás'); stuck = null; },
      windows: () => { pilot.odm.releaseAll(); stage.particles.burst(WINDOW, 'spark', 60, 8); audio.play('block', 1, 0, 1); stage.shake(.6); stage.setShot([WINDOW.x + 10, 9, WINDOW.z + 14], [WINDOW.x, 8, WINDOW.z], 52); },
    };
    function kill(cadet, why) {
      if (!cadet?.alive) return; cadet.alive = false; fallen++;
      const p = cadet.actor.rig.root.position.clone(); stage.particles.burst(p.setY(Math.max(p.y, 4)), 'blood', 50, 5); cadet.actor.rig.root.visible = false; audio.play('punch', 4, 0, .9);
      ui.toast(`${cadet.name} ${why}.`, 2.2);
    }

    function update(dt, input, control, view) {
      // The unknown titan fights near the rooftop route and pulls titans to it.
      unknownClock += dt; unknown.animate(stage.time);
      unknown.arms[1].rotation.x = Math.sin(unknownClock * 3) > .6 ? -1.6 : -.2;
      if (unknownClock > 3) {
        unknownClock = 0;
        const prey = horde.alive().find(t => Math.hypot(t.titan.root.position.x - UNKNOWN[0], t.titan.root.position.z - UNKNOWN[1]) < 40 && t.titan.root.visible);
        if (prey) { horde.kill(prey); stage.shake(.3); }
        for (const t of routeTitans.telhados) if (t.alive) { t.route = [[UNKNOWN[0] + (Math.random() - .5) * 12, UNKNOWN[1] + 8]]; }
      }
      for (const line of Object.values(lines)) line.visible = control === 'plan';
      if (control === 'plan') {
        const dir = Math.sign(Math.round(input.move[0])) || Math.sign(Math.round(-input.move[1]));
        if (dir && dir !== lastMove) { selected = (selected + dir + ROUTES.length) % ROUTES.length; audio.play('block', 1, 0, .4); }
        lastMove = dir;
        ROUTES.forEach((r, i) => { lines[r.id].material.color.set(i === selected ? '#e0b44a' : '#7d8285'); });
        stage.setShot([0, 210, 70], [0, 0, 20], 55);
        if (input.interact) { chosen = ROUTES[selected].id; ctx.goals.add('plano'); stage.clearShot(); }
        horde.update(dt, { prey: [], freeze: false });
        return null;
      }
      if (control !== 'odm') { horde.update(dt, { prey: [], freeze: true }); return null; }
      const path = routePath();
      const squadPrey = squad.filter(s => s.alive && s !== stuck).map(s => ({ id: s.name, position: s.actor.rig.root.position, cadet: s }));
      const r = odmCombat(ctx, dt, input, { prey: squadPrey, grabMessage: 'Um titã agarrou Jean. Sem gás, cada impulso tem que ir para cima, não para o chão.' });
      if (r.fail) return r.fail;
      if (r.grabbed?.prey.cadet) kill(r.grabbed.prey.cadet, 'foi agarrado no caminho');
      // Named cadets fly ahead of Jean; the squad follows behind him.
      progress = Math.max(progress, nearestParam(path, r.position));
      named.forEach((a, i) => { pointOn(path, progress + .35 + i * .08, tmp); a.rig.root.position.copy(tmp).add(new THREE.Vector3((i - 2) * 3, 4, 0)); a.pose = 'odm'; a.rig.root.rotation.y = Math.atan2(WINDOW.x - tmp.x, WINDOW.z - tmp.z); });
      squad.forEach((s, i) => { if (!s.alive || s === stuck) return; pointOn(path, progress - .18 - i * .1, tmp); s.actor.rig.root.position.copy(tmp).add(new THREE.Vector3((i - 1) * 3, -1, 0)); s.actor.pose = 'odm'; });
      if (view.kind === 'goal' && view.id === 'meio' && progress >= 2) ctx.goals.add('meio');
      if (view.kind === 'goal' && view.id === 'jean' && r.position.distanceTo(WINDOW) < 8) ctx.goals.add('jean');
      return null;
    }

    return {
      script: CHAPTER_9, par: 300,
      start() { pilot.place(S[0], S[1], S[2], Math.atan2(WINDOW.x - S[0], -(WINDOW.z - S[2]))); stage.setShot([S[0] + 12, S[1] + 6, S[2] - 10], [S[0], S[1], S[2] + 2], 52); },
      handlers, update,
      markerHeight: () => 12,
      status() {
        if (ctx.control === 'plan') { const r = ROUTES[selected]; return `${r.name} · titãs no caminho ${r.titans}${r.nearUnknown ? ' (perto do titã desconhecido)' : ''} · cobertura ${r.cover} · risco ${routeRisk(r)}`; }
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Esquadrão ${squad.filter(s => s.alive).length} / ${squad.length}`;
        return '';
      },
      checkpoint: () => ({ progress }),
      restore(snapshot) {
        if (snapshot?.mission === 'jean') {
          pilot.place(S[0], S[1], S[2]); pilot.odm.player.gas = 42; progress = 0;
          for (const s of squad) { s.alive = true; s.actor.rig.root.visible = true; } fallen = 0; stuck = null;
        }
      },
      challenges: () => (ctx.goals.has('jean') && squad.filter(s => s.alive).length >= squad.length - 1 ? [ctx.data.challenges[0]] : []),
      onGoal(id) { if (id === 'plano' && !chosen) chosen = ROUTES[selected].id; if (id === 'meio') progress = Math.max(progress, 2); },
      debug: { route(i) { selected = i; } },
      snapshot: () => ({ route: chosen, selected, progress: +progress.toFixed(2), squad: squad.filter(s => s.alive).length, unknown: unknown.root.position.toArray().map(v => +v.toFixed(0)) }),
    };
  });
}
