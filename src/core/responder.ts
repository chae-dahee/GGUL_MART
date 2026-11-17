import type { Entity, Question } from './types';

const yesNo = (value: boolean) => (value ? '예' : '아니오');

export function respond(entity: Entity, question: Question): string {
  switch (entity.response) {
    case 'truthful':
      return yesNo(question.truth);
    case 'liar':
      return yesNo(!question.truth);
    case 'fakeStaff':
      return yesNo(question.aboutJob ? !question.truth : question.truth);
    case 'repeater':
      return entity.repeatLine;
  }
}
