import { StoreMap } from './scene/StoreMap';
import { ZoneView } from './scene/ZoneView';
import { useGame } from './store/game';
import { DocPanel } from './ui/DocPanel';
import { Dialogue } from './ui/Dialogue';
import { HUD } from './ui/HUD';
import { RulePanel } from './ui/RulePanel';

export function App() {
  const wrongReaction = useGame((s) => s.wrongReaction);

  return (
    <div className="app">
      <HUD />
      <RulePanel />
      <main className="scene">
        <ZoneView />
        <StoreMap />
        {wrongReaction && <p className="wrong">{wrongReaction}</p>}
      </main>
      <DocPanel />
      <Dialogue />
    </div>
  );
}
