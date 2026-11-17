import { create } from 'zustand';
import { anomalies, baselines } from '../content/anomalies';
import { encounters } from '../content/encounters';
import { layouts, rules } from '../content/rules';
import { tasks } from '../content/tasks';
import { formatClock, SHIFT_LENGTH, toClock } from '../core/clock';
import { clampSanity, CONTRADICTION_BONUS, PENALTY, SANITY_MAX } from '../core/judge';
import { respond } from '../core/responder';
import type { Encounter, Evidence, RuleLayout, ZoneId } from '../core/types';

export const MAX_QUESTIONS = 3;

export type Phase = 'lobby' | 'shift' | 'result';
export type Modal = 'manual' | 'notebook' | 'cctv' | 'pos' | null;

interface Outcome {
  id: string;
  correct: boolean;
}

interface ShiftState {
  layout: RuleLayout;
  // 이번 회차에 나오는 손님 id다. group마다 하나를 고른다.
  cast: string[];
  clock: number;
  zone: ZoneId;
  sanity: number;
  outcomes: Outcome[];
  // 카운터에 있는 손님과의 진행 상태다. 손님이 바뀌면 초기화한다.
  lineIndex: number;
  asked: string[];
  scanned: number;
  paid: boolean;
  // 모순을 지적해 정체를 드러낸 손님 id와 바로잡은 공간 이상 id다.
  exposed: string[];
  trapped: string[];
  missed: string[];
  evidence: Evidence[];
  doneTasks: string[];
  message: string | null;
  // 오답 즉시 반응 횟수다. 값이 바뀔 때마다 붉은 조명을 다시 켠다.
  flash: number;
  modal: Modal;
  // 이미 본 형체의 시간 창 번호다.
  glimpsed: number[];
}

interface GameState extends ShiftState {
  phase: Phase;
  start: () => void;
  toLobby: () => void;
  tick: () => void;
  setZone: (zone: ZoneId) => void;
  setModal: (modal: Modal) => void;
  doTask: (taskId: string) => void;
  advance: () => void;
  ask: (questionId: string) => void;
  observe: (target: string) => void;
  viewClip: (index: number) => void;
  viewLog: (index: number) => void;
  scan: () => void;
  pay: () => void;
  act: (actionId: string) => void;
  accuse: (a: string, b: string) => void;
  trap: (anomalyId: string) => void;
}

function castShift() {
  const groups = new Map<string, Encounter[]>();
  for (const e of encounters) if (e.group) groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
  const picked = [...groups.values()].map((g) => g[Math.floor(Math.random() * g.length)].id);
  return encounters.filter((e) => !e.group || picked.includes(e.id)).map((e) => e.id);
}

const encounterState = { lineIndex: 0, asked: [], scanned: 0, paid: false };

const newShift = (): ShiftState => ({
  layout: layouts[Math.floor(Math.random() * layouts.length)],
  cast: castShift(),
  clock: 0,
  zone: 'counter',
  sanity: SANITY_MAX,
  outcomes: [],
  ...encounterState,
  exposed: [],
  trapped: [],
  missed: [],
  evidence: [],
  doneTasks: [],
  message: '23:00 출근. 카운터 위에 매뉴얼 바인더와 이전 근무자의 메모가 있습니다. 첫 손님이 오기 전에 읽어 두십시오.',
  flash: 0,
  modal: null,
  glimpsed: [],
});

// 아직 대응하지 않았고 이번 회차에 나올 수 있는 손님이다. 시각순이다.
export function pendingEncounters(s: ShiftState) {
  return encounters.filter((e) => {
    if (!s.cast.includes(e.id) || s.outcomes.some((o) => o.id === e.id)) return false;
    if (!e.after) return true;
    return s.outcomes.some((o) => o.id === e.after!.id && o.correct === e.after!.correct);
  });
}

export function activeEncounter(s: ShiftState) {
  const next = pendingEncounters(s)[0];
  return next && s.clock >= toClock(next.time) ? next : undefined;
}

export function browsingIn(s: ShiftState, zone: ZoneId) {
  return pendingEncounters(s).filter(
    (e) => e.browse?.zone === zone && s.clock >= toClock(e.browse.from) && s.clock < toClock(e.time),
  );
}

export function anomalyIn(s: ShiftState, zone: ZoneId) {
  return anomalies.find(
    (a) =>
      a.zone === zone &&
      s.clock >= toClock(a.from) &&
      s.clock < toClock(a.until) &&
      !s.exposed.includes(a.id) &&
      !s.trapped.includes(a.id),
  );
}

// 형체는 정신도가 낮을 때 45분마다 10분씩 구석에 선다. 설명하지 않는다.
export const GLIMPSE_ZONES: ZoneId[] = ['shelf', 'storage', 'entrance'];
export function glimpseWindow(s: ShiftState) {
  const window = Math.floor(s.clock / 45);
  return s.sanity < 60 && s.clock % 45 < 10 && !s.glimpsed.includes(window) ? window : null;
}

const pairOf = (a: string, b: string) => (p: [string, string]) =>
  (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

export const useGame = create<GameState>((set, get) => {
  const record = (entry: Omit<Evidence, 'time'>, message = entry.text) => {
    const s = get();
    if (s.evidence.some((e) => e.id === entry.id)) return set({ message });
    set({ evidence: [...s.evidence, { ...entry, time: formatClock(s.clock) }], message });
  };

  const penalize = (amount: number, message: string) => {
    const s = get();
    set({ sanity: clampSanity(s.sanity - amount), message, flash: s.flash + 1 });
  };

  return {
    phase: 'lobby',
    ...newShift(),

    start: () => set({ phase: 'shift', ...newShift() }),

    toLobby: () => set({ phase: 'lobby' }),

    // 손님이 카운터에 있으면 시계를 멈춘다.
    tick: () => {
      const s = get();
      if (s.phase !== 'shift' || activeEncounter(s)) return;
      const clock = s.clock + 1;
      const expired = anomalies.filter(
        (a) => toClock(a.until) === clock && !s.exposed.includes(a.id) && !s.trapped.includes(a.id),
      );
      set({ clock, missed: [...s.missed, ...expired.map((a) => a.id)] });
      for (const a of expired) penalize(PENALTY.missed, a.missed);
      if (clock < SHIFT_LENGTH) return;
      const left = pendingEncounters(get());
      set({
        phase: 'result',
        modal: null,
        sanity: clampSanity(get().sanity - PENALTY.anomaly * left.length),
        outcomes: [...get().outcomes, ...left.map((e) => ({ id: e.id, correct: false }))],
      });
    },

    setZone: (zone) => set({ zone, modal: null }),

    setModal: (modal) => set({ modal }),

    doTask: (taskId) => {
      const s = get();
      const task = tasks.find((t) => t.id === taskId);
      if (!task || s.phase !== 'shift' || activeEncounter(s) || s.zone !== task.zone) return;
      if (s.doneTasks.includes(task.id) || s.clock < toClock(task.time)) return;
      // 업무 중에도 다음 손님 시각과 퇴근 시각은 건너뛰지 않는다.
      const next = pendingEncounters(s)[0];
      const limit = Math.min(next ? toClock(next.time) : SHIFT_LENGTH, SHIFT_LENGTH - 1);
      record({ id: `task:${task.id}`, kind: 'task', title: task.label, text: task.record });
      set({ clock: Math.max(s.clock, Math.min(s.clock + task.minutes, limit)), doneTasks: [...s.doneTasks, task.id] });
    },

    advance: () => {
      const s = get();
      const e = activeEncounter(s);
      if (e && s.lineIndex < e.lines.length - 1) set({ lineIndex: s.lineIndex + 1 });
    },

    ask: (questionId) => {
      const s = get();
      const e = activeEncounter(s);
      const q = e?.questions.find((x) => x.id === questionId);
      if (!e || !q || s.asked.includes(q.id) || s.asked.length >= MAX_QUESTIONS) return;
      const reply = respond(e, q);
      set({ asked: [...s.asked, q.id] });
      record({ id: `q:${e.id}:${q.id}`, kind: 'dialogue', title: `${formatClock(s.clock)} 손님 대화`, text: `"${q.text}" — "${reply}"` });
    },

    observe: (target) => {
      const s = get();
      const e = activeEncounter(s);
      if (target === 'customer' && e) {
        return record({ id: `obs:${e.id}:look`, kind: 'observation', title: '손님 관찰', text: e.observe });
      }
      if (target === 'window' && e) {
        const text = e.reflection
          ? '정면 유리에 카운터와 손님이 함께 비친다.'
          : '정면 유리에 카운터는 비치는데, 손님은 비치지 않는다.';
        return record({ id: `obs:${e.id}:window`, kind: 'observation', title: '유리 관찰', text });
      }
      if (target.startsWith('browse:')) {
        const b = encounters.find((x) => x.id === target.slice(7));
        if (b?.browse) record({ id: `obs:${b.id}:browse`, kind: 'observation', title: '매장 안 손님', text: b.browse.note });
        return;
      }
      if (target === 'glimpse') {
        const window = glimpseWindow(s);
        if (window === null) return;
        set({ glimpsed: [...s.glimpsed, window] });
        return record({
          id: `glimpse:${window}`,
          kind: 'observation',
          title: '형체',
          text: '구석에 키가 큰 형체가 서 있었다. 다시 보니 아무도 없다.',
        });
      }
      // 구역 관찰: 이상이 있으면 이상을, 없으면 평소 모습을 기록한다.
      const zone = s.zone;
      const anomaly = anomalyIn(s, zone);
      if (anomaly) return record({ id: `obs:${anomaly.id}`, kind: 'observation', title: '공간 관찰', text: anomaly.observe });
      const base = baselines[zone];
      if (base) record({ id: `base:${zone}`, kind: 'observation', title: '평소 모습', text: base });
    },

    viewClip: (index) => {
      const e = activeEncounter(get());
      const clip = e?.cctv[index];
      if (!e || !clip) return;
      record({ id: `cctv:${e.id}:${index}`, kind: 'cctv', title: `${clip.channel} ${clip.time}`, text: clip.text, image: clip.image });
    },

    viewLog: (index) => {
      const e = activeEncounter(get());
      const log = e?.log[index];
      if (!e || !log) return;
      record({ id: `log:${e.id}:${index}`, kind: 'log', title: `출입 감지 ${log.time}`, text: log.text });
    },

    scan: () => {
      const s = get();
      const e = activeEncounter(s);
      if (!e || s.scanned >= e.items.length) return;
      const item = e.items[s.scanned];
      set({ scanned: s.scanned + 1 });
      if (item.scan) record({ id: `pos:${e.id}:${s.scanned}`, kind: 'pos', title: `POS 스캔 — ${item.name}`, text: item.scan });
      else set({ message: `삑. ${item.name}` });
    },

    pay: () => {
      const s = get();
      const e = activeEncounter(s);
      if (!e || s.paid || e.items.length === 0 || s.scanned < e.items.length) return;
      set({ paid: true });
      record(
        { id: `pay:${e.id}`, kind: 'pos', title: `POS 결제 ${formatClock(s.clock)}`, text: e.items.map((i) => i.name).join(', ') },
        '결제가 끝났습니다.',
      );
    },

    act: (actionId) => {
      const s = get();
      const e = activeEncounter(s);
      const action = e?.actions.find((a) => a.id === actionId);
      if (!e || !action || (action.needsPay && !s.paid)) return;
      const correct = action.id === e.correct;
      set({ outcomes: [...s.outcomes, { id: e.id, correct }], ...encounterState, modal: null });
      if (correct) set({ message: e.reactions.right });
      else penalize(e.anomaly ? PENALTY.anomaly : PENALTY.normal, e.reactions.wrong);
    },

    accuse: (a, b) => {
      const s = get();
      if (a === b) return;
      const e = activeEncounter(s);
      const target =
        (e && e.contradictions.some(pairOf(a, b)) && e) ||
        anomalies.find(
          (x) =>
            x.contradictions.some(pairOf(a, b)) &&
            s.clock >= toClock(x.from) &&
            s.clock < toClock(x.until) &&
            !s.trapped.includes(x.id),
        );
      if (!target) return penalize(PENALTY.falseAccusation, '두 기록은 서로 어긋나지 않습니다.');
      if (s.exposed.includes(target.id)) return set({ message: '이미 지적한 모순입니다.' });
      set({ exposed: [...s.exposed, target.id], sanity: clampSanity(s.sanity + CONTRADICTION_BONUS) });
      set({
        message:
          'zone' in target
            ? '모순을 기록했습니다. 다시 봤을 때, 그곳은 원래대로 돌아와 있습니다.'
            : '모순을 찾았습니다. 손님이 처음으로 당신을 똑바로 봅니다. 이 손님은 사람이 아닙니다.',
      });
    },

    trap: (anomalyId) => {
      const s = get();
      const a = anomalyIn(s, s.zone);
      if (!a || a.id !== anomalyId) return;
      set({ trapped: [...s.trapped, a.id] });
      penalize(PENALTY.trap, a.trap.reaction);
    },
  };
});

export function usePlacedRules() {
  const layout = useGame((s) => s.layout);
  return rules.map((r) => ({ ...r, ...layout[r.id] }));
}
