# Prototype งานบำรุงรักษาตามวาระ (To-be) — Implementation Plan (Static HTML)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง prototype แบบ static HTML (คลิกเล่นได้จริง ไม่ต้อง build) ของ flow *งานบำรุงรักษาตามวาระ (To-be)* เดินตาม happy path **สายตรวจเอง (กบก.)** ครบ 6 เฟส โดยลงมือ **Phase 1 — Master Plan** ก่อน พร้อมหน้า **Admin (Master Data)** แยกต่างหาก — **ให้แนวเดียวกับ prototype รอบเก่า** (`Maintenance-Request-Form/`) โดย **ใช้ design-system ร่วมกัน**

**Architecture:** Static HTML + vanilla JS + CSS (ไม่มี build step) เปิดผ่าน `http.server`. โครงแบบ **app-shell VMS Plus desktop**: `.shell` (sidebar `.side` + `.work`) และ stepper 6 เฟสแบบ chevron `.wsteps`. State เก็บใน `localStorage` (คีย์ `maintaind.yearly.*`). **แชร์ design-system + ui-components.js จากโฟลเดอร์รอบเก่าผ่าน relative link** (ไม่ก็อป — แหล่งความจริงเดียว). แต่ละเฟส/ขั้นเป็นฟังก์ชัน `render...()` ที่วาด DOM จาก state.

**Tech Stack:** HTML5 · vanilla JS (ES2020, no framework) · CSS (design-system กลาง) · localStorage · IBM Plex Sans Thai + Material Symbols (Google Fonts) · logic ทดสอบด้วย `node` · UI verify ด้วย Playwright + Chrome ที่ติดเครื่อง (ตาม verify skill ของ `Maintenance-Request-Form/`)

## Global Constraints

- **ที่ตั้ง:** ไฟล์ prototype อยู่ใน `Maintenance-Request/maintainance-yearly/` (ห้ามแก้ `code-maintainD/`; ห้ามแก้ไฟล์ใน `Maintenance-Request-Form/` — แค่ **ลิงก์อ้างอิง** เท่านั้น)
- **แชร์ design-system (ลิงก์ ไม่ก็อป):** ทุกหน้า HTML ต้อง `<link>` ไปที่
  - `../Maintenance-Request-Form/design-system/tokens.css`
  - `../Maintenance-Request-Form/design-system/components.css`
  - และ `<script src="../Maintenance-Request-Form/ui-components.js">` (window.UIC — reuse `vehicleCard` ได้)
- **ห้าม hardcode สี:** ใช้ CSS variables/คลาสจาก design-system เท่านั้น (เช่น `var(--primary-600)`, `.btn-p`, `.card`, `.tbl`, `.wsteps`, `.sect`, `.badge`, `.veh`) — ห้ามใส่ hex สีเองในหน้า
- **สีหลัก design-system เก่า:** `--primary-600:#A80689` (ปุ่ม/active), hover `--primary-500:#CF07AA` — ยึดตาม tokens.css เดิม
- **ภาษา UI:** ไทยทั้งหมด · ปี = **พ.ศ.** (default ปัจจุบัน = **2569**, ไทรมาสปัจจุบัน = **Q3**)
- **ขอบเขต flow:** happy path **สายตรวจเอง (กบก.) เท่านั้น** — ไม่ทำสายว่าจ้าง/ผู้รับจ้าง, ไม่ทำเคส "บำรุงรักษาไม่ได้"/loop ตีกลับ (แสดงทางเดียว)
- **สถานะรถ:** `available`=ไม่ใช้ · `pending_approval`=รออนุมัติ · `transferred`=โอน
- **เกณฑ์:** `truck`=ทรัค · `net`=เนต · **หมวดรายการ:** `part`=อะไหล่ · `oil`=น้ำมัน(oilKind: engine/gear/hydraulic) · `filter`=ไส้กรอง
- **localStorage keys:** `maintaind.yearly.master.v1` (ข้อมูลหลัก: รถ+รายการ) · `maintaind.yearly.plan.v1` (แผนที่กำลังสร้าง) — corrupt JSON ต้อง fallback เป็น seed ไม่ crash
- **Serve เพื่อทดสอบ:** `cd Maintenance-Request && python3 -m http.server 8124 --bind 127.0.0.1` แล้วเปิด `http://127.0.0.1:8124/maintainance-yearly/index.html` (serve จาก `Maintenance-Request/` เพื่อให้ path `../Maintenance-Request-Form/...` resolve) — **ห้าม `file://`**
- **ทุก Task จบด้วย commit** ที่ทดสอบผ่าน/verify ได้จริง

---

## File Structure

```
Maintenance-Request/maintainance-yearly/
  plan.md                 # ไฟล์นี้
  maintannance-yearly.md  # สรุป flow (มีอยู่แล้ว)
  index.html              # แอปหลัก: .shell + sidebar + 6-phase .wsteps + จุด mount เฟส
  app.js                  # flow logic: state กลาง, nav เฟส/ขั้น, renderPhaseN()
  admin.html              # หน้า Admin (Master Data) แยกต่างหาก
  admin.js                # admin logic: CRUD รถ + รายการ (เขียน localStorage)
  mock-yearly.js          # window.MYD: seed data + storage + logic (deriveItems/workNumber) + label maps
  test/                   # โฟลเดอร์เทสต์ logic (รันด้วย node)
    logic.test.mjs        # เทสต์ deriveItems + workNumber
```
แชร์ (ลิงก์ ไม่ก็อป): `../Maintenance-Request-Form/design-system/{tokens,components}.css`, `../Maintenance-Request-Form/ui-components.js`

**หลักการแยกไฟล์:** `mock-yearly.js` = data + logic ล้วน (เทสต์ได้ด้วย node) · `app.js` = flow · `admin.js` = admin — แยกความรับผิดชอบชัด ไฟล์ละหน้าที่

---

## Data model + logic (mock-yearly.js → `window.MYD`)

```js
// โครงข้อมูล (plain objects)
// vehicle: { id, plate, vehicleType, criteria, status, mileage, engineHours }
// item:    { id, name, category, oilKind?, unit, appliesToTypes:[], qtyPerVehicle }
// plan:    { planName, criteria, selectedVehicleIds:[], quarter, year, preparedConfirmed, workNumber, approvalStatus }

window.MYD = {
  // ----- label maps (ภาษาไทย) -----
  CRITERIA_LABELS: { truck:'ทรัค', net:'เนต' },
  STATUS_LABELS:   { available:'ไม่ใช้', pending_approval:'รออนุมัติ', transferred:'โอน' },
  CATEGORY_LABELS: { part:'อะไหล่', oil:'น้ำมัน', filter:'ไส้กรอง' },
  OILKIND_LABELS:  { engine:'น้ำมันเครื่อง', gear:'น้ำมันเฟือง', hydraulic:'น้ำมันไฮดรอลิก' },
  SEED_VEHICLES: [ /* ~8 คัน (ดู Task 0.2) */ ],
  SEED_ITEMS:    [ /* ~8 รายการ (ดู Task 0.2) */ ],

  // ----- storage (fallback seed เมื่อว่าง/พัง) -----
  loadMaster(),          // → { vehicles, items } จาก maintaind.yearly.master.v1 (seed ถ้าไม่มี/พัง)
  saveMaster(master),    // เขียน localStorage
  loadPlan(),            // → plan (INITIAL_PLAN ถ้าไม่มี/พัง)
  savePlan(plan),
  resetPlan(),

  // ----- logic ล้วน (unit-tested) -----
  deriveItems(vehicles, items),  // → [{ item, vehicleCount, totalQty }] เรียง part→oil→filter แล้วชื่อ; ตัด vehicleCount===0
  workNumber(quarter, year, seq),// → `MT-<year>-<quarter>-<seq 3 หลัก>` เช่น 'MT-2569-Q3-001'
};
```
`INITIAL_PLAN = { planName:'', criteria:null, selectedVehicleIds:[], quarter:null, year:2569, preparedConfirmed:false, workNumber:null, approvalStatus:'draft' }`

**6 เฟส (ใน app.js):**
```js
const PHASES = [
  { id:'master-plan', no:1, label:'ออกเลขงาน' },
  { id:'procurement', no:2, label:'เบิก/จัดหา + แผนเดินทาง' },
  { id:'maintenance', no:3, label:'ดำเนินการบำรุงรักษา' },
  { id:'inspection',  no:4, label:'ตรวจรับ' },
  { id:'report',      no:5, label:'จัดทำรายงาน' },
  { id:'cost',        no:6, label:'คำนวณต้นทุน' },
];
```

---

# Phase 0 — Shell + shared design-system + data/logic

## Task 0.1: mock-yearly.js (data + logic) + node tests

**Files:**
- Create: `maintainance-yearly/mock-yearly.js`
- Create: `maintainance-yearly/test/logic.test.mjs`

**Interfaces:**
- Produces `window.MYD` ตาม "Data model" ด้านบน. `mock-yearly.js` ต้องทำงานได้ทั้งใน browser (`window.MYD=...`) และถูก import ใน node test ได้ — ทำโดยท้ายไฟล์ใส่ `if (typeof module!=='undefined') module.exports = MYD;` และประกาศ `const MYD = {...}; if (typeof window!=='undefined') window.MYD = MYD;`
- `deriveItems(vehicles, items)`: สำหรับแต่ละ item นับรถที่ `item.appliesToTypes.includes(v.vehicleType)` → `vehicleCount`; `totalQty = qtyPerVehicle*vehicleCount`; ตัด `vehicleCount===0`; เรียง `part(0)→oil(1)→filter(2)` แล้วชื่อ (`localeCompare('th')`)
- `workNumber(q,y,seq)` → `` `MT-${y}-${q}-${String(seq).padStart(3,'0')}` ``

- [ ] **Step 1: เขียน failing test** `test/logic.test.mjs` (ใช้ node built-in `assert` + dynamic import ของ CommonJS ผ่าน `createRequire`)

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const MYD = require('../mock-yearly.js');

const v = (id, vehicleType) => ({ id, plate:id, vehicleType, criteria:'truck', status:'available', mileage:0, engineHours:0 });
const items = [
  { id:'o1', name:'น้ำมันเครื่อง', category:'oil', oilKind:'engine', unit:'ลิตร', appliesToTypes:['รถกระเช้า','รถเครน'], qtyPerVehicle:12 },
  { id:'p1', name:'ผ้าเบรก', category:'part', unit:'ชุด', appliesToTypes:['รถกระเช้า'], qtyPerVehicle:1 },
  { id:'f3', name:'ไส้กรองอากาศ', category:'filter', unit:'ชิ้น', appliesToTypes:['รถขุด'], qtyPerVehicle:1 },
];

// deriveItems
const lines = MYD.deriveItems([v('a','รถกระเช้า'), v('b','รถกระเช้า'), v('c','รถเครน')], items);
assert.deepEqual(lines.map(l => l.item.id), ['p1','o1'], 'part ก่อน oil, ไส้กรองอากาศถูกตัด (ไม่มีรถขุด)');
assert.equal(lines.find(l=>l.item.id==='o1').vehicleCount, 3);
assert.equal(lines.find(l=>l.item.id==='o1').totalQty, 36);
assert.equal(lines.find(l=>l.item.id==='p1').totalQty, 2);
assert.deepEqual(MYD.deriveItems([], items), [], 'ไม่มีรถ → []');

// workNumber
assert.equal(MYD.workNumber('Q3',2569,1), 'MT-2569-Q3-001');
assert.equal(MYD.workNumber('Q1',2570,42), 'MT-2570-Q1-042');
assert.equal(MYD.workNumber('Q4',2569,123), 'MT-2569-Q4-123');

console.log('OK: all logic tests passed');
```

- [ ] **Step 2: รันให้ fail** — Run: `cd maintainance-yearly && node test/logic.test.mjs`
  Expected: FAIL — `Cannot find module '../mock-yearly.js'` (ยังไม่สร้าง)

- [ ] **Step 3: เขียน mock-yearly.js** — ประกาศ `const MYD = { ... }` ตาม Data model, ใส่ SEED (ดู Task 0.2 สำหรับข้อมูล seed — ใน task นี้ใส่ SEED เต็มได้เลย), implement `deriveItems`/`workNumber`/storage helpers, ปิดท้ายด้วย:
```js
if (typeof window !== 'undefined') window.MYD = MYD;
if (typeof module !== 'undefined') module.exports = MYD;
```
  storage helpers ใช้ `try{JSON.parse(localStorage.getItem(k))}catch{...}` + guard `typeof localStorage` (node ไม่มี localStorage — helper เหล่านี้ไม่ถูกเรียกใน test)

- [ ] **Step 4: รันให้ pass** — Run: `cd maintainance-yearly && node test/logic.test.mjs`
  Expected: PASS — "OK: all logic tests passed"

- [ ] **Step 5: git init + commit** (repo ใหม่ใน `maintainance-yearly/`)
```bash
cd /Users/anu.p/PEA/Maintain-D/Maintenance-Request/maintainance-yearly
git init -q
printf 'node_modules/\n.DS_Store\n' > .gitignore
git add -A && git commit -qm "feat: mock-yearly data model + deriveItems/workNumber logic with node tests"
```

## Task 0.2: seed data (รถ + รายการ) — ยืนยันเนื้อ SEED

> ทำใน Task 0.1 แล้ว (SEED อยู่ใน mock-yearly.js) — task นี้เป็น "ยืนยันเนื้อหา seed" ให้ใช้ค่าตรงนี้เป๊ะ ถ้ายังไม่ตรงให้แก้:

```js
SEED_VEHICLES: [
  { id:'v1', plate:'81-2345', vehicleType:'รถกระเช้า', criteria:'truck', status:'available',        mileage:120500, engineHours:3400 },
  { id:'v2', plate:'82-6677', vehicleType:'รถกระเช้า', criteria:'truck', status:'available',        mileage:98000,  engineHours:2900 },
  { id:'v3', plate:'83-1122', vehicleType:'รถเครน',   criteria:'truck', status:'pending_approval', mileage:145000, engineHours:5100 },
  { id:'v4', plate:'84-9090', vehicleType:'รถเครน',   criteria:'net',   status:'available',        mileage:76000,  engineHours:2100 },
  { id:'v5', plate:'85-3311', vehicleType:'รถขุด',    criteria:'net',   status:'available',        mileage:60000,  engineHours:4800 },
  { id:'v6', plate:'86-7788', vehicleType:'รถขุด',    criteria:'net',   status:'transferred',      mileage:52000,  engineHours:3900 },
  { id:'v7', plate:'87-4455', vehicleType:'รถกระเช้า', criteria:'net',   status:'available',        mileage:88000,  engineHours:2600 },
  { id:'v8', plate:'88-1200', vehicleType:'รถเครน',   criteria:'truck', status:'available',        mileage:132000, engineHours:4700 },
],
SEED_ITEMS: [
  { id:'p1', name:'ผ้าเบรก',              category:'part',   unit:'ชุด', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:1 },
  { id:'p2', name:'สายไฮดรอลิก',          category:'part',   unit:'เส้น', appliesToTypes:['รถกระเช้า','รถเครน'],        qtyPerVehicle:2 },
  { id:'o1', name:'น้ำมันเครื่อง 15W-40',  category:'oil', oilKind:'engine',    unit:'ลิตร', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:12 },
  { id:'o2', name:'น้ำมันเฟือง 90',        category:'oil', oilKind:'gear',      unit:'ลิตร', appliesToTypes:['รถเครน','รถขุด'],             qtyPerVehicle:6 },
  { id:'o3', name:'น้ำมันไฮดรอลิก 68',     category:'oil', oilKind:'hydraulic', unit:'ลิตร', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:20 },
  { id:'f1', name:'ไส้กรองน้ำมันเครื่อง',   category:'filter', unit:'ชิ้น', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:1 },
  { id:'f2', name:'ไส้กรองไฮดรอลิก',       category:'filter', unit:'ชิ้น', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:1 },
  { id:'f3', name:'ไส้กรองอากาศ',          category:'filter', unit:'ชิ้น', appliesToTypes:['รถขุด'],                     qtyPerVehicle:1 },
],
```
- [ ] **Step 1:** ตรวจว่า SEED ใน `mock-yearly.js` ตรงตารางนี้ (ถ้าตรงแล้วจาก 0.1 ไม่ต้องแก้)
- [ ] **Step 2: verify** — `node test/logic.test.mjs` ยัง PASS
- [ ] **Step 3: commit** (ถ้ามีแก้) — `git commit -am "chore: confirm seed data"` (ข้ามได้ถ้าไม่แก้)

## Task 0.3: index.html shell + app.js (6-phase stepper + phase router)

**Files:**
- Create: `maintainance-yearly/index.html`
- Create: `maintainance-yearly/app.js`

**Interfaces:**
- `index.html`: โครง `.shell` — `.side` (โลโก้ + nav icon 2 อัน: "Flow" active, "Admin — ข้อมูลหลัก" ลิงก์ `admin.html`) + `.work` (`.topbar` + `.content` มี `<div class="draft">` แถบ Draft + `#stepper` + `#phase` จุด mount). โหลด fonts + shared css/js + `mock-yearly.js` + `app.js`
- `app.js`: state `{ phase:'master-plan', ... }`, `renderStepper()` วาด `.wsteps` 6 เฟส (active=เฟสปัจจุบัน, passed=เฟสที่ complete, เฟสถัดไปคลิกได้เมื่อเฟสก่อน complete), `goPhase(id)`, `renderPhase()` เรียก `renderMasterPlan()` (เฟส 1) หรือ `renderPlaceholder(phase)` (เฟส 2–6). เฟส 1 complete เมื่อ `MYD.loadPlan().approvalStatus==='approved'`
- Produces ฟังก์ชัน global: `goPhase`, `toast(msg)` (reuse pattern เดิม), `renderPhase`

- [ ] **Step 1:** เขียน `index.html` (ตามโครง `.shell` ของ components.css — ใช้ `.side/.nv/.work/.topbar/.content/.draft`)
- [ ] **Step 2:** เขียน `app.js` — state + `renderStepper()` (`.wsteps`) + `renderPhase()` + `renderPlaceholder()` ("เฟสนี้อยู่ในแผนถัดไป" + ชื่อเฟส) + `toast()`
- [ ] **Step 3: verify (browser)** — serve แล้วเปิด `index.html`:
  - เห็น sidebar + แถบ Draft + chevron stepper 6 เฟส (เฟส 1 active, 2–6 disabled/จาง)
  - พื้นที่เนื้อหาแสดง placeholder ของเฟส 1 (จะแทนด้วย Master Plan ใน Phase 1)
  - ปุ่ม "Admin — ข้อมูลหลัก" ลิงก์ไป `admin.html` (ยัง 404/ว่างได้ — สร้าง Phase A)
  - Console ไม่มี error
- [ ] **Step 4: commit** — `git add -A && git commit -qm "feat: app shell with sidebar + 6-phase chevron stepper + phase router"`

---

# Phase A — หน้า Admin (Master Data) *(ทำก่อน Phase 1 เพื่อป้อนข้อมูลเข้า flow)*

## Task A.1: admin.html + admin.js — ตารางรถ + รายการ (อ่าน)

**Files:**
- Create: `maintainance-yearly/admin.html`
- Create: `maintainance-yearly/admin.js`

**Interfaces:**
- `admin.html`: โครง `.shell` เหมือน index (sidebar: "Flow" ลิงก์ `index.html`, "Admin" active) + `.content` มี `<div class="draft">โหมดผู้ดูแลระบบ (Master Data)</div>` + แท็บ 2 อัน (ปุ่ม `.seg`): "ข้อมูลรถ" / "อะไหล่-น้ำมัน-ไส้กรอง" + `#adminBody`. โหลด shared css/js + `mock-yearly.js` + `admin.js`
- `admin.js`: `renderVehicles()` วาด `.tbl` (ทะเบียน/ประเภท/เกณฑ์/สถานะ `.badge`/ไมล์/ชม.) จาก `MYD.loadMaster().vehicles`; `renderItems()` วาด `.tbl` แยกกลุ่มหมวด. แท็บสลับด้วย state `tab`

- [ ] **Step 1:** เขียน `admin.html` (shell + แท็บ + mount)
- [ ] **Step 2:** เขียน `admin.js` — `renderVehicles()` + `renderItems()` (อ่านอย่างเดียวก่อน)
- [ ] **Step 3: verify (browser)** — เปิด `admin.html`: เห็นตารางรถ 8 คัน + แท็บรายการเห็น 8 รายการแยกหมวด · สลับแท็บได้ · badge สถานะสีถูก · console ไม่มี error
- [ ] **Step 4: commit** — `git commit -am "feat: admin master-data read views (vehicles + items)"`

## Task A.2: admin CRUD — เพิ่ม/แก้ไข/ลบ รถ

**Files:** Modify `admin.html` (modal), `admin.js`

**Interfaces:** ใช้ `MYD.loadMaster`/`MYD.saveMaster`. id ใหม่ = `'v'+Date.now()` (หมายเหตุ: node-only logic ไม่ใช้ Date; ที่นี่เป็น UI ผู้ใช้กด จึงใช้ได้)

- [ ] **Step 1:** ปุ่ม "+ เพิ่มรถ" เปิด modal (ใช้คลาส `.card` ใน overlay หรือ `<dialog>`), ฟอร์ม: ทะเบียน, ประเภท(select รถกระเช้า/รถเครน/รถขุด), เกณฑ์(truck/net), สถานะ, ไมล์, ชม. → `saveMaster` → `renderVehicles()`
- [ ] **Step 2:** ปุ่มแก้ไข/ลบต่อแถว (ลบ = confirm)
- [ ] **Step 3: verify (browser)** — เพิ่มรถ 1 คัน → แถวใหม่โผล่ · reload หน้า → ยังอยู่ (localStorage) · แก้ไข/ลบทำงาน
- [ ] **Step 4: commit** — `git commit -am "feat: admin vehicles CRUD (localStorage persisted)"`

## Task A.3: admin CRUD — เพิ่ม/แก้ไข/ลบ รายการ (อะไหล่/น้ำมัน/ไส้กรอง)

**Files:** Modify `admin.html`, `admin.js`

- [ ] **Step 1:** modal เพิ่ม/แก้ไขรายการ: ชื่อ, หมวด(part/oil/filter), oilKind(แสดงเมื่อ oil), หน่วย, qtyPerVehicle, appliesToTypes (checkbox รถกระเช้า/เครน/ขุด) → `saveMaster` → `renderItems()`
- [ ] **Step 2:** ปุ่มแก้ไข/ลบต่อแถว
- [ ] **Step 3: verify (browser)** — เพิ่มรายการน้ำมัน → โผล่ในกลุ่มน้ำมัน · reload ยังอยู่ · ลบได้
- [ ] **Step 4: commit** — `git commit -am "feat: admin items CRUD (parts/oils/filters)"`

---

# Phase 1 — Master Plan (โฟกัสหลัก)

`renderMasterPlan()` ใน app.js เป็น sub-stepper 5 ขั้น (ถือ `state.sub` 1..5) + ปุ่มท้าย `.actions` "ย้อนกลับ/ถัดไป" · อ่าน/เขียน plan ผ่าน `MYD.loadPlan`/`MYD.savePlan` · อ่านรถ/รายการจาก `MYD.loadMaster`

## Task 1.1: renderMasterPlan host + ขั้น 1 (เกณฑ์ + ชื่อแผน)

**Files:** Modify `app.js` (แทน placeholder เฟส master-plan ด้วย `renderMasterPlan()`)

**Interfaces:**
- `renderMasterPlan()` วาด sub-stepper 5 ขั้น (`.wsteps` เล็ก หรือ `.steps`) + เนื้อขั้นปัจจุบัน; `goSub(n)`, `nextSub()/backSub()`
- ขั้น 1: input ชื่อแผน (`.f`) + เลือกเกณฑ์ ทรัค/เนต (2 `.tile` หรือ `.seg`) → เขียน plan `planName`/`criteria` (เปลี่ยนเกณฑ์ต้องล้าง `selectedVehicleIds`); ปุ่มถัดไป disabled จนมีชื่อ+เกณฑ์

- [ ] **Step 1:** เขียน `renderMasterPlan()` + sub-stepper + ขั้น 1
- [ ] **Step 2: verify (browser)** — เฟส 1 แสดงฟอร์มชื่อแผน+เกณฑ์ · กรอกชื่อ+เลือกเกณฑ์ → ถัดไป enable → ไปขั้น 2 (ว่างชั่วคราว)
- [ ] **Step 3: commit** — `git commit -am "feat: master plan step 1 (criteria + plan name)"`

## Task 1.2: ขั้น 2 — เลือกรถเข้าแผน

**Files:** Modify `app.js`

**Interfaces:** ตารางรถ **กรองตาม `plan.criteria`** (`MYD.loadMaster().vehicles.filter(v=>v.criteria===plan.criteria)`) เป็น `.tbl` + checkbox ต่อแถว + "เลือกทั้งหมด" → เขียน `plan.selectedVehicleIds`; ปุ่มถัดไป disabled จนเลือก ≥1

- [ ] **Step 1:** เขียนขั้น 2 (ตาราง + checkbox + เลือกทั้งหมด, แสดง `.badge` สถานะ)
- [ ] **Step 2: verify (browser)** — เลือกเกณฑ์ "เนต" ขั้น 1 → ขั้น 2 เห็นเฉพาะรถ net · ติ๊ก 2 คัน → ถัดไป enable
- [ ] **Step 3: commit** — `git commit -am "feat: master plan step 2 (select trucks by criteria)"`

## Task 1.3: ขั้น 3 — รายการอะไหล่/น้ำมัน/ไส้กรอง (auto)

**Files:** Modify `app.js`

**Interfaces:** `MYD.deriveItems(selectedVehicles, items)` แล้วแสดงแยก 3 กลุ่ม (อะไหล่/น้ำมัน/ไส้กรอง) เป็น `.tbl`: ชื่อ · ต่อคัน · จำนวนรถ · รวม · หน่วย (อ่านอย่างเดียว) + ยอดรวมรายการ

- [ ] **Step 1:** เขียนขั้น 3 (ใช้ `MYD.deriveItems`)
- [ ] **Step 2: verify (browser)** — เลือกรถกระเช้า 2 คัน → น้ำมันเครื่องรวม 24 ลิตร; ไม่เห็นไส้กรองอากาศ (ของรถขุด)
- [ ] **Step 3: commit** — `git commit -am "feat: master plan step 3 (auto-derived items)"`

## Task 1.4: ขั้น 4 — ระบุไทรมาส

**Files:** Modify `app.js`

**Interfaces:** เลือกไทรมาส Q1–Q4 (`.seg`/`.tile` พร้อมช่วงเดือนปีงบฯ: Q1 ต.ค.–ธ.ค., Q2 ม.ค.–มี.ค., Q3 เม.ย.–มิ.ย., Q4 ก.ค.–ก.ย.) + ปี พ.ศ. (default 2569) → เขียน `plan.quarter/year`; ถัดไป disabled จนเลือกไทรมาส

- [ ] **Step 1:** เขียนขั้น 4
- [ ] **Step 2: verify (browser)** — เลือก Q3/2569 → ถัดไป enable
- [ ] **Step 3: commit** — `git commit -am "feat: master plan step 4 (quarter)"`

## Task 1.5: ขั้น 5 — ทวน + ผบพ.เตรียมอะไหล่ + ขออนุมัติเลขงาน

**Files:** Modify `app.js`

**Interfaces:**
- แสดงสรุปแผน (ชื่อ, เกณฑ์, จำนวนรถ, ไทรมาส/ปี, สรุปอะไหล่รวม)
- checkbox "ผบพ. ตรวจ/เตรียมอะไหล่สำหรับไทรมาสนี้แล้ว" → `plan.preparedConfirmed`
- ปุ่ม "ขออนุมัติเลขงาน" (disabled จน preparedConfirmed) → set `approvalStatus='approved'`, `workNumber=MYD.workNumber(plan.quarter, plan.year, 1)`, savePlan
- หลังอนุมัติ: แสดงเลขงาน (`.badge b-ok`) + ตารางสรุปจำนวนรถตามแผนแยกสถานะ (ไม่ใช้/รออนุมัติ/โอน) + ปุ่ม "ไปเฟสถัดไป →" (`goPhase('procurement')`); stepper เฟส 1 กลายเป็น passed

- [ ] **Step 1:** เขียนขั้น 5
- [ ] **Step 2: verify (browser, happy path เต็ม Phase 1)** — serve → index.html → ชื่อ+เกณฑ์ → เลือกรถ → ดูอะไหล่ → ไทรมาส → ติ๊กเตรียม → ขออนุมัติ → ได้ `MT-2569-Q3-001`, เห็นสรุปสถานะรถ, stepper เฟส 1 = passed, เฟส 2 คลิกได้ · reload แล้ว plan ยังอยู่
- [ ] **Step 3: commit** — `git commit -am "feat: master plan step 5 (review + approve + work number)"`

---

# Phase 2–6 — โครงเฟสถัดไป (Outline — จะแตกเป็น task ระดับ step เมื่อเริ่มเฟสนั้น)

> เดินสาย **ตรวจเอง (กบก.)** ต่อยอดจาก plan ที่มี workNumber แล้ว แต่ละเฟสเพิ่ม field ใน plan + แทน `renderPlaceholder` ด้วยหน้าจริงทีละเฟส (รูปแบบ/verify เหมือน Phase 1)

- **Phase 2 — เบิก/จัดหา + แผนเดินทาง:** เบิกอะไหล่ (mock) → ทำแผนเดินทาง (เบี้ยเลี้ยง/ที่พัก/เดินทาง, สถานที่, ช่วงวันเดินทาง — reuse `UIC.dayPicker`) → ยืนยัน → mock Noti เจ้าของรถ/กรย. → ทำใบนำจ่าย (PEA Life mock). Field: `travelPlan`, `partsRequisitioned`
- **Phase 3 — ดำเนินการบำรุงรักษา:** กรย.เตรียมของที่จุดรวมงาน → ถ่ายรูปก่อน (mock upload) → บันทึกซ่อม+ยืนยันอะไหล่จริง+ไมล์+ชม. → เก็บตัวอย่างน้ำมันไฮดรอลิก → ถ่ายรูปหลัง → หน่วยพัสดุรับทราบ. Field: `results[]`
- **Phase 4 — ตรวจรับ:** ตรวจข้อมูล → ผ่าน → คืนอะไหล่/น้ำมันที่ไม่ได้ใช้. Field: `inspectionPassed`, `returnedItems[]`
- **Phase 5 — จัดทำรายงาน:** ตรวจสภาพไฟฟ้า/น้ำมัน/ไฮดรอลิก → บันทึกผลตรวจน้ำมัน → mock Noti → ครบทุกคัน → ผู้บังคับบัญชาตรวจประวัติ → ปิดงาน. Field: `oilTestResult`, `closed`
- **Phase 6 — คำนวณต้นทุน:** รายงานบน VMS+ (mock) → `computeCost()` (ค่าแรง+อะไหล่+เบี้ยเลี้ยง+เดินทาง+น้ำมัน) → SUM → ปุ่ม Export Excel (mock) → DONE. Logic ใหม่ (node-test): `MYD.computeCost(plan, master)`

---

## Verification (ทั้ง prototype)

- **Logic:** `cd maintainance-yearly && node test/logic.test.mjs` → PASS
- **UI (browser):** ใช้แนวเดียวกับ verify skill ของ `Maintenance-Request-Form/`:
  ```bash
  cd /Users/anu.p/PEA/Maintain-D/Maintenance-Request && python3 -m http.server 8124 --bind 127.0.0.1
  ```
  ขับด้วย Playwright + Chrome ที่ติดเครื่อง (`executablePath` ตาม verify skill), เปิด `http://127.0.0.1:8124/maintainance-yearly/index.html`
- **Regression:** ล้าง localStorage → index.html แสดง default (stepper 6 เฟส, เฟส1 active) · admin แสดง seed 8 รถ/8 รายการ · corrupt `maintaind.yearly.*` (`{{{broken`) → ไม่ crash (fallback seed)

## Self-Review
- **Coverage:** static HTML + แชร์ design-system รอบเก่า (ลิงก์) ✅ · 6 เฟส (P1 เต็ม, P2–6 outline) ✅ · admin master-data แยกหน้า (รถ+รายการ CRUD) ✅ · สายตรวจเองเท่านั้น ✅ · logic มี node test ✅
- **Placeholder scan:** logic task มีเทสต์จริง; UI task ใช้ browser-verify ระบุ input/expected ชัด; `renderPlaceholder` เป็นฟังก์ชันจริง; P2–6 เป็น outline ตั้งใจ (มีคำถามเปิดค้าง)
- **Type consistency:** `vehicleType`/`appliesToTypes`/`selectedVehicleIds`/`preparedConfirmed`/`workNumber` ใช้ชื่อตรงกันทุก task และตรงกับ `mock-yearly.js`
- **ข้อควรระวัง:** ปี พ.ศ. 2569 hardcode (ไม่พึ่ง Date ใน logic ที่เทสต์) · CRUD ใช้ `Date.now()` เป็น id เฉพาะฝั่ง UI (นอก node test)

## หมายเหตุยืนยันกับเจ้าของกระบวนการ
- ตัวย่อ **กบก./กบค., ผบพ., กบท.** และนิยาม **เกณฑ์ ทรัค/เนต**, สูตร **SUM ต้นทุน** — ดู [คำถามเปิดในสรุป flow](maintannance-yearly.md#คำถามเปิด)
