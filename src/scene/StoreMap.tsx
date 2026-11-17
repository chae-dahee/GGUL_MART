import { zones } from '../content/zones';
import { useGame } from '../store/game';

export function StoreMap() {
  const current = useGame((s) => s.zone);
  const setZone = useGame((s) => s.setZone);

  return (
    <svg className="store-map" viewBox="0 0 100 100" role="group" aria-label="매장 지도">
      {zones.map(({ id, label, map }) => (
        <g key={id} onClick={() => setZone(id)} className={id === current ? 'selected' : ''}>
          <rect x={map.x} y={map.y} width={map.w} height={map.h} />
          <text x={map.x + map.w / 2} y={map.y + map.h / 2}>
            {label}
            {id === current ? ' (현재)' : ''}
          </text>
        </g>
      ))}
    </svg>
  );
}
