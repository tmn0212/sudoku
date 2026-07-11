import { useEffect, lazy, Suspense, type ComponentType } from 'react';
import { useUi, type Screen } from './state/uiStore';
import { Home } from './screens/Home';
import { Game } from './screens/Game';
import { ReloadPrompt } from './components/ReloadPrompt';
import { requestPersistentStorage } from './db/idb';
import './App.css';

// Core screens load eagerly; everything else is a separate lazy chunk so the
// initial bundle stays lean (challenge packs and lesson data ride along).
const Settings = lazy(() =>
  import('./screens/Settings').then((m) => ({ default: m.Settings })),
);
const Stats = lazy(() =>
  import('./screens/Stats').then((m) => ({ default: m.Stats })),
);
const Learn = lazy(() =>
  import('./screens/Learn').then((m) => ({ default: m.Learn })),
);
const LessonDetail = lazy(() =>
  import('./screens/LessonDetail').then((m) => ({ default: m.LessonDetail })),
);
const Challenges = lazy(() =>
  import('./screens/Challenges').then((m) => ({ default: m.Challenges })),
);

const SCREENS: Record<Screen, ComponentType> = {
  home: Home,
  game: Game,
  settings: Settings,
  stats: Stats,
  learn: Learn,
  lesson: LessonDetail,
  challenges: Challenges,
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
      <Suspense
        fallback={
          <div className="screen-loading" role="status">
            <div className="spinner" aria-hidden="true" />
          </div>
        }
      >
        <Screen />
      </Suspense>
      <ReloadPrompt />
    </>
  );
}

export default App;
