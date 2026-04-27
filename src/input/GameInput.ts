import type { PointerState } from "./inputTypes";

export type { PointerState } from "./inputTypes";

export class GameInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly keys = new Set<string>();
  private readonly pointers = new Map<number, PointerState>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
  }

  isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  getPrimaryPointer(): PointerState | undefined {
    return this.pointers.values().next().value;
  }

  update(): void {
    // Keep this as the central place for per-frame input normalization.
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    this.keys.clear();
    this.pointers.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(event.pointerId);
    this.setPointer(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }

    this.setPointer(event);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.pointers.delete(event.pointerId);
  };

  private setPointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();

    this.pointers.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }
}
