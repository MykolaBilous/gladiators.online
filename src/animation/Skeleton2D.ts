import type { AnimationClip, BoneDef, BonePose, Keyframe } from "./skeletonTypes";

export type { AnimationClip, BoneDef, BonePose, Keyframe } from "./skeletonTypes";

/**
 * Lightweight 2D skeleton system for SVG characters.
 * Each bone is an SVG <g data-bone="name"> element that rotates/translates
 * around a defined pivot point. Bones are nested for parent-child hierarchy.
 *
 * Designed to map 1:1 to Babylon.js TransformNodes later.
 */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function lerpPose(a: BonePose, b: BonePose, t: number): Required<BonePose> {
  return {
    r: lerp(a.r ?? 0, b.r ?? 0, t),
    tx: lerp(a.tx ?? 0, b.tx ?? 0, t),
    ty: lerp(a.ty ?? 0, b.ty ?? 0, t),
  };
}

export class Skeleton2D {
  private elements = new Map<string, SVGGElement>();
  private rafId = 0;
  private playing = false;
  private pendingResolve: (() => void) | null = null;

  constructor(svgRoot: SVGElement, bones: BoneDef[]) {
    for (const bone of bones) {
      const el = svgRoot.querySelector<SVGGElement>(
        `[data-bone="${bone.name}"]`,
      );
      if (el) {
        el.style.transformBox = "view-box";
        el.style.transformOrigin = `${bone.px}px ${bone.py}px`;
        this.elements.set(bone.name, el);
      }
    }
  }

  /** Play a clip once. Returns a promise that resolves when done. */
  play(clip: AnimationClip): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      const start = performance.now();
      this.playing = true;

      const tick = (now: number): void => {
        if (!this.playing) {
          return;
        }

        const t = Math.min((now - start) / clip.duration, 1);
        this.applyAtTime(clip.keyframes, t);

        if (t < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.playing = false;
          this.reset();
          this.pendingResolve = null;
          resolve();
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  /** Stop any running animation and reset to rest pose */
  stop(): void {
    this.playing = false;
    cancelAnimationFrame(this.rafId);
    this.reset();
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  dispose(): void {
    this.stop();
    this.elements.clear();
  }

  private applyAtTime(keyframes: Keyframe[], t: number): void {
    let a = keyframes[0]!;
    let b = keyframes[keyframes.length - 1]!;

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i]!.t && t <= keyframes[i + 1]!.t) {
        a = keyframes[i]!;
        b = keyframes[i + 1]!;
        break;
      }
    }

    const range = b.t - a.t;
    const localT = range > 0 ? easeInOut((t - a.t) / range) : 0;
    const names = new Set([...Object.keys(a.bones), ...Object.keys(b.bones)]);

    for (const name of names) {
      const pose = lerpPose(a.bones[name] ?? {}, b.bones[name] ?? {}, localT);
      const el = this.elements.get(name);
      if (el) {
        el.style.transform = `translate(${pose.tx}px, ${pose.ty}px) rotate(${pose.r}deg)`;
      }
    }
  }

  private reset(): void {
    for (const el of this.elements.values()) {
      el.style.transform = "";
    }
  }
}
