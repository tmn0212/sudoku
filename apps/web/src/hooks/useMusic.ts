import { useEffect } from 'react';
import { music } from '../platform/music';
import { appVisibility } from '../platform/visibility';
import { useSettings } from '../state/settingsStore';

/**
 * Drives the looping background music from the `music` setting. Mounted once by
 * App. Plays while enabled + foregrounded; pauses when the app is hidden and
 * resumes when it returns. Browsers block audio until a user gesture, so if the
 * initial play() is refused we retry on the next pointer/key event.
 */
export const useMusic = (): void => {
  const musicOn = useSettings((s) => s.music);

  useEffect(() => {
    if (!musicOn) {
      music.pause();
      return;
    }

    const playIfVisible = () => {
      if (!appVisibility.isHidden()) music.play();
    };
    playIfVisible(); // works immediately if a gesture already happened

    // If autoplay was blocked (no gesture yet), start on the next one.
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
