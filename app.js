// app.js — app shell flow logic: central state, 6-phase chevron stepper,
// phase router. Master Plan (phase 1) UI ships in a later task — for now
// every phase (including phase 1) renders a placeholder via renderPlaceholder().

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
    const passed = !active && isPhaseComplete(p.id);
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
  // เฟส 1 (master-plan): จะถูกแทนด้วย renderMasterPlan() ใน task ถัดไป
  // ตอนนี้ทุกเฟสแสดง placeholder เหมือนกัน
  $('phase').innerHTML = renderPlaceholder(state.phase);
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  renderStepper();
  renderPhase();
});
