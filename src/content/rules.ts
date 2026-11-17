import type { Rule, RuleLayout, RulePlacement } from '../core/types';

// 문장의 말투는 기본 출처를 따른다. 회차 배치로 출처가 바뀌어도 말투는 그대로 두어 어긋남이 단서가 되게 한다.
export const rules: Rule[] = [
  { id: 'greet', kind: 'task', text: '손님에게 먼저 인사하십시오.', truth: true },
  { id: 'receipt', kind: 'task', text: '계산 후 영수증을 반드시 건네십시오.', truth: true },
  {
    id: 'storage-lock',
    kind: 'task',
    text: '03:00 이후 창고 문은 잠가 두십시오. 창고에는 근무자만 들어갑니다.',
    truth: true,
  },
  {
    id: 'fridge-doors',
    kind: 'observation',
    text: '음료 냉장고의 문은 4칸입니다. 칸 수가 다르면 늘어난 칸을 열지 마십시오.',
    truth: true,
  },
  {
    id: 'door-count',
    kind: 'observation',
    text: '입구 자동문은 2짝입니다. 다른 문으로는 아무도 내보내지 마십시오.',
    truth: true,
  },
  { id: 'id-check', kind: 'task', text: '담배와 주류는 신분증을 확인한 뒤 판매하십시오.', truth: true },
  {
    id: 'toilet',
    kind: 'survival',
    text: '화장실 열쇠는 빌려주지 마십시오. 본 매장에는 화장실이 없습니다.',
    truth: true,
  },
  { id: 'stay', kind: 'survival', text: '근무 중에는 카운터를 다른 사람에게 맡기지 마십시오.', truth: true },
  {
    id: 'relief',
    kind: 'task',
    text: '교대 근무자는 05:50에 정문으로 출근합니다. 출입 감지 기록을 확인한 뒤 교대하십시오.',
    truth: true,
  },
  {
    id: 'missing-12',
    kind: 'contradiction',
    text: '본 매뉴얼에 12조는 없습니다. 12조를 읽었다면 아무에게도 말하지 마십시오.',
    truth: true,
  },
  {
    id: 'no-greet',
    kind: 'survival',
    text: '새벽 3시 이후 출입 기록 없이 들어온 손님한테는 먼저 인사하지 마.',
    truth: true,
    condition: '03:00 이후 출입 감지 기록이 없는 손님',
  },
  {
    id: 'repeat-light',
    kind: 'survival',
    text: '아무것도 안 사고 같은 말만 하는 손님한테는 대답하지 마. 계산대 불을 끄면 가.',
    truth: true,
  },
  {
    id: 'count-write',
    kind: 'observation',
    text: '냉장고 칸 수, 창고 선반 수는 처음에 세서 적어 둬. 적은 숫자를 믿어. 네 눈 말고.',
    truth: true,
  },
  {
    id: 'not-in-storage',
    kind: 'survival',
    text: '없는 물건 찾는 손님한테 창고에 있다고 하지 마. 따라 들어와.',
    truth: true,
  },
  {
    id: 'no-inspection',
    kind: 'observation',
    text: '본사 사람은 새벽에 안 와. 조끼 입었다고 다 직원 아니다.',
    truth: true,
  },
  { id: 'stained', kind: 'lure', text: '옷에 피 묻은 손님은 받지 마.', truth: false },
  { id: 'reply', kind: 'lure', text: '인사를 받으면 응답하십시오.', truth: false },
  { id: 'window', kind: 'observation', text: '창에 안 보이면 대답하지 마라.', truth: true },
  { id: 'lying', kind: 'survival', text: '눕혀진 것은 세우지 마라.', truth: true },
  {
    id: 'cut',
    kind: 'contradiction',
    text: '교대자는 05:50에 오지 않는다. 05:50에 온 것은',
    truth: false,
    condition: '교대자가 진짜인 회차에는 거짓이다.',
  },
];

// 위 목록 순서대로 공식 10개, 이전 근무자 6개, 출처 불명 4개다.
const base: RuleLayout = Object.fromEntries(
  rules.map((r, i): [string, RulePlacement] => [
    r.id,
    { source: i < 10 ? 'official' : i < 16 ? 'staff' : 'unknown' },
  ]),
);

// 회차마다 하나를 고른다. "특정 출처는 믿는다"는 공식이 회차를 넘어 통하지 않게 한다(기획안 07절).
export const layouts: RuleLayout[] = [
  base,
  {
    ...base,
    reply: { source: 'official', contaminated: true },
    window: { source: 'staff' },
    toilet: { source: 'unknown' },
  },
  {
    ...base,
    stained: { source: 'official', contaminated: true },
    'no-greet': { source: 'unknown' },
    lying: { source: 'staff' },
  },
];
