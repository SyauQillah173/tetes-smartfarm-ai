/**
 * SMART ENERGY MANAGEMENT SYSTEM (SEMS) - EBT SOLAR PHOTOVOLTAIC
 * Sistem Pengelolaan Energi Baru Terbarukan untuk Irigasi Pertanian Presisi
 */

const SolarEBTEngine = {
  pvSpecs: {
    capacityWp: 100,      // Kapasitas Panel Surya 100 Wp
    systemVoltage: 12.0,  // Tegangan Sistem DC 12V
    batteryCapacityAh: 30,// Baterai LiFePO4 12V 30Ah (360 Wh)
    pumpPowerWatt: 24,    // Daya Pompa Mini Diafragma 12V 2A = 24W
    solenoidPowerWatt: 6, // Daya Solenoid Valve 12V 0.5A = 6W
    espControllerWatt: 2  // Daya ESP32 + Sensor = ~2W
  },

  // Perhitungan Radiasi Matahari (W/m2) berdasarkan waktu & tutupan awan
  calculateSolarIrradiance(hour = 12, cloudCoverPercent = 20) {
    if (hour < 6 || hour > 18) return 0;
    // Puncak radiasi di jam 12 siang (~950 W/m2 pada kondisi cerah di Indonesia)
    const normalizedHour = (hour - 6) / 12; // 0 to 1
    const baseIrradiance = Math.sin(normalizedHour * Math.PI) * 980;
    const cloudFactor = Math.max(0.15, (100 - cloudCoverPercent * 0.8) / 100);
    return Math.max(0, Math.round(baseIrradiance * cloudFactor));
  },

  // Perhitungan Daya Real-time Panel Surya (Watt)
  calculatePVGeneration(irradiance, efficiency = 0.18, tempCoefficient = -0.004, ambientTemp = 30) {
    if (irradiance <= 0) return { powerWatt: 0, voltage: 0, current: 0 };
    
    // Suhu sel PV (umumnya ambient + 25C saat terik)
    const cellTemp = ambientTemp + (irradiance / 800) * 25;
    const tempLoss = 1 + tempCoefficient * (cellTemp - 25);
    
    // Daya aktual
    const standardIrradiance = 1000; // W/m2 STC
    const power = this.pvSpecs.capacityWp * (irradiance / standardIrradiance) * tempLoss;
    const actualPower = Math.max(0, Math.min(this.pvSpecs.capacityWp * 1.05, parseFloat(power.toFixed(1))));

    // Estimasi Vmp & Imp
    const voltage = actualPower > 0 ? parseFloat((14.2 + (Math.random() * 0.4)).toFixed(2)) : 12.0;
    const current = voltage > 0 ? parseFloat((actualPower / voltage).toFixed(2)) : 0;

    return {
      powerWatt: actualPower,
      voltage,
      current,
      cellTemp: Math.round(cellTemp)
    };
  },

  // Perhitungan Battery State of Charge (SoC %)
  estimateBatterySoC(currentSoC, netPowerWatt, deltaMinutes = 1) {
    const totalBatteryWh = this.pvSpecs.systemVoltage * this.pvSpecs.batteryCapacityAh; // 360 Wh
    const deltaEnergyWh = (netPowerWatt * deltaMinutes) / 60;
    const newSoC = currentSoC + (deltaEnergyWh / totalBatteryWh) * 100;
    return parseFloat(Math.max(15, Math.min(100, newSoC)).toFixed(1));
  },

  // Perhitungan Total Reduksi Emisi Karbon (Carbon Offset kg CO2)
  // Faktor Emisi Jaringan Listrik Nasional Indonesia = 0.85 kg CO2 / kWh
  calculateCarbonOffset(totalEnergyGeneratedKWh) {
    const EMISSION_FACTOR_INDONESIA = 0.85; // kg CO2 per kWh
    const carbonOffsetKg = parseFloat((totalEnergyGeneratedKWh * EMISSION_FACTOR_INDONESIA).toFixed(2));
    
    // Setara dengan jumlah pohon yang ditanam (1 pohon ~ 22 kg CO2 / tahun)
    const treeEquivalent = parseFloat((carbonOffsetKg / 22).toFixed(2));
    return { carbonOffsetKg, treeEquivalent };
  },

  // AI Smart Energy Dispatch Strategy
  getEnergyAdvisory(socPercent, pvPowerWatt, isWateringNeeded, rainProb) {
    if (socPercent < 25) {
      return {
        priority: 'CRITICAL_ENERGY_SAVE',
        text: 'Baterai Kritis (<25%). Penghematan energi aktif. Hanya siram jika tanah kering darurat.',
        badgeClass: 'danger'
      };
    }
    if (pvPowerWatt > 40 && isWateringNeeded && rainProb < 40) {
      return {
        priority: 'OPTIMAL_SOLAR_WINDOW',
        text: 'Surya Melimpah (Direct Solar Pumping). Waktu terbaik untuk irigasi mikro tanpa kuras baterai.',
        badgeClass: 'good'
      };
    }
    if (rainProb >= 60) {
      return {
        priority: 'RAIN_PREDICTION_HOLD',
        text: 'Potensi Hujan Tinggi. Pompa di-hold untuk efisiensi air & energi listrik.',
        badgeClass: 'warning'
      };
    }
    return {
      priority: 'NORMAL_STABLE',
      text: 'Pasokan Energi Mandiri Stabil. Sistem berjalan dalam mode efisiensi EBT.',
      badgeClass: 'good'
    };
  }
};

window.SolarEBTEngine = SolarEBTEngine;
