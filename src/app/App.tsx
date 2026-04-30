import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import { GladiatorAnimationShowcaseMount } from "./GladiatorAnimationShowcaseMount";
import { PhaserArenaMount } from "./PhaserArenaMount";
import {
  appRoutes,
  defaultRoutePath,
  getRouteByPath,
  normalizeRoutePath,
  type AppRoutePath,
} from "./routes";
import "./app.css";

interface BrowserRouteState {
  readonly path: AppRoutePath;
  readonly search: string;
}

interface ToggleSetting {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
}

function getBrowserRouteState(): BrowserRouteState {
  return {
    path: normalizeRoutePath(window.location.pathname),
    search: window.location.search,
  };
}

function isPlainNavigationClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export function App() {
  const [routeState, setRouteState] = useState(getBrowserRouteState);

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(
        {},
        "",
        `${defaultRoutePath}${window.location.search}${window.location.hash}`,
      );
      setRouteState(getBrowserRouteState());
    }

    const onPopState = (): void => setRouteState(getBrowserRouteState());

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const navigateTo = useCallback((path: AppRoutePath): void => {
    window.history.pushState({}, "", path);
    setRouteState(getBrowserRouteState());
  }, []);

  const activeRoute = getRouteByPath(routeState.path);
  const routeClassName = `platform-shell platform-shell--${activeRoute.id}`;
  const mainClassName = `platform-main${
    routeState.path === "/arena" ? " platform-main--arena" : ""
  }`;

  const onNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    path: AppRoutePath,
  ): void => {
    if (!isPlainNavigationClick(event)) {
      return;
    }

    event.preventDefault();
    navigateTo(path);
  };

  return (
    <div className={routeClassName}>
      <header className="platform-topbar">
        <a
          href={defaultRoutePath}
          className="platform-brand"
          onClick={(event) => onNavClick(event, defaultRoutePath)}
        >
          <span className="platform-brand__mark" aria-hidden="true">
            GO
          </span>
          <span className="platform-brand__name">Gladiators Online</span>
        </a>

        <nav className="platform-nav" aria-label="Primary">
          {appRoutes.map((route) => (
            <a
              key={route.path}
              href={route.path}
              className="platform-nav__link"
              aria-current={route.path === routeState.path ? "page" : undefined}
              onClick={(event) => onNavClick(event, route.path)}
            >
              {route.label}
            </a>
          ))}
        </nav>

        <div className="platform-session" aria-label="Current session">
          <span className="platform-session__dot" aria-hidden="true" />
          Guest
        </div>
      </header>

      <main className={mainClassName} aria-labelledby={`${activeRoute.id}-title`}>
        {renderRoute(routeState.path)}
      </main>
    </div>
  );
}

function renderRoute(path: AppRoutePath) {
  switch (path) {
    case "/arena":
      return <ArenaPage />;
    case "/animations":
      return <AnimationsPage />;
    case "/login":
      return <LoginPage />;
    case "/profile":
      return <ProfilePage />;
    case "/messages":
      return <MessagesPage />;
    case "/settings":
      return <SettingsPage />;
  }
}

function ArenaPage() {
  return (
    <section className="arena-route" aria-labelledby="arena-title">
      <h1 id="arena-title" className="sr-only">
        Arena
      </h1>
      <PhaserArenaMount />
    </section>
  );
}

function AnimationsPage() {
  return (
    <section className="animation-showcase-route" aria-labelledby="animations-title">
      <PageHeader eyebrow="Phaser" title="Animation Showcase" titleId="animations-title" />
      <GladiatorAnimationShowcaseMount />
    </section>
  );
}

function LoginPage() {
  return (
    <section className="platform-page" aria-labelledby="login-title">
      <PageHeader eyebrow="Account" title="Login" titleId="login-title" />

      <div className="auth-layout">
        <form
          className="auth-panel"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="field">
            <span className="field__label">Handle</span>
            <input className="field__input" defaultValue="Guest Lanista" />
          </label>

          <button className="command-button" type="submit" disabled>
            Continue
          </button>
        </form>

        <dl className="status-list">
          <div>
            <dt>Session</dt>
            <dd>Guest</dd>
          </div>
          <div>
            <dt>Realm</dt>
            <dd>Local arena</dd>
          </div>
          <div>
            <dt>OAuth</dt>
            <dd>Offline</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function ProfilePage() {
  return (
    <section className="platform-page" aria-labelledby="profile-title">
      <PageHeader eyebrow="Profile" title="Guest Lanista" titleId="profile-title" />

      <div className="profile-layout">
        <div className="profile-summary">
          <div className="profile-summary__avatar" aria-hidden="true">
            GL
          </div>
          <div>
            <p className="profile-summary__rank">Iron league</p>
            <p className="profile-summary__record">12 wins / 8 losses</p>
          </div>
        </div>

        <dl className="metric-grid">
          <div>
            <dt>Roster</dt>
            <dd>3</dd>
          </div>
          <div>
            <dt>Stamina</dt>
            <dd>84%</dd>
          </div>
          <div>
            <dt>Last seed</dt>
            <dd>stage-5-phaser-slice</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function MessagesPage() {
  return (
    <section className="platform-page" aria-labelledby="messages-title">
      <PageHeader eyebrow="Inbox" title="Messages" titleId="messages-title" />

      <div className="messages-layout">
        <article className="message-row">
          <span className="message-row__sender">Arena Marshal</span>
          <span className="message-row__subject">Training match recorded</span>
          <time className="message-row__time" dateTime="2026-04-29">
            Today
          </time>
        </article>

        <article className="message-row">
          <span className="message-row__sender">Quartermaster</span>
          <span className="message-row__subject">Roster upkeep complete</span>
          <time className="message-row__time" dateTime="2026-04-29">
            Today
          </time>
        </article>
      </div>
    </section>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState<readonly ToggleSetting[]>([
    { id: "audio", label: "Arena audio", enabled: false },
    { id: "motion", label: "Reduced motion", enabled: false },
    { id: "hud", label: "Compact HUD", enabled: true },
  ]);

  const toggleSetting = (id: string): void => {
    setSettings((currentSettings) =>
      currentSettings.map((setting) =>
        setting.id === id
          ? { ...setting, enabled: !setting.enabled }
          : setting,
      ),
    );
  };

  return (
    <section className="platform-page" aria-labelledby="settings-title">
      <PageHeader eyebrow="Preferences" title="Settings" titleId="settings-title" />

      <div className="settings-list">
        {settings.map((setting) => (
          <label className="setting-row" key={setting.id}>
            <span>{setting.label}</span>
            <input
              type="checkbox"
              checked={setting.enabled}
              onChange={() => toggleSetting(setting.id)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function PageHeader({
  eyebrow,
  title,
  titleId,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly titleId: string;
}) {
  return (
    <div className="page-header">
      <p>{eyebrow}</p>
      <h1 id={titleId}>{title}</h1>
    </div>
  );
}
