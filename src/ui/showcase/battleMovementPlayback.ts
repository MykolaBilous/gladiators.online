import type { BattleEvent, BattlePoint } from "@gladiators/combat-sim";
import type { DefenseOutcome } from "../gladiatorShowcaseTypes";
import type { BattleEventPlaybackContext, PlayDefenseReaction } from "./battleEventContext";
import { UI_MIN_MOVEMENT_DISTANCE, getPointDistance } from "./playback";
import { defenseClipMap, walkClipMap } from "./renderer";

export interface BattleMovementPlaybackController {
  moveFightersForEvent: (event: BattleEvent, runId: number) => Promise<void>;
  playDefenseReaction: PlayDefenseReaction;
}

export function createBattleMovementPlayback({
  getFighterClassId,
  getFighterElement,
  isRunActive,
  setFighterArenaPosition,
  skeletons,
  stopWalkLoop,
  wait,
  walkTokens,
}: BattleEventPlaybackContext): BattleMovementPlaybackController {
  function startWalkLoop(
    fighterId: string,
    runId: number,
    speedMultiplier: number,
  ): void {
    const fighterEl = getFighterElement(fighterId);
    const skeleton = skeletons.get(fighterId);
    const clip = walkClipMap[getFighterClassId(fighterId)];
    const token = (walkTokens.get(fighterId) ?? 0) + 1;

    walkTokens.set(fighterId, token);
    fighterEl?.classList.add("is-walking");
    fighterEl?.style.setProperty(
      "--walk-cycle",
      `${Math.max(460, Math.round((clip?.duration ?? 760) / speedMultiplier))}ms`,
    );

    if (!skeleton || !clip) return;

    const walkClip = {
      ...clip,
      duration: Math.max(460, Math.round(clip.duration / speedMultiplier)),
    };

    void (async () => {
      while (isRunActive(runId) && walkTokens.get(fighterId) === token) {
        await skeleton.play(walkClip);
      }
    })();
  }

  async function moveFighterTo(
    fighterId: string,
    from: BattlePoint,
    to: BattlePoint,
    durationMs: number,
    runId: number,
    rush: boolean,
  ): Promise<void> {
    const distance = getPointDistance(from, to);

    if (distance < UI_MIN_MOVEMENT_DISTANCE || durationMs <= 0) {
      setFighterArenaPosition(fighterId, to, 0);
      return;
    }

    const fighterEl = getFighterElement(fighterId);
    const speedMultiplier = rush ? 1.06 : 0.72;

    if (rush) {
      fighterEl?.classList.add("is-rushing");
    }

    startWalkLoop(fighterId, runId, speedMultiplier);
    setFighterArenaPosition(fighterId, to, durationMs);
    await wait(durationMs);

    if (!isRunActive(runId)) return;

    stopWalkLoop(fighterId);
    setFighterArenaPosition(fighterId, to, 0);
  }

  async function moveFightersForEvent(event: BattleEvent, runId: number): Promise<void> {
    const { movement } = event;
    const moves = [
      moveFighterTo(
        event.attackerId,
        movement.attackerFrom,
        movement.attackerTo,
        movement.attackerDurationMs,
        runId,
        movement.rush,
      ),
    ];

    if (
      movement.defenderDurationMs > 0 ||
      getPointDistance(movement.defenderFrom, movement.defenderTo) >= UI_MIN_MOVEMENT_DISTANCE
    ) {
      moves.push(
        moveFighterTo(
          event.defenderId,
          movement.defenderFrom,
          movement.defenderTo,
          movement.defenderDurationMs,
          runId,
          movement.defenderRush,
        ),
      );
    }

    await Promise.all(moves);
  }

  function playDefenseReaction(
    fighterId: string,
    outcome: DefenseOutcome,
  ): Promise<void> {
    const skeleton = skeletons.get(fighterId);
    const clip = defenseClipMap[getFighterClassId(fighterId)]?.[outcome];

    return skeleton && clip ? skeleton.play(clip) : Promise.resolve();
  }

  return {
    moveFightersForEvent,
    playDefenseReaction,
  };
}
