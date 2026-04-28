import { createArenaReach, metersToArenaDistance } from "../config/arenaScale";
import type { GladiatorClass } from "./gladiatorTypes";

export type {
  GladiatorAttack,
  GladiatorAttackReach,
  GladiatorClass,
  GladiatorStatKey,
  GladiatorStatMultipliers,
  GladiatorStatPoints,
  GladiatorStats,
} from "./gladiatorTypes";

export const murmillo: GladiatorClass = {
  id: "murmillo",
  name: "Мурміллон",
  title: "Важкий боєць",
  description:
    "Важкоозброєний гладіатор з великим щитом та коротким мечем. Повільний, але надзвичайно витривалий у бою.",
  weapon: "Гладіус (короткий меч)",
  defense: "Скутум (великий щит)",
  stats: { hp: 85, attack: 55, defense: 80, speed: 35, dexterity: 42, endurance: 88 },
  statMultipliers: {
    hp: 7.4,
    attack: 6.2,
    defense: 8.8,
    speed: 3.7,
    dexterity: 4.4,
    endurance: 7.5,
  },
  attacks: [
    {
      name: "Удар мечем",
      cssClass: "attack-sword-slash",
      reach: createArenaReach(1),
    },
    {
      name: "Удар щитом",
      cssClass: "attack-shield-bash",
      reach: createArenaReach(0.5),
    },
  ],
};

export const retiarius: GladiatorClass = {
  id: "retiarius",
  name: "Ретіарій",
  title: "Спритний мисливець",
  description:
    "Легкоозброєний гладіатор із тризубом та сіткою. Швидкий і смертоносний, але вразливий до потужних ударів.",
  weapon: "Тризуб",
  defense: "Спис (парирування)",
  stats: { hp: 60, attack: 75, defense: 35, speed: 90, dexterity: 92, endurance: 58 },
  statMultipliers: {
    hp: 5.5,
    attack: 6.6,
    defense: 4,
    speed: 8.6,
    dexterity: 9,
    endurance: 5.7,
  },
  attacks: [
    {
      name: "Удар тризубом",
      cssClass: "attack-trident-thrust",
      reach: createArenaReach(1.5),
    },
    {
      name: "Кидок сітки",
      cssClass: "attack-net-throw",
      reach: createArenaReach(2),
    },
  ],
};

export const veles: GladiatorClass = {
  id: "veles",
  name: "Веліт",
  title: "Легкий списометальник",
  description:
    "Швидкий гладіатор із трьома метальними списами та коротким мечем. Тримає максимальну дистанцію, прицілюється перед кожним кидком, а в ближньому бою переходить на короткий клинок.",
  weapon: "Три метальні списи, короткий меч",
  defense: "Ухилення зі списом, слабкий блок коротким мечем",
  stats: { hp: 58, attack: 68, defense: 32, speed: 86, dexterity: 88, endurance: 62 },
  statMultipliers: {
    hp: 5.4,
    attack: 6.8,
    defense: 3.7,
    speed: 8.4,
    dexterity: 8.7,
    endurance: 5.9,
  },
  attacks: [
    {
      name: "Кидок списа",
      cssClass: "attack-javelin-throw",
      reach: {
        min: 0,
        preferred: metersToArenaDistance(6),
        max: 2,
      },
    },
    {
      name: "Короткий меч",
      cssClass: "attack-veles-sword",
      reach: createArenaReach(0.5),
    },
  ],
};

export const gladiatorClasses: GladiatorClass[] = [murmillo, retiarius, veles];
