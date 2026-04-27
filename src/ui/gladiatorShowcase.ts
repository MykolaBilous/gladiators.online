import { Skeleton2D } from "../animation/Skeleton2D";
import type { AnimationClip, BoneDef } from "../animation/skeletonTypes";
import { createBattlePlan } from "../combat/battleSimulator";
import { metersToArenaDistance } from "../config/arenaScale";
import type {
  BattleCounterAttack,
  BattleEvent,
  BattlePlan,
  BattlePoint,
  BattleTeamId,
} from "../combat/battleTypes";
import { gladiatorClasses } from "../gladiators/gladiatorClasses";
import {
  clampGladiatorLevel,
  getBonusPointsForLevel,
  getTotalPointsForLevel,
  gladiatorStatKeys,
  LEVEL_ZERO_STAT_POINTS,
  MAX_GLADIATOR_LEVEL,
  POINTS_PER_GLADIATOR_LEVEL,
  sumStatPoints,
} from "../gladiators/gladiatorProgression";
import type {
  GladiatorClass,
  GladiatorStatKey,
} from "../gladiators/gladiatorTypes";
import {
  buildRuntimeGladiators,
  buildTeamMap,
  createAutoRoster,
  createManualDefaultRoster,
  getAllSlots,
  getAllocatedBonusPoints,
  getGladiatorClass,
  listGladiatorClasses,
  MAX_TEAM_SIZE,
  MIN_TEAM_SIZE,
  setSlotClass,
  setTeamSize,
  TEAM_IDS,
  TEAM_LABELS,
  type Roster,
  type RosterSlot,
  type RuntimeGladiator,
  type TeamId,
  type TrainingMode,
} from "../gladiators/roster";
import {
  createMurmilloSvg,
  murmilloBones,
  murmilloHeavyDodge,
  murmilloShieldBlock,
  murmilloShieldBash,
  murmilloSwordSlash,
  murmilloWalk,
} from "../gladiators/murmilloSvg";
import {
  createRetiariusSvg,
  retiariusBones,
  retiariusNetThrow,
  retiariusQuickDodge,
  retiariusTridentThrust,
  retiariusTridentParry,
  retiariusWalk,
} from "../gladiators/retiariusSvg";
import {
  createVelesSvg,
  velesBones,
  velesJavelinThrow,
  velesQuickDodge,
  velesShortSwordBlock,
  velesShortSwordSlash,
  velesWalk,
} from "../gladiators/velesSvg";
import type {
  AttackPlayback,
  BattleResultStats,
  DefenseOutcome,
  FloatingVariant,
} from "./gladiatorShowcaseTypes";
import applaudingHighUrl from "../assets/sounds/Applauding high.wav?url";
import applaudingLowUrl from "../assets/sounds/Applauding low.wav?url";
import applaudingMediumUrl from "../assets/sounds/Applauding medium.wav?url";
import bloodUrl from "../assets/sounds/character/blood.mp3?url";
import bloodTwoUrl from "../assets/sounds/character/blood two.mp3?url";
import murmilonBlockUrl from "../assets/sounds/character/murmilon block.mp3?url";
import murmilonHitUrl from "../assets/sounds/character/murmilon hit.mp3?url";
import retiariusBlockUrl from "../assets/sounds/character/retiarius block.mp3?url";
import retiariusHitUrl from "../assets/sounds/character/retiarius hit.mp3?url";
import coliseumUrl from "../assets/sounds/coliseum.mp3?url";
import "./gladiatorShowcase.css";

const ACTION_MOTION_SCALE = 1.3;
const DEFENSE_MOTION_SCALE = 1.24;
const WALK_MOTION_SCALE = 1.18;
const ATTACK_TRANSFORM_MS = 380;
const NET_FLIGHT_MS = 820;
const NET_DROP_MS = 520;
const JAVELIN_FLIGHT_MS = 620;
const JAVELIN_EXIT_MS = 460;
const JAVELIN_DROP_MS = 440;
const VELES_STARTING_JAVELINS = 3;
const REACTION_SETTLE_MS = 320;
const BATTLE_VOLUME_STORAGE_KEY = "gladiators.masterVolume";
const DEFAULT_BATTLE_VOLUME = 1;
const DEFAULT_RESTORED_BATTLE_VOLUME = 0.72;

type CrowdApplauseLevel = "low" | "medium" | "high";

interface BattleAudioController {
  startBattle: () => void;
  playAttack: (attackCssClass: string) => void;
  playApplause: (level: CrowdApplauseLevel) => Promise<void>;
  playBlock: (fighterId: string) => void;
  playBlood: () => void;
  playFinaleAndStop: () => void;
  setMasterVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  getMasterVolume: () => number;
  isMuted: () => boolean;
  stopAll: () => void;
}

const applauseSoundUrls: Record<CrowdApplauseLevel, string> = {
  low: applaudingLowUrl,
  medium: applaudingMediumUrl,
  high: applaudingHighUrl,
};

const applauseVolumes: Record<CrowdApplauseLevel, number> = {
  low: 0.58,
  medium: 0.7,
  high: 0.84,
};

const attackSoundUrls: Record<string, string> = {
  "attack-sword-slash": murmilonHitUrl,
  "attack-shield-bash": retiariusHitUrl,
  "attack-trident-thrust": retiariusHitUrl,
  "attack-net-throw": retiariusHitUrl,
  "attack-javelin-throw": retiariusHitUrl,
  "attack-veles-sword": retiariusHitUrl,
};

const blockSoundUrls: Record<string, string> = {
  murmillo: murmilonBlockUrl,
  retiarius: retiariusBlockUrl,
  veles: retiariusBlockUrl,
};

const bloodSoundUrls = [bloodUrl, bloodTwoUrl] as const;

function scaleClip(clip: AnimationClip, scale: number): AnimationClip {
  return {
    ...clip,
    duration: Math.round(clip.duration * scale),
  };
}

const svgMap: Record<string, () => string> = {
  murmillo: createMurmilloSvg,
  retiarius: createRetiariusSvg,
  veles: createVelesSvg,
};

const boneMap: Record<string, BoneDef[]> = {
  murmillo: murmilloBones,
  retiarius: retiariusBones,
  veles: velesBones,
};

const clipMap: Record<string, AnimationClip> = {
  "attack-sword-slash": scaleClip(murmilloSwordSlash, ACTION_MOTION_SCALE),
  "attack-shield-bash": scaleClip(murmilloShieldBash, ACTION_MOTION_SCALE),
  "attack-trident-thrust": scaleClip(retiariusTridentThrust, ACTION_MOTION_SCALE),
  "attack-net-throw": scaleClip(retiariusNetThrow, ACTION_MOTION_SCALE),
  "attack-javelin-throw": scaleClip(velesJavelinThrow, ACTION_MOTION_SCALE),
  "attack-veles-sword": scaleClip(velesShortSwordSlash, ACTION_MOTION_SCALE),
};

const walkClipMap: Record<string, AnimationClip> = {
  murmillo: scaleClip(murmilloWalk, WALK_MOTION_SCALE),
  retiarius: scaleClip(retiariusWalk, WALK_MOTION_SCALE),
  veles: scaleClip(velesWalk, WALK_MOTION_SCALE),
};

const defenseClipMap: Record<string, Record<DefenseOutcome, AnimationClip>> = {
  murmillo: {
    block: scaleClip(murmilloShieldBlock, DEFENSE_MOTION_SCALE),
    miss: scaleClip(murmilloHeavyDodge, DEFENSE_MOTION_SCALE),
  },
  retiarius: {
    block: scaleClip(retiariusTridentParry, DEFENSE_MOTION_SCALE),
    miss: scaleClip(retiariusQuickDodge, DEFENSE_MOTION_SCALE),
  },
  veles: {
    block: scaleClip(velesShortSwordBlock, DEFENSE_MOTION_SCALE),
    miss: scaleClip(velesQuickDodge, DEFENSE_MOTION_SCALE),
  },
};

const statLabels: Record<string, string> = {
  hp: "HP",
  attack: "АТК",
  defense: "ЗАХ",
  speed: "ШВД",
  dexterity: "СПР",
  endurance: "ВТР",
};

const statDisplayMaximums: Record<GladiatorStatKey, number> = {
  hp: 180,
  attack: 150,
  defense: 150,
  speed: 150,
  dexterity: 150,
  endurance: 150,
};

const UI_MIN_MOVEMENT_DISTANCE = metersToArenaDistance(0.06);

const MIN_TRAINING_LEVEL = 0;
const SPAWN_GRID_COLUMNS = 3;
const SPAWN_GRID_ROWS = 5;
const SPAWN_GRID_COLUMN_INDICES = [0, 1, 2] as const;
const SPAWN_GRID_ROW_INDICES = [0, 1, 2, 3, 4] as const;
const SPAWN_GRID_CENTER_COLUMN = (SPAWN_GRID_COLUMNS - 1) / 2;
const SPAWN_GRID_CENTER_ROW = (SPAWN_GRID_ROWS - 1) / 2;
const SPAWN_GRID_ROW_Y = [0.82, 0.7, 0.58, 0.46, 0.34] as const;
const SPAWN_GRID_X: Record<TeamId, readonly [number, number, number]> = {
  left: [0.18, 0.26, 0.34],
  right: [0.82, 0.74, 0.66],
};
const gladiatorClassNameCollator = new Intl.Collator("uk", { sensitivity: "base" });

interface SpawnGridCell {
  column: number;
  row: number;
}

type ManualSpawnPlacements = Partial<Record<string, SpawnGridCell>>;
type TeamSpawnSeeds = Record<TeamId, number>;

function isValidSpawnCell(cell: SpawnGridCell | undefined): cell is SpawnGridCell {
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

function isSameSpawnCell(
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

function getSpawnCellKey(cell: SpawnGridCell): string {
  return `${cell.column}:${cell.row}`;
}

function getTeamSpawnCellKey(teamId: TeamId, cell: SpawnGridCell): string {
  return `${teamId}:${getSpawnCellKey(cell)}`;
}

function getAllSpawnGridCells(): SpawnGridCell[] {
  return SPAWN_GRID_ROW_INDICES.flatMap((row) =>
    SPAWN_GRID_COLUMN_INDICES.map((column) => ({ column, row })),
  );
}

function getSpawnCellPoint(teamId: TeamId, cell: SpawnGridCell): BattlePoint {
  return {
    x: SPAWN_GRID_X[teamId][cell.column] ?? SPAWN_GRID_X[teamId][1],
    y: SPAWN_GRID_ROW_Y[cell.row] ?? SPAWN_GRID_ROW_Y[2],
  };
}

function getSpawnCellNoise(seed: number, cell: SpawnGridCell): number {
  const raw = Math.sin(seed * 9_973 + cell.column * 193 + cell.row * 769) * 10_000;

  return raw - Math.floor(raw);
}

function pickCenteredSpawnCells(
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

function createSpawnPositionsForTeam(
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

function createSpawnPositions(
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

function clampManualBonusPoints(slot: RosterSlot): void {
  const budget = getBonusPointsForLevel(slot.level);
  let overflow = sumStatPoints(slot.manualBonusPoints) - budget;

  if (overflow <= 0) {
    return;
  }

  for (const key of [...gladiatorStatKeys].reverse()) {
    if (overflow <= 0) {
      break;
    }

    const removed = Math.min(slot.manualBonusPoints[key], overflow);
    slot.manualBonusPoints[key] -= removed;
    overflow -= removed;
  }
}

function getStatDisplayPercent(key: GladiatorStatKey, value: number): number {
  return clampPercent((value / statDisplayMaximums[key]) * 100);
}

function formatMultiplier(value: number): string {
  return `x${value.toFixed(1).replace(/\.0$/, "")}`;
}

function isGladiatorStatKey(value: string | undefined): value is GladiatorStatKey {
  return typeof value === "string" && (gladiatorStatKeys as readonly string[]).includes(value);
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function clampMasterVolume(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function getStoredBattleVolume(): number {
  try {
    const storedVolume = window.localStorage.getItem(BATTLE_VOLUME_STORAGE_KEY);
    if (!storedVolume) {
      return DEFAULT_BATTLE_VOLUME;
    }

    const parsedVolume = Number.parseFloat(storedVolume);
    return Number.isFinite(parsedVolume)
      ? clampMasterVolume(parsedVolume)
      : DEFAULT_BATTLE_VOLUME;
  } catch {
    return DEFAULT_BATTLE_VOLUME;
  }
}

function storeBattleVolume(volume: number): void {
  try {
    window.localStorage.setItem(BATTLE_VOLUME_STORAGE_KEY, String(clampMasterVolume(volume)));
  } catch {
    // localStorage can be unavailable in private or embedded browsing contexts.
  }
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(1)} с`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getPointDistance(a: BattlePoint, b: BattlePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getArenaRenderMetrics(point: BattlePoint): {
  x: number;
  bottom: number;
  scale: number;
  z: number;
} {
  return {
    x: lerp(5, 95, point.x),
    bottom: lerp(48, 5, point.y),
    scale: lerp(0.58, 1.2, point.y),
    z: Math.round(20 + point.y * 60),
  };
}

function createTypeStatBar(key: GladiatorStatKey, value: number): string {
  return `
    <div class="stat-row stat-row--type">
      <span class="stat-label">${statLabels[key] ?? key}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" data-stat="${key}" style="width:${getStatDisplayPercent(
          key,
          value,
        )}%"></div>
      </div>
      <span class="stat-value">${value}</span>
    </div>`;
}

function createTeamFighterRow(fighter: RuntimeGladiator): string {
  return `
    <div class="team-fighter-row" data-team-fighter="${fighter.id}" data-class="${fighter.classId}">
      <div class="team-fighter-head">
        <strong class="team-fighter-name">${fighter.displayName}</strong>
        <span class="team-fighter-class">${fighter.name}</span>
      </div>
      <div class="team-fighter-health">
        <div class="team-fighter-health-line">
          <span class="team-fighter-health-text" data-health-text="${fighter.id}">${fighter.stats.hp} / ${fighter.stats.hp} HP</span>
          <span class="team-fighter-health-percent" data-health-percent="${fighter.id}">100%</span>
        </div>
        <div class="battle-health battle-health-panel">
          <div class="battle-health-fill" data-health-fill="${fighter.id}" style="width:100%"></div>
        </div>
      </div>
    </div>`;
}

function createTeamPanel(teamId: TeamId, fighters: readonly RuntimeGladiator[]): string {
  const sideLabel = TEAM_LABELS[teamId];
  const rows = fighters.map(createTeamFighterRow).join("");
  const countSuffix =
    fighters.length === 1 ? "боєць" : fighters.length < 5 ? "бійці" : "бійців";

  return `
    <aside class="battle-team-panel" data-team-panel="${teamId}" data-side="${teamId}" aria-label="${sideLabel}">
      <div class="team-panel-header">
        <span class="team-label">${sideLabel}</span>
        <span class="team-count" data-team-count="${teamId}">${fighters.length} ${countSuffix}</span>
      </div>
      <div class="team-fighters">${rows}</div>
    </aside>`;
}

function createArenaFighter(fighter: RuntimeGladiator): string {
  const svg = svgMap[fighter.classId]?.() ?? "";

  return `
    <article class="battle-fighter" data-fighter="${fighter.id}" data-class="${fighter.classId}" data-side="${fighter.teamId}">
      <div class="fighter-nameplate">
        <span class="fighter-tag-name">${fighter.displayName}</span>
        <span class="fighter-tag-hp" data-health-compact="${fighter.id}">${fighter.stats.hp} HP</span>
      </div>
      <div class="arena-svg" id="arena-svg-${fighter.id}">
        <div class="arena-svg-mirror">
          ${svg}
        </div>
      </div>
      <div class="floating-damage" data-float="${fighter.id}"></div>
    </article>`;
}

function createTypeCard(gladiator: GladiatorClass): string {
  const preview = svgMap[gladiator.id]?.() ?? "";
  const stats = gladiatorStatKeys
    .map((key) => createTypeStatBar(key, gladiator.stats[key]))
    .join("");
  const attacks = gladiator.attacks
    .map((attack) => `<span class="move-chip">${attack.name}</span>`)
    .join("");

  return `
    <article class="gladiator-card gladiator-card--type" data-type-id="${gladiator.id}">
      <div class="gladiator-type-hero">
        <div class="gladiator-type-preview" aria-hidden="true">
          ${preview}
        </div>
        <div class="gladiator-type-copy">
          <h2 class="gladiator-name">${gladiator.name}</h2>
          <p class="gladiator-role">${gladiator.title}</p>
          <p class="gladiator-desc">${gladiator.description}</p>
        </div>
      </div>
      <div class="gladiator-equip">
        <span><span class="equip-icon">Меч</span> ${gladiator.weapon}</span>
        <span><span class="equip-icon">Захист</span> ${gladiator.defense}</span>
      </div>
      <div class="gladiator-stats">${stats}</div>
      <div class="move-chips">${attacks}</div>
    </article>`;
}

function createTrainingStatControl(
  slot: RosterSlot,
  klass: GladiatorClass,
  mode: TrainingMode,
  key: GladiatorStatKey,
): string {
  const statKey = `${slot.instanceId}:${key}`;
  const bonusPoints = getAllocatedBonusPoints(slot, mode);
  const totalPoints = slot.levelZeroPoints[key] + bonusPoints[key];
  const manualDisabled = mode === "auto" ? "disabled" : "";

  return `
    <div class="training-stat-row" data-training-stat="${statKey}">
      <span class="training-stat-name">${statLabels[key]}</span>
      <span class="training-stat-base" data-training-base="${statKey}">${slot.levelZeroPoints[key]}</span>
      <span class="training-stat-multiplier">${formatMultiplier(klass.statMultipliers[key])}</span>
      <button class="training-stepper" type="button" data-point-action="decrease" data-gladiator="${slot.instanceId}" data-stat="${key}" ${manualDisabled}>-</button>
      <strong class="training-stat-bonus" data-training-bonus="${statKey}">+${bonusPoints[key]}</strong>
      <button class="training-stepper" type="button" data-point-action="increase" data-gladiator="${slot.instanceId}" data-stat="${key}" ${manualDisabled}>+</button>
      <span class="training-stat-total" data-training-total="${statKey}">${totalPoints}</span>
    </div>`;
}

function createTrainingStatGrid(
  slot: RosterSlot,
  klass: GladiatorClass,
  mode: TrainingMode,
): string {
  const stats = gladiatorStatKeys
    .map((key) => createTrainingStatControl(slot, klass, mode, key))
    .join("");

  return `
    <div class="training-stat-head">
      <span>stat</span>
      <span>0</span>
      <span>mult</span>
      <span></span>
      <span>+lv</span>
      <span></span>
      <span>sum</span>
    </div>
    <div class="training-stats">${stats}</div>`;
}

function createSlotBudgetRow(slot: RosterSlot, mode: TrainingMode): string {
  const bonusBudget = getBonusPointsForLevel(slot.level);
  const allocated = sumStatPoints(getAllocatedBonusPoints(slot, mode));
  const remaining = bonusBudget - allocated;

  return `
    <div class="training-budget">
      <span data-training-total-budget="${slot.instanceId}">${getTotalPointsForLevel(slot.level)} pts</span>
      <span data-training-bonus-budget="${slot.instanceId}">+${bonusBudget}</span>
      <strong data-training-remaining="${slot.instanceId}">${remaining}</strong>
    </div>`;
}

function createAutoTrainingCard(slot: RosterSlot): string {
  const klass = getGladiatorClass(slot.classId);

  return `
    <section class="training-card" data-training-card="${slot.instanceId}">
      <div class="training-card-head">
        <div>
          <span class="training-side-label">${slot.displayName}</span>
          <strong>${klass.name}</strong>
        </div>
        <label class="training-level-control">
          <span>Lv</span>
          <input type="number" min="${MIN_TRAINING_LEVEL}" max="${MAX_GLADIATOR_LEVEL}" value="${slot.level}" data-level-input="${slot.instanceId}" />
        </label>
      </div>
      ${createSlotBudgetRow(slot, "auto")}
      ${createTrainingStatGrid(slot, klass, "auto")}
    </section>`;
}

function getSortedGladiatorClasses(): GladiatorClass[] {
  return [...listGladiatorClasses()].sort(
    (left, right) =>
      gladiatorClassNameCollator.compare(left.name, right.name) ||
      left.id.localeCompare(right.id),
  );
}

function getSlotRemainingState(slot: RosterSlot): {
  className: string;
  label: string;
  remaining: number;
} {
  const bonusBudget = getBonusPointsForLevel(slot.level);
  const remaining = bonusBudget - sumStatPoints(slot.manualBonusPoints);
  const className = remaining === 0 ? "is-balanced" : remaining > 0 ? "is-pending" : "is-overdrawn";
  const label = remaining > 0 ? `+${remaining} вільних` : remaining === 0 ? "розподілено" : `${remaining}`;

  return { className, label, remaining };
}

function createManualClassPicker(slot: RosterSlot, isOpen: boolean): string {
  const klass = getGladiatorClass(slot.classId);
  const options = getSortedGladiatorClasses()
    .map((option) => {
      const selected = option.id === slot.classId;
      return `
        <button
          class="manual-class-option${selected ? " is-selected" : ""}"
          type="button"
          role="option"
          aria-selected="${selected ? "true" : "false"}"
          data-slot-class-option="${slot.instanceId}"
          data-class-id="${option.id}"
        >
          ${option.name}
        </button>`;
    })
    .join("");

  return `
    <div class="manual-class-picker${isOpen ? " is-open" : ""}" data-class-picker="${slot.instanceId}">
      <button
        class="manual-class-trigger"
        type="button"
        data-class-picker-button="${slot.instanceId}"
        aria-haspopup="listbox"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-controls="manual-class-options-${slot.instanceId}"
      >
        <span>${klass.name}</span>
      </button>
      <div
        class="manual-class-options"
        id="manual-class-options-${slot.instanceId}"
        role="listbox"
        ${isOpen ? "" : "hidden"}
      >
        ${options}
      </div>
    </div>`;
}

function createManualSlotButton(slot: RosterSlot, active: boolean): string {
  const klass = getGladiatorClass(slot.classId);
  const remaining = getSlotRemainingState(slot);

  return `
    <button
      class="manual-slot-row${active ? " is-active" : ""}"
      type="button"
      data-manual-slot-select="${slot.instanceId}"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span class="manual-slot-index">#${slot.teamSlot + 1}</span>
      <span class="manual-slot-main">
        <strong class="manual-slot-name">${slot.displayName}</strong>
        <span class="manual-slot-class">${klass.name}</span>
      </span>
      <span class="manual-slot-level">Lv ${slot.level}</span>
      <span class="manual-slot-remaining ${remaining.className}" data-slot-remaining-pill="${slot.instanceId}">${remaining.label}</span>
    </button>`;
}

function createManualSlotEditor(slot: RosterSlot, isClassPickerOpen: boolean): string {
  const klass = getGladiatorClass(slot.classId);
  const remaining = getSlotRemainingState(slot);

  return `
    <section class="manual-slot-editor" data-manual-slot-editor="${slot.instanceId}">
      <header class="manual-editor-head">
        <div class="manual-editor-title">
          <span class="manual-editor-kicker">${TEAM_LABELS[slot.teamId]} · #${slot.teamSlot + 1}</span>
          <h3>${slot.displayName}</h3>
          <span>${klass.name}</span>
        </div>
        <span class="manual-slot-remaining ${remaining.className}" data-slot-remaining-pill="${slot.instanceId}">${remaining.label}</span>
      </header>
      <div class="manual-slot-controls manual-slot-controls--editor">
        <label class="manual-slot-field">
          <span>Клас</span>
          ${createManualClassPicker(slot, isClassPickerOpen)}
        </label>
        <label class="manual-slot-field">
          <span>Lv</span>
          <input class="manual-slot-input" type="number" min="${MIN_TRAINING_LEVEL}" max="${MAX_GLADIATOR_LEVEL}" value="${slot.level}" data-level-input="${slot.instanceId}" />
        </label>
      </div>
      ${createSlotBudgetRow(slot, "manual")}
      ${createTrainingStatGrid(slot, klass, "manual")}
    </section>`;
}

function createManualTeamBlock(
  teamId: TeamId,
  slots: readonly RosterSlot[],
  activeSlotId: string | null,
): string {
  const cards = slots.map((slot) => createManualSlotButton(slot, slot.instanceId === activeSlotId)).join("");

  return `
    <section class="manual-team-block" data-manual-team="${teamId}">
      <header class="manual-team-head">
        <div>
          <span class="manual-team-label">${TEAM_LABELS[teamId]}</span>
          <span class="manual-team-sub">${slots.length} / ${MAX_TEAM_SIZE}</span>
        </div>
        <label class="manual-team-size">
          <span>Бійців</span>
          <input class="manual-team-size-input" type="number" min="${MIN_TEAM_SIZE}" max="${MAX_TEAM_SIZE}" value="${slots.length}" data-team-size-input="${teamId}" />
        </label>
      </header>
      <div class="manual-team-roster">${cards}</div>
    </section>`;
}

function createPlacementToken(
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

function getPlacementOccupant(
  slots: readonly RosterSlot[],
  placements: ManualSpawnPlacements,
  cell: SpawnGridCell,
): RosterSlot | undefined {
  return slots.find((slot) => isSameSpawnCell(placements[slot.instanceId], cell));
}

function createPlacementCell(
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

function createManualPlacementTeamGrid(
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

function createManualPlacementPanel(
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

function getPlanFighter(plan: BattlePlan, id: string) {
  const fighter = plan.fighters[id];
  if (!fighter) {
    throw new Error(`Missing planned fighter: ${id}`);
  }
  return fighter;
}

const runtimeFighterNames: Record<string, string> = {};

function rememberFighterName(id: string, name: string): void {
  runtimeFighterNames[id] = name;
}

function getGladiatorName(id: string): string {
  return (
    runtimeFighterNames[id] ??
    gladiatorClasses.find((gladiator) => gladiator.id === id)?.name ??
    id
  );
}

function getTacticText(tactic: BattleEvent["decisions"][number]["tactic"]): string {
  const labels: Record<BattleEvent["decisions"][number]["tactic"], string> = {
    press: "тисне",
    balanced: "тримає темп",
    counter: "ловить контру",
    recover: "економить сили",
  };

  return labels[tactic];
}

function getOutcomeText(event: BattleEvent): string {
  const counterPrefix = event.counterAttack ? "зустрічна атака, " : "";

  if (event.actionType === "javelin") {
    if (event.outcome === "hit") {
      return "спис влучив";
    }

    if (event.outcome === "block") {
      return "спис заблоковано";
    }

    return "ухилення від списа";
  }

  if (event.netTrap) {
    return event.netTrap.escaped
      ? "ухилення від сітки"
      : `сітка, ${formatDuration(event.netTrap.durationMs)} без ходу`;
  }

  if (event.outcome === "block") {
    return `${counterPrefix}блок`;
  }

  if (event.outcome === "miss") {
    return `${counterPrefix}ухилення`;
  }

  return event.critical
    ? `${counterPrefix}критичний удар, -${event.damage} HP`
    : `${counterPrefix}-${event.damage} HP`;
}

function isCombatEvent(event: BattleEvent): boolean {
  return event.actionType === "strike" || event.actionType === "net" || event.actionType === "javelin";
}

function getEventResolutionTimeMs(event: BattleEvent): number {
  const impactDelay = isCombatEvent(event) ? event.impactDelayMs : 0;

  return event.timeMs + event.movement.durationMs + impactDelay;
}

function createBattleResultStats(plan: BattlePlan): BattleResultStats {
  const damageByFighter: Record<string, number> = {};
  const finalHpByFighter: Record<string, number> = {};

  for (const fighterId of Object.keys(plan.fighters)) {
    damageByFighter[fighterId] = 0;
    finalHpByFighter[fighterId] = getPlanFighter(plan, fighterId).maxHp;
  }

  let combatActions = 0;
  let hits = 0;
  let criticals = 0;
  let blocks = 0;
  let misses = 0;
  let successfulNets = 0;
  let escapedNets = 0;
  let javelinHits = 0;
  let javelinBlocks = 0;
  let javelinDodges = 0;

  for (const event of [...plan.events].sort(
    (a, b) => getEventResolutionTimeMs(a) - getEventResolutionTimeMs(b) || a.index - b.index,
  )) {
    finalHpByFighter[event.defenderId] = event.defenderHp;

    if (event.damage > 0) {
      damageByFighter[event.attackerId] =
        (damageByFighter[event.attackerId] ?? 0) + event.damage;
    }

    if (!isCombatEvent(event)) {
      continue;
    }

    combatActions += 1;

    if (event.outcome === "hit") {
      hits += 1;
    } else if (event.outcome === "block") {
      blocks += 1;
    } else {
      misses += 1;
    }

    if (event.critical) {
      criticals += 1;
    }

    if (event.netTrap?.escaped) {
      escapedNets += 1;
    } else if (event.netTrap) {
      successfulNets += 1;
    }

    if (event.actionType === "javelin") {
      if (event.outcome === "hit") {
        javelinHits += 1;
      } else if (event.outcome === "block") {
        javelinBlocks += 1;
      } else {
        javelinDodges += 1;
      }
    }
  }

  return {
    totalActions: plan.events.length,
    combatActions,
    hits,
    criticals,
    blocks,
    misses,
    successfulNets,
    escapedNets,
    javelinHits,
    javelinBlocks,
    javelinDodges,
    damageByFighter,
    finalHpByFighter,
  };
}

function createBattleAudioController(): BattleAudioController {
  const activeSounds = new Set<HTMLAudioElement>();
  const soundBaseVolumes = new WeakMap<HTMLAudioElement, number>();
  let ambientSound: HTMLAudioElement | null = null;
  let masterVolume = getStoredBattleVolume();
  let muted = masterVolume <= 0;

  const cleanupSound = (sound: HTMLAudioElement): void => {
    activeSounds.delete(sound);
  };

  const applyEffectiveVolume = (sound: HTMLAudioElement): void => {
    const baseVolume = soundBaseVolumes.get(sound) ?? sound.volume;
    sound.muted = muted || masterVolume <= 0;
    sound.volume = clampMasterVolume(baseVolume * masterVolume);
  };

  const registerBaseVolume = (sound: HTMLAudioElement, baseVolume: number): void => {
    soundBaseVolumes.set(sound, clampMasterVolume(baseVolume));
    applyEffectiveVolume(sound);
  };

  const refreshActiveVolumes = (): void => {
    for (const sound of activeSounds) {
      applyEffectiveVolume(sound);
    }
  };

  const trackSound = (sound: HTMLAudioElement): void => {
    activeSounds.add(sound);
    sound.addEventListener("ended", () => cleanupSound(sound), { once: true });
    sound.addEventListener("error", () => cleanupSound(sound), { once: true });
  };

  const safeResetTime = (sound: HTMLAudioElement): void => {
    try {
      sound.currentTime = 0;
    } catch {
      // Some browsers throw while metadata is still loading.
    }
  };

  const stopAll = (): void => {
    for (const sound of activeSounds) {
      sound.pause();
      safeResetTime(sound);
    }

    activeSounds.clear();
    ambientSound = null;
  };

  const playOneShot = (url: string, volume: number): void => {
    const sound = new Audio(url);
    registerBaseVolume(sound, volume);
    sound.preload = "auto";
    trackSound(sound);

    void sound.play().catch(() => {
      cleanupSound(sound);
    });
  };

  const startBattle = (): void => {
    stopAll();

    const sound = new Audio(coliseumUrl);
    sound.loop = true;
    registerBaseVolume(sound, 0.42);
    sound.preload = "auto";
    ambientSound = sound;
    trackSound(sound);

    void sound.play().catch(() => {
      if (ambientSound === sound) {
        ambientSound = null;
      }
      cleanupSound(sound);
    });
  };

  const playAttack = (attackCssClass: string): void => {
    const url = attackSoundUrls[attackCssClass];
    if (!url) {
      return;
    }

    playOneShot(url, attackCssClass === "attack-net-throw" ? 0.78 : 0.84);
  };

  const playApplause = (level: CrowdApplauseLevel): Promise<void> => {
    const sound = new Audio(applauseSoundUrls[level]);
    registerBaseVolume(sound, applauseVolumes[level]);
    sound.preload = "auto";
    trackSound(sound);

    return new Promise((resolve) => {
      const finish = (): void => {
        cleanupSound(sound);
        resolve();
      };

      sound.addEventListener("ended", finish, { once: true });
      sound.addEventListener("error", finish, { once: true });

      void sound.play().catch(() => {
        finish();
      });
    });
  };

  const playBlock = (classId: string): void => {
    const url = blockSoundUrls[classId];
    if (!url) {
      return;
    }

    playOneShot(url, 0.88);
  };

  const playBlood = (): void => {
    const soundIndex = Math.floor(Math.random() * bloodSoundUrls.length);
    playOneShot(bloodSoundUrls[soundIndex] ?? bloodUrl, 0.82);
  };

  const playFinaleAndStop = (): void => {
    void playApplause("high").finally(() => stopAll());
  };

  const setMasterVolume = (volume: number): void => {
    masterVolume = clampMasterVolume(volume);
    storeBattleVolume(masterVolume);
    refreshActiveVolumes();
  };

  const setMuted = (nextMuted: boolean): void => {
    muted = nextMuted;
    refreshActiveVolumes();
  };

  const getMasterVolume = (): number => masterVolume;

  const isMuted = (): boolean => muted;

  return {
    startBattle,
    playAttack,
    playApplause,
    playBlock,
    playBlood,
    playFinaleAndStop,
    setMasterVolume,
    setMuted,
    getMasterVolume,
    isMuted,
    stopAll,
  };
}

export function createGladiatorShowcase(container: HTMLElement): () => void {
  const autoRoster: Roster = createAutoRoster();
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
  const overlay = document.createElement("div");
  overlay.className = "showcase-overlay";
  overlay.innerHTML = `
    <header class="showcase-header">
      <div class="showcase-header-bar">
        <div class="showcase-header-copy">
          <h1 class="showcase-title">Gladiators Online</h1>
        </div>
        <button
          class="gladiator-types-btn"
          type="button"
          data-gladiator-types-open
          aria-haspopup="dialog"
          aria-expanded="false"
        >
          Типи гладіаторів
        </button>
      </div>
    </header>

    <section class="battle-arena-panel" aria-label="Арена бою">
      <div class="battle-toolbar">
        <div>
          <p class="battle-kicker">Симуляція</p>
          <p class="battle-status" data-battle-status>Арена готова до жеребу.</p>
        </div>
        <div class="battle-actions">
          <div class="battle-volume-control" data-volume-control>
            <button
              class="battle-volume-toggle"
              type="button"
              data-volume-toggle
              aria-label="Вимкнути звук"
              aria-pressed="false"
            >
              <svg class="battle-volume-icon battle-volume-icon-on" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4Z"></path>
                <path d="M16 8.5a5 5 0 0 1 0 7"></path>
                <path d="M18.5 6a8.5 8.5 0 0 1 0 12"></path>
              </svg>
              <svg class="battle-volume-icon battle-volume-icon-off" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4Z"></path>
                <path d="m16 9 5 5"></path>
                <path d="m21 9-5 5"></path>
              </svg>
            </button>
            <input
              class="battle-volume-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value="100"
              data-volume-slider
              aria-label="Загальна гучність"
            />
          </div>
          <button class="battle-button" type="button" data-battle-button>Бій</button>
        </div>
      </div>

      <div class="training-panel" data-training-panel>
        <div class="training-panel-head">
          <div class="training-mode-toggle" role="group" aria-label="Training mode">
            <button class="training-mode-button is-active" type="button" data-training-mode="auto">Auto</button>
            <button class="training-mode-button" type="button" data-training-mode="manual">Manual</button>
          </div>
          <span>Level 0: ${LEVEL_ZERO_STAT_POINTS} pts</span>
          <span>+${POINTS_PER_GLADIATOR_LEVEL} pts / lvl</span>
          <span class="training-panel-hint" data-training-mode-hint></span>
        </div>
        <div class="training-body" data-training-body></div>
      </div>

      <div class="battle-field">
        <div class="battle-team-column" data-team-column="left"></div>
        <div class="arena-stage" data-arena-stage>
          <div class="arena-world" data-arena-world>
            <div class="arena-crowd"></div>
            <div class="arena-fighters" data-arena-fighters></div>
          </div>
        </div>
        <div class="battle-team-column" data-team-column="right"></div>
      </div>

      <div class="battle-summary">
        <div class="battle-result" data-battle-result>Результат ще не визначено.</div>
        <div class="battle-log" data-battle-log aria-live="polite"></div>
      </div>
    </section>

    <div class="gladiator-types-modal" data-gladiator-types-modal hidden aria-hidden="true">
      <section
        class="gladiator-types-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gladiator-types-title"
      >
        <button
          class="gladiator-types-close"
          type="button"
          data-gladiator-types-close
          aria-label="Закрити довідник типів"
        >
          ×
        </button>
        <p class="gladiator-types-kicker">Довідник арени</p>
        <h2 class="gladiator-types-title" id="gladiator-types-title">Типи гладіаторів</h2>
        <p class="gladiator-types-lead">
          Базові архетипи, стартові характеристики та озброєння. Без персональних імен і без поточних бонусів зі сцени.
        </p>
        <section class="gladiator-cards gladiator-cards--modal" aria-label="Типи гладіаторів">
          ${initialTypeCards}
        </section>
      </section>
    </div>
  `;

  container.appendChild(overlay);

  const battleButtonCandidate = overlay.querySelector<HTMLButtonElement>("[data-battle-button]");
  const volumeToggleCandidate = overlay.querySelector<HTMLButtonElement>("[data-volume-toggle]");
  const volumeSliderCandidate = overlay.querySelector<HTMLInputElement>("[data-volume-slider]");
  const statusCandidate = overlay.querySelector<HTMLElement>("[data-battle-status]");
  const resultCandidate = overlay.querySelector<HTMLElement>("[data-battle-result]");
  const logCandidate = overlay.querySelector<HTMLElement>("[data-battle-log]");
  const stageCandidate = overlay.querySelector<HTMLElement>("[data-arena-stage]");
  const typesButtonCandidate = overlay.querySelector<HTMLButtonElement>("[data-gladiator-types-open]");
  const typesModalCandidate = overlay.querySelector<HTMLElement>("[data-gladiator-types-modal]");

  if (
    !battleButtonCandidate ||
    !volumeToggleCandidate ||
    !volumeSliderCandidate ||
    !statusCandidate ||
    !resultCandidate ||
    !logCandidate ||
    !stageCandidate ||
    !typesButtonCandidate ||
    !typesModalCandidate
  ) {
    throw new Error("Battle UI was not created correctly");
  }

  const battleButton = battleButtonCandidate;
  const volumeToggle = volumeToggleCandidate;
  const volumeSlider = volumeSliderCandidate;
  const statusEl = statusCandidate;
  const resultEl = resultCandidate;
  const logEl = logCandidate;
  const stageEl = stageCandidate;
  const typesButton = typesButtonCandidate;
  const typesModal = typesModalCandidate;

  const setGladiatorTypesModalOpen = (open: boolean): void => {
    typesModal.hidden = !open;
    typesModal.setAttribute("aria-hidden", open ? "false" : "true");
    typesButton.setAttribute("aria-expanded", open ? "true" : "false");
  };

  setGladiatorTypesModalOpen(false);

  const skeletons = new Map<string, Skeleton2D>();
  const walkTokens = new Map<string, number>();
  const javelinCounts = new Map<string, number>();
  const timers = new Set<number>();
  const defeatedFighters = new Set<string>();
  const successfulHitStreaks = new Map<string, number>();
  const successfulDodgeStreaks = new Map<string, number>();
  const battleAudio = createBattleAudioController();
  let lastAudibleVolume =
    battleAudio.getMasterVolume() > 0
      ? battleAudio.getMasterVolume()
      : DEFAULT_RESTORED_BATTLE_VOLUME;
  let disposed = false;
  let isBattlePlaying = false;
  let isBattleComplete = false;
  let currentRun = 0;

  const teamColumnEls: Record<TeamId, HTMLElement> = {
    left: overlay.querySelector<HTMLElement>('[data-team-column="left"]')!,
    right: overlay.querySelector<HTMLElement>('[data-team-column="right"]')!,
  };
  const arenaFightersEl = overlay.querySelector<HTMLElement>("[data-arena-fighters]")!;
  const trainingBodyEl = overlay.querySelector<HTMLElement>("[data-training-body]")!;
  const trainingModeHintEl = overlay.querySelector<HTMLElement>("[data-training-mode-hint]")!;

  function syncVolumeControl(): void {
    const volume = battleAudio.getMasterVolume();
    const isMuted = battleAudio.isMuted() || volume <= 0;
    const label = isMuted ? "Увімкнути звук" : "Вимкнути звук";

    volumeSlider.value = String(Math.round(volume * 100));
    volumeToggle.classList.toggle("is-muted", isMuted);
    volumeToggle.setAttribute("aria-label", label);
    volumeToggle.setAttribute("aria-pressed", isMuted ? "true" : "false");
    volumeToggle.title = label;
  }

  const onVolumeSliderInput = (): void => {
    const sliderValue = Number(volumeSlider.value);
    const nextVolume = clampMasterVolume(
      Number.isFinite(sliderValue) ? sliderValue / 100 : 0,
    );

    battleAudio.setMasterVolume(nextVolume);

    if (nextVolume > 0) {
      lastAudibleVolume = nextVolume;
      battleAudio.setMuted(false);
    } else {
      battleAudio.setMuted(true);
    }

    syncVolumeControl();
  };

  const onVolumeToggleClick = (): void => {
    const shouldMute = !battleAudio.isMuted() && battleAudio.getMasterVolume() > 0;

    if (shouldMute) {
      battleAudio.setMuted(true);
    } else {
      const restoredVolume =
        battleAudio.getMasterVolume() > 0
          ? battleAudio.getMasterVolume()
          : lastAudibleVolume;
      battleAudio.setMasterVolume(restoredVolume);
      battleAudio.setMuted(false);
    }

    syncVolumeControl();
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
    renderTeamColumns();
    renderArenaFighters();
    rebuildArenaSkeletons();
    renderTrainingBody();
    setInitialFighterPositions();
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, Math.max(0, ms));
      timers.add(timer);
    });
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
    const fighterEl = getFighterElement(fighterId);
    if (!fighterEl) return;

    const metrics = getArenaRenderMetrics(point);
    fighterEl.style.setProperty("--move-duration", `${Math.max(0, durationMs)}ms`);
    fighterEl.style.setProperty("--transform-duration", `${Math.max(0, durationMs)}ms`);
    fighterEl.style.setProperty("--arena-x", `${metrics.x.toFixed(3)}%`);
    fighterEl.style.setProperty("--arena-bottom", `${metrics.bottom.toFixed(3)}%`);
    fighterEl.style.setProperty("--arena-scale", metrics.scale.toFixed(3));
    fighterEl.style.setProperty("--arena-z", String(metrics.z));
  }

  function stopWalkLoop(fighterId: string): void {
    walkTokens.set(fighterId, (walkTokens.get(fighterId) ?? 0) + 1);
    const fighterEl = getFighterElement(fighterId);
    fighterEl?.classList.remove("is-walking", "is-rushing");
    skeletons.get(fighterId)?.stop();
  }

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

  function startWalkLoop(
    fighterId: string,
    runId: number,
    speedMultiplier: number,
  ): void {
    const fighterEl = getFighterElement(fighterId);
    const skeleton = skeletons.get(fighterId);
    const clip = walkClipMap[getFighterClassId(fighterId)];
    const token = (walkTokens.get(fighterId) ?? 0) + 1;

    walkTokens.set(fighterId, token);
    fighterEl?.classList.add("is-walking");
    fighterEl?.style.setProperty(
      "--walk-cycle",
      `${Math.max(460, Math.round((clip?.duration ?? 760) / speedMultiplier))}ms`,
    );

    if (!skeleton || !clip) return;

    const walkClip = {
      ...clip,
      duration: Math.max(460, Math.round(clip.duration / speedMultiplier)),
    };

    void (async () => {
      while (!disposed && runId === currentRun && walkTokens.get(fighterId) === token) {
        await skeleton.play(walkClip);
      }
    })();
  }

  async function moveFighterTo(
    fighterId: string,
    from: BattlePoint,
    to: BattlePoint,
    durationMs: number,
    runId: number,
    rush: boolean,
  ): Promise<void> {
    const distance = getPointDistance(from, to);

    if (distance < UI_MIN_MOVEMENT_DISTANCE || durationMs <= 0) {
      setFighterArenaPosition(fighterId, to, 0);
      return;
    }

    const fighterEl = getFighterElement(fighterId);
    const speedMultiplier = rush ? 1.06 : 0.72;

    if (rush) {
      fighterEl?.classList.add("is-rushing");
    }

    startWalkLoop(fighterId, runId, speedMultiplier);
    setFighterArenaPosition(fighterId, to, durationMs);
    await wait(durationMs);

    if (disposed || runId !== currentRun) return;

    stopWalkLoop(fighterId);
    setFighterArenaPosition(fighterId, to, 0);
  }

  async function moveFightersForEvent(event: BattleEvent, runId: number): Promise<void> {
    const { movement } = event;
    const moves = [
      moveFighterTo(
        event.attackerId,
        movement.attackerFrom,
        movement.attackerTo,
        movement.attackerDurationMs,
        runId,
        movement.rush,
      ),
    ];

    if (
      movement.defenderDurationMs > 0 ||
      getPointDistance(movement.defenderFrom, movement.defenderTo) >= UI_MIN_MOVEMENT_DISTANCE
    ) {
      moves.push(
        moveFighterTo(
          event.defenderId,
          movement.defenderFrom,
          movement.defenderTo,
          movement.defenderDurationMs,
          runId,
          movement.defenderRush,
        ),
      );
    }

    await Promise.all(moves);
  }

  function playDefenseReaction(
    fighterId: string,
    outcome: DefenseOutcome,
  ): Promise<void> {
    const skeleton = skeletons.get(fighterId);
    const clip = defenseClipMap[getFighterClassId(fighterId)]?.[outcome];

    return skeleton && clip ? skeleton.play(clip) : Promise.resolve();
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
    for (const fighter of runtimeFighters) {
      if (fighter.classId === "retiarius") {
        setHandNetVisible(fighter.id, true);
      }
    }
  }

  function setHandJavelinCount(fighterId: string, count: number): void {
    const clamped = Math.max(0, Math.min(VELES_STARTING_JAVELINS, count));
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
      hand.style.opacity = clamped >= 1 ? "" : "0";
      hand.style.pointerEvents = clamped >= 1 ? "" : "none";
    }

    if (reserveTwo) {
      reserveTwo.style.opacity = clamped >= 2 ? "" : "0";
    }

    if (reserveThree) {
      reserveThree.style.opacity = clamped >= 3 ? "" : "0";
    }

    javelinCounts.set(fighterId, clamped);
  }

  function resetAllHandJavelins(): void {
    for (const fighter of runtimeFighters) {
      if (fighter.classId === "veles") {
        setHandJavelinCount(fighter.id, VELES_STARTING_JAVELINS);
      }
    }
  }

  type StagePoint = { x: number; y: number };

  function getFighterStagePoint(
    fighterId: string,
    anchor: "throw" | "body" | "evade" | "ground",
  ): StagePoint {
    const stageRect = stageEl.getBoundingClientRect();
    const fighterEl = getFighterElement(fighterId);

    if (!fighterEl) {
      return { x: stageRect.width / 2, y: stageRect.height / 2 };
    }

    const fighterRect = fighterEl.getBoundingClientRect();
    const side = fighterEl.dataset["side"] === "left" ? "left" : "right";
    const x = fighterRect.left - stageRect.left;
    const y = fighterRect.top - stageRect.top;

    if (anchor === "throw") {
      return {
        x: x + fighterRect.width * (side === "left" ? 0.72 : 0.28),
        y: y + fighterRect.height * 0.62,
      };
    }

    if (anchor === "evade") {
      return {
        x: x + fighterRect.width * (side === "left" ? 0.08 : 0.92),
        y: y + fighterRect.height * 0.54,
      };
    }

    if (anchor === "ground") {
      return {
        x: x + fighterRect.width * 0.5,
        y: y + fighterRect.height * 0.9,
      };
    }

    return {
      x: x + fighterRect.width * 0.5,
      y: y + fighterRect.height * 0.55,
    };
  }

  function getElementStageCenter(element: HTMLElement): StagePoint {
    const stageRect = stageEl.getBoundingClientRect();
    const rect = element.getBoundingClientRect();

    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  }

  function createNetElement(className: string): HTMLDivElement {
    const net = document.createElement("div");
    net.className = `combat-net ${className}`;
    return net;
  }

  function setStageNetTransform(
    net: HTMLElement,
    point: StagePoint,
    rotationDeg: number,
    scale: number,
  ): void {
    net.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${rotationDeg}deg) scale(${scale})`;
  }

  async function flyNetToTarget(event: BattleEvent, runId: number): Promise<HTMLElement | null> {
    const net = createNetElement("stage-net flying-net");
    const start = getFighterStagePoint(event.attackerId, "throw");
    const end = getFighterStagePoint(
      event.defenderId,
      event.netTrap?.escaped ? "evade" : "body",
    );

    stageEl.appendChild(net);
    const attackerSide = runtimeFighters.find((fighter) => fighter.id === event.attackerId)?.teamId;
    setStageNetTransform(net, start, attackerSide === "right" ? -18 : 18, 0.58);
    void net.offsetWidth;
    net.classList.add("is-flying");
    setStageNetTransform(
      net,
      end,
      event.netTrap?.escaped ? 28 : -8,
      event.netTrap?.escaped ? 0.86 : 1.08,
    );

    await wait(NET_FLIGHT_MS);

    if (disposed || runId !== currentRun) {
      net.remove();
      return null;
    }

    return net;
  }

  async function dropStageNet(
    net: HTMLElement,
    groundPoint: StagePoint,
    runId: number,
  ): Promise<void> {
    net.classList.remove("flying-net", "caught-net");
    net.classList.add("fallen-net");
    void net.offsetWidth;
    setStageNetTransform(net, groundPoint, 14, 0.76);

    await wait(NET_DROP_MS);

    if (disposed || runId !== currentRun) {
      net.remove();
      return;
    }

    net.classList.add("is-on-ground");
  }

  function attachCaughtNet(fighterId: string): void {
    const fighterEl = getFighterElement(fighterId);

    if (!fighterEl) {
      return;
    }

    fighterEl.querySelector<HTMLElement>(".caught-net")?.remove();
    fighterEl.appendChild(createNetElement("caught-net"));
  }

  function scheduleNetRelease(fighterId: string, holdMs: number, runId: number): void {
    void (async () => {
      await wait(holdMs);

      if (disposed || runId !== currentRun) return;

      const fighterEl = getFighterElement(fighterId);
      const caughtNet = fighterEl?.querySelector<HTMLElement>(".caught-net");
      const start = caughtNet
        ? getElementStageCenter(caughtNet)
        : getFighterStagePoint(fighterId, "body");
      const fallingNet = createNetElement("stage-net fallen-net");

      caughtNet?.remove();
      fighterEl?.classList.remove("is-netted");
      stageEl.appendChild(fallingNet);
      setStageNetTransform(fallingNet, start, -6, 1);
      void fallingNet.offsetWidth;
      await dropStageNet(fallingNet, getFighterStagePoint(fighterId, "ground"), runId);
    })();
  }

  function createJavelinElement(className: string): HTMLDivElement {
    const javelin = document.createElement("div");
    javelin.className = `combat-javelin ${className}`;
    return javelin;
  }

  function getPointAngleDeg(from: StagePoint, to: StagePoint): number {
    return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  }

  function setStageJavelinTransform(
    javelin: HTMLElement,
    point: StagePoint,
    rotationDeg: number,
    scale: number,
  ): void {
    javelin.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${rotationDeg}deg) scale(${scale})`;
  }

  async function flyJavelinToTarget(event: BattleEvent, runId: number): Promise<HTMLElement | null> {
    const javelin = createJavelinElement("stage-javelin flying-javelin");
    const start = getFighterStagePoint(event.attackerId, "throw");
    const end = getFighterStagePoint(event.defenderId, event.outcome === "miss" ? "evade" : "body");
    const angle = getPointAngleDeg(start, end);

    stageEl.appendChild(javelin);
    setStageJavelinTransform(javelin, start, angle, 0.72);
    void javelin.offsetWidth;
    javelin.classList.add("is-flying");
    setStageJavelinTransform(javelin, end, angle, event.outcome === "miss" ? 0.9 : 0.82);

    await wait(JAVELIN_FLIGHT_MS);

    if (disposed || runId !== currentRun) {
      javelin.remove();
      return null;
    }

    return javelin;
  }

  async function flyJavelinPastTarget(
    javelin: HTMLElement,
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    const start = getFighterStagePoint(event.attackerId, "throw");
    const evade = getFighterStagePoint(event.defenderId, "evade");
    const dx = evade.x - start.x;
    const dy = evade.y - start.y;
    const distance = Math.hypot(dx, dy) || 1;
    const stageRect = stageEl.getBoundingClientRect();
    const exitDistance = Math.max(stageRect.width * 0.42, 260);
    const exit = {
      x: evade.x + (dx / distance) * exitDistance,
      y: evade.y + (dy / distance) * exitDistance * 0.34,
    };

    javelin.classList.remove("flying-javelin");
    javelin.classList.add("escaped-javelin");
    void javelin.offsetWidth;
    setStageJavelinTransform(javelin, exit, getPointAngleDeg(start, evade), 0.78);

    await wait(JAVELIN_EXIT_MS);

    if (disposed || runId !== currentRun) {
      javelin.remove();
      return;
    }

    javelin.remove();
  }

  async function dropStageJavelin(
    javelin: HTMLElement,
    groundPoint: StagePoint,
    runId: number,
  ): Promise<void> {
    javelin.classList.remove("flying-javelin", "escaped-javelin");
    javelin.classList.add("fallen-javelin");
    void javelin.offsetWidth;
    setStageJavelinTransform(javelin, groundPoint, -18 + Math.random() * 36, 0.7);

    await wait(JAVELIN_DROP_MS);

    if (disposed || runId !== currentRun) {
      javelin.remove();
      return;
    }

    javelin.classList.add("is-on-ground");
  }

  function resetArenaNets(): void {
    overlay.querySelectorAll<HTMLElement>(".combat-net, .combat-javelin").forEach((throwable) => {
      throwable.remove();
    });
    resetAllHandNets();
    resetAllHandJavelins();
  }

  function clearBattleFinale(): void {
    stageEl.querySelectorAll<HTMLElement>(".battle-finale, .confetti-layer").forEach((item) => {
      item.remove();
    });
  }

  function resetToInitialState(): void {
    window.location.reload();
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

  function resetCrowdReactionCounters(): void {
    successfulHitStreaks.clear();
    successfulDodgeStreaks.clear();

    for (const fighter of runtimeFighters) {
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

  function syncBattleButtonState(): void {
    const ready = canStartBattle();

    battleButton.disabled = isBattlePlaying || !ready;

    if (isBattlePlaying) {
      return;
    }

    if (isBattleComplete) {
      battleButton.disabled = false;
      battleButton.textContent = "Новий бій";
      return;
    }

    if (!ready) {
      battleButton.textContent = "Розподіліть бали";
      statusEl.textContent = "У ручному режимі всі бонусні бали рівня мають бути розподілені перед боєм.";
      return;
    }

    battleButton.textContent = "Бій";
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
    for (const fighter of runtimeFighters) {
      getFighterElement(fighter.id)?.classList.remove("is-winded");
    }

    const teamWinded: Record<TeamId, boolean> = { left: false, right: false };
    for (const snapshot of event.fatigue) {
      if (snapshot.winded) {
        getFighterElement(snapshot.fighterId)?.classList.add("is-winded");
        const fighter = runtimeFighters.find((item) => item.id === snapshot.fighterId);
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
    if (disposed || runId !== currentRun) return;
    if (isEventBlockedByDefeat(event)) {
      finishNetThrow();
      return;
    }

    battleAudio.playAttack(event.attackCssClass);
    setHandNetVisible(event.attackerId, false);
    const flyingNet = await flyNetToTarget(event, runId);
    if (!flyingNet || disposed || runId !== currentRun) {
      finishNetThrow();
      return;
    }

    if (netTrap.escaped) {
      defenderEl.classList.add("is-evading");
      recordCrowdReaction(event);
      defenseAnimation = playDefenseReaction(event.defenderId, "miss");
      showFloatingText(event.defenderId, "Ухил", "miss");
      appendLog(event);
      void dropStageNet(flyingNet, getFighterStagePoint(event.defenderId, "ground"), runId);
    } else {
      recordCrowdReaction(event);
      disableNettedFighter(event.defenderId);
      flyingNet.remove();
      attachCaughtNet(event.defenderId);
      defenderEl.classList.add("is-netted");
      showFloatingText(event.defenderId, formatDuration(netTrap.durationMs), "net");
      appendLog(event);
      scheduleNetRelease(
        event.defenderId,
        Math.max(NET_DROP_MS, netTrap.durationMs - Math.round(clipDuration * 0.38) - NET_FLIGHT_MS),
        runId,
      );
    }

    await wait(Math.round(clipDuration * 0.22));
    await Promise.all([animation, defenseAnimation]);

    finishNetThrow();

    await wait(REACTION_SETTLE_MS);
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

    if (!attackerEl || !defenderEl) return;
    if (isEventBlockedByDefeat(event)) return;

    attackerEl.style.setProperty("--transform-duration", `${ATTACK_TRANSFORM_MS}ms`);
    attackerEl.classList.add("is-attacking");
    attackerSvg?.classList.add("attacking");
    const animation = skeleton && clip ? skeleton.play(clip) : Promise.resolve();
    let defenseAnimation: Promise<void> = Promise.resolve();
    const finishJavelinThrow = (): void => {
      attackerSvg?.classList.remove("attacking");
      attackerEl.classList.remove("is-attacking");
      skeleton?.stop();
    };

    await wait(Math.max(220, event.impactDelayMs - JAVELIN_FLIGHT_MS));
    if (disposed || runId !== currentRun) return;
    if (isEventBlockedByDefeat(event)) {
      finishJavelinThrow();
      return;
    }

    battleAudio.playAttack(event.attackCssClass);
    const remaining = Math.max(
      0,
      (javelinCounts.get(event.attackerId) ?? VELES_STARTING_JAVELINS) - 1,
    );
    setHandJavelinCount(event.attackerId, remaining);
    const flyingJavelin = await flyJavelinToTarget(event, runId);
    if (!flyingJavelin || disposed || runId !== currentRun) {
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
      void dropStageJavelin(flyingJavelin, getFighterStagePoint(event.defenderId, "ground"), runId);
    } else if (event.outcome === "block") {
      defenderEl.classList.add("is-blocking");
      recordCrowdReaction(event);
      battleAudio.playBlock(getFighterClassId(event.defenderId));
      defenseAnimation = playDefenseReaction(event.defenderId, "block");
      showFloatingText(event.defenderId, "Блок", "block");
      appendLog(event);
      void dropStageJavelin(flyingJavelin, getFighterStagePoint(event.defenderId, "ground"), runId);
    } else {
      defenderEl.classList.add("is-evading");
      recordCrowdReaction(event);
      defenseAnimation = playDefenseReaction(event.defenderId, "miss");
      showFloatingText(event.defenderId, "Ухил", "miss");
      appendLog(event);
      void flyJavelinPastTarget(flyingJavelin, event, runId);
    }

    await wait(Math.max(0, clipDuration - event.impactDelayMs));
    await Promise.all([animation, defenseAnimation]);

    finishJavelinThrow();

    await wait(REACTION_SETTLE_MS);
    defenderEl.classList.remove("is-hit", "is-critical-hit", "is-blocking", "is-evading");
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
    if (disposed || runId !== currentRun) return;
    if (isEventBlockedByDefeat(event)) {
      finishAttackAnimation(attack);
      return;
    }

    const defenseAnimation = resolveStrikeImpact(plan, event);
    appendLog(event);

    await wait(Math.max(0, attack.durationMs - event.impactDelayMs));
    await Promise.all([attack.animation, defenseAnimation]);

    finishAttackAnimation(attack);

    await wait(REACTION_SETTLE_MS);
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
    if (disposed || runId !== currentRun) return;
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

    finishAttackAnimation(attack);
    finishAttackAnimation(counter);

    await wait(REACTION_SETTLE_MS);
    defenderEl.classList.remove("is-hit", "is-critical-hit", "is-blocking", "is-evading");
    getFighterElement(counterAttack.attackerId)?.classList.remove(
      "is-hit",
      "is-critical-hit",
      "is-blocking",
      "is-evading",
      "is-interrupted",
    );
  }

  async function playBattleEvent(
    plan: BattlePlan,
    event: BattleEvent,
    runId: number,
  ): Promise<void> {
    if (isEventBlockedByDefeat(event)) return;

    await moveFightersForEvent(event, runId);
    if (disposed || runId !== currentRun) return;
    if (isEventBlockedByDefeat(event)) return;

    if (event.actionType === "move" || event.actionType === "recover") {
      updateFatigueVisuals(event);
      return;
    }

    if (event.netTrap) {
      await playNetThrowEvent(event, runId);
      return;
    }

    if (event.actionType === "javelin") {
      await playJavelinThrowEvent(plan, event, runId);
      return;
    }

    if (event.counterAttack) {
      await playContestedStrikeEvent(plan, event, runId);
      return;
    }

    await playStrikeEvent(plan, event, runId);
  }

  function appendResultMetric(parent: HTMLElement, label: string, value: string): void {
    const metric = document.createElement("div");
    metric.className = "battle-result-metric";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const valueEl = document.createElement("strong");
    valueEl.textContent = value;

    metric.append(labelEl, valueEl);
    parent.append(metric);
  }

  function getTeamDamage(plan: BattlePlan, stats: BattleResultStats, teamId: BattleTeamId): number {
    let total = 0;
    for (const fighterId of Object.keys(plan.fighters)) {
      if (plan.teams[fighterId] === teamId) {
        total += stats.damageByFighter[fighterId] ?? 0;
      }
    }
    return total;
  }

  function getTeamSurvivors(
    plan: BattlePlan,
    stats: BattleResultStats,
    teamId: BattleTeamId,
  ): { alive: number; total: number } {
    let alive = 0;
    let total = 0;
    for (const fighterId of Object.keys(plan.fighters)) {
      if (plan.teams[fighterId] === teamId) {
        total += 1;
        if ((stats.finalHpByFighter[fighterId] ?? 0) > 0) {
          alive += 1;
        }
      }
    }
    return { alive, total };
  }

  function renderBattleResult(plan: BattlePlan, stats: BattleResultStats): void {
    const winnerLabel = TEAM_LABELS[plan.winnerTeamId];
    const loserLabel = TEAM_LABELS[plan.loserTeamId];
    const winnerSurvivors = getTeamSurvivors(plan, stats, plan.winnerTeamId);
    const loserSurvivors = getTeamSurvivors(plan, stats, plan.loserTeamId);
    const resultTitle = document.createElement("strong");
    const resultDetails = document.createElement("span");
    const resultMetrics = document.createElement("div");

    resultEl.replaceChildren();
    resultEl.classList.add("is-final");

    resultTitle.className = "battle-result-title";
    resultTitle.textContent = `Перемога: ${winnerLabel}`;

    resultDetails.className = "battle-result-details";
    resultDetails.textContent = `${winnerLabel}: ${winnerSurvivors.alive}/${winnerSurvivors.total} вижило. ${loserLabel}: ${loserSurvivors.alive}/${loserSurvivors.total} вижило.`;

    resultMetrics.className = "battle-result-metrics";
    appendResultMetric(resultMetrics, "Тривалість", formatDuration(plan.durationMs));
    appendResultMetric(resultMetrics, "Дій", String(stats.totalActions));
    appendResultMetric(resultMetrics, "Влучань", `${stats.hits}/${stats.combatActions}`);
    appendResultMetric(
      resultMetrics,
      "Списи",
      `${stats.javelinHits} / ${stats.javelinBlocks} / ${stats.javelinDodges}`,
    );
    appendResultMetric(
      resultMetrics,
      "Шкода",
      `${getTeamDamage(plan, stats, plan.winnerTeamId)} / ${getTeamDamage(plan, stats, plan.loserTeamId)} HP`,
    );

    resultEl.append(resultTitle, resultDetails, resultMetrics);
  }

  function launchConfetti(): void {
    const layer = document.createElement("div");
    const colors = ["#f0c040", "#e64d4d", "#40c080", "#60c0f0", "#f7f0d2", "#b66ef0"];
    const fallDistance = Math.max(stageEl.clientHeight + 96, 520);

    layer.className = "confetti-layer";
    layer.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 96; i += 1) {
      const piece = document.createElement("i");
      const color = colors[i % colors.length] ?? "#f0c040";
      const left = Math.random() * 100;
      const drift = Math.round((Math.random() - 0.5) * 260);
      const rotate = Math.round(360 + Math.random() * 920);
      const delay = Math.round(Math.random() * 520);
      const duration = Math.round(2_700 + Math.random() * 1_850);
      const width = Math.round(6 + Math.random() * 7);
      const height = Math.round(9 + Math.random() * 12);

      piece.className = "confetti-piece";
      piece.style.left = `${left.toFixed(2)}%`;
      piece.style.setProperty("--confetti-color", color);
      piece.style.setProperty("--confetti-drift", `${drift}px`);
      piece.style.setProperty("--confetti-rotate", `${rotate}deg`);
      piece.style.setProperty("--confetti-delay", `${delay}ms`);
      piece.style.setProperty("--confetti-duration", `${duration}ms`);
      piece.style.setProperty("--confetti-width", `${width}px`);
      piece.style.setProperty("--confetti-height", `${height}px`);
      piece.style.setProperty("--confetti-fall", `${fallDistance}px`);
      layer.appendChild(piece);
    }

    stageEl.appendChild(layer);

    const timer = window.setTimeout(() => {
      timers.delete(timer);
      layer.remove();
    }, 6_200);
    timers.add(timer);
  }

  function showBattleFinale(plan: BattlePlan, stats: BattleResultStats): void {
    const winnerLabel = TEAM_LABELS[plan.winnerTeamId];
    const loserLabel = TEAM_LABELS[plan.loserTeamId];
    const winnerSurvivors = getTeamSurvivors(plan, stats, plan.winnerTeamId);
    const loserSurvivors = getTeamSurvivors(plan, stats, plan.loserTeamId);
    const finale = document.createElement("div");
    const kicker = document.createElement("p");
    const title = document.createElement("h2");
    const subtitle = document.createElement("p");
    const metrics = document.createElement("div");
    const actions = document.createElement("div");
    const newBattleButton = document.createElement("button");
    const resultsButton = document.createElement("button");

    clearBattleFinale();

    finale.className = "battle-finale";
    finale.setAttribute("role", "status");
    finale.setAttribute("aria-live", "polite");

    kicker.className = "battle-finale-kicker";
    kicker.textContent = "Результати бою";

    title.className = "battle-finale-title";
    title.textContent = `${winnerLabel} перемагає`;

    subtitle.className = "battle-finale-subtitle";
    subtitle.textContent = `${loserLabel} падає після ${formatDuration(plan.durationMs)}. Вижило ${winnerSurvivors.alive}/${winnerSurvivors.total} проти ${loserSurvivors.alive}/${loserSurvivors.total}.`;

    metrics.className = "battle-finale-metrics";
    appendResultMetric(metrics, "Усього дій", String(stats.totalActions));
    appendResultMetric(metrics, "Влучань", `${stats.hits}/${stats.combatActions}`);
    appendResultMetric(metrics, "Критів", String(stats.criticals));
    appendResultMetric(metrics, "Захист", `${stats.blocks} блоків, ${stats.misses} ухилень`);
    appendResultMetric(
      metrics,
      "Списи",
      `${stats.javelinHits} влуч., ${stats.javelinBlocks} блок., ${stats.javelinDodges} ухил.`,
    );
    appendResultMetric(
      metrics,
      "Сітка",
      `${stats.successfulNets} вдалих, ${stats.escapedNets} уникнено`,
    );
    appendResultMetric(
      metrics,
      "Шкода",
      `${getTeamDamage(plan, stats, plan.winnerTeamId)} / ${getTeamDamage(plan, stats, plan.loserTeamId)} HP`,
    );

    actions.className = "battle-finale-actions";

    resultsButton.className = "battle-finale-button battle-finale-button-secondary";
    resultsButton.type = "button";
    resultsButton.dataset["viewResults"] = "true";
    resultsButton.textContent = "Глянути результати";

    newBattleButton.className = "battle-finale-button battle-finale-button-primary";
    newBattleButton.type = "button";
    newBattleButton.dataset["newBattle"] = "true";
    newBattleButton.textContent = "Новий бій";

    resultsButton.textContent = "Глянути поле бою";
    newBattleButton.textContent = "Новий бій";

    resultsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      clearBattleFinale();
    });

    newBattleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void handleBattleClick();
    });

    actions.append(resultsButton, newBattleButton);
    finale.append(kicker, title, subtitle, metrics, actions);
    stageEl.appendChild(finale);
    launchConfetti();
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
      const teamId = plan.teams[fighterId];
      const fighterEl = getFighterElement(fighterId);

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
    isBattleComplete = true;
    syncBattleButtonState();
  }

  async function handleBattleClick(): Promise<void> {
    if (isBattlePlaying) return;

    if (isBattleComplete) {
      resetToInitialState();
      return;
    }

    if (!canStartBattle()) {
      syncBattleButtonState();
      return;
    }

    const teams = buildTeamMap(getActiveRoster());
    const plan = createBattlePlan(getCurrentGladiators(), teams, currentSpawnPositions);
    const runId = currentRun + 1;
    currentRun = runId;
    isBattlePlaying = true;
    battleButton.disabled = true;
    battleButton.textContent = "Йде бій";
    resetBattleUi(plan);
    battleAudio.startBattle();

    try {
      await wait(420);
      const startedAt = performance.now();
      const playbackTasks = plan.events.map(async (event) => {
        const waitForEvent = event.timeMs - (performance.now() - startedAt);
        if (waitForEvent > 0) {
          await wait(waitForEvent);
        }

        if (disposed || runId !== currentRun) return;
        await playBattleEvent(plan, event, runId);
      });

      const waitForFinish = plan.durationMs - (performance.now() - startedAt);
      if (waitForFinish > 0) {
        playbackTasks.push(wait(waitForFinish));
      }

      await Promise.all(playbackTasks);

      if (!disposed && runId === currentRun) {
        finishBattle(plan);
      }
    } finally {
      if (!disposed && runId === currentRun) {
        isBattlePlaying = false;
        syncBattleButtonState();
      }
    }
  }

  const onBattleClick = (): void => {
    void handleBattleClick();
  };

  const clearPlacementDragOver = (): void => {
    overlay.querySelectorAll<HTMLElement>(".placement-cell.is-drag-over").forEach((cell) => {
      cell.classList.remove("is-drag-over");
    });
  };

  const onPlacementDragStart = (event: DragEvent): void => {
    if (trainingMode !== "manual" || isBattlePlaying || isBattleComplete) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const token = target?.closest<HTMLElement>("[data-placement-token]");
    const slotId = token?.dataset["placementToken"];
    const slot = slotId ? findManualSlot(slotId) : undefined;

    if (!slotId || !slot) {
      return;
    }

    draggingPlacementSlotId = slotId;
    selectedPlacementSlotId = slotId;
    activeManualSlotId = slotId;
    openClassPickerSlotId = null;
    token.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", slotId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const onPlacementDragEnd = (): void => {
    draggingPlacementSlotId = null;
    clearPlacementDragOver();
    overlay.querySelectorAll<HTMLElement>("[data-placement-token].is-dragging").forEach((token) => {
      token.classList.remove("is-dragging");
    });
  };

  const onPlacementDragOver = (event: DragEvent): void => {
    if (trainingMode !== "manual" || isBattlePlaying || isBattleComplete) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const cellEl = target?.closest<HTMLElement>("[data-placement-cell]");
    const cellData = cellEl ? getPlacementCellData(cellEl) : null;
    const slotId = draggingPlacementSlotId ?? event.dataTransfer?.getData("text/plain") ?? "";
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
    if (trainingMode !== "manual" || isBattlePlaying || isBattleComplete) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const cellEl = target?.closest<HTMLElement>("[data-placement-cell]");
    const cellData = cellEl ? getPlacementCellData(cellEl) : null;
    const slotId = draggingPlacementSlotId ?? event.dataTransfer?.getData("text/plain") ?? "";

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

    if (isBattlePlaying) {
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

    if (isBattleComplete) {
      return;
    }

    const shouldCloseClassPicker =
      trainingMode === "manual" &&
      openClassPickerSlotId !== null &&
      !target?.closest("[data-class-picker]");

    const modeButton = target?.closest<HTMLButtonElement>("[data-training-mode]");

    if (modeButton) {
      const nextMode = modeButton.dataset["trainingMode"];
      if (nextMode === "auto" || nextMode === "manual") {
        trainingMode = nextMode;
        openClassPickerSlotId = null;
        selectedPlacementSlotId = null;
        draggingPlacementSlotId = null;
        refreshTrainingUi();
      }
      return;
    }

    const placementAutoButton = target?.closest<HTMLButtonElement>("[data-placement-auto-team]");
    if (placementAutoButton && trainingMode === "manual") {
      const teamId = parseTeamId(placementAutoButton.dataset["placementAutoTeam"]);
      if (teamId) {
        openClassPickerSlotId = null;
        clearManualTeamPlacements(teamId);
        refreshTrainingUi();
      }
      return;
    }

    const placementClearButton = target?.closest<HTMLButtonElement>("[data-placement-clear]");
    if (placementClearButton && trainingMode === "manual") {
      const slotId = placementClearButton.dataset["placementClear"];
      if (slotId) {
        openClassPickerSlotId = null;
        clearManualSpawnPlacement(slotId);
        refreshTrainingUi();
      }
      return;
    }

    const placementToken = target?.closest<HTMLElement>("[data-placement-token]");
    if (placementToken && trainingMode === "manual") {
      const slotId = placementToken.dataset["placementToken"];
      if (slotId && findManualSlot(slotId)) {
        selectedPlacementSlotId = selectedPlacementSlotId === slotId ? null : slotId;
        activeManualSlotId = slotId;
        openClassPickerSlotId = null;
        renderTrainingBody();
      }
      return;
    }

    const placementCell = target?.closest<HTMLElement>("[data-placement-cell]");
    if (placementCell && trainingMode === "manual") {
      const cellData = getPlacementCellData(placementCell);
      if (cellData && selectedPlacementSlotId) {
        if (placeManualSlotInCell(selectedPlacementSlotId, cellData.teamId, cellData.cell)) {
          refreshTrainingUi();
        }
      }
      return;
    }

    const manualSlotButton = target?.closest<HTMLButtonElement>("[data-manual-slot-select]");
    if (manualSlotButton && trainingMode === "manual") {
      activeManualSlotId = manualSlotButton.dataset["manualSlotSelect"] ?? activeManualSlotId;
      openClassPickerSlotId = null;
      renderTrainingBody();
      return;
    }

    const classPickerButton = target?.closest<HTMLButtonElement>("[data-class-picker-button]");
    if (classPickerButton && trainingMode === "manual") {
      const slotId = classPickerButton.dataset["classPickerButton"];
      if (slotId) {
        activeManualSlotId = slotId;
        openClassPickerSlotId = openClassPickerSlotId === slotId ? null : slotId;
        renderTrainingBody();
      }
      return;
    }

    const classOptionButton = target?.closest<HTMLButtonElement>("[data-slot-class-option]");
    if (classOptionButton && trainingMode === "manual") {
      const slotId = classOptionButton.dataset["slotClassOption"];
      const classId = classOptionButton.dataset["classId"];
      const slot = slotId ? findManualSlot(slotId) : undefined;
      if (!slotId || !slot || !classId) {
        return;
      }

      activeManualSlotId = slotId;
      openClassPickerSlotId = null;
      setActiveManualRoster(setSlotClass(manualRoster, slot.teamId, slot.teamSlot, classId));
      refreshTrainingUi();
      return;
    }

    const pointButton = target?.closest<HTMLButtonElement>("[data-point-action]");
    if (!pointButton || trainingMode !== "manual") {
      if (shouldCloseClassPicker) {
        openClassPickerSlotId = null;
        renderTrainingBody();
      }
      return;
    }

    openClassPickerSlotId = null;

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

    if (event.key === "Escape" && openClassPickerSlotId) {
      openClassPickerSlotId = null;
      renderTrainingBody();
    }
  };

  function findRosterSlotForActiveMode(slotId: string): RosterSlot | undefined {
    return getAllSlots(getActiveRoster()).find((slot) => slot.instanceId === slotId);
  }

  const onTrainingChange = (event: Event): void => {
    if (isBattlePlaying || isBattleComplete) {
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
        if (trainingMode !== "manual") {
          return;
        }
        const teamId = target.dataset["teamSizeInput"] as TeamId;
        const requested = Number(target.value);
        const fallbackClassId =
          manualRoster[teamId][manualRoster[teamId].length - 1]?.classId ??
          getSortedGladiatorClasses()[0]!.id;
        setActiveManualRoster(setTeamSize(manualRoster, teamId, requested, fallbackClassId));
        getActiveManualSlot();
        refreshTrainingUi();
        return;
      }
    }
  };

  battleButton.addEventListener("click", onBattleClick);
  volumeSlider.addEventListener("input", onVolumeSliderInput);
  volumeToggle.addEventListener("click", onVolumeToggleClick);
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
    battleButton.removeEventListener("click", onBattleClick);
    volumeSlider.removeEventListener("input", onVolumeSliderInput);
    volumeToggle.removeEventListener("click", onVolumeToggleClick);
    overlay.removeEventListener("click", onTrainingClick);
    overlay.removeEventListener("change", onTrainingChange);
    overlay.removeEventListener("dragstart", onPlacementDragStart);
    overlay.removeEventListener("dragend", onPlacementDragEnd);
    overlay.removeEventListener("dragover", onPlacementDragOver);
    overlay.removeEventListener("dragleave", onPlacementDragLeave);
    overlay.removeEventListener("drop", onPlacementDrop);
    window.removeEventListener("keydown", onShowcaseKeydown);
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    battleAudio.stopAll();
    for (const skeleton of skeletons.values()) skeleton.dispose();
    skeletons.clear();
    overlay.remove();
  };
}
