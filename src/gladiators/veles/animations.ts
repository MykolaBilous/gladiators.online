import type { AnimationClip } from "../../animation/skeletonTypes";

export const velesWalk: AnimationClip = {
  name: "veles-walk",
  duration: 720,
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
        javelin: {},
        head: {},
      },
    },
    {
      t: 0.25,
      bones: {
        root: { tx: 3, ty: -4 },
        torso: { r: 4 },
        "arm-l": { r: -8 },
        "forearm-l": { r: -5 },
        "arm-r": { r: 12 },
        "forearm-r": { r: 8 },
        javelin: { r: 4 },
        head: { r: 2, ty: -1 },
      },
    },
    {
      t: 0.5,
      bones: {
        root: { tx: 0, ty: 1 },
        torso: { r: -2 },
        "arm-l": { r: 8 },
        "forearm-l": { r: 5 },
        "arm-r": { r: -9 },
        "forearm-r": { r: -6 },
        javelin: { r: -3 },
        head: { r: -1 },
      },
    },
    {
      t: 0.75,
      bones: {
        root: { tx: -3, ty: -4 },
        torso: { r: -4 },
        "arm-l": { r: 11 },
        "forearm-l": { r: 7 },
        "arm-r": { r: -12 },
        "forearm-r": { r: -8 },
        javelin: { r: -5 },
        head: { r: -2, ty: -1 },
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
        javelin: {},
        head: {},
      },
    },
  ],
};

export const velesJavelinThrow: AnimationClip = {
  name: "javelin-throw",
  duration: 1_240,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-r": {},
        "forearm-r": {},
        javelin: {},
        head: {},
      },
    },
    {
      t: 0.2,
      bones: {
        root: { tx: 2, ty: -3 },
        torso: { r: 8 },
        "arm-r": { r: -28 },
        "forearm-r": { r: -38 },
        javelin: { r: -5, tx: -3, ty: -18 },
        head: { r: 4, tx: 1 },
      },
    },
    {
      t: 0.38,
      bones: {
        root: { tx: 4, ty: -5 },
        torso: { r: 11 },
        "arm-r": { r: -48 },
        "forearm-r": { r: -62 },
        javelin: { tx: -5, ty: -34, r: -10 },
        head: { r: 5, tx: 2, ty: -1 },
      },
    },
    {
      t: 0.56,
      bones: {
        root: { tx: -8, ty: 0 },
        torso: { r: -14 },
        "arm-r": { r: 20 },
        "forearm-r": { r: -18 },
        javelin: { tx: 24, ty: -44, r: -2 },
        head: { r: -6, tx: -3 },
      },
    },
    {
      t: 0.76,
      bones: {
        root: { tx: -5, ty: 2 },
        torso: { r: -6 },
        "arm-r": { r: 8 },
        "forearm-r": { r: -8 },
        javelin: { tx: 38, ty: -36, r: 0 },
        head: { r: -2 },
      },
    },
    {
      t: 1,
      bones: {
        root: {},
        torso: {},
        "arm-r": {},
        "forearm-r": {},
        javelin: {},
        head: {},
      },
    },
  ],
};

export const velesShortSwordSlash: AnimationClip = {
  name: "veles-short-sword-slash",
  duration: 600,
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
      t: 0.28,
      bones: {
        root: { tx: 4, ty: -1 },
        torso: { r: -8 },
        "arm-l": { r: -34 },
        "forearm-l": { r: -26 },
        head: { r: -3 },
      },
    },
    {
      t: 0.58,
      bones: {
        root: { tx: -12, ty: 3 },
        torso: { r: 13 },
        "arm-l": { r: 42 },
        "forearm-l": { r: 28 },
        head: { r: 5 },
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

export const velesShortSwordBlock: AnimationClip = {
  name: "veles-short-sword-block",
  duration: 540,
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
      t: 0.28,
      bones: {
        root: { tx: -4, ty: 1 },
        torso: { r: -4 },
        "arm-l": { r: 20 },
        "forearm-l": { r: 34 },
        "arm-r": { r: -8 },
        "forearm-r": { r: -5 },
        head: { r: -2, tx: -1 },
      },
    },
    {
      t: 0.58,
      bones: {
        root: { tx: -8, ty: 3 },
        torso: { r: -7 },
        "arm-l": { r: 34 },
        "forearm-l": { r: 52 },
        "arm-r": { r: -12 },
        "forearm-r": { r: -8 },
        head: { r: -5, tx: -3 },
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

export const velesQuickDodge: AnimationClip = {
  name: "veles-quick-dodge",
  duration: 540,
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
        javelin: {},
        head: {},
      },
    },
    {
      t: 0.18,
      bones: {
        root: { tx: -7, ty: -4 },
        torso: { r: -8 },
        "arm-l": { r: 10 },
        "forearm-l": { r: 7 },
        "arm-r": { r: -12 },
        "forearm-r": { r: -10 },
        javelin: { r: -6 },
        head: { r: -5, tx: -2 },
      },
    },
    {
      t: 0.48,
      bones: {
        root: { tx: -26, ty: 4 },
        torso: { r: -20 },
        "arm-l": { r: 22 },
        "forearm-l": { r: 14 },
        "arm-r": { r: -28 },
        "forearm-r": { r: -22 },
        javelin: { r: -12, tx: -8, ty: 2 },
        head: { r: -11, tx: -6, ty: 3 },
      },
    },
    {
      t: 0.76,
      bones: {
        root: { tx: -8, ty: 1 },
        torso: { r: -5 },
        "arm-l": { r: 8 },
        "forearm-l": { r: 5 },
        "arm-r": { r: -10 },
        "forearm-r": { r: -7 },
        javelin: { r: -4 },
        head: { r: -3 },
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
        javelin: {},
        head: {},
      },
    },
  ],
};

