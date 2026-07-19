import { useEffect } from 'react';
import { music } from '../platform/music';
import { sound } from '../platform/sound';
import { appVisibility } from '../platform/visibility';
import { useSettings } from '../state/settingsStore';

/**
 * Syncs the audio settings into the sound + music adapters, and drives the music
 * lifecycle. Mounted once by App. SFX pack/volume + music track/volume apply live;
 * music plays while enabled + foregrounded, pauses on hide, resumes on show, and
 * retries on the next gesture if autoplay was blocked (browsers need a gesture).
 */
export const useAudio = (): void => {
  const soundStyle = useSettings((s) => s.soundStyle);
  const soundVolume = useSettings((s) => s.soundVolume);
  const musicOn = useSettings((s) => s.music);
  const musicTrack = useSettings((s) => s.musicTrack);
  const musicVolume = useSettings((s) => s.musicVolume);

  useEffect(() => {
    sound.setPack(soundStyle);
  }, [soundStyle]);
  useEffect(() => {
    sound.setVolume(soundVolume);
  }, [soundVolume]);
  useEffect(() => {
    music.setTrack(musicTrack);
  }, [musicTrack]);
  useEffect(() => {
    music.setVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    if (!musicOn) {
      music.pause();
      return;
    }
    const playIfVisible = () => {
      if (!appVisibility.isHidden()) music.play();
    };
    playIfVisible();

    const onGesture = () => playIfVisible();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('pointerdown', onGesture, opts);
    window.addEventListener('keydown', onGesture, opts);

    const offHide = appVisibility.onHide(() => music.pause());
    const offShow = appVisibility.onShow(() => {
      if (useSettings.getState().music) music.play();
    });

    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      offHide();
      offShow();
      music.pause();
    };
  }, [musicOn]);
};
