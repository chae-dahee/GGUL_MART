export type ZoneId = 'counter' | 'shelf' | 'fridge' | 'entrance' | 'storage';

export interface Zone {
  id: ZoneId;
  label: string;
  // StoreMap SVG 좌표 (viewBox 0 0 100 100)
  map: { x: number; y: number; w: number; h: number };
}

export type RuleSource = 'official' | 'staff' | 'unknown';
export type RuleKind = 'survival' | 'observation' | 'task' | 'contradiction' | 'lure';

export interface Rule {
  id: string;
  source: RuleSource;
  kind: RuleKind;
  text: string;
}

export type Entity = { anomaly: boolean } & (
  | { response: 'truthful' | 'liar' | 'fakeStaff' }
  | { response: 'repeater'; repeatLine: string }
);

export interface Question {
  id: string;
  text: string;
  // 정상 손님 기준의 사실 답
  truth: boolean;
  aboutJob?: boolean;
}

export type ClueType = 'cctv' | 'record' | 'dialogue';

export interface Clue {
  type: ClueType;
  text: string;
}

export interface Anomaly {
  id: string;
  zone: ZoneId;
  label: string;
}

export interface Action {
  id: string;
  label: string;
}

export interface Incident {
  id: string;
  time: string;
  zone: ZoneId;
  entity: Entity;
  line: string;
  ruleIds: string[];
  clues: Clue[];
  anomalies: Anomaly[];
  questions: Question[];
  actions: Action[];
  correctActionId: string;
  wrongReaction: string;
}
