// 정신도 수치는 기획 미확정 임시값이다.
export const SANITY_MAX = 100;

export const PENALTY = {
  // 괴이에게 잘못 대응했을 때
  anomaly: 15,
  // 정상 손님에게 잘못 대응했을 때
  normal: 8,
  // 모순이 아닌 짝을 지적했을 때
  falseAccusation: 5,
  // 공간 이상의 함정 행동을 했을 때
  trap: 20,
  // 공간 이상을 기한 안에 지적하지 못했을 때
  missed: 10,
};

// 모순을 찾으면 조금 회복한다.
export const CONTRADICTION_BONUS = 5;

export const clampSanity = (value: number) => Math.max(0, Math.min(SANITY_MAX, value));
