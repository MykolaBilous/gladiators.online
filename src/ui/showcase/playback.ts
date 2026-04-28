import { metersToArenaDistance } from "../../config/arenaScale";
import type { BattlePoint } from "../../combat/battleTypes";

export const ACTION_MOTION_SCALE = 1.3;
export const DEFENSE_MOTION_SCALE = 1.24;
export const WALK_MOTION_SCALE = 1.18;
export const ATTACK_TRANSFORM_MS = 380;
export const NET_FLIGHT_MS = 820;
export const NET_DROP_MS = 520;
export const JAVELIN_FLIGHT_MS = 1_000;
export const JAVELIN_EXIT_MS = 460;
export const JAVELIN_DROP_MS = 440;
export const JAVELIN_RELEASE_MIN_FRACTION = 0.18;
export const JAVELIN_RELEASE_MAX_FRACTION = 0.46;
export const VELES_STARTING_JAVELINS = 3;
export const REACTION_SETTLE_MS = 320;
export const UI_MIN_MOVEMENT_DISTANCE = metersToArenaDistance(0.06);
export const CAMERA_SIDE_GUTTER_PX = 34;
export const CAMERA_VERTICAL_GUTTER = 0.12;
export const CAMERA_MIN_ZOOM = 0.76;
export const CAMERA_MAX_ZOOM = 1.15;
export const CAMERA_CLOSE_FREEZE_SPAN = 0.3;
export const CAMERA_FIT_TOLERANCE = 0.012;
export const CAMERA_POSITION_SMOOTHING_MS = 360;
export const CAMERA_ZOOM_SMOOTHING_MS = 520;
export const CAMERA_SETTLE_EPSILON_PX = 0.35;
export const CAMERA_SETTLE_EPSILON_ZOOM = 0.0012;
export interface ArenaCameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface ArenaCameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
export function formatDuration(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(1)} с`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getPointDistance(a: BattlePoint, b: BattlePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getArenaRenderMetrics(point: BattlePoint): {
  x: number;
  bottom: number;
  scale: number;
  z: number;
} {
  return {
    x: lerp(5, 95, point.x),
    bottom: lerp(48, 5, point.y),
    scale: lerp(0.58, 1.2, point.y),
    z: Math.round(20 + point.y * 60),
  };
}
