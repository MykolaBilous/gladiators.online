import type { Color4 } from "@babylonjs/core/Maths/math.color";

export interface GameConfig {
  readonly canvasId: string;
  readonly gameName: string;
  readonly maxDevicePixelRatio: number;
  readonly clearColor: Color4;
}
