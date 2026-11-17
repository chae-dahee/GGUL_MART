import type { ClueType } from '../core/types';
import { useIncident } from '../store/game';

const typeLabel: Record<ClueType, string> = {
  cctv: 'CCTV',
  record: '업무 기록',
  dialogue: '대화',
};

export function DocPanel() {
  const incident = useIncident();

  return (
    <aside className="panel docs">
      <h2>자료</h2>
      {incident?.clues.map((c, i) => (
        <div key={i} className={`doc doc-${c.type}`}>
          <small>{typeLabel[c.type]}</small>
          <p>{c.text}</p>
        </div>
      ))}
    </aside>
  );
}
