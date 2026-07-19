import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { THEME_PRESETS, THEMES, FONTS, type ThemePreset } from '@sudoku/ui-tokens';
import { useSettings } from '../state/settingsStore';
import { sound } from '../platform/sound';
import './ThemePresetPicker.css';

// Music files for the in-settings preview player (independent of the app's music
// adapter so auditioning never disturbs the real background-music state).
const MUSIC = import.meta.glob('../assets/audio/music/*.ogg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const musicUrl = (id: string) =>
  MUSIC[Object.keys(MUSIC).find((k) => k.endsWith(`/${id}.ogg`)) ?? ''];

const isLight = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
};

/**
 * One-tap theme presets: tapping a card applies the whole bundle (colours + font +
 * animation + SFX + music) via `applyPreset` and previews its SFX. Each card is
 * rendered in its own theme colours + font. The ♪ button auditions the preset's
 * music track through a local preview element. The active preset (current settings
 * matching a preset exactly) is highlighted.
 */
export const ThemePresetPicker = () => {
  const theme = useSettings((s) => s.theme);
  const font = useSettings((s) => s.font);
  const animStyle = useSettings((s) => s.animStyle);
  const soundStyle = useSettings((s) => s.soundStyle);
  const musicTrack = useSettings((s) => s.musicTrack);
  const applyPreset = useSettings((s) => s.applyPreset);

  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => previewRef.current?.pause(), []); // stop audition on unmount

  const activeId = THEME_PRESETS.find(
    (p) => p.theme === theme && p.font === font && p.anim === animStyle && p.sfx === soundStyle && p.music === musicTrack,
  )?.id;

  const apply = (p: ThemePreset) => {
    applyPreset({ theme: p.theme, font: p.font, anim: p.anim, sfx: p.sfx, music: p.music });
    sound.setPack(p.sfx);
    sound.preview(); // hear the SFX pack immediately (this tap is the gesture)
  };

  const auditionMusic = (id: string) => {
    if (!previewRef.current) {
      previewRef.current = new Audio();
      previewRef.current.loop = true;
      previewRef.current.volume = 0.5;
    }
    const a = previewRef.current;
    if (playing === id) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = musicUrl(id);
    a.currentTime = 0;
    void a.play().catch(() => {});
    setPlaying(id);
  };

  return (
    <div className="preset-grid">
      {THEME_PRESETS.map((p) => {
        const swatch = THEMES.find((t) => t.id === p.theme)?.swatch ?? ['#eee', '#333'];
        const stack = FONTS.find((f) => f.id === p.font)?.stack ?? 'sans-serif';
        const text = isLight(swatch[0]) ? '#1a1d29' : '#f3f5fb';
        const muted = isLight(swatch[0]) ? 'rgba(20,25,45,.6)' : 'rgba(240,244,255,.65)';
        const vars = {
          '--pbg': swatch[0],
          '--pacc': swatch[1],
          '--ptext': text,
          '--pmuted': muted,
          '--pfont': stack,
        } as CSSProperties;
        return (
          <div
            key={p.id}
            className={`preset-card ${activeId === p.id ? 'preset-card--active' : ''}`}
            style={vars}
          >
            <button className="preset-card__body" onClick={() => apply(p)} data-no-click-sound>
              <span className="preset-card__head">
                <span className="preset-card__name">{p.name}</span>
                {activeId === p.id && <span className="preset-card__badge">Active</span>}
              </span>
              <span className="preset-card__sample">
                5 <b>3</b> 7 <em>Aa</em>
              </span>
              <span className="preset-card__meta">
                {p.font[0].toUpperCase() + p.font.slice(1)} · {p.sfx} · {p.music}
              </span>
            </button>
            <button
              className={`preset-card__music ${playing === p.id ? 'preset-card__music--on' : ''}`}
              onClick={() => auditionMusic(p.music)}
              aria-label={`Preview ${p.name} music`}
              data-no-click-sound
            >
              {playing === p.id ? '❚❚' : '♪'}
            </button>
          </div>
        );
      })}
    </div>
  );
};
