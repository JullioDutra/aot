import './home.css';
import { ACTS, CHAPTERS } from './campaign/chapters.js';
import { HOME_SCENES, HOW_TO_PLAY, chapterSummary } from './home-content.js';

const $ = id => document.getElementById(id);
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const state = { scenes: 0 };
window.__HOME__ = { snapshot: () => ({ ...state, chapters: document.querySelectorAll('#home-acts li').length }) };

const canvases = HOME_SCENES.map(scene => {
  const figure = el('figure', 'home-scene'); figure.dataset.scene = scene.id;
  const canvas = el('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${scene.title}: ${scene.caption}`);
  const caption = el('figcaption');
  caption.append(el('b', '', scene.title), el('span', '', String(scene.year)), el('small', '', scene.caption));
  figure.append(canvas, caption); $('home-scenes').append(figure);
  return { id: scene.id, canvas };
});

$('home-acts').replaceChildren(...chapterSummary(ACTS, CHAPTERS).map(act => {
  const card = el('article', 'home-act');
  card.append(el('span', 'eyebrow', act.label), el('h3', '', act.title));
  const list = el('ol'); list.start = act.chapters[0].number;
  for (const c of act.chapters) {
    const item = el('li'); item.value = c.number;
    const link = el(c.href ? 'a' : 'span', '', c.title); if (c.href) link.href = c.href;
    item.append(el('i', '', String(c.number).padStart(2, '0')), link, el('small', '', String(c.year)));
    list.append(item);
  }
  card.append(list); return card;
}));

$('home-basics').replaceChildren(...HOW_TO_PLAY.basics.map(text => el('li', '', text)));
$('home-inputs').replaceChildren(...HOW_TO_PLAY.inputs.map(input => {
  const box = el('div', 'home-input'); box.dataset.input = input.id; box.append(el('h3', '', input.title));
  const dl = el('dl'); for (const [key, action] of input.keys) dl.append(el('dt', '', key), el('dd', '', action));
  box.append(dl); return box;
}));

// The scenes load after the first frame so they never delay the live menu.
const later = window.requestIdleCallback ?? (fn => setTimeout(fn, 200));
later(async () => {
  const { renderHomeScenes } = await import('./home-scenes.js');
  state.scenes = renderHomeScenes(canvases);
  document.body.classList.toggle('home-scenes-ready', state.scenes > 0);
});
// Short screens show one scene at a time; wider ones ignore the class.
const figures = [...document.querySelectorAll('.home-scene')];
let shown = 0; figures[0]?.classList.add('active');
setInterval(() => { if ($('home').hidden) return; figures[shown].classList.remove('active'); shown = (shown + 1) % figures.length; figures[shown].classList.add('active'); }, 5000);
