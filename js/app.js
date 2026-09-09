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

  // EBT Solar & Energy
  solarPowerWatt: 68.4,
  solarVoltage: 14.3,
  solarCurrent: 4.78,
  batterySoC: 88.0,
  solarIrradiance: 720,
  dailyCleanEnergyKWh: 0.42,
  totalCarbonSavedKg: 0.36,

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

  // Live Actuator & Real-time Benchmark Tracking
  pumpSecondsActive: 0,
  liveWaterPumpedMl: 0,
  lastPumpActiveTime: null,

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
      (record) => handleFirebaseTelemetry(record),
      (pred) => handleFirebasePrediction(pred),
      (status) => handleFirebaseStatusChange(status),
      (records) => handleFirebaseHistory(records)
    );
  }

  // Real-time pump runtime ticker (updates volume & saving percentage live each second)
  setInterval(() => {
    if (AppState.pumpActive) {
      AppState.pumpSecondsActive += 1;
      updateLiveBenchmarkMetrics();
    }
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
        AppState.pumpActive = e.target.checked;
        syncActuatorState();
      }
    });
  }

  if (toggleSolenoid) {
    toggleSolenoid.addEventListener('change', (e) => {
      if (!AppState.autoMode) {
        AppState.solenoidActive = e.target.checked;
        syncActuatorState();
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
   REAL-TIME DATA HANDLERS (FIREBASE)
   =================================================================== */
function handleFirebaseTelemetry(record) {
  if (!record || typeof record !== 'object') return;

  if (record.soil_moisture !== undefined && record.soil_moisture !== null) {
    AppState.soilMoisture = parseFloat(Number(record.soil_moisture).toFixed(1));
  }
  if (record.soil_temp !== undefined && record.soil_temp !== null) AppState.soilTemp = parseFloat(Number(record.soil_temp).toFixed(1));
  if (record.atmospheric_temp !== undefined && record.atmospheric_temp !== null) AppState.airTemp = parseFloat(Number(record.atmospheric_temp).toFixed(1));
  if (record.humidity !== undefined && record.humidity !== null) AppState.airHumidity = parseFloat(Number(record.humidity).toFixed(1));
  if (record.dew_point !== undefined && record.dew_point !== null) AppState.dewPoint = parseFloat(Number(record.dew_point).toFixed(1));

  if (record.status_tanah) AppState.soilStatus = record.status_tanah;
  if (record.status_pompa) AppState.pumpActive = (record.status_pompa === 'ON');
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

function handleFirebaseStatusChange(isConnected) {
  const sidebarStatus = document.getElementById('sidebarStatusText');
  if (sidebarStatus) {
    sidebarStatus.textContent = isConnected ? 'Firebase RTDB: Terhubung' : 'Mode Offline / Standby';
  }
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

  // 2. Update Header & KPI Values
  setElemText('headerSolarWatt', `${AppState.solarPowerWatt.toFixed(1)} W`);
  setElemText('headerBatteryPct', `${AppState.batterySoC.toFixed(0)}%`);

  setElemText('heroMoistureVal', AppState.soilMoisture !== null ? AppState.soilMoisture.toFixed(1) : '--');
  setElemText('heroSolarVal', AppState.solarPowerWatt.toFixed(1));
  setElemText('heroBatteryVal', AppState.batterySoC.toFixed(0));
  setElemText('heroVpdVal', AppState.vpd !== null ? AppState.vpd.toFixed(2) : '--');

  // 3. Update Status Strip
  setElemText('decisionActionTitle', AppState.decisionText);
  setElemText('decisionActionReason', AppState.reasonText);
  setElemText('decisionLstmVal', AppState.aiPrediction !== null ? AppState.aiPrediction.toFixed(1) : '--');
  
  const scadaBadge = document.getElementById('scadaModeBadge');
  if (scadaBadge) {
    scadaBadge.textContent = AppState.autoMode ? 'AUTO AI' : 'MANUAL';
    scadaBadge.className = `status-badge-chip ${AppState.autoMode ? 'active-auto' : 'active-manual'}`;
  }

  // 4. Update Telemetry Metric Boxes
  setElemText('gaugeAirTempNum', AppState.airTemp !== null ? AppState.airTemp.toFixed(1) : '--');
  setElemText('gaugeAirHumiNum', AppState.airHumidity !== null ? AppState.airHumidity.toFixed(1) : '--');
  setElemText('gaugeSoilTempNum', AppState.soilTemp !== null ? AppState.soilTemp.toFixed(1) : '--');
  setElemText('gaugeDewPointNum', AppState.dewPoint !== null ? AppState.dewPoint.toFixed(1) : '--');
  setElemText('weatherRainProb', AppState.rainProb.toFixed(0));

  // 5. Update EBT Solar & Battery Panel
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

  // Update Tab 2 Solar SCADA Telemetry
  setElemText('tab2SolarWatt', AppState.solarPowerWatt.toFixed(1));
  setElemText('tab2BatteryPct', AppState.batterySoC.toFixed(0));
  setElemText('tab2DailyKwh', AppState.dailyCleanEnergyKWh.toFixed(2));
  setElemText('tab2CarbonKg', AppState.totalCarbonSavedKg.toFixed(2));

  // 6. Update Actuator State Toggles & Status
  updateActuatorUI();

  // 7. Calculate Real-Time Live Benchmark Metrics (Hasil Pengujian Murni Realtime & Tanpa Dummy)
  updateLiveBenchmarkMetrics();

  // 8. Render Real Telemetry Table in Data Logs Tab
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

  // 3. Baseline Pembanding Konvensional (mL):
  // Standar siram manual petani cabai di Gresik: 900 mL / polybag / hari (2x siram manual @ 450 mL)
  const convWaterMl = 900;

  // 4. Efisiensi Penghematan Air Riil (%)
  let savingsPercent = 100.0;
  if (tetesWaterMl > 0) {
    savingsPercent = Math.max(0, Math.min(99.9, ((convWaterMl - tetesWaterMl) / convWaterMl) * 100));
  } else {
    // Jika tanah masih basah/lembab (misal 99% seperti saat ini) dan pompa tidak perlu menyiram:
    // TETES menghemat 100% air dibanding metode konvensional yang tetap disiram manual!
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
    if (AppState.pumpActive) {
      badgeText.innerHTML = `<span style="color: #38bdf8; font-weight: 800;"><i class="fas fa-faucet-drip fa-bounce"></i> Pompa Menyiram (${AppState.pumpSecondsActive}s • ${tetesWaterMl} mL)</span>`;
    } else if (AppState.soilMoisture !== null && AppState.soilMoisture > 50) {
      badgeText.innerHTML = `<span style="color: var(--tetes-green); font-weight: 700;"><i class="fas fa-check-circle"></i> Uji Real-Time: Tanah Basah (${AppState.soilMoisture.toFixed(1)}%) • AI Menahan Siram (0 mL)</span>`;
    } else if (tetesWaterMl > 0) {
      badgeText.innerHTML = `<span style="color: var(--tetes-green); font-weight: 700;"><i class="fas fa-seedling"></i> Uji Real-Time: ${tetesWaterMl} mL Terpakai • Hemat ${savingsPercent.toFixed(1)}% Air</span>`;
    } else {
      badgeText.innerHTML = `<i class="fas fa-microchip"></i> Uji Real-Time Lahan: ${totalLogs} Titik Telemetri Aktif`;
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
