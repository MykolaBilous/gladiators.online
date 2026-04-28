import type { BattleEvent, BattlePlan, BattleTeamId } from "../../combat/battleTypes";
import { TEAM_LABELS } from "../../gladiators/roster";
import { gladiatorClasses } from "../../gladiators/gladiatorClasses";
import type { BattleResultStats } from "../gladiatorShowcaseTypes";
import { formatDuration } from "./playback";
import { SAVE_BATTLE_SETUP_LABEL } from "./audio";

export function getPlanFighter(plan: BattlePlan, id: string) {
  const fighter = plan.fighters[id];
  if (!fighter) {
    throw new Error(`Missing planned fighter: ${id}`);
  }
  return fighter;
}

export const runtimeFighterNames: Record<string, string> = {};

export function rememberFighterName(id: string, name: string): void {
  runtimeFighterNames[id] = name;
}

export function getGladiatorName(id: string): string {
  return (
    runtimeFighterNames[id] ??
    gladiatorClasses.find((gladiator) => gladiator.id === id)?.name ??
    id
  );
}

export function getTacticText(tactic: BattleEvent["decisions"][number]["tactic"]): string {
  const labels: Record<BattleEvent["decisions"][number]["tactic"], string> = {
    press: "тисне",
    balanced: "тримає темп",
    counter: "ловить контру",
    recover: "економить сили",
  };

  return labels[tactic];
}

export function getOutcomeText(event: BattleEvent): string {
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

export function isCombatEvent(event: BattleEvent): boolean {
  return event.actionType === "strike" || event.actionType === "net" || event.actionType === "javelin";
}

export function getEventResolutionTimeMs(event: BattleEvent): number {
  const impactDelay = isCombatEvent(event) ? event.impactDelayMs : 0;

  return event.timeMs + event.movement.durationMs + impactDelay;
}

export function getBattleEventsByResolution(plan: BattlePlan): BattleEvent[] {
  return [...plan.events].sort(
    (a, b) => getEventResolutionTimeMs(a) - getEventResolutionTimeMs(b) || a.index - b.index,
  );
}

export function createBattleResultStats(plan: BattlePlan): BattleResultStats {
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

  for (const event of getBattleEventsByResolution(plan)) {
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
export interface BattleFinaleContext {
  stageEl: HTMLElement;
  timers: Map<number, (() => void) | null>;
  handleBattleClick: () => Promise<void>;
  prepareNextBattleWithCurrentSettings: () => void;
}

export function clearBattleFinale(stageEl: HTMLElement): void {
  stageEl.querySelectorAll<HTMLElement>(".battle-finale, .confetti-layer").forEach((item) => {
    item.remove();
  });
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

export function renderBattleResult(
  resultEl: HTMLElement,
  plan: BattlePlan,
  stats: BattleResultStats,
): void {
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

function launchConfetti(
  stageEl: HTMLElement,
  timers: Map<number, (() => void) | null>,
): void {
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
  timers.set(timer, null);
}

export function showBattleFinale(
  context: BattleFinaleContext,
  plan: BattlePlan,
  stats: BattleResultStats,
): void {
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
  const saveSettingsButton = document.createElement("button");
  const {
    stageEl,
    timers,
    handleBattleClick,
    prepareNextBattleWithCurrentSettings,
  } = context;

  clearBattleFinale(stageEl);

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

  saveSettingsButton.className = "battle-finale-button battle-finale-button-save";
  saveSettingsButton.type = "button";
  saveSettingsButton.dataset["preserveSettings"] = "true";
  saveSettingsButton.textContent = SAVE_BATTLE_SETUP_LABEL;

  resultsButton.textContent = "Глянути поле бою";
  newBattleButton.textContent = "Новий бій";

  resultsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    clearBattleFinale(stageEl);
  });

  newBattleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    void handleBattleClick();
  });

  saveSettingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    prepareNextBattleWithCurrentSettings();
  });

  actions.append(resultsButton, saveSettingsButton, newBattleButton);
  finale.append(kicker, title, subtitle, metrics, actions);
  stageEl.appendChild(finale);
  launchConfetti(stageEl, timers);
}

