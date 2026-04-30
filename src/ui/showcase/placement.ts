import type { BattlePoint } from "@gladiators/combat-sim";
import {
  getGladiatorClass,
  TEAM_IDS,
  TEAM_LABELS,
  type Roster,
  type RosterSlot,
  type RuntimeGladiator,
  type TeamId,
} from "@gladiators/combat-sim";
import { svgMap } from "./renderer";

export const SPAWN_GRID_COLUMNS = 3;
export const SPAWN_GRID_ROWS = 5;
export const SPAWN_GRID_COLUMN_INDICES = [0, 1, 2] as const;
export const SPAWN_GRID_ROW_INDICES = [0, 1, 2, 3, 4] as const;
export const SPAWN_GRID_CENTER_COLUMN = (SPAWN_GRID_COLUMNS - 1) / 2;
export const SPAWN_GRID_CENTER_ROW = (SPAWN_GRID_ROWS - 1) / 2;
export const SPAWN_GRID_ROW_Y = [0.9, 0.74, 0.58, 0.42, 0.26] as const;
export const SPAWN_GRID_X: Record<TeamId, readonly [number, number, number]> = {
  left: [0.1, 0.24, 0.38],
  right: [0.9, 0.76, 0.62],
};
export interface SpawnGridCell {
  column: number;
  row: number;
}

export type ManualSpawnPlacements = Partial<Record<string, SpawnGridCell>>;
export type TeamSpawnSeeds = Record<TeamId, number>;
export function isValidSpawnCell(cell: SpawnGridCell | undefined): cell is SpawnGridCell {
  return (
    Boolean(cell) &&
    Number.isInteger(cell?.column) &&
    Number.isInteger(cell?.row) &&
    cell!.column >= 0 &&
    cell!.column < SPAWN_GRID_COLUMNS &&
    cell!.row >= 0 &&
    cell!.row < SPAWN_GRID_ROWS
  );
}

export function isSameSpawnCell(
  left: SpawnGridCell | undefined,
  right: SpawnGridCell | undefined,
): boolean {
  return Boolean(
    left &&
      right &&
      left.column === right.column &&
      left.row === right.row,
  );
}

export function getSpawnCellKey(cell: SpawnGridCell): string {
  return `${cell.column}:${cell.row}`;
}

export function getTeamSpawnCellKey(teamId: TeamId, cell: SpawnGridCell): string {
  return `${teamId}:${getSpawnCellKey(cell)}`;
}

export function cloneBattlePoints(points: Record<string, BattlePoint>): Record<string, BattlePoint> {
  return Object.fromEntries(
    Object.entries(points).map(([fighterId, point]) => [
      fighterId,
      { x: point.x, y: point.y },
    ]),
  );
}

export function cloneManualSpawnPlacements(
  placements: Partial<Record<string, SpawnGridCell>>,
): ManualSpawnPlacements {
  const next: ManualSpawnPlacements = {};

  for (const [slotId, cell] of Object.entries(placements)) {
    if (isValidSpawnCell(cell)) {
      next[slotId] = { column: cell.column, row: cell.row };
    }
  }

  return next;
}

export function getAllSpawnGridCells(): SpawnGridCell[] {
  return SPAWN_GRID_ROW_INDICES.flatMap((row) =>
    SPAWN_GRID_COLUMN_INDICES.map((column) => ({ column, row })),
  );
}

export function getSpawnCellPoint(teamId: TeamId, cell: SpawnGridCell): BattlePoint {
  return {
    x: SPAWN_GRID_X[teamId][cell.column] ?? SPAWN_GRID_X[teamId][1],
    y: SPAWN_GRID_ROW_Y[cell.row] ?? SPAWN_GRID_ROW_Y[2],
  };
}

export function getSpawnCellNoise(seed: number, cell: SpawnGridCell): number {
  const raw = Math.sin(seed * 9_973 + cell.column * 193 + cell.row * 769) * 10_000;

  return raw - Math.floor(raw);
}

export function pickCenteredSpawnCells(
  count: number,
  blockedCellKeys: ReadonlySet<string> = new Set(),
  seed = 0,
): SpawnGridCell[] {
  return getAllSpawnGridCells()
    .filter((cell) => !blockedCellKeys.has(getSpawnCellKey(cell)))
    .map((cell) => ({
      cell,
      score:
        Math.hypot(
          cell.column - SPAWN_GRID_CENTER_COLUMN,
          (cell.row - SPAWN_GRID_CENTER_ROW) * 0.82,
        ) + getSpawnCellNoise(seed, cell) * 0.28,
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, Math.max(0, count))
    .map((item) => item.cell);
}

export function createSpawnPositionsForTeam(
  teamId: TeamId,
  members: readonly RuntimeGladiator[],
  manualPlacements?: ManualSpawnPlacements,
  seed = 0,
): Record<string, BattlePoint> {
  const positions: Record<string, BattlePoint> = {};
  const blockedCellKeys = new Set<string>();
  const unplaced: RuntimeGladiator[] = [];

  for (const fighter of members) {
    const placement = manualPlacements?.[fighter.instanceId];
    const cellKey = placement ? getSpawnCellKey(placement) : "";

    if (
      manualPlacements &&
      isValidSpawnCell(placement) &&
      !blockedCellKeys.has(cellKey)
    ) {
      positions[fighter.id] = getSpawnCellPoint(teamId, placement);
      blockedCellKeys.add(cellKey);
    } else {
      unplaced.push(fighter);
    }
  }

  const centeredCells = pickCenteredSpawnCells(unplaced.length, blockedCellKeys, seed);
  unplaced.forEach((fighter, index) => {
    const cell = centeredCells[index] ?? { column: SPAWN_GRID_CENTER_COLUMN, row: SPAWN_GRID_CENTER_ROW };
    positions[fighter.id] = getSpawnCellPoint(teamId, cell);
  });

  return positions;
}

export function createSpawnPositions(
  fighters: readonly RuntimeGladiator[],
  manualPlacements?: ManualSpawnPlacements,
  teamSeeds?: TeamSpawnSeeds,
): Record<string, BattlePoint> {
  const positions: Record<string, BattlePoint> = {};

  for (const teamId of TEAM_IDS) {
    Object.assign(
      positions,
      createSpawnPositionsForTeam(
        teamId,
        fighters.filter((fighter) => fighter.teamId === teamId),
        manualPlacements,
        teamSeeds?.[teamId] ?? 0,
      ),
    );
  }

  return positions;
}

export function createPlacementToken(
  slot: RosterSlot,
  selectedSlotId: string | null,
  placements: ManualSpawnPlacements,
): string {
  const klass = getGladiatorClass(slot.classId);
  const preview = svgMap[slot.classId]?.() ?? "";
  const isSelected = selectedSlotId === slot.instanceId;
  const isPlaced = isValidSpawnCell(placements[slot.instanceId]);

  return `
    <button
      class="placement-token${isSelected ? " is-selected" : ""}${isPlaced ? " is-placed" : ""}"
      type="button"
      draggable="true"
      data-placement-token="${slot.instanceId}"
      aria-pressed="${isSelected ? "true" : "false"}"
    >
      <span class="placement-token-model" aria-hidden="true">${preview}</span>
      <span class="placement-token-copy">
        <strong>${slot.displayName} (${slot.level})</strong>
        <span>${klass.name}</span>
      </span>
    </button>`;
}

export function getPlacementOccupant(
  slots: readonly RosterSlot[],
  placements: ManualSpawnPlacements,
  cell: SpawnGridCell,
): RosterSlot | undefined {
  return slots.find((slot) => isSameSpawnCell(placements[slot.instanceId], cell));
}

export function createPlacementCell(
  teamId: TeamId,
  cell: SpawnGridCell,
  occupant: RosterSlot | undefined,
  selectedSlotId: string | null,
): string {
  const occupantModel = occupant ? svgMap[occupant.classId]?.() ?? "" : "";
  const selectedClass = occupant?.instanceId === selectedSlotId ? " is-selected" : "";
  const occupiedClass = occupant ? " is-occupied" : "";

  return `
    <div
      class="placement-cell${occupiedClass}${selectedClass}"
      data-placement-cell
      data-placement-team="${teamId}"
      data-placement-column="${cell.column}"
      data-placement-row="${cell.row}"
      role="button"
      tabindex="0"
      aria-label="${TEAM_LABELS[teamId]} ${cell.column + 1}-${cell.row + 1}"
    >
      ${
        occupant
          ? `
            <div class="placement-cell-card" draggable="true" data-placement-token="${occupant.instanceId}">
              <span class="placement-cell-name">${occupant.displayName} (${occupant.level})</span>
              <span class="placement-cell-model" aria-hidden="true">${occupantModel}</span>
            </div>
            <button
              class="placement-cell-clear"
              type="button"
              data-placement-clear="${occupant.instanceId}"
              aria-label="Прибрати ${occupant.displayName} з позиції"
            >
              ×
            </button>`
          : ""
      }
    </div>`;
}

export function createManualPlacementTeamGrid(
  teamId: TeamId,
  slots: readonly RosterSlot[],
  placements: ManualSpawnPlacements,
  selectedSlotId: string | null,
): string {
  const tokens = slots
    .map((slot) => createPlacementToken(slot, selectedSlotId, placements))
    .join("");
  const cells = getAllSpawnGridCells()
    .map((cell) =>
      createPlacementCell(
        teamId,
        cell,
        getPlacementOccupant(slots, placements, cell),
        selectedSlotId,
      ),
    )
    .join("");

  return `
    <section class="placement-team" data-placement-team-block="${teamId}">
      <header class="placement-team-head">
        <div>
          <span class="manual-team-label">${TEAM_LABELS[teamId]}</span>
          <span class="manual-team-sub">${slots.length} / ${SPAWN_GRID_COLUMNS * SPAWN_GRID_ROWS}</span>
        </div>
        <div class="placement-team-controls">
          <span>${SPAWN_GRID_COLUMNS} горизонталі</span>
          <span>${SPAWN_GRID_ROWS} вертикалі</span>
          <button class="placement-auto-button" type="button" data-placement-auto-team="${teamId}">Авто</button>
        </div>
      </header>
      <div class="placement-bench" data-placement-bench="${teamId}">${tokens}</div>
      <div class="placement-grid-shell">
        <div class="placement-line-labels" aria-hidden="true">
          <span>Остання лінія</span>
          <span>2 лінія</span>
          <span>Перша лінія</span>
        </div>
        <div class="placement-grid" data-placement-grid="${teamId}">
          ${cells}
        </div>
      </div>
    </section>`;
}

export function createManualPlacementPanel(
  roster: Roster,
  placements: ManualSpawnPlacements,
  selectedSlotId: string | null,
): string {
  return `
    <section class="placement-panel" data-placement-panel>
      <header class="placement-panel-head">
        <span>Розстановка</span>
      </header>
      <div class="placement-layout">
        ${TEAM_IDS.map((teamId) =>
          createManualPlacementTeamGrid(teamId, roster[teamId], placements, selectedSlotId),
        ).join("")}
      </div>
    </section>`;
}
