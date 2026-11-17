import { create } from 'zustand';
import { incidents } from '../content/incidents';
import { judge, SANITY_MAX } from '../core/judge';
import { respond } from '../core/responder';
import type { Question, ZoneId } from '../core/types';

export const MAX_QUESTIONS = 3;

interface GameState {
  zone: ZoneId;
  sanity: number;
  incidentIndex: number;
  asked: { question: Question; reply: string }[];
  results: { incidentId: string; correct: boolean }[];
  wrongReaction: string | null;
  setZone: (zone: ZoneId) => void;
  ask: (questionId: string) => void;
  act: (actionId: string) => void;
}

export const useGame = create<GameState>((set, get) => ({
  zone: 'counter',
  sanity: SANITY_MAX,
  incidentIndex: 0,
  asked: [],
  results: [],
  wrongReaction: null,

  setZone: (zone) => set({ zone }),

  ask: (questionId) => {
    const { incidentIndex, asked } = get();
    const incident = incidents[incidentIndex];
    const question = incident?.questions.find((q) => q.id === questionId);
    if (!question || asked.length >= MAX_QUESTIONS) return;
    set({ asked: [...asked, { question, reply: respond(incident.entity, question) }] });
  },

  act: (actionId) => {
    const { incidentIndex, sanity, results } = get();
    const incident = incidents[incidentIndex];
    if (!incident) return;
    const result = judge(incident, actionId, sanity);
    set({
      sanity: result.sanity,
      results: [...results, { incidentId: incident.id, correct: result.correct }],
      wrongReaction: result.correct ? null : incident.wrongReaction,
      incidentIndex: incidentIndex + 1,
      asked: [],
    });
  },
}));

export const useIncident = () => useGame((s) => incidents[s.incidentIndex]);
