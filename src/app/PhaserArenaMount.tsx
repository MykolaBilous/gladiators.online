import { useEffect, useRef } from "react";
import { createGladiatorShowcase } from "../ui/gladiatorShowcase";

export function PhaserArenaMount() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    return createGladiatorShowcase(mount);
  }, []);

  return (
    <div
      ref={mountRef}
      className="arena-mount"
      aria-label="Gladiator showcase"
    />
  );
}
