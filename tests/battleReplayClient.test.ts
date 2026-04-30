import { afterEach, describe, expect, it, vi } from "vitest";
import { loadBattleReplay } from "../src/api/battleReplayClient";

const replayRecord = {
  version: 1,
  battleId: "battle-client-1",
  seed: "seed-client-1",
  createdAt: "2026-04-29T12:00:00.000Z",
  winnerTeamId: "left",
  loserTeamId: "right",
  fighterIds: ["murmillo", "retiarius"],
  setup: {
    trainingMode: "balanced",
  },
  plan: {
    id: "battle-client-1",
    seed: "seed-client-1",
  },
} as const;

describe("battle replay API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads battle replays from the core backend by seed", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ record: replayRecord }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadBattleReplay("seed client 1")).resolves.toEqual(replayRecord);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/battle-replays/seed%20client%201",
    );
  });

  it("returns null for missing battle replays", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadBattleReplay("missing-seed")).resolves.toBeNull();
  });
});
