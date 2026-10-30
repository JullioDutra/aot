// Face features for the toon cast: eye shape per character plus an
// expression layer. Pure data; character-model.js draws it on a canvas.
export const EXPRESSIONS = Object.freeze(['neutral', 'angry', 'shout', 'cry', 'sad', 'smile', 'closed', 'determined', 'shock']);

// [half width, half height, outer tilt, iris scale]
const EYES = { sharp: [25, 12, .22, .9], round: [24, 21, 0, 1.05], calm: [26, 13, .06, 1], narrow: [25, 9, .1, .82], neutral: [23, 15, .05, 1], tired: [25, 11, -.06, .95] };

const LAYERS = {
  neutral: {},
  angry: { brows: 'angry', open: .78, pupil: .85, mouth: 'grit', crease: true },
  shout: { brows: 'angry', open: 1.18, pupil: .55, mouth: 'shout', crease: true },
  cry: { brows: 'worried', open: .72, pupil: 1, mouth: 'tremble', tears: true },
  sad: { brows: 'worried', open: .7, mouth: 'down' },
  smile: { brows: 'soft', open: .55, mouth: 'smile', happy: true },
  closed: { closed: true, mouth: 'neutral' },
  determined: { brows: 'angry', open: .9, mouth: 'firm' },
  shock: { brows: 'raised', open: 1.25, pupil: .5, mouth: 'open' },
};

// Long lashes for most female characters; children get bigger eyes.
export function faceFeatures(spec, expression = 'neutral') {
  const face = spec.face, layer = LAYERS[expression] ?? LAYERS.neutral;
  const [hw, hh, tilt, iris] = EYES[face.eyes] ?? EYES.neutral;
  const child = spec.age === 'child', teen = spec.age === 'teen';
  const scale = child ? 1.12 : teen ? 1.06 : 1;
  const female = /female/.test(spec.build) || ['mikasa', 'historia', 'carla', 'pieck', 'annie', 'ymir', 'sasha', 'hange', 'gabi', 'mikasa-child'].includes(spec.id);
  return {
    expression: LAYERS[expression] ? expression : 'neutral',
    eye: { hw: hw * scale, hh: hh * scale * (layer.open ?? 1), tilt, iris: iris * scale, pupil: layer.pupil ?? 1, closed: !!layer.closed, happy: !!layer.happy },
    lashes: female ? 'long' : 'short',
    brows: layer.brows ?? face.brows,
    mouth: layer.mouth ?? face.mouth,
    tears: !!layer.tears, crease: !!layer.crease,
    blush: child || female,
    marks: face.marks ?? [],
  };
}

// Automatic expression for a body pose, so cutscenes read without extra
// script beats: grief cries, strikes shout, fighting stances set the jaw.
export function poseExpression(pose, current = 'neutral') {
  return { grief: 'cry', strike: 'shout', punch: 'angry', guard: 'determined', lie: 'closed', fall: 'shock', carried: 'shock' }[pose] ?? (current === 'neutral' ? 'neutral' : current);
}
