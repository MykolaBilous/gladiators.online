import { describe, expect, it } from "vitest";
import { murmillo, retiarius } from "../src/gladiators/gladiatorClasses";
import {
  createEmptyStatPoints,
  deriveGladiatorStats,
} from "../src/gladiators/gladiatorProgression";

describe("deriveGladiatorStats", () => {
  it("preserves class base stats when no points are assigned", () => {
    expect(deriveGladiatorStats(murmillo, createEmptyStatPoints())).toEqual(murmillo.stats);
    expect(deriveGladiatorStats(retiarius, createEmptyStatPoints())).toEqual(retiarius.stats);
  });

  it("applies points on top of the selected class base stats", () => {
    const points = createEmptyStatPoints();
    points.attack = 2;
    points.defense = 1;

    expect(deriveGladiatorStats(murmillo, points)).toMatchObject({
      attack: Math.round(murmillo.stats.attack + 2 * murmillo.statMultipliers.attack),
      defense: Math.round(murmillo.stats.defense + murmillo.statMultipliers.defense),
    });
  });
});
