import { Engine } from "@babylonjs/core/Engines/engine";
import type { EngineOptions } from "@babylonjs/core/Engines/thinEngine";
import type { Scene } from "@babylonjs/core/scene";
import { GameInput } from "../input/GameInput";
import type { GameConfig } from "../config/gameConfig";
import { createBootScene } from "./createBootScene";

interface GameClientOptions {
  readonly canvas: HTMLCanvasElement;
  readonly config: GameConfig;
  readonly onStatusChange?: (message: string) => void;
}

export class GameClient {
  readonly canvas: HTMLCanvasElement;
  readonly engine: Engine;

  private readonly config: GameConfig;
  private readonly input: GameInput;
  private readonly onStatusChange?: (message: string) => void;
  private readonly resizeObserver: ResizeObserver;
  private isRunning = false;
  private currentScene?: Scene;

  constructor(options: GameClientOptions) {
    this.canvas = options.canvas;
    this.config = options.config;
    this.onStatusChange = options.onStatusChange;

    const engineOptions: EngineOptions = {
      preserveDrawingBuffer: false,
      stencil: true,
      powerPreference: "high-performance",
    };

    this.engine = new Engine(this.canvas, true, engineOptions, false);
    this.input = new GameInput(this.canvas);
    this.resizeObserver = new ResizeObserver(() => this.resize());

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  get scene(): Scene {
    if (!this.currentScene) {
      throw new Error("Scene has not been created yet.");
    }

    return this.currentScene;
  }

  async start(): Promise<void> {
    this.setStatus("Starting");
    this.currentScene = createBootScene({
      engine: this.engine,
      canvas: this.canvas,
      clearColor: this.config.clearColor,
    });

    this.resizeObserver.observe(this.canvas);
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.resize();
    this.run();
    this.setStatus("Ready");
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.input.dispose();
    this.currentScene?.dispose();
    this.engine.dispose();
  }

  private readonly resize = (): void => {
    const cappedDpr = Math.min(window.devicePixelRatio || 1, this.config.maxDevicePixelRatio);
    this.engine.setHardwareScalingLevel(1 / cappedDpr);
    this.engine.resize();
  };

  private run(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.engine.runRenderLoop(() => {
      this.input.update();
      this.currentScene?.render();
    });
  }

  private stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.engine.stopRenderLoop();
    this.isRunning = false;
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.stop();
      this.setStatus("Paused");
      return;
    }

    this.run();
    this.resize();
    this.setStatus("Ready");
  }

  private setStatus(message: string): void {
    this.onStatusChange?.(message);
  }
}
