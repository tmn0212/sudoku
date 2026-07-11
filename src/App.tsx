import { useEffect, type ComponentType } from 'react';
import { useUi, type Screen } from './state/uiStore';
import { Home } from './screens/Home';
import { Game } from './screens/Game';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { Learn } from './screens/Learn';
import { ReloadPrompt } from './components/ReloadPrompt';
import { requestPersistentStorage } from './db/idb';
import './App.css';

const SCREENS: Record<Screen, ComponentType> = {
  home: Home,
  game: Game,
  settings: Settings,
  stats: Stats,
  learn: Learn,
  // Filled in by later phases; fall back to their parent screens for now.
  lesson: Learn,
  challenges: Home,
};

function App() {
  const screen = useUi((s) => s.screen);

  useEffect(() => {
    // Best-effort: keep the user's records from being evicted.
    requestPersistentStorage();
  }, []);

  const Screen = SCREENS[screen] ?? Home;

  return (
    <>
      <Screen />
      <ReloadPrompt />
    </>
  );
}

export default App;
