export type ZoneId = 'counter' | 'shelf' | 'fridge' | 'entrance' | 'storage';

export interface Zone {
  id: ZoneId;
  label: string;
  // StoreMap SVG 좌표 (viewBox 0 0 100 100)
  map: { x: number; y: number; w: number; h: number };
}

export type RuleSource = 'official' | 'staff' | 'unknown';
export type RuleKind = 'survival' | 'observation' | 'task' | 'contradiction' | 'lure';

// text 외의 속성은 숨은 속성이며 플레이어에게 드러내지 않는다.
export interface Rule {
  id: string;
  kind: RuleKind;
  text: string;
  truth: boolean;
  // 수칙 문장에서 빠져 있을 수 있는 실제 적용 조건이다.
  condition?: string;
}

// 회차마다 출처 배치만 바꾸고, 사건과 단서는 회차와 관계없이 고정한다.
export interface RulePlacement {
  source: RuleSource;
  // 괴이가 바꿔치기한 공식 매뉴얼 페이지이다.
  contaminated?: boolean;
}

export type RuleLayout = Record<string, RulePlacement>;

// tools/art/kit.py의 LOOKS와 이름을 맞춘다.
export type Look = 'plain' | 'office' | 'student' | 'elder' | 'butcher' | 'hooded' | 'staff' | 'tall';

export type Response = 'truthful' | 'liar' | 'fakeStaff' | 'repeater';

// truth는 질문받는 대상의 실제 사실이다. 거짓으로 뒤집을지는 Encounter.response가 정하며, 서술형 답은 lie로 뒤집는다.
export type Question = {
  id: string;
  text: string;
  aboutJob?: boolean;
} & ({ truth: boolean } | { truth: string; lie: string });

export interface Action {
  id: string;
  label: string;
  // POS 결제를 마친 뒤에만 고를 수 있다.
  needsPay?: boolean;
}

// 증거 id는 모순 지적에서 짝을 맞추는 열쇠다. 규칙은 store/game.ts의 evidence id 함수들을 따른다.
export type EvidenceKind = 'rule' | 'cctv' | 'log' | 'pos' | 'task' | 'observation' | 'dialogue';

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  time: string;
  title: string;
  text: string;
  image?: string;
}

export interface Clip {
  channel: string;
  // public/art/cctv/의 파일 이름이다.
  image: string;
  time: string;
  text: string;
}

export interface Encounter {
  id: string;
  // 카운터에 오는 시각이다. 이때부터 대응을 마칠 때까지 시계가 멈춘다.
  time: string;
  look: Look;
  anomaly: boolean;
  response: Response;
  repeatLine?: string;
  // false면 정면 유리에 비치지 않는다.
  reflection: boolean;
  browse?: { zone: ZoneId; from: string; note: string };
  lines: string[];
  items: { name: string; scan?: string }[];
  questions: Question[];
  observe: string;
  cctv: Clip[];
  log: { time: string; text: string }[];
  ruleIds: string[];
  actions: Action[];
  correct: string;
  // 이 증거 짝 가운데 하나를 지적하면 정체가 드러난다.
  contradictions: [string, string][];
  reactions: { right: string; wrong: string };
  // 같은 group은 회차마다 하나만 나온다.
  group?: string;
  // 앞선 손님 대응 결과에 따라 나온다.
  after?: { id: string; correct: boolean };
}

// 손님 없이 공간이 바뀌는 이상이다.
export interface Anomaly {
  id: string;
  zone: ZoneId;
  from: string;
  until: string;
  image: string;
  observe: string;
  trap: { label: string; reaction: string };
  missed: string;
  contradictions: [string, string][];
}

export type TaskKind = 'inspect' | 'stock' | 'clean';

export interface Task {
  id: string;
  kind: TaskKind;
  label: string;
  zone: ZoneId;
  // 이 시각부터 수행할 수 있다.
  time: string;
  minutes: number;
  record: string;
}
