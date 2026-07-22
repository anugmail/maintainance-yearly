// app.js — app shell flow logic: central state, 6-phase chevron stepper,
// phase router. Phase 1 (Master Plan) ships a full 5-sub-step wizard
// (renderMasterPlan). Phases 2-6 still render a placeholder via
// renderPlaceholder() until their own tasks land.

const PHASES = [
  { id:'master-plan', no:1, label:'ออกเลขงาน' },
  { id:'procurement', no:2, label:'เบิก/จัดหา + แผนเดินทาง' },
  { id:'maintenance', no:3, label:'ดำเนินการบำรุงรักษา' },
  { id:'inspection',  no:4, label:'ตรวจรับ' },
  { id:'report',      no:5, label:'จัดทำรายงาน' },
  { id:'cost',        no:6, label:'คำนวณต้นทุน' },
];

const state = { phase: 'master-plan' };

// ================= HELPERS =================
const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._x);
  t._x = setTimeout(() => t.classList.remove('show'), 2600);
}

// ================= PHASE COMPLETION / GUARD =================
// เฟส 1 (master-plan) ถือว่า "complete" เมื่อแผนได้รับอนุมัติเลขงานแล้ว
// เฟส 2-6 ยังไม่มี logic ความสำเร็จของตัวเอง (มาใน task ถัดไปเมื่อลงมือแต่ละเฟส)
function isPhaseComplete(id) {
  if (id === 'master-plan') return MYD.loadPlan().approvalStatus === 'approved';
  if (id === 'procurement') return MYD.loadPlan().travelConfirmed === true;
  return false;
}

// เฟสถัดไปคลิกได้ก็ต่อเมื่อเฟสก่อนหน้า complete แล้ว (เฟสแรกเข้าได้เสมอ)
function canGoPhase(id) {
  const idx = PHASES.findIndex(p => p.id === id);
  if (idx <= 0) return true;
  return isPhaseComplete(PHASES[idx - 1].id);
}

// ================= STEPPER (chevron 6 เฟส) =================
function renderStepper() {
  const el = $('stepper');
  el.innerHTML = `<div class="wsteps">${PHASES.map(p => {
    const active = p.id === state.phase;
    // passed ไม่ผูกกับ !active: เฟสที่กำลังดูอยู่ก็ยัง "passed" ได้ถ้าทำเสร็จแล้ว
    // (เช่น เฟส 1 อนุมัติเลขงานแล้ว แต่ยังอยู่หน้าเดิมเพื่อดูสรุปผล)
    const passed = isPhaseComplete(p.id);
    const clickable = canGoPhase(p.id);
    const cls = ['wstep'];
    if (active) cls.push('active');
    if (passed) cls.push('passed');
    if (!clickable) cls.push('locked');
    return `<div class="${cls.join(' ')}" onclick="goPhase('${p.id}')">
      <span class="num">${passed ? '✓' : p.no}</span>
      <span class="lbl">${esc(p.label)}</span>
    </div>`;
  }).join('')}</div>`;
}

// ================= NAV =================
function goPhase(id) {
  if (!canGoPhase(id)) {
    toast('ต้องทำเฟสก่อนหน้าให้เสร็จก่อน ถึงจะเข้าเฟสนี้ได้');
    return;
  }
  state.phase = id;
  state.sub = 1; // เปลี่ยนเฟส -> รีเซ็ต sub-step wizard ของเฟสใหม่ให้เริ่มขั้น 1 เสมอ
  renderStepper();
  renderPhase();
  window.scrollTo({ top: 0 });
}

// ================= PHASE ROUTER =================
function renderPlaceholder(id) {
  const phase = PHASES.find(p => p.id === id);
  const label = phase ? phase.label : id;
  return `<div class="card">
    <div class="sect">${esc(label)}</div>
    <div class="empty">เฟสนี้อยู่ในแผนถัดไป — ${esc(label)}</div>
  </div>`;
}

function renderPhase() {
  if (state.phase === 'master-plan') {
    renderMasterPlan();
    return;
  }
  if (state.phase === 'procurement') {
    renderProcurement();
    return;
  }
  $('phase').innerHTML = renderPlaceholder(state.phase);
}

// ================================================================
// ================= MASTER PLAN WIZARD (Phase 1) =================
// ================================================================
// sub-stepper 5 ขั้น (state.sub, 1..5) เก็บใน memory เท่านั้น
// ข้อมูลแผนจริงอ่าน/เขียนผ่าน MYD.loadPlan()/MYD.savePlan() (localStorage)
// เข้าเฟส 1 ครั้งใด ถ้าแผนอนุมัติแล้ว (approvalStatus==='approved') ข้าม
// wizard ไปแสดงสรุปผลอนุมัติเลย ไม่ให้เริ่ม wizard ใหม่

const SUB_STEPS = [
  { no: 1, label: 'ชื่อแผน + เกณฑ์' },
  { no: 2, label: 'เลือกรถ' },
  { no: 3, label: 'รายการอะไหล่' },
  { no: 4, label: 'ไทรมาส' },
  { no: 5, label: 'ทวน + อนุมัติ' },
];

const QUARTERS = [
  { q: 'Q1', months: 'ต.ค.–ธ.ค.' },
  { q: 'Q2', months: 'ม.ค.–มี.ค.' },
  { q: 'Q3', months: 'เม.ย.–มิ.ย.' },
  { q: 'Q4', months: 'ก.ค.–ก.ย.' },
];

const STATUS_BADGE_CLASS = { available: 'b-ok', pending_approval: 'b-low', transferred: 'b-brand' };

function renderMasterPlan() {
  const plan = MYD.loadPlan();
  if (plan.approvalStatus === 'approved') {
    renderApprovedSummary(plan);
    return;
  }
  if (!state.sub) state.sub = 1;
  renderWizard(plan);
}

// ----- sub-nav -----
function goSub(n) {
  if (n < 1 || n > 5) return;
  state.sub = n;
  renderMasterPlan();
  window.scrollTo({ top: 0 });
}

function nextSub() {
  const plan = MYD.loadPlan();
  if (!validateSub(plan, state.sub)) return;
  if (state.sub >= 5) return;
  goSub(state.sub + 1);
}

function backSub() {
  if (state.sub <= 1) return;
  goSub(state.sub - 1);
}

function validateSub(plan, sub) {
  if (sub === 1) return !!(plan.planName && plan.planName.trim() && plan.criteria);
  if (sub === 2) return (plan.selectedVehicleIds || []).length > 0;
  if (sub === 3) return true;
  if (sub === 4) return !!plan.quarter;
  return true;
}

function updatePrimaryEnabled(plan) {
  const btn = $('btnPrimarySub');
  if (!btn) return;
  btn.disabled = state.sub < 5 ? !validateSub(plan, state.sub) : !plan.preparedConfirmed;
}

// ----- wizard shell -----
function renderWizard(plan) {
  const primaryLabel = state.sub === 5 ? 'ขออนุมัติเลขงาน' : 'ถัดไป';
  const primaryDisabled = state.sub === 5 ? !plan.preparedConfirmed : !validateSub(plan, state.sub);

  $('phase').innerHTML = `
    <div class="card">
      <div class="wsteps sm">${SUB_STEPS.map(s => {
        const active = s.no === state.sub;
        const passed = s.no < state.sub;
        const cls = ['wstep'];
        if (active) cls.push('active');
        if (passed) cls.push('passed');
        if (s.no > state.sub) cls.push('locked');
        return `<div class="${cls.join(' ')}" onclick="goSub(${s.no})">
          <span class="num">${passed ? '✓' : s.no}</span>
          <span class="lbl">${esc(s.label)}</span>
        </div>`;
      }).join('')}</div>
      <div id="subBody">${renderSubBody(plan)}</div>
      <div class="actions">
        <button class="btn btn-g" id="btnBackSub" ${state.sub === 1 ? 'disabled' : ''}>ย้อนกลับ</button>
        <button class="btn btn-p" id="btnPrimarySub" ${primaryDisabled ? 'disabled' : ''}>${esc(primaryLabel)}</button>
      </div>
    </div>`;

  bindSubBody(plan);

  $('btnBackSub').addEventListener('click', backSub);
  $('btnPrimarySub').addEventListener('click', () => {
    if (state.sub === 5) approvePlan(plan);
    else nextSub();
  });
}

function renderSubBody(plan) {
  if (state.sub === 1) return renderStep1(plan);
  if (state.sub === 2) return renderStep2(plan);
  if (state.sub === 3) return renderStep3(plan);
  if (state.sub === 4) return renderStep4(plan);
  return renderStep5(plan);
}

function bindSubBody(plan) {
  if (state.sub === 1) bindStep1(plan);
  else if (state.sub === 2) bindStep2(plan);
  else if (state.sub === 4) bindStep4(plan);
  else if (state.sub === 5) bindStep5(plan);
  // step 3 อ่านอย่างเดียว ไม่มี event ผูก
}

// ----- ขั้น 1: ชื่อแผน + เกณฑ์ -----
function renderStep1(plan) {
  return `
    <div class="sect">ขั้นที่ 1: ชื่อแผน + เกณฑ์</div>
    <div class="fgrid">
      <div class="f sp4">
        <label>ชื่อแผน</label>
        <div class="in"><span class="ms">assignment</span>
          <input type="text" id="fPlanName" placeholder="เช่น แผนบำรุงรักษาไตรมาส 3/2569" value="${esc(plan.planName || '')}">
        </div>
      </div>
    </div>
    <div class="f"><label>เกณฑ์การเข้าแผน</label></div>
    <div class="fgrid" style="margin-top:0">
      <div class="tile tile-magenta sp2 ${plan.criteria === 'truck' ? 'sel' : ''}" id="critTruck" data-crit="truck">
        <span class="ms">local_shipping</span><b>${esc(MYD.CRITERIA_LABELS.truck)}</b>
      </div>
      <div class="tile tile-blue sp2 ${plan.criteria === 'net' ? 'sel' : ''}" id="critNet" data-crit="net">
        <span class="ms">precision_manufacturing</span><b>${esc(MYD.CRITERIA_LABELS.net)}</b>
      </div>
    </div>`;
}

function bindStep1(plan) {
  $('fPlanName').addEventListener('input', e => {
    plan.planName = e.target.value;
    MYD.savePlan(plan);
    updatePrimaryEnabled(plan);
  });
  $('critTruck').addEventListener('click', () => selectCriteria(plan, 'truck'));
  $('critNet').addEventListener('click', () => selectCriteria(plan, 'net'));
}

function selectCriteria(plan, crit) {
  if (plan.criteria !== crit) {
    plan.criteria = crit;
    plan.selectedVehicleIds = []; // เปลี่ยนเกณฑ์ต้องล้างรถที่เลือกไว้
  }
  MYD.savePlan(plan);
  renderWizard(plan);
}

// ----- ขั้น 2: เลือกรถเข้าแผน (ภาค → เขต → รถ) -----
// state.expandedRegions: { [regionId]: true|false } — เก็บสถานะขยาย/ย่อของแต่ละเขต
// ข้าม re-render ของ wizard ได้ (ไม่ผูกกับ plan, อยู่ใน memory เท่านั้น เหมือน state.sub)
function regionVehiclesFor(master, plan, regionId) {
  return master.vehicles.filter(v => v.region === regionId && v.criteria === plan.criteria);
}

function renderStep2(plan) {
  if (!state.expandedRegions) state.expandedRegions = {};
  const master = MYD.loadMaster();
  const allVehicles = master.vehicles.filter(v => v.criteria === plan.criteria);
  const selected = new Set(plan.selectedVehicleIds || []);
  const allSelected = allVehicles.length > 0 && allVehicles.every(v => selected.has(v.id));
  const regionsSelected = new Set(allVehicles.filter(v => selected.has(v.id)).map(v => v.region));

  const zonesHtml = MYD.ZONE_ORDER.map(zone => {
    const regions = MYD.REGIONS.filter(r => r.zone === zone);
    if (!regions.length) return '';
    const blocks = regions.map(r => renderRegionBlock(r, master, plan, selected)).join('');
    return `<div class="sect">${esc(MYD.ZONE_LABELS[zone])}</div>${blocks}`;
  }).join('');

  return `
    <div class="sect">ขั้นที่ 2: เลือกรถเข้าแผน (เกณฑ์: ${esc(MYD.CRITERIA_LABELS[plan.criteria] || plan.criteria)})</div>
    <div class="sub">เลือกแล้ว ${selected.size} คัน จาก ${regionsSelected.size} เขต</div>
    <div class="chk" style="margin-bottom:12px">
      <label><input type="checkbox" id="chkAllZones" ${allSelected ? 'checked' : ''} ${allVehicles.length === 0 ? 'disabled' : ''}> เลือกทั้งหมด (ทุกเขต) — ${allVehicles.length} คัน</label>
    </div>
    ${zonesHtml || `<div class="empty">ไม่มีรถตามเกณฑ์นี้</div>`}`;
}

function renderRegionBlock(region, master, plan, selected) {
  const vehicles = regionVehiclesFor(master, plan, region.id);
  const selCount = vehicles.filter(v => selected.has(v.id)).length;
  const expanded = !!state.expandedRegions[region.id];

  const rows = vehicles.map(v => `
    <tr data-id="${esc(v.id)}">
      <td><input type="checkbox" class="rowChk" data-id="${esc(v.id)}" ${selected.has(v.id) ? 'checked' : ''}></td>
      <td>${esc(v.plate)}</td>
      <td>${esc(v.vehicleType)}</td>
      <td><span class="badge ${STATUS_BADGE_CLASS[v.status] || 'b-ok'}">${esc(MYD.STATUS_LABELS[v.status] || v.status)}</span></td>
    </tr>`).join('');

  return `
    <div class="rzone" data-region="${region.id}">
      <div class="rzone-head" onclick="toggleRegion(${region.id})">
        <span class="ms rzone-caret">${expanded ? 'expand_more' : 'chevron_right'}</span>
        <b>${esc(region.name)}</b>
        <span class="rzone-count">(เลือก ${selCount}/${vehicles.length} คัน)</span>
        <label class="rzone-allchk" onclick="event.stopPropagation()">
          <input type="checkbox" class="regionAllChk" data-region="${region.id}" ${vehicles.length === 0 ? 'disabled' : ''} ${vehicles.length > 0 && selCount === vehicles.length ? 'checked' : ''}> เลือกทั้งเขต
        </label>
      </div>
      ${expanded ? `
      <div class="rzone-body">
        <div class="tblwrap">
          <table class="tbl">
            <thead><tr><th></th><th>ทะเบียน</th><th>ประเภท</th><th>สถานะ</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" class="empty">ไม่มีรถตามเกณฑ์นี้ในเขตนี้</td></tr>`}</tbody>
          </table>
        </div>
      </div>` : ''}
    </div>`;
}

function toggleRegion(regionId) {
  if (!state.expandedRegions) state.expandedRegions = {};
  state.expandedRegions[regionId] = !state.expandedRegions[regionId];
  renderWizard(MYD.loadPlan());
}

function bindStep2(plan) {
  const master = MYD.loadMaster();
  const allVehicles = master.vehicles.filter(v => v.criteria === plan.criteria);

  const chkAllZones = $('chkAllZones');
  if (chkAllZones) {
    chkAllZones.addEventListener('change', e => {
      plan.selectedVehicleIds = e.target.checked ? allVehicles.map(v => v.id) : [];
      MYD.savePlan(plan);
      renderWizard(plan);
    });
  }

  document.querySelectorAll('.regionAllChk').forEach(chk => {
    const regionId = Number(chk.dataset.region);
    const vehicles = regionVehiclesFor(master, plan, regionId);
    const selectedNow = new Set(plan.selectedVehicleIds || []);
    const selCount = vehicles.filter(v => selectedNow.has(v.id)).length;
    chk.indeterminate = selCount > 0 && selCount < vehicles.length;

    chk.addEventListener('change', e => {
      const set = new Set(plan.selectedVehicleIds || []);
      if (e.target.checked) vehicles.forEach(v => set.add(v.id));
      else vehicles.forEach(v => set.delete(v.id));
      plan.selectedVehicleIds = [...set];
      MYD.savePlan(plan);
      renderWizard(plan);
    });
  });

  document.querySelectorAll('.rowChk').forEach(chk => {
    chk.addEventListener('change', e => {
      const id = e.target.dataset.id;
      const set = new Set(plan.selectedVehicleIds || []);
      if (e.target.checked) set.add(id); else set.delete(id);
      plan.selectedVehicleIds = [...set];
      MYD.savePlan(plan);
      renderWizard(plan);
    });
  });
}

// ----- ขั้น 3: รายการอะไหล่/น้ำมัน/ไส้กรอง (auto) -----
function deriveLinesForPlan(plan) {
  const master = MYD.loadMaster();
  const selectedVehicles = master.vehicles.filter(v => (plan.selectedVehicleIds || []).includes(v.id));
  return { selectedVehicles, lines: MYD.deriveItems(selectedVehicles, master.items) };
}

function renderStep3(plan) {
  const { selectedVehicles, lines } = deriveLinesForPlan(plan);

  const groups = ['part', 'oil', 'filter'].map(cat => {
    const catLines = lines.filter(l => l.item.category === cat);
    if (!catLines.length) return '';
    const rows = catLines.map(l => `
      <tr>
        <td>${esc(l.item.name)}</td>
        <td class="num">${esc(l.item.qtyPerVehicle)}</td>
        <td class="num">${esc(l.vehicleCount)}</td>
        <td class="num">${esc(l.totalQty)}</td>
        <td>${esc(l.item.unit)}</td>
      </tr>`).join('');
    return `
      <div class="sect">${esc(MYD.CATEGORY_LABELS[cat])}</div>
      <div class="tblwrap">
        <table class="tbl itbl">
          <thead><tr><th>ชื่อ</th><th>ต่อคัน</th><th>จำนวนรถ</th><th>รวม</th><th>หน่วย</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `
    <div class="sect">ขั้นที่ 3: รายการอะไหล่/น้ำมัน/ไส้กรอง (คำนวณอัตโนมัติ)</div>
    <div class="sub">จากรถที่เลือก ${selectedVehicles.length} คัน — รายการนี้อ่านอย่างเดียว</div>
    ${groups || `<div class="empty">ไม่มีรายการที่เกี่ยวข้องกับรถที่เลือก</div>`}`;
}

// ----- ขั้น 4: ระบุไทรมาส -----
function renderStep4(plan) {
  return `
    <div class="sect">ขั้นที่ 4: ระบุไทรมาส</div>
    <div class="fgrid">
      ${QUARTERS.map(q => `
        <div class="tile tile-blue ${plan.quarter === q.q ? 'sel' : ''}" id="qtile-${q.q}" data-q="${q.q}">
          <b>${esc(q.q)}</b><small>${esc(q.months)}</small>
        </div>`).join('')}
    </div>
    <div class="fgrid">
      <div class="f sp2">
        <label>ปี (พ.ศ.)</label>
        <div class="in noic"><input type="number" id="fYear" min="2560" max="2700" value="${esc(plan.year || 2569)}"></div>
      </div>
    </div>`;
}

function bindStep4(plan) {
  QUARTERS.forEach(q => {
    $(`qtile-${q.q}`).addEventListener('click', () => {
      plan.quarter = q.q;
      MYD.savePlan(plan);
      renderWizard(plan);
    });
  });
  $('fYear').addEventListener('input', e => {
    const n = Number(e.target.value);
    plan.year = n || plan.year;
    MYD.savePlan(plan);
  });
}

// ----- ขั้น 5: ทวน + ผบพ.เตรียมอะไหล่ + ขออนุมัติเลขงาน -----
function renderStep5(plan) {
  const { selectedVehicles, lines } = deriveLinesForPlan(plan);
  const qInfo = QUARTERS.find(q => q.q === plan.quarter);
  const catSummary = ['part', 'oil', 'filter']
    .map(cat => {
      const catLines = lines.filter(l => l.item.category === cat);
      return catLines.length ? `${esc(MYD.CATEGORY_LABELS[cat])} ${catLines.length} รายการ` : null;
    })
    .filter(Boolean)
    .join(' · ');

  return `
    <div class="sect">ขั้นที่ 5: ทวนสอบแผน + ขออนุมัติเลขงาน</div>
    <div class="fgrid">
      <div class="f sp2"><label>ชื่อแผน</label><div>${esc(plan.planName)}</div></div>
      <div class="f sp2"><label>เกณฑ์</label><div>${esc(MYD.CRITERIA_LABELS[plan.criteria] || '-')}</div></div>
      <div class="f sp2"><label>จำนวนรถ</label><div>${selectedVehicles.length} คัน</div></div>
      <div class="f sp2"><label>ไทรมาส/ปี</label><div>${esc(plan.quarter)}${qInfo ? ' (' + esc(qInfo.months) + ')' : ''} / ${esc(plan.year)}</div></div>
      <div class="f sp4"><label>สรุปอะไหล่รวม</label><div>${catSummary || 'ไม่มีรายการ'}</div></div>
    </div>
    <div class="chk" style="margin-top:8px">
      <label><input type="checkbox" id="chkPrepared" ${plan.preparedConfirmed ? 'checked' : ''}> ผบพ. ตรวจ/เตรียมอะไหล่สำหรับไทรมาสนี้แล้ว</label>
    </div>`;
}

function bindStep5(plan) {
  $('chkPrepared').addEventListener('change', e => {
    plan.preparedConfirmed = e.target.checked;
    MYD.savePlan(plan);
    updatePrimaryEnabled(plan);
  });
}

function approvePlan(plan) {
  if (!plan.preparedConfirmed) return;
  plan.workNumber = MYD.workNumber(plan.quarter, plan.year, 1);
  plan.approvalStatus = 'approved';
  MYD.savePlan(plan);
  toast('ขออนุมัติเลขงานสำเร็จ: ' + plan.workNumber);
  renderStepper(); // เฟส 1 กลายเป็น passed, เฟส 2 ปลดล็อก
  renderMasterPlan();
}

// ----- สรุปหลังอนุมัติ (แทนที่ wizard เมื่อ approvalStatus==='approved') -----
function renderApprovedSummary(plan) {
  const selectedVehicles = MYD.loadMaster().vehicles.filter(v => (plan.selectedVehicleIds || []).includes(v.id));
  const counts = { available: 0, pending_approval: 0, transferred: 0 };
  selectedVehicles.forEach(v => { counts[v.status] = (counts[v.status] || 0) + 1; });

  $('phase').innerHTML = `
    <div class="card">
      <div class="sect">แผนบำรุงรักษา — อนุมัติแล้ว</div>
      <span class="badge b-ok" style="font-size:15px;padding:6px 16px">${esc(plan.workNumber)}</span>
      <div class="fgrid" style="margin-top:16px">
        <div class="f sp2"><label>ชื่อแผน</label><div>${esc(plan.planName)}</div></div>
        <div class="f sp2"><label>เกณฑ์</label><div>${esc(MYD.CRITERIA_LABELS[plan.criteria] || '-')}</div></div>
        <div class="f sp2"><label>ไทรมาส/ปี</label><div>${esc(plan.quarter)} / ${esc(plan.year)}</div></div>
        <div class="f sp2"><label>จำนวนรถทั้งหมด</label><div>${selectedVehicles.length} คัน</div></div>
      </div>
      <div class="sect">สรุปสถานะรถตามแผน</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>สถานะ</th><th>จำนวน</th></tr></thead>
          <tbody>
            <tr><td><span class="badge b-ok">${esc(MYD.STATUS_LABELS.available)}</span></td><td class="num">${counts.available}</td></tr>
            <tr><td><span class="badge b-low">${esc(MYD.STATUS_LABELS.pending_approval)}</span></td><td class="num">${counts.pending_approval}</td></tr>
            <tr><td><span class="badge b-brand">${esc(MYD.STATUS_LABELS.transferred)}</span></td><td class="num">${counts.transferred}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn btn-p" id="btnGoNextPhase">ไปเฟสถัดไป →</button>
      </div>
    </div>`;

  $('btnGoNextPhase').addEventListener('click', () => goPhase('procurement'));
}

// ================================================================
// ================= PROCUREMENT WIZARD (Phase 2) =================
// ================================================================
// sub-stepper 3 ขั้น (ใช้ state.sub ร่วมกับเฟส 1 — goPhase() รีเซ็ตเป็น 1
// ทุกครั้งที่เปลี่ยนเฟส) เขียน/อ่านผ่าน MYD.loadPlan()/MYD.savePlan() เช่นกัน
// เข้าเฟส 2 ครั้งใด ถ้า travelConfirmed แล้ว ข้าม wizard ไปแสดงสรุปยืนยันเลย

const PROC_STEPS = [
  { no: 1, label: 'เบิกอะไหล่' },
  { no: 2, label: 'แผนเดินทาง' },
  { no: 3, label: 'ทวน + ยืนยัน' },
];

function renderProcurement() {
  const plan = MYD.loadPlan();
  if (plan.travelConfirmed === true) {
    renderProcurementConfirmed(plan);
    return;
  }
  if (!state.sub) state.sub = 1;
  renderProcWizard(plan);
}

// ----- sub-nav -----
function goProcSub(n) {
  if (n < 1 || n > 3) return;
  state.sub = n;
  renderProcurement();
  window.scrollTo({ top: 0 });
}

function nextProcSub() {
  const plan = MYD.loadPlan();
  if (!validateProcSub(plan, state.sub)) return;
  if (state.sub >= 3) return;
  goProcSub(state.sub + 1);
}

function backProcSub() {
  if (state.sub <= 1) return;
  goProcSub(state.sub - 1);
}

function validateProcSub(plan, sub) {
  if (sub === 1) return !!plan.partsRequisitioned;
  if (sub === 2) {
    const tp = plan.travelPlan;
    return !!(tp && tp.location && tp.location.trim() && tp.dateFrom && tp.dateTo);
  }
  return true;
}

function updateProcPrimaryEnabled(plan) {
  const btn = $('btnPrimaryProc');
  if (!btn) return;
  btn.disabled = !validateProcSub(plan, state.sub);
}

// ----- wizard shell -----
function renderProcWizard(plan) {
  const primaryLabel = state.sub === 3 ? 'ยืนยันแผนเดินทาง' : 'ถัดไป';
  const primaryDisabled = !validateProcSub(plan, state.sub);

  $('phase').innerHTML = `
    <div class="card">
      <div class="wsteps sm">${PROC_STEPS.map(s => {
        const active = s.no === state.sub;
        const passed = s.no < state.sub;
        const cls = ['wstep'];
        if (active) cls.push('active');
        if (passed) cls.push('passed');
        if (s.no > state.sub) cls.push('locked');
        return `<div class="${cls.join(' ')}" onclick="goProcSub(${s.no})">
          <span class="num">${passed ? '✓' : s.no}</span>
          <span class="lbl">${esc(s.label)}</span>
        </div>`;
      }).join('')}</div>
      <div id="procBody">${renderProcSubBody(plan)}</div>
      <div class="actions">
        <button class="btn btn-g" id="btnBackProc" ${state.sub === 1 ? 'disabled' : ''}>ย้อนกลับ</button>
        <button class="btn btn-p" id="btnPrimaryProc" ${primaryDisabled ? 'disabled' : ''}>${esc(primaryLabel)}</button>
      </div>
    </div>`;

  bindProcSubBody(plan);

  $('btnBackProc').addEventListener('click', backProcSub);
  $('btnPrimaryProc').addEventListener('click', () => {
    if (state.sub === 3) confirmTravelPlan(plan);
    else nextProcSub();
  });
}

function renderProcSubBody(plan) {
  if (state.sub === 1) return renderProcStep1(plan);
  if (state.sub === 2) return renderProcStep2(plan);
  return renderProcStep3(plan);
}

function bindProcSubBody(plan) {
  if (state.sub === 1) bindProcStep1(plan);
  else if (state.sub === 2) bindProcStep2(plan);
  // ขั้น 3 อ่านอย่างเดียว ไม่มี event ผูก (ปุ่มยืนยันอยู่ที่ actions footer)
}

// ----- ขั้น 1: เบิกอะไหล่ -----
function renderProcStep1(plan) {
  const master = MYD.loadMaster();
  const selectedVehicles = master.vehicles.filter(v => (plan.selectedVehicleIds || []).includes(v.id));
  const lines = MYD.deriveItems(selectedVehicles, master.items);

  const groups = ['part', 'oil', 'filter'].map(cat => {
    const catLines = lines.filter(l => l.item.category === cat);
    if (!catLines.length) return '';
    const rows = catLines.map(l => `
      <tr>
        <td>${esc(l.item.name)}</td>
        <td class="num">${esc(l.item.qtyPerVehicle)}</td>
        <td class="num">${esc(l.vehicleCount)}</td>
        <td class="num">${esc(l.totalQty)}</td>
        <td>${esc(l.item.unit)}</td>
      </tr>`).join('');
    return `
      <div class="sect">${esc(MYD.CATEGORY_LABELS[cat])}</div>
      <div class="tblwrap">
        <table class="tbl itbl">
          <thead><tr><th>ชื่อ</th><th>ต่อคัน</th><th>จำนวนรถ</th><th>รวม</th><th>หน่วย</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `
    <div class="sect">ขั้นที่ 1: เบิกอะไหล่ (สรุปรายการจากแผน)</div>
    <div class="sub">รถที่เข้าแผน ${selectedVehicles.length} คัน — รายการนี้คำนวณอัตโนมัติจากรถที่เลือกไว้ในเฟส 1</div>
    ${groups || `<div class="empty">ไม่มีรายการที่เกี่ยวข้องกับรถที่เลือก</div>`}
    <div style="margin-top:14px">
      ${plan.partsRequisitioned
        ? `<span class="badge b-ok">ส่งคำขอแล้ว</span>`
        : `<button class="btn btn-o" id="btnRequisition">ส่งคำขอเบิกอะไหล่</button>`}
    </div>`;
}

function bindProcStep1(plan) {
  const btn = $('btnRequisition');
  if (!btn) return;
  btn.addEventListener('click', () => {
    plan.partsRequisitioned = true;
    MYD.savePlan(plan);
    toast('ส่งคำขอเบิกอะไหล่สำเร็จ');
    renderProcWizard(plan);
  });
}

// ----- ขั้น 2: ทำแผนเดินทาง -----
function ensureTravelPlan(plan) {
  if (!plan.travelPlan) {
    plan.travelPlan = { location: '', dateFrom: '', dateTo: '', perDiem: 0, lodging: 0, travel: 0 };
  }
  return plan.travelPlan;
}

function renderProcStep2(plan) {
  const tp = plan.travelPlan || {};
  return `
    <div class="sect">ขั้นที่ 2: ทำแผนเดินทาง</div>
    <div class="fgrid">
      <div class="f sp4">
        <label>สถานที่บำรุงรักษา</label>
        <div class="in"><span class="ms">place</span>
          <input type="text" id="fLocation" placeholder="เช่น คลังพัสดุ กฟก.3 นครสวรรค์" value="${esc(tp.location || '')}">
        </div>
      </div>
      <div class="f sp2">
        <label>จากวันที่</label>
        <div class="in noic"><input type="date" id="fDateFrom" value="${esc(tp.dateFrom || '')}"></div>
      </div>
      <div class="f sp2">
        <label>ถึงวันที่</label>
        <div class="in noic"><input type="date" id="fDateTo" value="${esc(tp.dateTo || '')}"></div>
      </div>
      <div class="f">
        <label>ค่าเบี้ยเลี้ยง (บาท)</label>
        <div class="in noic"><input type="number" min="0" id="fPerDiem" value="${esc(tp.perDiem ?? 0)}"></div>
      </div>
      <div class="f">
        <label>ค่าที่พัก (บาท)</label>
        <div class="in noic"><input type="number" min="0" id="fLodging" value="${esc(tp.lodging ?? 0)}"></div>
      </div>
      <div class="f">
        <label>ค่าเดินทาง (บาท)</label>
        <div class="in noic"><input type="number" min="0" id="fTravel" value="${esc(tp.travel ?? 0)}"></div>
      </div>
    </div>`;
}

function bindProcStep2(plan) {
  const tp = ensureTravelPlan(plan);

  $('fLocation').addEventListener('input', e => {
    tp.location = e.target.value;
    MYD.savePlan(plan);
    updateProcPrimaryEnabled(plan);
  });
  $('fDateFrom').addEventListener('input', e => {
    tp.dateFrom = e.target.value;
    MYD.savePlan(plan);
    updateProcPrimaryEnabled(plan);
  });
  $('fDateTo').addEventListener('input', e => {
    tp.dateTo = e.target.value;
    MYD.savePlan(plan);
    updateProcPrimaryEnabled(plan);
  });
  $('fPerDiem').addEventListener('input', e => {
    tp.perDiem = Number(e.target.value) || 0;
    MYD.savePlan(plan);
  });
  $('fLodging').addEventListener('input', e => {
    tp.lodging = Number(e.target.value) || 0;
    MYD.savePlan(plan);
  });
  $('fTravel').addEventListener('input', e => {
    tp.travel = Number(e.target.value) || 0;
    MYD.savePlan(plan);
  });
}

// ----- ขั้น 3: ทวน + ยืนยัน -----
function renderProcStep3(plan) {
  const tp = plan.travelPlan || {};
  const total = (tp.perDiem || 0) + (tp.lodging || 0) + (tp.travel || 0);

  return `
    <div class="sect">ขั้นที่ 3: ทวนแผนเดินทาง + ยืนยัน</div>
    <div class="fgrid">
      <div class="f sp4"><label>สถานที่บำรุงรักษา</label><div>${esc(tp.location || '-')}</div></div>
      <div class="f sp2"><label>จากวันที่</label><div>${esc(tp.dateFrom || '-')}</div></div>
      <div class="f sp2"><label>ถึงวันที่</label><div>${esc(tp.dateTo || '-')}</div></div>
      <div class="f"><label>ค่าเบี้ยเลี้ยง</label><div>${esc(tp.perDiem || 0)} บาท</div></div>
      <div class="f"><label>ค่าที่พัก</label><div>${esc(tp.lodging || 0)} บาท</div></div>
      <div class="f"><label>ค่าเดินทาง</label><div>${esc(tp.travel || 0)} บาท</div></div>
      <div class="f sp4"><label>รวมค่าใช้จ่าย</label><div><b>${esc(total)} บาท</b></div></div>
    </div>`;
}

function confirmTravelPlan(plan) {
  plan.travelConfirmed = true;
  MYD.savePlan(plan);
  toast('ยืนยันแผนเดินทางสำเร็จ');
  renderStepper(); // เฟส 2 กลายเป็น passed, เฟส 3 ปลดล็อก
  renderProcurement();
}

// ----- สรุปหลังยืนยัน (แทนที่ wizard เมื่อ travelConfirmed===true) -----
function renderProcurementConfirmed(plan) {
  const selectedVehicles = MYD.loadMaster().vehicles.filter(v => (plan.selectedVehicleIds || []).includes(v.id));
  const tp = plan.travelPlan || {};
  const total = (tp.perDiem || 0) + (tp.lodging || 0) + (tp.travel || 0);

  $('phase').innerHTML = `
    <div class="card">
      <div class="sect">เบิก/จัดหา + แผนเดินทาง — ยืนยันแล้ว</div>
      <span class="badge b-ok" style="font-size:15px;padding:6px 16px">แผนเดินทางยืนยันแล้ว</span>
      <div class="fgrid" style="margin-top:16px">
        <div class="f sp4"><label>สถานที่บำรุงรักษา</label><div>${esc(tp.location || '-')}</div></div>
        <div class="f sp2"><label>จากวันที่</label><div>${esc(tp.dateFrom || '-')}</div></div>
        <div class="f sp2"><label>ถึงวันที่</label><div>${esc(tp.dateTo || '-')}</div></div>
        <div class="f"><label>ค่าเบี้ยเลี้ยง</label><div>${esc(tp.perDiem || 0)} บาท</div></div>
        <div class="f"><label>ค่าที่พัก</label><div>${esc(tp.lodging || 0)} บาท</div></div>
        <div class="f"><label>ค่าเดินทาง</label><div>${esc(tp.travel || 0)} บาท</div></div>
        <div class="f sp4"><label>รวมค่าใช้จ่าย</label><div><b>${esc(total)} บาท</b></div></div>
      </div>
    </div>
    <div class="card">
      <div class="sect">📨 ส่ง Noti แจ้งเจ้าของรถ ${selectedVehicles.length} คัน + กรย. วันที่เข้าตรวจ</div>
      <div class="sub">ระบบส่งการแจ้งเตือนอัตโนมัติแล้ว (mock)</div>
    </div>
    <div class="card">
      <div class="actions">
        <button class="btn btn-o" id="btnPeaLife">ทำใบนำจ่าย (PEA Life)</button>
        <button class="btn btn-p" id="btnGoNextPhaseProc">ไปเฟสถัดไป →</button>
      </div>
    </div>`;

  $('btnPeaLife').addEventListener('click', () => toast('สร้างใบนำจ่าย (PEA Life) สำเร็จ (mock)'));
  $('btnGoNextPhaseProc').addEventListener('click', () => goPhase('maintenance'));
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  renderStepper();
  renderPhase();
});
