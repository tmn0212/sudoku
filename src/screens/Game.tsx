import { useState } from 'react';
import { Board } from '../components/Board';
import { NumberPad } from '../components/NumberPad';
import { Controls } from '../components/Controls';
import { InputModeBar } from '../components/InputModeBar';
import { TopBar } from '../components/TopBar';
import { HintBanner } from '../components/HintBanner';
import { WinOverlay } from '../components/WinOverlay';
import { NewGameSheet } from '../components/NewGameSheet';
import { useGameTimer } from '../hooks/useGameTimer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRecordGame } from '../hooks/useRecordGame';
import { useGameFeedback } from '../hooks/useGameFeedback';
import { useUi } from '../state/uiStore';

export const Game = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const reset = useUi((s) => s.reset);
  useGameTimer();
  useKeyboard();
  useRecordGame();
  useGameFeedback();

  const goHome = () => reset('home');

  return (
    <div className="app">
      <TopBar onNewGame={() => setSheetOpen(true)} onHome={goHome} />
      <main className="app__main">
        <Board />
        <HintBanner />
      </main>
      <div className="app__pad">
        <InputModeBar />
        <NumberPad />
        <Controls />
      </div>
      <NewGameSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <WinOverlay onNewGame={goHome} />
    </div>
  );
};
