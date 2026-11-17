import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { TICK_MS } from './core/clock';
import { SANITY_MAX } from './core/judge';
import { StoreMap } from './scene/StoreMap';
import { ZoneView } from './scene/ZoneView';
import { useGame } from './store/game';
import { Dialogue } from './ui/Dialogue';
import { HUD } from './ui/HUD';
import { Lobby } from './ui/Lobby';
import { CctvModal, ManualModal, NotebookModal, PosModal } from './ui/Modals';
import { Result } from './ui/Result';
import { TaskPanel } from './ui/TaskPanel';

export function App() {
  const phase = useGame((s) => s.phase);
  const tick = useGame((s) => s.tick);
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const sanity = useGame((s) => s.sanity);
  const flash = useGame((s) => s.flash);

  useEffect(() => {
    if (phase !== 'shift') return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [phase, tick]);

  useEffect(() => {
    if (phase !== 'shift') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
      else if (e.key === 'n' || e.key === 'N') setModal(modal === 'notebook' ? null : 'notebook');
      else if (e.key === 'm' || e.key === 'M') setModal(modal === 'manual' ? null : 'manual');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, modal, setModal]);

  if (phase === 'lobby') return <Lobby />;
  if (phase === 'result') return <Result />;

  // 정신도가 낮을수록 화면 주변부만 어두워지고 색이 빠진다. 중앙과 글은 그대로 둔다(디자인 컨셉안 3절).
  const unrest = 1 - sanity / SANITY_MAX;

  return (
    <div className={`game${sanity < 50 ? ' unstable' : ''}`} style={{ '--unrest': unrest } as CSSProperties}>
      <ZoneView />
      <div className="fx-edge" />
      {flash > 0 && <div key={flash} className="fx-red" />}
      <HUD />
      <TaskPanel />
      <StoreMap />
      <Dialogue />
      {modal === 'manual' && <ManualModal />}
      {modal === 'notebook' && <NotebookModal />}
      {modal === 'cctv' && <CctvModal />}
      {modal === 'pos' && <PosModal />}
    </div>
  );
}
