import { loadBattleReplay, recordBattleReplay } from "../../combat/battleSeedRecorder";
import type { BattleReplayRecord, BattleReplaySetup } from "../../combat/battleReplayTypes";
import { createBattlePlan } from "../../combat/battleSimulator";
import type { BattleEvent, BattlePlan, BattlePoint } from "../../combat/battleTypes";
import { buildTeamMap, type Roster, type RuntimeGladiator } from "../../gladiators/roster";
import type { BattleResultStats } from "../gladiatorShowcaseTypes";
import type { BattleAudioController } from "./audio";
import type { BattleEventPlaybackController } from "./battleEventPlayback";
import { VELES_STARTING_JAVELINS } from "./playback";
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

export interface BattleLifecycleContext {
  appendLog: (event: BattleEvent) => void;
  battleAudio: BattleAudioController;
  battleEventPlayback: BattleEventPlaybackController;
  battleSeedInput: HTMLInputElement;
  canStartBattle: () => boolean;
  clearPendingTimers: (resolveWaits: boolean) => void;
  createCurrentBattleReplaySetup: () => BattleReplaySetup;
  getActiveRoster: () => Roster;
  getCurrentGladiators: () => readonly RuntimeGladiator[];
  getCurrentSpawnPositions: () => Record<string, BattlePoint>;
  getFighterElement: (fighterId: string) => HTMLElement | null;
  getRequestedBattleSeed: () => string | undefined;
  logEl: HTMLElement;
  markFighterDefeated: (fighterId: string) => void;
  overlay: HTMLElement;
  prepareNextBattleWithCurrentSettings: () => void;
  resetArenaNets: () => void;
  resetBattleUi: (plan: BattlePlan) => void;
  resetBattleUiClasses: () => void;
  resetToInitialState: () => void;
  restoreBattleReplaySetup: (replay: BattleReplayRecord) => void;
  resultEl: HTMLElement;
  setFighterArenaPosition: (fighterId: string, point: BattlePoint, durationMs?: number) => void;
  setHandJavelinCount: (fighterId: string, count: number, options?: { handReady?: boolean }) => void;
  setHandNetVisible: (fighterId: string, visible: boolean) => void;
  setHealth: (fighterId: string, hp: number, maxHp: number) => void;
  stageEl: HTMLElement;
  state: BattleLifecycleState;
  statusEl: HTMLElement;
  syncBattleButtonState: () => void;
  timers: Map<number, (() => void) | null>;
  updateFatigueVisuals: (event: BattleEvent) => void;
  wait: (ms: number) => Promise<void>;
}

export function createBattleLifecycleController({
  appendLog,
  battleAudio,
  battleEventPlayback,
  battleSeedInput,
  canStartBattle,
  clearPendingTimers,
  createCurrentBattleReplaySetup,
  getActiveRoster,
  getCurrentGladiators,
  getCurrentSpawnPositions,
  getFighterElement,
  getRequestedBattleSeed,
  logEl,
  markFighterDefeated,
  overlay,
  prepareNextBattleWithCurrentSettings,
  resetArenaNets,
  resetBattleUi,
  resetBattleUiClasses,
  resetToInitialState,
  restoreBattleReplaySetup,
  resultEl,
  setFighterArenaPosition,
  setHandJavelinCount,
  setHandNetVisible,
  setHealth,
  stageEl,
  state,
  statusEl,
  syncBattleButtonState,
  timers,
  updateFatigueVisuals,
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
      },
      plan,
      stats,
    );
  }

  function applyBattlePlanInstantly(plan: BattlePlan): void {
    const javelinsThrownByFighter = new Map<string, number>();

    resetBattleUiClasses();
    resetArenaNets();
    logEl.replaceChildren();

    for (const fighterId of Object.keys(plan.fighters)) {
      const fighter = getPlanFighter(plan, fighterId);
      const startPosition = plan.startPositions[fighterId];

      if (startPosition) {
        setFighterArenaPosition(fighterId, startPosition, 0);
      }

      setHealth(fighterId, fighter.maxHp, fighter.maxHp);
    }

    for (const event of getBattleEventsByResolution(plan)) {
      setFighterArenaPosition(event.attackerId, event.movement.attackerTo, 0);
      setFighterArenaPosition(event.defenderId, event.movement.defenderTo, 0);
      updateFatigueVisuals(event);

      if (event.actionType === "javelin") {
        const used = (javelinsThrownByFighter.get(event.attackerId) ?? 0) + 1;
        javelinsThrownByFighter.set(event.attackerId, used);
        setHandJavelinCount(event.attackerId, VELES_STARTING_JAVELINS - used);
      }

      if (event.netTrap) {
        setHandNetVisible(event.attackerId, false);
      }

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
      const fighterEl = getFighterElement(fighterId);

      setHealth(fighterId, finalHp, fighter.maxHp);

      if (finalHp <= 0) {
        markFighterDefeated(fighterId);
        fighterEl?.classList.add("is-defeated");
      } else if (teamId === plan.winnerTeamId) {
        fighterEl?.classList.add("is-victorious");
        overlay
          .querySelector<HTMLElement>(`[data-team-fighter="${fighterId}"]`)
          ?.classList.add("is-victorious");
      }
    }

    statusEl.textContent = "Бій завершено.";
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
    resetBattleUi(plan);
    battleAudio.startBattle();

    try {
      await wait(420);
      if (state.disposed || runId !== state.currentRun) return;

      const startedAt = performance.now();
      const playbackTasks = plan.events.map(async (event) => {
        const waitForEvent = event.timeMs - (performance.now() - startedAt);
        if (waitForEvent > 0) {
          await wait(waitForEvent);
        }

        if (state.disposed || runId !== state.currentRun) return;
        await battleEventPlayback.playBattleEvent(plan, event, runId);
      });

      const waitForFinish = plan.durationMs - (performance.now() - startedAt);
      if (waitForFinish > 0) {
        playbackTasks.push(wait(waitForFinish));
      }

      await Promise.all(playbackTasks);

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
