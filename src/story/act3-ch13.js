import { createFieldChapter } from './field-chapter.js';
import { castExtra } from './extras.js';
import { relaySignal, formationGap, inFormation, RELAY_WINDOW } from './act3-rules.js';
import { CHAPTER_13 } from './act3-scripts.js';

// Chapter 13: the castle of Levi's squad, then the 57th expedition. As Armin
// on horseback, hold your post in the long-range formation and relay every
// smoke signal with the same colour; then the black smoke of an abnormal.
const SPEED = 10, START = 560, LANE = -30, NEEDED = 9;
const PATTERN = ['red', 'green', 'red', 'red', 'green', 'red', 'green', 'green', 'red', 'red', 'green'];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, FIELD } = ctx;
    const [cx, cz] = FIELD.castle;
    const levi = ctx.cast('levi', 'levi', cx - 6, cz - 24, 0);
    const petra = castExtra(ctx, 'petra', cx - 2, cz - 27, -2.4), oluo = castExtra(ctx, 'oluo', cx - 9, cz - 28, 2.6);
    const eren = ctx.cast('eren', 'eren', cx - 4, cz - 30, Math.PI);
    const hange = ctx.cast('hange', 'hange', cx + 30, cz - 40, -Math.PI / 2); hange.rig.root.visible = false;
    const erwin = ctx.cast('erwin', 'erwin', cx - 40, cz - 60, 0); erwin.rig.root.visible = false;
    const armin = ctx.cast('armin', 'armin', 0, 0, 0);
    const rider = ctx.useRider(armin, '#7a5a3f'); rider.place(START, LANE, -Math.PI / 2);
    // Neighbouring posts of the formation, all riding west with the column.
    const column = { x: START };
    const posts = [['erwin-col', 'soldier-m', 0, '#2f241c'], ['jean', 'jean', -64, '#6b4a33'], ['left', 'soldier-f', 36, '#5a3f2c'], ['far-left', 'soldier-m', 92, '#6b4a33'], ['messenger', null, -150, '#7a5a3f'], ['rear', 'soldier-m', 10, '#5a3f2c']];
    const riders = posts.map(([id, spec, z, color], i) => {
      const a = spec ? ctx.cast(id, spec, START, z) : castExtra(ctx, id, START, z);
      const m = ctx.mount(a, START + (i === 5 ? 30 : 0), z, color);
      const lag = id === 'erwin-col' ? -18 : id === 'rear' ? 30 : (i % 2) * 6;
      m.slot = () => [column.x + lag, z]; return m;
    });
    for (let i = 0; i < 6; i++) horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo'][i % 4], START - 120 - i * 70, (i % 2 ? 1 : -1) * (40 + (i * 37) % 60), { height: 7 + (i * 3) % 6, sight: 50 });

    let riding = false, signal = null, nextSignal = 2.5, count = 0, relayed = 0, mistakes = 0, outside = 0, gap = 0, black = null, warned = false;
    function launch(color) {
      // From the neighbouring post, a little ahead so it stays in view.
      const from = (count % 2 ? riders[1] : riders[2]).horse.root.position;
      signal = { color, age: 0, flare: ctx.flare(from.x - 45, from.z, color) }; count++;
    }
    function fire(color) {
      const p = rider.position; ctx.flare(p.x, p.z, color);
      const target = black && !ctx.goals.has('negra') ? black : signal;
      if (!target) { mistakes++; ui.toast('Sem sinal para repetir: fumaça à toa confunde a formação.', 2); return; }
      const result = relaySignal(target.color, color, target.age);
      if (result === 'ok') { if (target === black) ctx.goals.add('negra'); else { relayed++; ui.toast(`Sinal repassado · ${relayed} / ${NEEDED}`, 1.2); signal = null; nextSignal = 3.2; } }
      else { mistakes++; ui.toast(result === 'wrong' ? 'Cor errada! O posto seguinte vai repassar o sinal errado.' : 'Tarde demais.', 2); }
    }

    const handlers = {
      castle: () => { stage.setShot([cx - 2, 3.2, cz - 40], [cx - 5, 2.4, cz - 26], 50); levi.pose = 'idle'; eren.pose = 'idle'; },
      'hange-visit': () => { hange.rig.root.visible = true; stage.place(hange, cx + 2, cz - 34); stage.walkTo(hange, [[cx - 1, cz - 30]], 2.4, 'run'); stage.setShot([cx + 6, 2.8, cz - 40], [cx - 2, 1.8, cz - 29], 50); },
      ceremony: () => {
        ui.setFade(1); stage.after(.8, () => {
          ui.setFade(0); erwin.rig.root.visible = true; stage.place(erwin, cx - 40, cz - 60, Math.PI);
          ['jean', 'mikasa', 'connie', 'sasha'].forEach((id, i) => ctx.cast(`${id}-cer`, id, cx - 46 + i * 4, cz - 70, 0, { pose: 'salute' }));
          stage.setShot([cx - 34, 2.6, cz - 76], [cx - 40, 2.4, cz - 60], 50);
        });
      },
      'ride-out': () => { ui.setFade(1); stage.after(.9, () => { ui.setFade(0); riding = true; stage.clearShot(); }); },
      'black-smoke': () => { black = { color: 'black', age: 0, flare: ctx.flare(column.x - 50, -170, 'black', 80) }; signal = null; stage.setShot([rider.position.x + 8, 5, rider.position.z + 10], [column.x - 50, 30, -170], 60); },
      'flank-warned': () => { const m = riders[4].horse.root.position; stage.setShot([m.x + 6, 3, m.z + 8], [m.x, 2, m.z], 50); },
    };

    function update(dt, input, control) {
      if (riding) column.x -= SPEED * dt * (ctx.mission === 'fumaca' ? .7 : 1);
      if (control !== 'ride') { rider.step(dt, { ...input, move: [0, 0], look: [0, 0] }, false); if (riding) rider.speed = SPEED; horde.update(dt, { freeze: true }); return null; }
      const r = rider.step(dt, input);
      const result = horde.update(dt, { prey: [{ id: 'player', position: r.position.clone().setY(2.2) }] });
      if (result.grabbed) { ui.flash('#6a0909', .7); return 'Um titã agarrou Armin. A cavalo, o único jeito é desviar cedo: siga a fumaça vermelha.'; }
      if (ctx.mission === 'formacao') {
        gap = formationGap([r.position.x, r.position.z], [column.x, LANE]);
        outside = inFormation(gap) ? 0 : outside + dt;
        if (outside > 8) return 'Você saiu da sua posição. Sem você, o sinal não chega ao próximo posto.';
        if (signal) { signal.age += dt; if (signal.age > RELAY_WINDOW) { mistakes++; ui.toast('O sinal não foi repassado a tempo.', 1.6); signal = null; nextSignal = 2; } }
        else if ((nextSignal -= dt) <= 0) launch(PATTERN[count % PATTERN.length]);
        if (input.pressed.attack) fire('red'); if (input.interact) fire('green');
        if (relayed >= NEEDED) ctx.goals.add('formacao');
      } else if (ctx.mission === 'fumaca') {
        if (black) black.age += dt;
        if (!ctx.goals.has('negra')) { if (input.pressed.jump) fire('black'); else if (input.pressed.attack) fire('red'); else if (input.interact) fire('green'); }
        else if (r.position.distanceTo(riders[4].horse.root.position) < 12) { warned = true; ctx.goals.add('alerta'); }
      }
      return null;
    }

    return {
      script: CHAPTER_13, par: 300,
      start() { stage.setShot([cx - 2, 3.2, cz - 40], [cx - 5, 2.4, cz - 26], 50); },
      handlers, update,
      status() {
        if (ctx.control !== 'ride') return '';
        if (ctx.mission === 'formacao') return `Sinais ${relayed} / ${NEEDED} · Erros ${mistakes} · Distância do posto ${Math.round(gap)} m${signal ? ` · No ar: fumaça ${{ red: 'vermelha', green: 'verde' }[signal.color]}` : ''}`;
        const d = Math.round(rider.position.distanceTo(riders[4].horse.root.position));
        return ctx.goals.has('negra') ? `Mensageiro do flanco direito: ${d} m` : 'Fumaça negra no ar';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'formacao') { column.x = START; rider.place(START, LANE, -Math.PI / 2); relayed = 0; signal = null; nextSignal = 2.5; outside = 0; horde.list.forEach(t => horde.reset(t)); }
        if (snapshot?.mission === 'fumaca') { ctx.goals.delete('negra'); ctx.goals.delete('alerta'); rider.place(column.x, LANE, -Math.PI / 2); }
      },
      challenges: () => (relayed + (ctx.goals.has('negra') ? 1 : 0) >= 10 && mistakes === 0 ? [ctx.data.challenges[0]] : []),
      debug: { autopilot(on = true) { rider.auto = on ? () => (ctx.mission === 'fumaca' && ctx.goals.has('negra') ? [riders[4].horse.root.position.x, riders[4].horse.root.position.z] : [column.x - 4, LANE]) : null; }, relay() { if (signal) fire(signal.color); else if (black) fire('black'); } },
      snapshot: () => ({ relayed, mistakes, gap: Math.round(gap), signal: signal?.color ?? null, warned, column: Math.round(column.x), rider: [Math.round(rider.position.x), Math.round(rider.position.z)], speed: +rider.speed.toFixed(1) }),
    };
  });
}
