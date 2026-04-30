# Gladiators Online

Frontend client для гри. Бойова логіка, типи гладіаторів, roster/progression API і arena scale helpers імпортуються з локального core package `@gladiators/combat-sim`; у цьому repo залишаються canvas/UI, Phaser arena renderer slice, legacy showcase playback, assets і web/mobile оболонка.

## Обраний стек

- **Vite + TypeScript** для швидкого dev server, production build і простого static deploy.
- **Phaser** для першого renderer slice 2.5D арени.
- **Babylon.js через `@babylonjs/core`** замість legacy `babylonjs`, щоб імпортувати тільки потрібні модулі.
- **`@babylonjs/loaders`** під майбутні `.glb/.gltf` assets.
- **`@babylonjs/inspector`** тільки для dev-режиму. Натисни `` ` `` під час `npm run dev`, щоб відкрити Inspector.
- **`@gladiators/combat-sim`** як local file dependency з `../gladiators.online-core/packages/combat-sim`.
- **`@gladiators/shared`** як local file dependency з `../gladiators.online-core/packages/shared` для API contracts.
- **React + TypeScript** for the platform shell, routing, account/profile/messages/settings surfaces, and Phaser mount lifecycle.
- **Vanilla DOM/CSS** remains inside the legacy showcase and the current Phaser demo HUD until those slices are replaced by dedicated React surfaces.

## Команди

Перед frontend build core package має бути зібраний:

```bash
cd ../gladiators.online-core
npm install
npm run build
```

```bash
cd ../gladiators.online
npm install
npm run typecheck
npm test
npm run dev
npm run build
npm run preview
```

## Структура

```text
src/
  app/
    App.tsx
    GladiatorAnimationShowcaseMount.tsx
    PhaserArenaMount.tsx
    routes.ts
    app.css
  api/
    battleReplayClient.ts
  game-phaser/
    scenes/
      BootScene.ts
      PreloadScene.ts
      ArenaScene.ts
    createPhaserAnimationShowcase.ts
    createPhaserArenaRenderer.ts
    phaserArenaDemo.ts
  config/
    gameConfig.ts
  gladiatorAssets/
    murmillo/
    retiarius/
    veles/
  game/
    GameClient.ts
    createBootScene.ts
    installBabylonInspectorShortcut.ts
  input/
    GameInput.ts
  ui/
    gladiatorShowcase.ts
    showcase/
  assets/
    registerModelLoaders.ts
  main.tsx
  styles.css
```

## Практики, які вже закладені

- Phaser renderer живе окремо в `src/game-phaser` і приймає готовий `BattlePlan` з `@gladiators/combat-sim`.
- React shell owns routing for `/arena`, `/animations`, `/login`, `/profile`, `/messages`, and `/settings`.
- `/arena` mounts the Phaser arena slice; legacy showcase remains available through `?view=showcase`.
- `/animations` is the required QA surface for gladiator animation work. When changing animation clips, SVG skeleton/model parts, Phaser fighter states, or adding a new gladiator class, run `npm run dev`, open `http://localhost:5173/animations`, and verify Play/Pause loop playback for every affected card before considering the work done.
- Один власник Babylon lifecycle: `GameClient`.
- Canvas займає весь viewport і враховує mobile safe areas.
- Pointer Events замість окремих mouse/touch handlers.
- Device Pixel Ratio обмежений через `maxDevicePixelRatio`, щоб мобільні GPU не спалювали кадри на зайвій роздільності.
- Render loop ставиться на паузу, коли вкладка прихована.
- Babylon Inspector підключається lazy-import тільки в development.
- `.glb/.gltf` loaders винесені в lazy helper, щоб не роздувати стартовий bundle до появи реальних assets.
- Бойові правила не змішані з DOM/Babylon і приходять з `@gladiators/combat-sim`, тому пізніше легше додати backend authority, state sync або mobile wrapper.

## Mobile напрям

Перший production target краще залишити WebGL/PWA. Коли core gameplay стабілізується, фронтенд можна загорнути в Capacitor для iOS/Android. Для цього вже важливо тримати:

- input через Pointer Events;
- fullscreen canvas без layout shifts;
- resize/lifecycle окремо від gameplay;
- capped DPR;
- assets у web-friendly форматах (`.glb`, `.ktx2`, compressed textures);
- backend API незалежним від браузера, щоб web і mobile client говорили з ним однаково.

## Backend зараз

Battle replay recording і lookup ходять до core backend:

- `POST /battle-replays`
- `GET /battle-replays/:seed`

Frontend base URL налаштовується через `VITE_API_BASE_URL`; локальне стартове значення описане в `.env.example`.

Рекомендований окремий backend stack для майбутньої online-гри:

- Node.js + TypeScript;
- Fastify для HTTP API;
- Colyseus для realtime multiplayer rooms через WebSocket;
- PostgreSQL + Prisma для persistent даних;
- Redis для presence, matchmaking queues, rate limits і pub/sub;
- Docker Compose для локальної розробки.

Готовий prompt для створення backend repo лежить у [`docs/backend-repo-prompt.md`](docs/backend-repo-prompt.md).
