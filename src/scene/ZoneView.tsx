import { useState } from 'react';
import type { ReactNode } from 'react';
import { hotspots } from '../content/hotspots';
import { tasks } from '../content/tasks';
import { toClock } from '../core/clock';
import type { Modal } from '../store/game';
import { activeEncounter, anomalyIn, browsingIn, GLIMPSE_ZONES, glimpseWindow, useGame } from '../store/game';

// 파일 이름은 tools/art/zones.py의 렌더 이름과 맞춘다. 좌표는 480×270 렌더 이미지 기준이다.
export function ZoneView() {
  const s = useGame();
  const { zone } = s;
  const encounter = activeEncounter(s);
  const anomaly = anomalyIn(s, zone);
  const browsers = browsingIn(s, zone);
  const glimpse = GLIMPSE_ZONES.includes(zone) && browsers.length === 0 && glimpseWindow(s) !== null;
  const [hover, setHover] = useState<string | null>(null);

  const spot = (key: string, label: string, onClick: () => void, className = 'hotspot'): ReactNode => {
    const r = hotspots[key];
    return (
      r && (
        <rect
          key={key}
          className={className}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          onClick={() => {
            setHover(null);
            onClick();
          }}
          onMouseEnter={() => setHover(label)}
          onMouseLeave={() => setHover(null)}
        />
      )
    );
  };
  const open = (modal: Modal) => () => s.setModal(modal);

  const layers: { src: string; key: string; label: string; onClick: () => void }[] = [];
  if (zone === 'counter' && encounter) {
    layers.push({
      src: `${encounter.look}-counter${encounter.reflection ? '' : '-noreflect'}`,
      key: `person:${encounter.look}-counter`,
      label: '손님을 자세히 본다',
      onClick: () => s.observe('customer'),
    });
  }
  for (const b of browsers.slice(0, 1)) {
    layers.push({
      src: `${b.look}-${zone}`,
      key: `person:${b.look}-${zone}`,
      label: '손님을 본다',
      onClick: () => s.observe(`browse:${b.id}`),
    });
  }
  if (glimpse) {
    layers.push({ src: `tall-${zone}`, key: `person:tall-${zone}`, label: '…', onClick: () => s.observe('glimpse') });
  }

  const workable = encounter
    ? []
    : tasks.filter((t) => t.zone === zone && !s.doneTasks.includes(t.id) && s.clock >= toClock(t.time));

  return (
    <main className="zone-view">
      {/* viewBox를 렌더 해상도와 맞춰야 클릭 영역이 이미지와 어긋나지 않는다. */}
      <svg key={zone} className="zone-scene" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid meet">
        <image href={`/art/zones/${anomaly?.image ?? zone}.png`} width="480" height="270" />
        {layers.map((l) => (
          <image key={l.src} className="person" href={`/art/layers/${l.src}.png`} width="480" height="270" />
        ))}
        {zone === 'counter'
          ? spot('obs:window', '정면 유리를 본다', () => s.observe('window'))
          : spot(`obs:${zone}`, '자세히 본다', () => s.observe(zone))}
        {workable.map((t) => spot(`task:${t.id}`, t.label, () => s.doTask(t.id), 'hotspot task-spot'))}
        {zone === 'counter' && (
          <>
            {spot('pos', 'POS 계산대', open('pos'))}
            {spot('cctv', 'CCTV 모니터', open('cctv'))}
            {spot('manual', '운영 매뉴얼 바인더', open('manual'))}
          </>
        )}
        {layers.map((l) => spot(l.key, l.label, l.onClick))}
      </svg>
      {hover && <div className="hover-label">{hover}</div>}
    </main>
  );
}
