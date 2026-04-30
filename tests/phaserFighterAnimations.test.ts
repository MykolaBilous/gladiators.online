import { describe, expect, it } from "vitest";
import {
  murmillo,
  retiarius,
  veles,
  type BattleActionType,
} from "@gladiators/combat-sim";
import {
  getPhaserAttackAnimationState,
  getPhaserDefenseAnimationState,
  getPhaserFighterAnimationAssets,
  getPhaserFighterAnimationFrameRate,
  getPhaserFighterAnimationKey,
  getPhaserFighterClassId,
} from "../src/game-phaser/fighterAnimationCatalog";

describe("Phaser fighter animation catalog", () => {
  it("registers idle, walk, reaction, and finale animations for every gladiator class", () => {
    const assetsByKey = new Set(
      getPhaserFighterAnimationAssets().map((asset) => asset.animationKey),
    );

    for (const classId of ["murmillo", "retiarius", "veles"] as const) {
      for (const state of ["idle", "walk", "block", "dodge", "hit", "defeat", "victory"] as const) {
        expect(assetsByKey.has(getPhaserFighterAnimationKey(classId, state))).toBe(true);
      }
    }

    expect(
      assetsByKey.has(getPhaserFighterAnimationKey("retiarius", "idle", "netless")),
    ).toBe(true);
    expect(
      assetsByKey.has(getPhaserFighterAnimationKey("veles", "idle", "javelins-0")),
    ).toBe(true);
    expect(
      assetsByKey.has(getPhaserFighterAnimationKey("veles", "javelinThrow", "javelins-2-throwing")),
    ).toBe(true);
  });

  it("maps combat action metadata to class-specific attack animations", () => {
    const cases: readonly [
      Parameters<typeof getPhaserAttackAnimationState>[0],
      BattleActionType,
      string,
      ReturnType<typeof getPhaserAttackAnimationState>,
    ][] = [
      ["murmillo", "strike", "attack-sword-slash", "swordSlash"],
      ["murmillo", "strike", "attack-shield-bash", "shieldBash"],
      ["retiarius", "strike", "attack-trident-thrust", "tridentThrust"],
      ["retiarius", "net", "attack-net-throw", "netThrow"],
      ["veles", "javelin", "attack-javelin-throw", "javelinThrow"],
      ["veles", "strike", "attack-veles-sword", "shortSwordSlash"],
    ];

    for (const [classId, actionType, cssClass, expectedState] of cases) {
      expect(getPhaserAttackAnimationState(classId, actionType, cssClass)).toBe(expectedState);
    }
  });

  it("samples enough frames for smooth Phaser playback", () => {
    for (const asset of getPhaserFighterAnimationAssets()) {
      expect(asset.frameCount).toBeGreaterThanOrEqual(asset.repeat ? 20 : 12);
      expect(getPhaserFighterAnimationFrameRate(asset)).toBeGreaterThanOrEqual(18);
    }
  });

  it("maps combat outcomes to defender reactions", () => {
    expect(getPhaserDefenseAnimationState("hit")).toBe("hit");
    expect(getPhaserDefenseAnimationState("block")).toBe("block");
    expect(getPhaserDefenseAnimationState("miss")).toBe("dodge");
  });

  it("resolves runtime fighter names back to their visual class", () => {
    expect(getPhaserFighterClassId("left-0", murmillo.name)).toBe("murmillo");
    expect(getPhaserFighterClassId("right-0", retiarius.name)).toBe("retiarius");
    expect(getPhaserFighterClassId("right-1", veles.name)).toBe("veles");
  });
});
