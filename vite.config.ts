import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

const BATTLE_SEED_LOG_ENDPOINT = "/api/battle-seeds";
const BATTLE_SEED_LOG_DIR = "battle-seeds";

interface BattleSeedLogRecord {
  version?: number;
  recordedAt: string;
  battleId?: string;
  seed: string;
  createdAt?: string;
  winnerTeamId?: string;
  loserTeamId?: string;
  fighterIds?: string[];
  setup?: unknown;
  plan?: unknown;
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();

  if (body.length === 0) {
    return null;
  }

  return JSON.parse(body) as unknown;
}

function isNotFoundError(error: unknown): boolean {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function createBattleSeedLogRecord(payload: unknown): BattleSeedLogRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const seed = source["seed"];

  if (typeof seed !== "string" || seed.trim().length === 0) {
    return null;
  }

  const fighterIds = Array.isArray(source["fighterIds"])
    ? source["fighterIds"].filter((value): value is string => typeof value === "string")
    : undefined;

  return {
    version: typeof source["version"] === "number" ? source["version"] : undefined,
    recordedAt: new Date().toISOString(),
    battleId: typeof source["battleId"] === "string" ? source["battleId"] : undefined,
    seed,
    createdAt: typeof source["createdAt"] === "string" ? source["createdAt"] : undefined,
    winnerTeamId:
      typeof source["winnerTeamId"] === "string" ? source["winnerTeamId"] : undefined,
    loserTeamId: typeof source["loserTeamId"] === "string" ? source["loserTeamId"] : undefined,
    fighterIds,
    setup: source["setup"],
    plan: source["plan"],
  };
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

async function findBattleSeedLogRecord(
  root: string,
  seedOrBattleId: string,
): Promise<BattleSeedLogRecord | null> {
  const directory = join(root, BATTLE_SEED_LOG_DIR);
  let files: string[];

  try {
    files = await readdir(directory);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }

  const logFiles = files
    .filter((file) => file.endsWith(".jsonl"))
    .sort()
    .reverse();

  for (const file of logFiles) {
    const content = await readFile(join(directory, file), "utf8");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reverse();

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as BattleSeedLogRecord;

        if (record.seed === seedOrBattleId || record.battleId === seedOrBattleId) {
          return record;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function handleBattleSeedLookupRequest(
  root: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const seed = requestUrl.searchParams.get("seed")?.trim();

  if (!seed) {
    sendJson(response, 400, { error: "Battle seed is required." });
    return;
  }

  const record = await findBattleSeedLogRecord(root, seed);

  if (!record) {
    sendJson(response, 404, { error: "Battle replay was not found." });
    return;
  }

  sendJson(response, 200, { record });
}

async function handleBattleSeedLogRequest(
  root: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method === "GET") {
    await handleBattleSeedLookupRequest(root, request, response);
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Only GET and POST requests are supported." });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const record = createBattleSeedLogRecord(payload);

    if (!record) {
      sendJson(response, 400, { error: "Battle seed is required." });
      return;
    }

    const directory = join(root, BATTLE_SEED_LOG_DIR);
    const filePath = join(directory, `${formatLocalDate(new Date())}.jsonl`);

    await mkdir(directory, { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");

    sendJson(response, 201, { ok: true });
  } catch (error) {
    console.error("Failed to record battle seed.", error);
    sendJson(response, 500, { error: "Failed to record battle seed." });
  }
}

function battleSeedLoggerPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: "battle-seed-logger",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(BATTLE_SEED_LOG_ENDPOINT, (request, response) => {
        void handleBattleSeedLogRequest(root, request, response);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(BATTLE_SEED_LOG_ENDPOINT, (request, response) => {
        void handleBattleSeedLogRequest(root, request, response);
      });
    },
  };
}

export default defineConfig({
  appType: "spa",
  plugins: [battleSeedLoggerPlugin()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
