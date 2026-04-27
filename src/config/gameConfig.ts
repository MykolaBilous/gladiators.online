import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { GameConfig } from "./gameConfigTypes";

export type { GameConfig } from "./gameConfigTypes";

export const gameConfig: GameConfig = {
  canvasId: "game-canvas",
  gameName: "Gladiators Online",
  maxDevicePixelRatio: 2,
  clearColor: new Color4(0.047, 0.063, 0.09, 1),
};
