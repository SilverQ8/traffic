# 🚦 TrafficView (신호등 길찾기)

> **"초록불에 맞춰 걷고, 대기 없이 안전하게!"**  
> 공공데이터 실시간 신호 연동 및 보행자 안전 속도 추천 스마트 내비게이션

![TrafficView Preview](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📖 프로젝트 소개

**TrafficView**는 보행자가 횡단보도 신호 대기 없이 목적지까지 걸어갈 수 있도록 **보행 속도를 추천(Green Wave)**하고, 실제 스마트폰 GPS를 기반으로 **실시간 횡단보도 신호등 상태와 음성 안내**를 제공하는 반응형 모바일 웹 내비게이션 서비스입니다.

---

## ✨ 핵심 기능

1. **실시간 위치 기반 인터랙티브 지도 (Leaflet + CartoDB)**
   - 전국 실제 도로망 및 보행로 표시
   - 실시간 보행 경로(Polyline), 횡단보도 신호등 카운트다운 뱃지, 사용자 GPS 펄스 마커 렌더링
2. **지능형 안전 보행 속도 추천 알고리즘 (Safe Green Wave)**
   - 다음 신호등의 초록불 시작 및 종료 시점을 계산하여 편안하고 안전한 보행 속도(0.8 ~ 1.35 m/s) 권장
   - **무리한 횡단 방지 안전 로직**: 횡단보도 차로 수에 비례한 최소 안전 횡단 시간 미만으로 초록불이 남은 경우, 무리하게 건너지 않도록 **"신호 잔여 시간 부족! 멈춰서 다음 신호 대기"** 강력 경고
3. **전국 실제 목적지 검색 & 도보 길찾기 (Nominatim & OSRM)**
   - 주소 및 장소명 실시간 검색
   - OSRM 보행자 라우팅 엔진을 통한 실제 횡단보도/교차로 신호등 노드 자동 추출
4. **실제 스마트폰 GPS 연동 & 실내 모의 주행 토글**
   - **실제 GPS 모드**: `navigator.geolocation.watchPosition`을 이용한 실시간 보행 추적
   - **모의 주행 (실내) 모드**: 실내 테스트를 위한 가상 보행 시뮬레이션 (1×, 2×, 4× 배속 지원)
   - **Screen Wake Lock**: 길 안내 중 스마트폰 화면 꺼짐 방지
5. **음성 안내 (TTS) & 햅틱 진동 피드백**
   - Web Speech API를 활용하여 횡단보도 접근 및 신호 변경 상황을 한국어 음성 및 진동으로 안내
6. **다크 모드 & 고대비 접근성(A11y) 모드**
   - 야간 눈부심 방지 다크 테마
   - 저시력자/시각장애인을 위한 고대비 흑백 및 큰 글씨 테마 지원

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3 (Vanilla), React 18, Babel Standalone
- **Map & Routing**: Leaflet.js, OpenStreetMap, CartoDB Positron/Dark, OSRM Foot Routing API
- **Search**: Nominatim OpenStreetMap Geocoding API
- **Traffic API**: 공공데이터포털(data.go.kr) 경찰청/도시교통정보센터 신호제어기 API
- **Proxy**: Cloudflare Workers (CORS Bypass)

---

## 🚀 실행 방법

별도의 복잡한 빌드 과정 없이 정적 웹 서버로 즉시 실행할 수 있습니다.

```bash
# 저장소 클론
git clone https://github.com/YOUR_USERNAME/traffic.git
cd traffic

# 간단한 로컬 웹 서버 실행
python -m http.server 8080 --directory traffic_view
```

브라우저에서 `http://localhost:8080/traffic_view.html`로 접속하세요.
스마트폰에서 테스트하려면 같은 Wi-Fi에 연결된 후 `http://[PC_IP_주소]:8080/traffic_view.html`로 접속하시면 실제 GPS와 음성 안내를 바로 체험할 수 있습니다.
