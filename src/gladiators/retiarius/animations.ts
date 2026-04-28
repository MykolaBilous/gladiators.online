import type { AnimationClip } from "../../animation/skeletonTypes";

export const retiariusWalk: AnimationClip = {
  name: "retiarius-walk",
  duration: 760,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-l": {},
        "forearm-l": {},
        net: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
    {
      t: 0.25,
      bones: {
        root: { tx: 3, ty: -5 },
        torso: { r: 4 },
        "arm-l": { r: -10 },
        "forearm-l": { r: -7 },
        net: { tx: -6, ty: -3, r: -7 },
        "arm-r": { r: 11 },
        "forearm-r": { r: 6 },
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
        net: { tx: 5, ty: 2, r: 6 },
        "arm-r": { r: -9 },
        "forearm-r": { r: -5 },
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
        net: { tx: 7, ty: -2, r: 8 },
        "arm-r": { r: -12 },
        "forearm-r": { r: -7 },
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
        net: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
  ],
};

export const retiariusTridentThrust: AnimationClip = {
  name: "trident-thrust",
  duration: 620,
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
      t: 0.25,
      bones: {
        root: { tx: 5, ty: -2 },
        torso: { r: 6 },
        "arm-r": { r: 14 },
        "forearm-r": { r: 8 },
        head: { r: 3 },
      },
    },
    {
      t: 0.55,
      bones: {
        root: { tx: -18, ty: 4 },
        torso: { r: -13 },
        "arm-r": { r: -36 },
        "forearm-r": { r: -14 },
        head: { r: -5 },
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

export const retiariusNetThrow: AnimationClip = {
  name: "net-throw",
  duration: 780,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-l": {},
        "forearm-l": {},
        net: {},
        head: {},
      },
    },
    {
      t: 0.25,
      bones: {
        root: { tx: 5, ty: -1 },
        torso: { r: 7 },
        "arm-l": { r: 28 },
        "forearm-l": { r: 14 },
        net: {},
        head: { r: 3 },
      },
    },
    {
      t: 0.5,
      bones: {
        root: { tx: -7, ty: 2 },
        torso: { r: -10 },
        "arm-l": { r: -34 },
        "forearm-l": { r: -14 },
        net: { tx: -70, ty: -26, r: -14 },
        head: { r: -5 },
      },
    },
    {
      t: 0.75,
      bones: {
        root: { tx: -2, ty: 2 },
        torso: { r: -4 },
        "arm-l": { r: -14 },
        "forearm-l": { r: -5 },
        net: { tx: -112, ty: 5, r: 5 },
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
        net: {},
        head: {},
      },
    },
  ],
};

export const retiariusTridentParry: AnimationClip = {
  name: "trident-parry",
  duration: 540,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-l": {},
        "forearm-l": {},
        net: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
    {
      t: 0.2,
      bones: {
        root: { tx: 4, ty: -1 },
        torso: { r: 5 },
        "arm-l": { r: -8 },
        "forearm-l": { r: -5 },
        net: { tx: 6, ty: -4, r: 8 },
        "arm-r": { r: 18 },
        "forearm-r": { r: 13 },
        head: { r: 3 },
      },
    },
    {
      t: 0.5,
      bones: {
        root: { tx: 10, ty: 1 },
        torso: { r: 12 },
        "arm-l": { r: -16 },
        "forearm-l": { r: -10 },
        net: { tx: 12, ty: -8, r: 16 },
        "arm-r": { r: 42 },
        "forearm-r": { r: 26 },
        head: { r: 7, tx: 2 },
      },
    },
    {
      t: 0.78,
      bones: {
        root: { tx: 4, ty: 0 },
        torso: { r: 4 },
        "arm-l": { r: -6 },
        "forearm-l": { r: -4 },
        net: { tx: 4, ty: -3, r: 6 },
        "arm-r": { r: 14 },
        "forearm-r": { r: 8 },
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
        net: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
  ],
};

export const retiariusQuickDodge: AnimationClip = {
  name: "quick-dodge",
  duration: 560,
  keyframes: [
    {
      t: 0,
      bones: {
        root: {},
        torso: {},
        "arm-l": {},
        "forearm-l": {},
        net: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
    {
      t: 0.16,
      bones: {
        root: { tx: -6, ty: -3 },
        torso: { r: -7 },
        "arm-l": { r: 10 },
        "forearm-l": { r: 6 },
        net: { tx: -8, ty: -5, r: -10 },
        "arm-r": { r: -12 },
        "forearm-r": { r: -8 },
        head: { r: -5, tx: -2 },
      },
    },
    {
      t: 0.48,
      bones: {
        root: { tx: -24, ty: 5 },
        torso: { r: -18 },
        "arm-l": { r: 24 },
        "forearm-l": { r: 14 },
        net: { tx: -24, ty: 6, r: -24 },
        "arm-r": { r: -28 },
        "forearm-r": { r: -18 },
        head: { r: -10, tx: -6, ty: 4 },
      },
    },
    {
      t: 0.76,
      bones: {
        root: { tx: -7, ty: 1 },
        torso: { r: -5 },
        "arm-l": { r: 8 },
        "forearm-l": { r: 5 },
        net: { tx: -8, ty: 1, r: -8 },
        "arm-r": { r: -10 },
        "forearm-r": { r: -6 },
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
        net: {},
        "arm-r": {},
        "forearm-r": {},
        head: {},
      },
    },
  ],
};

