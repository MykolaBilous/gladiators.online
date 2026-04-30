import type { BattleEvent } from "@gladiators/combat-sim";
import { TEAM_IDS, type RuntimeGladiator, type TeamId } from "@gladiators/combat-sim";
import type { BattleAudioController } from "./audio";
import { getGladiatorName, getOutcomeText, getTacticText } from "./resultUi";
import { clampPercent } from "./training";

export interface BattleArenaUiContext {
  battleAudio: BattleAudioController;
  getRuntimeFighters: () => readonly RuntimeGladiator[];
  logEl: HTMLElement;
  overlay: HTMLElement;
}

export interface BattleArenaUiController {
  appendLog: (event: BattleEvent) => void;
  markFighterDefeated: (fighterId: string) => void;
  recordCrowdReaction: (event: BattleEvent) => void;
  resetCrowdReactionCounters: () => void;
  resetFighterClasses: () => void;
  setHealth: (id: string, hp: number, maxHp: number) => void;
}

export function createBattleArenaUi({
  battleAudio,
  getRuntimeFighters,
  logEl,
  overlay,
}: BattleArenaUiContext): BattleArenaUiController {
  const successfulHitStreaks = new Map<string, number>();
  const successfulDodgeStreaks = new Map<string, number>();

  function markFighterDefeated(fighterId: string): void {
    overlay
      .querySelector<HTMLElement>(`[data-team-fighter="${fighterId}"]`)
      ?.classList.add("is-defeated");
  }

  function setHealth(id: string, hp: number, maxHp: number): void {
    const fills = overlay.querySelectorAll<HTMLElement>(`[data-health-fill="${id}"]`);
    const texts = overlay.querySelectorAll<HTMLElement>(`[data-health-text="${id}"]`);
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
    overlay.querySelectorAll<HTMLElement>(".battle-team-panel").forEach((panel) => {
      panel.classList.remove("is-winded", "is-victorious", "is-defeated");
    });
    overlay.querySelectorAll<HTMLElement>("[data-team-fighter]").forEach((fighter) => {
      fighter.classList.remove("is-victorious", "is-defeated");
    });
  }

  function updateTeamFatigueClasses(event: BattleEvent): void {
    const teamWinded: Record<TeamId, boolean> = { left: false, right: false };
    for (const snapshot of event.fatigue) {
      if (snapshot.winded) {
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
    updateTeamFatigueClasses(event);

    while (logEl.children.length > 6) {
      logEl.lastElementChild?.remove();
    }
  }

  return {
    appendLog,
    markFighterDefeated,
    recordCrowdReaction,
    resetCrowdReactionCounters,
    resetFighterClasses,
    setHealth,
  };
}
