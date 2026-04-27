import type { Skeleton2D } from "../animation/Skeleton2D";
import type { BattleFighterRuntime } from "../combat/battleTypes";
import type { GladiatorClass } from "../gladiators/gladiatorTypes";

export type DefenseOutcome = "block" | "miss";
export type FloatingVariant = "hit" | "block" | "miss" | "net" | "interrupt";

export interface AttackPlayback {
  element: HTMLElement;
  svg: SVGElement | null;
  skeleton: Skeleton2D | undefined;
  animation: Promise<void>;
  durationMs: number;
}

export interface BattleResultStats {
  totalActions: number;
  combatActions: number;
  hits: number;
  criticals: number;
  blocks: number;
  misses: number;
  successfulNets: number;
  escapedNets: number;
  javelinHits: number;
  javelinBlocks: number;
  javelinDodges: number;
  damageByFighter: Record<string, number>;
  finalHpByFighter: Record<string, number>;
}

export interface RuntimeMetricDefinition {
  key: string;
  label: string;
  max: number;
  unit?: string;
  getValue: (fighter: BattleFighterRuntime) => number;
  getPreviewValue: (gladiator: GladiatorClass) => number;
}
