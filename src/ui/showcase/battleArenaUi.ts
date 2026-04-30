import type { Skeleton2D } from "../../animation/Skeleton2D";
import type { BattleEvent } from "@gladiators/combat-sim";
import { TEAM_IDS, type RuntimeGladiator, type TeamId } from "@gladiators/combat-sim";
import type { FloatingVariant } from "../gladiatorShowcaseTypes";
import type { BattleAudioController } from "./audio";
import { VELES_STARTING_JAVELINS } from "./playback";
import { getGladiatorName, getOutcomeText, getTacticText } from "./resultUi";
import { clampPercent } from "./training";

export interface BattleArenaUiContext {
  battleAudio: BattleAudioController;
  defeatedFighters: Set<string>;
  getArenaSvg: (fighterId: string) => SVGElement | null;
  getFighterElement: (fighterId: string) => HTMLElement | null;
  getRuntimeFighters: () => readonly RuntimeGladiator[];
  javelinCounts: Map<string, number>;
  logEl: HTMLElement;
  overlay: HTMLElement;
  skeletons: Map<string, Skeleton2D>;
  stopWalkLoop: (fighterId: string) => void;
}

export interface BattleArenaUiController {
  appendLog: (event: BattleEvent) => void;
  disableNettedFighter: (fighterId: string) => void;
  isEventBlockedByDefeat: (event: BattleEvent) => boolean;
  markFighterDefeated: (fighterId: string) => void;
  recordCrowdReaction: (event: BattleEvent) => void;
  resetArenaNets: () => void;
  resetCrowdReactionCounters: () => void;
  resetFighterClasses: () => void;
  setHandJavelinCount: (fighterId: string, count: number, options?: { handReady?: boolean }) => void;
  setHandNetVisible: (fighterId: string, visible: boolean) => void;
  setHealth: (id: string, hp: number, maxHp: number) => void;
  showFloatingText: (fighterId: string, text: string, variant: FloatingVariant) => void;
  updateFatigueVisuals: (event: BattleEvent) => void;
}

export function createBattleArenaUi({
  battleAudio,
  defeatedFighters,
  getArenaSvg,
  getFighterElement,
  getRuntimeFighters,
  javelinCounts,
  logEl,
  overlay,
  skeletons,
  stopWalkLoop,
}: BattleArenaUiContext): BattleArenaUiController {
  const successfulHitStreaks = new Map<string, number>();
  const successfulDodgeStreaks = new Map<string, number>();

  function markFighterDefeated(fighterId: string): void {
    if (defeatedFighters.has(fighterId)) {
      return;
    }

    defeatedFighters.add(fighterId);
    stopWalkLoop(fighterId);

    const fighterEl = getFighterElement(fighterId);
    const fighterSvg = getArenaSvg(fighterId);

    fighterSvg?.classList.remove("attacking");
    fighterEl?.classList.remove("is-attacking", "is-walking", "is-rushing", "is-netted", "is-winded");
    fighterEl?.classList.add("is-defeated");
    overlay
      .querySelector<HTMLElement>(`[data-team-fighter="${fighterId}"]`)
      ?.classList.add("is-defeated");
  }

  function isEventBlockedByDefeat(event: BattleEvent): boolean {
    return defeatedFighters.has(event.attackerId) || defeatedFighters.has(event.defenderId);
  }

  function setHandNetVisible(fighterId: string, visible: boolean): void {
    const net = overlay.querySelector<SVGGElement>(
      `#arena-svg-${fighterId} [data-bone="net"]`,
    );

    if (net) {
      net.style.opacity = visible ? "" : "0";
      net.style.pointerEvents = visible ? "" : "none";
    }
  }

  function resetAllHandNets(): void {
    for (const fighter of getRuntimeFighters()) {
      if (fighter.classId === "retiarius") {
        setHandNetVisible(fighter.id, true);
      }
    }
  }

  function setHandJavelinCount(
    fighterId: string,
    count: number,
    options: { handReady?: boolean } = {},
  ): void {
    const clamped = Math.max(0, Math.min(VELES_STARTING_JAVELINS, count));
    const handReady = options.handReady ?? clamped > 0;
    const hand = overlay.querySelector<SVGGElement>(
      `#arena-svg-${fighterId} [data-javelin-hand="true"]`,
    );
    const reserveTwo = overlay.querySelector<SVGGElement>(
      `#arena-svg-${fighterId} [data-javelin-reserve="2"]`,
    );
    const reserveThree = overlay.querySelector<SVGGElement>(
      `#arena-svg-${fighterId} [data-javelin-reserve="3"]`,
    );

    if (hand) {
      hand.style.opacity = handReady && clamped >= 1 ? "" : "0";
      hand.style.pointerEvents = handReady && clamped >= 1 ? "" : "none";
    }

    if (reserveTwo) {
      reserveTwo.style.opacity = clamped >= (handReady ? 2 : 1) ? "" : "0";
    }

    if (reserveThree) {
      reserveThree.style.opacity = clamped >= (handReady ? 3 : 2) ? "" : "0";
    }

    javelinCounts.set(fighterId, clamped);
  }

  function resetAllHandJavelins(): void {
    for (const fighter of getRuntimeFighters()) {
      if (fighter.classId === "veles") {
        setHandJavelinCount(fighter.id, VELES_STARTING_JAVELINS);
      }
    }
  }

  function resetArenaNets(): void {
    overlay.querySelectorAll<HTMLElement>(".combat-net, .combat-javelin").forEach((throwable) => {
      throwable.remove();
    });
    resetAllHandNets();
    resetAllHandJavelins();
  }

  function disableNettedFighter(fighterId: string): void {
    const fighterEl = getFighterElement(fighterId);
    const fighterSvg = getArenaSvg(fighterId);

    stopWalkLoop(fighterId);
    skeletons.get(fighterId)?.stop();
    fighterSvg?.classList.remove("attacking");
    fighterEl?.classList.remove(
      "is-walking",
      "is-rushing",
      "is-attacking",
      "is-interrupted",
      "is-hit",
      "is-critical-hit",
      "is-blocking",
      "is-evading",
    );
  }

  function setHealth(id: string, hp: number, maxHp: number): void {
    const fills = overlay.querySelectorAll<HTMLElement>(`[data-health-fill="${id}"]`);
    const texts = overlay.querySelectorAll<HTMLElement>(`[data-health-text="${id}"]`);
    const compactTexts = overlay.querySelectorAll<HTMLElement>(`[data-health-compact="${id}"]`);
    const percentTexts = overlay.querySelectorAll<HTMLElement>(`[data-health-percent="${id}"]`);
    const currentHp = Math.max(0, Math.ceil(hp));
    const percent = maxHp > 0 ? clampPercent((hp / maxHp) * 100) : 0;

    fills.forEach((fill) => {
      fill.style.width = `${percent}%`;
      fill.dataset["danger"] = percent <= 28 ? "true" : "false";
    });

    texts.forEach((text) => {
      text.textContent = `${currentHp} / ${maxHp} HP`;
    });

    compactTexts.forEach((text) => {
      text.textContent = `${currentHp} HP`;
    });

    percentTexts.forEach((text) => {
      text.textContent = `${Math.round(percent)}%`;
    });
  }

  function resetCrowdReactionCounters(): void {
    successfulHitStreaks.clear();
    successfulDodgeStreaks.clear();

    for (const fighter of getRuntimeFighters()) {
      successfulHitStreaks.set(fighter.id, 0);
      successfulDodgeStreaks.set(fighter.id, 0);
    }
  }

  function resetFighterHitStreak(fighterId: string): void {
    successfulHitStreaks.set(fighterId, 0);
  }

  function recordSuccessfulHit(fighterId: string): void {
    const nextStreak = (successfulHitStreaks.get(fighterId) ?? 0) + 1;
    successfulHitStreaks.set(fighterId, nextStreak);

    if (nextStreak === 2) {
      void battleAudio.playApplause("low");
    } else if (nextStreak === 3) {
      void battleAudio.playApplause("high");
    }
  }

  function resetFighterDodgeStreak(fighterId: string): void {
    successfulDodgeStreaks.set(fighterId, 0);
  }

  function recordSuccessfulDodge(fighterId: string, forceApplause: boolean): void {
    const nextStreak = (successfulDodgeStreaks.get(fighterId) ?? 0) + 1;
    successfulDodgeStreaks.set(fighterId, nextStreak);

    if (forceApplause || nextStreak === 2) {
      void battleAudio.playApplause("medium");
    }
  }

  function recordCrowdReaction(event: BattleEvent): void {
    if (event.actionType === "strike" || event.actionType === "javelin") {
      if (event.outcome === "hit") {
        recordSuccessfulHit(event.attackerId);
        resetFighterDodgeStreak(event.defenderId);
        return;
      }

      resetFighterHitStreak(event.attackerId);

      if (event.outcome === "miss") {
        recordSuccessfulDodge(event.defenderId, false);
      } else {
        resetFighterDodgeStreak(event.defenderId);
      }

      return;
    }

    if (event.actionType === "net" && event.netTrap) {
      resetFighterHitStreak(event.attackerId);

      if (event.netTrap.escaped) {
        recordSuccessfulDodge(event.defenderId, true);
      } else {
        resetFighterDodgeStreak(event.defenderId);
      }
    }
  }

  function resetFighterClasses(): void {
    overlay.querySelectorAll<HTMLElement>(".battle-fighter").forEach((fighter) => {
      const fighterId = fighter.dataset["fighter"];
      if (fighterId) {
        stopWalkLoop(fighterId);
      }

      fighter.classList.remove(
        "is-attacking",
        "is-interrupted",
        "is-winded",
        "is-walking",
        "is-rushing",
        "is-hit",
        "is-critical-hit",
        "is-blocking",
        "is-evading",
        "is-netted",
        "is-victorious",
        "is-defeated",
      );
    });

    overlay.querySelectorAll<HTMLElement>(".battle-team-panel").forEach((panel) => {
      panel.classList.remove("is-winded", "is-victorious", "is-defeated");
    });
  }

  function showFloatingText(
    fighterId: string,
    text: string,
    variant: FloatingVariant,
  ): void {
    const floatEl = overlay.querySelector<HTMLElement>(`[data-float="${fighterId}"]`);
    if (!floatEl) return;

    floatEl.className = "floating-damage";
    floatEl.textContent = text;
    void floatEl.offsetWidth;
    floatEl.classList.add("show", `floating-${variant}`);
  }

  function appendLog(event: BattleEvent): void {
    const row = document.createElement("div");
    row.className = `battle-log-row battle-log-${
      event.actionType === "javelin" ? "javelin" : event.netTrap ? "net" : event.outcome
    }`;
    const counterText = event.counterAttack
      ? ` · зірвав ${getGladiatorName(event.counterAttack.attackerId)}`
      : "";
    const windedNames = event.fatigue
      .filter((snapshot) => snapshot.winded)
      .map((snapshot) => getGladiatorName(snapshot.fighterId));
    const fatigueText = windedNames.length > 0 ? ` · віддих: ${windedNames.join(", ")}` : "";
    const attackerDecision = event.decisions.find(
      (decision) => decision.fighterId === event.attackerId,
    );
    const defenderDecision = event.decisions.find(
      (decision) => decision.fighterId === event.defenderId,
    );
    const tacticText =
      attackerDecision && defenderDecision
        ? ` · план: ${getTacticText(attackerDecision.tactic)} / ${getTacticText(
            defenderDecision.tactic,
          )}`
        : "";
    row.textContent = `${(event.timeMs / 1_000).toFixed(1)} с · ${getGladiatorName(
      event.attackerId,
    )}: ${event.attackName}${counterText} · ${getOutcomeText(event)}${tacticText}${fatigueText}`;
    logEl.prepend(row);
    updateFatigueVisuals(event);

    while (logEl.children.length > 6) {
      logEl.lastElementChild?.remove();
    }
  }

  function updateFatigueVisuals(event: BattleEvent): void {
    for (const fighter of getRuntimeFighters()) {
      getFighterElement(fighter.id)?.classList.remove("is-winded");
    }

    const teamWinded: Record<TeamId, boolean> = { left: false, right: false };
    for (const snapshot of event.fatigue) {
      if (snapshot.winded) {
        getFighterElement(snapshot.fighterId)?.classList.add("is-winded");
        const fighter = getRuntimeFighters().find((item) => item.id === snapshot.fighterId);
        if (fighter) {
          teamWinded[fighter.teamId] = true;
        }
      }
    }

    for (const teamId of TEAM_IDS) {
      overlay
        .querySelector<HTMLElement>(`[data-team-panel="${teamId}"]`)
        ?.classList.toggle("is-winded", teamWinded[teamId]);
    }
  }

  return {
    appendLog,
    disableNettedFighter,
    isEventBlockedByDefeat,
    markFighterDefeated,
    recordCrowdReaction,
    resetArenaNets,
    resetCrowdReactionCounters,
    resetFighterClasses,
    setHandJavelinCount,
    setHandNetVisible,
    setHealth,
    showFloatingText,
    updateFatigueVisuals,
  };
}
