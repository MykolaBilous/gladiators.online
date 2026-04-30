export const PHASER_ARENA_TEXTURES = {
  sand: "arena-sand",
  wall: "arena-wall",
  fighters: {
    murmillo: "fighter-murmillo",
    retiarius: "fighter-retiarius",
    veles: "fighter-veles",
  },
} as const;

export type PhaserFighterClassId = keyof typeof PHASER_ARENA_TEXTURES.fighters;

export function createSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
