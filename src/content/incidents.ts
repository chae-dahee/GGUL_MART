import type { Incident } from '../core/types';

export const incidents: Incident[] = [
  {
    id: 'greeting-conflict',
    time: '03:17',
    zone: 'counter',
    entity: { anomaly: true, response: 'truthful' },
    line: '이것만 계산해 주세요. …아까도 왔었는데, 기억 안 나세요?',
    ruleIds: ['A-greet', 'B-no-greet', 'C-reply'],
    clues: [
      { type: 'cctv', text: 'CH2 입구 03:10~03:17 — 문이 열리는 장면이 없습니다.' },
      { type: 'record', text: '03:17 — 차임벨 기록이 없습니다.' },
    ],
    anomalies: [{ id: 'no-reflection', zone: 'counter', label: '창 반사에 손님이 없음' }],
    questions: [
      { id: 'from-outside', text: '밖에서 들어오셨어요?', truth: false },
      { id: 'came-before', text: '아까도 오셨어요?', truth: true },
    ],
    actions: [
      { id: 'greet', label: '"어서 오세요." 먼저 인사한다' },
      { id: 'reply', label: '손님 말에 대답한다' },
      { id: 'checkout', label: '말없이 계산만 진행한다' },
    ],
    correctActionId: 'checkout',
    wrongReaction: '손님이 웃으며 나갑니다. 문 위의 차임벨은 울리지 않습니다.',
  },
];
