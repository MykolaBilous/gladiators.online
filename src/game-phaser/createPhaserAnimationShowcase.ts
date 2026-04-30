import * as Phaser from "phaser";
import type { PhaserFighterClassId } from "./arenaAssets";
import {
  getPhaserFighterAnimationAssets,
  getPhaserFighterAnimationFrameRate,
  getPhaserFighterAnimationKey,
  getPhaserFighterDefinitions,
  type PhaserFighterAnimationSpec,
  type PhaserFighterAnimationState,
  type PhaserFighterDefinition,
} from "./fighterAnimationCatalog";
import { registerPhaserFighterAnimationAssets } from "./svgSpriteSheet";

interface AnimationShowcaseGroup {
  readonly definition: PhaserFighterDefinition;
  readonly animations: readonly PhaserFighterAnimationSpec[];
}

interface ShowcaseButton {
  readonly setActive: (active: boolean) => void;
  readonly setEnabled: (enabled: boolean) => void;
}

interface AnimationPreview {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly loopAnimationKey: string;
  readonly playButton: ShowcaseButton;
  readonly pauseButton: ShowcaseButton;
  isPlaying: boolean;
}

const CLASS_LABELS: Record<PhaserFighterClassId, string> = {
  murmillo: "Murmillo",
  retiarius: "Retiarius",
  veles: "Veles",
};

const SHOWCASE_COLUMNS = 3;
const STAGE_PADDING_X = 28;
const STAGE_PADDING_Y = 28;
const CARD_WIDTH = 276;
const CARD_HEIGHT = 352;
const CARD_GAP = 22;
const SECTION_HEADER_HEIGHT = 58;
const SECTION_GAP = 46;

export const PHASER_ANIMATION_SHOWCASE_WIDTH =
  STAGE_PADDING_X * 2 + SHOWCASE_COLUMNS * CARD_WIDTH + (SHOWCASE_COLUMNS - 1) * CARD_GAP;

function getAnimationShowcaseGroups(): readonly AnimationShowcaseGroup[] {
  return getPhaserFighterDefinitions().map((definition) => ({
    definition,
    animations: Object.values(definition.animations).filter(
      (animation): animation is PhaserFighterAnimationSpec => Boolean(animation),
    ),
  }));
}

function getAnimationShowcaseHeight(groups: readonly AnimationShowcaseGroup[]): number {
  return (
    STAGE_PADDING_Y * 2 +
    groups.reduce((height, group, index) => {
      const rowCount = Math.ceil(group.animations.length / SHOWCASE_COLUMNS);
      const sectionHeight =
        SECTION_HEADER_HEIGHT +
        rowCount * CARD_HEIGHT +
        Math.max(0, rowCount - 1) * CARD_GAP;

      return height + sectionHeight + (index < groups.length - 1 ? SECTION_GAP : 0);
    }, 0)
  );
}

const ANIMATION_SHOWCASE_GROUPS = getAnimationShowcaseGroups();

export const PHASER_ANIMATION_SHOWCASE_HEIGHT = getAnimationShowcaseHeight(
  ANIMATION_SHOWCASE_GROUPS,
);

function getLoopAnimationKey(
  classId: PhaserFighterClassId,
  state: PhaserFighterAnimationState,
): string {
  return `${getPhaserFighterAnimationKey(classId, state)}-showcase-loop`;
}

export function createPhaserAnimationShowcase(container: HTMLElement): () => void {
  container.replaceChildren();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: PHASER_ANIMATION_SHOWCASE_WIDTH,
    height: PHASER_ANIMATION_SHOWCASE_HEIGHT,
    backgroundColor: "#0c1017",
    render: {
      antialias: true,
      roundPixels: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: PHASER_ANIMATION_SHOWCASE_WIDTH,
      height: PHASER_ANIMATION_SHOWCASE_HEIGHT,
    },
    audio: {
      noAudio: true,
    },
    scene: [new AnimationShowcaseScene()],
  });

  const resizeObserver = new ResizeObserver(() => game.scale.refresh());
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    game.destroy(true);
    container.replaceChildren();
  };
}

class AnimationShowcaseScene extends Phaser.Scene {
  private isDisposed = false;

  constructor() {
    super("animation-showcase");
  }

  create(): void {
    this.isDisposed = false;
    this.events.once("shutdown", () => {
      this.isDisposed = true;
    });
    this.events.once("destroy", () => {
      this.isDisposed = true;
    });

    this.cameras.main.setBackgroundColor("#0c1017");
    this.drawBackground();

    const loadingText = this.add
      .text(STAGE_PADDING_X, STAGE_PADDING_Y, "Loading animation catalog", {
        color: "#fff3c4",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: "18px",
        fontStyle: "900",
      })
      .setDepth(10);

    void this.prepareShowcase(loadingText);
  }

  private async prepareShowcase(loadingText: Phaser.GameObjects.Text): Promise<void> {
    try {
      await registerPhaserFighterAnimationAssets(this, {
        isCancelled: () => this.isDisposed,
      });

      if (this.isDisposed) {
        return;
      }

      this.registerLoopAnimations();
      loadingText.destroy();
      this.drawShowcase();
    } catch (error) {
      if (this.isDisposed) {
        return;
      }

      console.error(error);
      loadingText.setText("Could not load animation catalog");
      loadingText.setColor("#ff8c7d");
    }
  }

  private registerLoopAnimations(): void {
    for (const asset of getPhaserFighterAnimationAssets()) {
      const loopAnimationKey = getLoopAnimationKey(asset.classId, asset.state);

      if (this.anims.exists(loopAnimationKey)) {
        continue;
      }

      this.anims.create({
        key: loopAnimationKey,
        frames: this.anims.generateFrameNumbers(asset.textureKey, {
          start: 0,
          end: asset.frameCount - 1,
        }),
        frameRate: getPhaserFighterAnimationFrameRate(asset),
        repeat: -1,
      });
    }
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x0c1017, 1);
    graphics.fillRect(0, 0, PHASER_ANIMATION_SHOWCASE_WIDTH, PHASER_ANIMATION_SHOWCASE_HEIGHT);

    for (let y = 0; y < PHASER_ANIMATION_SHOWCASE_HEIGHT; y += 150) {
      graphics.lineStyle(1, 0xeef3f9, 0.035);
      graphics.lineBetween(0, y, PHASER_ANIMATION_SHOWCASE_WIDTH, y + 46);
    }
  }

  private drawShowcase(): void {
    let sectionY = STAGE_PADDING_Y;

    for (const group of ANIMATION_SHOWCASE_GROUPS) {
      this.drawSectionHeader(group, sectionY);
      sectionY += SECTION_HEADER_HEIGHT;

      group.animations.forEach((animation, index) => {
        const column = index % SHOWCASE_COLUMNS;
        const row = Math.floor(index / SHOWCASE_COLUMNS);
        const x = STAGE_PADDING_X + column * (CARD_WIDTH + CARD_GAP);
        const y = sectionY + row * (CARD_HEIGHT + CARD_GAP);

        this.createAnimationCard(group.definition, animation, x, y);
      });

      const rowCount = Math.ceil(group.animations.length / SHOWCASE_COLUMNS);
      sectionY += rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * CARD_GAP + SECTION_GAP;
    }
  }

  private drawSectionHeader(group: AnimationShowcaseGroup, y: number): void {
    const label = CLASS_LABELS[group.definition.classId];
    const countLabel = `${group.animations.length} animations`;

    this.add.text(STAGE_PADDING_X, y, label, {
      color: "#fff3c4",
      fontFamily: "Inter, Segoe UI, sans-serif",
      fontSize: "28px",
      fontStyle: "900",
    });

    this.add.text(STAGE_PADDING_X + 190, y + 10, countLabel, {
      color: "#badfd2",
      fontFamily: "Inter, Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "800",
    });

    const line = this.add.graphics();
    line.lineStyle(1, 0xeef3f9, 0.14);
    line.lineBetween(STAGE_PADDING_X, y + 44, PHASER_ANIMATION_SHOWCASE_WIDTH - STAGE_PADDING_X, y + 44);
  }

  private createAnimationCard(
    definition: PhaserFighterDefinition,
    animation: PhaserFighterAnimationSpec,
    x: number,
    y: number,
  ): void {
    const animationKey = getPhaserFighterAnimationKey(definition.classId, animation.state);
    const loopAnimationKey = getLoopAnimationKey(definition.classId, animation.state);
    const background = this.add.graphics();

    background.fillStyle(0x111820, 0.92);
    background.fillRoundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 8);
    background.lineStyle(1, 0xeef3f9, 0.13);
    background.strokeRoundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 8);
    background.fillStyle(0xf0c04a, 0.08);
    background.fillRoundedRect(x + 12, y + 12, CARD_WIDTH - 24, 222, 8);

    const shadow = this.add.ellipse(x + CARD_WIDTH / 2, y + 224, 134, 30, 0x000000, 0.28);
    const sprite = this.add
      .sprite(x + CARD_WIDTH / 2, y + 228, animationKey, 0)
      .setOrigin(definition.originX, definition.originY)
      .setDisplaySize(definition.displayWidth * 0.82, definition.displayHeight * 0.82);

    sprite.setDepth(2);
    shadow.setDepth(1);

    this.add
      .text(x + CARD_WIDTH / 2, y + 262, animation.state, {
        align: "center",
        color: "#eef3f9",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: "18px",
        fontStyle: "900",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(x + CARD_WIDTH / 2, y + 286, animationKey, {
        align: "center",
        color: "#8f9ba8",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: "11px",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);

    const preview: AnimationPreview = {
      sprite,
      loopAnimationKey,
      playButton: this.createButton(x + 18, y + 306, 112, 32, "Play", () => {
        this.playPreview(preview);
      }),
      pauseButton: this.createButton(x + CARD_WIDTH - 130, y + 306, 112, 32, "Pause", () => {
        this.pausePreview(preview);
      }),
      isPlaying: false,
    };

    this.updatePreviewButtons(preview);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ): ShowcaseButton {
    const container = this.add.container(x, y);
    const background = this.add.graphics();
    const hitZone = this.add
      .zone(width / 2, height / 2, width, height)
      .setOrigin(0.5, 0.5);
    const text = this.add
      .text(width / 2, height / 2, label, {
        align: "center",
        color: "#eef3f9",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: "13px",
        fontStyle: "900",
      })
      .setOrigin(0.5, 0.5);

    let isActive = false;
    let isEnabled = true;
    let isHovering = false;
    let isPressed = false;

    const draw = (): void => {
      background.clear();

      const fillColor = isActive
        ? 0xf0c04a
        : isPressed
          ? 0x283240
          : isHovering
            ? 0x202938
            : 0x151c27;
      const fillAlpha = isEnabled ? 1 : 0.52;
      const strokeColor = isActive ? 0xf0c04a : 0xeef3f9;
      const strokeAlpha = isEnabled ? (isActive ? 0.75 : 0.18) : 0.08;

      background.fillStyle(fillColor, fillAlpha);
      background.fillRoundedRect(0, 0, width, height, 8);
      background.lineStyle(1, strokeColor, strokeAlpha);
      background.strokeRoundedRect(0, 0, width, height, 8);
      text.setColor(isEnabled ? (isActive ? "#21150b" : "#eef3f9") : "#65707e");
    };

    draw();
    container.add([background, text, hitZone]);
    hitZone.setInteractive({ useHandCursor: true });

    hitZone.on("pointerover", () => {
      isHovering = true;
      draw();
    });
    hitZone.on("pointerout", () => {
      isHovering = false;
      isPressed = false;
      draw();
    });
    hitZone.on("pointerdown", () => {
      if (!isEnabled) {
        return;
      }

      isPressed = true;
      draw();
    });
    hitZone.on("pointerup", () => {
      if (!isEnabled) {
        return;
      }

      isPressed = false;
      draw();
      onClick();
    });

    return {
      setActive: (active: boolean): void => {
        isActive = active;
        draw();
      },
      setEnabled: (enabled: boolean): void => {
        isEnabled = enabled;
        draw();
      },
    };
  }

  private playPreview(preview: AnimationPreview): void {
    if (preview.sprite.anims.isPaused) {
      preview.sprite.anims.resume();
    } else {
      preview.sprite.play(preview.loopAnimationKey, true);
    }

    preview.isPlaying = true;
    this.updatePreviewButtons(preview);
  }

  private pausePreview(preview: AnimationPreview): void {
    preview.sprite.anims.pause();
    preview.isPlaying = false;
    this.updatePreviewButtons(preview);
  }

  private updatePreviewButtons(preview: AnimationPreview): void {
    preview.playButton.setActive(preview.isPlaying);
    preview.playButton.setEnabled(!preview.isPlaying);
    preview.pauseButton.setActive(false);
    preview.pauseButton.setEnabled(preview.isPlaying);
  }
}
