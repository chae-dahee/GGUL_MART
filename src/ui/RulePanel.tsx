import { rules } from '../content/rules';
import type { RuleSource } from '../core/types';
import { useIncident } from '../store/game';

const sourceLabel: Record<RuleSource, string> = {
  official: '공식 매뉴얼',
  staff: '이전 근무자 메모',
  unknown: '출처 불명',
};

export function RulePanel() {
  const incident = useIncident();
  const active = rules.filter((r) => incident?.ruleIds.includes(r.id));

  return (
    <aside className="panel rules">
      <h2>적용 중인 수칙</h2>
      {active.map((r) => (
        <div key={r.id} className={`rule rule-${r.source}`}>
          <small>{sourceLabel[r.source]}</small>
          <p>{r.text}</p>
        </div>
      ))}
    </aside>
  );
}
