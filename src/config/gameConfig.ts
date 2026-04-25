import { Color4 } from "@babylonjs/core/Maths/math.color";

export interface GameConfig {
  readonly canvasId: string;
  readonly gameName: string;
  readonly maxDevicePixelRatio: number;
  readonly clearColor: Color4;
}

export const gameConfig: GameConfig = {
  canvasId: "game-canvas",
  gameName: "Gladiators Online",
  maxDevicePixelRatio: 2,
  clearColor: new Color4(0.047, 0.063, 0.09, 1),
};
