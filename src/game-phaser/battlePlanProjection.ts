import type {
  BattleEvent,
  BattlePlan,
  BattlePoint,
  BattleTeamId,
} from "@gladiators/combat-sim";

export const PHASER_ARENA_WIDTH = 1440;
export const PHASER_ARENA_HEIGHT = 736;
export const PHASER_PLAYBACK_SCALE = 1;

const MIN_PROJECTED_X = 96;
const MAX_PROJECTED_X = 1344;
const MIN_PROJECTED_Y = 292;
const MAX_PROJECTED_Y = 642;
const MIN_FIGHTER_SCALE = 0.72;
const MAX_FIGHTER_SCALE = 1.12;

export interface ProjectedBattlePoint {
  x: number;
  y: number;
  scale: number;
  depth: number;
}

export interface ArenaFighterInfo {
  id: string;
  label: string;
  teamId: BattleTeamId;
  maxHp: number;
}

function lerp(from: number, to: number, value: number): number {
  return from + (to - from) * value;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function projectBattlePoint(point: BattlePoint): ProjectedBattlePoint {
  const x = clamp01(point.x);
  const y = clamp01(point.y);

  return {
    x: lerp(MIN_PROJECTED_X, MAX_PROJECTED_X, x),
    y: lerp(MIN_PROJECTED_Y, MAX_PROJECTED_Y, y),
    scale: lerp(MIN_FIGHTER_SCALE, MAX_FIGHTER_SCALE, y),
    depth: Math.round(100 + y * 1_000),
  };
}

export function selectArenaFighterIds(plan: BattlePlan): string[] {
  return orderFightersByTeam(Object.keys(plan.fighters), plan);
}

export function createArenaFighterInfos(
  plan: BattlePlan,
  fighterLabels: Record<string, string> = {},
): ArenaFighterInfo[] {
  return selectArenaFighterIds(plan).map((id) => {
    const fighter = plan.fighters[id];

    if (!fighter) {
      throw new Error(`Missing fighter runtime for ${id}`);
    }

    return {
      id,
      label: fighterLabels[id] ?? fighter.name,
      teamId: plan.teams[id] ?? "left",
      maxHp: fighter.maxHp,
    };
  });
}

export function getArenaBattleEvents(plan: BattlePlan, fighterIds: readonly string[]): BattleEvent[] {
  const selected = new Set(fighterIds);

  return plan.events.filter(
    (event) => selected.has(event.attackerId) && selected.has(event.defenderId),
  );
}

export function getScaledDuration(durationMs: number, minMs: number, maxMs: number): number {
  return Math.round(Math.min(Math.max(durationMs * PHASER_PLAYBACK_SCALE, minMs), maxMs));
}

export function formatArenaResult(
  plan: BattlePlan,
  fighterLabels: Record<string, string> = {},
): string {
  const winner = fighterLabels[plan.winnerId] ?? plan.fighters[plan.winnerId]?.name ?? plan.winnerId;
  const loser = fighterLabels[plan.loserId] ?? plan.fighters[plan.loserId]?.name ?? plan.loserId;

  return `${winner} defeats ${loser}`;
}

function orderFightersByTeam(fighterIds: readonly string[], plan: BattlePlan): string[] {
  return [...fighterIds].sort((left, right) => {
    const leftTeam = plan.teams[left] ?? "left";
    const rightTeam = plan.teams[right] ?? "right";

    if (leftTeam === rightTeam) {
      return left.localeCompare(right);
    }

    return leftTeam === "left" ? -1 : 1;
  });
}
