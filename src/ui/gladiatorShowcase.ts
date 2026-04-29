import { Skeleton2D } from "../animation/Skeleton2D";
import type {
  BattleReplayRecord,
  BattleReplaySetup,
} from "../combat/battleReplayTypes";
import type {
  BattlePlan,
  BattlePoint,
} from "../combat/battleTypes";
import { gladiatorClasses } from "../gladiators/gladiatorClasses";
import {
  getBonusPointsForLevel,
  sumStatPoints,
} from "../gladiators/gladiatorProgression";
import {
  buildRuntimeGladiators,
  createAutoRoster,
  createManualDefaultRoster,
  getAllSlots,
  TEAM_IDS,
  type Roster,
  type RosterSlot,
  type RuntimeGladiator,
  type TeamId,
  type TrainingMode,
} from "../gladiators/roster";
import { createBattleAudioController } from "./showcase/audio";
import { createArenaCameraController } from "./showcase/arenaCamera";
import { createBattleArenaUi } from "./showcase/battleArenaUi";
import { createBattleEventPlayback } from "./showcase/battleEventPlayback";
import {
  createBattleLifecycleController,
  type BattleLifecycleState,
} from "./showcase/battleLifecycle";
import {
  createShowcaseInteractionHandlers,
  type ShowcaseInteractionState,
} from "./showcase/interactions";
import { createShowcaseOverlay } from "./showcase/layout";
import { createBattleVolumeControls } from "./showcase/volumeControls";
import { createBattleThrowables } from "./showcase/throwables";
import {
  formatDuration,
  getArenaRenderMetrics,
} from "./showcase/playback";
import {
  boneMap,
  createArenaFighter,
  createTeamPanel,
} from "./showcase/renderer";
import {
  clearBattleFinale as clearBattleFinaleElements,
  getPlanFighter,
  rememberFighterName,
} from "./showcase/resultUi";
import {
  cloneRoster,
  createAutoTrainingCard,
  createManualSlotEditor,
  createManualTeamBlock,
  createTypeCard,
} from "./showcase/training";
import {
  SPAWN_GRID_CENTER_COLUMN,
  SPAWN_GRID_CENTER_ROW,
  cloneBattlePoints,
  cloneManualSpawnPlacements,
  createManualPlacementPanel,
  createSpawnPositions,
  getSpawnCellPoint,
  getTeamSpawnCellKey,
  isSameSpawnCell,
  isValidSpawnCell,
  type ManualSpawnPlacements,
  type SpawnGridCell,
  type TeamSpawnSeeds,
} from "./showcase/placement";
import "./gladiatorShowcase.css";

export function createGladiatorShowcase(container: HTMLElement): () => void {
  let autoRoster: Roster = createAutoRoster();
  let manualRoster: Roster = createManualDefaultRoster();
  let trainingMode: TrainingMode = "auto";
  const manualSpawnPlacements: ManualSpawnPlacements = {};
  const teamSpawnSeeds: TeamSpawnSeeds = {
    left: Math.random(),
    right: Math.random(),
  };

  const getActiveRoster = (): Roster =>
    trainingMode === "auto" ? autoRoster : manualRoster;

  const setActiveManualRoster = (next: Roster): void => {
    manualRoster = next;
  };

  let runtimeFighters: RuntimeGladiator[] = [];
  let currentSpawnPositions: Record<string, BattlePoint> = {};

  const refreshRuntimeFighters = (): void => {
    runtimeFighters = buildRuntimeGladiators(getActiveRoster(), trainingMode);
    for (const fighter of runtimeFighters) {
      rememberFighterName(fighter.id, fighter.displayName);
    }
  };

  refreshRuntimeFighters();

  const getFightersByTeam = (teamId: TeamId): RuntimeGladiator[] =>
    runtimeFighters.filter((fighter) => fighter.teamId === teamId);

  const initialTypeCards = gladiatorClasses.map((gladiator) => createTypeCard(gladiator)).join("");
  const {
    overlay,
    battleButtons,
    battleResultsButtons,
    volumeToggles,
    volumeSliders,
    preserveSettingsButton,
    battleSeedInput,
    battleSeedMatchValueEl,
    statusEl,
    resultEl,
    logEl,
    stageEl,
    arenaWorldEl,
    typesButton,
    typesModal,
    teamColumnEls,
    arenaFightersEl,
    trainingBodyEl,
    trainingModeHintEl,
  } = createShowcaseOverlay(initialTypeCards);

  container.appendChild(overlay);

  const setGladiatorTypesModalOpen = (open: boolean): void => {
    typesModal.hidden = !open;
    typesModal.setAttribute("aria-hidden", open ? "false" : "true");
    typesButton.setAttribute("aria-expanded", open ? "true" : "false");
  };

  setGladiatorTypesModalOpen(false);

  const skeletons = new Map<string, Skeleton2D>();
  const walkTokens = new Map<string, number>();
  const javelinCounts = new Map<string, number>();
  const timers = new Map<number, (() => void) | null>();
  const defeatedFighters = new Set<string>();
  const battleAudio = createBattleAudioController();
  const {
    onVolumeSliderInput,
    onVolumeToggleClick,
    syncVolumeControl,
  } = createBattleVolumeControls({
    battleAudio,
    volumeSliders,
    volumeToggles,
  });
  let disposed = false;
  let isBattlePlaying = false;
  let isBattleComplete = false;
  let activeBattlePlan: BattlePlan | null = null;
  let currentRun = 0;
  const fighterArenaPositions = new Map<string, BattlePoint>();

  function setBattleResultsButtonEnabled(enabled: boolean): void {
    for (const btn of battleResultsButtons) {
      btn.disabled = !enabled;
      btn.classList.toggle("is-available", enabled);
    }
  }

  function setBattleButtonsState(disabled: boolean, label: string): void {
    for (const button of battleButtons) {
      button.disabled = disabled;
      button.textContent = label;
    }
  }

  function getRequestedBattleSeed(): string | undefined {
    const seed = battleSeedInput.value.trim();

    return seed.length > 0 ? seed : undefined;
  }

  function createCurrentBattleReplaySetup(): BattleReplaySetup {
    return {
      trainingMode,
      roster: cloneRoster(getActiveRoster()),
      spawnPositions: cloneBattlePoints(currentSpawnPositions),
      manualSpawnPlacements: cloneManualSpawnPlacements(manualSpawnPlacements),
      teamSpawnSeeds: { ...teamSpawnSeeds },
    };
  }

  function replaceManualSpawnPlacements(placements: ManualSpawnPlacements): void {
    for (const slotId of Object.keys(manualSpawnPlacements)) {
      delete manualSpawnPlacements[slotId];
    }

    Object.assign(manualSpawnPlacements, placements);
  }

  function restoreBattleReplaySetup(replay: BattleReplayRecord): void {
    const setup = replay.setup;
    const replayRoster = cloneRoster(setup.roster);
    const replaySpawnPositions =
      Object.keys(setup.spawnPositions).length > 0
        ? cloneBattlePoints(setup.spawnPositions)
        : cloneBattlePoints(replay.plan.startPositions);

    trainingMode = setup.trainingMode === "manual" ? "manual" : "auto";

    if (trainingMode === "auto") {
      autoRoster = replayRoster;
    } else {
      manualRoster = replayRoster;
    }

    replaceManualSpawnPlacements(cloneManualSpawnPlacements(setup.manualSpawnPlacements));
    teamSpawnSeeds.left = setup.teamSpawnSeeds.left;
    teamSpawnSeeds.right = setup.teamSpawnSeeds.right;
    activeManualSlotId = manualRoster.left[0]?.instanceId ?? manualRoster.right[0]?.instanceId ?? null;
    openClassPickerSlotId = null;
    selectedPlacementSlotId = null;
    draggingPlacementSlotId = null;
    renderAll();
    currentSpawnPositions = replaySpawnPositions;
    setInitialFighterPositions();
  }

  const arenaCamera = createArenaCameraController({
    stageEl,
    arenaWorldEl,
    isDisposed: () => disposed,
    getRuntimeFighters: () => runtimeFighters,
    getFighterArenaPosition: (fighterId) => fighterArenaPositions.get(fighterId),
    getCurrentSpawnPositions: () => currentSpawnPositions,
    getFighterElement,
  });

  const scheduleArenaCameraUpdate = (): void => {
    arenaCamera.scheduleUpdate();
  };

  const onArenaResize = (): void => {
    arenaCamera.handleResize();
  };

  function disposeSkeletons(): void {
    for (const skeleton of skeletons.values()) {
      skeleton.dispose();
    }
    skeletons.clear();
    walkTokens.clear();
  }

  function rebuildArenaSkeletons(): void {
    disposeSkeletons();

    for (const fighter of runtimeFighters) {
      const wrap = overlay.querySelector<HTMLElement>(`#arena-svg-${fighter.id}`);
      const svgEl = wrap?.querySelector<SVGElement>("svg");
      const bones = boneMap[fighter.classId];

      if (svgEl && bones) {
        skeletons.set(fighter.id, new Skeleton2D(svgEl, bones));
      }
    }
  }

  function renderArenaFighters(): void {
    arenaFightersEl.innerHTML = runtimeFighters.map(createArenaFighter).join("");
  }

  function renderTeamColumns(): void {
    for (const teamId of TEAM_IDS) {
      teamColumnEls[teamId].innerHTML = createTeamPanel(teamId, getFightersByTeam(teamId));
    }
  }

  let activeManualSlotId: string | null =
    manualRoster.left[0]?.instanceId ?? manualRoster.right[0]?.instanceId ?? null;
  let openClassPickerSlotId: string | null = null;
  let selectedPlacementSlotId: string | null = null;
  let draggingPlacementSlotId: string | null = null;

  function getActiveManualSlot(): RosterSlot | undefined {
    const activeSlot = activeManualSlotId ? findManualSlot(activeManualSlotId) : undefined;
    if (activeSlot) {
      return activeSlot;
    }

    const fallbackSlot = getAllSlots(manualRoster)[0];
    activeManualSlotId = fallbackSlot?.instanceId ?? null;
    openClassPickerSlotId = null;
    return fallbackSlot;
  }

  function sanitizeManualSpawnPlacements(): void {
    const slots = getAllSlots(manualRoster);
    const validIds = new Set(slots.map((slot) => slot.instanceId));
    const occupied = new Set<string>();

    for (const slotId of Object.keys(manualSpawnPlacements)) {
      if (!validIds.has(slotId)) {
        delete manualSpawnPlacements[slotId];
      }
    }

    for (const slot of slots) {
      const placement = manualSpawnPlacements[slot.instanceId];
      if (!isValidSpawnCell(placement)) {
        delete manualSpawnPlacements[slot.instanceId];
        continue;
      }

      const key = getTeamSpawnCellKey(slot.teamId, placement);
      if (occupied.has(key)) {
        delete manualSpawnPlacements[slot.instanceId];
      } else {
        occupied.add(key);
      }
    }

    if (selectedPlacementSlotId && !validIds.has(selectedPlacementSlotId)) {
      selectedPlacementSlotId = null;
    }
  }

  function refreshSpawnPositions(): void {
    currentSpawnPositions = createSpawnPositions(
      runtimeFighters,
      trainingMode === "manual" ? manualSpawnPlacements : undefined,
      teamSpawnSeeds,
    );
  }

  function clearManualTeamPlacements(teamId: TeamId): void {
    teamSpawnSeeds[teamId] = Math.random();

    for (const slot of manualRoster[teamId]) {
      delete manualSpawnPlacements[slot.instanceId];
    }

    if (
      selectedPlacementSlotId &&
      manualRoster[teamId].some((slot) => slot.instanceId === selectedPlacementSlotId)
    ) {
      selectedPlacementSlotId = null;
    }
  }

  function clearManualSpawnPlacement(slotId: string): void {
    delete manualSpawnPlacements[slotId];
    if (selectedPlacementSlotId === slotId) {
      selectedPlacementSlotId = null;
    }
  }

  function placeManualSlotInCell(
    slotId: string,
    teamId: TeamId,
    cell: SpawnGridCell,
  ): boolean {
    const slot = findManualSlot(slotId);
    if (!slot || slot.teamId !== teamId || !isValidSpawnCell(cell)) {
      return false;
    }

    for (const candidate of manualRoster[teamId]) {
      if (
        candidate.instanceId !== slotId &&
        isSameSpawnCell(manualSpawnPlacements[candidate.instanceId], cell)
      ) {
        delete manualSpawnPlacements[candidate.instanceId];
      }
    }

    manualSpawnPlacements[slotId] = cell;
    selectedPlacementSlotId = slotId;
    activeManualSlotId = slotId;
    openClassPickerSlotId = null;
    return true;
  }

  function parseTeamId(value: string | undefined): TeamId | null {
    return value === "left" || value === "right" ? value : null;
  }

  function getPlacementCellData(
    cellEl: HTMLElement,
  ): { teamId: TeamId; cell: SpawnGridCell } | null {
    const teamId = parseTeamId(cellEl.dataset["placementTeam"]);
    const cell = {
      column: Number(cellEl.dataset["placementColumn"]),
      row: Number(cellEl.dataset["placementRow"]),
    };

    if (!teamId || !isValidSpawnCell(cell)) {
      return null;
    }

    return { teamId, cell };
  }

  function renderTrainingBody(): void {
    if (trainingMode === "auto") {
      const slots = getAllSlots(autoRoster);
      trainingBodyEl.classList.remove("training-body--manual");
      trainingBodyEl.classList.add("training-body--auto");
      trainingBodyEl.innerHTML = `<div class="training-grid">${slots
        .map((slot) => createAutoTrainingCard(slot))
        .join("")}</div>`;
      trainingModeHintEl.textContent = "Авто: 1 vs 1, бали розподіляються автоматично.";
    } else {
      const activeSlot = getActiveManualSlot();
      trainingBodyEl.classList.remove("training-body--auto");
      trainingBodyEl.classList.add("training-body--manual");
      trainingBodyEl.innerHTML = `
        <div class="manual-roster">
          <div class="manual-team-list">
            ${TEAM_IDS.map((teamId) =>
              createManualTeamBlock(teamId, manualRoster[teamId], activeManualSlotId),
            ).join("")}
          </div>
          ${activeSlot ? createManualSlotEditor(activeSlot, openClassPickerSlotId === activeSlot.instanceId) : ""}
        </div>
        ${createManualPlacementPanel(manualRoster, manualSpawnPlacements, selectedPlacementSlotId)}`;
      trainingModeHintEl.textContent =
        "Manual: 1–10 бійців у команді, окремий клас, рівень, бали й стартова клітинка.";
    }

    overlay.querySelectorAll<HTMLButtonElement>("[data-training-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset["trainingMode"] === trainingMode);
    });
  }

  function renderAll(): void {
    refreshRuntimeFighters();
    sanitizeManualSpawnPlacements();
    refreshSpawnPositions();
    fighterArenaPositions.clear();
    arenaCamera.reset();
    renderTeamColumns();
    renderArenaFighters();
    rebuildArenaSkeletons();
    renderTrainingBody();
    setInitialFighterPositions();
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let timer = 0;
      const finish = (): void => {
        timers.delete(timer);
        resolve();
      };

      timer = window.setTimeout(finish, Math.max(0, ms));
      timers.set(timer, finish);
    });
  }

  function clearPendingTimers(resolveWaits: boolean): void {
    for (const [timer, finish] of Array.from(timers)) {
      window.clearTimeout(timer);
      timers.delete(timer);
      if (resolveWaits) {
        finish?.();
      }
    }
  }

  function getFighterElement(id: string): HTMLElement | null {
    return overlay.querySelector<HTMLElement>(`.battle-fighter[data-fighter="${id}"]`);
  }

  function getArenaSvg(id: string): SVGElement | null {
    return overlay.querySelector<SVGElement>(`#arena-svg-${id} svg`);
  }

  function getFighterClassId(fighterId: string): string {
    return runtimeFighters.find((fighter) => fighter.id === fighterId)?.classId ?? fighterId;
  }

  function setInitialFighterPositions(): void {
    for (const fighter of runtimeFighters) {
      const position =
        currentSpawnPositions[fighter.id] ??
        getSpawnCellPoint(fighter.teamId, {
          column: SPAWN_GRID_CENTER_COLUMN,
          row: SPAWN_GRID_CENTER_ROW,
        });
      setFighterArenaPosition(fighter.id, position, 0);
    }
  }

  function setFighterArenaPosition(
    fighterId: string,
    point: BattlePoint,
    durationMs = 0,
  ): void {
    fighterArenaPositions.set(fighterId, { x: point.x, y: point.y });
    const fighterEl = getFighterElement(fighterId);
    if (!fighterEl) {
      scheduleArenaCameraUpdate();
      return;
    }

    const metrics = getArenaRenderMetrics(point);
    fighterEl.style.setProperty("--move-duration", `${Math.max(0, durationMs)}ms`);
    fighterEl.style.setProperty("--transform-duration", `${Math.max(0, durationMs)}ms`);
    fighterEl.style.setProperty("--arena-x", `${metrics.x.toFixed(3)}%`);
    fighterEl.style.setProperty("--arena-bottom", `${metrics.bottom.toFixed(3)}%`);
    fighterEl.style.setProperty("--arena-scale", metrics.scale.toFixed(3));
    fighterEl.style.setProperty("--arena-z", String(metrics.z));
    scheduleArenaCameraUpdate();
  }

  function stopWalkLoop(fighterId: string): void {
    walkTokens.set(fighterId, (walkTokens.get(fighterId) ?? 0) + 1);
    const fighterEl = getFighterElement(fighterId);
    fighterEl?.classList.remove("is-walking", "is-rushing");
    skeletons.get(fighterId)?.stop();
  }

  const {
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
  } = createBattleArenaUi({
    battleAudio,
    defeatedFighters,
    getArenaSvg,
    getFighterElement,
    getRuntimeFighters: () => runtimeFighters,
    javelinCounts,
    logEl,
    overlay,
    skeletons,
    stopWalkLoop,
  });

  const throwables = createBattleThrowables({
    stageEl,
    arenaWorldEl,
    getRuntimeFighters: () => runtimeFighters,
    getArenaCameraZoom: () => arenaCamera.getState().zoom,
    getFighterElement,
    wait,
    isRunActive: (runId) => !disposed && runId === currentRun,
  });

  function clearBattleFinale(): void {
    clearBattleFinaleElements(stageEl);
  }

  function resetToInitialState(): void {
    window.location.reload();
  }

  function prepareNextBattleWithCurrentSettings(): void {
    if (isBattlePlaying) {
      return;
    }

    currentRun += 1;
    isBattleComplete = false;
    activeBattlePlan = null;
    battleAudio.stopAll();
    clearBattleFinale();
    logEl.replaceChildren();
    resultEl.classList.remove("is-final");
    resultEl.textContent = "Результат ще не визначено.";

    refreshTrainingUi();
    defeatedFighters.clear();
    resetCrowdReactionCounters();
    resetFighterClasses();
    resetArenaNets();
    setInitialFighterPositions();

    if (canStartBattle()) {
      statusEl.textContent =
        "Налаштування збережено. Натисніть «Розпочати бій», щоб почати наступний бій.";
    }
  }

  function getCurrentGladiators(): readonly RuntimeGladiator[] {
    return runtimeFighters;
  }

  function findManualSlot(slotId: string): RosterSlot | undefined {
    return getAllSlots(manualRoster).find((slot) => slot.instanceId === slotId);
  }

  function getManualRemainingPoints(slotId: string): number {
    const slot = findManualSlot(slotId);
    if (!slot) {
      return 0;
    }
    return getBonusPointsForLevel(slot.level) - sumStatPoints(slot.manualBonusPoints);
  }

  function canStartBattle(): boolean {
    if (trainingMode === "auto") {
      return true;
    }
    return getAllSlots(manualRoster).every(
      (slot) =>
        getBonusPointsForLevel(slot.level) - sumStatPoints(slot.manualBonusPoints) === 0,
    );
  }

  function syncBattleButtonState(): void {
    const ready = canStartBattle();
    const showPreserveSettingsButton = isBattleComplete && !isBattlePlaying;

    setBattleResultsButtonEnabled(isBattlePlaying && activeBattlePlan !== null);
    preserveSettingsButton.hidden = !showPreserveSettingsButton;
    preserveSettingsButton.disabled = !showPreserveSettingsButton;
    battleSeedInput.disabled = isBattlePlaying;

    if (isBattlePlaying) {
      setBattleButtonsState(true, "Йде бій");
      return;
    }

    if (isBattleComplete) {
      setBattleButtonsState(false, "Новий бій");
      return;
    }

    if (!ready) {
      setBattleButtonsState(true, "Розподіліть бали");
      statusEl.textContent = "У ручному режимі всі бонусні бали рівня мають бути розподілені перед боєм.";
      return;
    }

    setBattleButtonsState(false, "Розпочати бій");
    statusEl.textContent =
      trainingMode === "auto"
        ? "Автоматичний розподіл готовий до бою."
        : "Ручний розподіл готовий до бою.";
  }

  function updateLivePreview(): void {
    for (const fighter of runtimeFighters) {
      setHealth(fighter.id, fighter.stats.hp, fighter.stats.hp);
    }
  }

  function refreshTrainingUi(options: { rerender?: boolean } = {}): void {
    if (options.rerender !== false) {
      renderAll();
    }
    updateLivePreview();
    syncBattleButtonState();
  }

  function resetBattleUi(plan: BattlePlan): void {
    defeatedFighters.clear();
    resetCrowdReactionCounters();
    resetFighterClasses();
    resetArenaNets();
    clearBattleFinale();
    isBattleComplete = false;
    logEl.replaceChildren();
    statusEl.textContent = `План бою прораховано: ${formatDuration(plan.durationMs)}, ${plan.events.length} дій.`;
    resultEl.classList.remove("is-final");
    resultEl.textContent = `Бій #${plan.id}: результат уже визначений, арена відтворює події.`;

    for (const fighterId of Object.keys(plan.fighters)) {
      const runtime = getPlanFighter(plan, fighterId);
      const startPosition = plan.startPositions[fighterId];
      if (startPosition) {
        setFighterArenaPosition(fighterId, startPosition, 0);
      }
      setHealth(fighterId, runtime.maxHp, runtime.maxHp);
    }
  }

  const battleEventPlayback = createBattleEventPlayback({
    battleAudio,
    disableNettedFighter,
    appendLog,
    getArenaSvg,
    getFighterClassId,
    getFighterElement,
    isEventBlockedByDefeat,
    isRunActive: (runId) => !disposed && runId === currentRun,
    javelinCounts,
    markFighterDefeated,
    recordCrowdReaction,
    setFighterArenaPosition,
    setHandJavelinCount,
    setHandNetVisible,
    setHealth,
    showFloatingText,
    skeletons,
    stopWalkLoop,
    throwables,
    updateFatigueVisuals,
    wait,
    walkTokens,
  });

  const battleLifecycleState: BattleLifecycleState = {
    get activeBattlePlan() {
      return activeBattlePlan;
    },
    set activeBattlePlan(value) {
      activeBattlePlan = value;
    },
    get currentRun() {
      return currentRun;
    },
    set currentRun(value) {
      currentRun = value;
    },
    get disposed() {
      return disposed;
    },
    set disposed(value) {
      disposed = value;
    },
    get isBattleComplete() {
      return isBattleComplete;
    },
    set isBattleComplete(value) {
      isBattleComplete = value;
    },
    get isBattlePlaying() {
      return isBattlePlaying;
    },
    set isBattlePlaying(value) {
      isBattlePlaying = value;
    },
  };

  const {
    handleBattleClick,
    showBattleResultsNow,
  } = createBattleLifecycleController({
    appendLog,
    battleAudio,
    battleEventPlayback,
    battleSeedInput,
    battleSeedMatchValueEl,
    canStartBattle,
    clearPendingTimers,
    createCurrentBattleReplaySetup,
    getActiveRoster,
    getCurrentGladiators,
    getCurrentSpawnPositions: () => currentSpawnPositions,
    getFighterElement,
    getRequestedBattleSeed,
    logEl,
    markFighterDefeated,
    overlay,
    prepareNextBattleWithCurrentSettings,
    resetArenaNets,
    resetBattleUi,
    resetBattleUiClasses: resetFighterClasses,
    resetToInitialState,
    restoreBattleReplaySetup,
    resultEl,
    setFighterArenaPosition,
    setHandJavelinCount,
    setHandNetVisible,
    setHealth,
    stageEl,
    state: battleLifecycleState,
    statusEl,
    syncBattleButtonState,
    timers,
    updateFatigueVisuals,
    wait,
  });

  const interactionState: ShowcaseInteractionState = {
    get activeManualSlotId() {
      return activeManualSlotId;
    },
    set activeManualSlotId(value) {
      activeManualSlotId = value;
    },
    get draggingPlacementSlotId() {
      return draggingPlacementSlotId;
    },
    set draggingPlacementSlotId(value) {
      draggingPlacementSlotId = value;
    },
    get isBattleComplete() {
      return isBattleComplete;
    },
    set isBattleComplete(value) {
      isBattleComplete = value;
    },
    get isBattlePlaying() {
      return isBattlePlaying;
    },
    set isBattlePlaying(value) {
      isBattlePlaying = value;
    },
    get openClassPickerSlotId() {
      return openClassPickerSlotId;
    },
    set openClassPickerSlotId(value) {
      openClassPickerSlotId = value;
    },
    get selectedPlacementSlotId() {
      return selectedPlacementSlotId;
    },
    set selectedPlacementSlotId(value) {
      selectedPlacementSlotId = value;
    },
    get trainingMode() {
      return trainingMode;
    },
    set trainingMode(value) {
      trainingMode = value;
    },
  };

  const {
    onBattleClick,
    onBattleResultsClick,
    onPlacementDragStart,
    onPlacementDragEnd,
    onPlacementDragOver,
    onPlacementDragLeave,
    onPlacementDrop,
    onTrainingClick,
    onShowcaseKeydown,
    onTrainingChange,
  } = createShowcaseInteractionHandlers({
    clearBattleFinale,
    clearManualSpawnPlacement,
    clearManualTeamPlacements,
    findManualSlot,
    getActiveManualSlot,
    getActiveRoster,
    getManualRemainingPoints,
    getManualRoster: () => manualRoster,
    getPlacementCellData,
    handleBattleClick,
    overlay,
    parseTeamId,
    placeManualSlotInCell,
    prepareNextBattleWithCurrentSettings,
    refreshTrainingUi,
    renderTrainingBody,
    setActiveManualRoster,
    setGladiatorTypesModalOpen,
    showBattleResultsNow,
    state: interactionState,
    typesModal,
  });

  battleButtons.forEach((button) => {
    button.addEventListener("click", onBattleClick);
  });
  battleResultsButtons.forEach((b) => b.addEventListener("click", onBattleResultsClick));
  volumeSliders.forEach((slider) => {
    slider.addEventListener("input", onVolumeSliderInput);
  });
  volumeToggles.forEach((toggle) => {
    toggle.addEventListener("click", onVolumeToggleClick);
  });
  overlay.addEventListener("click", onTrainingClick);
  overlay.addEventListener("change", onTrainingChange);
  overlay.addEventListener("dragstart", onPlacementDragStart);
  overlay.addEventListener("dragend", onPlacementDragEnd);
  overlay.addEventListener("dragover", onPlacementDragOver);
  overlay.addEventListener("dragleave", onPlacementDragLeave);
  overlay.addEventListener("drop", onPlacementDrop);
  window.addEventListener("resize", onArenaResize);
  window.addEventListener("keydown", onShowcaseKeydown);
  syncVolumeControl();
  refreshTrainingUi();

  return () => {
    disposed = true;
    currentRun += 1;
    battleButtons.forEach((button) => {
      button.removeEventListener("click", onBattleClick);
    });
    battleResultsButtons.forEach((b) => b.removeEventListener("click", onBattleResultsClick));
    volumeSliders.forEach((slider) => {
      slider.removeEventListener("input", onVolumeSliderInput);
    });
    volumeToggles.forEach((toggle) => {
      toggle.removeEventListener("click", onVolumeToggleClick);
    });
    overlay.removeEventListener("click", onTrainingClick);
    overlay.removeEventListener("change", onTrainingChange);
    overlay.removeEventListener("dragstart", onPlacementDragStart);
    overlay.removeEventListener("dragend", onPlacementDragEnd);
    overlay.removeEventListener("dragover", onPlacementDragOver);
    overlay.removeEventListener("dragleave", onPlacementDragLeave);
    overlay.removeEventListener("drop", onPlacementDrop);
    window.removeEventListener("resize", onArenaResize);
    window.removeEventListener("keydown", onShowcaseKeydown);
    arenaCamera.dispose();
    clearPendingTimers(false);
    battleAudio.stopAll();
    for (const skeleton of skeletons.values()) skeleton.dispose();
    skeletons.clear();
    overlay.remove();
  };
}
