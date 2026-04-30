import type { BattlePlan } from "@gladiators/combat-sim";

export type PhaserArenaPhase = "boot" | "preload" | "ready" | "playing" | "complete";

export interface PhaserArenaStatus {
  phase: PhaserArenaPhase;
  message: string;
  winnerId?: string;
}

export interface PhaserArenaHealthChange {
  fighterId: string;
  hp: number;
  maxHp: number;
}

export interface PhaserArenaControls {
  startPlayback: () => void;
}

export interface ArenaSceneData {
  battlePlan: BattlePlan;
  fighterLabels?: Record<string, string>;
  autoPlay?: boolean;
  onControlsReady?: (controls: PhaserArenaControls) => void;
  onHealthChange?: (change: PhaserArenaHealthChange) => void;
  onStatus?: (status: PhaserArenaStatus) => void;
}
