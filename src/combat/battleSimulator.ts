import type { GladiatorAttack, GladiatorClass } from "../gladiators/gladiatorTypes";
import {
  ARENA_STANDARD_STEP_DISTANCE,
  createArenaReach,
  metersToArenaDistance,
} from "../config/arenaScale";
import type {
  BattleActionType,
  BattleDecisionSnapshot,
  BattleEvent,
  BattleFatigueSnapshot,
  BattleFighterRuntime,
  BattleMovement,
  BattleNetTrap,
  BattleOutcome,
  BattlePlan,
  BattlePoint,
  BattleTactic,
  BattleTeamId,
} from "./battleTypes";
import type {
  AttackReach,
  FighterBrain,
  FighterEnergyState,
  FighterMotionState,
  FighterTrapState,
  PlannedAction,
  TimedBattleAction,
} from "./battleSimulatorTypes";

export type {
  BattleActionType,
  BattleCounterAttack,
  BattleDecisionSnapshot,
  BattleEvent,
  BattleFatigueSnapshot,
  BattleFighterRuntime,
  BattleMovement,
  BattleNetTrap,
  BattleOutcome,
  BattlePlan,
  BattlePoint,
  BattleTactic,
  BattleTeamId,
} from "./battleTypes";

const NET_ATTACK_CSS_CLASS = "attack-net-throw";
const JAVELIN_ATTACK_CSS_CLASS = "attack-javelin-throw";
const VELES_CLASS_ID = "veles";
const SHIELD_CLASS_IDS = new Set(["murmillo"]);
const JAVELIN_STARTING_COUNT = 3;
const DEFAULT_STRIKE_REACH = createArenaReach(1);
const DEFAULT_NET_REACH = createArenaReach(2);
const DEFAULT_JAVELIN_REACH = {
  min: 0,
  preferred: metersToArenaDistance(6),
  max: 2,
};
const MAX_REACH_DISTANCE = 2;
const MIN_REACH_WIDTH = metersToArenaDistance(0.08);
const REACH_TOLERANCE = 0;
const MIN_MOVEMENT_DISTANCE = metersToArenaDistance(0.06);
const HOME_SIDE_SEPARATION = metersToArenaDistance(0.25);
const LATERAL_ALIGNMENT_DISTANCE = metersToArenaDistance(0.1);
const JAVELIN_ALIGNMENT_DISTANCE = metersToArenaDistance(0.7);
const JAVELIN_SAFE_DISTANCE = metersToArenaDistance(2.45);
const MIN_STEADY_STEP = metersToArenaDistance(0.4);
const MAX_STEADY_STEP = metersToArenaDistance(0.75);
const STEP_DURATION_MS = 360;
const MOVEMENT_ENERGY_PER_STEP = 3.4;
const ARENA_MIN_X = 0.04;
const ARENA_MAX_X = 0.96;
const ARENA_MIN_Y = 0.08;
const ARENA_MAX_Y = 0.97;

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const clonePoint = (point: BattlePoint): BattlePoint => ({ x: point.x, y: point.y });

const getDistance = (a: BattlePoint, b: BattlePoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

function getGladiatorClassId(gladiator: GladiatorClass): string {
  return (gladiator as GladiatorClass & { classId?: string }).classId ?? gladiator.id;
}

function isVelesGladiator(gladiator: GladiatorClass): boolean {
  return getGladiatorClassId(gladiator) === VELES_CLASS_ID;
}

function canShieldBlockProjectiles(gladiator: GladiatorClass): boolean {
  return SHIELD_CLASS_IDS.has(getGladiatorClassId(gladiator));
}

function isProjectileAttack(attack: GladiatorAttack): boolean {
  return attack.cssClass === NET_ATTACK_CSS_CLASS || attack.cssClass === JAVELIN_ATTACK_CSS_CLASS;
}

function getActionResolutionTimeMs(action: TimedBattleAction): number {
  const impactDelay =
    action.actionType === "strike" || action.actionType === "net" || action.actionType === "javelin"
      ? action.impactDelayMs
      : 0;

  return action.timeMs + action.movement.durationMs + impactDelay;
}

function compareActionResolution(a: TimedBattleAction, b: TimedBattleAction): number {
  return getActionResolutionTimeMs(a) - getActionResolutionTimeMs(b) || a.index - b.index;
}

function normalizeReach(reach: AttackReach): AttackReach {
  const max = clamp(Math.max(reach.preferred, reach.max), MIN_REACH_WIDTH, MAX_REACH_DISTANCE);
  const min = clamp(Math.min(reach.min, max), 0, max);

  return {
    min,
    max,
    preferred: clamp(reach.preferred, Math.max(min, MIN_REACH_WIDTH), max),
  };
}

function isDistanceInReach(distance: number, reach: AttackReach): boolean {
  const normalized = normalizeReach(reach);

  return (
    distance >= normalized.min - REACH_TOLERANCE &&
    distance <= normalized.max + REACH_TOLERANCE
  );
}

function getReachGap(distance: number, reach: AttackReach): number {
  const normalized = normalizeReach(reach);

  if (distance > normalized.max) {
    return distance - normalized.max;
  }

  if (distance < normalized.min) {
    return normalized.min - distance;
  }

  return 0;
}

function canCloseToReach(distance: number, reach: AttackReach, stepDistance: number): boolean {
  return distance <= normalizeReach(reach).max + stepDistance;
}

function chooseReachDistance(reach: AttackReach, tactic: BattleTactic): number {
  const normalized = normalizeReach(reach);
  const closeButUsable = Math.max(normalized.min, normalized.preferred * 0.62);
  const strongLower = Math.max(closeButUsable, normalized.preferred * 0.84);

  if (tactic === "press") {
    return randomBetween(closeButUsable, normalized.preferred);
  }

  if (tactic === "counter") {
    return randomBetween(strongLower, normalized.max);
  }

  return randomBetween(strongLower, normalized.preferred);
}

function getReachEnvelope(attacks: readonly GladiatorAttack[]): AttackReach {
  if (attacks.length === 0) {
    return DEFAULT_STRIKE_REACH;
  }

  const normalized = attacks.map((attack) => normalizeReach(attack.reach));
  const min = Math.min(...normalized.map((reach) => reach.min));
  const max = Math.max(...normalized.map((reach) => reach.max));
  const preferred = normalized.reduce((sum, reach) => sum + reach.preferred, 0) / normalized.length;

  return {
    min,
    max,
    preferred: clamp(preferred, min, max),
  };
}

function getDefaultReach(actionType: BattleActionType): AttackReach {
  if (actionType === "net") {
    return DEFAULT_NET_REACH;
  }

  if (actionType === "javelin") {
    return DEFAULT_JAVELIN_REACH;
  }

  return DEFAULT_STRIKE_REACH;
}

function clampPoint(point: BattlePoint): BattlePoint {
  return {
    x: clamp(point.x, ARENA_MIN_X, ARENA_MAX_X),
    y: clamp(point.y, ARENA_MIN_Y, ARENA_MAX_Y),
  };
}

function createStartPositions(
  gladiators: readonly GladiatorClass[],
  teams: Record<string, BattleTeamId>,
  requestedStartPositions?: Record<string, BattlePoint>,
): Record<string, BattlePoint> {
  const leftMembers = gladiators.filter((gladiator) => teams[gladiator.id] === "left");
  const rightMembers = gladiators.filter((gladiator) => teams[gladiator.id] === "right");
  const applyRequestedPositions = (
    positions: Record<string, BattlePoint>,
  ): Record<string, BattlePoint> => {
    if (!requestedStartPositions) {
      return positions;
    }

    const next = { ...positions };
    for (const gladiator of gladiators) {
      const requested = requestedStartPositions[gladiator.id];
      if (requested) {
        next[gladiator.id] = clampPoint(requested);
      }
    }

    return next;
  };

  if (leftMembers.length === 1 && rightMembers.length === 1) {
    const left = leftMembers[0]!;
    const right = rightMembers[0]!;

    return applyRequestedPositions({
      [left.id]: { x: 0.24, y: 0.74 },
      [right.id]: { x: 0.76, y: 0.42 },
    });
  }

  const positions: Record<string, BattlePoint> = {};

  const placeTeam = (members: readonly GladiatorClass[], baseX: number): void => {
    if (members.length === 0) {
      return;
    }

    if (members.length === 1) {
      positions[members[0]!.id] = clampPoint({ x: baseX, y: 0.58 });
      return;
    }

    const minY = 0.26;
    const maxY = 0.9;

    members.forEach((gladiator, index) => {
      const t = index / (members.length - 1);
      const lateralWobble = (index % 2 === 0 ? -1 : 1) * 0.07;

      positions[gladiator.id] = clampPoint({
        x: baseX + lateralWobble,
        y: minY + t * (maxY - minY),
      });
    });
  };

  placeTeam(leftMembers, 0.24);
  placeTeam(rightMembers, 0.76);

  return applyRequestedPositions(positions);
}

function getSideSign(teams: Record<string, BattleTeamId>, attackerId: string): number {
  return teams[attackerId] === "left" ? -1 : 1;
}

function getSteadyStepDistance(
  fighter: BattleFighterRuntime,
  actionType: BattleActionType,
  rush: boolean,
): number {
  const dexterityRatio = clamp((fighter.dexterity - 35) / 75, 0, 1);
  const baseStep = ARENA_STANDARD_STEP_DISTANCE * (0.92 + dexterityRatio * 0.16);
  const actionFactor =
    actionType === "recover"
      ? 0.86
      : actionType === "net"
        ? 0.96
        : actionType === "javelin"
          ? 0.92
          : actionType === "strike"
            ? 1.04
            : 1;
  const rushFactor = rush ? 1.28 : 1;

  return clamp(baseStep * actionFactor * rushFactor, MIN_STEADY_STEP, MAX_STEADY_STEP);
}

function limitPointToSteadyStep(
  from: BattlePoint,
  to: BattlePoint,
  stepDistance: number,
): BattlePoint {
  const distance = getDistance(from, to);

  if (distance <= stepDistance || distance <= 0.001) {
    return to;
  }

  const progress = stepDistance / distance;

  return clampPoint({
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  });
}

function keepPointOnHomeSide(
  teams: Record<string, BattleTeamId>,
  fighterId: string,
  point: BattlePoint,
  targetPoint: BattlePoint,
): BattlePoint {
  const side = getSideSign(teams, fighterId);
  const minSideOffset = HOME_SIDE_SEPARATION;
  const sideOffset = (point.x - targetPoint.x) * side;

  if (sideOffset >= minSideOffset) {
    return point;
  }

  return clampPoint({
    ...point,
    x: targetPoint.x + side * Math.max(minSideOffset, Math.abs(point.x - targetPoint.x)),
  });
}

function interpolatePoint(from: BattlePoint, to: BattlePoint, progress: number): BattlePoint {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function getMotionPosition(motion: FighterMotionState, timeMs: number): BattlePoint {
  if (timeMs <= motion.startMs) {
    return clonePoint(motion.from);
  }

  if (timeMs >= motion.endMs || motion.endMs <= motion.startMs) {
    return clonePoint(motion.to);
  }

  return interpolatePoint(
    motion.from,
    motion.to,
    clamp((timeMs - motion.startMs) / (motion.endMs - motion.startMs), 0, 1),
  );
}

function createMotionStates(
  fighterIds: readonly string[],
  startPositions: Record<string, BattlePoint>,
): Map<string, FighterMotionState> {
  return new Map(
    fighterIds.map((fighterId) => {
      const position = clonePoint(startPositions[fighterId] ?? { x: 0.5, y: 0.58 });

      return [
        fighterId,
        {
          from: position,
          to: clonePoint(position),
          startMs: 0,
          endMs: 0,
        },
      ];
    }),
  );
}

function getFighterPosition(
  motions: Map<string, FighterMotionState>,
  fighterId: string,
  timeMs: number,
): BattlePoint {
  const motion = motions.get(fighterId);

  if (!motion) {
    throw new Error(`Missing motion state for fighter: ${fighterId}`);
  }

  return getMotionPosition(motion, timeMs);
}

function createAttackerPointNearTarget(
  teams: Record<string, BattleTeamId>,
  attackerId: string,
  attackerFrom: BattlePoint,
  targetPoint: BattlePoint,
  actionType: BattleActionType,
  tactic: BattleTactic,
  reach = getDefaultReach(actionType),
): BattlePoint {
  const normalizedReach = normalizeReach(reach);
  const homeSign = getSideSign(teams, attackerId);
  const currentSideSign =
    Math.abs(attackerFrom.x - targetPoint.x) > LATERAL_ALIGNMENT_DISTANCE
      ? attackerFrom.x < targetPoint.x
        ? -1
        : 1
      : homeSign;
  const sign = currentSideSign === homeSign ? currentSideSign : homeSign;
  const distance = chooseReachDistance(normalizedReach, tactic);
  const maxLateralDrift = Math.min(
    distance * 0.34,
    (normalizedReach.max - normalizedReach.min) * 0.55 + LATERAL_ALIGNMENT_DISTANCE,
  );
  const lateralDrift =
    tactic === "press"
      ? randomBetween(-maxLateralDrift * 0.42, maxLateralDrift * 0.42)
      : tactic === "counter"
        ? randomBetween(-maxLateralDrift, maxLateralDrift)
        : randomBetween(-maxLateralDrift * 0.68, maxLateralDrift * 0.68);
  const signs = [sign];
  const lateralOptions = [lateralDrift, -lateralDrift, 0];
  let bestPoint: BattlePoint | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const side of signs) {
    for (const lateral of lateralOptions) {
      const forward = Math.sqrt(Math.max(0, distance * distance - lateral * lateral));
      const point = clampPoint({
        x: targetPoint.x + side * forward,
        y: targetPoint.y + lateral,
      });
      const pointDistance = getDistance(point, targetPoint);
      const reachGap = getReachGap(pointDistance, normalizedReach);
      const score =
        reachGap * 8 +
        Math.abs(pointDistance - distance) +
        (side === sign ? 0 : metersToArenaDistance(0.18)) +
        (lateral === lateralDrift ? 0 : metersToArenaDistance(0.07));

      if (score < bestScore) {
        bestPoint = point;
        bestScore = score;
      }
    }
  }

  if (bestPoint && isDistanceInReach(getDistance(bestPoint, targetPoint), normalizedReach)) {
    return bestPoint;
  }

  const fallbackDirection = bestPoint
    ? {
        x: bestPoint.x - targetPoint.x,
        y: bestPoint.y - targetPoint.y,
      }
    : { x: sign, y: 0 };
  const fallbackDistance = Math.hypot(fallbackDirection.x, fallbackDirection.y);
  const direction =
    fallbackDistance > 0.001
      ? { x: fallbackDirection.x / fallbackDistance, y: fallbackDirection.y / fallbackDistance }
      : { x: sign, y: 0 };

  return keepPointOnHomeSide(
    teams,
    attackerId,
    clampPoint({
      x: targetPoint.x + direction.x * distance,
      y: targetPoint.y + direction.y * distance,
    }),
    targetPoint,
  );
}

function createIndependentMovePoint(
  teams: Record<string, BattleTeamId>,
  fighterId: string,
  fighterFrom: BattlePoint,
  targetPoint: BattlePoint,
  tactic: BattleTactic,
  recovering: boolean,
  intendedReach?: AttackReach,
): BattlePoint {
  if (tactic === "press" && !recovering) {
    return createAttackerPointNearTarget(
      teams,
      fighterId,
      fighterFrom,
      targetPoint,
      "strike",
      tactic,
      intendedReach,
    );
  }

  const fallbackSign = getSideSign(teams, fighterId);
  const dx = fighterFrom.x - targetPoint.x;
  const dy = fighterFrom.y - targetPoint.y;
  const distance = Math.hypot(dx, dy);
  const direction =
    distance > 0.001
      ? { x: dx / distance, y: dy / distance }
      : { x: fallbackSign, y: randomBetween(-metersToArenaDistance(1), metersToArenaDistance(1)) };
  const desiredDistance = recovering
    ? randomBetween(metersToArenaDistance(2.1), metersToArenaDistance(2.9))
    : intendedReach
      ? chooseReachDistance(intendedReach, tactic)
      : tactic === "counter"
        ? randomBetween(metersToArenaDistance(1.75), metersToArenaDistance(2.5))
        : randomBetween(metersToArenaDistance(1.25), metersToArenaDistance(1.9));
  const tangent = { x: -direction.y, y: direction.x };
  const circleLimit =
    intendedReach && !recovering
      ? Math.min(
          metersToArenaDistance(0.42),
          Math.max(MIN_MOVEMENT_DISTANCE, (normalizeReach(intendedReach).max - desiredDistance) * 0.55),
        )
      : metersToArenaDistance(0.7);
  const circleStep = recovering
    ? randomBetween(-metersToArenaDistance(0.35), metersToArenaDistance(0.35))
    : randomBetween(-circleLimit, circleLimit);
  let next = keepPointOnHomeSide(
    teams,
    fighterId,
    clampPoint({
      x: targetPoint.x + direction.x * desiredDistance + tangent.x * circleStep,
      y: targetPoint.y + direction.y * desiredDistance + tangent.y * circleStep,
    }),
    targetPoint,
  );

  if (getDistance(fighterFrom, next) < metersToArenaDistance(0.25) && (!intendedReach || recovering)) {
    next = keepPointOnHomeSide(
      teams,
      fighterId,
      clampPoint({
        x:
          next.x +
          tangent.x * randomBetween(metersToArenaDistance(0.35), metersToArenaDistance(0.7)) +
          direction.x * randomBetween(-metersToArenaDistance(0.2), metersToArenaDistance(0.2)),
        y:
          next.y +
          tangent.y * randomBetween(metersToArenaDistance(0.35), metersToArenaDistance(0.7)) +
          direction.y * randomBetween(-metersToArenaDistance(0.2), metersToArenaDistance(0.2)),
      }),
      targetPoint,
    );
  }

  return next;
}

function estimateMoveDuration(
  distance: number,
  fighter: BattleFighterRuntime,
  rush: boolean,
): number {
  if (distance < MIN_MOVEMENT_DISTANCE) {
    return 0;
  }

  const speedFactor = clamp(82 / fighter.mobility, 0.62, 1.76);
  const enduranceFactor = clamp(
    1.12 - fighter.endurance / 360 - (fighter.stamina - 1) * 0.16,
    0.78,
    1.18,
  );
  const rushFactor = rush ? 0.84 : 1;

  return (
    460 +
    (distance / ARENA_STANDARD_STEP_DISTANCE) *
      STEP_DURATION_MS *
      speedFactor *
      enduranceFactor *
      rushFactor
  );
}

function createMovement(
  teams: Record<string, BattleTeamId>,
  attackerId: string,
  defenderId: string,
  actionType: BattleActionType,
  fighters: Record<string, BattleFighterRuntime>,
  motions: Map<string, FighterMotionState>,
  timeMs: number,
  rush: boolean,
  attackerTactic: BattleTactic,
  intendedReach?: AttackReach,
): BattleMovement {
  const attackerFrom = getFighterPosition(motions, attackerId, timeMs);
  const defenderFrom = getFighterPosition(motions, defenderId, timeMs);

  if (actionType === "javelin") {
    motions.set(attackerId, {
      from: clonePoint(attackerFrom),
      to: clonePoint(attackerFrom),
      startMs: timeMs,
      endMs: timeMs,
    });

    return {
      attackerFrom,
      defenderFrom,
      attackerTo: attackerFrom,
      defenderTo: defenderFrom,
      durationMs: 0,
      attackerDurationMs: 0,
      defenderDurationMs: 0,
      rush: false,
      defenderRush: false,
      distance: getDistance(attackerFrom, defenderFrom),
    };
  }

  const attacker = getRuntime(fighters, attackerId);
  const plannedAttackerTo =
    actionType === "move" || actionType === "recover"
      ? createIndependentMovePoint(
          teams,
          attackerId,
          attackerFrom,
          defenderFrom,
          attackerTactic,
          actionType === "recover",
          intendedReach,
        )
      : createAttackerPointNearTarget(
          teams,
          attackerId,
          attackerFrom,
          defenderFrom,
          actionType,
          attackerTactic,
          intendedReach,
        );
  const attackerTo = limitPointToSteadyStep(
    attackerFrom,
    plannedAttackerTo,
    getSteadyStepDistance(attacker, actionType, rush),
  );
  const attackerDistance = getDistance(attackerFrom, attackerTo);
  const attackerDuration = estimateMoveDuration(attackerDistance, attacker, rush);
  const maxDuration =
    actionType === "net"
      ? 2_450
      : actionType === "recover"
        ? 1_850
        : rush
          ? 1_650
          : 2_050;
  const attackerDurationMs = Math.round(clamp(attackerDuration, 0, maxDuration));

  motions.set(attackerId, {
    from: clonePoint(attackerFrom),
    to: clonePoint(attackerTo),
    startMs: timeMs,
    endMs: timeMs + attackerDurationMs,
  });

  return {
    attackerFrom,
    defenderFrom,
    attackerTo,
    defenderTo: defenderFrom,
    durationMs: attackerDurationMs,
    attackerDurationMs,
    defenderDurationMs: 0,
    rush,
    defenderRush: false,
    distance: getDistance(attackerTo, defenderFrom),
  };
}

function getRuntime(
  fighters: Record<string, BattleFighterRuntime>,
  id: string,
): BattleFighterRuntime {
  const fighter = fighters[id];
  if (!fighter) {
    throw new Error(`Unknown fighter in battle plan: ${id}`);
  }
  return fighter;
}

function createRuntime(gladiator: GladiatorClass): BattleFighterRuntime {
  const stamina = randomBetween(0.9, 1.16);
  const focus = randomBetween(0.86, 1.14);
  const aggression = randomBetween(0.78, 1.22);
  const speed = gladiator.stats.speed * randomBetween(0.9, 1.2);
  const dexterity = clamp(
    gladiator.stats.dexterity * randomBetween(0.9, 1.16) * (0.92 + focus * 0.08),
    1,
    112,
  );
  const endurance = clamp(
    gladiator.stats.endurance * randomBetween(0.92, 1.12) * stamina,
    1,
    116,
  );
  const mobility = speed * 0.5 + dexterity * 0.34 + endurance * 0.16;

  return {
    id: gladiator.id,
    name: gladiator.name,
    maxHp: gladiator.stats.hp,
    maxEnergy: Math.round(72 + endurance * 0.72 + speed * 0.12),
    recoveryRate: 7.5 + endurance / 18,
    attack: gladiator.stats.attack * randomBetween(0.9, 1.18) * focus,
    defense:
      gladiator.stats.defense *
      randomBetween(0.88, 1.18) *
      stamina *
      clamp(0.82 + endurance / 285, 0.88, 1.18),
    speed,
    dexterity,
    endurance,
    mobility,
    focus,
    stamina,
    aggression,
  };
}

function createEnergyState(fighter: BattleFighterRuntime): FighterEnergyState {
  return {
    energy: fighter.maxEnergy,
    maxEnergy: fighter.maxEnergy,
    recoveryUntilMs: 0,
    lastUpdatedMs: 0,
  };
}

function getEnergyState(
  states: Map<string, FighterEnergyState>,
  fighterId: string,
): FighterEnergyState {
  const state = states.get(fighterId);

  if (!state) {
    throw new Error(`Missing fatigue state for fighter: ${fighterId}`);
  }

  return state;
}

function recoverEnergy(
  fighter: BattleFighterRuntime,
  state: FighterEnergyState,
  timeMs: number,
): void {
  const elapsedMs = Math.max(0, timeMs - state.lastUpdatedMs);

  if (elapsedMs <= 0) {
    return;
  }

  const restingBonus = timeMs < state.recoveryUntilMs ? 1.42 : 1;
  state.energy = clamp(
    state.energy + (elapsedMs / 1_000) * fighter.recoveryRate * restingBonus,
    0,
    state.maxEnergy,
  );
  state.lastUpdatedMs = timeMs;

  if (state.energy >= state.maxEnergy * 0.44) {
    state.recoveryUntilMs = Math.min(state.recoveryUntilMs, timeMs);
  }
}

function isWinded(state: FighterEnergyState, timeMs: number): boolean {
  return timeMs < state.recoveryUntilMs || state.energy <= state.maxEnergy * 0.18;
}

function applyFatigueToFighter(
  fighter: BattleFighterRuntime,
  state: FighterEnergyState,
  timeMs: number,
): BattleFighterRuntime {
  const energyRatio = clamp(state.energy / state.maxEnergy, 0, 1);
  const winded = isWinded(state, timeMs);
  const pressure = 1 - energyRatio;
  const movementMultiplier = winded ? 0.5 + energyRatio * 0.22 : 1 - pressure * 0.18;
  const actionMultiplier = winded ? 0.64 + energyRatio * 0.18 : 1 - pressure * 0.12;
  const defenseMultiplier = winded ? 0.66 + energyRatio * 0.18 : 1 - pressure * 0.1;
  const enduranceMultiplier = winded ? 0.68 + energyRatio * 0.16 : 1 - pressure * 0.08;
  const speed = fighter.speed * movementMultiplier;
  const dexterity = fighter.dexterity * movementMultiplier;
  const endurance = fighter.endurance * enduranceMultiplier;
  const mobility = speed * 0.5 + dexterity * 0.34 + endurance * 0.16;

  return {
    ...fighter,
    attack: fighter.attack * actionMultiplier,
    defense: fighter.defense * defenseMultiplier,
    speed,
    dexterity,
    endurance,
    mobility,
    focus: fighter.focus * (winded ? 0.88 : 1 - pressure * 0.04),
  };
}

function applyInjuryToFighter(
  fighter: BattleFighterRuntime,
  currentHp: number,
): BattleFighterRuntime {
  const healthRatio = clamp(currentHp / fighter.maxHp, 0, 1);
  const injuryPressure = 1 - healthRatio;
  const badlyHurt = healthRatio <= 0.34;
  const movementMultiplier = badlyHurt
    ? 0.72 + healthRatio * 0.4
    : 1 - injuryPressure * 0.16;
  const actionMultiplier = badlyHurt
    ? 0.76 + healthRatio * 0.32
    : 1 - injuryPressure * 0.14;
  const defenseMultiplier = badlyHurt
    ? 0.74 + healthRatio * 0.3
    : 1 - injuryPressure * 0.12;
  const enduranceMultiplier = badlyHurt
    ? 0.78 + healthRatio * 0.24
    : 1 - injuryPressure * 0.1;
  const speed = fighter.speed * movementMultiplier;
  const dexterity = fighter.dexterity * movementMultiplier;
  const endurance = fighter.endurance * enduranceMultiplier;
  const mobility = speed * 0.5 + dexterity * 0.34 + endurance * 0.16;

  return {
    ...fighter,
    attack: fighter.attack * actionMultiplier,
    defense: fighter.defense * defenseMultiplier,
    speed,
    dexterity,
    endurance,
    mobility,
    focus: fighter.focus * (badlyHurt ? 0.9 : 1 - injuryPressure * 0.05),
  };
}

function createEffectiveFighters(
  fighters: Record<string, BattleFighterRuntime>,
  states: Map<string, FighterEnergyState>,
  timeMs: number,
  hpByFighter?: Map<string, number>,
): Record<string, BattleFighterRuntime> {
  const effective: Record<string, BattleFighterRuntime> = {};

  for (const [fighterId, fighter] of Object.entries(fighters)) {
    const fatigued = applyFatigueToFighter(
      fighter,
      getEnergyState(states, fighterId),
      timeMs,
    );
    effective[fighterId] = applyInjuryToFighter(
      fatigued,
      hpByFighter?.get(fighterId) ?? fighter.maxHp,
    );
  }

  return effective;
}

function spendEnergy(
  fighter: BattleFighterRuntime,
  state: FighterEnergyState,
  amount: number,
  timeMs: number,
): void {
  state.energy = clamp(state.energy - amount, 0, state.maxEnergy);

  if (state.energy <= state.maxEnergy * 0.16) {
    const recoveryMs = Math.round(
      randomBetween(1_800, 3_200) * clamp(1.22 - fighter.endurance / 260, 0.72, 1.2),
    );
    state.recoveryUntilMs = Math.max(state.recoveryUntilMs, timeMs + recoveryMs);
  }
}

function spendMovementEnergy(
  fighter: BattleFighterRuntime,
  state: FighterEnergyState,
  distance: number,
  rush: boolean,
  timeMs: number,
): void {
  if (distance < MIN_MOVEMENT_DISTANCE) {
    return;
  }

  const enduranceDiscount = clamp(1.18 - fighter.endurance / 210, 0.64, 1.12);
  const cost =
    (distance / ARENA_STANDARD_STEP_DISTANCE) *
    MOVEMENT_ENERGY_PER_STEP *
    enduranceDiscount *
    (rush ? 1.28 : 1);
  spendEnergy(fighter, state, cost, timeMs);
}

function spendActionEnergy(
  fighter: BattleFighterRuntime,
  state: FighterEnergyState,
  actionType: BattleActionType,
  contested: boolean,
  timeMs: number,
): void {
  const enduranceDiscount = clamp(1.15 - fighter.endurance / 240, 0.66, 1.12);
  const baseCost = actionType === "net" ? 17 : actionType === "javelin" ? 15 : 12;
  spendEnergy(fighter, state, (baseCost + (contested ? 4 : 0)) * enduranceDiscount, timeMs);
}

function spendReactionEnergy(
  fighter: BattleFighterRuntime,
  state: FighterEnergyState,
  outcome: BattleOutcome,
  timeMs: number,
): void {
  const enduranceDiscount = clamp(1.14 - fighter.endurance / 255, 0.68, 1.1);
  const baseCost = outcome === "miss" ? 9 : outcome === "block" ? 7 : 4;
  spendEnergy(fighter, state, baseCost * enduranceDiscount, timeMs);
}

function snapshotFatigue(
  fighterIds: readonly string[],
  states: Map<string, FighterEnergyState>,
  timeMs: number,
): BattleFatigueSnapshot[] {
  return fighterIds.map((fighterId) => {
    const state = getEnergyState(states, fighterId);

    return {
      fighterId,
      energyPercent: Math.round(clamp((state.energy / state.maxEnergy) * 100, 0, 100)),
      winded: isWinded(state, timeMs),
      recoveryUntilMs: state.recoveryUntilMs,
    };
  });
}

function createDecisionSnapshot(
  fighterId: string,
  tactic: BattleTactic,
  state: FighterEnergyState,
): BattleDecisionSnapshot {
  return {
    fighterId,
    tactic,
    energyPercent: Math.round(clamp((state.energy / state.maxEnergy) * 100, 0, 100)),
  };
}

function chooseTactic(
  fighter: BattleFighterRuntime,
  opponent: BattleFighterRuntime,
  state: FighterEnergyState,
  opponentState: FighterEnergyState,
  timeMs: number,
): BattleTactic {
  const energyRatio = clamp(state.energy / state.maxEnergy, 0, 1);
  const opponentEnergyRatio = clamp(opponentState.energy / opponentState.maxEnergy, 0, 1);
  const winded = isWinded(state, timeMs);
  const opponentWinded = isWinded(opponentState, timeMs);
  const staminaEdge = energyRatio - opponentEnergyRatio;
  const offenseEdge =
    fighter.attack + fighter.mobility * 0.42 - (opponent.defense + opponent.mobility * 0.24);
  const counterTools =
    fighter.dexterity / 150 + fighter.defense / 260 + fighter.endurance / 520;
  const scores: Record<BattleTactic, number> = {
    press:
      0.14 +
      fighter.aggression * 0.2 +
      energyRatio * 0.5 +
      Math.max(staminaEdge, 0) * 0.45 +
      offenseEdge / 230 +
      (opponentWinded ? 0.42 : 0),
    balanced:
      0.56 +
      energyRatio * 0.18 -
      Math.abs(energyRatio - 0.58) * 0.24 +
      fighter.focus * 0.08,
    counter:
      0.1 +
      counterTools +
      (opponent.aggression - 1) * 0.18 +
      Math.max(-staminaEdge, 0) * 0.2 +
      (energyRatio < 0.45 ? 0.14 : 0),
    recover:
      0.02 +
      (1 - energyRatio) * 1.08 +
      (winded ? 0.86 : 0) -
      Math.max(staminaEdge, 0) * 0.42,
  };

  let bestTactic: BattleTactic = "balanced";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [tactic, score] of Object.entries(scores) as [BattleTactic, number][]) {
    const noisyScore = score + randomBetween(-0.13, 0.13);

    if (noisyScore > bestScore) {
      bestTactic = tactic;
      bestScore = noisyScore;
    }
  }

  if (winded && bestTactic === "press") {
    return energyRatio < 0.24 ? "recover" : "counter";
  }

  return bestTactic;
}

function shouldRushForTactic(
  tactic: BattleTactic,
  state: FighterEnergyState,
  forcedRush: boolean,
): boolean {
  const energyRatio = clamp(state.energy / state.maxEnergy, 0, 1);

  if (forcedRush) {
    return energyRatio > 0.18;
  }

  if (tactic === "press") {
    return energyRatio > 0.42 && Math.random() < 0.72;
  }

  if (tactic === "balanced") {
    return energyRatio > 0.58 && Math.random() < 0.24;
  }

  return false;
}

function shouldUseNet(
  tactic: BattleTactic,
  energyState: FighterEnergyState,
): boolean {
  const energyRatio = clamp(energyState.energy / energyState.maxEnergy, 0, 1);

  if (energyRatio < 0.24) {
    return false;
  }

  const tacticBonus = tactic === "press" ? 0.18 : tactic === "counter" ? 0.08 : tactic === "recover" ? -0.2 : 0;
  const chance = clamp(
    0.16 + tacticBonus + (energyRatio - 0.5) * 0.18,
    0.04,
    0.58,
  );

  return Math.random() < chance;
}

function chooseAttack(
  gladiator: GladiatorClass,
  allowNet = false,
  currentDistance?: number,
): GladiatorClass["attacks"][number] {
  const attacks = allowNet
    ? gladiator.attacks
    : gladiator.attacks.filter((attack) => !isProjectileAttack(attack));
  const attackPool = attacks.length > 0 ? attacks : gladiator.attacks;

  if (typeof currentDistance === "number") {
    let bestAttack = attackPool[0]!;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const attack of attackPool) {
      const reach = normalizeReach(attack.reach);
      const reachGap = getReachGap(currentDistance, reach);
      const centeredness =
        1 -
        clamp(
          Math.abs(currentDistance - reach.preferred) / Math.max(reach.max - reach.min, MIN_REACH_WIDTH),
          0,
          1,
        );
      const inReachBonus = isDistanceInReach(currentDistance, reach) ? 1.2 : 0;
      const reachWidthBonus = (reach.max - reach.min) * 0.35;
      const score =
        inReachBonus +
        centeredness * 0.32 +
        reachWidthBonus -
        reachGap * 2.8 +
        randomBetween(-0.18, 0.18);

      if (score > bestScore) {
        bestAttack = attack;
        bestScore = score;
      }
    }

    return bestAttack;
  }

  return attackPool[Math.floor(Math.random() * attackPool.length)]!;
}

function getNetAttack(gladiator: GladiatorClass): GladiatorClass["attacks"][number] | null {
  return gladiator.attacks.find((attack) => attack.cssClass === NET_ATTACK_CSS_CLASS) ?? null;
}

function getJavelinAttack(gladiator: GladiatorClass): GladiatorClass["attacks"][number] | null {
  return gladiator.attacks.find((attack) => attack.cssClass === JAVELIN_ATTACK_CSS_CLASS) ?? null;
}

function getCloseCombatAttacks(gladiator: GladiatorClass): GladiatorAttack[] {
  return gladiator.attacks.filter((attack) => !isProjectileAttack(attack));
}

function getCloseCombatReach(gladiator: GladiatorClass): AttackReach {
  return getReachEnvelope(getCloseCombatAttacks(gladiator));
}

function getStartingJavelinCount(gladiator: GladiatorClass): number {
  return isVelesGladiator(gladiator) ? JAVELIN_STARTING_COUNT : 0;
}

function estimateImpactDelay(
  attacker: BattleFighterRuntime,
  actionType: BattleActionType,
  rush: boolean,
): number {
  const baseDelay =
    actionType === "net"
      ? randomBetween(680, 900)
      : actionType === "javelin"
        ? randomBetween(1_050, 1_850)
        : randomBetween(460, 720);
  const quickness =
    attacker.dexterity * 0.52 +
    attacker.speed * 0.28 +
    attacker.endurance * 0.12 +
    attacker.focus * 12;
  const rushFactor = rush && actionType !== "javelin" ? 0.96 : 1;
  const minDelay = actionType === "javelin" ? 820 : 320;
  const maxDelay = actionType === "javelin" ? 1_900 : 920;

  return Math.round(clamp((baseDelay - (quickness - 62) * 1.55) * rushFactor, minDelay, maxDelay));
}

function getCriticalChance(attacker: BattleFighterRuntime): number {
  return clamp(
    0.08 + attacker.focus * 0.045 + attacker.attack / 950 + attacker.dexterity / 1_100,
    0.1,
    0.3,
  );
}

function getAttackDamageMultiplier(attackCssClass: string): number {
  if (attackCssClass === "attack-shield-bash") {
    return 0.84;
  }

  if (attackCssClass === "attack-trident-thrust") {
    return 1.08;
  }

  if (attackCssClass === JAVELIN_ATTACK_CSS_CLASS) {
    return 1.14;
  }

  if (attackCssClass === "attack-veles-sword") {
    return 0.78;
  }

  return 1;
}

function calculateStrikeDamage(
  attacker: BattleFighterRuntime,
  defender: BattleFighterRuntime,
  attackCssClass: string,
  critical: boolean,
  defenderTrapped: boolean,
): number {
  const attackPressure =
    attacker.attack * 0.16 +
    attacker.dexterity * 0.025 +
    attacker.mobility * 0.018 +
    attacker.focus * 2.2;
  const defenseSoak = defender.defense * 0.09 + defender.endurance * 0.032;
  const trappedBonus = defenderTrapped ? 2.4 : 0;
  const rawDamage =
    (5.2 + attackPressure - defenseSoak + trappedBonus) *
    getAttackDamageMultiplier(attackCssClass);
  const criticalMultiplier = critical ? randomBetween(1.45, 1.75) : 1;
  const maxDamage = defender.maxHp * (critical ? 0.32 : 0.24);

  return Math.round(
    clamp(rawDamage * criticalMultiplier * randomBetween(0.84, 1.2), critical ? 4 : 2, maxDamage),
  );
}

interface DefenseProfile {
  canBlock: boolean;
  blockMultiplier: number;
}

function planOutcome(
  attacker: BattleFighterRuntime,
  defender: BattleFighterRuntime,
  defenderTrapped = false,
  defenseProfile: DefenseProfile = { canBlock: true, blockMultiplier: 1 },
): { outcome: BattleOutcome; critical: boolean } {
  if (defenderTrapped) {
    return { outcome: "hit", critical: Math.random() < getCriticalChance(attacker) };
  }

  const hitChance = clamp(
    0.52 +
      (attacker.attack - defender.defense * 0.58) / 195 +
      (attacker.dexterity - defender.dexterity) / 330 +
      (attacker.mobility - defender.mobility) / 420,
    0.34,
    0.82,
  );

  if (Math.random() < hitChance) {
    return { outcome: "hit", critical: Math.random() < getCriticalChance(attacker) };
  }

  const dodgeWeight = clamp(
    0.18 +
      defender.dexterity / 165 +
      defender.endurance / 520 +
      (defender.mobility - attacker.mobility) / 340,
    0.14,
    0.74,
  );
  const blockWeight = defenseProfile.canBlock
    ? clamp(
        (0.18 +
          defender.defense / 155 +
          defender.endurance / 265 -
          attacker.dexterity / 560) *
          defenseProfile.blockMultiplier,
        0.08,
        0.78,
      )
    : 0;

  return {
    outcome:
      blockWeight > 0 && Math.random() < blockWeight / (blockWeight + dodgeWeight)
        ? "block"
        : "miss",
    critical: false,
  };
}

function planJavelinOutcome(
  attacker: BattleFighterRuntime,
  defender: BattleFighterRuntime,
  defenderCanBlock: boolean,
  defenderTrapped = false,
): { outcome: BattleOutcome; critical: boolean } {
  if (defenderTrapped) {
    return { outcome: "hit", critical: Math.random() < getCriticalChance(attacker) };
  }

  const hitChance = clamp(
    0.48 +
      (attacker.attack - defender.defense * 0.36) / 210 +
      (attacker.dexterity - defender.dexterity) / 310 +
      attacker.focus * 0.055 -
      defender.mobility / 620,
    0.28,
    0.76,
  );

  if (Math.random() < hitChance) {
    return { outcome: "hit", critical: Math.random() < getCriticalChance(attacker) };
  }

  const dodgeWeight = clamp(
    0.24 +
      defender.dexterity / 145 +
      defender.mobility / 420 +
      defender.endurance / 560 -
      attacker.focus * 0.05,
    0.18,
    0.84,
  );
  const blockWeight = defenderCanBlock
    ? clamp(0.2 + defender.defense / 135 + defender.endurance / 360 - attacker.dexterity / 680, 0.12, 0.72)
    : 0;

  return {
    outcome:
      blockWeight > 0 && Math.random() < blockWeight / (blockWeight + dodgeWeight)
        ? "block"
        : "miss",
    critical: false,
  };
}

function planNetTrap(
  attacker: BattleFighterRuntime,
  defender: BattleFighterRuntime,
  timeMs: number,
): { outcome: BattleOutcome; netTrap: BattleNetTrap } {
  const evadeChance = clamp(
    0.12 +
      defender.dexterity / 230 +
      defender.endurance / 650 +
      defender.mobility / 520 +
      defender.focus * 0.05 -
      attacker.dexterity / 760 -
      attacker.focus * 0.05,
    0.16,
    0.74,
  );
  const escaped = Math.random() < evadeChance;
  const durationMs = escaped
    ? 0
    : Math.round(
        randomBetween(4_400, 7_200) *
          clamp(1.16 + attacker.focus * 0.1 - defender.endurance / 580, 0.82, 1.32),
      );

  return {
    outcome: escaped ? "miss" : "hit",
    netTrap: {
      escaped,
      durationMs,
      releaseTimeMs: timeMs + durationMs,
    },
  };
}

interface BattleSimulationResult {
  actions: PlannedAction[];
  winnerId: string;
  loserId: string;
  winnerTeamId: BattleTeamId;
  loserTeamId: BattleTeamId;
  durationMs: number;
}

interface PendingActionResolution {
  action: PlannedAction;
  reach: AttackReach;
}

function getStrikeDefenseProfile(brain: FighterBrain | undefined): DefenseProfile {
  if (!brain) {
    return { canBlock: true, blockMultiplier: 1 };
  }

  if (!isVelesGladiator(brain.gladiator)) {
    return { canBlock: true, blockMultiplier: 1 };
  }

  if (brain.javelinsLeft > 0 && !brain.usingShortSword) {
    return { canBlock: false, blockMultiplier: 0 };
  }

  return { canBlock: true, blockMultiplier: 0.46 };
}

function isEnemyDangerouslyClose(distance: number, enemy: GladiatorClass): boolean {
  const enemyReach = normalizeReach(getCloseCombatReach(enemy));

  return distance <= enemyReach.max + metersToArenaDistance(0.14);
}

function createActions(
  gladiators: readonly GladiatorClass[],
  fighters: Record<string, BattleFighterRuntime>,
  startPositions: Record<string, BattlePoint>,
  teams: Record<string, BattleTeamId>,
): BattleSimulationResult {
  let actions: PlannedAction[] = [];
  const fighterIds = gladiators.map((gladiator) => gladiator.id);
  const energyStates = new Map<string, FighterEnergyState>(
    fighterIds.map((fighterId) => [fighterId, createEnergyState(getRuntime(fighters, fighterId))]),
  );
  const currentHp = new Map<string, number>(
    fighterIds.map((fighterId) => [fighterId, getRuntime(fighters, fighterId).maxHp]),
  );
  const damageByFighter = new Map<string, number>(fighterIds.map((fighterId) => [fighterId, 0]));
  const motions = createMotionStates(fighterIds, startPositions);
  const traps = new Map<string, FighterTrapState>();
  const pendingResolutions: PendingActionResolution[] = [];
  const brains: FighterBrain[] = gladiators.map((gladiator, index) => ({
    id: gladiator.id,
    gladiator,
    nextDecisionMs: Math.round(randomBetween(900, 1_650) + index * randomBetween(120, 360)),
    tactic: "balanced",
    targetId: null,
    netThrown: false,
    javelinsLeft: getStartingJavelinCount(gladiator),
    usingShortSword: false,
  }));

  const getHp = (fighterId: string): number => currentHp.get(fighterId) ?? 0;
  const getHpRatio = (fighterId: string): number =>
    clamp(getHp(fighterId) / getRuntime(fighters, fighterId).maxHp, 0, 1);
  const isDefeated = (fighterId: string): boolean => getHp(fighterId) <= 0;
  const getAliveTeamCount = (): number => {
    const aliveTeams = new Set<BattleTeamId>();
    for (const fighterId of fighterIds) {
      if (!isDefeated(fighterId)) {
        aliveTeams.add(teams[fighterId]!);
      }
    }
    return aliveTeams.size;
  };
  const getDefenderHp = (fighterId: string): number => Math.max(0, Math.round(getHp(fighterId)));

  const recoverAllEnergy = (timeMs: number): void => {
    for (const fighterId of fighterIds) {
      recoverEnergy(
        getRuntime(fighters, fighterId),
        getEnergyState(energyStates, fighterId),
        timeMs,
      );
    }
  };

  const isTrapped = (fighterId: string, timeMs: number): boolean => {
    const trap = traps.get(fighterId);

    return Boolean(trap && timeMs >= trap.trappedFromMs && timeMs < trap.trappedUntilMs);
  };

  const createDecisions = (): BattleDecisionSnapshot[] =>
    fighterIds.map((fighterId) => {
      const brain = brains.find((item) => item.id === fighterId);

      return createDecisionSnapshot(
        fighterId,
        brain?.tactic ?? "balanced",
        getEnergyState(energyStates, fighterId),
      );
    });

  const resolvePendingActions = (untilMs: number): void => {
    pendingResolutions.sort((a, b) => compareActionResolution(a.action, b.action));

    while (pendingResolutions.length > 0) {
      const pending = pendingResolutions[0]!;
      const action = pending.action;
      const impactTimeMs = getActionResolutionTimeMs(action);

      if (impactTimeMs > untilMs) {
        break;
      }

      pendingResolutions.shift();
      recoverAllEnergy(impactTimeMs);
      action.defenderHp = getDefenderHp(action.defenderId);

      if (isDefeated(action.attackerId) || isDefeated(action.defenderId)) {
        action.outcome = "miss";
        action.critical = false;
        action.damage = 0;
        action.fatigue = snapshotFatigue(fighterIds, energyStates, impactTimeMs);
        continue;
      }

      const effectiveFighters = createEffectiveFighters(
        fighters,
        energyStates,
        impactTimeMs,
        currentHp,
      );
      const attacker = getRuntime(effectiveFighters, action.attackerId);
      const defender = getRuntime(effectiveFighters, action.defenderId);
      const attackerBrain = brains.find((candidate) => candidate.id === action.attackerId);
      const defenderBrain = brains.find((candidate) => candidate.id === action.defenderId);
      const defenderTrapped = isTrapped(action.defenderId, impactTimeMs);
      const impactDistance = getDistance(
        getFighterPosition(motions, action.attackerId, impactTimeMs),
        getFighterPosition(motions, action.defenderId, impactTimeMs),
      );
      const attackInReach = isDistanceInReach(impactDistance, pending.reach);

      if (defenderBrain && isVelesGladiator(defenderBrain.gladiator)) {
        defenderBrain.usingShortSword =
          defenderBrain.javelinsLeft <= 0 ||
          (attackerBrain
            ? isEnemyDangerouslyClose(impactDistance, attackerBrain.gladiator)
            : false);
      }

      if (action.actionType === "net") {
        if (!attackInReach) {
          action.outcome = "miss";
          action.netTrap = {
            escaped: true,
            durationMs: 0,
            releaseTimeMs: impactTimeMs,
          };
        } else {
          const plannedNet = planNetTrap(attacker, defender, impactTimeMs);
          action.outcome = plannedNet.outcome;
          action.netTrap = plannedNet.netTrap;

          if (!plannedNet.netTrap.escaped) {
            traps.set(action.defenderId, {
              trappedFromMs: impactTimeMs,
              trappedUntilMs: plannedNet.netTrap.releaseTimeMs,
              trapperId: action.attackerId,
            });
          }
        }
      } else if (action.actionType === "javelin") {
        if (!attackInReach) {
          action.outcome = "miss";
          action.critical = false;
        } else {
          const plannedOutcome = planJavelinOutcome(
            attacker,
            defender,
            defenderBrain ? canShieldBlockProjectiles(defenderBrain.gladiator) : false,
            defenderTrapped,
          );
          action.outcome = plannedOutcome.outcome;
          action.critical = plannedOutcome.critical;

          if (action.outcome === "hit") {
            action.damage = Math.min(
              getDefenderHp(action.defenderId),
              calculateStrikeDamage(
                attacker,
                defender,
                action.attackCssClass,
                action.critical,
                defenderTrapped,
              ),
            );
            action.defenderHp = Math.max(0, getDefenderHp(action.defenderId) - action.damage);
            currentHp.set(action.defenderId, action.defenderHp);
            damageByFighter.set(
              action.attackerId,
              (damageByFighter.get(action.attackerId) ?? 0) + action.damage,
            );

            if (action.defenderHp <= 0) {
              if (defenderBrain) {
                defenderBrain.nextDecisionMs = Number.POSITIVE_INFINITY;
              }
              traps.delete(action.defenderId);
            }
          }
        }
      } else if (action.actionType === "strike") {
        if (!attackInReach) {
          action.outcome = "miss";
          action.critical = false;
        } else {
          const plannedOutcome = planOutcome(
            attacker,
            defender,
            defenderTrapped,
            getStrikeDefenseProfile(defenderBrain),
          );
          action.outcome = plannedOutcome.outcome;
          action.critical = plannedOutcome.critical;

          if (action.outcome === "hit") {
            action.damage = Math.min(
              getDefenderHp(action.defenderId),
              calculateStrikeDamage(
                attacker,
                defender,
                action.attackCssClass,
                action.critical,
                defenderTrapped,
              ),
            );
            action.defenderHp = Math.max(0, getDefenderHp(action.defenderId) - action.damage);
            currentHp.set(action.defenderId, action.defenderHp);
            damageByFighter.set(
              action.attackerId,
              (damageByFighter.get(action.attackerId) ?? 0) + action.damage,
            );

            if (action.defenderHp <= 0) {
              if (defenderBrain) {
                defenderBrain.nextDecisionMs = Number.POSITIVE_INFINITY;
              }
              traps.delete(action.defenderId);
            }
          }
        }
      }

      spendReactionEnergy(
        getRuntime(fighters, action.defenderId),
        getEnergyState(energyStates, action.defenderId),
        action.outcome,
        impactTimeMs,
      );
      action.fatigue = snapshotFatigue(fighterIds, energyStates, impactTimeMs);
    }
  };

  const getBrain = (fighterId: string): FighterBrain | undefined =>
    brains.find((candidate) => candidate.id === fighterId);

  const getEnemyCandidateIds = (brain: FighterBrain): string[] => {
    const ownTeam = teams[brain.id];

    return fighterIds.filter(
      (fighterId) =>
        fighterId !== brain.id &&
        !isDefeated(fighterId) &&
        teams[fighterId] !== ownTeam,
    );
  };

  const hasReadyJavelin = (brain: FighterBrain): boolean =>
    isVelesGladiator(brain.gladiator) &&
    Boolean(getJavelinAttack(brain.gladiator)) &&
    brain.javelinsLeft > 0;

  const getNearestDangerousEnemyId = (
    brain: FighterBrain,
    candidates: readonly string[],
    timeMs: number,
  ): string | null => {
    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    let bestTargetId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidateId of candidates) {
      const candidateBrain = getBrain(candidateId);
      if (!candidateBrain) {
        continue;
      }

      const distance = getDistance(
        ownPosition,
        getFighterPosition(motions, candidateId, timeMs),
      );

      if (isEnemyDangerouslyClose(distance, candidateBrain.gladiator) && distance < bestDistance) {
        bestTargetId = candidateId;
        bestDistance = distance;
      }
    }

    return bestTargetId;
  };

  const isEnemyPinnedByAlly = (
    enemyId: string,
    spotterId: string,
    timeMs: number,
  ): boolean => {
    const ownTeam = teams[spotterId];
    const enemyBrain = getBrain(enemyId);
    const enemyPosition = getFighterPosition(motions, enemyId, timeMs);

    if (
      enemyBrain?.targetId &&
      enemyBrain.targetId !== spotterId &&
      teams[enemyBrain.targetId] === ownTeam &&
      !isDefeated(enemyBrain.targetId)
    ) {
      return true;
    }

    return fighterIds.some((allyId) => {
      if (
        allyId === spotterId ||
        allyId === enemyId ||
        teams[allyId] !== ownTeam ||
        isDefeated(allyId)
      ) {
        return false;
      }

      const allyBrain = getBrain(allyId);
      const allyPosition = getFighterPosition(motions, allyId, timeMs);
      const allyReach = allyBrain ? normalizeReach(getCloseCombatReach(allyBrain.gladiator)).max : 0;
      const distance = getDistance(allyPosition, enemyPosition);
      const closeEnoughToHold =
        distance <= Math.max(allyReach + metersToArenaDistance(0.28), metersToArenaDistance(0.48));

      return closeEnoughToHold || (allyBrain?.targetId === enemyId && distance <= metersToArenaDistance(1.15));
    });
  };

  const chooseVelesJavelinTargetId = (
    brain: FighterBrain,
    candidates: readonly string[],
    timeMs: number,
  ): string | null => {
    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    let bestTargetId = candidates[0] ?? null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidateId of candidates) {
      const targetPosition = getFighterPosition(motions, candidateId, timeMs);
      const lateralGap = Math.abs(targetPosition.y - ownPosition.y);
      const aligned = lateralGap <= JAVELIN_ALIGNMENT_DISTANCE;
      const distance = getDistance(ownPosition, targetPosition);
      const trap = traps.get(candidateId);
      const ownTrapBonus =
        trap && trap.trapperId === brain.id && isTrapped(candidateId, timeMs) ? -0.28 : 0;
      const pinnedBonus = isEnemyPinnedByAlly(candidateId, brain.id, timeMs) ? -0.08 : 0;
      const alignmentBonus = aligned ? -0.22 : 0;
      const score =
        distance +
        lateralGap * 0.72 +
        alignmentBonus +
        ownTrapBonus +
        pinnedBonus +
        randomBetween(-0.018, 0.018);

      if (score < bestScore) {
        bestTargetId = candidateId;
        bestScore = score;
      }
    }

    return bestTargetId;
  };

  const shouldRepositionForJavelin = (
    brain: FighterBrain,
    targetId: string,
    timeMs: number,
  ): boolean => {
    if (!hasReadyJavelin(brain)) {
      return false;
    }

    const targetBrain = getBrain(targetId);
    if (!targetBrain) {
      return false;
    }

    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    const targetPosition = getFighterPosition(motions, targetId, timeMs);
    const distance = getDistance(ownPosition, targetPosition);

    if (isEnemyDangerouslyClose(distance, targetBrain.gladiator)) {
      return false;
    }

    if (distance >= JAVELIN_SAFE_DISTANCE) {
      return false;
    }

    const ownState = getEnergyState(energyStates, brain.id);
    const energyRatio = clamp(ownState.energy / ownState.maxEnergy, 0, 1);

    return energyRatio > 0.3 && isEnemyPinnedByAlly(targetId, brain.id, timeMs);
  };

  const chooseTargetId = (brain: FighterBrain, timeMs: number): string | null => {
    const candidates = getEnemyCandidateIds(brain);

    if (candidates.length === 0) {
      return null;
    }

    if (hasReadyJavelin(brain)) {
      const dangerousTargetId = getNearestDangerousEnemyId(brain, candidates, timeMs);
      if (dangerousTargetId) {
        return dangerousTargetId;
      }

      const javelinTargetId = chooseVelesJavelinTargetId(brain, candidates, timeMs);
      if (javelinTargetId) {
        return javelinTargetId;
      }
    }

    if (brain.targetId && candidates.includes(brain.targetId) && Math.random() > 0.22) {
      return brain.targetId;
    }

    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    let bestTargetId = candidates[0] ?? null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidateId of candidates) {
      const targetPosition = getFighterPosition(motions, candidateId, timeMs);
      const trap = traps.get(candidateId);
      const ownTrapBonus =
        trap && trap.trapperId === brain.id && isTrapped(candidateId, timeMs) ? -0.28 : 0;
      const score =
        getDistance(ownPosition, targetPosition) +
        ownTrapBonus +
        randomBetween(-0.08, 0.08);

      if (score < bestScore) {
        bestTargetId = candidateId;
        bestScore = score;
      }
    }

    return bestTargetId;
  };

  const shouldSpendTurnRecovering = (
    brain: FighterBrain,
    fighter: BattleFighterRuntime,
    timeMs: number,
  ): boolean => {
    const state = getEnergyState(energyStates, brain.id);
    const energyRatio = clamp(state.energy / state.maxEnergy, 0, 1);

    if (isWinded(state, timeMs) && energyRatio < 0.42) {
      return true;
    }

    if (brain.tactic !== "recover") {
      return false;
    }

    return energyRatio < 0.68 && Math.random() < clamp(0.35 + fighter.endurance / 260, 0.42, 0.74);
  };

  const restBrain = (brain: FighterBrain, fighter: BattleFighterRuntime, timeMs: number): void => {
    const state = getEnergyState(energyStates, brain.id);
    const restMs = Math.round(
      randomBetween(850, 1_650) * clamp(1.22 - fighter.endurance / 260, 0.72, 1.18),
    );

    state.recoveryUntilMs = Math.max(state.recoveryUntilMs, timeMs + restMs);
    brain.nextDecisionMs = Math.round(timeMs + restMs * randomBetween(0.64, 0.94));
  };

  const estimateNextDecisionDelay = (
    fighter: BattleFighterRuntime,
    state: FighterEnergyState,
    actionType: BattleActionType,
    tactic: BattleTactic,
  ): number => {
    const energyRatio = clamp(state.energy / state.maxEnergy, 0, 1);
    const baseDelay =
      actionType === "net"
        ? randomBetween(2_100, 3_250)
        : actionType === "javelin"
          ? randomBetween(1_650, 3_150)
        : actionType === "move"
          ? randomBetween(360, 880)
          : actionType === "recover"
            ? randomBetween(520, 1_050)
            : randomBetween(900, 1_850);
    const tacticFactor =
      tactic === "press" ? 0.82 : tactic === "counter" ? 1.08 : tactic === "recover" ? 1.32 : 1;
    const fatigueFactor = energyRatio < 0.34 ? 1.38 : energyRatio > 0.72 ? 0.88 : 1;
    const speedFactor = clamp(1.18 - fighter.dexterity / 360 - fighter.speed / 520, 0.72, 1.16);

    return Math.round(baseDelay * tacticFactor * fatigueFactor * speedFactor);
  };

  const shouldAttackNow = (
    brain: FighterBrain,
    targetId: string,
    timeMs: number,
  ): boolean => {
    const effectiveFighters = createEffectiveFighters(fighters, energyStates, timeMs, currentHp);
    const fighter = getRuntime(effectiveFighters, brain.id);
    const ownState = getEnergyState(energyStates, brain.id);
    const energyRatio = clamp(ownState.energy / ownState.maxEnergy, 0, 1);
    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    const targetPosition = getFighterPosition(motions, targetId, timeMs);
    const distance = getDistance(ownPosition, targetPosition);
    const targetBrain = brains.find((candidate) => candidate.id === targetId);
    const netAttack = getNetAttack(brain.gladiator);
    const netReady = Boolean(netAttack) && !brain.netThrown;
    const javelinAttack = getJavelinAttack(brain.gladiator);
    const javelinReady = Boolean(javelinAttack) && brain.javelinsLeft > 0;
    const dangerousClose = targetBrain
      ? isEnemyDangerouslyClose(distance, targetBrain.gladiator)
      : false;
    const strikeReach = getCloseCombatReach(brain.gladiator);

    if (energyRatio < 0.24) {
      return false;
    }

    brain.usingShortSword = isVelesGladiator(brain.gladiator)
      ? brain.javelinsLeft <= 0 || dangerousClose
      : false;

    if (
      javelinReady &&
      javelinAttack &&
      !brain.usingShortSword
    ) {
      return true;
    }

    if (javelinReady && !brain.usingShortSword) {
      return false;
    }

    if (
      netReady &&
      netAttack &&
      canCloseToReach(
        distance,
        netAttack.reach,
        getSteadyStepDistance(fighter, "net", shouldRushForTactic(brain.tactic, ownState, false)),
      ) &&
      Math.random() < 0.42
    ) {
      return true;
    }

    const strikeGap = getReachGap(distance, strikeReach);
    const strikeStepDistance = getSteadyStepDistance(
      fighter,
      "strike",
      shouldRushForTactic(brain.tactic, ownState, false),
    );

    if (!canCloseToReach(distance, strikeReach, strikeStepDistance)) {
      return false;
    }

    if (isTrapped(targetId, timeMs)) {
      return true;
    }

    const rangeReadiness =
      isDistanceInReach(distance, strikeReach)
        ? 0.46
        : strikeGap < metersToArenaDistance(0.6)
          ? 0.24
          : 0.08;
    const tacticBonus =
      brain.tactic === "press"
        ? 0.22
        : brain.tactic === "counter"
          ? -0.08
          : brain.tactic === "recover"
            ? -0.18
            : 0;
    const chance = clamp(rangeReadiness + tacticBonus + (energyRatio - 0.5) * 0.18, 0.06, 0.72);

    return Math.random() < chance;
  };

  const planBrainMovement = (
    brain: FighterBrain,
    targetId: string,
    timeMs: number,
    actionType: "move" | "recover",
  ): void => {
    const effectiveFighters = createEffectiveFighters(fighters, energyStates, timeMs, currentHp);
    const fighter = getRuntime(effectiveFighters, brain.id);
    const ownState = getEnergyState(energyStates, brain.id);
    const rush = actionType === "move" && shouldRushForTactic(brain.tactic, ownState, false);
    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    const targetPosition = getFighterPosition(motions, targetId, timeMs);
    const targetBrain = brains.find((candidate) => candidate.id === targetId);
    const javelinAttack = getJavelinAttack(brain.gladiator);
    const javelinReady = Boolean(javelinAttack) && brain.javelinsLeft > 0;
    const dangerousClose = targetBrain
      ? isEnemyDangerouslyClose(getDistance(ownPosition, targetPosition), targetBrain.gladiator)
      : false;
    brain.usingShortSword = isVelesGladiator(brain.gladiator)
      ? brain.javelinsLeft <= 0 || dangerousClose
      : false;
    const setupAttack =
      actionType === "move"
        ? javelinReady && !brain.usingShortSword && javelinAttack
          ? javelinAttack
          : chooseAttack(brain.gladiator, false, getDistance(ownPosition, targetPosition))
        : null;
    const movementTactic =
      setupAttack?.cssClass === JAVELIN_ATTACK_CSS_CLASS ? "counter" : brain.tactic;
    const movement = createMovement(
      teams,
      brain.id,
      targetId,
      actionType,
      effectiveFighters,
      motions,
      timeMs,
      rush,
      movementTactic,
      setupAttack?.reach,
    );

    spendMovementEnergy(
      getRuntime(fighters, brain.id),
      ownState,
      getDistance(movement.attackerFrom, movement.attackerTo),
      movement.rush,
      timeMs,
    );

    if (actionType === "recover") {
      restBrain(brain, fighter, timeMs);
      brain.nextDecisionMs = Math.max(
        brain.nextDecisionMs,
        timeMs + movement.durationMs + randomBetween(260, 640),
      );
    } else {
      brain.nextDecisionMs =
        timeMs +
        movement.durationMs +
        estimateNextDecisionDelay(fighter, ownState, actionType, brain.tactic);
    }

    actions.push({
      index: actions.length,
      timeMs,
      attackerId: brain.id,
      defenderId: targetId,
      attackName: "",
      attackCssClass: "",
      actionType,
      outcome: "miss",
      critical: false,
      damage: 0,
      defenderHp: getDefenderHp(targetId),
      movement,
      impactDelayMs: 0,
      fatigue: snapshotFatigue(fighterIds, energyStates, timeMs),
      decisions: createDecisions(),
    });
  };

  const planBrainAction = (
    brain: FighterBrain,
    targetId: string,
    timeMs: number,
  ): void => {
    const effectiveFighters = createEffectiveFighters(fighters, energyStates, timeMs, currentHp);
    const attacker = getRuntime(effectiveFighters, brain.id);
    const ownState = getEnergyState(energyStates, brain.id);
    const defenderTrapped = isTrapped(targetId, timeMs);
    const targetTrap = traps.get(targetId);
    const forcedRush = defenderTrapped && targetTrap?.trapperId === brain.id;
    const netAttack = getNetAttack(brain.gladiator);
    const ownPosition = getFighterPosition(motions, brain.id, timeMs);
    const targetPosition = getFighterPosition(motions, targetId, timeMs);
    const currentDistance = getDistance(ownPosition, targetPosition);
    const targetBrain = brains.find((candidate) => candidate.id === targetId);
    const javelinAttack = getJavelinAttack(brain.gladiator);
    const dangerousClose = targetBrain
      ? isEnemyDangerouslyClose(currentDistance, targetBrain.gladiator)
      : false;
    brain.usingShortSword = isVelesGladiator(brain.gladiator)
      ? brain.javelinsLeft <= 0 || dangerousClose
      : false;
    const shouldThrowJavelin =
      Boolean(javelinAttack) &&
      brain.javelinsLeft > 0 &&
      !brain.usingShortSword;
    const shouldThrowNet =
      Boolean(netAttack) &&
      !brain.netThrown &&
      !defenderTrapped &&
      shouldUseNet(brain.tactic, ownState);
    const actionType: BattleActionType =
      shouldThrowJavelin && javelinAttack
        ? "javelin"
        : shouldThrowNet && netAttack
          ? "net"
          : "strike";
    const attack =
      actionType === "javelin" && javelinAttack
        ? javelinAttack
        : actionType === "net" && netAttack
        ? netAttack
        : chooseAttack(brain.gladiator, false, currentDistance);
    const rush = actionType === "javelin" ? false : shouldRushForTactic(brain.tactic, ownState, forcedRush);
    const movementTactic = actionType === "javelin" ? "counter" : brain.tactic;
    const movement = createMovement(
      teams,
      brain.id,
      targetId,
      actionType,
      effectiveFighters,
      motions,
      timeMs,
      rush,
      movementTactic,
      attack.reach,
    );
    const impactDelayMs = estimateImpactDelay(attacker, actionType, rush);
    const impactTimeMs = timeMs + movement.durationMs + impactDelayMs;
    const netTrap: BattleNetTrap | undefined =
      actionType === "net"
        ? {
            escaped: true,
            durationMs: 0,
            releaseTimeMs: impactTimeMs,
          }
        : undefined;

    spendMovementEnergy(
      getRuntime(fighters, brain.id),
      ownState,
      getDistance(movement.attackerFrom, movement.attackerTo),
      movement.rush,
      timeMs,
    );
    spendActionEnergy(getRuntime(fighters, brain.id), ownState, actionType, false, timeMs);

    if (actionType === "net") {
      brain.netThrown = true;
    }

    if (actionType === "javelin") {
      brain.javelinsLeft = Math.max(0, brain.javelinsLeft - 1);
      brain.usingShortSword = brain.javelinsLeft <= 0;
    }

    const action: PlannedAction = {
      index: actions.length,
      timeMs,
      attackerId: brain.id,
      defenderId: targetId,
      attackName: attack.name,
      attackCssClass: attack.cssClass,
      actionType,
      outcome: "miss",
      critical: false,
      damage: 0,
      defenderHp: getDefenderHp(targetId),
      movement,
      impactDelayMs,
      fatigue: snapshotFatigue(fighterIds, energyStates, timeMs),
      decisions: createDecisions(),
      netTrap,
    };

    actions.push(action);
    pendingResolutions.push({ action, reach: attack.reach });

    brain.nextDecisionMs =
      impactTimeMs + estimateNextDecisionDelay(attacker, ownState, actionType, brain.tactic);
  };

  while (getAliveTeamCount() > 1) {
    const aliveBrains = brains.filter((candidate) => !isDefeated(candidate.id));
    const brain = aliveBrains.reduce((earliest, candidate) =>
      candidate.nextDecisionMs < earliest.nextDecisionMs ? candidate : earliest,
    );
    const timeMs = Math.round(brain.nextDecisionMs);

    if (!Number.isFinite(timeMs)) {
      break;
    }

    resolvePendingActions(timeMs);

    if (getAliveTeamCount() <= 1) {
      break;
    }

    if (isDefeated(brain.id)) {
      continue;
    }

    recoverAllEnergy(timeMs);

    const ownTrap = traps.get(brain.id);
    if (isTrapped(brain.id, timeMs)) {
      brain.tactic = "recover";
      brain.nextDecisionMs = Math.round(
        (ownTrap?.trappedUntilMs ?? timeMs + 1_200) + randomBetween(420, 1_250),
      );
      continue;
    }

    const targetId = chooseTargetId(brain, timeMs);
    if (!targetId) {
      break;
    }

    brain.targetId = targetId;

    const effectiveFighters = createEffectiveFighters(fighters, energyStates, timeMs, currentHp);
    const fighter = getRuntime(effectiveFighters, brain.id);
    const target = getRuntime(effectiveFighters, targetId);

    brain.tactic = chooseTactic(
      fighter,
      target,
      getEnergyState(energyStates, brain.id),
      getEnergyState(energyStates, targetId),
      timeMs,
    );

    if (shouldSpendTurnRecovering(brain, fighter, timeMs)) {
      planBrainMovement(brain, targetId, timeMs, "recover");
      continue;
    }

    if (shouldRepositionForJavelin(brain, targetId, timeMs)) {
      planBrainMovement(brain, targetId, timeMs, "move");
      continue;
    }

    if (shouldAttackNow(brain, targetId, timeMs)) {
      planBrainAction(brain, targetId, timeMs);
      continue;
    }

    planBrainMovement(brain, targetId, timeMs, "move");
  }

  resolvePendingActions(Number.POSITIVE_INFINITY);

  actions.sort((a, b) => a.timeMs - b.timeMs || a.index - b.index);
  actions.forEach((action, index) => {
    action.index = index;
  });

  const outcomeOrder = fighterIds
    .map((fighterId) => ({
      id: fighterId,
      hp: getHp(fighterId),
      hpRatio: getHpRatio(fighterId),
      damageDealt: damageByFighter.get(fighterId) ?? 0,
      tiebreaker: Math.random(),
    }))
    .sort(
      (a, b) =>
        b.hpRatio - a.hpRatio ||
        b.hp - a.hp ||
        b.damageDealt - a.damageDealt ||
        b.tiebreaker - a.tiebreaker,
    );

  const teamScore = new Map<BattleTeamId, number>();
  for (const fighterId of fighterIds) {
    const team = teams[fighterId]!;
    teamScore.set(team, (teamScore.get(team) ?? 0) + getHp(fighterId));
  }

  const teamRanking = Array.from(teamScore.entries()).sort(
    (a, b) => b[1] - a[1] || Math.random() - 0.5,
  );
  const winnerTeamId: BattleTeamId = teamRanking[0]?.[0] ?? "left";
  const loserTeamId: BattleTeamId =
    teamRanking[teamRanking.length - 1]?.[0] ?? (winnerTeamId === "left" ? "right" : "left");

  const winnerId =
    outcomeOrder.find((entry) => teams[entry.id] === winnerTeamId)?.id ??
    outcomeOrder[0]?.id ??
    fighterIds[0]!;
  const loserId =
    [...outcomeOrder].reverse().find((entry) => teams[entry.id] === loserTeamId)?.id ??
    outcomeOrder[outcomeOrder.length - 1]?.id ??
    fighterIds[1] ??
    winnerId;

  return {
    actions,
    winnerId,
    loserId,
    winnerTeamId,
    loserTeamId,
    durationMs: getResolvedDurationMs(actions, 0),
  };
}

function trimEventsAfterDefeat(
  events: BattleEvent[],
  teams: Record<string, BattleTeamId>,
  fighterIds: readonly string[],
): BattleEvent[] {
  const sorted = [...events].sort(compareActionResolution);
  const aliveFighters = new Set<string>(fighterIds);

  let endingEvent: BattleEvent | null = null;

  for (const event of sorted) {
    if (event.damage > 0 && event.defenderHp <= 0 && aliveFighters.has(event.defenderId)) {
      aliveFighters.delete(event.defenderId);
      const stillAliveTeams = new Set<BattleTeamId>();
      for (const fighterId of aliveFighters) {
        stillAliveTeams.add(teams[fighterId]!);
      }
      if (stillAliveTeams.size <= 1) {
        endingEvent = event;
        break;
      }
    }
  }

  if (!endingEvent) {
    return events;
  }

  const endTimeMs = getActionResolutionTimeMs(endingEvent);

  return events
    .filter(
      (event) =>
        event.index === endingEvent!.index ||
        getActionResolutionTimeMs(event) <= endTimeMs,
    )
    .map((event, index) => ({
      ...event,
      index,
    }));
}

function getResolvedDurationMs(events: readonly BattleEvent[], fallbackDurationMs: number): number {
  if (events.length === 0) {
    return fallbackDurationMs;
  }

  return Math.max(...events.map(getActionResolutionTimeMs));
}

export function createBattlePlan(
  gladiators: readonly GladiatorClass[],
  teams?: Record<string, BattleTeamId>,
  requestedStartPositions?: Record<string, BattlePoint>,
): BattlePlan {
  if (gladiators.length < 2) {
    throw new Error("A battle needs at least two gladiators");
  }

  const resolvedTeams: Record<string, BattleTeamId> = teams
    ? { ...teams }
    : gladiators.reduce<Record<string, BattleTeamId>>((acc, gladiator, index) => {
        acc[gladiator.id] = index === 0 ? "left" : "right";
        return acc;
      }, {});

  for (const gladiator of gladiators) {
    if (!resolvedTeams[gladiator.id]) {
      throw new Error(`Missing team assignment for gladiator: ${gladiator.id}`);
    }
  }

  const distinctTeams = new Set(Object.values(resolvedTeams));
  if (distinctTeams.size < 2) {
    throw new Error("A battle needs at least two teams");
  }

  const fighters: Record<string, BattleFighterRuntime> = {};

  for (const gladiator of gladiators) {
    fighters[gladiator.id] = createRuntime(gladiator);
  }

  const startPositions = createStartPositions(gladiators, resolvedTeams, requestedStartPositions);
  const simulation = createActions(
    gladiators,
    fighters,
    startPositions,
    resolvedTeams,
  );
  const fighterIds = gladiators.map((gladiator) => gladiator.id);
  const events = trimEventsAfterDefeat(
    simulation.actions.map((action) => ({ ...action })),
    resolvedTeams,
    fighterIds,
  );
  const resolvedDurationMs = getResolvedDurationMs(events, simulation.durationMs);

  return {
    id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 10_000).toString(36)}`,
    durationMs: resolvedDurationMs,
    teams: resolvedTeams,
    winnerTeamId: simulation.winnerTeamId,
    loserTeamId: simulation.loserTeamId,
    winnerId: simulation.winnerId,
    loserId: simulation.loserId,
    fighters,
    startPositions,
    events,
  };
}
