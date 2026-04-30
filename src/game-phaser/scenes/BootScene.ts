import * as Phaser from "phaser";
import { PHASER_SCENE_KEYS } from "../sceneKeys";
import type { ArenaSceneData } from "../types";

export class BootScene extends Phaser.Scene {
  constructor(private readonly arenaData: ArenaSceneData) {
    super(PHASER_SCENE_KEYS.boot);
  }

  create(): void {
    this.arenaData.onStatus?.({
      phase: "boot",
      message: "Booting arena renderer",
    });
    this.scene.start(PHASER_SCENE_KEYS.preload, this.arenaData);
  }
}
