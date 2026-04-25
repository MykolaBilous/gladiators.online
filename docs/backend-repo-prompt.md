# Prompt для окремого backend-репозиторію

Створи окремий backend repository для online WebGL/mobile гри **Gladiators Online**.

Вимоги до стеку:

- Node.js + TypeScript.
- Fastify для REST/HTTP API.
- Colyseus для server-authoritative realtime multiplayer rooms через WebSocket.
- PostgreSQL + Prisma для users, profiles, inventory, progression, match history.
- Redis для sessions/presence, matchmaking queues, rate limiting і pub/sub між game server instances.
- Docker Compose для локального PostgreSQL і Redis.
- Vitest для unit/integration tests.
- ESLint/Prettier для code quality.
- OpenAPI schema для HTTP API.
- `.env.example` з усіма змінними.

Потрібна базова структура:

- `src/server.ts` - entrypoint.
- `src/http` - healthcheck, auth stubs, profile endpoints.
- `src/realtime` - Colyseus server, `LobbyRoom`, `MatchRoom`.
- `src/db` - Prisma client і migrations.
- `src/config` - typed env config.
- `src/shared` - DTO/types, які потім можна винести у shared package.
- `tests` - базові тести healthcheck і створення room.

Не створюй реальний геймплей, баланс, локації або фейкові рівні. Потрібна тільки production-ready backend база, готова для майбутнього server-authoritative combat і matchmaking.
