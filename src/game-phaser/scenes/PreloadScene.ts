import * as Phaser from "phaser";
import arenaSandUrl from "../../assets/textures/arena-sand.jpg?url";
import coliseumWallUrl from "../../assets/textures/coliseum-wall.jpg?url";
import { PHASER_ARENA_TEXTURES } from "../arenaAssets";
import { PHASER_SCENE_KEYS } from "../sceneKeys";
import { registerPhaserFighterAnimationAssets } from "../svgSpriteSheet";
import type { ArenaSceneData } from "../types";

export class PreloadScene extends Phaser.Scene {
  private arenaData: ArenaSceneData | null = null;
  private isCancelled = false;

  constructor() {
    super(PHASER_SCENE_KEYS.preload);
  }

  init(data: ArenaSceneData): void {
    this.arenaData = data;
    this.isCancelled = false;
  }

  preload(): void {
    this.arenaData?.onStatus?.({
      phase: "preload",
      message: "Preparing arena assets",
    });

    this.load.image(PHASER_ARENA_TEXTURES.sand, arenaSandUrl);
    this.load.image(PHASER_ARENA_TEXTURES.wall, coliseumWallUrl);
  }

  create(): void {
    if (!this.arenaData) {
      throw new Error("Missing Phaser arena data");
    }

    this.events.once("shutdown", () => {
      this.isCancelled = true;
    });
    this.events.once("destroy", () => {
      this.isCancelled = true;
    });

    void this.prepareFighterAnimations();
  }

  private async prepareFighterAnimations(): Promise<void> {
    if (!this.arenaData) {
      return;
    }

    this.arenaData.onStatus?.({
      phase: "preload",
      message: "Preparing fighter animations",
    });

    try {
      await registerPhaserFighterAnimationAssets(this, {
        isCancelled: () => this.isCancelled,
      });

      if (!this.isCancelled) {
        this.scene.start(PHASER_SCENE_KEYS.arena, this.arenaData);
      }
    } catch (error) {
      console.error(error);
      this.arenaData.onStatus?.({
        phase: "preload",
        message: "Could not prepare fighter animations",
      });
    }
  }
}
