import type { BattleEvent } from "../../combat/battleTypes";
import type { RuntimeGladiator } from "../../gladiators/roster";
import {
  JAVELIN_DROP_MS,
  JAVELIN_EXIT_MS,
  JAVELIN_FLIGHT_MS,
  JAVELIN_RELEASE_MAX_FRACTION,
  JAVELIN_RELEASE_MIN_FRACTION,
  NET_DROP_MS,
  NET_FLIGHT_MS,
  clampNumber,
} from "./playback";

export interface BattleThrowablesController {
  flyNetToTarget: (event: BattleEvent, runId: number) => Promise<HTMLElement | null>;
  dropStageNet: (net: HTMLElement, groundPoint: StagePoint, runId: number) => Promise<void>;
  attachCaughtNet: (fighterId: string) => void;
  scheduleNetRelease: (fighterId: string, holdMs: number, runId: number) => void;
  getJavelinReleaseDelayMs: (clipDuration: number, impactDelayMs: number) => number;
  flyJavelinToTarget: (event: BattleEvent, runId: number, flightMs: number) => Promise<HTMLElement | null>;
  flyJavelinPastMiss: (event: BattleEvent, runId: number, flightMs: number) => Promise<HTMLElement | null>;
  removeEscapedJavelinAfterExit: (javelin: HTMLElement, runId: number) => Promise<void>;
  dropStageJavelin: (javelin: HTMLElement, groundPoint: StagePoint, runId: number) => Promise<void>;
  getFighterArenaWorldPoint: (fighterId: string, anchor: FighterStageAnchor) => StagePoint;
}

export interface BattleThrowablesContext {
  stageEl: HTMLElement;
  arenaWorldEl: HTMLElement;
  getRuntimeFighters: () => readonly RuntimeGladiator[];
  getArenaCameraZoom: () => number;
  getFighterElement: (fighterId: string) => HTMLElement | null;
  wait: (ms: number) => Promise<void>;
  isRunActive: (runId: number) => boolean;
}

export type StagePoint = { x: number; y: number };
export type FighterStageAnchor = "throw" | "javelinThrow" | "body" | "evade" | "ground";

export function createBattleThrowables({
  stageEl,
  arenaWorldEl,
  getRuntimeFighters,
  getArenaCameraZoom,
  getFighterElement,
  wait,
  isRunActive,
}: BattleThrowablesContext): BattleThrowablesController {
  function getFighterStagePoint(
    fighterId: string,
    anchor: FighterStageAnchor,
  ): StagePoint {
    const stageRect = stageEl.getBoundingClientRect();
    const fighterEl = getFighterElement(fighterId);
  
    if (!fighterEl) {
      return { x: stageRect.width / 2, y: stageRect.height / 2 };
    }
  
    const fighterRect = fighterEl.getBoundingClientRect();
    const side = fighterEl.dataset["side"] === "left" ? "left" : "right";
    const x = fighterRect.left - stageRect.left;
    const y = fighterRect.top - stageRect.top;
  
    if (anchor === "throw") {
      return {
        x: x + fighterRect.width * (side === "left" ? 0.72 : 0.28),
        y: y + fighterRect.height * 0.62,
      };
    }
  
    if (anchor === "javelinThrow") {
      return {
        x: x + fighterRect.width * (side === "left" ? 0.68 : 0.32),
        y: y + fighterRect.height * 0.36,
      };
    }
  
    if (anchor === "evade") {
      return {
        x: x + fighterRect.width * (side === "left" ? 0.08 : 0.92),
        y: y + fighterRect.height * 0.54,
      };
    }
  
    if (anchor === "ground") {
      return {
        x: x + fighterRect.width * 0.5,
        y: y + fighterRect.height * 0.9,
      };
    }
  
    return {
      x: x + fighterRect.width * 0.5,
      y: y + fighterRect.height * 0.55,
    };
  }
  
  function getElementStageCenter(element: HTMLElement): StagePoint {
    const stageRect = stageEl.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
  
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  }
  
  function getArenaWorldPointFromStagePoint(point: StagePoint): StagePoint {
    const stageRect = stageEl.getBoundingClientRect();
    const worldRect = arenaWorldEl.getBoundingClientRect();
    const scaleX =
      arenaWorldEl.offsetWidth > 0 ? worldRect.width / arenaWorldEl.offsetWidth : getArenaCameraZoom();
    const scaleY =
      arenaWorldEl.offsetHeight > 0 ? worldRect.height / arenaWorldEl.offsetHeight : getArenaCameraZoom();
  
    return {
      x: (stageRect.left + point.x - worldRect.left) / Math.max(0.001, scaleX),
      y: (stageRect.top + point.y - worldRect.top) / Math.max(0.001, scaleY),
    };
  }
  
  function getFighterArenaWorldPoint(
    fighterId: string,
    anchor: FighterStageAnchor,
  ): StagePoint {
    return getArenaWorldPointFromStagePoint(getFighterStagePoint(fighterId, anchor));
  }
  
  function getElementArenaWorldCenter(element: HTMLElement): StagePoint {
    return getArenaWorldPointFromStagePoint(getElementStageCenter(element));
  }
  
  function createNetElement(className: string): HTMLDivElement {
    const net = document.createElement("div");
    net.className = `combat-net ${className}`;
    return net;
  }
  
  function setStageNetTransform(
    net: HTMLElement,
    point: StagePoint,
    rotationDeg: number,
    scale: number,
  ): void {
    net.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${rotationDeg}deg) scale(${scale})`;
  }
  
  async function flyNetToTarget(event: BattleEvent, runId: number): Promise<HTMLElement | null> {
    const net = createNetElement("stage-net flying-net");
    const start = getFighterArenaWorldPoint(event.attackerId, "throw");
    const end = getFighterArenaWorldPoint(
      event.defenderId,
      event.netTrap?.escaped ? "evade" : "body",
    );
  
    arenaWorldEl.appendChild(net);
    const attackerSide = getRuntimeFighters().find((fighter) => fighter.id === event.attackerId)?.teamId;
    setStageNetTransform(net, start, attackerSide === "right" ? -18 : 18, 0.58);
    void net.offsetWidth;
    net.classList.add("is-flying");
    setStageNetTransform(
      net,
      end,
      event.netTrap?.escaped ? 28 : -8,
      event.netTrap?.escaped ? 0.86 : 1.08,
    );
  
    await wait(NET_FLIGHT_MS);
  
    if (!isRunActive(runId)) {
      net.remove();
      return null;
    }
  
    return net;
  }
  
  async function dropStageNet(
    net: HTMLElement,
    groundPoint: StagePoint,
    runId: number,
  ): Promise<void> {
    net.classList.remove("flying-net", "caught-net");
    net.classList.add("fallen-net");
    void net.offsetWidth;
    setStageNetTransform(net, groundPoint, 14, 0.76);
  
    await wait(NET_DROP_MS);
  
    if (!isRunActive(runId)) {
      net.remove();
      return;
    }
  
    net.classList.add("is-on-ground");
  }
  
  function attachCaughtNet(fighterId: string): void {
    const fighterEl = getFighterElement(fighterId);
  
    if (!fighterEl) {
      return;
    }
  
    fighterEl.querySelector<HTMLElement>(".caught-net")?.remove();
    fighterEl.appendChild(createNetElement("caught-net"));
  }
  
  function scheduleNetRelease(fighterId: string, holdMs: number, runId: number): void {
    void (async () => {
      await wait(holdMs);
  
      if (!isRunActive(runId)) return;
  
      const fighterEl = getFighterElement(fighterId);
      const caughtNet = fighterEl?.querySelector<HTMLElement>(".caught-net");
      const start = caughtNet
        ? getElementArenaWorldCenter(caughtNet)
        : getFighterArenaWorldPoint(fighterId, "body");
      const fallingNet = createNetElement("stage-net fallen-net");
  
      caughtNet?.remove();
      fighterEl?.classList.remove("is-netted");
      arenaWorldEl.appendChild(fallingNet);
      setStageNetTransform(fallingNet, start, -6, 1);
      void fallingNet.offsetWidth;
      await dropStageNet(fallingNet, getFighterArenaWorldPoint(fighterId, "ground"), runId);
    })();
  }
  
  function createJavelinElement(className: string): HTMLDivElement {
    const javelin = document.createElement("div");
    javelin.className = `combat-javelin ${className}`;
    return javelin;
  }
  
  function getPointAngleDeg(from: StagePoint, to: StagePoint): number {
    return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  }
  
  function setStageJavelinTransform(
    javelin: HTMLElement,
    point: StagePoint,
    rotationDeg: number,
    scale: number,
  ): void {
    javelin.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${rotationDeg}deg) scale(${scale})`;
  }
  
  function getJavelinReleaseDelayMs(clipDuration: number, impactDelayMs: number): number {
    return Math.round(
      clampNumber(
        impactDelayMs - JAVELIN_FLIGHT_MS,
        clipDuration * JAVELIN_RELEASE_MIN_FRACTION,
        clipDuration * JAVELIN_RELEASE_MAX_FRACTION,
      ),
    );
  }
  
  async function flyJavelinToTarget(
    event: BattleEvent,
    runId: number,
    flightMs: number,
  ): Promise<HTMLElement | null> {
    const javelin = createJavelinElement("stage-javelin flying-javelin");
    const start = getFighterArenaWorldPoint(event.attackerId, "javelinThrow");
    const end = getFighterArenaWorldPoint(event.defenderId, "body");
    const angle = getPointAngleDeg(start, end);
  
    arenaWorldEl.appendChild(javelin);
    javelin.style.setProperty("--javelin-flight-ms", `${Math.max(180, flightMs)}ms`);
    javelin.style.setProperty("--javelin-flight-easing", "linear");
    setStageJavelinTransform(javelin, start, angle, 0.72);
    void javelin.offsetWidth;
    javelin.classList.add("is-flying");
    setStageJavelinTransform(javelin, end, angle, 0.82);
  
    await wait(flightMs);
  
    if (!isRunActive(runId)) {
      javelin.remove();
      return null;
    }
  
    return javelin;
  }
  
  function getJavelinMissExitPoint(
    start: StagePoint,
    evade: StagePoint,
    flightMs: number,
  ): StagePoint {
    const exitRatio = JAVELIN_EXIT_MS / Math.max(180, flightMs);
  
    return {
      x: evade.x + (evade.x - start.x) * exitRatio,
      y: evade.y + (evade.y - start.y) * exitRatio,
    };
  }
  
  async function flyJavelinPastMiss(
    event: BattleEvent,
    runId: number,
    flightMs: number,
  ): Promise<HTMLElement | null> {
    const javelin = createJavelinElement("stage-javelin flying-javelin");
    const start = getFighterArenaWorldPoint(event.attackerId, "javelinThrow");
    const evade = getFighterArenaWorldPoint(event.defenderId, "evade");
    const exit = getJavelinMissExitPoint(start, evade, flightMs);
    const angle = getPointAngleDeg(start, evade);
    const totalFlightMs = Math.max(180, flightMs) + JAVELIN_EXIT_MS;
  
    arenaWorldEl.appendChild(javelin);
    javelin.style.setProperty("--javelin-flight-ms", `${totalFlightMs}ms`);
    javelin.style.setProperty("--javelin-flight-easing", "linear");
    setStageJavelinTransform(javelin, start, angle, 0.72);
    void javelin.offsetWidth;
    javelin.classList.add("is-flying");
    setStageJavelinTransform(javelin, exit, angle, 0.82);
  
    await wait(flightMs);
  
    if (!isRunActive(runId)) {
      javelin.remove();
      return null;
    }
  
    return javelin;
  }
  
  async function removeEscapedJavelinAfterExit(
    javelin: HTMLElement,
    runId: number,
  ): Promise<void> {
    await wait(JAVELIN_EXIT_MS);
  
    if (!isRunActive(runId)) {
      javelin.remove();
      return;
    }
  
    javelin.remove();
  }
  
  async function dropStageJavelin(
    javelin: HTMLElement,
    groundPoint: StagePoint,
    runId: number,
  ): Promise<void> {
    javelin.classList.remove("flying-javelin", "escaped-javelin");
    javelin.classList.add("fallen-javelin");
    void javelin.offsetWidth;
    setStageJavelinTransform(javelin, groundPoint, -18 + Math.random() * 36, 0.7);
  
    await wait(JAVELIN_DROP_MS);
  
    if (!isRunActive(runId)) {
      javelin.remove();
      return;
    }
  
    javelin.classList.add("is-on-ground");
  }
  


  return {
    flyNetToTarget,
    dropStageNet,
    attachCaughtNet,
    scheduleNetRelease,
    getJavelinReleaseDelayMs,
    flyJavelinToTarget,
    flyJavelinPastMiss,
    removeEscapedJavelinAfterExit,
    dropStageJavelin,
    getFighterArenaWorldPoint,
  };
}
