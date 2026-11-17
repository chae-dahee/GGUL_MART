import type { Encounter, Question } from './types';

const yesNo = (value: boolean) => (value ? '예' : '아니오');

function answer(question: Question, lie: boolean): string {
  if ('lie' in question) return lie ? question.lie : question.truth;
  return yesNo(question.truth !== lie);
}

export function respond(entity: Encounter, question: Question): string {
  switch (entity.response) {
    case 'truthful':
      return answer(question, false);
    case 'liar':
      return answer(question, true);
    case 'fakeStaff':
      return answer(question, !!question.aboutJob);
    case 'repeater':
      return entity.repeatLine ?? '';
  }
}
