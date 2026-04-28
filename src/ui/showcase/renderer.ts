import type { AnimationClip, BoneDef } from "../../animation/skeletonTypes";
import type { RuntimeGladiator, TeamId } from "../../gladiators/roster";
import { TEAM_LABELS } from "../../gladiators/roster";
import {
  createMurmilloSvg,
  murmilloBones,
  murmilloHeavyDodge,
  murmilloShieldBlock,
  murmilloShieldBash,
  murmilloSwordSlash,
  murmilloWalk,
} from "../../gladiators/murmilloSvg";
import {
  createRetiariusSvg,
  retiariusBones,
  retiariusNetThrow,
  retiariusQuickDodge,
  retiariusTridentThrust,
  retiariusTridentParry,
  retiariusWalk,
} from "../../gladiators/retiariusSvg";
import {
  createVelesSvg,
  velesBones,
  velesJavelinThrow,
  velesQuickDodge,
  velesShortSwordBlock,
  velesShortSwordSlash,
  velesWalk,
} from "../../gladiators/velesSvg";
import type { DefenseOutcome } from "../gladiatorShowcaseTypes";
import {
  ACTION_MOTION_SCALE,
  DEFENSE_MOTION_SCALE,
  WALK_MOTION_SCALE,
} from "./playback";

function scaleClip(clip: AnimationClip, scale: number): AnimationClip {
  return {
    ...clip,
    duration: Math.round(clip.duration * scale),
  };
}

export const svgMap: Record<string, () => string> = {
  murmillo: createMurmilloSvg,
  retiarius: createRetiariusSvg,
  veles: createVelesSvg,
};

export const boneMap: Record<string, BoneDef[]> = {
  murmillo: murmilloBones,
  retiarius: retiariusBones,
  veles: velesBones,
};

export const clipMap: Record<string, AnimationClip> = {
  "attack-sword-slash": scaleClip(murmilloSwordSlash, ACTION_MOTION_SCALE),
  "attack-shield-bash": scaleClip(murmilloShieldBash, ACTION_MOTION_SCALE),
  "attack-trident-thrust": scaleClip(retiariusTridentThrust, ACTION_MOTION_SCALE),
  "attack-net-throw": scaleClip(retiariusNetThrow, ACTION_MOTION_SCALE),
  "attack-javelin-throw": scaleClip(velesJavelinThrow, ACTION_MOTION_SCALE),
  "attack-veles-sword": scaleClip(velesShortSwordSlash, ACTION_MOTION_SCALE),
};

export const walkClipMap: Record<string, AnimationClip> = {
  murmillo: scaleClip(murmilloWalk, WALK_MOTION_SCALE),
  retiarius: scaleClip(retiariusWalk, WALK_MOTION_SCALE),
  veles: scaleClip(velesWalk, WALK_MOTION_SCALE),
};

export const defenseClipMap: Record<string, Record<DefenseOutcome, AnimationClip>> = {
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

export function createArenaFighter(fighter: RuntimeGladiator): string {
  const svg = svgMap[fighter.classId]?.() ?? "";

  return `
    <article class="battle-fighter" data-fighter="${fighter.id}" data-class="${fighter.classId}" data-side="${fighter.teamId}">
      <div class="fighter-nameplate">
        <span class="fighter-tag-name">${fighter.displayName} (${fighter.level})</span>
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
