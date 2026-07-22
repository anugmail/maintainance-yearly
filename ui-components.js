/* ============================================================
   Maintain-D — UI Components (ui-components.js)
   Component กลางแบบ "แยกอิสระ ประกอบได้ทุกหน้า" (window.UIC)
   - แต่ละ component: {key,name,variants,render(el,props)}
   - เป็น controlled component: state อยู่ฝั่งผู้เรียก ส่งผ่าน props
     พร้อม callback → เอาไป mount ได้ทั้ง mock, admin (live demo),
     และหน้าใหม่ในอนาคต โดยหน้าตา/พฤติกรรมเหมือนกันทุกที่
   - variant ที่ผู้ใช้เลือกเก็บใน maintaind.admin.v1 → cfg.variants[key]
   - ใช้ class จาก design-system/components.css เท่านั้น (ห้ามพึ่ง
     style เฉพาะหน้าใดหน้าหนึ่ง) — CSS ของ component อยู่ใน
     components.css section "shared UI components"
   ============================================================ */
(function(){
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const THD=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'],THM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const isoOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const thLabel=iso=>{const d=new Date(iso+'T00:00:00');return`${THD[d.getDay()]} ${d.getDate()} ${THM[d.getMonth()]}`};

/* ============================================================
   1) การ์ดเลือกรถ (vehicleCard) — variants: list | grid
   props: {variant, vehicles:[{id,plate,model,attach}], selectedId, onPick(id)}
   ============================================================ */
const vehicleCard={
  key:'vehicleCard',
  name:'การ์ดเลือกรถ (ขั้นตอนที่ 1 ฟอร์มแจ้งซ่อม)',
  variants:{list:'แถวแนวนอน (ผืนผ้า)',grid:'การ์ดจตุรัส'},
  render(el,props){
    const{variant='list',vehicles=[],selectedId=null,onPick}=props;
    el.innerHTML=`<div class="vlist ${variant==='grid'?'sq':''}">${vehicles.map(v=>`
      <div class="veh ${selectedId===v.id?'sel':''}" data-id="${v.id}">
        <div class="ic"><span class="ms">local_shipping</span></div>
        <div><b>${esc(v.plate)}</b><div class="meta">${esc(v.model)}${v.attach?' · '+esc(v.attach):''}</div></div>
      </div>`).join('')}</div>`;
    if(onPick)el.querySelectorAll('.veh').forEach(x=>x.addEventListener('click',()=>onPick(+x.dataset.id)));
  }
};

/* ============================================================
   2) ตัวเลือกวันนัดรับ (dayPicker) — variants: datepicker | chips
   controlled: state = {mode:'range'|'single', from:'', to:'', one:''}
   props: {variant, days:[iso...] (วันที่เลือกแล้ว), state, horizonDays=14,
           onToggleDay(iso)   — ชิพวัน: แตะเลือก/เอาออก (ผู้เรียก re-render เอง)
           onAddRange()       — date picker: กดเพิ่มช่วงวันที่ (อ่านค่าจาก state)
           onAddOne()         — date picker: กดเพิ่มทีละวัน
           onState(partial)   — อัปเดต state เงียบ ๆ (จาก input วันที่)}
   หมายเหตุ: สลับโหมด range/single จะ re-render ตัวเองในที่ (ไม่รบกวนผู้เรียก)
   ============================================================ */
const dayPicker={
  key:'slotPicker',   // ตรง key เดิมใน cfg.variants — ไม่ต้อง migrate ข้อมูล
  name:'ตัวเลือกวันนัดรับ — กบค. เปิดตารางว่าง',
  variants:{datepicker:'Date picker (ช่วงวันที่/ทีละวัน)',chips:'ชิพวันเร็ว ๆ นี้ (แตะเลือกวัน)'},
  render(el,props){
    const{variant='datepicker',days=[],state={},horizonDays=14,onToggleDay,onAddRange,onAddOne,onState}=props;
    if(variant==='chips'){
      const t=new Date(),chips=[];
      for(let i=0;i<horizonDays;i++){
        const iso=isoOf(new Date(t.getTime()+i*864e5));
        chips.push({iso,label:thLabel(iso),sel:days.includes(iso)});
      }
      el.innerHTML=`
        <div style="font-weight:600;color:var(--gray-900);font-size:14px">แตะวันที่จะเปิดว่าง <span style="font-size:13px;color:var(--gray-500);font-weight:400">— ${horizonDays} วันถัดไป แตะซ้ำเพื่อเอาออก</span></div>
        <div class="chips" style="margin-top:8px">${chips.map(c=>`<div class="chip ${c.sel?'sel':''}" data-iso="${c.iso}">${c.label}</div>`).join('')}</div>`;
      if(onToggleDay)el.querySelectorAll('.chip').forEach(x=>x.addEventListener('click',()=>onToggleDay(x.dataset.iso)));
      return;
    }
    // variant: datepicker
    const today=isoOf(new Date());
    const single=state.mode==='single';
    el.innerHTML=`
      <div class="seg" style="max-width:380px">
        <div class="sg ${!single?'sel':''}" data-mode="range">เลือกเป็นช่วงวันที่</div>
        <div class="sg ${single?'sel':''}" data-mode="single">เลือกทีละวัน</div>
      </div>
      ${!single?`
      <div class="fgrid" style="margin:14px 0 0;max-width:680px">
        <div class="f sp2"><label>จากวันที่</label><div class="in"><span class="ms">calendar_month</span><input type="date" data-f="from" min="${today}" value="${esc(state.from||'')}"></div></div>
        <div class="f sp2"><label>ถึงวันที่</label><div class="in"><span class="ms">event</span><input type="date" data-f="to" min="${today}" value="${esc(state.to||'')}"></div></div>
      </div>
      <div style="display:flex;margin-top:4px"><button class="btn btn-o" data-act="range"><span class="ms" style="font-size:18px">date_range</span> เพิ่มช่วงวันที่เข้าตาราง</button></div>`
      :`
      <div class="fgrid" style="margin:14px 0 0;max-width:680px">
        <div class="f sp2"><label>วันที่</label><div class="in"><span class="ms">calendar_month</span><input type="date" data-f="one" min="${today}" value="${esc(state.one||'')}"></div></div>
      </div>
      <div style="display:flex;margin-top:4px"><button class="btn btn-o" data-act="one"><span class="ms" style="font-size:18px">event</span> เพิ่มวันเข้าตาราง</button></div>`}`;
    el.querySelectorAll('.sg').forEach(x=>x.addEventListener('click',()=>{
      if(onState)onState({mode:x.dataset.mode});
      state.mode=x.dataset.mode;
      dayPicker.render(el,props);   // สลับโหมด re-render เฉพาะตัวเอง
    }));
    el.querySelectorAll('input[type=date]').forEach(x=>x.addEventListener('change',()=>{
      const p={};p[x.dataset.f]=x.value;
      state[x.dataset.f]=x.value;
      if(onState)onState(p);
    }));
    const rb=el.querySelector('[data-act="range"]'),ob=el.querySelector('[data-act="one"]');
    if(rb&&onAddRange)rb.addEventListener('click',onAddRange);
    if(ob&&onAddOne)ob.addEventListener('click',onAddOne);
  }
};

/* ============================================================
   sortable — drag & drop จัดลำดับลิสต์ (pointer events: เมาส์+ทัช)
   ใช้: UIC.sortable(listEl, {itemSelector, handleSelector, onDrop(from,to)})
   - แต่ละ item ควรมี data-idx = ตำแหน่งเดิม
   - ลากด้วย handle (ถ้าระบุ) หรือทั้ง item; drop → เรียก onDrop(from,to)
     แล้วผู้เรียก re-render เอง (สอดคล้อง controlled pattern)
   - เก็บปุ่มลูกศรไว้เป็น fallback ได้ (ไม่ชนกัน — ลูกศรมี onclick แยก)
   ============================================================ */
function sortable(listEl,opts){
  const{itemSelector='[data-idx]',handleSelector,onDrop}=opts||{};
  const items=()=>[...listEl.querySelectorAll(itemSelector)];
  let drag=null,ph=null,startY=0;
  items().forEach(it=>{
    const handle=handleSelector?it.querySelector(handleSelector):it;
    if(!handle)return;
    handle.style.touchAction='none';
    handle.style.cursor='grab';
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      e.preventDefault();
      drag=it;startY=e.clientY;
      const r=it.getBoundingClientRect();
      ph=document.createElement('div');ph.style.height=r.height+'px';ph.style.border='1.5px dashed var(--primary-500)';ph.style.borderRadius='8px';ph.style.margin='2px 0';
      it.parentNode.insertBefore(ph,it);
      it.style.position='fixed';it.style.zIndex='999';it.style.width=r.width+'px';it.style.left=r.left+'px';it.style.top=r.top+'px';
      it.style.opacity='.9';it.style.boxShadow='0 8px 24px rgba(16,24,40,.25)';it.style.pointerEvents='none';
      handle.setPointerCapture&&handle.setPointerCapture(e.pointerId);
      const move=ev=>{
        it.style.top=(r.top+ev.clientY-startY)+'px';
        const others=items().filter(x=>x!==drag);
        for(const o of others){
          const or=o.getBoundingClientRect();
          if(ev.clientY<or.top+or.height/2){o.parentNode.insertBefore(ph,o);return}
        }
        listEl.appendChild(ph);
      };
      const up=()=>{
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',up);
        const from=+it.dataset.idx;
        // ตำแหน่งปลายทาง = index ของ ph ในลำดับที่ "ไม่รวม item ที่ลาก" → ตรงกับ arrMove
        const seq=[...listEl.children].filter(x=>x===ph||(x.matches(itemSelector)&&x!==it));
        const to=seq.indexOf(ph);
        it.removeAttribute('style'); ph.replaceWith(it); ph=null; drag=null;
        if(onDrop&&to>=0&&to!==from)onDrop(from,to);
      };
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',up);
    });
  });
}
/* ย้าย element ใน array (ใช้คู่กับ onDrop) */
function arrMove(a,from,to){const x=a.splice(from,1)[0];a.splice(to,0,x);return a}

window.UIC={
  components:[vehicleCard,dayPicker],   // ลำดับที่แสดงในหน้า admin
  vehicleCard,dayPicker,thLabel,sortable,arrMove,
  get(key){return this.components.find(c=>c.key===key)}
};
})();
