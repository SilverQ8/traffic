/* map.jsx — Real-world interactive Leaflet map component with live signals and GPS tracker */

const { useEffect, useRef } = React;

const SIG_COLORS = {
  green: "#1FA463",
  red: "#E5484D",
  amber: "#E8A317",
};

function CityMap({
  userPos,
  routeCoords,
  signals,
  signalsState,
  mode,
  onSignalTap,
  activeSignalId,
  dark,
  a11y,
  userHeading = 0,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const signalMarkersRef = useRef({});

  // 1) 지도 초기화 (최초 1회)
  useEffect(() => {
    if (!mapRef.current) return;

    const initialPos = userPos || [37.5665, 126.9780]; // 기본 서울시청
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomSnap: 0.5,
    }).setView(initialPos, 16);

    // CartoDB 타일 레이어 (깔끔한 벡터 스타일)
    const tileUrl = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const tile = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(map);
    tileLayerRef.current = tile;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2) 테마(다크/라이트) 변경 시 타일 전환
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileUrl = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    tileLayerRef.current.setUrl(tileUrl);
  }, [dark]);

  // 3) 보행 경로(Polyline) 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routeCoords && routeCoords.length > 1) {
      // 밑바탕 외곽선 + 보행자 라인
      const routeLine = L.polyline(routeCoords, {
        color: dark ? "#3B82F6" : "#2563EB",
        weight: 6,
        opacity: 0.88,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routePolylineRef.current = routeLine;

      if (mode === "summary") {
        map.fitBounds(routeLine.getBounds(), {
          paddingTopLeft: [40, 80],
          paddingBottomRight: [40, 260],
          maxZoom: 17,
        });
      }
    }
  }, [routeCoords, mode, dark]);

  const hasInitialCenteredRef = useRef(false);

  // 4) 사용자 위치 마커(GPS / 모의 위치) 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPos) return;

    // 최초 유효한 GPS 위치 수신 시(또는 좌표가 서울 기본값에서 실제 위치로 갱신되었을 때) 지도 중심 이동
    const isDefault = Math.abs(userPos[0] - 37.5665) < 0.001 && Math.abs(userPos[1] - 126.9780) < 0.001;
    if (!hasInitialCenteredRef.current && !isDefault) {
      hasInitialCenteredRef.current = true;
      map.setView(userPos, 16.5, { animate: true });
    }

    const iconHtml = `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background: #2563EB; opacity: 0.28; animation: tvpulse 1.8s ease-out infinite;"></div>
        <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: rotate(${userHeading}deg);">
          <div style="position: absolute; top: -5px; left: 3px; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 6px solid #2563EB;"></div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: "custom-user-marker",
      html: iconHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userPos, { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(userPos);
      userMarkerRef.current.setIcon(icon);
    }

    if (mode === "nav") {
      map.panTo(userPos, { animate: true, duration: 0.8 });
    }
  }, [userPos, mode, userHeading]);

  const handleCenterUser = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current && userPos) {
      mapInstanceRef.current.setView(userPos, 17, { animate: true });
    }
  };

  // 5) 신호등 마커 업데이트 (초록/빨강 상태 & 카운트다운 뱃지)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !signals) return;

    const currentMarkers = signalMarkersRef.current;

    signals.forEach((sig) => {
      const st = signalsState ? signalsState[sig.id] : null;
      const isGreen = st ? st.color === "green" : false;
      const remain = st ? Math.round(st.remain) : "--";
      const colorHex = isGreen ? SIG_COLORS.green : SIG_COLORS.red;
      const isActive = sig.id === activeSignalId;

      const html = `
        <div style="
          display: flex; flex-direction: column; align-items: center; cursor: pointer;
          transform: translate(-50%, -100%);
        ">
          <div style="
            display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;
            background: ${colorHex}; color: #fff; border-radius: 14px;
            font-size: 11px; font-weight: 800; font-family: Pretendard, sans-serif;
            box-shadow: 0 3px 10px rgba(0,0,0,0.25);
            border: ${isActive ? "2px solid #fff" : "1px solid rgba(255,255,255,0.4)"};
            transition: all 0.25s ease;
          ">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #fff;"></span>
            <span>${remain}s</span>
          </div>
          <div style="
            width: 0; height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid ${colorHex};
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `signal-marker-${sig.id}`,
        html,
        iconSize: [0, 0],
      });

      if (!currentMarkers[sig.id]) {
        const marker = L.marker(sig.coord, { icon: customIcon, zIndexOffset: 500 }).addTo(map);
        marker.on("click", () => onSignalTap && onSignalTap(sig.id));
        currentMarkers[sig.id] = marker;
      } else {
        currentMarkers[sig.id].setIcon(customIcon);
        currentMarkers[sig.id].setLatLng(sig.coord);
      }
    });

    // 제거된 신호등 마커 정리
    const sigIdSet = new Set(signals.map((s) => s.id));
    Object.keys(currentMarkers).forEach((id) => {
      if (!sigIdSet.has(id)) {
        map.removeLayer(currentMarkers[id]);
        delete currentMarkers[id];
      }
    });
  }, [signals, signalsState, activeSignalId]);

  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <div
        ref={mapRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />
      {/* 내 위치로 이동 플로팅 버튼 */}
      <button
        onClick={handleCenterUser}
        title="내 위치로 이동"
        style={{
          position: "absolute",
          right: 16,
          bottom: mode === "nav" ? 220 : 120,
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: dark ? "#1E2027" : "#FFFFFF",
          color: "#2563EB",
          border: dark ? "1px solid #343842" : "1px solid #ECEAE4",
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          zIndex: 15,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          transition: "bottom 0.3s ease",
        }}
      >
        🎯
      </button>
    </div>
  );
}

Object.assign(window, { CityMap, SIG_COLORS });
