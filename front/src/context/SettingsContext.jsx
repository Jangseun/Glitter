import { createContext, useContext, useEffect, useState } from "react"

// 앱 전체 설정 (테마, 글꼴, 타자 글자 크기).
//
// [Context를 쓰는 이유]
// 설정은 TopBar, 설정 화면 등 여러 컴포넌트가 같이 읽고 바꿔요.
// props로 일일이 넘기는 대신 Context에 넣어두면, 어느 컴포넌트에서든 useSettings()로 바로 꺼내 쓸 수 있어요.
//
// [화면에 적용되는 방식]
// 설정 값을 <html> 태그의 data-* 속성으로 붙이면, index.css가 그 속성을 보고 색/글꼴 변수를 바꿔요.
//   theme: "system" → 속성 없음 / "light" → data-theme="light" / "dark" → data-theme="dark"
//   font: "sans" → 속성 없음 / "serif" → data-font="serif"
//   typingSize: "medium" → 속성 없음 / "small", "large" → data-typing-size="..."

const STORAGE_KEY = "glitter:settings" // index.html의 미리 적용 스크립트와 같은 키

const DEFAULT_SETTINGS = {
  theme: "system",
  font: "sans",
  typingSize: "medium",
}

const loadSettings = () => {
  try {
    // 저장된 값이 일부만 있어도(새 설정 항목이 추가된 경우) 기본값과 합쳐서 빈 칸이 없게 해요.
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const SettingsContext = createContext(null)

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(loadSettings)

  // 설정이 바뀔 때마다: 1) <html> 속성에 반영 2) localStorage에 저장
  // (useEffect는 화면을 그린 "뒤"에 실행되는데, 처음 접속 때는 index.html 스크립트가 미리 적용해둬서 깜빡이지 않아요)
  useEffect(() => {
    const root = document.documentElement
    setAttr(root, "theme", settings.theme === "system" ? null : settings.theme)
    setAttr(root, "font", settings.font === "serif" ? "serif" : null)
    setAttr(root, "typingSize", settings.typingSize === "medium" ? null : settings.typingSize)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // 저장이 막힌 환경이면 이번 접속에서만 적용돼요
    }
  }, [settings])

  // 설정 하나만 바꾸기. updateSetting("theme", "dark")
  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }))

  return <SettingsContext.Provider value={{ settings, updateSetting }}>{children}</SettingsContext.Provider>
}

// 값이 null이면 속성을 지우고, 아니면 붙여요. (dataset.typingSize → data-typing-size 로 자동 변환돼요)
const setAttr = (el, key, value) => {
  if (value === null) delete el.dataset[key]
  else el.dataset[key] = value
}

// eslint/oxlint의 "컴포넌트 파일에선 컴포넌트만 export" 규칙 때문에 경고가 날 수 있지만,
// Provider와 짝이 되는 hook은 같은 파일에 두는 게 찾기 쉬워서 같이 둬요.
// eslint-disable-next-line react/only-export-components
export const useSettings = () => useContext(SettingsContext)
