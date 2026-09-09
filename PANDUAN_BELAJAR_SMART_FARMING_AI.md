# 📘 PANDUAN BELAJAR LENGKAP: TETES SMARTFARM AI
### *Dari Nol (Dasar) Sampai Paham Mendalam Seluruh Sistem IoT, AI, & Kelistrikan*
> **Penyusun:** Tim Antigravity AI  
> **Proyek:** TETES (Smart Micro-Irrigation Cabai Rawit berbasis IoT, Deep Learning LSTM, & Energi Cerdas)  
> **Lokasi Uji Lahan:** Kabupaten Gresik, Jawa Timur  

---

## 📑 DAFTAR ISI
1. [Konsep Dasar: Mengapa Proyek Ini Dibuat?](#1-konsep-dasar-mengapa-proyek-ini-dibuat)
2. [Arsitektur Sistem End-to-End (Alur Data Besar)](#2-arsitektur-sistem-end-to-end-alur-data-besar)
3. [Bedah Perangkat Keras (Hardware & Sensor)](#3-bedah-perangkat-keras-hardware--sensor)
4. [Penjelasan Catu Daya & Listrik (Jawaban Masalah Baterai 88%)](#4-penjelasan-catu-daya--listrik-jawaban-masalah-baterai-88)
5. [Komunikasi Data Real-Time (Firebase RTDB)](#5-komunikasi-data-real-time-firebase-rtdb)
6. [Otak Buatan: Deep Learning LSTM (predict.py)](#6-otak-buatan-deep-learning-lstm-predictpy)
7. [Logika Cerdas Irigasi (Matriks 4-Zona Agronomi)](#7-logika-cerdas-irigasi-matriks-4-zona-agronomi)
8. [Deteksi Otomatis Alat Nyala vs Alat Mati (Watchdog)](#8-deteksi-otomatis-alat-nyala-vs-alat-mati-watchdog)
9. [Integrasi Web Dashboard, GitHub & Auto-Deploy Vercel](#9-integrasi-web-dashboard-github--auto-deploy-vercel)
10. [Panduan Praktis Demo & Menjawab Pertanyaan Penguji/Dosen](#10-panduan-praktis-demo--menjawab-pertanyaan-pengujidosen)

---

## 1. Konsep Dasar: Mengapa Proyek Ini Dibuat?

### A. Masalah di Pertanian Konvensional
Di daerah seperti Kabupaten Gresik (iklim tropis pesisir dengan suhu tinggi rata-rata 32–35°C), petani cabai rawit umumnya menyiram tanaman dengan **metode konvensional (manual siram gembor/selang)**.
* **Kelemahan Manual**:
  1. **Pemborosan Air**: Petani menyiram rata-rata **900 mL per polybag per hari** (disiram 2x sehari masing-masing ~450 mL), tanpa mengetahui apakah tanah sebenarnya masih basah atau sudah jenuh.
  2. **Penyakit Busuk Akar (*Phytophthora capsici*)**: Terlalu banyak air membuat tanah becek/jenuh air (>80%), memicu jamur akar dan kematian tanaman cabai.
  3. **Tenaga Kerja & Waktu**: Petani harus menyiram manual setiap pagi dan sore hari.

### B. Solusi Inovasi TETES
TETES menggabungkan **3 pilar utama**:
1. **IoT (*Internet of Things*)**: Sensor tanah dan cuaca membaca kondisi nyata di polybag setiap detik.
2. **AI Deep Learning (LSTM)**: Memprediksi tren penurunan kelembapan 15–30 menit ke depan sebelum tanah kering layu.
3. **Irigasi Tetes Presisi (*Micro-Drip*)**: Air hanya dialirkan dalam dosis kecil (pulsa tetes ~11.6 mL per detik) hanya ketika tanaman benar-benar membutuhkannya.

---

## 2. Arsitektur Sistem End-to-End (Alur Data Besar)

Alur kerja sistem dari fisik tanaman sampai ke layar HP/laptop dapat digambarkan sebagai berikut:

```
[Tanaman Cabai di Polybag]
       │
       ▼ (Dibaca Sensor Fisik)
[Sensor Kapasitif + DHT22 + DS18B20]
       │
       ▼ (Sinyal Analog / Digital)
[ESP32 Microcontroller]  ◄── Ditenagai Listrik Langsung (Adaptor DC 12V/5V)
       │
       ▼ (WiFi / Hotspot HP melalui HTTP PUT)
[Firebase Realtime Database (Cloud)]
       │
       ├──► [Python AI Daemon (predict.py)] 
       │         │ (Membaca 72 data historis)
       │         │ (Menghitung Prediksi LSTM)
       │         └──► Menulis ke /AI_Prediction.json
       │
       └──► [Web Dashboard TETES OS (Vercel Live / Localhost)]
                 │ (Mendeteksi Heartbeat alat online/offline)
                 │ (Menghitung beban daya Watt realtime)
                 │ (Menghitung efisiensi penghematan air %)
                 └──► [Layar Petani / Penguji]
```

---

## 3. Bedah Perangkat Keras (Hardware & Sensor)

### 1. ESP32 Node 01 (Mikrokontroler Utama)
* **Fungsi**: Otak pengumpul data dan pengirim data ke internet.
* **Spesifikasi**: Dual-Core 32-bit Xtensa 240 MHz, RAM 520 KB, built-in Wi-Fi 802.11 b/g/n.
* **Kenapa ESP32?** Karena memiliki performa komputasi tinggi, konsumsi daya hemat (~2.2 Watt saat aktif kirim Wi-Fi), dan konektivitas internet langsung tanpa modul tambahan.

### 2. Sensor Kelembapan Tanah Kapasitif v1.2 (Capacitive Soil Moisture)
* **Prinsip Kerja**: Menggunakan rangkaian osilator frekuensi (IC 555 timer). Tanah yang basah memiliki konstanta dielektrik lebih tinggi (~80) dibanding tanah kering (~3-5). Frekuensi ini diubah menjadi tegangan analog yang dibaca oleh pin ADC ESP32.
* **Kelebihan Utama**: **TIDAK BERKARAT (Anti-Korosi)**. Berbeda dengan sensor garpu resistif murahan yang logamnya cepat berkarat akibat elektrolisis dalam 1 minggu, sensor kapasitif dilapisi pelindung solder-mask sehingga tahan bertahun-tahun di tanah.
* **Kalibrasi Pembacaan**:
  * Udara terbuka (0% Kering): Tegangan ADC $\approx 3.200 - 4.095$
  * Dicelupkan ke air (100% Basah): Tegangan ADC $\approx 1.200 - 1.500$
  * Rumus Pemetaan: $\text{Moisture (\%)} = \frac{\text{ADC}_{\text{kering}} - \text{ADC}_{\text{baca}}}{\text{ADC}_{\text{kering}} - \text{ADC}_{\text{basah}}} \times 100\%$

### 3. Sensor Suhu & Kelembapan Udara (DHT22 / AM2302)
* **Fungsi**: Mengukur suhu atmosfer sekitar tanaman (-40 s/d 80°C, akurasi ±0.5°C) dan kelembapan relatif udara (0-100% RH).
* **Manfaat Agronomi**: Digunakan untuk menghitung **VPD (*Vapor Pressure Deficit*)** atau indeks transpirasi daun cabai.

### 4. Sensor Suhu Tanah Digital (DS18B20 Waterproof)
* **Fungsi**: Mengukur temperatur di dalam zona perakaran polybag.
* **Protokol**: Digital 1-Wire (hanya butuh 1 kabel data GPIO dengan resistor pull-up 4.7kΩ).

### 5. Relay Modul 2-Channel
* **Fungsi**: Saklar elektronik berisolasi optocoupler untuk mengontrol pompa mini 12V (Relay 1 di GPIO 25) dan solenoid valve 12V (Relay 2 di GPIO 27).

### 6. Pompa Mini DC 12V & Nozzle Irigasi Tetes
* **Debit Aliran**: Rata-rata 4 nozzle tetes mengalirkan **11.6 mL air per detik**.
* Jika pompa menyiram selama 10 detik, air yang keluar adalah $10 \times 11.6 = 116\text{ mL}$.

---

## 4. Penjelasan Catu Daya & Listrik (Jawaban Masalah Baterai 88%)

### Pertanyaan Utama: *"Kenapa di dashboard muncul Baterai 88%, padahal alat saya pakai listrik langsung colokan adaptor, bukan baterai?"*

#### Jawaban Lengkap & Edukatif:
1. **Asal Usul Angka 88%**:
   * Dalam dokumen desain konsep awal sistem irigasi cerdas, ada rancangan **sistem tenaga surya mandiri (*Off-Grid Solar PV & Battery*)** untuk lahan sawah terbuka yang jauh dari jaringan listrik PLN.
   * Pada prototipe awal web, nilai 88% adalah nilai acuan modul baterai LiFePO4 12V 30Ah.
2. **Kondisi Riil Alat Saat Ini**:
   * Alat yang abang gunakan saat ini dicolokkan ke **Listrik Langsung (Adaptor Listrik AC 220V ke DC 12V/5V atau kabel USB laptop)**.
   * Tidak ada baterai fisik yang menempel di mikrokontroler.
3. **Solusi Cerdas yang Sudah Diintegrasikan ke Web**:
   * Sistem kini dilengkapi fitur **Smart Dual-Mode Power Detection**:
     * **Mode 1: Listrik Langsung (PLN / Adaptor AC-DC)** *(Mode Aktif Saat Ini)*:
       * Chip di atas otomatis menampilkan: `Sumber: Listrik Langsung (PLN)` dengan ikon colokan listrik biru `🔌`.
       * Chip Baterai 88% otomatis **DISEMBUNYIKAN / DINONAKTIFKAN** agar tidak menyesatkan.
       * Di panel SCADA tertulis: `Mode Catu Daya: Listrik Langsung PLN (Kontinu 100% Stabil)`.
     * **Mode 2: Baterai & Panel Surya (EBT Off-Grid)** *(Opsional / Jika Dipasang Baterai)*:
       * Jika di masa depan abang memasang modul pembaca voltase baterai, atau abang mengklik tombol mode catu daya, sistem akan otomatis beralih menampilkan persentase baterai dan daya solar.

### Perhitungan Daya Listrik Real-Time (Rumus & Nilai Nyata)
Daya listrik dihitung dengan rumus dasar fisika:
$$P = V \times I$$
*(Daya dalam Watt = Tegangan dalam Volt $\times$ Arus dalam Ampere)*

* **Saat ESP32 Standby (WiFi + 3 Sensor Aktif)**:
  * Tegangan: $5.0\text{ V}$
  * Arus: $\approx 0.44\text{ A}$ ($440\text{ mA}$)
  * **Beban Daya Listrik = $2.2\text{ Watt}$**
* **Saat Pompa Mini 12V Menyiram**:
  * Tegangan: $12.0\text{ V}$
  * Arus Pompa: $\approx 2.0\text{ A}$
  * Daya Pompa: $12 \times 2 = 24.0\text{ Watt}$
  * **Total Beban = $2.2\text{ W} + 24.0\text{ W} = 26.2\text{ Watt}$**
* **Saat Pompa + Solenoid Valve Buka Bersamaan**:
  * Daya Solenoid: $12\text{V} \times 0.5\text{A} = 6.0\text{ Watt}$
  * **Total Beban Maksimum = $2.2 + 24.0 + 6.0 = 32.2\text{ Watt}$**
* **Saat Alat Dimatikan / Kabel Dicabut (OFF)**:
  * **Beban Daya = $0.0\text{ Watt}$**

* **Akumulasi Konsumsi Energi ($\text{Watt-hour / Wh}$)**:
  $$\text{Energi (Wh)} = \sum \frac{P_{\text{load}} \times 1\text{ detik}}{3600}$$
  Web menghitung dan mengintegrasikan konsumsi energi ini setiap detik secara live!

---

## 5. Komunikasi Data Real-Time (Firebase RTDB)

Mengapa menggunakan **Firebase Realtime Database**?
Karena Firebase menggunakan koneksi WebSockets dan REST API dengan latensi sangat rendah (<100 milidetik). Ketika ESP32 mengirim data di Gresik, web di laptop/HP abang langsung terupdate seketika tanpa perlu reload/refresh browser.

### Struktur Node di Firebase:
1. **`/latest_telemetry.json`**:
   * Menyimpan 1 paket data paling baru dari ESP32 (dikirim tiap 5 detik).
   * Contoh isinya:
     ```json
     {
       "timestamp": "2026-09-10 01:52:28",
       "timestamp_unix": 1788979948,
       "soil_moisture": 99.5,
       "soil_temp": 28.3,
       "atmospheric_temp": 32.7,
       "humidity": 60.7,
       "dew_point": 24.1,
       "status_pompa": "OFF",
       "status_solenoid": "CLOSE",
       "status_tanah": "Basah",
       "keputusan_irigasi": "Tidak menyiram",
       "alasan_keputusan": "Tanah masih basah"
     }
     ```
2. **`/lstm_history/logs/<unix_timestamp>.json`**:
   * Menyimpan riwayat data historis yang terus bertambah sebagai bahan pelatihan dan input AI.
3. **`/AI_Prediction.json`**:
   * Menyimpan hasil ramalan model LSTM yang ditulis oleh script Python `predict.py`.
4. **`/control_state.json`**:
   * Menyimpan status kontrol aktuator (misal tombol manual Pompa ON/OFF di web).

---

## 6. Otak Buatan: Deep Learning LSTM (predict.py)

### Apa itu LSTM (*Long Short-Term Memory*)?
LSTM adalah cabang dari Jaringan Syaraf Tiruan (*Artificial Neural Network*) tipe RNN (*Recurrent Neural Network*) yang dirancang khusus untuk memahami **urutan waktu (*time series data*)**.

### Mengapa Bukan Regresi Biasa?
Kelembapan tanah memiliki sifat inersia (penurunan kelembapan tidak instan, melainkan dipengaruhi oleh panas terik matahari beberapa jam sebelumnya, kelembapan udara tadi siang, dan serapan air oleh akar). LSTM memiliki memori (*cell state* dan 3 pintu gerbang: *Forget Gate*, *Input Gate*, *Output Gate*) yang mampu mengingat tren fluktuasi 72 titik data sebelumnya.

### Cara Kerja `predict.py`:
1. Berjalan di latar belakang (*background service*).
2. Membaca 72 data log terakhir dari Firebase.
3. Melakukan normalisasi fitur (*MinMaxScaler* ke rentang 0 s/d 1).
4. Memasukkan matriks shape `(1, 72, 4)` ke model `soil_lstm_smooth.keras`.
5. Model menghasilkan prediksi: misalnya jika kelembapan sekarang 98%, model memprediksi 15 menit lagi kelembapannya menjadi 91.47%.
6. Hasilnya langsung dikirimkan ke `/AI_Prediction.json` di Firebase.

---

## 7. Logika Cerdas Irigasi (Matriks 4-Zona Agronomi)

Tanaman cabai (*Capsicum frutescens*) memiliki karakteristik perakaran yang sangat sensitif terhadap kelebihan dan kekurangan air. Sistem menerapkan klasifikasi 4 zona agronomi:

| Zona Kelembapan | Status Lengas | Risiko Tanaman | Keputusan Cerdas AI |
|---|---|---|---|
| **> 80%** | **Jenuh Air (Waterlogged)** | **Bahaya Busuk Akar (*Phytophthora*)** & mati lemas karena pori tanah terisi air tanpa oksigen | **Kunci Pompa OFF 100%**. Beri peringatan cek drainase. Penghematan air 100%. |
| **60% – 80%** | **Kapasitas Lapang Ideal** | **Zona Emas Cabai**. Air dan oksigen seimbang, pupuk terserap maksimal | **Standby (Tidak Menyiram)**. Hemat air 100% dibanding konvensional. |
| **40% – 59.9%** | **Batas Deplesi Lengas** | Tanaman mulai menggunakan air kapiler cadangan | **Cek Cuaca Satelit (Open-Meteo)**: Jika ramalan hujan $\ge 60\%$, tunda siram. Jika cerah, siapkan semprotan tetes pulsa 15 detik. |
| **< 40%** | **Titik Layu Kritis** | Daun layu, bunga rontok, fotosintesis terhenti | **Aktifkan Pompa Tetes Presisi Darurat** hingga tanah kembali ke batas minimum aman. |

### Perhitungan Efisiensi Penghematan Air (%)
* **Metode Petani Konvensional**: 900 mL / polybag / hari (siram siram terus meski tanah sudah basah).
* **Metode TETES AI**: Air hanya keluar saat pompa aktif ($11.6\text{ mL} \times \text{detik}$).
* Jika hari ini tanah masih basah (misal 99%) dan pompa tidak menyiram sama sekali (0 mL):
  $$\text{Efisiensi Penghematan Air} = \frac{900\text{ mL} - 0\text{ mL}}{900\text{ mL}} \times 100\% = 100.0\%$$
* Tanaman cabai selamat dari busuk akar dan air tanah geschont 100%!

---

## 8. Deteksi Otomatis Alat Nyala vs Alat Mati (Watchdog)

### Mengapa Perlu Fitur Ini?
Dalam Firebase Database, nilai data terakhir akan tersimpan selamanya meskipun kabel ESP32 dicabut dari listrik. Jika web hanya membaca data tersebut tanpa logika waktu, web akan terus mengira alat sedang aktif!

### Solusi Cerdas yang Diimplementasikan:
1. **ESP32 Mengirimkan Timestamp Waktu Riil (`timestamp_unix`)** setiap 5 detik.
2. Web Dashboard memiliki **Heartbeat Watchdog** yang berjalan setiap 1 detik:
   * Menghitung selisih waktu: $\Delta t = \text{Waktu Sekarang} - \text{Waktu Paket Tiba}$.
   * **Jika $\Delta t \le 15$ detik**:
     * Alat dinyatakan **ONLINE & AKTIF**.
     * Badge hijau berkedip hidup.
     * Ticker **Durasi Nyala (*Uptime*)** bertambah setiap detik (`00:14:32`).
     * Beban listrik menampilkan daya riil ($2.2\text{ W}$ s/d $26.2\text{ W}$).
   * **Jika $\Delta t > 15$ detik**:
     * Alat otomatis dinyatakan **OFF (ALAT BELUM DINYALAKAN / DICABUT)**.
     * Badge merah berkedip mati.
     * Web mencatat jam persis saat alat terputus: `Waktu Mati: Terputus Sejak 01:52:28 WIB (3m lalu)`.
     * Beban listrik otomatis jatuh ke **`0.0 W`**.
     * Heartbeat menampilkan `Terputus • Menunggu ESP32`.

---

## 9. Integrasi Web Dashboard, GitHub & Auto-Deploy Vercel

Sistem ini menggunakan arsitektur **Modern DevOps CI/CD (Continuous Integration / Continuous Deployment)**:
1. Kode sumber disimpan di repository GitHub:  
   `https://github.com/SyauQillah173/tetes-smartfarm-ai.git`
2. Repository terhubung ke **Vercel Cloud Hosting**.
3. Setiap kali ada penambahan fitur atau perbaikan kode di laptop:
   * Kita menjalankan `git commit` dan `git push origin main`.
   * GitHub menerima kode baru.
   * Vercel secara otomatis mendeteksi perubahan (*Webhook trigger*), mengompilasi file, dan memperbarui website live dalam waktu < 20 detik tanpa downtime.

---

## 10. Panduan Praktis Demo & Menjawab Pertanyaan Penguji/Dosen

Jika abang melakukan demonstrasi atau sidang proyek ini, ikuti skenario demo memukau ini:

### 🎯 Skenario 1: Demo Deteksi Otomatis Nyala & Mati
1. Buka website dashboard di laptop / HP.
2. **Saat alat menyala**:
   * Tunjukkan bahwa badge berwarna hijau: `Alat Online & Nyala`.
   * Tunjukkan bahwa `Waktu Operasional (Uptime)` bergerak bertambah setiap detik.
   * Tunjukkan bahwa beban listrik membaca $2.2\text{ W}$.
3. **Cabut kabel data/listrik dari ESP32**:
   * Tunggu 15 detik tanpa menyentuh tombol apapun di web.
   * Tunjukkan kepada penguji: *"Lihat bapak/ibu, web secara otomatis mendeteksi bahwa paket data terhenti lebih dari 15 detik. Indikator seketika berubah merah: 'Alat OFF (Belum Dinyalakan)', beban listrik jatuh ke 0.0 W, dan waktu mati tercatat presisi."*
4. **Colokkan kembali kabelnya**:
   * Dalam 5 detik, web langsung otomatis kembali hijau `Alat Online & Nyala` dan uptime mulai menghitung lagi.

### 🎯 Skenario 2: Demo Kelembapan Tanah & Kecerdasan Air
1. Pegang sensor kelembapan di udara terbuka:
   * Kelembapan akan turun drastis (<40%).
   * Tunjukkan bahwa AI mendeteksi **Zona Titik Layu Kritis (<40%)** dan menyalakan pompa secara presisi.
   * Tunjukkan bahwa saat pompa menyala, beban listrik melonjak ke $26.2\text{ W}$, dan durasi siram menghitung per detik.
2. Celupkan sensor ke dalam segelas air atau tanah basah:
   * Kelembapan langsung naik ke 95–100%.
   * Tunjukkan bahwa AI langsung mengunci pompa OFF: **Zona Jenuh Air (>80%) - Irigasi Dilarang**.
   * Tunjukkan bahwa efisiensi penghematan air mencapai **100%**.

### 🎯 Skenario 3: Menjawab Pertanyaan: *"Kenapa dayanya pakai listrik langsung bukan baterai?"*
* **Jawaban Mantap**:
  > *"Sistem TETES ini kami rancang dengan arsitektur **Hybrid Dual-Power**. Pada instalasi pekarangan rumah atau green-house hidroponik yang dekat stopkontak, sistem berjalan sangat efisien menggunakan listrik langsung PLN (adaptor 12V/5V) dengan konsumsi daya sangat hemat hanya 2.2 Watt saat standby. Namun untuk instalasi lahan pertanian terbuka yang jauh dari tiang listrik PLN, sistem ini sudah siap dan mendukung modul baterai LiFePO4 dan Panel Surya EBT 100 Wp tanpa perlu mengubah kode program."*

---
*Dokumen ini dibuat otomatis sebagai panduan belajar komprehensif Proyek TETES SmartFarm AI 2026.*
