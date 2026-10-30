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
};

export function castExtra(ctx, id, x, z, yaw = 0, options = {}) {
  const [spec, override] = EXTRAS[id];
  return ctx.cast(id, spec, x, z, yaw, { ...options, override: { ...override, ...options.override } });
}
