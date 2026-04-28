import applaudingHighUrl from "../../assets/sounds/Applauding high.mp3?url";
import applaudingLowUrl from "../../assets/sounds/Applauding low.mp3?url";
import applaudingMediumUrl from "../../assets/sounds/Applauding medium.mp3?url";
import bloodUrl from "../../assets/sounds/character/blood.mp3?url";
import bloodTwoUrl from "../../assets/sounds/character/blood two.mp3?url";
import murmilonBlockUrl from "../../assets/sounds/character/murmilon block.mp3?url";
import murmilonHitUrl from "../../assets/sounds/character/murmilon hit.mp3?url";
import retiariusBlockUrl from "../../assets/sounds/character/retiarius block.mp3?url";
import retiariusHitUrl from "../../assets/sounds/character/retiarius hit.mp3?url";
import coliseumUrl from "../../assets/sounds/coliseum.mp3?url";

export const BATTLE_VOLUME_STORAGE_KEY = "gladiators.masterVolume";
export const DEFAULT_BATTLE_VOLUME = 1;
export const DEFAULT_RESTORED_BATTLE_VOLUME = 0.72;
export const SAVE_BATTLE_SETUP_LABEL = "Зберегти налаштування на наступний бій";

export type CrowdApplauseLevel = "low" | "medium" | "high";

export interface BattleAudioController {
  startBattle: () => void;
  playAttack: (attackCssClass: string) => void;
  playApplause: (level: CrowdApplauseLevel) => Promise<void>;
  playBlock: (fighterId: string) => void;
  playBlood: () => void;
  playFinaleAndStop: () => void;
  setMasterVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  getMasterVolume: () => number;
  isMuted: () => boolean;
  stopAll: () => void;
}

export const applauseSoundUrls: Record<CrowdApplauseLevel, string> = {
  low: applaudingLowUrl,
  medium: applaudingMediumUrl,
  high: applaudingHighUrl,
};

export const applauseVolumes: Record<CrowdApplauseLevel, number> = {
  low: 0.58,
  medium: 0.7,
  high: 0.84,
};

export const attackSoundUrls: Record<string, string> = {
  "attack-sword-slash": murmilonHitUrl,
  "attack-shield-bash": retiariusHitUrl,
  "attack-trident-thrust": retiariusHitUrl,
  "attack-net-throw": retiariusHitUrl,
  "attack-javelin-throw": retiariusHitUrl,
  "attack-veles-sword": retiariusHitUrl,
};

export const blockSoundUrls: Record<string, string> = {
  murmillo: murmilonBlockUrl,
  retiarius: retiariusBlockUrl,
  veles: retiariusBlockUrl,
};

export const bloodSoundUrls = [bloodUrl, bloodTwoUrl] as const;
export function clampMasterVolume(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function getStoredBattleVolume(): number {
  try {
    const storedVolume = window.localStorage.getItem(BATTLE_VOLUME_STORAGE_KEY);
    if (!storedVolume) {
      return DEFAULT_BATTLE_VOLUME;
    }

    const parsedVolume = Number.parseFloat(storedVolume);
    return Number.isFinite(parsedVolume)
      ? clampMasterVolume(parsedVolume)
      : DEFAULT_BATTLE_VOLUME;
  } catch {
    return DEFAULT_BATTLE_VOLUME;
  }
}

export function storeBattleVolume(volume: number): void {
  try {
    window.localStorage.setItem(BATTLE_VOLUME_STORAGE_KEY, String(clampMasterVolume(volume)));
  } catch {
    // localStorage can be unavailable in private or embedded browsing contexts.
  }
}
export function createBattleAudioController(): BattleAudioController {
  const activeSounds = new Set<HTMLAudioElement>();
  const soundBaseVolumes = new WeakMap<HTMLAudioElement, number>();
  let ambientSound: HTMLAudioElement | null = null;
  let masterVolume = getStoredBattleVolume();
  let muted = masterVolume <= 0;

  const cleanupSound = (sound: HTMLAudioElement): void => {
    activeSounds.delete(sound);
  };

  const applyEffectiveVolume = (sound: HTMLAudioElement): void => {
    const baseVolume = soundBaseVolumes.get(sound) ?? sound.volume;
    sound.muted = muted || masterVolume <= 0;
    sound.volume = clampMasterVolume(baseVolume * masterVolume);
  };

  const registerBaseVolume = (sound: HTMLAudioElement, baseVolume: number): void => {
    soundBaseVolumes.set(sound, clampMasterVolume(baseVolume));
    applyEffectiveVolume(sound);
  };

  const refreshActiveVolumes = (): void => {
    for (const sound of activeSounds) {
      applyEffectiveVolume(sound);
    }
  };

  const trackSound = (sound: HTMLAudioElement): void => {
    activeSounds.add(sound);
    sound.addEventListener("ended", () => cleanupSound(sound), { once: true });
    sound.addEventListener("error", () => cleanupSound(sound), { once: true });
  };

  const safeResetTime = (sound: HTMLAudioElement): void => {
    try {
      sound.currentTime = 0;
    } catch {
      // Some browsers throw while metadata is still loading.
    }
  };

  const stopAll = (): void => {
    for (const sound of activeSounds) {
      sound.pause();
      safeResetTime(sound);
    }

    activeSounds.clear();
    ambientSound = null;
  };

  const playOneShot = (url: string, volume: number): void => {
    const sound = new Audio(url);
    registerBaseVolume(sound, volume);
    sound.preload = "auto";
    trackSound(sound);

    void sound.play().catch(() => {
      cleanupSound(sound);
    });
  };

  const startBattle = (): void => {
    stopAll();

    const sound = new Audio(coliseumUrl);
    sound.loop = true;
    registerBaseVolume(sound, 0.42);
    sound.preload = "auto";
    ambientSound = sound;
    trackSound(sound);

    void sound.play().catch(() => {
      if (ambientSound === sound) {
        ambientSound = null;
      }
      cleanupSound(sound);
    });
  };

  const playAttack = (attackCssClass: string): void => {
    const url = attackSoundUrls[attackCssClass];
    if (!url) {
      return;
    }

    playOneShot(url, attackCssClass === "attack-net-throw" ? 0.78 : 0.84);
  };

  const playApplause = (level: CrowdApplauseLevel): Promise<void> => {
    const sound = new Audio(applauseSoundUrls[level]);
    registerBaseVolume(sound, applauseVolumes[level]);
    sound.preload = "auto";
    trackSound(sound);

    return new Promise((resolve) => {
      const finish = (): void => {
        cleanupSound(sound);
        resolve();
      };

      sound.addEventListener("ended", finish, { once: true });
      sound.addEventListener("error", finish, { once: true });

      void sound.play().catch(() => {
        finish();
      });
    });
  };

  const playBlock = (classId: string): void => {
    const url = blockSoundUrls[classId];
    if (!url) {
      return;
    }

    playOneShot(url, 0.88);
  };

  const playBlood = (): void => {
    const soundIndex = Math.floor(Math.random() * bloodSoundUrls.length);
    playOneShot(bloodSoundUrls[soundIndex] ?? bloodUrl, 0.82);
  };

  const playFinaleAndStop = (): void => {
    void playApplause("high").finally(() => stopAll());
  };

  const setMasterVolume = (volume: number): void => {
    masterVolume = clampMasterVolume(volume);
    storeBattleVolume(masterVolume);
    refreshActiveVolumes();
  };

  const setMuted = (nextMuted: boolean): void => {
    muted = nextMuted;
    refreshActiveVolumes();
  };

  const getMasterVolume = (): number => masterVolume;

  const isMuted = (): boolean => muted;

  return {
    startBattle,
    playAttack,
    playApplause,
    playBlock,
    playBlood,
    playFinaleAndStop,
    setMasterVolume,
    setMuted,
    getMasterVolume,
    isMuted,
    stopAll,
  };
}
