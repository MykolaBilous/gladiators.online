import type {
  BattleReplayRecord,
  BattleReplaySetup,
} from "@gladiators/combat-sim";
import type {
  BattlePlan,
} from "@gladiators/combat-sim";
import { createBattlePlan, gladiatorClasses } from "@gladiators/combat-sim";
import {
  getBonusPointsForLevel,
  sumStatPoints,
} from "@gladiators/combat-sim";
import {
  buildRuntimeGladiators,
  buildTeamMap,
  createAutoRoster,
  createManualDefaultRoster,
  getAllSlots,
  TEAM_IDS,
  type Roster,
  type RosterSlot,
  type RuntimeGladiator,
  type TeamId,
  type TrainingMode,
} from "@gladiators/combat-sim";
import { createPhaserArenaRenderer } from "../game-phaser/createPhaserArenaRenderer";
import type { PhaserArenaControls } from "../game-phaser/types";
import type { BattleEvent } from "@gladiators/combat-sim";
import { createBattleAudioController } from "./showcase/audio";
import { createBattleArenaUi } from "./showcase/battleArenaUi";
import {
  createBattleLifecycleController,
  type BattleLifecycleState,
  type BattleWindowHandle,
} from "./showcase/battleLifecycle";
import {
  createShowcaseInteractionHandlers,
  type ShowcaseInteractionState,
} from "./showcase/interactions";
import { createShowcaseOverlay } from "./showcase/layout";
import { createBattleVolumeControls } from "./showcase/volumeControls";
import {
  formatDuration,
} from "./showcase/playback";
import {
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

interface PhaserBattleWindowHandle {
  dispose: () => void;
  layer: HTMLElement;
}

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

  const getPhaserFighterLabels = (): Record<string, string> =>
    runtimeFighters.reduce<Record<string, string>>((labels, fighter) => {
      labels[fighter.id] = fighter.displayName;
      return labels;
    }, {});

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
    phaserStageEl,
    phaserStageHostEl,
    phaserLoadingEl,
    typesButton,
    typesModal,
    teamColumnEls,
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

  const timers = new Map<number, (() => void) | null>();
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
  let activePhaserBattleWindow: PhaserBattleWindowHandle | null = null;
  let pendingPhaserBattleWindow: PhaserBattleWindowHandle | null = null;
  let phaserBattleWindowRenderId = 0;

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
    renderTeamColumns();
    renderTrainingBody();
    setInitialFighterPositions();
    renderPhaserPreviewBattleWindow();
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

  function getFighterClassId(fighterId: string): string {
    return runtimeFighters.find((fighter) => fighter.id === fighterId)?.classId ?? fighterId;
  }

  function setInitialFighterPositions(): void {
    // Phaser arena handles fighter positioning internally
  }

  const {
    appendLog,
    markFighterDefeated,
    recordCrowdReaction,
    resetCrowdReactionCounters,
    resetFighterClasses,
    setHealth,
  } = createBattleArenaUi({
    battleAudio,
    getRuntimeFighters: () => runtimeFighters,
    logEl,
    overlay,
  });

  function createPhaserBattleWindowHandle(
    layer: HTMLElement,
    disposeRenderer: () => void,
  ): PhaserBattleWindowHandle {
    let isDisposed = false;

    return {
      layer,
      dispose: () => {
        if (isDisposed) {
          return;
        }

        isDisposed = true;
        disposeRenderer();
        layer.remove();
      },
    };
  }

  function disposePhaserBattleWindowHandle(handle: PhaserBattleWindowHandle | null): void {
    handle?.dispose();
  }

  function disposeAllPhaserBattleWindows(): void {
    phaserBattleWindowRenderId += 1;
    disposePhaserBattleWindowHandle(pendingPhaserBattleWindow);
    disposePhaserBattleWindowHandle(activePhaserBattleWindow);
    pendingPhaserBattleWindow = null;
    activePhaserBattleWindow = null;
    phaserStageHostEl.replaceChildren();
    setPhaserBattleLoading(false);
  }

  function setPhaserBattleLoading(isLoading: boolean): void {
    phaserStageEl.classList.toggle("is-loading", isLoading);
    phaserStageEl.setAttribute("aria-busy", isLoading ? "true" : "false");
    phaserLoadingEl.hidden = !isLoading;
  }

  function renderPhaserBattleWindow(
    plan: BattlePlan,
    options: { showLoading?: boolean; onBattleEvent?: (event: BattleEvent, p: BattlePlan) => void; onBattleComplete?: (p: BattlePlan) => void } = {},
  ): Promise<BattleWindowHandle> {
    const renderId = ++phaserBattleWindowRenderId;
    const previousActiveWindow = activePhaserBattleWindow;
    let handle: PhaserBattleWindowHandle | null = null;
    let controls: PhaserArenaControls | null = null;
    let settled = false;
    let resolveReady!: (h: BattleWindowHandle) => void;
    const readyPromise = new Promise<BattleWindowHandle>((resolve) => {
      resolveReady = resolve;
    });
    let resolveBattleComplete!: () => void;
    const battleComplete = new Promise<void>((resolve) => {
      resolveBattleComplete = resolve;
    });

    if (options.showLoading) {
      setPhaserBattleLoading(true);
    }

    disposePhaserBattleWindowHandle(pendingPhaserBattleWindow);
    pendingPhaserBattleWindow = null;

    const layer = document.createElement("div");
    layer.className = "arena-phaser-layer";
    phaserStageHostEl.appendChild(layer);

    const revealWhenReady = (): void => {
      if (!handle || !controls || settled) return;
      settled = true;

      if (disposed || renderId !== phaserBattleWindowRenderId) {
        handle.dispose();
        resolveReady({ startPlayback: () => undefined, battleComplete });
        return;
      }

      layer.classList.add("is-active");
      disposePhaserBattleWindowHandle(previousActiveWindow);
      activePhaserBattleWindow = handle;

      if (pendingPhaserBattleWindow === handle) {
        pendingPhaserBattleWindow = null;
      }

      setPhaserBattleLoading(false);
      resolveReady({ startPlayback: () => controls?.startPlayback(), battleComplete });
    };

    try {
      const disposeRenderer = createPhaserArenaRenderer(layer, {
        battlePlan: plan,
        fighterLabels: getPhaserFighterLabels(),
        autoPlay: false,
        onControlsReady: (readyControls) => {
          controls = readyControls;
          revealWhenReady();
        },
        onHealthChange: ({ fighterId, hp, maxHp }) => {
          setHealth(fighterId, hp, maxHp);
        },
        onStatus: (status) => {
          if (status.phase === "playing") {
            statusEl.textContent = status.message;
          }
        },
        onBattleEvent: options.onBattleEvent,
        onBattleComplete: (p) => {
          options.onBattleComplete?.(p);
          resolveBattleComplete();
        },
      });

      handle = createPhaserBattleWindowHandle(layer, disposeRenderer);
      pendingPhaserBattleWindow = handle;
      revealWhenReady();
    } catch (error) {
      layer.remove();
      if (options.showLoading) {
        setPhaserBattleLoading(false);
      }
      throw error;
    }

    return readyPromise;
  }

  function renderPhaserPreviewBattleWindow(): void {
    if (runtimeFighters.length < 2) {
      return;
    }

    try {
      const previewPlan = createBattlePlan(
        runtimeFighters,
        buildTeamMap(getActiveRoster()),
        currentSpawnPositions,
        { seed: "phaser-preview" },
      );
      renderPhaserBattleWindow(previewPlan);
      battleSeedMatchValueEl.textContent = "-";
    } catch {
      disposeAllPhaserBattleWindows();
    }
  }

  function playPhaserBattleWindow(plan: BattlePlan): Promise<BattleWindowHandle> {
    return renderPhaserBattleWindow(plan, {
      showLoading: true,
      onBattleEvent: (event, battlePlan) => {
        if (event.actionType !== "move" && event.actionType !== "recover") {
          battleAudio.playAttack(event.attackCssClass);
          if (event.outcome === "hit" && event.damage > 0) battleAudio.playBlood();
          else if (event.outcome === "block") battleAudio.playBlock(getFighterClassId(event.defenderId));
          appendLog(event);
          setHealth(event.defenderId, event.defenderHp, getPlanFighter(battlePlan, event.defenderId).maxHp);
          recordCrowdReaction(event);
          if (event.defenderHp <= 0) markFighterDefeated(event.defenderId);
        }
      },
    });
  }

  function clearBattleFinale(): void {
    clearBattleFinaleElements(phaserStageEl);
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
    resetCrowdReactionCounters();
    resetFighterClasses();
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
    resetCrowdReactionCounters();
    resetFighterClasses();
    clearBattleFinale();
    isBattleComplete = false;
    logEl.replaceChildren();
    statusEl.textContent = `План бою прораховано: ${formatDuration(plan.durationMs)}, ${plan.events.length} дій.`;
    resultEl.classList.remove("is-final");
    resultEl.textContent = `Бій #${plan.id}: результат уже визначений, арена відтворює події.`;

    for (const fighterId of Object.keys(plan.fighters)) {
      const runtime = getPlanFighter(plan, fighterId);
      setHealth(fighterId, runtime.maxHp, runtime.maxHp);
    }
  }

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
    battleSeedInput,
    battleSeedMatchValueEl,
    canStartBattle,
    clearPendingTimers,
    createCurrentBattleReplaySetup,
    getActiveRoster,
    getCurrentGladiators,
    getCurrentSpawnPositions: () => currentSpawnPositions,
    getRequestedBattleSeed,
    logEl,
    markFighterDefeated,
    overlay,
    prepareNextBattleWithCurrentSettings,
    playBattleWindow: playPhaserBattleWindow,
    resetBattleUi,
    resetBattleUiClasses: resetFighterClasses,
    resetToInitialState,
    restoreBattleReplaySetup,
    resultEl,
    setHealth,
    stageEl: phaserStageEl,
    state: battleLifecycleState,
    statusEl,
    syncBattleButtonState,
    timers,
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
    window.removeEventListener("keydown", onShowcaseKeydown);
    clearPendingTimers(false);
    battleAudio.stopAll();
    disposeAllPhaserBattleWindows();
    overlay.remove();
  };
}
