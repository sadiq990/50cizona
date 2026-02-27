# 🍵 50-ci Zona Çay Evi — Restoran İdarəetmə Sistemi

Tam funksional, Docker ilə işləyən restoran idarəetmə sistemi.  
Node.js backend, SQLite verilənlər bazası, Vanilla JS frontend.

---

## 📋 Xüsusiyyətlər

| Modul | Təsvir |
|---|---|
| 🔐 **Autentifikasiya** | JWT-siz session-based giriş, rol sistemi (admin / waiter) |
| 🪑 **Masa İdarəetməsi** | Masa yaratma, silmə, aktiv sessiya izləmə |
| 🛒 **Sifariş Sistemi** | Masa üzrə sifariş qəbulu, redaktə, bağlanma |
| 🍽️ **Menyu İdarəetməsi** | Məhsul əlavə etmə, qiymət, kateqoriya |
| 💰 **Xərc İdarəetməsi** | Gündəlik xərclərin qeydiyyatı, şablonlar |
| 📊 **Hesabatlar** | Gündəlik gəlir/xərc, Excel export |
| 🗄️ **Arxiv Sistemi** | Aylıq arxiv, köhnə data saxlanması |
| 💾 **Backup/Restore** | Verilənlər bazasının ehtiyat nüsxəsi, avtomatik gecə backup-ı (21:00) |
| 🌙 **Dark/Light Tema** | İstifadəçi seçiminə görə tema dəyişimi |

---

## 🗂️ Qovluq Strukturu

```
xalid_50/
├── backend/
│   ├── controllers/        # İş məntiqi (auth, order, report, backup...)
│   ├── middleware/         # auth.js — sessiya yoxlaması
│   ├── models/             # SQLite cədvəl modelləri
│   ├── routes/             # API endpoint-ləri
│   ├── database.js         # Verilənlər bazası başlatma və migration
│   ├── server.js           # Express server, cron job-lar
│   └── package.json
├── frontend/
│   ├── index.html          # Giriş səhifəsi
│   ├── dashboard.html      # Əsas idarəetmə paneli
│   ├── js/
│   │   ├── api.js          # Backend ilə əlaqə funksiyaları
│   │   ├── app.js          # Dashboard məntiqi
│   │   └── auth.js         # Giriş/çıxış məntiqi
│   └── styles/
│       └── main.css        # Əsas stillər
├── backup/                 # JSON formatında backup faylları
├── data/                   # SQLite .db faylı (runtime)
├── Dockerfile
├── docker-compose.yml
└── .gitignore
```

---

## 🚀 Qurulum

### Docker ilə (tövsiyə edilir)

Docker Desktop quraşdırılmış olmalıdır.

```bash
# 1. Repo-nu klonla
git clone https://github.com/sadiq990/50cizona.git
cd 50cizona

# 2. Docker ilə işə sal
docker-compose up --build -d

# 3. Brauzerdə aç
http://localhost:3000
```

### Manuel (Docker-siz)

```bash
# Repo-nu klonla
git clone https://github.com/sadiq990/50cizona.git
cd 50cizona/backend

# Asılılıqları quraşdır
npm install

# Serveri işə sal
npm start

# Brauzerdə aç
http://localhost:3000
```

---

## 👤 Giriş Məlumatları

> ⚠️ İlk işə salındıqda admin hesabı avtomatik yaradılır.

| İstifadəçi | Şifrə | Rol |
|---|---|---|
| `admin` | `admin123` | Admin (tam hüquq) |

Admin panelindən yeni `waiter` hesabları yarada bilərsiniz.

---

## 🔑 Rol Sistemi

| İmkan | Admin | Waiter |
|---|---|---|
| Sifariş qəbul etmə | ✅ | ✅ |
| Menyu görüntüləmə | ✅ | ✅ |
| Hesabat görüntüləmə | ✅ | ✅ |
| Menyu redaktəsi | ✅ | ❌ |
| Xərc əlavə etmə | ✅ | ❌ |
| Backup/Restore | ✅ | ❌ |
| İstifadəçi idarəetməsi | ✅ | ❌ |

---

## 🔌 API Endpointləri

```
POST   /api/auth/login          — Giriş
GET    /api/auth/me             — Aktiv istifadəçi
POST   /api/auth/logout         — Çıxış

GET    /api/tables              — Masaların siyahısı
POST   /api/tables              — Yeni masa

GET    /api/products            — Məhsulların siyahısı
POST   /api/products            — Yeni məhsul

POST   /api/sessions            — Masa sessiyası başlat
PATCH  /api/sessions/:id/close  — Sessiyanı bağla

POST   /api/orders              — Sifariş əlavə et
PATCH  /api/orders/:id          — Sifarişi redaktə et

GET    /api/reports/daily       — Gündəlik hesabat
GET    /api/export/excel        — Excel export

GET    /api/backup              — Backup siyahısı
POST   /api/backup/create       — Manual backup yarat
POST   /api/backup/restore      — Backup bərpa et
```

---

## ⏰ Avtomatik Backup

Server hər gün **saat 21:00-da** (Bakı vaxtı, UTC+4) avtomatik JSON backup yaradır.  
Backup faylları `/backup` qovluğunda saxlanılır.  
Server 21:00-dan sonra yenidən başladılsa belə, catch-up mexanizmi sayəsində backup qaçırılmır.

---

## 🛠️ Texnologiyalar

- **Backend:** Node.js, Express.js
- **Verilənlər Bazası:** SQLite (`better-sqlite3`)
- **Autentifikasiya:** `express-session` + `bcryptjs`
- **Cron Jobs:** `node-cron`
- **Excel Export:** `exceljs`
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Konteyner:** Docker, Docker Compose

---

## 📦 Versiya

`v1.0.0` — İlk stabil buraxılış (Fevral 2026)
