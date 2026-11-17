import { useEffect } from 'react';
import { activeEncounter, anomalyIn, MAX_QUESTIONS, useGame } from '../store/game';

interface Choice {
  id: string;
  label: string;
  disabled?: boolean;
  run: () => void;
}

const HINTS: Record<string, string> = {
  counter: '손님과 정면 유리를 눌러 관찰합니다. 카운터 위의 POS, CCTV 모니터, 매뉴얼 바인더를 눌러 엽니다.',
  shelf: '진열대를 눌러 자세히 봅니다.',
  fridge: '냉장고를 눌러 자세히 봅니다.',
  entrance: '자동문을 눌러 자세히 봅니다.',
  storage: '선반을 눌러 자세히 봅니다.',
};

export function Dialogue() {
  const s = useGame();
  const encounter = activeEncounter(s);
  const anomaly = anomalyIn(s, s.zone);
  const atCounter = s.zone === 'counter';
  const lineDone = !!encounter && s.lineIndex >= encounter.lines.length - 1;

  let choices: Choice[] = [];
  if (encounter && atCounter && lineDone) {
    choices = [
      ...encounter.questions
        .filter((q) => !s.asked.includes(q.id))
        .map((q) => ({
          id: `q:${q.id}`,
          label: `"${q.text}"`,
          disabled: s.asked.length >= MAX_QUESTIONS,
          run: () => s.ask(q.id),
        })),
      ...encounter.actions.map((a) => ({
        id: `a:${a.id}`,
        label: a.needsPay && !s.paid ? `${a.label} (POS 결제 필요)` : a.label,
        disabled: a.needsPay && !s.paid,
        run: () => s.act(a.id),
      })),
    ];
  } else if (encounter && !atCounter) {
    choices = [{ id: 'go', label: '카운터로 간다', run: () => s.setZone('counter') }];
  } else if (!encounter && anomaly && s.evidence.some((e) => e.id === `obs:${anomaly.id}`)) {
    choices = [{ id: 'trap', label: anomaly.trap.label, run: () => s.trap(anomaly.id) }];
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 키를 누르고 있으면 다음 손님의 선택지까지 연달아 고르게 된다.
      if (e.repeat || s.modal) return;
      if (e.key === ' ') {
        e.preventDefault();
        s.advance();
        return;
      }
      const choice = choices[Number(e.key) - 1];
      if (choice && !choice.disabled) choice.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const replies = encounter ? s.evidence.filter((e) => e.id.startsWith(`q:${encounter.id}:`)) : [];

  return (
    <section className="dialogue">
      <div className="dialogue-text">
        {s.message && <p className="message">{s.message}</p>}
        {encounter && atCounter ? (
          <>
            <div className="speaker">손님{s.exposed.includes(encounter.id) ? ' — 정체가 드러남' : ''}</div>
            <p className="line">"{encounter.lines[s.lineIndex]}"</p>
            {!lineDone && (
              <button className="next" onClick={s.advance}>
                계속 <kbd>Space</kbd>
              </button>
            )}
            {replies.map((r) => (
              <p key={r.id} className="reply">
                {r.text}
              </p>
            ))}
          </>
        ) : encounter ? (
          <p className="notice">카운터에 손님이 기다리고 있습니다.</p>
        ) : (
          <p className="idle">{HINTS[s.zone]}</p>
        )}
      </div>
      {choices.length > 0 && (
        <div className="choices">
          {choices.map((c, i) => (
            <button key={c.id} onClick={c.run} disabled={c.disabled}>
              <kbd>{i + 1}</kbd>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
