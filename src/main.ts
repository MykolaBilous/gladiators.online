import "./styles.css";
import { gameConfig } from "./config/gameConfig";
import { GameClient } from "./game/GameClient";

const canvas = document.querySelector<HTMLCanvasElement>(`#${gameConfig.canvasId}`);
const status = document.querySelector<HTMLDivElement>("#app-status");

if (!canvas) {
  throw new Error(`Missing canvas element #${gameConfig.canvasId}`);
}

const setStatus = (message: string): void => {
  if (status) {
    status.textContent = message;
  }
};

const game = new GameClient({
  canvas,
  config: gameConfig,
  onStatusChange: setStatus,
});

try {
  await game.start();

  if (import.meta.env.DEV) {
    const { installBabylonInspectorShortcut } = await import(
      "./game/installBabylonInspectorShortcut"
    );
    installBabylonInspectorShortcut(game.scene);
  }
} catch (error) {
  console.error(error);
  setStatus("Failed to start");
}

window.addEventListener("beforeunload", () => {
  game.dispose();
});
