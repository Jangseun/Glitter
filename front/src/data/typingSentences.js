// 타자 연습용 문장 목록이에요.
// 나중에 백엔드/DB가 생기면 이 목록을 API에서 받아오도록 바꾸면 되고,
// 그 전까지는 프론트에 하드코딩해서 씁니다. (친구 대결에서도 같은 목록을 재사용할 예정)
//
// ⚠️ 문장은 꼭 마침표/느낌표/물음표 같은 "문장 부호"로 끝나게 써주세요.
// 한글은 마지막 글자를 쳐도 IME가 "아직 조합 중"이라고 생각해서 확정이 안 돼요.
// (예: "다"를 치고 나서도 "닭"이 될 수도 있으니까 브라우저가 기다림)
// 끝이 문장 부호면 사용자가 그걸 치는 순간 앞 글자가 자연스럽게 확정돼서 완료 판정이 깔끔해요.
// 한글로 끝나는 문장이면 사용자가 Enter를 한 번 더 눌러야 완료됩니다. (화면에 안내는 나와요)

export const TYPING_SENTENCES = [
  {
    id: "yoon-seosi",
    text: "죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.",
    source: "윤동주, 「서시」",
  },
  {
    id: "yoon-seosi-2",
    text: "별을 노래하는 마음으로 모든 죽어 가는 것을 사랑해야지.",
    source: "윤동주, 「서시」",
  },
  {
    id: "kim-azalea",
    text: "나 보기가 역겨워 가실 때에는 말없이 고이 보내 드리우리다.",
    source: "김소월, 「진달래꽃」",
  },
  {
    id: "kim-mountain-flower",
    text: "산에는 꽃 피네, 꽃이 피네. 갈 봄 여름 없이 꽃이 피네.",
    source: "김소월, 「산유화」",
  },
  {
    id: "proverb-1",
    text: "천 리 길도 한 걸음부터 시작한다.",
    source: "속담",
  },
  {
    id: "proverb-2",
    text: "가는 말이 고와야 오는 말이 곱다.",
    source: "속담",
  },
  {
    id: "glitter-1",
    text: "오늘 쓴 한 줄이 내일의 이야기가 됩니다. 천천히, 그러나 멈추지 말고 써 내려가 보세요.",
    source: "Glitter",
  },
  {
    id: "glitter-2",
    text: "붕어빵 냄새가 골목을 가득 채우던 날, 우리는 아무 이유 없이 웃었다.",
    source: "Glitter",
  },
  {
    id: "glitter-3",
    text: "비 오는 오후에는 창가에 앉아 따뜻한 차를 마시며 오래된 책을 펼쳐 보고 싶어진다.",
    source: "Glitter",
  },
  {
    id: "glitter-4",
    text: "기억을 잃은 소년은 놀이공원 회전목마 앞에서 낯익은 노래를 들었다.",
    source: "Glitter",
  },
]

// 문장을 무작위로 하나 골라요.
// excludeId를 넘기면 그 문장은 빼고 고릅니다. ("다음 문장"을 눌렀는데 같은 문장이 또 나오지 않게)
export const pickRandomSentence = (excludeId) => {
  const candidates = TYPING_SENTENCES.filter((s) => s.id !== excludeId)
  // 목록에 문장이 하나뿐이면 후보가 비니까, 그땐 전체에서 고르도록 안전장치
  const pool = candidates.length > 0 ? candidates : TYPING_SENTENCES
  return pool[Math.floor(Math.random() * pool.length)]
}
