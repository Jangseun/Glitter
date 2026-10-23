// 랜덤 이야기 소재 데이터.
// AI 없이 "항목별 목록에서 하나씩 무작위로 뽑아 조합"하는 방식이에요.
// 항목을 추가하고 싶으면 아래 배열에 { key, label, items } 하나를 더 넣기만 하면
// 뽑기 화면(PromptPicker)과 소재 카드(PromptCard)에 자동으로 나타나요.
//
// key는 저장되는 작품 데이터(prompt 객체)의 필드 이름으로도 쓰이니까,
// 한번 정하고 나면 바꾸지 않는 게 좋아요. (예전에 저장한 작품의 소재가 안 보이게 됨)

export const STORY_PROMPT_CATEGORIES = [
  {
    key: "genre",
    label: "장르",
    items: ["추리", "로맨스", "판타지", "SF", "공포", "코미디", "일상", "모험", "성장", "미스터리", "동화", "무협"],
  },
  {
    key: "place",
    label: "장소",
    items: [
      "놀이공원",
      "폐교된 학교",
      "새벽의 편의점",
      "우주 정거장",
      "비 오는 버스 정류장",
      "할머니 댁 다락방",
      "바닷가 작은 마을",
      "지하철 막차",
      "도서관 서고",
      "오래된 사진관",
      "섬마을 등대",
      "눈 덮인 산장",
    ],
  },
  {
    key: "character",
    label: "인물",
    items: [
      "기억을 잃은 학생",
      "말하는 고양이",
      "은퇴한 탐정",
      "거짓말을 못 하는 왕자",
      "시간 여행자",
      "편의점 야간 아르바이트생",
      "소심한 마법사",
      "유령이 된 소설가",
      "전학 온 쌍둥이",
      "로봇 요리사",
      "이름 없는 우체부",
      "꿈을 파는 상인",
    ],
  },
  {
    key: "theme",
    label: "핵심 소재",
    items: ["거짓말", "약속", "비밀 편지", "잃어버린 물건", "첫눈", "이별", "우정", "복수", "소원", "오해", "두 번째 기회", "열면 안 되는 문"],
  },
  {
    key: "word",
    label: "필수 단어",
    items: ["붕어빵", "우산", "열쇠", "손전등", "종이비행기", "달력", "딸기우유", "나침반", "풍선", "오르골", "라디오", "귤"],
  },
]

// 배열에서 하나를 무작위로 골라요. exclude를 주면 그 값은 빼고 골라요.
// ("다시 뽑기"를 눌렀는데 같은 게 또 나오면 안 바뀐 것처럼 보이니까)
const pickOne = (items, exclude) => {
  const pool = items.length > 1 ? items.filter((item) => item !== exclude) : items
  return pool[Math.floor(Math.random() * pool.length)]
}

// 선택한 항목(keys)들만 하나씩 뽑아서 { genre: "추리", word: "붕어빵", ... } 형태로 돌려줘요.
export const drawPrompt = (keys) => {
  const prompt = {}
  for (const category of STORY_PROMPT_CATEGORIES) {
    if (keys.includes(category.key)) prompt[category.key] = pickOne(category.items)
  }
  return prompt
}

// 항목 하나만 다시 뽑아요. (지금 값과 다른 걸로)
export const redrawOne = (key, current) => {
  const category = STORY_PROMPT_CATEGORIES.find((c) => c.key === key)
  return category ? pickOne(category.items, current) : current
}

// 소재 객체가 비어있는지 (null이거나 뽑힌 항목이 하나도 없으면 비어있음)
export const isEmptyPrompt = (prompt) => !prompt || Object.keys(prompt).length === 0
