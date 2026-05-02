import { loadBattleReplay, recordBattleReplay } from "../../api/battleReplayClient";
import type { BattleReplayRecord, BattleReplaySetup } from "@gladiators/combat-sim";
import { createBattlePlan } from "@gladiators/combat-sim";
import type { BattleEvent, BattlePlan, BattlePoint } from "@gladiators/combat-sim";
import { buildTeamMap, type Roster, type RuntimeGladiator } from "@gladiators/combat-sim";
import type { BattleResultStats } from "../gladiatorShowcaseTypes";
import type { BattleAudioController } from "./audio";
import {
  createBattleResultStats,
  getBattleEventsByResolution,
  getPlanFighter,
  isCombatEvent,
  renderBattleResult as renderBattleResultUi,
  showBattleFinale as showBattleFinaleUi,
} from "./resultUi";

export interface BattleLifecycleState {
  activeBattlePlan: BattlePlan | null;
  currentRun: number;
  disposed: boolean;
  isBattleComplete: boolean;
  isBattlePlaying: boolean;
}

export interface BattleLifecycleController {
  handleBattleClick: () => Promise<void>;
  showBattleResultsNow: () => void;
}

export interface BattleWindowHandle {
  startPlayback: () => void;
  battleComplete: Promise<void>;
}

export interface BattleLifecycleContext {
  appendLog: (event: BattleEvent) => void;
  battleAudio: BattleAudioController;
  battleSeedInput: HTMLInputElement;
  battleSeedMatchValueEl: HTMLElement;
  canStartBattle: () => boolean;
  clearPendingTimers: (resolveWaits: boolean) => void;
  createCurrentBattleReplaySetup: () => BattleReplaySetup;
  getActiveRoster: () => Roster;
  getCurrentGladiators: () => readonly RuntimeGladiator[];
  getCurrentSpawnPositions: () => Record<string, BattlePoint>;
  getRequestedBattleSeed: () => string | undefined;
  logEl: HTMLElement;
  markFighterDefeated: (fighterId: string) => void;
  overlay: HTMLElement;
  prepareNextBattleWithCurrentSettings: () => void;
  playBattleWindow?: (plan: BattlePlan) => Promise<BattleWindowHandle>;
  freezeBattleWindow?: () => void;
  resetBattleUi: (plan: BattlePlan) => void;
  resetBattleUiClasses: () => void;
  resetToInitialState: () => void;
  restoreBattleReplaySetup: (replay: BattleReplayRecord) => void;
  resultEl: HTMLElement;
  setHealth: (fighterId: string, hp: number, maxHp: number) => void;
  stageEl: HTMLElement;
  state: BattleLifecycleState;
  statusEl: HTMLElement;
  syncBattleButtonState: () => void;
  timers: Map<number, (() => void) | null>;
  wait: (ms: number) => Promise<void>;
}

export function createBattleLifecycleController({
  appendLog,
  battleAudio,
  battleSeedInput,
  battleSeedMatchValueEl,
  canStartBattle,
  clearPendingTimers,
  createCurrentBattleReplaySetup,
  getActiveRoster,
  getCurrentGladiators,
  getCurrentSpawnPositions,
  getRequestedBattleSeed,
  logEl,
  markFighterDefeated,
  overlay,
  prepareNextBattleWithCurrentSettings,
  playBattleWindow,
  freezeBattleWindow,
  resetBattleUi,
  resetBattleUiClasses,
  resetToInitialState,
  restoreBattleReplaySetup,
  resultEl,
  setHealth,
  stageEl,
  state,
  statusEl,
  syncBattleButtonState,
  timers,
  wait,
}: BattleLifecycleContext): BattleLifecycleController {
  function renderBattleResult(plan: BattlePlan, stats: BattleResultStats): void {
    renderBattleResultUi(resultEl, plan, stats);
  }

  function showBattleFinale(plan: BattlePlan, stats: BattleResultStats): void {
    showBattleFinaleUi(
      {
        stageEl,
        timers,
        handleBattleClick,
        prepareNextBattleWithCurrentSettings,
        replayBattle: () => {
          state.isBattleComplete = false;
          return playBattlePlan(plan);
        },
      },
      plan,
      stats,
    );
  }

  function applyBattlePlanInstantly(plan: BattlePlan): void {
    resetBattleUiClasses();
    logEl.replaceChildren();

    for (const fighterId of Object.keys(plan.fighters)) {
      const fighter = getPlanFighter(plan, fighterId);
      setHealth(fighterId, fighter.maxHp, fighter.maxHp);
    }

    for (const event of getBattleEventsByResolution(plan)) {
      if (event.outcome === "hit") {
        setHealth(
          event.defenderId,
          event.defenderHp,
          getPlanFighter(plan, event.defenderId).maxHp,
        );
      }

      if (isCombatEvent(event)) {
        appendLog(event);
      }
    }
  }

  function finishBattle(plan: BattlePlan): void {
    const stats = createBattleResultStats(plan);

    overlay
      .querySelector<HTMLElement>(`[data-team-panel="${plan.winnerTeamId}"]`)
      ?.classList.add("is-victorious");
    overlay
      .querySelector<HTMLElement>(`[data-team-panel="${plan.loserTeamId}"]`)
      ?.classList.add("is-defeated");

    for (const fighterId of Object.keys(plan.fighters)) {
      const finalHp = stats.finalHpByFighter[fighterId] ?? 0;
      const fighter = getPlanFighter(plan, fighterId);
      const teamId = plan.teams[fighterId];

      setHealth(fighterId, finalHp, fighter.maxHp);

      if (finalHp <= 0) {
        markFighterDefeated(fighterId);
      } else if (teamId === plan.winnerTeamId) {
        overlay
          .querySelector<HTMLElement>(`[data-team-fighter="${fighterId}"]`)
          ?.classList.add("is-victorious");
      }
    }

    statusEl.textContent = "Бій завершено.";
    battleSeedMatchValueEl.textContent = plan.seed;
    battleSeedInput.value = "";
    renderBattleResult(plan, stats);
    showBattleFinale(plan, stats);
    battleAudio.playFinaleAndStop();
    state.isBattleComplete = true;
    state.isBattlePlaying = false;
    state.activeBattlePlan = null;
    syncBattleButtonState();
  }

  function showBattleResultsNow(): void {
    const plan = state.activeBattlePlan;

    if (!state.isBattlePlaying || !plan) {
      return;
    }

    state.currentRun += 1;
    clearPendingTimers(true);
    battleAudio.stopAll();
    freezeBattleWindow?.();
    state.isBattlePlaying = false;
    applyBattlePlanInstantly(plan);
    finishBattle(plan);
  }

  async function playBattlePlan(plan: BattlePlan): Promise<void> {
    const runId = state.currentRun + 1;
    state.currentRun = runId;
    state.isBattlePlaying = true;
    state.activeBattlePlan = plan;
    syncBattleButtonState();
    battleSeedMatchValueEl.textContent = "-";
    resetBattleUi(plan);
    const windowHandle = await playBattleWindow?.(plan);

    if (state.disposed || runId !== state.currentRun) return;

    try {
      battleAudio.startBattle();
      windowHandle?.startPlayback();

      await (windowHandle?.battleComplete ?? Promise.resolve());

      if (!state.disposed && runId === state.currentRun) {
        finishBattle(plan);
      }
    } finally {
      if (!state.disposed && runId === state.currentRun) {
        state.isBattlePlaying = false;
        state.activeBattlePlan = null;
        syncBattleButtonState();
      }
    }
  }

  async function handleBattleClick(): Promise<void> {
    if (state.isBattlePlaying) return;

    if (state.isBattleComplete) {
      resetToInitialState();
      return;
    }

    if (!canStartBattle()) {
      syncBattleButtonState();
      return;
    }

    const requestedSeed = getRequestedBattleSeed();

    if (requestedSeed) {
      const replay = await loadBattleReplay(requestedSeed).catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.warn("Battle replay lookup failed.", error);
        }

        return null;
      });

      if (replay) {
        restoreBattleReplaySetup(replay);
        battleSeedInput.value = replay.seed;
        await playBattlePlan(replay.plan);
        return;
      }
    }

    const teams = buildTeamMap(getActiveRoster());
    const setup = createCurrentBattleReplaySetup();
    const plan = createBattlePlan(getCurrentGladiators(), teams, getCurrentSpawnPositions(), {
      seed: requestedSeed,
    });
    battleSeedInput.value = plan.seed;
    recordBattleReplay(plan, setup);
    await playBattlePlan(plan);
  }

  return {
    handleBattleClick,
    showBattleResultsNow,
  };
}
