import type { BattleActionType, BattleOutcome } from "@gladiators/combat-sim";
import type { AnimationClip, BoneDef } from "../animation/skeletonTypes";
import {
  createMurmilloSvg,
  murmilloBones,
  murmilloHeavyDodge,
  murmilloShieldBash,
  murmilloShieldBlock,
  murmilloSwordSlash,
  murmilloWalk,
} from "../gladiatorAssets/murmilloSvg";
import {
  createRetiariusSvg,
  retiariusBones,
  retiariusNetThrow,
  retiariusQuickDodge,
  retiariusTridentParry,
  retiariusTridentThrust,
  retiariusWalk,
} from "../gladiatorAssets/retiariusSvg";
import {
  createVelesSvg,
  velesBones,
  velesJavelinThrow,
  velesQuickDodge,
  velesShortSwordBlock,
  velesShortSwordSlash,
  velesWalk,
} from "../gladiatorAssets/velesSvg";
import type { PhaserFighterClassId } from "./arenaAssets";

export type PhaserFighterAnimationState =
  | "idle"
  | "walk"
  | "swordSlash"
  | "shieldBash"
  | "tridentThrust"
  | "netThrow"
  | "javelinThrow"
  | "shortSwordSlash"
  | "block"
  | "dodge"
  | "hit"
  | "defeat"
  | "victory";

export type PhaserFighterVisualVariant =
  | "default"
  | "netless"
  | "javelins-2-throwing"
  | "javelins-2-ready"
  | "javelins-1-throwing"
  | "javelins-1-ready"
  | "javelins-0";

export interface PhaserFighterAnimationSpec {
  readonly state: PhaserFighterAnimationState;
  readonly clip: AnimationClip;
  readonly frameCount: number;
  readonly repeat: boolean;
  readonly sampleEndFrame: boolean;
}

export interface PhaserFighterDefinition {
  readonly classId: PhaserFighterClassId;
  readonly svg: string;
  readonly bones: readonly BoneDef[];
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly originX: number;
  readonly originY: number;
  readonly animations: Partial<Record<PhaserFighterAnimationState, PhaserFighterAnimationSpec>>;
}

export interface PhaserFighterAnimationAsset {
  readonly classId: PhaserFighterClassId;
  readonly state: PhaserFighterAnimationState;
  readonly textureKey: string;
  readonly animationKey: string;
  readonly svg: string;
  readonly bones: readonly BoneDef[];
  readonly clip: AnimationClip;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly repeat: boolean;
  readonly sampleEndFrame: boolean;
  readonly hiddenSelectors: readonly string[];
}

const LOOP_FRAME_COUNT = 20;
const ACTION_FRAME_COUNT = 14;
const REACTION_FRAME_COUNT = 12;
const LONG_ACTION_FRAME_COUNT = 22;
const PHASER_ANIMATION_MIN_FRAME_RATE = 18;
const PHASER_ANIMATION_MAX_FRAME_RATE = 30;

function makeSpec(
  state: PhaserFighterAnimationState,
  clip: AnimationClip,
  options: {
    readonly frameCount?: number;
    readonly repeat?: boolean;
    readonly sampleEndFrame?: boolean;
  } = {},
): PhaserFighterAnimationSpec {
  return {
    state,
    clip,
    frameCount: options.frameCount ?? ACTION_FRAME_COUNT,
    repeat: options.repeat ?? false,
    sampleEndFrame: options.sampleEndFrame ?? true,
  };
}

function createIdleClip(name: string, weaponBone?: "net" | "javelin"): AnimationClip {
  return {
    name,
    duration: 1_120,
    keyframes: [
      {
        t: 0,
        bones: {
          root: {},
          torso: {},
          "arm-l": {},
          "forearm-l": {},
          "arm-r": {},
          "forearm-r": {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
      {
        t: 0.32,
        bones: {
          root: { ty: -2 },
          torso: { r: -1.6 },
          "arm-l": { r: -2 },
          "forearm-l": { r: -1 },
          "arm-r": { r: 2 },
          "forearm-r": { r: 1 },
          head: { r: -1, ty: -1 },
          ...(weaponBone ? { [weaponBone]: { r: -2, ty: -1 } } : {}),
        },
      },
      {
        t: 0.68,
        bones: {
          root: { ty: 1 },
          torso: { r: 1.4 },
          "arm-l": { r: 1.5 },
          "forearm-l": { r: 1 },
          "arm-r": { r: -1.5 },
          "forearm-r": { r: -1 },
          head: { r: 1 },
          ...(weaponBone ? { [weaponBone]: { r: 2, ty: 1 } } : {}),
        },
      },
      {
        t: 1,
        bones: {
          root: {},
          torso: {},
          "arm-l": {},
          "forearm-l": {},
          "arm-r": {},
          "forearm-r": {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
    ],
  };
}

function createHitClip(name: string, side: -1 | 1, weaponBone?: "net" | "javelin"): AnimationClip {
  return {
    name,
    duration: 420,
    keyframes: [
      {
        t: 0,
        bones: {
          root: {},
          torso: {},
          "arm-l": {},
          "forearm-l": {},
          "arm-r": {},
          "forearm-r": {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
      {
        t: 0.38,
        bones: {
          root: { tx: 10 * side, ty: 3 },
          torso: { r: 8 * side },
          "arm-l": { r: 12 * side },
          "forearm-l": { r: 8 * side },
          "arm-r": { r: 10 * side },
          "forearm-r": { r: 7 * side },
          head: { r: 10 * side, tx: 3 * side, ty: 2 },
          ...(weaponBone ? { [weaponBone]: { r: 8 * side, tx: 4 * side } } : {}),
        },
      },
      {
        t: 0.68,
        bones: {
          root: { tx: 4 * side, ty: 1 },
          torso: { r: 3 * side },
          "arm-l": { r: 5 * side },
          "forearm-l": { r: 4 * side },
          "arm-r": { r: 4 * side },
          "forearm-r": { r: 3 * side },
          head: { r: 4 * side },
          ...(weaponBone ? { [weaponBone]: { r: 3 * side } } : {}),
        },
      },
      {
        t: 1,
        bones: {
          root: {},
          torso: {},
          "arm-l": {},
          "forearm-l": {},
          "arm-r": {},
          "forearm-r": {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
    ],
  };
}

function createDefeatClip(
  name: string,
  side: -1 | 1,
  weaponBone?: "net" | "javelin",
): AnimationClip {
  return {
    name,
    duration: 780,
    keyframes: [
      {
        t: 0,
        bones: {
          root: {},
          torso: {},
          "arm-l": {},
          "forearm-l": {},
          "arm-r": {},
          "forearm-r": {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
      {
        t: 0.34,
        bones: {
          root: { tx: 10 * side, ty: 8 },
          torso: { r: 12 * side },
          "arm-l": { r: 20 * side },
          "forearm-l": { r: 16 * side },
          "arm-r": { r: 18 * side },
          "forearm-r": { r: 14 * side },
          head: { r: 14 * side, tx: 4 * side, ty: 4 },
          ...(weaponBone ? { [weaponBone]: { r: 12 * side, tx: 8 * side } } : {}),
        },
      },
      {
        t: 0.72,
        bones: {
          root: { tx: 22 * side, ty: 28, r: 16 * side },
          torso: { r: 26 * side },
          "arm-l": { r: 34 * side, ty: 4 },
          "forearm-l": { r: 28 * side, ty: 5 },
          "arm-r": { r: 32 * side, ty: 4 },
          "forearm-r": { r: 26 * side, ty: 5 },
          head: { r: 24 * side, tx: 8 * side, ty: 10 },
          ...(weaponBone ? { [weaponBone]: { r: 24 * side, tx: 14 * side, ty: 8 } } : {}),
        },
      },
      {
        t: 1,
        bones: {
          root: { tx: 25 * side, ty: 34, r: 18 * side },
          torso: { r: 30 * side },
          "arm-l": { r: 38 * side, ty: 6 },
          "forearm-l": { r: 32 * side, ty: 6 },
          "arm-r": { r: 36 * side, ty: 6 },
          "forearm-r": { r: 30 * side, ty: 6 },
          head: { r: 28 * side, tx: 10 * side, ty: 12 },
          ...(weaponBone ? { [weaponBone]: { r: 28 * side, tx: 16 * side, ty: 10 } } : {}),
        },
      },
    ],
  };
}

function createVictoryClip(
  name: string,
  weaponSide: "left" | "right",
  weaponBone?: "net" | "javelin",
): AnimationClip {
  const arm = weaponSide === "left" ? "arm-l" : "arm-r";
  const forearm = weaponSide === "left" ? "forearm-l" : "forearm-r";
  const direction = weaponSide === "left" ? -1 : 1;

  return {
    name,
    duration: 980,
    keyframes: [
      {
        t: 0,
        bones: {
          root: {},
          torso: {},
          [arm]: {},
          [forearm]: {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
      {
        t: 0.3,
        bones: {
          root: { ty: -4 },
          torso: { r: -3 * direction },
          [arm]: { r: -32 * direction, ty: -3 },
          [forearm]: { r: -28 * direction, ty: -5 },
          head: { r: -3 * direction, ty: -1 },
          ...(weaponBone ? { [weaponBone]: { r: -12 * direction, ty: -8 } } : {}),
        },
      },
      {
        t: 0.62,
        bones: {
          root: { ty: -7 },
          torso: { r: -6 * direction },
          [arm]: { r: -46 * direction, ty: -5 },
          [forearm]: { r: -42 * direction, ty: -8 },
          head: { r: -5 * direction, ty: -2 },
          ...(weaponBone ? { [weaponBone]: { r: -18 * direction, ty: -12 } } : {}),
        },
      },
      {
        t: 1,
        bones: {
          root: {},
          torso: {},
          [arm]: {},
          [forearm]: {},
          head: {},
          ...(weaponBone ? { [weaponBone]: {} } : {}),
        },
      },
    ],
  };
}

const PHASER_FIGHTER_DEFINITIONS: Record<PhaserFighterClassId, PhaserFighterDefinition> = {
  murmillo: {
    classId: "murmillo",
    svg: createMurmilloSvg(),
    bones: murmilloBones,
    frameWidth: 260,
    frameHeight: 360,
    displayWidth: 178,
    displayHeight: 256,
    originX: 0.5,
    originY: 1,
    animations: {
      idle: makeSpec("idle", createIdleClip("murmillo-idle"), {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
      walk: makeSpec("walk", murmilloWalk, {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
      swordSlash: makeSpec("swordSlash", murmilloSwordSlash),
      shieldBash: makeSpec("shieldBash", murmilloShieldBash),
      block: makeSpec("block", murmilloShieldBlock, { frameCount: REACTION_FRAME_COUNT }),
      dodge: makeSpec("dodge", murmilloHeavyDodge, { frameCount: REACTION_FRAME_COUNT }),
      hit: makeSpec("hit", createHitClip("murmillo-hit", 1), {
        frameCount: REACTION_FRAME_COUNT,
      }),
      defeat: makeSpec("defeat", createDefeatClip("murmillo-defeat", 1), {
        frameCount: ACTION_FRAME_COUNT,
      }),
      victory: makeSpec("victory", createVictoryClip("murmillo-victory", "right"), {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
    },
  },
  retiarius: {
    classId: "retiarius",
    svg: createRetiariusSvg(),
    bones: retiariusBones,
    frameWidth: 280,
    frameHeight: 360,
    displayWidth: 196,
    displayHeight: 256,
    originX: 0.5,
    originY: 1,
    animations: {
      idle: makeSpec("idle", createIdleClip("retiarius-idle", "net"), {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
      walk: makeSpec("walk", retiariusWalk, {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
      tridentThrust: makeSpec("tridentThrust", retiariusTridentThrust),
      netThrow: makeSpec("netThrow", retiariusNetThrow, { frameCount: LONG_ACTION_FRAME_COUNT }),
      block: makeSpec("block", retiariusTridentParry, { frameCount: REACTION_FRAME_COUNT }),
      dodge: makeSpec("dodge", retiariusQuickDodge, { frameCount: REACTION_FRAME_COUNT }),
      hit: makeSpec("hit", createHitClip("retiarius-hit", -1, "net"), {
        frameCount: REACTION_FRAME_COUNT,
      }),
      defeat: makeSpec("defeat", createDefeatClip("retiarius-defeat", -1, "net"), {
        frameCount: ACTION_FRAME_COUNT,
      }),
      victory: makeSpec("victory", createVictoryClip("retiarius-victory", "right", "net"), {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
    },
  },
  veles: {
    classId: "veles",
    svg: createVelesSvg(),
    bones: velesBones,
    frameWidth: 280,
    frameHeight: 360,
    displayWidth: 196,
    displayHeight: 256,
    originX: 0.5,
    originY: 1,
    animations: {
      idle: makeSpec("idle", createIdleClip("veles-idle", "javelin"), {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
      walk: makeSpec("walk", velesWalk, {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
      javelinThrow: makeSpec("javelinThrow", velesJavelinThrow, {
        frameCount: LONG_ACTION_FRAME_COUNT,
      }),
      shortSwordSlash: makeSpec("shortSwordSlash", velesShortSwordSlash),
      block: makeSpec("block", velesShortSwordBlock, { frameCount: REACTION_FRAME_COUNT }),
      dodge: makeSpec("dodge", velesQuickDodge, { frameCount: REACTION_FRAME_COUNT }),
      hit: makeSpec("hit", createHitClip("veles-hit", -1, "javelin"), {
        frameCount: REACTION_FRAME_COUNT,
      }),
      defeat: makeSpec("defeat", createDefeatClip("veles-defeat", -1, "javelin"), {
        frameCount: ACTION_FRAME_COUNT,
      }),
      victory: makeSpec("victory", createVictoryClip("veles-victory", "right", "javelin"), {
        frameCount: LOOP_FRAME_COUNT,
        repeat: true,
        sampleEndFrame: false,
      }),
    },
  },
};

const ATTACK_STATE_BY_CSS_CLASS: Record<string, PhaserFighterAnimationState> = {
  "attack-sword-slash": "swordSlash",
  "attack-shield-bash": "shieldBash",
  "attack-trident-thrust": "tridentThrust",
  "attack-net-throw": "netThrow",
  "attack-javelin-throw": "javelinThrow",
  "attack-veles-sword": "shortSwordSlash",
};

const DEFAULT_STRIKE_STATE_BY_CLASS: Record<PhaserFighterClassId, PhaserFighterAnimationState> = {
  murmillo: "swordSlash",
  retiarius: "tridentThrust",
  veles: "shortSwordSlash",
};

const VISUAL_VARIANTS_BY_CLASS: Record<PhaserFighterClassId, readonly PhaserFighterVisualVariant[]> = {
  murmillo: ["default"],
  retiarius: ["default", "netless"],
  veles: [
    "default",
    "javelins-2-throwing",
    "javelins-2-ready",
    "javelins-1-throwing",
    "javelins-1-ready",
    "javelins-0",
  ],
};

const HIDDEN_SELECTORS_BY_VARIANT: Record<PhaserFighterVisualVariant, readonly string[]> = {
  default: [],
  netless: ['[data-bone="net"]'],
  "javelins-2-throwing": ['[data-javelin-hand="true"]'],
  "javelins-2-ready": ['[data-javelin-reserve="3"]'],
  "javelins-1-throwing": ['[data-javelin-hand="true"]', '[data-javelin-reserve="3"]'],
  "javelins-1-ready": ['[data-javelin-reserve="2"]', '[data-javelin-reserve="3"]'],
  "javelins-0": [
    '[data-javelin-hand="true"]',
    '[data-javelin-reserve="2"]',
    '[data-javelin-reserve="3"]',
  ],
};

export function getPhaserFighterDefinition(
  classId: PhaserFighterClassId,
): PhaserFighterDefinition {
  return PHASER_FIGHTER_DEFINITIONS[classId];
}

export function getPhaserFighterDefinitions(): readonly PhaserFighterDefinition[] {
  return Object.values(PHASER_FIGHTER_DEFINITIONS);
}

export function getPhaserFighterAnimationKey(
  classId: PhaserFighterClassId,
  state: PhaserFighterAnimationState,
  variant: PhaserFighterVisualVariant = "default",
): string {
  return variant === "default"
    ? `fighter-${classId}-${state}`
    : `fighter-${classId}-${state}-${variant}`;
}

export function getPhaserFighterAnimationAssets(): readonly PhaserFighterAnimationAsset[] {
  return getPhaserFighterDefinitions().flatMap((definition) =>
    VISUAL_VARIANTS_BY_CLASS[definition.classId].flatMap((variant) =>
      Object.values(definition.animations).map((spec) => {
        const textureKey = getPhaserFighterAnimationKey(
          definition.classId,
          spec.state,
          variant,
        );

        return {
          classId: definition.classId,
          state: spec.state,
          textureKey,
          animationKey: textureKey,
          svg: definition.svg,
          bones: definition.bones,
          clip: spec.clip,
          frameWidth: definition.frameWidth,
          frameHeight: definition.frameHeight,
          frameCount: spec.frameCount,
          repeat: spec.repeat,
          sampleEndFrame: spec.sampleEndFrame,
          hiddenSelectors: HIDDEN_SELECTORS_BY_VARIANT[variant],
        };
      }),
    ),
  );
}

export function getPhaserFighterAnimationDuration(
  classId: PhaserFighterClassId,
  state: PhaserFighterAnimationState,
): number {
  return PHASER_FIGHTER_DEFINITIONS[classId].animations[state]?.clip.duration ?? 520;
}

export function getPhaserFighterAnimationFrameRate(asset: {
  readonly frameCount: number;
  readonly clip: AnimationClip;
}): number {
  const frameRate = Math.round((asset.frameCount * 1_000) / asset.clip.duration);

  return Math.min(
    PHASER_ANIMATION_MAX_FRAME_RATE,
    Math.max(PHASER_ANIMATION_MIN_FRAME_RATE, frameRate),
  );
}

export function getPhaserAttackAnimationState(
  classId: PhaserFighterClassId,
  actionType: BattleActionType,
  attackCssClass: string,
): PhaserFighterAnimationState {
  const mappedState = ATTACK_STATE_BY_CSS_CLASS[attackCssClass];

  if (mappedState && PHASER_FIGHTER_DEFINITIONS[classId].animations[mappedState]) {
    return mappedState;
  }

  if (actionType === "javelin") {
    return "javelinThrow";
  }

  if (actionType === "net") {
    return "netThrow";
  }

  return DEFAULT_STRIKE_STATE_BY_CLASS[classId];
}

export function getPhaserDefenseAnimationState(
  outcome: BattleOutcome,
): PhaserFighterAnimationState {
  if (outcome === "hit") {
    return "hit";
  }

  return outcome === "block" ? "block" : "dodge";
}

export function getPhaserFighterClassId(
  fighterId: string,
  fighterName: string,
): PhaserFighterClassId {
  if (fighterId === "murmillo" || fighterId === "retiarius" || fighterId === "veles") {
    return fighterId;
  }

  const normalizedName = fighterName.toLocaleLowerCase();

  if (normalizedName.includes("reti") || normalizedName.includes("\u0440\u0435\u0442")) {
    return "retiarius";
  }

  if (normalizedName.includes("vel") || normalizedName.includes("\u0432\u0435\u043b")) {
    return "veles";
  }

  return "murmillo";
}
