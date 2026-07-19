import { SFX_STYLES, MUSIC_TRACKS } from '@sudoku/ui-tokens';
import { useSettings } from '../state/settingsStore';
import { sound } from '../platform/sound';
import { music } from '../platform/music';
import { Slider } from './Slider';
import './AudioSettings.css';

/**
 * The audio suite in Settings: on/off toggles, a style picker + volume slider for
 * both sound effects and background music. Picking a style previews it live
 * (SFX play a sample cue; music swaps the track), and the volume applies live —
 * the choices persist via the settings store, and useAudio keeps the adapters in
 * sync. (The imported `sound`/`music` here are the platform adapters, so the
 * settings booleans are read as `sfxOn`/`musicOn` to avoid the name clash.)
 */

interface ToggleProps {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}
const Toggle = ({ label, desc, checked, onChange }: ToggleProps) => (
  <button className="setting-row" role="switch" aria-checked={checked} onClick={onChange}>
    <span className="setting-row__text">
      <span className="setting-row__label">{label}</span>
      <span className="setting-row__desc">{desc}</span>
    </span>
    <span className={`switch ${checked ? 'switch--on' : ''}`} aria-hidden="true">
      <span className="switch__knob" />
    </span>
  </button>
);

export const AudioSettings = () => {
  const sfxOn = useSettings((s) => s.sound);
  const soundStyle = useSettings((s) => s.soundStyle);
  const soundVolume = useSettings((s) => s.soundVolume);
  const musicOn = useSettings((s) => s.music);
  const musicTrack = useSettings((s) => s.musicTrack);
  const musicVolume = useSettings((s) => s.musicVolume);
  const toggle = useSettings((s) => s.toggle);
  const setSoundStyle = useSettings((s) => s.setSoundStyle);
  const setSoundVolume = useSettings((s) => s.setSoundVolume);
  const setMusicTrack = useSettings((s) => s.setMusicTrack);
  const setMusicVolume = useSettings((s) => s.setMusicVolume);

  const pickSfx = (id: (typeof SFX_STYLES)[number]['id']) => {
    setSoundStyle(id);
    sound.setPack(id);
    sound.preview(); // hear the pack immediately (this click is the gesture)
  };
  const pickMusic = (id: (typeof MUSIC_TRACKS)[number]['id']) => {
    setMusicTrack(id);
    music.setTrack(id); // swaps live if music is playing
    if (musicOn) music.play(); // this tap is a gesture — (re)start if enabled
  };
  const toggleMusic = () => {
    const turningOn = !musicOn;
    toggle('music');
    // Start/stop straight from the click so it counts as the user gesture
    // browsers require (a useEffect fires too late for iOS autoplay rules).
    if (turningOn) music.play();
    else music.pause();
  };

  const sfxBlurb = SFX_STYLES.find((s) => s.id === soundStyle)?.blurb;
  const musicBlurb = MUSIC_TRACKS.find((t) => t.id === musicTrack)?.blurb;

  return (
    <>
      <Toggle
        label="Sound effects"
        desc="Play tones when you place digits, complete units, win, or slip up"
        checked={sfxOn}
        onChange={() => toggle('sound')}
      />
      {sfxOn && (
        <div className="audio-controls">
          <div className="chip-row" role="group" aria-label="Sound effect style">
            {SFX_STYLES.map((o) => (
              <button
                key={o.id}
                className={`chip ${soundStyle === o.id ? 'chip--active' : ''}`}
                onClick={() => pickSfx(o.id)}
                aria-pressed={soundStyle === o.id}
                data-no-click-sound
              >
                {o.label}
              </button>
            ))}
          </div>
          {sfxBlurb && <p className="audio-controls__blurb">{sfxBlurb}</p>}
          <Slider
            label="SFX volume"
            value={soundVolume}
            onChange={(v) => {
              setSoundVolume(v);
              sound.setVolume(v);
            }}
            onRelease={() => sound.place()}
          />
        </div>
      )}

      <Toggle
        label="Background music"
        desc="Loop a soundtrack while you play"
        checked={musicOn}
        onChange={toggleMusic}
      />
      {musicOn && (
        <div className="audio-controls">
          <div className="chip-row" role="group" aria-label="Music style">
            {MUSIC_TRACKS.map((o) => (
              <button
                key={o.id}
                className={`chip ${musicTrack === o.id ? 'chip--active' : ''}`}
                onClick={() => pickMusic(o.id)}
                aria-pressed={musicTrack === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
          {musicBlurb && <p className="audio-controls__blurb">{musicBlurb}</p>}
          <Slider
            label="Music volume"
            value={musicVolume}
            onChange={(v) => {
              setMusicVolume(v);
              music.setVolume(v);
            }}
          />
        </div>
      )}
    </>
  );
};
