/**
 * AI ANALYTICS & PREDICTIVE LSTM VISUALIZATION MODULE
 * Integrates Chart.js for real-time telemetry and 72-point time series predictions
 */

const AIAnalytics = {
  moistureChart: null,
  environmentalChart: null,
  historyPoints: [],
  predictionPoints: [],
  lastActualMoisture: null,
  lastPrediction: null,

  initCharts() {
    this.initMoistureChart();
    this.initEnvironmentalChart();
  },

  initMoistureChart() {
    const ctx = document.getElementById('moistureForecastChart');
    if (!ctx) return;

    // Pure real-time: start empty, waiting for live Firebase records
    this.moistureChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Kelembapan Tanah Aktual (%)',
            data: [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 3,
            pointBackgroundColor: '#34d399',
            pointRadius: 4,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.35
          },
          {
            label: 'Prediksi AI LSTM 15m (%)',
            data: [],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            borderWidth: 3,
            borderDash: [6, 4],
            pointBackgroundColor: '#0284c7',
            pointBorderColor: '#ffffff',
            pointRadius: 5,
            pointHoverRadius: 8,
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#0B355E',
              font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            titleColor: '#0B355E',
            bodyColor: '#1e293b',
            borderColor: '#45A94B',
            borderWidth: 1.5,
            padding: 12,
            cornerRadius: 10,
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            titleFont: { family: 'Plus Jakarta Sans', weight: '800' }
          }
        },
        scales: {
          x: {
            grid: { color: '#e2ede5' },
            ticks: { color: '#64748b', font: { size: 11, weight: '600' } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: '#e2ede5' },
            ticks: {
              color: '#64748b',
              font: { size: 11, weight: '600' },
              callback: (val) => val + '%'
            }
          }
        }
      }
    });
  },

  initEnvironmentalChart() {
    const ctx = document.getElementById('environmentalChart');
    if (!ctx) return;

    // Pure real-time: start empty, waiting for live Firebase records
    this.environmentalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Suhu Udara (°C)',
            data: [],
            borderColor: '#f59e0b',
            borderWidth: 2.5,
            tension: 0.3,
            yAxisID: 'y'
          },
          {
            label: 'Kelembapan Udara (%)',
            data: [],
            borderColor: '#1BAAF0',
            borderWidth: 2.5,
            tension: 0.3,
            yAxisID: 'y1'
          },
          {
            label: 'VPD (kPa x 10)',
            data: [],
            borderColor: '#45A94B',
            borderWidth: 2.5,
            borderDash: [4, 4],
            tension: 0.3,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#0B355E', font: { size: 11, weight: '700' } }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            titleColor: '#0B355E',
            bodyColor: '#1e293b',
            borderColor: '#1BAAF0',
            borderWidth: 1.5,
            cornerRadius: 10
          }
        },
        scales: {
          x: {
            grid: { color: '#e2ede5' },
            ticks: { color: '#64748b', font: { weight: '600' } }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: '#e2ede5' },
            ticks: { color: '#d97706', font: { weight: '700' } }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#0284c7', font: { weight: '700' } }
          }
        }
      }
    });
  },

  // Populate charts with actual historical records from Firebase
  populateFromFirebaseLogs(records) {
    if (!records || !Array.isArray(records) || records.length === 0) return;

    const labels = [];
    const moistureData = [];
    const forecastData = [];
    const airTempData = [];
    const humiData = [];
    const vpdData = [];

    records.forEach(r => {
      let timeLabel = '';
      if (r.timestamp) {
        const parts = r.timestamp.split(' ');
        timeLabel = parts[1] ? parts[1].substring(0, 5) : r.timestamp;
      } else if (r.timestamp_unix) {
        const d = new Date(r.timestamp_unix * 1000);
        timeLabel = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } else {
        timeLabel = '--:--';
      }

      labels.push(timeLabel);

      const sm = (r.soil_moisture !== undefined && r.soil_moisture !== null) ? parseFloat(Number(r.soil_moisture).toFixed(1)) : null;
      moistureData.push(sm);
      forecastData.push(null);

      const at = (r.atmospheric_temp !== undefined && r.atmospheric_temp !== null) ? parseFloat(Number(r.atmospheric_temp).toFixed(1)) : null;
      const ah = (r.humidity !== undefined && r.humidity !== null) ? parseFloat(Number(r.humidity).toFixed(1)) : null;
      airTempData.push(at);
      humiData.push(ah);

      if (at !== null && ah !== null && window.AgronomyEngine) {
        const v = AgronomyEngine.calculateVPD(at, ah);
        vpdData.push(parseFloat((v.vpd * 10).toFixed(1)));
      } else {
        vpdData.push(null);
      }
    });

    // Update Moisture Chart
    if (this.moistureChart) {
      this.moistureChart.data.labels = [...labels];
      this.moistureChart.data.datasets[0].data = [...moistureData];
      this.moistureChart.data.datasets[1].data = [...forecastData];

      // If prediction is present, link from last actual point
      const lastActual = moistureData.filter(v => v !== null).pop();
      if (lastActual !== undefined && this.lastPrediction !== null) {
        const lastIdx = this.moistureChart.data.labels.length - 1;
        this.moistureChart.data.datasets[1].data[lastIdx] = lastActual;

        const predTime = this.lastPrediction.prediction_time ? this.lastPrediction.prediction_time.split(' ')[1]?.substring(0, 5) || 'AI' : 'AI (+15m)';
        this.moistureChart.data.labels.push(`${predTime} (AI)`);
        this.moistureChart.data.datasets[0].data.push(null);
        this.moistureChart.data.datasets[1].data.push(this.lastPrediction.predicted_soil_moisture);
      }

      this.moistureChart.update('none');
    }

    // Update Environmental Chart
    if (this.environmentalChart) {
      this.environmentalChart.data.labels = [...labels];
      this.environmentalChart.data.datasets[0].data = airTempData;
      this.environmentalChart.data.datasets[1].data = humiData;
      this.environmentalChart.data.datasets[2].data = vpdData;
      this.environmentalChart.update('none');
    }
  },

  // Update live telemetry from ESP32 into charts
  updateRealtimeMoisture(val, timestampStr) {
    if (!this.moistureChart || val === null || isNaN(val)) return;
    this.lastActualMoisture = parseFloat(Number(val).toFixed(1));

    const timeLabel = timestampStr 
      ? (timestampStr.split(' ')[1]?.substring(0, 5) || timestampStr)
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const chart = this.moistureChart;
    const labels = chart.data.labels;
    const actual = chart.data.datasets[0].data;

    // Check if duplicate last label
    if (labels.length > 0 && labels[labels.length - 1] === timeLabel) {
      actual[actual.length - 1] = this.lastActualMoisture;
    } else {
      if (labels.length >= 25) {
        labels.shift();
        actual.shift();
        if (chart.data.datasets[1].data.length > 0) chart.data.datasets[1].data.shift();
      }
      labels.push(timeLabel);
      actual.push(this.lastActualMoisture);
      chart.data.datasets[1].data.push(null);
    }

    chart.update('none');
  },

  updateRealtimeEnvironmental(airTemp, humi, vpd, timestampStr) {
    if (!this.environmentalChart) return;
    const timeLabel = timestampStr 
      ? (timestampStr.split(' ')[1]?.substring(0, 5) || timestampStr)
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const chart = this.environmentalChart;
    const labels = chart.data.labels;

    if (labels.length > 0 && labels[labels.length - 1] === timeLabel) {
      if (airTemp !== null) chart.data.datasets[0].data[labels.length - 1] = parseFloat(Number(airTemp).toFixed(1));
      if (humi !== null) chart.data.datasets[1].data[labels.length - 1] = parseFloat(Number(humi).toFixed(1));
      if (vpd !== null) chart.data.datasets[2].data[labels.length - 1] = parseFloat((Number(vpd) * 10).toFixed(1));
    } else {
      if (labels.length >= 25) {
        labels.shift();
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
        chart.data.datasets[2].data.shift();
      }
      labels.push(timeLabel);
      chart.data.datasets[0].data.push(airTemp !== null ? parseFloat(Number(airTemp).toFixed(1)) : null);
      chart.data.datasets[1].data.push(humi !== null ? parseFloat(Number(humi).toFixed(1)) : null);
      chart.data.datasets[2].data.push(vpd !== null ? parseFloat((Number(vpd) * 10).toFixed(1)) : null);
    }

    chart.update('none');
  },

  // Update Prediction from Real Firebase /AI_Prediction node
  updatePrediction(predObj) {
    if (!predObj || !this.moistureChart) return;
    const predVal = parseFloat(predObj.predicted_soil_moisture);
    if (isNaN(predVal)) return;

    this.lastPrediction = {
      predicted_soil_moisture: parseFloat(predVal.toFixed(1)),
      prediction_time: predObj.prediction_time || null
    };

    const chart = this.moistureChart;
    const labels = chart.data.labels;
    const actual = chart.data.datasets[0].data;
    const forecast = chart.data.datasets[1].data;

    // Reset forecast array
    for (let i = 0; i < forecast.length; i++) forecast[i] = null;

    // Connect from last actual
    if (actual.length > 0 && actual[actual.length - 1] !== null) {
      forecast[actual.length - 1] = actual[actual.length - 1];
    }

    // Attach target prediction point
    const predTime = predObj.prediction_time 
      ? (predObj.prediction_time.split(' ')[1]?.substring(0, 5) || 'AI (+15m)')
      : 'AI (+15m)';

    // Remove old AI label if present at the end
    if (labels.length > 0 && labels[labels.length - 1].includes('(AI)')) {
      labels.pop();
      actual.pop();
      forecast.pop();
    }

    labels.push(`${predTime} (AI)`);
    actual.push(null);
    forecast.push(parseFloat(predVal.toFixed(1)));

    chart.update('none');
  },

  // Logika Pengambilan Keputusan Irigasi Cerdas (AI Decision Matrix)
  evaluateSmartDecision(soilMoisture, aiPrediction, rainProb, batterySoC, autoMode) {
    if (!autoMode) {
      return {
        action: 'Mode Manual Aktif',
        reason: 'Kontrol perangkat penuh dipegang oleh pengguna / operator.',
        badge: 'MANUAL',
        classType: 'warning',
        durationMs: 0,
        pumpActive: false,
        solenoidActive: false
      };
    }

    // Rule 1: Tanah Masih Basah (> 50%)
    if (soilMoisture > 50.0) {
      return {
        action: 'Standby (Tidak Menyiram)',
        reason: 'Kelembapan tanah masih basah dan mencukupi (> 50%). Menghemat air dan daya baterai.',
        badge: 'OPTIMAL_MOISTURE',
        classType: 'good',
        durationMs: 0,
        pumpActive: false,
        solenoidActive: false
      };
    }

    // Rule 2: Kelembapan Moderat (40% - 50%)
    if (soilMoisture >= 40.0 && soilMoisture <= 50.0) {
      if (rainProb >= 60.0) {
        return {
          action: 'Tunda Penyiraman (Presipitasi AI)',
          reason: `Prakiraan Open-Meteo mendeteksi probabilitas hujan tinggi (${rainProb}%). Menghemat air alamiah.`,
          badge: 'RAIN_DELAY',
          classType: 'warning',
          durationMs: 0,
          pumpActive: false,
          solenoidActive: false
        };
      }
      return {
        action: 'Standby / Kelembapan Cukup',
        reason: 'Kelembapan zona akar masih dalam toleransi aman tanaman cabai.',
        badge: 'SAFE_ZONE',
        classType: 'good',
        durationMs: 0,
        pumpActive: false,
        solenoidActive: false
      };
    }

    // Rule 3: Tanah Kering (< 40%) - Perlu Tindakan Irigasi Mikro
    if (soilMoisture < 40.0) {
      // Jika baterai sangat rendah dan tidak ada matahari
      if (batterySoC < 20.0) {
        return {
          action: 'Siram Mikro Darurat (Hemat Daya)',
          reason: 'Tanah kering, tetapi SoC Baterai rendah (<20%). Pemberian air singkat 3 detik untuk proteksi sistem.',
          badge: 'LOW_BATTERY_PULSE',
          classType: 'warning',
          durationMs: 3000,
          pumpActive: true,
          solenoidActive: true
        };
      }

      if (rainProb >= 60.0) {
        return {
          action: 'Siram Ringan (Micro-dosing 5 detik)',
          reason: `Tanah kering namun potensi hujan ${rainProb}%. Diberikan dosis ringan untuk stabilisasi perakaran.`,
          badge: 'LIGHT_WATERING',
          classType: 'warning',
          durationMs: 5000,
          pumpActive: true,
          solenoidActive: true
        };
      }

      // Cuaca cerah dan tanah kering
      const aiNote = (aiPrediction && aiPrediction < 40) ? 'Sensor & AI memprediksi penurunan kelembapan lanjutan' : 'Sensor mendeteksi deplesi air akar';
      return {
        action: 'Siram Penuh (Precision Drip 10 detik)',
        reason: `${aiNote}. Pompa diafragma & solenoid dibuka penuh ditenagai energi surya.`,
        badge: 'FULL_WATERING',
        classType: 'active-irrigate',
        durationMs: 10000,
        pumpActive: true,
        solenoidActive: true
      };
    }

    return {
      action: 'Monitoring Aktif',
      reason: 'Sistem menganalisis data sensor.',
      badge: 'MONITORING',
      classType: 'good',
      durationMs: 0,
      pumpActive: false,
      solenoidActive: false
    };
  }
};

window.AIAnalytics = AIAnalytics;
