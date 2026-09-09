/**
 * FIREBASE REALTIME DATABASE CLIENT & CONNECTOR
 * Connects directly to project: https://irigasi-mikro-cabai-311b1-default-rtdb.asia-southeast1.firebasedatabase.app/
 */

const FirebaseConnector = {
  dbUrl: 'https://irigasi-mikro-cabai-311b1-default-rtdb.asia-southeast1.firebasedatabase.app',
  isConnected: false,
  eventSource: null,
  pollTimer: null,
  callbacks: {
    onTelemetry: null,
    onPrediction: null,
    onStatusChange: null,
    onHistoryLoaded: null
  },

  init(onTelemetry, onPrediction, onStatusChange, onHistoryLoaded) {
    this.callbacks.onTelemetry = onTelemetry;
    this.callbacks.onPrediction = onPrediction;
    this.callbacks.onStatusChange = onStatusChange;
    this.callbacks.onHistoryLoaded = onHistoryLoaded;
    this.startListening();
  },

  startListening() {
    console.log('[Firebase] Connecting to Realtime Database...', this.dbUrl);
    
    // First fetch
    this.fetchHistoricalLogs();
    this.fetchLatestTelemetry();
    this.fetchLatestPrediction();

    // Polling fallback every 3.5 seconds
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.fetchLatestTelemetry();
      this.fetchLatestPrediction();
    }, 3500);

    // Refresh history logs every 30 seconds
    setInterval(() => {
      this.fetchHistoricalLogs();
    }, 30000);
  },

  async fetchHistoricalLogs() {
    try {
      // Menggunakan shallow=true agar Firebase tidak meminta indexOn rules
      const shallowRes = await fetch(`${this.dbUrl}/lstm_history/logs.json?shallow=true`);
      if (!shallowRes.ok) return;
      
      const keysObj = await shallowRes.json();
      if (!keysObj || typeof keysObj !== 'object') return;

      const sortedKeys = Object.keys(keysObj).sort();
      const recentKeys = sortedKeys.slice(-25); // Ambil 25 log sensor terbaru

      // Fetch detail tiap key secara paralel
      const records = await Promise.all(
        recentKeys.map(k => 
          fetch(`${this.dbUrl}/lstm_history/logs/${k}.json`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      );

      const validRecords = records.filter(r => 
        r && typeof r === 'object' && 
        (r.soil_moisture !== undefined || r.atmospheric_temp !== undefined || r.humidity !== undefined)
      );

      if (validRecords.length > 0 && this.callbacks.onHistoryLoaded) {
        this.callbacks.onHistoryLoaded(validRecords);
      }
    } catch (err) {
      console.warn('[Firebase] History logs fetch notice:', err.message);
    }
  },

  lastKnownUnixTs: null,
  lastDataArrivalTs: 0,

  async fetchLatestTelemetry() {
    try {
      // 1. Coba ambil dari /latest_telemetry.json (Instant Realtime, zero index rules needed)
      const liveRes = await fetch(`${this.dbUrl}/latest_telemetry.json`);
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        if (liveData && typeof liveData === 'object' && liveData.soil_moisture !== undefined) {
          const nowSec = Math.floor(Date.now() / 1000);
          const dataUnix = liveData.timestamp_unix || (liveData.timestamp ? Math.floor(new Date(liveData.timestamp).getTime() / 1000) : 0);
          
          const isNewPacket = (this.lastKnownUnixTs === null || dataUnix > this.lastKnownUnixTs);
          if (isNewPacket) {
            this.lastKnownUnixTs = dataUnix;
            this.lastDataArrivalTs = Date.now();
          }

          const ageSec = Math.abs(nowSec - dataUnix);
          const timeSinceArrival = (Date.now() - this.lastDataArrivalTs) / 1000;
          // Perangkat dianggap aktif/nyala jika paket baru tiba dalam kurun waktu <= 15 detik
          const isFresh = (timeSinceArrival <= 15) && (ageSec <= 30);

          const meta = {
            ageSec: Math.min(ageSec, Math.round(timeSinceArrival)),
            timeSinceArrival: Math.round(timeSinceArrival),
            lastSeen: liveData.timestamp || (dataUnix ? new Date(dataUnix * 1000).toLocaleTimeString() : '-'),
            data: liveData
          };

          this.setConnected(isFresh, meta);

          if (this.callbacks.onTelemetry) {
            this.callbacks.onTelemetry(liveData, liveData.timestamp_unix || 'latest', isFresh, meta);
          }
          return;
        }
      }
      this.setConnected(false, { ageSec: 9999, lastSeen: '-' });
    } catch (err) {
      console.warn('[Firebase] Telemetry fetch notice:', err.message);
      this.setConnected(false, { ageSec: 9999, lastSeen: '-' });
    }
  },

  async fetchLatestPrediction() {
    try {
      const url = `${this.dbUrl}/AI_Prediction.json`;
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (data && this.callbacks.onPrediction) {
          this.callbacks.onPrediction(data);
        }
      }
    } catch (err) {
      console.warn('[Firebase] Prediction fetch notice:', err.message);
    }
  },

  async sendActuatorCommand(pumpState, solenoidState, autoMode) {
    try {
      const url = `${this.dbUrl}/control_state.json`;
      const payload = {
        pump: pumpState ? "ON" : "OFF",
        solenoid: solenoidState ? "OPEN" : "CLOSE",
        auto_mode: autoMode ? 1 : 0,
        updated_at: new Date().toISOString()
      };
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('[Firebase] Control state updated successfully:', payload);
    } catch (err) {
      console.error('[Firebase] Failed to write actuator state:', err);
    }
  },

  setConnected(status, meta = {}) {
    this.isConnected = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status, meta);
    }
  }
};

window.FirebaseConnector = FirebaseConnector;
