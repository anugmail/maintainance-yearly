# 🛠️ Prototype — งานบำรุงรักษาตามวาระ (To-be)

Prototype แบบ **static HTML คลิกเล่นได้จริง** ของ flow *Smart Mechanical Service Management — งานบำรุงรักษาตามวาระ (To-be)* ของ PEA (VMS Plus)
เดินตาม happy path **สายตรวจเอง (กบก.)** ครบ 6 เฟส: ออกเลขงาน → เบิก/จัดหา → ดำเนินการ → ตรวจรับ → รายงาน → คำนวณต้นทุน

> โฟลเดอร์นี้เป็น **คนละเรื่อง** กับ [`Maintenance-Request-Form`](https://github.com/anugmail/Maintenance-Request-Form) (นั่นคือ *ฟอร์มแจ้งซ่อม/on-demand repair*) — อันนี้คือ **บำรุงรักษาตามวาระ (scheduled PM)**

## 🔗 ลิงก์เข้าดู

| ที่ | ลิงก์ |
|---|---|
| **Local (dev)** | `http://127.0.0.1:8124/index.html` — flow · `.../admin.html` — Master Data |
| **GitHub Pages** | `https://anugmail.github.io/maintainance-yearly/` *(หลัง push + เปิด Pages)* |

## ▶️ วิธีรัน (local, ไม่มี build step)

```bash
cd maintainance-yearly
python3 -m http.server 8124 --bind 127.0.0.1
# เปิด http://127.0.0.1:8124/index.html   (ห้ามเปิดด้วย file://)
```

## 📁 ไฟล์

| ไฟล์ | เนื้อหา |
|---|---|
| `index.html` + `app.js` | แอปหลัก: flow 6 เฟส (stepper) — เริ่มที่ Master Plan |
| `admin.html` + `admin.js` | หน้า Admin (Master Data) — จัดการ รถ / อะไหล่-น้ำมัน-ไส้กรอง |
| `mock-yearly.js` | ข้อมูล seed + logic (`deriveItems`, `workNumber`) + storage (`localStorage`) |
| `design-system/` | tokens.css + components.css — **vendored** (ดูด้านล่าง) |
| `ui-components.js` | shared components (`window.UIC`) — **vendored** |
| `test/logic.test.mjs` | เทสต์ logic (รันด้วย `node test/logic.test.mjs`) |
| `plan.md` | แผนการทำแบบแบ่งเฟส |
| `maintannance-yearly.md` | สรุป flow ต้นทาง |

## 🎨 Design system (vendored — สำคัญเรื่อง sync)

`design-system/{tokens,components}.css` และ `ui-components.js` เป็น **สำเนา (vendored copy)** จาก repo
[`Maintenance-Request-Form`](https://github.com/anugmail/Maintenance-Request-Form) เพื่อให้ repo นี้ **self-contained** (Pages เปิดได้เดี่ยว ไม่พึ่ง repo อื่น)

- **แหล่งต้นทาง:** `Maintenance-Request-Form/design-system/` + `ui-components.js` (commit `bc3be43`)
- **ห้ามแก้ token ที่นี่โดยตรง** ถ้าจะปรับ design-system ให้แก้ที่ต้นทางก่อน แล้ว **re-sync**:

```bash
# จาก maintainance-yearly/
cp ../Maintenance-Request-Form/design-system/tokens.css      design-system/
cp ../Maintenance-Request-Form/design-system/components.css  design-system/
cp ../Maintenance-Request-Form/ui-components.js              ui-components.js
```

## ✅ Verify

- **Logic:** `node test/logic.test.mjs`
- **UI:** serve แล้วขับด้วย Playwright + Chrome ที่ติดเครื่อง (ดูแนวใน verify skill ของ `Maintenance-Request-Form/`)
