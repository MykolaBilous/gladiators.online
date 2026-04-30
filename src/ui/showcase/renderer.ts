import type { RuntimeGladiator, TeamId } from "@gladiators/combat-sim";
import { TEAM_LABELS } from "@gladiators/combat-sim";
import {
  createMurmilloSvg,
} from "../../gladiatorAssets/murmilloSvg";
import {
  createRetiariusSvg,
} from "../../gladiatorAssets/retiariusSvg";
import {
  createVelesSvg,
} from "../../gladiatorAssets/velesSvg";

export const svgMap: Record<string, () => string> = {
  murmillo: createMurmilloSvg,
  retiarius: createRetiariusSvg,
  veles: createVelesSvg,
};
export function createTeamFighterRow(fighter: RuntimeGladiator): string {
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

export function createTeamPanel(teamId: TeamId, fighters: readonly RuntimeGladiator[]): string {
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

export function createArenaFighter(_fighter: RuntimeGladiator): string {
  return "";
}
