import {
  LEVEL_ZERO_STAT_POINTS,
  POINTS_PER_GLADIATOR_LEVEL,
} from "../../gladiators/gladiatorProgression";
import type { TeamId } from "../../gladiators/roster";
import { SAVE_BATTLE_SETUP_LABEL } from "./audio";

export interface ShowcaseElements {
  overlay: HTMLDivElement;
  battleButtons: HTMLButtonElement[];
  battleResultsButtons: HTMLButtonElement[];
  volumeToggles: HTMLButtonElement[];
  volumeSliders: HTMLInputElement[];
  preserveSettingsButton: HTMLButtonElement;
  battleSeedInput: HTMLInputElement;
  statusEl: HTMLElement;
  resultEl: HTMLElement;
  logEl: HTMLElement;
  stageEl: HTMLElement;
  arenaWorldEl: HTMLElement;
  typesButton: HTMLButtonElement;
  typesModal: HTMLElement;
  teamColumnEls: Record<TeamId, HTMLElement>;
  arenaFightersEl: HTMLElement;
  trainingBodyEl: HTMLElement;
  trainingModeHintEl: HTMLElement;
}

export function createShowcaseOverlay(initialTypeCards: string): ShowcaseElements {
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
        <div class="battle-stage-column">
          <div class="battle-stage-actions">
            <label class="battle-seed-control">
              <span>Seed</span>
              <input
                class="battle-seed-input"
                type="text"
                data-battle-seed-input
                placeholder="auto"
                autocomplete="off"
                spellcheck="false"
              />
            </label>
            <button class="battle-button battle-button--stage" type="button" data-battle-button>Розпочати бій</button>
            <button class="battle-results-button battle-results-button--stage" type="button" data-battle-results-button disabled>Переглянути результати</button>
            <button class="battle-preserve-button battle-preserve-button--stage" type="button" data-preserve-settings hidden>${SAVE_BATTLE_SETUP_LABEL}</button>
          </div>
          <div class="arena-stage" data-arena-stage>
            <div class="battle-volume-control battle-volume-control--stage" data-volume-control>
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
            <div class="arena-world" data-arena-world>
              <div class="arena-crowd"></div>
              <div class="arena-fighters" data-arena-fighters></div>
            </div>
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

  const battleButtonCandidates = Array.from(
    overlay.querySelectorAll<HTMLButtonElement>("[data-battle-button]"),
  );
  const volumeToggles = Array.from(
    overlay.querySelectorAll<HTMLButtonElement>("[data-volume-toggle]"),
  );
  const volumeSliders = Array.from(
    overlay.querySelectorAll<HTMLInputElement>("[data-volume-slider]"),
  );
  const battleResultsButtonCandidates = Array.from(
    overlay.querySelectorAll<HTMLButtonElement>("[data-battle-results-button]"),
  );
  const preserveSettingsButtonCandidate = overlay.querySelector<HTMLButtonElement>("[data-preserve-settings]");
  const battleSeedInputCandidate = overlay.querySelector<HTMLInputElement>("[data-battle-seed-input]");
  const statusCandidate = overlay.querySelector<HTMLElement>("[data-battle-status]");
  const resultCandidate = overlay.querySelector<HTMLElement>("[data-battle-result]");
  const logCandidate = overlay.querySelector<HTMLElement>("[data-battle-log]");
  const stageCandidate = overlay.querySelector<HTMLElement>("[data-arena-stage]");
  const arenaWorldCandidate = overlay.querySelector<HTMLElement>("[data-arena-world]");
  const typesButtonCandidate = overlay.querySelector<HTMLButtonElement>("[data-gladiator-types-open]");
  const typesModalCandidate = overlay.querySelector<HTMLElement>("[data-gladiator-types-modal]");

  if (
    battleButtonCandidates.length === 0 ||
    volumeToggles.length === 0 ||
    volumeSliders.length === 0 ||
    battleResultsButtonCandidates.length === 0 ||
    !preserveSettingsButtonCandidate ||
    !battleSeedInputCandidate ||
    !statusCandidate ||
    !resultCandidate ||
    !logCandidate ||
    !stageCandidate ||
    !arenaWorldCandidate ||
    !typesButtonCandidate ||
    !typesModalCandidate
  ) {
    throw new Error("Battle UI was not created correctly");
  }



  const teamColumnEls: Record<TeamId, HTMLElement> = {
    left: overlay.querySelector<HTMLElement>('[data-team-column="left"]')!,
    right: overlay.querySelector<HTMLElement>('[data-team-column="right"]')!,
  };
  const arenaFightersEl = overlay.querySelector<HTMLElement>("[data-arena-fighters]")!;
  const trainingBodyEl = overlay.querySelector<HTMLElement>("[data-training-body]")!;
  const trainingModeHintEl = overlay.querySelector<HTMLElement>("[data-training-mode-hint]")!;

  return {
    overlay,
    battleButtons: battleButtonCandidates,
    battleResultsButtons: battleResultsButtonCandidates,
    volumeToggles,
    volumeSliders,
    preserveSettingsButton: preserveSettingsButtonCandidate,
    battleSeedInput: battleSeedInputCandidate,
    statusEl: statusCandidate,
    resultEl: resultCandidate,
    logEl: logCandidate,
    stageEl: stageCandidate,
    arenaWorldEl: arenaWorldCandidate,
    typesButton: typesButtonCandidate,
    typesModal: typesModalCandidate,
    teamColumnEls,
    arenaFightersEl,
    trainingBodyEl,
    trainingModeHintEl,
  };
}
