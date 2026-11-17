import { zones } from '../content/zones';
import { formatClock, SHIFT_LENGTH } from '../core/clock';
import { SANITY_MAX } from '../core/judge';
import { useGame } from '../store/game';

const SANITY_CELLS = 10;

export function HUD() {
  const sanity = useGame((s) => s.sanity);
  const zone = useGame((s) => s.zone);
  const clock = useGame((s) => s.clock);
  const left = SHIFT_LENGTH - clock;
  const filled = Math.round((sanity / SANITY_MAX) * SANITY_CELLS);

  const setModal = useGame((s) => s.setModal);
  const index = zones.findIndex((z) => z.id === zone);

  return (
    <header className="hud">
      <span className="clock">{formatClock(clock)}</span>
      <span className="cam">
        CAM {String(index + 1).padStart(2, '0')} · <b className="zone">{zones[index].label}</b>
      </span>
      <span>
        남은 근무 {Math.floor(left / 60)}시간 {left % 60}분
      </span>
      <button onClick={() => setModal('notebook')}>
        수첩 <kbd>N</kbd>
      </button>
      <button onClick={() => setModal('manual')}>
        매뉴얼 <kbd>M</kbd>
      </button>
      <div className="sanity">
        <span>정신도</span>
        <div className="bar" aria-hidden>
          {Array.from({ length: SANITY_CELLS }, (_, i) => (
            <i key={i} className={i < filled ? '' : 'off'} />
          ))}
        </div>
        <span>
          {sanity} / {SANITY_MAX}
        </span>
      </div>
    </header>
  );
}
