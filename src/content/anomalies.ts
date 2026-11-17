import type { Anomaly, ZoneId } from '../core/types';

// 구역마다 평소 모습이다. 이상이 없을 때 관찰하면 이 문장이 기준 증거로 남는다.
export const baselines: Partial<Record<ZoneId, string>> = {
  counter: '정면 유리에 카운터와 계산대가 비친다.',
  shelf: '진열대의 병은 모두 세워져 있고, 라벨이 통로를 향한다.',
  fridge: '음료 냉장고의 문은 4칸이다.',
  entrance: '입구 자동문은 2짝이다.',
  storage: '창고 선반은 양쪽 벽에 하나씩, 2개다.',
};

// image는 public/art/zones/의 파일 이름이다. tools/art/zones.py의 variant 이름과 맞춘다.
export const anomalies: Anomaly[] = [
  {
    id: 'shelf-lying',
    zone: 'shelf',
    from: '01:40',
    until: '02:40',
    image: 'shelf--lying',
    observe: '진열대 한 칸의 병이 모두 눕혀져 있다. 라벨이 전부 안쪽을 향한다.',
    trap: {
      label: '눕혀진 병을 다시 세운다',
      reaction: '병을 세우자 라벨이 모두 당신 쪽을 향합니다. 다시 봤을 때, 병은 누워 있습니다. 한 칸 더.',
    },
    missed: '진열대의 병이 두 칸째 눕혀져 있습니다. 아무도 만지지 않았습니다.',
    contradictions: [
      ['obs:shelf-lying', 'task:ramen-stock'],
      ['obs:shelf-lying', 'base:shelf'],
    ],
  },
  {
    id: 'fridge-extra',
    zone: 'fridge',
    from: '04:10',
    until: '05:00',
    image: 'fridge--extra',
    observe: '냉장고 문이 5칸이다. 맨 오른쪽 칸의 병에는 라벨이 없다.',
    trap: {
      label: '늘어난 칸을 열어 본다',
      reaction: '문을 열자 냉기가 아니라 미지근한 공기가 나옵니다. 칸 안쪽이 어둡게 이어져 있습니다. 문을 닫았을 때, 손에 라벨 없는 병이 들려 있습니다.',
    },
    missed: '냉장고 맨 오른쪽 칸의 병이 하나 줄어 있습니다. 아무도 계산하지 않았습니다.',
    contradictions: [
      ['obs:fridge-extra', 'task:fridge-inspect'],
      ['obs:fridge-extra', 'rule:fridge-doors'],
      ['obs:fridge-extra', 'base:fridge'],
    ],
  },
  {
    id: 'storage-rack',
    zone: 'storage',
    from: '04:20',
    until: '05:10',
    image: 'storage--rack',
    observe: '창고 선반이 3개다. 가운데 선반은 바닥에 고정되어 있지 않은데, 밀어도 움직이지 않는다.',
    trap: {
      label: '가운데 선반의 상자를 열어 본다',
      reaction: '상자 안에는 이 매장의 근무 일지가 들어 있습니다. 마지막 장에 오늘 날짜와 당신의 이름이 적혀 있습니다. 퇴근 시각 칸은 비어 있습니다.',
    },
    missed: '창고 문 안쪽에서 선반을 끄는 자국이 입구 쪽으로 이어져 있습니다.',
    contradictions: [
      ['obs:storage-rack', 'task:storage-check'],
      ['obs:storage-rack', 'base:storage'],
    ],
  },
  {
    id: 'entrance-three',
    zone: 'entrance',
    from: '05:20',
    until: '05:58',
    image: 'entrance--three',
    observe: '자동문이 3짝이다. 가운데 문 너머의 보도는 젖어 있지 않다.',
    trap: {
      label: '가운데 문으로 나가 본다',
      reaction: '가운데 문이 열립니다. 밖은 매장 안과 똑같이 밝습니다. 한 걸음 내딛자, 당신은 카운터 안에 서 있습니다.',
    },
    missed: '자동문 가운데 짝이 열린 채로 멈춰 있습니다.',
    contradictions: [
      ['obs:entrance-three', 'rule:door-count'],
      ['obs:entrance-three', 'base:entrance'],
    ],
  },
];
