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
