import type { BattleEvent, BattlePlan } from "../../combat/battleTypes";
import type { BattleEventPlaybackContext, BattleEventPlaybackController } from "./battleEventContext";
import { createBattleMovementPlayback } from "./battleMovementPlayback";
import { createBattleStrikePlayback } from "./battleStrikePlayback";
import { createBattleThrowPlayback } from "./battleThrowPlayback";

export type { BattleEventPlaybackContext, BattleEventPlaybackController } from "./battleEventContext";

export function createBattleEventPlayback(
  context: BattleEventPlaybackContext,
): BattleEventPlaybackController {
  const movementPlayback = createBattleMovementPlayback(context);
  const throwPlayback = createBattleThrowPlayback(
    context,
    movementPlayback.playDefenseReaction,
  );
  const strikePlayback = createBattleStrikePlayback(
    context,
    movementPlayback.playDefenseReaction,
  );

  async function playBattleEvent(
    plan: BattlePlan,
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    if (context.isEventBlockedByDefeat(event)) return;

    await movementPlayback.moveFightersForEvent(event, runId);
    if (!context.isRunActive(runId)) return;
    if (context.isEventBlockedByDefeat(event)) return;

    if (event.actionType === "move" || event.actionType === "recover") {
      context.updateFatigueVisuals(event);
      return;
    }

    if (event.netTrap) {
      await throwPlayback.playNetThrowEvent(event, runId);
      return;
    }

    if (event.actionType === "javelin") {
      await throwPlayback.playJavelinThrowEvent(plan, event, runId);
      return;
    }

    if (event.counterAttack) {
      await strikePlayback.playContestedStrikeEvent(plan, event, runId);
      return;
    }

    await strikePlayback.playStrikeEvent(plan, event, runId);
  }

  return { playBattleEvent };
}
