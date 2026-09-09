/**
 * AGRONOMY & PRECISION IRRIGATION CALCULATION ENGINE
 * Specialized for Capsicum annuum (Tanaman Cabai)
 * Implementasi Formula Standar FAO & Sains Pertanian Presisi
 */

const AgronomyEngine = {
  // 1. Perhitungan Dew Point (Titik Embun) menggunakan Magnus-Tetens Formula
  calculateDewPoint(temperature, humidity) {
    if (!humidity || !temperature || humidity <= 0) return 0;
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100.0);
    const dewPoint = (b * alpha) / (a - alpha);
    return parseFloat(dewPoint.toFixed(1));
  },

  // 2. Perhitungan Vapor Pressure Deficit (VPD) dalam satuan kiloPascal (kPa)
  // Menentukan laju transpirasi dan status pembukaan stomata daun cabai
  calculateVPD(temperature, humidity) {
    if (!temperature || !humidity) return { vpd: 0, status: 'Normal', zone: 'optimal', desc: '-' };
    // Saturation Vapor Pressure (VPsat) in kPa
    const vpSat = 0.61078 * Math.exp((17.27 * temperature) / (temperature + 237.3));
    // Actual Vapor Pressure (VPact) in kPa
    const vpAct = vpSat * (humidity / 100.0);
    const vpd = parseFloat((vpSat - vpAct).toFixed(2));

    let status = 'Ideal';
    let zone = 'optimal';
    let desc = 'Transpirasi & penyerapan nutrisi optimal';

    if (vpd < 0.4) {
      status = 'Sangat Rendah (Kelembapan Berlebih)';
      zone = 'danger-low';
      desc = 'Risiko tinggi serangan jamur daun & busuk akar (Antraknosa)';
    } else if (vpd < 0.8) {
      status = 'Rendah';
      zone = 'warning-low';
      desc = 'Laju transpirasi lambat, pertumbuhan vegetatif lambat';
    } else if (vpd <= 1.2) {
      status = 'Zona Emas Cabai (0.8 - 1.2 kPa)';
      zone = 'optimal';
      desc = 'Fotosintesis maksimal, stomata terbuka ideal';
    } else if (vpd <= 1.6) {
      status = 'Tinggi';
      zone = 'warning-high';
      desc = 'Laju penguapan meningkat, awasi kebutuhan air akar';
    } else {
      status = 'Sangat Kering (Stres Air)';
      zone = 'danger-high';
      desc = 'Stomata menutup untuk cegah layu, perlu irigasi mikro segera';
    }

    return { vpd, vpSat: parseFloat(vpSat.toFixed(2)), vpAct: parseFloat(vpAct.toFixed(2)), status, zone, desc };
  },

  // 3. Evapotranspirasi Acuan (ET0) Metode Hargreaves-Samani (mm/hari)
  // Memperhitungkan radiasi ekstraterestrial matahari di koordinat Jawa Timur (Kab. Gresik lat -7.15)
  calculateET0(tempMean, tempMax, tempMin, solarRadiation = 18.5) {
    if (!tempMean) tempMean = 29.0;
    if (!tempMax) tempMax = tempMean + 4.5;
    if (!tempMin) tempMin = tempMean - 4.5;
    
    // Ra = Extraterrestrial Radiation ~ 18-20 MJ/m2/day untuk ekuator
    const deltaT = Math.max(0.1, tempMax - tempMin);
    const et0 = 0.0023 * (tempMean + 17.8) * Math.sqrt(deltaT) * (solarRadiation * 0.408);
    return parseFloat(et0.toFixed(2));
  },

  // 4. Kebutuhan Air Tanaman Cabai (ETc = ET0 * Kc)
  // Fase pertumbuhan cabai:
  // - Awal (Vegetatif 0-30 HST): Kc = 0.60
  // - Pembungaan & Pembuahan (Mid 31-80 HST): Kc = 1.15
  // - Pematangan & Panen (Late 81-120 HST): Kc = 0.80
  calculateCropWaterRequirement(et0, stage = 'mid') {
    const kcMap = {
      initial: 0.60,
      mid: 1.15,
      late: 0.80
    };
    const kc = kcMap[stage] || 1.15;
    const etc = parseFloat((et0 * kc).toFixed(2)); // mm/hari
    
    // Konversi ke liter per polybag / tanaman per hari (Area per tanaman ~ 0.25 m2)
    const litersPerPlant = parseFloat((etc * 0.25).toFixed(2));
    return { kc, etc, litersPerPlant };
  },

  // 5. Kalkulasi Penghematan Air Ekstrem vs Metode Konvensional
  calculateWaterSavings(numPlants = 500, daysActive = 30) {
    // Irigasi Konvensional (Siram siram basah manual / gembor): ~1.2 - 1.5 Liter/tanaman/hari
    const convDailyPerPlant = 1.25; 
    // Irigasi Mikro TETES Berbasis AI: Rata-rata presisi ~0.45 - 0.55 Liter/tanaman/hari
    const smartDailyPerPlant = 0.48;

    const convTotalWater = (convDailyPerPlant * numPlants * daysActive); // Liter
    const smartTotalWater = (smartDailyPerPlant * numPlants * daysActive); // Liter
    const savedWater = convTotalWater - smartTotalWater;
    const savingsPercent = parseFloat(((savedWater / convTotalWater) * 100).toFixed(1));

    // Biaya air (PDAM/Sumur Pompa Listrik ~ Rp 4.500 / m3 = Rp 4.5 per liter)
    const costPerLiter = 4.5;
    const financialSavingsRp = Math.round(savedWater * costPerLiter);

    return {
      convTotalLiters: convTotalWater,
      smartTotalLiters: smartTotalWater,
      savedLiters: savedWater,
      savingsPercent,
      financialSavingsRp
    };
  }
};

window.AgronomyEngine = AgronomyEngine;
