import { SANITY_MAX } from '../core/judge';
import { useGame, useIncident } from '../store/game';

export function HUD() {
  const sanity = useGame((s) => s.sanity);
  const incident = useIncident();

  return (
    <header className="hud">
      <span className="time">{incident?.time ?? '06:00'}</span>
      <span>
        정신도 {sanity} / {SANITY_MAX}
      </span>
    </header>
  );
}
