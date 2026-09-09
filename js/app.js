/**
 * MASTER CONTROLLER & APPLICATION LOGIC
 * TETES SMARTFARM OS - INDUSTRIAL ENTERPRISE EDITION
 */

const AppState = {
  // Telemetry Sensor
  soilMoisture: 42.5,
  soilMoistureRaw: 1250,
  soilTemp: 26.8,
  airTemp: 31.4,
  airHumidity: 68.0,
  dewPoint: 24.6,
  vpd: 1.15,
  soilStatus: 'Lembab',

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
  aiPrediction: 38.5,
  aiPredictionTime: '15 Menit ke Depan',
  autoMode: true,
  pumpActive: false,
  solenoidActive: false,
  decisionText: 'Monitoring Standby (Zona Perakaran Optimal)',
  reasonText: 'Sensor tanah dan AI LSTM memantau tingkat kelembapan tanah tanaman cabai.',

  // Simulation & Mode
  isSimulating: true, // Default active for rich presentation demo
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

  // Initialize Charts
  if (window.AIAnalytics) {
    AIAnalytics.initCharts();
  }

  // Initialize Firebase connector
  if (window.FirebaseConnector) {
    FirebaseConnector.init(
      (record) => handleFirebaseTelemetry(record),
      (pred) => handleFirebasePrediction(pred),
      (status) => handleFirebaseStatusChange(status)
    );
  }

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
      }
    });
  });
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
  if (AppState.isSimulating) return;

  if (record.soil_moisture !== undefined) AppState.soilMoisture = parseFloat(record.soil_moisture);
  if (record.soil_temp !== undefined) AppState.soilTemp = parseFloat(record.soil_temp);
  if (record.atmospheric_temp !== undefined) AppState.airTemp = parseFloat(record.atmospheric_temp);
  if (record.humidity !== undefined) AppState.airHumidity = parseFloat(record.humidity);
  if (record.dew_point !== undefined) AppState.dewPoint = parseFloat(record.dew_point);

  // Recalculate VPD & Agronomy
  const vpdObj = AgronomyEngine.calculateVPD(AppState.airTemp, AppState.airHumidity);
  AppState.vpd = vpdObj.vpd;

  updateAllUI();
}

function handleFirebasePrediction(pred) {
  if (AppState.isSimulating) return;
  if (pred.predicted_soil_moisture !== undefined) {
    AppState.aiPrediction = parseFloat(pred.predicted_soil_moisture);
  }
  if (pred.prediction_time) {
    AppState.aiPredictionTime = pred.prediction_time;
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
   SIMULATION ENGINE (FOR DEMO PRESENTATION)
   =================================================================== */
function initSimulationEngine() {
  const toggleSimBtn = document.getElementById('btnToggleSim');
  const triggerRainBtn = document.getElementById('btnSimRain');
  const triggerDryBtn = document.getElementById('btnSimDry');

  if (toggleSimBtn) {
    toggleSimBtn.addEventListener('click', () => {
      AppState.isSimulating = !AppState.isSimulating;
      toggleSimBtn.classList.toggle('active', AppState.isSimulating);
      toggleSimBtn.textContent = AppState.isSimulating ? 'Simulasi ON' : 'Simulasi OFF';
    });
  }

  if (triggerRainBtn) {
    triggerRainBtn.addEventListener('click', () => {
      AppState.rainProb = 85.0;
      AppState.rainMm = 12.5;
      AppState.airHumidity = 92.0;
      AppState.airTemp = 26.5;
      AppState.solarPowerWatt = 12.0;
      AppState.solarIrradiance = 180;
      updateAllUI();
    });
  }

  if (triggerDryBtn) {
    triggerDryBtn.addEventListener('click', () => {
      AppState.soilMoisture = 28.5;
      AppState.rainProb = 10.0;
      AppState.rainMm = 0.0;
      AppState.airTemp = 35.5;
      AppState.airHumidity = 45.0;
      updateAllUI();
    });
  }

  // Dynamic simulation tick every 3 seconds
  AppState.simInterval = setInterval(() => {
    if (!AppState.isSimulating) return;

    const now = new Date();
    const currentHour = now.getHours() + (now.getMinutes() / 60);

    // Solar calculation
    const irradiance = SolarEBTEngine.calculateSolarIrradiance(currentHour, 100 - AppState.rainProb);
    AppState.solarIrradiance = irradiance;
    const pvData = SolarEBTEngine.calculatePVGeneration(irradiance, 0.18, -0.004, AppState.airTemp);
    AppState.solarPowerWatt = pvData.powerWatt;
    AppState.solarVoltage = pvData.voltage;
    AppState.solarCurrent = pvData.current;

    // Battery charge/discharge
    const netWatt = pvData.powerWatt - (AppState.pumpActive ? 30 : 2);
    AppState.batterySoC = SolarEBTEngine.estimateBatterySoC(AppState.batterySoC, netWatt, 0.05);

    // Clean energy accumulator
    AppState.dailyCleanEnergyKWh += (pvData.powerWatt * 3) / (3600 * 1000);
    const carbonData = SolarEBTEngine.calculateCarbonOffset(AppState.dailyCleanEnergyKWh);
    AppState.totalCarbonSavedKg = carbonData.carbonOffsetKg;

    // Soil Moisture dynamics
    if (AppState.pumpActive) {
      AppState.soilMoisture = Math.min(85, AppState.soilMoisture + 2.5);
    } else {
      const evapRate = (AppState.airTemp > 32 ? 0.25 : 0.12);
      AppState.soilMoisture = Math.max(22, AppState.soilMoisture - evapRate);
    }

    // AI Prediction estimation
    AppState.aiPrediction = Math.max(18, parseFloat((AppState.soilMoisture - 2.8 + (Math.random() * 0.6)).toFixed(1)));

    // Temperature & Humidity minor drift
    AppState.airTemp = parseFloat((AppState.airTemp + (Math.random() * 0.2 - 0.1)).toFixed(1));
    AppState.airHumidity = parseFloat((AppState.airHumidity + (Math.random() * 0.4 - 0.2)).toFixed(1));

    // Agronomy calculations
    AppState.dewPoint = AgronomyEngine.calculateDewPoint(AppState.airTemp, AppState.airHumidity);
    const vpdRes = AgronomyEngine.calculateVPD(AppState.airTemp, AppState.airHumidity);
    AppState.vpd = vpdRes.vpd;

    updateAllUI();
  }, 3000);
}

/* ===================================================================
   MASTER UI RENDERER
   =================================================================== */
function updateAllUI() {
  // 1. Evaluate Smart AI Decision
  const decision = AIAnalytics.evaluateSmartDecision(
    AppState.soilMoisture,
    AppState.aiPrediction,
    AppState.rainProb,
    AppState.batterySoC,
    AppState.autoMode
  );

  AppState.decisionText = decision.action;
  AppState.reasonText = decision.reason;

  if (AppState.autoMode) {
    AppState.pumpActive = decision.pumpActive;
    AppState.solenoidActive = decision.solenoidActive;
  }

  // 2. Update Header & KPI Values
  setElemText('headerSolarWatt', `${AppState.solarPowerWatt.toFixed(1)} W`);
  setElemText('headerBatteryPct', `${AppState.batterySoC.toFixed(0)}%`);

  setElemText('heroMoistureVal', AppState.soilMoisture.toFixed(1));
  setElemText('heroSolarVal', AppState.solarPowerWatt.toFixed(1));
  setElemText('heroBatteryVal', AppState.batterySoC.toFixed(0));
  setElemText('heroVpdVal', AppState.vpd.toFixed(2));

  // 3. Update Status Strip
  setElemText('decisionActionTitle', AppState.decisionText);
  setElemText('decisionActionReason', AppState.reasonText);
  setElemText('decisionLstmVal', AppState.aiPrediction.toFixed(1));
  
  const scadaBadge = document.getElementById('scadaModeBadge');
  if (scadaBadge) {
    scadaBadge.textContent = AppState.autoMode ? 'AUTO AI' : 'MANUAL';
    scadaBadge.className = `status-badge-chip ${AppState.autoMode ? 'active-auto' : 'active-manual'}`;
  }

  // 4. Update Telemetry Metric Boxes
  setElemText('gaugeAirTempNum', AppState.airTemp.toFixed(1));
  setElemText('gaugeAirHumiNum', AppState.airHumidity.toFixed(1));
  setElemText('gaugeSoilTempNum', AppState.soilTemp.toFixed(1));
  setElemText('gaugeDewPointNum', AppState.dewPoint.toFixed(1));
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

  // 6. Update Actuator State Toggles & Status
  updateActuatorUI();

  // 7. Update Live Chart
  if (window.AIAnalytics) {
    AIAnalytics.pushTelemetryToChart(AppState.soilMoisture, AppState.aiPrediction);
  }
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
   EXPORT DATA CSV
   =================================================================== */
window.exportSensorLogCSV = function() {
  const now = new Date();
  let csv = "Timestamp,Suhu_Udara_C,Kelembapan_Udara_Pct,Suhu_Tanah_C,Kelembapan_Tanah_Pct,VPD_kPa,Daya_Surya_W,Baterai_SoC_Pct,Status_Pompa\n";
  
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 15 * 60000);
    const tsStr = t.toISOString().replace('T', ' ').substring(0, 19);
    const at = (30 + Math.sin(i / 4) * 3).toFixed(1);
    const ah = (65 + Math.cos(i / 4) * 15).toFixed(1);
    const st = (26 + Math.sin(i / 5) * 1.5).toFixed(1);
    const sm = (44 + Math.cos(i / 3) * 8).toFixed(1);
    const vpd = (1.1 + Math.sin(i / 4) * 0.4).toFixed(2);
    const pv = (60 + Math.sin(i / 4) * 30).toFixed(1);
    const bat = (88 - i * 0.2).toFixed(0);
    const pump = sm < 40 ? "ON" : "OFF";
    csv += `${tsStr},${at},${ah},${st},${sm},${vpd},${pv},${bat},${pump}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tetes_smartfarm_telemetry_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
