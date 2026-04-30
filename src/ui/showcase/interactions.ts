import { clampGladiatorLevel } from "@gladiators/combat-sim";
import {
  getAllSlots,
  setSlotClass,
  setTeamSize,
  type Roster,
  type RosterSlot,
  type TeamId,
  type TrainingMode,
} from "@gladiators/combat-sim";
import type { SpawnGridCell } from "./placement";
import {
  clampManualBonusPoints,
  getSortedGladiatorClasses,
  isGladiatorStatKey,
} from "./training";

interface PlacementCellData {
  teamId: TeamId;
  cell: SpawnGridCell;
}

export interface ShowcaseInteractionState {
  activeManualSlotId: string | null;
  draggingPlacementSlotId: string | null;
  isBattleComplete: boolean;
  isBattlePlaying: boolean;
  openClassPickerSlotId: string | null;
  selectedPlacementSlotId: string | null;
  trainingMode: TrainingMode;
}

export interface ShowcaseInteractionHandlers {
  onBattleClick: () => void;
  onBattleResultsClick: () => void;
  onPlacementDragStart: (event: DragEvent) => void;
  onPlacementDragEnd: () => void;
  onPlacementDragOver: (event: DragEvent) => void;
  onPlacementDragLeave: (event: DragEvent) => void;
  onPlacementDrop: (event: DragEvent) => void;
  onTrainingClick: (event: MouseEvent) => void;
  onShowcaseKeydown: (event: KeyboardEvent) => void;
  onTrainingChange: (event: Event) => void;
}

export interface ShowcaseInteractionContext {
  clearBattleFinale: () => void;
  clearManualSpawnPlacement: (slotId: string) => void;
  clearManualTeamPlacements: (teamId: TeamId) => void;
  findManualSlot: (slotId: string) => RosterSlot | undefined;
  getActiveManualSlot: () => RosterSlot | undefined;
  getActiveRoster: () => Roster;
  getManualRemainingPoints: (slotId: string) => number;
  getManualRoster: () => Roster;
  getPlacementCellData: (cellEl: HTMLElement) => PlacementCellData | null;
  handleBattleClick: () => Promise<void>;
  overlay: HTMLElement;
  parseTeamId: (value: string | undefined) => TeamId | null;
  placeManualSlotInCell: (
    slotId: string,
    teamId: TeamId,
    cell: SpawnGridCell,
  ) => boolean;
  prepareNextBattleWithCurrentSettings: () => void;
  refreshTrainingUi: () => void;
  renderTrainingBody: () => void;
  setActiveManualRoster: (next: Roster) => void;
  setGladiatorTypesModalOpen: (open: boolean) => void;
  showBattleResultsNow: () => void;
  state: ShowcaseInteractionState;
  typesModal: HTMLElement;
}

export function createShowcaseInteractionHandlers({
  clearBattleFinale,
  clearManualSpawnPlacement,
  clearManualTeamPlacements,
  findManualSlot,
  getActiveManualSlot,
  getActiveRoster,
  getManualRemainingPoints,
  getManualRoster,
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
  state,
  typesModal,
}: ShowcaseInteractionContext): ShowcaseInteractionHandlers {
  const onBattleClick = (): void => {
    void handleBattleClick();
  };

  const onBattleResultsClick = (): void => {
    showBattleResultsNow();
  };

  const clearPlacementDragOver = (): void => {
    overlay.querySelectorAll<HTMLElement>(".placement-cell.is-drag-over").forEach((cell) => {
      cell.classList.remove("is-drag-over");
    });
  };

  const onPlacementDragStart = (event: DragEvent): void => {
    if (state.trainingMode !== "manual" || state.isBattlePlaying || state.isBattleComplete) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const token = target?.closest<HTMLElement>("[data-placement-token]");
    const slotId = token?.dataset["placementToken"];
    const slot = slotId ? findManualSlot(slotId) : undefined;

    if (!slotId || !slot) {
      return;
    }

    state.draggingPlacementSlotId = slotId;
    state.selectedPlacementSlotId = slotId;
    state.activeManualSlotId = slotId;
    state.openClassPickerSlotId = null;
    token.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", slotId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const onPlacementDragEnd = (): void => {
    state.draggingPlacementSlotId = null;
    clearPlacementDragOver();
    overlay.querySelectorAll<HTMLElement>("[data-placement-token].is-dragging").forEach((token) => {
      token.classList.remove("is-dragging");
    });
  };

  const onPlacementDragOver = (event: DragEvent): void => {
    if (state.trainingMode !== "manual" || state.isBattlePlaying || state.isBattleComplete) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const cellEl = target?.closest<HTMLElement>("[data-placement-cell]");
    const cellData = cellEl ? getPlacementCellData(cellEl) : null;
    const slotId = state.draggingPlacementSlotId ?? event.dataTransfer?.getData("text/plain") ?? "";
    const slot = slotId ? findManualSlot(slotId) : undefined;

    if (!cellEl || !cellData || !slot || slot.teamId !== cellData.teamId) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    cellEl.classList.add("is-drag-over");
  };

  const onPlacementDragLeave = (event: DragEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const cellEl = target?.closest<HTMLElement>("[data-placement-cell]");
    const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;

    if (cellEl && (!related || !cellEl.contains(related))) {
      cellEl.classList.remove("is-drag-over");
    }
  };

  const onPlacementDrop = (event: DragEvent): void => {
    if (state.trainingMode !== "manual" || state.isBattlePlaying || state.isBattleComplete) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const cellEl = target?.closest<HTMLElement>("[data-placement-cell]");
    const cellData = cellEl ? getPlacementCellData(cellEl) : null;
    const slotId = state.draggingPlacementSlotId ?? event.dataTransfer?.getData("text/plain") ?? "";

    if (!cellData || !slotId) {
      return;
    }

    event.preventDefault();
    clearPlacementDragOver();

    if (placeManualSlotInCell(slotId, cellData.teamId, cellData.cell)) {
      refreshTrainingUi();
    }
  };

  const onTrainingClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;

    if (target?.closest("[data-gladiator-types-open]")) {
      setGladiatorTypesModalOpen(true);
      return;
    }

    if (target?.closest("[data-gladiator-types-close]") || target === typesModal) {
      setGladiatorTypesModalOpen(false);
      return;
    }

    if (!typesModal.hidden) {
      return;
    }

    if (state.isBattlePlaying) {
      return;
    }

    if (target?.closest("[data-preserve-settings]")) {
      prepareNextBattleWithCurrentSettings();
      return;
    }

    if (target?.closest("[data-new-battle]")) {
      void handleBattleClick();
      return;
    }

    if (target?.closest("[data-view-results]")) {
      clearBattleFinale();
      return;
    }

    if (state.isBattleComplete) {
      return;
    }

    const shouldCloseClassPicker =
      state.trainingMode === "manual" &&
      state.openClassPickerSlotId !== null &&
      !target?.closest("[data-class-picker]");

    const modeButton = target?.closest<HTMLButtonElement>("[data-training-mode]");

    if (modeButton) {
      const nextMode = modeButton.dataset["trainingMode"];
      if (nextMode === "auto" || nextMode === "manual") {
        state.trainingMode = nextMode;
        state.openClassPickerSlotId = null;
        state.selectedPlacementSlotId = null;
        state.draggingPlacementSlotId = null;
        refreshTrainingUi();
      }
      return;
    }

    const placementAutoButton = target?.closest<HTMLButtonElement>("[data-placement-auto-team]");
    if (placementAutoButton && state.trainingMode === "manual") {
      const teamId = parseTeamId(placementAutoButton.dataset["placementAutoTeam"]);
      if (teamId) {
        state.openClassPickerSlotId = null;
        clearManualTeamPlacements(teamId);
        refreshTrainingUi();
      }
      return;
    }

    const placementClearButton = target?.closest<HTMLButtonElement>("[data-placement-clear]");
    if (placementClearButton && state.trainingMode === "manual") {
      const slotId = placementClearButton.dataset["placementClear"];
      if (slotId) {
        state.openClassPickerSlotId = null;
        clearManualSpawnPlacement(slotId);
        refreshTrainingUi();
      }
      return;
    }

    const placementToken = target?.closest<HTMLElement>("[data-placement-token]");
    if (placementToken && state.trainingMode === "manual") {
      const slotId = placementToken.dataset["placementToken"];
      if (slotId && findManualSlot(slotId)) {
        state.selectedPlacementSlotId = state.selectedPlacementSlotId === slotId ? null : slotId;
        state.activeManualSlotId = slotId;
        state.openClassPickerSlotId = null;
        renderTrainingBody();
      }
      return;
    }

    const placementCell = target?.closest<HTMLElement>("[data-placement-cell]");
    if (placementCell && state.trainingMode === "manual") {
      const cellData = getPlacementCellData(placementCell);
      if (cellData && state.selectedPlacementSlotId) {
        if (placeManualSlotInCell(state.selectedPlacementSlotId, cellData.teamId, cellData.cell)) {
          refreshTrainingUi();
        }
      }
      return;
    }

    const manualSlotButton = target?.closest<HTMLButtonElement>("[data-manual-slot-select]");
    if (manualSlotButton && state.trainingMode === "manual") {
      state.activeManualSlotId =
        manualSlotButton.dataset["manualSlotSelect"] ?? state.activeManualSlotId;
      state.openClassPickerSlotId = null;
      renderTrainingBody();
      return;
    }

    const classPickerButton = target?.closest<HTMLButtonElement>("[data-class-picker-button]");
    if (classPickerButton && state.trainingMode === "manual") {
      const slotId = classPickerButton.dataset["classPickerButton"];
      if (slotId) {
        state.activeManualSlotId = slotId;
        state.openClassPickerSlotId = state.openClassPickerSlotId === slotId ? null : slotId;
        renderTrainingBody();
      }
      return;
    }

    const classOptionButton = target?.closest<HTMLButtonElement>("[data-slot-class-option]");
    if (classOptionButton && state.trainingMode === "manual") {
      const slotId = classOptionButton.dataset["slotClassOption"];
      const classId = classOptionButton.dataset["classId"];
      const slot = slotId ? findManualSlot(slotId) : undefined;
      if (!slotId || !slot || !classId) {
        return;
      }

      state.activeManualSlotId = slotId;
      state.openClassPickerSlotId = null;
      setActiveManualRoster(setSlotClass(getManualRoster(), slot.teamId, slot.teamSlot, classId));
      refreshTrainingUi();
      return;
    }

    const pointButton = target?.closest<HTMLButtonElement>("[data-point-action]");
    if (!pointButton || state.trainingMode !== "manual") {
      if (shouldCloseClassPicker) {
        state.openClassPickerSlotId = null;
        renderTrainingBody();
      }
      return;
    }

    state.openClassPickerSlotId = null;

    const slotId = pointButton.dataset["gladiator"];
    const stat = pointButton.dataset["stat"];
    const action = pointButton.dataset["pointAction"];

    if (!slotId || !isGladiatorStatKey(stat)) {
      return;
    }

    const slot = findManualSlot(slotId);
    if (!slot) {
      return;
    }

    const remaining = getManualRemainingPoints(slotId);

    if (action === "increase" && remaining > 0) {
      slot.manualBonusPoints[stat] += 1;
    } else if (action === "decrease" && slot.manualBonusPoints[stat] > 0) {
      slot.manualBonusPoints[stat] -= 1;
    }

    refreshTrainingUi();
  };

  const onShowcaseKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && !typesModal.hidden) {
      setGladiatorTypesModalOpen(false);
      return;
    }

    if (event.key === "Escape" && state.openClassPickerSlotId) {
      state.openClassPickerSlotId = null;
      renderTrainingBody();
    }
  };

  function findRosterSlotForActiveMode(slotId: string): RosterSlot | undefined {
    return getAllSlots(getActiveRoster()).find((slot) => slot.instanceId === slotId);
  }

  const onTrainingChange = (event: Event): void => {
    if (state.isBattlePlaying || state.isBattleComplete) {
      return;
    }

    const target = event.target;

    if (target instanceof HTMLInputElement) {
      if (target.dataset["levelInput"]) {
        const slotId = target.dataset["levelInput"];
        const slot = findRosterSlotForActiveMode(slotId);
        if (!slot) {
          return;
        }
        slot.level = clampGladiatorLevel(Number(target.value));
        target.value = String(slot.level);
        clampManualBonusPoints(slot);
        refreshTrainingUi();
        return;
      }

      if (target.dataset["teamSizeInput"]) {
        if (state.trainingMode !== "manual") {
          return;
        }
        const teamId = target.dataset["teamSizeInput"] as TeamId;
        const manualRoster = getManualRoster();
        const requested = Number(target.value);
        const fallbackClassId =
          manualRoster[teamId][manualRoster[teamId].length - 1]?.classId ??
          getSortedGladiatorClasses()[0]!.id;
        setActiveManualRoster(setTeamSize(manualRoster, teamId, requested, fallbackClassId));
        getActiveManualSlot();
        refreshTrainingUi();
      }
    }
  };

  return {
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
  };
}
