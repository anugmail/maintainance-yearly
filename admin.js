// admin.js — Admin (Master Data) page logic: read views + CRUD for
// vehicles (ข้อมูลรถ) and items (อะไหล่/น้ำมัน/ไส้กรอง). Reads/writes via
// window.MYD (mock-yearly.js) — MYD.loadMaster()/saveMaster() persist to
// localStorage (key: maintaind.yearly.master.v1).

const state = { tab: 'vehicles', regionFilter: 'all' };

const VEHICLE_TYPES = ['รถกระเช้า', 'รถเครน', 'รถขุด'];
const ITEM_CATEGORY_ORDER = ['part', 'oil', 'filter'];

// ================= HELPERS =================
const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._x);
  t._x = setTimeout(() => t.classList.remove('show'), 2600);
}

function statusBadgeClass(status) {
  return { available: 'b-ok', pending_approval: 'b-low', transferred: 'b-brand' }[status] || 'b-ok';
}

// ================= TABS =================
function initTabs() {
  document.querySelectorAll('#adminTabs .sg').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.tab === state.tab) return;
      state.tab = el.dataset.tab;
      document.querySelectorAll('#adminTabs .sg').forEach(x => x.classList.toggle('sel', x === el));
      renderBody();
    });
  });
}

function renderBody() {
  if (state.tab === 'vehicles') renderVehicles();
  else renderItems();
}

// ================= VEHICLES: READ =================
function renderVehicles() {
  const { vehicles } = MYD.loadMaster();
  const regionFilter = state.regionFilter;
  const filtered = regionFilter === 'all' ? vehicles : vehicles.filter(v => v.region === Number(regionFilter));

  const rows = filtered.map(v => `
    <tr data-id="${esc(v.id)}">
      <td>${esc(v.plate)}</td>
      <td>${esc(v.vehicleType)}</td>
      <td>${esc(MYD.CRITERIA_LABELS[v.criteria] || v.criteria)}</td>
      <td>เขต ${esc(v.region)} <span class="rcell-zone">(${esc(MYD.ZONE_LABELS[MYD.regionZone(v.region)])})</span></td>
      <td><span class="badge ${statusBadgeClass(v.status)}">${esc(MYD.STATUS_LABELS[v.status] || v.status)}</span></td>
      <td class="num">${esc(v.mileage)}</td>
      <td class="num">${esc(v.engineHours)}</td>
      <td>
        <div class="rowline">
          <button class="iconbtn" data-act="edit-vehicle" data-id="${esc(v.id)}" title="แก้ไข"><span class="ms">edit</span></button>
          <button class="iconbtn danger" data-act="del-vehicle" data-id="${esc(v.id)}" title="ลบ"><span class="ms">delete</span></button>
        </div>
      </td>
    </tr>`).join('');

  $('adminBody').innerHTML = `
    <div class="actions" style="padding-top:0;margin-bottom:2px;justify-content:space-between">
      <div class="f" style="margin:0;max-width:220px">
        <div class="in"><span class="ms">filter_alt</span>
          <select id="fRegionFilter">
            <option value="all" ${regionFilter === 'all' ? 'selected' : ''}>ทุกเขต</option>
            ${MYD.REGIONS.map(r => `<option value="${r.id}" ${String(regionFilter) === String(r.id) ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-p" id="btnAddVehicle">+ เพิ่มรถ</button>
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr>
          <th>ทะเบียน</th><th>ประเภท</th><th>เกณฑ์</th><th>เขต</th><th>สถานะ</th><th>เลขไมล์</th><th>ชม.เครื่อง</th><th>จัดการ</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="8" class="empty">ไม่มีรถในเขตที่เลือก</td></tr>`}</tbody>
      </table>
    </div>`;

  $('fRegionFilter').addEventListener('change', e => {
    state.regionFilter = e.target.value;
    renderVehicles();
  });
  $('btnAddVehicle').addEventListener('click', () => openVehicleModal(null));
  $('adminBody').querySelectorAll('[data-act="edit-vehicle"]').forEach(b =>
    b.addEventListener('click', () => openVehicleModal(b.dataset.id)));
  $('adminBody').querySelectorAll('[data-act="del-vehicle"]').forEach(b =>
    b.addEventListener('click', () => deleteVehicle(b.dataset.id)));
}

// ================= VEHICLES: CRUD =================
function deleteVehicle(id) {
  if (!confirm('ยืนยันลบรถคันนี้?')) return;
  const master = MYD.loadMaster();
  master.vehicles = master.vehicles.filter(v => v.id !== id);
  MYD.saveMaster(master);
  renderVehicles();
  toast('ลบรถเรียบร้อย');
}

function openVehicleModal(id) {
  const master = MYD.loadMaster();
  const editing = id ? master.vehicles.find(v => v.id === id) : null;
  const defaultRegion = state.regionFilter !== 'all' ? Number(state.regionFilter) : 1;
  const v = editing || { plate: '', vehicleType: VEHICLE_TYPES[0], criteria: 'truck', region: defaultRegion, status: 'available', mileage: 0, engineHours: 0 };

  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `
    <div class="card">
      <div class="sect">${editing ? 'แก้ไขรถ' : 'เพิ่มรถ'}</div>
      <form id="vehicleForm">
        <div class="fgrid">
          <div class="f sp2"><label>ทะเบียน</label><div class="in"><span class="ms">directions_car</span><input type="text" name="plate" required value="${esc(v.plate)}"></div></div>
          <div class="f sp2"><label>ประเภท</label><div class="in"><span class="ms">category</span><select name="vehicleType">${VEHICLE_TYPES.map(t => `<option value="${esc(t)}" ${v.vehicleType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div></div>
          <div class="f sp2"><label>เกณฑ์</label><div class="in"><span class="ms">rule</span><select name="criteria">${Object.entries(MYD.CRITERIA_LABELS).map(([k, l]) => `<option value="${k}" ${v.criteria === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
          <div class="f sp2"><label>เขต</label><div class="in"><span class="ms">map</span><select name="region">${MYD.REGIONS.map(r => `<option value="${r.id}" ${Number(v.region) === r.id ? 'selected' : ''}>${esc(r.name)} (${esc(MYD.ZONE_LABELS[r.zone])})</option>`).join('')}</select></div></div>
          <div class="f sp2"><label>สถานะ</label><div class="in"><span class="ms">flag</span><select name="status">${Object.entries(MYD.STATUS_LABELS).map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
          <div class="f sp2"><label>เลขไมล์</label><div class="in"><span class="ms">speed</span><input type="number" name="mileage" min="0" value="${esc(v.mileage)}"></div></div>
          <div class="f sp2"><label>ชม.เครื่อง</label><div class="in"><span class="ms">schedule</span><input type="number" name="engineHours" min="0" value="${esc(v.engineHours)}"></div></div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-g" id="btnCancelVehicle">ยกเลิก</button>
          <button type="submit" class="btn btn-p">บันทึก</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(ov);

  ov.querySelector('#btnCancelVehicle').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  ov.querySelector('#vehicleForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rec = {
      id: editing ? editing.id : 'v' + Date.now(),
      plate: String(fd.get('plate') || '').trim(),
      vehicleType: fd.get('vehicleType'),
      criteria: fd.get('criteria'),
      region: Number(fd.get('region')) || 1,
      status: fd.get('status'),
      mileage: Number(fd.get('mileage')) || 0,
      engineHours: Number(fd.get('engineHours')) || 0,
    };
    const m = MYD.loadMaster();
    if (editing) {
      const idx = m.vehicles.findIndex(x => x.id === editing.id);
      m.vehicles[idx] = rec;
    } else {
      m.vehicles.push(rec);
    }
    MYD.saveMaster(m);
    ov.remove();
    renderVehicles();
    toast(editing ? 'แก้ไขรถเรียบร้อย' : 'เพิ่มรถเรียบร้อย');
  });
}

// ================= ITEMS: READ =================
function renderItems() {
  const { items } = MYD.loadMaster();

  const sections = ITEM_CATEGORY_ORDER.map(cat => {
    const list = items.filter(i => i.category === cat);
    const rows = list.map(i => `
      <tr data-id="${esc(i.id)}">
        <td>${esc(i.name)}</td>
        <td>${esc(i.unit)}</td>
        <td class="num">${esc(i.qtyPerVehicle)}</td>
        <td>${esc((i.appliesToTypes || []).join(', '))}</td>
        <td>
          <div class="rowline">
            <button class="iconbtn" data-act="edit-item" data-id="${esc(i.id)}" title="แก้ไข"><span class="ms">edit</span></button>
            <button class="iconbtn danger" data-act="del-item" data-id="${esc(i.id)}" title="ลบ"><span class="ms">delete</span></button>
          </div>
        </td>
      </tr>`).join('');

    return `
      <div class="sect">${esc(MYD.CATEGORY_LABELS[cat])}</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>ชื่อ</th><th>หน่วย</th><th>จำนวนต่อคัน</th><th>ประเภทรถที่ใช้</th><th>จัดการ</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="empty">ไม่มีรายการ</td></tr>`}</tbody>
        </table>
      </div>`;
  }).join('');

  $('adminBody').innerHTML = `
    <div class="actions" style="padding-top:0;margin-bottom:2px">
      <button class="btn btn-p" id="btnAddItem">+ เพิ่มรายการ</button>
    </div>
    ${sections}`;

  $('btnAddItem').addEventListener('click', () => openItemModal(null));
  $('adminBody').querySelectorAll('[data-act="edit-item"]').forEach(b =>
    b.addEventListener('click', () => openItemModal(b.dataset.id)));
  $('adminBody').querySelectorAll('[data-act="del-item"]').forEach(b =>
    b.addEventListener('click', () => deleteItem(b.dataset.id)));
}

// ================= ITEMS: CRUD =================
function deleteItem(id) {
  if (!confirm('ยืนยันลบรายการนี้?')) return;
  const m = MYD.loadMaster();
  m.items = m.items.filter(i => i.id !== id);
  MYD.saveMaster(m);
  renderItems();
  toast('ลบรายการเรียบร้อย');
}

function openItemModal(id) {
  const master = MYD.loadMaster();
  const editing = id ? master.items.find(i => i.id === id) : null;
  const it = editing || { name: '', category: 'part', oilKind: 'engine', unit: '', qtyPerVehicle: 1, appliesToTypes: [] };

  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `
    <div class="card">
      <div class="sect">${editing ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</div>
      <form id="itemForm">
        <div class="fgrid">
          <div class="f sp2"><label>ชื่อ</label><div class="in"><span class="ms">inventory_2</span><input type="text" name="name" required value="${esc(it.name)}"></div></div>
          <div class="f sp2"><label>หมวด</label><div class="in"><span class="ms">category</span><select name="category" id="fCategory">${Object.entries(MYD.CATEGORY_LABELS).map(([k, l]) => `<option value="${k}" ${it.category === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
          <div class="f sp2" id="fOilKindWrap" style="${it.category === 'oil' ? '' : 'display:none'}"><label>ชนิดน้ำมัน</label><div class="in"><span class="ms">opacity</span><select name="oilKind">${Object.entries(MYD.OILKIND_LABELS).map(([k, l]) => `<option value="${k}" ${it.oilKind === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
          <div class="f sp2"><label>หน่วย</label><div class="in"><span class="ms">straighten</span><input type="text" name="unit" value="${esc(it.unit)}"></div></div>
          <div class="f sp2"><label>จำนวนต่อคัน</label><div class="in"><span class="ms">numbers</span><input type="number" name="qtyPerVehicle" min="0" value="${esc(it.qtyPerVehicle)}"></div></div>
        </div>
        <div class="f"><label>ประเภทรถที่ใช้</label></div>
        <div class="chk">
          ${VEHICLE_TYPES.map(t => `<label><input type="checkbox" name="appliesToTypes" value="${esc(t)}" ${it.appliesToTypes.includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}
        </div>
        <div class="actions">
          <button type="button" class="btn btn-g" id="btnCancelItem">ยกเลิก</button>
          <button type="submit" class="btn btn-p">บันทึก</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(ov);

  const catSel = ov.querySelector('#fCategory');
  const oilWrap = ov.querySelector('#fOilKindWrap');
  catSel.addEventListener('change', () => {
    oilWrap.style.display = catSel.value === 'oil' ? '' : 'none';
  });

  ov.querySelector('#btnCancelItem').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  ov.querySelector('#itemForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const category = fd.get('category');
    const rec = {
      id: editing ? editing.id : 'i' + Date.now(),
      name: String(fd.get('name') || '').trim(),
      category,
      unit: String(fd.get('unit') || '').trim(),
      qtyPerVehicle: Number(fd.get('qtyPerVehicle')) || 0,
      appliesToTypes: fd.getAll('appliesToTypes'),
    };
    if (category === 'oil') rec.oilKind = fd.get('oilKind');
    const m = MYD.loadMaster();
    if (editing) {
      const idx = m.items.findIndex(x => x.id === editing.id);
      m.items[idx] = rec;
    } else {
      m.items.push(rec);
    }
    MYD.saveMaster(m);
    ov.remove();
    renderItems();
    toast(editing ? 'แก้ไขรายการเรียบร้อย' : 'เพิ่มรายการเรียบร้อย');
  });
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  renderBody();
});
