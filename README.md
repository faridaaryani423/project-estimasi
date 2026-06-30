# Project Estimasi Hegar

Aplikasi berbasis web untuk **Manajemen Inventori, Estimasi Kebutuhan Material, dan Pembuatan Penawaran Harga (Quotation)**. Proyek ini dibagi menjadi dua bagian utama:
- **Frontend**: Dibangun dengan **React**, **Tailwind CSS**, dan **shadcn/ui** untuk antarmuka pengguna yang responsif dan modern.
- **Backend**: Dibangun dengan **Python FastAPI** dan **MongoDB** untuk pengelolaan data dan perhitungan bisnis yang cepat.

## 🌟 Fitur Utama

1. **Dashboard**
   - Ringkasan statistik (total barang, estimasi, penawaran, pengguna).
   - Menampilkan daftar estimasi dan penawaran terbaru.
2. **Manajemen Barang (Inventori)**
   - Mendukung berbagai jenis bentuk barang (`balok`, `tabung`, `wf`, `plat`, `custom`).
   - Input harga modal (per batang / per kg), harga jasa, informasi material, supplier, dan ukuran spesifik.
3. **Sistem Estimasi & Kalkulasi Engine (`calculationEngine.js`)**
   - Menghitung kebutuhan bahan berdasarkan panjang / ukuran yang dibutuhkan versus standar panjang bahan (misal 6 meter).
   - Optimalisasi pemotongan (*cutting optimization*) menggunakan algoritma First Fit Decreasing (meminimalisir limbah/waste).
   - Menghitung otomatis berat, luas permukaan (untuk pengecatan), harga pokok, harga jual, dan margin keuntungan.
4. **Penawaran Harga (Quotation)**
   - Menghasilkan surat penawaran dalam 2 mode: **Detail** (rincian tiap item) dan **Singkat** (lump-sum per estimasi).
   - Output dokumen dalam format PDF (menggunakan `jspdf` & `jspdf-autotable`).
   - Penyesuaian margin keuntungan (PPn, PPh, Margin) per estimasi.
5. **Manajemen Pengguna (Role-based Access)**
   - Autentikasi berbasis JWT.
   - Manajemen role: Admin, Estimator, Viewer.

---

## 📂 Struktur Direktori

```text
project-estimasi/
├── backend/                  # Python FastAPI Backend
│   ├── .env                  # Environment variables for backend
│   ├── Dockerfile            # Docker configuration for backend
│   ├── requirements.txt      # Python dependencies
│   └── server.py             # Main FastAPI application server (API Endpoints, DB connection)
│
├── frontend/                 # React Frontend (Create React App + Tailwind)
│   ├── public/               # Public assets & index.html
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable UI components (Dialogs, Tables, Inputs)
│   │   ├── contexts/         # React contexts (AuthContext)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility libraries and helpers
│   │   ├── pages/            # Page components (Dashboard, Estimasi, Penawaran, dll)
│   │   ├── services/         # API integration services (Axios configuration)
│   │   ├── utils/            # Calculation engine (core logic) and formatting utilities
│   │   ├── App.js            # Main application router
│   │   └── index.js          # React entry point
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── craco.config.js       # CRACO configuration for Tailwind integration
│   ├── Dockerfile            # Docker configuration for frontend
│   └── package.json          # Node.js dependencies and scripts
│
└── docker-compose.yml        # Docker Compose configuration to run the full stack
```

---

## 🛠️ Prasyarat

Pastikan perangkat Anda telah menginstal:
- [Docker](https://www.docker.com/products/docker-desktop/) dan Docker Compose (Disarankan)
- [Node.js](https://nodejs.org/) (Versi 18+ jika menjalankan secara lokal)
- [Python](https://www.python.org/) (Versi 3.10+ jika menjalankan secara lokal)

---

## 🚀 Instalasi & Cara Menjalankan

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)
Cara termudah untuk menjalankan aplikasi adalah menggunakan Docker Compose. Ini akan secara otomatis membangun dan menjalankan database MongoDB, Backend, dan Frontend di dalam container.

1. Buka terminal di direktori utama `project-estimasi/`.
2. Jalankan perintah berikut:
   ```bash
   docker compose up -d --build
   ```
3. Aplikasi akan berjalan di:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **MongoDB**: Akses melalui `localhost:27017`
4. Untuk menghentikan aplikasi:
   ```bash
   docker compose down
   ```

### Opsi 2: Menjalankan Secara Lokal (Tanpa Docker)

Jika Anda ingin melakukan pengembangan (*development*), Anda dapat menjalankannya secara lokal.

**1. Setup MongoDB**
- Pastikan server MongoDB berjalan di mesin Anda (default: `mongodb://localhost:27017`).

**2. Setup Backend (FastAPI)**
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python server.py
```
Backend akan berjalan di [http://localhost:8000](http://localhost:8000).

**3. Setup Frontend (React)**
```bash
cd frontend
yarn install   # atau npm install
yarn start     # atau npm start
```
Frontend akan berjalan di [http://localhost:3000](http://localhost:3000).

---

## 🔐 Variabel Lingkungan (.env)

Jika Anda perlu mengubah konfigurasi bawaan, Anda dapat menyesuaikan konfigurasi di `docker-compose.yml` atau membuat file `.env` di masing-masing direktori:

**Backend (`backend/.env`):**
```ini
MONGO_URL=mongodb://localhost:27017
DB_NAME=project_estimasi
JWT_SECRET=your_secret_key_here
```

**Frontend (`frontend/.env`):**
```ini
REACT_APP_API_URL=http://localhost:8000/api
```
*(Catatan: Saat menggunakan Docker Compose, variabel ini disuntikkan secara otomatis dari file `docker-compose.yml`)*

---

## 🧠 Konsep Kalkulasi (*Calculation Engine*)

Logika utama aplikasi ini terletak di dalam file `frontend/src/utils/calculationEngine.js`. Engine ini menangani:
1. **Pengelompokan Barang (Grouping)**: Mengelompokkan item yang memiliki kode barang atau spesifikasi sama (seperti jenis bentuk, dimensi, dan material).
2. **Waste & Reuse Management (Sisa Potongan)**: 
   - Menerapkan algoritma untuk mencari panjang sisa dari batang sebelumnya yang dapat digunakan kembali (*reuse*).
   - Menyimpan *waste* (potongan sisa) yang tidak bisa digunakan jika panjangnya di bawah batas *minimum welding*.
3. **Lump-Sum (Custom Item)**: Item dengan bentuk `custom` (seperti baut, engsel, cat) dihitung secara total (kuantitas=1) tanpa memperhitungkan dimensi panjang.
4. **Perhitungan Harga Otomatis**: Secara dinamis menghitung *Harga Modal*, *Harga Jasa*, *Keuntungan (Margin)*, *PPn/PPh* untuk mendapatkan total harga akhir suatu penawaran.

---

## 📄 Lisensi & Hak Cipta
Aplikasi ini dikembangkan untuk keperluan internal Estimasi dan Penawaran Harga di Hegar Sumber Kreasi.
