import type { Skeleton2D } from "../../animation/Skeleton2D";
import type { BattleEvent, BattlePlan, BattlePoint } from "@gladiators/combat-sim";
import type { DefenseOutcome, FloatingVariant } from "../gladiatorShowcaseTypes";
import type { BattleAudioController } from "./audio";
import type { BattleThrowablesController } from "./throwables";

export interface BattleEventPlaybackContext {
  battleAudio: BattleAudioController;
  disableNettedFighter: (fighterId: string) => void;
  appendLog: (event: BattleEvent) => void;
  getArenaSvg: (fighterId: string) => SVGElement | null;
  getFighterClassId: (fighterId: string) => string;
  getFighterElement: (fighterId: string) => HTMLElement | null;
  isEventBlockedByDefeat: (event: BattleEvent) => boolean;
  isRunActive: (runId: number) => boolean;
  javelinCounts: Map<string, number>;
  markFighterDefeated: (fighterId: string) => void;
  recordCrowdReaction: (event: BattleEvent) => void;
  setFighterArenaPosition: (fighterId: string, point: BattlePoint, durationMs?: number) => void;
  setHandJavelinCount: (fighterId: string, count: number, options?: { handReady?: boolean }) => void;
  setHandNetVisible: (fighterId: string, visible: boolean) => void;
  setHealth: (fighterId: string, hp: number, maxHp: number) => void;
  showFloatingText: (fighterId: string, text: string, variant: FloatingVariant) => void;
  skeletons: Map<string, Skeleton2D>;
  stopWalkLoop: (fighterId: string) => void;
  throwables: BattleThrowablesController;
  updateFatigueVisuals: (event: BattleEvent) => void;
  wait: (ms: number) => Promise<void>;
  walkTokens: Map<string, number>;
}

export interface BattleEventPlaybackController {
  playBattleEvent: (plan: BattlePlan, event: BattleEvent, runId: number) => Promise<void>;
}

export type PlayDefenseReaction = (fighterId: string, outcome: DefenseOutcome) => Promise<void>;
