import type { BattleCounterAttack, BattleEvent, BattlePlan } from "@gladiators/combat-sim";
import type { AttackPlayback } from "../gladiatorShowcaseTypes";
import type { BattleEventPlaybackContext, PlayDefenseReaction } from "./battleEventContext";
import { ACTION_MOTION_SCALE, ATTACK_TRANSFORM_MS, REACTION_SETTLE_MS } from "./playback";
import { clipMap } from "./renderer";
import { getPlanFighter } from "./resultUi";

export interface BattleStrikePlaybackController {
  playStrikeEvent: (plan: BattlePlan, event: BattleEvent, runId: number) => Promise<void>;
  playContestedStrikeEvent: (plan: BattlePlan, event: BattleEvent, runId: number) => Promise<void>;
}

export function createBattleStrikePlayback(
  {
    battleAudio,
    appendLog,
    getArenaSvg,
    getFighterClassId,
    getFighterElement,
    isEventBlockedByDefeat,
    isRunActive,
    markFighterDefeated,
    recordCrowdReaction,
    setHealth,
    showFloatingText,
    skeletons,
    wait,
  }: BattleEventPlaybackContext,
  playDefenseReaction: PlayDefenseReaction,
): BattleStrikePlaybackController {
  function startAttackAnimation(
    fighterId: string,
    attackCssClass: string,
  ): AttackPlayback | null {
    const element = getFighterElement(fighterId);
    const svg = getArenaSvg(fighterId);
    const clip = clipMap[attackCssClass];
    const skeleton = skeletons.get(fighterId);
    const durationMs = clip?.duration ?? Math.round(560 * ACTION_MOTION_SCALE);

    if (!element) {
      return null;
    }

    element.style.setProperty("--transform-duration", `${ATTACK_TRANSFORM_MS}ms`);
    element.classList.add("is-attacking");
    svg?.classList.add("attacking");

    return {
      element,
      svg,
      skeleton,
      animation: skeleton && clip ? skeleton.play(clip) : Promise.resolve(),
      durationMs,
    };
  }

  function finishAttackAnimation(playback: AttackPlayback | null): void {
    if (!playback) {
      return;
    }

    playback.svg?.classList.remove("attacking");
    playback.element.classList.remove("is-attacking", "is-interrupted");
  }

  function resolveStrikeImpact(plan: BattlePlan, event: BattleEvent): Promise<void> {
    const defenderEl = getFighterElement(event.defenderId);

    if (!defenderEl) {
      return Promise.resolve();
    }

    battleAudio.playAttack(event.attackCssClass);

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

      return Promise.resolve();
    }

    defenderEl.classList.add(event.outcome === "block" ? "is-blocking" : "is-evading");
    recordCrowdReaction(event);
    if (event.outcome === "block") {
      battleAudio.playBlock(getFighterClassId(event.defenderId));
    }
    showFloatingText(
      event.defenderId,
      event.outcome === "block" ? "Блок" : "Ухил",
      event.outcome,
    );
    return playDefenseReaction(event.defenderId, event.outcome);
  }

  function interruptCounterAttack(counterAttack: BattleCounterAttack): void {
    if (!counterAttack.canceled) {
      return;
    }

    const counterEl = getFighterElement(counterAttack.attackerId);
    const counterSvg = getArenaSvg(counterAttack.attackerId);

    counterEl?.classList.add("is-interrupted");
    counterEl?.classList.remove("is-attacking");
    counterSvg?.classList.remove("attacking");
    skeletons.get(counterAttack.attackerId)?.stop();
    showFloatingText(counterAttack.attackerId, "Зірвано", "interrupt");
  }

  async function playStrikeEvent(
    plan: BattlePlan,
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    const defenderEl = getFighterElement(event.defenderId);
    const attack = startAttackAnimation(event.attackerId, event.attackCssClass);

    if (!attack || !defenderEl) return;
    if (isEventBlockedByDefeat(event)) {
      finishAttackAnimation(attack);
      return;
    }

    await wait(event.impactDelayMs);
    if (!isRunActive(runId)) return;
    if (isEventBlockedByDefeat(event)) {
      finishAttackAnimation(attack);
      return;
    }

    const defenseAnimation = resolveStrikeImpact(plan, event);
    appendLog(event);

    await wait(Math.max(0, attack.durationMs - event.impactDelayMs));
    await Promise.all([attack.animation, defenseAnimation]);
    if (!isRunActive(runId)) return;

    finishAttackAnimation(attack);

    await wait(REACTION_SETTLE_MS);
    if (!isRunActive(runId)) return;
    defenderEl.classList.remove("is-hit", "is-critical-hit", "is-blocking", "is-evading");
  }

  async function playContestedStrikeEvent(
    plan: BattlePlan,
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    const defenderEl = getFighterElement(event.defenderId);
    const attack = startAttackAnimation(event.attackerId, event.attackCssClass);
    const counterAttack = event.counterAttack;
    const counter = counterAttack
      ? startAttackAnimation(counterAttack.attackerId, counterAttack.attackCssClass)
      : null;

    if (!attack || !counterAttack || !defenderEl) return;
    if (isEventBlockedByDefeat(event)) {
      finishAttackAnimation(attack);
      finishAttackAnimation(counter);
      return;
    }

    await wait(event.impactDelayMs);
    if (!isRunActive(runId)) return;
    if (isEventBlockedByDefeat(event)) {
      finishAttackAnimation(attack);
      finishAttackAnimation(counter);
      return;
    }

    interruptCounterAttack(counterAttack);
    const defenseAnimation = resolveStrikeImpact(plan, event);
    appendLog(event);

    const counterImpactMs = counterAttack.impactDelayMs;
    const recoveryMs = Math.max(
      360,
      Math.min(920, Math.max(attack.durationMs, counterImpactMs) - event.impactDelayMs + 260),
    );
    await wait(recoveryMs);
    await Promise.all([attack.animation, defenseAnimation]);
    if (!isRunActive(runId)) return;

    finishAttackAnimation(attack);
    finishAttackAnimation(counter);

    await wait(REACTION_SETTLE_MS);
    if (!isRunActive(runId)) return;
    defenderEl.classList.remove("is-hit", "is-critical-hit", "is-blocking", "is-evading");
    getFighterElement(counterAttack.attackerId)?.classList.remove(
      "is-hit",
      "is-critical-hit",
      "is-blocking",
      "is-evading",
      "is-interrupted",
    );
  }

  return {
    playStrikeEvent,
    playContestedStrikeEvent,
  };
}
