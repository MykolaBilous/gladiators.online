import type { GladiatorClass, GladiatorStatKey } from "../../gladiators/gladiatorTypes";
import {
  getBonusPointsForLevel,
  getTotalPointsForLevel,
  gladiatorStatKeys,
  MAX_GLADIATOR_LEVEL,
  sumStatPoints,
} from "../../gladiators/gladiatorProgression";
import {
  getAllocatedBonusPoints,
  getGladiatorClass,
  listGladiatorClasses,
  MAX_TEAM_SIZE,
  MIN_TEAM_SIZE,
  TEAM_LABELS,
  type Roster,
  type RosterSlot,
  type TrainingMode,
  type TeamId,
} from "../../gladiators/roster";
import { svgMap } from "./renderer";

export const statLabels: Record<string, string> = {
  hp: "HP",
  attack: "АТК",
  defense: "ЗАХ",
  speed: "ШВД",
  dexterity: "СПР",
  endurance: "ВТР",
};

export const statDisplayMaximums: Record<GladiatorStatKey, number> = {
  hp: 180,
  attack: 150,
  defense: 150,
  speed: 150,
  dexterity: 150,
  endurance: 150,
};

export const MIN_TRAINING_LEVEL = 0;
const gladiatorClassNameCollator = new Intl.Collator("uk", { sensitivity: "base" });
export function cloneRoster(roster: Roster): Roster {
  return {
    left: roster.left.map((slot) => ({
      ...slot,
      levelZeroPoints: { ...slot.levelZeroPoints },
      manualBonusPoints: { ...slot.manualBonusPoints },
    })),
    right: roster.right.map((slot) => ({
      ...slot,
      levelZeroPoints: { ...slot.levelZeroPoints },
      manualBonusPoints: { ...slot.manualBonusPoints },
    })),
  };
}
export function clampManualBonusPoints(slot: RosterSlot): void {
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

export function getStatDisplayPercent(key: GladiatorStatKey, value: number): number {
  return clampPercent((value / statDisplayMaximums[key]) * 100);
}

export function formatMultiplier(value: number): string {
  return `x${value.toFixed(1).replace(/\.0$/, "")}`;
}

export function isGladiatorStatKey(value: string | undefined): value is GladiatorStatKey {
  return typeof value === "string" && (gladiatorStatKeys as readonly string[]).includes(value);
}

export function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}
export function createTypeStatBar(key: GladiatorStatKey, value: number): string {
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

export function createTypeCard(gladiator: GladiatorClass): string {
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

export function createTrainingStatControl(
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

export function createTrainingStatGrid(
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

export function createSlotBudgetRow(slot: RosterSlot, mode: TrainingMode): string {
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

export function createAutoTrainingCard(slot: RosterSlot): string {
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

export function getSortedGladiatorClasses(): GladiatorClass[] {
  return [...listGladiatorClasses()].sort(
    (left, right) =>
      gladiatorClassNameCollator.compare(left.name, right.name) ||
      left.id.localeCompare(right.id),
  );
}

export function getSlotRemainingState(slot: RosterSlot): {
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

export function createManualClassPicker(slot: RosterSlot, isOpen: boolean): string {
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

export function createManualSlotButton(slot: RosterSlot, active: boolean): string {
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

export function createManualSlotEditor(slot: RosterSlot, isClassPickerOpen: boolean): string {
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

export function createManualTeamBlock(
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
