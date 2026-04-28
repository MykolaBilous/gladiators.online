import type { BattlePoint } from "../../combat/battleTypes";
import type { RuntimeGladiator } from "../../gladiators/roster";
import {
  CAMERA_CLOSE_FREEZE_SPAN,
  CAMERA_FIT_TOLERANCE,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_POSITION_SMOOTHING_MS,
  CAMERA_SETTLE_EPSILON_PX,
  CAMERA_SETTLE_EPSILON_ZOOM,
  CAMERA_SIDE_GUTTER_PX,
  CAMERA_VERTICAL_GUTTER,
  CAMERA_ZOOM_SMOOTHING_MS,
  clampNumber,
  getArenaRenderMetrics,
  lerp,
  type ArenaCameraBounds,
  type ArenaCameraState,
} from "./playback";

export interface ArenaCameraController {
  scheduleUpdate: () => void;
  handleResize: () => void;
  reset: () => void;
  getState: () => ArenaCameraState;
  dispose: () => void;
}

export interface ArenaCameraControllerContext {
  stageEl: HTMLElement;
  arenaWorldEl: HTMLElement;
  isDisposed: () => boolean;
  getRuntimeFighters: () => readonly RuntimeGladiator[];
  getFighterArenaPosition: (fighterId: string) => BattlePoint | undefined;
  getCurrentSpawnPositions: () => Record<string, BattlePoint>;
  getFighterElement: (fighterId: string) => HTMLElement | null;
}

export function createArenaCameraController({
  stageEl,
  arenaWorldEl,
  isDisposed,
  getRuntimeFighters,
  getFighterArenaPosition,
  getCurrentSpawnPositions,
  getFighterElement,
}: ArenaCameraControllerContext): ArenaCameraController {
  let cameraState: ArenaCameraState = { x: 0, y: 0, zoom: 1 };
  let cameraTarget: ArenaCameraState = { x: 0, y: 0, zoom: 1 };
  let cameraInitialized = false;
  let updateFrame = 0;
  let animationFrame = 0;
  let lastFrameMs = 0;

  function getArenaCameraBounds(
    state: ArenaCameraState,
    stageWidth: number,
    stageHeight: number,
    worldWidth: number,
    worldHeight: number,
  ): ArenaCameraBounds {
    const halfWidth = stageWidth / (2 * worldWidth * state.zoom);
    const halfHeight = stageHeight / (2 * worldHeight * state.zoom);
    const centerX = 0.5 - state.x / (worldWidth * state.zoom);
    const centerY = 0.5 - state.y / (worldHeight * state.zoom);

    return {
      minX: centerX - halfWidth,
      maxX: centerX + halfWidth,
      minY: centerY - halfHeight,
      maxY: centerY + halfHeight,
    };
  }

  function getLargestArenaFighterWidth(): number {
    let largest = 0;

    for (const fighter of getRuntimeFighters()) {
      largest = Math.max(largest, getFighterElement(fighter.id)?.offsetWidth ?? 0);
    }

    return largest;
  }

  function getCameraRenderPoint(point: BattlePoint): { x: number; y: number } {
    const metrics = getArenaRenderMetrics(point);

    return {
      x: metrics.x / 100,
      y: clampNumber(1 - metrics.bottom / 100 - 0.16 * metrics.scale, 0.05, 0.95),
    };
  }

  function getTrackedFighterCameraBounds(): ArenaCameraBounds | null {
    const spawnPositions = getCurrentSpawnPositions();
    const points = getRuntimeFighters()
      .map((fighter) => getFighterArenaPosition(fighter.id) ?? spawnPositions[fighter.id])
      .filter((point): point is BattlePoint => Boolean(point))
      .map(getCameraRenderPoint);

    if (points.length === 0) {
      return null;
    }

    return points.reduce<ArenaCameraBounds>(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        maxX: Math.max(bounds.maxX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxY: Math.max(bounds.maxY, point.y),
      }),
      {
        minX: points[0]!.x,
        maxX: points[0]!.x,
        minY: points[0]!.y,
        maxY: points[0]!.y,
      },
    );
  }

  function clampArenaCameraOffset(
    centerX: number,
    centerY: number,
    zoom: number,
    stageWidth: number,
    stageHeight: number,
    worldWidth: number,
    worldHeight: number,
  ): ArenaCameraState {
    const maxX = Math.max(0, (worldWidth * zoom - stageWidth) / 2);
    const maxY = Math.max(0, (worldHeight * zoom - stageHeight) / 2);

    return {
      x: clampNumber(-(centerX - 0.5) * worldWidth * zoom, -maxX, maxX),
      y: clampNumber(-(centerY - 0.5) * worldHeight * zoom, -maxY, maxY),
      zoom,
    };
  }

  function doesCameraContainBounds(
    cameraBounds: ArenaCameraBounds,
    trackedBounds: ArenaCameraBounds,
    sidePadding: number,
  ): boolean {
    return (
      trackedBounds.minX - sidePadding >= cameraBounds.minX + CAMERA_FIT_TOLERANCE &&
      trackedBounds.maxX + sidePadding <= cameraBounds.maxX - CAMERA_FIT_TOLERANCE &&
      trackedBounds.minY - CAMERA_VERTICAL_GUTTER >= cameraBounds.minY + CAMERA_FIT_TOLERANCE &&
      trackedBounds.maxY + CAMERA_VERTICAL_GUTTER <= cameraBounds.maxY - CAMERA_FIT_TOLERANCE
    );
  }

  function applyArenaCamera(state: ArenaCameraState): void {
    cameraState = state;
    stageEl.style.setProperty("--arena-camera-x", `${state.x.toFixed(1)}px`);
    stageEl.style.setProperty("--arena-camera-y", `${state.y.toFixed(1)}px`);
    stageEl.style.setProperty("--arena-camera-zoom", state.zoom.toFixed(3));
    cameraInitialized = true;
  }

  function isArenaCameraSettled(state: ArenaCameraState, target: ArenaCameraState): boolean {
    return (
      Math.abs(state.x - target.x) <= CAMERA_SETTLE_EPSILON_PX &&
      Math.abs(state.y - target.y) <= CAMERA_SETTLE_EPSILON_PX &&
      Math.abs(state.zoom - target.zoom) <= CAMERA_SETTLE_EPSILON_ZOOM
    );
  }

  function stopArenaCameraAnimation(): void {
    if (animationFrame !== 0) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    lastFrameMs = 0;
  }

  function animateArenaCamera(timestampMs: number): void {
    if (isDisposed()) {
      animationFrame = 0;
      lastFrameMs = 0;
      return;
    }

    const elapsedMs =
      lastFrameMs > 0 ? Math.min(64, timestampMs - lastFrameMs) : 16.7;
    const positionT = 1 - Math.exp(-elapsedMs / CAMERA_POSITION_SMOOTHING_MS);
    const zoomT = 1 - Math.exp(-elapsedMs / CAMERA_ZOOM_SMOOTHING_MS);
    const nextState: ArenaCameraState = {
      x: lerp(cameraState.x, cameraTarget.x, positionT),
      y: lerp(cameraState.y, cameraTarget.y, positionT),
      zoom: lerp(cameraState.zoom, cameraTarget.zoom, zoomT),
    };

    lastFrameMs = timestampMs;

    if (isArenaCameraSettled(nextState, cameraTarget)) {
      applyArenaCamera(cameraTarget);
      stopArenaCameraAnimation();
      return;
    }

    applyArenaCamera(nextState);
    animationFrame = window.requestAnimationFrame(animateArenaCamera);
  }

  function startArenaCameraAnimation(): void {
    if (animationFrame !== 0) {
      return;
    }

    lastFrameMs = 0;
    animationFrame = window.requestAnimationFrame(animateArenaCamera);
  }

  function setArenaCameraTarget(target: ArenaCameraState): void {
    cameraTarget = target;

    if (!cameraInitialized) {
      applyArenaCamera(target);
      return;
    }

    if (isArenaCameraSettled(cameraState, target)) {
      applyArenaCamera(target);
      stopArenaCameraAnimation();
      return;
    }

    startArenaCameraAnimation();
  }

  function updateArenaCameraNow(): void {
    if (isDisposed()) {
      return;
    }

    const stageWidth = stageEl.clientWidth;
    const stageHeight = stageEl.clientHeight;
    const worldWidth = arenaWorldEl.offsetWidth;
    const worldHeight = arenaWorldEl.offsetHeight;
    const trackedBounds = getTrackedFighterCameraBounds();

    if (
      stageWidth <= 0 ||
      stageHeight <= 0 ||
      worldWidth <= 0 ||
      worldHeight <= 0 ||
      !trackedBounds
    ) {
      return;
    }

    const worldWidthRatio = worldWidth / stageWidth;
    const worldHeightRatio = worldHeight / stageHeight;
    const sidePadding = clampNumber(
      (getLargestArenaFighterWidth() / 2 + CAMERA_SIDE_GUTTER_PX) / worldWidth,
      0.07,
      0.14,
    );
    const widthToFit = trackedBounds.maxX - trackedBounds.minX + sidePadding * 2;
    const heightToFit = trackedBounds.maxY - trackedBounds.minY + CAMERA_VERTICAL_GUTTER * 2;
    const coverageMinZoom = Math.max(
      CAMERA_MIN_ZOOM,
      stageWidth / worldWidth,
      stageHeight / worldHeight,
    );
    const targetZoom = clampNumber(
      Math.min(1 / (worldWidthRatio * widthToFit), 1 / (worldHeightRatio * heightToFit)),
      coverageMinZoom,
      CAMERA_MAX_ZOOM,
    );
    const closeEnoughToFreeze =
      trackedBounds.maxX - trackedBounds.minX <= CAMERA_CLOSE_FREEZE_SPAN &&
      targetZoom >= CAMERA_MAX_ZOOM - 0.001;

    if (
      cameraInitialized &&
      closeEnoughToFreeze &&
      cameraState.zoom >= CAMERA_MAX_ZOOM - 0.01 &&
      doesCameraContainBounds(
        getArenaCameraBounds(cameraState, stageWidth, stageHeight, worldWidth, worldHeight),
        trackedBounds,
        sidePadding,
      )
    ) {
      cameraTarget = cameraState;
      stopArenaCameraAnimation();
      return;
    }

    setArenaCameraTarget(
      clampArenaCameraOffset(
        (trackedBounds.minX + trackedBounds.maxX) / 2,
        (trackedBounds.minY + trackedBounds.maxY) / 2,
        targetZoom,
        stageWidth,
        stageHeight,
        worldWidth,
        worldHeight,
      ),
    );
  }

  const scheduleUpdate = (): void => {
    if (updateFrame !== 0) {
      return;
    }

    updateFrame = window.requestAnimationFrame(() => {
      updateFrame = 0;
      updateArenaCameraNow();
    });
  };

  const reset = (): void => {
    cameraInitialized = false;
  };

  const handleResize = (): void => {
    reset();
    scheduleUpdate();
  };

  const dispose = (): void => {
    if (updateFrame !== 0) {
      window.cancelAnimationFrame(updateFrame);
      updateFrame = 0;
    }
    stopArenaCameraAnimation();
  };

  return {
    scheduleUpdate,
    handleResize,
    reset,
    getState: () => cameraState,
    dispose,
  };
}
