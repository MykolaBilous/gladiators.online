import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Color4 } from "@babylonjs/core/Maths/math.color";
import type { GameConfig } from "../config/gameConfigTypes";

export interface CreateBootSceneOptions {
  readonly engine: Engine;
  readonly canvas: HTMLCanvasElement;
  readonly clearColor: Color4;
}

export interface GameClientOptions {
  readonly canvas: HTMLCanvasElement;
  readonly config: GameConfig;
  readonly onStatusChange?: (message: string) => void;
}
