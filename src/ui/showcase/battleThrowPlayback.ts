import type { BattleEvent, BattlePlan } from "../../combat/battleTypes";
import type { BattleEventPlaybackContext, PlayDefenseReaction } from "./battleEventContext";
import {
  ACTION_MOTION_SCALE,
  ATTACK_TRANSFORM_MS,
  NET_DROP_MS,
  NET_FLIGHT_MS,
  REACTION_SETTLE_MS,
  VELES_STARTING_JAVELINS,
  formatDuration,
} from "./playback";
import { clipMap } from "./renderer";
import { getPlanFighter } from "./resultUi";

export interface BattleThrowPlaybackController {
  playNetThrowEvent: (event: BattleEvent, runId: number) => Promise<void>;
  playJavelinThrowEvent: (plan: BattlePlan, event: BattleEvent, runId: number) => Promise<void>;
}

export function createBattleThrowPlayback(
  {
    battleAudio,
    disableNettedFighter,
    appendLog,
    getArenaSvg,
    getFighterClassId,
    getFighterElement,
    isEventBlockedByDefeat,
    isRunActive,
    javelinCounts,
    markFighterDefeated,
    recordCrowdReaction,
    setHandJavelinCount,
    setHandNetVisible,
    setHealth,
    showFloatingText,
    skeletons,
    throwables,
    wait,
  }: BattleEventPlaybackContext,
  playDefenseReaction: PlayDefenseReaction,
): BattleThrowPlaybackController {
  async function playNetThrowEvent(
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    const netTrap = event.netTrap;
    const attackerEl = getFighterElement(event.attackerId);
    const defenderEl = getFighterElement(event.defenderId);
    const attackerSvg = getArenaSvg(event.attackerId);
    const clip = clipMap[event.attackCssClass];
    const skeleton = skeletons.get(event.attackerId);
    const clipDuration = clip?.duration ?? Math.round(620 * ACTION_MOTION_SCALE);

    if (!netTrap || !attackerEl || !defenderEl) return;
    if (isEventBlockedByDefeat(event)) return;

    attackerEl.style.setProperty("--transform-duration", `${ATTACK_TRANSFORM_MS}ms`);
    attackerEl.classList.add("is-attacking");
    attackerSvg?.classList.add("attacking");
    const animation = skeleton && clip ? skeleton.play(clip) : Promise.resolve();
    let defenseAnimation: Promise<void> = Promise.resolve();
    const finishNetThrow = (): void => {
      attackerSvg?.classList.remove("attacking");
      attackerEl.classList.remove("is-attacking");
      skeleton?.stop();
    };

    await wait(Math.round(clipDuration * 0.38));
    if (!isRunActive(runId)) return;
    if (isEventBlockedByDefeat(event)) {
      finishNetThrow();
      return;
    }

    battleAudio.playAttack(event.attackCssClass);
    setHandNetVisible(event.attackerId, false);
    const flyingNet = await throwables.flyNetToTarget(event, runId);
    if (!flyingNet || !isRunActive(runId)) {
      finishNetThrow();
      return;
    }

    if (netTrap.escaped) {
      defenderEl.classList.add("is-evading");
      recordCrowdReaction(event);
      defenseAnimation = playDefenseReaction(event.defenderId, "miss");
      showFloatingText(event.defenderId, "Ухил", "miss");
      appendLog(event);
      void throwables.dropStageNet(flyingNet, throwables.getFighterArenaWorldPoint(event.defenderId, "ground"), runId);
    } else {
      recordCrowdReaction(event);
      disableNettedFighter(event.defenderId);
      flyingNet.remove();
      throwables.attachCaughtNet(event.defenderId);
      defenderEl.classList.add("is-netted");
      showFloatingText(event.defenderId, formatDuration(netTrap.durationMs), "net");
      appendLog(event);
      throwables.scheduleNetRelease(
        event.defenderId,
        Math.max(NET_DROP_MS, netTrap.durationMs - Math.round(clipDuration * 0.38) - NET_FLIGHT_MS),
        runId,
      );
    }

    await wait(Math.round(clipDuration * 0.22));
    await Promise.all([animation, defenseAnimation]);
    if (!isRunActive(runId)) return;

    finishNetThrow();

    await wait(REACTION_SETTLE_MS);
    if (!isRunActive(runId)) return;
    defenderEl.classList.remove("is-evading");
  }

  async function playJavelinThrowEvent(
    plan: BattlePlan,
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    const attackerEl = getFighterElement(event.attackerId);
    const defenderEl = getFighterElement(event.defenderId);
    const attackerSvg = getArenaSvg(event.attackerId);
    const clip = clipMap[event.attackCssClass];
    const skeleton = skeletons.get(event.attackerId);
    const clipDuration = clip?.duration ?? Math.round(720 * ACTION_MOTION_SCALE);
    const releaseDelayMs = throwables.getJavelinReleaseDelayMs(clipDuration, event.impactDelayMs);
    const flightMs = Math.max(180, event.impactDelayMs - releaseDelayMs);

    if (!attackerEl || !defenderEl) return;
    if (isEventBlockedByDefeat(event)) return;

    attackerEl.style.setProperty("--transform-duration", `${ATTACK_TRANSFORM_MS}ms`);
    attackerEl.classList.add("is-attacking");
    attackerSvg?.classList.add("attacking");
    const animation = skeleton && clip ? skeleton.play(clip) : Promise.resolve();
    let defenseAnimation: Promise<void> = Promise.resolve();
    let remainingAfterRelease: number | null = null;
    const finishJavelinThrow = (): void => {
      attackerSvg?.classList.remove("attacking");
      attackerEl.classList.remove("is-attacking");
      skeleton?.stop();

      if (remainingAfterRelease !== null && isRunActive(runId)) {
        setHandJavelinCount(event.attackerId, remainingAfterRelease);
      }
    };

    await wait(releaseDelayMs);
    if (!isRunActive(runId)) return;
    if (isEventBlockedByDefeat(event)) {
      finishJavelinThrow();
      return;
    }

    battleAudio.playAttack(event.attackCssClass);
    const remaining = Math.max(
      0,
      (javelinCounts.get(event.attackerId) ?? VELES_STARTING_JAVELINS) - 1,
    );
    remainingAfterRelease = remaining;
    setHandJavelinCount(event.attackerId, remaining, { handReady: false });
    const flyingJavelin =
      event.outcome === "miss"
        ? await throwables.flyJavelinPastMiss(event, runId, flightMs)
        : await throwables.flyJavelinToTarget(event, runId, flightMs);
    if (!flyingJavelin || !isRunActive(runId)) {
      finishJavelinThrow();
      return;
    }

    if (event.outcome === "hit") {
      const defender = getPlanFighter(plan, event.defenderId);
      recordCrowdReaction(event);
      if (event.damage > 0) {
        battleAudio.playBlood();
      }
      defenderEl.classList.add(event.critical ? "is-critical-hit" : "is-hit");
      setHealth(event.defenderId, event.defenderHp, defender.maxHp);
      showFloatingText(
        event.defenderId,
        event.critical ? `-${event.damage}!` : `-${event.damage}`,
        "hit",
      );

      if (event.defenderHp <= 0) {
        markFighterDefeated(event.defenderId);
      }

      appendLog(event);
      void throwables.dropStageJavelin(
        flyingJavelin,
        throwables.getFighterArenaWorldPoint(event.defenderId, "ground"),
        runId,
      );
    } else if (event.outcome === "block") {
      defenderEl.classList.add("is-blocking");
      recordCrowdReaction(event);
      battleAudio.playBlock(getFighterClassId(event.defenderId));
      defenseAnimation = playDefenseReaction(event.defenderId, "block");
      showFloatingText(event.defenderId, "Блок", "block");
      appendLog(event);
      void throwables.dropStageJavelin(
        flyingJavelin,
        throwables.getFighterArenaWorldPoint(event.defenderId, "ground"),
        runId,
      );
    } else {
      defenderEl.classList.add("is-evading");
      recordCrowdReaction(event);
      defenseAnimation = playDefenseReaction(event.defenderId, "miss");
      showFloatingText(event.defenderId, "Ухил", "miss");
      appendLog(event);
      void throwables.removeEscapedJavelinAfterExit(flyingJavelin, runId);
    }

    await wait(Math.max(0, clipDuration - event.impactDelayMs));
    await Promise.all([animation, defenseAnimation]);
    if (!isRunActive(runId)) return;

    finishJavelinThrow();

    await wait(REACTION_SETTLE_MS);
    if (!isRunActive(runId)) return;
    defenderEl.classList.remove("is-hit", "is-critical-hit", "is-blocking", "is-evading");
  }

  return {
    playNetThrowEvent,
    playJavelinThrowEvent,
  };
}
