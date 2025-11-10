# Data Cleanser

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.121.1-green)
![Pandas](https://img.shields.io/badge/Pandas-2.3.3-purple)

Data Cleanser เป็นเว็บแอปพลิเคชันสำหรับทำความสะอาดและแปลงข้อมูล (Data Cleaning/Transformation) ที่ช่วยให้คุณสามารถอัปโหลดไฟล์ข้อมูล (XLS, XLSX, CSV, TXT) แล้วทำการปรับแต่ง, กำหนดชนิดข้อมูล, เติมค่าที่หายไป, จัดการค่าผิดปกติ และส่งออกไปยังรูปแบบที่ต้องการได้

## 📋 คุณสมบัติหลัก

- **อัปโหลดไฟล์หลากหลายรูปแบบ**: CSV, Excel (XLS/XLSX), TSV, TXT
- **ตรวจจับอัตโนมัติ**: Encoding, Delimiter, และประเภทข้อมูลแต่ละคอลัมน์
- **การแปลงข้อมูลที่หลากหลาย**:
  - ตัดช่องว่าง, ปรับเป็นตัวพิมพ์เล็ก/ใหญ่
  - แทนที่/แยกข้อความด้วย Regex
  - แปลงวันที่และตัวเลข
  - แมปค่า, การรวม/แยกคอลัมน์
- **ตรวจสอบคุณภาพข้อมูล**:
  - การตรวจสอบค่าว่าง, ค่าซ้ำ
  - การกำหนดค่าต่ำสุด/สูงสุด
  - การตรวจสอบรูปแบบด้วย Regex
- **เติมค่าที่หายไป**:
  - เติมด้วยค่าเฉพาะ, ค่าเฉลี่ย, ค่ามัธยฐาน, ค่าฐานนิยม
  - คัดลอกค่าก่อนหน้า/ถัดไป
- **จัดการค่าผิดปกติ (Outliers)**:
  - IQR (Interquartile Range)
  - Z-score
  - จำกัดค่าสูงสุด/ต่ำสุดหรือลบค่าผิดปกติ
- **การกำจัดข้อมูลซ้ำ (Deduplication)** ตามคอลัมน์ที่กำหนด
- **ส่งออกหลากหลายรูปแบบ**: CSV, Excel, Parquet, JSON
- **การประมวลผลแบบ Concurrent**: รองรับการทำงานพร้อมกันหลายงานผ่าน Job queue
- **UI ที่ใช้งานง่ายและตอบสนอง**: รองรับทั้งมือถือและเดสก์ท็อป

## 🖥️ สถาปัตยกรรมระบบ

### Frontend

- **Next.js 15 (App Router)**: รองรับ SSR และ การทำงานแบบ SPA
- **React 18 + TypeScript**: การพัฒนา UI ที่มั่นคงและปลอดภัย
- **Tailwind CSS + shadcn/ui**: ดีไซน์ที่สวยงาม สะอาด และปรับแต่งได้
- **TanStack Table**: การจัดการและแสดงผลข้อมูลที่ซับซ้อน
- **Papaparse / SheetJS**: การวิเคราะห์และแสดงตัวอย่างข้อมูล CSV/Excel

### Backend

- **FastAPI + Pandas**: การประมวลผลข้อมูลที่รวดเร็วและมีประสิทธิภาพ
- **Redis + RQ**: ระบบคิวงานสำหรับการประมวลผลพร้อมกัน
- **Pydantic**: การตรวจสอบข้อมูลและการบังคับใช้ schema
- **In-memory fallback**: รองรับการทำงานแบบไม่ต้องการ Redis (โหมดพัฒนา)

## 🛠️ การติดตั้ง

### ความต้องการเบื้องต้น

- Python 3.11.9+
- Node.js 20.12.1+
- Redis (ทางเลือก - สามารถใช้ in-memory fallback ได้)

### ขั้นตอนการติดตั้ง

1. **โคลนโปรเจกต์**

```bash
git clone https://github.com/yourusername/data-cleanser.git
cd data-cleanser
```

2. **ตั้งค่า Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # สำหรับ Windows ใช้: venv\Scripts\activate

# ติดตั้ง dependencies
pip install fastapi uvicorn python-multipart pandas openpyxl pyarrow xlrd pydantic python-dotenv redis rq chardet fsspec pytest pytest-asyncio httpx

# สร้างไฟล์ .env สำหรับตั้งค่า
echo "FRONTEND_URL=http://localhost:9000
BACKEND_URL=http://localhost:9001
MAX_FILE_SIZE=50000000
TEMP_DIR=./tmp
CLEANUP_MINS=15" > .env

# สร้างโฟลเดอร์ tmp สำหรับเก็บไฟล์ชั่วคราว
mkdir -p tmp
```

3. **ตั้งค่า Frontend**

```bash
cd ../frontend

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:9001/api" > .env.local
```

## 🚀 การรันแอปพลิเคชัน

### โหมดพัฒนา

1. **รัน Backend**

```bash
cd backend
source venv/bin/activate  # สำหรับ Windows ใช้: venv\Scripts\activate
python -m app.main
```

2. **รัน Worker (เปิด Terminal อีกหน้าต่าง)**

```bash
cd backend
source venv/bin/activate  # สำหรับ Windows ใช้: venv\Scripts\activate
python -m app.worker
```

3. **รัน Frontend (เปิด Terminal อีกหน้าต่าง)**

```bash
cd frontend
npm run dev
```

แอปพลิเคชันจะทำงานที่:
- Frontend: http://localhost:9000
- Backend API: http://localhost:9001

### โหมด Production (Docker Compose)

```bash
docker-compose up -d
```

## 📊 การใช้งานระบบ

1. **อัปโหลดไฟล์**:
   - ลากไฟล์ CSV/Excel/TXT ลงในพื้นที่ Drop zone
   - เลือก Encoding หรือใช้การตรวจจับอัตโนมัติ
   - กด "อัปโหลด" เพื่อดูตัวอย่างข้อมูล

2. **ดูตัวอย่างและตั้งค่าชนิดข้อมูล**:
   - ตรวจสอบตัวอย่างข้อมูล
   - แก้ไขชนิดข้อมูล (String, Integer, Float, Date ฯลฯ) ตามต้องการ

3. **กำหนดกฎและการแปลง**:
   - เลือกคอลัมน์เพื่อกำหนดการแปลง (เช่น trim, lowercase, date parsing)
   - ตั้งค่าการตรวจสอบข้อมูล (เช่น required, min/max, regex)
   - กำหนดวิธีการเติมค่าที่หายไป (เช่น mean, median, specific value)
   - ตั้งค่าการจัดการค่าผิดปกติ (outlier detection)

4. **ตั้งค่าการส่งออก**:
   - เลือกรูปแบบไฟล์ (CSV, Excel, Parquet, JSON)
   - กำหนดค่าการส่งออก (delimiter, encoding, quote style ฯลฯ)
   - เลือกคอลัมน์ที่ต้องการส่งออก

5. **ประมวลผลและดาวน์โหลด**:
   - กดปุ่ม "ประมวลผล" เพื่อเริ่มต้นการทำงาน
   - ติดตามความคืบหน้าในหน้า "สถานะงาน"
   - ดาวน์โหลดไฟล์ผลลัพธ์เมื่อเสร็จสมบูรณ์

## 🧪 การทดสอบ

รันการทดสอบอัตโนมัติด้วยคำสั่ง:

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📦 โครงสร้างโปรเจกต์

```
data-cleanser/
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   │   ├── page.tsx     # หน้า Home พร้อม upload zone
│   │   │   ├── layout.tsx   # Root layout
│   │   ├── components/      # React components
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── FileUpload/  # คอมโพเนนต์อัปโหลด
│   │   │   ├── DataTable/   # คอมโพเนนต์ตาราง
│   │   │   ├── RuleBuilder/ # คอมโพเนนต์สร้างกฎ
│   │   ├── lib/             # Utility functions
│   │   │   ├── api.ts       # API client
│   │   │   ├── transforms.ts # ฟังก์ชั่นแปลงข้อมูล
│   │   ├── types/           # TypeScript types
│   │   │   ├── schema.ts    # RuleSet และ API schemas
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # Pydantic models
│   │   ├── routes/          # API endpoints
│   │   │   ├── upload.py    # endpoints สำหรับอัปโหลด
│   │   │   ├── preview.py   # endpoints สำหรับตัวอย่าง
│   │   │   ├── process.py   # endpoints สำหรับประมวลผล
│   │   │   ├── job.py       # endpoints สำหรับสถานะงาน
│   │   ├── services/        # Business logic
│   │   │   ├── parser.py    # การอ่านไฟล์
│   │   │   ├── transform.py # การแปลงข้อมูล
│   │   │   ├── validate.py  # การตรวจสอบข้อมูล
│   │   │   ├── export.py    # การส่งออก
│   │   ├── worker.py        # RQ worker
│   │   ├── queue.py         # การตั้งค่า Queue
│   ├── tests/               # Pytest tests
│   ├── tmp/                 # ไฟล์ชั่วคราว
├── .env                     # ตัวแปรสภาพแวดล้อม
├── docker-compose.yml       # Docker Compose (optional)
```

## 📝 License

MIT License - ดูไฟล์ [LICENSE.md](LICENSE.md) สำหรับรายละเอียด

## 🤝 ข้อเสนอแนะและการมีส่วนร่วม

หากคุณพบปัญหาหรือมีข้อเสนอแนะ โปรดเปิด issue หรือส่ง pull request