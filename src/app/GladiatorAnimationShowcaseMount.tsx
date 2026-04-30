import { useEffect, useRef } from "react";
import {
  createPhaserAnimationShowcase,
  PHASER_ANIMATION_SHOWCASE_HEIGHT,
  PHASER_ANIMATION_SHOWCASE_WIDTH,
} from "../game-phaser/createPhaserAnimationShowcase";

export function GladiatorAnimationShowcaseMount() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    return createPhaserAnimationShowcase(mount);
  }, []);

  return (
    <div
      ref={mountRef}
      className="animation-showcase-stage"
      style={{
        aspectRatio: `${PHASER_ANIMATION_SHOWCASE_WIDTH} / ${PHASER_ANIMATION_SHOWCASE_HEIGHT}`,
      }}
      aria-label="Gladiator animation showcase"
    />
  );
}
