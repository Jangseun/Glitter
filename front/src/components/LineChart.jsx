import { useEffect, useRef, useState } from "react"
import "./LineChart.css"

// 성장 그래프용 꺾은선 차트 (SVG로 직접 그려요. 차트 라이브러리를 따로 설치하지 않아도 될 만큼 단순해서)
//
// data:    [{ label: "10월 27일", value: 320 }, ...]  ← 왼쪽(오래된 것) → 오른쪽(최근) 순서
// title:   차트 제목 (선이 하나뿐이라 범례 대신 제목이 "무엇을 그렸는지" 알려줘요)
// unit:    값 뒤에 붙일 단위 (예: "타", "%")
// yMin/yMax: 세로축 범위를 고정하고 싶을 때 (없으면 데이터에 맞춰 자동)
//
// [설계 원칙]
// - 2px 선 + 아주 옅은 면 채우기, 눈금선은 흐린 1px → 데이터만 눈에 띄게
// - 마우스를 올리면 세로 안내선이 가장 가까운 기록에 붙고, 말풍선에 값이 떠요 (키보드 ←/→로도 가능)
// - 숫자를 점마다 다 쓰지 않고 마지막 값만 표시 (나머지는 말풍선과 아래 표로 확인)
const PAD = { top: 16, right: 48, bottom: 28, left: 44 }
const HEIGHT = 200

const LineChart = ({ data, title, unit = "", yMin, yMax }) => {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(600)
  const [active, setActive] = useState(null) // 마우스/키보드로 가리킨 기록의 위치(index)

  // 차트 너비를 부모 영역 너비에 맞춰요.
  // ResizeObserver: 요소 크기가 바뀔 때마다 알려주는 브라우저 기능 (창 크기 조절, 화면 회전 등)
  // SVG의 viewBox로 늘리기만 하면 글자까지 같이 늘어나 버려서, 실제 픽셀 너비로 다시 그려요.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (data.length < 2) {
    return (
      // 여기도 ref를 달아야 나중에 기록이 쌓여서 그래프로 바뀔 때 너비를 알고 있어요
      <figure className="lc" ref={wrapRef}>
        <figcaption className="lc-title">{title}</figcaption>
        <p className="lc-empty">기록이 2개 이상 쌓이면 그래프가 그려져요.</p>
      </figure>
    )
  }

  // ---- 좌표 계산 ----
  const values = data.map((d) => d.value)
  const { lo, hi, ticks } = niceScale(yMin ?? Math.min(...values), yMax ?? Math.max(...values))
  const innerW = Math.max(10, width - PAD.left - PAD.right)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  // i번째 기록의 x좌표 / 값의 y좌표 (SVG는 위쪽이 0이라 값이 클수록 y가 작아져요)
  const x = (i) => PAD.left + (innerW * i) / (data.length - 1)
  const y = (v) => PAD.top + innerH * (1 - (v - lo) / (hi - lo || 1))

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ")
  // 면 채우기: 선을 따라가다가 맨 아래 기준선으로 내려와서 닫아요
  const areaPath = `${linePath} L${x(data.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`

  const last = data.length - 1
  const shown = active ?? null

  // 마우스 x위치에서 가장 가까운 기록 찾기 (선을 정확히 겨냥하지 않아도 되게)
  const handlePointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - PAD.left) / innerW) * (data.length - 1))
    setActive(Math.min(last, Math.max(0, i)))
  }

  const handleKey = (e) => {
    if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? last) - 1))
    else if (e.key === "ArrowRight") setActive((i) => Math.min(last, (i ?? last) + 1))
    else return
    e.preventDefault()
  }

  return (
    <figure className="lc" ref={wrapRef}>
      <figcaption className="lc-title">{title}</figcaption>

      <div className="lc-plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title} 그래프. 마지막 기록 ${values[last]}${unit}. 화살표 키로 기록을 하나씩 볼 수 있어요.`}
          tabIndex={0}
          onPointerMove={handlePointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
        >
          {/* 가로 눈금선 + 세로축 숫자 */}
          {ticks.map((t) => (
            <g key={t}>
              <line className="lc-grid" x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} />
              <text className="lc-axis" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}

          {/* 가로축: 첫 기록과 마지막 기록 날짜만 (다 쓰면 겹쳐서 안 읽혀요) */}
          <text className="lc-axis" x={x(0)} y={HEIGHT - 6} textAnchor="start">
            {data[0].label}
          </text>
          <text className="lc-axis" x={x(last)} y={HEIGHT - 6} textAnchor="end">
            {data[last].label}
          </text>

          <path className="lc-area" d={areaPath} />
          <path className="lc-line" d={linePath} />

          {/* 마지막 기록: 점 + 값 표시 */}
          <circle className="lc-dot" cx={x(last)} cy={y(values[last])} r={4} />
          <text className="lc-end" x={x(last) + 8} y={y(values[last])} dominantBaseline="middle">
            {values[last]}
            {unit}
          </text>

          {/* 마우스/키보드로 가리킨 기록: 세로 안내선 + 점 */}
          {shown !== null && (
            <g>
              <line className="lc-cross" x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + innerH} />
              <circle className="lc-dot" cx={x(shown)} cy={y(values[shown])} r={5} />
            </g>
          )}
        </svg>

        {/* 말풍선은 HTML로 (SVG 글자보다 배경/여백 꾸미기가 쉬워서). 값이 크게, 날짜가 작게 */}
        {shown !== null && (
          <div
            className="lc-tip"
            style={{
              left: Math.min(Math.max(x(shown), 60), width - 60),
              top: y(values[shown]) - 12,
            }}
          >
            <strong>
              {values[shown]}
              {unit}
            </strong>
            <span>{data[shown].label}</span>
          </div>
        )}
      </div>
    </figure>
  )
}

// 세로축 범위와 눈금을 "사람이 읽기 좋은 숫자"로 정해요.
// 눈금 간격을 1, 2, 5, 10, 20, 50, 100… 중에서 눈금이 4~6개쯤 나오는 값으로 골라요.
//   예) 180~362 → 간격 100 → 눈금 100, 200, 300, 400
//       90~100  → 간격 2   → 눈금 90, 92, 94, 96, 98, 100
// (133, 267처럼 3등분한 애매한 숫자는 읽기 어려워서)
const niceScale = (min, max) => {
  if (min === max) {
    min = Math.max(0, min - 10)
    max = max + 10
  }
  const rough = (max - min) / 4 // 대략 4칸
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough)
  const lo = Math.max(0, Math.floor(min / step) * step)
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 100) / 100)
  return { lo, hi, ticks }
}

export default LineChart
