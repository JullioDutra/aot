// How fast each character moves on foot and in flight in the story mode,
// from what the series shows: the Ackermans outrun everyone, Sasha and Annie
// are quick, Armin and the children lag behind, Pyxis is old. Pure data.
export const BASE_SPEEDS = Object.freeze({ walk: 3.6, run: 6.6 });

export const AGILITY = Object.freeze({
  levi: 1.25, mikasa: 1.2, sasha: 1.12, annie: 1.1, gabi: 1.1, connie: 1.08,
  eren: 1.05, 'eren-s4': 1.05, jean: 1.05, ymir: 1.05, hange: 1.05, falco: 1.05, erwin: 1.03,
  reiner: 1, bertholdt: 1, marco: 1, shadis: 1,
  zeke: .95, historia: .95, 'mikasa-child': .95, armin: .92, hannes: .9, grisha: .9, 'eren-child': .9,
  pieck: .88, carla: .85, 'armin-child': .85, pixis: .8,
});

export const agility = id => AGILITY[id] ?? 1;

// [walk, run] in m/s.
export function walkSpeeds(id) {
  const k = agility(id);
  return [BASE_SPEEDS.walk * k, BASE_SPEEDS.run * k];
}

// Flight leans on the gear more than on the body, so agility counts less.
export const flightPace = id => 1 + (agility(id) - 1) * .6;
