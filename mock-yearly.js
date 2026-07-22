// mock-yearly.js — data model + storage helpers + pure logic for the
// "งานบำรุงรักษาตามวาระ" (yearly maintenance) prototype.
// Works in both the browser (window.MYD) and node (module.exports = MYD)
// so the logic below (deriveItems / workNumber) can be unit-tested with
// node's built-in test runner without any bundler/build step.
//
// โครงข้อมูล (plain objects):
// vehicle: { id, plate, vehicleType, criteria, status, mileage, engineHours }
// item:    { id, name, category, oilKind?, unit, appliesToTypes:[], qtyPerVehicle }
// plan:    { planName, criteria, selectedVehicleIds:[], quarter, year, preparedConfirmed, workNumber, approvalStatus }

const MASTER_KEY = 'maintaind.yearly.master.v1';
const PLAN_KEY = 'maintaind.yearly.plan.v1';

const SEED_VEHICLES = [
  { id:'v1', plate:'81-2345', vehicleType:'รถกระเช้า', criteria:'truck', status:'available',        mileage:120500, engineHours:3400 },
  { id:'v2', plate:'82-6677', vehicleType:'รถกระเช้า', criteria:'truck', status:'available',        mileage:98000,  engineHours:2900 },
  { id:'v3', plate:'83-1122', vehicleType:'รถเครน',   criteria:'truck', status:'pending_approval', mileage:145000, engineHours:5100 },
  { id:'v4', plate:'84-9090', vehicleType:'รถเครน',   criteria:'net',   status:'available',        mileage:76000,  engineHours:2100 },
  { id:'v5', plate:'85-3311', vehicleType:'รถขุด',    criteria:'net',   status:'available',        mileage:60000,  engineHours:4800 },
  { id:'v6', plate:'86-7788', vehicleType:'รถขุด',    criteria:'net',   status:'transferred',      mileage:52000,  engineHours:3900 },
  { id:'v7', plate:'87-4455', vehicleType:'รถกระเช้า', criteria:'net',   status:'available',        mileage:88000,  engineHours:2600 },
  { id:'v8', plate:'88-1200', vehicleType:'รถเครน',   criteria:'truck', status:'available',        mileage:132000, engineHours:4700 },
];

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
