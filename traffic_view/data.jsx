/* data.jsx — Real-world Geo calculations, OSRM Walking Route, Safety Speed Recommendation */

// 기본 보행 속도 (m/s) — 현실적이고 안전한 보행 기준
const BASE_SPEED = 1.15;  // 편안한 보행 (~4.1 km/h)
const SPEED_MIN = 0.80;   // 천천히 보행 (~2.9 km/h)
const SPEED_MAX = 1.35;   // 빠른 걸음 (~4.9 km/h, 안전을 위해 뛰지 않는 범위로 제한)

// 하버사인 공식: 두 위경도 사이의 거리 (미터)
function getDistance(c1, c2) {
  if (!c1 || !c2) return 0;
  const lat1 = c1[0], lon1 = c1[1];
  const lat2 = c2[0], lon2 = c2[1];
  const R = 6371000; // 지구 반지름 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 방위각 (도 단위 0~360)
function getBearing(c1, c2) {
  const lat1 = (c1[0] * Math.PI) / 180;
  const lon1 = (c1[1] * Math.PI) / 180;
  const lat2 = (c2[0] * Math.PI) / 180;
  const lon2 = (c2[1] * Math.PI) / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// 경로 좌표 리스트의 총 누적 거리 (미터)
function totalPolylineDistance(coords) {
  if (!coords || coords.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    dist += getDistance(coords[i - 1], coords[i]);
  }
  return dist;
}

// 경로 상에서 특정 거리(d 미터) 지점의 좌표 및 해당 세그먼트 인덱스 반환
function coordAtDistance(coords, d) {
  if (!coords || coords.length === 0) return [37.5665, 126.9780];
  if (coords.length === 1 || d <= 0) return coords[0];

  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = getDistance(coords[i - 1], coords[i]);
    if (acc + seg >= d) {
      const t = seg > 0 ? (d - acc) / seg : 0;
      const lat = coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t;
      const lng = coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t;
      return [lat, lng];
    }
    acc += seg;
  }
  return coords[coords.length - 1];
}

// OSRM Public Foot API를 이용한 실제 보행자 경로 탐색
async function fetchWalkingRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Route HTTP " + res.status);
    const json = await res.json();
    if (!json.routes || json.routes.length === 0) throw new Error("경로를 찾을 수 없음");

    const route = json.routes[0];
    // GeoJSON coordinates는 [lon, lat] 순서이므로 [lat, lon]으로 변환
    const coords = route.geometry.coordinates.map((pt) => [pt[1], pt[0]]);
    const totalDist = route.distance;
    const duration = route.duration;
    const steps = route.legs?.[0]?.steps || [];

    // 경로 상의 횡단보도/교차로 신호등 노드 추출
    const signals = extractSignalsFromRoute(coords, steps, totalDist);

    return {
      coords,
      totalDist: Math.round(totalDist),
      duration: Math.round(duration),
      signals,
    };
  } catch (err) {
    console.warn("OSRM 길찾기 실패, 직선 경로로 대체:", err);
    // 폴백: 시작점과 끝점을 잇는 직선 및 가상 웨이포인트
    return fallbackRoute(start, end);
  }
}

// 경로 상에서 신호등 지점 생성 (스텝별 회전 지점 또는 120~180m 간격)
function extractSignalsFromRoute(coords, steps, totalDist) {
  const signals = [];
  let sigIdx = 1;

  // 1) 횡단보도/교차로 스텝을 기반으로 지점 수집
  let accDist = 0;
  steps.forEach((st, idx) => {
    accDist += st.distance;
    // 약 70m 이상 떨어진 주요 교차점이나 방향 전환 지점
    if (accDist > 60 && accDist < totalDist - 50) {
      // 100m 이상 간격 유지
      const lastSig = signals[signals.length - 1];
      if (!lastSig || accDist - lastSig.d >= 110) {
        const pt = coordAtDistance(coords, accDist);
        const crossLanes = [2, 4, 6, 8][sigIdx % 4];
        signals.push({
          id: `sig_${sigIdx}`,
          name: st.name && st.name.trim().length > 0 ? `${st.name} 교차로` : `신호등 ${sigIdx}구역`,
          coord: pt,
          d: Math.round(accDist),
          cross: `왕복 ${crossLanes}차로`,
          crossLanes,
          // 횡단보도를 안전하게 건너는 데 필요한 최소 시간 (1m당 약 1초 + 여유 5초)
          minCrossTime: Math.max(14, crossLanes * 3 + 6),
          green: 26 + (sigIdx % 3) * 4,
          red: 36 + (sigIdx % 4) * 6,
          offset: (sigIdx * 17) % 60,
        });
        sigIdx++;
      }
    }
  });

  // 신호등이 너무 적을 경우 거리 기반으로 보충 (150m 간격)
  if (signals.length < 2 && totalDist > 200) {
    let d = 120;
    while (d < totalDist - 60 && signals.length < 5) {
      const pt = coordAtDistance(coords, d);
      signals.push({
        id: `sig_${sigIdx}`,
        name: `보행자 신호등 ${sigIdx}`,
        coord: pt,
        d: Math.round(d),
        cross: "왕복 4차로",
        crossLanes: 4,
        minCrossTime: 18,
        green: 28,
        red: 40,
        offset: (sigIdx * 19) % 60,
      });
      d += 160;
      sigIdx++;
    }
  }

  return signals;
}

// 오프라인/오류 시 직선 폴백 경로
function fallbackRoute(start, end) {
  const dist = getDistance([start.lat, start.lng], [end.lat, end.lng]);
  const coords = [
    [start.lat, start.lng],
    [(start.lat + end.lat) / 2 + 0.0003, (start.lng + end.lng) / 2 - 0.0002],
    [end.lat, end.lng],
  ];
  const signals = [
    {
      id: "sig_1",
      name: "진입로 횡단보도",
      coord: coordAtDistance(coords, dist * 0.35),
      d: Math.round(dist * 0.35),
      cross: "왕복 4차로",
      crossLanes: 4,
      minCrossTime: 18,
      green: 28,
      red: 38,
      offset: 5,
    },
    {
      id: "sig_2",
      name: "중앙 교차로",
      coord: coordAtDistance(coords, dist * 0.72),
      d: Math.round(dist * 0.72),
      cross: "왕복 6차로",
      crossLanes: 6,
      minCrossTime: 22,
      green: 25,
      red: 45,
      offset: 24,
    },
  ];
  return {
    coords,
    totalDist: Math.round(dist),
    duration: Math.round(dist / BASE_SPEED),
    signals,
  };
}

// 안전 속도 추천 알고리즘 (Safe Green Wave)
// 횡단보도 횡단에 필요한 최소 시간(minCrossTime)을 보장하여 절대 무리한 진입이나 뛰기를 권장하지 않음
function recommendSafeSpeed(distAhead, sig, now, realState) {
  if (distAhead <= 0) {
    return { speed: BASE_SPEED, hint: "유지", advice: "신호를 확인하고 안전하게 건너세요", safeToCross: true };
  }

  const cycle = (sig.green || 30) + (sig.red || 40);
  const minCrossTime = sig.minCrossTime || 16; // 안전 횡단 소요 시간 (초)

  // 현재 신호 상태 파악 (실시간 데이터 우선, 없으면 시뮬레이션 계산)
  let currentColor = "red";
  let currentRemain = 0;

  if (realState && realState[sig.id]) {
    currentColor = realState[sig.id].color;
    currentRemain = realState[sig.id].remain;
  } else {
    const p = ((now + (sig.offset || 0)) % cycle + cycle) % cycle;
    if (p < sig.green) {
      currentColor = "green";
      currentRemain = sig.green - p;
    } else {
      currentColor = "red";
      currentRemain = cycle - p;
    }
  }

  // 바로 코앞(6m 이내)에 도달했을 때
  if (distAhead <= 6) {
    if (currentColor === "green") {
      if (currentRemain >= minCrossTime) {
        return {
          speed: BASE_SPEED,
          hint: "안전 횡단",
          advice: `초록불 (${Math.round(currentRemain)}초 남음). 안전하게 건너세요.`,
          safeToCross: true,
          color: "green",
        };
      } else {
        // 초록불이지만 잔여 시간이 부족하여 건너다 빨간불로 바뀔 위험이 있는 경우 (안전 최우선!)
        return {
          speed: 0,
          hint: "무리한 횡단 금지",
          advice: `잔여시간 부족 (${Math.round(currentRemain)}초). 멈춰서 다음 신호를 기다리세요.`,
          safeToCross: false,
          color: "red",
        };
      }
    } else {
      return {
        speed: 0,
        hint: "대기",
        advice: `빨간불 대기 중 (${Math.round(currentRemain)}초 후 보행 가능).`,
        safeToCross: false,
        color: "red",
      };
    }
  }

  // 다가가는 도중: 정상 보행 속도로 걸었을 때 도착 예상 시간
  const normalEta = distAhead / BASE_SPEED;

  // 다음 유효한 초록불 윈도우 계산
  // 도착 시점에 (초록불 남은 시간 >= minCrossTime)을 충족해야 안전 진입 가능!
  let bestSpeed = BASE_SPEED;
  let hint = "유지";
  let advice = "보통 속도로 편안하게 걸어가세요.";
  let safeToCross = true;

  // 현재 초록불인 경우
  if (currentColor === "green") {
    // 지금 켜진 초록불에 여유 있게 도달할 수 있는지 확인
    const remainWhenArrive = currentRemain - normalEta;
    if (remainWhenArrive >= minCrossTime) {
      // 일반 속도로 가도 안전하게 통과 가능
      bestSpeed = BASE_SPEED;
      hint = "유지";
      advice = "현재 걸음 속도를 유지하면 초록불에 건널 수 있어요.";
    } else if (remainWhenArrive < minCrossTime && remainWhenArrive > 0) {
      // 지금 속도로 가면 아슬아슬하게 도착해서 건너다 빨간불이 됨!
      // 서두르라고 하지 않고, 여유롭게 걸어서 다음 신호를 맞추도록 안내
      bestSpeed = SPEED_MIN;
      hint = "천천히";
      advice = "신호가 곧 바뀌니 천천히 걸어 다음 초록불을 맞추세요.";
      safeToCross = false;
    } else {
      // 도달 전에 빨간불로 바뀜 -> 빨간불이 끝나고 다음 초록불이 켜질 때 도달하도록 계산
      const timeToNextGreen = currentRemain; // 현재 초록불 끝날 때까지 + 빨간불 지속 시간
      const nextGreenStart = currentRemain + (sig.red || 40);
      const targetArrive = nextGreenStart + 3; // 초록불 켜지고 3초 뒤 도달 목표
      const neededSpeed = distAhead / targetArrive;
      if (neededSpeed >= SPEED_MIN && neededSpeed <= BASE_SPEED) {
        bestSpeed = neededSpeed;
        hint = "천천히";
        advice = "걸음을 조금 늦추면 다음 초록불에 바로 건널 수 있어요.";
      } else {
        bestSpeed = BASE_SPEED;
        hint = "유지";
        advice = "다음 신호 대기를 위해 안정적으로 걸으세요.";
      }
    }
  } else {
    // 현재 빨간불인 경우: 빨간불이 끝나는 시점(currentRemain)에 맞춰 도달할 수 있는지
    const timeToGreen = currentRemain;
    if (normalEta >= timeToGreen + 2 && normalEta <= timeToGreen + (sig.green || 30) - minCrossTime) {
      // 현재 속도로 가면 초록불 시작 2초 뒤 ~ 안전 시간 이내에 도달!
      bestSpeed = BASE_SPEED;
      hint = "유지";
      advice = "도착할 즈음 초록불로 바뀌어 바로 건널 수 있어요.";
    } else if (normalEta < timeToGreen) {
      // 너무 빨리 가면 빨간불 앞에서 멈춰 서서 기다려야 함 -> 천천히 걷기 추천
      const slowSpeed = Math.max(SPEED_MIN, distAhead / (timeToGreen + 2));
      bestSpeed = slowSpeed;
      hint = "천천히";
      advice = "발걸음을 늦추면 빨간불 대기 없이 바로 통과할 수 있어요.";
    } else {
      bestSpeed = BASE_SPEED;
      hint = "유지";
      advice = "안전 속도를 유지하며 이동하세요.";
    }
  }

  return {
    speed: bestSpeed,
    hint,
    advice,
    safeToCross,
    etaIn: distAhead / bestSpeed,
  };
}

// Nominatim OpenStreetMap 한국 주소/장소 검색
async function searchPlaces(query) {
  if (!query || query.trim().length === 0) return [];
  const q = encodeURIComponent(query.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=kr&limit=5&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { "Accept-Language": "ko" } });
    if (!res.ok) throw new Error("Search failed");
    const list = await res.json();
    return list.map((item) => ({
      name: item.display_name.split(",")[0],
      sub: item.display_name.split(",").slice(1, 4).join(",").trim(),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (e) {
    console.warn("Nominatim 검색 실패:", e);
    return [];
  }
}

// 좌표로부터 주소 가져오기 (역지오코딩)
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "ko" } });
    if (!res.ok) throw new Error("Reverse geocode failed");
    const json = await res.json();
    const addr = json.address || {};
    const city = addr.city || addr.province || addr.state || "";
    const borough = addr.borough || addr.suburb || addr.district || "";
    const road = addr.road || addr.quarter || addr.neighbourhood || "";
    const shortName = `${city} ${borough} ${road}`.trim() || json.display_name.split(",")[0];
    return shortName;
  } catch (e) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// IP 기반 대략적 초기 위치 (권한 승인 전 또는 GPS 수신 전 기본값)
async function fetchApproxLocation() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("ipapi failed");
    const j = await res.json();
    if (j.latitude && j.longitude) {
      return { lat: j.latitude, lng: j.longitude, city: j.city || "내 위치" };
    }
  } catch (e) {}
  return null;
}

// 포맷 헬퍼 함수
const mmss = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}초`;
};
const kmh = (ms) => (ms * 3.6).toFixed(1);
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`);

Object.assign(window, {
  BASE_SPEED, SPEED_MIN, SPEED_MAX,
  getDistance, getBearing, totalPolylineDistance, coordAtDistance,
  fetchWalkingRoute, recommendSafeSpeed, searchPlaces, reverseGeocode, fetchApproxLocation,
  mmss, kmh, fmtDist,
});
