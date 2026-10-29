// Chapter 32 — A última carga. Original Portuguese dialogue that follows the
// canonical beats: Erwin's plan and his talk with Levi, the speech, the charge
// under the rock barrage, Levi crossing the line of titans, the Beast taken
// apart and the Cart Titan rescue.

const line = (speaker, text, hold) => (hold === undefined ? { type: 'line', speaker, text } : { type: 'line', speaker, text, hold });
const event = (id, duration = 0) => ({ type: 'event', id, duration });

export const LAST_CHARGE = [
  { type: 'mission', id: 'acordo', title: 'Os sonhos de Erwin' },
  { type: 'control', mode: 'none' },
  event('council', 2.4),
  line('Erwin', 'O Bestial nos encurralou com as pedras. Os cavalos que restam estão atrás das casas, e não há para onde recuar.'),
  line('Levi', 'Então diga logo o plano.'),
  line('Erwin', 'Os recrutas avançam comigo, em linha reta. Enquanto ele mira em nós, você contorna pelos titãs parados e chega à nuca dele.'),
  line('Levi', 'E você vai na frente.'),
  line('Erwin', 'Se eu não for, eles não vão.'),
  line('Erwin', 'Sabe, Levi… eu queria tanto ver aquele porão. Saber se meu pai estava certo. Por isso cheguei até aqui.'),
  line('Levi', 'Erwin. Abra mão desse sonho. Leve os recrutas com você… e deixe o Bestial comigo.'),
  line('Erwin', '…Obrigado, Levi.', 2.6),
  { type: 'mission', id: 'discurso', title: 'O discurso' },
  event('speech', 1.6),
  line('Floch', 'Vamos todos morrer, não vamos? Pra quê? Pra nada?!'),
  line('Erwin', 'Sim. Vamos morrer, quase certamente. Todos nós.'),
  line('Erwin', 'Mas nenhum companheiro que caiu até hoje morreu em vão. Cabe a nós, os vivos, dar sentido ao que eles deram.'),
  line('Erwin', 'E quem vier depois de nós dará sentido ao que daremos agora. É assim que a humanidade continua de pé.'),
  line('Erwin', 'Soldados! Gritem! Avancem!', 2.6),
  { type: 'choice', decision: 'carga', branches: {
    avancar: [line('Você', 'AAAAAAAH!', 1.4)],
    olhar: [line('Floch', 'Não olha pra mim… cavalga!', 1.8)],
  } },
  { type: 'mission', id: 'carga', title: 'A carga' },
  { type: 'control', mode: 'ride' },
  { type: 'goal', id: 'carga', text: 'Sobreviva à chuva de pedras. Dispare sinalizadores com {attack} e desvie das sombras no chão.' },
  { type: 'control', mode: 'none' },
  { type: 'fixed', id: 'erwin-ferido' },
  event('marlo-hit', 2.6),
  { type: 'fixed', id: 'morte-marlo' },
  { type: 'mission', id: 'linha', title: 'A linha de titãs' },
  event('levi-launch', 1.6),
  line('Levi', 'Sem olhar para trás.', 1.6),
  { type: 'control', mode: 'odm' },
  { type: 'goal', id: 'linha', text: 'Atravesse a linha de titãs usando-os como ancoragem ({left} / {right}) e corte nucas no caminho.', target: [14, -232] },
  { type: 'mission', id: 'bestial', title: 'Levi contra o Bestial' },
  { type: 'goal', id: 'bestial', text: 'Desmonte o Bestial: braços, olhos e pernas. Depois, a nuca.' },
  { type: 'control', mode: 'none' },
  event('zeke-pulled', 2.4),
  line('Levi', 'Você não morre aqui. Ainda não. Alguém vai herdar esse poder.', 3),
  { type: 'mission', id: 'carroca', title: 'A Carroça' },
  event('cart-rescue', 3.4),
  line('Levi', 'Tch.', 1.4),
  event('aftermath', 3.2),
  line('Levi', 'Erwin…', 2.8),
  { type: 'end' },
];
