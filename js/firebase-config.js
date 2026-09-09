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
      const url = `${this.dbUrl}/lstm_history/logs.json?orderBy="$key"&limitToLast=25`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      if (data && typeof data === 'object' && !data.error) {
        const sortedKeys = Object.keys(data).sort();
        const records = sortedKeys
          .map(k => data[k])
          .filter(r => r && (r.soil_moisture !== undefined || r.atmospheric_temp !== undefined || r.humidity !== undefined));
        
        if (records.length > 0 && this.callbacks.onHistoryLoaded) {
          this.callbacks.onHistoryLoaded(records);
        }
      }
    } catch (err) {
      console.warn('[Firebase] History logs fetch notice:', err.message);
    }
  },

  async fetchLatestTelemetry() {
    try {
      // 1. Coba ambil dari /latest_telemetry.json (Instant Realtime, zero index rules needed)
      const liveRes = await fetch(`${this.dbUrl}/latest_telemetry.json`);
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        if (liveData && typeof liveData === 'object' && liveData.soil_moisture !== undefined) {
          this.setConnected(true);
          if (this.callbacks.onTelemetry) {
            this.callbacks.onTelemetry(liveData, liveData.timestamp_unix || 'latest');
          }
          return;
        }
      }

      // 2. Fallback query jika latest_telemetry belum ada
      const url = `${this.dbUrl}/lstm_history/logs.json?orderBy="$key"&limitToLast=1`;
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && typeof data === 'object' && !data.error) {
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const latestKey = keys[0];
          const record = data[latestKey];
          this.setConnected(true);
          if (this.callbacks.onTelemetry) {
            this.callbacks.onTelemetry(record, latestKey);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[Firebase] Telemetry fetch notice:', err.message);
      this.setConnected(false);
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

  setConnected(status) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange(status);
      }
    }
  }
};

window.FirebaseConnector = FirebaseConnector;
