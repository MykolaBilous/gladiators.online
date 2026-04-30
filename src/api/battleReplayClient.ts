import type {
  BattlePlan,
  BattleReplayRecord as CombatBattleReplayRecord,
  BattleReplaySetup,
} from "@gladiators/combat-sim";
import {
  isBattleReplayRecord,
  type BattleReplayRecord as ApiBattleReplayRecord,
} from "@gladiators/shared";

const DEFAULT_API_BASE_URL = "http://localhost:3000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getBattleReplayApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl =
    typeof configuredBaseUrl === "string" && configuredBaseUrl.trim().length > 0
      ? configuredBaseUrl.trim()
      : DEFAULT_API_BASE_URL;
  const withoutTrailingSlash = baseUrl.replace(/\/+$/, "");

  return withoutTrailingSlash === "" ? "" : withoutTrailingSlash;
}

function createBattleReplayApiUrl(seed?: string): string {
  const endpoint = `${getBattleReplayApiBaseUrl()}/battle-replays`;

  return seed ? `${endpoint}/${encodeURIComponent(seed)}` : endpoint;
}

function createBattleReplayRecord(
  plan: BattlePlan,
  setup: BattleReplaySetup,
): ApiBattleReplayRecord {
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
  void fetch(createBattleReplayApiUrl(), {
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

export async function loadBattleReplay(
  seed: string,
): Promise<CombatBattleReplayRecord | null> {
  const response = await fetch(createBattleReplayApiUrl(seed));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Battle replay lookup failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const record = isRecord(payload) ? payload["record"] : null;

  return isBattleReplayRecord(record) ? (record as CombatBattleReplayRecord) : null;
}
