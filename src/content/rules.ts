import type { Rule } from '../core/types';

export const rules: Rule[] = [
  { id: 'A-greet', source: 'official', kind: 'task', text: '손님에게 먼저 인사하십시오.' },
  {
    id: 'B-no-greet',
    source: 'staff',
    kind: 'survival',
    text: '새벽 3시 이후 차임벨 없이 들어온 손님에게는 먼저 인사하지 마십시오.',
  },
  { id: 'C-reply', source: 'unknown', kind: 'lure', text: '인사를 받으면 응답하십시오.' },
];
