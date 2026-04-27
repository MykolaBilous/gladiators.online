/** Per-bone transform for a single keyframe */
export interface BonePose {
  /** Rotation in degrees */
  r?: number;
  /** Translate X (px in viewBox coords) */
  tx?: number;
  /** Translate Y (px in viewBox coords) */
  ty?: number;
}

/** Bone definition - name + pivot point */
export interface BoneDef {
  name: string;
  /** Pivot X in SVG viewBox coordinates */
  px: number;
  /** Pivot Y in SVG viewBox coordinates */
  py: number;
}

/** A single keyframe in an animation clip */
export interface Keyframe {
  /** Normalized time 0..1 */
  t: number;
  /** Bone poses at this keyframe (only bones that change need to be listed) */
  bones: Record<string, BonePose>;
}

/** A complete animation clip */
export interface AnimationClip {
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Keyframes sorted by t ascending. Must include t=0 and t=1. */
  keyframes: Keyframe[];
}
