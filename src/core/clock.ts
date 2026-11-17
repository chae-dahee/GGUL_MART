// 시계 값은 23:00 출근부터 지난 게임 분이다.
const SHIFT_START = 23 * 60;
const DAY = 24 * 60;

export const SHIFT_LENGTH = 7 * 60;
// 현실 1초에 게임 1분이 흐르는 임시값이다.
export const TICK_MS = 1000;

export function toClock(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h * 60 + m - SHIFT_START + DAY) % DAY;
}

export function formatClock(clock: number) {
  const t = (SHIFT_START + clock) % DAY;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}
