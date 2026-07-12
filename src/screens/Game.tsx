import { useState } from 'react';
import { Board } from '../components/Board';
import { NumberPad } from '../components/NumberPad';
import { Controls } from '../components/Controls';
import { InputModeBar } from '../components/InputModeBar';
import { TopBar } from '../components/TopBar';
import { HintBanner } from '../components/HintBanner';
import { WinOverlay } from '../components/WinOverlay';
import { NewGameSheet } from '../components/NewGameSheet';
import { BanConfirm } from '../components/BanConfirm';
import { useGameTimer } from '../hooks/useGameTimer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRecordGame } from '../hooks/useRecordGame';
import { useGameFeedback } from '../hooks/useGameFeedback';
import { useCompletionFx } from '../hooks/useCompletionFx';
import { useSaveRoster } from '../hooks/useSaveRoster';
import { useStartChallenge } from '../hooks/useStartChallenge';
import { PACK_SIZES } from '../data/challenges';
import { getChallengeProgress } from '../db/progress';
import { generatePuzzleAsync } from '../workers/client';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';

export const Game = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const reset = useUi((s) => s.reset);
  const navigate = useUi((s) => s.navigate);
  const inputMode = useGame((s) => s.inputMode);
  const { startChallenge } = useStartChallenge();
  useGameTimer();
  useKeyboard();
  useRecordGame();
  useGameFeedback();
  useCompletionFx();
  useSaveRoster();

  const goHome = () => reset('home');

  // After a win: continue on the same mode + difficulty. For a challenge, jump
  // to the next unsolved puzzle in its pack; for free play, generate a fresh one.
  const nextPuzzle = async () => {
    const s = useGame.getState();
    setOverlayBusy(true);
    try {
      if (s.challenge) {
        const count = PACK_SIZES[s.difficulty];
        const progress = await getChallengeProgress(s.mode, s.difficulty);
        let next = (s.challenge.index + 1) % count;
        for (let k = 1; k <= count; k++) {
          const i = (s.challenge.index + k) % count;
          if (!progress.get(i)?.solved) {
            next = i;
            break;
          }
        }
        await startChallenge(s.mode, s.difficulty, next);
      } else {
        const puzzle = await generatePuzzleAsync(s.difficulty);
        useGame.getState().startGame(puzzle, s.mode);
      }
    } finally {
      setOverlayBusy(false);
    }
  };

  const retry = () => useGame.getState().restartGame();

  return (
    <div className="app" data-mode={inputMode}>
      <TopBar
        onNewGame={() => setSheetOpen(true)}
        onHome={goHome}
        onSettings={() => navigate('settings')}
      />
      <main className="app__main">
        <Board />
        <HintBanner />
      </main>
      <div className="app__pad">
        <div className="pad-row">
          <InputModeBar />
          <NumberPad />
        </div>
        <Controls />
      </div>
      <NewGameSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <BanConfirm />
      <WinOverlay
        onNext={nextPuzzle}
        onRetry={retry}
        onHome={goHome}
        busy={overlayBusy}
      />
    </div>
  );
};
