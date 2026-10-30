// Home page content: the three Eren and Mikasa scenes, the chapter summary
// grouped by act and the controls for each input. Pure data, no DOM.
export const HOME_SCENES = Object.freeze([
  { id: 'arvore', title: 'Sob a árvore', year: 845, caption: 'Eren acorda na colina com o rosto molhado. Mikasa o chama para casa com a lenha.', cast: ['eren-child', 'mikasa-child'] },
  { id: 'cachecol', title: 'O cachecol', year: 844, caption: '"É quentinho, né?" O cachecol vermelho que Mikasa nunca mais tira.', cast: ['eren-child', 'mikasa-child'] },
  { id: 'batalha', title: 'Prontos para a batalha', year: 850, caption: 'Lâminas na mão, gás no cilindro. Do alto dos telhados de Trost, os dois esperam o sinal.', cast: ['eren', 'mikasa'] },
]);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// One entry per act with every chapter in order; each chapter links to the
// story mode when it can be played.
export function chapterSummary(acts, chapters) {
  return acts.map(act => ({
    id: act.id, label: `ATO ${ROMAN[act.id - 1]}`, title: act.title,
    chapters: chapters.filter(c => c.act === act.id).sort((a, b) => a.number - b.number).map(c => ({
      number: c.number, title: c.title, year: c.year,
      href: c.status === 'playable' ? `./story.html?fase=${c.number}` : null,
    })),
  }));
}

export const HOW_TO_PLAY = Object.freeze({
  basics: [
    'Cada cabo prende onde a mira aponta: prédios, árvores, muralhas e o corpo dos titãs.',
    'Segure o cabo para ser puxado; o gás dá impulso e mantém a velocidade no ar.',
    'Só a nuca mata um titã. Chegue por trás, perto e rápido, e corte quando o indicador aparecer.',
    'Gás e lâminas acabam. Abasteça nas caixas azuis e nos pontos de reabastecimento.',
  ],
  inputs: [
    { id: 'keyboard', title: 'Teclado e mouse', keys: [['Q / E', 'cabo esquerdo / direito'], ['ESPAÇO', 'gás e salto'], ['W A S D', 'mover e girar no cabo'], ['CLIQUE', 'atacar'], ['G', 'interagir'], ['R', 'abastecer'], ['ESC', 'pausa']] },
    { id: 'gamepad', title: 'Controle', keys: [['LT / RT', 'cabos'], ['A / ×', 'gás e salto'], ['LS / RS', 'mover / câmera'], ['X / □', 'atacar'], ['Y / △', 'interagir'], ['RB / R1', 'abastecer'], ['START', 'pausa']] },
    { id: 'touch', title: 'Toque', keys: [['analógico', 'mover'], ['arrastar à direita', 'câmera'], ['◀ CABO / CABO ▶', 'tocar prende, tocar de novo solta'], ['GÁS', 'impulso e salto; arraste para girar a câmera ou deslize até a LÂMINA'], ['LÂMINA', 'atacar'], ['AGIR', 'interagir']] },
  ],
});
