/**
 * MASTER CONTROLLER & APPLICATION LOGIC
 * TETES SMARTFARM OS - INDUSTRIAL ENTERPRISE EDITION
 */

const AppState = {
  // Telemetry Sensor (Pure Live Mode - Standby until ESP32 connects)
  soilMoisture: null,
  soilMoistureRaw: null,
  soilTemp: null,
  airTemp: null,
  airHumidity: null,
  dewPoint: null,
  vpd: null,
  soilStatus: 'Standby',

  // Device Guardian & Operating Lifecycle (Online/Offline Tracking)
  isDeviceOnline: false,
  deviceOnlineSince: null,
  deviceOfflineSince: null,
  deviceUptimeSeconds: 0,
  deviceOfflineSeconds: 0,
  lastTelemetryArrival: 0,
  lastTelemetryUnix: null,
  telemetryAgeSec: 0,

  // Electrical Power & Energy SCADA (Realtime Load, Solar & Battery)
  powerSource: 'AC_GRID', // 'AC_GRID' (Listrik Langsung PLN 220V) or 'SOLAR_BATTERY' (Baterai EBT)
  powerSourceLabel: 'Listrik Langsung (PLN)',
  currentLoadWatt: 0.0,
  netPowerWatt: 0.0,
  dailyEnergyConsumedWh: 0.0,
  solarPowerWatt: 0.0,
  solarVoltage: 12.0,
  solarCurrent: 0.0,
  batterySoC: 88.0,
  solarIrradiance: 0,
  dailyCleanEnergyKWh: 0.08,
  totalCarbonSavedKg: 0.07,

  // Weather Open-Meteo
  forecastTemp: 32.0,
  rainProb: 15.0,
  rainMm: 0.0,
  etaRainHours: 99.0,

  // AI & Actuators
  aiPrediction: null,
  aiPredictionTime: 'Menunggu Prediksi',
  autoMode: true,
  pumpActive: false,
  solenoidActive: false,
  decisionText: 'Standby • Menunggu Telemetri Alat',
  reasonText: 'Sistem siap membaca data telemetri real-time dari Firebase Database.',

  // Live Actuator Timing & Benchmark Tracking
  pumpSecondsActive: 0,
  liveWaterPumpedMl: 0,
  pumpLastStartTime: null,
  pumpLastStopTime: null,
  pumpCurrentSessionSeconds: 0,

  // Soil & Water Intelligence
  soilZone: 'STANDBY',
  soilZoneTitle: 'Standby • Menunggu Data Sensor',
  soilZoneAdvice: 'Hubungkan atau nyalakan alat ESP32 untuk pembacaan lengas tanah presisi.',

  // Simulation: Completely OFF for real testing
  isSimulating: false,
  simInterval: null,
  pwaDeferredPrompt: null
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 TETES SmartFarm OS Initialized');
  initNavigationTabs();
  initPWAInstall();
  initChatAssistant();
  initSimulationEngine();
  initActuatorControls();
  initCalculatorInteractions();
  initScrollOptimization();

  // Initialize Charts
  if (window.AIAnalytics) {
    AIAnalytics.initCharts();
  }

  // Initialize Firebase connector with live telemetry, prediction, status, and history
  if (window.FirebaseConnector) {
    FirebaseConnector.init(
      (record, key, isFresh, meta) => handleFirebaseTelemetry(record, key, isFresh, meta),
      (pred) => handleFirebasePrediction(pred),
      (status, meta) => handleFirebaseStatusChange(status, meta),
      (records) => handleFirebaseHistory(records)
    );
  }

  // Real-time 1-Second Master Engine Ticker
  setInterval(() => {
    runMasterSecondTicker();
  }, 1000);

  // Periodic Solar EBT recalculation
  setInterval(() => {
    updateSolarEBTRealtime();
  }, 10000);

  // Initial UI Render
  updateAllUI();
});

/* ===================================================================
   NAVIGATION TABS (SIDEBAR)
   =================================================================== */
function initNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-item-btn');
  const sections = document.querySelectorAll('.tab-content-container');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.style.display = 'none');

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.style.display = 'flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Enable seamless page scrolling even when mouse is positioned over the sidebar
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) {
    sidebar.addEventListener('wheel', (e) => {
      window.scrollBy({
        top: e.deltaY,
        behavior: 'auto'
      });
    }, { passive: true });
  }
}

/* ===================================================================
   PWA INSTALLATION (FOR GOOGLE CHROME)
   =================================================================== */
function initPWAInstall() {
  const installBanner = document.getElementById('pwaInstallBanner');
  const installBtn = document.getElementById('btnInstallApp');
  const headerInstallBtn = document.getElementById('headerInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.pwaDeferredPrompt = e;
    if (installBanner) installBanner.style.display = 'flex';
    if (headerInstallBtn) headerInstallBtn.style.display = 'inline-flex';
    console.log('[PWA] beforeinstallprompt captured!');
  });

  async function triggerInstall() {
    if (AppState.pwaDeferredPrompt) {
      AppState.pwaDeferredPrompt.prompt();
      const { outcome } = await AppState.pwaDeferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${outcome}`);
      AppState.pwaDeferredPrompt = null;
      if (installBanner) installBanner.style.display = 'none';
      if (headerInstallBtn) headerInstallBtn.style.display = 'none';
    } else {
      alert('Untuk mengunduh / menginstal aplikasi ini via Google Chrome:\n\n1. Klik ikon titik tiga (⋮) di pojok kanan atas Chrome.\n2. Pilih "Install TETES OS" atau "Simpan dan Bagikan" -> "Instal Halaman sebagai Aplikasi".');
    }
  }

  if (installBtn) installBtn.addEventListener('click', triggerInstall);
  if (headerInstallBtn) headerInstallBtn.addEventListener('click', triggerInstall);
}

/* ===================================================================
   ACTUATOR CONTROLS (PUMP & SOLENOID)
   =================================================================== */
function initActuatorControls() {
  const btnModeAuto = document.getElementById('btnModeAuto');
  const btnModeManual = document.getElementById('btnModeManual');
  const togglePump = document.getElementById('togglePump');
  const toggleSolenoid = document.getElementById('toggleSolenoid');

  if (btnModeAuto && btnModeManual) {
    btnModeAuto.addEventListener('click', () => {
      AppState.autoMode = true;
      btnModeAuto.classList.add('active');
      btnModeManual.classList.remove('active');
      if (togglePump) togglePump.disabled = true;
      if (toggleSolenoid) toggleSolenoid.disabled = true;
      syncActuatorState();
    });

    btnModeManual.addEventListener('click', () => {
      AppState.autoMode = false;
      btnModeManual.classList.add('active');
      btnModeAuto.classList.remove('active');
      if (togglePump) togglePump.disabled = false;
      if (toggleSolenoid) toggleSolenoid.disabled = false;
      syncActuatorState();
    });
  }

  if (togglePump) {
    togglePump.addEventListener('change', (e) => {
      if (!AppState.autoMode) {
        const val = e.target.checked;
        if (!AppState.pumpActive && val) {
          AppState.pumpLastStartTime = new Date().toLocaleTimeString('id-ID') + ' WIB';
          AppState.pumpCurrentSessionSeconds = 0;
        } else if (AppState.pumpActive && !val) {
          AppState.pumpLastStopTime = new Date().toLocaleTimeString('id-ID') + ' WIB';
        }
        AppState.pumpActive = val;
        syncActuatorState();
        updateElectricalPowerCalculations();
        updateDeviceGuardianUI();
        evaluateSoilAndWaterIntelligence();
      }
    });
  }

  if (toggleSolenoid) {
    toggleSolenoid.addEventListener('change', (e) => {
      if (!AppState.autoMode) {
        AppState.solenoidActive = e.target.checked;
        syncActuatorState();
        updateElectricalPowerCalculations();
        updateDeviceGuardianUI();
      }
    });
  }
}

function syncActuatorState() {
  if (window.FirebaseConnector && !AppState.isSimulating) {
    FirebaseConnector.sendActuatorCommand(AppState.pumpActive, AppState.solenoidActive, AppState.autoMode);
  }
  updateActuatorUI();
}

/* ===================================================================
   DEVICE GUARDIAN & OPERATING LIFECYCLE (ONLINE / OFFLINE LOGIC)
   =================================================================== */
function setDeviceOnlineState(online, meta = {}) {
  const wasOnline = AppState.isDeviceOnline;
  AppState.isDeviceOnline = online;

  if (online) {
    if (!wasOnline) {
      AppState.deviceOnlineSince = new Date();
      AppState.deviceOfflineSince = null;
      AppState.deviceUptimeSeconds = 0;
      console.log('🟢 [TETES IoT] Perangkat Terdeteksi ONLINE & AKTIF');
    }
    if (meta.ageSec !== undefined) {
      AppState.telemetryAgeSec = meta.ageSec;
    }
  } else {
    if (wasOnline) {
      AppState.deviceOfflineSince = new Date();
      AppState.deviceOnlineSince = null;
      AppState.deviceOfflineSeconds = 0;
      console.log('🔴 [TETES IoT] Perangkat Terdeteksi OFFLINE / BELUM DINYALAKAN');
    }
  }
  updateElectricalPowerCalculations();
  updateDeviceGuardianUI();
}

function formatDuration(totalSec) {
  if (isNaN(totalSec) || totalSec <= 0) return '00:00:00';
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatOfflineTime(dateObj, seconds) {
  if (!dateObj) return 'Belum Pernah Dinyalakan';
  const timeStr = dateObj.toLocaleTimeString('id-ID') + ' WIB';
  if (seconds < 60) return `${timeStr} (${seconds}s lalu)`;
  if (seconds < 3600) return `${timeStr} (${Math.floor(seconds / 60)}m lalu)`;
  return `${timeStr} (${Math.floor(seconds / 3600)}j ${Math.floor((seconds % 3600) / 60)}m lalu)`;
}

function updateDeviceGuardianUI() {
  const isOnline = AppState.isDeviceOnline;

  // 1. Guardian Strip Class
  const strip = document.getElementById('deviceGuardianStrip');
  if (strip) {
    strip.className = `device-guardian-strip ${isOnline ? 'is-online' : 'is-offline'}`;
  }

  // 2. Pulse Dot
  const dot = document.getElementById('guardianPulseDot');
  if (dot) {
    dot.className = `guardian-indicator-dot ${isOnline ? 'online' : 'offline'}`;
  }

  // 3. State Title
  const title = document.getElementById('guardianDeviceStateTitle');
  if (title) {
    title.textContent = isOnline 
      ? 'ESP32 NODE 01: ONLINE & AKTIF' 
      : 'ESP32 NODE 01: OFF (ALAT BELUM DINYALAKAN)';
  }

  // 4. State Chip
  const chip = document.getElementById('guardianDeviceChip');
  if (chip) {
    chip.className = `guardian-chip ${isOnline ? 'chip-online' : 'chip-offline'}`;
    chip.innerHTML = isOnline 
      ? '<i class="fas fa-circle-check"></i> SEDANG NYALA & STREAMING' 
      : '<i class="fas fa-circle-xmark"></i> ALAT BELUM DINYALAKAN';
  }

  // 5. Subtext
  const subtext = document.getElementById('guardianSubtext');
  if (subtext) {
    subtext.textContent = isOnline 
      ? 'Perangkat fisik ESP32 aktif terhubung ke Hotspot • Telemetri dikirim tiap 5 detik ke Firebase RTDB.'
      : 'Perangkat IoT ESP32 sedang mati atau belum tersambung ke daya/WiFi. Nyalakan alat untuk streaming real-time.';
  }

  // 6. Uptime / Downtime
  const uptimeLabel = document.getElementById('guardianUptimeLabel');
  const uptimeVal = document.getElementById('guardianUptimeVal');
  if (uptimeLabel && uptimeVal) {
    if (isOnline) {
      uptimeLabel.textContent = 'Durasi Nyala (Uptime)';
      uptimeVal.textContent = formatDuration(AppState.deviceUptimeSeconds);
      uptimeVal.style.color = 'var(--tetes-green)';
    } else {
      uptimeLabel.textContent = 'Waktu Mati (Terputus Sejak)';
      uptimeVal.textContent = AppState.deviceOfflineSince 
        ? formatOfflineTime(AppState.deviceOfflineSince, AppState.deviceOfflineSeconds)
        : 'Belum Dinyalakan';
      uptimeVal.style.color = '#e11d48';
    }
  }

  // 7. Load Watt
  const loadVal = document.getElementById('guardianLoadWattVal');
  const loadSub = document.getElementById('guardianLoadWattSub');
  if (loadVal && loadSub) {
    loadVal.textContent = `${AppState.currentLoadWatt.toFixed(1)} W`;
    if (isOnline) {
      if (AppState.pumpActive && AppState.solenoidActive) {
        loadSub.textContent = 'ESP32 + Pompa + Solenoid (32.2W)';
      } else if (AppState.pumpActive) {
        loadSub.textContent = 'ESP32 (2.2W) + Pompa 12V (24W)';
      } else {
        loadSub.textContent = 'ESP32 Standby (WiFi + Sensor)';
      }
    } else {
      loadSub.textContent = 'Daya 0 W (Alat Mati)';
    }
  }

  // 8. Heartbeat
  const hbVal = document.getElementById('guardianHeartbeatVal');
  const lastSeen = document.getElementById('guardianLastSeenTime');
  if (hbVal && lastSeen) {
    if (isOnline) {
      const age = AppState.telemetryAgeSec;
      hbVal.textContent = age <= 3 ? 'Baru saja' : `${age}s lalu`;
      hbVal.style.color = 'var(--tetes-blue)';
      lastSeen.textContent = AppState.lastTelemetryUnix 
        ? `${new Date(AppState.lastTelemetryUnix * 1000).toLocaleTimeString('id-ID')} WIB`
        : 'Streaming Aktif';
    } else {
      hbVal.textContent = 'Terputus';
      hbVal.style.color = '#94a3b8';
      lastSeen.textContent = 'Menunggu Sinyal ESP32';
    }
  }

  // 9. Header Quick Indicator
  const headerPill = document.getElementById('headerDevicePill');
  const headerPulse = document.getElementById('headerDevicePulse');
  const headerText = document.getElementById('headerDeviceStatusText');
  const headerLoad = document.getElementById('headerLoadWatt');
  if (headerPill) {
    if (isOnline) {
      headerPill.style.background = '#f0fdf4';
      headerPill.style.borderColor = '#86efac';
      headerPill.style.color = '#15803d';
    } else {
      headerPill.style.background = '#fef2f2';
      headerPill.style.borderColor = '#fca5a5';
      headerPill.style.color = '#dc2626';
    }
  }
  if (headerPulse) {
    headerPulse.className = `guardian-indicator-dot ${isOnline ? 'online' : 'offline'}`;
  }
  if (headerText) {
    headerText.textContent = isOnline ? 'Alat Online & Nyala' : 'Alat OFF (Belum Nyala)';
  }
  if (headerLoad) {
    headerLoad.textContent = `${AppState.currentLoadWatt.toFixed(1)} W`;
  }

  // 10. Sidebar Status
  const sidebarStatus = document.getElementById('sidebarStatusText');
  if (sidebarStatus) {
    sidebarStatus.textContent = isOnline ? 'ESP32 Online • 5s Interval' : 'Status: Alat Belum Dinyalakan';
  }
}

/* ===================================================================
   REAL-TIME ELECTRICAL POWER SCADA CALCULATIONS (SMART DUAL-MODE)
   =================================================================== */
window.togglePowerSourceMode = function() {
  if (AppState.powerSource === 'AC_GRID') {
    AppState.powerSource = 'SOLAR_BATTERY';
    AppState.powerSourceLabel = 'Baterai & Surya EBT';
    console.log('⚡ [TETES Power] Mode Catu Daya Dialihkan: Baterai & Surya EBT');
  } else {
    AppState.powerSource = 'AC_GRID';
    AppState.powerSourceLabel = 'Listrik Langsung (PLN)';
    console.log('⚡ [TETES Power] Mode Catu Daya Dialihkan: Listrik Langsung PLN');
  }
  updateElectricalPowerCalculations();
  updateAllUI();
};

function updateElectricalPowerCalculations() {
  const esp32Watt = AppState.isDeviceOnline ? 2.2 : 0.0;
  const pumpWatt = (AppState.isDeviceOnline && AppState.pumpActive) ? 24.0 : 0.0;
  const solenoidWatt = (AppState.isDeviceOnline && AppState.solenoidActive) ? 6.0 : 0.0;

  AppState.currentLoadWatt = parseFloat((esp32Watt + pumpWatt + solenoidWatt).toFixed(1));
  AppState.netPowerWatt = parseFloat((AppState.solarPowerWatt - AppState.currentLoadWatt).toFixed(1));

  // Update DOM metrics
  setElemText('headerLoadWatt', `${AppState.currentLoadWatt.toFixed(1)} W`);
  setElemText('guardianLoadWattVal', `${AppState.currentLoadWatt.toFixed(1)} W`);
  setElemText('scadaSystemLoadWatt', `${AppState.currentLoadWatt.toFixed(1)} W`);
  
  const scadaNet = document.getElementById('scadaSystemNetWatt');
  if (scadaNet) {
    scadaNet.textContent = `${AppState.netPowerWatt >= 0 ? '+' : ''}${AppState.netPowerWatt.toFixed(1)} W`;
    scadaNet.style.color = AppState.netPowerWatt >= 0 ? 'var(--tetes-green)' : '#f59e0b';
  }

  setElemText('actuatorPumpWatt', `${pumpWatt.toFixed(1)} W`);

  // Smart Power Source Display (Listrik Langsung PLN vs Baterai EBT)
  const isDirectGrid = (AppState.powerSource === 'AC_GRID');
  const powerIcon = document.getElementById('headerPowerIcon');
  const powerVal = document.getElementById('headerPowerVal');
  const batteryPill = document.getElementById('headerBatteryPill');

  if (powerIcon && powerVal) {
    if (isDirectGrid) {
      powerIcon.className = 'fas fa-plug';
      powerIcon.style.color = '#0284c7';
      powerVal.textContent = 'Listrik Langsung (PLN)';
      if (batteryPill) batteryPill.style.display = 'none';
    } else {
      powerIcon.className = 'fas fa-solar-panel text-solar';
      powerVal.textContent = `Baterai EBT (${AppState.batterySoC.toFixed(0)}%)`;
      if (batteryPill) {
        batteryPill.style.display = 'inline-flex';
        setElemText('headerBatteryPct', `${AppState.batterySoC.toFixed(0)}%`);
      }
    }
  }

  // Hero Card 3 Dynamic Mode
  const heroPowerTitle = document.getElementById('heroPowerTitle');
  const heroPowerIcon = document.getElementById('heroPowerIcon');
  const heroBatteryVal = document.getElementById('heroBatteryVal');
  const heroBatteryUnit = document.getElementById('heroBatteryUnit');
  const heroBatteryMeta = document.getElementById('heroBatteryMeta');
  const heroBatteryBadge = document.getElementById('heroBatteryBadge');

  if (heroPowerTitle && heroBatteryVal) {
    if (isDirectGrid) {
      heroPowerTitle.textContent = 'Sumber Daya Sistem';
      if (heroPowerIcon) heroPowerIcon.className = 'fas fa-plug text-cyan-400';
      heroBatteryVal.textContent = 'PLN';
      if (heroBatteryUnit) heroBatteryUnit.textContent = '220V';
      if (heroBatteryMeta) heroBatteryMeta.textContent = 'Adaptor AC-DC Kontinu';
      if (heroBatteryBadge) {
        heroBatteryBadge.textContent = 'Listrik Langsung';
        heroBatteryBadge.className = 'kpi-range-pill good';
      }
    } else {
      heroPowerTitle.textContent = 'Kapasitas Baterai (SoC)';
      if (heroPowerIcon) heroPowerIcon.className = 'fas fa-battery-three-quarters text-cyan-400';
      heroBatteryVal.textContent = `${AppState.batterySoC.toFixed(0)}`;
      if (heroBatteryUnit) heroBatteryUnit.textContent = '%';
      if (heroBatteryMeta) heroBatteryMeta.textContent = 'LiFePO4 12V 30Ah';
      if (heroBatteryBadge) {
        heroBatteryBadge.textContent = 'Otonom 3 Hari';
        heroBatteryBadge.className = 'kpi-range-pill good';
      }
    }
  }

  // SCADA Battery Panel Dynamic Mode
  const scadaPowerTitle = document.getElementById('scadaPowerSourceTitle');
  const batteryPctText = document.getElementById('batteryPctText');
  const batteryBarInner = document.getElementById('batteryBarInner');
  const scadaPowerSub = document.getElementById('scadaPowerSourceSub');

  if (scadaPowerTitle && batteryPctText) {
    if (isDirectGrid) {
      scadaPowerTitle.textContent = 'Mode Catu Daya: Listrik Langsung (PLN)';
      batteryPctText.textContent = 'Kontinu 100%';
      batteryPctText.style.color = '#0284c7';
      if (batteryBarInner) {
        batteryBarInner.style.width = '100%';
        batteryBarInner.style.background = 'linear-gradient(90deg, #0284c7, #38bdf8)';
      }
      if (scadaPowerSub) {
        scadaPowerSub.innerHTML = `Pasokan Listrik PLN Stabil • Beban Terukur: <strong style="color: #f59e0b;">${AppState.currentLoadWatt.toFixed(1)} W</strong>`;
      }
    } else {
      scadaPowerTitle.textContent = 'Baterai LiFePO4 12V (EBT)';
      batteryPctText.textContent = `${AppState.batterySoC.toFixed(0)}%`;
      batteryPctText.style.color = 'var(--brand-primary)';
      if (batteryBarInner) {
        batteryBarInner.style.width = `${AppState.batterySoC}%`;
        if (AppState.batterySoC < 25) {
          batteryBarInner.style.background = 'linear-gradient(90deg, #f43f5e, #fb7185)';
        } else if (AppState.batterySoC < 50) {
          batteryBarInner.style.background = 'linear-gradient(90deg, #f59e0b, #facc15)';
        } else {
          batteryBarInner.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        }
      }
      if (scadaPowerSub) {
        scadaPowerSub.innerHTML = `Reduksi Karbon: <strong id="solarCarbonText" style="color: var(--cyan-accent);">${AppState.totalCarbonSavedKg.toFixed(2)} kg CO₂</strong>`;
      }
    }
  }
}

/* ===================================================================
   SMART SOIL-WATER & AGRONOMIC INTELLIGENCE
   =================================================================== */
function evaluateSoilAndWaterIntelligence() {
  const sm = AppState.soilMoisture;
  const isPump = AppState.pumpActive;

  // 1. Klasifikasi 4-Zona Agronomi Tanah Cabai
  let zone = 'STANDBY';
  let zoneTitle = 'Monitoring Standby';
  let agronomyAdvice = 'Sensor memantau tingkat kelembapan tanah perakaran cabai.';

  if (sm === null) {
    zone = 'STANDBY';
    zoneTitle = 'Standby • Menunggu Data Sensor';
    agronomyAdvice = 'Hubungkan atau nyalakan alat ESP32 untuk pembacaan lengas tanah presisi.';
  } else if (sm > 80.0) {
    zone = 'WATERLOGGED';
    zoneTitle = 'Zona Jenuh Air (>80%) - Irigasi Dilarang';
    agronomyAdvice = `Kelembapan sangat tinggi (${sm}%). Risiko busuk akar (Phytophthora) & defisit aerasi O₂. AI mengunci irigasi 100% dan merekomendasikan pengecekan drainase polybag.`;
  } else if (sm >= 60.0 && sm <= 80.0) {
    zone = 'OPTIMAL';
    zoneTitle = 'Kapasitas Lapang Ideal (60% - 80%)';
    agronomyAdvice = `Kelembapan tanah (${sm}%) berada pada kapasitas lapang optimal cabai rawit. Unsur hara terlarut prima. Pompa standby, penghematan air 100% aktif.`;
  } else if (sm >= 40.0 && sm < 60.0) {
    zone = 'INTERVENTION';
    zoneTitle = 'Titik Intervensi Drip (40% - 59.9%)';
    if (AppState.rainProb >= 60) {
      agronomyAdvice = `Kelembapan (${sm}%) mendekati batas lengas, namun prakiraan cuaca mendeteksi hujan ${AppState.rainProb}%. AI menunda irigasi alamiah.`;
    } else {
      agronomyAdvice = `Kelembapan (${sm}%) memasuki deplesi awal. AI merekomendasikan mikro-drip pulsa terukur 15 detik untuk stabilisasi lengas.`;
    }
  } else {
    // sm < 40.0
    zone = 'CRITICAL';
    zoneTitle = 'Titik Layu Kritis (<40%) - Siram Segera!';
    agronomyAdvice = `Tanah mengalami deplesi air akut (${sm}%). Risiko rontok bunga & daun layu. Pompa diaktifkan dalam mode irigasi presisi darurat.`;
  }

  AppState.soilZone = zone;
  AppState.soilZoneTitle = zoneTitle;
  AppState.soilZoneAdvice = agronomyAdvice;

  // Render ke decision title & reason jika dalam auto mode
  if (AppState.autoMode) {
    if (!isPump && sm !== null && sm > 50) {
      AppState.decisionText = zoneTitle;
      AppState.reasonText = agronomyAdvice;
    }
    setElemText('decisionActionTitle', AppState.decisionText);
    setElemText('decisionActionReason', AppState.reasonText);
  }

  // 2. Waktu Nyala & Waktu Mati Pompa (Actuator Timing Box)
  setElemText('actuatorPumpStartTime', AppState.pumpLastStartTime || '--:--:--');
  setElemText('actuatorPumpStopTime', AppState.pumpLastStopTime || '--:--:--');
  
  const durationElem = document.getElementById('actuatorPumpDuration');
  if (durationElem) {
    if (isPump) {
      durationElem.textContent = `${AppState.pumpCurrentSessionSeconds} detik (Aktif)`;
      durationElem.style.color = '#38bdf8';
    } else {
      durationElem.textContent = AppState.pumpCurrentSessionSeconds > 0 
        ? `${AppState.pumpCurrentSessionSeconds} detik` 
        : '0 detik';
      durationElem.style.color = 'var(--text-main)';
    }
  }
}

/* ===================================================================
   MASTER 1-SECOND TICKER ENGINE
   =================================================================== */
function runMasterSecondTicker() {
  const now = Date.now();

  // 1. Device Freshness & Auto-Offline Detection Watchdog
  if (AppState.lastTelemetryArrival > 0) {
    const elapsedMs = now - AppState.lastTelemetryArrival;
    AppState.telemetryAgeSec = Math.round(elapsedMs / 1000);

    // Jika lebih dari 15 detik tidak ada data masuk, otomatis OFF
    if (elapsedMs > 15000 && AppState.isDeviceOnline) {
      setDeviceOnlineState(false);
    }
  } else {
    // Belum pernah ada data
    if (AppState.isDeviceOnline) {
      setDeviceOnlineState(false);
    }
  }

  // 2. Waktu Nyala (Uptime) & Waktu Mati (Downtime) Counter
  if (AppState.isDeviceOnline) {
    AppState.deviceUptimeSeconds += 1;
    // Akumulasi konsumsi energi listrik (Wh = Watt * jam)
    AppState.dailyEnergyConsumedWh += (AppState.currentLoadWatt / 3600);
  } else {
    AppState.deviceOfflineSeconds += 1;
  }

  // 3. Pompa Runtime Ticker (jika pompa sedang aktif menyiram)
  if (AppState.pumpActive) {
    AppState.pumpSecondsActive += 1;
    AppState.pumpCurrentSessionSeconds += 1;
  }

  // 4. Sinkronisasi UI Tiap Detik
  updateElectricalPowerCalculations();
  updateDeviceGuardianUI();
  evaluateSoilAndWaterIntelligence();
  updateLiveBenchmarkMetrics();
}

/* ===================================================================
   REAL-TIME DATA HANDLERS (FIREBASE)
   =================================================================== */
function handleFirebaseTelemetry(record, key, isFresh, meta) {
  if (!record || typeof record !== 'object') return;

  const now = Date.now();
  AppState.lastTelemetryArrival = now;
  if (record.timestamp_unix) {
    AppState.lastTelemetryUnix = record.timestamp_unix;
  }

  // Evaluasi status online / offline
  const fresh = (isFresh !== undefined) ? isFresh : true;
  setDeviceOnlineState(fresh, meta || {});

  // Smart detection sumber daya listrik langsung vs baterai
  if (record.power_source === 'BATTERY' || (record.battery_voltage && Number(record.battery_voltage) > 6.0)) {
    AppState.powerSource = 'SOLAR_BATTERY';
    AppState.powerSourceLabel = 'Baterai & Surya EBT';
    if (record.battery_soc !== undefined) AppState.batterySoC = parseFloat(Number(record.battery_soc).toFixed(0));
  } else if (record.power_source === 'AC_GRID' || record.power_source === 'PLN') {
    AppState.powerSource = 'AC_GRID';
    AppState.powerSourceLabel = 'Listrik Langsung (PLN)';
  }

  // Update data telemetri
  if (record.soil_moisture !== undefined && record.soil_moisture !== null) {
    AppState.soilMoisture = parseFloat(Number(record.soil_moisture).toFixed(1));
  }
  if (record.soil_temp !== undefined && record.soil_temp !== null) AppState.soilTemp = parseFloat(Number(record.soil_temp).toFixed(1));
  if (record.atmospheric_temp !== undefined && record.atmospheric_temp !== null) AppState.airTemp = parseFloat(Number(record.atmospheric_temp).toFixed(1));
  if (record.humidity !== undefined && record.humidity !== null) AppState.airHumidity = parseFloat(Number(record.humidity).toFixed(1));
  if (record.dew_point !== undefined && record.dew_point !== null) AppState.dewPoint = parseFloat(Number(record.dew_point).toFixed(1));

  if (record.status_tanah) AppState.soilStatus = record.status_tanah;

  // Track transisi status pompa (Waktu Nyala & Waktu Mati Pompa)
  const incomingPump = (record.status_pompa === 'ON');
  if (!AppState.pumpActive && incomingPump) {
    AppState.pumpLastStartTime = new Date().toLocaleTimeString('id-ID') + ' WIB';
    AppState.pumpCurrentSessionSeconds = 0;
  } else if (AppState.pumpActive && !incomingPump) {
    AppState.pumpLastStopTime = new Date().toLocaleTimeString('id-ID') + ' WIB';
  }
  AppState.pumpActive = incomingPump;

  if (record.status_solenoid) AppState.solenoidActive = (record.status_solenoid === 'OPEN');
  if (record.keputusan_irigasi) AppState.decisionText = record.keputusan_irigasi;
  if (record.alasan_keputusan) AppState.reasonText = record.alasan_keputusan;

  // Recalculate VPD & Agronomy
  if (AppState.airTemp !== null && AppState.airHumidity !== null && window.AgronomyEngine) {
    const vpdObj = AgronomyEngine.calculateVPD(AppState.airTemp, AppState.airHumidity);
    AppState.vpd = vpdObj.vpd;
  }

  // Update real-time chart points without any fake data
  if (window.AIAnalytics) {
    if (AppState.soilMoisture !== null) {
      AIAnalytics.updateRealtimeMoisture(AppState.soilMoisture, record.timestamp);
    }
    if (AppState.airTemp !== null || AppState.airHumidity !== null) {
      AIAnalytics.updateRealtimeEnvironmental(AppState.airTemp, AppState.airHumidity, AppState.vpd, record.timestamp);
    }
  }

  // Store in memory for CSV export
  if (!AppState.historyLogs) AppState.historyLogs = [];
  AppState.historyLogs.push({
    timestamp: record.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    atmospheric_temp: AppState.airTemp,
    humidity: AppState.airHumidity,
    soil_temp: AppState.soilTemp,
    soil_moisture: AppState.soilMoisture,
    vpd: AppState.vpd,
    solar_watt: AppState.solarPowerWatt,
    battery_soc: AppState.batterySoC,
    status_pompa: AppState.pumpActive ? 'ON' : 'OFF'
  });
  if (AppState.historyLogs.length > 500) AppState.historyLogs.shift();

  // Update live stream text badge
  const liveBadge = document.getElementById('liveIoTStatusText');
  if (liveBadge) {
    liveBadge.textContent = `Streaming Data Alat (${new Date().toLocaleTimeString()})`;
  }

  updateAllUI();
}

function handleFirebaseHistory(records) {
  if (!records || !Array.isArray(records) || records.length === 0) return;
  AppState.historyLogs = records;

  // Populate chart with pure real data
  if (window.AIAnalytics && typeof AIAnalytics.populateFromFirebaseLogs === 'function') {
    AIAnalytics.populateFromFirebaseLogs(records);
  }
}

function handleFirebasePrediction(pred) {
  if (!pred || typeof pred !== 'object') return;
  if (pred.predicted_soil_moisture !== undefined) {
    AppState.aiPrediction = parseFloat(Number(pred.predicted_soil_moisture).toFixed(1));
  }
  if (pred.prediction_time) {
    AppState.aiPredictionTime = pred.prediction_time;
  }
  if (window.AIAnalytics && typeof AIAnalytics.updatePrediction === 'function') {
    AIAnalytics.updatePrediction(pred);
  }
  updateAllUI();
}

function handleFirebaseStatusChange(isConnected, meta) {
  setDeviceOnlineState(isConnected, meta || {});
}

/* ===================================================================
   SIMULATION ENGINE (CLEARED FOR PURE REAL-TIME TESTING)
   =================================================================== */
function initSimulationEngine() {
  // Pure real-time IoT mode: no fake dummy ticks
}

/* ===================================================================
   MASTER UI RENDERER
   =================================================================== */
function updateAllUI() {
  // 1. Evaluate Smart AI Decision (Only if in Auto mode and data available)
  if (AppState.autoMode && AppState.soilMoisture !== null) {
    const decision = AIAnalytics.evaluateSmartDecision(
      AppState.soilMoisture,
      AppState.aiPrediction || AppState.soilMoisture,
      AppState.rainProb,
      AppState.batterySoC,
      AppState.autoMode
    );

    if (!AppState.decisionText || AppState.decisionText.includes('Standby')) {
      AppState.decisionText = decision.action;
      AppState.reasonText = decision.reason;
    }
    AppState.pumpActive = decision.pumpActive;
    AppState.solenoidActive = decision.solenoidActive;
  }

  // 2. Update Electrical Power & Device Guardian
  updateElectricalPowerCalculations();
  updateDeviceGuardianUI();
  evaluateSoilAndWaterIntelligence();

  // 3. Update Header & KPI Values
  setElemText('headerSolarWatt', `${AppState.solarPowerWatt.toFixed(1)} W`);
  setElemText('headerBatteryPct', `${AppState.batterySoC.toFixed(0)}%`);

  setElemText('heroMoistureVal', AppState.soilMoisture !== null ? AppState.soilMoisture.toFixed(1) : '--');
  setElemText('heroSolarVal', AppState.solarPowerWatt.toFixed(1));
  setElemText('heroBatteryVal', AppState.batterySoC.toFixed(0));
  setElemText('heroVpdVal', AppState.vpd !== null ? AppState.vpd.toFixed(2) : '--');

  // 4. Update Status Strip
  setElemText('decisionActionTitle', AppState.decisionText);
  setElemText('decisionActionReason', AppState.reasonText);
  setElemText('decisionLstmVal', AppState.aiPrediction !== null ? AppState.aiPrediction.toFixed(1) : '--');
  
  const scadaBadge = document.getElementById('scadaModeBadge');
  if (scadaBadge) {
    scadaBadge.textContent = AppState.autoMode ? 'AUTO AI' : 'MANUAL';
    scadaBadge.className = `status-badge-chip ${AppState.autoMode ? 'active-auto' : 'active-manual'}`;
  }

  // 5. Update Telemetry Metric Boxes
  setElemText('gaugeAirTempNum', AppState.airTemp !== null ? AppState.airTemp.toFixed(1) : '--');
  setElemText('gaugeAirHumiNum', AppState.airHumidity !== null ? AppState.airHumidity.toFixed(1) : '--');
  setElemText('gaugeSoilTempNum', AppState.soilTemp !== null ? AppState.soilTemp.toFixed(1) : '--');
  setElemText('gaugeDewPointNum', AppState.dewPoint !== null ? AppState.dewPoint.toFixed(1) : '--');
  setElemText('weatherRainProb', AppState.rainProb.toFixed(0));

  // 6. Update EBT Solar & Battery Panel
  setElemText('solarWattBadge', `${AppState.solarPowerWatt.toFixed(1)} W`);
  setElemText('solarVoltText', `${AppState.solarVoltage.toFixed(1)} V`);
  setElemText('solarAmpText', `${AppState.solarCurrent.toFixed(2)} A`);
  setElemText('solarRadText', `${AppState.solarIrradiance} W/m²`);
  setElemText('solarCarbonText', `${AppState.totalCarbonSavedKg.toFixed(2)} kg CO₂`);

  const batteryBar = document.getElementById('batteryBarInner');
  if (batteryBar) {
    batteryBar.style.width = `${AppState.batterySoC}%`;
    if (AppState.batterySoC < 25) {
      batteryBar.style.background = 'linear-gradient(90deg, #f43f5e, #fb7185)';
    } else if (AppState.batterySoC < 50) {
      batteryBar.style.background = 'linear-gradient(90deg, #f59e0b, #facc15)';
    } else {
      batteryBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
    }
  }
  setElemText('batteryPctText', `${AppState.batterySoC.toFixed(0)}%`);

  // EBT Advisory
  const energyAdvisory = SolarEBTEngine.getEnergyAdvisory(AppState.batterySoC, AppState.solarPowerWatt, AppState.soilMoisture < 40, AppState.rainProb);
  setElemText('energyAdvisoryText', energyAdvisory.text);

  // Realtime Solar EBT Calculation based on real time of day
  updateSolarEBTRealtime();

  // 7. Update Actuator State Toggles & Status
  updateActuatorUI();

  // 8. Calculate Real-Time Live Benchmark Metrics
  updateLiveBenchmarkMetrics();

  // 9. Render Real Telemetry Table in Data Logs Tab
  renderTelemetryTable();
}

function updateSolarEBTRealtime() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  // Hitung radiasi riil berdasarkan jam lokal dan probabilitas hujan
  const irr = SolarEBTEngine.calculateSolarIrradiance(hour, AppState.rainProb);
  const gen = SolarEBTEngine.calculatePVGeneration(irr, 0.18, -0.004, AppState.airTemp || 30);

  AppState.solarIrradiance = irr;
  AppState.solarPowerWatt = gen.powerWatt;
  AppState.solarVoltage = gen.voltage;
  AppState.solarCurrent = gen.current;

  // Akumulasi energi bersih kWh hari ini
  if (hour >= 6 && hour <= 18) {
    const sunHours = hour - 6;
    AppState.dailyCleanEnergyKWh = parseFloat(((sunHours * (gen.powerWatt > 0 ? gen.powerWatt : 40)) / 1000).toFixed(2));
  } else {
    AppState.dailyCleanEnergyKWh = 0.08;
  }

  const offset = SolarEBTEngine.calculateCarbonOffset(AppState.dailyCleanEnergyKWh);
  AppState.totalCarbonSavedKg = offset.carbonOffsetKg;

  // Update Tab 2 Solar SCADA Telemetry
  setElemText('tab2SolarWatt', AppState.solarPowerWatt.toFixed(1));
  setElemText('tab2BatteryPct', AppState.batterySoC.toFixed(0));
  setElemText('tab2DailyKwh', AppState.dailyCleanEnergyKWh.toFixed(2));
  setElemText('tab2CarbonKg', AppState.totalCarbonSavedKg.toFixed(2));

  // Tab 2 Row 2: Load, Net Balance, Consumed Wh, Device Operating Status
  setElemText('tab2LoadWatt', AppState.currentLoadWatt.toFixed(1));
  const tab2Net = document.getElementById('tab2NetWatt');
  if (tab2Net) {
    tab2Net.textContent = `${AppState.netPowerWatt >= 0 ? '+' : ''}${AppState.netPowerWatt.toFixed(1)}`;
    tab2Net.style.color = AppState.netPowerWatt >= 0 ? 'var(--tetes-green)' : '#f59e0b';
  }
  const tab2NetSub = document.getElementById('tab2NetSub');
  if (tab2NetSub) {
    tab2NetSub.textContent = AppState.netPowerWatt >= 0 ? 'Surplus (Baterai Charging)' : 'Defisit (Baterai Discharging)';
  }
  const tab2LoadSub = document.getElementById('tab2LoadSub');
  if (tab2LoadSub) {
    tab2LoadSub.textContent = AppState.isDeviceOnline 
      ? (AppState.pumpActive ? 'ESP32 (2.2W) + Pompa 12V (24W)' : 'ESP32 Standby')
      : 'Daya 0 W (Alat Mati)';
  }
  setElemText('tab2ConsumedWh', AppState.dailyEnergyConsumedWh.toFixed(2));
  const tab2Dev = document.getElementById('tab2DeviceStateText');
  if (tab2Dev) {
    tab2Dev.textContent = AppState.isDeviceOnline ? 'ONLINE & NYALA' : 'OFF (MATI)';
    tab2Dev.style.color = AppState.isDeviceOnline ? 'var(--tetes-green)' : '#dc2626';
  }
  const tab2Uptime = document.getElementById('tab2DeviceUptimeSub');
  if (tab2Uptime) {
    tab2Uptime.textContent = AppState.isDeviceOnline 
      ? `Uptime: ${formatDuration(AppState.deviceUptimeSeconds)}`
      : (AppState.deviceOfflineSince ? `Mati: ${AppState.deviceOfflineSince.toLocaleTimeString('id-ID')}` : 'Belum Dinyalakan');
  }
}

function updateLiveBenchmarkMetrics() {
  const records = AppState.historyLogs || [];
  const totalLogs = records.length;

  // 1. Hitung siklus siram yang tercatat di riwayat logs
  let historicalPumpCycles = 0;
  records.forEach(r => {
    if (r.status_pompa === 'ON' || r.pumpActive === true) {
      historicalPumpCycles++;
    }
  });

  // 2. Volume air irigasi TETES Presisi (mL):
  // Rata-rata 1 detik pompa aktif mengalirkan ~11.6 mL (4 nozzle mikro-drip)
  // Tiap log siram historis mewakili ~5 detik siram = 58 mL
  const pumpActiveMl = Math.round(AppState.pumpSecondsActive * 11.6);
  const historyMl = Math.round(historicalPumpCycles * 58);
  let tetesWaterMl = pumpActiveMl + historyMl;
  AppState.liveWaterPumpedMl = tetesWaterMl;

  // 3. Baseline Pembanding Konvensional (mL):
  // Standar siram manual petani cabai di Gresik: 900 mL / polybag / hari (2x siram manual @ 450 mL)
  const convWaterMl = 900;

  // 4. Efisiensi Penghematan Air Riil (%)
  let savingsPercent = 100.0;
  if (tetesWaterMl > 0) {
    savingsPercent = Math.max(0, Math.min(99.9, ((convWaterMl - tetesWaterMl) / convWaterMl) * 100));
  } else {
    savingsPercent = 100.0;
  }

  // 5. Render ke elemen UI secara dinamis
  setElemText('heroSavingPct', `${savingsPercent.toFixed(1).replace('.', ',')}%`);
  setElemText('heroConvWater', `${convWaterMl.toLocaleString('id-ID')} mL`);
  setElemText('heroTetesWater', `${tetesWaterMl.toLocaleString('id-ID')} mL`);

  const tetesBar = document.getElementById('heroTetesBar');
  if (tetesBar) {
    const barWidth = Math.max(2, Math.min(100, (tetesWaterMl / convWaterMl) * 100));
    tetesBar.style.width = `${barWidth.toFixed(1)}%`;
  }

  const badgeText = document.getElementById('heroTestBadgeText');
  if (badgeText) {
    if (!AppState.isDeviceOnline) {
      badgeText.innerHTML = `<span style="color: #ef4444; font-weight: 700;"><i class="fas fa-plug-circle-xmark"></i> Alat Belum Dinyalakan • Pengujian Standby</span>`;
    } else if (AppState.pumpActive) {
      badgeText.innerHTML = `<span style="color: #38bdf8; font-weight: 800;"><i class="fas fa-faucet-drip fa-bounce"></i> Pompa Menyiram (${AppState.pumpCurrentSessionSeconds}s • ${tetesWaterMl} mL)</span>`;
    } else if (AppState.soilMoisture !== null && AppState.soilMoisture > 80) {
      badgeText.innerHTML = `<span style="color: var(--tetes-green); font-weight: 700;"><i class="fas fa-shield-halved"></i> Tanah Jenuh Air (${AppState.soilMoisture.toFixed(1)}%) • AI Mengunci Siram (Hemat 100% Air)</span>`;
    } else if (AppState.soilMoisture !== null && AppState.soilMoisture >= 60) {
      badgeText.innerHTML = `<span style="color: var(--tetes-green); font-weight: 700;"><i class="fas fa-check-circle"></i> Kapasitas Lapang Ideal (${AppState.soilMoisture.toFixed(1)}%) • Efisiensi Air 100%</span>`;
    } else if (tetesWaterMl > 0) {
      badgeText.innerHTML = `<span style="color: var(--tetes-green); font-weight: 700;"><i class="fas fa-seedling"></i> Uji Real-Time: ${tetesWaterMl} mL Terpakai • Hemat ${savingsPercent.toFixed(1)}% Air</span>`;
    } else {
    }
  }
}

function renderTelemetryTable() {
  const tbody = document.getElementById('telemetryTableBody');
  if (!tbody) return;

  const records = AppState.historyLogs || [];
  if (records.length === 0) {
    if (AppState.soilMoisture !== null) {
      tbody.innerHTML = `
        <tr>
          <td class="mono-font">${new Date().toLocaleTimeString()} (Live)</td>
          <td style="font-weight: 700; color: var(--brand-primary);">${AppState.soilMoisture.toFixed(1)}%</td>
          <td>${AppState.soilTemp !== null ? AppState.soilTemp.toFixed(1) + '°C' : '-'}</td>
          <td>${AppState.airTemp !== null ? AppState.airTemp.toFixed(1) + '°C' : '-'}</td>
          <td>${AppState.airHumidity !== null ? AppState.airHumidity.toFixed(1) + '%' : '-'}</td>
          <td class="mono-font">${AppState.vpd !== null ? AppState.vpd.toFixed(2) + ' kPa' : '-'}</td>
          <td>${AppState.solarPowerWatt.toFixed(1)} W</td>
          <td><span class="actuator-state-badge ${AppState.pumpActive ? 'on' : 'off'}">${AppState.pumpActive ? 'ON' : 'OFF'}</span></td>
        </tr>
      `;
    }
    return;
  }

  const recent = [...records].slice(-20).reverse();
  tbody.innerHTML = recent.map(r => {
    const ts = r.timestamp || (r.timestamp_unix ? new Date(r.timestamp_unix * 1000).toLocaleTimeString() : '-');
    const sm = (r.soil_moisture !== undefined && r.soil_moisture !== null) ? Number(r.soil_moisture).toFixed(1) + '%' : '-';
    const st = (r.soil_temp !== undefined && r.soil_temp !== null) ? Number(r.soil_temp).toFixed(1) + '°C' : '-';
    const at = (r.atmospheric_temp !== undefined && r.atmospheric_temp !== null) ? Number(r.atmospheric_temp).toFixed(1) + '°C' : '-';
    const ah = (r.humidity !== undefined && r.humidity !== null) ? Number(r.humidity).toFixed(1) + '%' : '-';

    let vpdStr = '-';
    if (r.vpd !== undefined && r.vpd !== null) {
      vpdStr = Number(r.vpd).toFixed(2) + ' kPa';
    } else if (r.atmospheric_temp && r.humidity && window.AgronomyEngine) {
      const v = AgronomyEngine.calculateVPD(Number(r.atmospheric_temp), Number(r.humidity));
      vpdStr = v.vpd.toFixed(2) + ' kPa';
    }

    const pv = (r.solar_watt !== undefined ? Number(r.solar_watt).toFixed(1) : AppState.solarPowerWatt.toFixed(1)) + ' W';
    const isPump = (r.status_pompa === 'ON' || r.status_pompa === true);

    return `
      <tr>
        <td class="mono-font" style="font-size: 11.5px;">${ts}</td>
        <td style="font-weight: 700; color: var(--brand-primary);">${sm}</td>
        <td>${st}</td>
        <td>${at}</td>
        <td>${ah}</td>
        <td class="mono-font">${vpdStr}</td>
        <td>${pv}</td>
        <td><span class="actuator-state-badge ${isPump ? 'on' : 'off'}">${isPump ? 'ON' : 'OFF'}</span></td>
      </tr>
    `;
  }).join('');
}

function updateActuatorUI() {
  const togglePump = document.getElementById('togglePump');
  const toggleSolenoid = document.getElementById('toggleSolenoid');
  const pumpStatePill = document.getElementById('pumpStatePill');
  const solenoidStatePill = document.getElementById('solenoidStatePill');

  if (togglePump) togglePump.checked = AppState.pumpActive;
  if (toggleSolenoid) toggleSolenoid.checked = AppState.solenoidActive;

  if (pumpStatePill) {
    pumpStatePill.textContent = AppState.pumpActive ? 'ON' : 'OFF';
    pumpStatePill.className = `actuator-state-badge ${AppState.pumpActive ? 'on' : 'off'}`;
  }

  if (solenoidStatePill) {
    solenoidStatePill.textContent = AppState.solenoidActive ? 'OPEN' : 'CLOSE';
    solenoidStatePill.className = `actuator-state-badge ${AppState.solenoidActive ? 'on' : 'off'}`;
  }
}

function setElemText(id, text) {
  const elem = document.getElementById(id);
  if (elem) elem.textContent = text;
}

/* ===================================================================
   SCIENTIFIC CALCULATOR TAB
   =================================================================== */
function initCalculatorInteractions() {
  const inputPlants = document.getElementById('calcInputPlants');
  const inputDays = document.getElementById('calcInputDays');
  const stageSelect = document.getElementById('calcStageSelect');

  function recalculate() {
    const plants = parseInt(inputPlants?.value || '500', 10);
    const days = parseInt(inputDays?.value || '90', 10);
    const stage = stageSelect?.value || 'mid';

    const et0 = AgronomyEngine.calculateET0(AppState.airTemp, AppState.airTemp + 4, AppState.airTemp - 4, 19.2);
    const etcRes = AgronomyEngine.calculateCropWaterRequirement(et0, stage);
    
    setElemText('calcEt0Val', `${et0} mm/h`);
    setElemText('calcDailyPerPlant', `${etcRes.litersPerPlant} L/tan/h`);

    const savings = AgronomyEngine.calculateWaterSavings(plants, days);
    setElemText('calcSavedWater', `${savings.savedLiters.toLocaleString()} Liter`);
    setElemText('calcSavedPct', `${savings.savingsPercent}%`);
  }

  if (inputPlants) inputPlants.addEventListener('input', recalculate);
  if (inputDays) inputDays.addEventListener('input', recalculate);
  if (stageSelect) stageSelect.addEventListener('change', recalculate);

  recalculate();
}

/* ===================================================================
   AI CHAT ASSISTANT
   =================================================================== */
function initChatAssistant() {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const quickTags = document.querySelectorAll('.quick-ask-btn');

  function appendMessage(sender, text) {
    if (!chatMessages) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-msg ${sender}`;
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = formatted;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleSend(query) {
    const text = query || chatInput?.value?.trim();
    if (!text) return;
    appendMessage('user', text);
    if (chatInput) chatInput.value = '';

    setTimeout(() => {
      const reply = AIAssistant.getReply(text);
      appendMessage('bot', reply);
    }, 300);
  }

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => handleSend());
  }

  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  quickTags.forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-ask');
      handleSend(q);
    });
  });
}

/* ===================================================================
   SCROLL OPTIMIZATION & FLOATING BUTTON
   =================================================================== */
function initScrollOptimization() {
  const btnScrollToTop = document.getElementById('btnScrollToTop');
  if (btnScrollToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 280) {
        btnScrollToTop.classList.add('visible');
      } else {
        btnScrollToTop.classList.remove('visible');
      }
    }, { passive: true });

    btnScrollToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ===================================================================
   EXPORT DATA CSV
   =================================================================== */
window.exportSensorLogCSV = function() {
  let csv = "Timestamp,Suhu_Udara_C,Kelembapan_Udara_Pct,Suhu_Tanah_C,Kelembapan_Tanah_Pct,VPD_kPa,Daya_Surya_W,Baterai_SoC_Pct,Status_Pompa\n";
  
  if (AppState.historyLogs && AppState.historyLogs.length > 0) {
    AppState.historyLogs.forEach(r => {
      const ts = r.timestamp || (r.timestamp_unix ? new Date(r.timestamp_unix * 1000).toISOString() : '-');
      const at = r.atmospheric_temp !== undefined ? r.atmospheric_temp : '-';
      const ah = r.humidity !== undefined ? r.humidity : '-';
      const st = r.soil_temp !== undefined ? r.soil_temp : '-';
      const sm = r.soil_moisture !== undefined ? r.soil_moisture : '-';
      const vpd = r.vpd !== undefined ? r.vpd : '-';
      const pv = r.solar_watt !== undefined ? r.solar_watt : AppState.solarPowerWatt;
      const bat = r.battery_soc !== undefined ? r.battery_soc : AppState.batterySoC;
      const pump = r.status_pompa || (AppState.pumpActive ? "ON" : "OFF");
      csv += `"${ts}",${at},${ah},${st},${sm},${vpd},${pv},${bat},${pump}\n`;
    });
  } else {
    // Single live point if no history array yet
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const at = AppState.airTemp !== null ? AppState.airTemp : '-';
    const ah = AppState.airHumidity !== null ? AppState.airHumidity : '-';
    const st = AppState.soilTemp !== null ? AppState.soilTemp : '-';
    const sm = AppState.soilMoisture !== null ? AppState.soilMoisture : '-';
    const vpd = AppState.vpd !== null ? AppState.vpd : '-';
    const pv = AppState.solarPowerWatt;
    const bat = AppState.batterySoC;
    const pump = AppState.pumpActive ? "ON" : "OFF";
    csv += `"${ts}",${at},${ah},${st},${sm},${vpd},${pv},${bat},${pump}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tetes_smartfarm_telemetry_real_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
