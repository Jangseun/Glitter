import "./TypingResult.css"

// 타자 연습이 끝났을 때 보여주는 결과 카드.
// 친구 대결에서도 내 결과를 보여줄 때 재사용할 수 있도록 계산은 하지 않고
// 이미 계산된 stats만 받아서 보여주기만 해요.
const TypingResult = ({ stats, onRestart, onNext }) => {
  return (
    // 화면 전체를 덮는 반투명 검은 배경 + 가운데 결과 카드(팝업) 구조예요.
    // position: fixed라서 페이지 어디에 렌더링되든 항상 화면 전체를 덮어요.
    <div className="result-backdrop">
      <section className="result" role="dialog" aria-modal="true" aria-label="타자 연습 결과">
        <p className="result-title">다 쳤어요!</p>

        <dl className="result-grid">
          <div className="result-item">
            <dt>타수</dt>
            <dd>
              {stats.speed}
              <small>타/분</small>
            </dd>
          </div>
          <div className="result-item">
            <dt>정확도</dt>
            <dd>
              {stats.accuracy}
              <small>%</small>
            </dd>
          </div>
          <div className="result-item">
            <dt>오타</dt>
            <dd>
              {stats.typoCount}
              <small>개</small>
            </dd>
          </div>
          <div className="result-item">
            <dt>시간</dt>
            <dd>
              {stats.seconds.toFixed(1)}
              <small>초</small>
            </dd>
          </div>
        </dl>

        <div className="result-actions">
          <button type="button" className="btn" onClick={onRestart}>
            다시하기 <kbd>Esc</kbd>
          </button>
          <button type="button" className="btn primary" onClick={onNext}>
            다음 문장 <kbd>Enter</kbd>
          </button>
        </div>
      </section>
    </div>
  )
}

export default TypingResult
