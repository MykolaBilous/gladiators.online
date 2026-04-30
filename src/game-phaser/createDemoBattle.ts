import {
  createBattlePlan,
  murmillo,
  retiarius,
  type BattlePlan,
} from "@gladiators/combat-sim";

export interface PhaserDemoBattle {
  battlePlan: BattlePlan;
  fighterLabels: Record<string, string>;
}

export function createStageFiveDemoBattle(seed?: string): PhaserDemoBattle {
  const battlePlan = createBattlePlan(
    [murmillo, retiarius],
    {
      [murmillo.id]: "left",
      [retiarius.id]: "right",
    },
    {
      [murmillo.id]: { x: 0.12, y: 0.68 },
      [retiarius.id]: { x: 0.9, y: 0.58 },
    },
    { seed: seed || "stage-5-phaser-slice" },
  );

  return {
    battlePlan,
    fighterLabels: {
      [murmillo.id]: "Аврелій",
      [retiarius.id]: "Ахілл",
    },
  };
}
