import type { Scene } from "@babylonjs/core/scene";

export const installBabylonInspectorShortcut = (scene: Scene): void => {
  if (!import.meta.env.DEV) {
    return;
  }

  window.addEventListener("keydown", async (event) => {
    if (event.code !== "Backquote" || event.repeat) {
      return;
    }

    await import("@babylonjs/inspector");

    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
      return;
    }

    scene.debugLayer.show({
      embedMode: true,
      overlay: false,
    });
  });
};
