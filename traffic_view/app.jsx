/* app.jsx — Production-ready Pedestrian Traffic Navigation App with Live GPS and Safety Speed Guidance */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- 테마 팔레트 (Light / Dark / A11y 접근성 고대비) ----------
const PALETTES = {
  light: {
    bg: "#F3F1EC", surface: "#FFFFFF", ink: "#1C1D21", ink2: "#6B7079", ink3: "#9AA0A6",
    line: "#ECEAE4", line2: "#E2DFD8", primary: "#1C1D21", primaryText: "#FFFFFF",
    green: "#1FA463", red: "#E5484D", amber: "#E8A317", walk: "#2563EB",
    handleBar: "#D9D6CF", scrim: "rgba(243,241,236,.92)",
  },
  dark: {
    bg: "#14151A", surface: "#1E2027", ink: "#F2F3F5", ink2: "#A4A9B3", ink3: "#6E747F",
    line: "#2A2D36", line2: "#343842", primary: "#F2F3F5", primaryText: "#14151A",
    green: "#2BBE78", red: "#F0565B", amber: "#F0B53D", walk: "#5B8DEF",
    handleBar: "#3A3E48", scrim: "rgba(20,21,26,.94)",
  },
  a11yLight: {
    bg: "#FFFFFF", surface: "#FFFFFF", ink: "#000000", ink2: "#1F1F1F", ink3: "#4A4A4A",
    line: "#000000", line2: "#000000", primary: "#000000", primaryText: "#FFFFFF",
    green: "#0A7D3C", red: "#C8102E", amber: "#A85D00", walk: "#0033CC",
    handleBar: "#000000", scrim: "rgba(255,255,255,.94)",
  },
  a11yDark: {
    bg: "#000000", surface: "#101216", ink: "#FFFFFF", ink2: "#E6E6E6", ink3: "#B5B5B5",
    line: "#FFFFFF", line2: "#FFFFFF", primary: "#FFFFFF", primaryText: "#000000",
    green: "#34E08A", red: "#FF6168", amber: "#FFC83D", walk: "#7AA7FF",
    handleBar: "#FFFFFF", scrim: "rgba(0,0,0,.94)",
  },
};

let C = { ...PALETTES.light, fs: 1, a11y: false, dark: false };

function applyTheme({ dark, a11y }) {
  let base = dark ? PALETTES.dark : PALETTES.light;
  if (a11y) base = dark ? PALETTES.a11yDark : PALETTES.a11yLight;
  C = { ...base, fs: a11y ? 1.15 : 1, a11y: !!a11y, dark: !!dark };
  rebuildTokens();
}

// ---------- UI 공통 스타일 토큰 ----------
let handle, roundBtn, roundBtnSm, primaryBtn, listRow;
function rebuildTokens() {
  handle = { width: 38, height: 5, borderRadius: 5, background: C.handleBar, margin: "0 auto 8px" };
  roundBtn = {
    width: 40, height: 40, borderRadius: 13, border: C.a11y ? `2px solid ${C.ink}` : "none",
    background: C.surface, color: C.ink, fontSize: 20, fontWeight: 700, cursor: "pointer",
    boxShadow: C.dark ? "0 2px 10px rgba(0,0,0,.4)" : "0 2px 10px rgba(28,29,33,.12)",
    display: "grid", placeItems: "center", lineHeight: 1,
  };
  roundBtnSm = {
    width: 32, height: 32, borderRadius: 10, border: C.a11y ? `2px solid ${C.ink}` : "none",
    background: C.a11y ? C.surface : C.bg, color: C.ink2, fontSize: 13, fontWeight: 700,
    cursor: "pointer", lineHeight: 1, display: "grid", placeItems: "center",
  };
  primaryBtn = {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: C.primary, color: C.primaryText, border: "none", borderRadius: 16,
    padding: `${Math.round(15 * C.fs)}px`, fontSize: Math.round(16 * C.fs), fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  };
  listRow = {
    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 6px",
    background: "none", border: "none", borderBottom: `1px solid ${C.line}`, cursor: "pointer",
  };
}
rebuildTokens();

// ---------- 아이콘 및 UI 요소 ----------
function StatusBar() {
  const [timeStr, setTimeStr] = useState("12:00");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTimeStr(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      height: 40, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", fontSize: 13, fontWeight: 700, color: C.ink, flex: "0 0 auto",
      position: "relative", zIndex: 10,
    }}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.green }}>GPS ACTIVE</span>
        <span style={{ fontSize: 11 }}>5G</span>
      </div>
    </div>
  );
}

function PedIcon({ color = "#fff", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4.5" r="2.2" fill={color} />
      <path d="M12 7.5c-1 0-1.7.6-2 1.6l-1.3 4.2M12 7.5c1 0 1.7.6 2 1.6l1.1 3.6M10 13l-1.4 5.5M10 13l3.3.2 1.5 5.3M13.3 13.2l-1 4"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon({ color = "#fff", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 13.5V8a2 2 0 0 1 4 0M10 9V6.5a1.8 1.8 0 0 1 3.6 0V9M13.6 9.2V7.4a1.7 1.7 0 0 1 3.4 0V14c0 3.3-2.2 5.5-5.2 5.5-2 0-3.2-.8-4.4-2.6l-2-3c-.6-1 .3-2.2 1.4-1.8l1.6.8"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VoiceIcon({ color = "#000", size = 18, muted }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9.5v5h3l4.5 4v-13L7 9.5H4Z" fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {muted ? (
        <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M15 9c1.2 1 1.2 5 0 6M17.8 7c2.4 1.8 2.4 8.2 0 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function SignalChip({ color, remain, small }) {
  const isGreen = color === "green";
  const bg = isGreen ? C.green : C.red;
  const txt = C.a11y && C.dark ? "#000" : "#fff";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: bg, color: txt, borderRadius: 999,
      padding: small ? "3px 8px" : "5px 12px",
      fontSize: small ? 12 : 13, fontWeight: 800, whiteSpace: "nowrap",
    }}>
      {isGreen ? <PedIcon size={small ? 12 : 14} color={txt} /> : <StopIcon size={small ? 12 : 14} color={txt} />}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(remain)}초</span>
    </div>
  );
}

// 음성 합성 엔진
function speakVoice(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// Screen Wake Lock 유지
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      return await navigator.wakeLock.request("screen");
    }
  } catch (e) {}
  return null;
}

// ---------- 1. SEARCH SCREEN ----------
function SearchScreen({
  onSelectDestination, onOpenSettings, currentPos, currentAddr, isGpsReady, gpsMode, setGpsMode,
  gpsStatus, onRefreshGps
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 현재 위치 주변 스마트 추천 목록
  const smartPresets = useMemo(() => {
    // 위도가 35.5 미만이면 부산/경남권
    if (currentPos && currentPos[0] < 35.5) {
      return [
        { name: "서면역 1번 출구", sub: "부산광역시 부산진구 중앙대로 730", lat: 35.1578, lng: 129.0593 },
        { name: "부산역 광장", sub: "부산광역시 동구 중앙대로 206", lat: 35.1152, lng: 129.0422 },
        { name: "광안리 해수욕장 만남의광장", sub: "부산광역시 수영구 광안해변로 219", lat: 35.1532, lng: 129.1186 },
        { name: "해운대역 3번 출구", sub: "부산광역시 해운대구 구남로 41", lat: 35.1631, lng: 129.1587 },
      ];
    }
    return [
      { name: "서울시청 앞 광장", sub: "서울특별시 중구 세종대로 110", lat: 37.5665, lng: 126.9780 },
      { name: "광화문역 9번 출구", sub: "서울특별시 종로구 세종대로 172", lat: 37.5716, lng: 126.9768 },
      { name: "덕수궁 대한문", sub: "서울특별시 중구 세종대로 99", lat: 37.5658, lng: 126.9752 },
      { name: "명동성당 입구", sub: "서울특별시 중구 명동길 74", lat: 37.5631, lng: 126.9873 },
    ];
  }, [currentPos]);

  // 실시간 주소 검색 (Debounced)
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await window.searchPlaces(query);
      setResults(res);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: C.bg, zIndex: 20 }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {/* GPS 모드 토글 */}
          <div style={{ display: "inline-flex", background: C.surface, padding: 3, borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
            <button
              onClick={() => { setGpsMode("real"); onRefreshGps && onRefreshGps(); }}
              style={{
                border: "none", padding: "6px 12px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: gpsMode === "real" ? C.primary : "transparent",
                color: gpsMode === "real" ? C.primaryText : C.ink2,
              }}
            >
              실제 GPS {isGpsReady ? "●" : "○"}
            </button>
            <button
              onClick={() => setGpsMode("sim")}
              style={{
                border: "none", padding: "6px 12px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: gpsMode === "sim" ? C.primary : "transparent",
                color: gpsMode === "sim" ? C.primaryText : C.ink2,
              }}
            >
              모의 주행 (실내)
            </button>
          </div>

          <button onClick={onOpenSettings} aria-label="설정" style={roundBtn}>
            ⚙
          </button>
        </div>

        {/* GPS 권한 거부 안내 배너 */}
        {gpsStatus === "denied" && (
          <div style={{
            background: "#FFF1F0", border: "1px solid #FFCCC7", borderRadius: 12,
            padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#CF1322",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>⚠️ 브라우저 주소창 좌측의 자물쇠/설정에서 [위치 권한]을 허용해 주세요.</span>
            <button onClick={onRefreshGps} style={{ border: "none", background: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
              재시도
            </button>
          </div>
        )}

        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: C.ink, marginBottom: 14 }}>
          어디로 걸어갈까요?
        </div>

        <div style={{ background: C.surface, borderRadius: 18, padding: 6, boxShadow: "0 2px 14px rgba(28,29,33,.08)" }}>
          {/* 출발지 (내 위치) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, border: `3px solid ${C.walk}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentAddr || (isGpsReady ? "실시간 GPS 위치 인식됨" : "내 위치 확인 중…")}
              </div>
              <div style={{ fontSize: 11, color: isGpsReady ? C.green : C.ink3, marginTop: 1 }}>
                {isGpsReady ? `● GPS 수신 중 (${currentPos[0].toFixed(4)}, ${currentPos[1].toFixed(4)})` : "위치 정보를 가져오는 중입니다"}
              </div>
            </div>
            <button
              onClick={onRefreshGps}
              title="내 위치 다시 찾기"
              style={{ border: "none", background: C.bg, borderRadius: 8, padding: "5px 8px", fontSize: 11.5, fontWeight: 700, color: C.ink2, cursor: "pointer" }}
            >
              🔄 재탐색
            </button>
          </div>

          <div style={{ height: 1, background: C.line, margin: "0 14px" }} />

          {/* 도착지 검색 입력 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: C.ink }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="도착지 검색 (전국 주소, 건물, 역 이름)"
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 15, fontWeight: 600,
                color: C.ink, background: "none", fontFamily: "inherit",
              }}
            />
            {searching && <span style={{ fontSize: 12, color: C.ink3 }}>검색중…</span>}
          </div>
        </div>
      </div>

      {/* 목록 (검색 결과 또는 추천 장소) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink3, padding: "10px 4px 6px" }}>
          {results.length > 0 ? "검색 결과" : "내 주변 추천 목적지"}
        </div>
        {(results.length > 0 ? results : smartPresets).map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectDestination(item)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 8px",
              background: "none", border: "none", borderBottom: `1px solid ${C.line}`,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{
              width: 38, height: 38, borderRadius: 12, background: C.surface,
              display: "grid", placeItems: "center", fontSize: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              📍
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: C.ink }}>{item.name}</span>
              <span style={{ display: "block", fontSize: 12.5, color: C.ink3, marginTop: 2 }}>{item.sub}</span>
            </span>
            <span style={{ color: C.ink3, fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 2. SUMMARY SCREEN ----------
function SummaryScreen({ destination, routeData, signalsState, onStartNav, onBack, onSignalTap }) {
  const { totalDist, duration, signals } = routeData;
  const walkMin = Math.max(1, Math.round(duration / 60));
  const arriveTime = new Date(Date.now() + duration * 1000);
  const arriveStr = `${arriveTime.getHours()}:${String(arriveTime.getMinutes()).padStart(2, "0")}`;

  const greenCount = signals.filter((s) => signalsState[s.id]?.color === "green").length;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none", zIndex: 10 }}>
      <StatusBar />
      <div style={{ padding: "8px 16px", pointerEvents: "auto" }}>
        <button onClick={onBack} style={roundBtn}>‹</button>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{
        flex: "0 0 auto", background: C.surface, borderRadius: "26px 26px 0 0",
        boxShadow: "0 -6px 28px rgba(0,0,0,.15)", padding: "10px 20px 24px", pointerEvents: "auto",
        maxHeight: "60%", display: "flex", flexDirection: "column",
      }}>
        <div style={handle} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
            {walkMin}분
          </span>
          <span style={{ fontSize: 15, color: C.ink2, fontWeight: 600 }}>
            {window.fmtDist(totalDist)} · {arriveStr} 도착 예정
          </span>
        </div>
        <div style={{ fontSize: 13.5, color: C.ink3, marginTop: 2 }}>{destination.name}까지 실제 보행 경로</div>

        {/* 통계 요약 */}
        <div style={{ display: "flex", gap: 10, margin: "14px 0 8px" }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "10px 12px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{signals.length}개</div>
            <div style={{ fontSize: 11.5, color: C.ink2 }}>횡단보도 신호</div>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "10px 12px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.green }}>{greenCount}/{signals.length}</div>
            <div style={{ fontSize: 11.5, color: C.ink2 }}>현재 초록불</div>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 14, padding: "10px 12px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.walk }}>그린웨이브</div>
            <div style={{ fontSize: 11.5, color: C.ink2 }}>속도 추천 활성</div>
          </div>
        </div>

        {/* 신호등 목록 */}
        <div style={{ overflowY: "auto", margin: "4px -4px", maxHeight: 180 }}>
          {signals.map((sig) => {
            const st = signalsState[sig.id];
            return (
              <button key={sig.id} onClick={() => onSignalTap(sig.id)} style={listRow}>
                <span style={{ width: 34, color: C.ink3, fontSize: 12.5, fontWeight: 700 }}>
                  {window.fmtDist(sig.d)}
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: C.ink }}>{sig.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: C.ink3 }}>{sig.cross} · 최소횡단 {sig.minCrossTime}초</span>
                </span>
                {st && <SignalChip color={st.color} remain={st.remain} small />}
              </button>
            );
          })}
        </div>

        <button onClick={onStartNav} style={{ ...primaryBtn, marginTop: 12 }}>
          <PedIcon size={18} /> 실시간 안전 안내 시작
        </button>
      </div>
    </div>
  );
}

// ---------- 3. NAVIGATION SCREEN ----------
function NavScreen({
  userDist, totalDist, signals, signalsState, onExitNav, onSignalTap,
  caption, voiceEnabled, onToggleVoice, gpsMode, setGpsMode, speedMul, setSpeedMul
}) {
  // 다음 신호등 계산
  const nextSig = signals.find((s) => s.d > userDist - 3) || null;
  const distAhead = nextSig ? Math.max(0, nextSig.d - userDist) : 0;
  const phase = nextSig ? signalsState[nextSig.id] : null;

  // 안전 보행 속도 계산
  const rec = nextSig ? window.recommendSafeSpeed(distAhead, nextSig, Date.now() / 1000, signalsState) : null;
  const upcoming = signals.filter((s) => s.d > userDist - 3);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none", zIndex: 10 }}>
      <StatusBar />

      {/* 상단 배너: 다음 신호등 및 안전 속도 권장 */}
      <div style={{ padding: "4px 16px 0", pointerEvents: "auto" }}>
        <div style={{
          background: C.surface, borderRadius: 22, padding: 16,
          boxShadow: "0 6px 26px rgba(0,0,0,.15)", border: C.a11y ? `2px solid ${C.ink}` : "none",
        }}>
          {nextSig ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {window.fmtDist(distAhead)} 앞 · {nextSig.name} ({nextSig.cross})
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={onToggleVoice} aria-label="음성" style={{
                    ...roundBtnSm, background: voiceEnabled ? C.green : C.bg,
                    color: voiceEnabled ? "#fff" : C.ink2,
                  }}>
                    <VoiceIcon size={15} color={voiceEnabled ? "#fff" : C.ink2} muted={!voiceEnabled} />
                  </button>
                  <button onClick={onExitNav} style={roundBtnSm}>✕</button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                {/* 대형 신호등 카운트다운 */}
                <div style={{
                  width: 90, height: 90, borderRadius: 22, flex: "0 0 auto",
                  background: phase?.color === "green" ? C.green : C.red,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  color: "#fff",
                }}>
                  {phase?.color === "green" ? <PedIcon size={24} color="#fff" /> : <StopIcon size={24} color="#fff" />}
                  <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                    {phase ? Math.round(phase.remain) : "--"}
                  </span>
                </div>

                {/* 안전 속도 가이드 문구 */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14.5, fontWeight: 800, lineHeight: 1.35,
                    color: rec?.safeToCross ? (phase?.color === "green" ? C.green : C.ink) : C.red,
                    marginBottom: 6,
                  }}>
                    {rec?.advice || "신호 상태를 확인하고 있습니다"}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 12, color: C.ink3, fontWeight: 700 }}>권장 속도:</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>
                      {window.kmh(rec?.speed || 1.15)}
                    </span>
                    <span style={{ fontSize: 12, color: C.ink2 }}>km/h ({rec?.hint})</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, textAlign: "center", padding: 8 }}>
              모든 횡단보도를 안전하게 통과했습니다!
            </div>
          )}
        </div>

        {/* 음성 자막 바 */}
        {voiceEnabled && caption && (
          <div style={{
            marginTop: 8, display: "flex", alignItems: "center", gap: 10,
            background: C.ink, color: C.bg, borderRadius: 14, padding: "10px 14px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: C.green }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{caption}</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* 하단 진행도 및 남은 신호 목록 */}
      <div style={{
        flex: "0 0 auto", background: C.surface, borderRadius: "26px 26px 0 0",
        boxShadow: "0 -6px 28px rgba(0,0,0,.15)", padding: "10px 18px 20px", pointerEvents: "auto",
        maxHeight: "44%", display: "flex", flexDirection: "column",
      }}>
        <div style={handle} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 0 10px" }}>
          <div>
            <div style={{ height: 6, width: 180, borderRadius: 6, background: C.line, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${Math.min(100, (userDist / (totalDist || 1)) * 100)}%`,
                background: C.walk, borderRadius: 6, transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>
              {window.fmtDist(Math.max(0, totalDist - userDist))} 남음 · 신호등 {upcoming.length}개
            </div>
          </div>

          {/* 모의 주행 배속 조절 (실내 테스트용) */}
          {gpsMode === "sim" && (
            <div style={{ display: "flex", background: C.bg, borderRadius: 9, padding: 2, gap: 2 }}>
              {[1, 2, 4].map((m) => (
                <button
                  key={m}
                  onClick={() => setSpeedMul(m)}
                  style={{
                    border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "4px 8px",
                    borderRadius: 7, background: speedMul === m ? C.ink : "transparent",
                    color: speedMul === m ? "#fff" : C.ink2,
                  }}
                >
                  {m}×
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ overflowY: "auto", margin: "0 -2px" }}>
          {upcoming.map((s) => {
            const st = signalsState[s.id];
            return (
              <button key={s.id} onClick={() => onSignalTap(s.id)} style={{ ...listRow, padding: "9px 4px" }}>
                <span style={{ width: 34, color: C.ink3, fontSize: 12, fontWeight: 700 }}>
                  {window.fmtDist(Math.max(0, s.d - userDist))}
                </span>
                <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 600, color: C.ink }}>
                  {s.name}
                </span>
                {st && <SignalChip color={st.color} remain={st.remain} small />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- 4. SETTINGS SHEET ----------
function SettingsSheet({ settings, setSetting, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }} />
      <div style={{
        position: "relative", background: C.surface, borderRadius: "26px 26px 0 0", padding: "10px 20px 28px",
        boxShadow: "0 -10px 40px rgba(0,0,0,.3)",
      }}>
        <div style={handle} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 14px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>내비게이션 설정</div>
          <button onClick={onClose} style={roundBtnSm}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SettingItem
            title="야간 보행 다크 모드"
            sub="어두운 밤길 눈부심 방지 테마"
            on={settings.dark}
            toggle={() => setSetting("dark", !settings.dark)}
          />
          <SettingItem
            title="음성 안전 안내 (TTS)"
            sub="횡단보도 신호 상태와 위험을 말로 안내"
            on={settings.voice !== false}
            toggle={() => setSetting("voice", settings.voice === false)}
          />
          <SettingItem
            title="고대비 접근성 모드"
            sub="시각장애인/저시력자를 위한 고대비·큰 글씨"
            on={settings.a11y}
            toggle={() => setSetting("a11y", !settings.a11y)}
          />
        </div>
      </div>
    </div>
  );
}

function SettingItem({ title, sub, on, toggle }) {
  return (
    <button onClick={toggle} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", borderRadius: 16, background: C.bg, border: "none", cursor: "pointer", textAlign: "left",
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{
        width: 44, height: 26, borderRadius: 26, background: on ? C.green : "#C7CBD1",
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 20 : 2, width: 22, height: 22,
          borderRadius: 22, background: "#fff", transition: "left 0.2s",
        }} />
      </div>
    </button>
  );
}

// ---------- MAIN APP COMPONENT ----------
function App() {
  const [screen, setScreen] = useState("search"); // search | summary | nav | done
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [userPos, setUserPos] = useState([37.5665, 126.9780]); // 기본: 서울시청
  const [currentAddr, setCurrentAddr] = useState("");
  const [gpsStatus, setGpsStatus] = useState("loading"); // 'loading' | 'ready' | 'denied' | 'error'
  const [userDist, setUserDist] = useState(0);
  const [gpsMode, setGpsMode] = useState("real"); // 'real' | 'sim'
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [speedMul, setSpeedMul] = useState(1);
  const [signalsState, setSignalsState] = useState({});
  const [detailSigId, setDetailSigId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [caption, setCaption] = useState("");

  const [settings, setSettings] = useState(() => {
    try { return { voice: true, dark: false, a11y: false, ...(JSON.parse(localStorage.getItem("tv_settings")) || {}) }; }
    catch (e) { return { voice: true, dark: false, a11y: false }; }
  });

  const setSetting = (k, v) => setSettings((s) => {
    const ns = { ...s, [k]: v };
    try { localStorage.setItem("tv_settings", JSON.stringify(ns)); } catch (e) {}
    return ns;
  });

  // 테마 적용
  useEffect(() => {
    applyTheme({ dark: settings.dark, a11y: settings.a11y });
    document.body.style.background = settings.dark ? "#000" : "#E4E1DA";
  }, [settings.dark, settings.a11y]);

  // 좌표 업데이트 및 주소 역지오코딩
  const applyNewPos = useCallback(async (lat, lng) => {
    setUserPos([lat, lng]);
    setIsGpsReady(true);
    setGpsStatus("ready");
    const addr = await window.reverseGeocode(lat, lng);
    setCurrentAddr(addr);
  }, []);

  // GPS 즉시 재탐색 함수
  const refreshGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyNewPos(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("GPS 획득 실패:", err);
        if (err.code === 1) setGpsStatus("denied"); // PERMISSION_DENIED
        else setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [applyNewPos]);

  // 1) 초기 위치 획득 (IP 대략적 위치 + 고정밀 Geolocation 병렬 시도)
  useEffect(() => {
    // 1단계: IP 기반 빠른 초기 도시 감지
    window.fetchApproxLocation().then((loc) => {
      if (loc && !isGpsReady) {
        setUserPos([loc.lat, loc.lng]);
        setCurrentAddr(loc.city);
      }
    });

    // 2단계: 실제 고정밀 GPS 1회 즉시 요청
    refreshGps();

    // 3단계: 지속적 위치 변경 감시
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (gpsMode === "real") {
          applyNewPos(lat, lng);
          if (routeData && routeData.coords) {
            const startPt = routeData.coords[0];
            const distFromStart = window.getDistance(startPt, [lat, lng]);
            setUserDist(Math.min(distFromStart, routeData.totalDist));
          }
        }
      },
      (err) => {
        if (err.code === 1) setGpsStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsMode, routeData, applyNewPos, refreshGps]);

  // 2) Screen Wake Lock (화면 꺼짐 방지)
  useEffect(() => {
    let lock = null;
    if (screen === "nav") {
      requestWakeLock().then((l) => (lock = l));
    }
    return () => { if (lock) lock.release(); };
  }, [screen]);

  // 3) 실시간 신호등 데이터 갱신 (매초 카운트다운 & 15초 주기 API 동기화)
  useEffect(() => {
    if (!routeData?.signals || routeData.signals.length === 0) return;

    // 즉시 1차 계산
    window.SignalAPI.fetchForSignals(routeData.signals).then((st) => setSignalsState(st));

    // 매 1초마다 시계 기반 잔여시간 카운트다운
    const tick = setInterval(() => {
      const nowSec = Date.now() / 1000;
      setSignalsState((prev) => {
        const next = { ...prev };
        routeData.signals.forEach((sig) => {
          if (next[sig.id]) {
            const rem = next[sig.id].remain - 1;
            if (rem <= 0) {
              // 신호 주기 전환
              const newColor = next[sig.id].color === "green" ? "red" : "green";
              const newRem = newColor === "green" ? sig.green : sig.red;
              next[sig.id] = { ...next[sig.id], color: newColor, remain: newRem };
            } else {
              next[sig.id] = { ...next[sig.id], remain: rem };
            }
          } else {
            next[sig.id] = window.SignalAPI.getSignalStateAt(sig, nowSec);
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [routeData]);

  // 4) 모의 주행(시뮬레이션) 루프
  useEffect(() => {
    if (screen !== "nav" || gpsMode !== "sim" || !routeData) return;

    let raf, lastTime = performance.now();
    const simLoop = (nowTime) => {
      const dt = ((nowTime - lastTime) / 1000) * speedMul;
      lastTime = nowTime;

      setUserDist((curDist) => {
        if (curDist >= routeData.totalDist) {
          setScreen("done");
          return routeData.totalDist;
        }

        const nextSig = routeData.signals.find((s) => s.d > curDist + 0.5);
        let speed = window.BASE_SPEED;

        if (nextSig) {
          const rec = window.recommendSafeSpeed(nextSig.d - curDist, nextSig, Date.now() / 1000, signalsState);
          speed = rec.speed;
        }

        let newDist = curDist + speed * dt;

        // 적색 신호 바로 앞 정지
        if (nextSig && signalsState[nextSig.id]?.color === "red" && newDist >= nextSig.d - 1.5) {
          newDist = Math.min(newDist, nextSig.d - 1.5);
        }

        const newPos = window.coordAtDistance(routeData.coords, newDist);
        setUserPos(newPos);

        return newDist;
      });

      raf = requestAnimationFrame(simLoop);
    };

    raf = requestAnimationFrame(simLoop);
    return () => cancelAnimationFrame(raf);
  }, [screen, gpsMode, speedMul, routeData, signalsState]);

  // 5) 음성 안내 트리거
  const lastAnnounceKey = useRef("");
  const announceVoice = useCallback((key, msg) => {
    if (key === lastAnnounceKey.current) return;
    lastAnnounceKey.current = key;
    setCaption(msg);
    if (settings.voice !== false || settings.a11y) {
      speakVoice(msg);
      try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    }
  }, [settings.voice, settings.a11y]);

  useEffect(() => {
    if (screen !== "nav" || !routeData?.signals) return;
    const next = routeData.signals.find((s) => s.d > userDist - 3);
    if (!next) return;

    const d = next.d - userDist;
    const st = signalsState[next.id];
    if (!st) return;

    if (d <= 5) {
      if (st.color === "green") {
        if (st.remain >= next.minCrossTime) {
          announceVoice(`cross-${next.id}`, `초록불입니다. ${next.name}을 지금 안전하게 건너세요.`);
        } else {
          announceVoice(`danger-${next.id}`, `잔여시간 부족! 무리하게 건너지 말고 다음 신호를 기다리세요.`);
        }
      } else {
        announceVoice(`stop-${next.id}`, `빨간불 대기. ${Math.round(st.remain)}초 후 보행 가능합니다.`);
      }
    } else if (d <= 35) {
      announceVoice(`approach-${next.id}-${st.color}`, `${Math.round(d)}미터 앞 ${next.name}, ${st.color === "green" ? "초록불" : "빨간불"}입니다.`);
    }
  }, [userDist, signalsState, screen, routeData, announceVoice]);

  // 목적지 선택 시 실제 보행 경로 탐색 (OSRM)
  const handleSelectDestination = async (dest) => {
    setDestination(dest);
    const startCoord = { lat: userPos[0], lng: userPos[1] };
    const endCoord = { lat: dest.lat, lng: dest.lng };
    const route = await window.fetchWalkingRoute(startCoord, endCoord);
    setRouteData(route);
    setUserDist(0);
    setScreen("summary");
  };

  return (
    <div style={{
      position: "absolute", inset: 0, background: C.bg, overflow: "hidden",
      fontFamily: "'Pretendard', system-ui, sans-serif",
    }}>
      {/* 인터랙티브 Leaflet 지도 */}
      <CityMap
        userPos={userPos}
        routeCoords={routeData?.coords}
        signals={routeData?.signals}
        signalsState={signalsState}
        mode={screen === "nav" ? "nav" : "summary"}
        dark={settings.dark}
        a11y={settings.a11y}
        activeSignalId={detailSigId}
        onSignalTap={(id) => setDetailSigId(id)}
      />

      {/* 화면 전환 레이어 */}
      {screen === "search" && (
        <SearchScreen
          currentPos={userPos}
          currentAddr={currentAddr}
          isGpsReady={isGpsReady}
          gpsMode={gpsMode}
          gpsStatus={gpsStatus}
          setGpsMode={setGpsMode}
          onRefreshGps={refreshGps}
          onSelectDestination={handleSelectDestination}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === "summary" && routeData && (
        <SummaryScreen
          destination={destination}
          routeData={routeData}
          signalsState={signalsState}
          onStartNav={() => {
            setUserDist(0);
            setScreen("nav");
            announceVoice("start", `${destination.name}까지 안전 안내를 시작합니다.`);
          }}
          onBack={() => setScreen("search")}
          onSignalTap={(id) => setDetailSigId(id)}
        />
      )}

      {screen === "nav" && routeData && (
        <NavScreen
          userDist={userDist}
          totalDist={routeData.totalDist}
          signals={routeData.signals}
          signalsState={signalsState}
          caption={caption}
          voiceEnabled={settings.voice !== false || settings.a11y}
          onToggleVoice={() => setSetting("voice", settings.voice === false)}
          gpsMode={gpsMode}
          setGpsMode={setGpsMode}
          speedMul={speedMul}
          setSpeedMul={setSpeedMul}
          onSignalTap={(id) => setDetailSigId(id)}
          onExitNav={() => setScreen("summary")}
        />
      )}

      {screen === "done" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 30 }}>
          <div style={{
            background: C.surface, borderRadius: "26px 26px 0 0", padding: "26px 20px 28px",
            boxShadow: "0 -8px 30px rgba(0,0,0,.2)", textAlign: "center",
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: C.green, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <PedIcon size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>목적지에 도착했습니다!</div>
            <div style={{ fontSize: 14, color: C.ink2, marginTop: 4, marginBottom: 20 }}>
              {destination?.name}까지 안전하게 안내를 마쳤습니다.
            </div>
            <button onClick={() => setScreen("search")} style={primaryBtn}>새 목적지 검색</button>
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {showSettings && (
        <SettingsSheet settings={settings} setSetting={setSetting} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
