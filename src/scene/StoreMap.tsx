import { zones } from '../content/zones';
import { activeEncounter, useGame } from '../store/game';

export function StoreMap() {
  const s = useGame();
  // 손님이 카운터에서 기다리면 지도에 표시한다.
  const waiting = !!activeEncounter(s) && s.zone !== 'counter';

  return (
    <svg className="store-map" viewBox="0 0 100 100" role="group" aria-label="매장 지도">
      {zones.map(({ id, label, map }) => (
        <g key={id} onClick={() => s.setZone(id)} className={id === s.zone ? 'selected' : ''}>
          <rect x={map.x} y={map.y} width={map.w} height={map.h} />
          <text x={map.x + map.w / 2} y={map.y + map.h / 2}>
            {label}
          </text>
          {id === 'counter' && waiting && <circle className="waiting" cx={map.x + map.w - 4} cy={map.y + 4} r={2.5} />}
        </g>
      ))}
    </svg>
  );
}
