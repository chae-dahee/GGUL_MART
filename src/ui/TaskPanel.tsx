import { tasks } from '../content/tasks';
import { zones } from '../content/zones';
import { toClock } from '../core/clock';
import { useGame } from '../store/game';

export function TaskPanel() {
  const { clock, zone, doneTasks, setZone } = useGame();

  return (
    <section className="panel tasks">
      <h2>업무 목록</h2>
      {tasks.map((t) => {
        const done = doneTasks.includes(t.id);
        const open = !done && clock >= toClock(t.time);
        return (
          <div key={t.id} className={`task${done ? ' done' : open ? ' open' : ''}`}>
            <span className="box">{done ? '✓' : ''}</span>
            <div className="task-body">
              {t.time} {t.label}
              <small>
                {zones.find((z) => z.id === t.zone)?.label}
                {open && zone === t.zone && ' · 장면에서 대상을 눌러 수행'}
              </small>
            </div>
            {open && zone !== t.zone && <button onClick={() => setZone(t.zone)}>이동</button>}
          </div>
        );
      })}
    </section>
  );
}
