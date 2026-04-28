import type { AnimationClip } from "../../animation/skeletonTypes";

export const murmilloWalk: AnimationClip = {
  name: "murmillo-walk",
  duration: 860,
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
      },
    },
    {
      t: 0.25,
      bones: {
        root: { tx: 2, ty: -4 },
        torso: { r: -3 },
        "arm-l": { r: 8 },
        "forearm-l": { r: 5 },
        "arm-r": { r: -10 },
        "forearm-r": { r: -6 },
        head: { r: -2, ty: -1 },
      },
    },
    {
      t: 0.5,
      bones: {
        root: { tx: 0, ty: 1 },
        torso: { r: 2 },
        "arm-l": { r: -8 },
        "forearm-l": { r: -5 },
        "arm-r": { r: 8 },
        "forearm-r": { r: 5 },
        head: { r: 1 },
      },
    },
    {
      t: 0.75,
      bones: {
        root: { tx: -2, ty: -3 },
        torso: { r: 3 },
        "arm-l": { r: -12 },
        "forearm-l": { r: -8 },
        "arm-r": { r: 11 },
        "forearm-r": { r: 7 },
        head: { r: 2, ty: -1 },
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
      },
    },
  ],
};

export const murmilloSwordSlash: AnimationClip = {
  name: "sword-slash",
  duration: 660,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
    {
      t: 0.28,
      bones: {
        root: { tx: 3, ty: -2 },
        torso: { r: -6 },
        "arm-r": { r: -46 },
        "forearm-r": { r: -18 },
        head: { r: -3 },
      },
    },
    {
      t: 0.62,
      bones: {
        root: { tx: -10, ty: 3 },
        torso: { r: 12 },
        "arm-r": { r: 42 },
        "forearm-r": { r: 24 },
        head: { r: 5 },
      },
    },
    {
      t: 1,
      bones: {
        root: {},
        torso: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
  ],
};

export const murmilloShieldBash: AnimationClip = {
  name: "shield-bash",
  duration: 620,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-l": {},
        "forearm-l": {},
        head: {},
      },
    },
    {
      t: 0.25,
      bones: {
        root: { tx: 5, ty: -1 },
        torso: { r: 5 },
        "arm-l": { r: 12 },
        "forearm-l": { r: 6 },
        head: { r: 2 },
      },
    },
    {
      t: 0.55,
      bones: {
        root: { tx: -15, ty: 4 },
        torso: { r: -10 },
        "arm-l": { r: -30 },
        "forearm-l": { r: -16 },
        head: { r: -4 },
      },
    },
    {
      t: 1,
      bones: {
        root: {},
        torso: {},
        "arm-l": {},
        "forearm-l": {},
        head: {},
      },
    },
  ],
};

export const murmilloShieldBlock: AnimationClip = {
  name: "shield-block",
  duration: 560,
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
      },
    },
    {
      t: 0.24,
      bones: {
        root: { tx: -4, ty: 1 },
        torso: { r: -4 },
        "arm-l": { r: -12 },
        "forearm-l": { r: -7 },
        "arm-r": { r: 10 },
        "forearm-r": { r: 8 },
        head: { r: -3, tx: -2 },
      },
    },
    {
      t: 0.58,
      bones: {
        root: { tx: -9, ty: 3 },
        torso: { r: -8 },
        "arm-l": { r: -26 },
        "forearm-l": { r: -18 },
        "arm-r": { r: 20 },
        "forearm-r": { r: 14 },
        head: { r: -6, tx: -4, ty: 2 },
      },
    },
    {
      t: 0.78,
      bones: {
        root: { tx: -5, ty: 1 },
        torso: { r: -3 },
        "arm-l": { r: -15 },
        "forearm-l": { r: -9 },
        "arm-r": { r: 8 },
        "forearm-r": { r: 6 },
        head: { r: -2 },
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
      },
    },
  ],
};

export const murmilloHeavyDodge: AnimationClip = {
  name: "heavy-dodge",
  duration: 640,
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
      },
    },
    {
      t: 0.22,
      bones: {
        root: { tx: 6, ty: -2 },
        torso: { r: 6 },
        "arm-l": { r: 8 },
        "forearm-l": { r: 5 },
        "arm-r": { r: -10 },
        "forearm-r": { r: -8 },
        head: { r: 4, tx: 2 },
      },
    },
    {
      t: 0.54,
      bones: {
        root: { tx: 18, ty: 5 },
        torso: { r: 13 },
        "arm-l": { r: 18 },
        "forearm-l": { r: 12 },
        "arm-r": { r: -24 },
        "forearm-r": { r: -16 },
        head: { r: 8, tx: 5, ty: 3 },
      },
    },
    {
      t: 0.78,
      bones: {
        root: { tx: 7, ty: 1 },
        torso: { r: 4 },
        "arm-l": { r: 6 },
        "forearm-l": { r: 4 },
        "arm-r": { r: -8 },
        "forearm-r": { r: -5 },
        head: { r: 2 },
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
      },
    },
  ],
};

