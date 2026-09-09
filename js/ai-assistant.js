/**
 * SMART FARMING AI AGRONOMIST & EBT ADVISOR CHATBOT
 * Asisten Cerdas Konsultasi Pertanian Presisi & Energi Baru Terbarukan
 */

const AIAssistant = {
  knowledgeBase: [
    {
      keywords: ['cabai', 'tanaman', 'kondisi', 'kesehatan', 'tumbuh'],
      response: `🌱 **Kondisi Tanaman Cabai (*Capsicum annuum*):**
- **Kelembapan Tanah Ideal:** 45% - 55% pada fase vegetatif, dan 50% - 60% pada fase pembungaan & pembuahan.
- **VPD Target:** 0.8 s.d 1.2 kPa untuk memaksimalkan penyerapan unsur hara kalsium (mencegah busuk ujung buah / *blossom end rot*).
- **Suhu Perakaran Optimal:** 22°C - 28°C (Sensor DS18B20 memantau ini secara real-time agar akar tidak busuk).`
    },
    {
      keywords: ['hemat', 'air', 'efisiensi', 'persen', 'konsumsi', 'tetes'],
      response: `💧 **Kalkulasi Efisiensi Penghematan Air Ekstrem:**
- **Irigasi Konvensional (Siram Gembor/Selang):** 1.25 Liter / tanaman / hari (Banyak air hilang akibat limpasan permukaan dan evaporasi cepat).
- **Irigasi Mikro TETES Berbasis AI:** 0.48 Liter / tanaman / hari.
- **Tingkat Penghematan:** **61.6% Penghematan Air Nyata!**
- Sistem menyiram langsung ke zona perakaran (*root zone target*) dan otomatis menunda jika ada prediksi hujan dari Open-Meteo.`
    },
    {
      keywords: ['ebt', 'surya', 'solar', 'panel', 'baterai', 'energi', 'listrik'],
      response: `☀️ **Integrasi Energi Baru Terbarukan (EBT):**
- **Pembangkit:** Modul Panel Surya 100 Wp Monocrystalline + Solar Charge Controller (SCC) cerdas.
- **Penyimpanan:** Baterai LiFePO4 12V 30Ah (360 Wh), siklus hidup > 2000 cycle.
- **Kemandirian Energi:** 100% *Off-Grid Zero Emission*. Tidak memerlukan suplai listrik PLN atau genset BBM.
- **Reduksi Emisi Karbon:** Mengurangi sekitar **0.85 kg CO₂ / kWh** energi yang dibangkitkan!`
    },
    {
      keywords: ['ai', 'lstm', 'prediksi', 'model', 'dataset', 'deep learning'],
      response: `🧠 **Arsitektur Model AI Prediktif (LSTM):**
- **Model:** Deep Learning Long Short-Term Memory (*soil_lstm_smooth.keras*).
- **Input Data:** 72 time-steps historis (interval 15 menit) berisi: Kelembapan Tanah, Suhu Tanah (DS18B20), Suhu Udara & Kelembapan Udara (DHT22), Titik Embun (Dew Point).
- **Fitur Cerdas:** Moving Average Window = 3 untuk perataan noise sensor + MinMax Scaling.
- **Output:** Prediksi kelembapan tanah 15-60 menit ke depan, memungkinkan sistem mengantisipasi kekeringan *sebelum* tanaman mengalami layu permanen!`
    },
    {
      keywords: ['lomba', 'gresik', 'biaya', 'investasi', 'roi', 'untung', 'keunggulan'],
      response: `🏆 **Keunggulan Kompetitif SMART FARMING AI (TETES EBT):**
1. **Sinergi Tri-Pillar:** IoT Presisi + AI LSTM Prediktif + Energi Baru Terbarukan (EBT).
2. **Kesesuaian Masalah Lapangan:** Menjawab krisis kekeringan petani Gresik & Bengawan Solo (seperti kasus Desa Padang Bandung & Sidang Pleno Komisi Irigasi).
3. **PWA Native Web:** Dapat diakses petani lewat smartphone mana pun tanpa instalasi rumit dari toko aplikasi (cukup via Google Chrome).
4. **Payback Period / ROI:** Diperkirakan balik modal dalam waktu **1.2 - 1.5 tahun** dari penghematan tenaga kerja harian, penghematan air 60%, dan peningkatan hasil panen cabai +25%!`
    },
    {
      keywords: ['hama', 'penyakit', 'jamur', 'layu', 'kuning', 'pupuk'],
      response: `🛡️ **Manajemen Hama & Penyakit Cabai dengan Sensor:**
- **Antraknosa (Patek):** Berkembang jika Kelembapan Udara > 85% dan Suhu > 30°C. Sistem akan memberi peringatan bahaya spora jamur.
- **Layu Bakteri / Fusarium:** Dihindari dengan menjaga tanah tidak terlalu becek (kelembapan tanah dibatasi max 55%).
- **Pupuk Fertigasi Presisi:** Dosis N-P-K cair dapat diinjeksikan langsung lewat tabung venturi irigasi tetes secara efisien.`
    }
  ],

  getReply(query) {
    const q = query.toLowerCase().trim();
    if (!q) return 'Halo! Saya asisten cerdas SMART FARMING AI. Silakan tanyakan seputar kondisi tanaman cabai, prediksi kelembapan AI, kalkulasi penghematan air, atau sistem Energi Surya EBT kami!';

    for (const item of this.knowledgeBase) {
      if (item.keywords.some(k => q.includes(k))) {
        return item.response;
      }
    }

    return `Pertanyaan Anda sangat menarik! Sistem **SMART FARMING AI (TETES EBT)** mengintegrasikan telemetri sensor multi-parameter, prediksi AI LSTM dengan sequence 72 data point, prakiraan cuaca Open-Meteo, dan pembangkit listrik tenaga surya 100Wp mandiri. 
    
Anda bisa menanyakan rincian:
- *Kondisi tanaman cabai & VPD*
- *Efisiensi penghematan air (60%)*
- *Sistem Energi Baru Terbarukan (EBT Solar & Baterai)*
- *Cara kerja prediksi AI LSTM*`;
  }
};

window.AIAssistant = AIAssistant;
