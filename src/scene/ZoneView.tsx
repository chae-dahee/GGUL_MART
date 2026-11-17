import { zones } from '../content/zones';
import { useGame, useIncident } from '../store/game';

export function ZoneView() {
  const zone = useGame((s) => s.zone);
  const incident = useIncident();
  const index = zones.findIndex((z) => z.id === zone);
  const layers = incident?.anomalies.filter((a) => a.zone === zone) ?? [];

  return (
    <section className="zone-view">
      <div className="cam-label">
        CAM {String(index + 1).padStart(2, '0')} · {zones[index].label}
      </div>
      {/* 화이트박스: 사전 렌더 이미지가 생기면 기준 이미지 + 이상 레이어 이미지로 교체한다. */}
      {layers.map((a) => (
        <div key={a.id} className="layer" data-layer={a.id}>
          {a.label}
        </div>
      ))}
    </section>
  );
}
