import {
  DEFAULT_RESTORED_BATTLE_VOLUME,
  clampMasterVolume,
  type BattleAudioController,
} from "./audio";

export interface BattleVolumeControlContext {
  battleAudio: BattleAudioController;
  volumeSliders: readonly HTMLInputElement[];
  volumeToggles: readonly HTMLButtonElement[];
}

export interface BattleVolumeControls {
  onVolumeSliderInput: (event: Event) => void;
  onVolumeToggleClick: () => void;
  syncVolumeControl: () => void;
}

export function createBattleVolumeControls({
  battleAudio,
  volumeSliders,
  volumeToggles,
}: BattleVolumeControlContext): BattleVolumeControls {
  let lastAudibleVolume =
    battleAudio.getMasterVolume() > 0
      ? battleAudio.getMasterVolume()
      : DEFAULT_RESTORED_BATTLE_VOLUME;

  function syncVolumeControl(): void {
    const volume = battleAudio.getMasterVolume();
    const isMuted = battleAudio.isMuted() || volume <= 0;
    const label = isMuted ? "Увімкнути звук" : "Вимкнути звук";

    for (const slider of volumeSliders) {
      slider.value = String(Math.round(volume * 100));
    }

    for (const toggle of volumeToggles) {
      toggle.classList.toggle("is-muted", isMuted);
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("aria-pressed", isMuted ? "true" : "false");
      toggle.title = label;
    }
  }

  const onVolumeSliderInput = (event: Event): void => {
    if (!(event.currentTarget instanceof HTMLInputElement)) {
      return;
    }

    const sliderValue = Number(event.currentTarget.value);
    const nextVolume = clampMasterVolume(
      Number.isFinite(sliderValue) ? sliderValue / 100 : 0,
    );

    battleAudio.setMasterVolume(nextVolume);

    if (nextVolume > 0) {
      lastAudibleVolume = nextVolume;
      battleAudio.setMuted(false);
    } else {
      battleAudio.setMuted(true);
    }

    syncVolumeControl();
  };

  const onVolumeToggleClick = (): void => {
    const shouldMute = !battleAudio.isMuted() && battleAudio.getMasterVolume() > 0;

    if (shouldMute) {
      battleAudio.setMuted(true);
    } else {
      const restoredVolume =
        battleAudio.getMasterVolume() > 0
          ? battleAudio.getMasterVolume()
          : lastAudibleVolume;
      battleAudio.setMasterVolume(restoredVolume);
      battleAudio.setMuted(false);
    }

    syncVolumeControl();
  };

  return {
    onVolumeSliderInput,
    onVolumeToggleClick,
    syncVolumeControl,
  };
}
