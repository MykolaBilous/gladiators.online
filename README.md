# Gladiators Online

Чиста фронтенд-основа для WebGL-гри на Babylon.js. Тут немає рівнів, персонажів чи ігрової логіки: тільки Vite, TypeScript, Babylon engine, boot scene, lifecycle, resize, pause/resume і базова input-обгортка під web/mobile.

## Обраний стек

- **Vite + TypeScript** для швидкого dev server, production build і простого static deploy.
- **Babylon.js через `@babylonjs/core`** замість legacy `babylonjs`, щоб імпортувати тільки потрібні модулі.
- **`@babylonjs/loaders`** під майбутні `.glb/.gltf` assets.
- **`@babylonjs/inspector`** тільки для dev-режиму. Натисни `` ` `` під час `npm run dev`, щоб відкрити Inspector.
- **Vanilla DOM/CSS** замість React/Vue на старті, бо головний UI зараз це canvas. Якщо пізніше з'явиться складний lobby/inventory/shop, UI-фреймворк можна додати окремим шаром.

## Команди

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Структура

```text
src/
  config/
    gameConfig.ts
  game/
    GameClient.ts
    createBootScene.ts
    installBabylonInspectorShortcut.ts
  input/
    GameInput.ts
  assets/
    registerModelLoaders.ts
  main.ts
  styles.css
```

## Практики, які вже закладені

- Один власник Babylon lifecycle: `GameClient`.
- Canvas займає весь viewport і враховує mobile safe areas.
- Pointer Events замість окремих mouse/touch handlers.
- Device Pixel Ratio обмежений через `maxDevicePixelRatio`, щоб мобільні GPU не спалювали кадри на зайвій роздільності.
- Render loop ставиться на паузу, коли вкладка прихована.
- Babylon Inspector підключається lazy-import тільки в development.
- `.glb/.gltf` loaders винесені в lazy helper, щоб не роздувати стартовий bundle до появи реальних assets.
- Ігрова логіка ще не змішана з DOM, тому пізніше легше додати ECS, state sync або mobile wrapper.

## Mobile напрям

Перший production target краще залишити WebGL/PWA. Коли core gameplay стабілізується, фронтенд можна загорнути в Capacitor для iOS/Android. Для цього вже важливо тримати:

- input через Pointer Events;
- fullscreen canvas без layout shifts;
- resize/lifecycle окремо від gameplay;
- capped DPR;
- assets у web-friendly форматах (`.glb`, `.ktx2`, compressed textures);
- backend API незалежним від браузера, щоб web і mobile client говорили з ним однаково.

## Backend зараз

Для цієї чистої frontend-бази backend не потрібен. Він знадобиться, коли будуть акаунти, matchmaking, multiplayer, persistent inventory/progression або server-authoritative combat.

Рекомендований окремий backend stack для майбутньої online-гри:

- Node.js + TypeScript;
- Fastify для HTTP API;
- Colyseus для realtime multiplayer rooms через WebSocket;
- PostgreSQL + Prisma для persistent даних;
- Redis для presence, matchmaking queues, rate limits і pub/sub;
- Docker Compose для локальної розробки.

Готовий prompt для створення backend repo лежить у [`docs/backend-repo-prompt.md`](docs/backend-repo-prompt.md).
