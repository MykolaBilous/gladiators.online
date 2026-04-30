import { describe, expect, it } from "vitest";
import { createBattlePlan, murmillo, retiarius, veles } from "@gladiators/combat-sim";
import {
  createArenaFighterInfos,
  formatArenaResult,
  getArenaBattleEvents,
  projectBattlePoint,
} from "../src/game-phaser/battlePlanProjection";
import { createStageFiveDemoBattle } from "../src/game-phaser/createDemoBattle";

describe("Phaser arena projection", () => {
  it("adapts a BattlePlan into the first two visible fighters", () => {
    const { battlePlan, fighterLabels } = createStageFiveDemoBattle();
    const fighters = createArenaFighterInfos(battlePlan, fighterLabels);

    expect(fighters).toHaveLength(2);
    expect(fighters.map((fighter) => fighter.teamId)).toEqual(["left", "right"]);
    expect(getArenaBattleEvents(battlePlan, fighters.map((fighter) => fighter.id)).length).toBeGreaterThan(0);
  });

  it("keeps every fighter visible for larger Phaser battle plans", () => {
    const battlePlan = createBattlePlan(
      [murmillo, retiarius, veles],
      {
        [murmillo.id]: "left",
        [retiarius.id]: "right",
        [veles.id]: "right",
      },
      undefined,
      { seed: "phaser-all-fighters" },
    );
    const fighters = createArenaFighterInfos(battlePlan);

    expect(fighters.map((fighter) => fighter.id)).toEqual([
      murmillo.id,
      retiarius.id,
      veles.id,
    ]);
  });

  it("projects larger battle y values closer to the viewer", () => {
    const back = projectBattlePoint({ x: 0.5, y: 0.1 });
    const front = projectBattlePoint({ x: 0.5, y: 0.9 });

    expect(front.y).toBeGreaterThan(back.y);
    expect(front.scale).toBeGreaterThan(back.scale);
    expect(front.depth).toBeGreaterThan(back.depth);
  });

  it("formats the final result from the combat-sim plan", () => {
    const { battlePlan, fighterLabels } = createStageFiveDemoBattle();

    expect(formatArenaResult(battlePlan, fighterLabels)).toContain("defeats");
  });
});
