import type { BattlePlan } from "./battleTypes";
import type { BattleReplayRecord, BattleReplaySetup } from "./battleReplayTypes";

const BATTLE_SEED_LOG_ENDPOINT = "/api/battle-seeds";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isBattleReplayRecord(value: unknown): value is BattleReplayRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value["version"] === 1 &&
    typeof value["battleId"] === "string" &&
    typeof value["seed"] === "string" &&
    isRecord(value["setup"]) &&
    isRecord(value["plan"])
  );
}

function createBattleReplayRecord(
  plan: BattlePlan,
  setup: BattleReplaySetup,
): BattleReplayRecord {
  return {
    version: 1,
    battleId: plan.id,
    seed: plan.seed,
    createdAt: new Date().toISOString(),
    winnerTeamId: plan.winnerTeamId,
    loserTeamId: plan.loserTeamId,
    fighterIds: Object.keys(plan.fighters),
    setup,
    plan,
  };
}

export function recordBattleReplay(plan: BattlePlan, setup: BattleReplaySetup): void {
  void fetch(BATTLE_SEED_LOG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBattleReplayRecord(plan, setup)),
  })
    .then((response) => {
      if (!response.ok && import.meta.env.DEV) {
        console.warn(`Battle replay was not recorded: ${response.status}`);
      }
    })
    .catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn("Battle replay was not recorded.", error);
      }
    });
}

export async function loadBattleReplay(seed: string): Promise<BattleReplayRecord | null> {
  const response = await fetch(`${BATTLE_SEED_LOG_ENDPOINT}?seed=${encodeURIComponent(seed)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Battle replay lookup failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const record = isRecord(payload) ? payload["record"] : null;

  return isBattleReplayRecord(record) ? record : null;
}
