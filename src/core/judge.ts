import type { Incident } from './types';

// 정신도 수치는 기획 미확정 임시값이다.
export const SANITY_MAX = 100;
export const WRONG_PENALTY = 15;

export function judge(incident: Incident, actionId: string, sanity: number) {
  const correct = actionId === incident.correctActionId;
  return {
    correct,
    sanity: correct ? sanity : Math.max(0, sanity - WRONG_PENALTY),
  };
}
