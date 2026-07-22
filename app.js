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

// ----- ขั้น 2: เลือกรถเข้าแผน -----
function renderStep2(plan) {
  const vehicles = MYD.loadMaster().vehicles.filter(v => v.criteria === plan.criteria);
  const selected = new Set(plan.selectedVehicleIds || []);
  const allSelected = vehicles.length > 0 && vehicles.every(v => selected.has(v.id));

  const rows = vehicles.map(v => `
    <tr data-id="${esc(v.id)}">
      <td><input type="checkbox" class="rowChk" data-id="${esc(v.id)}" ${selected.has(v.id) ? 'checked' : ''}></td>
      <td>${esc(v.plate)}</td>
      <td>${esc(v.vehicleType)}</td>
      <td><span class="badge ${STATUS_BADGE_CLASS[v.status] || 'b-ok'}">${esc(MYD.STATUS_LABELS[v.status] || v.status)}</span></td>
    </tr>`).join('');

  return `
    <div class="sect">ขั้นที่ 2: เลือกรถเข้าแผน (เกณฑ์: ${esc(MYD.CRITERIA_LABELS[plan.criteria] || plan.criteria)})</div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr>
          <th><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="chkAll" ${allSelected ? 'checked' : ''}> เลือกทั้งหมด</label></th>
          <th>ทะเบียน</th><th>ประเภท</th><th>สถานะ</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="empty">ไม่มีรถตามเกณฑ์นี้</td></tr>`}</tbody>
      </table>
    </div>
    <div class="sub">เลือกแล้ว ${selected.size} คัน จากทั้งหมด ${vehicles.length} คัน</div>`;
}

function bindStep2(plan) {
  const vehicles = MYD.loadMaster().vehicles.filter(v => v.criteria === plan.criteria);

  $('chkAll').addEventListener('change', e => {
    plan.selectedVehicleIds = e.target.checked ? vehicles.map(v => v.id) : [];
    MYD.savePlan(plan);
    renderWizard(plan);
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
        <table class="tbl">
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

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  renderStepper();
  renderPhase();
});
