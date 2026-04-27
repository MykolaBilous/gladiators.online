import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import type { CreateBootSceneOptions } from "./gameTypes";

export type { CreateBootSceneOptions } from "./gameTypes";

export const createBootScene = ({ engine, canvas, clearColor }: CreateBootSceneOptions): Scene => {
  const scene = new Scene(engine);
  scene.clearColor = clearColor;

  const camera = new ArcRotateCamera(
    "camera.main",
    Math.PI / 2,
    Math.PI / 2.5,
    8,
    Vector3.Zero(),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 16;
  scene.activeCamera = camera;

  new HemisphericLight("light.ambient", new Vector3(0, 1, 0), scene);

  return scene;
};
