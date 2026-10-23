// 타자 기록(속도/정확도/오타) 계산 함수 모음.
// 혼자 연습(TypingSolo)과 친구 대결(TypingBattle)에서 똑같은 기준으로 계산하려고 따로 뺐어요.
//
// [계산 기준 정리]
// - 시작 시점: 사용자가 첫 입력(첫 자모 or 첫 글자)을 한 순간
// - 종료 시점: 확정된 입력 길이가 문장 길이에 도달한 순간
// - 타수(타/분): "맞게 친 글자"를 자판 입력 횟수(자모 수)로 바꿔서 1분 기준으로 환산
// - 오타 수: 글자가 확정될 때 정답과 달랐던 횟수 (나중에 지우고 고쳐도 오타 기록은 남음)
// - 정확도: (확정된 전체 글자 수 - 오타 수) / 확정된 전체 글자 수
//
// keydown 횟수를 세지 않는 이유:
// 한글은 IME가 여러 키 입력을 조합해서 한 글자로 만들기 때문에 keydown 횟수가
// 실제 글자와 1:1로 맞지 않아요. (백스페이스로 자모만 지우는 경우 등)
// 그래서 항상 "확정된 문자열"과 "정답 문자열"을 비교해서 계산합니다.

// 한글 완성형 글자(가~힣)의 유니코드 범위
const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3

// 두 번 눌러야 하는 겹모음 (ㅘ = ㅗ+ㅏ 처럼)
// 중성 인덱스 기준: ㅘ(9) ㅙ(10) ㅚ(11) ㅝ(14) ㅞ(15) ㅟ(16) ㅢ(19)
const DOUBLE_JUNG = new Set([9, 10, 11, 14, 15, 16, 19])

// 두 번 눌러야 하는 겹받침 (ㄳ = ㄱ+ㅅ 처럼)
// 종성 인덱스 기준: ㄳ(3) ㄵ(5) ㄶ(6) ㄺ(9) ㄻ(10) ㄼ(11) ㄽ(12) ㄾ(13) ㄿ(14) ㅀ(15) ㅄ(18)
const DOUBLE_JONG = new Set([3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18])

// 글자 하나를 치려면 자판을 몇 번 눌러야 하는지 계산해요. (두벌식 기준)
// 예: "한" = ㅎ + ㅏ + ㄴ = 3타, "과" = ㄱ + ㅗ + ㅏ = 3타, "A" = 1타
// 쌍자음(ㄲ)이나 ㅒ처럼 Shift를 쓰는 글자는 보통 1타로 칩니다.
export const countStrokes = (char) => {
  const code = char.charCodeAt(0)
  if (code < HANGUL_START || code > HANGUL_END) return 1 // 영문, 숫자, 문장부호, 공백

  // 한글 완성형은 (초성 * 588) + (중성 * 28) + 종성 규칙으로 번호가 매겨져 있어서
  // 나눗셈만으로 초/중/종성을 분리할 수 있어요.
  const offset = code - HANGUL_START
  const jung = Math.floor((offset % 588) / 28)
  const jong = offset % 28

  let strokes = 1 // 초성은 항상 1타
  strokes += DOUBLE_JUNG.has(jung) ? 2 : 1
  if (jong > 0) strokes += DOUBLE_JONG.has(jong) ? 2 : 1
  return strokes
}

// 화면에 보여줄 기록을 한 번에 계산해요.
// target:     정답 문장
// typed:      지금까지 확정된 입력 문자열
// elapsedMs:  시작 후 흐른 시간(ms)
// typedCount: 지금까지 "확정된" 글자의 누적 개수 (지웠다가 다시 친 것도 포함)
// typoCount:  그중 틀렸던 글자의 누적 개수
export const calcTypingStats = ({ target, typed, elapsedMs, typedCount, typoCount }) => {
  let correctChars = 0
  let correctStrokes = 0

  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target[i]) {
      correctChars++
      correctStrokes += countStrokes(typed[i])
    }
  }

  // 시작 직후(1초 미만)에는 분모가 너무 작아서 타수가 수천 타처럼 튀어 보여요.
  // 그래서 1초가 지나기 전에는 0으로 보여줍니다.
  const minutes = elapsedMs / 60000
  const speed = elapsedMs >= 1000 ? Math.round(correctStrokes / minutes) : 0

  // 아직 아무것도 안 쳤으면 정확도는 100%로 보여줘요.
  const accuracy =
    typedCount > 0 ? Math.max(0, Math.round(((typedCount - typoCount) / typedCount) * 1000) / 10) : 100

  return {
    speed, // 타/분
    accuracy, // % (소수점 첫째 자리까지)
    typoCount, // 누적 오타 수
    remainingTypos: typed.length - correctChars, // 최종 입력에 남아있는 틀린 글자 수
    seconds: Math.max(0, elapsedMs) / 1000,
    progress: target.length > 0 ? Math.min(1, typed.length / target.length) : 0, // 0 ~ 1
  }
}
