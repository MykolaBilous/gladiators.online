let modelLoadersPromise: Promise<void> | undefined;

export const registerModelLoaders = (): Promise<void> => {
  modelLoadersPromise ??= import("@babylonjs/loaders/glTF").then(() => undefined);
  return modelLoadersPromise;
};
