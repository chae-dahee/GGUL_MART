import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Evidence, EvidenceKind, RuleSource } from '../core/types';
import { activeEncounter, usePlacedRules, useGame } from '../store/game';

const sourceTitle: Record<RuleSource, string> = {
  official: '공식 운영 매뉴얼',
  staff: '이전 근무자 메모',
  unknown: '영수증 뒷면 · 출처 불명',
};

const kindTitle: Record<EvidenceKind, string> = {
  rule: '수칙',
  cctv: 'CCTV',
  log: '출입 기록',
  pos: 'POS',
  task: '업무 기록',
  observation: '관찰',
  dialogue: '대화',
};

function Frame({ title, children }: { title: string; children: ReactNode }) {
  const close = useGame((s) => s.setModal);
  return (
    <div className="modal-backdrop" onClick={() => close(null)}>
      <section className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button onClick={() => close(null)}>
            닫기 <kbd>Esc</kbd>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

// 공식 매뉴얼의 조 번호를 붙인 수칙 목록이다. 수첩의 수칙 제목도 이 번호를 쓴다.
function useNumberedRules() {
  const placed = usePlacedRules();
  let n = 0;
  return placed.map((r) => ({
    ...r,
    title: r.source === 'official' ? `${sourceTitle.official} ${++n}조` : sourceTitle[r.source],
  }));
}

export function ManualModal() {
  const rules = useNumberedRules();
  const official = rules.filter((r) => r.source === 'official');
  const notes = rules.filter((r) => r.source !== 'official');

  return (
    <Frame title="운영 매뉴얼 바인더">
      <div className="doc-manual">
        <h4>공식 운영 매뉴얼 — 야간</h4>
        <ol>
          {official.map((r) => (
            // 바꿔치기한 페이지는 인쇄 상태로만 구별된다(기획안 03절).
            <li key={r.id} className={r.contaminated ? 'misprint' : ''}>
              {r.text}
            </li>
          ))}
        </ol>
      </div>
      <div className="notes">
        {notes.map((r) => (
          <div key={r.id} className={r.source === 'staff' ? 'doc-memo' : 'doc-receipt'}>
            <small>{sourceTitle[r.source]}</small>
            {r.text}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function NotebookModal() {
  const s = useGame();
  const rules = useNumberedRules();
  const [picked, setPicked] = useState<string[]>([]);

  const entries: Evidence[] = [
    ...s.evidence,
    ...rules.map((r) => ({ id: `rule:${r.id}`, kind: 'rule' as const, time: '', title: r.title, text: r.text })),
  ];
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]));
  const accuse = () => {
    s.accuse(picked[0], picked[1]);
    setPicked([]);
  };

  return (
    <Frame title="수첩">
      <p className="hint">서로 어긋나는 기록 두 개를 골라 모순을 지적합니다. 틀리면 정신도가 깎입니다.</p>
      {s.message && <p className="message">{s.message}</p>}
      <div className="evidence-list">
        {entries.map((e) => (
          <label key={e.id} className={`evidence${picked.includes(e.id) ? ' picked' : ''}`}>
            <input type="checkbox" checked={picked.includes(e.id)} onChange={() => toggle(e.id)} />
            <small>
              {kindTitle[e.kind]} · {e.title} {e.time && `· ${e.time}`}
            </small>
            <span>{e.text}</span>
          </label>
        ))}
      </div>
      <button className="accuse" disabled={picked.length < 2} onClick={accuse}>
        모순 지적 ({picked.length}/2)
      </button>
    </Frame>
  );
}

export function CctvModal() {
  const s = useGame();
  const encounter = activeEncounter(s);
  const [shown, setShown] = useState<number | null>(null);
  const clip = encounter && shown !== null ? encounter.cctv[shown] : null;

  return (
    <Frame title="CCTV 모니터">
      <figure className="doc-cctv">
        <div className="video">
          <img src={`/art/cctv/${clip?.image ?? 'ch2'}.png`} alt="" />
          <span>{clip?.channel ?? 'CH2 입구 · 실시간'}</span>
          <span>{clip?.time ?? '실시간'}</span>
        </div>
        <figcaption>{clip?.text ?? '녹화 목록에서 확인할 구간을 고릅니다.'}</figcaption>
      </figure>
      {encounter ? (
        <div className="choices">
          {encounter.cctv.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                setShown(i);
                s.viewClip(i);
              }}
            >
              녹화 · {c.channel} {c.time}
            </button>
          ))}
          {encounter.log.map((l, i) => (
            <button key={`log${i}`} onClick={() => s.viewLog(i)}>
              출입 감지 기록 · {l.time}
            </button>
          ))}
        </div>
      ) : (
        <p className="hint">지금은 확인할 녹화 구간이 없습니다.</p>
      )}
      {s.message && <p className="message">{s.message}</p>}
    </Frame>
  );
}

export function PosModal() {
  const s = useGame();
  const encounter = activeEncounter(s);
  const items = encounter?.items ?? [];
  const sales = s.evidence.filter((e) => e.kind === 'pos');

  return (
    <Frame title="POS">
      <div className="doc-pos">
        <div className="row head">
          <span>상태</span>
          <span>품목</span>
        </div>
        {items.length === 0 && <div className="row">계산할 상품이 없습니다.</div>}
        {items.map((item, i) => (
          <div key={i} className="row">
            <span>{i < s.scanned ? '스캔' : '대기'}</span>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      <div className="choices">
        <button disabled={s.scanned >= items.length} onClick={s.scan}>
          바코드 스캔
        </button>
        <button disabled={s.paid || items.length === 0 || s.scanned < items.length} onClick={s.pay}>
          {s.paid ? '결제 완료' : '결제'}
        </button>
      </div>
      {s.message && <p className="message">{s.message}</p>}
      <h3>판매 기록</h3>
      <div className="doc-pos">
        {sales.map((e) => (
          <div key={e.id} className="row">
            <span>{e.time}</span>
            <span>
              {e.title} — {e.text}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}
