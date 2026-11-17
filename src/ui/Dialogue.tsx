import { MAX_QUESTIONS, useGame, useIncident } from '../store/game';

export function Dialogue() {
  const incident = useIncident();
  const { asked, results, sanity, ask, act } = useGame();

  if (!incident) {
    const correct = results.filter((r) => r.correct).length;
    return (
      <section className="panel dialogue">
        <h2>근무 종료</h2>
        <p>
          대응 {correct} / {results.length} · 정신도 {sanity}
        </p>
      </section>
    );
  }

  const askedIds = asked.map((a) => a.question.id);
  const limitReached = asked.length >= MAX_QUESTIONS;

  return (
    <section className="panel dialogue">
      <p className="line">손님 "{incident.line}"</p>
      {asked.map(({ question, reply }) => (
        <p key={question.id} className="reply">
          {question.text} — "{reply}"
        </p>
      ))}
      <div className="choices">
        {incident.questions.map((q) => (
          <button
            key={q.id}
            onClick={() => ask(q.id)}
            disabled={limitReached || askedIds.includes(q.id)}
          >
            질문: {q.text}
          </button>
        ))}
        {incident.actions.map((a) => (
          <button key={a.id} onClick={() => act(a.id)}>
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
