import { useSettings } from "../context/SettingsContext"
import "./Settings.css"

// 설정 항목 정의. 항목을 추가하려면 여기에 넣고,
// SettingsContext의 DEFAULT_SETTINGS와 index.css의 data-* 규칙도 같이 추가하면 돼요.
const OPTIONS = [
  {
    key: "theme",
    label: "테마",
    choices: [
      { value: "system", label: "시스템 설정 따르기" },
      { value: "light", label: "라이트" },
      { value: "dark", label: "다크" },
    ],
  },
  {
    key: "font",
    label: "글꼴",
    desc: "타자 연습 문장과 이야기 본문에 쓰는 글꼴이에요.",
    choices: [
      { value: "sans", label: "고딕" },
      { value: "serif", label: "명조" },
    ],
  },
  {
    key: "typingSize",
    label: "타자 글자 크기",
    choices: [
      { value: "small", label: "작게" },
      { value: "medium", label: "보통" },
      { value: "large", label: "크게" },
    ],
  },
]

// 설정 페이지 (/settings). 바꾸는 즉시 적용되고 브라우저에 저장돼요.
const Settings = () => {
  const { settings, updateSetting } = useSettings()

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">설정</h1>
      </header>

      <div className="settings">
        {OPTIONS.map((option) => (
          <section key={option.key} className="settings-row">
            <div>
              <h2 className="settings-label">{option.label}</h2>
              {option.desc && <p className="settings-desc">{option.desc}</p>}
            </div>
            <div className="seg" role="radiogroup" aria-label={option.label}>
              {option.choices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={settings[option.key] === choice.value}
                  className={`seg-btn${settings[option.key] === choice.value ? " on" : ""}`}
                  onClick={() => updateSetting(option.key, choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* 글꼴/크기를 바꿨을 때 바로 확인할 수 있는 미리보기 */}
        <section className="settings-preview">
          <p className="settings-desc">미리보기</p>
          <p className="settings-sample">죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를,</p>
        </section>
      </div>
    </div>
  )
}

export default Settings
