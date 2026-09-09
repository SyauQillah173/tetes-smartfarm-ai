/**
 * FIREBASE REALTIME DATABASE CLIENT & CONNECTOR
 * Connects directly to project: https://irigasi-mikro-cabai-311b1-default-rtdb.asia-southeast1.firebasedatabase.app/
 */

const FirebaseConnector = {
  dbUrl: 'https://irigasi-mikro-cabai-311b1-default-rtdb.asia-southeast1.firebasedatabase.app',
  isConnected: false,
  eventSource: null,
  pollTimer: null,
  lastKnownUnixTs: null,
  lastDataArrivalTs: 0,
  lastSessionStartUnix: null,
  lastHardwareUptime: 0,

  callbacks: {
    onTelemetry: null,
    onPrediction: null,
    onStatusChange: null,
    onHistoryLoaded: null,
    onHardwareSession: null
  },

  init(onTelemetry, onPrediction, onStatusChange, onHistoryLoaded, onHardwareSession) {
    this.callbacks.onTelemetry = onTelemetry;
    this.callbacks.onPrediction = onPrediction;
    this.callbacks.onStatusChange = onStatusChange;
    this.callbacks.onHistoryLoaded = onHistoryLoaded;
    this.callbacks.onHardwareSession = onHardwareSession;
    this.startListening();
  },

  startListening() {
    console.log('[Firebase] Connecting to Realtime Database...', this.dbUrl);
    
    // First immediate fetches
    this.fetchDeviceSession();
    this.fetchHistoricalLogs();
    this.fetchLatestTelemetry();
    this.fetchLatestPrediction();

    // Fast polling every 3.5 seconds
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.fetchLatestTelemetry();
      this.fetchLatestPrediction();
    }, 3500);

    // Refresh history logs and stream session analysis every 20 seconds
    setInterval(() => {
      this.fetchHistoricalLogs();
      this.fetchDeviceSession();
    }, 20000);
  },

  /**
   * Fetch device_session node directly from Firebase
   */
  async fetchDeviceSession() {
    try {
      const res = await fetch(`${this.dbUrl}/device_session.json`);
      if (res.ok) {
        const session = await res.json();
        if (session && typeof session === 'object' && session.boot_unix) {
          this.lastSessionStartUnix = session.boot_unix;
          if (this.callbacks.onHardwareSession) {
            this.callbacks.onHardwareSession({
              bootUnix: session.boot_unix,
              latestUnix: session.latest_unix || Math.floor(Date.now() / 1000),
              uptimeSeconds: session.uptime_seconds || 0,
              bootDate: new Date(session.boot_unix * 1000)
            });
          }
        }
      }
    } catch (err) {
      // Non-fatal
    }
  },

  /**
   * Fetch historical logs & analyze continuous stream session start
   */
  async fetchHistoricalLogs() {
    try {
      const shallowRes = await fetch(`${this.dbUrl}/lstm_history/logs.json?shallow=true`);
      if (!shallowRes.ok) return;
      
      const keysObj = await shallowRes.json();
      if (!keysObj || typeof keysObj !== 'object') return;

      const sortedKeys = Object.keys(keysObj).sort();
      const allKeysNum = sortedKeys.map(Number).filter(n => !isNaN(n) && n > 1700000000).sort((a,b) => a - b);
      
      // Hitung awal stream aktif alat tanpa jeda (>60s)
      if (allKeysNum.length > 0) {
        let sessionStartUnix = allKeysNum[allKeysNum.length - 1];
        for (let i = allKeysNum.length - 1; i > 0; i--) {
          const diff = allKeysNum[i] - allKeysNum[i - 1];
          if (diff <= 60) {
            sessionStartUnix = allKeysNum[i - 1];
          } else {
            // Gap > 60s terdeteksi, titik ini adalah saat alat pernah dimatikan
            break;
          }
        }
        
        const latestLogUnix = allKeysNum[allKeysNum.length - 1];
        const hardwareUptimeSec = Math.max(0, latestLogUnix - sessionStartUnix);
        this.lastSessionStartUnix = sessionStartUnix;
        this.lastHardwareUptime = hardwareUptimeSec;

        const sessionPayload = {
          bootUnix: sessionStartUnix,
          latestUnix: latestLogUnix,
          uptimeSeconds: hardwareUptimeSec,
          bootDate: new Date(sessionStartUnix * 1000)
        };

        if (this.callbacks.onHardwareSession) {
          this.callbacks.onHardwareSession(sessionPayload);
        }

        // Simpan sesi ke Firebase agar klien lain langsung tahu
        this.syncDeviceSessionToFirebase(sessionStartUnix, latestLogUnix, hardwareUptimeSec);
      }

      const recentKeys = sortedKeys.slice(-25); // Ambil 25 log sensor terbaru untuk tabel

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

  async syncDeviceSessionToFirebase(bootUnix, latestUnix, uptimeSec) {
    try {
      await fetch(`${this.dbUrl}/device_session.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boot_unix: bootUnix,
          boot_time: new Date(bootUnix * 1000).toLocaleString('id-ID'),
          latest_unix: latestUnix,
          uptime_seconds: uptimeSec,
          status: 'ONLINE',
          updated_at: new Date().toISOString()
        })
      });
    } catch (e) {}
  },

  async fetchLatestTelemetry() {
    try {
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
          
          // Perangkat dianggap aktif/nyala jika paket baru tiba atau delay wajar (<=90 detik)
          const isFresh = (timeSinceArrival <= 20) || (ageSec <= 90);

          let hwUptime = 0;
          if (liveData.uptime_seconds !== undefined && Number(liveData.uptime_seconds) > 0) {
            hwUptime = Math.floor(Number(liveData.uptime_seconds));
          } else if (this.lastSessionStartUnix && this.lastSessionStartUnix > 0) {
            hwUptime = Math.max(0, dataUnix - this.lastSessionStartUnix);
          }

          const meta = {
            ageSec: Math.min(ageSec, Math.round(timeSinceArrival)),
            timeSinceArrival: Math.round(timeSinceArrival),
            lastSeen: liveData.timestamp || (dataUnix ? new Date(dataUnix * 1000).toLocaleTimeString('id-ID') : '-'),
            sessionStartUnix: this.lastSessionStartUnix,
            hardwareUptime: hwUptime,
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
