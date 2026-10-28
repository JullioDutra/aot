import { test, expect } from '@playwright/test';

test('defensive pose renders hands over the nape and releases protection after the hold', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/tests/fixtures/nape-defense.html');
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createTitan } = await import('/src/titan-model.js');
    const { applyNapeGuard } = await import('/src/nape-guard-pose.js');
    const { stepTrostTitan, napeProtected, napeGuardWeight } = await import('/src/trost-titan-ai.js');
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#202930');
    scene.add(new THREE.HemisphereLight(0xffffff, 0x697078, 2));
    const light = new THREE.DirectionalLight(0xffedcf, 3); light.position.set(8, 15, -12); scene.add(light);
    const titan = createTitan(scene, 0, 0, 18, 1);
    const input = { position: [0, 0, 0], player: [0, 13, -6], height: 18, index: 1, visible: true };
    let state = stepTrostTitan({ phase: 'walk', yaw: 0, attackTimer: 0 }, input, .01);
    state = stepTrostTitan(state, input, .75);
    applyNapeGuard(titan, napeGuardWeight(state));
    const camera = new THREE.PerspectiveCamera(42, 1280 / 800, .1, 100);
    camera.position.set(13, 17, -24); camera.lookAt(0, 10, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1280, 800); document.body.append(renderer.domElement); renderer.render(scene, camera);
    const label = document.createElement('p'); label.textContent = 'ENSAIO DE POSE · NUCA PROTEGIDA';
    label.style = 'position:absolute;top:20px;left:24px;color:white;font:20px sans-serif'; document.body.append(label);
    const recovery = stepTrostTitan(state, input, 1.2);
    return { guarded: napeProtected(state), released: !napeProtected(recovery), calls: renderer.info.render.calls };
  });
  expect(result.guarded).toBe(true); expect(result.released).toBe(true); expect(result.calls).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('nape-defense.png') });
  expect(errors).toEqual([]);
});
