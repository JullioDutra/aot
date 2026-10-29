// Canonical roster used by the campaign validators. `death` is the chapter in
// which the character dies on screen (fixed, never preventable in story mode);
// `powers` lists when each ability becomes available and, when relevant, when
// it is lost. Chapter numbers refer to src/campaign/chapters.js.
// Summaries are paraphrased; no dialogue or assets from the anime are stored.

export const CHARACTERS = Object.freeze({
  eren: { name: 'Eren Yeager', faction: 'Tropa de Exploração', powers: {
    odm: { from: 4 }, attackTitan: { from: 10 }, partialTransformation: { from: 17 }, hardening: { from: 27 },
    coordinateGlimpse: { from: 24, until: 24 }, warHammer: { from: 37 }, founder: { from: 41 } }, death: 46 },
  mikasa: { name: 'Mikasa Ackerman', faction: 'Tropa de Exploração', powers: { odm: { from: 4 }, ackermanInstinct: { from: 0 } } },
  armin: { name: 'Armin Arlert', faction: 'Tropa de Exploração', powers: { odm: { from: 4 }, colossalTitan: { from: 34 } } },
  levi: { name: 'Levi Ackerman', faction: 'Tropa de Exploração', powers: { odm: { from: 0 }, ackermanInstinct: { from: 0 }, thunderSpear: { from: 38 } } },
  erwin: { name: 'Erwin Smith', faction: 'Tropa de Exploração', powers: { odm: { from: 0 } }, death: 34 },
  hange: { name: 'Hange Zoë', faction: 'Tropa de Exploração', powers: { odm: { from: 0 }, thunderSpear: { from: 29 } }, death: 44 },
  jean: { name: 'Jean Kirstein', faction: 'Tropa de Exploração', powers: { odm: { from: 4 } } },
  sasha: { name: 'Sasha Blouse', faction: 'Tropa de Exploração', powers: { odm: { from: 4 }, bow: { from: 19 } }, death: 38 },
  connie: { name: 'Connie Springer', faction: 'Tropa de Exploração', powers: { odm: { from: 4 } } },
  historia: { name: 'Historia Reiss', alias: 'Krista Lenz', faction: 'Tropa de Exploração', powers: { odm: { from: 4 } } },
  ymir: { name: 'Ymir', faction: 'Tropa de Exploração', powers: { odm: { from: 4 }, jawTitan: { from: 20, until: 24 } } },
  reiner: { name: 'Reiner Braun', faction: 'Guerreiros de Marley', powers: { odm: { from: 4 }, armoredTitan: { from: 0 } } },
  bertholdt: { name: 'Bertholdt Hoover', faction: 'Guerreiros de Marley', powers: { odm: { from: 4 }, colossalTitan: { from: 0, until: 34 } }, death: 34 },
  annie: { name: 'Annie Leonhart', faction: 'Guerreiros de Marley', powers: { odm: { from: 4 }, femaleTitan: { from: 0 }, crystal: { from: 18, until: 42 } } },
  marco: { name: 'Marco Bott', faction: '104º Corpo', powers: { odm: { from: 4 } }, death: 11 },
  hannes: { name: 'Hannes', faction: 'Tropa Estacionária', powers: { odm: { from: 0 } }, death: 24 },
  carla: { name: 'Carla Yeager', faction: 'Civis de Shiganshina', powers: {}, death: 2 },
  grisha: { name: 'Grisha Yeager', faction: 'Civis de Shiganshina', powers: {} },
  shadis: { name: 'Keith Shadis', faction: 'Corpo de Treinamento', powers: { odm: { from: 0 } }, death: 44 },
  pixis: { name: 'Dot Pyxis', faction: 'Tropa Estacionária', powers: {}, death: 41 },
  ian: { name: 'Ian Dietrich', faction: 'Tropa Estacionária', powers: { odm: { from: 0 } }, death: 12 },
  rico: { name: 'Rico Brzenska', faction: 'Tropa Estacionária', powers: { odm: { from: 0 } } },
  mitabi: { name: 'Mitabi Jarnach', faction: 'Tropa Estacionária', powers: { odm: { from: 0 } }, death: 12 },
  thomas: { name: 'Thomas Wagner', faction: '104º Corpo', powers: { odm: { from: 4 } }, death: 7 },
  mina: { name: 'Mina Carolina', faction: '104º Corpo', powers: { odm: { from: 4 } }, death: 7 },
  petra: { name: 'Petra Ral', faction: 'Esquadrão de Operações Especiais', powers: { odm: { from: 0 } }, death: 17 },
  oluo: { name: 'Oluo Bozado', faction: 'Esquadrão de Operações Especiais', powers: { odm: { from: 0 } }, death: 17 },
  eld: { name: 'Eld Jinn', faction: 'Esquadrão de Operações Especiais', powers: { odm: { from: 0 } }, death: 17 },
  gunther: { name: 'Gunther Schultz', faction: 'Esquadrão de Operações Especiais', powers: { odm: { from: 0 } }, death: 17 },
  mike: { name: 'Mike Zacharias', faction: 'Tropa de Exploração', powers: { odm: { from: 0 } }, death: 19 },
  nanaba: { name: 'Nanaba', faction: 'Tropa de Exploração', powers: { odm: { from: 0 } }, death: 20 },
  moblit: { name: 'Moblit Berner', faction: 'Tropa de Exploração', powers: { odm: { from: 0 } }, death: 31 },
  marlo: { name: 'Marlo Freudenberg', faction: 'Tropa de Exploração', powers: { odm: { from: 0 } }, death: 32 },
  floch: { name: 'Floch Forster', faction: 'Tropa de Exploração / Yeageristas', powers: { odm: { from: 0 } }, death: 43 },
  kenny: { name: 'Kenny Ackerman', faction: 'Esquadrão Antipessoal', powers: { antiPersonnel: { from: 0 }, ackermanInstinct: { from: 0 } }, death: 28 },
  rod: { name: 'Rod Reiss', faction: 'Família Reiss', powers: { abnormalTitan: { from: 28 } }, death: 28 },
  zeke: { name: 'Zeke Yeager', faction: 'Guerreiros de Marley', powers: { beastTitan: { from: 0 } }, death: 46 },
  pieck: { name: 'Pieck Finger', faction: 'Guerreiros de Marley', powers: { cartTitan: { from: 0 } } },
  porco: { name: 'Porco Galliard', faction: 'Guerreiros de Marley', powers: { jawTitan: { from: 35, until: 41 } }, death: 41 },
  falco: { name: 'Falco Grice', faction: 'Candidatos a Guerreiro', powers: { jawTitan: { from: 41 }, falcoFlight: { from: 46, until: 46 } } },
  gabi: { name: 'Gabi Braun', faction: 'Candidatos a Guerreiro', powers: { rifle: { from: 35 } } },
  colt: { name: 'Colt Grice', faction: 'Candidatos a Guerreiro', powers: {}, death: 41 },
  willy: { name: 'Willy Tybur', faction: 'Família Tybur', powers: {}, death: 37 },
  lara: { name: 'Lara Tybur', faction: 'Família Tybur', powers: { warHammerTitan: { from: 0, until: 37 } }, death: 37 },
  magath: { name: 'Theo Magath', faction: 'Exército de Marley', powers: {}, death: 44 },
  yelena: { name: 'Yelena', faction: 'Yeageristas', powers: {} },
  onyankopon: { name: 'Onyankopon', faction: 'Voluntários', powers: {} },
  kiyomi: { name: 'Kiyomi Azumabito', faction: 'Hizuru', powers: {} },
  dina: { name: 'Dina Fritz', faction: 'Titã Puro (o Sorridente)', powers: { pureTitan: { from: 0 } }, death: 24 },
});

export function powerWindow(characterId, power) {
  return CHARACTERS[characterId]?.powers?.[power] ?? null;
}

export function powerAvailable(characterId, power, chapter) {
  const window = powerWindow(characterId, power);
  if (!window) return false;
  return chapter >= window.from && (window.until === undefined || chapter <= window.until);
}

// Alive through the chapter in which the death happens (the death is staged
// inside that chapter). Flashbacks may show anyone.
export function aliveIn(characterId, chapter, flashback = false) {
  const character = CHARACTERS[characterId];
  if (!character) return false;
  return flashback || character.death === undefined || chapter <= character.death;
}
