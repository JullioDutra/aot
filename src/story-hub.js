import './story-hub.css';
import { ACTS, CHAPTERS, EXTRA_MODES } from './campaign/chapters.js';
import { CHARACTERS } from './campaign/characters.js';
import { campaignStats } from './campaign/canon.js';
import { loadProgress, chapterAvailability } from './campaign/progress.js';
import { toggleFullscreen } from './platform.js';

const $ = id => document.getElementById(id);
let storage = null;
try { storage = localStorage; } catch { /* Progress stays empty without storage. */ }
const progress = loadProgress(storage);
const KIND = { narrative: 'narrativa', explore: 'exploração', escape: 'fuga', escort: 'escolta', tutorial: 'treino', odm: 'equipamento 3D', combat: 'combate', titan: 'forma titã', boss: 'confronto', puzzle: 'planejamento', ride: 'cavalaria', chase: 'perseguição', defense: 'defesa', stealth: 'infiltração' };
const STATUS = { open: 'JOGÁVEL', prototype: 'SISTEMAS EM PROTÓTIPO', locked: 'PLANEJADA' };
const names = ids => ids.map(id => CHARACTERS[id]?.name.split(' ')[0] ?? id).join(', ');
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };

const params = new URLSearchParams(location.search);
let currentAct = Number(params.get('ato')) || CHAPTERS.find(c => !progress.completed[c.number])?.act || 1;

function renderStats() {
  const s = campaignStats(CHAPTERS);
  const done = Object.keys(progress.completed).length;
  $('hub-stats').replaceChildren(...[[s.chapters, 'fases'], [s.missions, 'sub-fases'], [s.challenges, 'desafios'], [s.decisions, 'decisões'], [s.playable, 'jogáveis'], [done, 'concluídas']]
    .map(([value, label]) => { const item = el('div'); item.append(el('b', '', String(value)), el('span', '', label)); return item; }));
}

function renderActs() {
  $('hub-acts').replaceChildren(...ACTS.map(act => {
    const button = el('button', `hub-act${act.id === currentAct ? ' active' : ''}`);
    button.type = 'button'; button.dataset.act = act.id;
    button.append(el('span', '', `ATO ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][act.id - 1]}`), el('b', '', act.title));
    button.addEventListener('click', () => { currentAct = act.id; history.replaceState(null, '', `?ato=${act.id}`); renderActs(); renderChapters(); $('hub-detail').hidden = true; });
    return button;
  }));
}

function renderChapters() {
  const act = ACTS.find(a => a.id === currentAct);
  const header = el('div', 'hub-act-goal');
  header.append(el('span', 'hub-eyebrow', `ATO ${currentAct}`), el('h2', '', act.title), el('p', '', act.goal));
  const cards = CHAPTERS.filter(c => c.act === currentAct).map(c => {
    const availability = chapterAvailability(c);
    const card = el('button', `hub-card ${availability}${progress.completed[c.number] ? ' done' : ''}`);
    card.type = 'button'; card.dataset.chapter = c.number;
    const top = el('div', 'hub-card-top'); top.append(el('span', 'hub-number', String(c.number).padStart(2, '0')), el('span', 'hub-status', STATUS[availability]));
    card.append(top, el('h3', '', c.title), el('p', '', `${names(c.pov)} · ${c.year}`), el('small', '', `${c.missions.length} sub-fases · ${c.challenges.length} desafios${c.fixed.some(f => f.kind === 'death') ? ' · perdas' : ''}`));
    if (progress.completed[c.number]) card.append(el('span', 'hub-rating', progress.completed[c.number].rating));
    card.addEventListener('click', () => renderDetail(c));
    return card;
  });
  $('hub-chapters').replaceChildren(header, ...cards);
}

function list(title, items) {
  const section = el('section'); section.append(el('h4', '', title));
  const ul = el('ul'); for (const item of items) ul.append(item instanceof Node ? item : el('li', '', item));
  section.append(ul); return section;
}

function renderDetail(c) {
  const availability = chapterAvailability(c);
  const panel = $('hub-detail'); panel.hidden = false;
  const close = el('button', 'hub-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Fechar'); close.addEventListener('click', () => { panel.hidden = true; });
  const head = el('div', 'hub-detail-head');
  head.append(el('span', 'hub-eyebrow', `FASE ${c.number} · ${c.setting.toUpperCase()}`), el('h2', '', c.title), el('p', 'hub-synopsis', c.synopsis));
  const play = el(availability === 'open' ? 'a' : 'span', `hub-play ${availability}`, availability === 'open' ? 'JOGAR FASE ↗' : availability === 'prototype' ? 'SISTEMAS DISPONÍVEIS EM PROTÓTIPO' : 'EM PRODUÇÃO');
  if (availability === 'open') play.href = `./story.html?fase=${c.number}`;
  const missions = c.missions.map(m => { const li = el('li'); li.append(el('b', '', m.title), el('span', '', ` · ${KIND[m.kind]} — ${m.objective}`)); return li; });
  const fixed = c.fixed.map(f => { const li = el('li', f.kind === 'death' ? 'death' : ''); li.append(el('b', '', f.kind === 'death' ? `${CHARACTERS[f.who].name} · ` : 'Fixo · '), el('span', '', f.staging)); return li; });
  const decisions = c.decisions.map(d => { const li = el('li'); li.append(el('b', '', d.prompt), el('span', '', ` ${d.options.map(o => o.label).join(' / ')} — o desfecho é o mesmo.`)); return li; });
  panel.replaceChildren(close, head, play, el('p', 'hub-gameplay', c.gameplay),
    list('Sub-fases', missions), ...(c.challenges.length ? [list('Desafios opcionais', c.challenges)] : []),
    ...(fixed.length ? [list('Acontecimentos fixos', fixed)] : []), ...(decisions.length ? [list('Decisões que fazem pensar', decisions)] : []),
    el('p', 'hub-refs', `Personagens: ${names(c.present)}. Referências a conferir: ${c.refs.join(', ')}.`));
  panel.scrollTop = 0;
  if (matchMedia('(max-width: 900px)').matches) panel.scrollIntoView({ behavior: 'smooth' });
}

function renderExtras() {
  $('hub-extras').replaceChildren(...EXTRA_MODES.map(mode => {
    const node = el(mode.href ? 'a' : 'span', `hub-extra${mode.href ? '' : ' locked'}`);
    if (mode.href) node.href = mode.href;
    node.append(el('b', '', mode.title), el('span', '', mode.href ? mode.kind : `${mode.kind} · em produção`));
    return node;
  }));
}

$('hub-fullscreen').addEventListener('click', () => void toggleFullscreen(document, document.documentElement));
renderStats(); renderActs(); renderChapters(); renderExtras();
const focus = Number(params.get('fase'));
if (focus) { const c = CHAPTERS.find(x => x.number === focus); if (c) { currentAct = c.act; renderActs(); renderChapters(); renderDetail(c); } }
window.__STORY_HUB__ = Object.freeze({ snapshot: () => ({ act: currentAct, cards: document.querySelectorAll('.hub-card').length, detail: !$('hub-detail').hidden, progress: structuredClone(progress) }) });
