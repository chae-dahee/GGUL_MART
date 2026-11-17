import { anomalies } from '../content/anomalies';
import { tasks } from '../content/tasks';
import { SANITY_MAX } from '../core/judge';
import { useGame } from '../store/game';

// 엔딩 종류와 기준은 기획 미확정 임시값이다.
const ENDINGS = {
  leave: { title: '퇴근', text: '자동문은 2짝이었습니다. 당신은 그중 하나로 나갔습니다.' },
  remain: { title: '매장의 일부', text: '당신은 퇴근했습니다. 다음 날 밤, 카운터 유리에 당신이 비치지 않습니다.' },
  loop: {
    title: '끝나지 않는 근무',
    text: '교대는 끝났습니다. 시계는 23:00을 가리킵니다. 매뉴얼 바인더에 "13조"가 새로 끼워져 있습니다.',
  },
};

export function Result() {
  const { outcomes, sanity, doneTasks, exposed, missed, trapped, toLobby } = useGame();
  const relief = outcomes.find((o) => o.id.startsWith('relief'));
  const ending = !relief?.correct ? ENDINGS.loop : sanity <= 30 ? ENDINGS.remain : ENDINGS.leave;
  const resolved = anomalies.filter((a) => exposed.includes(a.id)).length;

  return (
    <main className="screen">
      <h1>{ending.title}</h1>
      <p className="ending">{ending.text}</p>
      <ul className="stats">
        <li>
          손님 대응 {outcomes.filter((o) => o.correct).length} / {outcomes.length}
        </li>
        <li>찾아낸 모순 {exposed.length}</li>
        <li>
          공간 이상 지적 {resolved} / {anomalies.length} · 놓침 {missed.length} · 함정 {trapped.length}
        </li>
        <li>
          업무 {doneTasks.length} / {tasks.length}
        </li>
        <li>
          정신도 {sanity} / {SANITY_MAX}
        </li>
      </ul>
      <button onClick={toLobby}>로비로</button>
    </main>
  );
}
