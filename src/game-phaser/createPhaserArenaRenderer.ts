import * as Phaser from "phaser";
import {
  PHASER_ARENA_HEIGHT,
  PHASER_ARENA_WIDTH,
} from "./battlePlanProjection";
import { BootScene } from "./scenes/BootScene";
import { ArenaScene } from "./scenes/ArenaScene";
import { PreloadScene } from "./scenes/PreloadScene";
import type { ArenaSceneData } from "./types";

export function createPhaserArenaRenderer(
  container: HTMLElement,
  arenaData: ArenaSceneData,
): () => void {
  container.replaceChildren();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: PHASER_ARENA_WIDTH,
    height: PHASER_ARENA_HEIGHT,
    backgroundColor: "#0c1017",
    render: {
      antialias: true,
      roundPixels: false,
    },
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: PHASER_ARENA_WIDTH,
      height: PHASER_ARENA_HEIGHT,
    },
    audio: {
      noAudio: true,
    },
    scene: [new BootScene(arenaData), PreloadScene, ArenaScene],
  });

  return () => {
    game.destroy(true);
    container.replaceChildren();
  };
}
