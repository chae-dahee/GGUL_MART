import type { Task } from '../core/types';

// 업무 기록은 뒤에 오는 공간 이상과 대조할 기준이 된다. 시각순이어야 한다.
export const tasks: Task[] = [
  {
    id: 'storage-check',
    kind: 'inspect',
    label: '창고 재고 확인',
    zone: 'storage',
    time: '23:20',
    minutes: 15,
    record: '창고 — 선반 2개. 생수 500ml 박스 수량 일치. 확인 후 03:00에 잠글 것.',
  },
  {
    id: 'fridge-inspect',
    kind: 'inspect',
    label: '음료 냉장고 검수',
    zone: 'fridge',
    time: '00:15',
    minutes: 20,
    record: '음료 냉장고 — 문 4칸. 콜라 24 / 기록 24.',
  },
  {
    id: 'ramen-stock',
    kind: 'stock',
    label: '라면 진열 정리',
    zone: 'shelf',
    time: '01:25',
    minutes: 15,
    record: '진열대 — 모든 상품을 세워 라벨이 통로를 향하게 정렬함.',
  },
  {
    id: 'floor-clean',
    kind: 'clean',
    label: '바닥 청소',
    zone: 'entrance',
    time: '03:25',
    minutes: 20,
    record: '입구 바닥 — 03:17 이후 발자국이 하나도 없음. 손님은 한 명 들어왔다.',
  },
];
