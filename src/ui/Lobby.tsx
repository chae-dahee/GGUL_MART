import { useEffect } from 'react';
import { useGame } from '../store/game';

export function Lobby() {
  const start = useGame((s) => s.start);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start]);

  return (
    <main className="lobby">
      <div className="lobby-vignette" />
      <div className="lobby-content">
        <h1>야간 편의점</h1>
        <p className="lobby-sub">규칙을 지키고, 거짓을 구별하라.</p>
        <div className="doc-manual">
          <h4>야간 근무자 안내</h4>
          <ol>
            <li>근무 시간은 23:00부터 06:00까지입니다.</li>
            <li>근무 중에는 운영 매뉴얼을 따르십시오. 매뉴얼은 모두 사실이 아닐 수 있습니다.</li>
            <li>보고, 묻고, 기록하십시오. 서로 맞지 않는 기록이 있다면 수첩에 표시하십시오.</li>
            <li>매장의 모습이 바뀌어도 당황하지 마십시오. 원래 모습을 기억하십시오.</li>
          </ol>
        </div>
        <button className="lobby-start" onClick={start}>
          근무 시작 <kbd>Enter</kbd>
        </button>
      </div>
    </main>
  );
}
