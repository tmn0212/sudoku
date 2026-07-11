import { useState } from 'react';
import { Board } from './components/Board';
import { NumberPad } from './components/NumberPad';
import { Controls } from './components/Controls';
import { TopBar } from './components/TopBar';
import { HintBanner } from './components/HintBanner';
import { WinOverlay } from './components/WinOverlay';
import { NewGameSheet } from './components/NewGameSheet';
import { ReloadPrompt } from './components/ReloadPrompt';
import { useGameTimer } from './hooks/useGameTimer';
import { useKeyboard } from './hooks/useKeyboard';
import './App.css';

function App() {
  const [sheetOpen, setSheetOpen] = useState(false);
  useGameTimer();
  useKeyboard();

  return (
    <div className="app">
      <TopBar onNewGame={() => setSheetOpen(true)} />
      <main className="app__main">
        <Board />
        <HintBanner />
        <NumberPad />
        <Controls />
      </main>
      <NewGameSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <WinOverlay onNewGame={() => setSheetOpen(true)} />
      <ReloadPrompt />
    </div>
  );
}

export default App;
