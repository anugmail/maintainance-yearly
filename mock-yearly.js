// mock-yearly.js — data model + storage helpers + pure logic for the
// "งานบำรุงรักษาตามวาระ" (yearly maintenance) prototype.
// Works in both the browser (window.MYD) and node (module.exports = MYD)
// so the logic below (deriveItems / workNumber) can be unit-tested with
// node's built-in test runner without any bundler/build step.
//
// โครงข้อมูล (plain objects):
// vehicle: { id, plate, vehicleType, criteria, region(1-12), status, mileage, engineHours }
// item:    { id, name, category, oilKind?, unit, appliesToTypes:[], qtyPerVehicle }
// plan:    { planName, criteria, selectedVehicleIds:[], quarter, year, preparedConfirmed, workNumber, approvalStatus,
//            partsRequisitioned, travelPlan:{location,dateFrom,dateTo,perDiem,lodging,travel}|null, travelConfirmed }

const MASTER_KEY = 'maintaind.yearly.master.v1';
const PLAN_KEY = 'maintaind.yearly.plan.v1';

// ----- กรย. 12 เขต จัดกลุ่มเป็น 4 ภาค (mockup mapping) -----
// เขต 1-3 เหนือ, 4-6 ตะวันออก, 7-9 ใต้, 10-12 ตะวันตก
const ZONE_LABELS = { north:'ภาคเหนือ', east:'ภาคตะวันออก', south:'ภาคใต้', west:'ภาคตะวันตก' };
const ZONE_ORDER = ['north', 'east', 'south', 'west'];

function regionZone(r) {
  return r <= 3 ? 'north' : r <= 6 ? 'east' : r <= 9 ? 'south' : 'west';
}

const REGIONS = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: 'เขต ' + (i + 1), zone: regionZone(i + 1) }));

// ----- seed รถ: deterministic generator (ไม่ใช้ Math.random/Date) -----
// ~10-12 คัน/เขต (รวม ~120-144 คัน) กระจาย criteria/status/vehicleType แบบคงที่
function genSeedVehicles() {
  const types = ['รถกระเช้า', 'รถเครน', 'รถขุด'];
  const out = [];
  for (let r = 1; r <= 12; r++) {
    const count = 10 + (r % 3);
    for (let i = 1; i <= count; i++) {
      const t = types[(r + i) % 3];
      out.push({
        id: `v-${r}-${i}`,
        plate: `${String(r).padStart(2, '0')}-${1000 + r * 100 + i}`,
        vehicleType: t,
        criteria: (r + i) % 2 === 0 ? 'truck' : 'net',
        region: r,
        status: i % 7 === 0 ? 'transferred' : i % 5 === 0 ? 'pending_approval' : 'available',
        mileage: 40000 + ((r * 1000 + i * 137) % 120000),
        engineHours: 1500 + ((r * 97 + i * 53) % 5000),
      });
    }
  }
  return out;
}

const SEED_VEHICLES = genSeedVehicles();

const SEED_ITEMS = [
  { id:'p1', name:'ผ้าเบรก',              category:'part',   unit:'ชุด', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:1 },
  { id:'p2', name:'สายไฮดรอลิก',          category:'part',   unit:'เส้น', appliesToTypes:['รถกระเช้า','รถเครน'],        qtyPerVehicle:2 },
  { id:'o1', name:'น้ำมันเครื่อง 15W-40',  category:'oil', oilKind:'engine',    unit:'ลิตร', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:12 },
  { id:'o2', name:'น้ำมันเฟือง 90',        category:'oil', oilKind:'gear',      unit:'ลิตร', appliesToTypes:['รถเครน','รถขุด'],             qtyPerVehicle:6 },
  { id:'o3', name:'น้ำมันไฮดรอลิก 68',     category:'oil', oilKind:'hydraulic', unit:'ลิตร', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:20 },
  { id:'f1', name:'ไส้กรองน้ำมันเครื่อง',   category:'filter', unit:'ชิ้น', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:1 },
  { id:'f2', name:'ไส้กรองไฮดรอลิก',       category:'filter', unit:'ชิ้น', appliesToTypes:['รถกระเช้า','รถเครน','รถขุด'], qtyPerVehicle:1 },
  { id:'f3', name:'ไส้กรองอากาศ',          category:'filter', unit:'ชิ้น', appliesToTypes:['รถขุด'],                     qtyPerVehicle:1 },
];

const INITIAL_PLAN = {
  planName: '',
  criteria: null,
  selectedVehicleIds: [],
  quarter: null,
  year: 2569,
  preparedConfirmed: false,
  workNumber: null,
  approvalStatus: 'draft',
  partsRequisitioned: false,
  travelPlan: null,
  travelConfirmed: false,
};

// order used to sort deriveItems() output: part(0) -> oil(1) -> filter(2)
const CATEGORY_ORDER = { part: 0, oil: 1, filter: 2 };

function deepCopy(v) {
  return JSON.parse(JSON.stringify(v));
}

const MYD = {
  // ----- label maps (ภาษาไทย) -----
  CRITERIA_LABELS: { truck:'ทรัค', net:'เนต' },
  STATUS_LABELS:   { available:'ไม่ใช้', pending_approval:'รออนุมัติ', transferred:'โอน' },
  CATEGORY_LABELS: { part:'อะไหล่', oil:'น้ำมัน', filter:'ไส้กรอง' },
  OILKIND_LABELS:  { engine:'น้ำมันเครื่อง', gear:'น้ำมันเฟือง', hydraulic:'น้ำมันไฮดรอลิก' },

  // ----- กรย. 12 เขต / 4 ภาค -----
  ZONE_LABELS,
  ZONE_ORDER,
  REGIONS,
  regionZone,

  SEED_VEHICLES,
  SEED_ITEMS,
  INITIAL_PLAN,

  // ----- storage (fallback seed เมื่อว่าง/พัง) -----
  loadMaster() {
    if (typeof localStorage === 'undefined') {
      return { vehicles: deepCopy(SEED_VEHICLES), items: deepCopy(SEED_ITEMS) };
    }
    try {
      const raw = localStorage.getItem(MASTER_KEY);
      if (!raw) throw new Error('empty');
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.vehicles) || !Array.isArray(parsed.items)) {
        throw new Error('invalid shape');
      }
      return parsed;
    } catch {
      return { vehicles: deepCopy(SEED_VEHICLES), items: deepCopy(SEED_ITEMS) };
    }
  },

  saveMaster(master) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(MASTER_KEY, JSON.stringify(master));
  },

  loadPlan() {
    if (typeof localStorage === 'undefined') {
      return deepCopy(INITIAL_PLAN);
    }
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (!raw) throw new Error('empty');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid shape');
      return parsed;
    } catch {
      return deepCopy(INITIAL_PLAN);
    }
  },

  savePlan(plan) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  },

  resetPlan() {
    const fresh = deepCopy(INITIAL_PLAN);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PLAN_KEY, JSON.stringify(fresh));
    }
    return fresh;
  },

  // ----- logic ล้วน (unit-tested) -----
  deriveItems(vehicles, items) {
    const lines = [];
    for (const item of items) {
      const vehicleCount = vehicles.filter(v => item.appliesToTypes.includes(v.vehicleType)).length;
      if (vehicleCount === 0) continue;
      lines.push({ item, vehicleCount, totalQty: item.qtyPerVehicle * vehicleCount });
    }
    lines.sort((a, b) => {
      const orderDiff = CATEGORY_ORDER[a.item.category] - CATEGORY_ORDER[b.item.category];
      if (orderDiff !== 0) return orderDiff;
      return a.item.name.localeCompare(b.item.name, 'th');
    });
    return lines;
  },

  workNumber(quarter, year, seq) {
    return `MT-${year}-${quarter}-${String(seq).padStart(3, '0')}`;
  },
};

if (typeof window !== 'undefined') window.MYD = MYD;
if (typeof module !== 'undefined') module.exports = MYD;
