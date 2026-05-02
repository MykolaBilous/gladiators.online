import * as Phaser from "phaser";
import type {
  BattleEvent,
  BattleMotionSegment,
  BattlePlan,
  BattlePoint,
} from "@gladiators/combat-sim";
import {
  createArenaFighterInfos,
  formatArenaResult,
  getArenaBattleEvents,
  getScaledDuration,
  PHASER_ARENA_HEIGHT,
  PHASER_ARENA_WIDTH,
  PHASER_PLAYBACK_SCALE,
  projectBattlePoint,
} from "../battlePlanProjection";
import { PHASER_ARENA_TEXTURES, type PhaserFighterClassId } from "../arenaAssets";
import {
  getPhaserAttackAnimationState,
  getPhaserDefenseAnimationState,
  getPhaserFighterAnimationDuration,
  getPhaserFighterAnimationKey,
  getPhaserFighterClassId,
  getPhaserFighterDefinition,
  type PhaserFighterAnimationState,
  type PhaserFighterVisualVariant,
} from "../fighterAnimationCatalog";
import { PHASER_SCENE_KEYS } from "../sceneKeys";
import type { ArenaSceneData } from "../types";

interface FighterView {
  id: string;
  teamId: "left" | "right";
  classId: PhaserFighterClassId;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameplate: Phaser.GameObjects.Container;
  hpText: Phaser.GameObjects.Text;
  maxHp: number;
  currentAnimationState: PhaserFighterAnimationState;
  movementTween: Phaser.Tweens.Tween | null;
  animationToken: number;
  resetAnimationEvent: Phaser.Time.TimerEvent | null;
  netOverlay: Phaser.GameObjects.Container | null;
  netReady: boolean;
  javelinsRemaining: number;
  handJavelinReady: boolean;
}

const OUTCOME_TEXT: Record<BattleEvent["outcome"], string> = {
  hit: "\u0432\u043b\u0443\u0447\u0430\u043d\u043d\u044f",
  block: "\u0431\u043b\u043e\u043a",
  miss: "\u0443\u0445\u0438\u043b\u0435\u043d\u043d\u044f",
};

const WALK_ANIMATION_PAD_MS = 140;
const HIT_RECOIL_MS = 150;
const SOFT_EASE = "Sine.easeInOut";
const FLOATING_TEXT_MS = 1_080;
const NET_RELEASE_MIN_MS = 520;
const JAVELIN_DROP_MS = 440;
const JAVELIN_EXIT_MS = 460;
const VELES_STARTING_JAVELINS = 3;

type CombatTextVariant = "hit" | "block" | "miss" | "net" | "interrupt";

const COMBAT_TEXT_LABELS = {
  block: "\u0411\u043b\u043e\u043a",
  miss: "\u0423\u0445\u0438\u043b",
  interrupt: "\u0417\u0456\u0440\u0432\u0430\u043d\u043e",
} as const;

const COMBAT_TEXT_BACKGROUNDS: Record<CombatTextVariant, string> = {
  hit: "rgba(164, 32, 28, 0.8)",
  block: "rgba(46, 81, 118, 0.82)",
  miss: "rgba(30, 32, 38, 0.82)",
  net: "rgba(128, 104, 56, 0.86)",
  interrupt: "rgba(95, 58, 118, 0.86)",
};

const COMBAT_TEXT_COLORS: Record<CombatTextVariant, string> = {
  hit: "#fff2d2",
  block: "#d9edff",
  miss: "#eef3f9",
  net: "#fff1bc",
  interrupt: "#f0dcff",
};

export class ArenaScene extends Phaser.Scene {
  private arenaData: ArenaSceneData | null = null;
  private battlePlan: BattlePlan | null = null;
  private readonly fighterViews = new Map<string, FighterView>();
  private readonly defeatedFighterIds = new Set<string>();
  private readonly motionTracks = new Map<string, BattleMotionSegment[]>();
  private motionPlaybackStartedAtMs: number | null = null;
  private hasStarted = false;

  constructor() {
    super(PHASER_SCENE_KEYS.arena);
  }

  init(data: ArenaSceneData): void {
    this.arenaData = data;
    this.battlePlan = data.battlePlan;
    this.fighterViews.clear();
    this.defeatedFighterIds.clear();
    this.motionTracks.clear();
    this.motionPlaybackStartedAtMs = null;
    this.hasStarted = false;
  }

  create(): void {
    if (!this.arenaData || !this.battlePlan) {
      throw new Error("ArenaScene requires a BattlePlan");
    }

    this.drawArena();
    this.createFighters(this.arenaData, this.battlePlan);
    this.arenaData.onStatus?.({
      phase: "ready",
      message: `Battle #${this.battlePlan.id} ready`,
    });
    this.arenaData.onControlsReady?.({
      startPlayback: () => this.startBattlePlayback(),
      stopPlayback: () => this.stopBattlePlayback(),
      skipToEnd: () => this.skipToEnd(),
    });

    if (this.arenaData.autoPlay ?? true) {
      this.time.delayedCall(500, () => this.startBattlePlayback());
    }
  }

  private drawArena(): void {
    const wallHeight = 204;
    const sandHeight = PHASER_ARENA_HEIGHT - wallHeight;

    this.cameras.main.setBackgroundColor("#0c1017");

    this.add
      .tileSprite(
        PHASER_ARENA_WIDTH / 2,
        wallHeight / 2,
        PHASER_ARENA_WIDTH,
        wallHeight,
        PHASER_ARENA_TEXTURES.wall,
      )
      .setDepth(0)
      .setTint(0xd0a168);

    this.add
      .tileSprite(
        PHASER_ARENA_WIDTH / 2,
        wallHeight + sandHeight / 2,
        PHASER_ARENA_WIDTH,
        sandHeight,
        PHASER_ARENA_TEXTURES.sand,
      )
      .setDepth(1)
      .setTint(0xd59242);

    const g = this.add.graphics();
    g.setDepth(2);
    g.fillStyle(0x0c1017, 0.4);
    g.fillRect(0, 0, PHASER_ARENA_WIDTH, wallHeight);
    g.fillStyle(0x4c241b, 0.44);
    g.fillRect(0, 74, PHASER_ARENA_WIDTH, 130);
    g.fillStyle(0x1a0e0a, 0.24);
    g.fillRect(0, wallHeight - 20, PHASER_ARENA_WIDTH, 42);
    g.fillStyle(0xf0c04a, 0.08);
    g.fillRect(0, wallHeight, PHASER_ARENA_WIDTH, 44);

    for (let x = 120; x < PHASER_ARENA_WIDTH; x += 320) {
      g.fillStyle(0x5c3424, 0.52);
      g.fillRoundedRect(x, 52, 112, 148, 8);
      g.lineStyle(4, 0x2b1710, 0.32);
      g.strokeRoundedRect(x, 52, 112, 148, 8);
    }

    for (let x = 420; x < PHASER_ARENA_WIDTH; x += 330) {
      g.fillStyle(0x5d3b24, 0.68);
      g.fillRoundedRect(x, 112, 72, 88, 8);
      g.fillStyle(0xffbd43, 0.64);
      g.fillCircle(x + 36, 136, 16);
      g.fillStyle(0xff7a25, 0.32);
      g.fillCircle(x + 36, 136, 28);
    }

    g.fillStyle(0x2b1610, 0.3);
    g.fillRect(0, 0, PHASER_ARENA_WIDTH, 12);
    g.lineStyle(2, 0xf0c04a, 0.2);
    g.lineBetween(0, wallHeight, PHASER_ARENA_WIDTH, wallHeight);
  }

  private createFighters(data: ArenaSceneData, plan: BattlePlan): void {
    const fighters = createArenaFighterInfos(plan, data.fighterLabels);

    for (const fighter of fighters) {
      const maxHp = plan.fighters[fighter.id]?.maxHp ?? fighter.maxHp;
      const classId = getPhaserFighterClassId(
        fighter.id,
        plan.fighters[fighter.id]?.name ?? fighter.label,
      );
      const definition = getPhaserFighterDefinition(classId);
      const idleKey = getPhaserFighterAnimationKey(classId, "idle");
      const container = this.add.container(0, 0);
      const sprite = this.add
        .sprite(0, 0, idleKey, 0)
        .setOrigin(definition.originX, definition.originY)
        .setDisplaySize(definition.displayWidth, definition.displayHeight);
      const footprint = this.createFootprint(
        plan.fighters[fighter.id]?.bodyRadius ?? 0.028,
        fighter.teamId,
      );
      const nameplate = this.createNameplate(fighter.label, maxHp, fighter.teamId);

      sprite.setFlipX(fighter.teamId === "right");
      container.add([footprint, sprite, nameplate.container]);

      const view: FighterView = {
        id: fighter.id,
        teamId: fighter.teamId,
        classId,
        container,
        sprite,
        nameplate: nameplate.container,
        hpText: nameplate.hpText,
        maxHp,
        currentAnimationState: "idle",
        movementTween: null,
        animationToken: 0,
        resetAnimationEvent: null,
        netOverlay: null,
        netReady: classId === "retiarius",
        javelinsRemaining: classId === "veles" ? VELES_STARTING_JAVELINS : 0,
        handJavelinReady: classId === "veles",
      };

      this.fighterViews.set(fighter.id, view);
      this.playFighterAnimation(view, "idle");

      const startPoint = plan.startPositions[fighter.id] ?? fallbackStartPoint(fighter.teamId);
      this.positionFighter(fighter.id, startPoint, 0);
      data.onHealthChange?.({ fighterId: fighter.id, hp: maxHp, maxHp });
    }
  }

  private createFootprint(
    bodyRadius: number,
    teamId: "left" | "right",
  ): Phaser.GameObjects.Ellipse {
    const radiusPx = bodyRadius * (PHASER_ARENA_WIDTH - 192);
    const width = Phaser.Math.Clamp(radiusPx * 2.16, 72, 184);
    const height = Phaser.Math.Clamp(width * 0.32, 24, 58);
    const color = teamId === "left" ? 0x5fb6ff : 0xff6666;
    const footprint = this.add.ellipse(0, -8, width, height, color, 0.08);

    footprint.setStrokeStyle(2, color, 0.16);

    return footprint;
  }

  private createNameplate(
    label: string,
    maxHp: number,
    teamId: "left" | "right",
  ): { container: Phaser.GameObjects.Container; hpText: Phaser.GameObjects.Text } {
    const container = this.add.container(0, -276);
    const plateWidth = Math.max(140, Math.min(188, 92 + label.length * 9));
    const background = this.add.graphics();
    const nameColor = teamId === "left" ? "#5fb6ff" : "#ff6666";

    background.fillStyle(0x0c1017, 0.82);
    background.fillRoundedRect(-plateWidth / 2, -16, plateWidth, 32, 12);
    background.lineStyle(1, 0xeef3f9, 0.14);
    background.strokeRoundedRect(-plateWidth / 2, -16, plateWidth, 32, 12);

    const nameText = this.add
      .text(-plateWidth / 2 + 10, 0, `${label} (0)`, {
        color: nameColor,
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: "13px",
        fontStyle: "900",
      })
      .setOrigin(0, 0.5);
    const divider = this.add.rectangle(plateWidth / 2 - 48, 0, 1, 18, 0xeef3f9, 0.16);
    const hpText = this.add
      .text(plateWidth / 2 - 10, 0, `${maxHp} HP`, {
        color: "#eef3f9",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: "11px",
        fontStyle: "900",
      })
      .setOrigin(1, 0.5);

    container.add([background, nameText, divider, hpText]);

    return { container, hpText };
  }

  private startBattlePlayback(): void {
    if (this.hasStarted || !this.arenaData || !this.battlePlan) {
      return;
    }

    this.hasStarted = true;
    this.playBattle(this.arenaData, this.battlePlan);
  }

  private playBattle(data: ArenaSceneData, plan: BattlePlan): void {
    const fighterIds = Array.from(this.fighterViews.keys());
    const events = getArenaBattleEvents(plan, fighterIds);
    this.motionTracks.clear();
    for (const [fighterId, track] of createPlaybackMotionTracks(plan, fighterIds)) {
      this.motionTracks.set(fighterId, track);
    }
    this.motionPlaybackStartedAtMs = this.time.now;
    this.applyMotionClock(0);

    data.onStatus?.({
      phase: "playing",
      message: "Battle playback is running",
    });

    for (const event of events) {
      this.time.delayedCall(Math.round(event.timeMs * PHASER_PLAYBACK_SCALE), () => {
        this.playBattleEvent(event);
      });
    }

    const completeAt =
      Math.max(
        getLastEventPlaybackResolutionMs(events),
        Math.round(getLastMotionTrackEndMs(this.motionTracks) * PHASER_PLAYBACK_SCALE),
      ) + 900;

    this.time.delayedCall(completeAt, () => {
      const message = formatArenaResult(plan, data.fighterLabels);
      const winner = this.fighterViews.get(plan.winnerId);
      const loser = this.fighterViews.get(plan.loserId);

      this.applyMotionClock(plan.durationMs);
      this.motionPlaybackStartedAtMs = null;

      if (winner) {
        this.playFighterAnimation(winner, "victory", { hold: true });
        this.tweens.add({
          targets: winner.container,
          y: winner.container.y - 12,
          scale: winner.container.scale * 1.04,
          duration: 460,
          ease: SOFT_EASE,
        });
      }

      if (loser && !this.defeatedFighterIds.has(plan.loserId)) {
        this.defeatedFighterIds.add(plan.loserId);
        this.applyDefeatedVisual(loser);
      }

      data.onStatus?.({
        phase: "complete",
        message,
        winnerId: plan.winnerId,
      });
      data.onBattleComplete?.(plan);
    });
  }

  update(_time: number): void {
    if (this.motionPlaybackStartedAtMs === null) {
      return;
    }

    const elapsedMs = this.time.now - this.motionPlaybackStartedAtMs;
    this.applyMotionClock(elapsedMs / PHASER_PLAYBACK_SCALE);
  }

  private applyMotionClock(clockMs: number): void {
    if (!this.battlePlan) {
      return;
    }

    for (const view of this.fighterViews.values()) {
      const startPoint = this.battlePlan.startPositions[view.id] ?? fallbackStartPoint(view.teamId);
      const sample = sampleMotionTrack(startPoint, this.motionTracks.get(view.id) ?? [], clockMs);

      this.applyFighterPoint(view, sample.point);
      this.syncLocomotionAnimation(view, sample.moving);
    }
  }

  private syncLocomotionAnimation(view: FighterView, moving: boolean): void {
    if (this.defeatedFighterIds.has(view.id)) {
      return;
    }

    if (moving) {
      if (view.currentAnimationState === "idle") {
        this.playFighterAnimation(view, "walk", { hold: true });
      }
      return;
    }

    if (view.currentAnimationState === "walk") {
      this.playFighterAnimation(view, "idle");
    }
  }

  private stopBattlePlayback(): void {
    this.time.removeAllEvents();
    this.motionPlaybackStartedAtMs = null;

    for (const view of this.fighterViews.values()) {
      if (view.currentAnimationState === "walk") {
        this.playFighterAnimation(view, "idle");
      }
    }
  }

  private playBattleEvent(event: BattleEvent): void {
    if (
      this.defeatedFighterIds.has(event.attackerId) ||
      this.defeatedFighterIds.has(event.defenderId)
    ) {
      return;
    }

    const moveMs = getMovementPlaybackDuration(event);

    if (event.actionType === "move" || event.actionType === "recover") {
      return;
    }

    const attacker = this.fighterViews.get(event.attackerId);
    const impactDelayMs = getImpactPlaybackDelay(event);

    if (attacker) {
      const attackState = getPhaserAttackAnimationState(
        attacker.classId,
        event.actionType,
        event.attackCssClass,
      );
      const attackDuration = getPhaserFighterAnimationDuration(attacker.classId, attackState);
      const attackStartMs = Math.max(0, moveMs + impactDelayMs - Math.round(attackDuration * 0.68));

      this.time.delayedCall(attackStartMs, () => {
        this.playFighterAnimation(attacker, attackState);
        this.arenaData?.onAttackAnimationStart?.(event);
      });
    }

    if (event.counterAttack) {
      const counterAttacker = this.fighterViews.get(event.counterAttack.attackerId);

      if (counterAttacker) {
        const counterState = getPhaserAttackAnimationState(
          counterAttacker.classId,
          "strike",
          event.counterAttack.attackCssClass,
        );
        const counterDuration = getPhaserFighterAnimationDuration(
          counterAttacker.classId,
          counterState,
        );
        const counterStartMs = Math.max(
          0,
          moveMs + event.counterAttack.impactDelayMs - Math.round(counterDuration * 0.68),
        );

        this.time.delayedCall(counterStartMs, () => {
          this.playFighterAnimation(counterAttacker, counterState);
        });
      }
    }

    if (event.actionType === "javelin" || event.actionType === "net") {
      this.time.delayedCall(moveMs, () => this.playRangedEffect(event, impactDelayMs));
    }

    this.time.delayedCall(moveMs + impactDelayMs, () => {
      this.playImpact(event);
    });
  }

  private playImpact(event: BattleEvent): void {
    const attacker = this.fighterViews.get(event.attackerId);
    const defender = this.fighterViews.get(event.defenderId);

    if (!attacker || !defender) {
      return;
    }

    const attackerX = attacker.container.x;
    const defenderX = defender.container.x;
    const defenderY = defender.container.y - 120;

    if (event.counterAttack?.canceled) {
      const counterAttacker = this.fighterViews.get(event.counterAttack.attackerId);

      if (counterAttacker) {
        this.showFloatingText(
          counterAttacker,
          COMBAT_TEXT_LABELS.interrupt,
          "interrupt",
        );
        counterAttacker.resetAnimationEvent?.remove(false);
        this.playFighterAnimation(counterAttacker, "idle");
      }
    }

    if (event.netTrap) {
      this.playNetImpact(event, defender, defenderX, defenderY);
      return;
    }

    this.playFighterAnimation(defender, getPhaserDefenseAnimationState(event.outcome));

    this.playContactFlash(event, defenderX, defenderY);

    if (event.outcome === "hit") {
      this.updateHealth(defender, event.defenderHp);
      this.showFloatingText(
        defender,
        event.critical ? `-${event.damage}!` : `-${event.damage}`,
        "hit",
      );
      this.tweens.add({
        targets: defender.sprite,
        x: 12 * Math.sign(defenderX - attackerX),
        yoyo: true,
        duration: HIT_RECOIL_MS,
        ease: SOFT_EASE,
      });

      if (event.defenderHp <= 0) {
        this.defeatedFighterIds.add(event.defenderId);
        const defeatedId = event.defenderId;
        this.time.delayedCall(HIT_RECOIL_MS + 60, () => {
          const view = this.fighterViews.get(defeatedId);
          if (view && this.defeatedFighterIds.has(defeatedId)) {
            this.applyDefeatedVisual(view);
          }
        });
      }
    } else {
      this.showFloatingText(
        defender,
        event.outcome === "block" ? COMBAT_TEXT_LABELS.block : COMBAT_TEXT_LABELS.miss,
        event.outcome,
      );
    }

    this.arenaData?.onStatus?.({
      phase: "playing",
      message: `${event.attackName}: ${formatEventOutcomeText(event)}`,
    });
    if (this.battlePlan) {
      this.arenaData?.onBattleEvent?.(event, this.battlePlan);
    }
  }

  private playNetImpact(
    event: BattleEvent,
    defender: FighterView,
    defenderX: number,
    defenderY: number,
  ): void {
    if (!event.netTrap) {
      return;
    }

    if (event.netTrap.escaped) {
      this.playFighterAnimation(defender, "dodge");
      this.playContactFlash(event, defenderX, defenderY);
      this.showFloatingText(defender, COMBAT_TEXT_LABELS.miss, "miss");
    } else {
      this.playFighterAnimation(defender, "hit");
      this.playContactFlash(event, defenderX, defenderY);
      this.attachCaughtNet(defender, event.netTrap.durationMs);
      this.showFloatingText(defender, formatDurationMs(event.netTrap.durationMs), "net");
    }

    this.arenaData?.onStatus?.({
      phase: "playing",
      message: `${event.attackName}: ${formatEventOutcomeText(event)}`,
    });
    if (this.battlePlan) {
      this.arenaData?.onBattleEvent?.(event, this.battlePlan);
    }
  }

  private playContactFlash(event: BattleEvent, x: number, y: number): void {
    const color =
      event.netTrap && !event.netTrap.escaped
        ? 0xd6c389
        : event.critical
          ? 0xff7058
          : event.outcome === "hit"
            ? 0xfff1a8
            : event.outcome === "block"
              ? 0xb8d7ff
              : 0xffffff;
    const flash = this.add.circle(x, y, event.outcome === "miss" ? 18 : 26, color, 0.62);

    flash.setDepth(1_850);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: event.critical ? 2.5 : event.outcome === "miss" ? 1.6 : 2.1,
      duration: 320,
      ease: "Sine.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private showFloatingText(
    view: FighterView,
    text: string,
    variant: CombatTextVariant,
  ): void {
    const label = this.add
      .text(view.container.x, view.container.y - 202 * view.container.scale, text, {
        align: "center",
        backgroundColor: COMBAT_TEXT_BACKGROUNDS[variant],
        color: COMBAT_TEXT_COLORS[variant],
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: variant === "hit" ? "27px" : "23px",
        fontStyle: "900",
        padding: { left: 16, right: 16, top: 7, bottom: 8 },
        stroke: "rgba(5, 8, 12, 0.72)",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2_200);

    label.setScale(0.84);
    this.tweens.add({
      targets: label,
      alpha: 0,
      y: label.y - 66,
      scale: 1.08,
      duration: FLOATING_TEXT_MS,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private attachCaughtNet(view: FighterView, durationMs: number): void {
    this.releaseCaughtNet(view);

    const net = this.add.graphics();
    const overlay = this.add.container(0, -122, [net]);

    net.lineStyle(4, 0xd6c389, 0.82);
    net.strokeEllipse(0, 0, 126, 156);
    net.lineStyle(2, 0xd6c389, 0.58);

    for (let x = -48; x <= 48; x += 24) {
      net.lineBetween(x, -72, x, 72);
    }

    for (let y = -56; y <= 56; y += 28) {
      net.lineBetween(-56, y, 56, y);
    }

    overlay.setAlpha(0.92);
    overlay.setAngle(view.teamId === "left" ? -7 : 7);
    overlay.setScale(0.92);
    view.container.add(overlay);
    view.netOverlay = overlay;

    this.tweens.add({
      targets: overlay,
      alpha: 0.72,
      yoyo: true,
      repeat: -1,
      duration: 520,
      ease: "Sine.easeInOut",
    });

    this.time.delayedCall(Math.max(NET_RELEASE_MIN_MS, durationMs), () => {
      if (this.defeatedFighterIds.has(view.id)) {
        return;
      }

      this.dropCaughtNet(view);
    });
  }

  private releaseCaughtNet(view: FighterView): void {
    if (!view.netOverlay) {
      return;
    }

    this.tweens.killTweensOf(view.netOverlay);
    view.netOverlay.destroy(true);
    view.netOverlay = null;
  }

  private dropCaughtNet(view: FighterView): void {
    if (!view.netOverlay) {
      return;
    }

    const startX = view.container.x + view.netOverlay.x * view.container.scale;
    const startY = view.container.y + view.netOverlay.y * view.container.scale;
    this.releaseCaughtNet(view);
    this.dropNetOnGround(startX, startY, view.container.x, view.container.y - 8, -6, 0.95);
    this.playFighterAnimation(view, "idle");
  }

  private playRangedEffect(event: BattleEvent, durationMs: number): void {
    const attacker = this.fighterViews.get(event.attackerId);
    const defender = this.fighterViews.get(event.defenderId);

    if (!attacker || !defender) {
      return;
    }

    const fromX = attacker.container.x;
    const fromY = attacker.container.y - 140;
    const toX = defender.container.x;
    const toY = defender.container.y - 126;

    if (event.actionType === "javelin") {
      this.releaseHandJavelin(attacker);
      this.playJavelinFlight(attacker, event, fromX, fromY, toX, toY, durationMs);
    } else if (event.actionType === "net") {
      this.releaseHandNet(attacker);
      this.playNetFlight(event, fromX, fromY, toX, toY, durationMs);
    }
  }

  private playJavelinFlight(
    attacker: FighterView,
    event: BattleEvent,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    durationMs: number,
  ): void {
    const target =
      event.outcome === "miss"
        ? getOvershotTarget(fromX, fromY, toX, toY, 250)
        : { x: toX, y: toY };
    const angle = Phaser.Math.Angle.Between(fromX, fromY, target.x, target.y);

    // Spear model matching the SVG gladiator art style.
    // Layout (angle=0 → flying right): butt at x=-14 … shaft … x=+90 … tip point at x=+126
    const g = this.add.graphics();

    // Wooden shaft: dark-wood → warm-wood gradient approximated with two rects
    g.fillStyle(0x6b4220, 0.92);
    g.fillRect(-14, -3, 104, 6);
    g.fillStyle(0x9b7040, 0.82);
    g.fillRect(-10, -3, 100, 6);
    // Wood-grain highlight strip
    g.fillStyle(0xc49258, 0.48);
    g.fillRect(-8, -2, 96, 1.5);

    // Metal spearhead — elongated leaf shape (≈ SVG v-steel colours)
    // Base at x=90 (±6 px tall), point at x=126. Ratio ≈ 36 : 12 = 3 : 1
    g.fillStyle(0xdde0da, 0.96);
    g.fillTriangle(90, -6, 126, 0, 90, 6);
    // Inner highlight
    g.fillStyle(0xf1f1e8, 0.62);
    g.fillTriangle(90, -2, 120, 0, 90, 2);

    // Bronze ferrule at butt end (≈ SVG v-bronze colours)
    g.fillStyle(0xb07828, 0.88);
    g.fillRect(-16, -4, 6, 8);

    const projectile = this.add.container(fromX, fromY, [g]);
    projectile.setRotation(angle);
    projectile.setScale(0.82);
    projectile.setDepth(1_760);

    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      alpha: event.outcome === "miss" ? 0.12 : 0.96,
      duration: Math.max(240, durationMs),
      ease: SOFT_EASE,
      onComplete: () => {
        this.readyNextHandJavelin(attacker);

        if (event.outcome === "miss") {
          this.time.delayedCall(JAVELIN_EXIT_MS, () => projectile.destroy());
          return;
        }

        this.dropJavelinOnGround(projectile, target.x, target.y, toX, toY + 124);
      },
    });
  }

  private playNetFlight(
    event: BattleEvent,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    durationMs: number,
  ): void {
    const net = this.add.graphics();
    const projectile = this.add.container(fromX, fromY, [net]);

    net.lineStyle(3, 0xd6c389, 0.82);
    net.strokeEllipse(0, 0, 82, 58);
    net.lineStyle(1, 0xd6c389, 0.58);
    for (let x = -28; x <= 28; x += 14) {
      net.lineBetween(x, -24, x, 24);
    }
    for (let y = -18; y <= 18; y += 12) {
      net.lineBetween(-36, y, 36, y);
    }

    projectile.setScale(0.4);
    projectile.setDepth(1_760);

    this.tweens.add({
      targets: projectile,
      x: toX,
      y: toY,
      scale: 1.05,
      angle: 180,
      alpha: event.netTrap?.escaped ? 0.52 : 0.24,
      duration: Math.max(300, durationMs),
      ease: SOFT_EASE,
      onComplete: () => {
        if (event.netTrap?.escaped) {
          this.dropNetOnGround(toX, toY, toX, toY + 128, 14, 0.76);
        }

        projectile.destroy();
      },
    });
  }

  private dropJavelinOnGround(
    projectile: Phaser.GameObjects.Container,
    fromX: number,
    fromY: number,
    groundX: number,
    groundY: number,
  ): void {
    this.tweens.add({
      targets: projectile,
      x: groundX,
      y: groundY,
      angle: -18 + Math.random() * 36,
      alpha: 0.9,
      scale: 0.66,
      duration: JAVELIN_DROP_MS,
      ease: SOFT_EASE,
      onUpdate: () => projectile.setDepth(Math.round(projectile.y) + 12),
      onComplete: () => {
        projectile.setDepth(Math.round(projectile.y) + 12);
        projectile.setAlpha(0.86);
      },
    });

    const dust = this.add.circle(fromX, fromY, 18, 0xd1a45d, 0.2);
    dust.setDepth(1_700);
    this.tweens.add({
      targets: dust,
      x: groundX,
      y: groundY,
      alpha: 0,
      scale: 1.8,
      duration: JAVELIN_DROP_MS,
      ease: "Sine.easeOut",
      onComplete: () => dust.destroy(),
    });
  }

  private dropNetOnGround(
    fromX: number,
    fromY: number,
    groundX: number,
    groundY: number,
    angle: number,
    scale: number,
  ): void {
    const net = this.add.graphics();
    const fallenNet = this.add.container(fromX, fromY, [net]);

    net.lineStyle(3, 0xd6c389, 0.66);
    net.strokeEllipse(0, 0, 108, 76);
    net.lineStyle(1, 0xd6c389, 0.44);

    for (let x = -38; x <= 38; x += 19) {
      net.lineBetween(x, -32, x, 32);
    }

    for (let y = -24; y <= 24; y += 16) {
      net.lineBetween(-48, y, 48, y);
    }

    fallenNet.setDepth(Math.round(groundY) + 9);
    fallenNet.setScale(0.9);
    fallenNet.setAlpha(0.86);

    this.tweens.add({
      targets: fallenNet,
      x: groundX,
      y: groundY,
      angle,
      scale,
      alpha: 0.74,
      duration: 420,
      ease: SOFT_EASE,
      onUpdate: () => fallenNet.setDepth(Math.round(fallenNet.y) + 9),
      onComplete: () => fallenNet.setDepth(Math.round(fallenNet.y) + 9),
    });
  }

  private releaseHandNet(view: FighterView): void {
    if (view.classId !== "retiarius" || !view.netReady) {
      return;
    }

    view.netReady = false;
    this.refreshFighterVisual(view);
  }

  private releaseHandJavelin(view: FighterView): void {
    if (view.classId !== "veles" || view.javelinsRemaining <= 0) {
      return;
    }

    view.javelinsRemaining = Math.max(0, view.javelinsRemaining - 1);
    view.handJavelinReady = false;
    this.refreshFighterVisual(view);
  }

  private readyNextHandJavelin(view: FighterView): void {
    if (view.classId !== "veles" || view.javelinsRemaining <= 0) {
      return;
    }

    view.handJavelinReady = true;

    if (!this.isActionAnimationState(view.currentAnimationState)) {
      this.refreshFighterVisual(view);
    }
  }

  private refreshFighterVisual(view: FighterView): void {
    const state = view.currentAnimationState;
    const hold = state === "victory" || state === "defeat";
    const loop = state === "idle" || state === "walk" || state === "victory";

    view.animationToken += 1;
    view.resetAnimationEvent?.remove(false);
    view.resetAnimationEvent = null;
    view.sprite.play(getPhaserFighterAnimationKey(view.classId, state, this.getVisualVariant(view)), loop);

    if (hold || state === "idle") {
      return;
    }

    const token = view.animationToken;
    const resetDelay = getPhaserFighterAnimationDuration(view.classId, state) + 80;

    view.resetAnimationEvent = this.time.delayedCall(resetDelay, () => {
      if (view.animationToken === token) {
        this.playFighterAnimation(view, "idle");
      }
    });
  }

  private positionFighter(fighterId: string, point: BattlePoint, durationMs: number): void {
    const view = this.fighterViews.get(fighterId);

    if (!view) {
      return;
    }

    const projected = projectBattlePoint(point);
    const applyDepth = (): void => {
      view.container.setDepth(Math.round(view.container.y));
    };

    if (durationMs <= 0) {
      view.movementTween?.remove();
      view.movementTween = null;
      this.applyFighterPoint(view, point);
      return;
    }

    const travelDistance = Phaser.Math.Distance.Between(
      view.container.x,
      view.container.y,
      projected.x,
      projected.y,
    );

    if (travelDistance > 8) {
      this.playFighterAnimation(view, "walk", { forMs: durationMs + WALK_ANIMATION_PAD_MS });
    }

    view.movementTween?.remove();
    const movementTween = this.tweens.add({
      targets: view.container,
      x: projected.x,
      y: projected.y,
      scale: projected.scale,
      duration: durationMs,
      ease: SOFT_EASE,
      onUpdate: applyDepth,
      onComplete: () => {
        if (view.movementTween === movementTween) {
          view.movementTween = null;
        }

        view.container.setDepth(projected.depth);
      },
    });
    view.movementTween = movementTween;
  }

  private applyFighterPoint(view: FighterView, point: BattlePoint): void {
    const projected = projectBattlePoint(point);
    const depthOffset = this.defeatedFighterIds.has(view.id) ? -18 : 0;

    view.container.setPosition(projected.x, projected.y);
    view.container.setScale(projected.scale);
    view.container.setDepth(projected.depth + depthOffset);
  }

  private applyDefeatedVisual(view: FighterView): void {
    view.resetAnimationEvent?.remove(false);
    view.resetAnimationEvent = null;
    this.releaseCaughtNet(view);
    this.playFighterAnimation(view, "defeat", { hold: true });
    view.nameplate.setAlpha(0);

    this.tweens.add({
      targets: view.container,
      alpha: 0.38,
      angle: view.teamId === "left" ? -9 : 9,
      duration: 520,
      ease: SOFT_EASE,
    });
    this.tweens.add({
      targets: view.sprite,
      y: 22,
      duration: 520,
      ease: SOFT_EASE,
    });
    this.time.delayedCall(1_600, () => {
      if (!this.defeatedFighterIds.has(view.id)) {
        return;
      }

      this.tweens.add({
        targets: view.container,
        alpha: 0.24,
        duration: 760,
        ease: "Sine.easeOut",
      });
    });
  }

  private playFighterAnimation(
    view: FighterView,
    state: PhaserFighterAnimationState,
    options: { readonly forMs?: number; readonly hold?: boolean } = {},
  ): void {
    const key = getPhaserFighterAnimationKey(view.classId, state, this.getVisualVariant(view));

    view.currentAnimationState = state;
    view.animationToken += 1;
    view.resetAnimationEvent?.remove(false);
    view.resetAnimationEvent = null;
    view.sprite.play(key, state === "idle" || state === "walk" || state === "victory");

    if (options.hold || state === "idle") {
      return;
    }

    const token = view.animationToken;
    const resetDelay =
      options.forMs ?? getPhaserFighterAnimationDuration(view.classId, state) + 80;

    view.resetAnimationEvent = this.time.delayedCall(resetDelay, () => {
      if (view.animationToken === token) {
        this.playFighterAnimation(view, "idle");
      }
    });
  }

  private getVisualVariant(view: FighterView): PhaserFighterVisualVariant {
    if (view.classId === "retiarius" && !view.netReady) {
      return "netless";
    }

    if (view.classId !== "veles") {
      return "default";
    }

    if (view.javelinsRemaining <= 0) {
      return "javelins-0";
    }

    if (view.javelinsRemaining >= VELES_STARTING_JAVELINS) {
      return "default";
    }

    if (view.javelinsRemaining === 2) {
      return view.handJavelinReady ? "javelins-2-ready" : "javelins-2-throwing";
    }

    return view.handJavelinReady ? "javelins-1-ready" : "javelins-1-throwing";
  }

  private isActionAnimationState(state: PhaserFighterAnimationState): boolean {
    return !["idle", "walk", "hit", "block", "dodge", "defeat", "victory"].includes(state);
  }

  private updateHealth(view: FighterView, hp: number): void {
    const currentHp = Math.max(0, Math.ceil(hp));

    view.hpText.setText(`${currentHp} HP`);
    this.arenaData?.onHealthChange?.({
      fighterId: view.id,
      hp: currentHp,
      maxHp: view.maxHp,
    });
  }

  skipToEnd(): void {
    if (!this.battlePlan || !this.arenaData) {
      return;
    }

    const plan = this.battlePlan;

    this.time.removeAllEvents();
    this.motionPlaybackStartedAtMs = null;
    this.applyMotionClock(plan.durationMs);

    for (const view of this.fighterViews.values()) {
      view.movementTween?.remove();
      view.movementTween = null;
      view.resetAnimationEvent?.remove(false);
      view.resetAnimationEvent = null;
    }

    const winner = this.fighterViews.get(plan.winnerId);
    const loser = this.fighterViews.get(plan.loserId);

    if (winner) {
      this.playFighterAnimation(winner, "victory", { hold: true });
      this.tweens.add({
        targets: winner.container,
        y: winner.container.y - 12,
        scale: winner.container.scale * 1.04,
        duration: 460,
        ease: SOFT_EASE,
      });
    }

    if (loser && !this.defeatedFighterIds.has(plan.loserId)) {
      this.defeatedFighterIds.add(plan.loserId);
      this.applyDefeatedVisual(loser);
    }

    const message = formatArenaResult(plan, this.arenaData.fighterLabels);
    this.arenaData.onStatus?.({ phase: "complete", message, winnerId: plan.winnerId });
    this.arenaData.onBattleComplete?.(plan);
  }
}

function fallbackStartPoint(teamId: "left" | "right"): BattlePoint {
  return teamId === "left" ? { x: 0.12, y: 0.68 } : { x: 0.9, y: 0.58 };
}

function getMovementPlaybackDuration(event: BattleEvent): number {
  return Math.round(Math.max(0, event.movement.durationMs * PHASER_PLAYBACK_SCALE));
}

function getImpactPlaybackDelay(event: BattleEvent): number {
  if (event.actionType === "javelin") {
    return getScaledDuration(event.impactDelayMs, 620, 1_500);
  }

  if (event.actionType === "net") {
    return getScaledDuration(event.impactDelayMs, 520, 980);
  }

  return getScaledDuration(event.impactDelayMs, 120, 720);
}

function getLastEventPlaybackResolutionMs(events: readonly BattleEvent[]): number {
  return events.reduce((latest, event) => {
    const resolutionMs =
      Math.round(event.timeMs * PHASER_PLAYBACK_SCALE) +
      getMovementPlaybackDuration(event) +
      getImpactPlaybackDelay(event);

    return Math.max(latest, resolutionMs);
  }, 0);
}

function getLastMotionTrackEndMs(
  tracks: ReadonlyMap<string, readonly BattleMotionSegment[]>,
): number {
  let lastEndMs = 0;

  for (const track of tracks.values()) {
    for (const segment of track) {
      lastEndMs = Math.max(lastEndMs, segment.endMs);
    }
  }

  return lastEndMs;
}

function createPlaybackMotionTracks(
  plan: BattlePlan,
  fighterIds: readonly string[],
): Map<string, BattleMotionSegment[]> {
  const tracks = (plan as BattlePlan & {
    readonly motionTracks?: Record<string, BattleMotionSegment[]>;
  }).motionTracks;

  if (tracks) {
    return new Map(
      fighterIds.map((fighterId) => [
        fighterId,
        [...(tracks[fighterId] ?? [])].sort((a, b) => a.startMs - b.startMs),
      ]),
    );
  }

  return createFallbackMotionTracks(plan, fighterIds);
}

function createFallbackMotionTracks(
  plan: BattlePlan,
  fighterIds: readonly string[],
): Map<string, BattleMotionSegment[]> {
  const selected = new Set(fighterIds);
  const tracks = new Map<string, BattleMotionSegment[]>(
    fighterIds.map((fighterId) => [fighterId, []]),
  );

  for (const event of plan.events) {
    if (!selected.has(event.attackerId) || event.movement.durationMs <= 0) {
      continue;
    }

    tracks.get(event.attackerId)?.push({
      fighterId: event.attackerId,
      from: event.movement.attackerFrom,
      to: event.movement.attackerTo,
      startMs: event.timeMs,
      endMs: event.timeMs + event.movement.durationMs,
      actionType: event.actionType,
      rush: event.movement.rush,
    });
  }

  return tracks;
}

function sampleMotionTrack(
  startPoint: BattlePoint,
  track: readonly BattleMotionSegment[],
  clockMs: number,
): { point: BattlePoint; moving: boolean } {
  let currentPoint = startPoint;

  for (const segment of track) {
    if (clockMs < segment.startMs) {
      return { point: currentPoint, moving: false };
    }

    if (clockMs <= segment.endMs) {
      const progress =
        segment.endMs <= segment.startMs
          ? 1
          : Phaser.Math.Clamp((clockMs - segment.startMs) / (segment.endMs - segment.startMs), 0, 1);

      return {
        point: interpolateBattlePoint(segment.from, segment.to, progress),
        moving: getBattlePointDistance(segment.from, segment.to) > 0.001 && progress < 1,
      };
    }

    currentPoint = segment.to;
  }

  return { point: currentPoint, moving: false };
}

function interpolateBattlePoint(from: BattlePoint, to: BattlePoint, progress: number): BattlePoint {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function getBattlePointDistance(from: BattlePoint, to: BattlePoint): number {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

function formatDurationMs(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(1)} \u0441`;
}

function formatEventOutcomeText(event: BattleEvent): string {
  const counterPrefix = event.counterAttack
    ? "\u0437\u0443\u0441\u0442\u0440\u0456\u0447\u043d\u0430 \u0430\u0442\u0430\u043a\u0430, "
    : "";

  if (event.actionType === "javelin") {
    if (event.outcome === "hit") {
      return "\u0441\u043f\u0438\u0441 \u0432\u043b\u0443\u0447\u0438\u0432";
    }

    if (event.outcome === "block") {
      return "\u0441\u043f\u0438\u0441 \u0437\u0430\u0431\u043b\u043e\u043a\u043e\u0432\u0430\u043d\u043e";
    }

    return "\u0443\u0445\u0438\u043b\u0435\u043d\u043d\u044f \u0432\u0456\u0434 \u0441\u043f\u0438\u0441\u0430";
  }

  if (event.netTrap) {
    return event.netTrap.escaped
      ? "\u0443\u0445\u0438\u043b\u0435\u043d\u043d\u044f \u0432\u0456\u0434 \u0441\u0456\u0442\u043a\u0438"
      : `\u0441\u0456\u0442\u043a\u0430, ${formatDurationMs(event.netTrap.durationMs)} \u0431\u0435\u0437 \u0445\u043e\u0434\u0443`;
  }

  if (event.outcome === "hit") {
    return event.critical
      ? `${counterPrefix}\u043a\u0440\u0438\u0442\u0438\u0447\u043d\u0438\u0439 \u0443\u0434\u0430\u0440, -${event.damage} HP`
      : `${counterPrefix}-${event.damage} HP`;
  }

  return `${counterPrefix}${OUTCOME_TEXT[event.outcome]}`;
}

function getOvershotTarget(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  distance: number,
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: toX + (dx / length) * distance,
    y: toY + (dy / length) * distance,
  };
}
