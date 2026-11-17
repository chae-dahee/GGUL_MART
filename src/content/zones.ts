import type { Zone } from '../core/types';

export const zones: Zone[] = [
  { id: 'counter', label: '카운터', map: { x: 10, y: 60, w: 30, h: 30 } },
  { id: 'shelf', label: '진열대', map: { x: 10, y: 10, w: 55, h: 40 } },
  { id: 'fridge', label: '냉장고', map: { x: 70, y: 45, w: 20, h: 25 } },
  { id: 'entrance', label: '입구', map: { x: 45, y: 75, w: 20, h: 15 } },
  { id: 'storage', label: '창고', map: { x: 70, y: 10, w: 20, h: 30 } },
];
