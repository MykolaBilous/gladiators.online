import * as Phaser from "phaser";
import type { AnimationClip, BoneDef, BonePose, Keyframe } from "../animation/skeletonTypes";
import {
  getPhaserFighterAnimationAssets,
  getPhaserFighterAnimationFrameRate,
} from "./fighterAnimationCatalog";

interface RegisterPhaserFighterAnimationAssetOptions {
  readonly isCancelled?: () => boolean;
}

const spriteSheetCanvasCache = new Map<string, Promise<HTMLCanvasElement>>();

interface SampledBonePose {
  readonly r: number;
  readonly tx: number;
  readonly ty: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function lerpPose(a: BonePose, b: BonePose, t: number): SampledBonePose {
  return {
    r: lerp(a.r ?? 0, b.r ?? 0, t),
    tx: lerp(a.tx ?? 0, b.tx ?? 0, t),
    ty: lerp(a.ty ?? 0, b.ty ?? 0, t),
  };
}

function findKeyframePair(keyframes: readonly Keyframe[], t: number): readonly [Keyframe, Keyframe] {
  let a = keyframes[0]!;
  let b = keyframes[keyframes.length - 1]!;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const current = keyframes[i]!;
    const next = keyframes[i + 1]!;

    if (t >= current.t && t <= next.t) {
      a = current;
      b = next;
      break;
    }
  }

  return [a, b];
}

function sampleClip(clip: AnimationClip, t: number): Record<string, SampledBonePose> {
  const [a, b] = findKeyframePair(clip.keyframes, t);
  const range = b.t - a.t;
  const localT = range > 0 ? easeInOut((t - a.t) / range) : 0;
  const names = new Set([...Object.keys(a.bones), ...Object.keys(b.bones)]);
  const poses: Record<string, SampledBonePose> = {};

  for (const name of names) {
    poses[name] = lerpPose(a.bones[name] ?? {}, b.bones[name] ?? {}, localT);
  }

  return poses;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function createBoneTransform(bone: BoneDef, pose: SampledBonePose): string {
  return [
    `translate(${formatNumber(bone.px)} ${formatNumber(bone.py)})`,
    `translate(${formatNumber(pose.tx)} ${formatNumber(pose.ty)})`,
    `rotate(${formatNumber(pose.r)})`,
    `translate(${formatNumber(-bone.px)} ${formatNumber(-bone.py)})`,
  ].join(" ");
}

function createSvgFrame(
  svg: string,
  bones: readonly BoneDef[],
  clip: AnimationClip,
  t: number,
  width: number,
  height: number,
  hiddenSelectors: readonly string[],
): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const parserError = root.querySelector("parsererror");

  if (parserError) {
    throw new Error(`Could not parse gladiator SVG for ${clip.name}`);
  }

  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));

  for (const selector of hiddenSelectors) {
    root.querySelectorAll(selector).forEach((element) => {
      element.setAttribute("display", "none");
      element.setAttribute("opacity", "0");
    });
  }

  const poses = sampleClip(clip, t);

  for (const bone of bones) {
    const pose = poses[bone.name];

    if (!pose || (pose.r === 0 && pose.tx === 0 && pose.ty === 0)) {
      continue;
    }

    const element = root.querySelector(`[data-bone="${bone.name}"]`);

    if (!element) {
      continue;
    }

    const baseTransform = element.getAttribute("transform");
    const poseTransform = createBoneTransform(bone, pose);
    element.setAttribute(
      "transform",
      baseTransform ? `${baseTransform} ${poseTransform}` : poseTransform,
    );
  }

  return new XMLSerializer().serializeToString(root);
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render generated gladiator SVG frame"));
    image.src = svgToDataUrl(svg);
  });
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function createSpriteSheetCanvas(asset: {
  readonly svg: string;
  readonly bones: readonly BoneDef[];
  readonly clip: AnimationClip;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly sampleEndFrame: boolean;
  readonly hiddenSelectors: readonly string[];
}): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create a 2D canvas for gladiator animation frames");
  }

  canvas.width = asset.frameWidth * asset.frameCount;
  canvas.height = asset.frameHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let frame = 0; frame < asset.frameCount; frame++) {
    const denominator = asset.sampleEndFrame
      ? Math.max(1, asset.frameCount - 1)
      : asset.frameCount;
    const t = frame / denominator;
    const svgFrame = createSvgFrame(
      asset.svg,
      asset.bones,
      asset.clip,
      t,
      asset.frameWidth,
      asset.frameHeight,
      asset.hiddenSelectors,
    );
    const image = await loadSvgImage(svgFrame);

    context.drawImage(
      image,
      frame * asset.frameWidth,
      0,
      asset.frameWidth,
      asset.frameHeight,
    );

    if ((frame + 1) % 4 === 0 && frame < asset.frameCount - 1) {
      await yieldToBrowser();
    }
  }

  return canvas;
}

function getSpriteSheetCanvasCacheKey(asset: {
  readonly textureKey: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly clip: AnimationClip;
}): string {
  return [
    asset.textureKey,
    asset.frameWidth,
    asset.frameHeight,
    asset.frameCount,
    asset.clip.duration,
  ].join(":");
}

function getCachedSpriteSheetCanvas(asset: {
  readonly textureKey: string;
  readonly svg: string;
  readonly bones: readonly BoneDef[];
  readonly clip: AnimationClip;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly sampleEndFrame: boolean;
  readonly hiddenSelectors: readonly string[];
}): Promise<HTMLCanvasElement> {
  const cacheKey = getSpriteSheetCanvasCacheKey(asset);
  let canvasPromise = spriteSheetCanvasCache.get(cacheKey);

  if (!canvasPromise) {
    canvasPromise = createSpriteSheetCanvas(asset).catch((error: unknown) => {
      spriteSheetCanvasCache.delete(cacheKey);
      throw error;
    });
    spriteSheetCanvasCache.set(cacheKey, canvasPromise);
  }

  return canvasPromise;
}

export async function registerPhaserFighterAnimationAssets(
  scene: Phaser.Scene,
  options: RegisterPhaserFighterAnimationAssetOptions = {},
): Promise<void> {
  for (const asset of getPhaserFighterAnimationAssets()) {
    if (options.isCancelled?.()) {
      return;
    }

    if (!scene.textures.exists(asset.textureKey)) {
      const canvas = await getCachedSpriteSheetCanvas(asset);

      if (options.isCancelled?.()) {
        return;
      }

      scene.textures.addSpriteSheet(
        asset.textureKey,
        canvas as unknown as HTMLImageElement,
        {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
          endFrame: asset.frameCount - 1,
        },
      );
    }

    if (options.isCancelled?.()) {
      return;
    }

    if (!scene.anims.exists(asset.animationKey)) {
      scene.anims.create({
        key: asset.animationKey,
        frames: scene.anims.generateFrameNumbers(asset.textureKey, {
          start: 0,
          end: asset.frameCount - 1,
        }),
        frameRate: getPhaserFighterAnimationFrameRate(asset),
        repeat: asset.repeat ? -1 : 0,
      });
    }
  }
}
