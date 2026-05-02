import type { BattlePlan, BattleTeamId } from "@gladiators/combat-sim";
import {
  createArenaFighterInfos,
  formatArenaResult,
} from "./battlePlanProjection";
import { createStageFiveDemoBattle } from "./createDemoBattle";
import { createPhaserArenaRenderer } from "./createPhaserArenaRenderer";
import type {
  PhaserArenaControls,
  PhaserArenaHealthChange,
  PhaserArenaStatus,
} from "./types";
import "./phaserArenaDemo.css";

const TEAM_LABELS: Record<BattleTeamId, string> = {
  left: "ЛІВА КОМАНДА",
  right: "ПРАВА КОМАНДА",
};

const TEAM_COUNT_LABELS: Record<number, string> = {
  1: "1 боєць",
};

export function createPhaserArenaDemo(container: HTMLElement): () => void {
  const root = document.createElement("section");
  root.className = "phaser-combat-shell";
  root.innerHTML = `
    <div class="phaser-combat-layout">
      <aside class="phaser-team-column" data-team-panel="left"></aside>

      <main class="phaser-combat-main" aria-label="Відтворення бою">
        <div class="phaser-combat-actions">
          <label class="phaser-seed-control">
            <span>Seed</span>
            <input
              class="phaser-seed-input"
              type="text"
              data-phaser-seed-input
              placeholder="auto"
              autocomplete="off"
              spellcheck="false"
            />
          </label>
          <div class="phaser-seed-match" aria-live="polite">
            <span>Seed матчу</span>
            <strong data-phaser-seed-match>-</strong>
          </div>
          <button class="phaser-battle-button" type="button" data-phaser-start>
            Розпочати бій
          </button>
          <button class="phaser-results-button" type="button" data-phaser-results disabled>
            Переглянути результати
          </button>
          <p class="phaser-combat-status sr-only" data-phaser-status aria-live="polite">
            Арена готова
          </p>
        </div>

        <div class="phaser-arena-frame">
          <div class="phaser-arena-host" data-phaser-arena-host></div>
          <div class="phaser-volume-control">
            <button
              class="phaser-volume-toggle"
              type="button"
              data-phaser-volume-toggle
              aria-label="Вимкнути звук"
              aria-pressed="false"
            >
              <svg class="phaser-volume-icon phaser-volume-icon-on" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4Z"></path>
                <path d="M16 8.5a5 5 0 0 1 0 7"></path>
                <path d="M18.5 6a8.5 8.5 0 0 1 0 12"></path>
              </svg>
              <svg class="phaser-volume-icon phaser-volume-icon-off" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4Z"></path>
                <path d="m16 9 5 5"></path>
                <path d="m21 9-5 5"></path>
              </svg>
            </button>
            <input
              class="phaser-volume-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value="100"
              data-phaser-volume-slider
              aria-label="Загальна гучність"
            />
          </div>
        </div>
      </main>

      <aside class="phaser-team-column" data-team-panel="right"></aside>
    </div>
  `;

  const host = root.querySelector<HTMLElement>("[data-phaser-arena-host]");
  const leftPanel = root.querySelector<HTMLElement>('[data-team-panel="left"]');
  const rightPanel = root.querySelector<HTMLElement>('[data-team-panel="right"]');
  const seedInput = root.querySelector<HTMLInputElement>("[data-phaser-seed-input]");
  const seedMatchEl = root.querySelector<HTMLElement>("[data-phaser-seed-match]");
  const statusEl = root.querySelector<HTMLElement>("[data-phaser-status]");
  const startButton = root.querySelector<HTMLButtonElement>("[data-phaser-start]");
  const resultsButton = root.querySelector<HTMLButtonElement>("[data-phaser-results]");
  const volumeToggle = root.querySelector<HTMLButtonElement>("[data-phaser-volume-toggle]");
  const volumeSlider = root.querySelector<HTMLInputElement>("[data-phaser-volume-slider]");

  if (
    !host ||
    !leftPanel ||
    !rightPanel ||
    !seedInput ||
    !seedMatchEl ||
    !statusEl ||
    !startButton ||
    !resultsButton ||
    !volumeToggle ||
    !volumeSlider
  ) {
    throw new Error("Phaser combat shell was not created correctly");
  }

  container.replaceChildren(root);

  let disposeGame: (() => void) | null = null;
  let arenaControls: PhaserArenaControls | null = null;
  let activeBattlePlan: BattlePlan | null = null;
  let activeFighterLabels: Record<string, string> = {};

  const panels: Record<BattleTeamId, HTMLElement> = {
    left: leftPanel,
    right: rightPanel,
  };

  const render = (options: { startImmediately?: boolean } = {}): void => {
    disposeGame?.();
    arenaControls = null;

    const requestedSeed = seedInput.value.trim();
    const demoBattle = createStageFiveDemoBattle(requestedSeed || undefined);

    activeBattlePlan = demoBattle.battlePlan;
    activeFighterLabels = demoBattle.fighterLabels;
    seedMatchEl.textContent = options.startImmediately ? demoBattle.battlePlan.seed : "-";
    statusEl.textContent = "Арена готова";
    startButton.disabled = false;
    startButton.textContent = "Розпочати бій";
    resultsButton.disabled = true;
    renderTeamPanels(panels, demoBattle.battlePlan, demoBattle.fighterLabels);

    disposeGame = createPhaserArenaRenderer(host, {
      battlePlan: demoBattle.battlePlan,
      fighterLabels: demoBattle.fighterLabels,
      autoPlay: false,
      onControlsReady: (controls) => {
        arenaControls = controls;

        if (options.startImmediately) {
          startPlayback();
        }
      },
      onHealthChange: updateHealth,
      onStatus: updateStatus,
    });
  };

  const startPlayback = (): void => {
    if (!arenaControls) {
      return;
    }

    startButton.disabled = true;
    startButton.textContent = "Йде бій";
    resultsButton.disabled = false;
    seedMatchEl.textContent = activeBattlePlan?.seed ?? "-";
    arenaControls.startPlayback();
  };

  const onStartClick = (): void => {
    render({ startImmediately: true });
  };

  const onResultsClick = (): void => {
    if (!activeBattlePlan) {
      return;
    }

    arenaControls?.skipToEnd();
    statusEl.textContent = formatArenaResult(activeBattlePlan, activeFighterLabels);
  };

  const onVolumeToggle = (): void => {
    const muted = volumeToggle.getAttribute("aria-pressed") !== "true";
    volumeToggle.classList.toggle("is-muted", muted);
    volumeToggle.setAttribute("aria-pressed", muted ? "true" : "false");
    volumeToggle.setAttribute("aria-label", muted ? "Увімкнути звук" : "Вимкнути звук");
    volumeSlider.value = muted ? "0" : "100";
  };

  const onVolumeInput = (): void => {
    const muted = Number(volumeSlider.value) <= 0;
    volumeToggle.classList.toggle("is-muted", muted);
    volumeToggle.setAttribute("aria-pressed", muted ? "true" : "false");
    volumeToggle.setAttribute("aria-label", muted ? "Увімкнути звук" : "Вимкнути звук");
  };

  startButton.addEventListener("click", onStartClick);
  resultsButton.addEventListener("click", onResultsClick);
  volumeToggle.addEventListener("click", onVolumeToggle);
  volumeSlider.addEventListener("input", onVolumeInput);
  render();

  return () => {
    startButton.removeEventListener("click", onStartClick);
    resultsButton.removeEventListener("click", onResultsClick);
    volumeToggle.removeEventListener("click", onVolumeToggle);
    volumeSlider.removeEventListener("input", onVolumeInput);
    disposeGame?.();
    root.remove();
  };
}

function renderTeamPanels(
  panels: Record<BattleTeamId, HTMLElement>,
  plan: BattlePlan,
  fighterLabels: Record<string, string>,
): void {
  const fighters = createArenaFighterInfos(plan, fighterLabels);

  for (const teamId of ["left", "right"] as const) {
    const teamFighters = fighters.filter((fighter) => fighter.teamId === teamId);
    panels[teamId].innerHTML = `
      <section class="phaser-team-panel" data-side="${teamId}" aria-label="${TEAM_LABELS[teamId]}">
        <div class="phaser-team-header">
          <span>${TEAM_LABELS[teamId]}</span>
          <strong>${TEAM_COUNT_LABELS[teamFighters.length] ?? `${teamFighters.length} бійців`}</strong>
        </div>
        <div class="phaser-team-fighters">
          ${teamFighters.map((fighter) => renderFighterRow(plan, fighter.id, fighter.label)).join("")}
        </div>
      </section>
    `;
  }
}

function renderFighterRow(plan: BattlePlan, fighterId: string, label: string): string {
  const fighter = plan.fighters[fighterId];
  const maxHp = fighter?.maxHp ?? 0;
  const className = fighter?.name ?? "Гладіатор";

  return `
    <article class="phaser-team-fighter" data-team-fighter="${escapeHtml(fighterId)}">
      <div class="phaser-team-fighter-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(className)}</span>
      </div>
      <div class="phaser-fighter-health-line">
        <span data-health-text="${escapeHtml(fighterId)}">${maxHp} / ${maxHp} HP</span>
        <span data-health-percent="${escapeHtml(fighterId)}">100%</span>
      </div>
      <div class="phaser-health-track">
        <div class="phaser-health-fill" data-health-fill="${escapeHtml(fighterId)}" style="width:100%"></div>
      </div>
    </article>
  `;
}

function updateHealth(change: PhaserArenaHealthChange): void {
  const percent =
    change.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((change.hp / change.maxHp) * 100)))
      : 0;

  document
    .querySelectorAll<HTMLElement>(`[data-health-fill="${CSS.escape(change.fighterId)}"]`)
    .forEach((fill) => {
      fill.style.width = `${percent}%`;
      fill.dataset["danger"] = percent <= 28 ? "true" : "false";
    });

  document
    .querySelectorAll<HTMLElement>(`[data-health-text="${CSS.escape(change.fighterId)}"]`)
    .forEach((text) => {
      text.textContent = `${change.hp} / ${change.maxHp} HP`;
    });

  document
    .querySelectorAll<HTMLElement>(`[data-health-percent="${CSS.escape(change.fighterId)}"]`)
    .forEach((text) => {
      text.textContent = `${percent}%`;
    });
}

function updateStatus(status: PhaserArenaStatus): void {
  const statusEl = document.querySelector<HTMLElement>("[data-phaser-status]");
  const startButton = document.querySelector<HTMLButtonElement>("[data-phaser-start]");

  if (statusEl) {
    statusEl.textContent = status.message;
  }

  if (status.phase === "complete" && startButton) {
    startButton.disabled = false;
    startButton.textContent = "Новий бій";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
