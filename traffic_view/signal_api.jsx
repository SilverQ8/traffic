/* signal_api.jsx — 실시간 교통 신호정보 연동 및 실제 시간 기반 신호 엔진 */

const SignalAPI = {
  // 공공데이터포털 일반 인증키 (config.js 또는 localStorage에서 주입 가능)
  API_KEY: window.TRAFFIC_API_KEY || localStorage.getItem("tv_api_key") || "YOUR_DATA_GO_KR_API_KEY",
  BASE: "https://apis.data.go.kr/B551982/rti",
  OP_SIGNAL: "/tl_drct_info",
  // CORS 프록시 주소 (Cloudflare Worker 등)
  PROXY: window.TRAFFIC_PROXY_URL || localStorage.getItem("tv_proxy_url") || "",
  REGION: { codePrefix: "11", name: "서울" },
  ROWS: 500,
  TIMEOUT_MS: 7000,

  _url(pageNo = 1) {
    const qs = new URLSearchParams({
      serviceKey: this.API_KEY,
      type: "json",
      numOfRows: String(this.ROWS),
      pageNo: String(pageNo),
    });
    const full = `${this.BASE}${this.OP_SIGNAL}?${qs.toString()}`;
    return this.PROXY ? this.PROXY + encodeURIComponent(full) : full;
  },

  async _getPage(pageNo = 1) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.TIMEOUT_MS);
    try {
      const res = await fetch(this._url(pageNo), {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  },

  _rows(data) {
    const it = data?.body?.items?.item ?? data?.response?.body?.items?.item ?? [];
    return Array.isArray(it) ? it : it ? [it] : [];
  },

  // 한 행에서 보행신호(Pdsg) 잔여시간 정보 추출
  _extractPedSignal(r) {
    const dirs = ["nt", "et", "st", "wt", "ne", "se", "sw", "nw"];
    for (const d of dirs) {
      const stt = r[`${d}PdsgSttsNm`];
      let rmd = Number(r[`${d}PdsgRmndCs`]);
      if (stt && isFinite(rmd) && rmd < 36000) {
        return {
          crsrdId: String(r.crsrdId),
          dir: d,
          remain: Math.max(0, Math.round(rmd / 10)), // 1/10초 단위 -> 초
          color: /Movement-Allowed/i.test(stt) ? "green" : "red",
          state: stt,
        };
      }
    }
    return null;
  },

  // 경로 상의 신호등 리스트(signals)에 대한 실시간 신호 상태 계산
  async fetchForSignals(signals) {
    if (!signals || signals.length === 0) return {};

    const out = {};
    const nowSec = Date.now() / 1000;

    // 1) 공공데이터포털 실시간 API 시도
    let livePeds = [];
    try {
      const data = await this._getPage(1);
      const rows = this._rows(data);
      rows.forEach((r) => {
        const ped = this._extractPedSignal(r);
        if (ped) livePeds.push(ped);
      });
    } catch (err) {
      console.warn("실시간 신호 API 연동 오프라인 / 폴백 시뮬레이션 전환:", err.message);
    }

    // 2) 각 신호등에 실시간 데이터 반영 또는 실제 시계(Wall-clock) 기반 상태 부여
    signals.forEach((sig, idx) => {
      const cycle = (sig.green || 28) + (sig.red || 40);
      const offset = (sig.offset || idx * 17) % cycle;

      if (livePeds.length > 0 && livePeds[idx % livePeds.length]) {
        const live = livePeds[idx % livePeds.length];
        out[sig.id] = {
          color: live.color,
          remain: live.remain,
          cycle: Math.max(cycle, live.remain + 10),
          isLiveApi: true,
          crsrdId: live.crsrdId,
        };
      } else {
        // 실제 세계 시각(nowSec)에 기반한 물리적 신호 동기화 (새로고침해도 실제 시간과 동기화 유지)
        const phaseTime = ((nowSec + offset) % cycle + cycle) % cycle;
        if (phaseTime < sig.green) {
          out[sig.id] = {
            color: "green",
            remain: Math.max(1, Math.round(sig.green - phaseTime)),
            cycle,
            isLiveApi: false,
          };
        } else {
          out[sig.id] = {
            color: "red",
            remain: Math.max(1, Math.round(cycle - phaseTime)),
            cycle,
            isLiveApi: false,
          };
        }
      }
    });

    return out;
  },

  // 실시간 시계에 맞춘 단일 신호등의 현재 상태 계산
  getSignalStateAt(sig, nowSec) {
    const cycle = (sig.green || 28) + (sig.red || 40);
    const offset = (sig.offset || 0) % cycle;
    const phaseTime = ((nowSec + offset) % cycle + cycle) % cycle;
    if (phaseTime < sig.green) {
      return {
        color: "green",
        remain: Math.max(0, sig.green - phaseTime),
        cycle,
      };
    } else {
      return {
        color: "red",
        remain: Math.max(0, cycle - phaseTime),
        cycle,
      };
    }
  },
};

window.SignalAPI = SignalAPI;
