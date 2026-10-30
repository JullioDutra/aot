// Secondary cast built as overrides of the generic soldier and civilian
// specs: [base spec id, override].
const EXTRAS = {
  petra: ['soldier-f', { hair: { style: 'bob', color: '#c8763c' }, face: { eyes: 'round', iris: '#8a5a35', mouth: 'smile' } }],
  oluo: ['soldier-m', { hair: { style: 'undercut-top', color: '#b3a17c', under: '#6e624c' }, face: { eyes: 'narrow', brows: 'flat', mouth: 'flat' }, extras: ['cravat'] }],
  eld: ['soldier-m', { height: 1.82, hair: { style: 'ponytail-low', color: '#d8b868' }, face: { marks: ['goatee'] } }],
  gunther: ['soldier-m', { height: 1.84, hair: { style: 'sidepart', color: '#2a2522' }, face: { eyes: 'neutral', brows: 'thick' } }],
  mike: ['soldier-m', { height: 1.96, build: 'broad', hair: { style: 'sidepart', color: '#c9ae7a' }, face: { marks: ['mustache', 'goatee'] } }],
  nanaba: ['soldier-f', { height: 1.75, hair: { style: 'bob', color: '#e8dfbf' } }],
  moblit: ['soldier-m', { hair: { style: 'short', color: '#6a4a33' }, face: { brows: 'worried' } }],
  nile: ['soldier-m', { height: 1.85, outfit: 'commander', hair: { style: 'sidepart', color: '#2a2420' }, face: { marks: ['goatee'] } }],
  ian: ['soldier-m', { outfit: 'garrison', hair: { style: 'ponytail-low', color: '#4a3424' } }],
  floch: ['recruit-m', { hair: { style: 'middlepart', color: '#3b2c22' } }],
  messenger: ['soldier-m', { hair: { style: 'buzz', color: '#5c4a3a' } }],
  porco: ['soldier-m', { outfit: 'marley', hair: { style: 'cropped', color: '#d9c58a' }, face: { eyes: 'narrow', brows: 'angry', mouth: 'smirk' }, extras: ['armband'] }],
  magath: ['soldier-m', { outfit: 'marley', height: 1.86, hair: { style: 'buzz', color: '#9c968a' }, face: { brows: 'thick', marks: ['mustache', 'wrinkles'] } }],
  colt: ['soldier-m', { outfit: 'marley', hair: { style: 'sidepart', color: '#e0c98a' }, face: { eyes: 'round', mouth: 'smile' }, extras: ['armband'] }],
  willy: ['civilian-m', { outfit: 'civilian-coat', height: 1.85, hair: { style: 'sidepart', color: '#c9b07a' }, face: { mouth: 'firm' } }],
  lara: ['civilian-f', { outfit: 'civilian-coat', hair: { style: 'longStraight', color: '#d9c99a' }, face: { eyes: 'calm' } }],
  kenny: ['civilian-m', { outfit: 'commander', height: 1.92, hair: { style: 'long', color: '#2a2420' }, face: { marks: ['stubble'], eyes: 'narrow', brows: 'flat' }, extras: [] }],
  yelena: ['soldier-f', { outfit: 'marley', height: 1.95, hair: { style: 'cropped', color: '#e8e2d0' }, face: { eyes: 'narrow', mouth: 'smirk' } }],
  onyankopon: ['soldier-m', { outfit: 'marley', skin: '#5a3a28', hair: { style: 'buzz', color: '#1b1614' }, face: { mouth: 'smile' } }],
  kiyomi: ['civilian-f', { outfit: 'civilian-dress', hair: { style: 'bun', color: '#1b1614' } }],
};

export function castExtra(ctx, id, x, z, yaw = 0, options = {}) {
  const [spec, override] = EXTRAS[id];
  return ctx.cast(id, spec, x, z, yaw, { ...options, override: { ...override, ...options.override } });
}
